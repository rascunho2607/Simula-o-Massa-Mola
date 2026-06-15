import { distancePointToSegment, distanceSegmentToSegment, getSpringMidpoint } from '../utils/math.js';

export const laserTool = { id: 'laser' };

export function createLaserToolController(game) {
    function getLaserVector() {
        const speed = Math.hypot(game.mouse.x - game.mouse.px, game.mouse.y - game.mouse.py);
        if (speed > 1.5) game.setLaserAngle(Math.atan2(game.mouse.y - game.mouse.py, game.mouse.x - game.mouse.px));
        return { x: Math.cos(game.laserAngle), y: Math.sin(game.laserAngle) };
    }

    function processLaserTool() {
        if (!game.mouse.down || game.activeTool !== 'laser') return;
        const cfg = game.config.laserTool;
        const dir = getLaserVector();
        const endX = game.mouse.x + dir.x * cfg.length;
        const endY = game.mouse.y + dir.y * cfg.length;
        game.pushToolEffect({ type: 'laserBeam', x1: game.mouse.x, y1: game.mouse.y, x2: endX, y2: endY, life: 3, maxLife: 3 });
        game.addBackgroundDecal?.('laser', game.mouse.x + dir.x * cfg.length * 0.48, game.mouse.y + dir.y * cfg.length * 0.48, {
            length: cfg.length * 0.75,
            angle: Math.atan2(dir.y, dir.x),
            intensity: 0.95,
            minDistance: 26,
        });

        let hitCount = 0;
        game.springs.forEach(spring => {
            if (!game.isSpringAlive(spring) || hitCount >= cfg.maxHitSpringsPerFrame || spring.lastLaserFrame === game.frameCount) return;
            const dist = distanceSegmentToSegment(game.mouse.x, game.mouse.y, endX, endY, spring.p1.x, spring.p1.y, spring.p2.x, spring.p2.y);
            if (dist > cfg.width) return;
            const mid = getSpringMidpoint(spring);
            game.applyDamageToSpring(spring, cfg.damagePerFrame, 'slash', { x: mid.x, y: mid.y });
            game.applyDamageToSpring(spring, cfg.heatPerFrame, 'fire', { x: mid.x, y: mid.y });
            if (game.getMaterial(spring).fireResistance < 999 && Math.random() < cfg.igniteChance) spring.ignite(0.7);
            if (Math.random() < 0.35) game.createFineParticles(mid.x, mid.y, spring.material === 'metalMesh' ? '#ffdd66' : '#ff6a33', 1, 1.8);
            spring.lastLaserFrame = game.frameCount;
            hitCount++;
        });

        game.points.forEach(point => {
            if (!game.isPointAlive(point)) return;
            const dist = distancePointToSegment(point.x, point.y, game.mouse.x, game.mouse.y, endX, endY);
            if (dist <= cfg.width * 0.75) {
                game.applyDamageToPoint(point, cfg.heatPerFrame * 0.7, 'fire', { x: point.x, y: point.y });
                if (game.getMaterial(point).fireResistance < 999 && Math.random() < cfg.igniteChance * 0.5) point.ignite(0.55);
            }
        });
        game.damageTargetFromLine(game.mouse.x, game.mouse.y, endX, endY, cfg.width, cfg.damagePerFrame + cfg.heatPerFrame, 'fire');
    }

    return { getLaserVector, processLaserTool };
}
