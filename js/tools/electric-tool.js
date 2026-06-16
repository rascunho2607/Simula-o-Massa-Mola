import { getSpringMidpoint } from '../utils/math.js';

export const electricTool = { id: 'electric' };

export function createElectricToolController(game) {
    function fireElectricPulse(x, y) {
        const cfg = game.config.electricTool;
        const now = performance.now();
        if (now - game.lastElectricTime < cfg.cooldownMs) return;
        game.setLastElectricTime(now);

        const start = game.findNearestPoint(x, y, cfg.startRadius);
        if (!start) return;

        const queue = [{ point: start, depth: 0, damage: cfg.baseDamage }];
        const visited = new Set([start]);
        let processed = 0;
        game.pushToolEffect({ type: 'electricFlash', x: start.x, y: start.y, life: 16, maxLife: 16 });
        game.addBackgroundDecal?.('electric', start.x, start.y, { radius: cfg.startRadius * 1.25, intensity: 1, temporary: true });

        while (queue.length && processed < cfg.maxNodes) {
            const current = queue.shift();
            const point = current.point;
            if (!game.isPointAlive(point)) continue;
            processed++;
            point.electricCharge = Math.max(point.electricCharge || 0, cfg.stunFrames);
            point.stunTime = Math.max(point.stunTime || 0, cfg.stunFrames);
            game.applyDamageToPoint(point, current.damage, 'electric', { x: point.x, y: point.y });

            game.springs.forEach(spring => {
                if (!game.isSpringAlive(spring)) return;
                if (spring.p1 !== point && spring.p2 !== point) return;
                const other = spring.p1 === point ? spring.p2 : spring.p1;
                const mid = getSpringMidpoint(spring);
                spring.electricCharge = Math.max(spring.electricCharge || 0, cfg.stunFrames);
                game.markSpringLineTopologyDirtyIfVisualStateChanged?.(spring, 'spring-electric-started');
                const metalBoost = spring.material === 'metalMesh' ? 1.35 : (spring.isSeam || spring.material === 'reinforced' ? 1.12 : 1);
                game.applyDamageToSpring(spring, current.damage * 0.65 * metalBoost, 'electric', { x: mid.x, y: mid.y });
                game.pushToolEffect({ type: 'electricArc', x1: point.x, y1: point.y, x2: other.x, y2: other.y, strong: metalBoost > 1.2, life: 12, maxLife: 12 });
                for (let i = 0; i < cfg.arcParticlesPerLink; i++) {
                    game.createFineParticles(mid.x, mid.y, metalBoost > 1.2 ? '#ffffff' : '#9eefff', 1, 2);
                }
                if (current.depth < cfg.maxDepth && !visited.has(other) && processed + queue.length < cfg.maxNodes) {
                    visited.add(other);
                    queue.push({ point: other, depth: current.depth + 1, damage: current.damage * cfg.falloff * metalBoost });
                }
            });
        }
        game.gainXP(Math.min(8, Math.max(1, Math.floor(processed / 12))));
    }

    function updateElectricStates() {
        game.points.forEach(point => {
            if (point.electricCharge > 0) point.electricCharge--;
            if (point.stunTime > 0) point.stunTime--;
        });
        game.springs.forEach(spring => {
            if (spring.electricCharge > 0) {
                spring.electricCharge--;
                game.markSpringLineTopologyDirtyIfVisualStateChanged?.(spring, 'spring-electric-updated');
            }
        });
    }

    return { fireElectricPulse, updateElectricStates };
}
