export function updateDartCounter(element, count) {
    if (element) element.textContent = `Dardos Fixos: ${count}`;
}

export function formatMissionTime(seconds) {
    const total = Math.floor(seconds);
    const min = String(Math.floor(total / 60)).padStart(2, '0');
    const sec = String(total % 60).padStart(2, '0');
    return `${min}:${sec}`;
}

export function createHudController(game) {
    let missionPanelCollapsed = true;

    function setMissionPanelCollapsed(collapsed) {
        missionPanelCollapsed = collapsed;
        if (!game.missionHud) return;
        game.missionHud.classList.toggle('collapsed', missionPanelCollapsed);
        const tab = game.missionHud.querySelector('.mission-bookmark-tab');
        if (tab) tab.setAttribute('aria-expanded', String(!missionPanelCollapsed));
    }

    function createTargetHud() {
        if (!game.config.targetConfig.enabled) return;
        if (!game.targetHud) {
            const hud = document.createElement('div');
            hud.id = 'targetHud';
            hud.style.position = 'fixed';
            hud.style.left = '20px';
            hud.style.bottom = '20px';
            hud.style.zIndex = '20';
            hud.style.padding = '10px 12px';
            hud.style.background = 'rgba(8, 12, 18, 0.72)';
            hud.style.border = '1px solid rgba(120, 210, 255, 0.5)';
            hud.style.borderRadius = '8px';
            hud.style.color = '#eaf7ff';
            hud.style.font = '13px Arial, sans-serif';
            hud.style.lineHeight = '1.5';
            hud.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
            document.body.appendChild(hud);
            game.targetHud = hud;
        }
        createMissionHud();
        updateTargetHud();
    }

    function updateTargetHud() {
        if (!game.targetHud || !game.config.targetConfig.enabled) return;
        if (game.missionHud) {
            game.targetHud.style.display = 'none';
            updateMissionHud();
            return;
        }
        game.targetHud.style.display = 'block';
        const corePercent = Math.ceil((game.coveredTarget.hp / game.coveredTarget.maxHp) * 100);
        const exposedLabel = game.coveredTarget.destroyed ? ' destruído' : (game.coveredTarget.exposed ? ' exposto' : '');
        game.targetHud.innerHTML = `Cobertura: ${game.coveredTarget.coveragePercent}%<br>Núcleo: ${corePercent}%${exposedLabel}`;
        updateMissionHud();
    }

    function createMissionHud() {
        if (game.missionHud) return;
        missionPanelCollapsed = game.missionState.activeMissionId === 'freeSandbox';
        const hud = document.createElement('div');
        hud.id = 'missionHud';
        hud.className = `mission-panel mission-bookmark-panel${missionPanelCollapsed ? ' collapsed' : ''}`;
        hud.style.position = 'fixed';
        hud.style.left = '18px';
        hud.style.bottom = '108px';
        hud.style.zIndex = '90';
        hud.style.pointerEvents = 'auto';
        hud.style.width = '250px';
        hud.style.maxWidth = '250px';
        hud.style.padding = '10px 12px';
        hud.style.background = 'rgba(8, 12, 18, 0.76)';
        hud.style.border = '1px solid rgba(125, 255, 178, 0.42)';
        hud.style.borderRadius = '8px';
        hud.style.color = '#eaf7ff';
        hud.style.font = '12px Arial, sans-serif';
        hud.style.lineHeight = '1.45';
        hud.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
        document.body.appendChild(hud);
        game.missionHud = hud;

        const options = Object.keys(game.missionData).map(id => `<option value="${id}">${game.missionData[id].name}</option>`).join('');
        hud.innerHTML = `
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                <span style="font-weight:700;">Missão</span>
                <select id="missionSelect" style="flex:1; min-width:0; width:100%; background:#111827; color:#eaf7ff; border:1px solid rgba(255,255,255,.22); border-radius:6px; padding:3px; pointer-events:auto;">
                    ${options}
                </select>
            </div>
            <div id="missionObjective"></div>
            <div id="missionCoverage"></div>
            <div id="missionTime"></div>
            <div id="missionStatus"></div>
            <div id="missionScore"></div>
        `;

        const content = document.createElement('div');
        content.className = 'mission-bookmark-content';
        while (hud.firstChild) content.appendChild(hud.firstChild);

        const tab = document.createElement('button');
        tab.className = 'mission-bookmark-tab';
        tab.type = 'button';
        tab.innerHTML= '&#127919; Miss&otilde;es' + (missionPanelCollapsed ? ' &#x25B6;' : ' &#x25C0;');
        tab.setAttribute('aria-expanded', String(!missionPanelCollapsed));
        tab.addEventListener('mousedown', event => event.stopPropagation());
        tab.addEventListener('click', event => {
            event.stopPropagation();
            setMissionPanelCollapsed(!missionPanelCollapsed);
        });

        hud.append(tab, content);

        const select = document.getElementById('missionSelect');
        if (select) {
            select.value = game.missionState.activeMissionId;
            select.addEventListener('mousedown', event => event.stopPropagation());
            select.addEventListener('click', event => event.stopPropagation());
            select.addEventListener('change', event => {
                game.startMission(event.target.value);
                if (event.target.value !== 'freeSandbox') setMissionPanelCollapsed(false);
                updateMissionHud();
            });
        }
        updateMissionHud();
    }

    function updateMissionHud() {
        if (!game.missionHud) return;
        const mission = game.missionData[game.missionState.activeMissionId] || game.missionData.freeSandbox;
        const corePercent = Math.ceil((game.coveredTarget.hp / game.coveredTarget.maxHp) * 100);
        const select = document.getElementById('missionSelect');
        if (select && select.value !== game.missionState.activeMissionId) select.value = game.missionState.activeMissionId;

        const objective = document.getElementById('missionObjective');
        const coverage = document.getElementById('missionCoverage');
        const time = document.getElementById('missionTime');
        const status = document.getElementById('missionStatus');
        const score = document.getElementById('missionScore');

        if (objective) objective.textContent = `Objetivo: ${mission.objective}`;
        if (coverage) coverage.textContent = `Cobertura: ${game.coveredTarget.coveragePercent}% | Núcleo: ${corePercent}%`;
        if (time) time.textContent = `Tempo: ${formatMissionTime(game.missionState.timeElapsed)}`;
        if (status) status.textContent = `Status: ${game.getMissionStatus()}`;
        if (score) score.textContent = `Score: ${game.missionState.score}`;
    }

    return { createTargetHud, updateTargetHud, createMissionHud, updateMissionHud };
}
