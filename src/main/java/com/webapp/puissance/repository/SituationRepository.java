package com.webapp.puissance.repository;

import com.webapp.puissance.entity.Situation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SituationRepository extends JpaRepository<Situation, Integer> {
    
    /**
     * Trouver toutes les situations avec un état de plateau donné
     */
    List<Situation> findByBase3Hex(String base3Hex);
    
    /**
     * Trouver une situation par plateau ET numéro de coup
     */
    Optional<Situation> findByBase3HexAndMoveNumber(String base3Hex, Integer moveNumber);
    
    /**
     * Trouver les situations symétriques
     */
    List<Situation> findBySymBase3Hex(String symBase3Hex);
    
    /**
     * Compter le nombre de situations avec un certain résultat
     */
    @Query("SELECT COUNT(s) FROM Situation s WHERE s.base3Hex = :boardHash AND s.resultat = :result")
    long countByBoardAndResult(@Param("boardHash") String boardHash, @Param("result") Integer result);
    
    /**
     * Obtenir les statistiques de victoire pour une position donnée
     */
    @Query("SELECT s FROM Situation s WHERE s.base3Hex = :boardHash ORDER BY s.resultat DESC")
    List<Situation> findBestMovesForPosition(@Param("boardHash") String boardHash);
}
