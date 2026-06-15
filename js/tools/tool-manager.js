export const tools = {
    mouse: { name: 'Mouse', icon: '🖱️', hotkey: 'M', desc: 'Arraste para interagir' },
    blower: { name: 'Soprador', icon: '💨', hotkey: 'B', desc: 'Sopra o tecido' },
    cannon: { name: 'Canhão', icon: '🎯', hotkey: 'C', desc: 'Atira bolas de canhão' },
    dart: { name: 'Dardo', icon: '📍', hotkey: 'D', desc: 'Prende o tecido' },
    flame: { name: 'Lança-Chamas', icon: '🔥', hotkey: 'L', desc: 'Incendia o tecido' },
    blade: { name: 'Lâmina', icon: '🗡️', hotkey: 'V', desc: 'Corta molas ao arrastar', upgradesDisabled: true },
    hook: { name: 'Gancho', icon: '🪝', hotkey: 'G', desc: 'Prende e puxa o tecido', upgradesDisabled: true },
    drill: { name: 'Broca', icon: '🌀', hotkey: 'O', desc: 'Perfuração concentrada', upgradesDisabled: true },
    laser: { name: 'Laser', icon: '🔴', hotkey: 'Z', desc: 'Corte curto aquecido', upgradesDisabled: true },
    scissor: { name: 'Tesoura', icon: '✂️', hotkey: 'X', desc: 'Corte preciso de conexões', upgradesDisabled: true },
    hammer: { name: 'Martelo', icon: '🔨', hotkey: 'H', desc: 'Impacto local pesado', upgradesDisabled: true },
    acid: { name: 'Ácido', icon: '🧪', hotkey: 'A', desc: 'Corrói materiais com dano lento', upgradesDisabled: true },
    glue: { name: 'Cola', icon: '🔵', hotkey: 'U', desc: 'Prende ou conecta pontos', upgradesDisabled: true },
    electric: { name: 'Elétrico', icon: '⚡', hotkey: 'I', desc: 'Arco elétrico limitado', upgradesDisabled: true },
};

export function createToolManager(state) {
    return {
        setActiveTool(toolId) {
            state.activeTool = toolId;
        },
        getActiveTool() {
            return state.activeTool;
        },
    };
}
