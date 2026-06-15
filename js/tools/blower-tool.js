export const blowerTool = { id: 'blower' };

export function createBlowerEffectsController(game) {
    function createVortex(x, y) {
        const vortex = { x, y, strength: 8, life: 300, radius: 120 };

        const vortexInterval = setInterval(() => {
            game.points.forEach(point => {
                if (point.pinned || point.frozen) return;
                const dx = point.x - vortex.x;
                const dy = point.y - vortex.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < vortex.radius) {
                    const force = (1 - dist / vortex.radius) * vortex.strength * 0.15;
                    point.px += (-dy / dist) * force;
                    point.py += (dx / dist) * force;
                    point.px -= (dx / dist) * force * 0.3;
                    point.py -= (dy / dist) * force * 0.3;
                }
            });

            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * vortex.radius;
                game.particles.push(new game.Particle(
                    vortex.x + Math.cos(angle) * radius,
                    vortex.y + Math.sin(angle) * radius,
                    -Math.sin(angle) * 2,
                    Math.cos(angle) * 2,
                    '#55aaff',
                    2 + Math.random() * 3,
                    40 + Math.random() * 40
                ));
            }

            vortex.life--;
            if (vortex.life <= 0) clearInterval(vortexInterval);
        }, 16);

        return true;
    }

    function createTornado(x, y) {
        const tornado = { x, y, strength: 12, life: 400, radius: 150, vx: (Math.random() - 0.5) * 2, vy: -1 };

        const tornadoInterval = setInterval(() => {
            tornado.x += tornado.vx;
            tornado.y += tornado.vy;

            game.points.forEach(point => {
                if (point.pinned || point.frozen) return;
                const dx = point.x - tornado.x;
                const dy = point.y - tornado.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < tornado.radius) {
                    const force = (1 - dist / tornado.radius) * tornado.strength * 0.2;
                    point.px += (-dy / dist) * force * 1.5;
                    point.py += (dx / dist) * force * 1.5;
                    point.py -= force * 0.8;
                }
            });

            if (Math.random() < 0.5) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * tornado.radius * 0.7;
                game.particles.push(new game.Particle(
                    tornado.x + Math.cos(angle) * radius,
                    tornado.y + Math.sin(angle) * radius,
                    -Math.sin(angle) * 3 + (Math.random() - 0.5),
                    Math.cos(angle) * 3 - 2 + (Math.random() - 0.5),
                    '#ffffff',
                    3 + Math.random() * 4,
                    60 + Math.random() * 60
                ));
            }

            tornado.life--;
            if (tornado.life <= 0 || tornado.y < -100) clearInterval(tornadoInterval);
        }, 16);

        return true;
    }

    function freezeArea(x, y) {
        const freezeRadius = 100;
        const freezeDuration = 200;

        game.points.forEach(point => {
            const dx = point.x - x;
            const dy = point.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < freezeRadius) {
                point.freeze(freezeDuration);

                if (Math.random() < 0.3) {
                    game.particles.push(new game.Particle(
                        point.x,
                        point.y,
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2,
                        '#55aaff',
                        2 + Math.random() * 3,
                        30 + Math.random() * 30
                    ));
                }
            }
        });

        for (let i = 0; i < 20; i++) {
            game.particles.push(new game.Particle(
                x + (Math.random() - 0.5) * freezeRadius,
                y + (Math.random() - 0.5) * freezeRadius,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                '#55aaff',
                3 + Math.random() * 4,
                40 + Math.random() * 40
            ));
        }
    }

    return { createVortex, createTornado, freezeArea };
}
