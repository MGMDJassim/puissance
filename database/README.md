# Configuration PostgreSQL pour Puissance 4

## Prérequis
- PostgreSQL 12+ installé
- pgAdmin 4 (optionnel, pour interface graphique)

## Étapes d'installation

### 1. Créer la base de données

**Option A : Via psql (ligne de commande)**
```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE puissance4_db;

# Vérifier
\l

# Quitter
\q
```

**Option B : Via pgAdmin 4**
1. Ouvrir pgAdmin 4
2. Clic droit sur "Databases" → "Create" → "Database"
3. Nom : `puissance4_db`
4. Owner : `postgres`
5. Cliquer sur "Save"

### 2. Configuration de l'application

Modifier `src/main/resources/application.properties` :

```properties
# URL de connexion (modifier si nécessaire)
spring.datasource.url=jdbc:postgresql://localhost:5432/puissance4_db

# Nom d'utilisateur (modifier si différent)
spring.datasource.username=postgres

# Mot de passe (IMPORTANT : modifier avec votre mot de passe)
spring.datasource.password=VOTRE_MOT_DE_PASSE
```

### 3. Vérification de la connexion

```bash
# Tester la connexion
psql -U postgres -d puissance4_db -c "SELECT version();"
```

### 4. Démarrer l'application

```bash
./mvnw clean install
./mvnw spring-boot:run
```

Les tables seront créées automatiquement au premier démarrage grâce à `spring.jpa.hibernate.ddl-auto=update`

## Structure de la base de données

### Table : games

| Colonne | Type | Description |
|---------|------|-------------|
| id | BIGSERIAL | Clé primaire auto-incrémentée |
| board_state | TEXT | État du plateau (JSON) |
| current_player | INTEGER | Joueur actuel (1 ou 2) |
| game_over | BOOLEAN | Partie terminée |
| winner | INTEGER | Gagnant (0=nul, 1=joueur1, 2=joueur2) |
| ai_mode | BOOLEAN | Mode IA activé |
| ai_difficulty | INTEGER | Difficulté (1-6) |
| move_history | TEXT | Historique des coups (JSON) |
| created_at | TIMESTAMP | Date de création |
| updated_at | TIMESTAMP | Dernière mise à jour |
| player1_name | VARCHAR(255) | Nom du joueur 1 |
| player2_name | VARCHAR(255) | Nom du joueur 2 |

## Requêtes utiles

```sql
-- Voir toutes les parties
SELECT id, game_over, winner, ai_mode, created_at FROM games;

-- Parties en cours
SELECT * FROM games WHERE game_over = false;

-- Parties terminées
SELECT * FROM games WHERE game_over = true;

-- Statistiques des victoires
SELECT winner, COUNT(*) as victories 
FROM games 
WHERE game_over = true AND winner > 0 
GROUP BY winner;

-- Supprimer toutes les parties
TRUNCATE TABLE games;
```

## Dépannage

### Erreur de connexion
- Vérifier que PostgreSQL est démarré : `pg_ctl status`
- Vérifier le port : par défaut 5432
- Vérifier le fichier `pg_hba.conf` pour les autorisations

### Erreur de mot de passe
- Réinitialiser : `ALTER USER postgres PASSWORD 'nouveau_mot_de_passe';`

### Base de données existe déjà
```sql
DROP DATABASE puissance4_db;
CREATE DATABASE puissance4_db;
```
