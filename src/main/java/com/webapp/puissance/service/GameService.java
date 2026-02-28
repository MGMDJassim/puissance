package com.webapp.puissance.service;

import com.webapp.puissance.model.Game;
import com.webapp.puissance.model.MinimaxAI;
import org.springframework.stereotype.Service;

/**
 * Service pour gérer la partie de Puissance 4
 * Version simple sans base de données
 */
@Service
public class GameService {
    
    // Partie unique en mémoire
    private Game currentGame;
    
    // Mode de jeu : true = contre IA, false = humain vs humain
    private boolean aiMode = false;
    
    // Niveau de difficulté de l'IA (1=Facile, 3=Moyen, 5=Difficile)
    private int aiDifficulty = 3;
    
    public GameService() {
        // Initialiser une partie par défaut
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
    
    /**
     * Récupérer la partie courante
     * @return la partie en cours
     */
    public Game getCurrentGame() {
        return currentGame;
    }
    
    /**
     * Jouer un coup dans la partie
     * @param column la colonne où jouer (0-8)
     * @return la ligne où le jeton est tombé, ou -1 si invalide
     */
    public int playMove(int column) {
        return currentGame.drop(column);
    }
    
    /**
     * L'IA joue automatiquement son coup
     * @return la ligne où le jeton de l'IA est tombé, ou -1 si invalide
     */
    public int playAIMove() {
        if (currentGame.isGameOver()) {
            return -1;
        }
        
        // L'IA joue toujours en tant que joueur 2
        int aiPlayer = 2;
        
        if (currentGame.getCurrentPlayer() != aiPlayer) {
            throw new IllegalStateException("Ce n'est pas le tour de l'IA");
        }
        
        MinimaxAI ai = new MinimaxAI(aiPlayer, aiDifficulty);
        int column = ai.chooseColumn(currentGame);
        
        if (column == -1) {
            throw new IllegalStateException("L'IA n'a trouvé aucun coup valide");
        }
        
        return currentGame.drop(column);
    }
    
    /**
     * Obtenir les scores de chaque colonne selon l'IA (pour debug/UI)
     * @return tableau des scores par colonne
     */
    public int[] getAIColumnScores() {
        MinimaxAI ai = new MinimaxAI(2, aiDifficulty);
        return ai.columnScores(currentGame);
    }
    
    /**
     * Réinitialiser la partie
     */
    public void resetGame() {
        currentGame.reset();
    }
    
    /**
     * Annuler le dernier coup
     */
    public void undoMove() {
        currentGame.undo();
    }
    

    
    /**
     * Vérifier si le mode IA est activé
     */
    public boolean isAIMode() {
        return aiMode;
    }
    
    /**
     * Obtenir le niveau de difficulté actuel
     */
    public int getAIDifficulty() {
        return aiDifficulty;
    }
}
