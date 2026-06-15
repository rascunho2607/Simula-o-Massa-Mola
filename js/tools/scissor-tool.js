import { getSpringMidpoint } from '../utils/math.js';

export const scissorTool = { id: 'scissor' };

export function createScissorToolController(game) {
    function applyScissorCut() {
        const cfg = game.config.scissorTool;
        const spring = game.findNearestSpring(game.mouse.x, game.mouse.y, cfg.selectRadius);
        if (!spring) return;
        const damageRatio = spring.maxHp ? 1 - spring.hp / spring.maxHp : 0;
        const damage = cfg.damage * (damageRatio > 0.65 ? cfg.criticalBonus : 1);
        const mid = getSpringMidpoint(spring);
        game.applyDamageToSpring(spring, damage, 'slash', { x: mid.x, y: mid.y });
        const angle = Math.atan2(spring.p2.y - spring.p1.y, spring.p2.x - spring.p1.x);
        game.pushToolEffect({ type: 'scissorSnip', x: mid.x, y: mid.y, angle, life: 12, maxLife: 12 });
        game.addBackgroundDecal?.('slash', mid.x, mid.y, { length: 46, angle, intensity: 0.85, passes: 2 });
        game.createFineParticles(mid.x, mid.y, '#f6fbff', spring.broken ? 6 : 2, 2);
        game.gainXP(1);
    }

    return { applyScissorCut };
}
