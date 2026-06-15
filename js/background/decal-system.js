let decalCanvas = null;
let decalCtx = null;
let width = 0;
let height = 0;
let activeConfig = null;
let permanentDecals = [];
let temporaryDecals = [];
let smokeParticles = [];
let seeded = false;

const lastSpawnByType = new Map();
const lastPositionByType = new Map();

const DEFAULT_COOLDOWNS = {
    burn: 180,
    acid: 220,
    laser: 80,
    slash: 60,
    stab: 90,
    hammer: 120,
    explosion: 0,
    electric: 90,
    glue: 140,
};

function createLayerCanvas(nextWidth, nextHeight) {
    const layer = document.createElement('canvas');
    layer.width = Math.max(1, nextWidth);
    layer.height = Math.max(1, nextHeight);
    return layer;
}

function getDecalConfig() {
    return activeConfig?.decals || {};
}

function seededRandom(seed) {
    return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

function withSoftComposite(ctx, fn, alpha = 1, operation = 'source-over') {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.globalCompositeOperation = operation;
    fn();
    ctx.restore();
}

function radialMark(ctx, decal, stops, radiusMultiplier = 1) {
    const radius = (decal.radius || 34) * radiusMultiplier;
    const gradient = ctx.createRadialGradient(decal.x, decal.y, radius * 0.05, decal.x, decal.y, radius);
    stops.forEach(stop => gradient.addColorStop(stop[0], stop[1]));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(decal.x, decal.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawCracks(ctx, decal, count, radius, color = 'rgba(13, 12, 11, 0.48)') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.8, radius * 0.018);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + seededRandom(decal.seed + i) * 0.85;
        const start = radius * (0.18 + seededRandom(decal.seed + i * 3) * 0.18);
        const len = radius * (0.36 + seededRandom(decal.seed + i * 7) * 0.48);
        ctx.beginPath();
        ctx.moveTo(decal.x + Math.cos(angle) * start, decal.y + Math.sin(angle) * start);
        const bend = angle + (seededRandom(decal.seed + i * 11) - 0.5) * 0.55;
        ctx.lineTo(decal.x + Math.cos(bend) * len, decal.y + Math.sin(bend) * len);
        ctx.stroke();
    }
    ctx.restore();
}

function drawBurn(ctx, decal, alpha = 1) {
    withSoftComposite(ctx, () => {
        radialMark(ctx, decal, [
            [0, 'rgba(8, 7, 6, 0.82)'],
            [0.36, 'rgba(31, 24, 19, 0.62)'],
            [0.68, 'rgba(105, 54, 24, 0.24)'],
            [1, 'rgba(0, 0, 0, 0)'],
        ], 1);
    }, alpha);

    if (getDecalConfig().heatGlow !== false) {
        withSoftComposite(ctx, () => {
            radialMark(ctx, decal, [
                [0, 'rgba(255, 126, 40, 0.16)'],
                [0.45, 'rgba(255, 70, 18, 0.07)'],
                [1, 'rgba(255, 70, 18, 0)'],
            ], 1.22);
        }, alpha, 'screen');
    }
}

function drawExplosion(ctx, decal, alpha = 1) {
    drawBurn(ctx, { ...decal, radius: decal.radius || 76 }, alpha);
    const radius = decal.radius || 76;
    withSoftComposite(ctx, () => {
        ctx.strokeStyle = 'rgba(238, 171, 91, 0.26)';
        ctx.lineWidth = Math.max(1, radius * 0.025);
        ctx.beginPath();
        ctx.arc(decal.x, decal.y, radius * 0.58, 0, Math.PI * 2);
        ctx.stroke();
        drawCracks(ctx, decal, 12, radius, 'rgba(8, 8, 8, 0.54)');
    }, alpha);
}

function drawAcid(ctx, decal, alpha = 1) {
    const radius = decal.radius || 42;
    withSoftComposite(ctx, () => {
        radialMark(ctx, decal, [
            [0, 'rgba(172, 255, 68, 0.34)'],
            [0.38, 'rgba(75, 134, 47, 0.32)'],
            [0.72, 'rgba(34, 60, 35, 0.2)'],
            [1, 'rgba(0, 0, 0, 0)'],
        ], 1);

        ctx.strokeStyle = 'rgba(183, 255, 86, 0.25)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const offset = (seededRandom(decal.seed + i) - 0.5) * radius * 0.85;
            const drip = radius * (0.35 + seededRandom(decal.seed + i * 5) * 0.7);
            ctx.beginPath();
            ctx.moveTo(decal.x + offset, decal.y + radius * 0.08);
            ctx.bezierCurveTo(
                decal.x + offset * 0.8,
                decal.y + drip * 0.35,
                decal.x + offset * 1.15,
                decal.y + drip * 0.72,
                decal.x + offset * 0.75,
                decal.y + drip
            );
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(210, 255, 112, 0.24)';
        for (let i = 0; i < 8; i++) {
            const angle = seededRandom(decal.seed + i * 9) * Math.PI * 2;
            const dist = seededRandom(decal.seed + i * 13) * radius * 0.7;
            ctx.beginPath();
            ctx.arc(decal.x + Math.cos(angle) * dist, decal.y + Math.sin(angle) * dist, 1 + seededRandom(decal.seed + i * 17) * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }, alpha);
}

function drawSlash(ctx, decal, alpha = 1) {
    const length = decal.length || 72;
    const angle = decal.angle ?? -0.35;
    const passes = decal.passes || 3;
    withSoftComposite(ctx, () => {
        ctx.lineCap = 'round';
        for (let i = 0; i < passes; i++) {
            const offset = (i - (passes - 1) / 2) * 5;
            const nx = Math.cos(angle + Math.PI / 2) * offset;
            const ny = Math.sin(angle + Math.PI / 2) * offset;
            const jitter = (seededRandom(decal.seed + i) - 0.5) * 10;
            const half = length * (0.42 + seededRandom(decal.seed + i * 5) * 0.16);
            const x1 = decal.x + nx - Math.cos(angle) * half;
            const y1 = decal.y + ny - Math.sin(angle) * half;
            const x2 = decal.x + nx + Math.cos(angle) * (half + jitter);
            const y2 = decal.y + ny + Math.sin(angle) * (half + jitter);

            ctx.strokeStyle = 'rgba(4, 6, 7, 0.62)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(216, 235, 238, 0.32)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(x1, y1 - 1);
            ctx.lineTo(x2, y2 - 1);
            ctx.stroke();
        }
    }, alpha);
}

function drawStab(ctx, decal, alpha = 1) {
    const radius = decal.radius || 16;
    withSoftComposite(ctx, () => {
        radialMark(ctx, decal, [
            [0, 'rgba(0, 0, 0, 0.82)'],
            [0.28, 'rgba(12, 13, 13, 0.72)'],
            [0.68, 'rgba(85, 93, 94, 0.24)'],
            [1, 'rgba(0, 0, 0, 0)'],
        ], 1);
        ctx.strokeStyle = 'rgba(190, 203, 205, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(decal.x, decal.y, radius * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        drawCracks(ctx, decal, 5, radius * 1.3, 'rgba(0, 0, 0, 0.38)');
    }, alpha);
}

function drawHammer(ctx, decal, alpha = 1) {
    const radius = decal.radius || 44;
    withSoftComposite(ctx, () => {
        radialMark(ctx, decal, [
            [0, 'rgba(0, 0, 0, 0.34)'],
            [0.45, 'rgba(45, 52, 56, 0.32)'],
            [0.78, 'rgba(145, 159, 162, 0.12)'],
            [1, 'rgba(0, 0, 0, 0)'],
        ], 1);
        ctx.strokeStyle = 'rgba(205, 218, 217, 0.19)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(decal.x, decal.y, radius * 0.72, radius * 0.45, decal.angle || 0.2, 0, Math.PI * 2);
        ctx.stroke();
        drawCracks(ctx, decal, 7, radius * 0.95, 'rgba(0, 0, 0, 0.34)');
    }, alpha);
}

function drawLaser(ctx, decal, alpha = 1) {
    const length = decal.length || 92;
    const angle = decal.angle ?? 0;
    withSoftComposite(ctx, () => {
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255, 105, 45, 0.2)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(decal.x - Math.cos(angle) * length * 0.5, decal.y - Math.sin(angle) * length * 0.5);
        ctx.lineTo(decal.x + Math.cos(angle) * length * 0.5, decal.y + Math.sin(angle) * length * 0.5);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(18, 8, 3, 0.82)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(decal.x - Math.cos(angle) * length * 0.5, decal.y - Math.sin(angle) * length * 0.5);
        ctx.lineTo(decal.x + Math.cos(angle) * length * 0.5, decal.y + Math.sin(angle) * length * 0.5);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 177, 82, 0.48)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(decal.x - Math.cos(angle) * length * 0.5, decal.y - Math.sin(angle) * length * 0.5);
        ctx.lineTo(decal.x + Math.cos(angle) * length * 0.5, decal.y + Math.sin(angle) * length * 0.5);
        ctx.stroke();
    }, alpha, 'source-over');
}

function drawElectric(ctx, decal, alpha = 1) {
    const radius = decal.radius || 42;
    withSoftComposite(ctx, () => {
        radialMark(ctx, decal, [
            [0, 'rgba(130, 235, 255, 0.28)'],
            [0.55, 'rgba(49, 108, 150, 0.18)'],
            [1, 'rgba(0, 0, 0, 0)'],
        ], 1);
        ctx.strokeStyle = 'rgba(155, 245, 255, 0.58)';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
            const angle = seededRandom(decal.seed + i * 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(decal.x, decal.y);
            ctx.lineTo(decal.x + Math.cos(angle) * radius * seededRandom(decal.seed + i * 8), decal.y + Math.sin(angle) * radius * seededRandom(decal.seed + i * 9));
            ctx.stroke();
        }
    }, alpha, 'screen');
}

function drawGlue(ctx, decal, alpha = 1) {
    withSoftComposite(ctx, () => {
        radialMark(ctx, decal, [
            [0, 'rgba(130, 250, 255, 0.34)'],
            [0.52, 'rgba(65, 202, 222, 0.23)'],
            [1, 'rgba(0, 0, 0, 0)'],
        ], 1);
        ctx.fillStyle = 'rgba(225, 255, 255, 0.18)';
        ctx.beginPath();
        ctx.arc(decal.x - (decal.radius || 28) * 0.22, decal.y - (decal.radius || 28) * 0.18, (decal.radius || 28) * 0.22, 0, Math.PI * 2);
        ctx.fill();
    }, alpha);
}

function drawDecal(ctx, decal, alphaOverride = 1) {
    const lifeAlpha = decal.temporary ? Math.max(0, decal.life / decal.maxLife) : 1;
    const alpha = (decal.alpha ?? 1) * alphaOverride * lifeAlpha;
    if (alpha <= 0) return;

    if (decal.type === 'burn') drawBurn(ctx, decal, alpha);
    else if (decal.type === 'explosion') drawExplosion(ctx, decal, alpha);
    else if (decal.type === 'acid') drawAcid(ctx, decal, alpha);
    else if (decal.type === 'slash') drawSlash(ctx, decal, alpha);
    else if (decal.type === 'stab') drawStab(ctx, decal, alpha);
    else if (decal.type === 'hammer') drawHammer(ctx, decal, alpha);
    else if (decal.type === 'laser') drawLaser(ctx, decal, alpha);
    else if (decal.type === 'electric') drawElectric(ctx, decal, alpha);
    else if (decal.type === 'glue') drawGlue(ctx, decal, alpha);
}

function rebuildDecalCache() {
    if (!decalCtx) return;
    decalCtx.clearRect(0, 0, width, height);
    permanentDecals.forEach(decal => drawDecal(decalCtx, decal));
}

function isSpawnAllowed(type, x, y, options) {
    if (options.force) return true;
    const cooldowns = activeConfig?.decalSpawnCooldowns || DEFAULT_COOLDOWNS;
    const cooldown = cooldowns[type] ?? DEFAULT_COOLDOWNS[type] ?? 120;
    const now = performance.now();
    const lastTime = lastSpawnByType.get(type) || 0;
    if (cooldown > 0 && now - lastTime < cooldown) return false;

    const lastPos = lastPositionByType.get(type);
    const minDistance = options.minDistance ?? (type === 'laser' ? 18 : type === 'burn' || type === 'acid' ? 26 : 10);
    if (lastPos && Math.hypot(x - lastPos.x, y - lastPos.y) < minDistance) return false;

    lastSpawnByType.set(type, now);
    lastPositionByType.set(type, { x, y });
    return true;
}

function limitPermanentDecals() {
    const maxDecals = getDecalConfig().maxDecals || 220;
    if (permanentDecals.length <= maxDecals) return;
    permanentDecals = permanentDecals.slice(permanentDecals.length - maxDecals);
    rebuildDecalCache();
}

export function initDecalSystem(canvas, ctx, config = null) {
    activeConfig = config;
    width = canvas?.width || ctx?.canvas?.width || window.innerWidth;
    height = canvas?.height || ctx?.canvas?.height || window.innerHeight;
    decalCanvas = createLayerCanvas(width, height);
    decalCtx = decalCanvas.getContext('2d');
    rebuildDecalCache();
}

export function resizeDecalSystem(nextWidth, nextHeight) {
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    decalCanvas = createLayerCanvas(width, height);
    decalCtx = decalCanvas.getContext('2d');
    rebuildDecalCache();
}

export function addDecal(type, x, y, options = {}) {
    if (!getDecalConfig().enabled || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (!isSpawnAllowed(type, x, y, options)) return null;

    const temporary = options.temporary === true || type === 'electric' || type === 'glue';
    const decal = {
        type,
        x,
        y,
        radius: options.radius,
        length: options.length,
        angle: options.angle,
        intensity: options.intensity ?? 1,
        alpha: options.alpha ?? Math.min(1, 0.72 + (options.intensity ?? 1) * 0.16),
        passes: options.passes,
        temporary,
        life: options.life ?? (type === 'electric' ? 28 : type === 'glue' ? 150 : 80),
        maxLife: options.life ?? (type === 'electric' ? 28 : type === 'glue' ? 150 : 80),
        seed: options.seed ?? Math.random() * 100000,
    };

    if (temporary) {
        temporaryDecals.push(decal);
        temporaryDecals = temporaryDecals.slice(-80);
    } else {
        permanentDecals.push(decal);
        drawDecal(decalCtx, decal);
        limitPermanentDecals();
    }

    if (type === 'burn') spawnBackgroundSmoke(x, y, 'smoke', Math.ceil(2 + (options.intensity || 1) * 2));
    if (type === 'explosion') spawnBackgroundSmoke(x, y, 'smoke', Math.ceil(7 + (options.intensity || 1) * 4));
    if (type === 'acid') spawnBackgroundSmoke(x, y, 'acid', 5);
    return decal;
}

export function updateDecals() {
    temporaryDecals = temporaryDecals.filter(decal => {
        decal.life -= 1;
        return decal.life > 0;
    });
}

export function renderDecals(ctx) {
    if (!getDecalConfig().enabled) return;
    if (decalCanvas) ctx.drawImage(decalCanvas, 0, 0);
    temporaryDecals.forEach(decal => drawDecal(ctx, decal));
}

export function clearDecals() {
    permanentDecals = [];
    temporaryDecals = [];
    smokeParticles = [];
    seeded = false;
    lastSpawnByType.clear();
    lastPositionByType.clear();
    rebuildDecalCache();
}

export function seedInitialDecals() {
    if (seeded || !getDecalConfig().enabled || width <= 1 || height <= 1) return;
    seeded = true;
    const cx = width / 2;
    const cy = Math.min(height * 0.52, 230);
    const entries = [
        ['explosion', cx - 180, cy + 80, { radius: 64, intensity: 0.75, alpha: 0.54 }],
        ['explosion', cx + 220, cy - 30, { radius: 52, intensity: 0.55, alpha: 0.42 }],
        ['burn', cx - 85, cy - 120, { radius: 42, intensity: 0.6, alpha: 0.44 }],
        ['burn', cx + 110, cy + 132, { radius: 38, intensity: 0.55, alpha: 0.4 }],
        ['acid', cx + 170, cy + 84, { radius: 38, intensity: 0.5, alpha: 0.38 }],
        ['acid', cx - 230, cy - 48, { radius: 34, intensity: 0.45, alpha: 0.34 }],
        ['hammer', cx - 145, cy + 4, { radius: 38, alpha: 0.34, angle: -0.25 }],
        ['hammer', cx + 68, cy - 172, { radius: 32, alpha: 0.28, angle: 0.55 }],
        ['slash', cx - 40, cy + 170, { length: 92, angle: -0.56, alpha: 0.34 }],
        ['slash', cx + 260, cy + 24, { length: 78, angle: 0.32, alpha: 0.27 }],
        ['stab', cx - 272, cy + 122, { radius: 16, alpha: 0.34 }],
        ['stab', cx + 18, cy - 212, { radius: 13, alpha: 0.28 }],
        ['stab', cx + 300, cy - 125, { radius: 12, alpha: 0.25 }],
    ];

    entries.forEach(([type, x, y, options], index) => {
        if (x < 20 || x > width - 20 || y < 20 || y > height - 20) return;
        addDecal(type, x, y, { ...options, force: true, seed: 1000 + index });
    });
}

export function getDecalStats() {
    return {
        permanent: permanentDecals.length,
        temporary: temporaryDecals.length,
        smoke: smokeParticles.length,
        maxDecals: getDecalConfig().maxDecals || 220,
    };
}

export function spawnBackgroundSmoke(x, y, type = 'smoke', amount = 1) {
    const maxSmoke = getDecalConfig().maxSmokeParticles || 90;
    for (let i = 0; i < amount; i++) {
        if (smokeParticles.length >= maxSmoke) smokeParticles.shift();
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
        const speed = 0.18 + Math.random() * 0.55;
        smokeParticles.push({
            x: x + (Math.random() - 0.5) * 18,
            y: y + (Math.random() - 0.5) * 12,
            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.12,
            vy: Math.sin(angle) * speed,
            size: type === 'acid' ? 8 + Math.random() * 13 : 10 + Math.random() * 22,
            life: type === 'acid' ? 80 + Math.random() * 45 : 95 + Math.random() * 70,
            maxLife: type === 'acid' ? 120 : 160,
            type,
        });
    }
}

export function updateBackgroundSmoke() {
    smokeParticles = smokeParticles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.992;
        particle.vy -= 0.004;
        particle.life -= 1;
        return particle.life > 0;
    });
}

export function renderBackgroundSmoke(ctx) {
    if (!getDecalConfig().enabled) return;
    ctx.save();
    smokeParticles.forEach(particle => {
        const alpha = Math.max(0, particle.life / particle.maxLife);
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size);
        if (particle.type === 'acid') {
            gradient.addColorStop(0, `rgba(174, 255, 88, ${0.1 * alpha})`);
            gradient.addColorStop(1, 'rgba(174, 255, 88, 0)');
        } else {
            gradient.addColorStop(0, `rgba(35, 35, 34, ${0.18 * alpha})`);
            gradient.addColorStop(1, 'rgba(35, 35, 34, 0)');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

export function clearBackgroundDamage() {
    clearDecals();
}

if (typeof window !== 'undefined') {
    window.BackgroundDebug = {
        clearDecals,
        seedInitialDecals,
        addDecal,
        getDecalStats,
    };
}
