import { distancePointToSegment } from '../utils/math.js';

export function createToolEffectsController(game) {
    function findNearestPoint(x, y, radius) {
        let best = null;
        let bestDist = radius;
        game.points.forEach(point => {
            if (!game.isPointAlive(point)) return;
            const dist = Math.hypot(point.x - x, point.y - y);
            if (dist < bestDist) {
                best = point;
                bestDist = dist;
            }
        });
        return best;
    }

    function findNearestSpring(x, y, radius) {
        let best = null;
        let bestDist = radius;
        game.springs.forEach(spring => {
            if (!game.isSpringAlive(spring)) return;
            const dist = distancePointToSegment(x, y, spring.p1.x, spring.p1.y, spring.p2.x, spring.p2.y);
            if (dist < bestDist) {
                best = spring;
                bestDist = dist;
            }
        });
        return best;
    }

    function pushToolEffect(effect) {
        if (game.toolEffects.length > 80) game.toolEffects.shift();
        game.toolEffects.push(effect);
    }

    function createFineParticles(x, y, color, count, spread = 1.8) {
        const safeCount = Math.min(count, 8);
        for (let i = 0; i < safeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * spread;
            if (game.particles.length > 350) game.particles.shift();
            game.particles.push(new game.Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                1 + Math.random() * 1.8,
                14 + Math.random() * 18
            ));
        }
    }

    function damageTargetFromLine(ax, ay, bx, by, widthValue, amount, damageType) {
        if (!game.coveredTarget.exposed || game.coveredTarget.destroyed) return;
        const dist = distancePointToSegment(game.coveredTarget.x, game.coveredTarget.y, ax, ay, bx, by);
        if (dist < game.coveredTarget.radius * 0.6 + widthValue) {
            game.damageCoveredTarget(amount * 0.35, damageType, bx, by);
        }
    }

    function updateToolEffects() {
        game.setToolEffects(game.toolEffects.filter(effect => effect.life > 0));
        game.toolEffects.forEach(effect => effect.life--);
    }

    return {
        findNearestPoint,
        findNearestSpring,
        pushToolEffect,
        createFineParticles,
        damageTargetFromLine,
        updateToolEffects,
    };
}
