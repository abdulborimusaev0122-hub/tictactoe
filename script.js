document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.expand();

    let userData = {
        id: tg?.initDataUnsafe?.user?.id || "guest",
        name: tg?.initDataUnsafe?.user?.first_name || "Игрок",
        balance: 200,
        inventory: ["default"],
        equippedSkin: { id: "default", x: "❌", o: "⭕" }
    };

    let selectedDifficulty = "easy";
    let selectedPlayerForChallenge = null;

    let allOnlinePlayers = [
        { id: 101, name: "Алексей ⚡" },
        { id: 102, name: "Тимур 🔥" },
        { id: 103, name: "София 💎" },
        { id: 104, name: "Даниил 🚀" }
    ];

    let localLobbies = [];

    const balanceEl = document.getElementById("user-balance");
    const nameEl = document.getElementById("user-name");
    const profName = document.getElementById("prof-name");
    const profBalance = document.getElementById("prof-balance");

    const gameArea = document.getElementById("game-area");
    const wheelArea = document.getElementById("wheel-area");
    const gameStatus = document.getElementById("game-status");
    const cells = document.querySelectorAll(".cell");

    const skinsCatalog = [
        { id: "default", name: "Классический", x: "❌", o: "⭕", price: 0 },
        { id: "fire_ice", name: "Огонь и Лёд", x: "🔥", o: "❄️", price: 100 },
        { id: "star_moon", name: "Космос", x: "⭐", o: "🌙", price: 250 }
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
        if (balanceEl) balanceEl.textContent = userData.balance;
        if (nameEl) nameEl.textContent = userData.name;
        if (profName) profName.textContent = userData.name;
        if (profBalance) profBalance.textContent = userData.balance;
    }

    // Вкладки
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            navButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.add("hidden"));
            
            gameArea.classList.add("hidden");
            wheelArea.classList.add("hidden");

            btn.classList.add("active");
            document.getElementById(targetTab)?.classList.remove("hidden");

            if (targetTab === "tab-shop") renderShop();
            if (targetTab === "tab-home") {
                renderOnlinePlayers();
                renderLobbies();
            }
        });
    });

    // Поиск и обновление игроков
    document.getElementById("btn-refresh-online")?.addEventListener("click", () => {
        renderOnlinePlayers();
    });

    document.getElementById("input-search-player")?.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        renderOnlinePlayers(query);
    });

    function renderOnlinePlayers(query = "") {
        const listEl = document.getElementById("online-players-list");
        if (!listEl) return;
        listEl.innerHTML = "";

        const filtered = allOnlinePlayers.filter(p => p.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="empty-state">Игроки не найдены</div>`;
            return;
        }

        filtered.forEach(player => {
            const card = document.createElement("div");
            card.className = "player-online-card";
            card.innerHTML = `
                <span class="opponent-name">${player.name}</span>
                <span style="color:#38ef7d; font-size:12px;">Онлайн 🟢</span>
            `;
            card.addEventListener("click", () => openPlayerInfo(player));
            listEl.appendChild(card);
        });
    }

    function openPlayerInfo(player) {
        selectedPlayerForChallenge = player;
        document.getElementById("info-player-name").textContent = player.name;
        document.getElementById("modal-player-info").classList.remove("hidden");
    }

    document.getElementById("btn-close-player-info")?.addEventListener("click", () => {
        document.getElementById("modal-player-info").classList.add("hidden");
    });

    document.getElementById("btn-send-challenge")?.addEventListener("click", () => {
        if (!selectedPlayerForChallenge) return;
        localLobbies.push({ authorName: selectedPlayerForChallenge.name });
        document.getElementById("modal-player-info").classList.add("hidden");
        renderLobbies();
        alert(`Заявка отправлена игроку ${selectedPlayerForChallenge.name}!`);
    });

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
                <div class="duel-info">
                    <span class="opponent-name">${lobby.authorName}</span>
                    <span style="color:#8a9ba8; font-size:12px;">(Дуэль)</span>
                </div>
                <div class="duel-actions">
                    <button class="btn-accept" data-index="${index}">Принять</button>
                    <button class="btn-decline" data-index="${index}">✕</button>
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

    // Выбор сложности ИИ
    const modalAi = document.getElementById("modal-ai");
    document.getElementById("btn-open-ai-modal")?.addEventListener("click", () => modalAi.classList.remove("hidden"));
    document.getElementById("btn-cancel-ai")?.addEventListener("click", () => modalAi.classList.add("hidden"));

    document.getElementById("btn-ai-easy")?.addEventListener("click", () => {
        selectedDifficulty = "easy";
        modalAi.classList.add("hidden");
        startWheelSpin(true);
    });

    document.getElementById("btn-ai-hard")?.addEventListener("click", () => {
        selectedDifficulty = "hard";
        modalAi.classList.add("hidden");
        startWheelSpin(true);
    });

    // Анимация Колеса (Выбор крестика или нолика)
    function startWheelSpin(isAi) {
        tabContents.forEach(c => c.classList.add("hidden"));
        wheelArea.classList.remove("hidden");

        const wheel = document.getElementById("wheel");
        const resultEl = document.getElementById("wheel-result");
        resultEl.textContent = "Крутим колесо...";

        // Сброс трансформы для повторной анимации
        wheel.style.transition = "none";
        wheel.style.transform = "rotate(0deg)";

        // Запуск плавной анимации через 50мс
        setTimeout(() => {
            wheel.style.transition = "transform 3s cubic-bezier(0.15, 0.85, 0.35, 1.2)";
            
            // Выбор роли: Ты Крестик (X) или Ты Нолик (O)
            const isUserX = Math.random() < 0.5;
            const extraTurns = 5; 
            const degree = isUserX ? (extraTurns * 360 + 90) : (extraTurns * 360 + 270);

            wheel.style.transform = `rotate(${degree}deg)`;

            setTimeout(() => {
                const userSymbol = isUserX ? "X" : "O";
                const userIcon = isUserX ? userData.equippedSkin.x : userData.equippedSkin.o;
                resultEl.textContent = `Твой символ: ${userIcon}!`;

                setTimeout(() => {
                    wheelArea.classList.add("hidden");
                    initGame(isAi, userSymbol);
                }, 1200);
            }, 3000);
        }, 50);
    }

    // Запуск игры
    function initGame(isAi, userSymbol) {
        gameArea.classList.remove("hidden");
        gameState.board = ["", "", "", "", "", "", "", "", ""];
        gameState.gameActive = true;
        gameState.isAiGame = isAi;
        gameState.playerSymbol = userSymbol;
        gameState.aiSymbol = userSymbol === "X" ? "O" : "X";
        gameState.currentPlayer = "X"; // Первым всегда ходит Крестик

        renderBoard();
        updateGameStatus();

        // Если ИИ ходит первым (если игрок выпал как Нолик)
        if (isAi && gameState.playerSymbol === "O") {
            setTimeout(makeAiMove, 500);
        }
    }

    function updateGameStatus() {
        const icon = gameState.currentPlayer === "X" ? userData.equippedSkin.x : userData.equippedSkin.o;
        if (gameStatus) gameStatus.textContent = `Ход: ${icon}`;
    }

    function renderBoard() {
        cells.forEach((cell, idx) => {
            const val = gameState.board[idx];
            if (val === "X") cell.textContent = userData.equippedSkin.x;
            else if (val === "O") cell.textContent = userData.equippedSkin.o;
            else cell.textContent = "";
        });
    }

    cells.forEach(cell => {
        cell.addEventListener("click", (e) => {
            const idx = e.target.getAttribute("data-index");
            
            // Проверка, твой ли сейчас ход
            if (!gameState.gameActive || gameState.board[idx] !== "") return;
            if (gameState.isAiGame && gameState.currentPlayer !== gameState.playerSymbol) return;

            gameState.board[idx] = gameState.currentPlayer;
            renderBoard();

            if (checkWin(gameState.currentPlayer)) {
                showGameOver(true, "Вы выиграли! +50 Креликов");
                userData.balance += 50;
                updateUI();
                return;
            }

            if (!gameState.board.includes("")) {
                showGameOver(false, "Ничья!");
                return;
            }

            gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X";
            updateGameStatus();

            if (gameState.isAiGame && gameState.currentPlayer === gameState.aiSymbol) {
                setTimeout(makeAiMove, 400);
            }
        });
    });

    function makeAiMove() {
        if (!gameState.gameActive) return;

        let empty = gameState.board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
        if (empty.length === 0) return;

        let move;
        if (selectedDifficulty === "easy") {
            move = empty[Math.floor(Math.random() * empty.length)];
        } else {
            move = getBestMove();
        }

        gameState.board[move] = gameState.aiSymbol;
        renderBoard();

        if (checkWin(gameState.aiSymbol)) {
            showGameOver(false, "ИИ победил!");
            return;
        }

        if (!gameState.board.includes("")) {
            showGameOver(false, "Ничья!");
            return;
        }

        gameState.currentPlayer = gameState.playerSymbol;
        updateGameStatus();
    }

    function getBestMove() {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        
        // Победа ИИ
        for (let p of wins) {
            let [a, b, c] = p;
            if (gameState.board[a] === gameState.aiSymbol && gameState.board[b] === gameState.aiSymbol && gameState.board[c] === "") return c;
            if (gameState.board[a] === gameState.aiSymbol && gameState.board[c] === gameState.aiSymbol && gameState.board[b] === "") return b;
            if (gameState.board[b] === gameState.aiSymbol && gameState.board[c] === gameState.aiSymbol && gameState.board[a] === "") return a;
        }

        // Блокировка игрока
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
        document.getElementById("game-over-title").textContent = isWin ? "ПОБЕДА!" : "ИГРА ОКОНЧЕНА";
        document.getElementById("game-over-icon").textContent = isWin ? "🎉" : "⚔️";
        document.getElementById("game-over-desc").textContent = desc;
        modal.classList.remove("hidden");
    }

    document.getElementById("btn-go-home")?.addEventListener("click", () => {
        document.getElementById("modal-game-over").classList.add("hidden");
        gameArea.classList.add("hidden");
        document.getElementById("tab-home")?.classList.remove("hidden");
        renderOnlinePlayers();
        renderLobbies();
    });

    document.getElementById("btn-quit")?.addEventListener("click", () => {
        gameArea.classList.add("hidden");
        document.getElementById("tab-home")?.classList.remove("hidden");
    });

    function renderShop() {
        const shopList = document.getElementById("shop-list");
        if (!shopList) return;
        shopList.innerHTML = "";

        skinsCatalog.forEach(skin => {
            const isBought = userData.inventory.includes(skin.id);
            const isEquipped = userData.equippedSkin.id === skin.id;

            const item = document.createElement("div");
            item.className = "shop-item";
            item.innerHTML = `
                <div>
                    <b>${skin.name}</b> (${skin.x} ${skin.o})
                    <div style="font-size: 12px; color: #8a9ba8;">${isBought ? "Куплено" : "Цена: " + skin.price + " 🪙"}</div>
                </div>
                <div>
                    ${isEquipped 
                        ? '<button class="btn btn-blue-dark" style="padding:6px 12px;" disabled>Надето</button>'
                        : isBought 
                        ? `<button class="btn btn-blue-bright btn-equip" style="padding:6px 12px;" data-id="${skin.id}">Надеть</button>`
                        : `<button class="btn btn-blue-bright btn-buy" style="padding:6px 12px;" data-id="${skin.id}">Купить</button>`
                    }
                </div>
            `;
            shopList.appendChild(item);
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

    updateUI();
    renderOnlinePlayers();
    renderLobbies();
});
                                                  
