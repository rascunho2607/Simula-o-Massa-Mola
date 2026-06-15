export function openSpecialModal(modal) {
    if (modal) modal.style.display = 'flex';
}

export function createSpecialModalController(game) {
    function createSpecialModal() {
        const specialTabs = document.getElementById('specialTabs');
        const specialContent = document.getElementById('specialContent');
        specialTabs.innerHTML = '';
        specialContent.innerHTML = '';

        Object.keys(game.tools).forEach(toolId => {
            const tool = game.tools[toolId];
            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.textContent = `${tool.icon} ${tool.name}`;
            tab.dataset.tool = toolId;
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                showToolAbilities(toolId);
            });
            specialTabs.appendChild(tab);
        });

        const firstTab = specialTabs.querySelector('.tab');
        if (firstTab) {
            firstTab.classList.add('active');
            showToolAbilities(firstTab.dataset.tool);
        }
    }

    function showToolAbilities(toolId) {
        const specialContent = document.getElementById('specialContent');
        const abilities = game.specialAbilities[toolId];
        let html = `<div class="upgrade-section"><h3>${game.tools[toolId].name} - Habilidades Especiais</h3><div class="upgrade-grid">`;

        Object.keys(abilities).forEach(abilityId => {
            const ability = abilities[abilityId];
            const currentLevel = ability.level || 0;
            const canUpgrade = currentLevel < ability.maxLevel && game.playerData.upgradePoints >= ability.cost[currentLevel];
            html += `
                <div class="upgrade-card ${canUpgrade ? 'upgradable' : ''} ${currentLevel >= ability.maxLevel ? 'locked' : ''}"
                     onclick="${canUpgrade ? `upgradeAbility('${toolId}', '${abilityId}')` : ''}">
                    <div class="upgrade-header">
                        <div class="upgrade-name">${ability.name}</div>
                        <div class="upgrade-level">Nv. ${currentLevel}/${ability.maxLevel}</div>
                    </div>
                    <div class="upgrade-stats">
                        ${ability.desc}<br>
                        <small>Tipo: ${ability.type === 'passive' ? 'Passiva' : ability.type === 'modal' ? 'Modal' : 'Ativa'}</small>
                        ${ability.hotkey ? `<br><small>Tecla: ${ability.hotkey}</small>` : ''}
                    </div>
                    <div class="upgrade-cost">
                        <span>Custo:</span>
                        <span class="cost-value">${currentLevel < ability.maxLevel ? ability.cost[currentLevel] : 'MAX'}⭐</span>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        specialContent.innerHTML = html;
    }

    return { createSpecialModal, showToolAbilities };
}
