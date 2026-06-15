export class FireParticleModel {
    constructor(x, y, vx, vy, intensity = Math.random() * 0.5 + 0.5) {
        Object.assign(this, { x, y, vx, vy, intensity });
        this.life = 50 + Math.random() * 100;
        this.maxLife = this.life;
        this.size = 3 + Math.random() * 5;
        this.colorPhase = Math.random() * Math.PI * 2;
        this.colorType = 0;
    }
}

export function createFireParticleClass(game) {
    return class FireParticle {
        constructor(x, y, vx, vy, intensity) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.intensity = intensity || Math.random() * 0.5 + 0.5;
            this.life = 50 + Math.random() * 100;
            this.maxLife = this.life;
            this.size = 3 + Math.random() * 5;
            this.colorPhase = Math.random() * Math.PI * 2;

            const colorsLevel = game.specialAbilities.flame.colors?.level || 0;
            this.colorType = colorsLevel > 0 ? Math.floor(Math.random() * (colorsLevel + 1)) : 0;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.life--;
            this.size *= 0.98;
            this.vx += (Math.random() - 0.5) * 0.1;
            this.vy += (Math.random() - 0.5) * 0.05;
            this.vy -= 0.02;
        }

        draw() {
            const lifeRatio = this.life / this.maxLife;
            const alpha = lifeRatio * this.intensity;

            let r;
            let g;
            let b;
            switch (this.colorType) {
                case 1:
                    r = 100 + Math.sin(this.colorPhase) * 50;
                    g = 150 + Math.sin(this.colorPhase + 1) * 50;
                    b = 255;
                    break;
                case 2:
                    r = 100;
                    g = 255;
                    b = 100;
                    break;
                default:
                    r = 255;
                    g = 100 + Math.sin(this.colorPhase) * 100;
                    b = 0;
            }

            game.ctx.save();
            game.ctx.globalAlpha = alpha * 0.7;

            const gradient = game.ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

            game.ctx.fillStyle = gradient;
            game.ctx.beginPath();
            game.ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
            game.ctx.fill();

            game.ctx.globalAlpha = alpha;
            game.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            game.ctx.beginPath();
            game.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            game.ctx.fill();

            game.ctx.restore();
        }
    };
}
