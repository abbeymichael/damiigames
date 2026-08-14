export type Player = "white" | "black";
export type Piece = { player: Player; king: boolean };
export type Board = Array<Piece | null>;
export type Move = { from: number; to: number; captured?: number; isCapture?: boolean };

const SIZE = 10;
const idx = (row: number, col: number) => row * SIZE + col;
export const rowOf = (square: number) => Math.floor(square / SIZE);
export const colOf = (square: number) => square % SIZE;
const inside = (row: number, col: number) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;

export function createBoard(): Board {
  return Array.from({ length: 100 }, (_, square) => {
    const row = rowOf(square);
    const col = colOf(square);
    if ((row + col) % 2 === 0) return null;
    if (row < 4) return { player: "black", king: false };
    if (row > 5) return { player: "white", king: false };
    return null;
  });
}

export function capturesFor(board: Board, from: number): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const row = rowOf(from);
  const col = colOf(from);
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const moves: Move[] = [];
  if (!piece.king) {
    for (const [dr, dc] of directions) {
      const middleRow = row + dr;
      const middleCol = col + dc;
      const landingRow = row + dr * 2;
      const landingCol = col + dc * 2;
      if (!inside(landingRow, landingCol)) continue;
      const middle = board[idx(middleRow, middleCol)];
      const landing = idx(landingRow, landingCol);
      if (middle && middle.player !== piece.player && !board[landing]) {
        moves.push({ from, to: landing, captured: idx(middleRow, middleCol) });
      }
    }
    return moves;
  }
  for (const [dr, dc] of directions) {
    let scanRow = row + dr;
    let scanCol = col + dc;
    let enemy: number | undefined;
    while (inside(scanRow, scanCol)) {
      const square = idx(scanRow, scanCol);
      const occupant = board[square];
      if (!occupant) {
        if (enemy !== undefined) moves.push({ from, to: square, captured: enemy });
      } else if (occupant.player === piece.player || enemy !== undefined) {
        break;
      } else enemy = square;
      scanRow += dr;
      scanCol += dc;
    }
  }
  return moves;
}

export function simpleMovesFor(board: Board, from: number): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const row = rowOf(from);
  const col = colOf(from);
  const moves: Move[] = [];
  const directions = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.player === "white" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  for (const [dr, dc] of directions) {
    let nextRow = row + dr;
    let nextCol = col + dc;
    while (inside(nextRow, nextCol)) {
      const square = idx(nextRow, nextCol);
      if (board[square]) break;
      moves.push({ from, to: square });
      if (!piece.king) break;
      nextRow += dr;
      nextCol += dc;
    }
  }
  return moves;
}

export function legalMoves(board: Board, player: Player, forcedFrom: number | null = null): Move[] {
  if (forcedFrom !== null) return capturesFor(board, forcedFrom);
  const pieces = board.flatMap((piece, square) => piece?.player === player ? [square] : []);
  const captures = pieces.flatMap((square) => capturesFor(board, square));
  return captures.length ? captures : pieces.flatMap((square) => simpleMovesFor(board, square));
}

export function applyMove(board: Board, player: Player, forcedFrom: number | null, from: number, to: number) {
  const move = legalMoves(board, player, forcedFrom).find((candidate) => candidate.from === from && candidate.to === to);
  if (!move) throw new Error("Illegal move");
  const next = board.map((piece) => piece ? { ...piece } : null);
  const piece = next[from];
  if (!piece) throw new Error("Piece missing");
  next[from] = null;
  next[to] = piece;
  if (move.captured !== undefined) next[move.captured] = null;
  const more = move.captured !== undefined ? capturesFor(next, to) : [];
  if (more.length) return { board: next, turn: player, forcedFrom: to, winner: null as Player | null, captured: true };
  if ((piece.player === "white" && rowOf(to) === 0) || (piece.player === "black" && rowOf(to) === 9)) piece.king = true;
  const opponent: Player = player === "white" ? "black" : "white";
  const opponentCount = next.filter((candidate) => candidate?.player === opponent).length;
  const winner = opponentCount === 0 || legalMoves(next, opponent).length === 0 ? player : null;
  return { board: next, turn: opponent, forcedFrom: null, winner, captured: move.captured !== undefined };
}

export function getBestCpuMove(
  board: Board,
  player: Player,
  forcedFrom: number | null,
  difficulty: "easy" | "medium" | "hard" = "medium"
): Move | null {
  const moves = legalMoves(board, player, forcedFrom);
  if (moves.length === 0) return null;

  // Compulsory captures first
  const captureMoves = moves.filter((m) => m.captured !== undefined);
  const candidates = captureMoves.length > 0 ? captureMoves : moves;

  if (difficulty === "easy") {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  let bestMove = candidates[0];
  let maxScore = -9999;

  for (const move of candidates) {
    let score = 0;
    if (move.captured !== undefined) score += 50;
    const piece = board[move.from];
    if (piece) {
      if (!piece.king) {
        const targetRow = rowOf(move.to);
        if ((player === "white" && targetRow === 0) || (player === "black" && targetRow === 9)) {
          score += 40;
        }
      }
      const targetCol = colOf(move.to);
      if (targetCol >= 3 && targetCol <= 6) score += 10;
    }

    if (difficulty === "hard") {
      try {
        const res = applyMove(board, player, forcedFrom, move.from, move.to);
        if (res.winner === player) {
          score += 500;
        } else if (res.turn !== player) {
          const opponentMoves = legalMoves(res.board, res.turn, res.forcedFrom);
          const opponentCaptures = opponentMoves.filter((m) => m.captured !== undefined);
          if (opponentCaptures.length > 0) {
            score -= 35;
          }
        }
      } catch {
        /* fallback */
      }
    }

    score += Math.random() * 5;

    if (score > maxScore) {
      maxScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

export function playerName(player: Player) {
  return player === "white" ? "Player 1" : "Player 2";
}

export function squareToAlgebraic(square: number): string {
  const row = rowOf(square);
  const col = colOf(square);
  const colLetter = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"][col];
  const rowNum = 10 - row;
  return `${colLetter}${rowNum}`;
}

export function squareToDraughtsNum(square: number): number {
  const row = rowOf(square);
  const col = colOf(square);
  return row * 5 + Math.floor(col / 2) + 1;
}

export function getEloBadge(rating: number): { label: string; colorClass: string; bgClass: string; icon: string } {
  if (rating >= 1800) {
    return { label: "Grandmaster", colorClass: "text-amber-400 border-amber-500/50", bgClass: "bg-amber-950/80 text-amber-300", icon: "👑" };
  } else if (rating >= 1600) {
    return { label: "Master", colorClass: "text-purple-400 border-purple-500/50", bgClass: "bg-purple-950/80 text-purple-300", icon: "⚔️" };
  } else if (rating >= 1400) {
    return { label: "Expert", colorClass: "text-cyan-400 border-cyan-500/50", bgClass: "bg-cyan-950/80 text-cyan-300", icon: "🛡️" };
  } else if (rating >= 1200) {
    return { label: "Challenger", colorClass: "text-emerald-400 border-emerald-500/50", bgClass: "bg-emerald-950/80 text-emerald-300", icon: "🔥" };
  } else {
    return { label: "Apprentice", colorClass: "text-slate-300 border-slate-700", bgClass: "bg-slate-800 text-slate-300", icon: "🌱" };
  }
}

export function calculateEloDelta(playerRating: number, opponentRating: number, isWin: boolean, isDraw = false): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const score = isWin ? 1 : isDraw ? 0.5 : 0;
  return Math.round(K * (score - expected));
}

export function formatMoveNotation(
  fromOrMove: number | Move,
  to?: number,
  isCapture?: boolean
): { notation: string; algNotation: string; sqNotation: string; toString(): string } {
  let fromSq: number;
  let toSq: number;
  let capturedFlag: boolean;

  if (typeof fromOrMove === "object" && fromOrMove !== null) {
    fromSq = fromOrMove.from;
    toSq = fromOrMove.to;
    capturedFlag = Boolean(isCapture ?? (fromOrMove.captured !== undefined || Boolean(fromOrMove.isCapture)));
  } else {
    fromSq = fromOrMove;
    toSq = to ?? 0;
    capturedFlag = Boolean(isCapture);
  }

  const fromNum = squareToDraughtsNum(fromSq);
  const toNum = squareToDraughtsNum(toSq);
  const separator = capturedFlag ? "x" : "-";
  const notation = `${fromNum}${separator}${toNum}`;

  const fromAlg = squareToAlgebraic(fromSq);
  const toAlg = squareToAlgebraic(toSq);
  const algNotation = `${fromAlg}${separator}${toAlg}`;

  const sqNotation = `${fromSq}${separator}${toSq}`;

  return {
    notation,
    algNotation,
    sqNotation,
    toString() {
      return this.notation;
    },
  };
}


