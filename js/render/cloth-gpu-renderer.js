import { isCommonSpringForGpu } from './cloth-visual-system.js';

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_uv;

uniform vec2 u_resolution;

varying vec2 v_uv;

void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
    v_uv = a_uv;
}
`;

const LINE_VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;

uniform vec2 u_resolution;

void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
}
`;

const LINE_FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform vec4 u_color;

void main() {
    gl_FragColor = u_color;
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform sampler2D u_texture;
uniform float u_alpha;

varying vec2 v_uv;

void main() {
    vec4 color = texture2D(u_texture, v_uv);
    gl_FragColor = vec4(color.rgb, color.a * u_alpha);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;

    const message = gl.getShaderInfoLog(shader) || 'Shader compile failed';
    gl.deleteShader(shader);
    throw new Error(message);
}

function createProgram(gl, vertexSource = VERTEX_SHADER_SOURCE, fragmentSource = FRAGMENT_SHADER_SOURCE) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;

    const message = gl.getProgramInfoLog(program) || 'Program link failed';
    gl.deleteProgram(program);
    throw new Error(message);
}

function parseColor(color, fallbackAlpha = 1) {
    if (Array.isArray(color)) {
        return [
            Math.max(0, Math.min(1, color[0] ?? 1)),
            Math.max(0, Math.min(1, color[1] ?? 1)),
            Math.max(0, Math.min(1, color[2] ?? 1)),
            Math.max(0, Math.min(1, color[3] ?? fallbackAlpha)),
        ];
    }
    if (typeof color !== 'string') return [0.33, 0.67, 1, fallbackAlpha];

    const hex = color.trim();
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
        const r = Number.parseInt(hex[1] + hex[1], 16) / 255;
        const g = Number.parseInt(hex[2] + hex[2], 16) / 255;
        const b = Number.parseInt(hex[3] + hex[3], 16) / 255;
        return [r, g, b, fallbackAlpha];
    }
    if (/^#[0-9a-f]{6}$/i.test(hex)) {
        const value = Number.parseInt(hex.slice(1), 16);
        return [
            ((value >> 16) & 255) / 255,
            ((value >> 8) & 255) / 255,
            (value & 255) / 255,
            fallbackAlpha,
        ];
    }

    const rgba = hex.match(/^rgba?\(([^)]+)\)$/i);
    if (rgba) {
        const parts = rgba[1].split(',').map(part => Number.parseFloat(part.trim()));
        return [
            Math.max(0, Math.min(1, (parts[0] ?? 85) / 255)),
            Math.max(0, Math.min(1, (parts[1] ?? 170) / 255)),
            Math.max(0, Math.min(1, (parts[2] ?? 255) / 255)),
            Math.max(0, Math.min(1, parts[3] ?? fallbackAlpha)),
        ];
    }

    return [0.33, 0.67, 1, fallbackAlpha];
}

function isPointRenderable(point) {
    return point && point.active !== false && !point.isDestroyed;
}

function isSpringRenderable(spring) {
    return spring
        && spring.active !== false
        && !spring.broken
        && isPointRenderable(spring.p1)
        && isPointRenderable(spring.p2);
}

function buildLiveGridEdges(springs, rows, cols, horizontalEdges, verticalEdges) {
    horizontalEdges.fill(0);
    verticalEdges.fill(0);

    for (let i = 0; i < springs.length; i++) {
        const spring = springs[i];
        if (!isSpringRenderable(spring)) continue;

        const x1 = spring.p1.gridX;
        const y1 = spring.p1.gridY;
        const x2 = spring.p2.gridX;
        const y2 = spring.p2.gridY;
        if (!Number.isInteger(x1) || !Number.isInteger(y1) || !Number.isInteger(x2) || !Number.isInteger(y2)) continue;

        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        if (dx === 1 && dy === 0) {
            const x = Math.min(x1, x2);
            if (y1 >= 0 && y1 <= rows && x >= 0 && x < cols) {
                horizontalEdges[y1 * cols + x] = 1;
            }
        } else if (dx === 0 && dy === 1) {
            const y = Math.min(y1, y2);
            if (x1 >= 0 && x1 <= cols && y >= 0 && y < rows) {
                verticalEdges[y * (cols + 1) + x1] = 1;
            }
        }
    }
}

function hasQuadEdges(horizontalEdges, verticalEdges, cols, x, y) {
    const top = y * cols + x;
    const bottom = (y + 1) * cols + x;
    const left = y * (cols + 1) + x;
    const right = left + 1;
    return horizontalEdges[top]
        && horizontalEdges[bottom]
        && verticalEdges[left]
        && verticalEdges[right];
}

export function createClothGpuRenderer(options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(options.width || 1));
    canvas.height = Math.max(1, Math.floor(options.height || 1));

    const debug = options.debug === true;
    let debugLineDirty = options.debugLineDirty === true;
    let gl = null;
    let program = null;
    let lineProgram = null;
    let positionBuffer = null;
    let uvBuffer = null;
    let indexBuffer = null;
    let lineIndexBuffer = null;
    let texture = null;
    let ready = false;
    let disabled = false;
    let linesDisabled = false;
    let lastTextureSource = null;
    let lastTextureVersion = null;
    let lastTextureWidth = 0;
    let lastTextureHeight = 0;
    let rows = 0;
    let cols = 0;
    let pointCount = 0;
    let indexCount = 0;
    let lineIndexCount = 0;
    let topologyDirty = true;
    let lineTopologyDirty = true;
    let lastRows = 0;
    let lastCols = 0;
    let lastPointCount = 0;
    let lastSpringCount = 0;
    let lastLineRows = 0;
    let lastLineCols = 0;
    let lastLinePointCount = 0;
    let lastLineSpringCount = 0;
    let positionBufferBytes = 0;
    let positionData = null;
    let uvData = null;
    let uvRows = -1;
    let uvCols = -1;
    let horizontalEdges = null;
    let verticalEdges = null;
    let workingIndexData = null;
    let workingIndexType = null;
    let lastUploadedIndexData = null;
    let lastUploadedIndexCount = 0;
    let lastUploadedIndexType = null;
    let indexArrayType = null;
    let workingLineIndexData = null;
    let workingLineIndexType = null;
    let lastUploadedLineIndexData = null;
    let lastUploadedLineIndexCount = 0;
    let lastUploadedLineIndexType = null;
    let lineIndexArrayType = null;
    let pointIndexMap = null;
    let uintIndexExtension = null;
    let lastDebugFrame = 0;
    let debugLineDirtyFrame = 0;
    let lineTopologyDirtyCount = 0;
    let lineIndexRebuildCount = 0;
    let commonSpringCount = 0;
    let specialSpringCount = 0;
    let lastLineTopologyDirtyReason = 'initial';
    let locations = null;
    let lineLocations = null;
    let lastRenderStatus = { fabric: false, lines: false };

    function log(...args) {
        if (debug) console.log('[cloth-gpu]', ...args);
    }

    function disable(error) {
        if (disabled) return;
        disabled = true;
        ready = false;
        if (debug) console.warn('[cloth-gpu] fallback to canvas', error);
    }

    function disableLines(error) {
        if (linesDisabled) return;
        linesDisabled = true;
        lineIndexCount = 0;
        if (debug) console.warn('[cloth-gpu] line fallback to canvas', error);
    }

    function initialize() {
        try {
            gl = canvas.getContext('webgl', {
                alpha: true,
                antialias: false,
                premultipliedAlpha: false,
            });
            if (!gl) throw new Error('WebGL unavailable');

            uintIndexExtension = gl.getExtension('OES_element_index_uint');
            program = createProgram(gl);
            try {
                lineProgram = createProgram(gl, LINE_VERTEX_SHADER_SOURCE, LINE_FRAGMENT_SHADER_SOURCE);
            } catch (error) {
                lineProgram = null;
                disableLines(error);
            }
            positionBuffer = gl.createBuffer();
            uvBuffer = gl.createBuffer();
            indexBuffer = gl.createBuffer();
            lineIndexBuffer = gl.createBuffer();

            locations = {
                position: gl.getAttribLocation(program, 'a_position'),
                uv: gl.getAttribLocation(program, 'a_uv'),
                resolution: gl.getUniformLocation(program, 'u_resolution'),
                texture: gl.getUniformLocation(program, 'u_texture'),
                alpha: gl.getUniformLocation(program, 'u_alpha'),
            };
            lineLocations = lineProgram ? {
                position: gl.getAttribLocation(lineProgram, 'a_position'),
                resolution: gl.getUniformLocation(lineProgram, 'u_resolution'),
                color: gl.getUniformLocation(lineProgram, 'u_color'),
            } : null;

            gl.useProgram(program);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);

            ready = true;
            log('initialized');
        } catch (error) {
            disable(error);
        }
    }

    function isReady() {
        return ready && !disabled && !!gl;
    }

    function resize(width, height) {
        if (!isReady()) return false;
        const nextWidth = Math.max(1, Math.floor(width || 1));
        const nextHeight = Math.max(1, Math.floor(height || 1));
        if (canvas.width === nextWidth && canvas.height === nextHeight) return true;
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        return true;
    }

    function uploadTexture(textureCanvas, textureVersion = null) {
        if (!isReady() || !textureCanvas || !textureCanvas.width || !textureCanvas.height) return false;
        try {
            const hasVersion = textureVersion !== null && textureVersion !== undefined;
            const sameTexture = textureCanvas === lastTextureSource
                && textureCanvas.width === lastTextureWidth
                && textureCanvas.height === lastTextureHeight
                && (!hasVersion || textureVersion === lastTextureVersion);
            if (sameTexture && texture) return true;

            if (!texture) texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);

            lastTextureSource = textureCanvas;
            lastTextureVersion = hasVersion ? textureVersion : null;
            lastTextureWidth = textureCanvas.width;
            lastTextureHeight = textureCanvas.height;
            log('texture uploaded', `${lastTextureWidth}x${lastTextureHeight}`);
            return true;
        } catch (error) {
            disable(error);
            return false;
        }
    }

    function rebuildUvs(nextRows, nextCols, nextPointCount) {
        uvData = new Float32Array(nextPointCount * 2);
        uvRows = nextRows;
        uvCols = nextCols;
        const safeRows = Math.max(1, nextRows);
        const safeCols = Math.max(1, nextCols);
        for (let y = 0; y <= nextRows; y++) {
            for (let x = 0; x <= nextCols; x++) {
                const pointIndex = y * (nextCols + 1) + x;
                uvData[pointIndex * 2] = x / safeCols;
                uvData[pointIndex * 2 + 1] = y / safeRows;
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW);
    }

    function markLineTopologyDirty(reason = 'manual') {
        lineTopologyDirty = true;
        lineTopologyDirtyCount++;
        lastLineTopologyDirtyReason = reason;
        log('line topology dirty', reason);
    }

    function markTopologyDirty(reason = 'manual') {
        topologyDirty = true;
        markLineTopologyDirty(reason);
        log('topology dirty', reason);
    }

    function markLineTopologyDirtyIfSpringChanged(spring, reason = 'spring-visual-category-changed') {
        if (!spring) return false;
        const nextCommonLine = isCommonSpringForGpu(spring);
        if (spring.__gpuCommonLine === nextCommonLine) return false;
        spring.__gpuCommonLine = nextCommonLine;
        markLineTopologyDirty(reason);
        return true;
    }

    function setDebugLineDirty(enabled) {
        debugLineDirty = enabled === true;
    }

    function updateTopology(points, springs, nextRows, nextCols, options = {}) {
        if (!isReady()) return false;
        try {
            const safePoints = points || [];
            const safeSprings = springs || [];
            const normalizedRows = Math.max(0, Math.floor(nextRows || 0));
            const normalizedCols = Math.max(0, Math.floor(nextCols || 0));
            const normalizedPointCount = Math.max(safePoints.length, (normalizedRows + 1) * (normalizedCols + 1));
            const springCount = safeSprings.length;
            const shouldRebuild = options.force === true
                || topologyDirty
                || normalizedRows !== lastRows
                || normalizedCols !== lastCols
                || normalizedPointCount !== lastPointCount
                || springCount !== lastSpringCount;

            if (!shouldRebuild) return true;

            rows = Math.max(0, Math.floor(nextRows || 0));
            cols = Math.max(0, Math.floor(nextCols || 0));
            pointCount = Math.max(safePoints.length, (rows + 1) * (cols + 1));
            if (rows <= 0 || cols <= 0 || pointCount <= 0) {
                indexCount = 0;
                topologyDirty = false;
                lastRows = rows;
                lastCols = cols;
                lastPointCount = pointCount;
                lastSpringCount = springCount;
                return true;
            }

            if (!positionData || positionData.length !== pointCount * 2) {
                positionData = new Float32Array(pointCount * 2);
            }

            if (!uvData || uvData.length !== pointCount * 2 || uvRows !== rows || uvCols !== cols) {
                rebuildUvs(rows, cols, pointCount);
            }

            const horizontalEdgeCount = (rows + 1) * cols;
            const verticalEdgeCount = rows * (cols + 1);
            if (!horizontalEdges || horizontalEdges.length !== horizontalEdgeCount) {
                horizontalEdges = new Uint8Array(horizontalEdgeCount);
            }
            if (!verticalEdges || verticalEdges.length !== verticalEdgeCount) {
                verticalEdges = new Uint8Array(verticalEdgeCount);
            }
            buildLiveGridEdges(safeSprings, rows, cols, horizontalEdges, verticalEdges);

            const needsUint32 = pointCount > 65535;
            if (needsUint32 && !uintIndexExtension) {
                throw new Error('OES_element_index_uint unavailable for large cloth mesh');
            }
            const nextIndexType = needsUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
            const maxIndexCount = rows * cols * 6;
            const nextIndexCtor = needsUint32 ? Uint32Array : Uint16Array;
            if (!workingIndexData || workingIndexData.length < maxIndexCount || workingIndexType !== nextIndexType) {
                workingIndexData = new nextIndexCtor(maxIndexCount);
                workingIndexType = nextIndexType;
            }

            let writeIndex = 0;

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const p00 = y * (cols + 1) + x;
                    const p10 = p00 + 1;
                    const p01 = (y + 1) * (cols + 1) + x;
                    const p11 = p01 + 1;
                    const point00 = safePoints[p00];
                    const point10 = safePoints[p10];
                    const point01 = safePoints[p01];
                    const point11 = safePoints[p11];

                    if (!isPointRenderable(point00)
                        || !isPointRenderable(point10)
                        || !isPointRenderable(point01)
                        || !isPointRenderable(point11)
                        || !hasQuadEdges(horizontalEdges, verticalEdges, cols, x, y)) {
                        continue;
                    }

                    workingIndexData[writeIndex++] = p00;
                    workingIndexData[writeIndex++] = p10;
                    workingIndexData[writeIndex++] = p11;
                    workingIndexData[writeIndex++] = p00;
                    workingIndexData[writeIndex++] = p11;
                    workingIndexData[writeIndex++] = p01;
                }
            }

            indexCount = writeIndex;
            indexArrayType = nextIndexType;
            let indicesChanged = indexCount !== lastUploadedIndexCount
                || indexArrayType !== lastUploadedIndexType
                || !lastUploadedIndexData;
            if (!indicesChanged) {
                for (let i = 0; i < indexCount; i++) {
                    if (workingIndexData[i] !== lastUploadedIndexData[i]) {
                        indicesChanged = true;
                        break;
                    }
                }
            }
            if (indicesChanged) {
                const uploadData = workingIndexData.subarray(0, indexCount);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, uploadData, gl.DYNAMIC_DRAW);
                lastUploadedIndexData = uploadData.slice();
                lastUploadedIndexCount = indexCount;
                lastUploadedIndexType = indexArrayType;
            }
            topologyDirty = false;
            lastRows = rows;
            lastCols = cols;
            lastPointCount = pointCount;
            lastSpringCount = springCount;
            return true;
        } catch (error) {
            disable(error);
            return false;
        }
    }

    function getIndexedPoint(point, points, nextCols) {
        const x = point?.gridX;
        const y = point?.gridY;
        if (Number.isInteger(x) && Number.isInteger(y) && nextCols >= 0) {
            const gridIndex = y * (nextCols + 1) + x;
            if (points[gridIndex] === point) return gridIndex;
        }
        return pointIndexMap?.get(point) ?? -1;
    }

    function updateLineTopology(points, springs, nextRows, nextCols, options = {}) {
        if (!isReady() || linesDisabled || !lineProgram) return false;
        try {
            const safePoints = points || [];
            const safeSprings = springs || [];
            const normalizedRows = Math.max(0, Math.floor(nextRows || 0));
            const normalizedCols = Math.max(0, Math.floor(nextCols || 0));
            const normalizedPointCount = Math.max(safePoints.length, (normalizedRows + 1) * (normalizedCols + 1));
            const springCount = safeSprings.length;
            const shouldRebuild = options.force === true
                || lineTopologyDirty
                || normalizedRows !== lastLineRows
                || normalizedCols !== lastLineCols
                || normalizedPointCount !== lastLinePointCount
                || springCount !== lastLineSpringCount;

            if (!shouldRebuild) return true;

            lineIndexRebuildCount++;
            pointCount = Math.max(pointCount, normalizedPointCount);
            if (pointCount <= 0 || springCount <= 0) {
                lineIndexCount = 0;
                lineTopologyDirty = false;
                lastLineRows = normalizedRows;
                lastLineCols = normalizedCols;
                lastLinePointCount = pointCount;
                lastLineSpringCount = springCount;
                return true;
            }

            const needsUint32 = pointCount > 65535;
            if (needsUint32 && !uintIndexExtension) {
                throw new Error('OES_element_index_uint unavailable for large cloth lines');
            }
            const nextIndexType = needsUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
            const nextIndexCtor = needsUint32 ? Uint32Array : Uint16Array;
            const maxIndexCount = springCount * 2;
            if (!workingLineIndexData || workingLineIndexData.length < maxIndexCount || workingLineIndexType !== nextIndexType) {
                workingLineIndexData = new nextIndexCtor(maxIndexCount);
                workingLineIndexType = nextIndexType;
            }

            if (!pointIndexMap) pointIndexMap = new Map();
            pointIndexMap.clear();
            for (let i = 0; i < safePoints.length; i++) {
                pointIndexMap.set(safePoints[i], i);
            }

            let writeIndex = 0;
            commonSpringCount = 0;
            specialSpringCount = 0;
            for (let i = 0; i < safeSprings.length; i++) {
                const spring = safeSprings[i];
                const commonLine = isCommonSpringForGpu(spring);
                if (spring) spring.__gpuCommonLine = commonLine;
                if (!commonLine) {
                    if (isSpringRenderable(spring)) specialSpringCount++;
                    continue;
                }
                commonSpringCount++;
                const p1Index = getIndexedPoint(spring.p1, safePoints, normalizedCols);
                const p2Index = getIndexedPoint(spring.p2, safePoints, normalizedCols);
                if (p1Index < 0 || p2Index < 0 || p1Index >= pointCount || p2Index >= pointCount) continue;
                workingLineIndexData[writeIndex++] = p1Index;
                workingLineIndexData[writeIndex++] = p2Index;
            }

            lineIndexCount = writeIndex;
            lineIndexArrayType = nextIndexType;
            let indicesChanged = lineIndexCount !== lastUploadedLineIndexCount
                || lineIndexArrayType !== lastUploadedLineIndexType
                || !lastUploadedLineIndexData;
            if (!indicesChanged) {
                for (let i = 0; i < lineIndexCount; i++) {
                    if (workingLineIndexData[i] !== lastUploadedLineIndexData[i]) {
                        indicesChanged = true;
                        break;
                    }
                }
            }
            if (indicesChanged) {
                const uploadData = workingLineIndexData.subarray(0, lineIndexCount);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIndexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, uploadData, gl.DYNAMIC_DRAW);
                lastUploadedLineIndexData = uploadData.slice();
                lastUploadedLineIndexCount = lineIndexCount;
                lastUploadedLineIndexType = lineIndexArrayType;
            }

            lineTopologyDirty = false;
            lastLineRows = normalizedRows;
            lastLineCols = normalizedCols;
            lastLinePointCount = pointCount;
            lastLineSpringCount = springCount;
            return true;
        } catch (error) {
            disableLines(error);
            return false;
        }
    }

    function updatePositions(points) {
        if (!isReady()) return false;
        try {
            const nextPointCount = Math.max(pointCount, points?.length || 0);
            if (!positionData || positionData.length !== nextPointCount * 2) {
                pointCount = nextPointCount;
                positionData = new Float32Array(pointCount * 2);
                positionBufferBytes = positionData.byteLength;
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, positionBufferBytes, gl.DYNAMIC_DRAW);
            }
            for (let i = 0; i < pointCount; i++) {
                const point = points?.[i];
                positionData[i * 2] = Number.isFinite(point?.x) ? point.x : 0;
                positionData[i * 2 + 1] = Number.isFinite(point?.y) ? point.y : 0;
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            if (positionBufferBytes !== positionData.byteLength) {
                positionBufferBytes = positionData.byteLength;
                gl.bufferData(gl.ARRAY_BUFFER, positionBufferBytes, gl.DYNAMIC_DRAW);
            }
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, positionData);
            return true;
        } catch (error) {
            disable(error);
            return false;
        }
    }

    function drawFabric(renderOptions) {
        if (!texture || indexCount <= 0) return true;
        gl.useProgram(program);
        gl.uniform2f(locations.resolution, canvas.width, canvas.height);
        gl.uniform1f(locations.alpha, renderOptions.alpha ?? 0.92);
        gl.uniform1i(locations.texture, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(locations.position);
        gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.enableVertexAttribArray(locations.uv);
        gl.vertexAttribPointer(locations.uv, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, indexCount, indexArrayType, 0);
        return true;
    }

    function drawLines(renderOptions) {
        if (linesDisabled || !lineProgram || lineIndexCount <= 0) return !linesDisabled;
        const alpha = renderOptions.lineAlpha ?? renderOptions.alpha ?? 1;
        if (alpha <= 0) return true;

        const color = parseColor(renderOptions.lineColor, alpha);
        color[3] = alpha;

        gl.useProgram(lineProgram);
        gl.uniform2f(lineLocations.resolution, canvas.width, canvas.height);
        gl.uniform4f(lineLocations.color, color[0], color[1], color[2], color[3]);
        gl.lineWidth(Math.max(1, renderOptions.lineWidth ?? 1));

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(lineLocations.position);
        gl.vertexAttribPointer(lineLocations.position, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIndexBuffer);
        gl.drawElements(gl.LINES, lineIndexCount, lineIndexArrayType, 0);
        return true;
    }

    function render(renderOptions = {}) {
        if (!isReady()) return false;
        try {
            const start = debug ? performance.now() : 0;
            const shouldRenderFabric = renderOptions.renderFabric !== false;
            const shouldRenderLines = renderOptions.renderLines === true;
            lastRenderStatus = { fabric: false, lines: false };
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            if (shouldRenderFabric) {
                if (!texture) return false;
                lastRenderStatus.fabric = drawFabric(renderOptions);
            }

            if (shouldRenderLines) {
                try {
                    lastRenderStatus.lines = drawLines(renderOptions);
                } catch (error) {
                    disableLines(error);
                    lastRenderStatus.lines = false;
                }
            }

            if (debug && performance.now() - lastDebugFrame > 500) {
                lastDebugFrame = performance.now();
                log(
                    `vertices=${pointCount}`,
                    `indices=${indexCount}`,
                    `lineIndices=${lineIndexCount}`,
                    `render=${(lastDebugFrame - start).toFixed(2)}ms`
                );
            }
            if (debugLineDirty) {
                debugLineDirtyFrame++;
                if (debugLineDirtyFrame % 120 === 0) {
                    console.log(
                        '[cloth-gpu-lines]',
                        `lineTopologyDirtyCount=${lineTopologyDirtyCount}`,
                        `lineIndexRebuildCount=${lineIndexRebuildCount}`,
                        `commonSpringCount=${commonSpringCount}`,
                        `specialSpringCount=${specialSpringCount}`,
                        `lastReason=${lastLineTopologyDirtyReason}`
                    );
                }
            }
            return !shouldRenderFabric || lastRenderStatus.fabric;
        } catch (error) {
            disable(error);
            return false;
        }
    }

    function canRenderLines() {
        return isReady() && !linesDisabled && !!lineProgram;
    }

    function getLastRenderStatus() {
        return lastRenderStatus;
    }

    function getLineDebugStats() {
        return {
            lineTopologyDirtyCount,
            lineIndexRebuildCount,
            commonSpringCount,
            specialSpringCount,
            lastLineTopologyDirtyReason,
            lineTopologyDirty,
        };
    }

    function dispose() {
        if (!gl) return;
        if (texture) gl.deleteTexture(texture);
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (uvBuffer) gl.deleteBuffer(uvBuffer);
        if (indexBuffer) gl.deleteBuffer(indexBuffer);
        if (lineIndexBuffer) gl.deleteBuffer(lineIndexBuffer);
        if (program) gl.deleteProgram(program);
        if (lineProgram) gl.deleteProgram(lineProgram);
        texture = null;
        positionBuffer = null;
        uvBuffer = null;
        indexBuffer = null;
        lineIndexBuffer = null;
        program = null;
        lineProgram = null;
        ready = false;
        disabled = true;
    }

    initialize();

    return {
        canvas,
        isReady,
        resize,
        uploadTexture,
        markTopologyDirty,
        markLineTopologyDirty,
        markLineTopologyDirtyIfSpringChanged,
        setDebugLineDirty,
        updateTopology,
        updateLineTopology,
        updatePositions,
        render,
        canRenderLines,
        getLastRenderStatus,
        getLineDebugStats,
        dispose,
        disable,
    };
}
