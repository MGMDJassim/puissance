package com.webapp.puissance.model;

import com.webapp.puissance.entity.Situation;
import com.webapp.puissance.repository.SituationRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * IA guidée par les données - utilise l'historique des parties 
 * pour prendre les meilleures décisions
 * 
 * Utilise la table "situation" codée en hexadécimal :
 * - base3_hex : plateau encodé en base3 convertie en hex
 * - move_number : colonne jouée dans cette situation
 * - nb_parties : nombre de fois ce coup a été joué depuis cette position
 */
@Component
public class DataDrivenAI {
    
    private final SituationRepository situationRepository;
    
    public DataDrivenAI(SituationRepository situationRepository) {
        this.situationRepository = situationRepository;
    }
    
    /**
     * Choisir le meilleur coup basé sur l'historique des données
     * 
     * Utilise la colonne avec le nb_parties le plus élevé
     * (heuristique : coups populaires = coups performants)
     * 
     * @param game la partie en cours
     * @return numéro de colonne (0-8) pour le meilleur coup
     */
    public int chooseColumn(Game game) {
        // Convertir le plateau actuel en représentation hexadécimale
        String boardHex = convertBoardToHex(game);
        
        int bestColumn = -1;
        int bestNbParties = -1;
        
        // Pour chaque colonne possible
        for (int col = 0; col < 9; col++) {
            // Vérifier si la colonne est valide (pas pleine)
            if (game.getCell(0, col) != 0) {
                continue; // Colonne pleine
            }
            
            // Requêter la situation : base3_hex + move_number
            Optional<Situation> situation = situationRepository.findByBase3HexAndMoveNumber(boardHex, col);
            
            if (situation.isPresent()) {
                int nbParties = situation.get().getNbParties();
                // Choisir le coup qui a été joué le plus souvent
                if (nbParties > bestNbParties) {
                    bestNbParties = nbParties;
                    bestColumn = col;
                }
            }
        }
        
        // Si aucun historique trouvé, retourner la première colonne valide
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
     * Obtenir les scores (popularité historique) pour toutes les colonnes
     * 
     * @param game la partie en cours
     * @return tableau de scores pour chaque colonne (nb_parties ou -1 si colonne pleine)
     */
    public int[] getColumnScores(Game game) {
        int[] scores = new int[9];
        String boardHex = convertBoardToHex(game);
        
        for (int col = 0; col < 9; col++) {
            if (game.getCell(0, col) != 0) {
                scores[col] = -1; // Colonne pleine, score invalide
            } else {
                Optional<Situation> situation = situationRepository.findByBase3HexAndMoveNumber(boardHex, col);
                scores[col] = situation.isPresent() ? situation.get().getNbParties() : 0;
            }
        }
        
        return scores;
    }
    
    /**
     * Convertir le plateau de jeu en représentation hexadécimale
     * Format "base3" : chaque cellule est 0, 1 ou 2
     * Puis convertir par groupes de 2 chiffres en hexadécimal
     * 
     * @param game la partie
     * @return représentation hexadécimale du plateau
     */
    private String convertBoardToHex(Game game) {
        int[][] board = game.getBoardCopy();
        StringBuilder base3 = new StringBuilder();
        
        // Parcourir le plateau ligne par ligne et encoder en base 3
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                base3.append(board[row][col]); // 0 = vide, 1 = joueur1, 2 = joueur2
            }
        }
        
        // Convertir base3 en hexadécimal
        return base3ToHex(base3.toString());
    }
    
    /**
     * Convertir une chaine base3 en hexadecimal
     * Regroupe les chiffres base3 par paire et convertit chaque paire en hex
     * 
     * @param base3String chaine de chiffres 0/1/2
     * @return representation hexadecimale
     */
    private String base3ToHex(String base3String) {
        StringBuilder hex = new StringBuilder();
        
        // Traiter la chaine par groupes de 2 caracteres
        for (int i = 0; i < base3String.length(); i += 2) {
            String pair;
            if (i + 1 < base3String.length()) {
                pair = base3String.substring(i, i + 2);
            } else {
                pair = base3String.substring(i) + "0"; // Padding si nombre impair
            }
            
            try {
                // Convertir la paire base3 en base 10 puis en hex
                int value = Integer.parseInt(pair, 3);
                hex.append(Integer.toHexString(value));
            } catch (NumberFormatException e) {
                hex.append("0");
            }
        }
        
        return hex.toString();
    }
}
