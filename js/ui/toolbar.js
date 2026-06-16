export function getToolKeys(tools) {
    return Object.keys(tools);
}

export function createToolbarController(game) {
    function createToolbar() {
        const { toolbar, tools } = game;
        toolbar.innerHTML = '';

        const toolKeys = Object.keys(tools);
        const count = toolKeys.length;
        const cardWidth = 76;
        const cardHeight = 104;
        const toolbarWidth = Math.min(window.innerWidth * 0.98, Math.max(620, count * 88));
        const toolbarHeight = count > 7 ? 230 : 220;
        toolbar.style.width = `${toolbarWidth}px`;
        toolbar.style.height = `${toolbarHeight}px`;

        const pivotBelow = 360;
        const spreadDeg = count > 7 ? 78 : 46;
        const hoverRise = 46;
        const neighbourPush = 42;
        const selectedRise = 16;
        const centerX = toolbarWidth / 2;
        const pivotY = toolbarHeight + pivotBelow - 72;
        const arm = cardHeight + pivotBelow;
        let hoveredIndex = null;

        function getBase(index) {
            const t = count > 1 ? index / (count - 1) : 0.5;
            const rotDeg = (t - 0.5) * spreadDeg;
            const rotRad = (rotDeg * Math.PI) / 180;
            const topCenterX = centerX + Math.sin(rotRad) * arm;
            const topY = pivotY - Math.cos(rotRad) * arm;
            return {
                x: topCenterX - cardWidth / 2,
                y: topY,
                rot: rotDeg,
                z: index + 1,
            };
        }

        function applyAll() {
            toolbar.querySelectorAll('.tool-card').forEach((card, index) => {
                const base = getBase(index);
                const isActive = toolKeys[index] === game.activeTool;
                let dx = 0;
                let dy = 0;
                let scale = 1;
                let z = base.z;

                if (hoveredIndex !== null) {
                    if (index === hoveredIndex) {
                        dy = -(hoverRise + (isActive ? selectedRise : 0));
                        scale = 1.12;
                        z = 100;
                    } else {
                        const distance = index - hoveredIndex;
                        dx = Math.sign(distance) * neighbourPush / Math.max(1, Math.abs(distance));
                    }
                } else if (isActive) {
                    dy = -selectedRise;
                    scale = 1.05;
                    z = 60;
                }

                card.style.transform = [
                    `translateX(${base.x + dx}px)`,
                    `translateY(${base.y + dy}px)`,
                    `rotate(${base.rot}deg)`,
                    `scale(${scale})`,
                ].join(' ');
                card.style.zIndex = String(z);
            });
        }

        toolKeys.forEach((toolId, index) => {
            const tool = tools[toolId];
            const card = document.createElement('div');
            const classes = ['tool-card'];
            if (game.activeTool === toolId) classes.push('active');
            if (toolId === 'flame' && game.flameActive) classes.push('flame-active');
            if (tool.locked || tool.disabled) classes.push('disabled');

            card.className = classes.join(' ');
            card.dataset.tool = toolId;
            card.innerHTML = `
                <div class="tool-icon">${tool.icon}</div>
                <div class="tool-name">${tool.name}</div>
                <div class="tool-hotkey">(${tool.hotkey})</div>
            `;

            card.addEventListener('mouseenter', () => {
                hoveredIndex = index;
                applyAll();
            });
            card.addEventListener('mouseleave', () => {
                hoveredIndex = null;
                applyAll();
            });
            card.addEventListener('mousedown', event => {
                event.preventDefault();
                event.stopPropagation();
            });
            card.addEventListener('mouseup', event => {
                event.preventDefault();
                event.stopPropagation();
                if (!tool.locked && !tool.disabled) setActiveTool(toolId);
            });
            card.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
            });

            toolbar.appendChild(card);
        });

        applyAll();
    }

    function setActiveTool(toolId) {
        if (game.activeTool === 'blower' && game.blowForce > 0) game.blowForce = 0;
        if (game.activeTool === 'flame' && game.flameActive) {
            game.flameActive = false;
            game.toolIndicator.className = 'tool-indicator';
        }

        game.activeTool = toolId;
        const tool = game.tools[toolId];
        if (toolId === 'glue') {
            const modeName = game.glueState.mode === 'glueBridge'
                ? 'ponte'
                : (game.glueState.mode === 'clamp' ? 'grampo' : 'ponto temporário');
            game.toolIndicator.textContent = `Ferramenta: ${tool.name} - ${modeName}`;
        } else {
            game.toolIndicator.textContent = `Ferramenta: ${tool.name}`;
        }

        createToolbar();
        game.updateAbilitiesBar();
    }

    return { createToolbar, setActiveTool };
}
