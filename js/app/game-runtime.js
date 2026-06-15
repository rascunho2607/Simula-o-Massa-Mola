import { dom } from '../ui/dom.js';
import { createDefaultConfig, configLimits } from '../core/config.js';
import { createRuntimeGameLoopController } from '../core/game-loop.js';
import { registerRuntimeInputHandlers } from '../core/input.js';
import { tools } from '../tools/tool-manager.js';
import { createDefaultPlayerData } from '../progression/player-data.js';
import { createSpecialAbilities, createActiveAbilities, createAbilityCooldowns, createModalAbilities } from '../progression/abilities-data.js';
import { createToolbarController } from '../ui/toolbar.js';
import { createSaveController } from '../storage/save-system.js';
import { createXpController } from '../progression/xp-system.js';
import { createUpgradeController } from '../progression/upgrade-system.js';
import { createAbilitySystemController } from '../progression/ability-system.js';
import { createConfigModalController } from '../ui/config-modal.js';
import { initClothSidePanel, updateClothSidePanel } from '../ui/cloth-side-panel.js';
import { createAbilitiesBarController } from '../ui/abilities-bar.js';
import { createUpgradeModalController } from '../ui/upgrade-modal.js';
import { createSpecialModalController } from '../ui/special-modal.js';
import { createHudController, updateDartCounter as renderDartCounter } from '../ui/hud.js';
import { drawCoveredTarget as renderCoveredTarget } from '../render/renderer.js';
import { createClothVisualSystem } from '../render/cloth-visual-system.js';
import { createToolVisualEffectsController, createToolOverlayRendererController } from '../render/effects-renderer.js';
import { missions as missionData } from '../missions/mission-data.js';
import { createMissionController } from '../missions/mission-system.js';
import { createParticleSystemController } from '../particles/particle-system.js';
import { createParticleClass } from '../particles/particle.js';
import { createFireParticleClass } from '../particles/fire-particle.js';
import { createFireSystemController } from '../fire/fire-system.js';
import { createRuntimeClothController } from '../simulation/cloth.js';
import { createPointClass } from '../simulation/point.js';
import { createSpringClass } from '../simulation/spring.js';
import { createMaterialSystemController } from '../simulation/material-system.js';
import { createDamageSystemController } from '../simulation/physics.js';
import { createCannonballClass } from '../entities/cannonball.js';
import { createDartClass } from '../entities/dart.js';
import { createToolEffectsController } from '../tools/tool-effects.js';
import { createBladeToolController } from '../tools/blade-tool.js';
import { createHookToolController } from '../tools/hook-tool.js';
import { createCannonEffectsController } from '../tools/cannon-tool.js';
import { createBlowerEffectsController } from '../tools/blower-tool.js';
import { createDrillToolController } from '../tools/drill-tool.js';
import { createLaserToolController } from '../tools/laser-tool.js';
import { createScissorToolController } from '../tools/scissor-tool.js';
import { createHammerToolController } from '../tools/hammer-tool.js';
import { createAcidToolController } from '../tools/acid-tool.js';
import { createGlueToolController } from '../tools/glue-tool.js';
import { createElectricToolController } from '../tools/electric-tool.js';
import { createDartToolController, createDartEffectsController } from '../tools/dart-tool.js';
import { createFlameEffectsController } from '../tools/flame-tool.js';
import { createMouseEffectsController } from '../tools/mouse-tool.js';
import { initTestChamberBackground, resizeTestChamberBackground, rebuildTestChamberBackground } from '../background/test-chamber-background.js';
import { initDecalSystem, seedInitialDecals, addDecal, clearBackgroundDamage } from '../background/decal-system.js';

export function bootGame() {
// ==============================================
        // SISTEMA DE UPGRADES - IMPLEMENTAÇÃO COMPLETA
        // ==============================================
        
        const canvas = dom.canvas;
        const ctx = canvas.getContext('2d');
        
        // Elementos da interface
        const configBtn = dom.configBtn;
        const upgradeBtn = dom.upgradeBtn;
        const specialBtn = dom.specialBtn;
        const configModal = dom.configModal;
        const upgradeModal = dom.upgradeModal;
        const specialModal = dom.specialModal;
        const closeConfigModal = dom.closeConfigModal;
        const closeUpgradeModal = dom.closeUpgradeModal;
        const closeSpecialModal = dom.closeSpecialModal;
        const configControls = dom.configControls;
        const resetBtn = dom.resetBtn;
        const toolbar = dom.toolbar;
        const toolIndicator = dom.toolIndicator;
        const dartCounter = dom.dartCounter;
        const clearDartsBtn = dom.clearDartsBtn;
        const extinguishBtn = dom.extinguishBtn;
        const regenerateClothBtn = dom.regenerateClothBtn;
        const abilitiesBar = dom.abilitiesBar;
        const playerInfo = dom.playerInfo;
        const playerLevel = dom.playerLevel;
        const xpFill = dom.xpFill;
        const xpText = dom.xpText;
        const upgradePoints = dom.upgradePoints;

        // ==============================================
        // 1. SISTEMA DE PROGRESSO
        // ==============================================
        let playerData = createDefaultPlayerData();

        // Habilidades especiais disponíveis
        const specialAbilities = createSpecialAbilities();

        // Estado das habilidades ativas
        const activeAbilities = createActiveAbilities();

        // Cooldowns das habilidades
        const abilityCooldowns = createAbilityCooldowns();
        
        // Estado de habilidades modais (ativas/desativas)
        const modalAbilities = createModalAbilities();
        
        // Sistema de XP
        let xpMultiplier = 1;

        // Função para ganhar XP
        let xpController = null;

        function getXpController() {
            if (!xpController) {
                xpController = createXpController({
                    playerLevel,
                    xpFill,
                    xpText,
                    upgradePoints,
                    saveGame,
                    get playerData() { return playerData; },
                    get xpMultiplier() { return xpMultiplier; },
                });
            }
            return xpController;
        }

        function gainXP(amount) {
            return getXpController().gainXP(amount);
        }

        function updatePlayerDisplay() {
            return getXpController().updatePlayerDisplay();
        }

        // Configurações iniciais
        let config = createDefaultConfig();
        const clothVisualSystem = createClothVisualSystem();

        let width, height, rows, cols;
        let points = [];
        let springs = [];
        let mouse = { x: 0, y: 0, px: 0, py: 0, down: false, button: 0 };
        
        // Sistema de ferramentas
        let activeTool = 'mouse';
        let particles = [];
        let cannonballs = [];
        let darts = [];
        let blowForce = 0;
        let blowAngle = 0;
        let flameActive = false;
        let flameAngle = 0;
        
        // Pontos fixados por dardos
        let pinnedByDarts = new Set();
        
        // Sistema de fogo
        let burningPoints = new Set();
        let fireParticles = [];
        let impactRings = [];
        let damageParticleBudget = 0;
        let frameCount = 0;
        let backgroundInitialized = false;
        let targetHud = null;
        let coveredTarget = {
            x: 0,
            y: 0,
            radius: 90,
            hp: 300,
            maxHp: 300,
            coveragePercent: 100,
            exposedPercent: 0,
            exposed: false,
            destroyed: false,
            coverPoints: [],
            coverSprings: [],
            totalCoverPoints: 0,
            totalCoverElements: 0
        };
        
        // Estado do soprador (sopra/sucção)
        let blowerMode = 'blow'; // 'blow' ou 'suction'
        
        // Controle de estado da interface
        let isConfigModalOpen = false;
        let isUpgradeModalOpen = false;
        let isSpecialModalOpen = false;
        let isSwitchingTool = false;
        let toolSwitchInProgress = false;
        let lastMouseDownTime = 0;
        const CLICK_THRESHOLD = 150;
        let hookState = {
            active: false,
            attachedPoint: null,
            attachedSpring: null,
            x: 0,
            y: 0,
            strength: 0,
            ropeLength: 0
        };
        let toolEffects = [];
        let laserAngle = 0;
        let lastHammerTime = 0;
        let lastElectricTime = 0;
        let gluePins = [];
        let glueBridges = [];
        let glueState = {
            mode: 'gluePin',
            pendingPoint: null
        };
        let missionHud = null;
        let missionState = {
            activeMissionId: config.defaultMission,
            started: false,
            completed: false,
            failed: false,
            failReason: '',
            score: 0,
            timeElapsed: 0,
            damageOutsideTarget: 0,
            targetDamage: 0,
            tissueDamage: 0,
            surgeryDamage: 0,
            fireUsed: false,
            lastCoverageRemoved: 0
        };

        // Valores base aumentados por upgrades
        let CANNON_POWER = 25;
        let DART_POWER = 22;
        let BLOWER_POWER = 0.2;
        let FLAME_POWER = 0.3;
        let MOUSE_POWER = 0.5;
        
        // Valores padrão para reset

        // ==============================================
        // 4. SISTEMA DE ATIVAÇÃO DE HABILIDADES (CORRIGIDO)
        // ==============================================
        let abilitiesBarController = null;

        function getAbilitiesBarController() {
            if (!abilitiesBarController) {
                abilitiesBarController = createAbilitiesBarController({
                    abilitiesBar,
                    specialAbilities,
                    activeAbilities,
                    abilityCooldowns,
                    modalAbilities,
                    activateAbility,
                    get activeTool() { return activeTool; },
                });
            }
            return abilitiesBarController;
        }

        function updateAbilitiesBar() {
            return getAbilitiesBarController().updateAbilitiesBar();
        }

        function getAbilityIcon(toolId, abilityId) {
            return getAbilitiesBarController().getAbilityIcon(toolId, abilityId);
        }

        
        let abilitySystemController = null;
        function getAbilitySystemController() {
            if (!abilitySystemController) {
                abilitySystemController = createAbilitySystemController({
                    specialAbilities,
                    activeAbilities,
                    abilityCooldowns,
                    modalAbilities,
                    gainXP,
                    updateAbilitiesBar,
                    updatePlayerDisplay,
                    showToolAbilities,
                    saveGame,
                    createExplosion,
                    createChainLightning,
                    activateDartMagnet,
                    createPortal,
                    createVortex,
                    createTornado,
                    freezeArea,
                    createSparks,
                    activatePhoenix,
                    duplicateMouseEffect,
                    createFireRing() {},
                    createWeb() {},
                    createForceField() {},
                    setBlowerMode(nextBlowerMode) { blowerMode = nextBlowerMode; },
                    get activeTool() { return activeTool; },
                    get blowerMode() { return blowerMode; },
                    get mouse() { return mouse; },
                    get cannonballs() { return cannonballs; },
                    get darts() { return darts; },
                    get playerData() { return playerData; },
                });
            }
            return abilitySystemController;
        }

        function activateAbility(abilityId) {
            return getAbilitySystemController().activateAbility(abilityId);
        }

        function activateCannonAbility(abilityId) {
            return getAbilitySystemController().activateCannonAbility(abilityId);
        }

        function activateDartAbility(abilityId) {
            return getAbilitySystemController().activateDartAbility(abilityId);
        }

        let dartEffectsController = null;
        function getDartEffectsController() {
            if (!dartEffectsController) {
                dartEffectsController = createDartEffectsController({
                    ctx,
                    Particle,
                    get points() { return points; },
                    get particles() { return particles; },
                });
            }
            return dartEffectsController;
        }

        function createChainLightning(stuckDarts) {
            return getDartEffectsController().createChainLightning(stuckDarts);
        }

        
        function createLightningEffect(x1, y1, x2, y2) {
            return getDartEffectsController().createLightningEffect(x1, y1, x2, y2);
        }

        
        function activateDartMagnet(stuckDarts) {
            return getDartEffectsController().activateDartMagnet(stuckDarts);
        }

        
        function createPortal(dart1, dart2) {
            return getDartEffectsController().createPortal(dart1, dart2);
        }

        
        function createPortalEffect(x, y, radius, color) {
            return getDartEffectsController().createPortalEffect(x, y, radius, color);
        }

        
        // ==============================================
        // HABILIDADES DO SOPRADOR (CORRIGIDAS)
        // ==============================================
        function activateBlowerAbility(abilityId) {
            return getAbilitySystemController().activateBlowerAbility(abilityId);
        }

        let blowerEffectsController = null;
        function getBlowerEffectsController() {
            if (!blowerEffectsController) {
                blowerEffectsController = createBlowerEffectsController({
                    Particle,
                    get points() { return points; },
                    get particles() { return particles; },
                });
            }
            return blowerEffectsController;
        }

        function createVortex(x, y) {
            return getBlowerEffectsController().createVortex(x, y);
        }

        
        function createTornado(x, y) {
            return getBlowerEffectsController().createTornado(x, y);
        }

        
        // ==============================================
        // HABILIDADES DO FOGO E MOUSE
        // ==============================================
        function activateFlameAbility(abilityId) {
            return getAbilitySystemController().activateFlameAbility(abilityId);
        }

        function activateMouseAbility(abilityId) {
            return getAbilitySystemController().activateMouseAbility(abilityId);
        }

        // ==============================================
        // FUNES AUXILIARES
        // ==============================================
        let particleSystemController = null;

        function getParticleSystemController() {
            if (!particleSystemController) {
                particleSystemController = createParticleSystemController({
                    config,
                    ctx,
                    Particle,
                    get particles() { return particles; },
                    get damageParticleBudget() { return damageParticleBudget; },
                    set damageParticleBudget(value) { damageParticleBudget = value; },
                    get impactRings() { return impactRings; },
                    set impactRings(value) { impactRings = value; },
                });
            }
            return particleSystemController;
        }

        function canSpawnDamageParticle() {
            return getParticleSystemController().canSpawnDamageParticle();
        }

        function pushDamageParticle(x, y, vx, vy, color, size, life) {
            return getParticleSystemController().pushDamageParticle(x, y, vx, vy, color, size, life);
        }

        function createImpactRing(x, y, radius, color = '#ffcc55') {
            return getParticleSystemController().createImpactRing(x, y, radius, color);
        }

        function updateImpactRings() {
            return getParticleSystemController().updateImpactRings();
        }

        function drawImpactRings() {
            return getParticleSystemController().drawImpactRings();
        }

        function createDamageBurst(x, y, damageType = 'impact', intensity = 1, requestedCount = 10) {
            return getParticleSystemController().createDamageBurst(x, y, damageType, intensity, requestedCount);
        }

        let materialSystemController = null;
        function getMaterialSystemController() {
            if (!materialSystemController) {
                materialSystemController = createMaterialSystemController({
                    config,
                    coveredTarget,
                    get frameCount() { return frameCount; },
                    get rows() { return rows; },
                    get cols() { return cols; },
                    get points() { return points; },
                    get springs() { return springs; },
                });
            }
            return materialSystemController;
        }

        function getLayerByIndex(layerIndex) {
            return getMaterialSystemController().getLayerByIndex(layerIndex);
        }

        function getMaterial(entity) {
            return getMaterialSystemController().getMaterial(entity);
        }

        function getDamageResistance(entity, damageType = 'impact') {
            return getMaterialSystemController().getDamageResistance(entity, damageType);
        }

        function applyMaterialStats(entity, baseHp, hpMultiplierKey, keepDamageRatio = true) {
            return getMaterialSystemController().applyMaterialStats(entity, baseHp, hpMultiplierKey, keepDamageRatio);
        }

        function materialDamageColor(entity, alpha = 0.92) {
            return getMaterialSystemController().materialDamageColor(entity, alpha);
        }

        function deterministicPatch(x, y) {
            return getMaterialSystemController().deterministicPatch(x, y);
        }

        function getLayerForPoint(point) {
            return getMaterialSystemController().getLayerForPoint(point);
        }

        function getPointMaterial(point, pattern = config.materialPattern) {
            return getMaterialSystemController().getPointMaterial(point, pattern);
        }

        function assignMaterialToCloth(pattern = config.materialPattern) {
            return getMaterialSystemController().assignMaterialToCloth(pattern);
        }

        function updateDamageState(entity) {
            return getMaterialSystemController().updateDamageState(entity);
        }

        let damageSystemController = null;
        function getDamageSystemController() {
            if (!damageSystemController) {
                damageSystemController = createDamageSystemController({
                    config,
                    getDamageResistance,
                    recordMissionDamage,
                    updateDamageState,
                    createDamageBurst,
                    createImpactRing,
                    updateDartCounter,
                    damageCoveredTarget,
                    get frameCount() { return frameCount; },
                    get points() { return points; },
                    get springs() { return springs; },
                    get pinnedByDarts() { return pinnedByDarts; },
                    get coveredTarget() { return coveredTarget; },
                });
            }
            return damageSystemController;
        }

        function isPointAlive(point) {
            return getDamageSystemController().isPointAlive(point);
        }

        function isSpringAlive(spring) {
            return getDamageSystemController().isSpringAlive(spring);
        }

        function applyDamageToPoint(point, amount, damageType = 'impact', source = {}) {
            return getDamageSystemController().applyDamageToPoint(point, amount, damageType, source);
        }

        function applyDamageToSpring(spring, amount, damageType = 'impact', source = {}) {
            return getDamageSystemController().applyDamageToSpring(spring, amount, damageType, source);
        }

        function breakSpring(spring, damageType = 'impact', source = {}) {
            return getDamageSystemController().breakSpring(spring, damageType, source);
        }

        function destroyPoint(point, damageType = 'impact', source = {}) {
            return getDamageSystemController().destroyPoint(point, damageType, source);
        }

        function applyAreaDamage(x, y, radius, amount, damageType = 'impact', falloff = true) {
            return getDamageSystemController().applyAreaDamage(x, y, radius, amount, damageType, falloff);
        }

        function addBackgroundDecal(type, x, y, options = {}) {
            return addDecal(type, x, y, options);
        }

        let toolEffectsController = null;
        function getToolEffectsController() {
            if (!toolEffectsController) {
                toolEffectsController = createToolEffectsController({
                    Particle,
                    damageCoveredTarget,
                    isPointAlive,
                    isSpringAlive,
                    setToolEffects(nextToolEffects) { toolEffects = nextToolEffects; },
                    get points() { return points; },
                    get springs() { return springs; },
                    get particles() { return particles; },
                    get toolEffects() { return toolEffects; },
                    get coveredTarget() { return coveredTarget; },
                });
            }
            return toolEffectsController;
        }

        function findNearestPoint(x, y, radius) {
            return getToolEffectsController().findNearestPoint(x, y, radius);
        }

        function findNearestSpring(x, y, radius) {
            return getToolEffectsController().findNearestSpring(x, y, radius);
        }

        function pushToolEffect(effect) {
            return getToolEffectsController().pushToolEffect(effect);
        }

        function createFineParticles(x, y, color, count, spread = 1.8) {
            return getToolEffectsController().createFineParticles(x, y, color, count, spread);
        }

        function damageTargetFromLine(ax, ay, bx, by, widthValue, amount, damageType) {
            return getToolEffectsController().damageTargetFromLine(ax, ay, bx, by, widthValue, amount, damageType);
        }

        function updateToolEffects() {
            return getToolEffectsController().updateToolEffects();
        }

        let bladeToolController = null;
        function getBladeToolController() {
            if (!bladeToolController) {
                bladeToolController = createBladeToolController({
                    config,
                    gainXP,
                    pushToolEffect,
                    createFineParticles,
                    isSpringAlive,
                    applyDamageToSpring,
                    addBackgroundDecal,
                    get activeTool() { return activeTool; },
                    get frameCount() { return frameCount; },
                    get mouse() { return mouse; },
                    get springs() { return springs; },
                });
            }
            return bladeToolController;
        }

        function processBladeTool() {
            return getBladeToolController().processBladeTool();
        }

        let hookToolController = null;
        function getHookToolController() {
            if (!hookToolController) {
                hookToolController = createHookToolController({
                    config,
                    findNearestPoint,
                    findNearestSpring,
                    createFineParticles,
                    createImpactRing,
                    isPointAlive,
                    isSpringAlive,
                    applyDamageToSpring,
                    setHookState(nextHookState) { hookState = nextHookState; },
                    get activeTool() { return activeTool; },
                    get frameCount() { return frameCount; },
                    get mouse() { return mouse; },
                    get springs() { return springs; },
                    get hookState() { return hookState; },
                });
            }
            return hookToolController;
        }

        function attachHookAt(x, y) {
            return getHookToolController().attachHookAt(x, y);
        }

        function releaseHook(snap = true) {
            return getHookToolController().releaseHook(snap);
        }

        function processHookTool() {
            return getHookToolController().processHookTool();
        }

        let drillToolController = null;
        function getDrillToolController() {
            if (!drillToolController) {
                drillToolController = createDrillToolController({
                    config,
                    pushToolEffect,
                    createFineParticles,
                    isPointAlive,
                    isSpringAlive,
                    applyDamageToPoint,
                    applyDamageToSpring,
                    getMaterial,
                    addBackgroundDecal,
                    get activeTool() { return activeTool; },
                    get frameCount() { return frameCount; },
                    get mouse() { return mouse; },
                    get points() { return points; },
                    get springs() { return springs; },
                });
            }
            return drillToolController;
        }

        function processDrillTool() {
            return getDrillToolController().processDrillTool();
        }

        let laserToolController = null;
        function getLaserToolController() {
            if (!laserToolController) {
                laserToolController = createLaserToolController({
                    config,
                    pushToolEffect,
                    createFineParticles,
                    damageTargetFromLine,
                    isPointAlive,
                    isSpringAlive,
                    applyDamageToPoint,
                    applyDamageToSpring,
                    getMaterial,
                    addBackgroundDecal,
                    setLaserAngle(nextLaserAngle) { laserAngle = nextLaserAngle; },
                    get activeTool() { return activeTool; },
                    get frameCount() { return frameCount; },
                    get laserAngle() { return laserAngle; },
                    get mouse() { return mouse; },
                    get points() { return points; },
                    get springs() { return springs; },
                });
            }
            return laserToolController;
        }

        function getLaserVector() {
            return getLaserToolController().getLaserVector();
        }

        function processLaserTool() {
            return getLaserToolController().processLaserTool();
        }

        let scissorToolController = null;
        function getScissorToolController() {
            if (!scissorToolController) {
                scissorToolController = createScissorToolController({
                    config,
                    gainXP,
                    findNearestSpring,
                    pushToolEffect,
                    createFineParticles,
                    applyDamageToSpring,
                    addBackgroundDecal,
                    get mouse() { return mouse; },
                });
            }
            return scissorToolController;
        }

        function applyScissorCut() {
            return getScissorToolController().applyScissorCut();
        }

        let hammerToolController = null;
        function getHammerToolController() {
            if (!hammerToolController) {
                hammerToolController = createHammerToolController({
                    config,
                    gainXP,
                    applyAreaDamage,
                    createImpactRing,
                    pushToolEffect,
                    createFineParticles,
                    isPointAlive,
                    addBackgroundDecal,
                    setLastHammerTime(nextLastHammerTime) { lastHammerTime = nextLastHammerTime; },
                    get lastHammerTime() { return lastHammerTime; },
                    get mouse() { return mouse; },
                    get points() { return points; },
                });
            }
            return hammerToolController;
        }

        function applyHammerImpact() {
            return getHammerToolController().applyHammerImpact();
        }

        function processContinuousTools() {
            updateFlameBackgroundDamage();
            processBladeTool();
            processHookTool();
            processDrillTool();
            processLaserTool();
            processAcidTool();
            processAcidEffects();
            updateGlueConstraints();
            updateElectricStates();
            updateMission(1 / 60);
            updateToolEffects();
        }

        let acidToolController = null;
        function getAcidToolController() {
            if (!acidToolController) {
                acidToolController = createAcidToolController({
                    config,
                    pushToolEffect,
                    createFineParticles,
                    isPointAlive,
                    isSpringAlive,
                    applyDamageToPoint,
                    applyDamageToSpring,
                    addBackgroundDecal,
                    get activeTool() { return activeTool; },
                    get frameCount() { return frameCount; },
                    get mouse() { return mouse; },
                    get points() { return points; },
                    get springs() { return springs; },
                });
            }
            return acidToolController;
        }

        function markAcid(entity, amount = 1) {
            return getAcidToolController().markAcid(entity, amount);
        }

        function processAcidTool() {
            return getAcidToolController().processAcidTool();
        }

        function processAcidEffects() {
            return getAcidToolController().processAcidEffects();
        }

        let glueToolController = null;
        function getGlueToolController() {
            if (!glueToolController) {
                glueToolController = createGlueToolController({
                    Spring,
                    config,
                    findNearestPoint,
                    pushToolEffect,
                    createFineParticles,
                    isPointAlive,
                    isSpringAlive,
                    addBackgroundDecal,
                    setGluePins(nextGluePins) { gluePins = nextGluePins; },
                    setGlueBridges(nextGlueBridges) { glueBridges = nextGlueBridges; },
                    get glueState() { return glueState; },
                    get gluePins() { return gluePins; },
                    get glueBridges() { return glueBridges; },
                    get springs() { return springs; },
                });
            }
            return glueToolController;
        }

        function applyGlueAt(x, y, permanent = false) {
            return getGlueToolController().applyGlueAt(x, y, permanent);
        }

        function removeGluePin(pin, burst = false) {
            return getGlueToolController().removeGluePin(pin, burst);
        }

        function removeGlueBridge(bridge, burst = false) {
            return getGlueToolController().removeGlueBridge(bridge, burst);
        }

        function removeGlueNear(x, y) {
            return getGlueToolController().removeGlueNear(x, y);
        }

        function updateGlueConstraints() {
            return getGlueToolController().updateGlueConstraints();
        }

        let electricToolController = null;
        function getElectricToolController() {
            if (!electricToolController) {
                electricToolController = createElectricToolController({
                    config,
                    gainXP,
                    findNearestPoint,
                    pushToolEffect,
                    createFineParticles,
                    isPointAlive,
                    isSpringAlive,
                    applyDamageToPoint,
                    applyDamageToSpring,
                    addBackgroundDecal,
                    setLastElectricTime(nextLastElectricTime) { lastElectricTime = nextLastElectricTime; },
                    get lastElectricTime() { return lastElectricTime; },
                    get points() { return points; },
                    get springs() { return springs; },
                });
            }
            return electricToolController;
        }

        function fireElectricPulse(x, y) {
            return getElectricToolController().fireElectricPulse(x, y);
        }

        function updateElectricStates() {
            return getElectricToolController().updateElectricStates();
        }

        let missionController = null;

        function getMissionController() {
            if (!missionController) {
                missionController = createMissionController({
                    config,
                    missionData,
                    missionState,
                    coveredTarget,
                    gainXP,
                    createImpactRing,
                    createDamageBurst,
                    createTargetHud,
                    updateTargetHud,
                    updateMissionHud,
                    isPointAlive,
                    isSpringAlive,
                    get points() { return points; },
                    get springs() { return springs; },
                    get width() { return width; },
                    get rows() { return rows; },
                    get frameCount() { return frameCount; },
                });
            }
            return missionController;
        }

        function initializeCoveredTarget() {
            return getMissionController().initializeCoveredTarget();
        }

        function updateTargetCoverage(force = false) {
            return getMissionController().updateTargetCoverage(force);
        }

        function getSurgeryArea() {
            return getMissionController().getSurgeryArea();
        }

        function isInsideSurgeryArea(x, y) {
            return getMissionController().isInsideSurgeryArea(x, y);
        }

        function recordMissionDamage(entity, amount, damageType, source = {}) {
            return getMissionController().recordMissionDamage(entity, amount, damageType, source);
        }

        function getTotalTissueHp() {
            return getMissionController().getTotalTissueHp();
        }

        function calculateMissionScore() {
            return getMissionController().calculateMissionScore();
        }

        function completeMission() {
            return getMissionController().completeMission();
        }

        function failMission(reason) {
            return getMissionController().failMission(reason);
        }

        function resetMission() {
            return getMissionController().resetMission();
        }

        function startMission(id) {
            return getMissionController().startMission(id);
        }

        function getMissionStatus() {
            return getMissionController().getMissionStatus();
        }

        function updateMission(delta) {
            return getMissionController().updateMission(delta);
        }

        function damageCoveredTarget(amount, damageType = 'impact', x = coveredTarget.x, y = coveredTarget.y) {
            return getMissionController().damageCoveredTarget(amount, damageType, x, y);
        }

        let hudController = null;

        function getHudController() {
            if (!hudController) {
                hudController = createHudController({
                    config,
                    missionData,
                    missionState,
                    coveredTarget,
                    startMission,
                    getMissionStatus,
                    get targetHud() { return targetHud; },
                    set targetHud(value) { targetHud = value; },
                    get missionHud() { return missionHud; },
                    set missionHud(value) { missionHud = value; },
                });
            }
            return hudController;
        }

        function createTargetHud() {
            return getHudController().createTargetHud();
        }

        function updateTargetHud() {
            return getHudController().updateTargetHud();
        }

        function createMissionHud() {
            return getHudController().createMissionHud();
        }

        function updateMissionHud() {
            return getHudController().updateMissionHud();
        }

        function drawCoveredTarget() {
            return renderCoveredTarget(ctx, coveredTarget, config);
        }


        let cannonEffectsController = null;
        function getCannonEffectsController() {
            if (!cannonEffectsController) {
                cannonEffectsController = createCannonEffectsController({
                    config,
                    Particle,
                    pushDamageParticle,
                    createImpactRing,
                    applyAreaDamage,
                    isPointAlive,
                    addBackgroundDecal,
                    get points() { return points; },
                    get particles() { return particles; },
                });
            }
            return cannonEffectsController;
        }

        function createExplosion(x, y, intensity = 1.0) {
            return getCannonEffectsController().createExplosion(x, y, intensity);
        }

        
        function freezeArea(x, y) {
            return getBlowerEffectsController().freezeArea(x, y);
        }

        
        let flameEffectsController = null;
        function getFlameEffectsController() {
            if (!flameEffectsController) {
                flameEffectsController = createFlameEffectsController({
                    Particle,
                    FireParticle,
                    get points() { return points; },
                    get particles() { return particles; },
                    get fireParticles() { return fireParticles; },
                    get mouse() { return mouse; },
                });
            }
            return flameEffectsController;
        }

        function createSparks(x, y) {
            return getFlameEffectsController().createSparks(x, y);
        }

        
        function activatePhoenix() {
            return getFlameEffectsController().activatePhoenix();
        }

        function updateFlameBackgroundDamage() {
            if (!flameActive || activeTool !== 'flame') return;
            const radius = 28 + 18 * config.flameIntensity;
            addBackgroundDecal('burn', mouse.x, mouse.y, {
                radius,
                intensity: config.flameIntensity,
                minDistance: 34,
            });
        }

        
        let mouseEffectsController = null;
        function getMouseEffectsController() {
            if (!mouseEffectsController) {
                mouseEffectsController = createMouseEffectsController({
                    Particle,
                    MOUSE_POWER,
                    get width() { return width; },
                    get mouse() { return mouse; },
                    get points() { return points; },
                    get particles() { return particles; },
                });
            }
            return mouseEffectsController;
        }

        function duplicateMouseEffect() {
            return getMouseEffectsController().duplicateMouseEffect();
        }

        
        // ==============================================
        // ATUALIZAO DO PONTO PARA SUPORTAR SOPRADOR
        // ==============================================
        const Point = createPointClass({
            config,
            ctx,
            gainXP,
            applyMaterialStats,
            getLayerByIndex,
            isPointAlive,
            applyDamageToPoint,
            applyDamageToSpring,
            getMaterial,
            materialDamageColor,
            updateDartCounter,
            get FireParticle() { return FireParticle; },
            get fireParticles() { return fireParticles; },
            get specialAbilities() { return specialAbilities; },
            get springs() { return springs; },
            get burningPoints() { return burningPoints; },
            get mouse() { return mouse; },
            get playerData() { return playerData; },
            get activeTool() { return activeTool; },
            get MOUSE_POWER() { return MOUSE_POWER; },
            get blowForce() { return blowForce; },
            get BLOWER_POWER() { return BLOWER_POWER; },
            get blowAngle() { return blowAngle; },
            get blowerMode() { return blowerMode; },
            get flameActive() { return flameActive; },
            get FLAME_POWER() { return FLAME_POWER; },
            get flameAngle() { return flameAngle; },
            get frameCount() { return frameCount; },
            get pinnedByDarts() { return pinnedByDarts; },
        });


        // ==============================================
        // ATUALIZAO DO CANHO PARA SUPORTAR HABILIDADES
        // ==============================================
        const Cannonball = createCannonballClass({
            config,
            specialAbilities,
            gainXP,
            isPointAlive,
            applyAreaDamage,
            createImpactRing,
            createExplosion,
            createRicochetEffect,
            ctx,
            get Cannonball() { return Cannonball; },
            get mouse() { return mouse; },
            get width() { return width; },
            get height() { return height; },
            get points() { return points; },
            get cannonballs() { return cannonballs; },
            get frameCount() { return frameCount; },
            get playerData() { return playerData; },
            get CANNON_POWER() { return CANNON_POWER; },
            addBackgroundDecal,
        });

        
        function createRicochetEffect(x, y, angle) {
            return getCannonEffectsController().createRicochetEffect(x, y, angle);
        }


        // ==============================================
        // FUNES RESTANTES DA SIMULAO
        // ==============================================
        
        // [As classes Spring, FireParticle, Dart, Particle permanecem como antes]
        
        const Spring = createSpringClass({
            config,
            ctx,
            applyMaterialStats,
            getLayerByIndex,
            isSpringAlive,
            applyDamageToSpring,
            breakSpring,
            getMaterial,
            materialDamageColor,
            get FireParticle() { return FireParticle; },
            get fireParticles() { return fireParticles; },
            get frameCount() { return frameCount; },
            get activeTool() { return activeTool; },
            get blowForce() { return blowForce; },
            get mouse() { return mouse; },
            get playerData() { return playerData; },
            addBackgroundDecal,
        });


        const FireParticle = createFireParticleClass({
            ctx,
            specialAbilities,
        });


        const Dart = createDartClass({
            config,
            gainXP,
            isPointAlive,
            applyDamageToPoint,
            applyAreaDamage,
            createImpactRing,
            pushDamageParticle,
            ctx,
            get width() { return width; },
            get height() { return height; },
            get points() { return points; },
            get playerData() { return playerData; },
            addBackgroundDecal,
        });


        const Particle = createParticleClass({ ctx });


        // ==============================================
        // FUNES RESTANTES (interface, salvamento, etc.)
        // ==============================================
        
        function updateDartCounter() {
            return renderDartCounter(dartCounter, pinnedByDarts.size);
        }

        
        let fireSystemController = null;
        function getFireSystemController() {
            if (!fireSystemController) {
                fireSystemController = createFireSystemController({
                    setFireParticles(nextFireParticles) { fireParticles = nextFireParticles; },
                    setImpactRings(nextImpactRings) { impactRings = nextImpactRings; },
                    setDamageParticleBudget(nextDamageParticleBudget) { damageParticleBudget = nextDamageParticleBudget; },
                    get points() { return points; },
                    get springs() { return springs; },
                    get burningPoints() { return burningPoints; },
                });
            }
            return fireSystemController;
        }

        function extinguishAllFire() {
            return getFireSystemController().extinguishAllFire();
        }

        
        let clothController = null;
        function getClothController() {
            if (!clothController) {
                clothController = createRuntimeClothController({
                    config,
                    Point,
                    Spring,
                    glueState,
                    hookState,
                    initializeCoveredTarget,
                    assignMaterialToCloth,
                    updateTargetCoverage,
                    resetMission,
                    updateDartCounter,
                    setSize(nextWidth, nextHeight) {
                        width = canvas.width = nextWidth;
                        height = canvas.height = nextHeight;
                    },
                    setGrid(nextRows, nextCols) {
                        rows = nextRows;
                        cols = nextCols;
                    },
                    resetCollections() {
                        points = [];
                        springs = [];
                        cannonballs = [];
                        darts = [];
                        particles = [];
                        fireParticles = [];
                        impactRings = [];
                        toolEffects = [];
                        gluePins = [];
                        glueBridges = [];
                    },
                    setFrameCount(nextFrameCount) { frameCount = nextFrameCount; },
                    setDamageParticleBudget(nextDamageParticleBudget) { damageParticleBudget = nextDamageParticleBudget; },
                    get width() { return width; },
                    get rows() { return rows; },
                    get cols() { return cols; },
                    get points() { return points; },
                    get springs() { return springs; },
                    get pinnedByDarts() { return pinnedByDarts; },
                    get burningPoints() { return burningPoints; },
                    get coveredTarget() { return coveredTarget; },
                });
            }
            return clothController;
        }

        function init(options = {}) {
            const {
                randomizeVisual = true,
                keepDecals = config.decals?.persistent,
                seedDecals = true,
            } = options;
            const hadBackground = backgroundInitialized;
            if ((!keepDecals || !config.decals?.persistent) && hadBackground) clearBackgroundDamage();
            getClothController().init();
            if (randomizeVisual) clothVisualSystem.regenerate(config, rows, cols);
            else clothVisualSystem.refresh(config, rows, cols);
            if (!backgroundInitialized) {
                initTestChamberBackground(canvas, ctx, config);
                initDecalSystem(canvas, ctx, config);
                backgroundInitialized = true;
            } else {
                resizeTestChamberBackground(width, height);
                initDecalSystem(canvas, ctx, config);
                rebuildTestChamberBackground(config);
            }
            if (seedDecals) seedInitialDecals();
        }

        function resetClothSimulation(options = {}) {
            const { randomizeVisual = false, keepDecals = true, seedDecals = true } = options;
            flameActive = false;
            blowForce = 0;
            toolIndicator.className = 'tool-indicator';
            extinguishAllFire();
            init({ randomizeVisual, keepDecals, seedDecals });
            updateClothSidePanel();
        }

        function resetClothAndMarks() {
            clearBackgroundDamage();
            resetClothSimulation({ randomizeVisual: false, keepDecals: false, seedDecals: false });
        }


        let gameLoopController = null;
        function getGameLoopController() {
            if (!gameLoopController) {
                gameLoopController = createRuntimeGameLoopController({
                    canvas,
                    ctx,
                    config,
                    drawCoveredTarget,
                    processContinuousTools,
                    updateTargetCoverage,
                    updateImpactRings,
                    drawImpactRings,
                    drawBlowerEffect,
                    drawFlameEffect,
                    drawToolOverlays,
                    incrementFrame() { frameCount++; },
                    setDamageParticleBudget(nextDamageParticleBudget) { damageParticleBudget = nextDamageParticleBudget; },
                    setCannonballs(nextCannonballs) { cannonballs = nextCannonballs; },
                    setDarts(nextDarts) { darts = nextDarts; },
                    setParticles(nextParticles) { particles = nextParticles; },
                    setFireParticles(nextFireParticles) { fireParticles = nextFireParticles; },
                    get width() { return width; },
                    get height() { return height; },
                    get points() { return points; },
                    get springs() { return springs; },
                    getClothVisualState() { return clothVisualSystem.ensure(config, rows, cols); },
                    get cannonballs() { return cannonballs; },
                    get darts() { return darts; },
                    get particles() { return particles; },
                    get fireParticles() { return fireParticles; },
                    get activeTool() { return activeTool; },
                    get blowForce() { return blowForce; },
                    get flameActive() { return flameActive; },
                    get mouse() { return mouse; },
                });
            }
            return gameLoopController;
        }

        function animate() {
            return getGameLoopController().animate();
        }

        
        let toolVisualEffectsController = null;
        function getToolVisualEffectsController() {
            if (!toolVisualEffectsController) {
                toolVisualEffectsController = createToolVisualEffectsController({
                    ctx,
                    config,
                    Particle,
                    FireParticle,
                    get mouse() { return mouse; },
                    get blowAngle() { return blowAngle; },
                    get blowForce() { return blowForce; },
                    get blowerMode() { return blowerMode; },
                    get flameAngle() { return flameAngle; },
                    get playerData() { return playerData; },
                    get particles() { return particles; },
                    get fireParticles() { return fireParticles; },
                });
            }
            return toolVisualEffectsController;
        }

        function drawBlowerEffect() {
            return getToolVisualEffectsController().drawBlowerEffect();
        }

        
        function drawFlameEffect() {
            return getToolVisualEffectsController().drawFlameEffect();
        }


        let toolOverlayRendererController = null;
        function getToolOverlayRendererController() {
            if (!toolOverlayRendererController) {
                toolOverlayRendererController = createToolOverlayRendererController({
                    ctx,
                    config,
                    getLaserVector,
                    findNearestSpring,
                    isSpringAlive,
                    getSurgeryArea,
                    get toolEffects() { return toolEffects; },
                    get activeTool() { return activeTool; },
                    get mouse() { return mouse; },
                    get glueState() { return glueState; },
                    get hookState() { return hookState; },
                    get frameCount() { return frameCount; },
                    get gluePins() { return gluePins; },
                    get glueBridges() { return glueBridges; },
                    get missionState() { return missionState; },
                });
            }
            return toolOverlayRendererController;
        }

        function drawToolOverlays() {
            return getToolOverlayRendererController().drawToolOverlays();
        }

        
        // [As funções createToolbar, setActiveTool, clearAllDarts, createConfigControls,
        // createUpgradeModal, showToolUpgrades, canUpgrade, getUpgradeCost, upgradeTool,
        // calculateBaseAttributes, createSpecialModal, showToolAbilities, upgradeAbility,
        // saveGame, loadGame permanecem como antes]
        
        // Implementação das funções de interface (mantidas do código anterior)
        let toolbarController = null;

        function getToolbarController() {
            if (!toolbarController) {
                toolbarController = createToolbarController({
                    toolbar,
                    toolIndicator,
                    tools,
                    glueState,
                    updateAbilitiesBar,
                    get activeTool() { return activeTool; },
                    set activeTool(value) { activeTool = value; },
                    get blowForce() { return blowForce; },
                    set blowForce(value) { blowForce = value; },
                    get flameActive() { return flameActive; },
                    set flameActive(value) { flameActive = value; },
                });
            }
            return toolbarController;
        }

        function createToolbar() {
            return getToolbarController().createToolbar();
        }

        function setActiveTool(toolId) {
            return getToolbarController().setActiveTool(toolId);
        }
        
        let dartToolController = null;
        function getDartToolController() {
            if (!dartToolController) {
                dartToolController = createDartToolController({
                    updateDartCounter,
                    setDarts(nextDarts) { darts = nextDarts; },
                    get points() { return points; },
                });
            }
            return dartToolController;
        }

        function clearAllDarts() {
            return getDartToolController().clearAllDarts();
        }

        
        let configModalController = null;

        function getConfigModalController() {
            if (!configModalController) {
                configModalController = createConfigModalController({
                    configControls,
                    configLimits,
                    init,
                    clothVisualSystem,
                    get rows() { return rows; },
                    get cols() { return cols; },
                    get config() { return config; },
                });
            }
            return configModalController;
        }

        function createConfigControls() {
            return getConfigModalController().createConfigControls();
        }

        function createClothSidePanel() {
            return initClothSidePanel({
                configLimits,
                clothVisualSystem,
                resetClothSimulation,
                resetClothAndMarks,
                get rows() { return rows; },
                get cols() { return cols; },
                get config() { return config; },
            });
        }
        
        
        // Funções do sistema de upgrades (mantidas do código anterior)
        let upgradeModalController = null;

        function getUpgradeModalController() {
            if (!upgradeModalController) {
                upgradeModalController = createUpgradeModalController({
                    tools,
                    canUpgrade,
                    getUpgradeCost,
                    calculateBaseAttributes,
                    get playerData() { return playerData; },
                });
            }
            return upgradeModalController;
        }

        function createUpgradeModal() {
            return getUpgradeModalController().createUpgradeModal();
        }

        function showToolUpgrades(toolId) {
            return getUpgradeModalController().showToolUpgrades(toolId);
        }
        
        
        let upgradeController = null;

        function getUpgradeController() {
            if (!upgradeController) {
                upgradeController = createUpgradeController({
                    tools,
                    gainXP,
                    updatePlayerDisplay,
                    showToolUpgrades,
                    saveGame,
                    get playerData() { return playerData; },
                    get CANNON_POWER() { return CANNON_POWER; },
                    set CANNON_POWER(value) { CANNON_POWER = value; },
                    get DART_POWER() { return DART_POWER; },
                    set DART_POWER(value) { DART_POWER = value; },
                    get BLOWER_POWER() { return BLOWER_POWER; },
                    set BLOWER_POWER(value) { BLOWER_POWER = value; },
                    get FLAME_POWER() { return FLAME_POWER; },
                    set FLAME_POWER(value) { FLAME_POWER = value; },
                    get MOUSE_POWER() { return MOUSE_POWER; },
                    set MOUSE_POWER(value) { MOUSE_POWER = value; },
                });
            }
            return upgradeController;
        }

        function canUpgrade(toolId, attribute) {
            return getUpgradeController().canUpgrade(toolId, attribute);
        }

        function getUpgradeCost(currentLevel) {
            return getUpgradeController().getUpgradeCost(currentLevel);
        }

        function upgradeTool(toolId, attribute) {
            return getUpgradeController().upgradeTool(toolId, attribute);
        }

        function calculateBaseAttributes() {
            return getUpgradeController().calculateBaseAttributes();
        }
        
        
        let specialModalController = null;

        function getSpecialModalController() {
            if (!specialModalController) {
                specialModalController = createSpecialModalController({
                    tools,
                    specialAbilities,
                    get playerData() { return playerData; },
                });
            }
            return specialModalController;
        }

        function createSpecialModal() {
            return getSpecialModalController().createSpecialModal();
        }

        function showToolAbilities(toolId) {
            return getSpecialModalController().showToolAbilities(toolId);
        }
        
        
        function upgradeAbility(toolId, abilityId) {
            return getAbilitySystemController().upgradeAbility(toolId, abilityId);
        }

        
        let saveController = null;

        function getSaveController() {
            if (!saveController) {
                saveController = createSaveController({
                    tools,
                    specialAbilities,
                    activeAbilities,
                    updatePlayerDisplay,
                    calculateBaseAttributes,
                    get playerData() { return playerData; },
                    set playerData(value) { playerData = value; },
                });
            }
            return saveController;
        }

        function saveGame() {
            return getSaveController().saveGame();
        }

        function loadGame() {
            return getSaveController().loadGame();
        }
        
        
        // ==============================================
        // EVENT LISTENERS ATUALIZADOS
        // ==============================================
        
        // Event Listeners para modais
        registerRuntimeInputHandlers({
            configBtn,
            upgradeBtn,
            specialBtn,
            configModal,
            upgradeModal,
            specialModal,
            closeConfigModal,
            closeUpgradeModal,
            closeSpecialModal,
            resetBtn,
            clearDartsBtn,
            extinguishBtn,
            regenerateClothBtn,
            toolIndicator,
            canvas,
            tools,
            activeAbilities,
            specialAbilities,
            missionState,
            glueState,
            createConfigControls,
            createUpgradeModal,
            showToolUpgrades,
            createSpecialModal,
            showToolAbilities,
            setActiveTool,
            clearAllDarts,
            extinguishAllFire,
            resetClothSimulation,
            activateAbility,
            createToolbar,
            attachHookAt,
            applyScissorCut,
            applyHammerImpact,
            removeGlueNear,
            applyGlueAt,
            fireElectricPulse,
            releaseHook,
            failMission,
            init() {
                init();
                updateClothSidePanel();
            },
            gainXP,
            resetConfig() {
                Object.keys(config).forEach(key => delete config[key]);
                Object.assign(config, createDefaultConfig());
                updateClothSidePanel();
            },
            get Cannonball() { return Cannonball; },
            get Dart() { return Dart; },
            get Particle() { return Particle; },
            get width() { return width; },
            get height() { return height; },
            get CANNON_POWER() { return CANNON_POWER; },
            get DART_POWER() { return DART_POWER; },
            get CLICK_THRESHOLD() { return CLICK_THRESHOLD; },
            get cannonballs() { return cannonballs; },
            get darts() { return darts; },
            get particles() { return particles; },
            get playerData() { return playerData; },
            get mouse() { return mouse; },
            get activeTool() { return activeTool; },
            set activeTool(value) { activeTool = value; },
            get isConfigModalOpen() { return isConfigModalOpen; },
            set isConfigModalOpen(value) { isConfigModalOpen = value; },
            get isUpgradeModalOpen() { return isUpgradeModalOpen; },
            set isUpgradeModalOpen(value) { isUpgradeModalOpen = value; },
            get isSpecialModalOpen() { return isSpecialModalOpen; },
            set isSpecialModalOpen(value) { isSpecialModalOpen = value; },
            get lastMouseDownTime() { return lastMouseDownTime; },
            set lastMouseDownTime(value) { lastMouseDownTime = value; },
            get flameActive() { return flameActive; },
            set flameActive(value) { flameActive = value; },
            get flameAngle() { return flameAngle; },
            set flameAngle(value) { flameAngle = value; },
            get blowForce() { return blowForce; },
            set blowForce(value) { blowForce = value; },
            get blowAngle() { return blowAngle; },
            set blowAngle(value) { blowAngle = value; },
            get laserAngle() { return laserAngle; },
            set laserAngle(value) { laserAngle = value; },
        });

        // ==============================================
        // INICIALIZAO FINAL
        // ==============================================
        

// Compatibilidade: os cards de upgrade/habilidades ainda usam handlers inline gerados dinamicamente.
Object.assign(window, {
    upgradeTool,
    upgradeAbility,
    showToolUpgrades,
    showToolAbilities,
    setActiveTool,
    clearAllDarts,
    extinguishAllFire
});
        loadGame();
        
        createConfigControls();
        createClothSidePanel();
        createToolbar();
        updatePlayerDisplay();
        updateAbilitiesBar();
        
        calculateBaseAttributes();
        
        init();
        updateClothSidePanel();
        animate();
        
        canvas.focus();
        
        console.log('Sistema de Upgrades carregado!');
        console.log('Use ⚡ para upgrades gerais');
        console.log('Use ★ para habilidades especiais');
        console.log('Use Q, E, R, T para ativar habilidades');
        console.log('Ganhe XP interagindo com o tecido!');

}
