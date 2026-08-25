document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.expand();

    let userData = {
        balance: 100,
        wins: 0,
        losses: 0,
        draws: 0,
        inventory: ["default"],
        equippedSkin: { id: "default", x: "❌", o: "⭕" }
    };

    if (tg?.initDataUnsafe?.user) {
        userData.name = tg.initDataUnsafe.user.first_name || "Игрок";
    }

    const balanceEl = document.getElementById("user-balance");
    const nameEl = document.getElementById("user-name");
    const profName = document.getElementById("prof-name");
    const profBalance = document.getElementById("prof-balance");
    const gameArea = document.getElementById("game-area");
    const gameStatus = document.getElementById("game-status");
    const cells = document.querySelectorAll(".cell");

    let gameState = {
        board: ["", "", "", "", "", "", "", "", ""],
        currentPlayer: "X",
        gameActive: false
    };

    function updateUI() {
        if (balanceEl) balanceEl.textContent = userData.balance;
        if (nameEl && userData.name) nameEl.textContent = userData.name;
        if (profName && userData.name) profName.textContent = userData.name;
        if (profBalance) profBalance.textContent = userData.balance;
    }

    // Переключение вкладок снизу
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            navButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.add("hidden"));
            gameArea.classList.add("hidden");

            btn.classList.add("active");
            document.getElementById(targetTab)?.classList.remove("hidden");
        });
    });

    // Запуск игры с ИИ
    document.getElementById("btn-ai")?.addEventListener("click", () => {
        tabContents.forEach(c => c.classList.add("hidden"));
        gameArea.classList.remove("hidden");
        
        gameState.board = ["", "", "", "", "", "", "", "", ""];
        gameState.currentPlayer = "X";
        gameState.gameActive = true;
        renderBoard();
        if (gameStatus) gameStatus.textContent = "Ход: ❌";
    });

    document.getElementById("btn-quit")?.addEventListener("click", () => {
        gameArea.classList.add("hidden");
        document.getElementById("tab-home")?.classList.remove("hidden");
    });

    function renderBoard() {
        cells.forEach((cell, idx) => {
            cell.textContent = gameState.board[idx];
        });
    }

    cells.forEach(cell => {
        cell.addEventListener("click", (e) => {
            const idx = e.target.getAttribute("data-index");
            if (!gameState.gameActive || gameState.board[idx] !== "") return;

            gameState.board[idx] = "❌";
            renderBoard();

            if (checkWin("❌")) {
                alert("Победа! +50 Креликов");
                userData.balance += 50;
                updateUI();
                gameState.gameActive = false;
                return;
            }

            if (!gameState.board.includes("")) {
                alert("Ничья!");
                gameState.gameActive = false;
                return;
            }

            // Ход ИИ
            setTimeout(() => {
                let empty = gameState.board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
                if (empty.length > 0) {
                    let move = empty[Math.floor(Math.random() * empty.length)];
                    gameState.board[move] = "⭕";
                    renderBoard();
                    if (checkWin("⭕")) {
                        alert("Поражение!");
                        gameState.gameActive = false;
                    }
                }
            }, 300);
        });
    });

    function checkWin(symbol) {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        return wins.some(p => p.every(i => gameState.board[i] === symbol));
    }

    updateUI();
});
