const listeners = {};

export function on(event, fn) {
    (listeners[event] ??= []).push(fn);
    return () => {
        listeners[event] = (listeners[event] || []).filter(listener => listener !== fn);
    };
}

export function emit(event, ...args) {
    (listeners[event] || []).forEach(fn => fn(...args));
}

export function clearEventListeners() {
    Object.keys(listeners).forEach(event => {
        listeners[event] = [];
    });
}
