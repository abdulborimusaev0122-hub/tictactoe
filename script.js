// Конфигурация и инициализация Firebase
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.expand();

    const savedData = localStorage.getItem("tictactoe_user_data");
    
    let userData = savedData ? JSON.parse(savedData) : {
        id: tg?.initDataUnsafe?.user?.id || "guest_" + Math.floor(Math.random() * 1000),
        name: tg?.initDataUnsafe?.user?.first_name || "Игрок",
        balance: 200,
        xp: 0,
        level: 1,
        wins: 0,
        inventory: ["default"],
        equippedSkin: { id: "default", name: "Классика", x: "❌", o: "⭕" }
    };

    function saveData() {
        localStorage.setItem("tictactoe_user_data", JSON.stringify(userData));
    }

    // --- СЕТЕВАЯ ИНИЦИАЛИЗАЦИЯ ---
    const playerRef = db.ref('players/' + userData.id);
    playerRef.set({
        id: userData.id,
        name: userData.name,
        level: userData.level || 1,
        wins: userData.wins || 0,
        status: "online"
    });
    playerRef.onDisconnect().remove();

    let selectedDifficulty = "easy";
    let selectedPlayerForChallenge = null;
    let currentGameId = null;
    let currentGameRef = null;

    let allOnlinePlayers = [];

                              // Слушаем онлайн игроков
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

    // Слушаем входящие вызовы по сети
    db.ref('challenges/' + userData.id).on('value', (snapshot) => {
        const challenges = snapshot.val();
        renderLobbies(challenges);
    });

    const skinsCatalog = [
        { id: "default", name: "Классика", x: "❌", o: "⭕", price: 0 },
        { id: "fire_ice", name: "Огонь и Лёд", x: "🔥", o: "❄️", price: 100 },
        { id: "star_moon", name: "Космос", x: "⭐", o: "🌙", price: 200 },
        { id: "fruit", name: "Фруктовый Микс", x: "🍎", o: "🍌", price: 350 },
        { id: "animal", name: "Джунгли", x: "🦁", o: "🐯", price: 500 },
        { id: "ninja", name: "Ниндзя", x: "⚔️", o: "🛡️", price: 650 },
        { id: "magic", name: "Магия", x: "🪄", o: "🔮", price: 800 },
        { id: "royal", name: "Королевский", x: "👑", o: "💎", price: 1000 },
        { id: "toxic", name: "Заражение", x: "☣️", o: "💀", price: 1250 },
        { id: "cyber", name: "Киберпанк", x: "⚡", o: "🤖", price: 1500 },
        { id: "space", name: "Пришельцы", x: "🛸", o: "👾", price: 1800 },
        { id: "dragon", name: "Драконы", x: "🐉", o: "🐲", price: 2200 },
        { id: "ghost", name: "Мистика", x: "👻", o: "🎃", price: 2700 },
        { id: "neon", name: "Неоновый Взрыв", x: "🌀", o: "💥", price: 3500 },
        { id: "godly", name: "Божественный", x: "🔱", o: "☀️", price: 5000 }
    ];

    let gameState = {
        board: ["", "", "", "", "", "", "", "", ""],
        currentPlayer: "X",
        playerSymbol: "X",
        aiSymbol: "O",
        gameActive: false,
        isAiGame: true
    };

    function checkLevelUp() {
        const neededXp = userData.level * 1000;
        if (userData.xp >= neededXp) {
            userData.xp -= neededXp;
            userData.level += 1;
            alert(`🎉 Поздравляем! Ты alcanzó ${userData.level} уровень!`);
        }
    }

    function updateUI() {
        if (!userData.level || isNaN(userData.level)) userData.level = 1;
        if (userData.xp === undefined || isNaN(userData.xp)) userData.xp = 0;

        let tag = "Новичок";
        if (userData.level >= 3) tag = "Любитель";
        if (userData.level >= 5) tag = "Мастер ⚡";
        if (userData.level >= 8) tag = "Легенда 👑";

        const neededXp = userData.level * 1000;
        const xpPercent = Math.min(100, Math.floor((userData.xp / neededXp) * 100));

        document.getElementById("user-balance").textContent = userData.balance;
        document.getElementById("user-name").textContent = userData.name;

        document.getElementById("prof-name").textContent = userData.name;
        document.getElementById("prof-balance").textContent = userData.balance;
        document.getElementById("prof-wins").textContent = userData.wins;
        document.getElementById("prof-skin-name").textContent = userData.equippedSkin.name;
        document.getElementById("prof-level").textContent = userData.level;
        document.getElementById("prof-tag").textContent = tag;
        document.getElementById("prof-xp-text").textContent = `${userData.xp} / ${neededXp} XP`;
        document.getElementById("prof-xp-bar").style.width = `${xpPercent}%`;

        saveData();
    }
        // Навигация
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            navButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.add("hidden"));
            
            document.getElementById("game-area").classList.add("hidden");
            document.getElementById("wheel-area").classList.add("hidden");

            btn.classList.add("active");
            document.getElementById(targetTab)?.classList.remove("hidden");

            if (targetTab === "tab-shop") renderShop();
            if (targetTab === "tab-home") renderOnlinePlayers();
            if (targetTab === "tab-profile") updateUI();
        });
    });

    // Список игроков онлайн
    function renderOnlinePlayers(query = "") {
        const listEl = document.getElementById("online-players-list");
        if (!listEl) return;
        listEl.innerHTML = "";

        const filtered = allOnlinePlayers.filter(p => p.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="empty-state">Нет других игроков в сети.</div>`;
            return;
        }

        filtered.forEach(player => {
            const card = document.createElement("div");
            card.className = "player-online-card";
            card.innerHTML = `
                <span style="font-weight:bold;">${player.name} (Ур. ${player.level || 1})</span>
                <span style="color:#38ef7d; font-size:12px;">Вызвать ⚔️</span>
            `;
            card.addEventListener("click", () => {
                selectedPlayerForChallenge = player;
                document.getElementById("info-player-name").textContent = player.name;
                document.getElementById("modal-player-info").classList.remove("hidden");
            });
            listEl.appendChild(card);
        });
    }

    document.getElementById("btn-close-player-info")?.addEventListener("click", () => {
        document.getElementById("modal-player-info").classList.add("hidden");
    });

    // Отправка сетевого вызова
    document.getElementById("btn-send-challenge")?.addEventListener("click", () => {
        if (!selectedPlayerForChallenge) return;

        const challengeId = "ch_" + Date.now();
        db.ref('challenges/' + selectedPlayerForChallenge.id + '/' + challengeId).set({
            fromId: userData.id,
            fromName: userData.name,
            challengeId: challengeId
        });

        document.getElementById("modal-player-info").classList.add("hidden");
        alert(`Заявка отправлена игроку ${selectedPlayerForChallenge.name}!`);
    });

    // Отрисовка списка входящих вызовов
    function renderLobbies(challenges) {
        const listEl = document.getElementById("lobbies-list");
        if (!listEl) return;
        listEl.innerHTML = "";

        if (!challenges) {
            listEl.innerHTML = `<div class="empty-state">Нет активных заявок</div>`;
            return;
        }

        Object.keys(challenges).forEach(chId => {
            const item = challenges[chId];
            const card = document.createElement("div");
            card.className = "duel-card";
            card.innerHTML = `
                <span><b>${item.fromName}</b> вызывает тебя!</span>
                <div>
                    <button class="btn-accept" data-id="${chId}" data-from="${item.fromId}">Принять</button>
                    <button class="btn-decline" data-id="${chId}">✕</button>
                </div>
            `;
            listEl.appendChild(card);
        });

        document.querySelectorAll(".btn-accept").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const chId = e.target.getAttribute("data-id");
                const opponentId = e.target.getAttribute("data-from");

                // Удаляем вызов и создаем сетевую комнатную игру
                db.ref('challenges/' + userData.id + '/' + chId).remove();
                
                const gameId = "game_" + Date.now();
                db.ref('games/' + gameId).set({
                    board: ["", "", "", "", "", "", "", "", ""],
                    turn: "X",
                    playerX: opponentId,
                    playerO: userData.id,
                    status: "active"
                });

                // Уведомляем противника
                db.ref('active_games/' + opponentId).set({ gameId: gameId, symbol: "X" });
                startOnlineGame(gameId, "O");
            });
        });

        document.querySelectorAll(".btn-decline").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const chId = e.target.getAttribute("data-id");
                db.ref('challenges/' + userData.id + '/' + chId).remove();
            });
        });
    }

    // Ожидание подключения к созданной игре для вызвавшего игрока
    db.ref('active_games/' + userData.id).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.gameId) {
            const gameId = data.gameId;
            const mySymbol = data.symbol;
            db.ref('active_games/' + userData.id).remove();
            startOnlineGame(gameId, mySymbol);
        }
    });

    // Запуск сетевого матча
    function startOnlineGame(gameId, symbol) {
        currentGameId = gameId;
        currentGameRef = db.ref('games/' + gameId);

        gameState.isAiGame = false;
        gameState.playerSymbol = symbol;
        
        tabContents.forEach(c => c.classList.add("hidden"));
        document.getElementById("game-area").classList.remove("hidden");

        // Подписываемся на обновления доски в Firebase
        currentGameRef.on('value', (snapshot) => {
            const gameData = snapshot.val();
            if (!gameData) return;

            gameState.board = gameData.board;
            gameState.currentPlayer = gameData.turn;
            gameState.gameActive = gameData.status === "active";

            renderBoard();
            updateGameStatus();

            if (gameData.winner) {
                if (gameData.winner === gameState.playerSymbol) {
                    userData.balance += 50;
                    userData.wins += 1;
                    userData.xp += 70;
                    checkLevelUp();
                    updateUI();
                    showGameOver(true, "Вы победили в онлайн-дуэли! +50 🪙 и +70 XP");
                } else if (gameData.winner === "draw") {
                    userData.xp += 20;
                    checkLevelUp();
                    updateUI();
                    showGameOver(false, "Ничья! +20 XP");
                } else {
                    userData.xp = Math.max(0, userData.xp - 10);
                    updateUI();
                    showGameOver(false, "Соперник победил! -10 XP");
                }
                currentGameRef.off();
            }
        });
               }
                                // Выбор сложности ИИ
    const modalAi = document.getElementById("modal-ai");
    document.getElementById("btn-open-ai-modal")?.addEventListener("click", () => modalAi.classList.remove("hidden"));
    document.getElementById("btn-cancel-ai")?.addEventListener("click", () => modalAi.classList.add("hidden"));

    document.getElementById("btn-ai-easy")?.addEventListener("click", () => {
        selectedDifficulty = "easy";
        modalAi.classList.add("hidden");
        initAiGame();
    });

    document.getElementById("btn-ai-hard")?.addEventListener("click", () => {
        selectedDifficulty = "hard";
        modalAi.classList.add("hidden");
        initAiGame();
    });

    function initAiGame() {
        tabContents.forEach(c => c.classList.add("hidden"));
        document.getElementById("game-area").classList.remove("hidden");
        gameState.board = ["", "", "", "", "", "", "", "", ""];
        gameState.gameActive = true;
        gameState.isAiGame = true;
        gameState.playerSymbol = "X";
        gameState.aiSymbol = "O";
        gameState.currentPlayer = "X";

        renderBoard();
        updateGameStatus();
    }

    function updateGameStatus() {
        const icon = gameState.currentPlayer === "X" ? userData.equippedSkin.x : userData.equippedSkin.o;
        document.getElementById("game-status").textContent = `Ход: ${icon}`;
    }

    function renderBoard() {
        const cells = document.querySelectorAll(".cell");
        cells.forEach((cell, idx) => {
            const val = gameState.board[idx];
            if (val === "X") cell.textContent = userData.equippedSkin.x;
            else if (val === "O") cell.textContent = userData.equippedSkin.o;
            else cell.textContent = "";
        });
    }

    // Клик по клетке
    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", (e) => {
            const idx = e.target.getAttribute("data-index");
            
            if (!gameState.gameActive || gameState.board[idx] !== "") return;

            // Если игра сетевая
            if (!gameState.isAiGame) {
                if (gameState.currentPlayer !== gameState.playerSymbol) return;

                const newBoard = [...gameState.board];
                newBoard[idx] = gameState.playerSymbol;
                const nextTurn = gameState.playerSymbol === "X" ? "O" : "X";

                let winner = null;
                if (checkWinBoard(newBoard, gameState.playerSymbol)) {
                    winner = gameState.playerSymbol;
                } else if (!newBoard.includes("")) {
                    winner = "draw";
                }

                currentGameRef.update({
                    board: newBoard,
                    turn: nextTurn,
                    status: winner ? "finished" : "active",
                    winner: winner
                });
                return;
            }

            // Если игра с ИИ
            if (gameState.currentPlayer !== gameState.playerSymbol) return;

            gameState.board[idx] = gameState.currentPlayer;
            renderBoard();

            if (checkWin(gameState.currentPlayer)) {
                userData.balance += 50;
                userData.wins += 1;
                userData.xp += 70;
                checkLevelUp();
                updateUI();
                showGameOver(true, "Вы выиграли! +50 🪙 и +70 XP");
                return;
            }

            if (!gameState.board.includes("")) {
                userData.xp += 20;
                checkLevelUp();
                updateUI();
                showGameOver(false, "Ничья! +20 XP");
                return;
            }

            gameState.currentPlayer = "O";
            updateGameStatus();
            setTimeout(makeAiMove, 400);
        });
    });

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
        return checkWinBoard(gameState.board, symbol);
    }

    function checkWinBoard(board, symbol) {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        return wins.some(p => p.every(i => board[i] === symbol));
    }

    function showGameOver(isWin, desc) {
        gameState.gameActive = false;
        const modal = document.getElementById("modal-game-over");
        document.getElementById("game-over-title").textContent = isWin ? "ПОБЕДА!" : "ИГРА ОКОНЧЕНА";
        document.getElementById("game-over-icon").textContent = isWin ? "🎉" : "⚔️";
        document.getElementById("game-over-desc").textContent = desc;
        modal.classList.remove("hidden");
    }

    document.getElementById("btn-go-home")?.addEventListener("click", () => {
        document.getElementById("modal-game-over").classList.add("hidden");
        document.getElementById("game-area").classList.add("hidden");
        document.getElementById("tab-home")?.classList.remove("hidden");
        renderOnlinePlayers();
    });

    document.getElementById("btn-quit")?.addEventListener("click", () => {
        if (currentGameRef) currentGameRef.off();
        document.getElementById("game-area").classList.add("hidden");
        document.getElementById("tab-home")?.classList.remove("hidden");
    });

    function renderShop() {
        const shopList = document.getElementById("shop-list");
        if (!shopList) return;
        shopList.innerHTML = "";

        skinsCatalog.forEach(skin => {
            const isBought = userData.inventory.includes(skin.id);
            const isEquipped = userData.equippedSkin.id === skin.id;

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
                        ? '<button class="btn btn-blue-dark" style="padding:8px 14px;" disabled>Надето</button>'
                        : isBought 
                        ? `<button class="btn btn-blue-bright btn-equip" style="padding:8px 14px;" data-id="${skin.id}">Надеть</button>`
                        : `<button class="btn btn-blue-bright btn-buy" style="padding:8px 14px;" data-id="${skin.id}">Купить</button>`
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
                    alert("Недостаточно монет! Играй и побеждай.");
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

    updateUI();
    renderOnlinePlayers();
});
                        
