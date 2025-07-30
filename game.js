// --- DOM Elements ---
const monsterCountInput = document.getElementById('monster-count');
const potionCountInput = document.getElementById('potion-count');
const startResetButton = document.getElementById('start-reset-button');

const mapContainer = document.getElementById('map-container');
const statusContainer = document.getElementById('status');
const logContainer = document.getElementById('log');
const statusPanel = document.getElementById('status-panel');

// --- Game Constants ---
const MAP_WIDTH = 35;
const MAP_HEIGHT = 20;

const TILES = {
    EMPTY: ' ',
    FLOOR: '<span class="text-gray-500">.</span>',
    WALL: '<span class="text-gray-400">#</span>',
    PLAYER: '<span class="text-white font-bold">@</span>',
    MONSTER: '<span class="text-red-500 font-bold">g</span>',
    POTION: '<span class="text-blue-400 font-bold">p</span>',
    STAIRS: '<span class="text-yellow-400 font-bold">&gt;</span>'
};

// Enemy types with different stats and appearances
const ENEMY_TYPES = {
    slime: {
        name: 'スライム',
        symbol: '<span class="text-green-400 font-bold">s</span>',
        hp: 2,
        maxHp: 2,
        damage: 1,
        minFloor: 1
    },
    goblin: {
        name: 'ゴブリン',
        symbol: '<span class="text-red-500 font-bold">g</span>',
        hp: 3,
        maxHp: 3,
        damage: 1,
        minFloor: 2
    },
    orc: {
        name: 'オーク',
        symbol: '<span class="text-orange-500 font-bold">o</span>',
        hp: 5,
        maxHp: 5,
        damage: 2,
        minFloor: 4
    },
    dragon: {
        name: 'ドラゴン',
        symbol: '<span class="text-purple-500 font-bold">D</span>',
        hp: 10,
        maxHp: 10,
        damage: 3,
        minFloor: 7
    }
};

// --- Game State ---
let map, player, monsters, items;
let gameOver = true, turn = 0, floor = 0, maxFloor = 0;
let baseMonsterCount, potionCount;

// --- Game Logic ---

function setupInitialScreen() {
    gameOver = true;
    mapContainer.classList.add('initial');
    mapContainer.innerHTML = '<div class="text-gray-400">「ゲーム開始」を押して開始</div>';
    
    statusContainer.innerHTML = `
        <p>階層: -</p>
        <p>HP: - / -</p>
        <p>[<span class="text-gray-600">----------</span>]</p>
        <p>Turn: -</p>
    `;

    clearLog();
    addLog("ようこそ！設定を調整してゲームを開始してください。");
    startResetButton.textContent = "ゲーム開始";
    startResetButton.classList.remove('bg-red-600', 'hover:bg-red-700');
    startResetButton.classList.add('bg-green-600', 'hover:bg-green-700');
}

function initGame() {
    let monsterVal = parseInt(monsterCountInput.value);
    let potionVal = parseInt(potionCountInput.value);
    
    if (isNaN(monsterVal)) monsterVal = 10;
    if (isNaN(potionVal)) potionVal = 10;

    baseMonsterCount = Math.max(0, Math.min(20, monsterVal));
    potionCount = Math.max(0, Math.min(10, potionVal));

    monsterCountInput.value = baseMonsterCount;
    potionCountInput.value = potionCount;
    
    mapContainer.classList.remove('initial');

    gameOver = false; 
    player = { x: 0, y: 0, hp: 10, maxHp: 10 };
    floor = 0;
    maxFloor = 0;
    
    clearLog();
    addLog('ダンジョンへようこそ！');
    
    startResetButton.textContent = "新しいゲーム";
    startResetButton.classList.remove('bg-green-600', 'hover:bg-green-700');
    startResetButton.classList.add('bg-red-600', 'hover:bg-red-700');
    
    nextFloor(); 
}

function nextFloor() {
    floor++;
    maxFloor = Math.max(floor, maxFloor);
    turn = 1;

    if (player) player.hp = player.maxHp;
    if (floor > 1) addLog(`地下${floor}階に降りた。HPが全回復した。`);

    map = generateMap();
    monsters = [];
    items = [];
    
    const playerStart = placePlayer();
    player.x = playerStart.x;
    player.y = playerStart.y;
    
    placeEntities(baseMonsterCount + (floor - 1), 'monster'); 
    placeEntities(potionCount, 'potion');
    placeEntities(1, 'stairs');
    
    drawAll();
}

function generateMap() {
    const newMap = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TILES.WALL));
    const rooms = [];
    const numRooms = 5 + Math.floor(Math.random() * 5);

    for (let i = 0; i < numRooms; i++) {
        const w = 4 + Math.floor(Math.random() * 6);
        const h = 4 + Math.floor(Math.random() * 6);
        const x = 1 + Math.floor(Math.random() * (MAP_WIDTH - w - 2));
        const y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - h - 2));
        
        const newRoom = { x, y, w, h };
        let failed = false;
        for (const otherRoom of rooms) {
            if (isRectOverlap(newRoom, otherRoom)) {
                failed = true;
                break;
            }
        }
        if (!failed) {
            createRoom(newMap, newRoom);
            if (rooms.length > 0) {
                const prevRoom = rooms[rooms.length - 1];
                connectRooms(newMap, prevRoom, newRoom);
            }
            rooms.push(newRoom);
        }
    }
    return newMap;
}

function isRectOverlap(r1, r2) {
     return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

function createRoom(map, room) {
    for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
            map[y][x] = TILES.FLOOR;
        }
    }
}

function connectRooms(map, room1, room2) {
    const center1 = { x: room1.x + Math.floor(room1.w/2), y: room1.y + Math.floor(room1.h/2)};
    const center2 = { x: room2.x + Math.floor(room2.w/2), y: room2.y + Math.floor(room2.h/2)};
    let x = center1.x;
    let y = center1.y;
    while(x !== center2.x || y !== center2.y) {
         if (x !== center2.x && Math.random() < 0.5) {
            map[y][x] = TILES.FLOOR;
            x += Math.sign(center2.x - x);
        } else if (y !== center2.y) {
            map[y][x] = TILES.FLOOR;
            y += Math.sign(center2.y - y);
        } else {
            map[y][x] = TILES.FLOOR;
            x += Math.sign(center2.x - x);
        }
    }
    map[y][x] = TILES.FLOOR;
}

function placePlayer() {
    let x, y;
    do {
        x = Math.floor(Math.random() * MAP_WIDTH);
        y = Math.floor(Math.random() * MAP_HEIGHT);
    } while (map[y][x] !== TILES.FLOOR);
    return { x, y };
}

function selectEnemyType(currentFloor) {
    // Get available enemy types for current floor
    const availableTypes = Object.entries(ENEMY_TYPES)
        .filter(([_, enemy]) => currentFloor >= enemy.minFloor)
        .map(([key, enemy]) => ({ key, ...enemy }));
    
    if (availableTypes.length === 0) {
        // Default to slime if no enemies available
        return { ...ENEMY_TYPES.slime };
    }
    
    // Weight selection towards newer enemy types on higher floors
    const weights = availableTypes.map((_, index) => index + 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < availableTypes.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return { ...availableTypes[i] };
        }
    }
    
    // Fallback to last available type
    return { ...availableTypes[availableTypes.length - 1] };
}

function placeEntities(count, type) {
    const maxCount = count < 0 ? 0 : count;
    for (let i = 0; i < maxCount; i++) {
        let x, y, attempts = 0;
        do {
            x = Math.floor(Math.random() * MAP_WIDTH);
            y = Math.floor(Math.random() * MAP_HEIGHT);
            attempts++;
        } while ((map[y][x] !== TILES.FLOOR || isOccupied(x, y)) && attempts < 100);

        if (attempts >= 100) continue; 

        if (type === 'monster') {
            const enemyType = selectEnemyType(floor);
            monsters.push({ 
                x, 
                y, 
                ...enemyType,
                type: enemyType.name
            });
        } else if (type === 'potion') {
            items.push({ x, y, type: 'potion' });
        } else if (type === 'stairs') {
             items.push({ x, y, type: 'stairs' });
        }
    }
}

function isOccupied(x, y) {
    if (player && player.x === x && player.y === y) return true;
    if (monsters.some(m => m.x === x && m.y === y)) return true;
    if (items.some(i => i.x === x && i.y === y)) return true;
    return false;
}

function drawAll() {
    drawMap();
    drawStatus();
}

function drawMap() {
    let html = '';
    for (let y = 0; y < MAP_HEIGHT; y++) {
        let row = '';
        for (let x = 0; x < MAP_WIDTH; x++) {
            const monster = monsters.find(m => m.x === x && m.y === y);
            const item = items.find(i => i.x === x && i.y === y);

            if (player.x === x && player.y === y) {
                row += TILES.PLAYER;
            } else if (monster) {
                row += monster.symbol;
            } else if (item) {
                row += item.type === 'potion' ? TILES.POTION : TILES.STAIRS;
            } else {
                row += map[y][x];
            }
        }
        html += row + '<br>';
    }
    mapContainer.innerHTML = html;
}

function drawStatus() {
    const currentHp = Math.max(0, player.hp);
    const hpBar = `[<span class="text-red-400">${'♥'.repeat(currentHp)}</span><span class="text-gray-600">${'♥'.repeat(player.maxHp - currentHp)}</span>]`;
    
    statusContainer.innerHTML = `
        <p>階層: B${floor}F</p>
        <p>HP: ${player.hp} / ${player.maxHp}</p>
        <p>${hpBar}</p>
        <p>Turn: ${turn}</p>
    `;
}

function addLog(message) {
    const logEntry = document.createElement('p');
    logEntry.textContent = message;
    if (logContainer.firstChild) {
        logContainer.insertBefore(logEntry, logContainer.firstChild);
    } else {
        logContainer.appendChild(logEntry);
    }
    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function clearLog() {
    logContainer.innerHTML = '';
}

function movePlayer(dx, dy) {
    if (gameOver) return;
    const newX = player.x + dx;
    const newY = player.y + dy;
    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) return;
    if (map[newY][newX] === TILES.WALL) {
        addLog('壁にぶつかった。');
        return;
    }

    const monster = monsters.find(m => m.x === newX && m.y === newY);
    if (monster) {
        attack(player, monster);
    } else {
        player.x = newX;
        player.y = newY;
        const itemIndex = items.findIndex(i => i.x === player.x && i.y === player.y);
        if (itemIndex > -1) {
            const item = items[itemIndex];
            if (item.type === 'potion') {
                player.hp = Math.min(player.maxHp, player.hp + 5);
                addLog('ポーションを飲んでHPが5回復した！');
                items.splice(itemIndex, 1);
            } else if (item.type === 'stairs') {
                nextFloor();
                return;
            }
        }
    }
    endPlayerTurn();
}

function endPlayerTurn() {
    turn++;
    moveMonsters();
    drawAll();
    checkGameOver();
}

function moveMonsters() {
    monsters.forEach(monster => {
        const dx = Math.sign(player.x - monster.x);
        const dy = Math.sign(player.y - monster.y);
        let targetX = monster.x;
        let targetY = monster.y;

        if (dx !== 0 && dy !== 0) {
            if (Math.random() < 0.5) targetX += dx;
            else targetY += dy;
        } else if (dx !== 0) targetX += dx;
        else if (dy !== 0) targetY += dy;

        if (targetX === player.x && targetY === player.y) {
            attack(monster, player);
        } else if (canMoveTo(monster, targetX, targetY)) {
            monster.x = targetX;
            monster.y = targetY;
        }
    });
}

function canMoveTo(monster, x, y) {
    return map[y][x] !== TILES.WALL && !monsters.some(m => m !== monster && m.x === x && m.y === y);
}

function attack(attacker, defender) {
    const damage = attacker === player ? 1 : (attacker.damage || 1);
    defender.hp -= damage;
    const attackerName = attacker === player ? 'プレイヤー' : attacker.type;
    const defenderName = defender === player ? 'プレイヤー' : defender.type;
    addLog(`${attackerName}は${defenderName}に${damage}のダメージを与えた！`);
    if (defender.hp <= 0) {
        addLog(`${defenderName}を倒した！`);
        if (defender !== player) monsters = monsters.filter(m => m !== defender);
    }
}

function checkGameOver() {
    if (player.hp <= 0 && !gameOver) {
        gameOver = true;
        addLog('あなたは倒れた... ゲームオーバー。');
        addLog(`到達階層: 地下${maxFloor}階`);
        startResetButton.textContent = "もう一度挑戦";
        startResetButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        startResetButton.classList.add('bg-green-600', 'hover:bg-green-700');
    }
}

function handleKeyPress(e) {
    if (gameOver) return;
    
    let dx = 0, dy = 0;
    switch (e.key) {
        case 'ArrowUp': dy = -1; break;
        case 'ArrowDown': dy = 1; break;
        case 'ArrowLeft': dx = -1; break;
        case 'ArrowRight': dx = 1; break;
        default: return;
    }
    e.preventDefault();
    if (dx !== 0 || dy !== 0) movePlayer(dx, dy);
}

// --- Event Listeners ---
window.addEventListener('keydown', handleKeyPress);
startResetButton.addEventListener('click', initGame);

// Touch controls setup
document.getElementById('touch-up').addEventListener('click', () => movePlayer(0, -1));
document.getElementById('touch-down').addEventListener('click', () => movePlayer(0, 1));
document.getElementById('touch-left').addEventListener('click', () => movePlayer(-1, 0));
document.getElementById('touch-right').addEventListener('click', () => movePlayer(1, 0));

// --- Initial Load ---
setupInitialScreen();