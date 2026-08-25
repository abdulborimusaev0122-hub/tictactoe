document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.expand();

    let userData = {
        id: tg?.initDataUnsafe?.user?.id || "guest",
        name: tg?.initDataUnsafe?.user?.first_name || "Игрок",
        balance: 200,
        wins: 0,
        inventory: ["default"],
        equippedSkin: { id: "default", x: "❌", o: "⭕" }
    };

    const RENDER_SERVER_URL = "https://tictactoe-bot-6wgq.onrender.com";

    // Локальное хранение созданных заявок для теста
    let localLobbies = [];

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

            btn.classList.add("active");
            document.getElementById(targetTab)?.classList.remove("hidden");

            if (targetTab === "tab-shop") renderShop();
            if (targetTab === "tab-home") renderLobbies();
        });
    });

    // Отрисовка списка онлайн заявок
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
                    <span class="opponent-name">@${lobby.authorName}</span>
                    <span class="stake-info">(Ставка: ${lobby.stake} 🪙)</span>
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
                alert(`Вы приняли дуэль с @${localLobbies[idx].authorName}!`);
                localLobbies.splice(idx, 1);
                renderLobbies();
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

    // Создание заявки
    const modalCreate = document.getElementById("modal-create");
    document.getElementById("btn-open-create")?.addEventListener("click", () => {
        modalCreate.classList.remove("hidden");
    });

    document.getElementById("btn-cancel-create")?.addEventListener("click", () => {
        modalCreate.classList.add("hidden");
    });

    document.getElementById("btn-confirm-create")?.addEventListener("click", () => {
        const stake = parseInt(document.getElementById("input-stake").value) || 50;
        if (userData.balance < stake) {
            alert("Недостаточно баланса для этой ставки!");
            return;
        }

        localLobbies.push({
            authorName: userData.name,
            stake: stake
        });

        modalCreate.classList.add("hidden");
        renderLobbies();
        alert("Заявка успешно опубликована!");
    });

    // Магазин
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

    // Игра с ИИ
    document.getElementById("btn-ai")?.addEventListener("click", () => {
        tabContents.forEach(c => c.classList.add("hidden"));
        gameArea.classList.remove("hidden");
        
        gameState.board = ["", "", "", "", "", "", "", "", ""];
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
    renderLobbies();
});
