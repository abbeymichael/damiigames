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

// Board static evaluation heuristic for 10x10 International Damii
function evaluateBoard(board: Board, player: Player, rules?: RuleConfig): number {
  const opponent: Player = player === "white" ? "black" : "white";
  let score = 0;

  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (!piece) continue;

    const isMe = piece.player === player;
    const r = rowOf(i);
    const c = colOf(i);

    // 1. Material Value (Kings are dominant flying kings)
    const baseValue = piece.king ? 350 : 100;

    // 2. Positional & Center Control (Dominating files 3-6, rows 3-6)
    let posBonus = 0;
    const isCenter = c >= 2 && c <= 7 && r >= 2 && r <= 7;
    if (isCenter) posBonus += piece.king ? 25 : 15;

    // 3. Advancement & King Row Proximity
    if (!piece.king) {
      if (piece.player === "white") {
        posBonus += (9 - r) * 6; // Advancing up toward row 0
        if (r === 1) posBonus += 25; // 1 step from crowning
      } else {
        posBonus += r * 6; // Advancing down toward row 9
        if (r === 8) posBonus += 25; // 1 step from crowning
      }
    }

    // 4. Base-rank defense anchors (protects back line from infiltration)
    if (!piece.king) {
      if (piece.player === "white" && r === 9) posBonus += 18;
      if (piece.player === "black" && r === 0) posBonus += 18;
    }

    // 5. Edge / side penalty (pieces on extreme flank columns 0 & 9 have reduced mobility)
    if (c === 0 || c === 9) {
      posBonus -= 8;
    }

    // 6. Flying King main diagonal control (diagonal connecting (0,9) to (9,0) or (0,0) to (9,9))
    if (piece.king) {
      if (r === c || r + c === 9) posBonus += 20;
    }

    const totalPieceValue = baseValue + posBonus;
    if (isMe) {
      score += totalPieceValue;
    } else {
      score -= totalPieceValue;
    }
  }

  return score;
}

// Alpha-beta minimax tree search with tactical capture lookahead
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  player: Player,
  forcedFrom: number | null,
  rules?: RuleConfig
): number {
  const currentTurn: Player = isMaximizing ? player : player === "white" ? "black" : "white";
  const moves = legalMoves(board, currentTurn, forcedFrom, rules);

  if (moves.length === 0) {
    // Loss for the side whose turn it is
    return isMaximizing ? -10000 - depth : 10000 + depth;
  }

  if (depth <= 0) {
    return evaluateBoard(board, player, rules);
  }

  // Prioritize captures first in move ordering for alpha-beta efficiency
  const sortedMoves = [...moves].sort((a, b) => {
    const aCap = a.captured !== undefined ? 1 : 0;
    const bCap = b.captured !== undefined ? 1 : 0;
    return bCap - aCap;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of sortedMoves) {
      try {
        const nextState = applyMove(board, currentTurn, forcedFrom, move.from, move.to, rules);
        let evalScore = 0;
        if (nextState.winner === player) {
          evalScore = 10000 + depth;
        } else if (nextState.winner && nextState.winner !== player) {
          evalScore = -10000 - depth;
        } else if (nextState.turn === currentTurn && nextState.forcedFrom !== null) {
          // In-flight multi-jump: continue current player's turn
          evalScore = minimax(nextState.board, depth, alpha, beta, true, player, nextState.forcedFrom, rules);
        } else {
          evalScore = minimax(nextState.board, depth - 1, alpha, beta, false, player, null, rules);
        }
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      } catch {
        continue;
      }
    }
    return maxEval === -Infinity ? evaluateBoard(board, player, rules) : maxEval;
  } else {
    let minEval = Infinity;
    for (const move of sortedMoves) {
      try {
        const nextState = applyMove(board, currentTurn, forcedFrom, move.from, move.to, rules);
        let evalScore = 0;
        if (nextState.winner === player) {
          evalScore = 10000 + depth;
        } else if (nextState.winner && nextState.winner !== player) {
          evalScore = -10000 - depth;
        } else if (nextState.turn === currentTurn && nextState.forcedFrom !== null) {
          // In-flight multi-jump for opponent
          evalScore = minimax(nextState.board, depth, alpha, beta, false, player, nextState.forcedFrom, rules);
        } else {
          evalScore = minimax(nextState.board, depth - 1, alpha, beta, true, player, null, rules);
        }
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      } catch {
        continue;
      }
    }
    return minEval === Infinity ? evaluateBoard(board, player, rules) : minEval;
  }
}

export function getBestCpuMove(
  board: Board,
  player: Player,
  forcedFrom: number | null,
  difficulty: "easy" | "medium" | "hard" | "adaptive" = "hard",
  rules?: RuleConfig
): Move | null {
  const moves = legalMoves(board, player, forcedFrom, rules);
  if (moves.length === 0) return null;

  // Compulsory captures first
  const captureMoves = moves.filter((m) => m.captured !== undefined);
  const candidates = captureMoves.length > 0 ? captureMoves : moves;

  if (candidates.length === 1) {
    return candidates[0];
  }

  // Easy tier (casual practice)
  if (difficulty === "easy") {
    // 80% picks a solid capture or center move, 20% random
    if (Math.random() < 0.2) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // Search depth based on tier
  const depth = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3; // "hard" and "adaptive" look 3-4 plies ahead

  let bestMove = candidates[0];
  let maxScore = -Infinity;

  for (const move of candidates) {
    let score = 0;

    try {
      const nextState = applyMove(board, player, forcedFrom, move.from, move.to, rules);

      if (nextState.winner === player) {
        return move; // Immediate victory!
      }

      if (nextState.turn === player && nextState.forcedFrom !== null) {
        // Multi-jump continued: high priority offensive sequence
        score = minimax(nextState.board, depth, -Infinity, Infinity, true, player, nextState.forcedFrom, rules) + 80;
      } else {
        score = minimax(nextState.board, depth - 1, -Infinity, Infinity, false, player, null, rules);
      }

      // Tactical trickiness: evaluate sacrifice traps and crown breakthroughs
      if (move.captured !== undefined) score += 35;
      const piece = board[move.from];
      if (piece && !piece.king) {
        const targetRow = rowOf(move.to);
        if ((player === "white" && targetRow === 0) || (player === "black" && targetRow === 9)) {
          score += 65; // High priority king crowning
        }
      }

      // Tiny random tie-breaker so bots with equal lines play with natural human variety
      score += Math.random() * 2;

      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }
    } catch {
      continue;
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


