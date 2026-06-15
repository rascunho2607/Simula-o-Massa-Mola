export function getUpgradeCost(currentLevel) {
    return Math.floor(10 * Math.pow(1.5, currentLevel));
}

export function createUpgradeController(game) {
    function canUpgrade(toolId, attribute) {
        if (game.tools[toolId]?.upgradesDisabled) return false;
        const cost = getUpgradeCost(game.playerData.tools[toolId][attribute]);
        return game.playerData.upgradePoints >= cost && game.playerData.tools[toolId][attribute] < 10;
    }

    function upgradeTool(toolId, attribute) {
        if (!canUpgrade(toolId, attribute)) return;

        const cost = getUpgradeCost(game.playerData.tools[toolId][attribute]);
        game.playerData.upgradePoints -= cost;
        game.playerData.tools[toolId][attribute]++;

        const tool = game.playerData.tools[toolId];
        const avgLevel = (tool.force + tool.range + tool.efficiency) / 3;
        tool.level = Math.floor(avgLevel);

        game.gainXP(cost);
        calculateBaseAttributes();
        game.updatePlayerDisplay();
        game.showToolUpgrades(toolId);
        game.saveGame();
    }

    function calculateBaseAttributes() {
        const cannonLvl = game.playerData.tools.cannon.level;
        const dartLvl = game.playerData.tools.dart.level;
        const blowerLvl = game.playerData.tools.blower.level;
        const flameLvl = game.playerData.tools.flame.level;
        const mouseLvl = game.playerData.tools.mouse.level;

        game.CANNON_POWER = 25 * (1 + cannonLvl * 0.2);
        game.DART_POWER = 22 * (1 + dartLvl * 0.2);
        game.BLOWER_POWER = 0.2 * (1 + blowerLvl * 0.3);
        game.FLAME_POWER = 0.3 * (1 + flameLvl * 0.25);
        game.MOUSE_POWER = 0.5 * (1 + mouseLvl * 0.2);
    }

    return { canUpgrade, getUpgradeCost, upgradeTool, calculateBaseAttributes };
}
