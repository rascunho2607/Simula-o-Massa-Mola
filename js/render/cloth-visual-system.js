import {
    clothVisualCategories,
    drawMotifToCanvas,
    getMotifsForCategory,
    pixelArtMotifs,
    pixelArtPalettes,
} from './pixel-art-patterns.js';

const abstractPatternTypes = ['stripes', 'plaid', 'diamonds', 'triangles', 'patches', 'stitches', 'blocks', 'mosaic'];
const visualMaterials = ['mixed', 'cotton', 'paper', 'leather', 'rubber', 'metal', 'reinforced'];

const materialPaletteHints = {
    mixed: ['tropical', 'sunset', 'jungle', 'neon', 'pastel', 'ocean'],
    cotton: ['tropical', 'pastel', 'sunset', 'ocean'],
    paper: ['pastel', 'desert', 'fossil'],
    leather: ['desert', 'fossil', 'lava'],
    rubber: ['neon', 'cyber', 'lava'],
    metal: ['cyber', 'ocean', 'fossil'],
    reinforced: ['jungle', 'desert', 'cyber', 'sunset'],
};

function randomInt(max) {
    return Math.floor(Math.random() * max);
}

function choice(items) {
    return items[randomInt(items.length)];
}

function createSeededRandom(seed) {
    let value = seed >>> 0;
    return function random() {
        value += 0x6D2B79F5;
        let next = value;
        next = Math.imul(next ^ (next >>> 15), next | 1);
        next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
        return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
}

function makeCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

function withAlpha(hex, alpha) {
    const normalized = hex.replace('#', '');
    const value = Number.parseInt(normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function choosePaletteName(material, motif, random) {
    if (motif?.palette && random() < 0.72) return motif.palette;
    const hints = materialPaletteHints[material] || materialPaletteHints.mixed;
    return hints[Math.floor(random() * hints.length)];
}

function chooseMotif(category, material, random) {
    if (material === 'metal' && random() < 0.62) return null;
    if (material === 'leather' && random() < 0.45) return null;
    if (material === 'rubber' && random() < 0.3) return null;
    const options = getMotifsForCategory(category);
    const pool = options.length ? options : pixelArtMotifs;
    return pool[Math.floor(random() * pool.length)];
}

function drawBackground(ctx, palette, random, material, size) {
    const base = palette[0];
    const secondary = palette[1] || base;
    ctx.fillStyle = material === 'paper' ? withAlpha(palette[5] || '#f6f0dc', 0.92) : base;
    ctx.fillRect(0, 0, size, size);

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, withAlpha(secondary, material === 'paper' ? 0.22 : 0.38));
    gradient.addColorStop(1, withAlpha(palette[2] || secondary, material === 'rubber' ? 0.16 : 0.28));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const speckles = material === 'paper' ? 170 : 90;
    for (let i = 0; i < speckles; i++) {
        ctx.fillStyle = withAlpha(choice(palette), material === 'metal' ? 0.12 : 0.16);
        ctx.fillRect(Math.floor(random() * size), Math.floor(random() * size), 1 + Math.floor(random() * 2), 1);
    }
}

function drawAbstractPattern(ctx, patternType, palette, random, material, size) {
    ctx.save();
    ctx.globalCompositeOperation = material === 'rubber' ? 'screen' : 'source-over';
    if (patternType === 'stripes') {
        const step = 8 + Math.floor(random() * 10);
        for (let x = -size; x < size * 2; x += step) {
            ctx.fillStyle = withAlpha(palette[3] || palette[1], 0.24);
            ctx.save();
            ctx.translate(x, 0);
            ctx.rotate(-0.35);
            ctx.fillRect(0, -size, Math.max(3, step * 0.38), size * 3);
            ctx.restore();
        }
    } else if (patternType === 'plaid') {
        const step = 12 + Math.floor(random() * 8);
        for (let i = 0; i < size; i += step) {
            ctx.fillStyle = withAlpha(palette[2] || palette[1], 0.22);
            ctx.fillRect(i, 0, 4, size);
            ctx.fillStyle = withAlpha(palette[4] || palette[3] || palette[1], 0.18);
            ctx.fillRect(0, i, size, 4);
        }
    } else if (patternType === 'diamonds') {
        const step = 16;
        for (let y = -step; y < size + step; y += step) {
            for (let x = -step; x < size + step; x += step) {
                ctx.fillStyle = withAlpha(palette[(x + y) % 3 === 0 ? 4 : 2] || palette[1], 0.18);
                ctx.beginPath();
                ctx.moveTo(x + step / 2, y);
                ctx.lineTo(x + step, y + step / 2);
                ctx.lineTo(x + step / 2, y + step);
                ctx.lineTo(x, y + step / 2);
                ctx.closePath();
                ctx.fill();
            }
        }
    } else if (patternType === 'triangles') {
        const step = 14;
        for (let y = 0; y < size; y += step) {
            for (let x = 0; x < size; x += step) {
                ctx.fillStyle = withAlpha(palette[Math.floor(random() * palette.length)], 0.2);
                ctx.beginPath();
                ctx.moveTo(x, y + step);
                ctx.lineTo(x + step / 2, y);
                ctx.lineTo(x + step, y + step);
                ctx.closePath();
                ctx.fill();
            }
        }
    } else if (patternType === 'patches' || patternType === 'blocks' || patternType === 'mosaic') {
        const step = patternType === 'mosaic' ? 8 : 16;
        for (let y = 0; y < size; y += step) {
            for (let x = 0; x < size; x += step) {
                ctx.fillStyle = withAlpha(palette[Math.floor(random() * palette.length)], 0.2 + random() * 0.14);
                ctx.fillRect(x, y, step - 1, step - 1);
            }
        }
    }

    if (patternType === 'stitches' || material === 'reinforced' || material === 'leather') {
        ctx.strokeStyle = withAlpha(palette[5] || '#ffffff', material === 'leather' ? 0.42 : 0.34);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        for (let y = 10; y < size; y += 18) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y + Math.sin(y) * 2);
            ctx.stroke();
        }
        for (let x = 10; x < size; x += 22) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + Math.cos(x) * 2, size);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }
    ctx.restore();
}

function drawMotifLayer(ctx, motif, palette, material, size) {
    if (!motif) return;
    const motifCanvas = makeCanvas(64, 64);
    const motifCtx = motifCanvas.getContext('2d');
    motifCtx.imageSmoothingEnabled = false;
    drawMotifToCanvas(motifCtx, motif, 64);

    const motifSize = material === 'metal' ? 42 : 54;
    const x = Math.floor((size - motifSize) / 2);
    const y = Math.floor((size - motifSize) / 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.shadowColor = withAlpha(palette[0] || '#000000', 0.42);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(motifCanvas, x, y, motifSize, motifSize);
    ctx.restore();
}

function buildCellColors(canvas, rows, cols, textureTilesX = 1, textureTilesY = 1) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = [];
    const colorsFlat = new Array(Math.max(0, rows * cols));
    const safeCols = Math.max(1, cols);
    const safeRows = Math.max(1, rows);
    for (let y = 0; y < rows; y++) {
        const row = [];
        for (let x = 0; x < cols; x++) {
            const u = ((x + 0.5) / safeCols * textureTilesX) % 1;
            const v = ((y + 0.5) / safeRows * textureTilesY) % 1;
            const sx = Math.min(canvas.width - 1, Math.floor(u * canvas.width));
            const sy = Math.min(canvas.height - 1, Math.floor(v * canvas.height));
            const index = (sy * canvas.width + sx) * 4;
            const color = `rgba(${image[index]},${image[index + 1]},${image[index + 2]},${Math.max(0.88, image[index + 3] / 255)})`;
            row.push(color);
            colorsFlat[y * cols + x] = color;
        }
        colors.push(row);
    }
    return {
        cellColors: colors,
        cellColorsFlat: colorsFlat,
        cellColorCols: cols,
        cellColorRows: rows,
        cellColorTexture: canvas,
        cellColorTextureTilesX: textureTilesX,
        cellColorTextureTilesY: textureTilesY,
    };
}

function getCellColorCache(config, texture, rows, cols) {
    const visualConfig = config.clothVisual || {};
    return buildCellColors(
        texture,
        rows,
        cols,
        visualConfig.fabricTextureTilesX ?? 1,
        visualConfig.fabricTextureTilesY ?? 1
    );
}

export function createClothVisualDescriptor(options = {}) {
    const seed = options.seed ?? Math.floor(Math.random() * 1000000000);
    const random = createSeededRandom(seed);
    const material = visualMaterials.includes(options.material) ? options.material : 'mixed';
    const category = clothVisualCategories.includes(options.category) ? options.category : 'mixed';
    const motif = options.forceMotifId
        ? pixelArtMotifs.find(item => item.id === options.forceMotifId) || null
        : chooseMotif(category, material, random);
    const paletteName = choosePaletteName(material, motif, random);
    const patternType = options.patternType || abstractPatternTypes[Math.floor(random() * abstractPatternTypes.length)];

    return {
        mode: options.mode === 'test' ? 'test' : 'fabric',
        material,
        category,
        paletteName,
        palette: pixelArtPalettes[paletteName],
        patternType,
        motifType: motif?.id || 'abstract',
        motifName: motif?.name || 'Padrao abstrato',
        seed,
    };
}

export function createClothVisualSystem() {
    let state = null;

    function regenerate(config, rows, cols, overrides = {}) {
        if (!config.clothVisual) {
            config.clothVisual = { mode: 'fabric', material: 'mixed', category: 'mixed' };
        }
        const current = config.clothVisual || {};
        const descriptor = createClothVisualDescriptor({
            mode: current.mode,
            material: current.material,
            category: current.category,
            ...overrides,
        });
        if (descriptor.mode === 'test') {
            state = {
                ...descriptor,
                texture: null,
                cellColors: [],
                cellColorsFlat: null,
                cellColorCols: cols,
                cellColorRows: rows,
                cellColorTexture: null,
            };
            config.clothVisual = {
                ...config.clothVisual,
                mode: descriptor.mode,
                material: descriptor.material,
                category: descriptor.category,
            };
            return state;
        }

        const texture = makeCanvas(96, 96);
        const ctx = texture.getContext('2d', { willReadFrequently: true });
        const random = createSeededRandom(descriptor.seed);
        const motif = pixelArtMotifs.find(item => item.id === descriptor.motifType) || null;

        ctx.imageSmoothingEnabled = false;
        drawBackground(ctx, descriptor.palette, random, descriptor.material, texture.width);
        drawAbstractPattern(ctx, descriptor.patternType, descriptor.palette, random, descriptor.material, texture.width);
        drawMotifLayer(ctx, motif, descriptor.palette, descriptor.material, texture.width);

        state = {
            ...descriptor,
            texture,
            ...getCellColorCache(config, texture, rows, cols),
        };
        config.clothVisual = {
            ...config.clothVisual,
            mode: descriptor.mode,
            material: descriptor.material,
            category: descriptor.category,
        };
        return state;
    }

    function ensure(config, rows, cols) {
        if ((config.clothVisual?.mode || 'fabric') !== 'fabric') {
            if (!state || state.mode !== 'test') return regenerate(config, rows, cols);
            return state;
        }
        const visualConfig = config.clothVisual || {};
        const textureTilesX = visualConfig.fabricTextureTilesX ?? 1;
        const textureTilesY = visualConfig.fabricTextureTilesY ?? 1;
        if (
            !state
            || state.cellColorRows !== rows
            || state.cellColorCols !== cols
            || state.cellColorTexture !== state.texture
            || state.cellColorTextureTilesX !== textureTilesX
            || state.cellColorTextureTilesY !== textureTilesY
        ) {
            return regenerate(config, rows, cols);
        }
        return state;
    }

    function refresh(config, rows, cols) {
        if (!state?.texture) return regenerate(config, rows, cols);
        state = {
            ...state,
            ...getCellColorCache(config, state.texture, rows, cols),
        };
        config.clothVisual = {
            ...config.clothVisual,
            mode: state.mode,
            material: state.material,
            category: state.category,
        };
        return state;
    }

    function setMode(config, rows, cols, mode) {
        if (!config.clothVisual) config.clothVisual = { mode: 'fabric', material: 'mixed', category: 'mixed' };
        config.clothVisual.mode = mode;
        if (mode === 'fabric') return regenerate(config, rows, cols);
        return regenerate(config, rows, cols);
    }

    function setMaterial(config, rows, cols, material) {
        if (!config.clothVisual) config.clothVisual = { mode: 'fabric', material: 'mixed', category: 'mixed' };
        config.clothVisual.material = material;
        return regenerate(config, rows, cols, { material });
    }

    function setCategory(config, rows, cols, category) {
        if (!config.clothVisual) config.clothVisual = { mode: 'fabric', material: 'mixed', category: 'mixed' };
        config.clothVisual.category = category;
        return regenerate(config, rows, cols, { category });
    }

    function generatePattern(config, rows, cols) {
        return regenerate(config, rows, cols, { forceMotifId: state?.motifType === 'abstract' ? undefined : state?.motifType });
    }

    function generateMotif(config, rows, cols) {
        return regenerate(config, rows, cols);
    }

    function getState() {
        return state;
    }

    return { ensure, refresh, regenerate, setMode, setMaterial, setCategory, generatePattern, generateMotif, getState };
}

function getPoint(points, cols, x, y) {
    return points[y * (cols + 1) + x];
}

function isPointRenderable(point) {
    return point && point.active !== false && !point.isDestroyed;
}

export function renderClothFilledFabric(ctx, points, rows, cols, visualState, options = {}) {
    if ((options.fillAlpha ?? 0.92) <= 0) return;
    if (!visualState?.cellColorsFlat && !visualState?.cellColors) return;
    if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows <= 0 || cols <= 0) return;
    const colors = visualState.cellColorsFlat;
    const hasFlatColors = colors
        && visualState.cellColorRows === rows
        && visualState.cellColorCols === cols
        && visualState.cellColorTextureTilesX === (options.textureTilesX ?? visualState.cellColorTextureTilesX)
        && visualState.cellColorTextureTilesY === (options.textureTilesY ?? visualState.cellColorTextureTilesY);
    const fallbackColor = visualState.palette?.[0] || '#55aaff';
    ctx.save();
    ctx.globalAlpha = options.fillAlpha ?? 0.92;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const p00 = getPoint(points, cols, x, y);
            const p10 = getPoint(points, cols, x + 1, y);
            const p11 = getPoint(points, cols, x + 1, y + 1);
            const p01 = getPoint(points, cols, x, y + 1);
            if (!isPointRenderable(p00) || !isPointRenderable(p10) || !isPointRenderable(p11) || !isPointRenderable(p01)) continue;

            const colorIndex = y * cols + x;
            ctx.fillStyle = (hasFlatColors ? colors[colorIndex] : visualState.cellColors?.[y]?.[x]) || fallbackColor;
            ctx.beginPath();
            ctx.moveTo(p00.x, p00.y);
            ctx.lineTo(p10.x, p10.y);
            ctx.lineTo(p11.x, p11.y);
            ctx.lineTo(p01.x, p01.y);
            ctx.closePath();
            ctx.fill();
        }
    }
    ctx.restore();
}

export function renderClothPattern(ctx, points, rows, cols, visualState) {
    if (!visualState) return;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = visualState.palette?.[5] || '#ffffff';
    ctx.lineWidth = 0.7;
    const step = visualState.material === 'reinforced' ? 4 : 6;
    for (let y = 0; y <= rows; y += step) {
        ctx.beginPath();
        for (let x = 0; x <= cols; x++) {
            const point = getPoint(points, cols, x, y);
            if (!isPointRenderable(point)) continue;
            if (x === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
    }
    for (let x = 0; x <= cols; x += step) {
        ctx.beginPath();
        for (let y = 0; y <= rows; y++) {
            const point = getPoint(points, cols, x, y);
            if (!isPointRenderable(point)) continue;
            if (y === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function getTriangleArea(p0, p1, p2) {
    return (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
}

function drawTexturedTriangle(ctx, texture, p0, p1, p2, uv0, uv1, uv2) {
    const tw = texture.width;
    const th = texture.height;
    if (!tw || !th || Math.abs(getTriangleArea(p0, p1, p2)) < 0.01) return;

    const sx0 = uv0.u * tw;
    const sy0 = uv0.v * th;
    const sx1 = uv1.u * tw;
    const sy1 = uv1.v * th;
    const sx2 = uv2.u * tw;
    const sy2 = uv2.v * th;
    const determinant = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
    if (Math.abs(determinant) < 0.0001) return;

    const a = (p0.x * (sy1 - sy2) + p1.x * (sy2 - sy0) + p2.x * (sy0 - sy1)) / determinant;
    const b = (p0.y * (sy1 - sy2) + p1.y * (sy2 - sy0) + p2.y * (sy0 - sy1)) / determinant;
    const c = (p0.x * (sx2 - sx1) + p1.x * (sx0 - sx2) + p2.x * (sx1 - sx0)) / determinant;
    const d = (p0.y * (sx2 - sx1) + p1.y * (sx0 - sx2) + p2.y * (sx1 - sx0)) / determinant;
    const e = (
        p0.x * (sx1 * sy2 - sx2 * sy1)
        + p1.x * (sx2 * sy0 - sx0 * sy2)
        + p2.x * (sx0 * sy1 - sx1 * sy0)
    ) / determinant;
    const f = (
        p0.y * (sx1 * sy2 - sx2 * sy1)
        + p1.y * (sx2 * sy0 - sx0 * sy2)
        + p2.y * (sx0 * sy1 - sx1 * sy0)
    ) / determinant;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(texture, 0, 0);
    ctx.restore();
}

export function renderClothMotifTexture(ctx, points, rows, cols, visualState) {
    const texture = visualState?.texture;
    if (!texture || !texture.width || !texture.height) return;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < rows; y++) {
        const v0 = y / rows;
        const v1 = (y + 1) / rows;
        for (let x = 0; x < cols; x++) {
            const p00 = getPoint(points, cols, x, y);
            const p10 = getPoint(points, cols, x + 1, y);
            const p01 = getPoint(points, cols, x, y + 1);
            const p11 = getPoint(points, cols, x + 1, y + 1);
            if (![p00, p10, p01, p11].every(isPointRenderable)) continue;

            const u0 = x / cols;
            const u1 = (x + 1) / cols;
            drawTexturedTriangle(
                ctx,
                texture,
                p00,
                p10,
                p11,
                { u: u0, v: v0 },
                { u: u1, v: v0 },
                { u: u1, v: v1 }
            );
            drawTexturedTriangle(
                ctx,
                texture,
                p00,
                p11,
                p01,
                { u: u0, v: v0 },
                { u: u1, v: v1 },
                { u: u0, v: v1 }
            );
        }
    }
    ctx.restore();
}

export function isCommonSpringForGpu(spring) {
    return isBaseSpringRenderable(spring)
        && !spring.isTemporary
        && !(spring.damageState > 0)
        && !((spring.damage || 0) > 0)
        && !(Number.isFinite(spring.hp) && Number.isFinite(spring.maxHp) && spring.hp < spring.maxHp)
        && !spring.isBurning
        && !spring.burning
        && !((spring.acidAmount || 0) > 0)
        && !((spring.electricCharge || 0) > 0)
        && !spring.isSeam
        && !spring.isWeakPoint
        && !spring.glueBridge
        && !spring.isGlueBridge
        && !((spring.char || 0) > 0)
        && (spring.material || 'cloth') === 'cloth'
        && (spring.layerIndex ?? 0) === 0;
}

export function renderClothPhysicsLines(ctx, springs, points, options = {}) {
    const skipCommonSprings = options.skipCommonSprings === true || options.forceSpecialOnly === true;
    const skipCommonPoints = options.skipCommonPoints === true;
    if (options.simpleMesh || options.fast) {
        const lineAlpha = options.lineAlpha ?? options.alpha ?? 1;
        const pointAlpha = options.pointAlpha ?? options.alpha ?? 1;
        const drawLines = lineAlpha > 0;
        const drawPoints = pointAlpha > 0;
        if (!drawLines && !drawPoints) return;
        const lineColor = options.lineColor || '#55aaff';
        const pointColor = options.pointColor || lineColor;
        const lineWidth = options.lineWidth ?? 0.45;
        const pointRadius = options.pointRadius ?? 1;

        if (drawLines && !skipCommonSprings) {
            ctx.save();
            ctx.globalAlpha = lineAlpha;
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([]);
            ctx.beginPath();
            for (let i = 0; i < springs.length; i++) {
                const spring = springs[i];
                if (!isFastSpringRenderable(spring)) continue;
                ctx.moveTo(spring.p1.x, spring.p1.y);
                ctx.lineTo(spring.p2.x, spring.p2.y);
            }
            ctx.stroke();
            ctx.restore();
        }

        if (drawLines) {
            for (let i = 0; i < springs.length; i++) {
                const spring = springs[i];
                if (!isSpecialSpringRenderable(spring)) continue;
                spring.draw();
            }
        }

        if (drawPoints && !skipCommonPoints) {
            ctx.save();
            ctx.globalAlpha = pointAlpha;
            ctx.fillStyle = pointColor;
            ctx.beginPath();
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                if (!isFastPointRenderable(point)) continue;
                ctx.moveTo(point.x + pointRadius, point.y);
                ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.restore();
        }

        if (drawPoints) {
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                if (!isSpecialPointRenderable(point)) continue;
                point.draw();
            }
        }
        return;
    }

    const lineAlpha = options.lineAlpha ?? options.alpha ?? 1;
    const pointAlpha = options.pointAlpha ?? options.alpha ?? 1;
    if (lineAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = lineAlpha;
        springs.forEach(spring => {
            if (skipCommonSprings && !isSpecialSpringRenderable(spring)) return;
            spring.draw();
        });
        ctx.restore();
    }

    if (pointAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = pointAlpha;
        points.forEach(point => {
            if (skipCommonPoints && !isSpecialPointRenderable(point)) return;
            point.draw();
        });
        ctx.restore();
    }
}

function isBaseSpringRenderable(spring) {
    return spring
        && spring.active !== false
        && !spring.broken
        && spring.p1
        && spring.p2
        && isPointRenderable(spring.p1)
        && isPointRenderable(spring.p2);
}

function isSpecialSpringRenderable(spring) {
    if (!isBaseSpringRenderable(spring)) return false;
    return !isCommonSpringForGpu(spring);
}

function isFastSpringRenderable(spring) {
    return isBaseSpringRenderable(spring) && !isSpecialSpringRenderable(spring);
}

function isSpecialPointRenderable(point) {
    if (!isPointRenderable(point)) return false;
    return point.pinned
        || point.dartId
        || point.damageState > 0
        || point.isBurning
        || point.acidAmount > 0
        || point.electricCharge > 0
        || point.frozen
        || point.slowed
        || point.char > 0
        || point.isCoverPoint
        || point.material !== 'cloth'
        || (point.layerIndex ?? 0) !== 0;
}

function isFastPointRenderable(point) {
    return isPointRenderable(point) && !isSpecialPointRenderable(point);
}

export function getVisualMaterialOptions() {
    return visualMaterials;
}

export function getClothVisualCategories() {
    return clothVisualCategories;
}
