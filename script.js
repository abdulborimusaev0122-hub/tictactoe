document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.expand();

    let userData = {
        balance: 200,
        wins: 0,
        losses: 0,
        draws: 0,
        inventory: ["default"],
        equippedSkin: { id: "default", x: "❌", o: "⭕" }
    };

    if (tg?.initDataUnsafe?.user) {
        userData.name = tg.initDataUnsafe.user.first_name || "Игрок";
    }

    // --- СИНХРОНИЗАЦИЯ С СЕРВЕРОМ И Supabase ---
    const RENDER_SERVER_URL = "https://tictactoe-bot-6wgq.onrender.com";

    function saveToServer() {
        if (!tg?.initDataUnsafe?.user?.id) return;
        const userId = tg.initDataUnsafe.user.id;

        fetch(RENDER_SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                balance: userData.balance,
                wins: userData.wins,
                losses: userData.losses || 0,
                draws: userData.draws || 0,
                equipped_x: userData.equippedSkin.x,
                equipped_o: userData.equippedSkin.o
            })
        }).catch(err => console.error("Ошибка сохранения на сервер:", err));
    }

    function saveUserData() {
        localStorage.setItem("tictactoe_user_data", JSON.stringify(userData));
        saveToServer();
    }

    // --- DOM ЭЛЕМЕНТЫ ---
    const balanceEl = document.getElementById("user-balance");
    const nameEl = document.getElementById("user-name");
    const mainMenu = document.getElementById("main-menu");
    const aiSection = document.getElementById("ai-section");
    const pvpSection = document.getElementById("pvp-section");
    const gameArea = document.getElementById("game-area");
    const shopSection = document.getElementById("shop-section");
    const gameStatus = document.getElementById("game-status");
    const cells = document.querySelectorAll(".cell");
    const resultModal = document.getElementById("result-modal");
    const resIcon = document.getElementById("res-icon");
    const resTitle = document.getElementById("res-title");
    const resReward = document.getElementById("res-reward");

    const skinsCatalog = [
        { id: "default", name: "Классический", x: "❌", o: "⭕", price: 0 },
        { id: "fire_ice", name: "Огонь и Лёд", x: "🔥", o: "❄️", price: 100 },
        { id: "star_moon", name: "Космос", x: "⭐", o: "🌙", price: 250 }
    ];

    let gameState = {
        board: ["", "", "", "", "", "", "", "", ""],
        currentPlayer: "X",
        gameActive: false,
        gameMode: "pvp", // "pvp" или "ai"
        aiDifficulty: "easy"
    };

    function updateUI() {
        if (balanceEl) balanceEl.textContent = userData.balance;
        if (nameEl && userData.name) nameEl.textContent = userData.name;
    }

    function renderBoard() {
        cells.forEach((cell, index) => {
            const val = gameState.board[index];
            if (val === "X") cell.textContent = userData.equippedSkin.x;
            else if (val === "O") cell.textContent = userData.equippedSkin.o;
            else cell.textContent = "";
        });
    }

    function checkWin(board, symbol) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        return winPatterns.some(pattern => pattern.every(idx => board[idx] === symbol));
    }

    function startGame(mode, difficulty = "easy") {
        gameState.board = ["", "", "", "", "", "", "", "", ""];
        gameState.currentPlayer = "X";
        gameState.gameActive = true;
        gameState.gameMode = mode;
        gameState.aiDifficulty = difficulty;

        if (gameStatus) gameStatus.textContent = `Ход: ${userData.equippedSkin.x}`;

        mainMenu.classList.add("hidden");
        aiSection.classList.add("hidden");
        pvpSection.classList.add("hidden");
        gameArea.classList.remove("hidden");
        renderBoard();
    }

    function handleCellClick(e) {
        const index = e.target.getAttribute("data-index");
        if (!gameState.gameActive || gameState.board[index] !== "") return;

        // Ход игрока
        makeMove(index, gameState.currentPlayer);

        if (gameState.gameActive && gameState.gameMode === "ai" && gameState.currentPlayer === "O") {
            setTimeout(makeAIMove, 400);
        }
    }

    function makeMove(index, player) {
        gameState.board[index] = player;
        renderBoard();

        if (checkWin(gameState.board, player)) {
            endGame(player === "X" ? "win" : "lose");
            return;
        }

        if (!gameState.board.includes("")) {
            endGame("draw");
            return;
        }

        gameState.currentPlayer = player === "X" ? "O" : "X";
        const currentSymbol = gameState.currentPlayer === "X" ? userData.equippedSkin.x : userData.equippedSkin.o;
        if (gameStatus) gameStatus.textContent = `Ход: ${currentSymbol}`;
    }

    function makeAIMove() {
        if (!gameState.gameActive) return;
        const emptyIndices = gameState.board
            .map((val, idx) => val === "" ? idx : null)
            .filter(val => val !== null);

        if (emptyIndices.length === 0) return;

        let chosenIndex;
        if (gameState.aiDifficulty === "easy") {
            chosenIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        } else {
            // Легкая логика для блокировки / победы
            chosenIndex = emptyIndices.find(idx => {
                let temp = [...gameState.board];
                temp[idx] = "O";
                return checkWin(temp, "O");
            }) || emptyIndices.find(idx => {
                let temp = [...gameState.board];
                temp[idx] = "X";
                return checkWin(temp, "X");
            }) || emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        }

        makeMove(chosenIndex, "O");
    }

    function endGame(result) {
        gameState.gameActive = false;

        setTimeout(() => {
            if (result === "win") {
                if (resIcon) resIcon.textContent = "🏆";
                if (resTitle) resTitle.textContent = "Победа!";
                const reward = gameState.gameMode === "pvp" ? 100 : 50;
                if (resReward) resReward.textContent = `+${reward} монет 🪙`;
                userData.balance += reward;
                userData.wins += 1;
            } else if (result === "lose") {
                if (resIcon) resIcon.textContent = "💀";
                if (resTitle) resTitle.textContent = "Поражение!";
                if (resReward) resReward.textContent = "0 монет";
                userData.losses += 1;
            } else {
                if (resIcon) resIcon.textContent = "🤝";
                if (resTitle) resTitle.textContent = "Ничья!";
                if (resReward) resReward.textContent = "+10 монет 🪙";
                userData.balance += 10;
                userData.draws += 1;
            }

            updateUI();
            saveUserData();

            if (resultModal) resultModal.classList.remove("hidden");
        }, 400);
    }

    // --- МАГАЗИН СКИНОВ ---
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
                    <div style="font-size: 12px; color: #aaa;">${isBought ? "Куплено" : "Цена: " + skin.price + " 🪙"}</div>
                </div>
                <div>
                    ${isEquipped 
                        ? '<button class="btn" disabled>Надето</button>'
                        : isBought 
                        ? `<button class="btn btn-equip" data-id="${skin.id}">Надеть</button>`
                        : `<button class="btn btn-buy" data-id="${skin.id}">Купить</button>`
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
                    saveUserData();
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
                saveUserData();
                renderShop();
            });
        });
    }

    // --- КНОПКИ И ОБРАБОТЧИКИ ---
    cells.forEach(cell => cell.addEventListener("click", handleCellClick));

    document.getElementById("btn-ai")?.addEventListener("click", () => {
        mainMenu.classList.add("hidden");
        aiSection.classList.remove("hidden");
    });

    document.getElementById("btn-pvp")?.addEventListener("click", () => {
        startGame("pvp");
    });

    document.querySelectorAll(".btn-diff").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const diff = e.target.getAttribute("data-diff");
            startGame("ai", diff);
        });
    });

    document.getElementById("btn-shop")?.addEventListener("click", () => {
        mainMenu.classList.add("hidden");
        shopSection.classList.remove("hidden");
        renderShop();
    });

    document.querySelectorAll(".btn-back").forEach(btn => {
        btn.addEventListener("click", () => {
            shopSection.classList.add("hidden");
            aiSection.classList.add("hidden");
            pvpSection.classList.add("hidden");
            gameArea.classList.add("hidden");
            mainMenu.classList.remove("hidden");
        });
    });

    document.getElementById("btn-home")?.addEventListener("click", () => {
        if (resultModal) resultModal.classList.add("hidden");
        gameArea.classList.add("hidden");
        mainMenu.classList.remove("hidden");
    });

    document.getElementById("btn-quit")?.addEventListener("click", () => {
        gameState.gameActive = false;
        gameArea.classList.add("hidden");
        mainMenu.classList.remove("hidden");
    });

    updateUI();
});
                             
