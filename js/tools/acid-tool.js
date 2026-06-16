import { distancePointToSegment, getSpringMidpoint } from '../utils/math.js';

export const acidTool = { id: 'acid' };

export function createAcidToolController(game) {
    function markAcid(entity, amount = 1) {
        if (!entity) return;
        entity.acidAmount = Math.min(game.config.acidTool.duration, (entity.acidAmount || 0) + amount);
        entity.isCorroding = true;
        entity.corrosionTime = game.config.acidTool.duration;
        if (entity.p1 && entity.p2) {
            game.markSpringLineTopologyDirtyIfVisualStateChanged?.(entity, 'spring-acid-started');
        }
    }

    function processAcidTool() {
        if (!game.mouse.down || game.mouse.button !== 0 || game.activeTool !== 'acid') return;
        const cfg = game.config.acidTool;
        let particlesMade = 0;
        game.pushToolEffect({ type: 'acidCloud', x: game.mouse.x, y: game.mouse.y, radius: cfg.radius, life: 10, maxLife: 10 });
        game.addBackgroundDecal?.('acid', game.mouse.x, game.mouse.y, {
            radius: cfg.radius * 0.72,
            intensity: 0.9,
            minDistance: 32,
        });

        game.points.forEach(point => {
            if (!game.isPointAlive(point)) return;
            const dist = Math.hypot(point.x - game.mouse.x, point.y - game.mouse.y);
            if (dist > cfg.radius) return;
            const ratio = 1 - dist / cfg.radius;
            markAcid(point, cfg.duration * 0.045 * ratio);
            if (particlesMade < 3 && Math.random() < 0.25) {
                game.createFineParticles(point.x, point.y, '#8cff45', 1, 0.9);
                particlesMade++;
            }
        });

        game.springs.forEach(spring => {
            if (!game.isSpringAlive(spring)) return;
            const dist = distancePointToSegment(game.mouse.x, game.mouse.y, spring.p1.x, spring.p1.y, spring.p2.x, spring.p2.y);
            if (dist > cfg.radius) return;
            const ratio = 1 - dist / cfg.radius;
            markAcid(spring, cfg.duration * 0.05 * ratio);
            if (particlesMade < 5 && Math.random() < 0.22) {
                const mid = getSpringMidpoint(spring);
                game.createFineParticles(mid.x, mid.y, '#b7ff4a', 1, 0.9);
                particlesMade++;
            }
        });
    }

    function processAcidEffects() {
        const cfg = game.config.acidTool;
        const canTick = game.frameCount % cfg.tickInterval === 0;
        let activeAcidParticles = 0;

        game.points.forEach(point => {
            if (!game.isPointAlive(point) || !point.isCorroding) return;
            point.corrosionTime = Math.max(0, (point.corrosionTime || 0) - 1);
            point.acidAmount = Math.max(0, (point.acidAmount || 0) - 0.45);
            if (canTick) game.applyDamageToPoint(point, cfg.damagePerTick * Math.min(1.4, 0.45 + point.acidAmount / cfg.duration), 'chemical', { x: point.x, y: point.y });
            if (activeAcidParticles < cfg.maxAcidParticles && Math.random() < 0.025) {
                game.createFineParticles(point.x, point.y, '#9cff5a', 1, 0.55);
                activeAcidParticles++;
            }
            if (point.acidAmount <= 0 || point.corrosionTime <= 0) point.isCorroding = false;
        });

        game.springs.forEach(spring => {
            if (!game.isSpringAlive(spring) || !spring.isCorroding) return;
            spring.corrosionTime = Math.max(0, (spring.corrosionTime || 0) - 1);
            spring.acidAmount = Math.max(0, (spring.acidAmount || 0) - 0.45);
            game.markSpringLineTopologyDirtyIfVisualStateChanged?.(spring, 'spring-acid-updated');
            const mid = getSpringMidpoint(spring);
            if (canTick) game.applyDamageToSpring(spring, cfg.damagePerTick * 1.15 * Math.min(1.5, 0.45 + spring.acidAmount / cfg.duration), 'chemical', { x: mid.x, y: mid.y });
            if (Math.random() < cfg.spreadChance) {
                markAcid(spring.p1, cfg.duration * 0.12);
                markAcid(spring.p2, cfg.duration * 0.12);
            }
            if (activeAcidParticles < cfg.maxAcidParticles && Math.random() < 0.02) {
                game.createFineParticles(mid.x, mid.y, '#d2ff7a', 1, 0.6);
                activeAcidParticles++;
            }
            if (spring.acidAmount <= 0 || spring.corrosionTime <= 0) spring.isCorroding = false;
        });
    }

    return { markAcid, processAcidTool, processAcidEffects };
}
