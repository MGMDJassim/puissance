let gameMode = null;
let currentPlayer = 1;
let gameOver = false;
let aiDifficulty = 3;
let turnCount = 0;


async function choisirMode(event){
    const mode = event.target.id;
    
    if (mode === 'jvjButton') {
        gameMode = 'jvj';
        await startNewGame();
    } else if (mode === 'jviaButton') {
        gameMode = 'jvia';
        await startNewGameWithAI(3);
    }
}

async function startNewGame() {
    document.getElementById("choix").style.display = "none";
    document.querySelector(".game-container").style.display = "flex";

    const response = await fetch('/api/game/new', {method: 'POST'});
    const gameData = await response.json();

    currentPlayer = gameData.currentPlayer;
    gameOver = false;
    turnCount = 0;

    afficherGameBoard(gameData);
    updateStatusMessage();
    updateGameInfo();
}

async function startNewGameWithAI(difficulty) {
    document.getElementById("choix").style.display = "none";
    document.querySelector(".game-container").style.display = "flex";

    const response = await fetch(`/api/game/new-ai?difficulty=${difficulty}`, {method: 'POST'});
    const gameData = await response.json();

    currentPlayer = gameData.currentPlayer;
    gameOver = false;
    turnCount = 0;
    aiDifficulty = difficulty;

    afficherGameBoard(gameData);
    updateStatusMessage();
    updateGameInfo();
}

function updateStatusMessage() {
    let statusDiv = document.getElementById("statusMessage");
    if (!statusDiv) {
        statusDiv = document.createElement("div");
        statusDiv.id = "statusMessage";
        document.querySelector(".grille").prepend(statusDiv);
    }

    if (gameOver) {
        statusDiv.textContent = `Partie terminée !`;
        statusDiv.style.color = "#10b981";
    } else {
        const playerName = currentPlayer === 1 ? "Joueur 1 (Rouge)" : 
                          (gameMode === 'jvia' && currentPlayer === 2) ? "IA (Jaune)" : "Joueur 2 (Jaune)";
        statusDiv.textContent = `Au tour de : ${playerName}`;
        statusDiv.style.color = currentPlayer === 1 ? "#ef4444" : "#fbbf24";
    }
}

function afficherGameBoard(gameData) {
    document.querySelector(".grille").style.display = "block";

    const board = gameData.board;
    const rows = gameData.rows;
    const cols = gameData.cols;
    currentPlayer = gameData.currentPlayer;
    gameOver = gameData.gameOver;

    generateGameBoard(board, rows, cols);
}

function generateGameBoard(board, rows, cols){
    const gameBoard = document.getElementById("gameBoard");
    gameBoard.innerHTML = ""; 
    for (let r = 0; r < rows; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.classList.add("row");
        for (let c = 0; c < cols; c++) {
            const cellDiv = document.createElement("div");
            cellDiv.classList.add("cell");
            cellDiv.dataset.row = r;
            cellDiv.dataset.col = c;
            cellDiv.onclick = () => handleCellClick(c);
            if (board[r][c] === 1) {
                cellDiv.classList.add("player1");
            } else if (board[r][c] === 2) {
                cellDiv.classList.add("player2");
            }
            rowDiv.appendChild(cellDiv);
        }

        gameBoard.appendChild(rowDiv);
    }
}

async function handleCellClick(column) {
    if (gameOver) {
        alert("La partie est terminée ! Cliquez sur 'Recommencer' pour une nouvelle partie.");
        return;
    }

    if (gameMode === 'jvia' && currentPlayer === 2) {
        return;
    }

    try {
        const response = await fetch(`/api/game/move?column=${column}`, {method: 'POST'});
        const gameData = await response.json();

        turnCount++;
        afficherGameBoard(gameData);
        updateStatusMessage();
        updateGameInfo();

        if (gameData.gameOver) {
            if (gameData.winner > 0) {
                setTimeout(() => {
                    alert(`${gameData.winner === 1 ? 'Joueur 1 (Rouge)' : 'Joueur 2 (Jaune)'} a gagné !`);
                }, 100);
            } else {
                setTimeout(() => {
                    alert("Match nul !");
                }, 100);
            }
            return;
        }
        if (gameMode === 'jvia' && !gameData.gameOver && gameData.currentPlayer === 2) {
            setTimeout(async () => {
                await playAIMove();
            }, 500);
        }
    } catch (error) {
        console.error("Erreur lors du coup:", error);
        alert("Impossible de jouer ce coup. Colonne pleine ?");
    }
}

async function playAIMove() {
    try {
        const response = await fetch('/api/game/ai-move', {method: 'POST'});
        const gameData = await response.json();

        afficherGameBoard(gameData);
        updateStatusMessage();

        if (gameData.gameOver) {
            if (gameData.winner > 0) {
                setTimeout(() => {
                    alert(`${gameData.winner === 1 ? 'Joueur 1 (Rouge)' : 'IA (Jaune)'} a gagné !`);
                }, 100);
            } else {
                setTimeout(() => {
                    alert("Match nul !");
                }, 100);
            }
        }
    } catch (error) {
        console.error("Erreur lors du coup de l'IA:", error);
    }
}

async function resetGame() {
    if (!confirm('Voulez-vous vraiment recommencer la partie ?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/game/reset', {method: 'POST'});
        const gameData = await response.json();
        
        turnCount = 0;
        currentPlayer = gameData.currentPlayer;
        gameOver = gameData.gameOver;
        
        afficherGameBoard(gameData);
        updateStatusMessage();
        updateGameInfo();
    } catch (error) {
        console.error('Erreur lors de la réinitialisation:', error);
        if (gameMode === 'jvj') {
            startNewGame();
        } else if (gameMode === 'jvia') {
            startNewGameWithAI(aiDifficulty);
        }
    }
}

function goBack() {
    document.querySelector(".game-container").style.display = "none";
    document.getElementById("choix").style.display = "flex";
    gameMode = null;
    gameOver = false;
    turnCount = 0;
}

async function undoMove() {
    if (gameOver) {
        alert('La partie est terminée. Utilisez "Recommencer" pour une nouvelle partie.');
        return;
    }
    
    if (turnCount === 0) {
        alert('Aucun coup à annuler.');
        return;
    }
    
    try {
        const response = await fetch('/api/game/undo', {method: 'POST'});
        const gameData = await response.json();
        
        if (gameData.error) {
            alert(gameData.error);
            return;
        }
        
        if (gameMode === 'jvia' && turnCount > 1) {
            const response2 = await fetch('/api/game/undo', {method: 'POST'});
            const gameData2 = await response2.json();
            
            turnCount = Math.max(0, turnCount - 2);
            currentPlayer = gameData2.currentPlayer;
            gameOver = gameData2.gameOver;
            
            afficherGameBoard(gameData2);
        } else {
            turnCount = Math.max(0, turnCount - 1);
            currentPlayer = gameData.currentPlayer;
            gameOver = gameData.gameOver;
            
            afficherGameBoard(gameData);
        }
        
        updateStatusMessage();
        updateGameInfo();
        
    } catch (error) {
        console.error('Erreur lors de l\'annulation:', error);
        alert('Impossible d\'annuler le coup.');
    }
}

async function changerMode(newMode) {
    if (gameOver) {
        gameMode = newMode;
        if (newMode === 'jvj') {
            await startNewGame();
        } else if (newMode === 'jvia') {
            await startNewGameWithAI(aiDifficulty);
        }
        return;
    }
    
    const continuer = confirm(`Voulez-vous continuer la partie en cours avec le nouveau mode ?\n\nOui = Continuer la partie\nNon = Recommencer une nouvelle partie`);
    
    if (continuer) {
        const oldMode = gameMode;
        gameMode = newMode;
        updateGameInfo();
        updateStatusMessage();
        
        if (newMode === 'jvia' && currentPlayer === 2 && oldMode === 'jvj') {
            setTimeout(async () => {
                await playAIMove();
            }, 500);
        }
        
        alert(`Mode changé à ${newMode === 'jvj' ? 'Joueur vs Joueur' : 'Joueur vs IA'}. La partie continue !`);
    } else {
        gameMode = newMode;
        if (newMode === 'jvj') {
            await startNewGame();
        } else if (newMode === 'jvia') {
            await startNewGameWithAI(aiDifficulty);
        }
    }
}

async function changerDifficulte(level) {
    aiDifficulty = level;
        document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.level) === level) {
            btn.classList.add('active');
        }
    });
    
    updateGameInfo();    
    if (gameMode === 'jvia' && !gameOver) {
        if (confirm(`Difficulté changée à ${getDifficultyName(level)}. Voulez-vous recommencer avec cette difficulté ?`)) {
            await startNewGameWithAI(aiDifficulty);
        }
    }
}

function getDifficultyName(level) {
    if (level === 1) return "Facile";
    if (level === 3) return "Moyen";
    if (level === 5) return "Difficile";
    return "Moyen";
}

function updateGameInfo() {
    const modeText = gameMode === 'jvj' ? 'Joueur vs Joueur' : 
                     gameMode === 'jvia' ? 'Joueur vs IA' : '-';
    
    document.getElementById('currentMode').textContent = modeText;
    document.getElementById('currentDifficulty').textContent = getDifficultyName(aiDifficulty);
    document.getElementById('turnCount').textContent = turnCount;
}