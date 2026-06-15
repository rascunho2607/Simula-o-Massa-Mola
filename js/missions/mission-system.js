import { missions } from './mission-data.js';

export function createMissionState(defaultMission = 'freeSandbox') {
    return {
        activeMissionId: missions[defaultMission] ? defaultMission : 'freeSandbox',
        started: defaultMission !== 'freeSandbox',
        completed: false,
        failed: false,
        failReason: '',
        score: 0,
        timeElapsed: 0,
        damageOutsideTarget: 0,
        targetDamage: 0,
        tissueDamage: 0,
        surgeryDamage: 0,
        fireUsed: false,
        lastCoverageRemoved: 0,
    };
}

export function createMissionController(game) {
    function initializeCoveredTarget() {
        if (!game.config.targetConfig.enabled) return;
        const target = game.coveredTarget;
        target.radius = game.config.targetConfig.radius;
        target.maxHp = game.config.targetConfig.hp;
        target.hp = game.config.targetConfig.hp;
        target.destroyed = false;
        target.exposed = false;
        target.coveragePercent = 100;
        target.exposedPercent = 0;
        target.x = game.width / 2;
        target.y = 50 + (game.rows * game.config.spacing) * 0.5;
        target.coverPoints = game.points.filter(point => {
            const isCoverPoint = Math.hypot(point.x - target.x, point.y - target.y) <= target.radius * 1.25;
            point.isCoverPoint = isCoverPoint;
            return isCoverPoint;
        });
        target.coverSprings = game.springs.filter(spring => {
            const midX = (spring.p1.x + spring.p2.x) / 2;
            const midY = (spring.p1.y + spring.p2.y) / 2;
            return Math.hypot(midX - target.x, midY - target.y) <= target.radius * 1.2;
        });
        target.totalCoverPoints = Math.max(1, target.coverPoints.length);
        target.totalCoverElements = Math.max(1, target.coverPoints.length + target.coverSprings.length);
        updateTargetCoverage(true);
        game.createTargetHud();
    }

    function updateTargetCoverage(force = false) {
        if (!game.config.targetConfig.enabled) return;
        if (!force && game.frameCount % game.config.targetConfig.coverageUpdateInterval !== 0) return;
        const target = game.coveredTarget;
        const alivePointWeight = target.coverPoints.reduce((sum, point) => sum + (game.isPointAlive(point) ? point.coverageWeight || 1 : 0), 0);
        const aliveSpringWeight = target.coverSprings.reduce((sum, spring) => sum + (game.isSpringAlive(spring) ? spring.coverageWeight || 1 : 0), 0);
        target.coveragePercent = Math.round(((alivePointWeight + aliveSpringWeight) / target.totalCoverElements) * 100);
        target.exposedPercent = 100 - target.coveragePercent;
        target.exposed = target.coveragePercent <= game.config.targetConfig.exposedThreshold;
        game.updateTargetHud();
    }

    function getSurgeryArea() {
        return {
            x: game.coveredTarget.x,
            y: game.coveredTarget.y,
            radius: game.coveredTarget.radius * 0.58,
        };
    }

    function isInsideSurgeryArea(x, y) {
        const area = getSurgeryArea();
        return Math.hypot(x - area.x, y - area.y) <= area.radius;
    }

    function recordMissionDamage(entity, amount, damageType, source = {}) {
        if (!game.missionState.started || game.missionState.completed || game.missionState.failed || amount <= 0) return;
        game.missionState.tissueDamage += amount;
        if (damageType === 'fire') game.missionState.fireUsed = true;
        if (game.missionState.activeMissionId === 'surgery') {
            const inside = isInsideSurgeryArea(source.x ?? entity?.x ?? game.coveredTarget.x, source.y ?? entity?.y ?? game.coveredTarget.y);
            if (inside) game.missionState.surgeryDamage += amount;
            else game.missionState.damageOutsideTarget += amount;
        }
    }

    function getTotalTissueHp() {
        const pointHp = game.points.reduce((sum, point) => sum + (point.maxHp || 0), 0);
        const springHp = game.springs.reduce((sum, spring) => sum + (spring.maxHp || 0), 0);
        return Math.max(1, pointHp + springHp);
    }

    function calculateMissionScore() {
        const target = game.coveredTarget;
        const coverageRemoved = 100 - target.coveragePercent;
        const corePenalty = Math.max(0, 100 - Math.ceil((target.hp / target.maxHp) * 100));
        const timePenalty = Math.floor(game.missionState.timeElapsed * 0.6);
        const outsidePenalty = Math.floor(game.missionState.damageOutsideTarget * 0.2);
        const firePenalty = game.missionState.activeMissionId === 'noFire' && game.missionState.fireUsed ? 250 : 0;
        let base = coverageRemoved * 12 + (target.destroyed ? 500 : 0);
        if (game.missionState.activeMissionId === 'totalDestruction') base += Math.min(1000, (game.missionState.tissueDamage / getTotalTissueHp()) * 1000);
        if (game.missionState.activeMissionId === 'surgery') base += game.missionState.surgeryDamage * 0.8;
        return Math.max(0, Math.round(base - corePenalty * 8 - timePenalty - outsidePenalty - firePenalty));
    }

    function completeMission() {
        if (game.missionState.completed || game.missionState.failed) return;
        game.missionState.completed = true;
        game.missionState.score = calculateMissionScore();
        game.updateMissionHud();
        game.createImpactRing(game.coveredTarget.x, game.coveredTarget.y, game.coveredTarget.radius * 0.8, '#7dffb2');
    }

    function failMission(reason) {
        if (game.missionState.completed || game.missionState.failed) return;
        game.missionState.failed = true;
        game.missionState.failReason = reason || 'Falhou';
        game.missionState.score = calculateMissionScore();
        game.updateMissionHud();
        game.createImpactRing(game.coveredTarget.x, game.coveredTarget.y, game.coveredTarget.radius * 0.7, '#ff6677');
    }

    function resetMission() {
        Object.assign(game.missionState, createMissionState(game.missionState.activeMissionId));
        game.updateMissionHud();
    }

    function startMission(id) {
        game.missionState.activeMissionId = missions[id] ? id : 'freeSandbox';
        resetMission();
    }

    function getMissionStatus() {
        if (game.missionState.activeMissionId === 'freeSandbox') return 'Sandbox';
        if (game.missionState.completed) return `Completa - ${game.missionState.score} pts`;
        if (game.missionState.failed) return `Falhou - ${game.missionState.failReason}`;
        return 'Em andamento';
    }

    function updateMission(delta) {
        if (game.missionState.activeMissionId === 'freeSandbox') {
            game.updateMissionHud();
            return;
        }
        if (!game.missionState.started || game.missionState.completed || game.missionState.failed) return;
        game.missionState.timeElapsed += delta;
        game.missionState.score = calculateMissionScore();
        const coreRatio = game.coveredTarget.maxHp ? game.coveredTarget.hp / game.coveredTarget.maxHp : 1;
        const tissueDamagePercent = (game.missionState.tissueDamage / getTotalTissueHp()) * 100;
        const id = game.missionState.activeMissionId;
        if (id === 'rescue') {
            if (coreRatio < 0.5) failMission('nucleo danificado');
            else if (game.coveredTarget.coveragePercent < 20) completeMission();
        } else if (id === 'disableCore') {
            if (game.coveredTarget.destroyed) completeMission();
        } else if (id === 'surgery') {
            if (game.missionState.damageOutsideTarget > 220) failMission('dano fora da area');
            else if (game.missionState.surgeryDamage > 450 || game.coveredTarget.coveragePercent < 55) completeMission();
        } else if (id === 'totalDestruction') {
            if (tissueDamagePercent >= 90) completeMission();
        } else if (id === 'noFire') {
            if (game.missionState.fireUsed) failMission('fogo usado');
            else if (game.coveredTarget.coveragePercent < 20) completeMission();
        }
        if (game.frameCount % 12 === 0) game.updateMissionHud();
    }

    function damageCoveredTarget(amount, damageType = 'impact', x = game.coveredTarget.x, y = game.coveredTarget.y) {
        const target = game.coveredTarget;
        if (!game.config.targetConfig.enabled || !target.exposed || target.destroyed) return;
        target.hp = Math.max(0, target.hp - amount);
        if (game.missionState.started && !game.missionState.completed && !game.missionState.failed) {
            game.missionState.targetDamage += amount;
            if (damageType === 'fire') game.missionState.fireUsed = true;
        }
        game.createImpactRing(target.x, target.y, target.radius * 0.35, damageType === 'fire' ? '#ff6633' : '#55ddff');
        game.createDamageBurst(x, y, damageType, 1.2, 10);
        if (target.hp <= 0) {
            target.destroyed = true;
            game.createImpactRing(target.x, target.y, target.radius, '#ffffff');
            game.createDamageBurst(target.x, target.y, 'explosion', 2.2, 35);
            game.gainXP(100);
        }
        game.updateTargetHud();
    }

    return { initializeCoveredTarget, updateTargetCoverage, getSurgeryArea, isInsideSurgeryArea, recordMissionDamage, getTotalTissueHp, calculateMissionScore, completeMission, failMission, resetMission, startMission, getMissionStatus, updateMission, damageCoveredTarget };
}
