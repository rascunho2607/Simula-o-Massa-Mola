import { getSpringMidpoint } from '../utils/math.js';

export const hookTool = { id: 'hook' };

export function createHookToolController(game) {
    function attachHookAt(x, y) {
        const cfg = game.config.hookTool;
        const point = game.findNearestPoint(x, y, cfg.attachRadius);
        const spring = game.findNearestSpring(x, y, cfg.attachRadius);
        if (!point && !spring) return;

        let attachedPoint = point;
        if (spring) {
            const d1 = Math.hypot(spring.p1.x - x, spring.p1.y - y);
            const d2 = Math.hypot(spring.p2.x - x, spring.p2.y - y);
            attachedPoint = point || (d1 < d2 ? spring.p1 : spring.p2);
        }

        game.setHookState({
            active: true,
            attachedPoint,
            attachedSpring: spring,
            x,
            y,
            strength: 0,
            ropeLength: attachedPoint ? Math.hypot(attachedPoint.x - x, attachedPoint.y - y) : 0,
        });
        game.createFineParticles(attachedPoint.x, attachedPoint.y, '#ffd166', 5, 2);
    }

    function releaseHook(snap = true) {
        if (snap && game.hookState.active && game.hookState.attachedPoint) {
            game.createImpactRing(game.hookState.attachedPoint.x, game.hookState.attachedPoint.y, 18, '#ffd166');
            game.createFineParticles(game.hookState.attachedPoint.x, game.hookState.attachedPoint.y, '#ffffff', 4, 2.5);
        }
        game.hookState.active = false;
        game.hookState.attachedPoint = null;
        game.hookState.attachedSpring = null;
    }

    function processHookTool() {
        if (!game.hookState.active || game.activeTool !== 'hook' || !game.mouse.down) return;
        const point = game.hookState.attachedPoint;
        if (!game.isPointAlive(point)) {
            releaseHook(false);
            return;
        }

        const cfg = game.config.hookTool;
        const dx = game.mouse.x - point.x;
        const dy = game.mouse.y - point.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        if (dist > cfg.detachDistance) {
            releaseHook(true);
            return;
        }

        game.hookState.x = game.mouse.x;
        game.hookState.y = game.mouse.y;
        game.hookState.strength = Math.min(1, game.hookState.strength + 0.08);
        const pull = Math.min(cfg.maxPullForce, dist * cfg.pullStrength * game.hookState.strength);
        if (!point.pinned) {
            point.px -= (dx / dist) * pull;
            point.py -= (dy / dist) * pull;
        }

        game.springs.forEach(spring => {
            if (!game.isSpringAlive(spring) || spring.lastHookFrame === game.frameCount) return;
            if (spring.p1 !== point && spring.p2 !== point && spring !== game.hookState.attachedSpring) return;
            const sdx = spring.p2.x - spring.p1.x;
            const sdy = spring.p2.y - spring.p1.y;
            const strain = Math.hypot(sdx, sdy) / Math.max(1, spring.length);
            if (strain <= game.config.clothDamage.springSafeStrain) return;
            const burnWeakness = spring.char > 0.25 || spring.isBurning ? 1.45 : 1;
            const mid = getSpringMidpoint(spring);
            game.applyDamageToSpring(spring, (strain - game.config.clothDamage.springSafeStrain) * cfg.tensionDamageMultiplier * pull * burnWeakness, 'tension', { x: mid.x, y: mid.y });
            spring.lastHookFrame = game.frameCount;
            if (Math.random() < 0.35) game.createFineParticles(mid.x, mid.y, '#ffd6a0', 2, 1.5);
        });
    }

    return { attachHookAt, releaseHook, processHookTool };
}
