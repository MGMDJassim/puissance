package com.webapp.puissance.model;

import java.util.ArrayList;
import java.util.List;
import java.math.BigInteger;

public class Game {
    private final int rows = 9;
    private final int cols = 9;
    private final int winLength = 4;
    private final int[][] board;
    private int currentPlayer = 1;
    private boolean gameOver = false;
    private int[][] winningPositions = null;
    private final List<Integer> moveHistory = new ArrayList<>();

    public Game() {
        board = new int[rows][cols];
    }

    public int getRows() { return rows; }
    public int getCols() { return cols; }

    public int getCell(int r, int c) { return board[r][c]; }

    public int getCurrentPlayer() { return currentPlayer; }

    public boolean isGameOver() { return gameOver; }

    public void reset() {
        for (int i = 0; i < rows; i++) for (int j = 0; j < cols; j++) board[i][j] = 0;
        currentPlayer = 1;
        gameOver = false;
        winningPositions = null;
        moveHistory.clear();
    }

    public int drop(int c) {
        if (gameOver) return -1;
        if (c < 0 || c >= cols) return -1;
        for (int r = rows - 1; r >= 0; r--) {
            if (board[r][c] == 0) {
                board[r][c] = currentPlayer;
                // record move as 1-based column index for storage
                moveHistory.add(c + 1);
                boolean win = checkWin(r, c);
                if (win) gameOver = true;
                else currentPlayer = 3 - currentPlayer;
                return r;
            }
        }
        return -1;
    }

    public void undo() {
        if (moveHistory.isEmpty() || gameOver) return;
        int lastCol = moveHistory.remove(moveHistory.size() - 1) - 1; // convert back to 0-based
        for (int r = 0; r < rows; r++) {
            if (board[r][lastCol] != 0) {
                board[r][lastCol] = 0;
                currentPlayer = 3 - currentPlayer;
                gameOver = false;
                winningPositions = null;
                break;
            }
        }
    }

    private boolean checkWin(int r, int c) {
        int p = board[r][c];
        if (p == 0) return false;
        int[][] dirs = { {0,1}, {1,0}, {1,1}, {1,-1} };
        for (int[] d : dirs) {
            int cnt = 1;
            cnt += countDirection(r, c, d[0], d[1], p);
            cnt += countDirection(r, c, -d[0], -d[1], p);
            if (cnt >= winLength) {
                winningPositions = collectWinningPositions(r, c, d[0], d[1], winLength, p);
                return true;
            }
        }
        return false;
    }

    private int[][] collectWinningPositions(int r, int c, int dr, int dc, int winLen, int p) {
        List<int[]> list = new ArrayList<>();
        list.add(new int[]{r, c});
        int rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && board[rr][cc] == p && list.size() < winLen) {
            list.add(new int[]{rr, cc}); rr += dr; cc += dc;
        }
        rr = r - dr; cc = c - dc;
        while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && board[rr][cc] == p && list.size() < winLen) {
            list.add(0, new int[]{rr, cc}); rr -= dr; cc -= dc;
        }
        // if more than winLen, trim center portion
        if (list.size() > winLen) {
            int start = (list.size() - winLen) / 2;
            List<int[]> trimmed = list.subList(start, start + winLen);
            int[][] res = new int[winLen][2];
            for (int i = 0; i < winLen; i++) res[i] = trimmed.get(i);
            return res;
        }
        int[][] res = new int[list.size()][2];
        for (int i = 0; i < list.size(); i++) res[i] = list.get(i);
        return res;
    }

    private int countDirection(int r, int c, int dr, int dc, int p) {
        int cnt = 0;
        int rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && board[rr][cc] == p) {
            cnt++; rr += dr; cc += dc;
        }
        return cnt;
    }

    public int[][] getBoardCopy() {
        int[][] copy = new int[rows][cols];
        for (int i = 0; i < rows; i++) System.arraycopy(board[i], 0, copy[i], 0, cols);
        return copy;
    }

    public int getWinLength() { return winLength; }

    public int[][] getWinningPositions() { return winningPositions; }

    public List<Integer> getMoveHistory() { return new ArrayList<>(moveHistory); }

    public int getWinner() { return gameOver ? currentPlayer : 0; }

    public static int dropOnBoard(int[][] board, int col, int player) {
        int rows = board.length;
        int cols = board[0].length;
        if (col < 0 || col >= cols) return -1;
        for (int r = rows - 1; r >= 0; r--) {
            if (board[r][col] == 0) {
                board[r][col] = player;
                return r;
            }
        }
        return -1;
    }

    public static boolean checkWinOnBoard(int[][] board, int r, int c, int winLength) {
        int p = board[r][c];
        if (p == 0) return false;
        int[][] dirs = { {0,1}, {1,0}, {1,1}, {1,-1} };
        for (int[] d : dirs) {
            int cnt = 1;
            cnt += countDirectionOnBoard(board, r, c, d[0], d[1], p);
            cnt += countDirectionOnBoard(board, r, c, -d[0], -d[1], p);
            if (cnt >= winLength) return true;
        }
        return false;
    }

    private static int countDirectionOnBoard(int[][] board, int r, int c, int dr, int dc, int p) {
        int cnt = 0;
        int rr = r + dr, cc = c + dc;
        int rows = board.length;
        int cols = board[0].length;
        while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && board[rr][cc] == p) {
            cnt++; rr += dr; cc += dc;
        }
        return cnt;
    }

    // ===== ENCODAGE HEXADÉCIMAL (compatible DAO) =====
    
    /**
     * Encode le plateau en base 3, puis convertit en hexadécimal
     * Format : chaque cellule (0/1/2) est un chiffre base 3
     * Lecture : ligne par ligne, colonne par colonne
     * 
     * @param board le plateau de jeu
     * @return représentation hexadécimale du plateau
     */
    public static String toHex(int[][] board) {
        BigInteger value = BigInteger.ZERO;
        BigInteger base = BigInteger.valueOf(3);
        int rows = board.length;
        int cols = board[0].length;
        
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                value = value.multiply(base).add(BigInteger.valueOf(board[r][c]));
            }
        }
        
        return value.toString(16).toUpperCase();
    }
    
    /**
     * Retourne le miroir horizontal du plateau (colonnes inversées)
     * 
     * @param board le plateau
     * @return plateau miroir
     */
    public static int[][] mirror(int[][] board) {
        int rows = board.length;
        int cols = board[0].length;
        int[][] sym = new int[rows][cols];
        
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                sym[r][c] = board[r][cols - 1 - c];
            }
        }
        
        return sym;
    }
    
    /**
     * Forme canonique : sélectionne la plus petite représentation hex
     * entre le plateau et son symétrique
     * 
     * @param a première représentation hex
     * @param b deuxième représentation hex
     * @return la plus petite (lexicographiquement après padding)
     */
    public static String canonical(String a, String b) {
        // Padder à la même longueur avant comparaison
        int len = Math.max(a.length(), b.length());
        String pa = String.format("%" + len + "s", a).replace(' ', '0');
        String pb = String.format("%" + len + "s", b).replace(' ', '0');
        return pa.compareTo(pb) <= 0 ? a : b;
    }
    
    /**
     * Calcule la position canonique avec son symétrique
     * Retourne un tableau [canonique, symétrique]
     * 
     * @param board le plateau
     * @return [canonical_hex, sym_hex]
     */
    public static String[] getCanonicalAndSymmetric(int[][] board) {
        String hex = toHex(board);
        String symHex = toHex(mirror(board));
        String canonical = canonical(hex, symHex);
        String symCanonical = canonical.equals(hex) ? symHex : hex;
        return new String[]{canonical, symCanonical};
    }
}