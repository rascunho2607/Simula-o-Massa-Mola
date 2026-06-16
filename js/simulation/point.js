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

export class PointModel {
    constructor(x, y, pinned = false) {
        this.x = x;
        this.y = y;
        this.px = x;
        this.py = y;
        this.pinned = pinned;
        this.originalPinned = pinned;
        this.dartId = null;
        this.isBurning = false;
        this.burnIntensity = 0;
        this.burnTime = 0;
        this.maxBurnTime = 200;
        this.frozen = false;
        this.freezeTime = 0;
        this.slowed = false;
        this.slowTime = 0;
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
        this.maxHp = config.clothDamage.pointBaseHp;
        this.hp = this.maxHp;
        this.armor = config.clothDamage.pointArmor;
        this.damage = 0;
        this.damageState = 0;
        this.isDestroyed = false;
        this.active = true;
        this.char = 0;
        this.lastDamageType = null;
        this.lastDamageFrame = -1;
        this.isCoverPoint = false;
        this.applyMaterialStats();
    }

    applyMaterialStats(keepDamageRatio = true) {
        const previousMaxHp = this.maxHp || config.clothDamage.pointBaseHp;
        const previousHp = this.hp ?? previousMaxHp;
        const damageRatio = keepDamageRatio ? 1 - Math.max(0, previousHp) / previousMaxHp : 0;
        const material = config.materials[this.material] ?? config.materials.cloth;
        const layer = getLayerByIndex(this.layerIndex);
        this.layerName = layer.name;
        this.layerStrengthMultiplier = layer.hpMultiplier;
        this.coverageWeight = layer.coverageWeight;
        this.maxHp = config.clothDamage.pointBaseHp * material.pointHpMultiplier * layer.hpMultiplier;
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
        if (!this.active || this.isDestroyed || amount <= 0) return 0;
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
            this.isDestroyed = true;
        }
        return effectiveDamage;
    }
}

export function createPointClass(game) {
    return class Point {
        constructor(x, y, pinned = false) {
            this.x = x;
            this.y = y;
            this.px = x;
            this.py = y;
            this.vx = 0;
            this.vy = 0;
            this.pinned = pinned;
            this.originalPinned = pinned;
            this.dartId = null;
            this.isBurning = false;
            this.burnIntensity = 0;
            this.burnTime = 0;
            this.maxBurnTime = 200;
            this.frozen = false;
            this.freezeTime = 0;
            this.slowed = false; // Para efeito de gosma
            this.slowTime = 0;
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
            this.maxHp = game.config.clothDamage.pointBaseHp;
            this.hp = this.maxHp;
            this.armor = game.config.clothDamage.pointArmor;
            this.damage = 0;
            this.damageState = 0;
            this.isDestroyed = false;
            this.active = true;
            this.char = 0;
            this.lastDamageType = null;
            this.lastDamageFrame = -1;
            this.isCoverPoint = false;
            this.gridX = 0;
            this.gridY = 0;
            this.applyMaterialStats(false);
        }

        applyMaterialStats(keepDamageRatio = true) {
            game.applyMaterialStats(this, game.config.clothDamage.pointBaseHp, 'pointHpMultiplier', keepDamageRatio);
        }

        setMaterial(materialKey) {
            this.material = game.config.materials[materialKey] ? materialKey : 'cloth';
            this.applyMaterialStats();
        }

        setLayer(layerIndex) {
            this.layerIndex = game.getLayerByIndex(layerIndex).index;
            this.applyMaterialStats();
        }

        update() {
            if (!game.isPointAlive(this)) return;

            // Efeito do congelamento
            if (this.frozen) {
                this.freezeTime--;
                if (this.freezeTime <= 0) {
                    this.frozen = false;
                }
                return; // Pontos congelados não se movem
            }

            if ((this.stunTime || 0) > 0) {
                this.stunTime--;
                this.px = this.x - (this.x - this.px) * 0.25;
                this.py = this.y - (this.y - this.py) * 0.25;
            }

            // Efeito da gosma (reduz velocidade)
            let currentFriction = game.config.friction;
            if (this.slowed) {
                currentFriction *= 0.8; // 20% mais lento
                this.slowTime--;
                if (this.slowTime <= 0) {
                    this.slowed = false;
                }
            }

            // Efeito do fogo
            if (this.isBurning) {
                this.burnTime++;
                game.applyDamageToPoint(
                    this,
                    game.config.clothDamage.flameDamagePerTick * this.burnIntensity,
                    'fire',
                    { x: this.x, y: this.y }
                );
                if (!game.isPointAlive(this)) return;
                
                if (!this.pinned) {
                    this.py -= 0.1 * this.burnIntensity;
                }
                
                if (Math.random() < 0.3 * this.burnIntensity) {
                    game.createFireParticle(
                        this.x + (Math.random() - 0.5) * 5,
                        this.y + (Math.random() - 0.5) * 5,
                        (Math.random() - 0.5) * 0.5,
                        -Math.random() * 1.5 - 0.5,
                        this.burnIntensity
                    );
                }
                
                // Propagar fogo mais rápido se tiver upgrade
                const spreadBonus = game.specialAbilities.flame.spread?.level || 0;
                if (Math.random() < (0.02 + spreadBonus * 0.01) * this.burnIntensity) {
                    game.springs.forEach(spring => {
                        if (spring.active && (spring.p1 === this || spring.p2 === this)) {
                            const otherPoint = spring.p1 === this ? spring.p2 : spring.p1;
                            if (!otherPoint.pinned && Math.random() < 0.3) {
                                otherPoint.ignite(this.burnIntensity * 0.7);
                            }
                        }
                    });
                }
                
                // Queima molas
                if (Math.random() < 0.01 * this.burnIntensity) {
                    game.springs.forEach(spring => {
                        if (spring.active && (spring.p1 === this || spring.p2 === this)) {
                            game.applyDamageToSpring(
                                spring,
                                game.config.clothDamage.flameDamagePerTick * 6 * this.burnIntensity,
                                'fire',
                                { x: this.x, y: this.y }
                            );
                        }
                    });
                }
                
                if (this.burnTime > this.maxBurnTime * 0.7) {
                    this.burnIntensity *= 0.99;
                }
                
                if (this.burnTime > this.maxBurnTime) {
                    this.isBurning = false;
                    this.burnIntensity = 0;
                    game.burningPoints.delete(this);
                }
            }

            if (this.pinned) return;

            // Força do game.mouse com upgrades
            let dx = this.x - game.mouse.x;
            let dy = this.y - game.mouse.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            const mouseRange = 80 * game.playerData.tools.mouse.range;
            
            if (game.mouse.down) {
                if (game.activeTool === 'mouse' && dist < mouseRange) {
                    const forceMultiplier = game.MOUSE_POWER * game.playerData.tools.mouse.force;
                    this.px -= (game.mouse.x - game.mouse.px) * forceMultiplier;
                    this.py -= (game.mouse.y - game.mouse.py) * forceMultiplier;
                    
                    // Ganhar XP por interação
                    if (Math.random() < 0.1) {
                        game.gainXP(1);
                    }
                } else if (game.activeTool === 'blower' && game.blowForce > 0) {
                    const blowerRange = 150 * game.playerData.tools.blower.range;
                    const blowerForceMultiplier = game.BLOWER_POWER * game.playerData.tools.blower.force;
                    
                    let blowX = Math.cos(game.blowAngle);
                    let blowY = Math.sin(game.blowAngle);
                    let pointToBlowX = this.x - game.mouse.x;
                    let pointToBlowY = this.y - game.mouse.y;
                    
                    let projection = pointToBlowX * blowX + pointToBlowY * blowY;
                    let blowDist = Math.sqrt(pointToBlowX * pointToBlowX + pointToBlowY * pointToBlowY);
                    
                    if (game.blowerMode === 'blow') {
                        // Modo sopro normal
                        if (projection > 0 && blowDist < blowerRange) {
                            let force = game.blowForce * (1 - blowDist / blowerRange) * blowerForceMultiplier;
                            this.px -= blowX * force;
                            this.py -= blowY * force;
                            
                            // Ganhar XP por sopro
                            if (Math.random() < 0.05) {
                                game.gainXP(1);
                            }
                        }
                    } else {
                        // Modo sucção (puxa para o centro)
                        if (blowDist < blowerRange) {
                            let force = game.blowForce * (1 - blowDist / blowerRange) * blowerForceMultiplier * 0.5;
                            this.px += (game.mouse.x - this.x) / blowDist * force;
                            this.py += (game.mouse.y - this.y) / blowDist * force;
                        }
                    }
                } else if (game.activeTool === 'flame' && game.flameActive) {
                    const flameRange = 120 * game.playerData.tools.flame.range;
                    const flameForceMultiplier = game.FLAME_POWER * game.playerData.tools.flame.force;
                    
                    let flameX = Math.cos(game.flameAngle);
                    let flameY = Math.sin(game.flameAngle);
                    let pointToFlameX = this.x - game.mouse.x;
                    let pointToFlameY = this.y - game.mouse.y;
                    
                    let projection = pointToFlameX * flameX + pointToFlameY * flameY;
                    let flameDist = Math.sqrt(pointToFlameX * pointToFlameX + pointToFlameY * pointToFlameY);
                    
                    if (projection > 0 && flameDist < flameRange) {
                        let force = (1 - flameDist / flameRange) * flameForceMultiplier * game.config.flameIntensity;
                        this.px -= flameX * force * 0.5;
                        this.py -= flameY * force * 0.5;
                        game.applyDamageToPoint(
                            this,
                            game.config.clothDamage.flameDamagePerTick * game.config.flameIntensity * 1.2,
                            'fire',
                            { x: this.x, y: this.y }
                        );
                        if (!game.isPointAlive(this)) return;
                        
                        // Chance de incendiar com upgrade de propagação
                        const spreadBonus = game.specialAbilities.flame.spread?.level || 0;
                        if (Math.random() < (0.05 + spreadBonus * 0.02) * game.config.flameIntensity && !this.isBurning) {
                            this.ignite(game.config.flameIntensity);
                            game.gainXP(2);
                        }
                    }
                }
            }

            // Integração de Verlet com fricção ajustada
            let vx = (this.x - this.px) * currentFriction;
            let vy = (this.y - this.py) * currentFriction;

            this.px = this.x;
            this.py = this.y;
            this.x += vx;
            this.y += vy + game.config.gravity;
        }
        
        ignite(intensity = 1.0) {
            if (game.getMaterial(this).fireResistance >= 999) return;
            this.isBurning = true;
            this.burnIntensity = Math.min(intensity, 1.5);
            this.burnTime = 0;
            game.burningPoints.add(this);
        }
        
        extinguish() {
            this.isBurning = false;
            this.burnIntensity = 0;
            game.burningPoints.delete(this);
        }
        
        freeze(duration = 100) {
            this.frozen = true;
            this.freezeTime = duration;
        }
        
        slow(duration = 150) {
            this.slowed = true;
            this.slowTime = duration;
        }

        draw() {
            if (this.isDestroyed) {
                game.ctx.save();
                game.ctx.globalAlpha = 0.35;
                game.ctx.fillStyle = '#333333';
                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
                game.ctx.fill();
                game.ctx.restore();
                return;
            }

            if (this.frozen) {
                // Desenhar ponto congelado
                game.ctx.save();
                game.ctx.fillStyle = '#55aaff';
                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
                game.ctx.fill();
                
                game.ctx.strokeStyle = '#ffffff';
                game.ctx.lineWidth = 1;
                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
                game.ctx.stroke();
                game.ctx.restore();
            } else if (this.slowed) {
                // Desenhar ponto com gosma
                game.ctx.save();
                game.ctx.fillStyle = '#00aa00';
                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                game.ctx.fill();
                
                game.ctx.strokeStyle = '#00ff00';
                game.ctx.lineWidth = 1;
                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
                game.ctx.stroke();
                game.ctx.restore();
            } else if (this.isBurning) {
                game.ctx.save();
                
                let gradient = game.ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, 8 * this.burnIntensity
                );
                gradient.addColorStop(0, `rgba(255, ${100 + 155 * this.burnIntensity}, 0, ${0.8 * this.burnIntensity})`);
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                
                game.ctx.fillStyle = gradient;
                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, 8 * this.burnIntensity, 0, Math.PI * 2);
                game.ctx.fill();
                
                game.ctx.restore();
                
                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                game.ctx.fillStyle = `rgb(255, ${100 + 155 * this.burnIntensity}, 0)`;
                game.ctx.fill();
            } else if (this.dartId) {
                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                game.ctx.fillStyle = '#ffff55';
                game.ctx.fill();
                
                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
                game.ctx.strokeStyle = '#ffaa00';
                game.ctx.lineWidth = 1;
                game.ctx.stroke();
            } else {
                if (this.damageState > 0 || this.char > 0) {
                    game.ctx.save();
                    if (game.config.damageEffectsConfig.enableGlow && this.damageState >= 3) {
                        game.ctx.globalAlpha = 0.22 + Math.sin(game.frameCount * 0.25) * 0.08;
                        game.ctx.fillStyle = '#ff5522';
                        game.ctx.beginPath();
                        game.ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
                        game.ctx.fill();
                    }
                    game.ctx.globalAlpha = 0.75;
                    game.ctx.beginPath();
                    game.ctx.arc(this.x, this.y, 1.5 + this.damageState * 0.35, 0, Math.PI * 2);
                    game.ctx.fillStyle = game.materialDamageColor(this, this.char > 0.35 ? 0.9 : 0.82);
                    game.ctx.fill();
                    game.ctx.restore();
                    return;
                }

                game.ctx.beginPath();
                game.ctx.arc(this.x, this.y, this.isCoverPoint ? 1.45 : 1, 0, Math.PI * 2);
                game.ctx.fillStyle = this.pinned ? '#ff5555' : game.materialDamageColor(this, 0.78);
                game.ctx.fill();
            }
        }
        
        pinByDart(dartId) {
            this.pinned = true;
            this.originalPinned = false;
            this.dartId = dartId;
            game.pinnedByDarts.add(this);
            game.updateDartCounter();
        }
        
        unpinByDart() {
            if (this.dartId) {
                this.pinned = false;
                this.dartId = null;
                game.pinnedByDarts.delete(this);
                game.updateDartCounter();
            }
        }
    }
}
