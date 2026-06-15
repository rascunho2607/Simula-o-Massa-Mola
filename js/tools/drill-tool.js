import { distancePointToSegment, getSpringMidpoint } from '../utils/math.js';

export const drillTool = { id: 'drill' };

export function createDrillToolController(game) {
    function processDrillTool() {
        if (!game.mouse.down || game.activeTool !== 'drill') return;
        const cfg = game.config.drillTool;
        game.pushToolEffect({ type: 'drillContact', x: game.mouse.x, y: game.mouse.y, angle: game.frameCount * 0.45, life: 4, maxLife: 4 });
        let decalMade = false;
        let particleCount = 0;

        game.points.forEach(point => {
            if (!game.isPointAlive(point)) return;
            const dist = Math.hypot(point.x - game.mouse.x, point.y - game.mouse.y);
            if (dist > cfg.radius) return;
            const ratio = 1 - dist / cfg.radius;
            point.px += (Math.random() - 0.5) * ratio * 1.2;
            point.py += (Math.random() - 0.5) * ratio * 1.2;
            game.applyDamageToPoint(point, cfg.pointDamagePerFrame * ratio, 'pierce', { x: point.x, y: point.y });
            if (!decalMade) {
                game.addBackgroundDecal?.('stab', point.x, point.y, { radius: 12 + cfg.radius * 0.18, intensity: 0.8 });
                decalMade = true;
            }
            if (game.getMaterial(point).fireResistance < 999 && Math.random() < cfg.heatBuildUp * 0.002) point.ignite(0.45);
        });

        game.springs.forEach(spring => {
            if (!game.isSpringAlive(spring)) return;
            const mid = getSpringMidpoint(spring);
            const dist = distancePointToSegment(game.mouse.x, game.mouse.y, spring.p1.x, spring.p1.y, spring.p2.x, spring.p2.y);
            if (dist > cfg.radius) return;
            const ratio = 1 - dist / cfg.radius;
            game.applyDamageToSpring(spring, cfg.springDamagePerFrame * ratio * (spring.isSeam ? 1.35 : 1), 'pierce', { x: mid.x, y: mid.y });
            if (!decalMade) {
                game.addBackgroundDecal?.('stab', mid.x, mid.y, { radius: 12 + cfg.radius * 0.16, intensity: 0.8 });
                decalMade = true;
            }
            if (particleCount < cfg.maxParticlesPerFrame) {
                game.createFineParticles(mid.x, mid.y, spring.material === 'metalMesh' ? '#ffe08a' : '#c9d6d6', 1, 2.6);
                particleCount++;
            }
        });
    }

    return { processDrillTool };
}
