export function openUpgradeModal(modal) {
    if (modal) modal.style.display = 'flex';
}

export function createUpgradeModalController(game) {
    function createUpgradeModal() {
        const upgradeTabs = document.getElementById('upgradeTabs');
        const upgradeContent = document.getElementById('upgradeContent');
        upgradeTabs.innerHTML = '';
        upgradeContent.innerHTML = '';

        Object.keys(game.tools).forEach(toolId => {
            const tool = game.tools[toolId];
            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.textContent = `${tool.icon} ${tool.name}`;
            tab.dataset.tool = toolId;
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                showToolUpgrades(toolId);
            });
            upgradeTabs.appendChild(tab);
        });

        const firstTab = upgradeTabs.querySelector('.tab');
        if (firstTab) {
            firstTab.classList.add('active');
            showToolUpgrades(firstTab.dataset.tool);
        }
    }

    function showToolUpgrades(toolId) {
        const upgradeContent = document.getElementById('upgradeContent');
        const toolData = game.playerData.tools[toolId];
        if (game.tools[toolId]?.upgradesDisabled) {
            upgradeContent.innerHTML = `
                <div class="upgrade-section">
                    <h3>${game.tools[toolId].name}</h3>
                    <div class="upgrade-card locked">
                        <div class="upgrade-name">Sem upgrades nesta versão</div>
                        <div class="upgrade-stats">Ferramenta especial desbloqueada por padrão.</div>
                    </div>
                </div>
            `;
            return;
        }

        const card = (attribute, label, desc) => `
            <div class="upgrade-card ${game.canUpgrade(toolId, attribute) ? 'upgradable' : ''}"
                 onclick="${game.canUpgrade(toolId, attribute) ? `upgradeTool('${toolId}', '${attribute}')` : ''}">
                <div class="upgrade-header">
                    <div class="upgrade-name">${label}</div>
                    <div class="upgrade-level">Nv. ${toolData[attribute]}</div>
                </div>
                <div class="upgrade-stats">${desc}</div>
                <div class="upgrade-cost">
                    <span>Custo:</span>
                    <span class="cost-value">${game.getUpgradeCost(toolData[attribute])}⭐</span>
                </div>
            </div>
        `;

        upgradeContent.innerHTML = `
            <div class="upgrade-section">
                <h3>${game.tools[toolId].name} - Nível ${toolData.level}</h3>
                <div class="upgrade-grid">
                    ${card('force', 'Força', 'Aumenta a intensidade do efeito')}
                    ${card('range', 'Alcance', 'Aumenta a área de influência')}
                    ${card('efficiency', 'Eficiência', 'Reduz custo em recursos/cooldown')}
                </div>
            </div>
        `;
        game.calculateBaseAttributes();
    }

    return { createUpgradeModal, showToolUpgrades };
}
