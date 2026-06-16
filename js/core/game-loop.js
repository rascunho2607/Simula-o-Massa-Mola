import { initFireGpuRenderer, isFireGpuRendererReady, renderFireGpuParticles, clearFireGpuRenderer } from '../render/fire-gpu-renderer.js';
import { renderTestChamberBackground } from '../background/test-chamber-background.js';
import { renderDecals, renderBackgroundSmoke, updateDecals, updateBackgroundSmoke } from '../background/decal-system.js';
import {
    renderClothFilledFabric,
    renderClothPhysicsLines,
} from '../render/cloth-visual-system.js';
import {
    getAdaptivePhysicsIterations,
    recordAdaptivePhysicsDebug,
} from '../simulation/physics.js';

export function startGameLoop() {
    // O loop original ainda é inicializado pelo runtime durante a migração.
}

function getClothGridSize(game) {
    const rows = game.rows ?? game.config.numeroDeLinhas ?? 0;
    const cols = game.cols ?? (rows >= 0 && game.points?.length
        ? Math.max(0, Math.round(game.points.length / Math.max(1, rows + 1) - 1))
        : 0);

    return { rows, cols };
}

function renderClothWithGpu(game, visualState, clothRows, clothCols, options = {}) {
    const gpu = game.clothGpuRenderer;
    if (!gpu?.isReady?.()) return { fabric: false, lines: false };

    try {
        gpu.setDebugLineDirty?.(game.config.rendering?.debugGpuLineDirty === true);
        const topologyUpdateMode = game.config.rendering?.gpuTopologyUpdateMode || 'dirty';
        const lineTopologyUpdateMode = game.config.rendering?.gpuLineTopologyUpdateMode
            || game.config.rendering?.gpuTopologyUpdateMode
            || 'dirty';
        const renderFabric = options.renderFabric === true;
        let renderLines = options.renderLines === true && gpu.canRenderLines?.();
        const didPrepareFabric = !renderFabric || (
            visualState?.texture
            && gpu.uploadTexture(visualState.texture, visualState.textureVersion)
            && gpu.updateTopology(game.points, game.springs, clothRows, clothCols, {
                force: topologyUpdateMode === 'everyFrame',
            })
        );
        if (renderLines) {
            renderLines = gpu.updateLineTopology?.(game.points, game.springs, clothRows, clothCols, {
                force: lineTopologyUpdateMode === 'everyFrame',
            }) === true;
        }
        const didRender = gpu.resize(game.canvas.width, game.canvas.height)
            && didPrepareFabric
            && gpu.updatePositions(game.points)
            && gpu.render({
                renderFabric,
                renderLines,
                alpha: game.config.clothVisual?.fabricFillAlpha ?? 0.92,
                lineAlpha: options.lineAlpha,
                lineColor: options.lineColor,
                lineWidth: options.lineWidth,
            });

        if (!didRender) return { fabric: false, lines: false };
        game.ctx.drawImage(gpu.canvas, 0, 0);
        return gpu.getLastRenderStatus?.() || { fabric: renderFabric, lines: renderLines };
    } catch (error) {
        if (options.renderFabric === true) gpu.disable?.(error);
        if (game.config.rendering?.debugGpuRenderer === true) {
            console.warn('[cloth-gpu] canvas fallback used', error);
        }
        return { fabric: false, lines: false };
    }
}

export function createRuntimeGameLoopController(game) {
    const perfStats = {
        frames: 0,
        totalMs: 0,
        physicsMs: 0,
        clothFillMs: 0,
        meshMs: 0,
    };

    function recordPerformanceSample(sample) {
        perfStats.frames++;
        perfStats.totalMs += sample.totalMs;
        perfStats.physicsMs += sample.physicsMs;
        perfStats.clothFillMs += sample.clothFillMs;
        perfStats.meshMs += sample.meshMs;
        if (perfStats.frames < 120) return;

        const frames = perfStats.frames;
        const avgTotal = perfStats.totalMs / frames;
        console.log(
            `[perf] fps=${(1000 / Math.max(0.001, avgTotal)).toFixed(1)} `
            + `total=${avgTotal.toFixed(2)}ms `
            + `physics=${(perfStats.physicsMs / frames).toFixed(2)}ms `
            + `clothFill=${(perfStats.clothFillMs / frames).toFixed(2)}ms `
            + `mesh=${(perfStats.meshMs / frames).toFixed(2)}ms`
        );
        perfStats.frames = 0;
        perfStats.totalMs = 0;
        perfStats.physicsMs = 0;
        perfStats.clothFillMs = 0;
        perfStats.meshMs = 0;
    }

    function animate() {
        const debugPerformance = game.config.debugPerformance === true;
        const frameStart = debugPerformance ? performance.now() : 0;
        let physicsMs = 0;
        let clothFillMs = 0;
        let meshMs = 0;
        const measurePhysics = debugPerformance || game.config.physicsAdaptive?.debug === true;
        game.incrementFrame();
        game.setDamageParticleBudget(0);
        game.resetFireParticleFrameBudget?.();
        game.ctx.clearRect(0, 0, game.width, game.height);
        renderTestChamberBackground(game.ctx);
        updateDecals();
        updateBackgroundSmoke();
        renderDecals(game.ctx);
        renderBackgroundSmoke(game.ctx);
        game.drawCoveredTarget();
        game.processContinuousTools();

        const physicsStart = measurePhysics ? performance.now() : 0;
        const physicsIterations = getAdaptivePhysicsIterations(game);
        for (let i = 0; i < physicsIterations; i++) {
            game.springs.forEach(spring => spring.update());
        }
        game.points.forEach(point => point.update());
        game.updateTargetCoverage();
        game.updateImpactRings();
        if (measurePhysics) physicsMs = performance.now() - physicsStart;
        recordAdaptivePhysicsDebug(game, physicsMs);

        const visualMode = game.config.clothVisual?.mode || 'test';
        const { rows: clothRows, cols: clothCols } = getClothGridSize(game);

        game.setCannonballs(game.cannonballs.filter(ball => ball.active));
        game.cannonballs.forEach(ball => ball.update());

        game.setDarts(game.darts.filter(dart => dart.active));
        game.darts.forEach(dart => dart.update());

        game.setParticles(game.particles.filter(particle => particle.life > 0));
        game.particles.forEach(particle => {
            particle.update();
        });

        const liveFireParticles = game.fireParticles.filter(particle => particle.life > 0);
        game.setFireParticles(game.enforceFireParticleLimit?.(liveFireParticles) ?? liveFireParticles);
        game.fireParticles.forEach(particle => {
            particle.update();
        });
        game.setFireParticles(game.enforceFireParticleLimit?.(game.fireParticles) ?? game.fireParticles);

        if (visualMode === 'fabric') {
            const visualState = game.getClothVisualState?.();
            const clothFillStart = debugPerformance ? performance.now() : 0;
            const renderFabricMesh = game.config.clothVisual?.renderFabricMesh !== false;
            const renderFabricPoints = game.config.clothVisual?.renderFabricPoints === true;
            const lineAlpha = renderFabricMesh ? (game.config.clothVisual?.fabricLineAlpha ?? 0.08) : 0;
            const pointAlpha = renderFabricPoints ? (game.config.clothVisual?.fabricPointAlpha ?? 0) : 0;
            const canUseGpuCloth = game.config.rendering?.clothRenderer === 'gpu'
                && game.clothGpuRenderer?.isReady?.();
            const useGpuFabric = canUseGpuCloth
                && game.config.rendering?.gpuRenderFabric
                && !!visualState?.texture;
            const useGpuLines = canUseGpuCloth
                && game.config.rendering?.gpuRenderLines === true
                && lineAlpha > 0
                && game.clothGpuRenderer?.canRenderLines?.();
            const gpuStatus = (useGpuFabric || useGpuLines)
                ? renderClothWithGpu(game, visualState, clothRows, clothCols, {
                    renderFabric: useGpuFabric,
                    renderLines: useGpuLines,
                    lineAlpha,
                    lineColor: game.config.lineColor,
                    lineWidth: 1,
                })
                : { fabric: false, lines: false };

            if (!gpuStatus.fabric) {
                renderClothFilledFabric(game.ctx, game.points, clothRows, clothCols, visualState, {
                    fillAlpha: game.config.clothVisual?.fabricFillAlpha ?? 1,
                    textureTilesX: game.config.clothVisual?.fabricTextureTilesX ?? 2,
                    textureTilesY: game.config.clothVisual?.fabricTextureTilesY ?? 2,
                });
            }
            if (debugPerformance) clothFillMs = performance.now() - clothFillStart;
            const meshStart = debugPerformance ? performance.now() : 0;
            if (lineAlpha > 0 || pointAlpha > 0) {
                renderClothPhysicsLines(game.ctx, game.springs, game.points, {
                    fast: game.config.clothVisual?.useFastMeshRender !== false,
                    skipCommonSprings: gpuStatus.lines,
                    skipCommonPoints: false,
                    lineAlpha,
                    pointAlpha,
                    lineColor: game.config.lineColor,
                    pointColor: game.config.lineColor,
                    lineWidth: Math.max(0.35, game.config.lineWidth),
                    pointRadius: 0.75,
                });
            }
            if (debugPerformance) meshMs = performance.now() - meshStart;
        } else {
            const useGpuLines = game.config.rendering?.clothRenderer === 'gpu'
                && game.config.rendering?.gpuRenderLines === true
                && game.config.testRender?.gpuRenderLines !== false
                && game.clothGpuRenderer?.isReady?.()
                && game.clothGpuRenderer?.canRenderLines?.();
            const gpuStatus = useGpuLines
                ? renderClothWithGpu(game, null, clothRows, clothCols, {
                    renderFabric: false,
                    renderLines: true,
                    lineAlpha: 1,
                    lineColor: game.config.lineColor,
                    lineWidth: 1,
                })
                : { fabric: false, lines: false };
            const meshStart = debugPerformance ? performance.now() : 0;
            renderClothPhysicsLines(game.ctx, game.springs, game.points, {
                fast: game.config.clothVisual?.useFastMeshRender !== false,
                skipCommonSprings: gpuStatus.lines,
                skipCommonPoints: false,
                alpha: 1,
                lineColor: game.config.lineColor,
                pointColor: game.config.lineColor,
                lineWidth: game.config.lineWidth,
                pointRadius: 1,
            });
            if (debugPerformance) meshMs = performance.now() - meshStart;
        }

        game.particles.forEach(particle => particle.draw());
        const shouldUseFireGpu = game.config.fireGpuRenderer?.enabled
            && (isFireGpuRendererReady() || initFireGpuRenderer(game.canvas, game.config));
        const didRenderFireGpu = shouldUseFireGpu
            ? renderFireGpuParticles(game.fireParticles, performance.now(), game.config)
            : false;
        if (!didRenderFireGpu) {
            clearFireGpuRenderer();
            game.fireParticles.forEach(particle => particle.draw());
        }
        game.drawImpactRings();

        game.cannonballs.forEach(ball => ball.draw());
        game.darts.forEach(dart => dart.draw());

        if (game.activeTool === 'blower' && game.blowForce > 0) {
            game.drawBlowerEffect();
        }

        if (game.activeTool === 'flame' && game.flameActive) {
            game.drawFlameEffect();
        }
        game.drawToolOverlays();

        game.mouse.px = game.mouse.x;
        game.mouse.py = game.mouse.y;

        if (debugPerformance) {
            recordPerformanceSample({
                totalMs: performance.now() - frameStart,
                physicsMs,
                clothFillMs,
                meshMs,
            });
        }

        requestAnimationFrame(animate);
    }

    return { animate };
}
