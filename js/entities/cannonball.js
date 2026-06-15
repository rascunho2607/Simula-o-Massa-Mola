export class CannonballModel {
    constructor(x, y, vx, vy) {
        Object.assign(this, { x, y, vx, vy, radius: 10, active: true, age: 0 });
        this.id = Math.random().toString(36).substr(2, 9);
    }
}

export function createCannonballClass(game) {
    return class Cannonball {
        constructor(x, y, vx, vy) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.radius = 10;
            this.active = true;
            this.age = 0;
            this.id = Math.random().toString(36).substr(2, 9);
            this.bounces = 0;
            this.maxBounces = game.specialAbilities.cannon.ricochet?.level || 0;
            this.willExplode = Math.random() < (game.specialAbilities.cannon.explosion?.level * 0.3 || 0);
            this.willFragment = Math.random() < (game.specialAbilities.cannon.fragmentation?.level * 0.2 || 0);
            this.guided = false;
            this.guideTime = 0;
            this.guideTarget = { x: game.mouse.x, y: game.mouse.y };
        }

        update() {
            if (this.guided && this.guideTime > 0) {
                this.guideTarget.x = game.mouse.x;
                this.guideTarget.y = game.mouse.y;
                const dx = this.guideTarget.x - this.x;
                const dy = this.guideTarget.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const guideStrength = 0.05;
                    this.vx += (dx / dist) * guideStrength;
                    this.vy += (dy / dist) * guideStrength;
                }
                this.guideTime--;
            }

            this.x += this.vx;
            this.y += this.vy;
            this.vy += game.config.gravity * 0.1;
            this.vx *= 0.99;
            this.vy *= 0.99;
            this.age++;

            if (this.maxBounces > 0 && this.bounces < this.maxBounces) {
                if (this.x < this.radius && this.vx < 0) {
                    this.vx = -this.vx * 0.9;
                    this.bounces++;
                    this.x = this.radius;
                    game.createRicochetEffect(this.x, this.y, Math.PI);
                } else if (this.x > game.width - this.radius && this.vx > 0) {
                    this.vx = -this.vx * 0.9;
                    this.bounces++;
                    this.x = game.width - this.radius;
                    game.createRicochetEffect(this.x, this.y, 0);
                }

                if (this.y < this.radius && this.vy < 0) {
                    this.vy = -this.vy * 0.9;
                    this.bounces++;
                    this.y = this.radius;
                    game.createRicochetEffect(this.x, this.y, Math.PI / 2);
                } else if (this.y > game.height - this.radius && this.vy > 0) {
                    this.vy = -this.vy * 0.9;
                    this.bounces++;
                    this.y = game.height - this.radius;
                    game.createRicochetEffect(this.x, this.y, -Math.PI / 2);
                }
            }

            if (this.x < -100 || this.x > game.width + 100 || this.y > game.height + 100 || this.age > 600) {
                this.active = false;
            }

            if (!this.active) return;
            game.points.forEach(point => {
                if (point.pinned || !game.isPointAlive(point)) return;
                const dx = point.x - this.x;
                const dy = point.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= this.radius + 2) return;

                point.px -= this.vx * 0.8;
                point.py -= this.vy * 0.8;
                if (this.lastDamageFrame !== game.frameCount) {
                    const impactSpeed = Math.hypot(this.vx, this.vy);
                    const impactDamage = game.config.clothDamage.cannonImpactDamage
                        * game.playerData.tools.cannon.efficiency
                        * (0.8 + Math.min(impactSpeed, game.CANNON_POWER) / Math.max(1, game.CANNON_POWER) * 0.4);
                    game.applyAreaDamage(this.x, this.y, game.config.clothDamage.cannonImpactRadius, impactDamage, 'impact', true);
                    game.createImpactRing(this.x, this.y, game.config.clothDamage.cannonImpactRadius * 0.45, '#ffcc66');
                    game.addBackgroundDecal?.('hammer', this.x, this.y, {
                        radius: game.config.clothDamage.cannonImpactRadius * 0.42,
                        intensity: 0.9,
                    });
                    this.lastDamageFrame = game.frameCount;
                }

                game.gainXP(2);

                if (this.willExplode) {
                    game.createExplosion(this.x, this.y, 1.0);
                    this.active = false;
                }

                if (this.willFragment && this.active) {
                    for (let i = 0; i < 3; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 2 + Math.random() * 2;
                        game.cannonballs.push(new game.Cannonball(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed));
                    }
                    this.active = false;
                }

                if (this.active && dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const dot = this.vx * nx + this.vy * ny;
                    this.vx = this.vx - 2 * dot * nx * 0.7;
                    this.vy = this.vy - 2 * dot * ny * 0.7;
                    game.createRicochetEffect(this.x, this.y, Math.atan2(ny, nx));
                }
            });
        }

        draw() {
            game.ctx.beginPath();
            game.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            game.ctx.fillStyle = this.guided ? '#ffaa00' : (this.willExplode ? '#ff8800' : '#ff5555');
            game.ctx.fill();
            game.ctx.strokeStyle = this.guided ? '#ffff00' : (this.willExplode ? '#ffaa00' : '#ff0000');
            game.ctx.lineWidth = 3;
            game.ctx.stroke();

            game.ctx.beginPath();
            game.ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
            game.ctx.fillStyle = this.guided ? '#ffff55' : (this.willExplode ? '#ffbb55' : '#ff8888');
            game.ctx.fill();

            if (this.maxBounces > 0) {
                game.ctx.fillStyle = '#ffff00';
                game.ctx.font = '10px Arial';
                game.ctx.fillText(`↻${this.maxBounces - this.bounces}`, this.x - 5, this.y - 12);
            }

            if (this.guided && this.guideTime > 0) {
                game.ctx.save();
                game.ctx.strokeStyle = '#ffff00';
                game.ctx.lineWidth = 1;
                game.ctx.setLineDash([5, 5]);
                game.ctx.beginPath();
                game.ctx.moveTo(this.x, this.y);
                game.ctx.lineTo(this.guideTarget.x, this.guideTarget.y);
                game.ctx.stroke();
                game.ctx.setLineDash([]);
                game.ctx.restore();
            }
        }
    };
}
