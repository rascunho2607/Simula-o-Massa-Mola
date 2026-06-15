import { state, resetSimulationCollections } from '../core/state.js';
import { config } from '../core/config.js';
import { PointModel } from './point.js';
import { SpringModel } from './spring.js';

function deterministicPatch(x, y) {
    const value = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
    if (value < 0.18) return 'paper';
    if (value < 0.36) return 'leather';
    if (value < 0.54) return 'rubber';
    if (value < 0.64) return 'metalMesh';
    return 'cloth';
}

function getPointMaterial(point, pattern, target) {
    const nx = point.gridX / Math.max(1, state.cols);
    const ny = point.gridY / Math.max(1, state.rows);
    const distToTarget = target ? Math.hypot(point.x - target.x, point.y - target.y) : Infinity;

    if (pattern === 'layered') {
        if (ny > 0.66) return 'leather';
        if (ny > 0.36) return 'rubber';
        return point.gridY % 2 === 0 ? 'paper' : 'cloth';
    }

    if (pattern === 'targetShield' && target) {
        if (distToTarget < target.radius * 0.58) return 'metalMesh';
        if (distToTarget < target.radius * 1.25) return 'reinforced';
    }

    if (pattern === 'patchwork') return deterministicPatch(Math.floor(nx * 6), Math.floor(ny * 6));

    if (pattern === 'reinforcedSeams' && (point.gridX % 6 === 0 || point.gridY % 6 === 0)) return 'reinforced';

    if (pattern === 'weakCenter' && target && distToTarget < target.radius * 0.85) return 'paper';

    if (pattern === 'metalBands' && point.gridY % 7 <= 1) return 'metalMesh';

    return 'cloth';
}

function getLayerForPoint(point, target) {
    if (!target) return 0;
    const distToTarget = Math.hypot(point.x - target.x, point.y - target.y);
    if (distToTarget < target.radius * 0.62) return 2;
    if (distToTarget < target.radius * 1.18) return 1;
    return 0;
}

function applyPointMaterial(point, material, layerIndex) {
    point.material = material;
    point.layerIndex = layerIndex;
    point.applyMaterialStats?.(false);
}

function applySpringMaterial(spring, material, layerIndex) {
    spring.material = material;
    spring.layerIndex = layerIndex;
    spring.applyMaterialStats?.(false);
}

function isNearTargetRing(spring, target) {
    if (!target) return false;
    const midX = (spring.p1.x + spring.p2.x) / 2;
    const midY = (spring.p1.y + spring.p2.y) / 2;
    const dist = Math.hypot(midX - target.x, midY - target.y);
    return Math.abs(dist - target.radius * 0.92) < config.spacing * 1.1;
}

export function assignMaterialToCloth(pattern = config.materialPattern || 'default') {
    const target = config.targetConfig.enabled ? state.coveredTarget : null;

    state.points.forEach((point) => {
        const layerIndex = getLayerForPoint(point, target);
        applyPointMaterial(point, getPointMaterial(point, pattern, target), layerIndex);
    });

    const horizontalSeamRow = Math.round(state.rows * 0.5);
    const verticalSeamCol = Math.round(state.cols * 0.5);

    state.springs.forEach((spring) => {
        const layerIndex = Math.max(spring.p1.layerIndex ?? 0, spring.p2.layerIndex ?? 0);
        const material = spring.p1.material === spring.p2.material ? spring.p1.material : (layerIndex >= 1 ? 'reinforced' : spring.p1.material);
        applySpringMaterial(spring, material, layerIndex);

        const sameRow = spring.p1.gridY === spring.p2.gridY;
        const sameCol = spring.p1.gridX === spring.p2.gridX;
        const onHorizontalSeam = sameRow && Math.abs(spring.p1.gridY - horizontalSeamRow) <= 0;
        const onVerticalSeam = sameCol && Math.abs(spring.p1.gridX - verticalSeamCol) <= 0;
        const onTargetSeam = isNearTargetRing(spring, target);

        if (pattern === 'reinforcedSeams' || pattern === 'targetShield' || pattern === 'default') {
            if (onHorizontalSeam) spring.markSeam?.('horizontal', false);
            if (onVerticalSeam) spring.markSeam?.('vertical', false);
            if (onTargetSeam) spring.markSeam?.('target-ring', true);
        }

        if (target) {
            const midX = (spring.p1.x + spring.p2.x) / 2;
            const midY = (spring.p1.y + spring.p2.y) / 2;
            const dist = Math.hypot(midX - target.x, midY - target.y);
            const angle = Math.atan2(midY - target.y, midX - target.x);
            const strategicAngle = Math.abs(Math.sin(angle * 3)) > 0.93;
            if (dist > target.radius * 0.45 && dist < target.radius * 0.85 && strategicAngle) spring.markWeakPoint?.();
        }
    });
}

export function initializeClothSimulation({ PointClass = PointModel, SpringClass = SpringModel, onDartCounterUpdate } = {}) {
    resetSimulationCollections();
    state.cols = Math.floor(state.width / config.spacing / 2.5);
    state.rows = config.numeroDeLinhas;
    const startX = (state.width - state.cols * config.spacing) / 2;

    for (let y = 0; y <= state.rows; y++) {
        for (let x = 0; x <= state.cols; x++) {
            const point = new PointClass(startX + x * config.spacing, 50 + y * config.spacing, y === 0);
            point.gridX = x;
            point.gridY = y;
            state.points.push(point);
            if (x > 0) state.springs.push(new SpringClass(state.points[state.points.length - 2], point));
            if (y > 0) state.springs.push(new SpringClass(state.points[state.points.length - (state.cols + 2)], point));
        }
    }

    if (config.targetConfig.enabled) {
        const target = state.coveredTarget;
        target.x = state.width / 2;
        target.y = 50 + (state.rows * config.spacing) * 0.5;
        target.radius = config.targetConfig.radius;
        target.hp = config.targetConfig.hp;
        target.maxHp = config.targetConfig.hp;
        target.destroyed = false;
        target.exposed = false;
        target.coverPoints = state.points.filter((point) => {
            const isCoverPoint = Math.hypot(point.x - target.x, point.y - target.y) <= target.radius * 1.25;
            point.isCoverPoint = isCoverPoint;
            return isCoverPoint;
        });
        target.coverSprings = state.springs.filter((spring) => {
            const midX = (spring.p1.x + spring.p2.x) / 2;
            const midY = (spring.p1.y + spring.p2.y) / 2;
            return Math.hypot(midX - target.x, midY - target.y) <= target.radius * 1.2;
        });
    }

    assignMaterialToCloth(config.materialPattern);

    if (config.targetConfig.enabled) {
        const target = state.coveredTarget;
        target.totalCoverWeight = Math.max(1, [
            ...target.coverPoints,
            ...target.coverSprings,
        ].reduce((sum, entity) => sum + (entity.coverageWeight ?? 1), 0));
        target.totalCoverElements = target.totalCoverWeight;
    }

    onDartCounterUpdate?.();
}

export function createRuntimeClothController(game) {
    function init() {
        game.setSize(window.innerWidth, window.innerHeight);

        const cols = Math.floor(game.width / game.config.spacing / 2.5);
        const rows = game.config.numeroDeLinhas;
        game.setGrid(rows, cols);
        const startX = (game.width - cols * game.config.spacing) / 2;

        game.resetCollections();
        game.glueState.pendingPoint = null;
        game.hookState.active = false;
        game.hookState.attachedPoint = null;
        game.hookState.attachedSpring = null;
        game.setFrameCount(0);
        game.setDamageParticleBudget(0);
        game.pinnedByDarts.clear();
        game.burningPoints.clear();
        game.updateDartCounter();

        for (let y = 0; y <= rows; y++) {
            for (let x = 0; x <= cols; x++) {
                const point = new game.Point(startX + x * game.config.spacing, 50 + y * game.config.spacing, y === 0);
                point.gridX = x;
                point.gridY = y;
                game.points.push(point);

                if (x > 0) game.springs.push(new game.Spring(game.points[game.points.length - 2], point));
                if (y > 0) game.springs.push(new game.Spring(game.points[game.points.length - (cols + 2)], point));
            }
        }

        game.initializeCoveredTarget();
        game.assignMaterialToCloth(game.config.materialPattern);
        game.coveredTarget.totalCoverElements = Math.max(1, [
            ...game.coveredTarget.coverPoints,
            ...game.coveredTarget.coverSprings,
        ].reduce((sum, entity) => sum + (entity.coverageWeight || 1), 0));
        game.updateTargetCoverage(true);
        game.resetMission();
    }

    return { init };
}
