import { Room, Player } from "./types";

export const timerService = {
  TURN_TIME_LIMIT_SECONDS: 60,
  DISCONNECT_GRACE_PERIOD_SECONDS: 45,

  checkRoomTimers(room: Room): {
    timedOut: boolean;
    forfeitedPlayer: Player | null;
    remainingTurnSeconds: number;
    remainingDisconnectSeconds: number | null;
    warning: string | null;
  } {
    if (room.status !== "playing" || room.winner) {
      return {
        timedOut: false,
        forfeitedPlayer: null,
        remainingTurnSeconds: 0,
        remainingDisconnectSeconds: null,
        warning: null,
      };
    }

    const now = Date.now();
    const lastMoveTime = room.lastMoveTime || now;
    const elapsedTurnSeconds = Math.floor((now - lastMoveTime) / 1000);
    const remainingTurnSeconds = Math.max(0, this.TURN_TIME_LIMIT_SECONDS - elapsedTurnSeconds);

    let remainingDisconnectSeconds: number | null = null;
    let forfeitedPlayer: Player | null = null;
    let timedOut = false;
    let warning: string | null = null;

    // Check disconnection window
    if (room.disconnectTime && room.disconnectedPlayer) {
      const elapsedDisconnectSeconds = Math.floor((now - room.disconnectTime) / 1000);
      remainingDisconnectSeconds = Math.max(
        0,
        this.DISCONNECT_GRACE_PERIOD_SECONDS - elapsedDisconnectSeconds
      );

      if (remainingDisconnectSeconds === 0) {
        timedOut = true;
        forfeitedPlayer = room.disconnectedPlayer;
        warning = `${room.disconnectedPlayer === "white" ? room.hostName : room.guestName} forfeited due to disconnection.`;
      } else {
        warning = `${room.disconnectedPlayer === "white" ? room.hostName : room.guestName} disconnected. ${remainingDisconnectSeconds}s to reconnect.`;
      }
    } else {
      // Normal turn clock
      if (remainingTurnSeconds === 0) {
        timedOut = true;
        forfeitedPlayer = room.turn;
        warning = `${room.turn === "white" ? room.hostName : room.guestName} forfeited on 60s turn time limit.`;
      } else if (remainingTurnSeconds <= 15) {
        warning = `Turn timer warning: ${remainingTurnSeconds}s remaining for ${room.turn === "white" ? room.hostName : room.guestName}!`;
      }
    }

    return {
      timedOut,
      forfeitedPlayer,
      remainingTurnSeconds,
      remainingDisconnectSeconds,
      warning,
    };
  },

  registerPlayerDisconnect(room: Room, player: Player): Room {
    return {
      ...room,
      disconnectTime: Date.now(),
      disconnectedPlayer: player,
      updatedAt: new Date().toISOString(),
    };
  },

  clearPlayerDisconnect(room: Room): Room {
    return {
      ...room,
      disconnectTime: null,
      disconnectedPlayer: null,
      updatedAt: new Date().toISOString(),
    };
  },
};
