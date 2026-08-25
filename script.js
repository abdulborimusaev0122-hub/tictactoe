document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.expand();

    let userData = {
        balance: 300,
        wins: 0,
        losses: 0,
        draws: 0,
        inventory: ["default"],
        equippedSkin: { id: "default", x: "❌", o: "⭕" }
    };

    if (tg?.initDataUnsafe?.user) {
        userData.name = tg.initDataUnsafe.user.first_name || "Игрок";
    }

    const RENDER_SERVER_URL = "https://tictactoe-bot-6wgq.onrender.com";

    function saveToServer() {
        if (!tg?.initDataUnsafe?.user?.id) return;
        fetch(RENDER_SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: tg.initDataUnsafe.user.id,
                balance: userData.balance,
                wins: userData.wins,
                losses: userData.losses || 0,
                draws: userData.draws || 0,
                equipped_x: userData.equippedSkin.x,
                equipped_o: userData.equippedSkin.o
            })
        }).catch(err => console.error("Ошибка сохранения:", err));
    }

    function saveUserData() {
        localStorage.setItem("tictactoe_user_data", JSON.stringify(userData));
        saveToServer();
    }

    const balanceEl = document.getElementById("user-balance");
    const nameEl = document.getElementById("user-name");
    const profName = document.getElementById("prof-name");
    const profBalance = document.getElementById("prof-balance");
    const gameArea = document.getElementById("game-area");
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
        gameActive: false
    };

    function updateUI() {
        if (balanceEl) balanceEl.textContent = userData.balance;
        if (nameEl && userData.name) nameEl.textContent = userData.name;
        if (profName && userData.name) profName.textContent = userData.name;
        if (profBalance) profBalance.textContent = userData.balance;
    }

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

            if (targetTab === "tab-shop") renderShop();
        });
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

    document.getElementById("btn-ai")?.addEventListener("click", () => {
        tabContents.forEach(c => c.classList.add("hidden"));
        gameArea.classList.remove("hidden");
        
        gameState.board = ["", "", "", "", "", "", "", "", ""];
        gameState.currentPlayer = "X";
        gameState.gameActive = true;
        renderBoard();
        if (gameStatus) gameStatus.textContent = `Ход: ${userData.equippedSkin.x}`;
    });

    document.getElementById("btn-quit")?.addEventListener("click", () => {
        gameArea.classList.add("hidden");
        document.getElementById("tab-home")?.classList.remove("hidden");
    });

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
            if (!gameState.gameActive || gameState.board[idx] !== "") return;

            gameState.board[idx] = "X";
            renderBoard();

            if (checkWin("X")) {
                alert("Победа! +50 Креликов");
                userData.balance += 50;
                updateUI();
                saveUserData();
                gameState.gameActive = false;
                return;
            }

            if (!gameState.board.includes("")) {
                alert("Ничья!");
                gameState.gameActive = false;
                return;
            }

            setTimeout(() => {
                let empty = gameState.board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
                if (empty.length > 0) {
                    let move = empty[Math.floor(Math.random() * empty.length)];
                    gameState.board[move] = "O";
                    renderBoard();
                    if (checkWin("O")) {
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
        
