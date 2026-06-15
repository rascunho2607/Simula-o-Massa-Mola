export const mouse = { x: 0, y: 0, px: 0, py: 0, down: false, button: 0 };

export const state = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    rows: 0,
    cols: 0,
    points: [],
    springs: [],
    particles: [],
    fireParticles: [],
    cannonballs: [],
    darts: [],
    gluePins: [],
    glueBridges: [],
    burningPoints: new Set(),
    pinnedByDarts: new Set(),
    impactRings: [],
    toolEffects: [],
    damageParticleBudget: 0,
    frameCount: 0,
    coveredTarget: {
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
        totalCoverElements: 0,
    },
    mouse,
    activeTool: 'mouse',
    blowForce: 0,
    blowAngle: 0,
    flameActive: false,
    flameAngle: 0,
    blowerMode: 'blow',
    hookState: {
        active: false,
        attachedPoint: null,
        attachedSpring: null,
        x: 0,
        y: 0,
        strength: 0,
        ropeLength: 0,
    },
    glueState: {
        mode: 'gluePin',
        pendingPoint: null,
    },
    playerData: null,
    specialAbilities: null,
    activeAbilities: null,
    abilityCooldowns: null,
    modalAbilities: null,
    xpMultiplier: 1,
    CANNON_POWER: 25,
    DART_POWER: 22,
    BLOWER_POWER: 0.2,
    FLAME_POWER: 0.3,
    MOUSE_POWER: 0.5,
    laserAngle: 0,
    lastHammerTime: 0,
    lastElectricTime: 0,
    missionState: {
        activeMissionId: 'freeSandbox',
        started: false,
        completed: false,
        failed: false,
        score: 0,
        timeElapsed: 0,
        damageOutsideTarget: 0,
        targetDamage: 0,
        tissueDamage: 0,
        surgeryDamage: 0,
        fireUsed: false,
        failReason: '',
    },
    isConfigModalOpen: false,
    isUpgradeModalOpen: false,
    isSpecialModalOpen: false,
    isSwitchingTool: false,
    toolSwitchInProgress: false,
    lastMouseDownTime: 0,
};

export function resetSimulationCollections() {
    state.points = [];
    state.springs = [];
    state.particles = [];
    state.fireParticles = [];
    state.cannonballs = [];
    state.darts = [];
    state.gluePins = [];
    state.glueBridges = [];
    state.impactRings = [];
    state.toolEffects = [];
    state.frameCount = 0;
    state.hookState.active = false;
    state.hookState.attachedPoint = null;
    state.hookState.attachedSpring = null;
    state.glueState.pendingPoint = null;
    state.burningPoints.clear();
    state.pinnedByDarts.clear();
}
