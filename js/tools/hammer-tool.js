export const hammerTool = { id: 'hammer' };

export function createHammerToolController(game) {
    function applyHammerImpact() {
        const cfg = game.config.hammerTool;
        const now = performance.now();
        if (now - game.lastHammerTime < cfg.cooldownMs) return;
        game.setLastHammerTime(now);

        game.applyAreaDamage(game.mouse.x, game.mouse.y, cfg.radius, cfg.damage, 'impact', true);
        game.points.forEach(point => {
            if (!game.isPointAlive(point) || point.pinned) return;
            const dx = point.x - game.mouse.x;
            const dy = point.y - game.mouse.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            if (dist > cfg.radius) return;
            const force = cfg.impulse * (1 - dist / cfg.radius);
            point.px -= (dx / dist) * force;
            point.py -= (dy / dist) * force;
        });
        game.createImpactRing(game.mouse.x, game.mouse.y, cfg.radius * 0.55, '#ffee9a');
        game.pushToolEffect({ type: 'hammerShock', x: game.mouse.x, y: game.mouse.y, radius: cfg.radius, life: cfg.shockwaveLife, maxLife: cfg.shockwaveLife });
        game.addBackgroundDecal?.('hammer', game.mouse.x, game.mouse.y, { radius: cfg.radius * 0.62, intensity: 1 });
        game.createFineParticles(game.mouse.x, game.mouse.y, '#d8d0bd', 8, 3.2);
        game.gainXP(2);
    }

    return { applyHammerImpact };
}
