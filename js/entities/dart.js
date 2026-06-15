export class DartModel {
    constructor(x, y, vx, vy, targetX, targetY) {
        Object.assign(this, { x, y, vx, vy, targetX, targetY, active: true, stuck: false, age: 0 });
        this.id = Math.random().toString(36).substr(2, 9);
        this.stuckPoint = null;
        this.rotation = Math.atan2(vy, vx);
    }
}

export function createDartClass(game) {
    return class Dart {
        constructor(x, y, vx, vy, targetX, targetY) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.active = true;
            this.stuck = false;
            this.age = 0;
            this.id = Math.random().toString(36).substr(2, 9);
            this.stuckPoint = null;
            this.rotation = Math.atan2(vy, vx);
            this.targetX = targetX;
            this.targetY = targetY;
            this.collisionEnabled = false;
            this.distanceTraveled = 0;
            this.initialDistanceToTarget = Math.sqrt(Math.pow(this.targetX - this.x, 2) + Math.pow(this.targetY - this.y, 2));
            this.minTravelDistance = this.initialDistanceToTarget * 0.9;
        }

        update() {
            if (this.stuck) {
                if (this.stuckPoint && game.isPointAlive(this.stuckPoint)) {
                    this.x = this.stuckPoint.x;
                    this.y = this.stuckPoint.y;
                } else {
                    this.active = false;
                }
                return;
            }

            const prevX = this.x;
            const prevY = this.y;
            this.x += this.vx;
            this.y += this.vy;
            this.vy += game.config.gravity * 0.05;
            this.rotation = Math.atan2(this.vy, this.vx);
            this.age++;
            this.distanceTraveled += Math.sqrt(Math.pow(this.x - prevX, 2) + Math.pow(this.y - prevY, 2));

            if (!this.collisionEnabled) {
                const dotProduct = (this.targetX - prevX) * this.vx + (this.targetY - prevY) * this.vy;
                if (this.distanceTraveled >= this.minTravelDistance || dotProduct < 0) {
                    this.collisionEnabled = true;
                }
            }

            if (this.x < -100 || this.x > game.width + 100 || this.y > game.height + 100 || this.age > 400) {
                this.active = false;
            }

            if (!this.active || this.stuck || !this.collisionEnabled) return;
            let closestPoint = null;
            let closestDist = Infinity;

            game.points.forEach(point => {
                if (point.pinned || !game.isPointAlive(point)) return;
                const dx = point.x - this.x;
                const dy = point.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 10 && dist < closestDist) {
                    closestDist = dist;
                    closestPoint = point;
                }
            });

            if (!closestPoint) return;
            const pierceDamage = game.config.clothDamage.dartPierceDamage * game.playerData.tools.dart.efficiency;
            game.applyDamageToPoint(closestPoint, pierceDamage, 'pierce', { x: this.x, y: this.y });
            game.applyAreaDamage(this.x, this.y, 24, pierceDamage * 0.45, 'pierce', true);
            game.createImpactRing(this.x, this.y, 24, '#ffff88');
            game.addBackgroundDecal?.('stab', this.x, this.y, { radius: 17, intensity: 0.9 });
            if (!game.isPointAlive(closestPoint)) {
                this.active = false;
                return;
            }

            this.stuck = true;
            this.stuckPoint = closestPoint;
            this.vx = 0;
            this.vy = 0;
            closestPoint.pinByDart(this.id);

            for (let i = 0; i < 15; i++) {
                game.pushDamageParticle(
                    this.x,
                    this.y,
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    '#ffff55',
                    2 + Math.random() * 3,
                    25 + Math.random() * 25
                );
            }

            game.gainXP(3);
        }

        draw() {
            game.ctx.save();
            game.ctx.translate(this.x, this.y);

            if (this.stuck) {
                game.ctx.rotate(this.rotation);
                game.ctx.strokeStyle = '#ffff55';
                game.ctx.lineWidth = 3;
                game.ctx.beginPath();
                game.ctx.moveTo(-8, 0);
                game.ctx.lineTo(12, 0);
                game.ctx.stroke();
                game.ctx.fillStyle = '#ffaa00';
                game.ctx.beginPath();
                game.ctx.moveTo(12, 0);
                game.ctx.lineTo(7, -3);
                game.ctx.lineTo(7, 3);
                game.ctx.closePath();
                game.ctx.fill();
                game.ctx.fillStyle = '#ff5555';
                game.ctx.beginPath();
                game.ctx.moveTo(-8, 0);
                game.ctx.lineTo(-3, -5);
                game.ctx.lineTo(2, 0);
                game.ctx.lineTo(-3, 5);
                game.ctx.closePath();
                game.ctx.fill();
            } else {
                game.ctx.rotate(this.rotation);
                game.ctx.strokeStyle = '#ffff55';
                game.ctx.lineWidth = 3;
                game.ctx.beginPath();
                game.ctx.moveTo(-10, 0);
                game.ctx.lineTo(15, 0);
                game.ctx.stroke();
                game.ctx.fillStyle = '#ffaa00';
                game.ctx.beginPath();
                game.ctx.moveTo(15, 0);
                game.ctx.lineTo(10, -3);
                game.ctx.lineTo(10, 3);
                game.ctx.closePath();
                game.ctx.fill();
                game.ctx.fillStyle = '#ff5555';
                game.ctx.beginPath();
                game.ctx.moveTo(-10, 0);
                game.ctx.lineTo(-5, -5);
                game.ctx.lineTo(0, 0);
                game.ctx.lineTo(-5, 5);
                game.ctx.closePath();
                game.ctx.fill();
                game.ctx.globalAlpha = this.collisionEnabled ? 0.5 : 0.2;
                game.ctx.strokeStyle = this.collisionEnabled ? '#ffaa00' : '#888888';
                game.ctx.lineWidth = this.collisionEnabled ? 1 : 0.5;
                game.ctx.beginPath();
                game.ctx.moveTo(-20, 0);
                game.ctx.lineTo(-10, 0);
                game.ctx.stroke();
                game.ctx.globalAlpha = 1;

                if (!this.collisionEnabled) {
                    game.ctx.restore();
                    game.ctx.save();
                    game.ctx.globalAlpha = 0.3;
                    game.ctx.strokeStyle = '#ffff00';
                    game.ctx.lineWidth = 1;
                    game.ctx.setLineDash([5, 5]);
                    game.ctx.beginPath();
                    game.ctx.moveTo(this.x, this.y);
                    game.ctx.lineTo(this.targetX, this.targetY);
                    game.ctx.stroke();
                    game.ctx.setLineDash([]);
                    game.ctx.beginPath();
                    game.ctx.arc(this.targetX, this.targetY, 5, 0, Math.PI * 2);
                    game.ctx.fillStyle = '#ffff00';
                    game.ctx.fill();
                    game.ctx.globalAlpha = 1;
                    game.ctx.restore();
                    game.ctx.save();
                    game.ctx.translate(this.x, this.y);
                    game.ctx.rotate(this.rotation);
                }
            }

            game.ctx.restore();
        }
    };
}
