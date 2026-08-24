document.addEventListener("DOMContentLoaded", () => {
    // --- ДАННЫЕ ИГРОКА И СОСТОЯНИЕ ---
    let userData = {
        name: "Игрок",
        balance: 200,
        wins: 0,
        equippedSkin: { id: "default", x: "❌", o: "⭕" },
        inventory: ["default"]
    };

    const skinsCatalog = [
        { id: "default", name: "Классика", price: 0, x: "❌", o: "⭕" },
        { id: "fire_ice", name: "Огонь и Лёд", price: 100, x: "🔥", o: "❄️" },
        { id: "swords", name: "Битва Клинков", price: 150, x: "⚔️", o: "🛡️" },
        { id: "space", name: "Космос", price: 200, x: "🚀", o: "👾" },
        { id: "crowns", name: "Королевский", price: 300, x: "👑", o: "💎" }
    ];

    let gameState = {
        board: ["", "", "", "", "", "", "", "", ""],
        mySymbol: "❌",
        aiSymbol: "⭕",
        isMyTurn: true,
        gameActive: false,
        aiDifficulty: "easy"
    };

    // --- TELEGRAM WEB APP INTEGRATION ---
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            userData.name = tg.initDataUnsafe.user.first_name || "Игрок";
        }
    }

    // --- DOM ЭЛЕМЕНТЫ ---
    const topUsername = document.getElementById("top-username");
    const topBalance = document.getElementById("top-balance");
    const profUsername = document.getElementById("prof-username");
    const profBalance = document.getElementById("prof-balance");
    const profWins = document.getElementById("prof-wins");
    const profSkin = document.getElementById("prof-skin");
    
    const navButtons = document.querySelectorAll(".nav-item");
    const tabPages = document.querySelectorAll(".tab-page");

    const pvpSection = document.getElementById("pvp-section");
    const gameArea = document.getElementById("game-area");
    const gameStatus = document.getElementById("game-status");
    const playerSymbolDisplay = document.getElementById("player-symbol-display");
    const cells = document.querySelectorAll(".cell");

    const aiSetupModal = document.getElementById("ai-setup-modal");
    const coinModal = document.getElementById("coin-modal");
    const coinResultText = document.getElementById("coin-result-text");
    const btnGoGame = document.getElementById("btn-go-game");

    const btnOpenAiSetup = document.getElementById("btn-open-ai-setup");
    const btnCloseSetup = document.getElementById("btn-close-setup");
    const btnStartAiCoin = document.getElementById("btn-start-ai-coin");
    const btnDiffEasy = document.getElementById("diff-easy");
    const btnDiffHard = document.getElementById("diff-hard");
    const btnQuit = document.getElementById("btn-quit");

    // --- ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ---
    function updateUI() {
        topUsername.textContent = userData.name;
        topBalance.textContent = userData.balance;
        profUsername.textContent = userData.name;
        profBalance.textContent = userData.balance;
        profWins.textContent = userData.wins;
        profSkin.textContent = `${userData.equippedSkin.x} / ${userData.equippedSkin.o}`;
        renderShop();
    }

    // --- НАВИГАЦИЯ (ВКЛАДКИ) ---
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            navButtons.forEach(b => b.classList.remove("active"));
            tabPages.forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(`tab-${targetTab}`).classList.add("active");
        });
    });

    // --- НАСТРОЙКА ИИ И СЛОЖНОСТИ ---
    btnOpenAiSetup.addEventListener("click", () => {
        aiSetupModal.style.display = "flex";
    });

    btnCloseSetup.addEventListener("click", () => {
        aiSetupModal.style.display = "none";
    });

    btnDiffEasy.addEventListener("click", () => {
        gameState.aiDifficulty = "easy";
        btnDiffEasy.classList.add("selected");
        btnDiffHard.classList.remove("selected");
    });

    btnDiffHard.addEventListener("click", () => {
        gameState.aiDifficulty = "hard";
        btnDiffHard.classList.add("selected");
        btnDiffEasy.classList.remove("selected");
    });

    // --- ЖРЕБИЙ (ПОДБРОС МОНЕТКИ) ---
    btnStartAiCoin.addEventListener("click", () => {
        aiSetupModal.style.display = "none";
        coinModal.style.display = "flex";
        coinResultText.textContent = "🪙 Подбрасываем монетку...";
        btnGoGame.style.display = "none";

        setTimeout(() => {
            const coinFlip = Math.random() < 0.5;
            if (coinFlip) {
                gameState.mySymbol = userData.equippedSkin.x;
                gameState.aiSymbol = userData.equippedSkin.o;
                gameState.isMyTurn = true;
                coinResultText.textContent = "🎉 Орел! Вы ходите первым!";
            } else {
                gameState.mySymbol = userData.equippedSkin.o;
                gameState.aiSymbol = userData.equippedSkin.x;
                gameState.isMyTurn = false;
                coinResultText.textContent = "🤖 Решка! Первым ходит ИИ!";
            }
            btnGoGame.style.display = "inline-block";
        }, 1200);
    });

    btnGoGame.addEventListener("click", () => {
        coinModal.style.display = "none";
        startNewGame();
    });

    // --- ЛОГИКА ИГРЫ ---
    function startNewGame() {
        gameState.board = ["", "", "", "", "", "", "", "", ""];
        gameState.gameActive = true;
        
        pvpSection.style.display = "none";
        gameArea.style.display = "block";
        
        playerSymbolDisplay.textContent = gameState.mySymbol;
        
        cells.forEach(cell => {
            cell.textContent = "";
        });

        if (gameState.isMyTurn) {
            gameStatus.textContent = "Ваш ход";
        } else {
            gameStatus.textContent = "Ход ИИ...";
            setTimeout(makeAiMove, 600);
        }
    }

    cells.forEach(cell => {
        cell.addEventListener("click", () => {
            const index = cell.getAttribute("data-index");

            if (gameState.board[index] === "" && gameState.isMyTurn && gameState.gameActive) {
                makeMove(index, gameState.mySymbol);
                
                if (checkWin(gameState.board, gameState.mySymbol)) {
                    endGame("win");
                } else if (gameState.board.every(c => c !== "")) {
                    endGame("draw");
                } else {
                    gameState.isMyTurn = false;
                    gameStatus.textContent = "Ход ИИ...";
                    setTimeout(makeAiMove, 600);
                }
            }
        });
    });

    function makeMove(index, symbol) {
        gameState.board[index] = symbol;
        cells[index].textContent = symbol;
    }

    function makeAiMove() {
        if (!gameState.gameActive) return;

        let emptyIndices = gameState.board
            .map((val, idx) => val === "" ? idx : null)
            .filter(val => val !== null);

        if (emptyIndices.length === 0) return;

        let chosenIndex;

        if (gameState.aiDifficulty === "easy") {
            chosenIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        } else {
            // Умный ИИ
            chosenIndex = findBestMove(emptyIndices);
        }

        makeMove(chosenIndex, gameState.aiSymbol);

        if (checkWin(gameState.board, gameState.aiSymbol)) {
            endGame("lose");
        } else if (gameState.board.every(c => c !== "")) {
            endGame("draw");
        } else {
            gameState.isMyTurn = true;
            gameStatus.textContent = "Ваш ход";
        }
    }

    function findBestMove(emptyIndices) {
        // 1. Попробовать победить сразу
        for (let idx of emptyIndices) {
            let tempBoard = [...gameState.board];
            tempBoard[idx] = gameState.aiSymbol;
            if (checkWin(tempBoard, gameState.aiSymbol)) return idx;
        }

        // 2. Заблокировать победу игрока
        for (let idx of emptyIndices) {
            let tempBoard = [...gameState.board];
            tempBoard[idx] = gameState.mySymbol;
            if (checkWin(tempBoard, gameState.mySymbol)) return idx;
        }

        // 3. Занять центр
        if (emptyIndices.includes(4)) return 4;

        // 4. Случайный ход
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    function checkWin(board, symbol) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        return winPatterns.some(pattern => {
            return pattern.every(idx => board[idx] === symbol);
        });
    }

    function endGame(result) {
        gameState.gameActive = false;
        if (result === "win") {
            gameStatus.textContent = "🎉 Вы победили! (+50 монет)";
            userData.balance += 50;
            userData.wins += 1;
        } else if (result === "lose") {
            gameStatus.textContent = "❌ Вы проиграли!";
        } else {
            gameStatus.textContent = "🤝 Ничья!";
        }
        updateUI();
    }

    btnQuit.addEventListener("click", () => {
        gameState.gameActive = false;
        gameArea.style.display = "none";
        pvpSection.style.display = "block";
    });

    // --- МАГАЗИН СКИНОВ ---
    function renderShop() {
        const shopList = document.getElementById("shop-list");
        shopList.innerHTML = "";

        skinsCatalog.forEach(skin => {
            const isBought = userData.inventory.includes(skin.id);
            const isEquipped = userData.equippedSkin.id === skin.id;

            const item = document.createElement("div");
            item.className = "shop-item";

            item.innerHTML = `
                <div>
                    <b>${skin.name}</b> (${skin.x} ${skin.o})
                    <div style="font-size: 12px; color: #aaa;">${isBought ? "Куплено" : `Цена: 🪙 ${skin.price}`}</div>
                </div>
                <div>
                    ${isEquipped 
                        ? `<button class="btn-secondary" disabled>Надето</button>`
                        : isBought 
                        ? `<button class="btn-primary btn-equip" data-id="${skin.id}" style="padding: 6px 12px; font-size: 12px;">Надеть</button>`
                        : `<button class="btn-primary btn-buy" data-id="${skin.id}" style="padding: 6px 12px; font-size: 12px;">Купить</button>`
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
            });
        });
    }

    // Инициализация при старте
    updateUI();
});
      
