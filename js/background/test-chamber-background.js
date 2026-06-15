let chamberCanvas = null;
let chamberCtx = null;
let chamberWidth = 0;
let chamberHeight = 0;
let activeConfig = null;

function createLayerCanvas(width, height) {
    const layer = document.createElement('canvas');
    layer.width = Math.max(1, width);
    layer.height = Math.max(1, height);
    return layer;
}

function noiseValue(x, y) {
    return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

function drawPanelRivets(ctx, x, y, w, h) {
    const inset = 12;
    const points = [
        [x + inset, y + inset],
        [x + w - inset, y + inset],
        [x + inset, y + h - inset],
        [x + w - inset, y + h - inset],
    ];

    points.forEach(([rx, ry]) => {
        const r = 2.4;
        const gradient = ctx.createRadialGradient(rx - 1, ry - 1, 0.4, rx, ry, r * 2.2);
        gradient.addColorStop(0, 'rgba(185, 202, 212, 0.42)');
        gradient.addColorStop(0.55, 'rgba(75, 88, 96, 0.5)');
        gradient.addColorStop(1, 'rgba(9, 13, 16, 0.42)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(rx, ry, r, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawHazardStripe(ctx, x, y, w, h, angle = -0.62) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = 'rgba(24, 25, 22, 0.78)';
    ctx.fillRect(x, y, w, h);
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle);
    ctx.translate(-w / 2, -h / 2);

    const stripeWidth = 18;
    for (let sx = -w; sx < w * 2; sx += stripeWidth * 2) {
        ctx.fillStyle = 'rgba(224, 170, 42, 0.72)';
        ctx.fillRect(sx, -h, stripeWidth, h * 3);
    }

    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 214, 91, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawTargetGhost(ctx, width, height) {
    const cx = width / 2;
    const cy = Math.min(height * 0.52, 50 + 30 * 12 * 0.5);
    const radius = Math.max(70, Math.min(width, height) * 0.14);

    ctx.save();
    ctx.globalAlpha = 0.36;
    ctx.strokeStyle = 'rgba(121, 201, 230, 0.34)';
    ctx.lineWidth = 1.4;
    [1, 0.72, 0.43].forEach(scale => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
        ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(226, 245, 255, 0.18)';
    ctx.setLineDash([9, 8]);
    ctx.beginPath();
    ctx.moveTo(cx - radius * 1.18, cy);
    ctx.lineTo(cx + radius * 1.18, cy);
    ctx.moveTo(cx, cy - radius * 1.18);
    ctx.lineTo(cx, cy + radius * 1.18);
    ctx.stroke();
    ctx.setLineDash([]);

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.25);
    glow.addColorStop(0, 'rgba(80, 170, 210, 0.08)');
    glow.addColorStop(0.55, 'rgba(80, 170, 210, 0.03)');
    glow.addColorStop(1, 'rgba(80, 170, 210, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawStaticChamber() {
    if (!chamberCanvas || !chamberCtx) return;
    const cfg = activeConfig?.background || {};
    const ctx = chamberCtx;
    const width = chamberWidth;
    const height = chamberHeight;

    ctx.clearRect(0, 0, width, height);

    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, '#151d22');
    base.addColorStop(0.45, '#1f2a30');
    base.addColorStop(1, '#0f1418');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const center = ctx.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, Math.max(width, height) * 0.72);
    center.addColorStop(0, 'rgba(76, 100, 110, 0.28)');
    center.addColorStop(0.48, 'rgba(33, 44, 50, 0.08)');
    center.addColorStop(1, 'rgba(0, 0, 0, 0.36)');
    ctx.fillStyle = center;
    ctx.fillRect(0, 0, width, height);

    if (cfg.renderPanels !== false) {
        const panelW = Math.max(150, Math.min(230, width / 5));
        const panelH = Math.max(108, Math.min(168, height / 4.6));
        ctx.lineWidth = 1;

        for (let y = -1; y < height + panelH; y += panelH) {
            for (let x = -1; x < width + panelW; x += panelW) {
                const n = noiseValue(Math.floor(x / panelW), Math.floor(y / panelH));
                ctx.fillStyle = n > 0.58 ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.045)';
                ctx.fillRect(x + 1, y + 1, panelW - 2, panelH - 2);
                ctx.strokeStyle = 'rgba(156, 181, 190, 0.13)';
                ctx.strokeRect(x + 0.5, y + 0.5, panelW, panelH);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
                ctx.strokeRect(x + 2.5, y + 2.5, panelW - 4, panelH - 4);
                drawPanelRivets(ctx, x, y, panelW, panelH);
            }
        }
    }

    if (cfg.renderGrid !== false) {
        ctx.save();
        ctx.strokeStyle = 'rgba(116, 171, 188, 0.12)';
        ctx.lineWidth = 1;
        const step = 48;
        for (let x = width / 2 % step; x < width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, height);
            ctx.stroke();
        }
        for (let y = height / 2 % step; y < height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(width, y + 0.5);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(190, 232, 242, 0.19)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(width / 2 + 0.5, 0);
        ctx.lineTo(width / 2 + 0.5, height);
        ctx.moveTo(0, height / 2 + 0.5);
        ctx.lineTo(width, height / 2 + 0.5);
        ctx.stroke();
        ctx.restore();
    }

    if (cfg.renderTargetGhost !== false) drawTargetGhost(ctx, width, height);

    if (cfg.renderHazardStripes !== false) {
        const stripeW = Math.min(260, width * 0.26);
        drawHazardStripe(ctx, 22, 20, stripeW, 24, -0.62);
        drawHazardStripe(ctx, width - stripeW - 22, height - 46, stripeW, 24, -0.62);
    }

    if (cfg.renderDirt !== false) {
        ctx.save();
        for (let i = 0; i < 260; i++) {
            const x = noiseValue(i, 9.1) * width;
            const y = noiseValue(i, 17.7) * height;
            const a = 0.018 + noiseValue(i, 25.3) * 0.045;
            ctx.fillStyle = `rgba(0, 0, 0, ${a})`;
            ctx.fillRect(x, y, 1 + noiseValue(i, 35.6) * 3, 1 + noiseValue(i, 40.2) * 3);
        }

        ctx.strokeStyle = 'rgba(220, 235, 236, 0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 54; i++) {
            const x = noiseValue(i, 51.3) * width;
            const y = noiseValue(i, 62.4) * height;
            const len = 18 + noiseValue(i, 73.8) * 58;
            const angle = -0.35 + noiseValue(i, 84.2) * 0.7;
            ctx.globalAlpha = 0.18 + noiseValue(i, 95.5) * 0.2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.restore();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(0, 0, width, 10);
    ctx.fillRect(0, height - 10, width, 10);
}

export function initTestChamberBackground(canvas, ctx, config = null) {
    activeConfig = config;
    chamberWidth = canvas?.width || ctx?.canvas?.width || window.innerWidth;
    chamberHeight = canvas?.height || ctx?.canvas?.height || window.innerHeight;
    chamberCanvas = createLayerCanvas(chamberWidth, chamberHeight);
    chamberCtx = chamberCanvas.getContext('2d');
    drawStaticChamber();
}

export function resizeTestChamberBackground(width, height) {
    chamberWidth = Math.max(1, width);
    chamberHeight = Math.max(1, height);
    chamberCanvas = createLayerCanvas(chamberWidth, chamberHeight);
    chamberCtx = chamberCanvas.getContext('2d');
    drawStaticChamber();
}

export function rebuildTestChamberBackground(config = activeConfig) {
    activeConfig = config;
    drawStaticChamber();
}

export function renderTestChamberBackground(ctx) {
    if (!activeConfig?.background?.enabled || !chamberCanvas) return;
    ctx.drawImage(chamberCanvas, 0, 0);
}
