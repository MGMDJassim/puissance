let gameMode = null;
let currentPlayer = 1;
let playerColor = null; // Couleur choisie par le joueur humain
let gameOver = false;
let aiDifficulty = 3;
let turnCount = 0;
let isProcessing = false;
let analysisPerspective = null; // Perspective pour l'analyse (1=Rouge/Joueur1, 2=Jaune/Joueur2)
let analysisPlayerRole = null; // Rôle du joueur analysé (1=Joueur 1/Premier, 2=Joueur 2/Deuxième)
let playerStartsFirst = true; // Le joueur commence en premier ?
let currentSequence = ""; // Séquence des coups jouée jusqu'à présent
let currentGameSessionId = null; // ID de la partie chargée pour continuation


async function choisirMode(event){
    const mode = event.target.id;
    
    if (mode === 'jvjButton') {
        // Afficher modal de choix du mode de jeu
        document.getElementById("gameModeModal").style.display = "flex";
        document.getElementById("gameModeModal").style.justifyContent = "center";
        document.getElementById("gameModeModal").style.alignItems = "center";
    }
}

function selectGameMode(mode) {
    gameMode = mode; // 'jvj' ou 'jvia'
    document.getElementById("gameModeModal").style.display = "none";
    
    // Afficher modal de choix de couleur
    document.getElementById("colorModal").style.display = "flex";
    document.getElementById("colorModal").style.justifyContent = "center";
    document.getElementById("colorModal").style.alignItems = "center";
}

function confirmColorChoice(color) {
    playerColor = color;
    document.getElementById("colorModal").style.display = "none";
    startNewGame();
}

async function startNewGame() {
    // Nettoyer les anciens messages (victoire, suggestions, etc.)
    const gameMessage = document.getElementById("gameMessage");
    if (gameMessage) gameMessage.remove();
    
    const suggestionDiv = document.getElementById("suggestionMessage");
    if (suggestionDiv) suggestionDiv.style.display = "none";
    
    document.getElementById("choix").style.display = "none";
    document.querySelector(".game-container").style.display = "flex";

    // Réinitialiser l'état de la séquence pour une nouvelle partie
    currentSequence = "";
    currentGameSessionId = null;

    let response;
    
    if (gameMode === 'jvia') {
        // Partie contre IA
        response = await fetch(`/api/game/new-ai?difficulty=${aiDifficulty}`, {method: 'POST'});
    } else {
        // Partie joueur vs joueur
        response = await fetch('/api/game/new', {method: 'POST'});
    }
    
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

    // Réinitialiser l'état de la séquence pour une nouvelle partie
    currentSequence = "";
    currentGameSessionId = null;

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

    if (gameOver) {
        statusDiv.textContent = `Partie terminée !`;
        statusDiv.style.color = "#10b981";
    } else {
        // Adapter les noms des joueurs selon la couleur choisie
        let player1Name = "Joueur 1";
        let player2Name = "Joueur 2";
        let player1Color = "Rouge";
        let player2Color = "Jaune";
        
        // Si joueur choisit jaune, inverser les affichages
        if (playerColor === 'yellow') {
            player1Color = "Jaune";
            player2Color = "Rouge";
        }
        
        const playerName = currentPlayer === 1 ? `${player1Name} (${player1Color})` : 
                          (gameMode === 'jvia' && currentPlayer === 2) ? `IA (${player2Color})` : `${player2Name} (${player2Color})`;
        const colorEmoji = (currentPlayer === 1 && playerColor === 'yellow') || (currentPlayer === 2 && playerColor === 'red') ? "🟡" : "🔴";
        statusDiv.textContent = `${colorEmoji} Au tour de : ${playerName}`;
        statusDiv.style.color = currentPlayer === 1 ? "#ef4444" : "#fbbf24";
        
        // Afficher la suggestion pour le joueur humain
        if ((gameMode === 'jvj' || (gameMode === 'jvia' && currentPlayer === 1)) && !gameOver) {
            displaySuggestion();
        }
    }
}

async function displaySuggestion() {
    let suggestionDiv = document.getElementById("suggestionMessage");
    
    try {
        const response = await fetch('/api/game/suggest');
        const data = await response.json();
        
        if (data.suggestedColumn !== undefined && data.suggestedColumn >= 0) {
            const prediction = data.prediction || 'incertaine';
            const predictionEmoji = {
                'victoire': '🏆',
                'defaite': '⚠️',
                'nul': '🤝',
                'incertaine': '🤔'
            }[prediction] || '💡';
            
            suggestionDiv.textContent = `${predictionEmoji} Meilleur coup: colonne ${data.suggestedColumn + 1} (Score: ${data.score})`;
            suggestionDiv.style.display = "block";
        } else {
            suggestionDiv.textContent = '💭 Aucun coup conseillé';
            suggestionDiv.style.display = "block";
        }
    } catch (error) {
        console.error('Erreur affichage suggestion:', error);
        suggestionDiv.style.display = "none";
    }
}

function afficherGameBoard(gameData) {
    document.querySelector(".grille").style.display = "block";

    const board = gameData.board;
    const rows = gameData.rows;
    const cols = gameData.cols;
    const winningPositions = gameData.winningPositions;  // Récupérer les positions gagnantes
    currentPlayer = gameData.currentPlayer;
    gameOver = gameData.gameOver;
    
    console.log("afficherGameBoard - winningPositions:", winningPositions);
    console.log("afficherGameBoard - gameOver:", gameOver);

    generateGameBoard(board, rows, cols, winningPositions);  // Passer les positions gagnantes
}

function generateGameBoard(board, rows, cols, winningPositions){
    const gameBoard = document.getElementById("gameBoard");
    gameBoard.innerHTML = ""; 
    
    // Créer un set pour les positions gagnantes pour une recherche rapide
    const winningSet = new Set();
    if (winningPositions && Array.isArray(winningPositions)) {
        console.log("generateGameBoard - winningPositions array:", winningPositions);
        for (let pos of winningPositions) {
            winningSet.add(`${pos[0]},${pos[1]}`);
        }
        console.log("generateGameBoard - winningSet:", Array.from(winningSet));
    } else {
        console.log("generateGameBoard - no winning positions");
    }
    
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
            
            // Swapper les couleurs si le joueur a choisi jaune
            let playerClass = null;
            if (board[r][c] === 1) {
                playerClass = playerColor === 'yellow' ? 'player2' : 'player1';
                cellDiv.classList.add(playerClass);
            } else if (board[r][c] === 2) {
                playerClass = playerColor === 'yellow' ? 'player1' : 'player2';
                cellDiv.classList.add(playerClass);
            }
            
            // Ajouter la classe "winning" si c'est une position gagnante
            if (winningSet.has(`${r},${c}`)) {
                cellDiv.classList.add("winning");
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

function showGameMessage(message, type = 'info') {
    let messageDiv = document.getElementById("gameMessage");
    if (!messageDiv) {
        messageDiv = document.createElement("div");
        messageDiv.id = "gameMessage";
        document.querySelector(".grille").appendChild(messageDiv);
    }
    
    let bgcolor = '#3b82f6'; // info (bleu)
    if (type === 'error') bgcolor = '#ef4444';      // rouge
    if (type === 'success') bgcolor = '#10b981';    // vert
    if (type === 'warning') bgcolor = '#f59e0b';    // orange
    
    messageDiv.style.cssText = `
        margin-top: 15px;
        padding: 12px;
        background: ${bgcolor};
        color: white;
        border-radius: 8px;
        font-weight: bold;
        text-align: center;
        font-size: 16px;
        animation: slideIn 0.3s ease;
    `;
    messageDiv.textContent = message;
}

async function handleCellClick(column) {
    // Bloquer les clics si une action est déjà en cours
    if (isProcessing) {
        return;
    }
    
    if (gameOver) {
        showGameMessage("🎮 Appuyez sur 'Recommencer' pour une nouvelle partie", "warning");
        return;
    }

    if (gameMode === 'jvia' && currentPlayer === 2) {
        return;
    }

    isProcessing = true;
    
    try {
        // Construire l'URL avec la séquence pour resynchroniser le backend
        let moveUrl = `/api/game/move?column=${column}`;
        if (currentSequence) {
            moveUrl += `&sequence=${encodeURIComponent(currentSequence)}`;
        }
        
        const response = await fetch(moveUrl, {method: 'POST'});
        const gameData = await response.json();

        if (gameData.error || !response.ok) {
            showGameMessage(" Colonne pleine ! Essayez une autre.", "error");
            isProcessing = false;
            return;
        }

        // Ajouter le coup joué à la séquence
        currentSequence += (column + 1);  // column est 0-based, séquence est 1-based
        
        console.log("After move - currentSequence:", currentSequence);
        console.log("gameData.sequence from response:", gameData.sequence);
        
        turnCount++;
        afficherGameBoard(gameData);
        updateStatusMessage();
        updateGameInfo();

        // Sauvegarder la partie après chaque coup (EN_COURS ou TERMINEE)
        await fetch('/api/game/save', {method: 'POST'});

        if (gameData.gameOver) {
            if (gameData.winner > 0) {
                const winnerColor = playerColor === 'yellow' 
                    ? (gameData.winner === 1 ? 'Jaune' : 'Rouge')
                    : (gameData.winner === 1 ? 'Rouge' : 'Jaune');
                const winnerName = gameData.winner === 1 ? 'Joueur 1' : 'Joueur 2';
                setTimeout(() => {
                    showGameMessage(`🎉 ${winnerName} (${winnerColor}) a gagné !`, "success");
                }, 100);
            } else {
                setTimeout(() => {
                    showGameMessage("🤝 Match nul ! La grille est pleine.", "info");
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
        showGameMessage("❌ Erreur : Colonne pleine ?", "error");
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
        // Envoyer la séquence pour resynchroniser first
        let aiMoveUrl = '/api/game/ai-move';
        if (currentSequence) {
            aiMoveUrl += `?sequence=${encodeURIComponent(currentSequence)}`;
        }
        
        const response = await fetch(aiMoveUrl, {method: 'POST'});
        const gameData = await response.json();

        // Mettre à jour currentSequence avec le coup joué par l'IA
        if (gameData.moveHistory && gameData.moveHistory.length > currentSequence.length) {
            // Récupérer le dernier coup ajouté
            const lastMove = gameData.moveHistory[gameData.moveHistory.length - 1];
            if (lastMove) {
                currentSequence += lastMove;
            }
        }

        afficherGameBoard(gameData);
        updateStatusMessage();

        // Sauvegarder la partie après le coup de l'IA (EN_COURS ou TERMINEE)
        await fetch('/api/game/save', {method: 'POST'});

        if (gameData.gameOver) {
            if (gameData.winner > 0) {
                const winnerColor = playerColor === 'yellow'
                    ? (gameData.winner === 1 ? 'Jaune' : 'Rouge')
                    : (gameData.winner === 1 ? 'Rouge' : 'Jaune');
                const winnerName = gameData.winner === 1 ? 'Joueur' : 'IA';
                setTimeout(() => {
                    showGameMessage(`🎉 ${winnerName} (${winnerColor}) a gagné !`, "success");
                }, 100);
            } else {
                setTimeout(() => {
                    showGameMessage("🤝 Match nul ! La grille est pleine.", "info");
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
        // Sauvegarder la partie avant de l'abandonner si elle n'est pas terminée ET qu'il y a des coups joués APRÈS chargement
        // On regarde turnCount car c'est le nombre de coups joués depuis le chargement
        if (!gameOver && turnCount > 0) {
            console.log('Saving game before restart. Turns played:', turnCount);
            await fetch('/api/game/save', {method: 'POST'})
                .catch(error => console.error('Erreur save:', error));
        }
        
        // Marquer la partie actuelle comme abandonnée SEULEMENT si des coups ont été joués APRÈS chargement
        if (!gameOver && turnCount > 0) {
            console.log('Marking game as abandoned before restart. Turns played:', turnCount);
            await fetch('/api/game/abandon', {method: 'POST'})
                .catch(error => console.error('Erreur abandon:', error));
        }
        
        // Nettoyer les messages de victoire et autres
        const gameMessage = document.getElementById("gameMessage");
        if (gameMessage) gameMessage.remove();
        
        const suggestionDiv = document.getElementById("suggestionMessage");
        if (suggestionDiv) suggestionDiv.style.display = "none";
        
        // Réinitialiser l'état de la partie
        currentSequence = "";
        currentGameSessionId = null;
        gameMode = null;
        gameOver = false;
        turnCount = 0;
        
        // Afficher le modal de couleur
        playerColor = null;
        document.getElementById("colorModal").style.display = "flex";
        document.getElementById("colorModal").style.justifyContent = "center";
        document.getElementById("colorModal").style.alignItems = "center";
        
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

async function goBack() {
    isProcessing = true;
    try {
        // Sauvegarder la partie si elle n'est pas terminée ET qu'il y a des coups joués APRÈS le chargement
        // On regarde turnCount car c'est le nombre de coups joués depuis le chargement
        if (!gameOver && turnCount > 0) {
            console.log('Saving game before going back. Turns played:', turnCount);
            await fetch('/api/game/save', {method: 'POST'})
                .catch(error => console.error('Erreur save:', error));
        }
        
        // Marquer comme abandonnée SEULEMENT si pas terminée ET qu'il y a des coups joués APRÈS chargement
        if (!gameOver && turnCount > 0) {
            console.log('Marking game as abandoned. Turns played:', turnCount);
            await fetch('/api/game/abandon', {method: 'POST'})
                .catch(error => console.error('Erreur abandon:', error));
        }
    } catch (error) {
        console.error('Erreur goBack:', error);
    } finally {
        document.querySelector(".game-container").style.display = "none";
        document.getElementById("choix").style.display = "flex";
        gameMode = null;
        gameOver = false;
        turnCount = 0;
        currentSequence = "";
        currentGameSessionId = null;
        isProcessing = false;
    }
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

/**
 * Importer une partie d'un fichier téléchargé
 */
async function importGameFromFile() {
    const fileInput = document.getElementById('historyFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showImportMessage('Veuillez sélectionner un fichier', 'error');
        return;
    }
    
    // Extraire la séquence du nom du fichier
    const filename = file.name;
    const sequenceMatch = filename.match(/^([0-9]+)\.txt$/);
    
    if (!sequenceMatch) {
        showImportMessage('Format invalide. Le fichier doit être nommé: [séquence].txt (ex: 3131313.txt)', 'error');
        return;
    }
    
    const sequence = sequenceMatch[1];
    await performImport(sequence);
}

/**
 * Importer une partie d'une séquence manuelle
 */
async function importGameFromSequence() {
    const sequenceInput = document.getElementById('historySequenceInput');
    const sequence = sequenceInput.value.trim();
    
    if (!sequence) {
        showImportMessage('Veuillez entrer une séquence (ex: 3131313)', 'error');
        return;
    }
    
    await performImport(sequence);
}

/**
 * Effectuer l'importation
 */
async function performImport(sequence) {
    if (!/^[1-9]+$/.test(sequence)) {
        showImportMessage('La séquence doit contenir uniquement des chiffres 1-9', 'error');
        return;
    }
    
    if (sequence.length > 81) {
        showImportMessage('La séquence ne peut pas dépasser 81 coups', 'error');
        return;
    }
    
    try {
        showImportMessage('Importation en cours...', 'loading');
        
        const response = await fetch(`/api/game/import?sequence=${encodeURIComponent(sequence)}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.imported && data.success) {
            showImportMessage(`✓ Partie #${data.gameId} importée! (${data.nbCoups} coups - ${data.gameStatus})`, 'success');
            document.getElementById('historyFileInput').value = '';
            document.getElementById('historySequenceInput').value = '';
            
            // Recharger l'historique après 2 secondes
            setTimeout(() => {
                showGameHistory();
            }, 1500);
        } else if (!data.success && data.existingGameId) {
            showImportMessage(`⚠️ Cette partie existe déjà! (Partie #${data.existingGameId})`, 'warning');
        } else {
            showImportMessage(data.message || 'Erreur lors de l\'importation', 'error');
        }
    } catch (error) {
        showImportMessage('Erreur: ' + error.message, 'error');
    }
}

/**
 * Afficher un message d'importation
 */
function showImportMessage(text, type) {
    const messageDiv = document.getElementById('importMessage');
    
    if (!text) {
        messageDiv.style.display = 'none';
        return;
    }
    
    messageDiv.style.display = 'block';
    messageDiv.textContent = text;
    
    if (type === 'success') {
        messageDiv.style.background = '#e8f5e9';
        messageDiv.style.color = '#2e7d32';
        messageDiv.style.borderLeft = '4px solid #4caf50';
    } else if (type === 'error') {
        messageDiv.style.background = '#ffebee';
        messageDiv.style.color = '#c62828';
        messageDiv.style.borderLeft = '4px solid #f44336';
    } else if (type === 'warning') {
        messageDiv.style.background = '#fff3e0';
        messageDiv.style.color = '#e65100';
        messageDiv.style.borderLeft = '4px solid #ff9800';
    } else if (type === 'loading') {
        messageDiv.style.background = '#e3f2fd';
        messageDiv.style.color = '#1565c0';
        messageDiv.style.borderLeft = '4px solid #2196f3';
    }
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
        // Nettoyer les anciens messages avant de charger la nouvelle partie
        const gameMessage = document.getElementById("gameMessage");
        if (gameMessage) gameMessage.remove();
        
        const suggestionDiv = document.getElementById("suggestionMessage");
        if (suggestionDiv) suggestionDiv.style.display = "none";
        
        const response = await fetch(`/api/game/load/${gameId}`);
        const gameData = await response.json();
        
        console.log('Game Data:', gameData);
        console.log('Sequence:', gameData.sequence);
        console.log('Game Status:', gameData.gameStatus);
        
        closeGameHistory();
        
        document.getElementById("choix").style.display = "none";
        document.querySelector(".game-container").style.display = "flex";
        
        currentPlayer = 1;
        gameOver = false;
        turnCount = 0;
        // Si la partie est EN_COURS, on peut la continuer et changer le mode
        // Si la partie est TERMINEE, c'est un replay de passé (pas de modification possible)
        gameMode = (gameData.gameStatus === 'EN_COURS') ? 'jvj' : 'replay';
        
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
            
            // Sauvegarder la séquence pour les futurs coups
            if (gameData.gameStatus === 'EN_COURS') {
                currentSequence = gameData.sequence;
                currentGameSessionId = gameId;
            }
            
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
        
        // Désactiver les boutons seulement si la partie est terminée (replay)
        if (gameData.gameStatus === 'TERMINEE' || gameData.gameStatus === 'ABANDONNEE') {
            const buttonGroup = document.querySelector('.button-group');
            if (buttonGroup) {
                buttonGroup.style.opacity = '0.5';
                const buttons = buttonGroup.querySelectorAll('button');
                buttons.forEach(btn => btn.disabled = true);
            }
        }
        
        const statusText = gameData.gameStatus === 'EN_COURS' 
            ? `Continuation de la partie #${gameId} - ${turnCount} coups joués (Partie EN COURS)` 
            : `Replay de la partie #${gameId} - ${turnCount} coups joués`;
        alert(statusText);
        
        // Synchroniser le backend pour récupérer les winningPositions (même si TERMINEE ou ABANDONNEE)
        try {
            const continueResponse = await fetch(`/api/game/continue/${gameId}`, {
                method: 'POST'
            });
            if (continueResponse.ok) {
                const backendState = await continueResponse.json();
                // Mettre à jour le plateau avec les données du backend qui incluent les winningPositions
                currentPlayer = backendState.currentPlayer;
                gameOver = backendState.gameOver;
                
                // IMPORTANT: Mettre à jour la sequence avec celle du backend
                // Sinon les prochains mouvements n'auront pas la bonne séquence
                if (backendState.sequence) {
                    currentSequence = backendState.sequence;
                    console.log('Updated currentSequence from backend:', currentSequence);
                }
                
                // Utiliser le plateau du backend avec les winningPositions
                afficherGameBoard(backendState);
                updateStatusMessage();
            } else {
                console.error('Erreur lors de la synchronisation du backend');
            }
        } catch (error) {
            console.error('Erreur lors de la sync backend:', error);
        }
        
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
/**
 * Définir la perspective pour l'analyse (quel jeton on choisit)
 */
function setAnalysisPerspective(player) {
    analysisPerspective = player;
    document.getElementById('perspectiveBtn1').style.opacity = player === 1 ? '1' : '0.6';
    document.getElementById('perspectiveBtn2').style.opacity = player === 2 ? '1' : '0.6';
}

/**
 * Définir le rôle du joueur pour l'analyse (position de jeu: 1er ou 2ème)
 */
function setAnalysisPlayerRole(role) {
    analysisPlayerRole = role;
    document.getElementById('roleBtn1').style.opacity = role === 1 ? '1' : '0.6';
    document.getElementById('roleBtn2').style.opacity = role === 2 ? '1' : '0.6';
}

/**
 * Analyser une séquence de coups pour voir combien de coups supplémentaires
 * il faut pour gagner
 */
async function analyzeGameSequence() {
    const sequence = document.getElementById('sequenceAnalysisInput').value.trim();
    const difficulty = document.getElementById('analysisDifficultySelect').value;
    const resultDiv = document.getElementById('sequenceAnalysisResult');
    
    // Vérifier que les sélections sont faites
    if (!analysisPerspective) {
        resultDiv.textContent = '⚠️ Veuillez choisir un jeton (Rouge ou Jaune)';
        resultDiv.style.display = 'block';
        resultDiv.style.borderLeftColor = '#ff6b6b';
        return;
    }
    
    if (!analysisPlayerRole) {
        resultDiv.textContent = '⚠️ Veuillez choisir votre position de jeu (Joueur 1 ou 2)';
        resultDiv.style.display = 'block';
        resultDiv.style.borderLeftColor = '#ff6b6b';
        return;
    }
    
    if (!sequence) {
        resultDiv.textContent = '⚠️ Veuillez entrer une séquence';
        resultDiv.style.display = 'block';
        resultDiv.style.borderLeftColor = '#ff6b6b';
        return;
    }
    
    // Valider la séquence
    if (!/^\d+$/.test(sequence)) {
        resultDiv.textContent = '⚠️ La séquence doit contenir uniquement des chiffres (1-9)';
        resultDiv.style.display = 'block';
        resultDiv.style.borderLeftColor = '#ff6b6b';
        return;
    }
    
    // Vérifier que tous les chiffres sont entre 1 et 9
    for (let char of sequence) {
        let col = parseInt(char);
        if (col < 1 || col > 9) {
            resultDiv.textContent = `⚠️ Colonne invalide: ${col} (doit être entre 1 et 9)`;
            resultDiv.style.display = 'block';
            resultDiv.style.borderLeftColor = '#ff6b6b';
            return;
        }
    }
    
    resultDiv.textContent = '⏳ Analyse en cours...';
    resultDiv.style.display = 'block';
    resultDiv.style.borderLeftColor = '#fbbf24';
    
    try {
        const response = await fetch('/api/game/analyze-sequence', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `sequence=${encodeURIComponent(sequence)}&difficulty=${encodeURIComponent(difficulty)}&perspective=${encodeURIComponent(analysisPerspective)}&playerRole=${encodeURIComponent(analysisPlayerRole)}`
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            resultDiv.innerHTML = `❌ Erreur: ${result.error || 'Impossible d\'analyser'}`;
            resultDiv.style.borderLeftColor = '#ff6b6b';
            return;
        }
        
        // Fermer le modal et charger le jeu avec la séquence
        closeSequenceAnalysisModal();
        loadSequenceAnalysis(result, analysisPerspective);
        
    } catch (error) {
        console.error('Erreur lors de l\'analyse:', error);
        resultDiv.textContent = '❌ Erreur lors de l\'analyse: ' + error.message;
        resultDiv.style.borderLeftColor = '#ff6b6b';
    }
}

/**
 * Afficher les résultats de l'analyse de séquence
 */
function displaySequenceAnalysisResult(result, resultDiv, perspective) {
    let html = '';
    const perspectiveName = perspective === 1 ? '🔴 ROUGE (Joueur 1)' : '🟡 JAUNE (Joueur 2)';
    
    // En-tête avec résumé
    html += `<div style="margin-bottom:8px; padding:6px; background:${perspective === 1 ? '#fee2e2' : '#fef3c7'}; border-radius:3px;">`;
    html += `<strong>📊 ANALYSE - Perspective: ${perspectiveName}</strong><br>`;
    html += `</div>`;
    
    // Informations de base
    html += `<div style="margin:8px 0; line-height:1.8; font-size:0.9em;">`;
    html += `📌 <strong>Séquence:</strong> ${result.initialSequence}<br>`;
    html += `Coups actuels: <strong>${result.initialMoves}</strong><br>`;
    
    // RÉSULTAT PRINCIPAL - En gros et clair
    if (result.gameFinished) {
        if (result.winner === perspective) {
            // Le joueur analysé gagne !
            html += `<div style="background:#d1fae5; border:2px solid #10b981; padding:8px; border-radius:5px; margin:10px 0; text-align:center;">`;
            html += `<span style="font-size:1.1em; font-weight:bold; color:#10b981;">🎉 VICTOIRE!</span><br>`;
            html += `<span style="color:#059669; font-weight:bold;">En ${result.totalMovesInGame} coups total</span><br>`;
            html += `<span style="font-size:0.9em; color:#047857;">Coups supplémentaires: <strong>${result.additionalMovesNeededToFinish}</strong></span>`;
            html += `</div>`;
        } else if (result.winner === 0) {
            // Nul
            html += `<div style="background:#f3f4f6; border:2px solid #6b7280; padding:8px; border-radius:5px; margin:10px 0; text-align:center;">`;
            html += `<span style="font-size:1.1em; font-weight:bold; color:#6b7280;">🤝 MATCH NUL</span><br>`;
            html += `<span style="color:#4b5563;">Au bout de ${result.totalMovesInGame} coups</span>`;
            html += `</div>`;
        } else {
            // L'adversaire gagne
            html += `<div style="background:#fee2e2; border:2px solid #ef4444; padding:8px; border-radius:5px; margin:10px 0; text-align:center;">`;
            html += `<span style="font-size:1.1em; font-weight:bold; color:#ef4444;">❌ DÉFAITE</span><br>`;
            html += `<span style="color:#991b1b;">L'adversaire gagne en ${result.totalMovesInGame} coups</span>`;
            html += `</div>`;
        }
    } else {
        // Partie pas finie - montrer combien il faut de coups pour gagner
        html += `<div style="background:#e0e7ff; border:2px solid #4f46e5; padding:8px; border-radius:5px; margin:10px 0; text-align:center;">`;
        html += `<span style="font-size:1.1em; font-weight:bold; color:#4f46e5;">⏳ PARTIE EN COURS</span><br>`;
        html += `<span style="color:#3730a3; font-weight:bold;">Coups needed pour finir:</span><br>`;
        html += `<span style="font-size:1.2em; color:#4f46e5; font-weight:bold;">${result.additionalMovesNeededToFinish} coup${result.additionalMovesNeededToFinish > 1 ? 's' : ''}</span>`;
        html += `</div>`;
    }
    
    html += `</div>`;
    
    // Séquence finale en détail
    if (result.finalSequence && result.finalSequence !== result.initialSequence) {
        html += `<div style="margin:8px 0; padding:6px; background:#f9fafb; border-radius:3px; border:1px solid #e5e7eb;">`;
        html += `<strong>🎲 Séquence complète:</strong><br>`;
        html += `<span style="font-family:consolas; font-size:1em; font-weight:bold; color:#1f2937;">${result.finalSequence}</span>`;
        html += `</div>`;
    }
    
    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';
    
    // Couleur de bordure selon le résultat
    if (result.winner === perspective) {
        resultDiv.style.borderLeftColor = '#10b981'; // Vert = victoire
    } else if (result.winner === 0 && result.gameFinished) {
        resultDiv.style.borderLeftColor = '#6b7280'; // Gris = nul
    } else if (!result.gameFinished) {
        resultDiv.style.borderLeftColor = '#4f46e5'; // Bleu = en cours
    } else {
        resultDiv.style.borderLeftColor = '#ff6b6b'; // Rouge = défaite
    }
}

/**
 * Ouvrir le modal d'analyse de séquence
 */
function openSequenceAnalysisModal() {
    analysisPerspective = 1; // Réinitialiser à Rouge par défaut
    document.getElementById('sequenceAnalysisInput').value = '';
    document.getElementById('sequenceAnalysisResult').style.display = 'none';
    document.getElementById('perspectiveBtn1').style.opacity = '1';
    document.getElementById('perspectiveBtn2').style.opacity = '0.6';
    document.getElementById('sequenceAnalysisModal').style.display = 'flex';
    document.getElementById('sequenceAnalysisModal').style.justifyContent = 'center';
    document.getElementById('sequenceAnalysisModal').style.alignItems = 'center';
}

/**
 * Fermer le modal d'analyse de séquence
 */
function closeSequenceAnalysisModal() {
    document.getElementById('sequenceAnalysisModal').style.display = 'none';
}

/**
 * Charger l'analyse de séquence et afficher la grille
 */
async function loadSequenceAnalysis(result, perspective) {
    // Initialize game state
    playerColor = perspective === 1 ? 'red' : 'yellow';
    gameMode = 'jvia';
    aiDifficulty = parseInt(result.difficulty);
    turnCount = result.initialMoves;
    
    // Afficher la grille
    document.getElementById("choix").style.display = "none";
    document.querySelector(".game-container").style.display = "flex";
    
    // Afficher l'analyse statut
    const perspectiveName = result.playerTokenColor || (perspective === 1 ? '🔴 ROUGE' : '🟡 JAUNE');
    const playerPositionName = result.playerPositionName || (perspective === 1 ? 'Joueur 1 (Premier)' : 'Joueur 2 (Deuxième)');
    const statusMsg = document.getElementById('statusMessage');
    
    let statusText = `ANALYSE SÉQUENCE\n`;
    statusText += `${perspectiveName} - ${playerPositionName}\n`;
    statusText += `Séquence initiale: ${result.initialSequence}\n`;
    
    if (result.gameFinished) {
        if (result.winner === perspective) {
            statusText += `🎉 VICTOIRE! En ${result.totalMovesInGame} coups total\n`;
            statusText += `(+${result.additionalMovesNeededToFinish} coup${result.additionalMovesNeededToFinish > 1 ? 's' : ''})`;
        } else if (result.winner === 0) {
            statusText += `🤝 MATCH NUL - Au bout de ${result.totalMovesInGame} coups`;
        } else {
            statusText += `❌ DÉFAITE - Adversaire gagne en ${result.totalMovesInGame} coups`;
        }
    } else {
        statusText += `PARTIE EN COURS\n`;
        statusText += `Coups needed pour finir: ${result.additionalMovesNeededToFinish} coup${result.additionalMovesNeededToFinish > 1 ? 's' : ''}`;
    }
    
    statusMsg.textContent = statusText;
    
    // Créer le plateau initial
    const initialBoard = result.board || Array(result.rows || 9).fill().map(() => Array(result.cols || 9).fill(0));
    
    const gameData = {
        board: initialBoard,
        rows: result.rows || 9,
        cols: result.cols || 9,
        currentPlayer: result.currentPlayer || (result.winner ? result.winner : 1),
        gameOver: result.gameFinished || false,
        suggestedColumn: result.winningMove,
        score: result.additionalMovesNeededToFinish,
        prediction: result.gameFinished ? (result.winner === perspective ? 'victoire' : (result.winner === 0 ? 'nul' : 'defaite')) : 'incertaine',
        winningPositions: result.winningPositions || []
    };
    
    afficherGameBoard(gameData);
    
    // Afficher suggestion si elle existe
    const suggestionDiv = document.getElementById('suggestionMessage');
    suggestionDiv.style.display = 'none';
    
    // Désactiver les clics sur le plateau
    document.getElementById('gameBoard').style.pointerEvents = 'none';
    document.getElementById('gameBoard').style.opacity = '0.9';
}