import type {
  Room,
  League,
  LeagueMatch,
  Profile,
  WalletTransaction,
  LedgerEntry,
  MoveLogEntry,
  ComprehensiveMatch,
  ConnectionEventLog,
  GameRequestItem,
  MatchLossReason,
  TournamentActionRequest,
} from "@/lib/types";

/**
 * Format duration in seconds into human-readable string (e.g. "8m 45s" or "1h 12m")
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Calculate connection events, reconnect latency, and disconnection timeline from room moves and timestamps.
 */
export function extractConnectionEvents(room: Room, hostName: string, guestName: string): {
  events: ConnectionEventLog[];
  reconnectCount: number;
  totalDisconnectedSeconds: number;
  hasConnectionIssues: boolean;
} {
  const events: ConnectionEventLog[] = [];
  let reconnectCount = 0;
  let totalDisconnectedSeconds = 0;

  // 1. Check current / last disconnect state if recorded on room
  if (room.disconnectTime && room.disconnectedPlayer) {
    const pRole = room.disconnectedPlayer;
    const pName = pRole === "white" ? hostName : (guestName || "Player 2");
    const pToken = pRole === "white" ? room.hostToken : (room.guestToken || undefined);
    const elapsedSec = Math.max(0, Math.floor((Date.now() - room.disconnectTime) / 1000));
    const graceLimit = room.customConstraints?.disconnectionGraceSeconds || 90;
    const remaining = Math.max(0, graceLimit - elapsedSec);

    events.push({
      event: "disconnect",
      player: pRole,
      playerName: pName,
      playerToken: pToken,
      timestamp: room.disconnectTime,
      formattedTime: new Date(room.disconnectTime).toLocaleTimeString(),
      durationSeconds: elapsedSec,
      remainingGraceSeconds: remaining,
      note: room.status === "forfeited"
        ? `Disconnected and exceeded the ${graceLimit}s grace window without reconnecting.`
        : `Network heartbeat lost. ${remaining}s grace period remaining to restore connection.`,
    });

    if (room.status === "forfeited") {
      events.push({
        event: "forfeit_timeout",
        player: pRole,
        playerName: pName,
        playerToken: pToken,
        timestamp: room.disconnectTime + graceLimit * 1000,
        formattedTime: new Date(room.disconnectTime + graceLimit * 1000).toLocaleTimeString(),
        durationSeconds: graceLimit,
        note: `Forfeiture triggered: Player failed to reconnect within ${graceLimit} seconds. Opponent awarded victory.`,
      });
      totalDisconnectedSeconds += graceLimit;
    } else {
      totalDisconnectedSeconds += elapsedSec;
    }
  }

  // 2. Parse move intervals to detect intermediate reconnection stalls or anomalies (>45s gap between moves without timeout)
  if (room.moves && room.moves.length > 1) {
    for (let i = 1; i < room.moves.length; i++) {
      const prev = room.moves[i - 1];
      const curr = room.moves[i];
      if (prev.timestamp && curr.timestamp) {
        const gapSec = Math.floor((curr.timestamp - prev.timestamp) / 1000);
        // If an unusual gap between turn moves occurred (> 45s) and not a disconnect forfeit
        if (gapSec >= 45 && gapSec < 300) {
          reconnectCount += 1;
          totalDisconnectedSeconds += Math.min(gapSec, 90);
          events.push({
            event: "reconnect",
            player: curr.player,
            playerName: curr.playerName,
            timestamp: curr.timestamp,
            formattedTime: new Date(curr.timestamp).toLocaleTimeString(),
            durationSeconds: gapSec,
            note: `Network latency recovered: Move submitted after a ${gapSec}s connection recovery delay.`,
          });
        }
      }
    }
  }

  // 3. Inspect dispute notes or room metadata for recorded disconnection notes
  if (room.disputeNotes && room.disputeNotes.toLowerCase().includes("disconnect")) {
    events.push({
      event: "disconnect",
      player: "black",
      playerName: guestName || "Guest Player",
      timestamp: new Date(room.createdAt).getTime() + 60000,
      formattedTime: "Match Incident",
      note: `Recorded in arbitration log: ${room.disputeNotes}`,
    });
  }

  return {
    events,
    reconnectCount,
    totalDisconnectedSeconds,
    hasConnectionIssues: events.length > 0 || (room.disconnectTime !== null),
  };
}

/**
 * Determine exact loss reason and detailed explanation
 */
export function determineTerminationDetails(
  room: Room,
  hostName: string,
  guestName: string,
  winnerToken: string | null
): { reason: MatchLossReason; explanation: string } {
  const winnerName = room.winner === "white" ? hostName : room.winner === "black" ? (guestName || "Guest Player") : null;
  const loserName = room.winner === "white" ? (guestName || "Guest Player") : room.winner === "black" ? hostName : null;

  if (room.disputeStatus === "resolved" || room.disputeStatus === "voided") {
    return {
      reason: "admin_ruling",
      explanation: room.disputeNotes || `Match outcome arbitrated by Administrator under dispute resolution procedure.`,
    };
  }

  if (room.status === "cancelled") {
    return {
      reason: "cancelled_unjoined",
      explanation: `Match was cancelled by host or auto-expired after waiting in the lobby with no challenger.`,
    };
  }

  if (room.status === "abandoned") {
    return {
      reason: "abandoned",
      explanation: `Both players lost network connectivity or abandoned the active match room simultaneously.`,
    };
  }

  if (room.status === "draw" || (!room.winner && room.status === "completed")) {
    return {
      reason: "draw_agreed",
      explanation: `Match concluded in a mutual draw agreement or standard draw condition. Escrow stakes refunded 100%.`,
    };
  }

  if (room.status === "forfeited") {
    // Check if disconnected
    if (room.disconnectedPlayer) {
      const forfeitedName = room.disconnectedPlayer === "white" ? hostName : (guestName || "Guest");
      return {
        reason: "disconnect_timeout",
        explanation: `${forfeitedName} suffered a network disconnection and exceeded the 90-second grace reconnection window. ${winnerName} claimed victory by disconnection forfeit.`,
      };
    }

    // Check timer
    if (room.timerState?.timedOut) {
      const forfeitedName = room.timerState.forfeitedPlayer === "white" ? hostName : (guestName || "Guest");
      return {
        reason: "clock_timeout",
        explanation: `${forfeitedName} depleted all remaining chess clock turn time and was flagged out on time. Victory awarded to ${winnerName}.`,
      };
    }

    return {
      reason: "voluntary_resignation",
      explanation: `${loserName} voluntarily resigned / surrendered the game. Official win awarded to ${winnerName}.`,
    };
  }

  if (room.status === "completed") {
    // Check if captures occurred
    const captureMoves = (room.moves || []).filter((m) => m.isCapture).length;
    return {
      reason: "board_win",
      explanation: `${winnerName} achieved full board checkmate / elimination against ${loserName} across ${room.moveCount || 0} moves (${captureMoves} captures executed).`,
    };
  }

  return {
    reason: "unknown",
    explanation: `Match is currently active or in-flight in room ${room.code}.`,
  };
}

/**
 * Reconcile all rooms and tournament matches into comprehensive match history objects
 */
export function buildComprehensiveMatches(params: {
  rooms: Room[];
  leagues: League[];
  leagueMatches: LeagueMatch[];
  users: Profile[];
  transactions: WalletTransaction[];
  ledgerEntries: LedgerEntry[];
}): ComprehensiveMatch[] {
  const { rooms, leagues, leagueMatches, users, transactions, ledgerEntries } = params;

  // Build lookups
  const userMap = new Map<string, Profile>();
  for (const u of users) {
    if (u.token) userMap.set(u.token, u);
    if (u.id) userMap.set(u.id, u);
    if (u.username) userMap.set(u.username.toLowerCase(), u);
  }

  const leagueMap = new Map<string, League>();
  for (const l of leagues) {
    leagueMap.set(l.id, l);
  }

  const leagueMatchMap = new Map<string, LeagueMatch>();
  for (const lm of leagueMatches) {
    leagueMatchMap.set(lm.id, lm);
    if (lm.roomCode) leagueMatchMap.set(lm.roomCode, lm);
  }

  // Group transactions & ledger entries by roomCode / escrowId / matchId
  const txByRef = new Map<string, WalletTransaction[]>();
  for (const tx of transactions) {
    const keys = [tx.reference, tx.id];
    try {
      if (tx.metaJson) {
        const meta = JSON.parse(tx.metaJson);
        if (meta.roomCode) keys.push(meta.roomCode);
        if (meta.escrowId) keys.push(meta.escrowId);
        if (meta.matchId) keys.push(meta.matchId);
      }
    } catch {}

    for (const k of keys) {
      if (k) {
        const list = txByRef.get(k) || [];
        list.push(tx);
        txByRef.set(k, list);
      }
    }
  }

  const ledgerByRef = new Map<string, LedgerEntry[]>();
  for (const le of ledgerEntries) {
    const keys = [le.referenceId, le.id, le.transactionGroupId];
    try {
      if (le.metadataJson) {
        const meta = JSON.parse(le.metadataJson);
        if (meta.roomCode) keys.push(meta.roomCode);
        if (meta.escrowId) keys.push(meta.escrowId);
        if (meta.matchId) keys.push(meta.matchId);
      }
    } catch {}

    for (const k of keys) {
      if (k) {
        const list = ledgerByRef.get(k) || [];
        list.push(le);
        ledgerByRef.set(k, list);
      }
    }
  }

  const resultMatches: ComprehensiveMatch[] = [];
  const processedKeys = new Set<string>();

  // 1. Process all rooms
  for (const r of rooms) {
    const key = r.code || r.matchId || "";
    if (!key || processedKeys.has(key)) continue;
    processedKeys.add(key);

    const hostProfile = userMap.get(r.hostToken) || userMap.get(r.hostName?.toLowerCase());
    const guestProfile = r.guestToken ? userMap.get(r.guestToken) || (r.guestName ? userMap.get(r.guestName.toLowerCase()) : null) : null;

    const hostName = r.hostName || hostProfile?.username || "Player 1";
    const guestName = r.guestName || guestProfile?.username || (r.guestToken ? "Player 2" : null);

    const winnerToken = r.winner === "white" ? r.hostToken : r.winner === "black" ? (r.guestToken || null) : null;
    const loserToken = r.winner === "white" ? (r.guestToken || null) : r.winner === "black" ? r.hostToken : null;
    const winnerName = r.winner === "white" ? hostName : r.winner === "black" ? (guestName || "Guest Player") : null;
    const loserName = r.winner === "white" ? (guestName || "Guest Player") : r.winner === "black" ? hostName : null;

    // Parse moves
    let moves: MoveLogEntry[] = r.moves || [];
    if ((!moves || moves.length === 0) && r.movesJson) {
      try {
        moves = JSON.parse(r.movesJson);
      } catch {
        moves = [];
      }
    }

    // Parse duration
    const createdMs = new Date(r.createdAt || Date.now()).getTime();
    const updatedMs = new Date(r.updatedAt || Date.now()).getTime();
    let durationSec = Math.max(0, Math.floor((updatedMs - createdMs) / 1000));
    if (moves.length > 1 && moves[0].timestamp && moves[moves.length - 1].timestamp) {
      const moveDuration = Math.floor((moves[moves.length - 1].timestamp - moves[0].timestamp) / 1000);
      if (moveDuration > 0) durationSec = moveDuration;
    }
    if (durationSec === 0 && moves.length > 0) durationSec = moves.length * 12;

    // Financials
    const wagerAmt = Number(r.wagerAmount) || 0;
    const potAmt = wagerAmt * 2;
    const platformFee = wagerAmt > 0 ? Number((potAmt * 0.05).toFixed(2)) : 0;
    const netPayout = wagerAmt > 0 ? Number((potAmt - platformFee).toFixed(2)) : 0;

    // Connection events
    const connInfo = extractConnectionEvents(r, hostName, guestName || "Guest");

    // Loss reason
    const termDetails = determineTerminationDetails(r, hostName, guestName || "Guest", winnerToken);

    // Linked league
    const linkedLeague = r.leagueId ? leagueMap.get(r.leagueId) : null;
    const linkedLeagueMatch = (r.leagueMatchId ? leagueMatchMap.get(r.leagueMatchId) : null) || (r.matchId ? leagueMatchMap.get(r.matchId) : null) || leagueMatchMap.get(r.code);

    // Linked ledger & tx
    const matchedLedger: LedgerEntry[] = [];
    const matchedTx: WalletTransaction[] = [];
    const refKeys = [r.code, r.escrowId, r.matchId, r.leagueMatchId].filter(Boolean) as string[];

    for (const rk of refKeys) {
      const leList = ledgerByRef.get(rk);
      if (leList) matchedLedger.push(...leList);
      const txList = txByRef.get(rk);
      if (txList) matchedTx.push(...txList);
    }

    // Deduplicate matched ledger
    const uniqueLedger = Array.from(new Map(matchedLedger.map((l) => [l.id, l])).values());
    const uniqueTx = Array.from(new Map(matchedTx.map((t) => [t.id, t])).values());

    let parsedBoard: (any | null)[] | undefined = undefined;
    try {
      if (r.boardJson) parsedBoard = JSON.parse(r.boardJson);
    } catch {}

    const isDraw = r.winner === null && (r.status === "completed" || r.status === "draw");
    const mode = (r.leagueId || linkedLeague || r.mode === "league")
      ? "tournament"
      : r.mode === "wager"
      ? (r.isCustomWager ? "custom_wager" : "wager")
      : "casual";

    resultMatches.push({
      id: r.code,
      roomCode: r.code,
      matchId: r.matchId || linkedLeagueMatch?.id || r.code,
      leagueId: r.leagueId || linkedLeagueMatch?.leagueId || null,
      leagueMatchId: r.leagueMatchId || linkedLeagueMatch?.id || null,
      tournamentTitle: linkedLeague?.title || linkedLeagueMatch?.disputeNotes || (r.leagueId ? "Tournament Championship" : null),
      tournamentRound: linkedLeagueMatch?.round || null,
      mode,
      status: r.status,
      hostName,
      hostToken: r.hostToken,
      hostPhone: hostProfile?.phoneNumber || null,
      hostRating: hostProfile?.rating || 1200,
      guestName,
      guestToken: r.guestToken,
      guestPhone: guestProfile?.phoneNumber || null,
      guestRating: guestProfile?.rating || 1200,
      winner: r.winner,
      winnerName: isDraw ? "Draw" : winnerName,
      winnerToken: isDraw ? null : winnerToken,
      loserName: isDraw ? null : loserName,
      loserToken: isDraw ? null : loserToken,
      isDraw,
      wagerAmount: wagerAmt,
      potAmount: potAmt,
      platformFee,
      netPayout,
      escrowId: r.escrowId,
      startedAt: r.createdAt,
      completedAt: r.updatedAt,
      durationSeconds: durationSec,
      durationFormatted: formatDuration(durationSec),
      moveCount: r.moveCount || moves.length || 0,
      moves,
      terminationReason: termDetails.reason,
      lossExplanation: termDetails.explanation,
      connectionEvents: connInfo.events,
      reconnectCount: connInfo.reconnectCount,
      totalDisconnectedSeconds: connInfo.totalDisconnectedSeconds,
      hasConnectionIssues: connInfo.hasConnectionIssues,
      disputeStatus: r.disputeStatus || "none",
      disputeNotes: r.disputeNotes || null,
      boardJson: r.boardJson,
      board: parsedBoard,
      ledgerEntries: uniqueLedger,
      walletTransactions: uniqueTx,
      ruleVariations: r.ruleVariations,
      customConstraints: r.customConstraints,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }

  // 2. Process standalone tournament matches that might not have a live room code
  for (const lm of leagueMatches) {
    if (lm.roomCode && processedKeys.has(lm.roomCode)) continue;
    const matchKey = `match-${lm.id}`;
    if (processedKeys.has(matchKey)) continue;
    processedKeys.add(matchKey);

    const league = leagueMap.get(lm.leagueId);
    const p1 = userMap.get(lm.player1Token) || userMap.get(lm.player1Name?.toLowerCase());
    const p2 = lm.player2Token ? userMap.get(lm.player2Token) || (lm.player2Name ? userMap.get(lm.player2Name.toLowerCase()) : null) : null;

    const hostName = lm.player1Name || p1?.username || "Contestant 1";
    const guestName = lm.player2Name || p2?.username || (lm.player2Token ? "Contestant 2" : "TBD");

    const isWinnerP1 = lm.winnerToken === lm.player1Token;
    const isWinnerP2 = lm.winnerToken === lm.player2Token;
    const isDraw = lm.winnerToken === "draw" || (!lm.winnerToken && lm.status === "completed");

    const winnerName = isWinnerP1 ? hostName : isWinnerP2 ? guestName : isDraw ? "Draw" : null;
    const loserName = isWinnerP1 ? guestName : isWinnerP2 ? hostName : null;

    const createdMs = new Date(lm.createdAt || Date.now()).getTime();
    const durationSec = 600; // Estimated 10m for completed bracket match

    resultMatches.push({
      id: lm.id,
      roomCode: lm.roomCode || `TBR-${lm.id.slice(0, 6).toUpperCase()}`,
      matchId: lm.id,
      leagueId: lm.leagueId,
      leagueMatchId: lm.id,
      tournamentTitle: league?.title || "Tournament Bracket Match",
      tournamentRound: lm.round,
      mode: "tournament",
      status: lm.status as any,
      hostName,
      hostToken: lm.player1Token,
      hostPhone: p1?.phoneNumber || null,
      hostRating: p1?.rating || 1200,
      guestName,
      guestToken: lm.player2Token,
      guestPhone: p2?.phoneNumber || null,
      guestRating: p2?.rating || 1200,
      winner: isWinnerP1 ? "white" : isWinnerP2 ? "black" : null,
      winnerName,
      winnerToken: lm.winnerToken,
      loserName,
      loserToken: isWinnerP1 ? lm.player2Token : isWinnerP2 ? lm.player1Token : null,
      isDraw,
      wagerAmount: 0,
      potAmount: Number(league?.prizePool) || 0,
      platformFee: 0,
      netPayout: Number(league?.prizePool) || 0,
      escrowId: null,
      startedAt: lm.createdAt,
      completedAt: lm.createdAt,
      durationSeconds: durationSec,
      durationFormatted: formatDuration(durationSec),
      moveCount: 24,
      moves: [],
      terminationReason: lm.disputeStatus === "resolved" ? "admin_ruling" : "board_win",
      lossExplanation: lm.disputeNotes || `Official tournament bracket match (Round ${lm.round || 1}) concluded. Winner advanced to next bracket round.`,
      connectionEvents: [],
      reconnectCount: 0,
      totalDisconnectedSeconds: 0,
      hasConnectionIssues: false,
      disputeStatus: lm.disputeStatus || "none",
      disputeNotes: lm.disputeNotes || null,
      boardJson: "[]",
      ledgerEntries: [],
      walletTransactions: [],
      ruleVariations: league?.ruleVariations,
      customConstraints: league?.customConstraints,
      createdAt: lm.createdAt,
      updatedAt: lm.createdAt,
    });
  }

  // Sort newest first
  return resultMatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Extract unified Game Requests (wagered challenges, open lobby requests, tournament action requests)
 */
export function buildGameRequests(params: {
  rooms: Room[];
  tournamentRequests: TournamentActionRequest[];
  leagues: League[];
  users: Profile[];
}): GameRequestItem[] {
  const { rooms, tournamentRequests, leagues, users } = params;

  const userMap = new Map<string, Profile>();
  for (const u of users) {
    if (u.token) userMap.set(u.token, u);
    if (u.id) userMap.set(u.id, u);
  }

  const leagueMap = new Map<string, League>();
  for (const l of leagues) {
    leagueMap.set(l.id, l);
  }

  const requests: GameRequestItem[] = [];

  // 1. Process Tournament Action Requests submitted by organizers
  for (const tr of tournamentRequests) {
    const league = leagueMap.get(tr.tournamentId);
    requests.push({
      id: tr.id,
      type: "tournament_action",
      title: tr.requestType === "cancel_tournament"
        ? `Tournament Cancellation Request: ${league?.title || tr.tournamentTitle || "Tournament"}`
        : tr.requestType === "disqualify_player"
        ? `Player Disqualification Request: ${tr.targetUsername || "Player"}`
        : `Match Result Override: Match ${tr.matchId || "Dispute"}`,
      creatorName: tr.organizerName || "Tournament Organizer",
      creatorToken: tr.organizerId,
      targetOpponentName: tr.targetUsername || null,
      targetOpponentToken: tr.targetUserId || null,
      wagerAmount: 0,
      currency: "GHS",
      mode: "league",
      tournamentId: tr.tournamentId,
      tournamentTitle: league?.title || tr.tournamentTitle,
      status: tr.status === "pending" ? "pending_review" : tr.status as any,
      reason: tr.reason,
      actionRequestId: tr.id,
      createdAt: tr.createdAt,
    });
  }

  // 2. Process Wager Challenges & Open Lobby Room Requests
  for (const r of rooms) {
    const creatorProfile = userMap.get(r.hostToken);
    const guestProfile = r.guestToken ? userMap.get(r.guestToken) : null;
    const isWager = r.mode === "wager" || (r.wagerAmount && r.wagerAmount > 0);
    const isLobby = r.status === "waiting";

    // Expire waiting rooms older than 15 mins
    const createdMs = new Date(r.createdAt || Date.now()).getTime();
    const isExpired = isLobby && Date.now() - createdMs > 15 * 60 * 1000;

    let reqType: GameRequestItem["type"] = isWager ? "wager_challenge" : "open_lobby";
    if (r.leagueId) reqType = "bracket_match";

    let title = "";
    if (isWager) {
      title = `GH₵ ${r.wagerAmount} Wager Challenge by ${r.hostName || "Host"}${r.isPrivate ? " (Private Invite)" : " (Public Arena)"}`;
    } else if (r.leagueId) {
      const lg = leagueMap.get(r.leagueId);
      title = `Tournament Match Room (${r.code}): ${lg?.title || "Championship"}`;
    } else {
      title = `Casual Free Game Request by ${r.hostName || "Host"}`;
    }

    requests.push({
      id: `req-${r.code}`,
      type: reqType,
      title,
      creatorName: r.hostName || creatorProfile?.username || "Host",
      creatorToken: r.hostToken,
      creatorPhone: creatorProfile?.phoneNumber,
      targetOpponentName: r.guestName || guestProfile?.username || (r.isPrivate ? "Direct Invite" : "Open to All Players"),
      targetOpponentToken: r.guestToken,
      wagerAmount: r.wagerAmount || 0,
      currency: "GHS",
      mode: r.mode,
      roomCode: r.code,
      tournamentId: r.leagueId,
      tournamentTitle: r.leagueId ? leagueMap.get(r.leagueId)?.title : null,
      status: isExpired ? "expired" : r.status,
      timeLimitSeconds: r.customConstraints?.timeLimitSeconds || 600,
      turnLimitSeconds: r.customConstraints?.turnLimitSeconds || 45,
      disconnectionGraceSeconds: r.customConstraints?.disconnectionGraceSeconds || 90,
      ruleVariations: r.ruleVariations,
      createdAt: r.createdAt,
    });
  }

  return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
