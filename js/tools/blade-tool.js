import { distanceSegmentToSegment, getSpringMidpoint } from '../utils/math.js';

export const bladeTool = { id: 'blade' };

export function createBladeToolController(game) {
    function processBladeTool() {
        if (!game.mouse.down || game.activeTool !== 'blade') return;
        const cfg = game.config.bladeTool;
        const speed = Math.hypot(game.mouse.x - game.mouse.px, game.mouse.y - game.mouse.py);
        if (speed < 0.2) return;
        game.pushToolEffect({ type: 'bladeTrail', x1: game.mouse.px, y1: game.mouse.py, x2: game.mouse.x, y2: game.mouse.y, life: 8, maxLife: 8 });

        game.springs.forEach(spring => {
            if (!game.isSpringAlive(spring) || spring.lastBladeFrame === game.frameCount) return;
            const dist = distanceSegmentToSegment(game.mouse.px, game.mouse.py, game.mouse.x, game.mouse.y, spring.p1.x, spring.p1.y, spring.p2.x, spring.p2.y);
            if (dist > cfg.radius) return;
            const damageRatio = spring.maxHp ? 1 - spring.hp / spring.maxHp : 0;
            const criticalBonus = damageRatio > 0.7 ? cfg.criticalBreakBonus : 1;
            const proximity = 1 - dist / cfg.radius;
            const damage = Math.min(cfg.maxDamagePerFrame, (cfg.baseDamage + speed * cfg.speedDamageMultiplier) * proximity * criticalBonus);
            const mid = getSpringMidpoint(spring);
            const dealt = game.applyDamageToSpring(spring, damage, 'slash', { x: mid.x, y: mid.y });
            spring.lastBladeFrame = game.frameCount;
            if (dealt > 0) {
                if (Math.random() < cfg.sparkChance) game.createFineParticles(mid.x, mid.y, '#eaf6ff', 3, 2.4);
                game.addBackgroundDecal?.('slash', mid.x, mid.y, {
                    length: Math.max(44, Math.min(120, speed * 4)),
                    angle: Math.atan2(game.mouse.y - game.mouse.py, game.mouse.x - game.mouse.px),
                    intensity: Math.min(1.4, 0.65 + speed / 30),
                });
                if (Math.random() < 0.08) game.gainXP(1);
            }
        });
    }

    return { processBladeTool };
}
