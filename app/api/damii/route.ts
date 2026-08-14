import { NextRequest, NextResponse } from "next/server";
import { applyMove, createBoard, legalMoves, playerName, formatMoveNotation, type Move } from "@/lib/damii-rules";
import { dbRepository } from "@/lib/db-client";
import { walletService } from "@/lib/wallet-service";
import { timerService } from "@/lib/timer-service";
import { leagueService } from "@/lib/league-service";
import { Room, GameMode, Player, MoveLogEntry } from "@/lib/types";

const cleanName = (value: unknown) => String(value ?? "").trim().replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 20);
const cleanToken = (value: unknown) => String(value ?? "").trim().slice(0, 80);
const cleanCode = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

function formatRoomResponse(room: Room, token: string) {
  let role: "white" | "black" | "spectator" = "spectator";
  if (token && token === room.hostToken) role = "white";
  else if (token && token === room.guestToken) role = "black";

  // Check turn timers
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
    moveCount: room.moveCount,
    moves,
    role,
    timerState,
    updatedAt: room.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("leaderboard") === "1") {
    const leaderboard = await dbRepository.getLeaderboard(10);
    return NextResponse.json({ leaderboard });
  }

  const code = cleanCode(searchParams.get("code"));
  const token = cleanToken(searchParams.get("token"));

  if (!code) {
    const activeRooms = await dbRepository.listRooms(10);
    return NextResponse.json({ activeRooms });
  }

  const room = await dbRepository.getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Check timer & disconnection state
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
    const token = cleanToken(body.token);
    const username = cleanName(body.username);

    if (!token) return NextResponse.json({ error: "Player token required" }, { status: 400 });

    const existingProfile = await dbRepository.getProfile(token);
    if (existingProfile && existingProfile.status === "banned") {
      return NextResponse.json({ error: "Account is banned. Please contact admin support." }, { status: 403 });
    }

    // Admin accounts are non-playing facilitators
    if (
      existingProfile &&
      (existingProfile.role === "admin" || existingProfile.role === "super_admin") &&
      ["create", "join", "move", "resign", "offer_draw"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Administrator accounts serve as league facilitators and regulators. Admin accounts cannot participate in player matches." },
        { status: 403 }
      );
    }

    if (action === "profile") {
      if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
      const profile = await dbRepository.upsertProfile(token, username);
      return NextResponse.json({ profile });
    }

    if (action === "create") {
      if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
      await dbRepository.upsertProfile(token, username);

      const mode: GameMode = (["casual", "wager", "league"].includes(body.mode) ? body.mode : "casual") as GameMode;
      const wagerAmount = Math.max(0, Number(body.wagerAmount) || 0);

      if (mode === "wager" && wagerAmount > 0) {
        const profile = await dbRepository.getProfile(token);
        if (!profile || profile.marbles < wagerAmount) {
          return NextResponse.json({ error: `Insufficient Marbles balance for ${wagerAmount} Wager` }, { status: 400 });
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

      const now = new Date().toISOString();
      const room: Room = {
        code,
        hostName: username,
        hostToken: token,
        guestName: null,
        guestToken: null,
        boardJson: JSON.stringify(createBoard()),
        turn: "white",
        forcedFrom: null,
        winner: null,
        status: "waiting",
        mode,
        wagerAmount,
        escrowId: null,
        leagueId: body.leagueId ? String(body.leagueId) : null,
        matchId: body.matchId ? String(body.matchId) : null,
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
      return NextResponse.json({ room: formatRoomResponse(room, token), profile });
    }

    if (action === "join") {
      const code = cleanCode(body.code);
      if (!code) return NextResponse.json({ error: "Room code required" }, { status: 400 });
      if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

      await dbRepository.upsertProfile(token, username);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      if (room.hostToken === token) {
        const profile = await dbRepository.getProfile(token);
        return NextResponse.json({ room: formatRoomResponse(room, token), profile });
      }

      if (room.guestToken && room.guestToken !== token) {
        return NextResponse.json({ error: "Room is full" }, { status: 400 });
      }

      // Validate wager requirement for guest
      if (room.mode === "wager" && room.wagerAmount > 0) {
        const guestProfile = await dbRepository.getProfile(token);
        if (!guestProfile || guestProfile.marbles < room.wagerAmount) {
          return NextResponse.json({ error: `Insufficient Marbles. You need ${room.wagerAmount} Marbles to join this wager room.` }, { status: 400 });
        }
      }

      room.guestName = username;
      room.guestToken = token;
      room.status = "playing";
      room.lastMoveTime = Date.now();

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
      return NextResponse.json({ room: formatRoomResponse(room, token), profile });
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
      const allowed = legalMoves(board, room.turn, room.forcedFrom);
      const selectedMove = allowed.find((m: Move) => m.from === from && m.to === to);

      if (!selectedMove) return NextResponse.json({ error: "Illegal move" }, { status: 400 });

      const result = applyMove(board, room.turn, room.forcedFrom, from, to);
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
      return NextResponse.json({ room: formatRoomResponse(room, token), profile });
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
      return NextResponse.json({ room: formatRoomResponse(room, token), profile });
    }

    if (action === "disconnect") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      const isHost = token === room.hostToken;
      const isGuest = token === room.guestToken;

      if ((isHost || isGuest) && room.status === "playing") {
        const playerRole: Player = isHost ? "white" : "black";
        room.disconnectTime = Date.now();
        room.disconnectedPlayer = playerRole;
        await dbRepository.saveRoom(room);
      }

      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile });
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
      return NextResponse.json({ room: formatRoomResponse(room, token), profile });
    }

    if (action === "rematch") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      room.boardJson = JSON.stringify(createBoard());
      room.turn = "white";
      room.forcedFrom = null;
      room.winner = null;
      room.status = room.guestToken ? "playing" : "waiting";
      room.moveCount = 0;
      room.movesJson = "[]";
      room.resultApplied = 0;
      room.lastMoveTime = Date.now();
      room.escrowId = null;

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile });
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
    // Draw outcome
    await dbRepository.updateProfileStats(room.hostToken, false, true, room.guestToken);
    if (room.guestToken) await dbRepository.updateProfileStats(room.guestToken, false, true, room.hostToken);
  }

  // Wager escrow disbursement
  if (room.escrowId) {
    const winnerToken = room.winner === "white" ? room.hostToken : room.winner === "black" ? room.guestToken : null;
    await walletService.disburseWagerEscrow(room.escrowId, winnerToken);
  }

  // League match result verification
  if (room.leagueId && room.matchId && room.winner) {
    const winnerToken = room.winner === "white" ? room.hostToken : room.guestToken;
    if (winnerToken) {
      try {
        await leagueService.submitLeagueMatchResult(room.hostToken, room.matchId, winnerToken);
      } catch {
        // Facilitator will verify if host token is not authorized
      }
    }
  }
}
