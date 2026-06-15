export class ParticleModel {
    constructor(x, y, vx, vy, color, size, life) {
        Object.assign(this, { x, y, vx, vy, color, size, life, maxLife: life });
    }
}

export function createParticleClass(game) {
    return class Particle {
        constructor(x, y, vx, vy, color, size, life) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.size = size;
            this.life = life;
            this.maxLife = life;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.95;
            this.vy *= 0.95;
            this.life--;
            this.size *= 0.97;
        }

        draw() {
            game.ctx.globalAlpha = this.life / this.maxLife;
            game.ctx.fillStyle = this.color;
            game.ctx.beginPath();
            game.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            game.ctx.fill();
            game.ctx.globalAlpha = 1;
        }
    };
}
