export const clothVisualCategories = [
    'random',
    'abstract',
    'nature',
    'animals',
    'dinosaurs',
    'landscapes',
    'symbols',
    'portrait',
    'mixed',
];

export const pixelArtPalettes = {
    tropical: ['#0b4f6c', '#01baef', '#f7f4d3', '#58b368', '#f6ae2d', '#f26419', '#2f1b25'],
    neon: ['#16161d', '#23f0c7', '#ef476f', '#ffd166', '#7b2ff7', '#f8f7ff', '#0b1026'],
    sunset: ['#2d1e5f', '#642ca9', '#ff5e5b', '#ffb627', '#fff1a8', '#1b1b3a', '#f28482'],
    jungle: ['#0b3d20', '#197c3b', '#76b041', '#f2c14e', '#8c5e2a', '#e8f1a0', '#172a1a'],
    lava: ['#1c0f13', '#4a101e', '#9d0208', '#dc2f02', '#f48c06', '#ffba08', '#2b2d42'],
    pastel: ['#f7d6e0', '#f2b5d4', '#c5decd', '#b8e0d2', '#809bce', '#fff3b0', '#4a4e69'],
    cyber: ['#08111f', '#00f5d4', '#00bbf9', '#f15bb5', '#fee440', '#9b5de5', '#edf2f4'],
    desert: ['#553c2f', '#9c6644', '#ddb892', '#ede0d4', '#e9c46a', '#2a9d8f', '#264653'],
    ocean: ['#031926', '#003554', '#006494', '#00a6fb', '#f4faff', '#fed766', '#1b998b'],
    fossil: ['#2b2118', '#6f5e53', '#b7a99a', '#e6d5b8', '#8a817c', '#d4a373', '#3a5a40'],
};

function fillPixels(ctx, map, colors, cellSize, offsetX, offsetY) {
    map.forEach((row, y) => {
        [...row].forEach((token, x) => {
            const color = colors[token];
            if (!color) return;
            ctx.fillStyle = color;
            ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
        });
    });
}

function drawPixelMap(ctx, map, colors, size = 64) {
    const rows = map.length;
    const cols = Math.max(...map.map(row => row.length));
    const cellSize = Math.floor(size / Math.max(rows, cols));
    const offsetX = Math.floor((size - cols * cellSize) / 2);
    const offsetY = Math.floor((size - rows * cellSize) / 2);
    fillPixels(ctx, map, colors, cellSize, offsetX, offsetY);
}

export const pixelArtMotifs = [
    {
        id: 'sauropod',
        name: 'Sauropode',
        categories: ['dinosaurs', 'animals'],
        palette: 'jungle',
        map: [
            '................',
            '........333.....',
            '.......3333.....',
            '.......33.......',
            '..2222233333....',
            '.22222233333....',
            '.22222222233....',
            '..222222222.....',
            '...22.22.22.....',
            '...22.22.22.....',
            '..44..44..44....',
            '................',
        ],
        colors: { 2: '#58b368', 3: '#9adf7f', 4: '#224f2a' },
    },
    {
        id: 'tigerFace',
        name: 'Rosto de Tigre',
        categories: ['animals'],
        palette: 'tropical',
        map: [
            '....222222....',
            '..223222322..',
            '.22233333222.',
            '.2322002232.',
            '222030030222',
            '223333333322',
            '.2223113222.',
            '..22311322..',
            '...222222...',
        ],
        colors: { 0: '#111111', 1: '#f7f4d3', 2: '#f26419', 3: '#2f1b25' },
    },
    {
        id: 'palmTree',
        name: 'Palmeira',
        categories: ['nature', 'landscapes'],
        palette: 'tropical',
        map: [
            '.....333.....',
            '..333333333..',
            '.333.333.333.',
            '.....222.....',
            '.....222.....',
            '....222......',
            '....222......',
            '...222.......',
            '..444444444..',
        ],
        colors: { 2: '#8c5e2a', 3: '#2fb344', 4: '#f6ae2d' },
    },
    {
        id: 'womanPortrait',
        name: 'Retrato Feminino',
        categories: ['portrait'],
        palette: 'pastel',
        map: [
            '....333333....',
            '...33333333...',
            '..3322222233..',
            '..3220202223..',
            '..3222222223..',
            '...2211122...',
            '....222222....',
            '...44422444...',
            '..4444444444..',
        ],
        colors: { 0: '#4a4e69', 1: '#d77a61', 2: '#f2c6ac', 3: '#33202a', 4: '#809bce' },
    },
    {
        id: 'sunset',
        name: 'Por do Sol',
        categories: ['nature', 'landscapes'],
        palette: 'sunset',
        map: [
            '................',
            '.....5555.......',
            '....555555......',
            '.....5555.......',
            '2222222222222222',
            '3333333333333333',
            '4444444444444444',
            '1111111111111111',
        ],
        colors: { 1: '#2d1e5f', 2: '#ff5e5b', 3: '#ffb627', 4: '#642ca9', 5: '#fff1a8' },
    },
    {
        id: 'moon',
        name: 'Lua',
        categories: ['landscapes', 'symbols'],
        palette: 'ocean',
        map: [
            '....2222....',
            '...22222....',
            '..222.......',
            '..222.......',
            '..2222......',
            '...22222....',
            '....2222....',
        ],
        colors: { 2: '#f4faff' },
    },
    {
        id: 'mountain',
        name: 'Montanha',
        categories: ['nature', 'landscapes'],
        palette: 'ocean',
        map: [
            '.......2........',
            '......222.......',
            '.....22322......',
            '....2223322.....',
            '...222333222....',
            '..22223333222...',
            '.4444444444444..',
        ],
        colors: { 2: '#8a817c', 3: '#f4faff', 4: '#003554' },
    },
    {
        id: 'volcano',
        name: 'Vulcao',
        categories: ['landscapes', 'nature'],
        palette: 'lava',
        map: [
            '......55......',
            '.....5555.....',
            '......44......',
            '.....4444.....',
            '....333333....',
            '...33322333...',
            '..3332222333..',
            '.333222222333.',
        ],
        colors: { 2: '#ffba08', 3: '#4a101e', 4: '#dc2f02', 5: '#f48c06' },
    },
    {
        id: 'skull',
        name: 'Caveira',
        categories: ['symbols'],
        palette: 'fossil',
        map: [
            '..222222..',
            '.22222222.',
            '.22022022.',
            '.22222222.',
            '..222222..',
            '...2002...',
            '...2222...',
        ],
        colors: { 0: '#2b2118', 2: '#e6d5b8' },
    },
    {
        id: 'eye',
        name: 'Olho',
        categories: ['symbols'],
        palette: 'neon',
        map: [
            '...222222...',
            '.222333322.',
            '22233033222',
            '.222333322.',
            '...222222...',
        ],
        colors: { 0: '#16161d', 2: '#23f0c7', 3: '#fee440' },
    },
    {
        id: 'dragon',
        name: 'Dragao',
        categories: ['symbols', 'animals'],
        palette: 'lava',
        map: [
            '...22.....',
            '..2222.5..',
            '.2233225..',
            '2223322...',
            '.222222...',
            '..22.22...',
            '.44..44...',
        ],
        colors: { 2: '#197c3b', 3: '#ffba08', 4: '#1c0f13', 5: '#dc2f02' },
    },
    {
        id: 'flower',
        name: 'Flor',
        categories: ['nature'],
        palette: 'pastel',
        map: [
            '...3.3...',
            '..33333..',
            '.3322233.',
            '..33333..',
            '...323...',
            '....2....',
            '...242...',
            '..24442..',
        ],
        colors: { 2: '#58b368', 3: '#f15bb5', 4: '#76b041' },
    },
    {
        id: 'fish',
        name: 'Peixe',
        categories: ['animals', 'nature'],
        palette: 'ocean',
        map: [
            '....2222....',
            '..2223322.4.',
            '.22223022244',
            '..2223322.4.',
            '....2222....',
        ],
        colors: { 0: '#031926', 2: '#00a6fb', 3: '#fed766', 4: '#1b998b' },
    },
    {
        id: 'planet',
        name: 'Planeta',
        categories: ['symbols'],
        palette: 'cyber',
        map: [
            '....2222....',
            '..22233322..',
            '.2223333322.',
            '444444444444',
            '.2233333222.',
            '..22233222..',
            '....2222....',
        ],
        colors: { 2: '#00bbf9', 3: '#9b5de5', 4: '#fee440' },
    },
    {
        id: 'bolt',
        name: 'Raio',
        categories: ['symbols'],
        palette: 'neon',
        map: [
            '.....2...',
            '....22...',
            '...222...',
            '..222222.',
            '.....22..',
            '....22...',
            '...22....',
        ],
        colors: { 2: '#fee440' },
    },
    {
        id: 'temple',
        name: 'Templo',
        categories: ['symbols', 'landscapes'],
        palette: 'desert',
        map: [
            '.....2.....',
            '....222....',
            '...22222...',
            '..3333333..',
            '..3.3.3.3..',
            '..3.3.3.3..',
            '.444444444.',
        ],
        colors: { 2: '#e9c46a', 3: '#ede0d4', 4: '#9c6644' },
    },
    {
        id: 'lizard',
        name: 'Lagarto',
        categories: ['animals', 'nature'],
        palette: 'jungle',
        map: [
            '...2222....',
            '..222222...',
            '2222032222.',
            '..222222.22',
            '...22.22...',
            '..44..44...',
        ],
        colors: { 0: '#172a1a', 2: '#76b041', 3: '#f2c14e', 4: '#0b3d20' },
    },
    {
        id: 'trex',
        name: 'T-Rex',
        categories: ['dinosaurs', 'animals'],
        palette: 'fossil',
        map: [
            '....22222..',
            '...222022..',
            '...22222...',
            '.222222....',
            '22222222...',
            '..22.22....',
            '..44.44....',
        ],
        colors: { 0: '#2b2118', 2: '#6f9f5e', 4: '#2b2118' },
    },
    {
        id: 'triceratops',
        name: 'Triceratops',
        categories: ['dinosaurs', 'animals'],
        palette: 'fossil',
        map: [
            '..4.222.4..',
            '.422222224.',
            '..2202022..',
            '...22222...',
            '..2222222..',
            '.22.22.22.',
        ],
        colors: { 0: '#2b2118', 2: '#8a817c', 4: '#e6d5b8' },
    },
    {
        id: 'bird',
        name: 'Ave',
        categories: ['animals', 'nature'],
        palette: 'tropical',
        map: [
            '....2.....',
            '...222....',
            '..22322...',
            '.2220322..',
            '..22222...',
            '...2.2....',
            '..4...4...',
        ],
        colors: { 0: '#2f1b25', 2: '#01baef', 3: '#f6ae2d', 4: '#2f1b25' },
    },
    {
        id: 'forest',
        name: 'Floresta',
        categories: ['nature', 'landscapes'],
        palette: 'jungle',
        map: [
            '..2...3...2..',
            '.222.333.222.',
            '..2...3...2..',
            '..4...4...4..',
            '.242.343.242.',
            '4444444444444',
        ],
        colors: { 2: '#76b041', 3: '#197c3b', 4: '#0b3d20' },
    },
];

export function getMotifsForCategory(category) {
    if (!category || category === 'mixed' || category === 'random') return pixelArtMotifs;
    if (category === 'abstract') return [];
    return pixelArtMotifs.filter(motif => motif.categories.includes(category));
}

export function drawMotifToCanvas(ctx, motif, size = 64) {
    if (!motif) return;
    drawPixelMap(ctx, motif.map, motif.colors, size);
}
