export function getXpPercent(playerData) {
    return (playerData.xp / playerData.xpToNextLevel) * 100;
}

export function createXpController(game) {
    function updatePlayerDisplay() {
        game.playerLevel.textContent = game.playerData.level;
        game.xpFill.style.width = `${getXpPercent(game.playerData)}%`;
        game.xpText.textContent = `${Math.floor(game.playerData.xp)}/${game.playerData.xpToNextLevel}`;
        game.upgradePoints.textContent = `⭐ ${game.playerData.upgradePoints}`;
    }

    function gainXP(amount) {
        const earned = amount * game.xpMultiplier;
        game.playerData.xp += earned;
        game.playerData.totalXpEarned += earned;

        while (game.playerData.xp >= game.playerData.xpToNextLevel) {
            game.playerData.xp -= game.playerData.xpToNextLevel;
            game.playerData.level++;
            game.playerData.upgradePoints += 9999;
            game.playerData.xpToNextLevel = Math.floor(game.playerData.xpToNextLevel * 1.5);

            game.playerLevel.classList.add('level-up-animation');
            setTimeout(() => {
                game.playerLevel.classList.remove('level-up-animation');
            }, 500);
        }

        updatePlayerDisplay();
        game.saveGame();
    }

    return { gainXP, updatePlayerDisplay };
}
