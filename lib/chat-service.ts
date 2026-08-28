export type ChatMessage = {
  id: string;
  roomCode: string;
  sender: string;
  senderRole: "white" | "black" | "spectator" | "system";
  text: string;
  timestamp: number;
};

class ChatService {
  private messages = new Map<string, ChatMessage[]>();

  getMessages(roomCode: string): ChatMessage[] {
    const code = (roomCode || "GLOBAL").toUpperCase();
    const list = this.messages.get(code);
    return list ? [...list] : [];
  }

  addMessage(
    roomCode: string,
    sender: string,
    senderRole: "white" | "black" | "spectator" | "system",
    text: string
  ): ChatMessage {
    const code = (roomCode || "GLOBAL").toUpperCase();
    const current = this.messages.get(code) || [];
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      roomCode: code,
      sender: sender.slice(0, 24),
      senderRole,
      text: text.slice(0, 140),
      timestamp: Date.now(),
    };
    current.push(msg);
    if (current.length > 60) {
      current.shift();
    }
    this.messages.set(code, current);
    return msg;
  }

  clearRoom(roomCode: string) {
    this.messages.delete((roomCode || "GLOBAL").toUpperCase());
  }
}

export const chatService = new ChatService();
