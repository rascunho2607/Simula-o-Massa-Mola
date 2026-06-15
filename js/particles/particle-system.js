export function updateParticleList(list) {
    return list.filter(particle => particle.update?.() !== false && particle.life > 0);
}

export function pushLimitedParticle(list, particle, maxParticles) {
    if (list.length < maxParticles) list.push(particle);
}

export function createParticleSystemController(game) {
    function canSpawnDamageParticle() {
        const maxParticles = game.config.damageEffectsConfig.maxDamageParticles;
        if (game.particles.length >= maxParticles || game.damageParticleBudget >= maxParticles) return false;
        game.damageParticleBudget++;
        return true;
    }

    function pushDamageParticle(x, y, vx, vy, color, size, life) {
        if (!canSpawnDamageParticle()) return;
        game.particles.push(new game.Particle(x, y, vx, vy, color, size, life));
    }

    function createImpactRing(x, y, radius, color = '#ffcc55') {
        if (!game.config.damageEffectsConfig.enableImpactRings) return;
        if (game.impactRings.length > 18) game.impactRings.shift();
        game.impactRings.push({
            x,
            y,
            radius,
            maxRadius: radius,
            life: game.config.damageEffectsConfig.impactRingLife,
            maxLife: game.config.damageEffectsConfig.impactRingLife,
            color,
        });
    }

    function updateImpactRings() {
        game.impactRings = game.impactRings.filter(ring => ring.life > 0);
        game.impactRings.forEach(ring => {
            ring.life--;
            ring.radius += ring.maxRadius * 0.035;
        });
    }

    function drawImpactRings() {
        game.impactRings.forEach(ring => {
            const alpha = ring.life / ring.maxLife;
            game.ctx.save();
            game.ctx.globalAlpha = alpha * 0.85;
            game.ctx.strokeStyle = ring.color;
            game.ctx.lineWidth = 2 + alpha * 4;
            game.ctx.beginPath();
            game.ctx.arc(ring.x, ring.y, ring.radius * (1 - alpha * 0.25), 0, Math.PI * 2);
            game.ctx.stroke();
            game.ctx.restore();
        });
    }

    function createDamageBurst(x, y, damageType = 'impact', intensity = 1, requestedCount = 10) {
        const effects = game.config.damageEffectsConfig;
        if (!effects.enableFiberParticles && ['slash', 'tension', 'pierce'].includes(damageType)) return;
        const count = Math.min(Math.ceil(requestedCount * intensity), effects.maxBurstParticles);
        const palette = {
            impact: ['#ffffff', '#ffcc66', '#ffaa33'],
            slash: ['#d7f0ff', '#ffffff', '#88ccff'],
            pierce: ['#ffff88', '#ffdd55', '#ffffff'],
            fire: ['#ffcc55', '#ff6633', '#444444'],
            explosion: ['#ffdd77', '#ff7733', '#ff3300'],
            tension: ['#ff8844', '#ffdd99', '#ffffff'],
            chemical: ['#b7ff4a', '#58d847', '#d8ff9a'],
            electric: ['#bff8ff', '#59d8ff', '#ffffff'],
            ash: ['#555555', '#777777', '#222222'],
        };
        const colors = palette[damageType] || palette.impact;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.7 + Math.random() * 2.8) * intensity;
            const color = colors[Math.floor(Math.random() * colors.length)];
            pushDamageParticle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - (damageType === 'fire' || damageType === 'ash' ? Math.random() * 0.8 : 0),
                color,
                1.2 + Math.random() * 2.8,
                effects.fiberParticleLife * (0.65 + Math.random() * 0.7)
            );
        }
    }

    return { canSpawnDamageParticle, pushDamageParticle, createImpactRing, updateImpactRings, drawImpactRings, createDamageBurst };
}
