window.onerror = function(msg, url, lineNo) {
    console.error("ОШИБКА: " + msg + "\nСтрока: " + lineNo);
    return false;
};

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBnno6oojFNGV7SgLktVr6Ro65UnfUg0Ik",
    authDomain: "tictactoe-online-cf8e5.firebaseapp.com",
    databaseURL: "https://tictactoe-online-cf8e5-default-rtdb.firebaseio.com",
    projectId: "tictactoe-online-cf8e5",
    storageBucket: "tictactoe-online-cf8e5.firebasestorage.app",
    messagingSenderId: "224911679143",
    appId: "1:224911679143:web:4e628064f3f636617ac582",
    measurementId: "G-JTML3Q850K"
};

let db = null;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
    }
} catch (e) {
    console.error("Ошибка Firebase:", e);
}

const tg = window.Telegram?.WebApp;
if (tg) {
    try {
        tg.ready();
        tg.expand();
    } catch(e) {}
}

// Данные пользователя
const savedData = localStorage.getItem("tictactoe_user_data");
let userData = savedData ? JSON.parse(savedData) : {
    id: tg?.initDataUnsafe?.user?.id || "guest_" + Math.floor(Math.random() * 1000),
    name: tg?.initDataUnsafe?.user?.first_name || "Игрок",
    balance: 200,
    pencils: 0,
    xp: 0,
    level: 1,
    wins: 0,
    inventory: ["default"],
    equippedSkin: { id: "default", name: "Классика", x: "❌", o: "⭕" }
};

if (userData.pencils === undefined) userData.pencils = 0;

function saveData() {
    localStorage.setItem("tictactoe_user_data", JSON.stringify(userData));
}

function checkLevelUp() {
    const neededXp = userData.level * 1000;
    if (userData.xp >= neededXp) {
        userData.level += 1;
        userData.xp -= neededXp;
    }
}

let selectedDifficulty = "easy";
let selectedPlayerForChallenge = null;
let allOnlinePlayers = [];
let localLobbies = [];

if (db) {
    try {
        const playerRef = db.ref('players/' + userData.id);
        playerRef.set({
            id: userData.id,
            name: userData.name,
            level: userData.level || 1,
            wins: userData.wins || 0,
            status: "online"
        });
        playerRef.onDisconnect().remove();

        db.ref('players').on('value', (snapshot) => {
            const data = snapshot.val();
            allOnlinePlayers = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    if (String(key) !== String(userData.id)) {
                        allOnlinePlayers.push(data[key]);
                    }
                });
            }
            renderOnlinePlayers();
        });
    } catch(e) {
        console.error("Ошибка сети Firebase:", e);
    }
}

// ИВЕНТОВЫЕ СКИНЫ С КАРТИНКАМИ
const eventSkinsCatalog = [
    { 
        id: "school_pen", 
        name: "Ручка vs Карандаш", 
        x: '<img src="https://cdn-icons-png.flaticon.com/512/1250/1250615.png" class="skin-img">', 
        o: '<img src="https://cdn-icons-png.flaticon.com/512/588/588395.png" class="skin-img">', 
        pricePencils: 900, 
        isEvent: true 
    },
    { 
        id: "school_bag", 
        name: "Портфель vs Дневник", 
        x: '<img src="https://cdn-icons-png.flaticon.com/512/2921/2921222.png" class="skin-img">', 
        o: '<img src="https://cdn-icons-png.flaticon.com/512/2232/2232688.png" class="skin-img">', 
        pricePencils: 1500, 
        isEvent: true 
    },
    { 
        id: "school_geo", 
        name: "Глобус vs Карта", 
        x: '<img src="https://cdn-icons-png.flaticon.com/512/2921/2921226.png" class="skin-img">', 
        o: '<img src="https://cdn-icons-png.flaticon.com/512/854/854878.png" class="skin-img">', 
        pricePencils: 2000, 
        isEvent: true 
    }
];

// ОБЫЧНЫЕ СКИНЫ (ИСХОДНЫЕ + 10 НОВЫХ)
const skinsCatalog = [
    { id: "default", name: "Классика", x: "❌", o: "⭕", price: 0 },
    { id: "emoji", name: "Смайлики", x: "😀", o: "😎", price: 50 },
    { id: "fire_ice", name: "Огонь и Лёд", x: "🔥", o: "❄️", price: 100 },
    { id: "pirate", name: "Пираты", x: "🏴‍☠️", o: "🦜", price: 150 },
    { id: "star_moon", name: "Космос", x: "⭐", o: "🌙", price: 200 },
    { id: "halloween", name: "Хэллоуин", x: "🎃", o: "👻", price: 300 },
    { id: "fruit", name: "Фрукты", x: "🍎", o: "🍌", price: 350 },
    { id: "sport", name: "Спорт", x: "⚽", o: "🏀", price: 450 },
    { id: "animals", name: "Животные", x: "🐱", o: "🐶", price: 550 },
    { id: "ninja", name: "Ниндзя", x: "⚔️", o: "🛡️", price: 650 },
    { id: "food", name: "Еда", x: "🍕", o: "🍔", price: 750 },
    { id: "tech", name: "Технологии", x: "💻", o: "📱", price: 850 },
    { id: "royal", name: "Королевский", x: "👑", o: "💎", price: 1000 },
    { id: "magic", name: "Магия", x: "🔮", o: "🪄", price: 1200 },
    { id: "cyber", name: "Киберпанк", x: "🤖", o: "👾", price: 1500 },
    { id: "diamond_vip", name: "Алмазный VIP", x: "💎", o: "🔱", price: 2500 }
];

let gameState = {
    board: ["", "", "", "", "", "", "", "", ""],
    currentPlayer: "X",
    playerSymbol: "X",
    aiSymbol: "O",
    gameActive: false,
    isAiGame: true
};

function updateUI() {
    if (!userData.level || isNaN(userData.level)) userData.level = 1;
    if (userData.xp === undefined || isNaN(userData.xp)) userData.xp = 0;

    let tag = "Новичок";
    if (userData.level >= 3) tag = "Любитель";
    if (userData.level >= 5) tag = "Мастер ⚡";
    if (userData.level >= 8) tag = "Легенда 👑";

    const neededXp = userData.level * 1000;
    const xpPercent = Math.min(100, Math.floor((userData.xp / neededXp) * 100));

    const setTxt = (id, txt) => { 
        const el = document.getElementById(id); 
        if (el) el.textContent = txt; 
    };

    setTxt("user-balance", userData.balance);
    setTxt("user-pencils", userData.pencils);
    setTxt("event-pencils-count", "✏️ " + userData.pencils);
    setTxt("user-name", userData.name);
    setTxt("prof-name", userData.name);
    setTxt("prof-balance", userData.balance);
    setTxt("prof-wins", userData.wins);
    setTxt("prof-skin-name", userData.equippedSkin ? userData.equippedSkin.name : "Классика");
    setTxt("prof-level", userData.level);
    setTxt("prof-tag", tag);
    setTxt("prof-xp-text", `${userData.xp} / ${neededXp} XP`);

    const xpBar = document.getElementById("prof-xp-bar");
    if (xpBar) xpBar.style.width = `${xpPercent}%`;

    saveData();
}

function initEvents() {
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            navButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.add("hidden"));
            
            document.getElementById("game-area")?.classList.add("hidden");
            document.getElementById("wheel-area")?.classList.add("hidden");

            btn.classList.add("active");
            document.getElementById(targetTab)?.classList.remove("hidden");

            if (targetTab === "tab-shop") renderShop();
            if (targetTab === "tab-event") renderEventShop();
            if (targetTab === "tab-home") {
                renderOnlinePlayers();
                renderLobbies();
            }
            if (targetTab === "tab-profile") updateUI();
        });
    });

    document.getElementById("btn-refresh-online")?.addEventListener("click", () => renderOnlinePlayers());
    document.getElementById("input-search-player")?.addEventListener("input", (e) => {
        renderOnlinePlayers(e.target.value.toLowerCase());
    });

    document.getElementById("btn-close-player-info")?.addEventListener("click", () => {
        document.getElementById("modal-player-info")?.classList.add("hidden");
    });

    document.getElementById("btn-send-challenge")?.addEventListener("click", () => {
        if (!selectedPlayerForChallenge) return;
        localLobbies.push({ authorName: selectedPlayerForChallenge.name });
        document.getElementById("modal-player-info")?.classList.add("hidden");
        renderLobbies();
        alert(`Заявка отправлена игроку ${selectedPlayerForChallenge.name}!`);
    });

    const modalAi = document.getElementById("modal-ai");
    document.getElementById("btn-open-ai-modal")?.addEventListener("click", () => {
        modalAi?.classList.remove("hidden");
    });
    
    document.getElementById("btn-cancel-ai")?.addEventListener("click", () => {
        modalAi?.classList.add("hidden");
    });

    document.getElementById("btn-ai-easy")?.addEventListener("click", () => {
        selectedDifficulty = "easy";
        modalAi?.classList.add("hidden");
        startWheelSpin(true);
    });

    document.getElementById("btn-ai-hard")?.addEventListener("click", () => {
        selectedDifficulty = "hard";
        modalAi?.classList.add("hidden");
        startWheelSpin(true);
    });

    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", (e) => {
            const idx = e.currentTarget.getAttribute("data-index");
            
            if (!gameState.gameActive || gameState.board[idx] !== "") return;
            if (gameState.isAiGame && gameState.currentPlayer !== gameState.playerSymbol) return;

            gameState.board[idx] = gameState.currentPlayer;
            renderBoard();

            if (checkWin(gameState.currentPlayer)) {
                userData.balance += 50;
                userData.pencils += 10;
                userData.wins += 1;
                userData.xp += 70;
                checkLevelUp();
                updateUI();
                showGameOver(true, "Победа! +50 🪙, +10 ✏️ Карандашей и +70 XP");
                return;
            }

            if (!gameState.board.includes("")) {
                userData.xp += 20;
                checkLevelUp();
                updateUI();
                showGameOver(false, "Ничья! +20 XP");
                return;
            }

            gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X";
            updateGameStatus();

            if (gameState.isAiGame && gameState.currentPlayer === gameState.aiSymbol) {
                setTimeout(makeAiMove, 400);
            }
        });
    });

    document.getElementById("btn-go-home")?.addEventListener("click", () => {
        document.getElementById("modal-game-over")?.classList.add("hidden");
        document.getElementById("game-area")?.classList.add("hidden");
        document.getElementById("tab-home")?.classList.remove("hidden");
        renderOnlinePlayers();
        renderLobbies();
    });

    document.getElementById("btn-quit")?.addEventListener("click", () => {
        document.getElementById("game-area")?.classList.add("hidden");
        document.getElementById("tab-home")?.classList.remove("hidden");
    });

    updateUI();
    renderOnlinePlayers();
    renderLobbies();
}

function renderOnlinePlayers(query = "") {
    const listEl = document.getElementById("online-players-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    const filtered = allOnlinePlayers.filter(p => p.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
        listEl.innerHTML = `<div class="empty-state">Нет игроков в сети</div>`;
        return;
    }

    filtered.forEach(player => {
        const card = document.createElement("div");
        card.className = "player-online-card";
        card.innerHTML = `
            <span style="font-weight:bold;">${player.name}</span>
            <span style="color:#38ef7d; font-size:12px;">Онлайн 🟢</span>
        `;
        card.addEventListener("click", () => {
            selectedPlayerForChallenge = player;
            const nameEl = document.getElementById("info-player-name");
            if (nameEl) nameEl.textContent = player.name;
            document.getElementById("modal-player-info")?.classList.remove("hidden");
        });
        listEl.appendChild(card);
    });
}

function renderLobbies() {
    const listEl = document.getElementById("lobbies-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    if (localLobbies.length === 0) {
        listEl.innerHTML = `<div class="empty-state">Нет активных заявок</div>`;
        return;
    }

    localLobbies.forEach((lobby, index) => {
        const card = document.createElement("div");
        card.className = "duel-card";
        card.innerHTML = `
            <span>${lobby.authorName} (Вызов)</span>
            <div>
                <button class="btn-accept btn btn-blue-bright btn-sm" data-index="${index}">Принять</button>
                <button class="btn-decline btn btn-red btn-sm" data-index="${index}">✕</button>
            </div>
        `;
        listEl.appendChild(card);
    });

    document.querySelectorAll(".btn-accept").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = e.target.getAttribute("data-index");
            localLobbies.splice(idx, 1);
            renderLobbies();
            startWheelSpin(false);
        });
    });

    document.querySelectorAll(".btn-decline").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = e.target.getAttribute("data-index");
            localLobbies.splice(idx, 1);
            renderLobbies();
        });
    });
}

function startWheelSpin(isAi) {
    document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
    const wheelArea = document.getElementById("wheel-area");
    wheelArea?.classList.remove("hidden");

    const wheel = document.getElementById("wheel");
    const resultEl = document.getElementById("wheel-result");
    if (resultEl) resultEl.textContent = "Крутим колесо...";

    if (wheel) {
        wheel.style.transition = "none";
        wheel.style.transform = "rotate(0deg)";
    }

    setTimeout(() => {
        if (wheel) wheel.style.transition = "transform 3s cubic-bezier(0.15, 0.85, 0.35, 1.2)";
        
        const isUserX = Math.random() < 0.5;
        const degree = isUserX ? (5 * 360 + 90) : (5 * 360 + 270);

        if (wheel) wheel.style.transform = `rotate(${degree}deg)`;

        setTimeout(() => {
            const userSymbol = isUserX ? "X" : "O";
            const userIcon = isUserX ? userData.equippedSkin.x : userData.equippedSkin.o;
            if (resultEl) resultEl.innerHTML = `Твой символ: ${userIcon}`;

            setTimeout(() => {
                wheelArea?.classList.add("hidden");
                initGame(isAi, userSymbol);
            }, 1200);
        }, 3000);
    }, 50);
}

function initGame(isAi, userSymbol) {
    document.getElementById("game-area")?.classList.remove("hidden");
    gameState.board = ["", "", "", "", "", "", "", "", ""];
    gameState.gameActive = true;
    gameState.isAiGame = isAi;
    gameState.playerSymbol = userSymbol;
    gameState.aiSymbol = userSymbol === "X" ? "O" : "X";
    gameState.currentPlayer = "X";

    renderBoard();
    updateGameStatus();

    if (isAi && gameState.playerSymbol === "O") {
        setTimeout(makeAiMove, 500);
    }
}

function updateGameStatus() {
    const icon = gameState.currentPlayer === "X" ? userData.equippedSkin.x : userData.equippedSkin.o;
    const statusEl = document.getElementById("game-status");
    if (statusEl) statusEl.innerHTML = `Ход: ${icon}`;
}

function renderBoard() {
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell, idx) => {
        const val = gameState.board[idx];
        if (val === "X") cell.innerHTML = userData.equippedSkin.x;
        else if (val === "O") cell.innerHTML = userData.equippedSkin.o;
        else cell.innerHTML = "";
    });
}

function makeAiMove() {
    if (!gameState.gameActive) return;

    let empty = gameState.board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
    if (empty.length === 0) return;

    let move = selectedDifficulty === "easy" ? empty[Math.floor(Math.random() * empty.length)] : getBestMove();

    gameState.board[move] = gameState.aiSymbol;
    renderBoard();

    if (checkWin(gameState.aiSymbol)) {
        userData.xp = Math.max(0, userData.xp - 10);
        updateUI();
        showGameOver(false, "ИИ победил! -10 XP");
        return;
    }

    if (!gameState.board.includes("")) {
        userData.xp += 20;
        checkLevelUp();
        updateUI();
        showGameOver(false, "Ничья! +20 XP");
        return;
    }

    gameState.currentPlayer = gameState.playerSymbol;
    updateGameStatus();
}

function getBestMove() {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let p of wins) {
        let [a, b, c] = p;
        if (gameState.board[a] === gameState.aiSymbol && gameState.board[b] === gameState.aiSymbol && gameState.board[c] === "") return c;
        if (gameState.board[a] === gameState.aiSymbol && gameState.board[c] === gameState.aiSymbol && gameState.board[b] === "") return b;
        if (gameState.board[b] === gameState.aiSymbol && gameState.board[c] === gameState.aiSymbol && gameState.board[a] === "") return a;
    }
    for (let p of wins) {
        let [a, b, c] = p;
        if (gameState.board[a] === gameState.playerSymbol && gameState.board[b] === gameState.playerSymbol && gameState.board[c] === "") return c;
        if (gameState.board[a] === gameState.playerSymbol && gameState.board[c] === gameState.playerSymbol && gameState.board[b] === "") return b;
        if (gameState.board[b] === gameState.playerSymbol && gameState.board[c] === gameState.playerSymbol && gameState.board[a] === "") return a;
    }
    if (gameState.board[4] === "") return 4;
    let empty = gameState.board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
    return empty[Math.floor(Math.random() * empty.length)];
}

function checkWin(symbol) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return wins.some(p => p.every(i => gameState.board[i] === symbol));
}

function showGameOver(isWin, desc) {
    gameState.gameActive = false;
    const modal = document.getElementById("modal-game-over");
    const tEl = document.getElementById("game-over-title");
    const iEl = document.getElementById("game-over-icon");
    const dEl = document.getElementById("game-over-desc");
    if (tEl) tEl.textContent = isWin ? "ПОБЕДА!" : "ИГРА ОКОНЧЕНА";
    if (iEl) iEl.textContent = isWin ? "🎉" : "⚔️";
    if (dEl) dEl.textContent = desc;
    modal?.classList.remove("hidden");
}

function renderEventShop() {
    const eventShopList = document.getElementById("event-shop-list");
    if (!eventShopList) return;
    eventShopList.innerHTML = "";

    eventSkinsCatalog.forEach(skin => {
        const isBought = userData.inventory.includes(skin.id);
        const isEquipped = userData.equippedSkin && userData.equippedSkin.id === skin.id;

        const card = document.createElement("div");
        card.className = "shop-card";
        card.innerHTML = `
            <div>
                <b>${skin.name}</b>
                <div class="skin-icons" style="display:flex; align-items:center; gap:8px; margin-top:5px;">
                    ${skin.x} <span>vs</span> ${skin.o}
                </div>
                <div style="font-size: 12px; color: #ff9f43; margin-top:4px;">
                    ${isBought ? "Куплено ✅" : "Цена: " + skin.pricePencils + " ✏️"}
                </div>
            </div>
            <div>
                ${isEquipped 
                    ? '<button class="btn btn-blue-dark btn-sm" disabled>Надето</button>'
                    : isBought 
                    ? `<button class="btn btn-blue-bright btn-sm btn-equip-event" data-id="${skin.id}">Надеть</button>`
                    : `<button class="btn btn-blue-bright btn-sm btn-buy-event" data-id="${skin.id}">Купить</button>`
                }
            </div>
        `;
        eventShopList.appendChild(card);
    });

    document.querySelectorAll(".btn-buy-event").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const skinId = e.target.getAttribute("data-id");
            const skin = eventSkinsCatalog.find(s => s.id === skinId);
            if (userData.pencils >= skin.pricePencils) {
                userData.pencils -= skin.pricePencils;
                userData.inventory.push(skin.id);
                userData.equippedSkin = skin;
                updateUI();
                renderEventShop();
                alert(`Вы приобрели скин "${skin.name}"!`);
            } else {
                alert("Недостаточно Карандашей! Побеждай в играх (+10 ✏️ за победу).");
            }
        });
    });

    document.querySelectorAll(".btn-equip-event").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const skinId = e.target.getAttribute("data-id");
            const skin = eventSkinsCatalog.find(s => s.id === skinId);
            userData.equippedSkin = skin;
            updateUI();
            renderEventShop();
        });
    });
}

function renderShop() {
    const shopList = document.getElementById("shop-list");
    if (!shopList) return;
    shopList.innerHTML = "";

    skinsCatalog.forEach(skin => {
        const isBought = userData.inventory.includes(skin.id);
        const isEquipped = userData.equippedSkin && userData.equippedSkin.id === skin.id;

        const card = document.createElement("div");
        card.className = "shop-card";
        card.innerHTML = `
            <div>
                <b>${skin.name}</b>
                <div class="skin-icons">${skin.x} ${skin.o}</div>
                <div style="font-size: 12px; color: #8a9ba8; margin-top:2px;">${isBought ? "Куплено" : "Цена: " + skin.price + " 🪙"}</div>
            </div>
            <div>
                ${isEquipped 
                    ? '<button class="btn btn-blue-dark btn-sm" disabled>Надето</button>'
                    : isBought 
                    ? `<button class="btn btn-blue-bright btn-sm btn-equip" data-id="${skin.id}">Надеть</button>`
                    : `<button class="btn btn-blue-bright btn-sm btn-buy" data-id="${skin.id}">Купить</button>`
                }
            </div>
        `;
        shopList.appendChild(card);
    });

    document.querySelectorAll(".btn-buy").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const skinId = e.target.getAttribute("data-id");
            const skin = skinsCatalog.find(s => s.id === skinId);
            if (userData.balance >= skin.price) {
                userData.balance -= skin.price;
                userData.inventory.push(skin.id);
                userData.equippedSkin = skin;
                updateUI();
                renderShop();
            } else {
                alert("Недостаточно монет!");
            }
        });
    });

    document.querySelectorAll(".btn-equip").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const skinId = e.target.getAttribute("data-id");
            const skin = skinsCatalog.find(s => s.id === skinId);
            userData.equippedSkin = skin;
            updateUI();
            renderShop();
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEvents);
} else {
    initEvents();
}
