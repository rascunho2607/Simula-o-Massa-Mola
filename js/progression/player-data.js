export function createDefaultPlayerData() {
    return {
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            upgradePoints: 0,
            totalXpEarned: 0,
            tools: {
                mouse: { level: 1, force: 1, range: 1, efficiency: 1 },
                blower: { level: 1, force: 1, range: 1, efficiency: 1 },
                cannon: { level: 1, force: 1, range: 1, efficiency: 1 },
                dart: { level: 1, force: 1, range: 1, efficiency: 1 },
                flame: { level: 1, force: 1, range: 1, efficiency: 1 },
                blade: { level: 1, force: 1, range: 1, efficiency: 1 },
                hook: { level: 1, force: 1, range: 1, efficiency: 1 },
                drill: { level: 1, force: 1, range: 1, efficiency: 1 },
                laser: { level: 1, force: 1, range: 1, efficiency: 1 },
                scissor: { level: 1, force: 1, range: 1, efficiency: 1 },
                hammer: { level: 1, force: 1, range: 1, efficiency: 1 },
                acid: { level: 1, force: 1, range: 1, efficiency: 1 },
                glue: { level: 1, force: 1, range: 1, efficiency: 1 },
                electric: { level: 1, force: 1, range: 1, efficiency: 1 }
            },
            abilities: {}
        };
}

export const playerData = createDefaultPlayerData();
