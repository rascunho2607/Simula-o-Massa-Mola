export function shouldDrawToolEffect(activeTool, expectedTool) {
    return activeTool === expectedTool;
}

export function createToolVisualEffectsController(game) {
    function drawBlowerEffect() {
        const centerX = game.mouse.x;
        const centerY = game.mouse.y;
        const angle = game.blowAngle;
        const force = game.blowForce;
        const radius = 40 + force * 30;
        const color = game.blowerMode === 'suction' ? '#ff5555' : '#55aaff';
        const symbol = game.blowerMode === 'suction' ? '👇' : '💨';

        game.ctx.save();
        game.ctx.globalAlpha = 0.4;
        game.ctx.fillStyle = color;
        game.ctx.beginPath();
        game.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        game.ctx.fill();

        game.ctx.font = '20px Arial';
        game.ctx.fillStyle = '#ffffff';
        game.ctx.textAlign = 'center';
        game.ctx.textBaseline = 'middle';
        game.ctx.fillText(symbol, centerX, centerY);

        game.ctx.globalAlpha = 0.9;
        game.ctx.strokeStyle = '#ffffff';
        game.ctx.lineWidth = 3;
        game.ctx.beginPath();
        if (game.blowerMode === 'blow') {
            game.ctx.moveTo(centerX, centerY);
            const arrowX = centerX + Math.cos(angle) * (radius + 30);
            const arrowY = centerY + Math.sin(angle) * (radius + 30);
            game.ctx.lineTo(arrowX, arrowY);
            game.ctx.lineTo(arrowX - Math.cos(angle - 0.3) * 15, arrowY - Math.sin(angle - 0.3) * 15);
            game.ctx.moveTo(arrowX, arrowY);
            game.ctx.lineTo(arrowX - Math.cos(angle + 0.3) * 15, arrowY - Math.sin(angle + 0.3) * 15);
        } else {
            game.ctx.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
            game.ctx.lineTo(centerX, centerY);
            game.ctx.lineTo(centerX - Math.cos(angle - 0.3) * 15, centerY - Math.sin(angle - 0.3) * 15);
            game.ctx.moveTo(centerX, centerY);
            game.ctx.lineTo(centerX - Math.cos(angle + 0.3) * 15, centerY - Math.sin(angle + 0.3) * 15);
        }
        game.ctx.stroke();
        game.ctx.restore();

        if (Math.random() < 0.5) {
            const pAngle = angle + (Math.random() - 0.5) * 0.7;
            const pDist = Math.random() * radius;
            const px = centerX + Math.cos(pAngle) * pDist;
            const py = centerY + Math.sin(pAngle) * pDist;
            game.particles.push(new game.Particle(
                px,
                py,
                Math.cos(pAngle) * force * (game.blowerMode === 'suction' ? -3 : 5) + (Math.random() - 0.5) * 2,
                Math.sin(pAngle) * force * (game.blowerMode === 'suction' ? -3 : 5) + (Math.random() - 0.5) * 2,
                color,
                3 + Math.random() * 4,
                40 + Math.random() * 40
            ));
        }
    }

    function drawFlameEffect() {
        const centerX = game.mouse.x;
        const centerY = game.mouse.y;
        const angle = game.flameAngle;
        const length = 120 * game.playerData.tools.flame.range;
        const baseWidth = 30;
        const tipX = centerX + Math.cos(angle) * length;
        const tipY = centerY + Math.sin(angle) * length;
        const leftX = centerX + Math.cos(angle - Math.PI / 2) * baseWidth / 2;
        const leftY = centerY + Math.sin(angle - Math.PI / 2) * baseWidth / 2;
        const rightX = centerX + Math.cos(angle + Math.PI / 2) * baseWidth / 2;
        const rightY = centerY + Math.sin(angle + Math.PI / 2) * baseWidth / 2;

        game.ctx.save();
        const gradient = game.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseWidth * 1.5);
        gradient.addColorStop(0, `rgba(255, 200, 0, ${0.6 * game.config.flameIntensity})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${0.4 * game.config.flameIntensity})`);
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        game.ctx.fillStyle = gradient;
        game.ctx.beginPath();
        game.ctx.arc(centerX, centerY, baseWidth * 1.5, 0, Math.PI * 2);
        game.ctx.fill();

        const flameGradient = game.ctx.createLinearGradient(centerX, centerY, tipX, tipY);
        flameGradient.addColorStop(0, `rgba(255, 255, 200, ${0.7 * game.config.flameIntensity})`);
        flameGradient.addColorStop(0.3, `rgba(255, 200, 0, ${0.6 * game.config.flameIntensity})`);
        flameGradient.addColorStop(0.7, `rgba(255, 100, 0, ${0.5 * game.config.flameIntensity})`);
        flameGradient.addColorStop(1, `rgba(255, 50, 0, ${0.3 * game.config.flameIntensity})`);
        game.ctx.fillStyle = flameGradient;
        game.ctx.beginPath();
        game.ctx.moveTo(leftX, leftY);
        game.ctx.lineTo(tipX, tipY);
        game.ctx.lineTo(rightX, rightY);
        game.ctx.closePath();
        game.ctx.fill();
        game.ctx.restore();

        if (Math.random() < 0.8 * game.config.flameIntensity) {
            const dist = Math.random() * length * 0.8;
            const offset = (Math.random() - 0.5) * baseWidth * 0.7;
            const pX = centerX + Math.cos(angle) * dist + Math.cos(angle - Math.PI / 2) * offset;
            const pY = centerY + Math.sin(angle) * dist + Math.sin(angle - Math.PI / 2) * offset;
            game.fireParticles.push(new game.FireParticle(
                pX,
                pY,
                Math.cos(angle) * 2 + (Math.random() - 0.5) * 1.5,
                Math.sin(angle) * 2 + (Math.random() - 0.5) * 1.5 - 0.5,
                game.config.flameIntensity * (0.7 + Math.random() * 0.3)
            ));
        }

        if (Math.random() < 0.3 * game.config.flameIntensity) {
            const smokeX = centerX + Math.cos(angle) * length * 0.9;
            const smokeY = centerY + Math.sin(angle) * length * 0.9;
            game.particles.push(new game.Particle(
                smokeX,
                smokeY,
                Math.cos(angle) * 0.5 + (Math.random() - 0.5) * 0.8,
                Math.sin(angle) * 0.5 + (Math.random() - 0.5) * 0.8 - 0.3,
                `rgba(100, 100, 100, ${0.5 * game.config.flameIntensity})`,
                5 + Math.random() * 8,
                80 + Math.random() * 80
            ));
        }
    }

    return { drawBlowerEffect, drawFlameEffect };
}

export function createToolOverlayRendererController(game) {
    function drawToolOverlays() {
        game.ctx.save();

        game.toolEffects.forEach(effect => {
            const alpha = effect.life / effect.maxLife;
            game.ctx.globalAlpha = alpha;

            if (effect.type === 'bladeTrail') {
                game.ctx.strokeStyle = 'rgba(235, 245, 255, 0.9)';
                game.ctx.lineWidth = 3;
                game.ctx.beginPath();
                game.ctx.moveTo(effect.x1, effect.y1);
                game.ctx.lineTo(effect.x2, effect.y2);
                game.ctx.stroke();
                game.ctx.strokeStyle = 'rgba(120, 150, 170, 0.45)';
                game.ctx.lineWidth = 7;
                game.ctx.beginPath();
                game.ctx.moveTo(effect.x1, effect.y1);
                game.ctx.lineTo(effect.x2, effect.y2);
                game.ctx.stroke();
            } else if (effect.type === 'laserBeam') {
                game.ctx.strokeStyle = 'rgba(255, 60, 25, 0.85)';
                game.ctx.lineWidth = 8;
                game.ctx.beginPath();
                game.ctx.moveTo(effect.x1, effect.y1);
                game.ctx.lineTo(effect.x2, effect.y2);
                game.ctx.stroke();
                game.ctx.strokeStyle = 'rgba(255, 230, 120, 0.95)';
                game.ctx.lineWidth = 2;
                game.ctx.beginPath();
                game.ctx.moveTo(effect.x1, effect.y1);
                game.ctx.lineTo(effect.x2, effect.y2);
                game.ctx.stroke();
            } else if (effect.type === 'drillContact') {
                game.ctx.translate(effect.x, effect.y);
                game.ctx.rotate(effect.angle);
                game.ctx.strokeStyle = 'rgba(230, 240, 245, 0.9)';
                game.ctx.lineWidth = 2;
                game.ctx.beginPath();
                game.ctx.arc(0, 0, game.config.drillTool.radius * 0.5, 0, Math.PI * 1.5);
                game.ctx.stroke();
                game.ctx.beginPath();
                game.ctx.moveTo(-8, 0);
                game.ctx.lineTo(8, 0);
                game.ctx.moveTo(0, -8);
                game.ctx.lineTo(0, 8);
                game.ctx.stroke();
                game.ctx.setTransform(1, 0, 0, 1, 0, 0);
            } else if (effect.type === 'scissorSnip') {
                game.ctx.translate(effect.x, effect.y);
                game.ctx.rotate(effect.angle);
                game.ctx.strokeStyle = 'rgba(245, 250, 255, 0.95)';
                game.ctx.lineWidth = 2;
                game.ctx.beginPath();
                game.ctx.moveTo(-14, -8);
                game.ctx.lineTo(14, 2);
                game.ctx.moveTo(-14, 8);
                game.ctx.lineTo(14, -2);
                game.ctx.stroke();
                game.ctx.setTransform(1, 0, 0, 1, 0, 0);
            } else if (effect.type === 'hammerShock') {
                const radius = effect.radius * (1 - alpha * 0.35);
                game.ctx.strokeStyle = 'rgba(255, 225, 120, 0.9)';
                game.ctx.lineWidth = 2 + alpha * 5;
                game.ctx.beginPath();
                game.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                game.ctx.stroke();
            } else if (effect.type === 'acidCloud') {
                const radius = effect.radius * (0.75 + (1 - alpha) * 0.35);
                const gradient = game.ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, radius);
                gradient.addColorStop(0, `rgba(180, 255, 72, ${0.22 * alpha})`);
                gradient.addColorStop(1, 'rgba(80, 210, 70, 0)');
                game.ctx.fillStyle = gradient;
                game.ctx.beginPath();
                game.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                game.ctx.fill();
            } else if (effect.type === 'glueBlob') {
                game.ctx.fillStyle = `rgba(125, 246, 255, ${0.45 + alpha * 0.35})`;
                game.ctx.beginPath();
                game.ctx.arc(effect.x, effect.y, 7 + (1 - alpha) * 6, 0, Math.PI * 2);
                game.ctx.fill();
            } else if (effect.type === 'glueLine') {
                game.ctx.strokeStyle = `rgba(125, 246, 255, ${0.85 * alpha})`;
                game.ctx.lineWidth = 3;
                game.ctx.beginPath();
                game.ctx.moveTo(effect.x1, effect.y1);
                game.ctx.lineTo(effect.x2, effect.y2);
                game.ctx.stroke();
            } else if (effect.type === 'electricArc') {
                game.ctx.strokeStyle = effect.strong ? `rgba(255,255,255,${alpha})` : `rgba(95,220,255,${alpha})`;
                game.ctx.lineWidth = effect.strong ? 3 : 2;
                game.ctx.beginPath();
                game.ctx.moveTo(effect.x1, effect.y1);
                const mx = (effect.x1 + effect.x2) / 2 + (Math.random() - 0.5) * 10;
                const my = (effect.y1 + effect.y2) / 2 + (Math.random() - 0.5) * 10;
                game.ctx.lineTo(mx, my);
                game.ctx.lineTo(effect.x2, effect.y2);
                game.ctx.stroke();
            } else if (effect.type === 'electricFlash') {
                game.ctx.strokeStyle = `rgba(130, 235, 255, ${alpha})`;
                game.ctx.lineWidth = 2 + alpha * 4;
                game.ctx.beginPath();
                game.ctx.arc(effect.x, effect.y, 18 + (1 - alpha) * 30, 0, Math.PI * 2);
                game.ctx.stroke();
            }
        });

        if (game.activeTool === 'blade') {
            game.ctx.globalAlpha = 0.65;
            game.ctx.strokeStyle = '#eaf6ff';
            game.ctx.lineWidth = 1.5;
            game.ctx.beginPath();
            game.ctx.arc(game.mouse.x, game.mouse.y, game.config.bladeTool.radius, 0, Math.PI * 2);
            game.ctx.stroke();
        } else if (game.activeTool === 'hook') {
            game.ctx.globalAlpha = 0.55;
            game.ctx.strokeStyle = '#ffd166';
            game.ctx.lineWidth = 1.5;
            game.ctx.beginPath();
            game.ctx.arc(game.mouse.x, game.mouse.y, game.config.hookTool.attachRadius, 0, Math.PI * 2);
            game.ctx.stroke();
        } else if (game.activeTool === 'drill') {
            game.ctx.globalAlpha = 0.65;
            game.ctx.strokeStyle = '#d9f0ff';
            game.ctx.lineWidth = 1.5;
            game.ctx.beginPath();
            game.ctx.arc(game.mouse.x, game.mouse.y, game.config.drillTool.radius, 0, Math.PI * 2);
            game.ctx.stroke();
        } else if (game.activeTool === 'laser') {
            const dir = game.getLaserVector();
            game.ctx.globalAlpha = 0.45;
            game.ctx.strokeStyle = '#ff5533';
            game.ctx.lineWidth = game.config.laserTool.width;
            game.ctx.beginPath();
            game.ctx.moveTo(game.mouse.x, game.mouse.y);
            game.ctx.lineTo(game.mouse.x + dir.x * game.config.laserTool.length, game.mouse.y + dir.y * game.config.laserTool.length);
            game.ctx.stroke();
        } else if (game.activeTool === 'scissor' && game.config.scissorTool.preview) {
            const spring = game.findNearestSpring(game.mouse.x, game.mouse.y, game.config.scissorTool.selectRadius);
            if (spring) {
                game.ctx.globalAlpha = 0.95;
                game.ctx.strokeStyle = '#ffffff';
                game.ctx.lineWidth = 4;
                game.ctx.beginPath();
                game.ctx.moveTo(spring.p1.x, spring.p1.y);
                game.ctx.lineTo(spring.p2.x, spring.p2.y);
                game.ctx.stroke();
                game.ctx.strokeStyle = '#77ddff';
                game.ctx.lineWidth = 2;
                game.ctx.beginPath();
                game.ctx.moveTo(spring.p1.x, spring.p1.y);
                game.ctx.lineTo(spring.p2.x, spring.p2.y);
                game.ctx.stroke();
            }
        } else if (game.activeTool === 'hammer') {
            game.ctx.globalAlpha = 0.35;
            game.ctx.strokeStyle = '#ffee9a';
            game.ctx.lineWidth = 2;
            game.ctx.beginPath();
            game.ctx.arc(game.mouse.x, game.mouse.y, game.config.hammerTool.radius, 0, Math.PI * 2);
            game.ctx.stroke();
        } else if (game.activeTool === 'acid') {
            game.ctx.globalAlpha = 0.38;
            game.ctx.fillStyle = 'rgba(120, 255, 80, 0.22)';
            game.ctx.beginPath();
            game.ctx.arc(game.mouse.x, game.mouse.y, game.config.acidTool.radius, 0, Math.PI * 2);
            game.ctx.fill();
            game.ctx.strokeStyle = '#9cff5a';
            game.ctx.lineWidth = 1.5;
            game.ctx.stroke();
        } else if (game.activeTool === 'glue') {
            game.ctx.globalAlpha = 0.55;
            game.ctx.strokeStyle = game.glueState.mode === 'clamp' ? '#ffffff' : '#7df6ff';
            game.ctx.lineWidth = 1.5;
            game.ctx.beginPath();
            game.ctx.arc(game.mouse.x, game.mouse.y, game.config.glueTool.radius, 0, Math.PI * 2);
            game.ctx.stroke();
            if (game.glueState.pendingPoint) {
                game.ctx.setLineDash([5, 4]);
                game.ctx.beginPath();
                game.ctx.moveTo(game.glueState.pendingPoint.x, game.glueState.pendingPoint.y);
                game.ctx.lineTo(game.mouse.x, game.mouse.y);
                game.ctx.stroke();
                game.ctx.setLineDash([]);
            }
        } else if (game.activeTool === 'electric') {
            game.ctx.globalAlpha = 0.55;
            game.ctx.strokeStyle = '#7ee8ff';
            game.ctx.lineWidth = 1.7;
            game.ctx.beginPath();
            game.ctx.arc(game.mouse.x, game.mouse.y, game.config.electricTool.startRadius, 0, Math.PI * 2);
            game.ctx.stroke();
        }

        if (game.hookState.active && game.hookState.attachedPoint) {
            const point = game.hookState.attachedPoint;
            game.ctx.globalAlpha = 0.95;
            game.ctx.strokeStyle = '#ffd166';
            game.ctx.lineWidth = game.config.hookTool.visualRopeWidth;
            game.ctx.setLineDash([8, 5]);
            game.ctx.beginPath();
            game.ctx.moveTo(game.mouse.x, game.mouse.y);
            game.ctx.lineTo(point.x, point.y);
            game.ctx.stroke();
            game.ctx.setLineDash([]);
            game.ctx.fillStyle = '#fff0a8';
            game.ctx.beginPath();
            game.ctx.arc(point.x, point.y, 5 + Math.sin(game.frameCount * 0.4) * 1.2, 0, Math.PI * 2);
            game.ctx.fill();
        }

        game.gluePins.forEach(pin => {
            if (!pin.point) return;
            game.ctx.globalAlpha = pin.point.gluePermanent ? 0.95 : 0.7;
            game.ctx.fillStyle = pin.point.gluePermanent ? '#ffffff' : '#7df6ff';
            game.ctx.beginPath();
            game.ctx.arc(pin.point.x, pin.point.y, 4 + Math.sin(game.frameCount * 0.18) * 0.8, 0, Math.PI * 2);
            game.ctx.fill();
        });

        game.glueBridges.forEach(bridge => {
            if (!bridge.spring || !game.isSpringAlive(bridge.spring)) return;
            game.ctx.globalAlpha = 0.68;
            game.ctx.strokeStyle = '#7df6ff';
            game.ctx.lineWidth = 2.5;
            game.ctx.beginPath();
            game.ctx.moveTo(bridge.spring.p1.x, bridge.spring.p1.y);
            game.ctx.lineTo(bridge.spring.p2.x, bridge.spring.p2.y);
            game.ctx.stroke();
        });

        if (game.missionState.activeMissionId === 'surgery' && game.missionState.started && !game.missionState.completed && !game.missionState.failed) {
            const area = game.getSurgeryArea();
            game.ctx.globalAlpha = 0.22;
            game.ctx.fillStyle = '#7dffb2';
            game.ctx.beginPath();
            game.ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
            game.ctx.fill();
            game.ctx.globalAlpha = 0.7;
            game.ctx.strokeStyle = '#7dffb2';
            game.ctx.lineWidth = 2;
            game.ctx.beginPath();
            game.ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
            game.ctx.stroke();
        }

        game.ctx.restore();
    }

    return { drawToolOverlays };
}
