import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { notificationService } from "@/lib/notification-service";
import { getAuthContext, validateCsrfToken } from "@/lib/auth-guard";

const cleanToken = (v: unknown) => String(v ?? "").trim().slice(0, 80);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawToken = cleanToken(searchParams.get("token"));
  let token = rawToken;
  if (rawToken) {
    const session = await dbRepository.getSession(rawToken);
    if (session) token = session.userId;
  }

  if (!token) {
    const authCtx = await getAuthContext(req);
    if (authCtx?.user?.token) token = authCtx.user.token;
  }

  if (!token) {
    return NextResponse.json({ notifications: [], unreadCount: 0, preferences: null });
  }

  let profile = await dbRepository.getProfile(token);
  if (!profile) {
    profile = await dbRepository.findProfileByUsername(token);
  }

  const lookupToken = profile ? profile.token : token;
  const notifications = await notificationService.getUserNotifications(lookupToken);
  const preferences = await notificationService.getUserPreferences(lookupToken);

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    preferences,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const rawToken = cleanToken(body.token);

    let token = rawToken;
    let session = null;

    const authCtx = await getAuthContext(req);
    if (authCtx?.user?.token) {
      token = authCtx.user.token;
      session = authCtx.session;
    } else if (rawToken) {
      session = await dbRepository.getSession(rawToken);
      if (session) token = session.userId;
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Valid player token required" }, { status: 401 });
    }

    // CSRF token validation
    validateCsrfToken(req, session);

    const profile = await dbRepository.getProfile(token);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (action === "send_challenge") {
      const targetUsername = String(body.targetUsername || "").trim();
      const targetToken = body.targetToken ? String(body.targetToken).trim() : undefined;
      const roomCode = String(body.roomCode || "").toUpperCase().trim();
      const mode = body.mode === "wager" ? "wager" : "casual";
      const wagerAmount = Number(body.wagerAmount || 0);

      if (!roomCode) {
        return NextResponse.json({ error: "Room code is required to send match challenge" }, { status: 400 });
      }

      const notif = await notificationService.createGameRequestNotification({
        senderToken: token,
        senderUsername: profile.username || "Challenger",
        targetUsername,
        targetToken,
        roomCode,
        mode,
        wagerAmount,
      });

      return NextResponse.json({ success: true, notification: notif });
    }

    if (action === "mark_read") {
      const id = String(body.id || "");
      if (id) {
        notificationService.markAsRead(id);
      }
      return NextResponse.json({ success: true });
    }

    if (action === "update_preferences") {
      const updates = body.preferences || {};
      const saved = await notificationService.saveUserPreferences(token, updates);
      return NextResponse.json({ success: true, preferences: saved });
    }

    if (action === "test_notification") {
      const testType = body.type || "game_request";
      const sample = await notificationService.dispatchNotification({
        recipientToken: token,
        recipientUsername: profile.username,
        senderName: testType === "game_request" ? "Grandmaster_Test" : undefined,
        type: testType,
        urgency: "urgent",
        title:
          testType === "game_request"
            ? "⚔️ Match Challenge from Grandmaster_Test!"
            : testType === "tournament_match"
            ? "🏆 Tournament Game Time Approaching!"
            : "🔔 In-App Audio Notification Test",
        message:
          testType === "game_request"
            ? "Grandmaster_Test challenged you to a 50 Marbles Wager Match in Room #TEST99!"
            : testType === "tournament_match"
            ? 'Your Round 2 tournament match vs Kwesi_King in "Accra Championship" starts in 5 minutes.'
            : "In-app audio and notification system is working flawlessly.",
        link: testType === "game_request" ? "/arena?code=TEST99&join=1" : "/leagues",
        actionLabel: testType === "game_request" ? "Accept Challenge & Play" : "View Bracket",
        channels: ["in_app", "whatsapp", "sms"],
      });
      return NextResponse.json({ success: true, notification: sample });
    }

    return NextResponse.json({ error: `Unknown notification action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process notification request" }, { status: 500 });
  }
}
