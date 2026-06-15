import { state } from '../core/state.js';

export function ignitePoint(point, intensity = 1) {
    if (!point || point.isDestroyed || point.active === false) return;
    point.isBurning = true;
    point.burnIntensity = Math.min(intensity, 1.5);
    point.burnTime = 0;
    state.burningPoints.add(point);
}

export function extinguishPoint(point) {
    point.isBurning = false;
    point.burnIntensity = 0;
    state.burningPoints.delete(point);
}

export function extinguishAllFire({ points = state.points, springs = state.springs } = {}) {
    points.forEach((point) => point.extinguish?.() ?? extinguishPoint(point));
    springs.forEach((spring) => spring.extinguish?.());
    state.fireParticles = [];
    state.burningPoints.clear();
}

export function createFireSystemController(game) {
    function extinguishAllFire() {
        game.points.forEach(point => point.extinguish());
        game.springs.forEach(spring => spring.extinguish());
        game.setFireParticles([]);
        game.setImpactRings([]);
        game.setDamageParticleBudget(0);
        game.burningPoints.clear();
    }

    return { extinguishAllFire };
}
