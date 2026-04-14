package com.webapp.puissance.service;

import com.webapp.puissance.model.Game;
import com.webapp.puissance.model.MinimaxAI;
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
        
        MinimaxAI ai = new MinimaxAI(aiPlayer, aiDifficulty);
        int column = ai.chooseColumn(currentGame);
        
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
        session.setMode(aiMode ? "HUMAN_VS_AI" : "HUMAN_VS_AI");
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
        if (currentGameSessionId != null) {
            GameSession session = gameSessionRepository.findById(currentGameSessionId).orElse(null);
            if (session != null && session.getWinner() == 0) {
                gameSessionRepository.save(session);
            }
        }
    }
    
    public void deleteGameSession(Long gameId) {
        gameSessionRepository.deleteById(gameId);
    }
    
    public List<String> getDistinctModes() {
        return gameSessionRepository.findDistinctModes();
    }
}
