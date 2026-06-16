export function verletStep(point, gravity, friction) {
    const vx = (point.x - point.px) * friction;
    const vy = (point.y - point.py) * friction;
    point.px = point.x;
    point.py = point.y;
    point.x += vx;
    point.y += vy + gravity;
}

const OLD_FIXED_PHYSICS_ITERATIONS = 5;

function getAdaptiveConfig(game) {
    return game.config?.physicsAdaptive || {};
}

function clampIterations(value, cfg) {
    const min = cfg.minIterations ?? 2;
    const max = cfg.maxIterations ?? OLD_FIXED_PHYSICS_ITERATIONS;
    return Math.max(min, Math.min(max, value));
}

function getAdaptiveState(game) {
    if (!game.__physicsAdaptiveState) {
        game.__physicsAdaptiveState = {
            state: 'active',
            iterations: OLD_FIXED_PHYSICS_ITERATIONS,
            cooldown: getAdaptiveConfig(game).activeCooldownFrames ?? 45,
            stableSamples: 0,
            lastSampleFrame: -Infinity,
            avgVelocity: 0,
            maxVelocity: 0,
            movingPointCount: 0,
            highStressCount: 0,
            sampledPointCount: 0,
            sampledSpringCount: 0,
            lastDebugFrame: 0,
            lastReason: 'init',
        };
    }
    return game.__physicsAdaptiveState;
}

function isToolInteractionActive(game) {
    if (game.flameActive || game.blowForce > 0 || game.hookState?.active) return true;
    if (!game.mouse?.down) return false;
    const tool = game.activeTool || 'mouse';
    return tool === 'mouse'
        || tool === 'hook'
        || tool === 'blower'
        || tool === 'flame'
        || tool === 'blade'
        || tool === 'drill'
        || tool === 'laser'
        || tool === 'acid'
        || tool === 'electric'
        || tool === 'glue'
        || tool === 'scissor'
        || tool === 'hammer';
}

function hasRecentDamage(game, frameIndex, maxAge) {
    const points = game.points || [];
    const springs = game.springs || [];

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (!point) continue;
        const damageAge = frameIndex - (point.lastDamageFrame ?? -Infinity);
        if (damageAge >= 0 && damageAge <= maxAge) return true;
        if (point.isBurning || point.isCorroding || (point.electricCharge || 0) > 0) return true;
    }

    for (let i = 0; i < springs.length; i++) {
        const spring = springs[i];
        if (!spring) continue;
        const damageAge = frameIndex - (spring.lastDamageFrame ?? -Infinity);
        if (damageAge >= 0 && damageAge <= maxAge) return true;
        if (spring.isBurning || spring.isCorroding || (spring.electricCharge || 0) > 0) return true;
    }

    return false;
}

function estimateClothActivity(game, frameIndex, previousMetrics) {
    const cfg = getAdaptiveConfig(game);
    const points = game.points || [];
    const springs = game.springs || [];
    const velocityThresholdSq = (cfg.stabilityVelocityThreshold ?? 0.18) * (cfg.stabilityVelocityThreshold ?? 0.18);
    const motionThresholdSq = (cfg.stabilityMotionThreshold ?? 0.22) * (cfg.stabilityMotionThreshold ?? 0.22);
    const stressThreshold = cfg.highStressThreshold ?? 0.18;
    const highStressMaxSq = (1 + stressThreshold) * (1 + stressThreshold);
    const highStressMinSq = Math.max(0, (1 - stressThreshold) * (1 - stressThreshold));
    const pointStep = Math.max(1, Math.floor(points.length / 80));
    const springStep = Math.max(1, Math.floor(springs.length / 120));
    let velocitySqSum = 0;
    let maxVelocitySq = 0;
    let movingPointCount = 0;
    let sampledPointCount = 0;
    let highStressCount = 0;
    let sampledSpringCount = 0;

    for (let i = 0; i < points.length; i += pointStep) {
        const point = points[i];
        if (!point || point.active === false || point.isDestroyed || point.pinned) continue;
        const dx = point.x - point.px;
        const dy = point.y - point.py;
        const velocitySq = dx * dx + dy * dy;
        velocitySqSum += velocitySq;
        if (velocitySq > maxVelocitySq) maxVelocitySq = velocitySq;
        if (velocitySq > motionThresholdSq) movingPointCount++;
        sampledPointCount++;
    }

    for (let i = 0; i < springs.length; i += springStep) {
        const spring = springs[i];
        if (!spring || !spring.active || spring.broken || !spring.length) continue;
        const dx = spring.p2.x - spring.p1.x;
        const dy = spring.p2.y - spring.p1.y;
        const lengthRatioSq = (dx * dx + dy * dy) / Math.max(1, spring.length * spring.length);
        if (lengthRatioSq > highStressMaxSq || lengthRatioSq < highStressMinSq) highStressCount++;
        sampledSpringCount++;
    }

    const avgVelocity = sampledPointCount > 0 ? Math.sqrt(velocitySqSum / sampledPointCount) : 0;
    const maxVelocity = Math.sqrt(maxVelocitySq);
    const movingRatio = sampledPointCount > 0 ? movingPointCount / sampledPointCount : 0;
    const stressRatio = sampledSpringCount > 0 ? highStressCount / sampledSpringCount : 0;
    const activeVelocitySq = velocityThresholdSq * 9;
    const isActive = maxVelocitySq > activeVelocitySq
        || movingRatio > 0.28
        || stressRatio > 0.18;
    const isStable = avgVelocity <= (cfg.stabilityVelocityThreshold ?? 0.18)
        && movingRatio <= 0.08
        && stressRatio <= 0.04
        && !hasRecentDamage(game, frameIndex, cfg.sampleEveryFrames ?? 6);

    return {
        ...previousMetrics,
        avgVelocity,
        maxVelocity,
        movingPointCount,
        highStressCount,
        sampledPointCount,
        sampledSpringCount,
        active: isActive,
        stable: isStable,
    };
}

export function getAdaptivePhysicsIterations(game) {
    const cfg = getAdaptiveConfig(game);
    if (cfg.enabled === false) return OLD_FIXED_PHYSICS_ITERATIONS;

    const state = getAdaptiveState(game);
    const frameIndex = game.frameCount ?? 0;
    const eventFrame = game.physicsAdaptiveEventFrame ?? -Infinity;
    const eventAge = frameIndex - eventFrame;

    if (eventAge >= 0 && eventAge <= (cfg.activeCooldownFrames ?? 45)) {
        state.cooldown = Math.max(state.cooldown, (cfg.activeCooldownFrames ?? 45) - eventAge);
        state.state = 'active';
        state.iterations = clampIterations(cfg.activeIterations ?? OLD_FIXED_PHYSICS_ITERATIONS, cfg);
        state.stableSamples = 0;
        state.lastReason = 'event';
    }

    if (isToolInteractionActive(game)) {
        state.cooldown = Math.max(state.cooldown, cfg.activeCooldownFrames ?? 45);
        state.state = 'active';
        state.iterations = clampIterations(cfg.activeIterations ?? OLD_FIXED_PHYSICS_ITERATIONS, cfg);
        state.stableSamples = 0;
        state.lastReason = 'tool';
    }

    if (state.cooldown > 0) {
        state.cooldown--;
        state.state = 'active';
        state.iterations = clampIterations(cfg.activeIterations ?? OLD_FIXED_PHYSICS_ITERATIONS, cfg);
        return state.iterations;
    }

    const sampleEveryFrames = Math.max(1, cfg.sampleEveryFrames ?? 6);
    if (frameIndex - state.lastSampleFrame < sampleEveryFrames) {
        return state.iterations;
    }

    const metrics = estimateClothActivity(game, frameIndex, state);
    Object.assign(state, metrics);
    state.lastSampleFrame = frameIndex;

    if (metrics.active || hasRecentDamage(game, frameIndex, sampleEveryFrames)) {
        state.state = 'active';
        state.iterations = clampIterations(cfg.activeIterations ?? OLD_FIXED_PHYSICS_ITERATIONS, cfg);
        state.stableSamples = 0;
        state.lastReason = metrics.active ? 'motion' : 'damage';
        return state.iterations;
    }

    if (metrics.stable) state.stableSamples++;
    else state.stableSamples = 0;

    if (state.stableSamples >= (cfg.stableSampleThreshold ?? 3)) {
        state.state = 'stable';
        state.iterations = clampIterations(cfg.stableIterations ?? 2, cfg);
    } else {
        state.state = 'normal';
        state.iterations = clampIterations(cfg.normalIterations ?? 3, cfg);
    }
    state.lastReason = metrics.stable ? 'stable-sample' : 'normal-motion';

    return state.iterations;
}

export function recordAdaptivePhysicsDebug(game, physicsMs) {
    const cfg = getAdaptiveConfig(game);
    if (cfg.enabled === false || cfg.debug !== true) return;
    const state = getAdaptiveState(game);
    const frameIndex = game.frameCount ?? 0;
    if (frameIndex - state.lastDebugFrame < 120) return;
    state.lastDebugFrame = frameIndex;
    console.log(
        `[physics-adaptive] state=${state.state} `
        + `iterations=${state.iterations} `
        + `avgVelocity=${state.avgVelocity.toFixed(3)} `
        + `highStressCount=${state.highStressCount} `
        + `cooldown=${state.cooldown} `
        + `physics=${physicsMs.toFixed(2)}ms`
    );
}

export function createDamageSystemController(game) {
    function isPointAlive(point) {
        return point && point.active !== false && !point.isDestroyed;
    }

    function isSpringAlive(spring) {
        return spring && spring.active && !spring.broken && isPointAlive(spring.p1) && isPointAlive(spring.p2);
    }

    function applyDamageToPoint(point, amount, damageType = 'impact', source = {}) {
        if (!isPointAlive(point) || amount <= 0) return 0;
        let effectiveDamage = Math.max(0, amount / game.getDamageResistance(point, damageType) - (point.armor || 0));
        if (effectiveDamage <= 0 && damageType !== 'tension' && amount > 0) {
            effectiveDamage = Math.min(0.04, amount * 0.12);
        }
        if (effectiveDamage <= 0) return 0;

        point.hp = Math.max(0, point.hp - effectiveDamage);
        point.lastDamageType = damageType;
        point.lastDamageFrame = game.frameCount;
        game.markPhysicsActive?.(`point-damage-${damageType}`);
        game.recordMissionDamage(point, effectiveDamage, damageType, source);
        game.updateDamageState(point);

        if (damageType === 'fire') {
            point.char = Math.min(1, (point.char || 0) + effectiveDamage / point.maxHp);
        }

        if (effectiveDamage >= game.config.clothDamage.minDamageToShowEffect) {
            game.createDamageBurst(source.x ?? point.x, source.y ?? point.y, damageType, Math.min(1.5, effectiveDamage / 18), 5);
        }

        if (point.hp <= 0) {
            destroyPoint(point, damageType, source);
        }

        return effectiveDamage;
    }

    function applyDamageToSpring(spring, amount, damageType = 'impact', source = {}) {
        if (!isSpringAlive(spring) || amount <= 0) return 0;
        let effectiveDamage = Math.max(0, amount / game.getDamageResistance(spring, damageType) - (spring.armor || 0));
        if (effectiveDamage <= 0 && damageType !== 'tension' && amount > 0) {
            effectiveDamage = Math.min(0.04, amount * 0.12);
        }
        if (effectiveDamage <= 0) return 0;

        spring.hp = Math.max(0, spring.hp - effectiveDamage);
        spring.lastDamageType = damageType;
        spring.lastDamageFrame = game.frameCount;
        game.markPhysicsActive?.(`spring-damage-${damageType}`);
        game.recordMissionDamage(spring, effectiveDamage, damageType, source);
        game.updateDamageState(spring);

        if (damageType === 'fire') {
            spring.char = Math.min(1, (spring.char || 0) + effectiveDamage / spring.maxHp);
        }
        game.markSpringLineTopologyDirtyIfVisualStateChanged?.(spring, `spring-damage-${damageType}`);

        if (effectiveDamage >= game.config.clothDamage.minDamageToShowEffect) {
            const x = source.x ?? (spring.p1.x + spring.p2.x) / 2;
            const y = source.y ?? (spring.p1.y + spring.p2.y) / 2;
            game.createDamageBurst(x, y, damageType, Math.min(1.7, effectiveDamage / 16), 6);
        }

        if (spring.hp <= 0) {
            breakSpring(spring, damageType, source);
        }

        return effectiveDamage;
    }

    function breakSpring(spring, damageType = 'impact', source = {}) {
        if (!spring || spring.broken) return;
        spring.active = false;
        spring.broken = true;
        spring.damageState = 4;
        spring.hp = 0;
        spring.isBurning = false;
        game.markPhysicsActive?.(`spring-broken-${damageType}`);
        game.markTopologyDirty?.('spring-broken');

        const x = source.x ?? (spring.p1.x + spring.p2.x) / 2;
        const y = source.y ?? (spring.p1.y + spring.p2.y) / 2;
        game.createDamageBurst(x, y, damageType === 'fire' ? 'ash' : damageType, spring.isSeam ? 2 : 1.4, spring.isSeam ? 24 : 12);

        if (spring.isSeam) {
            game.createImpactRing(x, y, spring.releasesOnBreak ? 34 : 22, '#ffd166');
            game.springs.forEach(other => {
                if (!isSpringAlive(other) || other === spring) return;
                const sharesPoint = other.p1 === spring.p1 || other.p1 === spring.p2 || other.p2 === spring.p1 || other.p2 === spring.p2;
                if (sharesPoint) applyDamageToSpring(other, game.config.clothDamage.springBaseHp * 0.08, 'tension', { x, y });
            });
            [spring.p1, spring.p2].forEach(point => {
                if (!isPointAlive(point) || point.pinned) return;
                const dx = point.x - x;
                const dy = point.y - y;
                const dist = Math.max(1, Math.hypot(dx, dy));
                point.px -= (dx / dist) * (spring.releasesOnBreak ? 5 : 3);
                point.py -= (dy / dist) * (spring.releasesOnBreak ? 5 : 3);
            });
        }
    }

    function destroyPoint(point, damageType = 'impact', source = {}) {
        if (!point || point.isDestroyed) return;
        point.active = false;
        point.isDestroyed = true;
        point.damageState = 4;
        point.hp = 0;
        point.isBurning = false;
        game.markPhysicsActive?.(`point-destroyed-${damageType}`);
        game.markTopologyDirty?.('point-destroyed');

        if (point.dartId) {
            game.pinnedByDarts.delete(point);
            point.dartId = null;
            point.pinned = false;
            game.updateDartCounter();
        }

        game.springs.forEach(spring => {
            if (spring.active && (spring.p1 === point || spring.p2 === point)) {
                breakSpring(spring, damageType, source);
            }
        });

        game.createDamageBurst(source.x ?? point.x, source.y ?? point.y, damageType === 'fire' ? 'ash' : damageType, 1.6, 16);
    }

    function applyAreaDamage(x, y, radius, amount, damageType = 'impact', falloff = true) {
        game.points.forEach(point => {
            if (!isPointAlive(point)) return;
            const dist = Math.hypot(point.x - x, point.y - y);
            if (dist > radius) return;
            const ratio = falloff ? 1 - dist / radius : 1;
            applyDamageToPoint(point, amount * ratio, damageType, { x: point.x, y: point.y, originX: x, originY: y });
        });

        game.springs.forEach(spring => {
            if (!isSpringAlive(spring)) return;
            const midX = (spring.p1.x + spring.p2.x) / 2;
            const midY = (spring.p1.y + spring.p2.y) / 2;
            const dist = Math.hypot(midX - x, midY - y);
            if (dist > radius) return;
            const ratio = falloff ? 1 - dist / radius : 1;
            applyDamageToSpring(spring, amount * ratio, damageType, { x: midX, y: midY, originX: x, originY: y });
        });

        if (game.coveredTarget.exposed && !game.coveredTarget.destroyed) {
            const dist = Math.hypot(game.coveredTarget.x - x, game.coveredTarget.y - y);
            if (dist < radius + game.coveredTarget.radius) {
                const ratio = falloff ? Math.max(0.1, 1 - Math.max(0, dist - game.coveredTarget.radius) / radius) : 1;
                game.damageCoveredTarget(amount * ratio * 0.45, damageType, x, y);
            }
        }
    }

    return {
        isPointAlive,
        isSpringAlive,
        applyDamageToPoint,
        applyDamageToSpring,
        breakSpring,
        destroyPoint,
        applyAreaDamage,
    };
}
