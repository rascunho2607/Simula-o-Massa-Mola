export function openConfigModal(modal) {
    if (modal) modal.style.display = 'flex';
}

export function createConfigModalController(game) {
    const configLabels = {
        gravity: 'Gravidade',
        flameIntensity: 'Intensidade do Fogo',
    };

    const clothConfigKeys = new Set([
        'numeroDeLinhas',
        'spacing',
        'stiffness',
        'friction',
        'tearDistance',
        'lineWidth',
    ]);

    function formatConfigValue(key, value) {
        if (key === 'friction') return value.toFixed(3);
        return Number.isInteger(value) ? String(value) : value.toFixed(2);
    }

    function createConfigControls() {
        game.configControls.innerHTML = '';

        Object.keys(game.config).forEach(key => {
            if (key === 'lineColor' || clothConfigKeys.has(key) || typeof game.config[key] !== 'number') return;

            const limits = game.configLimits[key] || { min: 0, max: 100, step: 1 };
            const formatted = formatConfigValue(key, game.config[key]);
            const div = document.createElement('div');
            div.className = 'config-group';
            div.innerHTML = `
                <div class="config-label">
                    <span class="config-name">${configLabels[key] || key}</span>
                    <span class="config-value" id="value-${key}">${formatted}</span>
                </div>
                <div class="slider-container">
                    <input type="range" min="${limits.min}" max="${limits.max}" step="${limits.step}"
                        value="${game.config[key]}" class="slider" id="slider-${key}" />
                    <span class="slider-value" id="display-${key}">${formatted}</span>
                </div>
            `;
            game.configControls.appendChild(div);

            const slider = document.getElementById(`slider-${key}`);
            const display = document.getElementById(`display-${key}`);
            const valueSpan = document.getElementById(`value-${key}`);
            slider.addEventListener('input', function onInput() {
                game.config[key] = this.valueAsNumber || Number.parseFloat(this.value);
                const nextFormatted = formatConfigValue(key, game.config[key]);
                display.textContent = nextFormatted;
                valueSpan.textContent = nextFormatted;
            });
        });
    }

    return { createConfigControls };
}
