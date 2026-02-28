-- Script SQL pour créer la base de données PostgreSQL pour Puissance 4

-- Créer la base de données (à exécuter en tant que superuser)
CREATE DATABASE puissance4_db
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'French_France.1252'
    LC_CTYPE = 'French_France.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Se connecter à la base de données
\c puissance4_db;

-- La table sera créée automatiquement par Hibernate avec spring.jpa.hibernate.ddl-auto=update
-- Mais voici le schéma pour référence :

/*
CREATE TABLE games (
    id BIGSERIAL PRIMARY KEY,
    board_state TEXT NOT NULL,
    current_player INTEGER,
    game_over BOOLEAN,
    winner INTEGER,
    ai_mode BOOLEAN,
    ai_difficulty INTEGER,
    move_history TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    player1_name VARCHAR(255),
    player2_name VARCHAR(255)
);

CREATE INDEX idx_game_over ON games(game_over);
CREATE INDEX idx_ai_mode ON games(ai_mode);
CREATE INDEX idx_created_at ON games(created_at DESC);
CREATE INDEX idx_winner ON games(winner);
*/
