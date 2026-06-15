export function createSpecialAbilities() {
    const specialAbilities = {
        cannon: {
            ricochet: { name: 'Ricochete', desc: 'Bola quica nas bordas', level: 0, maxLevel: 3, cost: [50, 100, 200], type: 'passive' },
            explosion: { name: 'Explosão', desc: 'Cria área de efeito ao atingir', level: 0, maxLevel: 2, cost: [100, 200], type: 'active', cooldown: 5000, hotkey: 'Q' },
            fragmentation: { name: 'Fragmentação', desc: 'Divide em múltiplas bolas', level: 0, maxLevel: 3, cost: [75, 150, 300], type: 'passive' },
            guided: { name: 'Teleguiado', desc: 'Controlável após disparo', level: 0, maxLevel: 1, cost: [250], type: 'active', cooldown: 10000, hotkey: 'E' },
            rapidfire: { name: 'Furioso', desc: 'Dispara rajadas (3-5 tiros)', level: 0, maxLevel: 2, cost: [150, 300], type: 'passive' },
        },
        dart: {
            delayed: { name: 'Explosão Retardada', desc: 'Detona após tempo configurável', level: 0, maxLevel: 2, cost: [60, 120], type: 'active', cooldown: 6000, hotkey: 'Q' },
            chain: { name: 'Corrente Elétrica', desc: 'Conecta pontos com dano elétrico', level: 0, maxLevel: 2, cost: [100, 200], type: 'active', cooldown: 7000, hotkey: 'E' },
            multishot: { name: 'Multi-Dardo', desc: 'Dispara 3 dardos em leque', level: 0, maxLevel: 2, cost: [80, 160], type: 'passive' },
            magnet: { name: 'Ímã', desc: 'Atrai pontos próximos', level: 0, maxLevel: 2, cost: [90, 180], type: 'active', cooldown: 8000, hotkey: 'R' },
            portal: { name: 'Portal', desc: 'Teletransporta tecido entre dois dardos', level: 0, maxLevel: 1, cost: [300], type: 'active', cooldown: 15000, hotkey: 'T' },
        },
        blower: {
            vortex: { name: 'Vórtice', desc: 'Cria redemoinho que persiste', level: 0, maxLevel: 2, cost: [70, 140], type: 'active', cooldown: 5000, hotkey: 'Q' },
            freeze: { name: 'Congelante', desc: 'Retarda/paralisa pontos', level: 0, maxLevel: 2, cost: [90, 180], type: 'active', cooldown: 6000, hotkey: 'E' },
            repulse: { name: 'Repulsor', desc: 'Empurra com força aumentada', level: 0, maxLevel: 3, cost: [50, 100, 200], type: 'passive' },
            suction: { name: 'Sucção', desc: 'Puxa pontos para o centro', level: 0, maxLevel: 1, cost: [150], type: 'modal', hotkey: 'R' },
            tornado: { name: 'Tornado', desc: 'Efeito em larga escala que se move', level: 0, maxLevel: 2, cost: [200, 400], type: 'active', cooldown: 12000, hotkey: 'T' },
        },
        flame: {
            spread: { name: 'Propagação', desc: 'Fogo se espalha mais rápido', level: 0, maxLevel: 3, cost: [60, 120, 240], type: 'passive' },
            colors: { name: 'Chamas Coloridas', desc: 'Diferentes cores com efeitos', level: 0, maxLevel: 2, cost: [80, 160], type: 'passive' },
            sparks: { name: 'Faíscas', desc: 'Dispara faíscas em todas as direções', level: 0, maxLevel: 2, cost: [100, 200], type: 'active', cooldown: 5000, hotkey: 'Q' },
            ring: { name: 'Anel de Fogo', desc: 'Cria perímetro de fogo', level: 0, maxLevel: 1, cost: [250], type: 'active', cooldown: 10000, hotkey: 'E' },
            phoenix: { name: 'Fênix', desc: 'Ressurge das cinzas', level: 0, maxLevel: 1, cost: [400], type: 'active', cooldown: 30000, hotkey: 'R' },
        },
        mouse: {
            web: { name: 'Teia', desc: 'Cria conexões temporárias', level: 0, maxLevel: 2, cost: [50, 100], type: 'active', cooldown: 4000, hotkey: 'Q' },
            shield: { name: 'Campo de Força', desc: 'Área de proteção que repele', level: 0, maxLevel: 2, cost: [120, 240], type: 'active', cooldown: 8000, hotkey: 'E' },
            slime: { name: 'Gosma', desc: 'Deixa pontos grudentos', level: 0, maxLevel: 2, cost: [70, 140], type: 'passive' },
            magnet: { name: 'Ímã Seletivo', desc: 'Atrai/repel seletivamente', level: 0, maxLevel: 2, cost: [90, 180], type: 'modal', hotkey: 'R' },
            duplicate: { name: 'Duplicação', desc: 'Cria cópia espelhada', level: 0, maxLevel: 1, cost: [300], type: 'active', cooldown: 15000, hotkey: 'T' },
        },
    };

    Object.assign(specialAbilities, {
        blade: specialAbilities.blade || {},
        hook: specialAbilities.hook || {},
        drill: specialAbilities.drill || {},
        laser: specialAbilities.laser || {},
        scissor: specialAbilities.scissor || {},
        hammer: specialAbilities.hammer || {},
        acid: specialAbilities.acid || {},
        glue: specialAbilities.glue || {},
        electric: specialAbilities.electric || {},
    });

    return specialAbilities;
}

export function createActiveAbilities() {
    const activeAbilities = {
        cannon: [],
        dart: [],
        blower: [],
        flame: [],
        mouse: [],
    };

    Object.assign(activeAbilities, {
        blade: activeAbilities.blade || [],
        hook: activeAbilities.hook || [],
        drill: activeAbilities.drill || [],
        laser: activeAbilities.laser || [],
        scissor: activeAbilities.scissor || [],
        hammer: activeAbilities.hammer || [],
        acid: activeAbilities.acid || [],
        glue: activeAbilities.glue || [],
        electric: activeAbilities.electric || [],
    });

    return activeAbilities;
}

export function createAbilityCooldowns() {
    return {};
}

export function createModalAbilities() {
    return {};
}

export const specialAbilities = createSpecialAbilities();
export const activeAbilities = createActiveAbilities();
export const abilityCooldowns = createAbilityCooldowns();
export const modalAbilities = createModalAbilities();
