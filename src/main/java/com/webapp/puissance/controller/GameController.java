package com.webapp.puissance.controller;

import com.webapp.puissance.model.Game;
import com.webapp.puissance.service.GameService;
import com.webapp.puissance.entity.GameSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/game")
@CrossOrigin(origins = "*") 
public class GameController {
    
    @Autowired
    private GameService gameService;
    
    /**
     * Créer une nouvelle partie
     * POST /api/game/new
     * @return JSON avec l'état initial de la partie
     */
    @PostMapping("/new")
    public ResponseEntity<Map<String, Object>> createNewGame() {
        Game game = gameService.createNewGame();
        Map<String, Object> response = buildGameResponse(game);
        response.put("aiMode", false);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Créer une nouvelle partie contre l'IA
     * POST /api/game/new-ai?difficulty=3
     * @param difficulty niveau de difficulté (1=Facile, 3=Moyen, 5=Difficile)
     * @return JSON avec l'état initial de la partie
     */
    @PostMapping("/new-ai")
    public ResponseEntity<Map<String, Object>> createNewGameWithAI(
            @RequestParam(defaultValue = "3") int difficulty) {
        Game game = gameService.createNewGameWithAI(difficulty);
        Map<String, Object> response = buildGameResponse(game);
        response.put("aiMode", true);
        response.put("aiDifficulty", difficulty);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Récupérer l'état de la partie courante
     * GET /api/game/current
     * @return JSON avec l'état de la partie
     */
    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentGame() {
        Game game = gameService.getCurrentGame();
        Map<String, Object> response = buildGameResponse(game);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Jouer un coup
     * POST /api/game/move?column=3
     * @param column la colonne où jouer (0-8)
     * @return JSON avec l'état mis à jour
     */
    @PostMapping("/move")
    public ResponseEntity<Map<String, Object>> playMove(@RequestParam int column) {
        int row = gameService.playMove(column);
        
        if (row == -1) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Coup invalide - colonne pleine ou hors limites"));
        }
        
        Game game = gameService.getCurrentGame();
        Map<String, Object> response = buildGameResponse(game);
        response.put("row", row);  // Ajouter la ligne où le jeton est tombé
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Réinitialiser la partie
     * POST /api/game/reset
     * @return JSON avec l'état réinitialisé
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetGame() {
        gameService.resetGame();
        Game game = gameService.getCurrentGame();
        Map<String, Object> response = buildGameResponse(game);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Annuler le dernier coup
     * POST /api/game/undo
     * @return JSON avec l'état après annulation
     */
    @PostMapping("/undo")
    public ResponseEntity<Map<String, Object>> undoMove() {
        gameService.undoMove();
        Game game = gameService.getCurrentGame();
        Map<String, Object> response = buildGameResponse(game);
        return ResponseEntity.ok(response);
    }
    
    /**
     * L'IA joue automatiquement son coup
     * POST /api/game/ai-move
     * @return JSON avec l'état après le coup de l'IA
     */
    @PostMapping("/ai-move")
    public ResponseEntity<Map<String, Object>> playAIMove() {
        try {
            int row = gameService.playAIMove();
            
            if (row == -1) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "L'IA ne peut pas jouer"));
            }
            
            Game game = gameService.getCurrentGame();
            Map<String, Object> response = buildGameResponse(game);
            response.put("row", row);
            response.put("aiPlayed", true);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Obtenir les scores de chaque colonne selon l'IA (pour debug/UI)
     * GET /api/game/ai-scores
     * @return JSON avec les scores par colonne
     */
    @GetMapping("/ai-scores")
    public ResponseEntity<Map<String, Object>> getAIScores() {
        int[] scores = gameService.getAIColumnScores();
        Map<String, Object> response = new HashMap<>();
        response.put("columnScores", scores);
        return ResponseEntity.ok(response);
    }

    /**
     * Sauvegarder la partie actuelle en base de données
     * POST /api/game/save
     * @return JSON avec l'ID et les details de la partie sauvegardée
     */
    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> saveGame() {
        try {
            GameSession session = gameService.saveCurrentGame();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("gameSessionId", session.getId());
            response.put("status", session.getStatus());
            response.put("message", "Partie sauvegardée avec succès !");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error saving game: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Erreur lors de la sauvegarde: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Charger une partie depuis la base de données
     * GET /api/game/load/{id}
     * @param id l'ID de la partie
     * @return JSON avec les details de la partie
     */
    @GetMapping("/load/{id}")
    public ResponseEntity<Map<String, Object>> loadGame(@PathVariable Long id) {
        GameSession session = gameService.loadGame(id);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", session.getId());
        response.put("rows", 9);
        response.put("cols", 9);
        response.put("currentPlayer", 1);
        response.put("gameOver", session.isGameOver());
        response.put("status", session.getStatus());
        response.put("sequence", session.getSequence());
        response.put("nbCoups", session.getNbCoups());
        response.put("winner", session.getWinner());
        response.put("mode", session.getMode());
        response.put("createdAt", session.getCreatedAt());
        return ResponseEntity.ok(response);
    }

    /**
     * Récupérer l'historique de toutes les parties
     * GET /api/game/history
     * @return JSON avec la liste des parties sauvegardées
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getGameHistory() {
        List<GameSession> sessions = gameService.getAllGameSessions();
        Map<String, Object> response = new HashMap<>();
        response.put("totalGames", sessions.size());
        response.put("games", sessions);
        return ResponseEntity.ok(response);
    }

    /**
     * Récupérer les parties en cours
     * GET /api/game/sessions/ongoing
     * @return JSON avec les parties en cours
     */
    @GetMapping("/sessions/ongoing")
    public ResponseEntity<Map<String, Object>> getOngoingGames() {
        List<GameSession> sessions = gameService.getOngoingGames();
        Map<String, Object> response = new HashMap<>();
        response.put("ongoingCount", sessions.size());
        response.put("sessions", sessions);
        return ResponseEntity.ok(response);
    }

    /**
     * Abandonner la partie actuelle
     * POST /api/game/abandon
     * @return confirmation
     */
    @PostMapping("/abandon")
    public ResponseEntity<Map<String, Object>> abandonGame() {
        gameService.abandonGame();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Partie abandonnée !");
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Map<String, Object>> deleteGame(@PathVariable Long id) {
        try {
            gameService.deleteGameSession(id);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Partie supprimée avec succès");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Erreur lors de la suppression: " + e.getMessage());
            return ResponseEntity.status(404).body(response);
        }
    }
    
    @GetMapping("/debug/check-modes")
    public ResponseEntity<Map<String, Object>> checkExistingModes() {
        try {
            List<String> modes = gameService.getDistinctModes();
            Map<String, Object> response = new HashMap<>();
            response.put("distinctModes", modes);
            response.put("count", modes.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Obtenir le meilleur coup suggéré avec prédiction
     * GET /api/game/suggest
     * @return JSON avec colonne suggérée, score, et prédiction (victoire/défaite/nul/incertaine)
     */
    @GetMapping("/suggest")
    public ResponseEntity<Map<String, Object>> suggestMove() {
        try {
            Map<String, Object> suggestion = gameService.getSuggestedMove();
            return ResponseEntity.ok(suggestion);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Erreur lors du calcul de suggestion: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Obtenir les statistiques des parties
     * GET /api/game/stats
     * @return JSON avec stats : total parties, victoires humain/IA, taux victoires
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        try {
            Map<String, Object> stats = gameService.getGameStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Erreur lors du calcul des statistiques: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Analyser une image du plateau Puissance 4
     * POST /api/game/analyze-image (multipart/form-data)
     * @return JSON avec meilleur coup et analyse
     */
    @PostMapping("/analyze-image")
    public ResponseEntity<Map<String, Object>> analyzeImage(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            Map<String, Object> result = gameService.analyzeGameImage(file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Erreur lors de l'analyse: " + e.getMessage());
            return ResponseEntity.status(400).body(response);
        }
    }
    
    /**
     * Changer le type d'IA utilisée
     * POST /api/game/set-ai-type?type=1
     * @param type 1 = Minimax, 2 = DBBased (base de données)
     * @return confirmation
     */
    @PostMapping("/set-ai-type")
    public ResponseEntity<Map<String, Object>> setAIType(
            @RequestParam(defaultValue = "1") int type) {
        if (type != 1 && type != 2) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Type d'IA invalide. Utilisez 1=Minimax ou 2=DBBased"));
        }
        
        gameService.setAIType(type);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("aiType", type);
        response.put("aiTypeName", type == 1 ? "Minimax" : "DBBased");
        response.put("message", type == 1 ? "IA Minimax activée" : "IA guidée par base de données activée");
        return ResponseEntity.ok(response);
    }
    
    /**
     * Obtenir le type d'IA actuel et les infos
     * GET /api/game/ai-info
     * @return infos sur l'IA courante
     */
    @GetMapping("/ai-info")
    public ResponseEntity<Map<String, Object>> getAIInfo() {
        Map<String, Object> info = gameService.getAIInfo();
        return ResponseEntity.ok(info);
    }
    
    /**
     * Construire la réponse JSON avec toutes les infos du jeu
     */
    private Map<String, Object> buildGameResponse(Game game) {
        Map<String, Object> response = new HashMap<>();
        response.put("board", game.getBoardCopy());
        response.put("currentPlayer", game.getCurrentPlayer());
        response.put("gameOver", game.isGameOver());
        response.put("winner", game.getWinner());
        response.put("winningPositions", game.getWinningPositions());
        response.put("rows", game.getRows());
        response.put("cols", game.getCols());
        response.put("moveHistory", game.getMoveHistory());
        response.put("aiMode", gameService.isAIMode());
        response.put("aiDifficulty", gameService.getAIDifficulty());
        return response;
    }
}
