import { getVisualMaterialOptions } from '../render/cloth-visual-system.js';

const structuralKeys = new Set(['numeroDeLinhas', 'spacing']);
const panelState = {
    game: null,
    root: null,
    pending: false,
    collapsed: true,
};

const clothControls = [
    { key: 'numeroDeLinhas', label: 'Numero de Linhas' },
    { key: 'spacing', label: 'Espacamento' },
    { key: 'stiffness', label: 'Rigidez da Mola' },
    { key: 'friction', label: 'Atrito/Resistencia' },
    { key: 'tearDistance', label: 'Distancia para Rasgar' },
    { key: 'lineWidth', label: 'Espessura da Linha' },
];

const materialLabels = {
    mixed: 'Misto',
    cotton: 'Algodao',
    paper: 'Papel',
    leather: 'Couro',
    rubber: 'Borracha',
    metal: 'Metal',
    reinforced: 'Reforcado',
};

const modeLabels = {
    test: 'Modo Teste',
    fabric: 'Tecido Real',
};

const categoryOptions = [
    ['random', 'Aleatorio'],
    ['mixed', 'Misto'],
    ['dinosaurs', 'Dinossauros'],
    ['animals', 'Animais'],
    ['nature', 'Natureza'],
    ['landscapes', 'Paisagens'],
    ['symbols', 'Simbolos'],
    ['portrait', 'Retrato'],
];

const categoryLabels = Object.fromEntries(categoryOptions);

function getGame() {
    return panelState.game;
}

function getGridSize() {
    const game = getGame();
    return {
        rows: game?.rows || game?.config?.numeroDeLinhas || 30,
        cols: game?.cols || 30,
    };
}

function formatValue(key, value) {
    if (key === 'friction') return Number(value).toFixed(3);
    if (key === 'stiffness' || key === 'lineWidth') return Number(value).toFixed(2);
    return Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
}

function ensureVisualConfig() {
    const game = getGame();
    if (!game.config.clothVisual) {
        game.config.clothVisual = { mode: 'fabric', material: 'mixed', category: 'mixed' };
    }
    return game.config.clothVisual;
}

function drawPreview(canvas, visualState) {
    const game = getGame();
    if (!canvas || !game) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (game.config.clothVisual?.mode === 'test') {
        ctx.strokeStyle = 'rgba(85, 170, 255, 0.82)';
        ctx.lineWidth = 1;
        for (let x = 8; x < canvas.width; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, 8);
            ctx.lineTo(x, canvas.height - 8);
            ctx.stroke();
        }
        for (let y = 8; y < canvas.height; y += 12) {
            ctx.beginPath();
            ctx.moveTo(8, y);
            ctx.lineTo(canvas.width - 8, y);
            ctx.stroke();
        }
        return;
    }

    if (visualState?.texture) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(visualState.texture, 8, 8, canvas.width - 16, canvas.height - 16);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    for (let x = 8; x <= canvas.width - 8; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 8);
        ctx.lineTo(x, canvas.height - 8);
        ctx.stroke();
    }
    for (let y = 8; y <= canvas.height - 8; y += 16) {
        ctx.beginPath();
        ctx.moveTo(8, y);
        ctx.lineTo(canvas.width - 8, y);
        ctx.stroke();
    }
}

function setPending(nextPending) {
    panelState.pending = nextPending;
    panelState.root?.classList.toggle('has-pending', panelState.pending);
}

function setCollapsed(nextCollapsed) {
    panelState.collapsed = nextCollapsed;
    panelState.root?.classList.toggle('collapsed', panelState.collapsed);
    const bookmark = panelState.root?.querySelector('.cloth-panel-bookmark');
    if (bookmark) bookmark.innerHTML = `&#129526; Tecido ${panelState.collapsed ? '&#9650;' : '&#9660;'}`;
}

function createRangeControl({ key, label }) {
    const game = getGame();
    const limits = game.configLimits[key] || { min: 0, max: 100, step: 1 };
    const value = game.config[key];
    const group = document.createElement('label');
    group.className = 'cloth-control';
    group.innerHTML = `
        <span class="cloth-control-row">
            <span class="cloth-control-name">${label}</span>
            <span class="cloth-control-value" data-cloth-value="${key}">${formatValue(key, value)}</span>
        </span>
        <input type="range" min="${limits.min}" max="${limits.max}" step="${limits.step}" value="${value}" data-cloth-input="${key}">
    `;

    const input = group.querySelector('input');
    input.addEventListener('input', () => {
        game.config[key] = input.valueAsNumber || Number.parseFloat(input.value);
        const valueLabel = panelState.root.querySelector(`[data-cloth-value="${key}"]`);
        if (valueLabel) valueLabel.textContent = formatValue(key, game.config[key]);
        if (structuralKeys.has(key)) setPending(true);
    });

    return group;
}

function createColorControl() {
    const game = getGame();
    const group = document.createElement('div');
    group.className = 'cloth-control cloth-color-control';
    group.innerHTML = `
        <span class="cloth-control-row">
            <span class="cloth-control-name">Cor da Malha</span>
            <span class="cloth-control-value" data-cloth-value="lineColor">${game.config.lineColor}</span>
        </span>
        <div class="cloth-color-row">
            <input type="color" value="${game.config.lineColor}" data-cloth-color-picker>
            <input type="text" value="${game.config.lineColor}" data-cloth-color-text maxlength="7" spellcheck="false">
        </div>
    `;

    const colorPicker = group.querySelector('[data-cloth-color-picker]');
    const colorText = group.querySelector('[data-cloth-color-text]');
    const valueLabel = group.querySelector('[data-cloth-value="lineColor"]');
    const applyColor = (nextColor) => {
        if (!/^#[0-9a-f]{6}$/i.test(nextColor)) return;
        game.config.lineColor = nextColor;
        colorPicker.value = nextColor;
        colorText.value = nextColor;
        valueLabel.textContent = nextColor;
    };

    colorPicker.addEventListener('input', () => applyColor(colorPicker.value));
    colorText.addEventListener('input', () => applyColor(colorText.value));
    return group;
}

function createSelectControl(label, id, options, selectedValue, onChange) {
    const group = document.createElement('label');
    group.className = 'cloth-select-control';
    group.innerHTML = `
        <span>${label}</span>
        <select id="${id}">
            ${options.map(([value, text]) => `<option value="${value}" ${value === selectedValue ? 'selected' : ''}>${text}</option>`).join('')}
        </select>
    `;
    group.querySelector('select').addEventListener('change', event => onChange(event.target.value));
    return group;
}

function regenerateVisual(action, value) {
    const game = getGame();
    const { rows, cols } = getGridSize();
    if (action === 'mode') game.clothVisualSystem.setMode(game.config, rows, cols, value);
    if (action === 'material') game.clothVisualSystem.setMaterial(game.config, rows, cols, value);
    if (action === 'category') game.clothVisualSystem.setCategory(game.config, rows, cols, value);
    if (action === 'pattern') game.clothVisualSystem.generatePattern(game.config, rows, cols);
    if (action === 'motif') game.clothVisualSystem.generateMotif(game.config, rows, cols);
    updateClothSidePanel();
}

function createPanel() {
    const game = getGame();
    const visual = ensureVisualConfig();
    const root = document.createElement('aside');
    root.className = 'cloth-side-panel collapsed';
    root.setAttribute('aria-label', 'Painel do tecido');
    root.innerHTML = `
        <button class="cloth-panel-bookmark" type="button">&#129526; Tecido &#9650;</button>
        <div class="cloth-side-panel-content">
            <div class="cloth-side-panel-body">
                <section class="cloth-panel-section" data-section="simulation">
                    <h3>Simulacao</h3>
                </section>
                <section class="cloth-panel-section" data-section="visual">
                    <h3>Visual do Tecido</h3>
                    <div class="cloth-visual-summary" id="clothSideVisualSummary"></div>
                    <canvas class="cloth-visual-preview" id="clothSideVisualPreview" width="128" height="96"></canvas>
                </section>
            </div>
        </div>
    `;

    root.querySelector('.cloth-panel-bookmark').addEventListener('click', toggleClothSidePanel);

    const simulationSection = root.querySelector('[data-section="simulation"]');
    clothControls.forEach(control => simulationSection.appendChild(createRangeControl(control)));
    simulationSection.appendChild(createColorControl());

    const visualSection = root.querySelector('[data-section="visual"]');
    visualSection.appendChild(createSelectControl(
        'Material visual',
        'clothSideVisualMaterial',
        getVisualMaterialOptions().map(material => [material, materialLabels[material] || material]),
        visual.material,
        value => regenerateVisual('material', value)
    ));
    visualSection.appendChild(createSelectControl(
        'Modo visual',
        'clothSideVisualMode',
        [['test', modeLabels.test], ['fabric', modeLabels.fabric]],
        visual.mode,
        value => regenerateVisual('mode', value)
    ));
    visualSection.appendChild(createSelectControl(
        'Categoria da estampa',
        'clothSideVisualCategory',
        categoryOptions,
        visual.category,
        value => regenerateVisual('category', value)
    ));

    const actionRow = document.createElement('div');
    actionRow.className = 'cloth-visual-actions';
    actionRow.innerHTML = `
        <button type="button" data-cloth-action="pattern">Gerar Novo Padrao</button>
        <button type="button" data-cloth-action="motif">Gerar Nova Estampa</button>
    `;
    actionRow.querySelector('[data-cloth-action="pattern"]').addEventListener('click', () => regenerateVisual('pattern'));
    actionRow.querySelector('[data-cloth-action="motif"]').addEventListener('click', () => regenerateVisual('motif'));
    visualSection.appendChild(actionRow);

    if (typeof game.resetClothAndMarks === 'function') {
        const resetMarks = document.createElement('button');
        resetMarks.className = 'cloth-reset-marks';
        resetMarks.type = 'button';
        resetMarks.innerHTML = '&#129529; Resetar Tecido + Marcas';
        resetMarks.addEventListener('click', () => {
            game.resetClothAndMarks();
            setPending(false);
            updateClothSidePanel();
        });
        visualSection.appendChild(resetMarks);
    }

    return root;
}

export function initClothSidePanel(game) {
    panelState.game = game;
    panelState.root?.remove();
    panelState.root = createPanel();
    document.body.appendChild(panelState.root);
    setCollapsed(true);
    setPending(false);
    updateClothSidePanel();
    return panelState.root;
}

export function updateClothSidePanel() {
    const game = getGame();
    const root = panelState.root;
    if (!game || !root) return;

    clothControls.forEach(({ key }) => {
        const input = root.querySelector(`[data-cloth-input="${key}"]`);
        const value = root.querySelector(`[data-cloth-value="${key}"]`);
        if (input && document.activeElement !== input) input.value = game.config[key];
        if (value) value.textContent = formatValue(key, game.config[key]);
    });

    const colorPicker = root.querySelector('[data-cloth-color-picker]');
    const colorText = root.querySelector('[data-cloth-color-text]');
    const colorValue = root.querySelector('[data-cloth-value="lineColor"]');
    if (colorPicker) colorPicker.value = game.config.lineColor;
    if (colorText && document.activeElement !== colorText) colorText.value = game.config.lineColor;
    if (colorValue) colorValue.textContent = game.config.lineColor;

    const { rows, cols } = getGridSize();
    ensureVisualConfig();
    const visualState = game.clothVisualSystem.ensure(game.config, rows, cols);
    const visual = game.config.clothVisual;
    const materialSelect = root.querySelector('#clothSideVisualMaterial');
    const modeSelect = root.querySelector('#clothSideVisualMode');
    const categorySelect = root.querySelector('#clothSideVisualCategory');
    if (materialSelect) materialSelect.value = visual.material;
    if (modeSelect) modeSelect.value = visual.mode;
    if (categorySelect) categorySelect.value = visual.category;

    const summary = root.querySelector('#clothSideVisualSummary');
    if (summary) {
        const material = materialLabels[visualState.material] || visualState.material;
        const category = categoryLabels[visualState.category] || visualState.category;
        const mode = visual.mode === 'test' ? 'Modo Teste' : category;
        const motif = visual.mode === 'test' ? 'grade tecnica' : visualState.motifName;
        summary.textContent = `${material} \u2022 ${mode} \u2022 ${motif}`;
    }
    drawPreview(root.querySelector('#clothSideVisualPreview'), visualState);
    root.classList.toggle('has-pending', panelState.pending);
}

export function openClothSidePanel() {
    setCollapsed(false);
}

export function closeClothSidePanel() {
    setCollapsed(true);
}

export function toggleClothSidePanel() {
    setCollapsed(!panelState.collapsed);
}
