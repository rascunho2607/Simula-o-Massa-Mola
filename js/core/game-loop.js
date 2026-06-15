import { initFireGpuRenderer, isFireGpuRendererReady, renderFireGpuParticles, clearFireGpuRenderer } from '../render/fire-gpu-renderer.js';
import { renderTestChamberBackground } from '../background/test-chamber-background.js';
import { renderDecals, renderBackgroundSmoke, updateDecals, updateBackgroundSmoke } from '../background/decal-system.js';
import {
    renderClothFilledFabric,
    renderClothPhysicsLines,
} from '../render/cloth-visual-system.js';

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

export function createRuntimeGameLoopController(game) {
    function animate() {
        game.incrementFrame();
        game.setDamageParticleBudget(0);
        game.ctx.clearRect(0, 0, game.width, game.height);
        renderTestChamberBackground(game.ctx);
        updateDecals();
        updateBackgroundSmoke();
        renderDecals(game.ctx);
        renderBackgroundSmoke(game.ctx);
        game.drawCoveredTarget();
        game.processContinuousTools();

        for (let i = 0; i < 5; i++) {
            game.springs.forEach(spring => spring.update());
        }
        game.points.forEach(point => point.update());
        game.updateTargetCoverage();
        game.updateImpactRings();

        const visualState = game.getClothVisualState?.();
        const visualMode = game.config.clothVisual?.mode || 'test';
        const { rows: clothRows, cols: clothCols } = getClothGridSize(game);

        game.setCannonballs(game.cannonballs.filter(ball => ball.active));
        game.cannonballs.forEach(ball => ball.update());

        game.setDarts(game.darts.filter(dart => dart.active));
        game.darts.forEach(dart => dart.update());

        game.setParticles(game.particles.filter(particle => particle.life > 0));
        game.particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        game.setFireParticles(game.fireParticles.filter(particle => particle.life > 0));
        game.fireParticles.forEach(particle => {
            particle.update();
        });
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

        if (visualMode === 'fabric') {
            renderClothFilledFabric(game.ctx, game.points, clothRows, clothCols, visualState, {
                fillAlpha: game.config.clothVisual?.fabricFillAlpha ?? 1,
                textureTilesX: game.config.clothVisual?.fabricTextureTilesX ?? 2,
                textureTilesY: game.config.clothVisual?.fabricTextureTilesY ?? 2,
            });
            renderClothPhysicsLines(game.ctx, game.springs, game.points, {
                simpleMesh: true,
                lineAlpha: game.config.clothVisual?.fabricLineAlpha ?? 0.06,
                pointAlpha: game.config.clothVisual?.fabricPointAlpha ?? 0.08,
                lineColor: game.config.lineColor,
                pointColor: game.config.lineColor,
            });
        } else {
            game.ctx.strokeStyle = game.config.lineColor;
            game.ctx.lineWidth = game.config.lineWidth;
            renderClothPhysicsLines(game.ctx, game.springs, game.points);
        }

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

        requestAnimationFrame(animate);
    }

    return { animate };
}
