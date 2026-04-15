package com.webapp.puissance.model;

import java.util.ArrayList;
import java.util.List;

public class MinimaxAI {
    private final int maxDepth;
    private final int me;

    public MinimaxAI(int me, int maxDepth) {
        this.me = me;
        this.maxDepth = maxDepth;
    }

    public int chooseColumn(Game game) {
        int[][] board = game.getBoardCopy();
        int bestCol = -1;
        int bestScore = Integer.MIN_VALUE;
        
        for (int c = 0; c < game.getCols(); c++) {
            int[][] copy = copyBoard(board);
            int r = Game.dropOnBoard(copy, c, me);
            if (r == -1) continue;
            if (Game.checkWinOnBoard(copy, r, c, game.getWinLength())) {
                return c;
            }
        }
        
        int opponent = 3 - me;
        for (int c = 0; c < game.getCols(); c++) {
            int[][] copy = copyBoard(board);
            int r = Game.dropOnBoard(copy, c, opponent);
            if (r != -1 && Game.checkWinOnBoard(copy, r, c, game.getWinLength())) {
                return c;
            }
        }
        
        for (int c = 0; c < game.getCols(); c++) {
            int[][] copy = copyBoard(board);
            int r = Game.dropOnBoard(copy, c, me);
            if (r == -1) continue;
            
            int score = minimax(copy, game.getWinLength(), 1, false, opponent);
            if (score > bestScore) {
                bestScore = score;
                bestCol = c;
            }
        }
        
        return bestCol == -1 ? getFirstValidColumn(board) : bestCol;
    }
    
    private int getFirstValidColumn(int[][] board) {
        for (int c = 0; c < board[0].length; c++) {
            if (board[0][c] == 0) return c;
        }
        return -1;
    }

    public int[] columnScores(Game game) {
        int cols = game.getCols();
        int[][] board = game.getBoardCopy();
        int[] scores = new int[cols];
        int opponent = 3 - me;
        
        for (int c = 0; c < cols; c++) {
            int[][] copy = copyBoard(board);
            int r = Game.dropOnBoard(copy, c, me);
            if (r == -1) {
                scores[c] = Integer.MIN_VALUE;
                continue;
            }
            
            if (Game.checkWinOnBoard(copy, r, c, game.getWinLength())) {
                scores[c] = 100000;
                continue;
            }
            
            int[][] copy2 = copyBoard(board);
            int r2 = Game.dropOnBoard(copy2, c, opponent);
            if (r2 != -1 && Game.checkWinOnBoard(copy2, r2, c, game.getWinLength())) {
                scores[c] = 50000; 
                continue;
            }
            
            scores[c] = minimax(copy, game.getWinLength(), 1, false, opponent);
        }
        return scores;
    }

    private int minimax(int[][] board, int winLength, int depth, boolean maximizing, int currentPlayer) {
        if (depth > maxDepth) return evaluate(board, winLength, me);
        List<Integer> moves = availableMoves(board);
        if (moves.isEmpty()) return 0;
        int best;
        if (maximizing) {
            best = Integer.MIN_VALUE;
            for (int c : moves) {
                int[][] copy = copyBoard(board);
                int r = Game.dropOnBoard(copy, c, currentPlayer);
                if (r == -1) continue;
                if (Game.checkWinOnBoard(copy, r, c, winLength)) return 1000 / depth;
                int val = minimax(copy, winLength, depth + 1, false, 3 - currentPlayer);
                best = Math.max(best, val);
            }
        } else {
            best = Integer.MAX_VALUE;
            for (int c : moves) {
                int[][] copy = copyBoard(board);
                int r = Game.dropOnBoard(copy, c, currentPlayer);
                if (r == -1) continue;
                if (Game.checkWinOnBoard(copy, r, c, winLength)) return -1000 / depth; // opponent win
                int val = minimax(copy, winLength, depth + 1, true, 3 - currentPlayer);
                best = Math.min(best, val);
            }
        }
        return best;
    }

    private int evaluate(int[][] board, int winLength, int me) {
        int score = 0;
        int rows = board.length;
        int cols = board[0].length;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                int p = board[r][c];
                if (p == 0) continue;
                

                if (Game.checkWinOnBoard(board, r, c, winLength)) {
                    if (p == me) return 10000;  
                    else return -10000;          
                }
            }
        }

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                int p = board[r][c];
                if (p == 0) continue;
                
                int centerDist = Math.abs(c - cols / 2);
                int centerBonus = (cols / 2) - centerDist;
                
                if (p == me) {
                    score += centerBonus;
                    if (c >= cols / 3 && c < 2 * cols / 3) score += 10;
                } else {
                    score -= centerBonus;
                    if (c >= cols / 3 && c < 2 * cols / 3) score -= 10;
                }
            }
        }
        
        return score;
    }

    private List<Integer> availableMoves(int[][] board) {
        List<Integer> moves = new ArrayList<>();
        int cols = board[0].length;
        for (int c = 0; c < cols; c++) if (board[0][c] == 0) moves.add(c);
        return moves;
    }

    private int[][] copyBoard(int[][] board) {
        int rows = board.length;
        int cols = board[0].length;
        int[][] copy = new int[rows][cols];
        for (int i = 0; i < rows; i++) System.arraycopy(board[i], 0, copy[i], 0, cols);
        return copy;
    }
}
    

