let gameMode = null;
let currentPlayer = 1;
let gameOver = false;
let aiDifficulty = 3;
let turnCount = 0;
let isProcessing = false;


async function choisirMode(event){
    const mode = event.target.id;
    
    if (mode === 'jvjButton') {
        gameMode = 'jvj';
        await startNewGame();
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
    isProcessing = false;

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
    isProcessing = false;

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
    
    // Ajouter une rangée avec les scores EN HAUT
    const scoresRow = document.createElement("div");
    scoresRow.classList.add("scores-row");
    scoresRow.id = "scoresDisplay";
    for (let c = 0; c < cols; c++) {
        const scoreDiv = document.createElement("div");
        scoreDiv.classList.add("score-cell");
        scoreDiv.id = `score-col-${c}`;
        scoreDiv.textContent = "-";
        scoresRow.appendChild(scoreDiv);
    }
    gameBoard.appendChild(scoresRow);
    
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
    
    // Charger les scores
    displayScores();
}

/**
 * Afficher les scores/poids de chaque colonne sous la grille
 */
async function displayScores() {
    try {
        const response = await fetch('/api/game/ai-scores');
        const data = await response.json();
        const scores = data.columnScores;
        
        if (!scores) return;
        
        // Trouver le meilleur score (en excluant les colonnes pleines)
        let maxScore = Math.max(...scores.filter(s => s > -2147483648));
        let minScore = Math.min(...scores.filter(s => s > -2147483648));
        
        // Afficher les scores avec gradient de couleur
        for (let c = 0; c < scores.length; c++) {
            const scoreDiv = document.getElementById(`score-col-${c}`);
            if (scoreDiv) {
                // Si colonne est remplie (Integer.MIN_VALUE)
                if (scores[c] <= -2147483648) {
                    scoreDiv.textContent = "X";
                    scoreDiv.style.backgroundColor = '#888888'; // Gris pour colonne remplie
                    scoreDiv.style.color = '#FFF';
                    scoreDiv.style.fontWeight = 'bold';
                } else {
                    scoreDiv.textContent = scores[c];
                    
                    // Colorer selon le score
                    if (scores[c] === maxScore && scores[c] > 0) {
                        scoreDiv.style.backgroundColor = '#00DD00'; // Vert = meilleur coup
                        scoreDiv.style.color = '#000';
                        scoreDiv.style.fontWeight = 'bold';
                    } else if (scores[c] === minScore && scores[c] < 0) {
                        scoreDiv.style.backgroundColor = '#FF4444'; // Rouge = mauvais coup
                        scoreDiv.style.color = '#fff';
                        scoreDiv.style.fontWeight = 'bold';
                    } else if (scores[c] > 0) {
                        scoreDiv.style.backgroundColor = '#90EE90'; // Vert clair
                        scoreDiv.style.color = '#000';
                    } else if (scores[c] < 0) {
                        scoreDiv.style.backgroundColor = '#FF9999'; // Rouge clair
                        scoreDiv.style.color = '#000';
                    } else {
                        scoreDiv.style.backgroundColor = '#FFFF99'; // Jaune = neutre
                        scoreDiv.style.color = '#000';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erreur affichage scores:', error);
    }
}

async function handleCellClick(column) {
    // Bloquer les clics si une action est déjà en cours
    if (isProcessing) {
        return;
    }
    
    if (gameOver) {
        alert("La partie est terminée ! Cliquez sur 'Recommencer' pour une nouvelle partie.");
        return;
    }

    if (gameMode === 'jvia' && currentPlayer === 2) {
        return;
    }

    isProcessing = true;
    
    try {
        const response = await fetch(`/api/game/move?column=${column}`, {method: 'POST'});
        const gameData = await response.json();

        if (gameData.error || !response.ok) {
            alert(gameData.error || "Impossible de jouer ce coup. Colonne pleine ?");
            isProcessing = false;
            return;
        }

        turnCount++;
        afficherGameBoard(gameData);
        updateStatusMessage();
        updateGameInfo();

        if (gameData.gameOver) {
            if (gameData.winner > 0) {
                await fetch('/api/game/save', {method: 'POST'});
                setTimeout(() => {
                    alert(`${gameData.winner === 1 ? 'Joueur 1 (Rouge)' : 'Joueur 2 (Jaune)'} a gagné !`);
                }, 100);
            } else {
                await fetch('/api/game/save', {method: 'POST'});
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
    } finally {
        isProcessing = false;
    }
}

async function playAIMove() {
    if (isProcessing) {
        return;
    }
    
    isProcessing = true;
    
    try {
        const response = await fetch('/api/game/ai-move', {method: 'POST'});
        const gameData = await response.json();

        afficherGameBoard(gameData);
        updateStatusMessage();

        if (gameData.gameOver) {
            if (gameData.winner > 0) {
                await fetch('/api/game/save', {method: 'POST'});
                setTimeout(() => {
                    alert(`${gameData.winner === 1 ? 'Joueur 1 (Rouge)' : 'IA (Jaune)'} a gagné !`);
                }, 100);
            } else {
                await fetch('/api/game/save', {method: 'POST'});
                setTimeout(() => {
                    alert("Match nul !");
                }, 100);
            }
        }
    } catch (error) {
        console.error("Erreur lors du coup de l'IA:", error);
    } finally {
        isProcessing = false;
    }
}

async function resetGame() {
    if (isProcessing) {
        return;
    }
    
    if (!confirm('Voulez-vous vraiment recommencer la partie ?')) {
        return;
    }
    
    isProcessing = true;
    
    try {
        // Marquer la partie actuelle comme abandonnée
        if (!gameOver) {
            await fetch('/api/game/abandon', {method: 'POST'})
                .catch(error => console.error('Erreur abandon:', error));
        }
        
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
    } finally {
        isProcessing = false;
    }
}

function goBack() {
    // Marquer la partie comme abandonnée si elle n'est pas terminée
    if (!gameOver) {
        fetch('/api/game/abandon', {method: 'POST'})
            .then(response => response.json())
            .catch(error => console.error('Erreur abandon:', error));
    }
    
    document.querySelector(".game-container").style.display = "none";
    document.getElementById("choix").style.display = "flex";
    gameMode = null;
    gameOver = false;
    turnCount = 0;
    isProcessing = false;
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

async function showGameHistory() {
    const modal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');
    
    modal.style.display = 'flex';
    historyList.innerHTML = '<p class="empty-message"> Chargement des parties...</p>';
    
    try {
        const response = await fetch('/api/game/history');
        const data = await response.json();
        
        console.log('API Response:', data);
        console.log('Games:', data.games);
        
        if (!data.games || data.games.length === 0) {
            historyList.innerHTML = '<p class="empty-message"> Aucune partie enregistrée</p>';
            return;
        }
        
        let html = '';
        data.games.forEach(game => {
            const createdAt = formatDate(game.createdAt);
            const statusLabel = getStatusLabel(game.status);
            const statusClass = game.status;
            
            html += `
                <div class="game-item">
                    <div class="game-item-header">
                        <span class="game-item-id">Game #${game.id}</span>
                        <span class="game-item-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="game-item-details">
                        <p><strong>Date:</strong> ${createdAt}</p>
                        <p><strong>Grille:</strong> ${game.rows}x${game.cols}</p>
                        <p><strong>Joueur actuel:</strong> Joueur ${game.currentPlayer}</p>
                    </div>
                    <div class="game-item-actions">
                        <button class="btn-replay" onclick="replayGame(${game.id})">Rejouer</button>
                        <button class="btn-delete" onclick="deleteGame(${game.id})">Supprimer</button>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
        historyList.innerHTML = '<p class="empty-message">Erreur de chargement</p>';
    }
}

function closeGameHistory() {
    document.getElementById('historyModal').style.display = 'none';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function getStatusLabel(status) {
    const statusMap = {
        'EN_COURS': 'En cours',
        'TERMINEE': 'Terminée',
        'ABANDONNEE': 'Abandonnée'
    };
    return statusMap[status] || status;
}

async function replayGame(gameId) {
    try {
        const response = await fetch(`/api/game/load/${gameId}`);
        const gameData = await response.json();
        
        console.log('Game Data:', gameData);
        console.log('Sequence:', gameData.sequence);
        
        closeGameHistory();
        
        document.getElementById("choix").style.display = "none";
        document.querySelector(".game-container").style.display = "flex";
        
        currentPlayer = 1;
        gameOver = false;
        turnCount = 0;
        gameMode = 'replay';
        
        const newGame = {
            board: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0]
            ],
            rows: 9,
            cols: 9,
            currentPlayer: 1,
            gameOver: false
        };
        
        if (gameData.sequence) {
            console.log('Raw sequence:', gameData.sequence);
            
            const moves = gameData.sequence.split('').filter(m => m.trim());
            
            console.log('Parsed moves:', moves);
            
            for (const move of moves) {
                try {
                    const col = parseInt(move.trim()) - 1;  // Convertir de 1-based à 0-based
                    console.log('Playing move:', col);
                    
                    if (col >= 0 && col < 9) {
                        for (let r = 8; r >= 0; r--) {
                            if (newGame.board[r][col] === 0) {
                                newGame.board[r][col] = newGame.currentPlayer;
                                console.log(`Placed player ${newGame.currentPlayer} at [${r},${col}]`);
                                break;
                            }
                        }
                        newGame.currentPlayer = newGame.currentPlayer === 1 ? 2 : 1;
                        turnCount++;
                    }
                } catch (e) {
                    console.error('Erreur lors du parsing du mouvement:', move, e);
                }
            }
        }
        
        console.log('Final board:', newGame.board);
        console.log('Total moves:', turnCount);
        
        afficherGameBoard(newGame);
        updateStatusMessage();
        updateGameInfo();
        
        const buttonGroup = document.querySelector('.button-group');
        if (buttonGroup) {
            buttonGroup.style.opacity = '0.5';
            const buttons = buttonGroup.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);
        }
        
        alert(`Replay de la partie #${gameId} - ${turnCount} coups joués`);
        
    } catch (error) {
        console.error('Erreur lors du chargement de la partie:', error);
        alert('Erreur lors du chargement de la partie: ' + error.message);
    }
}

async function deleteGame(gameId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette partie ?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/game/delete/${gameId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Partie supprimée avec succès');
            showGameHistory();
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression');
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('historyModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

/**
 * Charger la suggestion IA avec meilleur coup et prédiction
 */
async function loadSuggestion() {
    try {
        const response = await fetch('/api/game/suggest');
        const data = await response.json();
        
        const suggestionText = document.getElementById('suggestionText');
        
        let predictionEmoji = '';
        if (data.prediction === 'victoire') predictionEmoji = 'Victoire';
        else if (data.prediction === 'defaite') predictionEmoji = 'Défaite';
        else if (data.prediction === 'nul') predictionEmoji = ' Nul';
        else predictionEmoji = ' Incertaine';
        
        suggestionText.innerHTML = `
            <strong>Colonne: ${data.suggestedColumn}</strong><br>
            Score: ${data.score}<br>
            <em>${predictionEmoji}</em>
        `;
    } catch (error) {
        console.error('Erreur suggestion:', error);
        document.getElementById('suggestionText').innerHTML = 'Erreur de calcul';
    }
}

/**
 * Charger les statistiques des parties
 */
async function loadStats() {
    try {
        const response = await fetch('/api/game/stats');
        const stats = await response.json();
        
        document.getElementById('statsTotalGames').innerHTML = `Total: <strong>${stats.totalGames}</strong>`;
        document.getElementById('statsHumanWins').innerHTML = `Humain: <strong>${stats.humanWins}</strong> (${stats.humanWinRate})`;
        document.getElementById('statsAiWins').innerHTML = `IA: <strong>${stats.aiWins}</strong> (${stats.aiWinRate})`;
        document.getElementById('statsDraws').innerHTML = `Nuls: <strong>${stats.draws}</strong>`;
    } catch (error) {
        console.error('Erreur stats:', error);
        document.getElementById('statsBox').innerHTML = ' Erreur de chargement';
    }
}

// Charger les stats au démarrage
window.addEventListener('load', () => {
    loadStats();
});

/**
 * Analyser une image du plateau Puissance 4
 */
async function analyzeImage() {
    const fileInput = document.getElementById('imageUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        document.getElementById('analysisResult').textContent = ' Veuillez sélectionner une image';
        return;
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        document.getElementById('analysisResult').textContent = ' Analyse en cours...';
        
        const response = await fetch('/api/game/analyze-image', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            document.getElementById('analysisResult').textContent = ` Erreur: ${result.error}`;
            return;
        }
        
        let resultText = `<strong> Plateau reconnu!</strong><br>`;
        resultText += `Meilleur coup: <strong>Colonne ${result.bestMove}</strong><br>`;
        resultText += `Score: ${result.score}<br>`;
        resultText += `Prédiction: ${result.prediction}`;
        
        document.getElementById('analysisResult').innerHTML = resultText;
    } catch (error) {
        console.error('Erreur analyse:', error);
        document.getElementById('analysisResult').textContent = ' Erreur lors de l\'analyse';
    }
}