export const mouseTool = { id: 'mouse' };

export function createMouseEffectsController(game) {
    function duplicateMouseEffect() {
        const duplicateMouse = {
            x: game.width - game.mouse.x,
            y: game.mouse.y,
            active: true,
            life: 300,
        };

        const duplicateInterval = setInterval(() => {
            game.points.forEach(point => {
                if (point.pinned) return;
                const dx = point.x - duplicateMouse.x;
                const dy = point.y - duplicateMouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 80) {
                    const force = game.MOUSE_POWER * 0.7;
                    point.px -= (game.mouse.x - game.mouse.px) * force;
                    point.py -= (game.mouse.y - game.mouse.py) * force;
                }
            });

            if (Math.random() < 0.2) {
                game.particles.push(new game.Particle(
                    duplicateMouse.x,
                    duplicateMouse.y,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    '#ff55ff',
                    2 + Math.random() * 3,
                    20 + Math.random() * 20
                ));
            }

            duplicateMouse.life--;
            if (duplicateMouse.life <= 0) clearInterval(duplicateInterval);
        }, 16);
    }

    return { duplicateMouseEffect };
}
