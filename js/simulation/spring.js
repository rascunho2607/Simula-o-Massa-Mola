import { config } from '../core/config.js';

const resistanceByDamageType = {
    fire: 'fireResistance',
    slash: 'slashResistance',
    impact: 'impactResistance',
    pierce: 'pierceResistance',
    tension: 'tensionResistance',
    chemical: 'chemicalResistance',
    electric: 'electricResistance',
};

function getLayerByIndex(layerIndex) {
    return Object.values(config.layers).find((layer) => layer.index === layerIndex) ?? config.layers.outer;
}

export class SpringModel {
    constructor(p1, p2, length = config.spacing) {
        this.p1 = p1;
        this.p2 = p2;
        this.length = length;
        this.active = true;
        this.isBurning = false;
        this.burnIntensity = 0;
        this.isTemporary = false;
        this.life = 0;
        this.acidAmount = 0;
        this.isCorroding = false;
        this.corrosionTime = 0;
        this.electricCharge = 0;
        this.stunTime = 0;
        this.material = 'cloth';
        this.layerIndex = config.layers.outer.index;
        this.layerName = config.layers.outer.name;
        this.layerStrengthMultiplier = config.layers.outer.hpMultiplier;
        this.coverageWeight = config.layers.outer.coverageWeight;
        this.maxHp = config.clothDamage.springBaseHp;
        this.hp = this.maxHp;
        this.armor = config.clothDamage.springArmor;
        this.damage = 0;
        this.damageState = 0;
        this.broken = false;
        this.isSeam = false;
        this.seamGroupId = null;
        this.isWeakPoint = false;
        this.releasesOnBreak = false;
        this.char = 0;
        this.lastDamageType = null;
        this.lastDamageFrame = -1;
        this.lastTensionDamageFrame = -1;
        this.lastMouseDamageFrame = -1;
        this.applyMaterialStats();
    }

    applyMaterialStats(keepDamageRatio = true) {
        const previousMaxHp = this.maxHp || config.clothDamage.springBaseHp;
        const previousHp = this.hp ?? previousMaxHp;
        const damageRatio = keepDamageRatio ? 1 - Math.max(0, previousHp) / previousMaxHp : 0;
        const material = config.materials[this.material] ?? config.materials.cloth;
        const layer = getLayerByIndex(this.layerIndex);
        const seamMultiplier = this.isSeam ? 1.35 : 1;
        const weakMultiplier = this.isWeakPoint ? 0.55 : 1;
        this.layerName = layer.name;
        this.layerStrengthMultiplier = layer.hpMultiplier;
        this.coverageWeight = layer.coverageWeight;
        this.maxHp = config.clothDamage.springBaseHp * material.springHpMultiplier * layer.hpMultiplier * seamMultiplier * weakMultiplier;
        this.hp = Math.max(0, this.maxHp * (1 - damageRatio));
        this.setDamageState();
    }

    setMaterial(materialKey) {
        this.material = config.materials[materialKey] ? materialKey : 'cloth';
        this.applyMaterialStats();
    }

    setLayer(layerIndex) {
        const layer = getLayerByIndex(layerIndex);
        this.layerIndex = layer.index;
        this.applyMaterialStats();
    }

    markSeam(groupId, releasesOnBreak = false) {
        this.isSeam = true;
        this.seamGroupId = groupId;
        this.releasesOnBreak = releasesOnBreak;
        this.setMaterial('reinforced');
    }

    markWeakPoint() {
        this.isWeakPoint = true;
        this.applyMaterialStats();
    }

    getDamageResistance(damageType) {
        const material = config.materials[this.material] ?? config.materials.cloth;
        const layer = getLayerByIndex(this.layerIndex);
        const resistanceKey = resistanceByDamageType[damageType] ?? 'impactResistance';
        return Math.max(0.05, (material[resistanceKey] ?? 1) / layer.damageMultiplier);
    }

    setDamageState() {
        const ratio = 1 - Math.max(0, this.hp) / this.maxHp;
        if (ratio >= 1) this.damageState = 4;
        else if (ratio >= config.clothDamage.damageVisualThreshold3) this.damageState = 3;
        else if (ratio >= config.clothDamage.damageVisualThreshold2) this.damageState = 2;
        else if (ratio >= config.clothDamage.damageVisualThreshold1) this.damageState = 1;
        else this.damageState = 0;
        this.damage = Math.max(0, this.maxHp - this.hp);
    }

    takeDamage(amount, damageType = 'impact') {
        if (!this.active || this.broken || amount <= 0) return 0;
        let effectiveDamage = Math.max(0, amount / this.getDamageResistance(damageType) - this.armor);
        if (effectiveDamage <= 0 && damageType !== 'tension' && amount > 0) {
            effectiveDamage = Math.min(0.04, amount * 0.12);
        }
        this.hp = Math.max(0, this.hp - effectiveDamage);
        this.lastDamageType = damageType;
        if (damageType === 'fire') this.char = Math.min(1, this.char + effectiveDamage / this.maxHp);
        this.setDamageState();
        if (this.hp <= 0) {
            this.active = false;
            this.broken = true;
        }
        return effectiveDamage;
    }
}

export function createSpringClass(game) {
    return class Spring {
        constructor(p1, p2) {
            this.p1 = p1;
            this.p2 = p2;
            this.length = game.config.spacing;
            this.active = true;
            this.isBurning = false;
            this.burnIntensity = 0;
            this.isTemporary = false;
            this.life = 0;
            this.acidAmount = 0;
            this.isCorroding = false;
            this.corrosionTime = 0;
            this.electricCharge = 0;
            this.stunTime = 0;
            this.material = 'cloth';
            this.layerIndex = game.config.layers.outer.index;
            this.layerName = game.config.layers.outer.name;
            this.layerStrengthMultiplier = game.config.layers.outer.hpMultiplier;
            this.coverageWeight = game.config.layers.outer.coverageWeight;
            this.maxHp = game.config.clothDamage.springBaseHp;
            this.hp = this.maxHp;
            this.armor = game.config.clothDamage.springArmor;
            this.damage = 0;
            this.damageState = 0;
            this.broken = false;
            this.isSeam = false;
            this.seamGroupId = null;
            this.isWeakPoint = false;
            this.releasesOnBreak = false;
            this.char = 0;
            this.lastDamageType = null;
            this.lastDamageFrame = -1;
            this.lastTensionDamageFrame = -1;
            this.lastMouseDamageFrame = -1;
            this.applyMaterialStats(false);
        }

        applyMaterialStats(keepDamageRatio = true) {
            game.applyMaterialStats(this, game.config.clothDamage.springBaseHp, 'springHpMultiplier', keepDamageRatio);
        }

        setMaterial(materialKey) {
            this.material = game.config.materials[materialKey] ? materialKey : 'cloth';
            this.applyMaterialStats();
            game.markSpringLineTopologyDirtyIfVisualStateChanged?.(this, 'spring-material-changed');
        }

        setLayer(layerIndex) {
            this.layerIndex = game.getLayerByIndex(layerIndex).index;
            this.applyMaterialStats();
            game.markSpringLineTopologyDirtyIfVisualStateChanged?.(this, 'spring-layer-changed');
        }

        markSeam(groupId, releasesOnBreak = false) {
            this.isSeam = true;
            this.seamGroupId = groupId;
            this.releasesOnBreak = releasesOnBreak;
            this.material = 'reinforced';
            this.applyMaterialStats(false);
            game.markSpringLineTopologyDirtyIfVisualStateChanged?.(this, 'spring-seam-changed');
        }

        markWeakPoint() {
            this.isWeakPoint = true;
            this.applyMaterialStats();
            game.markSpringLineTopologyDirtyIfVisualStateChanged?.(this, 'spring-weak-point-changed');
        }

        update() {
            if (!game.isSpringAlive(this)) return;

            if (this.isTemporary) {
                this.life--;
                if (this.life <= 0) {
                    game.breakSpring(this, 'tension');
                    return;
                }
            }

            if (this.isBurning) {
                this.burnIntensity *= 0.98;
                game.applyDamageToSpring(
                    this,
                    game.config.clothDamage.flameDamagePerTick * 1.6 * this.burnIntensity,
                    'fire',
                    { x: (this.p1.x + this.p2.x) / 2, y: (this.p1.y + this.p2.y) / 2 }
                );
                if (!game.isSpringAlive(this)) return;
                
                if (Math.random() < 0.1 * this.burnIntensity) {
                    const t = Math.random();
                    const x = this.p1.x + (this.p2.x - this.p1.x) * t;
                    const y = this.p1.y + (this.p2.y - this.p1.y) * t;
                    
                    game.createFireParticle(
                        x + (Math.random() - 0.5) * 3,
                        y + (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 0.3,
                        -Math.random() * 0.8 - 0.2,
                        this.burnIntensity * 0.7
                    );
                }
                
                if (Math.random() < 0.02 * this.burnIntensity) {
                    game.applyDamageToSpring(
                        this,
                        game.config.clothDamage.flameDamagePerTick * 10 * this.burnIntensity,
                        'fire',
                        { x: (this.p1.x + this.p2.x) / 2, y: (this.p1.y + this.p2.y) / 2 }
                    );
                    if (!game.isSpringAlive(this)) return;
                }
                
                if (Math.random() < 0.01 * this.burnIntensity) {
                    if (!this.p1.isBurning) this.p1.ignite(this.burnIntensity * 0.5);
                    if (!this.p2.isBurning) this.p2.ignite(this.burnIntensity * 0.5);
                }
            }

            let dx = this.p2.x - this.p1.x;
            let dy = this.p2.y - this.p1.y;
            let dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
            const strain = dist / this.length;

            if (strain > game.config.clothDamage.springSafeStrain && this.lastTensionDamageFrame !== game.frameCount) {
                const burnWeakness = this.char > 0.35 || this.isBurning ? 1.45 : 1;
                const dartWeakness = (this.p1.dartId || this.p2.dartId) ? 1.25 : 1;
                const midX = (this.p1.x + this.p2.x) / 2;
                const midY = (this.p1.y + this.p2.y) / 2;
                const blowerWeakness = game.activeTool === 'blower' && game.blowForce > 0 && Math.hypot(midX - game.mouse.x, midY - game.mouse.y) < 170 * game.playerData.tools.blower.range ? 1.2 : 1;
                const safeStrain = game.config.clothDamage.tensionDamageMinStrain || game.config.clothDamage.springSafeStrain;
                const criticalRange = Math.max(0.001, game.config.clothDamage.springCriticalStrain - safeStrain);
                const normalized = Math.min(1, Math.max(0, (strain - safeStrain) / criticalRange));
                let tensionDamage = normalized
                    * normalized
                    * game.config.clothDamage.tensionDamageMultiplier
                    * burnWeakness
                    * dartWeakness
                    * blowerWeakness;

                if (game.frameCount < (game.config.clothDamage.startupInvulnerabilityFrames || 0)) {
                    tensionDamage = 0;
                } else if (!game.mouse.down && game.activeTool !== 'hook' && game.blowForce <= 0) {
                    tensionDamage *= game.config.clothDamage.gravityTensionDamageScale || 1;
                }

                tensionDamage = Math.min(game.config.clothDamage.tensionDamageMaxPerFrame || tensionDamage, tensionDamage);
                if (tensionDamage > 0) {
                    game.applyDamageToSpring(
                        this,
                        tensionDamage,
                        'tension',
                        { x: midX, y: midY }
                    );
                }
                this.lastTensionDamageFrame = game.frameCount;
                if (!game.isSpringAlive(this)) return;
            }

            if (game.mouse.down && game.activeTool === 'mouse' && this.mouseNearby() && this.lastMouseDamageFrame !== game.frameCount) {
                const mouseSpeed = Math.hypot(game.mouse.x - game.mouse.px, game.mouse.y - game.mouse.py);
                if (game.mouse.button === 2 || mouseSpeed > 18 || dist > game.config.tearDistance * 0.6) {
                    const slashDamage = game.config.clothDamage.mouseSlashDamage
                        * (game.mouse.button === 2 ? 0.45 : 0.25)
                        * (1 + Math.min(mouseSpeed, 50) / 70)
                        * game.playerData.tools.mouse.efficiency;
                    game.applyDamageToSpring(
                        this,
                        slashDamage,
                        'slash',
                        { x: (this.p1.x + this.p2.x) / 2, y: (this.p1.y + this.p2.y) / 2 }
                    );
                    this.lastMouseDamageFrame = game.frameCount;
                    if (!game.isSpringAlive(this)) return;
                }
            }

            if (game.frameCount >= (game.config.clothDamage.startupInvulnerabilityFrames || 0) && dist > game.config.tearDistance * 1.35) {
                game.applyDamageToSpring(
                    this,
                    game.config.clothDamage.springBaseHp * 0.04,
                    'tension',
                    { x: (this.p1.x + this.p2.x) / 2, y: (this.p1.y + this.p2.y) / 2 }
                );
                if (!game.isSpringAlive(this)) return;
            }

            if (!game.isSpringAlive(this)) {
                return;
            }

            const material = game.getMaterial(this);
            const elasticity = Math.max(0.2, material.elasticityMultiplier || 1);
            let diff = (this.length - dist) / dist;
            let offsetX = dx * diff * 0.5 * game.config.stiffness / elasticity;
            let offsetY = dy * diff * 0.5 * game.config.stiffness / elasticity;

            if (!this.p1.pinned) {
                this.p1.x -= offsetX;
                this.p1.y -= offsetY;
            }
            if (!this.p2.pinned) {
                this.p2.x += offsetX;
                this.p2.y += offsetY;
            }
        }
        
        ignite(intensity = 1.0) {
            if (game.getMaterial(this).fireResistance >= 999) return;
            this.isBurning = true;
            this.burnIntensity = intensity;
            game.markSpringLineTopologyDirtyIfVisualStateChanged?.(this, 'spring-ignited');
        }
        
        extinguish() {
            this.isBurning = false;
            this.burnIntensity = 0;
            game.markSpringLineTopologyDirtyIfVisualStateChanged?.(this, 'spring-extinguished');
        }

        mouseNearby() {
            let midX = (this.p1.x + this.p2.x) / 2;
            let midY = (this.p1.y + this.p2.y) / 2;
            return Math.hypot(midX - game.mouse.x, midY - game.mouse.y) < 20;
        }

        draw() {
            if (!game.isSpringAlive(this)) return;
            
            if (this.isTemporary) {
                game.ctx.strokeStyle = `rgba(255, 255, 255, ${this.life / 300 * 0.5})`;
                game.ctx.lineWidth = 1;
                game.ctx.setLineDash([5, 5]);
            } else if (this.isBurning) {
                const gradient = game.ctx.createLinearGradient(
                    this.p1.x, this.p1.y,
                    this.p2.x, this.p2.y
                );
                
                const intensity = this.burnIntensity;
                gradient.addColorStop(0, `rgba(255, ${100 + 155 * intensity}, 0, ${0.8 * intensity})`);
                gradient.addColorStop(0.5, `rgba(255, ${50 + 205 * intensity}, 0, ${0.9 * intensity})`);
                gradient.addColorStop(1, `rgba(255, ${100 + 155 * intensity}, 0, ${0.8 * intensity})`);
                
                game.ctx.strokeStyle = gradient;
                game.ctx.lineWidth = game.config.lineWidth + 2 * intensity;
                game.ctx.setLineDash([]);
            } else {
                const damageRatio = 1 - Math.max(0, this.hp) / this.maxHp;
                game.ctx.strokeStyle = game.materialDamageColor(this, this.isSeam ? 0.95 : 0.88);
                game.ctx.lineWidth = Math.max(0.35, game.config.lineWidth + damageRatio * 1.1 + (this.isSeam ? 1.25 : 0) + (this.isWeakPoint ? 0.55 : 0));
                game.ctx.setLineDash(this.isSeam ? [6, 4] : []);
                if ((this.isSeam || this.isWeakPoint) && game.config.damageEffectsConfig.enableGlow) {
                    game.ctx.save();
                    game.ctx.globalAlpha = this.isWeakPoint ? 0.16 + Math.sin(game.frameCount * 0.18) * 0.05 : 0.12;
                    game.ctx.strokeStyle = this.isWeakPoint ? '#ff6655' : '#ffe08a';
                    game.ctx.lineWidth = game.ctx.lineWidth + 3;
                    game.ctx.beginPath();
                    game.ctx.moveTo(this.p1.x, this.p1.y);
                    game.ctx.lineTo(this.p2.x, this.p2.y);
                    game.ctx.stroke();
                    game.ctx.restore();
                    game.ctx.strokeStyle = game.materialDamageColor(this, this.isSeam ? 0.95 : 0.88);
                    game.ctx.lineWidth = Math.max(0.35, game.config.lineWidth + damageRatio * 1.1 + (this.isSeam ? 1.25 : 0) + (this.isWeakPoint ? 0.55 : 0));
                    game.ctx.setLineDash(this.isSeam ? [6, 4] : []);
                }
            }
            
            game.ctx.beginPath();
            game.ctx.moveTo(this.p1.x, this.p1.y);
            if (this.damageState >= 3 && !this.isBurning) {
                const midX = (this.p1.x + this.p2.x) / 2 + (Math.random() - 0.5) * 1.4;
                const midY = (this.p1.y + this.p2.y) / 2 + (Math.random() - 0.5) * 1.4;
                game.ctx.lineTo(midX, midY);
            }
            game.ctx.lineTo(this.p2.x, this.p2.y);
            game.ctx.stroke();
            game.ctx.setLineDash([]);
        }
    }
}
