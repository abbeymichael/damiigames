import fs from "fs";
import path from "path";

export interface SmsLogEntry {
  type: "OTP" | "NOTIFICATION" | "SMS";
  phone: string;
  code?: string;
  message: string;
  provider: string;
  status: string;
  messageId?: string;
}

/**
 * Appends SMS and OTP dispatches to the server-side log file (logs/sms-otp.log)
 * and outputs structured console logs.
 */
export function logSmsToFile(entry: SmsLogEntry): void {
  try {
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFile = path.join(logsDir, "sms-otp.log");
    const timestamp = new Date().toISOString();
    const cleanPhone = entry.phone.replace(/[^\d+]/g, "");
    const codeSegment = entry.code ? ` | OTP_CODE: [${entry.code}]` : "";
    const msgIdSegment = entry.messageId ? ` | MsgId: ${entry.messageId}` : "";

    const logLine = `[${timestamp}] [${entry.type}] [PROVIDER: ${entry.provider.toUpperCase()}] [STATUS: ${entry.status}] To: ${cleanPhone}${codeSegment}${msgIdSegment} | Message: "${entry.message}"\n`;

    fs.appendFileSync(logFile, logLine, "utf8");
    console.log(`[SMS-DISPATCH-LOG] ${logLine.trim()}`);
  } catch (err) {
    console.error("[logSmsToFile] Failed to write to sms-otp.log:", err);
  }
}
