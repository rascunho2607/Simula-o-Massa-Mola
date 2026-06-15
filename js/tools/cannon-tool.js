export const cannonTool = { id: 'cannon' };

export function createCannonEffectsController(game) {
    function createExplosion(x, y, intensity = 1.0) {
        game.addBackgroundDecal?.('explosion', x, y, {
            radius: game.config.clothDamage.explosionRadius * intensity * 0.62,
            intensity,
            force: true,
        });

        for (let i = 0; i < 50 * intensity; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3 * intensity;
            game.pushDamageParticle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#ff5500',
                3 + Math.random() * 4 * intensity,
                30 + Math.random() * 30 * intensity
            );
        }

        game.createImpactRing(x, y, game.config.clothDamage.explosionRadius * intensity * 0.45, '#ff7733');
        game.applyAreaDamage(
            x,
            y,
            game.config.clothDamage.explosionRadius * intensity,
            game.config.clothDamage.explosionDamage * intensity,
            'explosion',
            true
        );

        game.points.forEach(point => {
            if (point.pinned || !game.isPointAlive(point)) return;
            const dx = point.x - x;
            const dy = point.y - y;
            const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));

            if (dist < 100 * intensity) {
                const force = (1 - dist / (100 * intensity)) * 10 * intensity;
                point.px -= (dx / dist) * force;
                point.py -= (dy / dist) * force;
            }
        });
    }

    function createRicochetEffect(x, y, angle) {
        for (let i = 0; i < 10; i++) {
            const sparkAngle = angle + (Math.random() - 0.5) * Math.PI / 2;
            const speed = 1 + Math.random() * 3;
            game.particles.push(new game.Particle(
                x,
                y,
                Math.cos(sparkAngle) * speed,
                Math.sin(sparkAngle) * speed,
                '#ffff00',
                2 + Math.random() * 2,
                20 + Math.random() * 20
            ));
        }
    }

    return { createExplosion, createRicochetEffect };
}
