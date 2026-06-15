export const SAVE_KEY = 'clothSimSave';

export function saveGameData(data) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGameData() {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
}

export function createSaveController(game) {
    function saveGame() {
        saveGameData({
            playerData: game.playerData,
            abilities: game.specialAbilities,
            version: '1.0',
        });
    }

    function loadGame() {
        const parsed = loadGameData();
        if (!parsed || parsed.version !== '1.0') return;

        try {
            game.playerData = parsed.playerData;
            Object.keys(game.tools).forEach(toolId => {
                if (!game.playerData.tools[toolId]) {
                    game.playerData.tools[toolId] = { level: 1, force: 1, range: 1, efficiency: 1 };
                }
                if (!game.activeAbilities[toolId]) game.activeAbilities[toolId] = [];
                if (!game.specialAbilities[toolId]) game.specialAbilities[toolId] = {};
            });

            Object.keys(parsed.abilities || {}).forEach(toolId => {
                Object.keys(parsed.abilities[toolId] || {}).forEach(abilityId => {
                    if (game.specialAbilities[toolId]?.[abilityId]) {
                        game.specialAbilities[toolId][abilityId].level = parsed.abilities[toolId][abilityId].level || 0;
                    }
                });
            });

            Object.keys(game.specialAbilities).forEach(toolId => {
                Object.keys(game.specialAbilities[toolId]).forEach(abilityId => {
                    const ability = game.specialAbilities[toolId][abilityId];
                    if (ability.level > 0 && (ability.type === 'active' || ability.type === 'modal')) {
                        if (!game.activeAbilities[toolId].includes(abilityId)) {
                            game.activeAbilities[toolId].push(abilityId);
                        }
                    }
                });
            });

            game.updatePlayerDisplay();
            game.calculateBaseAttributes();
        } catch (error) {
            console.error('Erro ao carregar jogo:', error);
        }
    }

    return { saveGame, loadGame };
}
