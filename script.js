document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.expand();

    // Загрузка сохранённых данных из localStorage
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

    let selectedDifficulty = "easy";
    let selectedPlayerForChallenge = null;

    // Демо-игроки удалены. Здесь будет список реальных игроков с сервера.
    let allOnlinePlayers = [];
    let localLobbies = [];

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

        function updateUI() {
        if (!userData.level || isNaN(userData.level)) userData.level = 1;
        if (userData.xp === undefined || isNaN(userData.xp)) userData.xp = 0;

        let tag = "Новичок";
        if (userData.level >= 3) tag = "Любитель";
        if (userData.level >= 5) tag = "Мастер ⚡";
        if (userData.level >= 8) tag = "Легенда 👑";

        // ТЕПЕРЬ НУЖНО 1000 XP УМНОЖЕННОЕ НА ТЕКУЩИЙ УРОВЕНЬ
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
            if (targetTab === "tab-home") {
                renderOnlinePlayers();
                renderLobbies();
            }
            if (targetTab === "tab-profile") updateUI();
        });
    });

    // Отрисовка списка онлайн игроков
    document.getElementById("btn-refresh-online")?.addEventListener("click", () => renderOnlinePlayers());
    document.getElementById("input-search-player")?.addEventListener("input", (e) => {
        renderOnlinePlayers(e.target.value.toLowerCase());
    });

    function renderOnlinePlayers(query = "") {
        const listEl = document.getElementById("online-players-list");
        if (!listEl) return;
        listEl.innerHTML = "";

        const filtered = allOnlinePlayers.filter(p => p.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="empty-state">Нет игроков в сети. Для игры с друзьями нужен сервер.</div>`;
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
                document.getElementById("info-player-name").textContent = player.name;
                document.getElementById("modal-player-info").classList.remove("hidden");
            });
            listEl.appendChild(card);
        });
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
                <span>${lobby.authorName} (Вызов)</span>
                <div>
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

    // Анимация Колеса
    function startWheelSpin(isAi) {
        tabContents.forEach(c => c.classList.add("hidden"));
        const wheelArea = document.getElementById("wheel-area");
        wheelArea.classList.remove("hidden");

        const wheel = document.getElementById("wheel");
        const resultEl = document.getElementById("wheel-result");
        resultEl.textContent = "Крутим колесо...";

        wheel.style.transition = "none";
        wheel.style.transform = "rotate(0deg)";

        setTimeout(() => {
            wheel.style.transition = "transform 3s cubic-bezier(0.15, 0.85, 0.35, 1.2)";
            
            const isUserX = Math.random() < 0.5;
            const degree = isUserX ? (5 * 360 + 90) : (5 * 360 + 270);

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

    function initGame(isAi, userSymbol) {
        document.getElementById("game-area").classList.remove("hidden");
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

    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", (e) => {
            const idx = e.target.getAttribute("data-index");
            
            if (!gameState.gameActive || gameState.board[idx] !== "") return;
            if (gameState.isAiGame && gameState.currentPlayer !== gameState.playerSymbol) return;

            gameState.board[idx] = gameState.currentPlayer;
            renderBoard();

            if (checkWin(gameState.currentPlayer)) {
            userData.balance += 50;
            userData.wins += 1;
            userData.xp += 70; // Стало +70 XP

            checkLevelUp(); // Используем функцию проверки уровня
            updateUI();
            showGameOver(true, "Вы выиграли! +50 🪙 и +70 XP");
            return;
            }

            if (!gameState.board.includes("")) {
            userData.xp += 20; // +20 XP за ничью
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

    function makeAiMove() {
        if (!gameState.gameActive) return;

        let empty = gameState.board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
        if (empty.length === 0) return;

        let move = selectedDifficulty === "easy" ? empty[Math.floor(Math.random() * empty.length)] : getBestMove();

        gameState.board[move] = gameState.aiSymbol;
        renderBoard();

        if (checkWin(gameState.aiSymbol)) {
    userData.xp = Math.max(0, userData.xp - 10); // Отнимаем 10 XP
    updateUI();
    showGameOver(false, "ИИ победил! -10 XP");
    return;
}


        if (!gameState.board.includes("")) {
    userData.xp += 20; // +20 XP за ничью
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
        renderLobbies();
    });

    document.getElementById("btn-quit")?.addEventListener("click", () => {
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
    renderLobbies();
});
                                                 
