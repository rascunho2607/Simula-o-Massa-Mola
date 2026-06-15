import { hexToRgb, mixRgb } from '../utils/color.js';

const resistanceByDamageType = {
    fire: 'fireResistance',
    slash: 'slashResistance',
    impact: 'impactResistance',
    pierce: 'pierceResistance',
    tension: 'tensionResistance',
    chemical: 'chemicalResistance',
    electric: 'electricResistance',
};

export function createMaterialSystemController(game) {
    function getLayerByIndex(layerIndex) {
        return Object.values(game.config.layers).find(layer => layer.index === layerIndex) || game.config.layers.outer;
    }

    function getMaterial(entity) {
        return game.config.materials[entity?.material] || game.config.materials.cloth;
    }

    function getDamageResistance(entity, damageType = 'impact') {
        const material = getMaterial(entity);
        const layer = getLayerByIndex(entity?.layerIndex ?? 0);
        const resistanceKey = resistanceByDamageType[damageType] || 'impactResistance';
        return Math.max(0.05, (material[resistanceKey] || 1) / layer.damageMultiplier);
    }

    function updateDamageState(entity) {
        if (!entity.maxHp || entity.maxHp <= 0) {
            entity.damageState = 0;
            return;
        }
        const damageRatio = 1 - Math.max(0, entity.hp) / entity.maxHp;
        if (damageRatio >= 1) entity.damageState = 4;
        else if (damageRatio >= game.config.clothDamage.damageVisualThreshold3) entity.damageState = 3;
        else if (damageRatio >= game.config.clothDamage.damageVisualThreshold2) entity.damageState = 2;
        else if (damageRatio >= game.config.clothDamage.damageVisualThreshold1) entity.damageState = 1;
        else entity.damageState = 0;
        entity.damage = Math.max(0, entity.maxHp - entity.hp);
    }

    function applyMaterialStats(entity, baseHp, hpMultiplierKey, keepDamageRatio = true) {
        const previousMaxHp = entity.maxHp || baseHp;
        const previousHp = entity.hp ?? previousMaxHp;
        const damageRatio = keepDamageRatio ? 1 - Math.max(0, previousHp) / previousMaxHp : 0;
        const material = getMaterial(entity);
        const layer = getLayerByIndex(entity.layerIndex ?? 0);
        const seamMultiplier = entity.isSeam ? 1.35 : 1;
        const weakMultiplier = entity.isWeakPoint ? 0.55 : 1;

        entity.layerIndex = layer.index;
        entity.layerName = layer.name;
        entity.layerStrengthMultiplier = layer.hpMultiplier;
        entity.coverageWeight = layer.coverageWeight;
        entity.maxHp = baseHp * material[hpMultiplierKey] * layer.hpMultiplier * seamMultiplier * weakMultiplier;
        entity.hp = Math.max(0, entity.maxHp * (1 - damageRatio));
        updateDamageState(entity);
    }

    function materialDamageColor(entity, alpha = 0.92) {
        const base = hexToRgb(getMaterial(entity).color);
        const damageRatio = entity.maxHp ? 1 - Math.max(0, entity.hp) / entity.maxHp : 0;
        let color = base;
        if ((entity.layerIndex ?? 0) === 0) color = mixRgb(color, hexToRgb('#ffffff'), 0.1);
        if ((entity.layerIndex ?? 0) === 2) color = mixRgb(color, hexToRgb('#111111'), 0.12);
        if ((entity.electricCharge || 0) > 0) {
            const pulse = 0.45 + Math.sin(game.frameCount * 0.55) * 0.25;
            color = mixRgb(color, hexToRgb('#7ee8ff'), 0.58 + pulse * 0.18);
        } else if ((entity.acidAmount || 0) > 0) {
            const acidRatio = Math.min(1, (entity.acidAmount || 0) / Math.max(1, game.config.acidTool.duration));
            color = mixRgb(color, acidRatio > 0.65 ? hexToRgb('#baff38') : hexToRgb('#4bd64f'), 0.38 + acidRatio * 0.35);
        }
        if (entity.char > 0.45) color = mixRgb(color, hexToRgb('#2a241f'), 0.72);
        else if (damageRatio >= game.config.clothDamage.damageVisualThreshold3) color = mixRgb(color, hexToRgb('#ff3322'), 0.68);
        else if (damageRatio >= game.config.clothDamage.damageVisualThreshold2) color = mixRgb(color, hexToRgb('#ff8a28'), 0.5);
        else if (damageRatio >= game.config.clothDamage.damageVisualThreshold1) color = mixRgb(color, hexToRgb('#ffd166'), 0.36);
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    }

    function deterministicPatch(x, y) {
        const value = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        if (value < 0.18) return 'paper';
        if (value < 0.36) return 'leather';
        if (value < 0.54) return 'rubber';
        if (value < 0.64) return 'metalMesh';
        return 'cloth';
    }

    function getLayerForPoint(point) {
        const dist = Math.hypot(point.x - game.coveredTarget.x, point.y - game.coveredTarget.y);
        if (dist < game.coveredTarget.radius * 0.62) return 2;
        if (dist < game.coveredTarget.radius * 1.18) return 1;
        return 0;
    }

    function getPointMaterial(point, pattern = game.config.materialPattern) {
        const dist = Math.hypot(point.x - game.coveredTarget.x, point.y - game.coveredTarget.y);
        const ny = point.gridY / Math.max(1, game.rows);
        if (pattern === 'layered') {
            if (ny > 0.66) return 'leather';
            if (ny > 0.36) return 'rubber';
            return point.gridY % 2 === 0 ? 'paper' : 'cloth';
        }
        if (pattern === 'targetShield') {
            if (dist < game.coveredTarget.radius * 0.58) return 'metalMesh';
            if (dist < game.coveredTarget.radius * 1.25) return 'reinforced';
        }
        if (pattern === 'patchwork') return deterministicPatch(Math.floor(point.gridX / 4), Math.floor(point.gridY / 4));
        if (pattern === 'reinforcedSeams' && (point.gridX % 6 === 0 || point.gridY % 6 === 0)) return 'reinforced';
        if (pattern === 'weakCenter' && dist < game.coveredTarget.radius * 0.85) return 'paper';
        if (pattern === 'metalBands' && point.gridY % 7 <= 1) return 'metalMesh';
        return 'cloth';
    }

    function assignMaterialToCloth(pattern = game.config.materialPattern) {
        game.points.forEach(point => {
            point.material = getPointMaterial(point, pattern);
            point.layerIndex = getLayerForPoint(point);
            point.applyMaterialStats(false);
        });
        const horizontalSeamRow = Math.round(game.rows * 0.5);
        const verticalSeamCol = Math.round(game.cols * 0.5);
        game.springs.forEach(spring => {
            spring.layerIndex = Math.max(spring.p1.layerIndex || 0, spring.p2.layerIndex || 0);
            spring.material = spring.p1.material === spring.p2.material ? spring.p1.material : (spring.layerIndex >= 1 ? 'reinforced' : spring.p1.material);
            const sameRow = spring.p1.gridY === spring.p2.gridY;
            const sameCol = spring.p1.gridX === spring.p2.gridX;
            const midX = (spring.p1.x + spring.p2.x) / 2;
            const midY = (spring.p1.y + spring.p2.y) / 2;
            const dist = Math.hypot(midX - game.coveredTarget.x, midY - game.coveredTarget.y);
            const onTargetSeam = Math.abs(dist - game.coveredTarget.radius * 0.92) < game.config.spacing * 1.1;
            if (pattern === 'reinforcedSeams' || pattern === 'targetShield' || pattern === 'default') {
                if (sameRow && spring.p1.gridY === horizontalSeamRow) spring.markSeam('horizontal', false);
                if (sameCol && spring.p1.gridX === verticalSeamCol) spring.markSeam('vertical', false);
                if (onTargetSeam) spring.markSeam('target-ring', true);
            }
            const angle = Math.atan2(midY - game.coveredTarget.y, midX - game.coveredTarget.x);
            if (dist > game.coveredTarget.radius * 0.45 && dist < game.coveredTarget.radius * 0.85 && Math.abs(Math.sin(angle * 3)) > 0.93) {
                spring.isWeakPoint = true;
            }
            spring.applyMaterialStats(false);
        });
    }

    return { getLayerByIndex, getMaterial, getDamageResistance, applyMaterialStats, materialDamageColor, deterministicPatch, getLayerForPoint, getPointMaterial, assignMaterialToCloth, updateDamageState };
}
