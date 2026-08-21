import type {
  InAppNotificationSettings,
  WhatsAppSettings,
  SmsSettings,
  EmailSettings,
  NotificationChannelRouting,
  UserNotificationPreferences,
} from "./types";

export const DEFAULT_USER_PREFERENCES: UserNotificationPreferences = {
  gameRequestsInApp: true,
  tournamentAlertsInApp: true,
  turnRemindersInApp: true,
  whatsappEnabled: false,
  whatsappGameRequests: true,
  whatsappTournamentAlerts: true,
  smsEnabled: false,
  smsTournamentAlerts: true,
  emailEnabled: false,
  emailTournamentAlerts: true,
  emailSettlements: true,
};

export const DEFAULT_IN_APP_SETTINGS: InAppNotificationSettings = {
  enabled: true,
  soundEnabled: true,
  soundVolume: 80,
  soundTheme: "classic",
  toastPosition: "top-right",
  autoDismissSeconds: 6,
};

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  provider: "whatsapp_cloud_api",
  phoneNumberId: "109823498172345",
  businessAccountId: "982347109283471",
  accessTokenMasked: "EAAG...configured",
  gameRequestTemplate: "⚔️ DAMII Match Challenge: {opponent} challenged you to a 10×10 Damii match ({stake}). Join room: {link}",
  tournamentAlertTemplate: "🏆 DAMII Tournament Alert: Your Round {round} match vs {opponent} in '{tournament}' is ready to play! Enter arena: {link}",
  turnReminderTemplate: "⏳ DAMII Turn Alert: Your turn to move vs {opponent} in Room #{roomCode}. Click to play: {link}",
  enabled: true,
};

export const DEFAULT_SMS_SETTINGS: SmsSettings = {
  provider: "hubtel",
  senderId: "DAMII",
  apiKeyMasked: "HUB-***-KEY",
  otpTemplate: "Your DAMII verification code is {code}. Valid for 5 minutes.",
  matchInviteTemplate: "DAMII Alert: {opponent} invited you to a {stake} match. Room #{roomCode}: {link}",
  tournamentAlertTemplate: "DAMII: Round {round} in '{tournament}' vs {opponent} is ready. Join: {link}",
  enabled: true,
};

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: "smtp",
  senderEmail: "notifications@damii.game",
  senderName: "DAMII Draughts Arena",
  smtpHost: "smtp.mailgun.org",
  smtpPort: 587,
  smtpUser: "postmaster@damii.game",
  passwordMasked: "••••••••••••",
  secure: true,
  // Template: Game Request (1v1 Challenge)
  gameRequestSubject: "⚔️ Match Challenge from {opponent} | DAMII Arena",
  gameRequestTemplate: "Hello {recipient},\n\n{opponent} has challenged you to a 10×10 Damii match ({stake}) in Room #{roomCode}!\n\nClick the link below to accept the challenge and enter the arena:\n{link}\n\nTurn clocks and forfeit timers will apply once the match starts. Play fair and may the best strategist win!",
  // Template: Tournament Match Approaching
  tournamentApproachingSubject: "🏆 Tournament Match Approaching: Round {round} in '{tournament}' | DAMII",
  tournamentApproachingTemplate: "Hello {recipient},\n\nYour Round {round} tournament match against {opponent} in '{tournament}' is scheduled and approaching!\n\nMatch Details:\n• Tournament: {tournament}\n• Round: Round {round}\n• Opponent: {opponent}\n\nPlease click the button below to check in and enter your match arena:\n{link}\n\nEnsure you are online and ready when the clock begins. Good luck!",
  // Additional transactional templates
  welcomeSubject: "Welcome to DAMII 10x10 Draughts Arena",
  welcomeTemplate: "Welcome to DAMII, {recipient}! Master the 10x10 board, challenge players across Ghana, and compete in ranked tournaments.",
  payoutAlertSubject: "💰 DAMII Wallet Withdrawal Processed",
  payoutAlertTemplate: "Your withdrawal of GHS {amount} via Mobile Money ({phone}) has been processed successfully.",
  matchInviteSubject: "⚔️ Match Challenge from {opponent} | DAMII Arena",
  matchInviteTemplate: "Hello {recipient},\n\n{opponent} has challenged you to a 10×10 Damii match ({stake}) in Room #{roomCode}!\n\nJoin room: {link}",
  tournamentAlertSubject: "🏆 Tournament Match Approaching: Round {round} in '{tournament}' | DAMII",
  tournamentAlertTemplate: "Hello {recipient},\n\nYour tournament match in '{tournament}' against {opponent} is ready. Join arena: {link}",
  enabled: true,
};

export const DEFAULT_CHANNEL_ROUTING: NotificationChannelRouting = {
  game_request: ["in_app", "whatsapp", "sms"],
  tournament_match: ["in_app", "whatsapp", "sms", "email"],
  tournament_alert: ["in_app", "whatsapp", "email"],
  turn_reminder: ["in_app", "whatsapp"],
  league_invite: ["in_app", "whatsapp", "sms"],
  wager_settlement: ["in_app", "email"],
  system: ["in_app"],
};
