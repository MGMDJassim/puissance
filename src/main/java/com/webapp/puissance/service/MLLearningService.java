package com.webapp.puissance.service;

import com.webapp.puissance.entity.GameSession;
import com.webapp.puissance.entity.Situation;
import com.webapp.puissance.model.Game;
import com.webapp.puissance.repository.SituationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Service d'apprentissage pour l'IA guidée par données
 * 
 * Enregistre les résultats des parties pour permettre à l'IA
 * de prendre ses décisions basées sur l'expérience historique
 */
@Service
public class MLLearningService {
    
    @Autowired
    private SituationRepository situationRepository;
    
    /**
     * Enregistrer une partie terminée dans la base de données
     * pour apprentissage
     * 
     * @param gameSession la partie terminée
     */
    public void learnFromGame(GameSession gameSession) {
        if (gameSession == null || gameSession.getSequence() == null) {
            return;
        }
        
        String moveSequence = gameSession.getSequence();
        int finalResult = gameSession.getWinner(); // 1 = joueur1 gagne, 2 = joueur2 gagne, -1 = nul
        
        // Reconstruire la partie coup par coup
        Game replayGame = new Game();
        int moveCount = 0;
        
        for (char moveChar : moveSequence.toCharArray()) {
            try {
                int column = Character.getNumericValue(moveChar) - 1; // Convertir en 0-based
                
                // Enregistrer la situation AVANT ce coup
                String boardHashBefore = convertBoardToHash(replayGame);
                recordMoveStatistic(boardHashBefore, column + 1, finalResult); // +1 pour 1-based
                
                // Jouer le coup pour reconstruire le plateau
                replayGame.drop(column);
                moveCount++;
                
            } catch (Exception e) {
                System.err.println("Erreur lors de l'apprentissage du coup " + moveChar + ": " + e.getMessage());
            }
        }
    }
    
    /**
     * Enregistrer une statistique de coup unique
     * 
     * @param boardHash état du plateau avant le coup
     * @param column colonne joue
     * @param result résultat final (-1 = nul, 1 = p1 gagne, 2 = p2 gagne)
     */
    private void recordMoveStatistic(String boardHash, int column, int result) {
        // Chercher si cette situation existe déjà
        Optional<Situation> existing = situationRepository.findByBase3HexAndMoveNumber(boardHash, column);
        
        Situation situation;
        if (existing.isPresent()) {
            situation = existing.get();
        } else {
            situation = new Situation();
            situation.setBase3Hex(boardHash);
            situation.setMoveNumber(column);
            situation.setNbParties(0);
        }
        
        // Incrémenter les statistiques
        situation.setNbParties(situation.getNbParties() + 1);
        situation.setResultat(result); // Dernière valeur pour cette partie
        
        // Sauvegarder
        situationRepository.save(situation);
    }
    
    /**
     * Convertir le plateau de jeu en représentation compacte
     * 
     * @param game la partie
     * @return string représentant l'état du plateau
     */
    private String convertBoardToHash(Game game) {
        StringBuilder hash = new StringBuilder();
        int[][] board = game.getBoardCopy();
        
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                hash.append(board[row][col]);
            }
        }
        
        return hash.toString();
    }
    
    /**
     * Obtenir les statistiques d'une position donnée
     * 
     * @param boardHash état du plateau
     * @return liste des situations enregistrées pour ce plateau
     */
    public List<Situation> getPositionStats(String boardHash) {
        return situationRepository.findByBase3Hex(boardHash);
    }
    
    /**
     * Obtenir la colonne avec le meilleur taux de victoire pour une position
     * 
     * @param boardHash état du plateau
     * @return numéro de colonne (0-8) avec la meilleure statistique, ou -1 si aucune donnée
     */
    public int getBestMoveForPosition(String boardHash) {
        List<Situation> positions = situationRepository.findByBase3Hex(boardHash);
        
        if (positions.isEmpty()) {
            return -1; // Aucune donnée
        }
        
        int bestColumn = -1;
        double bestWinRate = -1;
        
        for (Situation situation : positions) {
            double winRate = calculateWinRate(situation);
            if (winRate > bestWinRate) {
                bestWinRate = winRate;
                bestColumn = situation.getMoveNumber();
            }
        }
        
        return bestColumn;
    }
    
    /**
     * Calculer le taux de victoire pour une situation
     * 
     * @param situation la situation avec statistiques
     * @return taux entre 0 et 1
     */
    private double calculateWinRate(Situation situation) {
        if (situation.getNbParties() == 0) {
            return 0.5; // Neutre par défaut
        }
        
        // Compter les victoires (resultat = 1)
        // En réalité, il faudrait une table avec historique complet
        // Pour l'instant, onretourne 0.5
        return 0.5;
    }
    
    /**
     * Statistiques globales d'apprentissage
     */
    public long getTotalSituationsLearned() {
        return situationRepository.count();
    }
}
