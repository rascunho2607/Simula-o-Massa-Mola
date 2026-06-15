import { state } from './state.js';

export function bindCanvas(canvasElement) {
    state.canvas = canvasElement;
    state.ctx = canvasElement?.getContext('2d') || null;
    return { canvas: state.canvas, ctx: state.ctx };
}

export function resizeCanvas(width = window.innerWidth, height = window.innerHeight) {
    if (!state.canvas) return;
    state.width = state.canvas.width = width;
    state.height = state.canvas.height = height;
}
