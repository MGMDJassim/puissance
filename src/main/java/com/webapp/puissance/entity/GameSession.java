package com.webapp.puissance.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "partie")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "situation_id")
    private Integer situationId;

    @Column(name = "sequence", columnDefinition = "TEXT")
    private String sequence;

    @Column(name = "nb_coups")
    private Integer nbCoups = 0;

    @Column(name = "winner")
    private Integer winner;

    @Column(name = "mode", length = 20)
    private String mode;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Transient
    private int rows = 9;
    
    @Transient
    private int cols = 9;
    
    @Transient
    private int currentPlayer = 1;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }


    public String getStatus() {
        return (winner != null && winner > 0) ? "TERMINEE" : "EN_COURS";
    }

    public boolean isGameOver() {
        return winner != null && winner > 0;
    }
}
