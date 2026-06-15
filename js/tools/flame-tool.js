export const flameTool = { id: 'flame' };

export function createFlameEffectsController(game) {
    function createSparks(x, y) {
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 5;
            game.fireParticles.push(new game.FireParticle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0.8 + Math.random() * 0.4
            ));
        }
    }

    function activatePhoenix() {
        game.points.forEach(point => {
            if (point.isBurning && Math.random() < 0.7) {
                point.extinguish();
                point.burnTime = 0;

                for (let i = 0; i < 5; i++) {
                    game.particles.push(new game.Particle(
                        point.x,
                        point.y,
                        (Math.random() - 0.5) * 3,
                        -Math.random() * 2 - 1,
                        '#ffaa00',
                        3 + Math.random() * 3,
                        40 + Math.random() * 40
                    ));
                }
            }
        });

        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 100;
            game.particles.push(new game.Particle(
                game.mouse.x + Math.cos(angle) * radius,
                game.mouse.y + Math.sin(angle) * radius,
                -Math.cos(angle) * 2,
                -Math.sin(angle) * 2,
                '#ff5500',
                4 + Math.random() * 5,
                60 + Math.random() * 60
            ));
        }
    }

    return { createSparks, activatePhoenix };
}
