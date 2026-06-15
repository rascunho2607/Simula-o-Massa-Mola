export const dartTool = { id: 'dart' };

export function createDartToolController(game) {
    function clearAllDarts() {
        game.setDarts([]);
        game.points.forEach(point => point.unpinByDart());
        game.updateDartCounter();
    }

    return { clearAllDarts };
}

export function createDartEffectsController(game) {
    function createChainLightning(stuckDarts) {
        if (stuckDarts.length < 2) return;

        for (let i = 0; i < stuckDarts.length - 1; i++) {
            const dart1 = stuckDarts[i];
            const dart2 = stuckDarts[i + 1];
            createLightningEffect(dart1.x, dart1.y, dart2.x, dart2.y);

            const steps = 10;
            for (let j = 0; j <= steps; j++) {
                const t = j / steps;
                const x = dart1.x + (dart2.x - dart1.x) * t;
                const y = dart1.y + (dart2.y - dart1.y) * t;

                game.points.forEach(point => {
                    if (point.pinned) return;
                    const dx = point.x - x;
                    const dy = point.y - y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 30) {
                        point.px += (Math.random() - 0.5) * 10;
                        point.py += (Math.random() - 0.5) * 10;

                        if (Math.random() < 0.3) {
                            game.particles.push(new game.Particle(
                                point.x,
                                point.y,
                                (Math.random() - 0.5) * 5,
                                (Math.random() - 0.5) * 5,
                                '#00ffff',
                                2 + Math.random() * 3,
                                20 + Math.random() * 20
                            ));
                        }
                    }
                });
            }
        }

        for (let i = 0; i < 20; i++) {
            const dart = stuckDarts[Math.floor(Math.random() * stuckDarts.length)];
            game.particles.push(new game.Particle(
                dart.x + (Math.random() - 0.5) * 20,
                dart.y + (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                '#00ffff',
                3 + Math.random() * 4,
                30 + Math.random() * 30
            ));
        }
    }

    function createLightningEffect(x1, y1, x2, y2) {
        const segments = 8;
        let lastX = x1;
        let lastY = y1;

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const baseX = x1 + (x2 - x1) * t;
            const baseY = y1 + (y2 - y1) * t;
            const currentX = baseX + (Math.random() - 0.5) * 30;
            const currentY = baseY + (Math.random() - 0.5) * 30;

            game.ctx.save();
            game.ctx.strokeStyle = '#00ffff';
            game.ctx.lineWidth = 2;
            game.ctx.globalAlpha = 0.8;
            game.ctx.beginPath();
            game.ctx.moveTo(lastX, lastY);
            game.ctx.lineTo(currentX, currentY);
            game.ctx.stroke();
            game.ctx.restore();

            for (let j = 0; j < 3; j++) {
                game.particles.push(new game.Particle(
                    (lastX + currentX) / 2,
                    (lastY + currentY) / 2,
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    '#00ffff',
                    2 + Math.random() * 2,
                    15 + Math.random() * 15
                ));
            }

            lastX = currentX;
            lastY = currentY;
        }
    }

    function activateDartMagnet(stuckDarts) {
        const magnetStrength = 0.5;
        const magnetRadius = 150;

        stuckDarts.forEach(dart => {
            game.points.forEach(point => {
                if (point.pinned || point.dartId === dart.id) return;
                const dx = point.x - dart.x;
                const dy = point.y - dart.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < magnetRadius && dist > 0) {
                    const force = magnetStrength * (1 - dist / magnetRadius);
                    point.px -= (dx / dist) * force;
                    point.py -= (dy / dist) * force;

                    if (Math.random() < 0.05) {
                        game.particles.push(new game.Particle(
                            point.x,
                            point.y,
                            (-dx / dist) * 2,
                            (-dy / dist) * 2,
                            '#ffff00',
                            2 + Math.random() * 2,
                            20 + Math.random() * 20
                        ));
                    }
                }
            });

            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * magnetRadius;
                game.particles.push(new game.Particle(
                    dart.x + Math.cos(angle) * radius,
                    dart.y + Math.sin(angle) * radius,
                    -Math.cos(angle) * 0.5,
                    -Math.sin(angle) * 0.5,
                    '#ffff00',
                    1 + Math.random() * 2,
                    30 + Math.random() * 30
                ));
            }
        });

        setTimeout(() => {}, 3000);
    }

    function createPortal(dart1, dart2) {
        const portalRadius = 40;
        const portalDuration = 5000;

        createPortalEffect(dart1.x, dart1.y, portalRadius, '#ff00ff');
        createPortalEffect(dart2.x, dart2.y, portalRadius, '#00ffff');

        const portalInterval = setInterval(() => {
            game.points.forEach(point => {
                if (point.pinned) return;

                const dx1 = point.x - dart1.x;
                const dy1 = point.y - dart1.y;
                const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

                if (dist1 < portalRadius) {
                    point.x = dart2.x + (Math.random() - 0.5) * 10;
                    point.y = dart2.y + (Math.random() - 0.5) * 10;
                    point.px = point.x;
                    point.py = point.y;

                    for (let i = 0; i < 5; i++) {
                        game.particles.push(new game.Particle(dart1.x, dart1.y, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#ff00ff', 3 + Math.random() * 3, 30 + Math.random() * 30));
                        game.particles.push(new game.Particle(dart2.x, dart2.y, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#00ffff', 3 + Math.random() * 3, 30 + Math.random() * 30));
                    }
                }

                const dx2 = point.x - dart2.x;
                const dy2 = point.y - dart2.y;
                const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                if (dist2 < portalRadius) {
                    point.x = dart1.x + (Math.random() - 0.5) * 10;
                    point.y = dart1.y + (Math.random() - 0.5) * 10;
                    point.px = point.x;
                    point.py = point.y;
                }
            });
        }, 100);

        setTimeout(() => clearInterval(portalInterval), portalDuration);
    }

    function createPortalEffect(x, y, radius, color) {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            game.particles.push(new game.Particle(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                Math.cos(angle + Math.PI / 2) * 2,
                Math.sin(angle + Math.PI / 2) * 2,
                color,
                3 + Math.random() * 2,
                100 + Math.random() * 100
            ));
        }

        for (let i = 0; i < 30; i++) {
            game.particles.push(new game.Particle(
                x + (Math.random() - 0.5) * radius * 0.5,
                y + (Math.random() - 0.5) * radius * 0.5,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                color,
                2 + Math.random() * 3,
                50 + Math.random() * 50
            ));
        }
    }

    return { createChainLightning, createLightningEffect, activateDartMagnet, createPortal, createPortalEffect };
}
