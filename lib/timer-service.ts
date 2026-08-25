import { Room, Player } from "./types";

export const timerService = {
  TURN_TIME_LIMIT_SECONDS: 60,
  DISCONNECT_GRACE_PERIOD_SECONDS: 90,

  getTurnTimeLimit(room: Room): number {
    if (room.customConstraints?.turnTimerSeconds !== undefined && room.customConstraints.turnTimerSeconds !== null) {
      return room.customConstraints.turnTimerSeconds;
    }
    return this.TURN_TIME_LIMIT_SECONDS;
  },

  getDisconnectGracePeriod(room: Room): number {
    if (room.customConstraints?.disconnectionGraceSeconds !== undefined && room.customConstraints.disconnectionGraceSeconds !== null) {
      return room.customConstraints.disconnectionGraceSeconds;
    }
    return this.DISCONNECT_GRACE_PERIOD_SECONDS;
  },

  checkRoomTimers(room: Room): {
    timedOut: boolean;
    forfeitedPlayer: Player | null;
    remainingTurnSeconds: number;
    remainingDisconnectSeconds: number | null;
    warning: string | null;
    bothDisconnected?: boolean;
  } {
    if (room.status !== "playing" || room.winner) {
      return {
        timedOut: false,
        forfeitedPlayer: null,
        remainingTurnSeconds: 0,
        remainingDisconnectSeconds: null,
        warning: null,
        bothDisconnected: room.status === "abandoned",
      };
    }

    const turnLimit = this.getTurnTimeLimit(room);
    const disconnectLimit = this.getDisconnectGracePeriod(room);

    const now = Date.now();
    const lastMoveTime = room.lastMoveTime || now;
    const elapsedTurnSeconds = Math.floor((now - lastMoveTime) / 1000);
    const remainingTurnSeconds = turnLimit > 0 ? Math.max(0, turnLimit - elapsedTurnSeconds) : 99999;

    let remainingDisconnectSeconds: number | null = null;
    let forfeitedPlayer: Player | null = null;
    let timedOut = false;
    let warning: string | null = null;

    // Check disconnection window
    if (room.disconnectTime && room.disconnectedPlayer) {
      const elapsedDisconnectSeconds = Math.floor((now - room.disconnectTime) / 1000);
      remainingDisconnectSeconds = Math.max(
        0,
        disconnectLimit - elapsedDisconnectSeconds
      );

      if (remainingDisconnectSeconds === 0) {
        timedOut = true;
        forfeitedPlayer = room.disconnectedPlayer;
        warning = `${room.disconnectedPlayer === "white" ? room.hostName : room.guestName} disconnected and exceeded the ${disconnectLimit}s grace window. Opponent may claim win.`;
      } else {
        warning = `${room.disconnectedPlayer === "white" ? room.hostName : room.guestName} disconnected. ${remainingDisconnectSeconds}s remaining to reconnect (timer paused).`;
      }
    } else {
      // Normal turn clock (only if turn timer is enabled / > 0)
      if (turnLimit > 0 && remainingTurnSeconds === 0) {
        timedOut = true;
        forfeitedPlayer = room.turn;
        warning = `${room.turn === "white" ? room.hostName : room.guestName} forfeited on ${turnLimit}s turn time limit.`;
      } else if (turnLimit > 0 && remainingTurnSeconds <= 15) {
        warning = `Turn timer warning: ${remainingTurnSeconds}s remaining for ${room.turn === "white" ? room.hostName : room.guestName}!`;
      }
    }

    return {
      timedOut,
      forfeitedPlayer,
      remainingTurnSeconds: room.disconnectTime ? turnLimit : remainingTurnSeconds,
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
