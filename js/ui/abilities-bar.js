export const abilityHotkeys = ['Q', 'E', 'R', 'T', 'Y'];

export function createAbilitiesBarController(game) {
    function getAbilityIcon(toolId, abilityId) {
        const icons = {
            cannon: { explosion: '💥', guided: '🎯', default: '🎯' },
            dart: { delayed: '⏱️', chain: '⚡', magnet: '🧲', portal: '🌀', default: '📍' },
            blower: { vortex: '🌪️', freeze: '❄️', suction: '👇', tornado: '🌪️', default: '💨' },
            flame: { sparks: '✨', ring: '🔥', phoenix: '🔥', default: '🔥' },
            mouse: { web: '🕸️', shield: '🛡️', magnet: '🧲', duplicate: '👥', default: '🖱️' },
        };
        return icons[toolId]?.[abilityId] || icons[toolId]?.default || '✨';
    }

    function updateAbilitiesBar() {
        game.abilitiesBar.innerHTML = '';
        const abilities = game.activeAbilities[game.activeTool];
        if (!abilities || abilities.length === 0) return;

        abilities.forEach((abilityId, index) => {
            const ability = game.specialAbilities[game.activeTool][abilityId];
            if (!ability) return;

            const btn = document.createElement('div');
            btn.className = 'ability-btn';
            btn.dataset.ability = abilityId;
            btn.innerHTML = `
                ${getAbilityIcon(game.activeTool, abilityId)}
                <div class="hotkey">${abilityHotkeys[index] || ''}</div>
                <div class="tooltip">
                    <div class="ability-name">${ability.name}</div>
                    <div class="ability-desc">${ability.desc}</div>
                    <div class="ability-desc">Nível: ${ability.level}/${ability.maxLevel}</div>
                </div>
            `;

            if (ability.type === 'modal' && game.modalAbilities[abilityId]) btn.classList.add('active');
            if (ability.cooldown && game.abilityCooldowns[abilityId]) {
                btn.classList.add('disabled');
                const cooldownDiv = document.createElement('div');
                cooldownDiv.className = 'cooldown';
                cooldownDiv.textContent = Math.ceil(game.abilityCooldowns[abilityId] / 1000);
                btn.appendChild(cooldownDiv);
            }

            btn.addEventListener('click', () => game.activateAbility(abilityId));
            game.abilitiesBar.appendChild(btn);
        });
    }

    return { getAbilityIcon, updateAbilitiesBar };
}
