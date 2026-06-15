export function registerInputHandlers() {
    // Runtime input handlers ainda vivem em main.js para preservar comportamento nesta etapa.
}

export function registerRuntimeInputHandlers(game) {
game.configBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    game.isConfigModalOpen = true;
    game.configModal.style.display = 'flex';
    
    if (game.activeTool === 'blower' && game.blowForce > 0) game.blowForce = 0;
    if (game.activeTool === 'flame' && game.flameActive) {
        game.flameActive = false;
        game.toolIndicator.className = 'tool-indicator';
        game.createToolbar();
    }
});

game.upgradeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    game.isUpgradeModalOpen = true;
    game.upgradeModal.style.display = 'flex';
    game.createUpgradeModal();
    
    if (game.activeTool === 'blower' && game.blowForce > 0) game.blowForce = 0;
    if (game.activeTool === 'flame' && game.flameActive) {
        game.flameActive = false;
        game.toolIndicator.className = 'tool-indicator';
        game.createToolbar();
    }
});

game.specialBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    game.isSpecialModalOpen = true;
    game.specialModal.style.display = 'flex';
    game.createSpecialModal();
    
    if (game.activeTool === 'blower' && game.blowForce > 0) game.blowForce = 0;
    if (game.activeTool === 'flame' && game.flameActive) {
        game.flameActive = false;
        game.toolIndicator.className = 'tool-indicator';
        game.createToolbar();
    }
});

game.closeConfigModal.addEventListener('click', function(e) {
    e.stopPropagation();
    game.isConfigModalOpen = false;
    game.configModal.style.display = 'none';
});

game.closeUpgradeModal.addEventListener('click', function(e) {
    e.stopPropagation();
    game.isUpgradeModalOpen = false;
    game.upgradeModal.style.display = 'none';
});

game.closeSpecialModal.addEventListener('click', function(e) {
    e.stopPropagation();
    game.isSpecialModalOpen = false;
    game.specialModal.style.display = 'none';
});

// Fechar modais ao clicar fora
[game.configModal, game.upgradeModal, game.specialModal].forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            e.stopPropagation();
            if (modal === game.configModal) game.isConfigModalOpen = false;
            if (modal === game.upgradeModal) game.isUpgradeModalOpen = false;
            if (modal === game.specialModal) game.isSpecialModalOpen = false;
            modal.style.display = 'none';
        }
    });
});

// Reset de configurações
game.resetBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    game.resetConfig();
    game.createConfigControls();
    game.init();
});

// Event Listeners para game.mouse
window.addEventListener('mousedown', e => { 
    game.lastMouseDownTime = Date.now();
    
    // Verificar se está clicando em elementos da UI
    const uiElements = ['BUTTON', 'INPUT', 'DIV'];
    if (uiElements.includes(e.target.tagName) || e.target.closest('.modal-content') || e.target.closest('.cloth-side-panel')) {
        return;
    }
    
    game.mouse.x = e.clientX;
    game.mouse.y = e.clientY;
    game.mouse.down = true; 
    game.mouse.button = e.button;
    
    // Ações por ferramenta
    if (game.activeTool === 'cannon' && e.button === 0) {
        let angle = Math.atan2(e.clientY - game.height + 100, e.clientX - game.width / 2);
        let speed = game.CANNON_POWER;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        
        // Verificar se tem habilidade de rajada
        const rapidfireLevel = game.specialAbilities.cannon.rapidfire?.level || 0;
        const shots = rapidfireLevel > 0 ? 3 + rapidfireLevel : 1;
        
        for (let i = 0; i < shots; i++) {
            const spread = shots > 1 ? (i - (shots-1)/2) * 0.2 : 0;
            game.cannonballs.push(new game.Cannonball(
                game.width / 2 + Math.cos(angle + spread) * 20, 
                game.height - 50, 
                Math.cos(angle + spread) * speed * (0.9 + Math.random() * 0.2),
                Math.sin(angle + spread) * speed * (0.9 + Math.random() * 0.2)
            ));
        }
        
        // Efeitos visuais
        for (let i = 0; i < 30; i++) {
            game.particles.push(new game.Particle(
                game.width / 2, game.height - 50,
                vx * 0.1 + (Math.random() - 0.5) * 3,
                vy * 0.1 + (Math.random() - 0.5) * 3,
                '#888888',
                4 + Math.random() * 5,
                50 + Math.random() * 50
            ));
        }
        
        game.gainXP(5);
        
    } else if (game.activeTool === 'dart' && e.button === 0) {
        let angle = Math.atan2(e.clientY - game.height + 100, e.clientX - game.width / 2);
        let speed = game.DART_POWER;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        
        // Verificar se tem habilidade de múltiplos dardos
        const multishotLevel = game.specialAbilities.dart.multishot?.level || 0;
        const shots = multishotLevel > 0 ? 3 : 1;
        
        for (let i = 0; i < shots; i++) {
            const spread = shots > 1 ? (i - 1) * 0.3 : 0;
            game.darts.push(new game.Dart(
                game.width / 2,
                game.height - 50,
                Math.cos(angle + spread) * speed,
                Math.sin(angle + spread) * speed,
                e.clientX,
                e.clientY
            ));
        }
        
        // Efeitos visuais
        for (let i = 0; i < 10; i++) {
            game.particles.push(new game.Particle(
                game.width / 2, game.height - 50,
                vx * 0.05 + (Math.random() - 0.5) * 1.5,
                vy * 0.05 + (Math.random() - 0.5) * 1.5,
                '#ffff55',
                2 + Math.random() * 2,
                15 + Math.random() * 15
            ));
        }
        
    } else if (game.activeTool === 'blower' && e.button === 0) {
        game.blowForce = 1.5;
        game.blowAngle = Math.atan2(e.clientY - game.mouse.y, e.clientX - game.mouse.x);
    } else if (game.activeTool === 'flame' && e.button === 0) {
        if (game.missionState.activeMissionId === 'noFire') {
            game.missionState.fireUsed = true;
            game.failMission('fogo usado');
            return;
        }
        game.flameActive = true;
        game.flameAngle = Math.atan2(e.clientY - game.mouse.y, e.clientX - game.mouse.x);
        game.toolIndicator.className = 'tool-indicator flame-active';
        game.createToolbar();
    } else if (game.activeTool === 'hook' && e.button === 0) {
        game.attachHookAt(e.clientX, e.clientY);
    } else if (game.activeTool === 'scissor' && e.button === 0) {
        game.applyScissorCut();
    } else if (game.activeTool === 'hammer' && e.button === 0) {
        game.applyHammerImpact();
    } else if (game.activeTool === 'laser' && e.button === 0) {
        const speed = Math.hypot(game.mouse.x - game.mouse.px, game.mouse.y - game.mouse.py);
        if (speed <= 1.5) game.laserAngle = -Math.PI / 2;
    } else if (game.activeTool === 'glue') {
        if (e.button === 2) game.removeGlueNear(e.clientX, e.clientY);
        else if (e.button === 0) game.applyGlueAt(e.clientX, e.clientY, game.glueState.mode === 'clamp');
    } else if (game.activeTool === 'electric' && e.button === 0) {
        game.fireElectricPulse(e.clientX, e.clientY);
    }
});

window.addEventListener('mouseup', e => { 
    game.mouse.down = false;
    
    if (game.activeTool === 'blower') {
        game.blowForce = 0;
    } else if (game.activeTool === 'flame') {
        game.flameActive = false;
        game.toolIndicator.className = 'tool-indicator';
        game.createToolbar();
    } else if (game.activeTool === 'hook') {
        game.releaseHook(true);
    }
});

window.addEventListener('mousemove', e => {
    const previousX = game.mouse.x;
    const previousY = game.mouse.y;
    game.mouse.x = e.clientX;
    game.mouse.y = e.clientY;
    
    if (game.mouse.down) {
        if (game.activeTool === 'blower' && game.blowForce > 0) {
            game.blowAngle = Math.atan2(e.clientY - previousY, e.clientX - previousX);
        } else if (game.activeTool === 'flame' && game.flameActive) {
            game.flameAngle = Math.atan2(e.clientY - previousY, e.clientX - previousX);
        }
    }
});

window.addEventListener('contextmenu', e => {
    e.preventDefault();
});

window.addEventListener('resize', game.init);

// Atalhos de teclado ATUALIZADOS
window.addEventListener('keydown', function(e) {
    // Ignorar se estiver em modal
    if (game.isConfigModalOpen || game.isUpgradeModalOpen || game.isSpecialModalOpen) {
        return;
    }
    
    const key = e.key.toUpperCase();
    
    // Ferramentas
    if (key === 'M') game.setActiveTool('mouse');
    if (key === 'B') game.setActiveTool('blower');
    if (key === 'C') game.setActiveTool('cannon');
    if (key === 'D') game.setActiveTool('dart');
    if (key === 'L') game.setActiveTool('flame');
    if (key === 'V') game.setActiveTool('blade');
    if (key === 'G') game.setActiveTool('hook');
    if (key === 'O') game.setActiveTool('drill');
    if (key === 'Z') game.setActiveTool('laser');
    if (key === 'X') game.setActiveTool('scissor');
    if (key === 'H') game.setActiveTool('hammer');
    if (key === 'A') game.setActiveTool('acid');
    if (key === 'U') game.setActiveTool('glue');
    if (key === 'I') game.setActiveTool('electric');

    if (game.activeTool === 'glue') {
        if (key === '1') {
            game.glueState.mode = 'gluePin';
            game.glueState.pendingPoint = null;
            game.toolIndicator.textContent = `Ferramenta: ${game.tools.glue.name} - ponto temporario`;
        }
        if (key === '2') {
            game.glueState.mode = 'glueBridge';
            game.glueState.pendingPoint = null;
            game.toolIndicator.textContent = `Ferramenta: ${game.tools.glue.name} - ponte`;
        }
        if (key === '3') {
            game.glueState.mode = 'clamp';
            game.glueState.pendingPoint = null;
            game.toolIndicator.textContent = `Ferramenta: ${game.tools.glue.name} - grampo`;
        }
    }
    
    // Ações
    if (key === 'R') game.clearAllDarts();
    if (key === 'F') game.extinguishAllFire();
    
    // Atalhos para habilidades (Q, E, R, T)
    const abilities = game.activeAbilities[game.activeTool];
    const hotkeyMap = { 'Q': 0, 'E': 1, 'R': 2, 'T': 3, 'Y': 4 };
    
    if (hotkeyMap[key] !== undefined && abilities[hotkeyMap[key]]) {
        const abilityId = abilities[hotkeyMap[key]];
        game.activateAbility(abilityId);
    }
    
    // Modais
    if (e.key === 'Escape') {
        if (game.configModal.style.display === 'flex') {
            game.isConfigModalOpen = false;
            game.configModal.style.display = 'none';
        } else if (game.upgradeModal.style.display === 'flex') {
            game.isUpgradeModalOpen = false;
            game.upgradeModal.style.display = 'none';
        } else if (game.specialModal.style.display === 'flex') {
            game.isSpecialModalOpen = false;
            game.specialModal.style.display = 'none';
        }
    }
    
    // Disparar com espaço
    if (e.key === ' ') {
        e.preventDefault();
        
        if (game.activeTool === 'dart') {
            game.darts.push(new game.Dart(
                game.width / 2,
                game.height - 50,
                0,
                -game.DART_POWER,
                game.width / 2,
                game.height / 3
            ));
            
            for (let i = 0; i < 10; i++) {
                game.particles.push(new game.Particle(
                    game.width / 2, game.height - 50,
                    (Math.random() - 0.5) * 1.5,
                    -game.DART_POWER * 0.05 + (Math.random() - 0.5) * 1.5,
                    '#ffff55',
                    2 + Math.random() * 2,
                    15 + Math.random() * 15
                ));
            }
            
        } else if (game.activeTool === 'cannon') {
            const now = Date.now();
            if (now - game.lastMouseDownTime > game.CLICK_THRESHOLD) {
                let event = new MouseEvent('mousedown', {
                    clientX: game.width / 2,
                    clientY: game.height / 2,
                    bubbles: true,
                    cancelable: true
                });
                window.dispatchEvent(event);
                
                setTimeout(() => {
                    let upEvent = new MouseEvent('mouseup', {
                        clientX: game.width / 2,
                        clientY: game.height / 2,
                        bubbles: true,
                        cancelable: true
                    });
                    window.dispatchEvent(upEvent);
                }, 100);
            }
            
        } else if (game.activeTool === 'flame' && !game.flameActive) {
            game.flameActive = true;
            game.flameAngle = Math.atan2(game.height/2 - game.mouse.y, game.width/2 - game.mouse.x);
            game.createToolbar();
            game.toolIndicator.className = 'tool-indicator flame-active';
        }
    }
});

window.addEventListener('keyup', function(e) {
    if (e.key === ' ' && game.activeTool === 'flame' && game.flameActive) {
        game.flameActive = false;
        game.createToolbar();
        game.toolIndicator.className = 'tool-indicator';
    }
});

// Botões da interface
game.clearDartsBtn.addEventListener('mousedown', (e) => e.stopPropagation());
game.clearDartsBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    game.clearAllDarts();
});

game.extinguishBtn.addEventListener('mousedown', (e) => e.stopPropagation());
game.extinguishBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    game.extinguishAllFire();
});

game.regenerateClothBtn.addEventListener('mousedown', (e) => e.stopPropagation());
game.regenerateClothBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    game.resetClothSimulation({ randomizeVisual: false, keepDecals: true });
});

}
