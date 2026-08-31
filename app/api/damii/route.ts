import { NextRequest, NextResponse } from "next/server";
import { applyMove, createBoard, legalMoves, playerName, formatMoveNotation, type Move } from "@/lib/damii-rules";
import { dbRepository } from "@/lib/db-client";
import { walletService } from "@/lib/wallet-service";
import { timerService } from "@/lib/timer-service";
import { leagueService } from "@/lib/league-service";
import { presenceService } from "@/lib/presence-service";
import { securityService } from "@/lib/security";
import { getAuthContext, validateCsrfToken } from "@/lib/auth-guard";
import { botService } from "@/lib/bot-service";
import { chatService } from "@/lib/chat-service";
import { getProfileRank } from "@/lib/rank-service";
import { Room, GameMode, Player, MoveLogEntry, Profile } from "@/lib/types";

const cleanName = (value: unknown) => String(value ?? "").trim().replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 20);
const cleanToken = (value: unknown) => String(value ?? "").trim().slice(0, 80);
const cleanCode = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

function formatRoomResponse(
  room: Room,
  token?: string,
  username?: string,
  rawToken?: string,
  sessionUserId?: string
) {
  let role: "white" | "black" | "spectator" = "spectator";
  const cleanU = (username || "").trim().toLowerCase();
  const hostU = (room.hostName || "").trim().toLowerCase();
  const guestU = (room.guestName || "").trim().toLowerCase();

  const isHost = Boolean(
    (token && (token === room.hostToken || (sessionUserId && sessionUserId === room.hostToken))) ||
    (rawToken && rawToken === room.hostToken) ||
    (cleanU && hostU && cleanU === hostU)
  );

  const isGuest = Boolean(
    (token && (token === room.guestToken || (sessionUserId && sessionUserId === room.guestToken))) ||
    (rawToken && rawToken === room.guestToken) ||
    (cleanU && guestU && cleanU === guestU)
  );

  if (isHost) role = "white";
  else if (isGuest) role = "black";

  // Check turn timers & 90s disconnection grace
  const timerState = timerService.checkRoomTimers(room);

  let moves: MoveLogEntry[] = [];
  try {
    if (room.movesJson) moves = JSON.parse(room.movesJson);
  } catch {
    moves = [];
  }

  const chat = chatService.getMessages(room.code);

  return {
    code: room.code,
    hostName: room.hostName,
    hostFullName: room.hostFullName || room.hostName,
    hostRankTitle: room.hostRankTitle || "Draft Learner",
    hostRankBadge: room.hostRankBadge || "🪵",
    hostRating: room.hostRating || 1200,
    guestName: room.guestName,
    guestFullName: room.guestFullName || (room.guestName ? room.guestName : null),
    guestRankTitle: room.guestRankTitle || (room.guestName ? "Draft Learner" : null),
    guestRankBadge: room.guestRankBadge || (room.guestName ? "🪵" : null),
    guestRating: room.guestRating || (room.guestName ? 1200 : null),
    guestToken: room.guestToken || null,
    hostToken: room.hostToken || null,
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
    chat,
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
      // Completed, ended, forfeited, cancelled, abandoned, or closed games are not live
      if (r.winner !== null && r.winner !== undefined) return false;
      if (r.status !== "playing" && r.status !== "waiting" && r.status !== "pending_acceptance") return false;

      if (r.status === "waiting" || r.status === "pending_acceptance") {
        const createdMs = new Date(r.createdAt).getTime();
        if (now - createdMs >= 10 * 60 * 1000) return false;
        // If private, only show to the host/creator or participants
        if (r.isPrivate) {
          return Boolean(rawToken && (rawToken === r.hostToken || rawToken === r.guestToken));
        }
        return true;
      }

      if (r.status === "playing") {
        if (r.isPrivate) {
          return Boolean(rawToken && (rawToken === r.hostToken || rawToken === r.guestToken));
        }
        return true;
      }

      return false;
    });

    // Build active match token & username lookup
    const activeMatchTokens = new Set<string>();
    const activeMatchNames = new Set<string>();
    for (const r of rawRooms) {
      if (r.status === "playing" && !r.winner) {
        if (r.hostToken) activeMatchTokens.add(r.hostToken);
        if (r.guestToken) activeMatchTokens.add(r.guestToken);
        if (r.hostName) activeMatchNames.add(r.hostName.toLowerCase());
        if (r.guestName) activeMatchNames.add(r.guestName.toLowerCase());
      }
    }

    const nonPlayerRoles = new Set(["admin", "super_admin", "organizer", "facilitator", "treasurer"]);
    const mappedLeaderboard = leaderboard
      .filter((p) => !nonPlayerRoles.has(p.role) && p.status !== "banned")
      .map((p) => {
        const isBot = p.token?.startsWith("bot-player-") || botService.isBot(p.token);
        const inMatch = activeMatchTokens.has(p.token) || activeMatchNames.has(p.username.toLowerCase());
        const presence = presenceService.getPresence(p.token, p.username);
        const sanitized = securityService.sanitizePublicProfile(p);
        
        const isOnline = isBot ? true : inMatch ? true : presence.isOnline;
        const presenceStatus = inMatch ? "in_match" : isBot ? "online" : presence.presenceStatus;

        return {
          ...sanitized,
          isOnline,
          presenceStatus,
          lastSeenAt: isBot ? new Date().toISOString() : presence.lastSeenAt,
        };
      });

    return NextResponse.json({
      activeRooms: validRooms,
      leaderboard: mappedLeaderboard,
      leagues,
    });
  }

  if (searchParams.get("leaderboard") === "1") {
    const [leaderboard, rawRooms] = await Promise.all([
      dbRepository.getLeaderboard(50),
      dbRepository.listRooms(30),
    ]);

    const activeMatchTokens = new Set<string>();
    const activeMatchNames = new Set<string>();
    for (const r of rawRooms) {
      if (r.status === "playing" && !r.winner) {
        if (r.hostToken) activeMatchTokens.add(r.hostToken);
        if (r.guestToken) activeMatchTokens.add(r.guestToken);
        if (r.hostName) activeMatchNames.add(r.hostName.toLowerCase());
        if (r.guestName) activeMatchNames.add(r.guestName.toLowerCase());
      }
    }

    const nonPlayerRoles = new Set(["admin", "super_admin", "organizer", "facilitator", "treasurer"]);
    const mappedLeaderboard = leaderboard
      .filter((p) => !nonPlayerRoles.has(p.role) && p.status !== "banned")
      .map((p) => {
        const isBot = p.token?.startsWith("bot-player-") || botService.isBot(p.token);
        const inMatch = activeMatchTokens.has(p.token) || activeMatchNames.has(p.username.toLowerCase());
        const presence = presenceService.getPresence(p.token, p.username);
        const sanitized = securityService.sanitizePublicProfile(p);

        const isOnline = isBot ? true : inMatch ? true : presence.isOnline;
        const presenceStatus = inMatch ? "in_match" : isBot ? "online" : presence.presenceStatus;

        return {
          ...sanitized,
          isOnline,
          presenceStatus,
          lastSeenAt: isBot ? new Date().toISOString() : presence.lastSeenAt,
        };
      });
    return NextResponse.json({ leaderboard: mappedLeaderboard });
  }

  const code = cleanCode(searchParams.get("code"));
  const rawToken = cleanToken(searchParams.get("token"));
  const username = cleanName(searchParams.get("username"));
  let token = rawToken;
  let sessionUserId = "";
  if (rawToken) {
    const session = await dbRepository.getSession(rawToken);
    if (session) {
      token = session.userId;
      sessionUserId = session.userId;
    }
    presenceService.recordPresence(token, username || undefined, code || null);
  }

  if (!code) {
    const activeRooms = await dbRepository.listRooms(30);
    const now = Date.now();
    // Filter out ended/completed matches, expired unjoined rooms (>10 mins), and private rooms for non-participants
    const validRooms = activeRooms.filter((r) => {
      if (r.winner !== null && r.winner !== undefined) return false;
      if (r.status !== "playing" && r.status !== "waiting") return false;
      if (r.status === "waiting") {
        const createdMs = new Date(r.createdAt).getTime();
        if (now - createdMs >= 10 * 60 * 1000) return false;
        if (r.isPrivate) {
          return Boolean(
            (token && (token === r.hostToken || token === r.guestToken)) ||
            (rawToken && (rawToken === r.hostToken || rawToken === r.guestToken)) ||
            (username && r.hostName && username.toLowerCase() === r.hostName.toLowerCase())
          );
        }
        return true;
      }
      if (r.status === "playing") {
        if (r.isPrivate) {
          return Boolean(
            (token && (token === r.hostToken || token === r.guestToken)) ||
            (rawToken && (rawToken === r.hostToken || rawToken === r.guestToken)) ||
            (username && r.hostName && username.toLowerCase() === r.hostName.toLowerCase())
          );
        }
        return true;
      }
      return false;
    });
    return NextResponse.json({ activeRooms: validRooms });
  }

  const room = await dbRepository.getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const now = Date.now();

  // 1. Unjoined match 10-minute auto-expiry & bot matchmaking for casual games
  if (room.status === "waiting" && !room.guestToken) {
    const createdMs = new Date(room.createdAt).getTime();
    const elapsedMs = now - createdMs;

    // For casual free public games: match with one of the authentic player accounts after a randomized auto-join delay (15s, 1m, 1.5m to 7m)
    const requiredDelayMs = botService.getRoomJoinDelayMs(room.code, room.createdAt);
    if (room.mode === "casual" && !room.isPrivate && elapsedMs >= requiredDelayMs) {
      await botService.matchmakeBotIfEligible(room);
    } else if (elapsedMs > 10 * 60 * 1000) {
      room.status = "cancelled";
      await dbRepository.saveRoom(room);
      // Refund host locked wager from escrow if applicable
      if (room.escrowId) {
        await walletService.refundHostWagerEscrow(room.escrowId, room.hostToken).catch(() => {});
      }
      return NextResponse.json({
        room: formatRoomResponse(room, token, username, rawToken, sessionUserId),
        message: "Room automatically expired after 10 minutes with no opponent. Wager stake refunded.",
      });
    }
  }

  // 1b. If the room is playing and it's a bot's turn, execute their move with realistic human-like pacing
  if (room.status === "playing") {
    const isBotTurn =
      (room.turn === "white" && botService.isBot(room.hostToken)) ||
      (room.turn === "black" && botService.isBot(room.guestToken));
    if (isBotTurn) {
      const timeSinceLastMove = now - (room.lastMoveTime || 0);
      // Add slight delay (1.0s) so moves feel natural and animated
      if (timeSinceLastMove >= 1000) {
        const moved = await botService.triggerBotMoveIfTurn(room);
        if (moved && room.winner) {
          await applyGameFinishEffects(room);
        }
      }
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
    const isHost = token === room.hostToken || rawToken === room.hostToken || (username && room.hostName && username.toLowerCase() === room.hostName.toLowerCase());
    const isGuest = token === room.guestToken || rawToken === room.guestToken || (username && room.guestName && username.toLowerCase() === room.guestName.toLowerCase());
    if (isHost || isGuest) {
      const playerRole: Player = isHost ? "white" : "black";
      if (room.disconnectedPlayer === playerRole) {
        room.disconnectTime = null;
        room.disconnectedPlayer = null;
        await dbRepository.saveRoom(room);
      }
    }
  }

  return NextResponse.json({ room: formatRoomResponse(room, token, username, rawToken, sessionUserId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "").trim().toLowerCase();
    const rawToken = cleanToken(body.token);
    const username = cleanName(body.username);

    let session = null;
    const authCtx = await getAuthContext(req);
    if (authCtx?.session) {
      session = authCtx.session;
    } else if (rawToken) {
      session = await dbRepository.getSession(rawToken);
    }

    // Enforce CSRF token verification on state-changing game and profile actions
    validateCsrfToken(req, session);

    if (!rawToken && !authCtx?.user?.token) return NextResponse.json({ error: "Player token required" }, { status: 400 });

    const effectiveRawToken = rawToken || authCtx?.user?.token || "";
    const { token: resolvedToken, profile: resolvedProfile } = await resolvePlayerToken(effectiveRawToken, username);
    const token = resolvedToken || effectiveRawToken;
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

    if (action === "spectate") {
      const code = cleanCode(body.code);
      if (!code) return NextResponse.json({ error: "Room code required" }, { status: 400 });
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found or no longer active." }, { status: 404 });
      if (room.status === "cancelled") {
        return NextResponse.json({ error: "This game was cancelled by the host." }, { status: 400 });
      }
      return NextResponse.json({
        room: formatRoomResponse(room, token),
        profile: existingProfile ? securityService.sanitizeProfile(existingProfile) : null,
      });
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

      // IMMEDIATELY deduct host's wager amount upon creating the 1-on-1 wager match and place into Escrow
      let escrowId: string | null = null;
      if (mode === "wager" && wagerAmount > 0) {
        try {
          const escrow = await walletService.createWagerEscrowHost(code, wagerAmount, token);
          escrowId = escrow.id;
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to deduct wager and create escrow" },
            { status: 400 }
          );
        }
      }

      const isPrivate = Boolean(body.isPrivate);
      const now = new Date().toISOString();
      const hostRank = existingProfile ? getProfileRank(existingProfile) : null;
      const room: Room = {
        code,
        hostName: username,
        hostFullName: existingProfile?.fullName || username,
        hostRankTitle: hostRank?.title || "Draft Learner",
        hostRankBadge: hostRank?.badgeEmoji || "🪵",
        hostRating: existingProfile?.rating || 1200,
        hostToken: token,
        guestName: null,
        guestToken: null,
        guestFullName: null,
        guestRankTitle: null,
        guestRankBadge: null,
        guestRating: null,
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
        escrowId,
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

      const targetUsername = body.targetUsername ? String(body.targetUsername).trim() : "";
      if (targetUsername) {
        const botAccount = await botService.findBot(targetUsername);
        if (botAccount) {
          if (mode === "wager" && wagerAmount > 0 && escrowId) {
            try {
              let botProf = await dbRepository.getProfile(botAccount.token);
              if (!botProf) {
                await dbRepository.upsertProfile(botAccount.token, botAccount.username);
                botProf = await dbRepository.getProfile(botAccount.token);
              }
              if (botProf) {
                const bal = Math.max(botProf.points || 0, botProf.marbles || 0);
                if (bal < wagerAmount) {
                  botProf.points = Math.max(wagerAmount * 5, 2000);
                  botProf.marbles = botProf.points;
                  await dbRepository.saveProfile(botProf);
                }
              }
              await walletService.joinWagerEscrowGuest(escrowId, botAccount.token, wagerAmount);
            } catch (err) {
              console.error("Failed to fund bot escrow:", err);
            }
          }
          await botService.setupBotDirectChallenge(room, botAccount);
        }
      }

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token, username, rawToken, resolvedToken), profile: securityService.sanitizeProfile(profile) });
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
        return NextResponse.json({ room: formatRoomResponse(room, token, username, rawToken, resolvedToken), profile: securityService.sanitizeProfile(profile) });
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

      // IMMEDIATELY deduct guest wager upon clicking to join and place in Escrow to complete the total pot
      if (room.mode === "wager" && room.wagerAmount > 0) {
        try {
          if (room.escrowId) {
            await walletService.joinWagerEscrowGuest(room.escrowId, token, room.wagerAmount);
          } else {
            // Fallback for legacy rooms without prior host escrow
            const escrow = await walletService.lockWagerEscrow(
              room.code,
              room.wagerAmount,
              room.hostToken,
              token
            );
            room.escrowId = escrow.id;
          }
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to deduct joiner wager and lock escrow" },
            { status: 400 }
          );
        }
      }

      // Compute guest rank & details
      const guestRank = getProfileRank(existingProfile);
      room.guestName = username;
      room.guestToken = token;
      room.guestFullName = existingProfile.fullName || username;
      room.guestRankTitle = guestRank.title;
      room.guestRankBadge = guestRank.badgeEmoji;
      room.guestRating = existingProfile.rating ?? 1200;
      room.guestReady = true;
      room.hostReady = false;

      // Populate host details if missing
      if (!room.hostFullName || !room.hostRankTitle) {
        const hostProfile = await dbRepository.getProfile(room.hostToken);
        if (hostProfile) {
          const hostRank = getProfileRank(hostProfile);
          room.hostFullName = hostProfile.fullName || room.hostName;
          room.hostRankTitle = hostRank.title;
          room.hostRankBadge = hostRank.badgeEmoji;
          room.hostRating = hostProfile.rating ?? 1200;
        }
      }

      // Instead of auto-starting, enter pending_acceptance state for host manual review
      room.status = "pending_acceptance";
      room.lastMoveTime = Date.now();
      room.disconnectTime = null;
      room.disconnectedPlayer = null;

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({
        room: formatRoomResponse(room, token, username, rawToken, resolvedToken),
        profile: securityService.sanitizeProfile(profile),
        message: `Challenge sent to ${room.hostName}. Waiting for host to accept.`,
      });
    }

    if (action === "accept_challenge") {
      const code = cleanCode(body.code);
      if (!code) return NextResponse.json({ error: "Room code required" }, { status: 400 });
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      const isHost = Boolean(
        (token && (token === room.hostToken || (resolvedToken && resolvedToken === room.hostToken) || (rawToken && rawToken === room.hostToken))) ||
        (username && room.hostName && username.trim().toLowerCase() === room.hostName.trim().toLowerCase())
      );

      if (!isHost) {
        return NextResponse.json({ error: "Only the host can accept match challenges." }, { status: 403 });
      }

      if (!room.guestToken || room.status !== "pending_acceptance") {
        return NextResponse.json({ error: "No active pending challenger to accept." }, { status: 400 });
      }

      room.hostReady = true;
      room.guestReady = true;
      room.status = "playing";
      room.lastMoveTime = Date.now();
      room.disconnectTime = null;
      room.disconnectedPlayer = null;

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({
        room: formatRoomResponse(room, token, username, rawToken, resolvedToken),
        profile: securityService.sanitizeProfile(profile),
        message: "Match challenge accepted! Launching 10x10 board...",
      });
    }

    if (action === "decline_challenge") {
      const code = cleanCode(body.code);
      if (!code) return NextResponse.json({ error: "Room code required" }, { status: 400 });
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      const isHost = Boolean(
        (token && (token === room.hostToken || (resolvedToken && resolvedToken === room.hostToken) || (rawToken && rawToken === room.hostToken))) ||
        (username && room.hostName && username.trim().toLowerCase() === room.hostName.trim().toLowerCase())
      );

      if (!isHost) {
        return NextResponse.json({ error: "Only the host can decline challenges." }, { status: 403 });
      }

      const guestToken = room.guestToken;
      if (guestToken && room.mode === "wager" && room.escrowId) {
        await walletService.refundGuestWagerEscrow(room.escrowId, guestToken).catch(() => {});
      }

      // Reset guest data and return to clean waiting room without penalty or forfeit
      room.guestToken = null;
      room.guestName = null;
      room.guestFullName = null;
      room.guestRankTitle = null;
      room.guestRankBadge = null;
      room.guestRating = null;
      room.guestReady = false;
      room.hostReady = false;
      room.status = "waiting";

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({
        room: formatRoomResponse(room, token, username, rawToken, resolvedToken),
        profile: securityService.sanitizeProfile(profile),
        message: "Challenger declined. You remain waiting for the next opponent.",
      });
    }

    if (action === "withdraw_challenge") {
      const code = cleanCode(body.code);
      if (!code) return NextResponse.json({ error: "Room code required" }, { status: 400 });
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      const isGuest = Boolean(
        (token && (token === room.guestToken || (resolvedToken && resolvedToken === room.guestToken) || (rawToken && rawToken === room.guestToken))) ||
        (username && room.guestName && username.trim().toLowerCase() === room.guestName.trim().toLowerCase())
      );

      if (!isGuest) {
        return NextResponse.json({ error: "Only the challenger can withdraw this challenge." }, { status: 403 });
      }

      if (room.status !== "pending_acceptance") {
        return NextResponse.json({ error: "Cannot withdraw challenge once the game has started." }, { status: 400 });
      }

      if (room.mode === "wager" && room.escrowId) {
        await walletService.refundGuestWagerEscrow(room.escrowId, token).catch(() => {});
      }

      room.guestToken = null;
      room.guestName = null;
      room.guestFullName = null;
      room.guestRankTitle = null;
      room.guestRankBadge = null;
      room.guestRating = null;
      room.guestReady = false;
      room.hostReady = false;
      room.status = "waiting";

      await dbRepository.saveRoom(room);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({
        room: formatRoomResponse(room, token, username, rawToken, resolvedToken),
        profile: securityService.sanitizeProfile(profile),
        message: "Challenge withdrawn. Your wager balance has been refunded.",
      });
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

        // Ensure wager escrow is complete
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

    if (action === "leave_room" || action === "close_room") {
      const code = cleanCode(body.code);
      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      if (room.status === "waiting" || room.status === "pending_acceptance") {
        if (token === room.guestToken) {
          if (room.mode === "wager" && room.escrowId) {
            await walletService.refundGuestWagerEscrow(room.escrowId, token).catch(() => {});
          }
          room.guestToken = null;
          room.guestName = null;
          room.guestFullName = null;
          room.guestRankTitle = null;
          room.guestRankBadge = null;
          room.guestRating = null;
          room.guestReady = false;
          room.hostReady = false;
          room.status = "waiting";
          await dbRepository.saveRoom(room);
        } else if (token === room.hostToken) {
          if (room.guestToken && room.mode === "wager" && room.escrowId) {
            await walletService.refundGuestWagerEscrow(room.escrowId, room.guestToken).catch(() => {});
          }
          if (room.escrowId) {
            await walletService.refundHostWagerEscrow(room.escrowId, room.hostToken).catch(() => {});
          }
          room.status = "cancelled";
          await dbRepository.saveRoom(room);
        }
      } else if (room.status === "playing") {
        // If a player leaves an ongoing match, mark them as forfeited
        const isHost = token === room.hostToken;
        const isGuest = token === room.guestToken;
        if (isHost || isGuest) {
          const forfeitingPlayer: Player = isHost ? "white" : "black";
          room.winner = forfeitingPlayer === "white" ? "black" : "white";
          room.status = "forfeited";
          await dbRepository.saveRoom(room);
          await applyGameFinishEffects(room);
        }
      } else if (room.status === "completed" || room.status === "forfeited" || room.status === "draw") {
        // Already finished match being closed
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

      // Host cancels waiting or pending room
      if ((room.status === "waiting" || room.status === "pending_acceptance") && token === room.hostToken) {
        room.status = "cancelled";
        await dbRepository.saveRoom(room);

        // Refund guest if one was joined
        if (room.guestToken && room.mode === "wager" && room.escrowId) {
          await walletService.refundGuestWagerEscrow(room.escrowId, room.guestToken).catch(() => {});
        }

        // Refund host wager lock immediately back to available balance
        if (room.escrowId) {
          await walletService.refundHostWagerEscrow(room.escrowId, room.hostToken).catch(() => {});
        }

        const profile = await dbRepository.getProfile(token);
        return NextResponse.json({
          room: formatRoomResponse(room, token),
          profile: securityService.sanitizeProfile(profile),
          message: "Room cancelled immediately without penalty.",
        });
      }

      // Guest leaves waiting or pending room
      if ((room.status === "waiting" || room.status === "pending_acceptance") && token === room.guestToken) {
        if (room.mode === "wager" && room.escrowId) {
          await walletService.refundGuestWagerEscrow(room.escrowId, token).catch(() => {});
        }
        room.guestToken = null;
        room.guestName = null;
        room.guestFullName = null;
        room.guestRankTitle = null;
        room.guestRankBadge = null;
        room.guestRating = null;
        room.guestReady = false;
        room.hostReady = false;
        room.status = "waiting";
        await dbRepository.saveRoom(room);

        const profile = await dbRepository.getProfile(token);
        return NextResponse.json({
          room: formatRoomResponse(room, token),
          profile: securityService.sanitizeProfile(profile),
          message: "Left the waiting room.",
        });
      }

      return NextResponse.json({ error: "Only participants can cancel or leave a waiting room." }, { status: 400 });
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

    if (action === "chat") {
      const code = cleanCode(body.code);
      const text = String(body.text ?? "").trim().slice(0, 140);
      if (!text) {
        return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
      }

      const room = await dbRepository.getRoom(code);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

      let senderRole: "white" | "black" | "spectator" = "spectator";
      let senderName = username || "Spectator";

      if (token === room.hostToken) {
        senderRole = "white";
        senderName = room.hostName;
      } else if (token === room.guestToken) {
        senderRole = "black";
        senderName = room.guestName || "Guest";
      }

      chatService.addMessage(room.code, senderName, senderRole, text);
      const profile = await dbRepository.getProfile(token);
      return NextResponse.json({ room: formatRoomResponse(room, token), profile: securityService.sanitizeProfile(profile) });
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
      if (room.status !== "completed" && room.status !== "finished" && room.status !== "forfeited" && room.status !== "cancelled" && !room.winner) {
        return NextResponse.json({ error: "Cannot trigger rematch while a match is in progress" }, { status: 400 });
      }

      // Ensure previous match finish effects (such as stats and previous escrow disbursal) are applied
      await applyGameFinishEffects(room);

      // If this was a wager match, re-verify both players' points balances and lock a new escrow
      let newEscrowId: string | null = null;
      if (room.mode === "wager" && room.wagerAmount > 0 && room.guestToken) {
        const hostProfile = await dbRepository.getProfile(room.hostToken);
        const guestProfile = await dbRepository.getProfile(room.guestToken);
        const hostBalance = Math.max(Number(hostProfile?.points ?? 0), Number(hostProfile?.marbles ?? 0));
        const guestBalance = Math.max(Number(guestProfile?.points ?? 0), Number(guestProfile?.marbles ?? 0));

        if (hostBalance < room.wagerAmount || guestBalance < room.wagerAmount) {
          return NextResponse.json(
            { error: `Insufficient balance for rematch wager. Both players must have at least GH₵ ${room.wagerAmount} (Host: GH₵ ${hostBalance.toFixed(2)}, Guest: GH₵ ${guestBalance.toFixed(2)}).` },
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
