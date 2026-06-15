export function hexToRgb(hex) {
    const normalized = String(hex || '#55aaff').replace('#', '');
    const value = Number.parseInt(normalized, 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
    };
}

export function mixRgb(a, b, amount) {
    return {
        r: Math.round(a.r + (b.r - a.r) * amount),
        g: Math.round(a.g + (b.g - a.g) * amount),
        b: Math.round(a.b + (b.b - a.b) * amount),
    };
}

export function rgbToCss(rgb, alpha = 1) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
