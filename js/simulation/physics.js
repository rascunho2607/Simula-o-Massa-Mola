export function verletStep(point, gravity, friction) {
    const vx = (point.x - point.px) * friction;
    const vy = (point.y - point.py) * friction;
    point.px = point.x;
    point.py = point.y;
    point.x += vx;
    point.y += vy + gravity;
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
        game.recordMissionDamage(spring, effectiveDamage, damageType, source);
        game.updateDamageState(spring);

        if (damageType === 'fire') {
            spring.char = Math.min(1, (spring.char || 0) + effectiveDamage / spring.maxHp);
        }

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
