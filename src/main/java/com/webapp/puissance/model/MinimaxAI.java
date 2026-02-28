package com.webapp.puissance.model;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public class MinimaxAI {
    private final int maxDepth;
    private final int me;

    public MinimaxAI(int me, int maxDepth) {
        this.me = me;
        this.maxDepth = maxDepth;
    }

    public int chooseColumn(Game game) {
        int[][] board = game.getBoardCopy();
        List<Integer> bestCols = new ArrayList<>();
        int bestScore = Integer.MIN_VALUE;
        List<Integer> immediateWins = new ArrayList<>();
        for (int c = 0; c < game.getCols(); c++) {
            int[][] copy = copyBoard(board);
            int r = Game.dropOnBoard(copy, c, me);
            if (r == -1) continue;
            if (Game.checkWinOnBoard(copy, r, c, game.getWinLength())) {
                immediateWins.add(c);
                continue;
            }
            int score = minimax(copy, game.getWinLength(), 1, false, 3 - me);
            if (score > bestScore) {
                bestScore = score;
                bestCols.clear();
                bestCols.add(c);
            } else if (score == bestScore) {
                bestCols.add(c);
            }
        }

        if (!immediateWins.isEmpty()) {
            int idx = ThreadLocalRandom.current().nextInt(immediateWins.size());
            return immediateWins.get(idx);
        }

        if (bestCols.isEmpty()) {
            // fallback: first non-full column
            for (int c = 0; c < game.getCols(); c++) if (game.getCell(0, c) == 0) return c;
            return -1;
        }

        int idx = ThreadLocalRandom.current().nextInt(bestCols.size());
        return bestCols.get(idx);
    }

    // Return score for every column (Integer.MIN_VALUE for invalid/full columns)
    public int[] columnScores(Game game) {
        int cols = game.getCols();
        int[][] board = game.getBoardCopy();
        int[] scores = new int[cols];
        for (int c = 0; c < cols; c++) {
            int[][] copy = copyBoard(board);
            int r = Game.dropOnBoard(copy, c, me);
            if (r == -1) {
                scores[c] = Integer.MIN_VALUE;
                continue;
            }
            if (Game.checkWinOnBoard(copy, r, c, game.getWinLength())) {
                scores[c] = 100000; // very high for immediate win
                continue;
            }
            scores[c] = minimax(copy, game.getWinLength(), 1, false, 3 - me);
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
                if (Game.checkWinOnBoard(copy, r, c, winLength)) return 1000 / depth; // quicker win better
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
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
            int p = board[r][c];
            if (p == 0) continue;
            if (Game.checkWinOnBoard(board, r, c, winLength)) {
                if (p == me) return 1000;
                else return -1000;
            }
            // small heuristic: favor center columns
            if (p == me) score += (cols/2 - Math.abs(c - cols/2));
            else score -= (cols/2 - Math.abs(c - cols/2));
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
    

