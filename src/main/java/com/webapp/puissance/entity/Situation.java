package com.webapp.puissance.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "situation")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Situation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "base3_hex", columnDefinition = "TEXT")
    private String base3Hex;

    @Column(name = "sym_base3_hex", columnDefinition = "TEXT")
    private String symBase3Hex;

    @Column(name = "nb_parties")
    private Integer nbParties;

    @Column(name = "move_number")
    private Integer moveNumber;

    @Column(name = "resultat")
    private Integer resultat;
}
