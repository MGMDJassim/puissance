package com.webapp.puissance.repository;

import com.webapp.puissance.entity.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameSessionRepository extends JpaRepository<GameSession, Long> {
    List<GameSession> findAllByOrderByCreatedAtDesc();
    
    @Query("SELECT gs FROM GameSession gs WHERE gs.winner = 0 ORDER BY gs.createdAt DESC")
    List<GameSession> findOngoingGames();
    
    @Query("SELECT gs FROM GameSession gs WHERE gs.winner != 0 ORDER BY gs.createdAt DESC")
    List<GameSession> findCompletedGames();
    
    @Query("SELECT DISTINCT gs.mode FROM GameSession gs WHERE gs.mode IS NOT NULL")
    List<String> findDistinctModes();
}
