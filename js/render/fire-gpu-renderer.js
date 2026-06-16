const FLOATS_PER_PARTICLE = 7;
const TYPE_FIRE = 0;
const TYPE_SMOKE = 1;
const TYPE_SPARK = 2;

const vertexShaderSource = `
precision mediump float;

attribute vec2 a_position;
attribute float a_size;
attribute float a_alpha;
attribute float a_age;
attribute float a_intensity;
attribute float a_type;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_particleScale;
uniform float u_smokeScale;

varying float v_alpha;
varying float v_age;
varying float v_intensity;
varying float v_type;
varying float v_flicker;

void main() {
    float flicker = 0.85 + 0.15 * sin(u_time * 9.0 + a_position.x * 0.07 + a_position.y * 0.03);
    float typeScale = a_type > 0.5 && a_type < 1.5 ? u_smokeScale : 1.0;
    float ageGrowth = a_type > 0.5 && a_type < 1.5 ? mix(1.0, 1.8, a_age) : 1.0;
    vec2 wobble = vec2(
        sin(u_time * 6.0 + a_position.y * 0.05),
        cos(u_time * 5.0 + a_position.x * 0.04)
    ) * (a_type > 0.5 && a_type < 1.5 ? 0.7 : 0.35);

    vec2 zeroToOne = (a_position + wobble) / u_resolution;
    vec2 clip = zeroToOne * 2.0 - 1.0;
    clip.y = -clip.y;

    gl_Position = vec4(clip, 0.0, 1.0);
    gl_PointSize = max(1.0, a_size * u_particleScale * typeScale * ageGrowth * flicker);

    v_alpha = a_alpha;
    v_age = a_age;
    v_intensity = a_intensity;
    v_type = a_type;
    v_flicker = flicker;
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform float u_time;
uniform float u_glowStrength;
uniform float u_passType;

varying float v_alpha;
varying float v_age;
varying float v_intensity;
varying float v_type;
varying float v_flicker;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
    bool smokePass = u_passType < 0.5;
    bool isSmoke = v_type > 0.5 && v_type < 1.5;
    if ((smokePass && !isSmoke) || (!smokePass && isSmoke)) {
        discard;
    }

    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d = length(uv);
    if (d > 1.0) {
        discard;
    }

    float soft = smoothstep(1.0, 0.0, d);
    float core = smoothstep(0.55, 0.0, d);
    float n = hash(gl_PointCoord * 23.0 + u_time * 0.07);
    float flick = 0.85 + 0.15 * sin(u_time * 12.0 + n * 6.2831);

    vec3 color;
    float alpha;

    if (v_type < 0.5) {
        vec3 outer = vec3(1.0, 0.12, 0.02);
        vec3 mid = vec3(1.0, 0.45, 0.05);
        vec3 inner = vec3(1.0, 0.95, 0.45);

        color = mix(outer, mid, smoothstep(0.95, 0.25, d));
        color = mix(color, inner, core * 0.85);
        alpha = soft * v_alpha * v_intensity * flick * v_flicker * u_glowStrength;
    } else if (v_type < 1.5) {
        vec3 smoke = vec3(0.16, 0.15, 0.14);
        vec3 smokeLight = vec3(0.34, 0.32, 0.30);

        color = mix(smoke, smokeLight, n * 0.35);
        alpha = soft * v_alpha * 0.35 * (0.4 + v_age * 0.6);
    } else {
        color = vec3(1.0, 0.85, 0.25);
        alpha = soft * v_alpha * 1.4;
    }

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

let renderer = null;

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error || 'Erro desconhecido ao compilar shader.');
    }

    return shader;
}

function createProgram(gl) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(error || 'Erro desconhecido ao linkar programa WebGL.');
    }

    return program;
}

function createOverlayCanvas(canvas) {
    const fireCanvas = document.createElement('canvas');
    fireCanvas.id = 'fireGpuCanvas';
    fireCanvas.className = 'fire-gpu-canvas';
    fireCanvas.style.position = 'absolute';
    fireCanvas.style.left = '0';
    fireCanvas.style.top = '0';
    fireCanvas.style.pointerEvents = 'none';
    fireCanvas.style.zIndex = '2';
    fireCanvas.style.display = 'block';

    const parent = canvas.parentNode || document.body;
    parent.insertBefore(fireCanvas, canvas.nextSibling);
    return fireCanvas;
}

function resizeToCanvas() {
    if (!renderer) return;

    const { sourceCanvas, canvas, gl } = renderer;
    const rect = sourceCanvas.getBoundingClientRect();
    const width = sourceCanvas.width || Math.max(1, Math.round(rect.width));
    const height = sourceCanvas.height || Math.max(1, Math.round(rect.height));

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
    }

    canvas.style.width = `${rect.width || width}px`;
    canvas.style.height = `${rect.height || height}px`;
    canvas.style.left = `${sourceCanvas.offsetLeft}px`;
    canvas.style.top = `${sourceCanvas.offsetTop}px`;
}

function getParticleType(particle) {
    if (particle.type === 'smoke' || particle.visualType === 'smoke' || particle.type === TYPE_SMOKE) return TYPE_SMOKE;
    if (particle.type === 'spark' || particle.visualType === 'spark' || particle.type === TYPE_SPARK) return TYPE_SPARK;
    return TYPE_FIRE;
}

function fillParticleBuffer(particles, config) {
    const cfg = config.fireGpuRenderer;
    const maxParticles = Math.max(0, cfg.maxParticles | 0);
    if (!renderer.data || renderer.data.length !== maxParticles * FLOATS_PER_PARTICLE) {
        renderer.data = new Float32Array(maxParticles * FLOATS_PER_PARTICLE);
    }

    const width = renderer.canvas.width;
    const height = renderer.canvas.height;
    let count = 0;

    for (let i = particles.length - 1; i >= 0 && count < maxParticles; i--) {
        const particle = particles[i];
        const alpha = Math.max(0, Math.min(1, (particle.life ?? 0) / Math.max(1, particle.maxLife ?? particle.life ?? 1)));
        if (alpha < 0.02) continue;

        const type = getParticleType(particle);
        if (type === TYPE_SMOKE && !cfg.renderSmoke) continue;
        if (type !== TYPE_SMOKE && !cfg.renderFire) continue;

        const size = Math.max(1, (particle.size ?? particle.radius ?? 2) * 4);
        if (particle.x < -size || particle.x > width + size || particle.y < -size || particle.y > height + size) continue;

        const offset = count * FLOATS_PER_PARTICLE;
        renderer.data[offset] = particle.x;
        renderer.data[offset + 1] = particle.y;
        renderer.data[offset + 2] = size;
        renderer.data[offset + 3] = alpha;
        renderer.data[offset + 4] = 1 - alpha;
        renderer.data[offset + 5] = Math.max(0.05, particle.intensity ?? 1);
        renderer.data[offset + 6] = type;
        count++;
    }

    renderer.particleCount = count;
    return count;
}

function bindAttributes(gl) {
    const stride = FLOATS_PER_PARTICLE * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(renderer.locations.position);
    gl.vertexAttribPointer(renderer.locations.position, 2, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(renderer.locations.size);
    gl.vertexAttribPointer(renderer.locations.size, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(renderer.locations.alpha);
    gl.vertexAttribPointer(renderer.locations.alpha, 1, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(renderer.locations.age);
    gl.vertexAttribPointer(renderer.locations.age, 1, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(renderer.locations.intensity);
    gl.vertexAttribPointer(renderer.locations.intensity, 1, gl.FLOAT, false, stride, 5 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(renderer.locations.type);
    gl.vertexAttribPointer(renderer.locations.type, 1, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
}

function disableWithFallback(config, message, error) {
    console.warn(`[FireGpuRenderer] ${message}`, error || '');
    if (config?.fireGpuRenderer) {
        config.fireGpuRenderer.enabled = false;
    }
    disposeFireGpuRenderer();
}

export function initFireGpuRenderer(canvas, config) {
    if (!config?.fireGpuRenderer?.enabled || renderer?.ready) return renderer?.ready || false;
    if (!canvas) return false;

    let fireCanvas = null;
    try {
        fireCanvas = createOverlayCanvas(canvas);
        const gl = fireCanvas.getContext('webgl', {
            alpha: true,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: false,
        });

        if (!gl) throw new Error('WebGL nao esta disponivel neste navegador.');

        const program = createProgram(gl);
        const buffer = gl.createBuffer();
        renderer = {
            canvas: fireCanvas,
            sourceCanvas: canvas,
            gl,
            program,
            buffer,
            data: null,
            particleCount: 0,
            ready: true,
            locations: {
                position: gl.getAttribLocation(program, 'a_position'),
                size: gl.getAttribLocation(program, 'a_size'),
                alpha: gl.getAttribLocation(program, 'a_alpha'),
                age: gl.getAttribLocation(program, 'a_age'),
                intensity: gl.getAttribLocation(program, 'a_intensity'),
                type: gl.getAttribLocation(program, 'a_type'),
                resolution: gl.getUniformLocation(program, 'u_resolution'),
                time: gl.getUniformLocation(program, 'u_time'),
                particleScale: gl.getUniformLocation(program, 'u_particleScale'),
                smokeScale: gl.getUniformLocation(program, 'u_smokeScale'),
                glowStrength: gl.getUniformLocation(program, 'u_glowStrength'),
                passType: gl.getUniformLocation(program, 'u_passType'),
            },
        };

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        resizeToCanvas();

        window.FireGpuDebug = {
            isReady: () => isFireGpuRendererReady(),
            particleCount: () => renderer?.particleCount || 0,
            enabled: () => Boolean(config.fireGpuRenderer.enabled),
        };

        if (config.fireGpuRenderer.debug) {
            console.info('[FireGpuRenderer] GPU renderer ativo.');
        }

        return true;
    } catch (error) {
        fireCanvas?.parentNode?.removeChild(fireCanvas);
        disableWithFallback(config, 'Falha ao inicializar WebGL. Usando Canvas 2D.', error);
        return false;
    }
}

export function isFireGpuRendererReady() {
    return Boolean(renderer?.ready);
}

export function renderFireGpuParticles(particles, time, config) {
    if (!renderer?.ready || !config?.fireGpuRenderer?.enabled) return false;

    const start = config.fireGpuRenderer.debug && performance.now ? performance.now() : 0;

    try {
        resizeToCanvas();

        const { gl, canvas, program, buffer, locations } = renderer;
        const count = fillParticleBuffer(particles, config);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (count <= 0) return true;

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, renderer.data.subarray(0, count * FLOATS_PER_PARTICLE), gl.DYNAMIC_DRAW);
        bindAttributes(gl);

        gl.uniform2f(locations.resolution, canvas.width, canvas.height);
        gl.uniform1f(locations.time, time * 0.001);
        gl.uniform1f(locations.particleScale, config.fireGpuRenderer.particleScale ?? 1);
        gl.uniform1f(locations.smokeScale, config.fireGpuRenderer.smokeScale ?? 1);
        gl.uniform1f(locations.glowStrength, config.fireGpuRenderer.glowStrength ?? 1);

        if (config.fireGpuRenderer.renderSmoke) {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.uniform1f(locations.passType, 0);
            gl.drawArrays(gl.POINTS, 0, count);
        }

        gl.blendFunc(
            gl.SRC_ALPHA,
            config.fireGpuRenderer.useAdditiveBlending ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA
        );
        gl.uniform1f(locations.passType, 1);
        gl.drawArrays(gl.POINTS, 0, count);

        if (config.fireGpuRenderer.debug && performance.now && Math.random() < 0.04) {
            console.info('[FireGpuRenderer] frame', {
                particleCount: count,
                renderMs: performance.now() - start,
                fallback: false,
            });
        }

        return true;
    } catch (error) {
        disableWithFallback(config, 'Erro durante render WebGL. Voltando para Canvas 2D.', error);
        return false;
    }
}

export function clearFireGpuRenderer() {
    if (!renderer?.ready) return;
    renderer.gl.clearColor(0, 0, 0, 0);
    renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
    renderer.particleCount = 0;
}

export function disposeFireGpuRenderer() {
    if (!renderer) return;

    const { gl, program, buffer, canvas } = renderer;
    if (gl && !gl.isContextLost?.()) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
    }
    canvas?.parentNode?.removeChild(canvas);
    if (window.FireGpuDebug) delete window.FireGpuDebug;
    renderer = null;
}
