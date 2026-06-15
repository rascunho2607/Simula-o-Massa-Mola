export function canActivateAbility(ability, lastActivation = 0, now = Date.now()) {
    if (!ability || ability.level === 0 || ability.type === 'passive') return false;
    return !ability.cooldown || now >= lastActivation + ability.cooldown;
}

export function createAbilitySystemController(game) {
    function activateAbility(abilityId) {
        const ability = game.specialAbilities[game.activeTool]?.[abilityId];
        if (!ability || ability.level === 0) return;

        const currentTime = Date.now();
        const lastActivation = game.abilityCooldowns[`${abilityId}_last`] || 0;
        const cooldownRemaining = ability.cooldown ? (lastActivation + ability.cooldown) - currentTime : 0;

        if (cooldownRemaining > 0) {
            console.log(`${ability.name} em cooldown: ${Math.ceil(cooldownRemaining / 1000)}s restantes`);
            return;
        }

        let effectApplied = false;
        switch (game.activeTool) {
            case 'cannon':
                effectApplied = activateCannonAbility(abilityId);
                break;
            case 'dart':
                effectApplied = activateDartAbility(abilityId);
                break;
            case 'blower':
                effectApplied = activateBlowerAbility(abilityId);
                break;
            case 'flame':
                effectApplied = activateFlameAbility(abilityId);
                break;
            case 'mouse':
                effectApplied = activateMouseAbility(abilityId);
                break;
        }

        if (effectApplied) {
            if (ability.cooldown) {
                game.abilityCooldowns[abilityId] = ability.cooldown;
                game.abilityCooldowns[`${abilityId}_last`] = currentTime;

                const cooldownInterval = setInterval(() => {
                    game.abilityCooldowns[abilityId] -= 100;
                    if (game.abilityCooldowns[abilityId] <= 0) {
                        clearInterval(cooldownInterval);
                        delete game.abilityCooldowns[abilityId];
                        game.updateAbilitiesBar();
                    } else {
                        game.updateAbilitiesBar();
                    }
                }, 100);
            }

            game.gainXP(15);
            game.updateAbilitiesBar();
        }
    }

    function activateCannonAbility(abilityId) {
        switch (abilityId) {
            case 'explosion':
                game.cannonballs.forEach(ball => {
                    game.createExplosion(ball.x, ball.y, 1.5);
                    ball.active = false;
                });
                return true;
            case 'guided':
                game.cannonballs.forEach(ball => {
                    ball.guided = true;
                    ball.guideTime = 300;
                });
                return true;
        }
        return false;
    }

    function activateDartAbility(abilityId) {
        const stuckDarts = game.darts.filter(dart => dart.stuck);
        if (stuckDarts.length === 0) return false;

        switch (abilityId) {
            case 'delayed':
                stuckDarts.forEach(dart => {
                    setTimeout(() => {
                        if (dart.stuckPoint) {
                            game.createExplosion(dart.x, dart.y, 1.0);
                            if (dart.stuckPoint) {
                                dart.stuckPoint.unpinByDart();
                                dart.stuck = false;
                                dart.active = false;
                            }
                        }
                    }, 2000);
                });
                return true;
            case 'chain':
                game.createChainLightning(stuckDarts);
                return true;
            case 'magnet':
                game.activateDartMagnet(stuckDarts);
                return true;
            case 'portal':
                if (stuckDarts.length >= 2) {
                    game.createPortal(stuckDarts[0], stuckDarts[1]);
                    return true;
                }
                break;
        }
        return false;
    }

    function activateBlowerAbility(abilityId) {
        switch (abilityId) {
            case 'vortex':
                game.createVortex(game.mouse.x, game.mouse.y);
                return true;
            case 'freeze':
                game.freezeArea(game.mouse.x, game.mouse.y);
                return true;
            case 'suction':
                game.setBlowerMode(game.blowerMode === 'blow' ? 'suction' : 'blow');
                game.modalAbilities.suction = game.blowerMode === 'suction';
                game.updateAbilitiesBar();
                return true;
            case 'tornado':
                game.createTornado(game.mouse.x, game.mouse.y);
                return true;
        }
        return false;
    }

    function activateFlameAbility(abilityId) {
        switch (abilityId) {
            case 'sparks':
                game.createSparks(game.mouse.x, game.mouse.y);
                return true;
            case 'ring':
                game.createFireRing(game.mouse.x, game.mouse.y);
                return true;
            case 'phoenix':
                game.activatePhoenix();
                return true;
        }
        return false;
    }

    function activateMouseAbility(abilityId) {
        switch (abilityId) {
            case 'web':
                game.createWeb(game.mouse.x, game.mouse.y);
                return true;
            case 'shield':
                game.createForceField(game.mouse.x, game.mouse.y);
                return true;
            case 'duplicate':
                game.duplicateMouseEffect();
                return true;
        }
        return false;
    }

    function upgradeAbility(toolId, abilityId) {
        const ability = game.specialAbilities[toolId][abilityId];
        const currentLevel = ability.level || 0;

        if (currentLevel >= ability.maxLevel) return;
        if (game.playerData.upgradePoints < ability.cost[currentLevel]) return;

        game.playerData.upgradePoints -= ability.cost[currentLevel];
        ability.level = currentLevel + 1;

        if (ability.type === 'active' || ability.type === 'modal') {
            if (!game.activeAbilities[toolId].includes(abilityId)) {
                game.activeAbilities[toolId].push(abilityId);
                game.updateAbilitiesBar();
            }
        }

        game.gainXP(ability.cost[currentLevel]);
        game.updatePlayerDisplay();
        game.showToolAbilities(toolId);
        game.saveGame();
    }

    return {
        activateAbility,
        activateCannonAbility,
        activateDartAbility,
        activateBlowerAbility,
        activateFlameAbility,
        activateMouseAbility,
        upgradeAbility,
    };
}
