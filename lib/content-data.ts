export interface PolicySection {
  id: string;
  heading: string;
  badge?: string;
  icon?: "Shield" | "Swords" | "Scale" | "Clock" | "Zap" | "Trophy" | "Lock" | "AlertTriangle" | "CheckCircle2" | "HelpCircle" | "Coins" | "Users" | "ShieldCheck" | "ShieldAlert" | "Crown" | "BookOpen" | "FileText";
  content: string;
  bullets?: string[];
  callout?: {
    type: "info" | "warning" | "success" | "neutral";
    title?: string;
    text: string;
  };
}

export interface LegalPageContent {
  slug: "compulsory-jump-rules" | "fair-play-guarantee" | "terms-of-service";
  aliasSlugs: string[];
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  lastUpdated: string;
  version: string;
  summary: string;
  sections: PolicySection[];
}

export const CANONICAL_PAGES_DATA: Record<string, LegalPageContent> = {
  "compulsory-jump-rules": {
    slug: "compulsory-jump-rules",
    aliasSlugs: ["rules", "compulsory-jump-rules", "game-rules"],
    title: "Compulsory Jump Rules & 10×10 Damii Regulations",
    subtitle: "The official competition rulebook governing 10×10 Draughts (Damii) on the DAMII digital arena.",
    category: "Game Mechanics & Arbitration",
    badge: "Official Tournament Standard",
    lastUpdated: "August 2026",
    version: "2.4",
    summary: "DAMII follows authentic Ghanaian 10×10 Draughts regulations. Compulsory jumping is strictly enforced by the server engine: whenever an opponent's piece can be legally captured, the player MUST execute a capture. Kings possess flying capabilities across unrestricted diagonal lines.",
    sections: [
      {
        id: "board-setup",
        heading: "1. Board Setup & Initial Positioning",
        badge: "10×10 Grid",
        icon: "Swords",
        content: "DAMII is contested on a 10×10 checkered board consisting of 100 squares (50 dark playable squares and 50 light non-playable squares). Each side commands 20 pieces at the start of the game.",
        bullets: [
          "The board is oriented with a dark corner square at the bottom-left of each player.",
          "White pieces occupy rows 6 through 9 (20 pieces).",
          "Black pieces occupy rows 0 through 3 (20 pieces).",
          "Rows 4 and 5 constitute the neutral central combat zone at game commencement.",
          "White always moves first in standard tournament play."
        ],
        callout: {
          type: "info",
          title: "Coordinate System",
          text: "Each dark square is indexed internally from 0 to 99, with moves validated against server-authoritative coordinate states."
        }
      },
      {
        id: "compulsory-captures",
        heading: "2. The Compulsory Capture Mandate (Strict Enforcement)",
        badge: "Zero Tolerance",
        icon: "Zap",
        content: "If on a player's turn one or more capture options are available, the player IS FORBIDDEN from making a non-capturing quiet move. The DAMII server validation engine will reject any quiet move when a capture is open and will highlight only legal capture paths.",
        bullets: [
          "Capturing is compulsory for both Men and Kings.",
          "Men (regular pieces) can capture BOTH forwards and backwards diagonally over an adjacent opponent piece into an empty landing square immediately beyond.",
          "If multiple capture paths are available to a player, the player is free to choose ANY valid capturing sequence.",
          "Once a capture begins, the player must continue jumping if the landing square presents subsequent capture opportunities (multi-hop jump sequences).",
          "A piece cannot jump over the same enemy piece more than once during a single turn.",
          "Captured pieces remain on the board until the complete jumping sequence concludes, at which point all jumped pieces are lifted simultaneously."
        ],
        callout: {
          type: "warning",
          title: "Multi-Hop Buffer State",
          text: "When a multi-jump sequence is underway, turn clocks continue running until the final landing square is reached. In the event of a brief disconnection, the server preserves the in-flight jump queue."
        }
      },
      {
        id: "flying-kings",
        heading: "3. Promotion & Flying King Capabilities",
        badge: "Long-Range Strike",
        icon: "Crown",
        content: "A Man reaches promotion when it lands on the opponent's farthest row (the baseline: row 0 for White, row 9 for Black). Upon promotion, the piece becomes a King with expanded diagonal movement capabilities.",
        bullets: [
          "Flying Movement: A King can move diagonally across ANY number of unoccupied dark squares in a single move, both forwards and backwards.",
          "Long-Range Capture: A King can jump over an enemy piece located anywhere along its unobstructed diagonal line of sight, provided there is at least one empty square beyond that enemy piece.",
          "Flexible Landing: The King may land on ANY unoccupied square beyond the captured piece along the same diagonal trajectory.",
          "Multi-Directional King Chains: Upon landing, if the King can execute a subsequent diagonal jump in another direction, it must continue capturing.",
          "Temporary Transit Rule: If a Man reaches the baseline during a jump sequence but must immediately jump backward out of the baseline, it does NOT crown as a King — it remains a Man."
        ]
      },
      {
        id: "clocks-timeouts",
        heading: "4. Move Timers, Disconnections & Timeouts",
        badge: "60s Move Clock",
        icon: "Clock",
        content: "To guarantee fair tournament pacing and eliminate stalling tactics, matches operate under strictly monitored server clocks.",
        bullets: [
          "Standard Move Clock: Each player receives 60 seconds per turn in standard matches (15 seconds in Blitz mode).",
          "Timeout Forfeiture: Failing to execute a valid move before the turn clock hits zero results in an instant timeout defeat.",
          "Reconnection Grace Period: If a player experiences network disconnection, a 90-second grace timer is initiated.",
          "Heartbeat Verification: The client sends automated 1.5s heartbeats. If a player fails to reconnect before the grace countdown expires, the active opponent is awarded a win by disconnection forfeiture.",
          "Intentional Tab Abandonment: Closing the browser tab during an active wager match invokes instant escrow settlement in favor of the remaining player."
        ],
        callout: {
          type: "neutral",
          title: "Sync Protection",
          text: "Clocks are calculated using synchronized server timestamps (UTC), immune to local client device clock tampering."
        }
      },
      {
        id: "victory-conditions",
        heading: "5. Victory, Defeat & Draw Settlement",
        badge: "Resolution Rules",
        icon: "Trophy",
        content: "A game of Damii concludes under the following definitive scenarios:",
        bullets: [
          "Total Elimination: A player captures all 20 of the opponent's pieces.",
          "Blockade / No Legal Moves: A player whose turn it is has no legal moves remaining (all surviving pieces are trapped) loses immediately.",
          "Resignation: A player may voluntarily resign at any point through the arena interface.",
          "Threefold Repetition: If the exact same board state, piece distribution, and turn player occurs 3 times, either player may claim a Draw.",
          "Draw by Mutual Agreement: In standard matches, players may propose and accept a mutual draw if neither side can break an endgame stalemate."
        ]
      }
    ]
  },
  "fair-play-guarantee": {
    slug: "fair-play-guarantee",
    aliasSlugs: ["fair-play", "fair-play-guarantee", "anti-cheat", "escrow-guarantee"],
    title: "Fair Play Guarantee & Security Policy",
    subtitle: "Our unbreakable commitment to zero-cheat competition, transparent financial escrow, and verified match arbitration.",
    category: "Integrity & Compliance",
    badge: "Audited & Verified",
    lastUpdated: "August 2026",
    version: "3.1",
    summary: "DAMII operates with military-grade financial escrow and server-authoritative anti-cheat engines. Every move, wager lock, and rating delta is cryptographically verifiable, ensuring an authentic, corruption-free Draughts arena.",
    sections: [
      {
        id: "server-authority",
        heading: "1. Server-Authoritative Game State (Zero Local Trust)",
        badge: "Tamper Proof",
        icon: "ShieldCheck",
        content: "No game state or move execution is ever trusted from the browser client alone. The DAMII backend maintains the master board matrix, verifies all diagonal vectors, checks jump compulsions, and enforces clock thresholds independently.",
        bullets: [
          "Client-side memory modifications, script injectors, or modified network packets are rejected instantly with HTTP 400 Bad Request.",
          "Every completed match generates a comprehensive move log (`movesJson`) stored with sub-second timestamps for referee inspection.",
          "Spectator feeds operate with anti-leak safeguards to prevent ghosting or external board assistance."
        ],
        callout: {
          type: "success",
          title: "Audit Trail",
          text: "All match logs are permanently stored with SHA-256 room identifiers and available to admins during dispute arbitration."
        }
      },
      {
        id: "escrow-integrity",
        heading: "2. DAMII Native Escrow & Wager Protection",
        badge: "100% Locked Pot",
        icon: "Lock",
        content: "When two players enter a competitive wager match or tournament, both participant balances are locked into an atomic escrow pool before the first piece is touched.",
        bullets: [
          "Atomic Balance Verification: Neither player can wager funds that are simultaneously locked in another room or pending cashout.",
          "Zero Mid-Match Withdrawals: Escrow balances cannot be diverted or refunded unilaterally while a match is in progress.",
          "Instant Automated Payout: The moment a checkmate, timeout, or resignation occurs, the escrow engine transfers the pot minus the 5% platform maintenance fee directly into the winner's account.",
          "Draw Protection: In the event of an agreed or verified draw, 100% of both players' wager stakes are refunded without penalty.",
          "Server Failure Compensation: In the rare event of a platform server outage, all active escrows are automatically unlocked and returned to player wallets."
        ]
      },
      {
        id: "anti-collusion",
        heading: "3. Anti-Collusion & Rating Farming Regulations",
        badge: "Fair Rating System",
        icon: "Scale",
        content: "DAMII calculates player ratings using dynamic Elo formulas scaled by opponent tier and match activity. We aggressively penalize rating manipulation and win-trading.",
        bullets: [
          "Multi-Account Proscription: Creating multiple accounts to artificially inflate ratings, farm initial balances, or bypass matchmaking brackets is strictly forbidden.",
          "Collusion Detection: Automated algorithms flag repeated high-wager pairings between identical IP addresses, identical Momo numbers, or suspicious rapid forfeitures.",
          "Sanctions & Rollbacks: Verified win-traders face permanent rating resets, forfeiture of tournament prize eligibility, and forfeiture of accumulated balances."
        ]
      },
      {
        id: "dispute-resolution",
        heading: "4. Human Referee & Admin Dispute Resolver",
        badge: "24/7 Arbitration",
        icon: "ShieldAlert",
        content: "If a player believes a match was impacted by anomalous disconnections or unethical conduct, our Admin Dispute Resolver provides transparent oversight.",
        bullets: [
          "Match Dispute Flagging: Any participant or tournament organizer can submit a match dispute code to the administrative desk.",
          "Move-by-Move Playback: Referees inspect the chronological move ledger, connection timestamps, and board progression.",
          "Binding Ruling Options: Admins have the authority to uphold the engine result, order a rematch, override the victor in cases of proven misconduct, or issue full wager refunds.",
          "Written Justification: All dispute resolutions require logged admin rationale visible in the platform audit trail."
        ],
        callout: {
          type: "info",
          title: "Dispute SLA",
          text: "Tournament disputes are reviewed within 15 minutes during active rounds, and public wager disputes within 4 hours."
        }
      }
    ]
  },
  "terms-of-service": {
    slug: "terms-of-service",
    aliasSlugs: ["terms", "terms-of-service", "user-agreement", "legal"],
    title: "Platform Terms of Service & User Agreement",
    subtitle: "Terms and conditions governing account access, Mobile Money transactions, tournament conduct, and service usage.",
    category: "Legal & Regulatory Agreement",
    badge: "Legally Binding",
    lastUpdated: "August 2026",
    version: "4.0",
    summary: "By creating an account, depositing funds, or participating in matches on the DAMII Platform, you agree to comply with all rules, financial policies, and conduct guidelines set forth in this agreement.",
    sections: [
      {
        id: "eligibility",
        heading: "1. User Eligibility & Account Security",
        badge: "Account Ownership",
        icon: "Users",
        content: "Access to the DAMII Platform is open to players who meet basic age and regulatory standards.",
        bullets: [
          "Age Requirement: You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to participate in competitive wager rooms or real-value tournaments.",
          "One Account Per Person: Users must maintain a single account linked to their authentic phone number or Ghana Card verification.",
          "Passcode Confidentiality: You are exclusively responsible for maintaining the confidentiality of your account credentials. DAMII will never ask for your password via chat or SMS.",
          "Unauthorized Access: You must notify DAMII support immediately if you suspect unauthorized access to your account."
        ]
      },
      {
        id: "currency-payments",
        heading: "2. Points, Marbles & Mobile Money Payment Terms",
        badge: "1 GHS = 1 Point",
        icon: "Coins",
        content: "DAMII features dual virtual balance units designed for competitive tracking and seamless Mobile Money settlement.",
        bullets: [
          "Points System: 1 Ghana Cedi (GHS 1.00) corresponds to 1 Point. Points are used for tournament entry fees and competitive wager rooms.",
          "Marbles System: 1 Marble corresponds to 1 GHS value. Marbles represent promotional game credits and top-tier match stakes.",
          "Mobile Money Deposits: Deposits are processed through Direct Mobile Money (MTN MoMo, Telecel Cash, AT Money). Deposits are credited immediately upon automated verification.",
          "Withdrawal Processing: Cashout requests are verified against account activity and disbursed to the player's registered Mobile Money number within 1-24 hours.",
          "Platform Service Fee: A 5% platform maintenance fee is deducted from winning pots in wager rooms and a 10% administrative fee is deducted from organized tournament prize pools to support server infrastructure and referee operations."
        ],
        callout: {
          type: "neutral",
          title: "Minimum Transaction Limits",
          text: "Minimum deposit is GHS 5.00; minimum cashout is GHS 10.00. Maximum single withdrawal limit is GHS 2,000.00."
        }
      },
      {
        id: "organizer-code",
        heading: "3. Tournament Organizers & Licensing Obligations",
        badge: "Organizers Portal",
        icon: "Trophy",
        content: "Community organizers granted tournament creation privileges operate under strict fiduciary responsibilities.",
        bullets: [
          "Licensing Application: Organizers must submit verified identification (Ghana Card, proof of address, organization details) and receive admin approval.",
          "Prize Pool Guarantees: Tournament prize pools must be backed by escrow deposits prior to bracket generation.",
          "Non-Discrimination: Organizers may not unjustifiably deny registration or disqualify players without formal admin approval through the Tournament Request Queue.",
          "Revocation: Failure to uphold tournament standards will result in immediate organizer license revocation and automatic refunds to participants."
        ]
      },
      {
        id: "prohibited-conduct",
        heading: "4. Prohibited Conduct & Account Termination",
        badge: "Zero Tolerance",
        icon: "AlertTriangle",
        content: "DAMII reserves the right to suspend, freeze, or terminate accounts engaging in harmful or fraudulent behavior.",
        bullets: [
          "Using automated chess/draughts calculation engines (bots) during live PvP wager or tournament matches.",
          "Exploiting software vulnerabilities, server desynchronization bugs, or network glitching.",
          "Engaging in abusive language, harassment, hate speech, or defamatory conduct in match chat or community channels.",
          "Attempting chargebacks or fraudulent Mobile Money payment reversals.",
          "Consequences of Termination: Terminated accounts for serious anti-cheat violations forfeit remaining platform balances and access to future tournaments."
        ]
      },
      {
        id: "liability-amendments",
        heading: "5. Limitation of Liability & Policy Amendments",
        badge: "Legal Disclaimers",
        icon: "Scale",
        content: "DAMII provides its services on an 'as-is' and 'as-available' basis without warranties of uninterrupted availability.",
        bullets: [
          "DAMII is not liable for indirect or consequential damages arising from user internet connectivity drops or local device malfunctions.",
          "We reserve the right to modify these terms at any time. Material amendments will be announced through in-app notifications and updated on this page.",
          "Continued use of the platform after updates constitutes binding acceptance of the revised terms."
        ]
      }
    ]
  }
};
