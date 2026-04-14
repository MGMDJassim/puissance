package com.webapp.puissance.service;

import com.webapp.puissance.model.Game;
import com.webapp.puissance.model.MinimaxAI;
import com.webapp.puissance.model.DBBasedAI;
import com.webapp.puissance.entity.GameSession;
import com.webapp.puissance.repository.GameSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class GameService {
    
    private Game currentGame;
    private boolean aiMode = false;
    private int aiDifficulty = 3;
    private Long currentGameSessionId = null;
    
    @Autowired
    private GameSessionRepository gameSessionRepository;
    
    @Autowired
    private DBBasedAI dbBasedAI;
    
    // Type d'IA : 1 = Minimax, 2 = DBBased (base de données)
    private int aiType = 1;
    
    public GameService() {
        this.currentGame = new Game();
    }
    
    /**
     * Créer une nouvelle partie
     * @return la nouvelle partie
     */
    public Game createNewGame() {
        currentGame = new Game();
        aiMode = false;
        return currentGame;
    }
    
    /**
     * Créer une nouvelle partie contre l'IA
     * @param difficulty niveau de difficulté (1-6)
     * @return la nouvelle partie
     */
    public Game createNewGameWithAI(int difficulty) {
        currentGame = new Game();
        aiMode = true;
        aiDifficulty = Math.max(1, Math.min(6, difficulty));

        return currentGame;
    }
    
    public Game getCurrentGame() {
        return currentGame;
    }
    
    public int playMove(int column) {
        return currentGame.drop(column);
    }
    
    public int playAIMove() {
        if (currentGame.isGameOver()) {
            return -1;
        }
        
        int aiPlayer = 2;
        
        if (currentGame.getCurrentPlayer() != aiPlayer) {
            throw new IllegalStateException("Ce n'est pas le tour de l'IA");
        }
        
        int column;
        
        // Choisir le type d'IA
        if (aiType == 2) {
            // IA basée sur la BD
            column = dbBasedAI.chooseColumn(currentGame);
            System.out.println("[DBBasedAI] Colonne choisie: " + (column + 1));
        } else {
            // Minimax (par défaut)
            MinimaxAI ai = new MinimaxAI(aiPlayer, aiDifficulty);
            column = ai.chooseColumn(currentGame);
            System.out.println("[MinimaxAI] Colonne choisie: " + (column + 1));
        }
        
        if (column == -1) {
            throw new IllegalStateException("L'IA n'a trouvé aucun coup valide");
        }
        
        return currentGame.drop(column);
    }
    
    public int[] getAIColumnScores() {
        MinimaxAI ai = new MinimaxAI(2, aiDifficulty);
        return ai.columnScores(currentGame);
    }
    

    public void resetGame() {
        currentGame.reset();
    }

    public void undoMove() {
        currentGame.undo();
    }
    
    public boolean isAIMode() {
        return aiMode;
    }
    
    public int getAIDifficulty() {
        return aiDifficulty;
    }

    public GameSession saveCurrentGame() {
        System.out.println("=== SAVING GAME ===");
        
        if (currentGame == null) {
            System.err.println("ERROR: currentGame is null!");
            throw new RuntimeException("Aucune partie en cours pour sauvegarder");
        }
        
        System.out.println("Current game moves: " + currentGame.getMoveHistory());
        System.out.println("Game over: " + currentGame.isGameOver());
        System.out.println("Winner: " + currentGame.getWinner());
        System.out.println("AI Mode: " + aiMode);
        
        GameSession session = new GameSession();
        String sequence = "";
        if (currentGame.getMoveHistory() != null) {
            for (Integer move : currentGame.getMoveHistory()) {
                sequence += move;
            }
        }
        
        session.setSequence(sequence.isEmpty() ? "0" : sequence);
        session.setNbCoups(currentGame.getMoveHistory() != null ? currentGame.getMoveHistory().size() : 0);
        session.setWinner(currentGame.getWinner() > 0 ? currentGame.getWinner() : 0);
        session.setMode(aiMode ? "HUMAN_VS_AI" : "HUMAN_VS_HUMAN");
        session.setStatus(currentGame.getWinner() > 0 ? "TERMINEE" : "EN_COURS");
        session.setCreatedAt(LocalDateTime.now());
        
        GameSession saved = gameSessionRepository.save(session);
        currentGameSessionId = saved.getId();
        
        System.out.println("Game saved with ID: " + saved.getId());
        System.out.println("Sequence: " + sequence);
        System.out.println("=== END SAVING ===");
        
        return saved;
    }

    public GameSession loadGame(Long gameId) {
        return gameSessionRepository.findById(gameId).orElse(null);
    }

    public List<GameSession> getAllGameSessions() {
        return gameSessionRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<GameSession> getOngoingGames() {
        return gameSessionRepository.findOngoingGames();
    }

    public void abandonGame() {
        try {
            // Sauvegarder la partie avant de l'abandonner
            if (currentGame != null && currentGame.getMoveHistory() != null && !currentGame.getMoveHistory().isEmpty()) {
                if (currentGameSessionId == null) {
                    saveCurrentGame();
                }
                
                // Marquer comme abandonnée SEULEMENT si pas déjà terminée
                if (currentGameSessionId != null) {
                    GameSession session = gameSessionRepository.findById(currentGameSessionId).orElse(null);
                    if (session != null && !"TERMINEE".equals(session.getStatus())) {
                        session.setStatus("ABANDONNEE");
                        gameSessionRepository.save(session);
                        System.out.println("Game " + currentGameSessionId + " marked as ABANDONNEE");
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur lors de l'abandon: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public void deleteGameSession(Long gameId) {
        gameSessionRepository.deleteById(gameId);
    }
    
    public List<String> getDistinctModes() {
        return gameSessionRepository.findDistinctModes();
    }

    /**
     * Obtenir le meilleur coup suggéré avec analyse de prédiction
     */
    public java.util.Map<String, Object> getSuggestedMove() {
        int[] scores = getAIColumnScores();
        int bestCol = -1;
        int bestScore = Integer.MIN_VALUE;
        
        for (int c = 0; c < scores.length; c++) {
            if (scores[c] > bestScore && currentGame.getCell(0, c) == 0) {
                bestScore = scores[c];
                bestCol = c;
            }
        }
        
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("suggestedColumn", bestCol);
        result.put("score", bestScore);
        result.put("allScores", scores);
        
        // Prédiction : victoire/défaite/nul/incertaine
        String prediction = getPredictionFromScore(bestScore);
        result.put("prediction", prediction);
        
        return result;
    }
    
    /**
     * Convertir le score Minimax en prédiction lisible
     */
    private String getPredictionFromScore(int score) {
        if (score >= 10000) return "victoire";
        if (score <= -10000) return "defaite";
        if (score == 0) return "nul";
        return "incertaine";
    }
    
    /**
     * Obtenir les statistiques de la base de données
     */
    public java.util.Map<String, Object> getGameStats() {
        List<GameSession> allGames = getAllGameSessions();
        
        long totalGames = allGames.size();
        long humanWins = 0;
        long aiWins = 0;
        long draws = 0;
        
        for (GameSession game : allGames) {
            if ("jvj".equals(game.getMode())) {
                if (game.getWinner() > 0) humanWins++;
                else if (game.getWinner() == 0 && game.isGameOver()) draws++;
            } else if ("jvia".equals(game.getMode())) {
                if (game.getWinner() == 1) humanWins++;
                else if (game.getWinner() == 2) aiWins++;
                else if (game.getWinner() == 0 && game.isGameOver()) draws++;
            }
        }
        
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalGames", totalGames);
        stats.put("humanWins", humanWins);
        stats.put("aiWins", aiWins);
        stats.put("draws", draws);
        stats.put("humanWinRate", totalGames > 0 ? String.format("%.1f%%", (humanWins * 100.0) / totalGames) : "0%");
        stats.put("aiWinRate", totalGames > 0 ? String.format("%.1f%%", (aiWins * 100.0) / totalGames) : "0%");
        
        return stats;
    }

    /**
     * Analyser une image du plateau de Puissance 4
     */
    public java.util.Map<String, Object> analyzeGameImage(org.springframework.web.multipart.MultipartFile imageFile) throws Exception {
        java.awt.image.BufferedImage image = javax.imageio.ImageIO.read(imageFile.getInputStream());
        
        // Reconnaître les jetons par couleur
        int[][] board = recognizeBoard(image);
        
        // Créer un jeu temporaire avec cette position
        Game tempGame = new Game();
        
        // Jouer les coups pour remplir le board
        // (approche alternative : utiliser columnScores directement)
        java.util.List<Integer> moves = new java.util.ArrayList<>();
        for (int row = 8; row >= 0; row--) {
            for (int col = 0; col < 9; col++) {
                if (board[row][col] != 0) {
                    moves.add(col);
                }
            }
        }
        
        // Analyser la position avec Minimax
        com.webapp.puissance.model.MinimaxAI ai = new com.webapp.puissance.model.MinimaxAI(1, 5);
        int[] scores = ai.columnScores(tempGame);
        
        int bestMove = -1;
        int bestScore = Integer.MIN_VALUE;
        for (int i = 0; i < scores.length; i++) {
            if (scores[i] > bestScore && scores[i] > -2147483648) {
                bestScore = scores[i];
                bestMove = i;
            }
        }
        
        String prediction = getPredictionFromScore(bestScore);
        
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("bestMove", bestMove + 1); // Convertir à 1-based pour affichage
        result.put("score", bestScore);
        result.put("prediction", prediction);
        result.put("board", board);
        
        return result;
    }
    
    /**
     * Reconnaître la grille depuis une image (détection des couleurs RGB)
     */
    private int[][] recognizeBoard(java.awt.image.BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        
        // Supposer une grille 9x9 de cellules
        int cellWidth = width / 9;
        int cellHeight = height / 9;
        
        int[][] board = new int[9][9];
        
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                board[row][col] = analyzeCellColor(image, col * cellWidth, row * cellHeight, cellWidth, cellHeight);
            }
        }
        
        return board;
    }
    
    /**
     * Analyser la couleur d'une cellule et retourner 0/1/2
     */
    private int analyzeCellColor(java.awt.image.BufferedImage image, int x, int y, int w, int h) {
        int redCount = 0, yellowCount = 0, darkCount = 0;
        int sampleSize = 0;
        
        for (int i = x + w/4; i < x + 3*w/4 && i < image.getWidth(); i++) {
            for (int j = y + h/4; j < y + 3*h/4 && j < image.getHeight(); j++) {
                int rgb = image.getRGB(i, j);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                
                if (r > 120 && g < 80 && b < 80) redCount++;           // Rouge (joueur 1)
                else if (r > 150 && g > 100 && b < 80) yellowCount++;  // Jaune (joueur 2)
                else if (r < 100 && g < 100 && b < 100) darkCount++;   // Noir/sombre (vide)
                                
                sampleSize++;
            }
        }
        
        if (redCount > yellowCount && redCount > darkCount && redCount > sampleSize / 5) return 1;
        if (yellowCount > redCount && yellowCount > darkCount && yellowCount > sampleSize / 5) return 2;
        return 0;
    }
    
    /**
     * Changer le type d'IA utilisée
     * @param type 1 = Minimax, 2 = DBBased
     */
    public void setAIType(int type) {
        if (type == 1 || type == 2) {
            this.aiType = type;
            System.out.println("IA switché en: " + (type == 1 ? "Minimax" : "DBBased"));
        }
    }
    
    /**
     * Obtenir le type d'IA actuel
     * @return 1 = Minimax, 2 = DBBased
     */
    public int getAIType() {
        return aiType;
    }
    
    /**
     * Obtenir les infos sur l'IA courante
     */
    public java.util.Map<String, Object> getAIInfo() {
        java.util.Map<String, Object> info = new java.util.HashMap<>();
        info.put("aiType", aiType == 1 ? "Minimax" : "DBBased");
        info.put("aiDifficulty", aiDifficulty);
        
        if (aiType == 2 && !currentGame.isGameOver()) {
            // Obtenir les scores de la BD
            int[] scores = dbBasedAI.getColumnScores(currentGame);
            java.util.Map<Integer, Integer> columnScores = new java.util.HashMap<>();
            for (int i = 0; i < 9; i++) {
                if (scores[i] >= 0) {
                    columnScores.put(i, scores[i]);
                }
            }
            info.put("dbScores", columnScores);
        }
        
        return info;
    }
    
    /**
     * Importer une partie à partir d'une séquence
     * @param sequence la séquence des coups (ex: "3131313")
     * @return Map avec l'état de l'importation
     */
    public java.util.Map<String, Object> importGameFromSequence(String sequence) {
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        
        // Vérifier si la partie existe déjà dans la BD
        List<GameSession> existingSessions = gameSessionRepository.findAll();
        for (GameSession session : existingSessions) {
            if (sequence.equals(session.getSequence())) {
                result.put("success", false);
                result.put("imported", false);
                result.put("message", "Cette partie existe déjà dans la base de données");
                result.put("existingGameId", session.getId());
                result.put("existingGameStatus", session.getStatus());
                return result;
            }
        }
        
        // Créer un nouveau jeu et rejouer la séquence
        Game importedGame = new Game();
        
        // Parser la séquence (chaque chiffre = colonne+1, donc 0-8 -> 1-9)
        for (int i = 0; i < sequence.length(); i++) {
            char digit = sequence.charAt(i);
            int column = Character.getNumericValue(digit);
            
            if (column < 1 || column > 9) {
                result.put("success", false);
                result.put("message", "Colonne invalide: " + column + " (doit être entre 1 et 9)");
                return result;
            }
            
            // Convertir en 0-based
            int col = column - 1;
            
            // Jouer le coup
            int row = importedGame.drop(col);
            
            if (row == -1) {
                result.put("success", false);
                result.put("message", "Coup invalide à la position " + (i+1) + ": colonne " + column + " est pleine");
                return result;
            }
        }
        
        // Déterminer l'état de la partie
        String status = importedGame.isGameOver() ? "TERMINEE" : "EN_COURS";
        int winner = importedGame.getWinner();
        
        // Créer et sauvegarder la session
        GameSession session = new GameSession();
        session.setSequence(sequence);
        session.setNbCoups(sequence.length());
        session.setWinner(winner);
        session.setMode(null); // Pas d'IA pour les parties importées
        session.setStatus(status);
        session.setCreatedAt(LocalDateTime.now());
        
        GameSession saved = gameSessionRepository.save(session);
        
        result.put("success", true);
        result.put("imported", true);
        result.put("message", "Partie importée avec succès");
        result.put("gameId", saved.getId());
        result.put("gameStatus", status);
        result.put("gameWinner", winner);
        result.put("nbCoups", sequence.length());
        
        return result;
    }
    
}
