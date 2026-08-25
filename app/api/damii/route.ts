import { NextRequest, NextResponse } from "next/server";
import { applyMove, createBoard, legalMoves, playerName, formatMoveNotation, type Move } from "@/lib/damii-rules";
import { dbRepository } from "@/lib/db-client";
import { walletService } from "@/lib/wallet-service";
import { timerService } from "@/lib/timer-service";
import { leagueService } from "@/lib/league-service";
import { presenceService } from "@/lib/presence-service";
import { securityService } from "@/lib/security";
import { Room, GameMode, Player, MoveLogEntry, Profile } from "@/lib/types";

const cleanName = (value: unknown) => String(value ?? "").trim().replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 20);
const cleanToken = (value: unknown) => String(value ?? "").trim().slice(0, 80);
const cleanCode = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

function formatRoomResponse(room: Room, token: string) {
  let role: "white" | "black" | "spectator" = "spectator";
  if (token && token === room.hostToken) role = "white";
  else if (token && token === room.guestToken) role = "black";

  // Check turn timers & 90s disconnection grace
  const timerState = timerService.checkRoomTimers(room);

  let moves: MoveLogEntry[] = [];
  try {
    if (room.movesJson) moves = JSON.parse(room.movesJson);
  } catch {
    moves = [];
  }

  return {
    code: room.code,
    hostName: room.hostName,
    guestName: room.guestName,
    isPrivate: Boolean(room.isPrivate),
    hostReady: Boolean(room.hostReady),
    guestReady: Boolean(room.guestReady),
    board: JSON.parse(room.boardJson),
    turn: room.turn,
    forcedFrom: room.forcedFrom,
    winner: room.winner,
    status: room.status,
    mode: room.mode,
    wagerAmount: room.wagerAmount,
    escrowId: room.escrowId,
    leagueId: room.leagueId,
    matchId: room.matchId,
    ruleVariations: room.ruleVariations || null,
    customConstraints: room.customConstraints || null,
    moveCount: room.moveCount,
    drawOfferedBy: room.drawOfferedBy || null,
    disputeStatus: room.disputeStatus || "none",
    disputeNotes: room.disputeNotes || null,
    moves,
    role,
    timerState,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

async function resolvePlayerToken(rawToken: string, username?: string): Promise<{ token: string; profile: Profile | null }> {
  if (!rawToken) return { token: "", profile: null };
  const session = await dbRepository.getSession(rawToken);
  const resolvedToken = session ? session.userId : rawToken;
  const profile = await dbRepository.getProfile(resolvedToken);
  return { token: resolvedToken, profile };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("lobby") === "1") {
    const rawToken = cleanToken(searchParams.get("token"));
    const username = cleanName(searchParams.get("username"));
    if (rawToken || username) {
      presenceService.recordPresence(rawToken, username);
    }

    const [rawRooms, leaderboard, leagues] = await Promise.all([
      dbRepository.listRooms(30),
      dbRepository.getLeaderboard(50),
      leagueService.listLeagues(),
    ]);

    const now = Date.now();
    const validRooms = rawRooms.filter((r) => {
      if (r.status === "cancelled" || r.status === "forfeited") return false;
      if (r.status === "waiting") {
        const createdMs = new Date(r.createdAt).getTime();
        if (now - createdMs >= 10 * 60 * 1000) return false;
        // If private, only show to the host/creator or participants
        if (r.isPrivate) {
          return Boolean(rawToken && (rawToken === r.hostToken || rawToken === r.guestToken));
        }
        return true;
      }
      return true;
    });

    const nonPlayerRoles = new Set(["admin", "super_admin", "organizer", "facilitator", "treasurer"]);
    const mappedLeaderboard = leaderboard
      .filter((p) => !nonPlayerRoles.has(p.role) && p.status !== "banned")
      .map((p) => {
        const presence = presenceService.getPresence(p.token, p.username);
        const sanitized = securityService.sanitizePublicProfile(p);
        return {
          ...sanitized,
          isOnline: presence.isOnline,
          presenceStatus: presence.presenceStatus,
          lastSeenAt: presence.lastSeenAt,
        };
      });

    return NextResponse.json({
      activeRooms: validRooms,
      leaderboard: mappedLeaderboard,
      leagues,
    });
  }

  if (searchParams.get("leaderboard") === "1") {
    const leaderboard = await dbRepository.getLeaderboard(50);
    const nonPlayerRoles = new Set(["admin", "super_admin", "organizer", "facilitator", "treasurer"]);
    const mappedLeaderboard = leaderboard
      .filter((p) => !nonPlayerRoles.has(p.role) && p.status !== "banned")
      .map((p) => {
        const presence = presenceService.getPresence(p.token, p.username);
        const sanitized = securityService.sanitizePublicProfile(p);
        return {
          ...sanitized,
          isOnline: presence.isOnline,
          presenceStatus: presence.presenceStatus,
          lastSeenAt: presence.lastSeenAt,
        };
      });
    return NextResponse.json({ leaderboard: mappedLeaderboard });
  }

  const code = cleanCode(searchParams.get("code"));
  const rawToken = cleanToken(searchParams.get("token"));
  let token = rawToken;
  if (rawToken) {
    const session = await dbRepository.getSession(rawToken);
    if (session) token = session.userId;
    presenceService.recordPresence(token, undefined, code || null);
  }

  if (!code) {
    const activeRooms = await dbRepository.listRooms(20);
    const now = Date.now();
    // Filter out expired unjoined rooms (>10 mins) and private rooms for non-participants
    const validRooms = activeRooms.filter((r) => {
      if (r.status === "cancelled" || r.status === "forfeited") return false;
      if (r.status === "waiting") {
        const createdMs = new Date(r.createdAt).getTime();
        if (now - createdMs >= 10 * 60 * 1000) return false;
        if (r.isPrivate) {
          return Boolean(token && (token === r.hostToken || token === r.guestToken));
        }
        return true;
      }
      return true;
    });
    return NextResponse.json({ activeRooms: validRooms });
  }

  const room = await dbRepository.getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const now = Date.now();

  // 1. Unjoined match 10-minute auto-expiry
  if (room.status === "waiting" && !room.guestToken) {
    const createdMs = new Date(room.createdAt).getTime();
    if (now - createdMs > 10 * 60 * 1000) {
      room.status = "cancelled";
      await dbRepository.saveRoom(room);
      return NextResponse.json({
        room: formatRoomResponse(room, token),
        message: "Room automatically expired after 10 minutes with no opponent.",
      });
    }
  }

  // 2. Check timer & 90s disconnection state
  const timerState = timerService.checkRoomTimers(room);
  if (timerState.timedOut && timerState.forfeitedPlayer && room.status === "playing") {
    room.winner = timerState.forfeitedPlayer === "white" ? "black" : "white";
    room.status = "forfeited";
    await dbRepository.saveRoom(room);

    // Apply stats & escrow disbursement
    await applyGameFinishEffects(room);
  }

  // Handle heartbeat ping if token provided
  if (token && room.status === "playing") {
    const isHost = token === room.hostToken;
    const isGuest = token === room.guestToken;
    if (isHost || isGuest) {
      const playerRole: Player = isHost ? "white" : "black";
      if (room.disconnectedPlayer === playerRole) {
        room.disconnectTime = null;
        room.disconnectedPlayer = null;
        await dbRepository.saveRoom(room);
      }
    }
  }

  return NextResponse.json({ room: formatRoomResponse(room, token) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "").trim().toLowerCase();
    const rawToken = cleanToken(body.token);
    const username = cleanName(body.username);

    if (!rawToken) return NextResponse.json({ error: "Player token required" }, { status: 400 });

    const { token: resolvedToken, profile: resolvedProfile } = await resolvePlayerToken(rawToken, username);
    const token = resolvedToken || rawToken;
    const existingProfile = resolvedProfile || (await dbRepository.getProfile(token));

    if (token) {
      presenceService.recordPresence(token, username || existingProfile?.username, body.code || null);
    }

    if (existingProfile && existingProfile.status === "banned") {
      return NextResponse.json({ error: "Account is banned. Please contact admin support." }, { status: 403 });
    }

    // Admin accounts are non-playing facilitators
    if (
      existingProfile &&
      (existingProfile.role === "admin" || existingProfile.role === "super_admin") &&
      ["create", "join", "move", "resign", "offer_draw", "accept_draw", "decline_draw", "forfeit", "cancel"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Administrator accounts serve strictly as neutral regulators and dispute arbiters. Admin accounts cannot create, join, or play matches in the Arena." },
        { status: 403 }
      );
    }

    if (action === "profile") {
      if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
      const profile = await dbRepository.upsertProfile(token, username);
      return NextResponse.json({ profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "create") {
      if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
      if (!existingProfile) {
        return NextResponse.json(
          { error: "Authentication Required: You must be signed in with a registered player account to create online matches." },
          { status: 401 }
        );
      }
      await dbRepository.upsertProfile(token, username);

      const mode: GameMode = (["casual", "wager", "league"].includes(body.mode) ? body.mode : "casual") as GameMode;
      const rawWager = Number(body.wagerAmount) || 0;
      const wagerAmount = Math.min(50000, Math.max(0, Math.floor(rawWager)));
      const ruleVariations = body.ruleVariations || undefined;
      const customConstraints = body.customConstraints || undefined;

      if (mode === "wager" && wagerAmount > 0) {
        const profile = await dbRepository.getProfile(token);
        if (!profile || (profile.points || 0) < wagerAmount) {
          return NextResponse.json({ error: `Insufficient Points balance for GH₵ ${wagerAmount} (${wagerAmount} Points) Wager` }, { status: 400 });
        }
      }

      // Check rating limits on creation if customConstraints specify min/max rating
      if (customConstraints && existingProfile) {
        if (customConstraints.minRating !== undefined && customConstraints.minRating !== null && existingProfile.rating < customConstraints.minRating) {
          return NextResponse.json(
            { error: `Rating Eligibility: Your rating (${existingProfile.rating}) is below the minimum required rating of ${customConstraints.minRating}.` },
            { status: 403 }
          );
        }
        if (customConstraints.maxRating !== undefined && customConstraints.maxRating !== null && existingProfile.rating > customConstraints.maxRating) {
          return NextResponse.json(
            { error: `Rating Eligibility: Your rating (${existingProfile.rating}) exceeds the maximum allowed rating of ${customConstraints.maxRating}.` },
            { status: 403 }
          );
        }
      }

      // Generate unique 6-character room code
      let code = "";
      for (let i = 0; i < 5; i++) {
        const candidate = Math.random().toString(36).substring(2, 8).toUpperCase();
        const existing = await dbRepository.getRoom(candidate);
        if (!existing) {
          code = candidate;
          break;
        }
      }
      if (!code) code = `DAM${Math.floor(100 + Math.random() * 900)}`;

      const isPrivate = Boolean(body.isPrivate);
      const now = new Date().toISOString();
      const room: Room = {
        code,
        hostName: username,
        hostToken: token,
        guestName: null,
        guestToken: null,
        isPrivate,
        hostReady: false,
        guestReady: false,
        boardJson: JSON.stringify(createBoard()),
        movesJson: "[]",
        turn: "white",
        forcedFrom: null,
        winner: null,
        status: "waiting",
        mode,
        wagerAmount,
        escrowId: null,
        leagueId: body.leagueId ? String(body.leagueId) : null,
        matchId: body.matchId ? String(body.matchId) : null,
        ruleVariations,
        customConstraints,
        moveCount: 0,
        resultApplied: 0,
        lastMoveTime: Date.now(),
        disconnectTime: null,
        disconnectedPlayer: null,
        createdAt: now,
        updatedAt: now,
      };

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "join" || action === "accept") {
      const code = cleanCode(body.code);
      if (!code) return NextResponse.json({ error: "Room code required" }, { status: 400 });
      if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
      if (!existingProfile) {
        return NextResponse.json(
          { error: "Authentication Required: You must be signed in with a registered player account to join online matches." },
          { status: 401 }
        );
      }

      await dbRepository.upsertProfile(token, username);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      if (room.status === "cancelled" || room.status === "forfeited") {
        return NextResponse.json({ error: "This room is no longer active." }, { status: 400 });
      }

      if (room.hostToken === token) {
        const profile = await dbRepository.getProfile(token);
        return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
      }

      if (room.guestToken && room.guestToken !== token) {
        return NextResponse.json({ error: "Room is full. Another player has joined." }, { status: 400 });
      }

      // Check rating limits on join if customConstraints specify min/max rating
      if (room.customConstraints) {
        const guestRating = existingProfile.rating ?? 1200;
        if (room.customConstraints.minRating !== undefined && room.customConstraints.minRating !== null && guestRating < room.customConstraints.minRating) {
          return NextResponse.json(
            { error: `Rating Eligibility: Your rating (${guestRating}) is below this match's required minimum rating of ${room.customConstraints.minRating}.` },
            { status: 403 }
          );
        }
        if (room.customConstraints.maxRating !== undefined && room.customConstraints.maxRating !== null && guestRating > room.customConstraints.maxRating) {
          return NextResponse.json(
            { error: `Rating Eligibility: Your rating (${guestRating}) exceeds this match's maximum allowed rating of ${room.customConstraints.maxRating}.` },
            { status: 403 }
          );
        }
      }

      // Validate wager requirement for guest and host
      if (room.mode === "wager" && room.wagerAmount > 0) {
        const guestProfile = await dbRepository.getProfile(token);
        const hostProfile = await dbRepository.getProfile(room.hostToken);
        const guestPoints = guestProfile?.points ?? 0;
        const hostPoints = hostProfile?.points ?? 0;
        if (guestPoints < room.wagerAmount) {
          return NextResponse.json({ error: `Insufficient Points. You need GH₵ ${room.wagerAmount} (${room.wagerAmount} Points) to accept this wager challenge.` }, { status: 400 });
        }
        if (hostPoints < room.wagerAmount) {
          return NextResponse.json({ error: `Host has insufficient Points balance for this wager match.` }, { status: 400 });
        }
      }

      room.guestName = username;
      room.guestToken = token;
      room.guestReady = true;
      room.hostReady = true;
      // Auto-start match immediately upon accepting the challenge
      room.status = "playing";
      room.lastMoveTime = Date.now();
      room.disconnectTime = null;
      room.disconnectedPlayer = null;

      // Lock wager escrow if wager match
      if (room.mode === "wager" && room.wagerAmount > 0 && !room.escrowId) {
        try {
          const escrow = await walletService.lockWagerEscrow(
            room.code,
            room.wagerAmount,
            room.hostToken,
            room.guestToken
          );
          room.escrowId = escrow.id;
        } catch (err) {
          return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to lock wager escrow" }, { status: 400 });
        }
      }

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "ready") {
      const code = cleanCode(body.code);
      if (!code) return NextResponse.json({ error: "Room code required" }, { status: 400 });
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      const isHost = token === room.hostToken;
      const isGuest = token === room.guestToken;
      if (!isHost && !isGuest) {
        return NextResponse.json({ error: "You are not a player in this match" }, { status: 403 });
      }

      if (isHost) room.hostReady = true;
      if (isGuest) room.guestReady = true;

      // When room owner triggers ready and a guest is connected, launch match!
      if (room.hostToken && room.guestToken && room.hostReady) {
        room.guestReady = true;
        room.status = "playing";
        room.lastMoveTime = Date.now();
        room.disconnectTime = null;
        room.disconnectedPlayer = null;

        // Lock wager escrow if wager match
        if (room.mode === "wager" && room.wagerAmount > 0 && !room.escrowId) {
          try {
            const escrow = await walletService.lockWagerEscrow(
              room.code,
              room.wagerAmount,
              room.hostToken,
              room.guestToken
            );
            room.escrowId = escrow.id;
          } catch (err) {
            return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to lock wager escrow" }, { status: 400 });
          }
        }
      }

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "leave_room") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      if (room.status === "waiting") {
        if (token === room.guestToken) {
          room.guestToken = null;
          room.guestName = null;
          room.guestReady = false;
          room.hostReady = false;
          await dbRepository.saveRoom(room);
        } else if (token === room.hostToken) {
          room.status = "cancelled";
          await dbRepository.saveRoom(room);
        }
      }

      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "move") {
      const code = cleanCode(body.code);
      const from = Number(body.from);
      const to = Number(body.to);

      if (!code || isNaN(from) || isNaN(to)) {
        return NextResponse.json({ error: "Invalid move arguments" }, { status: 400 });
      }

      const room = await dbRepository.getRoom(code);
      if (!room || room.status !== "playing") {
        return NextResponse.json({ error: "Game is not active" }, { status: 400 });
      }

      const playerRole: Player | null = token === room.hostToken ? "white" : token === room.guestToken ? "black" : null;
      if (!playerRole) return NextResponse.json({ error: "You are not a player in this match" }, { status: 403 });
      if (room.turn !== playerRole) return NextResponse.json({ error: "Not your turn" }, { status: 400 });

      const board = JSON.parse(room.boardJson);
      const allowed = legalMoves(board, room.turn, room.forcedFrom, room.ruleVariations);
      const selectedMove = allowed.find((m: Move) => m.from === from && m.to === to);

      if (!selectedMove) return NextResponse.json({ error: "Illegal move" }, { status: 400 });

      const result = applyMove(board, room.turn, room.forcedFrom, from, to, room.ruleVariations);
      room.boardJson = JSON.stringify(result.board);
      
      // Append move history
      const formatted = formatMoveNotation(from, to, result.captured);
      const moveEntry: MoveLogEntry = {
        moveNumber: room.moveCount + 1,
        player: room.turn,
        playerName: room.turn === "white" ? room.hostName : (room.guestName || "Player 2"),
        from,
        to,
        notation: formatted.notation,
        algNotation: formatted.algNotation,
        sqNotation: formatted.sqNotation,
        isCapture: result.captured,
        timestamp: Date.now(),
      };

      let existingMoves: MoveLogEntry[] = [];
      try {
        if (room.movesJson) existingMoves = JSON.parse(room.movesJson);
      } catch {
        existingMoves = [];
      }
      existingMoves.push(moveEntry);
      room.movesJson = JSON.stringify(existingMoves);

      room.turn = result.turn;
      room.forcedFrom = result.forcedFrom;
      room.winner = result.winner;
      room.moveCount += 1;
      room.lastMoveTime = Date.now();
      room.disconnectTime = null;
      room.disconnectedPlayer = null;

      if (result.winner) {
        room.status = "completed";
      }

      await dbRepository.saveRoom(room);

      if (result.winner) {
        await applyGameFinishEffects(room);
      }

      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "heartbeat") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      const isHost = token === room.hostToken;
      const isGuest = token === room.guestToken;

      if ((isHost || isGuest) && room.status === "playing") {
        const playerRole: Player = isHost ? "white" : "black";
        if (room.disconnectedPlayer === playerRole) {
          room.disconnectTime = null;
          room.disconnectedPlayer = null;
          await dbRepository.saveRoom(room);
        }
      }

      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "disconnect") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      const isHost = token === room.hostToken;
      const isGuest = token === room.guestToken;

      if ((isHost || isGuest) && room.status === "playing") {
        const playerRole: Player = isHost ? "white" : "black";
        if (room.disconnectedPlayer && room.disconnectedPlayer !== playerRole) {
          // Both players disconnected -> mark match abandoned without penalty
          room.status = "abandoned";
          room.winner = null;
          room.disconnectTime = null;
          room.disconnectedPlayer = null;
          await dbRepository.saveRoom(room);
          if (room.escrowId) {
            await walletService.disburseWagerEscrow(room.escrowId, null);
          }
        } else {
          room.disconnectTime = Date.now();
          room.disconnectedPlayer = playerRole;
          await dbRepository.saveRoom(room);
        }
      }

      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "offer_draw") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room || room.status !== "playing") {
        return NextResponse.json({ error: "Game not found or not active" }, { status: 400 });
      }

      const playerRole: Player | null = token === room.hostToken ? "white" : token === room.guestToken ? "black" : null;
      if (!playerRole) return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });

      room.drawOfferedBy = playerRole;
      await dbRepository.saveRoom(room);

      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "accept_draw") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room || room.status !== "playing") {
        return NextResponse.json({ error: "Game not found or not active" }, { status: 400 });
      }

      const playerRole: Player | null = token === room.hostToken ? "white" : token === room.guestToken ? "black" : null;
      if (!playerRole) return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });

      if (!room.drawOfferedBy || room.drawOfferedBy === playerRole) {
        return NextResponse.json({ error: "No active draw offer from your opponent to accept." }, { status: 400 });
      }

      room.winner = null;
      room.status = "completed";
      room.drawOfferedBy = null;
      await dbRepository.saveRoom(room);

      await applyGameFinishEffects(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "decline_draw") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room || room.status !== "playing") {
        return NextResponse.json({ error: "Game not found or not active" }, { status: 400 });
      }

      room.drawOfferedBy = null;
      await dbRepository.saveRoom(room);

      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "claim_timeout_win") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room || room.status !== "playing") {
        return NextResponse.json({ error: "Game not found or not active" }, { status: 400 });
      }

      const playerRole: Player | null = token === room.hostToken ? "white" : token === room.guestToken ? "black" : null;
      if (!playerRole) return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });

      const opponentRole: Player = playerRole === "white" ? "black" : "white";

      // Check if opponent is disconnected and grace period expired (>90s)
      if (room.disconnectedPlayer === opponentRole && room.disconnectTime) {
        const elapsed = Math.floor((Date.now() - room.disconnectTime) / 1000);
        if (elapsed >= timerService.DISCONNECT_GRACE_PERIOD_SECONDS) {
          room.winner = playerRole;
          room.status = "forfeited";
          await dbRepository.saveRoom(room);

          await applyGameFinishEffects(room);
          const profile = await dbRepository.getProfile(token);
          return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
        }
        return NextResponse.json({
          error: `Opponent is still within the 90s grace reconnection period (${timerService.DISCONNECT_GRACE_PERIOD_SECONDS - elapsed}s remaining).`,
        }, { status: 400 });
      }

      // Check turn timer timeout
      const timerState = timerService.checkRoomTimers(room);
      if (timerState.timedOut && timerState.forfeitedPlayer === opponentRole) {
        room.winner = playerRole;
        room.status = "forfeited";
        await dbRepository.saveRoom(room);

        await applyGameFinishEffects(room);
        const profile = await dbRepository.getProfile(token);
        return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
      }

      return NextResponse.json({ error: "Opponent has not timed out or disconnected beyond the allowed limit." }, { status: 400 });
    }

    if (action === "cancel_room") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      // Unjoined match cancellation without penalty
      if (room.status === "waiting" && !room.guestToken && token === room.hostToken) {
        room.status = "cancelled";
        await dbRepository.saveRoom(room);

        // Refund any host wager lock if applicable
        if (room.escrowId) {
          await walletService.disburseWagerEscrow(room.escrowId, null);
        }

        const profile = await dbRepository.getProfile(token);
        return NextResponse.json({
          room: formatRoomResponse(room, token),
          profile: securityService.sanitizeProfile(profile),
          message: "Unjoined room cancelled immediately without penalty.",
        });
      }

      return NextResponse.json({ error: "Only the host can cancel an unjoined waiting room." }, { status: 400 });
    }

    if (action === "report_dispute" || action === "request_review") {
      const code = cleanCode(body.code);
      const notes = String(body.notes || body.reason || "Under review by participant report").trim().slice(0, 500);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      const playerRole: Player | null = token === room.hostToken ? "white" : token === room.guestToken ? "black" : null;
      const existingProfile = await dbRepository.getProfile(token);
      const isAdmin = existingProfile && (existingProfile.role === "admin" || existingProfile.role === "super_admin");

      if (!playerRole && !isAdmin) {
        return NextResponse.json({ error: "Unauthorized to request review on this match" }, { status: 403 });
      }

      room.status = "under_review";
      room.disputeStatus = "under_review";
      room.disputeNotes = notes;
      await dbRepository.saveRoom(room);

      // Also mark linked tournament match under review if present
      if (room.leagueId && room.matchId) {
        const matches = await dbRepository.getLeagueMatches(room.leagueId);
        const lMatch = matches.find((m) => m.id === room.matchId);
        if (lMatch) {
          lMatch.status = "under_review";
          lMatch.disputeStatus = "under_review";
          lMatch.disputeNotes = notes;
          await dbRepository.saveLeagueMatch(lMatch);
        }
      }

      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile), message: "Match placed under review. Preserving all move logs and connection records." });
    }

    if (action === "forfeit") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room || room.status !== "playing") {
        return NextResponse.json({ error: "Game not found or not active" }, { status: 400 });
      }

      const playerRole: Player | null = token === room.hostToken ? "white" : token === room.guestToken ? "black" : null;
      if (!playerRole) return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });

      room.winner = playerRole === "white" ? "black" : "white";
      room.status = "forfeited";
      await dbRepository.saveRoom(room);

      await applyGameFinishEffects(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "rematch") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      // Authorization: only the active host or guest can request a rematch
      if (token !== room.hostToken && token !== room.guestToken) {
        return NextResponse.json({ error: "Unauthorized: You are not a player in this room" }, { status: 403 });
      }

      // Ensure room is finished before rematching
      if (room.status !== "finished" && room.status !== "forfeited" && room.status !== "cancelled") {
        return NextResponse.json({ error: "Cannot trigger rematch while a match is in progress" }, { status: 400 });
      }

      // Ensure previous match finish effects (such as stats and previous escrow disbursal) are applied
      await applyGameFinishEffects(room);

      // If this was a wager match, re-verify both players' points balances and lock a new escrow
      let newEscrowId: string | null = null;
      if (room.mode === "wager" && room.wagerAmount > 0 && room.guestToken) {
        const hostProfile = await dbRepository.getProfile(room.hostToken);
        const guestProfile = await dbRepository.getProfile(room.guestToken);
        const hostPoints = hostProfile?.points ?? 0;
        const guestPoints = guestProfile?.points ?? 0;

        if (hostPoints < room.wagerAmount || guestPoints < room.wagerAmount) {
          return NextResponse.json(
            { error: "Insufficient Points for rematch wager. Both players must have at least GH₵ " + room.wagerAmount + " Points." },
            { status: 400 }
          );
        }

        try {
          const escrow = await walletService.lockWagerEscrow(
            room.code,
            room.wagerAmount,
            room.hostToken,
            room.guestToken
          );
          newEscrowId = escrow.id;
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to lock wager escrow for rematch" },
            { status: 400 }
          );
        }
      }

      room.boardJson = JSON.stringify(createBoard());
      room.turn = "white";
      room.forcedFrom = null;
      room.winner = null;
      room.status = room.guestToken ? "playing" : "waiting";
      room.moveCount = 0;
      room.movesJson = "[]";
      room.resultApplied = 0;
      room.lastMoveTime = Date.now();
      room.disconnectTime = null;
      room.disconnectedPlayer = null;
      room.escrowId = newEscrowId;

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    if (action === "disconnect") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      if (token === room.hostToken || token === room.guestToken) {
        const playerRole: Player = token === room.hostToken ? "white" : "black";
        if (room.status === "playing") {
          room.disconnectTime = Date.now();
          room.disconnectedPlayer = playerRole;
          await dbRepository.saveRoom(room);
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === "reconnect") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      if (token === room.hostToken || token === room.guestToken) {
        const playerRole: Player = token === room.hostToken ? "white" : "black";
        if (room.disconnectedPlayer === playerRole) {
          room.disconnectTime = null;
          room.disconnectedPlayer = null;
          await dbRepository.saveRoom(room);
        }
      }
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

async function applyGameFinishEffects(room: Room) {
  if (room.resultApplied) return;
  room.resultApplied = 1;
  await dbRepository.saveRoom(room);

  // Dynamic Rating & Stats updates
  if (room.winner === "white") {
    await dbRepository.updateProfileStats(room.hostToken, true, false, room.guestToken);
    if (room.guestToken) await dbRepository.updateProfileStats(room.guestToken, false, false, room.hostToken);
  } else if (room.winner === "black" && room.guestToken) {
    await dbRepository.updateProfileStats(room.guestToken, true, false, room.hostToken);
    await dbRepository.updateProfileStats(room.hostToken, false, false, room.guestToken);
  } else if (room.winner === null) {
    // Draw outcome: record result equally and apply draw rating formula
    await dbRepository.updateProfileStats(room.hostToken, false, true, room.guestToken);
    if (room.guestToken) await dbRepository.updateProfileStats(room.guestToken, false, true, room.hostToken);
  }

  // Wager escrow disbursement (on draw, refunds both players equally)
  if (room.escrowId) {
    const winnerToken = room.winner === "white" ? room.hostToken : room.winner === "black" ? room.guestToken : null;
    await walletService.disburseWagerEscrow(room.escrowId, winnerToken);
  }

  // League match result verification
  if (room.leagueId && room.matchId) {
    const resultToken = room.winner === "white" ? room.hostToken : room.winner === "black" ? room.guestToken : "draw";
    if (resultToken) {
      try {
        await leagueService.submitLeagueMatchResult(room.hostToken, room.matchId, resultToken);
      } catch {
        // Facilitator will verify if host token is not authorized
      }
    }
  }
}
