export function clearCanvas(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
}

function hexToRgb(hex) {
    const normalized = hex.replace('#', '');
    const value = Number.parseInt(normalized, 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
    };
}

function mixRgb(a, b, amount) {
    return {
        r: Math.round(a.r + (b.r - a.r) * amount),
        g: Math.round(a.g + (b.g - a.g) * amount),
        b: Math.round(a.b + (b.b - a.b) * amount),
    };
}

function rgbToCss(rgb, alpha = 1) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getMaterialDamageColor(entity, config, frameCount = 0) {
    const material = config.materials?.[entity.material] ?? config.materials?.cloth;
    const base = hexToRgb(material?.color ?? config.lineColor);
    const damageRatio = entity.maxHp ? 1 - Math.max(0, entity.hp) / entity.maxHp : 0;
    const layerTint = entity.layerIndex === 2 ? hexToRgb('#111111') : hexToRgb('#ffffff');
    let color = entity.layerIndex === 1 ? base : mixRgb(base, layerTint, entity.layerIndex === 2 ? 0.12 : 0.1);

    if ((entity.electricCharge || 0) > 0) {
        const pulse = 0.45 + Math.sin(frameCount * 0.55) * 0.25;
        color = mixRgb(color, hexToRgb('#7ee8ff'), 0.58 + pulse * 0.18);
    } else if ((entity.acidAmount || 0) > 0) {
        const acidRatio = Math.min(1, (entity.acidAmount || 0) / Math.max(1, config.acidTool?.duration || 260));
        color = mixRgb(color, acidRatio > 0.65 ? hexToRgb('#baff38') : hexToRgb('#4bd64f'), 0.38 + acidRatio * 0.35);
    }

    if (entity.char > 0.45) return rgbToCss(mixRgb(color, hexToRgb('#2a241f'), 0.72), 0.82 + damageRatio * 0.15);
    if (damageRatio >= config.clothDamage.damageVisualThreshold3) {
        const pulse = 0.5 + Math.sin(frameCount * 0.35) * 0.18;
        color = mixRgb(color, hexToRgb('#ff3322'), 0.58 + pulse * 0.18);
    } else if (damageRatio >= config.clothDamage.damageVisualThreshold2) {
        color = mixRgb(color, hexToRgb('#ff8a28'), 0.5);
    } else if (damageRatio >= config.clothDamage.damageVisualThreshold1) {
        color = mixRgb(color, hexToRgb('#ffd166'), 0.36);
    }

    return rgbToCss(color, 0.92);
}

export function getSpringDamageStyle(spring, config, frameCount = 0) {
    const damageRatio = spring.maxHp ? 1 - Math.max(0, spring.hp) / spring.maxHp : 0;
    const baseWidth = spring.isSeam ? config.lineWidth + 1.4 : config.lineWidth;

    if (spring.char > 0.45) {
        return {
            color: getMaterialDamageColor(spring, config, frameCount),
            lineWidth: Math.max(0.35, baseWidth + damageRatio * 0.8),
        };
    }

    return {
        color: getMaterialDamageColor(spring, config, frameCount),
        lineWidth: Math.max(0.35, baseWidth + damageRatio * 1.05 + (spring.isWeakPoint ? 0.5 : 0)),
        dash: spring.isSeam ? [6, 4] : [],
        glow: spring.isSeam || spring.isWeakPoint,
    };
}

export function drawCoveredTarget(ctx, target, config) {
    if (!target || config?.targetConfig?.enabled === false) return;
    const hpRatio = target.maxHp ? target.hp / target.maxHp : 0;

    ctx.save();
    ctx.globalAlpha = target.exposed || target.destroyed ? 1 : 0.5;
    const glowRadius = target.radius * (target.exposed ? 1.45 : 1.05);
    const gradient = ctx.createRadialGradient(
        target.x,
        target.y,
        target.radius * 0.1,
        target.x,
        target.y,
        glowRadius
    );

    if (target.destroyed) {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.35, 'rgba(100, 210, 255, 0.45)');
        gradient.addColorStop(1, 'rgba(100, 210, 255, 0)');
    } else if (target.exposed) {
        gradient.addColorStop(0, 'rgba(140, 230, 255, 0.95)');
        gradient.addColorStop(0.45, 'rgba(60, 170, 255, 0.42)');
        gradient.addColorStop(1, 'rgba(60, 170, 255, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(40, 90, 120, 0.55)');
        gradient.addColorStop(1, 'rgba(40, 90, 120, 0)');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(target.x, target.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = target.destroyed ? 0.45 : 0.9;
    ctx.fillStyle = target.exposed ? '#8feaff' : '#28495d';
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = target.destroyed ? '#ffffff' : (target.exposed ? '#ddfbff' : '#4f89a8');
    ctx.lineWidth = target.exposed ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
    ctx.stroke();
    ctx.restore();
}
