package com.webapp.puissance.model;

import com.webapp.puissance.entity.Situation;
import com.webapp.puissance.repository.SituationRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * IA guidée par la base de données
 * Utilise la table "situation" pour prendre les meilleures décisions
 * 
 * Structure table :
 * - base3_hex : plateau encodé en base3 converti en hexadécimal
 * - sym_base3_hex : plateau symétrique
 * - move_number : colonne jouée (1-9)
 * - nb_parties : nombre de fois ce coup a été joué depuis cette position
 */
@Component
public class DBBasedAI {
    
    private final SituationRepository situationRepository;
    
    public DBBasedAI(SituationRepository situationRepository) {
        this.situationRepository = situationRepository;
    }
    
    /**
     * Choisir le meilleur coup basé sur la BD
     * Sélectionne le coup avec le nb_parties le plus élevé
     * (heuristique : coups populaires = coups gagnants)
     * 
     * @param game la partie en cours
     * @return numéro de colonne (0-8), ou -1 si aucun coup valide
     */
    public int chooseColumn(Game game) {
        // Encoder le plateau en hexadécimal
        int[][] board = game.getBoardCopy();
        String[] canonical = Game.getCanonicalAndSymmetric(board);
        String boardHex = canonical[0];
        
        int bestColumn = -1;
        int bestNbParties = -1;
        
        // Tester chaque colonne
        for (int col = 0; col < 9; col++) {
            // Vérifier que la colonne n'est pas pleine
            if (game.getCell(0, col) != 0) {
                continue; // Colonne pleine
            }
            
            // Rechercher dans la BD
            // move_number est en 1-based dans la table
            Optional<Situation> situation = situationRepository.findByBase3HexAndMoveNumber(boardHex, col + 1);
            
            if (situation.isPresent()) {
                int nbParties = situation.get().getNbParties();
                
                // Sélectionner le coup avec le plus d'historique
                if (nbParties > bestNbParties) {
                    bestNbParties = nbParties;
                    bestColumn = col;
                }
            }
        }
        
        // Si aucun coup historique trouvé, retourner une colonne valide au hasard
        if (bestColumn == -1) {
            for (int col = 0; col < 9; col++) {
                if (game.getCell(0, col) == 0) {
                    bestColumn = col;
                    break;
                }
            }
        }
        
        return bestColumn;
    }
    
    /**
     * Obtenir les scores pour toutes les colonnes
     * Score = nb_parties pour chaque colonne
     * 
     * @param game la partie en cours
     * @return tableau de scores (ou -1 si colonne pleine/pas de données)
     */
    public int[] getColumnScores(Game game) {
        int[] scores = new int[9];
        int[][] board = game.getBoardCopy();
        String[] canonical = Game.getCanonicalAndSymmetric(board);
        String boardHex = canonical[0];
        
        for (int col = 0; col < 9; col++) {
            if (game.getCell(0, col) != 0) {
                scores[col] = -1; // Colonne pleine
            } else {
                Optional<Situation> situation = situationRepository.findByBase3HexAndMoveNumber(boardHex, col + 1);
                scores[col] = situation.isPresent() ? situation.get().getNbParties() : 0;
            }
        }
        
        return scores;
    }
    
    /**
     * Obtenir les statistiques pour une position donnée
     * 
     * @param game la partie
     * @return liste de toutes les situations correspondantes dans la BD
     */
    public List<Situation> getPositionStats(Game game) {
        int[][] board = game.getBoardCopy();
        String[] canonical = Game.getCanonicalAndSymmetric(board);
        String boardHex = canonical[0];
        
        return situationRepository.findByBase3Hex(boardHex);
    }
}
