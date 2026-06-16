import { distancePointToSegment, getSpringMidpoint } from '../utils/math.js';

export const glueTool = { id: 'glue' };

export function createGlueToolController(game) {
    function applyGlueAt(x, y, permanent = false) {
        const cfg = game.config.glueTool;
        const point = game.findNearestPoint(x, y, cfg.radius);
        if (!point) return;

        if (game.glueState.mode === 'glueBridge') {
            if (!game.glueState.pendingPoint || !game.isPointAlive(game.glueState.pendingPoint)) {
                game.glueState.pendingPoint = point;
                game.pushToolEffect({ type: 'glueBlob', x: point.x, y: point.y, life: 22, maxLife: 22 });
                return;
            }
            if (game.glueState.pendingPoint === point) return;
            const dist = Math.hypot(game.glueState.pendingPoint.x - point.x, game.glueState.pendingPoint.y - point.y);
            if (dist <= cfg.bridgeMaxDistance) {
                if (game.glueBridges.length >= cfg.maxGlueBridges) removeGlueBridge(game.glueBridges.shift(), true);
                const bridge = new game.Spring(game.glueState.pendingPoint, point);
                bridge.length = dist;
                bridge.isTemporary = true;
                bridge.life = cfg.pinDuration;
                bridge.material = 'rubber';
                bridge.maxHp = cfg.temporarySpringHp;
                bridge.hp = cfg.temporarySpringHp;
                bridge.glueBridge = true;
                bridge.coverageWeight = 0;
                game.springs.push(bridge);
                game.markTopologyDirty?.('glue-bridge-added');
                game.glueBridges.push({ spring: bridge, life: cfg.pinDuration });
                game.pushToolEffect({ type: 'glueLine', x1: game.glueState.pendingPoint.x, y1: game.glueState.pendingPoint.y, x2: point.x, y2: point.y, life: 26, maxLife: 26 });
                game.addBackgroundDecal?.('glue', point.x, point.y, { radius: cfg.radius, temporary: true, intensity: 0.75 });
                game.createFineParticles(point.x, point.y, '#7df6ff', 4, 1.4);
            }
            game.glueState.pendingPoint = null;
            return;
        }

        if (game.gluePins.length >= cfg.maxGluePins) removeGluePin(game.gluePins.shift(), true);
        const alreadyPinned = point.pinned;
        point.pinned = true;
        point.gluePinned = true;
        point.gluePermanent = permanent || game.glueState.mode === 'clamp';
        point.glueTime = point.gluePermanent ? Infinity : cfg.pinDuration;
        game.gluePins.push({ point, life: point.glueTime, wasPinned: alreadyPinned });
        game.pushToolEffect({ type: 'glueBlob', x: point.x, y: point.y, life: 28, maxLife: 28 });
        game.addBackgroundDecal?.('glue', point.x, point.y, { radius: cfg.radius, temporary: true, intensity: 0.85 });
        game.createFineParticles(point.x, point.y, '#7df6ff', 5, 1.5);
    }

    function removeGluePin(pin, burst = false) {
        if (!pin || !pin.point) return;
        if (pin.point.gluePinned) {
            pin.point.pinned = !!pin.wasPinned || pin.point.originalPinned;
            pin.point.gluePinned = false;
            pin.point.gluePermanent = false;
            pin.point.glueTime = 0;
        }
        if (burst) game.createFineParticles(pin.point.x, pin.point.y, '#b9fbff', 4, 2);
    }

    function removeGlueBridge(bridge, burst = false) {
        if (!bridge || !bridge.spring) return;
        bridge.spring.active = false;
        bridge.spring.broken = true;
        game.markTopologyDirty?.('glue-bridge-removed');
        if (burst) {
            const mid = getSpringMidpoint(bridge.spring);
            game.createFineParticles(mid.x, mid.y, '#b9fbff', 5, 2);
        }
    }

    function removeGlueNear(x, y) {
        game.setGluePins(game.gluePins.filter(pin => {
            const hit = pin.point && Math.hypot(pin.point.x - x, pin.point.y - y) < game.config.glueTool.radius * 1.4;
            if (hit) removeGluePin(pin, true);
            return !hit;
        }));
        game.setGlueBridges(game.glueBridges.filter(bridge => {
            if (!bridge.spring) return false;
            const hit = distancePointToSegment(x, y, bridge.spring.p1.x, bridge.spring.p1.y, bridge.spring.p2.x, bridge.spring.p2.y) < game.config.glueTool.radius;
            if (hit) removeGlueBridge(bridge, true);
            return !hit;
        }));
    }

    function updateGlueConstraints() {
        game.setGluePins(game.gluePins.filter(pin => {
            if (!pin.point || !game.isPointAlive(pin.point)) return false;
            if (pin.point.gluePermanent) return true;
            pin.life--;
            pin.point.glueTime = pin.life;
            if (pin.life <= 0) {
                removeGluePin(pin, true);
                return false;
            }
            return true;
        }));

        game.setGlueBridges(game.glueBridges.filter(bridge => {
            if (!bridge.spring || !game.isSpringAlive(bridge.spring)) {
                if (bridge.spring) {
                    const mid = getSpringMidpoint(bridge.spring);
                    game.createFineParticles(mid.x, mid.y, '#b9fbff', 3, 2);
                }
                return false;
            }
            bridge.life--;
            bridge.spring.life = Math.min(bridge.spring.life, bridge.life);
            if (bridge.life <= 0) {
                removeGlueBridge(bridge, true);
                return false;
            }
            return true;
        }));
    }

    return { applyGlueAt, removeGluePin, removeGlueBridge, removeGlueNear, updateGlueConstraints };
}
