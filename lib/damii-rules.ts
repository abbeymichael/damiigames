export type Player = "white" | "black";
export type Piece = { player: Player; king: boolean };
export type Board = Array<Piece | null>;
export type Move = { from: number; to: number; captured?: number; isCapture?: boolean };

export type CaptureRuleVariation = "standard_compulsory" | "maximum_quantity" | "free_choice";
export type FlyingKingVariation = "unlimited_diagonal" | "restricted_steps" | "classic_single";
export type PromotionVariation = "immediate" | "next_turn";
export type SeriesFormatVariation = "bo1" | "bo3" | "bo5";

export interface RuleConfig {
  captureRule?: CaptureRuleVariation;
  flyingKings?: FlyingKingVariation;
  kingCapturePromotion?: PromotionVariation;
  backwardMenCapture?: boolean; // default: true in 10x10 Damii
  allowDrawOffer?: boolean;
  repetitionDrawLimit?: number;
  matchSeries?: SeriesFormatVariation;
}

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

export function capturesFor(board: Board, from: number, rules?: RuleConfig): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const row = rowOf(from);
  const col = colOf(from);
  const moves: Move[] = [];

  const flyingVariation = rules?.flyingKings || "unlimited_diagonal";
  const allowBackwardMenCapture = rules?.backwardMenCapture ?? true;

  if (!piece.king) {
    const directions = allowBackwardMenCapture
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : piece.player === "white"
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];

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

  // King piece captures
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  if (flyingVariation === "classic_single") {
    // Classic single-step jumping only (like English draughts / American checkers)
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

  const maxSteps = flyingVariation === "restricted_steps" ? 3 : 9;

  for (const [dr, dc] of directions) {
    let scanRow = row + dr;
    let scanCol = col + dc;
    let enemy: number | undefined;
    let steps = 0;

    while (inside(scanRow, scanCol) && steps < maxSteps) {
      steps++;
      const square = idx(scanRow, scanCol);
      const occupant = board[square];
      if (!occupant) {
        if (enemy !== undefined) moves.push({ from, to: square, captured: enemy });
      } else if (occupant.player === piece.player || enemy !== undefined) {
        break;
      } else {
        enemy = square;
      }
      scanRow += dr;
      scanCol += dc;
    }
  }
  return moves;
}

export function simpleMovesFor(board: Board, from: number, rules?: RuleConfig): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const row = rowOf(from);
  const col = colOf(from);
  const moves: Move[] = [];

  const flyingVariation = rules?.flyingKings || "unlimited_diagonal";

  const directions = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.player === "white"
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];

  const maxSteps = !piece.king
    ? 1
    : flyingVariation === "classic_single"
    ? 1
    : flyingVariation === "restricted_steps"
    ? 3
    : 9;

  for (const [dr, dc] of directions) {
    let nextRow = row + dr;
    let nextCol = col + dc;
    let steps = 0;

    while (inside(nextRow, nextCol) && steps < maxSteps) {
      steps++;
      const square = idx(nextRow, nextCol);
      if (board[square]) break;
      moves.push({ from, to: square });
      nextRow += dr;
      nextCol += dc;
    }
  }
  return moves;
}

// Calculate the maximum number of consecutive captures from a given square
function countMaxConsecutiveCaptures(board: Board, square: number, rules?: RuleConfig, visitedCaptures: Set<number> = new Set()): number {
  const immediateCaptures = capturesFor(board, square, rules);
  if (immediateCaptures.length === 0) return 0;

  let maxDepth = 0;
  for (const move of immediateCaptures) {
    if (move.captured !== undefined && visitedCaptures.has(move.captured)) continue;

    const nextBoard = board.map((p) => (p ? { ...p } : null));
    const piece = nextBoard[move.from];
    if (!piece) continue;

    nextBoard[move.from] = null;
    nextBoard[move.to] = piece;
    if (move.captured !== undefined) nextBoard[move.captured] = null;

    const nextVisited = new Set(visitedCaptures);
    if (move.captured !== undefined) nextVisited.add(move.captured);

    const subCaptures = countMaxConsecutiveCaptures(nextBoard, move.to, rules, nextVisited);
    maxDepth = Math.max(maxDepth, 1 + subCaptures);
  }
  return maxDepth;
}

export function legalMoves(board: Board, player: Player, forcedFrom: number | null = null, rules?: RuleConfig): Move[] {
  if (forcedFrom !== null) return capturesFor(board, forcedFrom, rules);

  const pieces = board.flatMap((piece, square) => (piece?.player === player ? [square] : []));
  const captureRule = rules?.captureRule || "standard_compulsory";

  const allCaptures = pieces.flatMap((square) => capturesFor(board, square, rules));

  if (captureRule === "free_choice") {
    // Both captures and non-captures are legal simultaneously
    const allSimple = pieces.flatMap((square) => simpleMovesFor(board, square, rules));
    return [...allCaptures, ...allSimple];
  }

  if (allCaptures.length === 0) {
    return pieces.flatMap((square) => simpleMovesFor(board, square, rules));
  }

  if (captureRule === "maximum_quantity") {
    // Filter to only the pieces and moves that maximize total capture depth
    let maxQuantity = 0;
    const captureDepths: { move: Move; depth: number }[] = [];

    for (const move of allCaptures) {
      const nextBoard = board.map((p) => (p ? { ...p } : null));
      const piece = nextBoard[move.from];
      if (!piece) continue;
      nextBoard[move.from] = null;
      nextBoard[move.to] = piece;
      if (move.captured !== undefined) nextBoard[move.captured] = null;

      const remaining = countMaxConsecutiveCaptures(nextBoard, move.to, rules, new Set(move.captured !== undefined ? [move.captured] : []));
      const totalDepth = 1 + remaining;
      maxQuantity = Math.max(maxQuantity, totalDepth);
      captureDepths.push({ move, depth: totalDepth });
    }

    const maxMoves = captureDepths.filter((cd) => cd.depth === maxQuantity).map((cd) => cd.move);
    return maxMoves.length > 0 ? maxMoves : allCaptures;
  }

  // Standard compulsory: Must capture, but can choose any capture path
  return allCaptures;
}

export function applyMove(
  board: Board,
  player: Player,
  forcedFrom: number | null,
  from: number,
  to: number,
  rules?: RuleConfig
) {
  const move = legalMoves(board, player, forcedFrom, rules).find((candidate) => candidate.from === from && candidate.to === to);
  if (!move) throw new Error("Illegal move");

  const next = board.map((piece) => (piece ? { ...piece } : null));
  const piece = next[from];
  if (!piece) throw new Error("Piece missing");

  next[from] = null;
  next[to] = piece;
  if (move.captured !== undefined) next[move.captured] = null;

  // Check king promotion
  const promotionRule = rules?.kingCapturePromotion || "immediate";
  const reachedKingRow = (piece.player === "white" && rowOf(to) === 0) || (piece.player === "black" && rowOf(to) === 9);

  let promotedNow = false;
  if (!piece.king && reachedKingRow) {
    if (promotionRule === "immediate") {
      piece.king = true;
      promotedNow = true;
    }
  }

  const more = move.captured !== undefined ? capturesFor(next, to, rules) : [];

  if (more.length) {
    // Multi-jump in flight: if next_turn promotion, piece stays man during multi-jump
    return {
      board: next,
      turn: player,
      forcedFrom: to,
      winner: null as Player | null,
      captured: true,
      promoted: promotedNow,
    };
  }

  // Turn ended: if piece reached king row and promotion was next_turn, promote now
  if (!piece.king && reachedKingRow) {
    piece.king = true;
    promotedNow = true;
  }

  const opponent: Player = player === "white" ? "black" : "white";
  const opponentCount = next.filter((candidate) => candidate?.player === opponent).length;
  const winner = opponentCount === 0 || legalMoves(next, opponent, null, rules).length === 0 ? player : null;

  return {
    board: next,
    turn: opponent,
    forcedFrom: null,
    winner,
    captured: move.captured !== undefined,
    promoted: promotedNow,
  };
}

export function getBestCpuMove(
  board: Board,
  player: Player,
  forcedFrom: number | null,
  difficulty: "easy" | "medium" | "hard" = "medium",
  rules?: RuleConfig
): Move | null {
  const moves = legalMoves(board, player, forcedFrom, rules);
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
        const res = applyMove(board, player, forcedFrom, move.from, move.to, rules);
        if (res.winner === player) {
          score += 500;
        } else if (res.turn !== player) {
          const opponentMoves = legalMoves(res.board, res.turn, res.forcedFrom, rules);
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


