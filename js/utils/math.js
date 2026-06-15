export function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

export function angleTo(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

export function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

export function distancePointToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = clamp01(((px - ax) * abx + (py - ay) * aby) / lenSq);
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return Math.hypot(px - cx, py - cy);
}

export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const orient = (px, py, qx, qy, rx, ry) => (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
    const o1 = orient(ax, ay, bx, by, cx, cy);
    const o2 = orient(ax, ay, bx, by, dx, dy);
    const o3 = orient(cx, cy, dx, dy, ax, ay);
    const o4 = orient(cx, cy, dx, dy, bx, by);
    return o1 * o2 < 0 && o3 * o4 < 0;
}

export function distanceSegmentToSegment(ax, ay, bx, by, cx, cy, dx, dy) {
    if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
    return Math.min(
        distancePointToSegment(ax, ay, cx, cy, dx, dy),
        distancePointToSegment(bx, by, cx, cy, dx, dy),
        distancePointToSegment(cx, cy, ax, ay, bx, by),
        distancePointToSegment(dx, dy, ax, ay, bx, by)
    );
}

export function getSpringMidpoint(spring) {
    return {
        x: (spring.p1.x + spring.p2.x) / 2,
        y: (spring.p1.y + spring.p2.y) / 2,
    };
}
