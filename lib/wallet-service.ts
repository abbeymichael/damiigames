import { dbRepository } from "./db-client";
import { securityService } from "./security";
import { WalletTransaction, WagerEscrow, Deposit, Withdrawal, DepositAction, WithdrawalAction } from "./types";
import { notificationService } from "./notification-service";
import { getAdminPermissions } from "./permissions";

export async function getEffectivePaystackConfig(): Promise<{ secretKey: string; publicKey: string }> {
  try {
    const settings = await dbRepository.getPlatformSettings();
    const secretKey = (settings?.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY || "").trim();
    const publicKey = (settings?.paystackPublicKey || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "").trim();
    return { secretKey, publicKey };
  } catch {
    const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
    const publicKey = (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "").trim();
    return { secretKey, publicKey };
  }
}

export const walletService = {
  // 1 GHS = 1 Marble / Point
  POINTS_PER_GHS: 1,

  async getBalance(token: string) {
    const profile = await dbRepository.getProfile(token);
    if (!profile) {
      return {
        points: 0,
        marbles: 0,
        marblesBalance: 0,
        escrowPoints: 0,
        escrowMarbles: 0,
        totalMarbles: 0,
        activeEscrowLocks: [],
        rating: 1000,
        username: "",
        role: "user",
        roleTitle: undefined,
        isSuperAdmin: false,
        phoneNumber: "",
        wins: 0,
        losses: 0,
        draws: 0,
      };
    }
    const bal = Math.max(profile.points ?? 0, profile.marbles ?? 0);

    let roleTitle: string | undefined = undefined;
    let isSuperAdmin = false;
    if (["admin", "super_admin", "treasurer", "facilitator"].includes(profile.role)) {
      try {
        const perms = await getAdminPermissions(token);
        roleTitle = perms.roleTitle;
        isSuperAdmin = perms.isSuperAdmin;
      } catch {
        roleTitle = profile.role === "super_admin" ? "Super Admin" : "Administrator";
        isSuperAdmin = profile.role === "super_admin";
      }
    }

    // Calculate live active escrow locks for this player
    let escrowPoints = 0;
    let escrowMarbles = 0;
    const activeEscrowLocks: Array<{
      id: string;
      type: "wager_match" | "tournament";
      title: string;
      reference: string;
      amount: number;
      role: "host" | "guest" | "participant";
      status: string;
      createdAt: string;
      opponentName?: string;
    }> = [];

    try {
      const allRooms = await dbRepository.listRooms(100).catch(() => []);
      for (const room of allRooms) {
        const isHost = room.hostToken === token;
        const isGuest = room.guestToken === token;
        if (!isHost && !isGuest) continue;

        if (room.mode === "wager" && room.wagerAmount > 0) {
          // If host of a waiting or playing wager room
          if (isHost && (room.status === "waiting" || room.status === "playing" || room.status === "paused")) {
            escrowPoints += room.wagerAmount;
            escrowMarbles += room.wagerAmount;
            activeEscrowLocks.push({
              id: room.escrowId || `room-${room.code}`,
              type: "wager_match",
              title: `1-on-1 Wager Match (Room #${room.code})`,
              reference: room.code,
              amount: room.wagerAmount,
              role: "host",
              status: room.status === "waiting" ? "Waiting for Opponent" : "Match in Progress",
              createdAt: room.createdAt || new Date().toISOString(),
              opponentName: room.guestName || "Waiting for opponent...",
            });
          }
          // If guest of an active playing wager room
          else if (isGuest && (room.status === "playing" || room.status === "paused")) {
            escrowPoints += room.wagerAmount;
            escrowMarbles += room.wagerAmount;
            activeEscrowLocks.push({
              id: room.escrowId || `room-${room.code}`,
              type: "wager_match",
              title: `1-on-1 Wager Match (Room #${room.code})`,
              reference: room.code,
              amount: room.wagerAmount,
              role: "guest",
              status: "Match in Progress",
              createdAt: room.createdAt || new Date().toISOString(),
              opponentName: room.hostName || "Host",
            });
          }
        }
      }
    } catch {
      // ignore
    }

    try {
      const allLeagues = await dbRepository.listLeagues().catch(() => []);
      for (const league of allLeagues) {
        if (
          (league.status === "pending" || league.status === "registration" || league.status === "in_progress" || league.status === "active") &&
          (league.entryFeePoints || 0) > 0
        ) {
          const participants = await dbRepository.getLeagueParticipants(league.id).catch(() => []);
          const match = participants.find((p) => p.userToken === token);
          if (match && match.status !== "cancelled" && match.status !== "rejected" && match.status !== "refunded") {
            const fee = league.entryFeePoints || 0;
            escrowPoints += fee;
            escrowMarbles += fee;
            activeEscrowLocks.push({
              id: `league-${league.id}`,
              type: "tournament",
              title: `Tournament: ${league.title}`,
              reference: league.id,
              amount: fee,
              role: "participant",
              status: league.status === "in_progress" ? "Tournament in Progress" : "Registration Locked",
              createdAt: match.createdAt || league.createdAt || new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      // ignore
    }

    return {
      points: profile.points ?? 0,
      marbles: profile.marbles ?? 0,
      marblesBalance: bal,
      escrowPoints,
      escrowMarbles,
      totalMarbles: bal + escrowMarbles,
      activeEscrowLocks,
      rating: profile.rating,
      username: profile.username,
      role: profile.role,
      roleTitle,
      isSuperAdmin,
      phoneNumber: profile.phoneNumber || "",
      wins: profile.wins || 0,
      losses: profile.losses || 0,
      draws: profile.draws || 0,
    };
  },

  async initPaystackTopup(userToken: string, amountGhs: number, email?: string, customCallbackUrl?: string) {
    if (!amountGhs || isNaN(amountGhs) || amountGhs <= 0 || !Number.isFinite(amountGhs)) {
      throw new Error("Amount must be a positive number in GHS");
    }
    const profile = await dbRepository.getProfile(userToken);
    if (!profile) throw new Error("User profile not found. Please log in first.");
    if (profile.status === "banned") throw new Error("Account is banned. Please contact support.");

    const settings = await dbRepository.getAdminSettings();
    const minDep = settings.minDepositGhs ?? 5;
    const maxDep = settings.maxDepositGhs ?? 5000;

    if (amountGhs < minDep) {
      throw new Error(`Deposit amount (GH₵ ${amountGhs}) is below the minimum deposit limit of GH₵ ${minDep}`);
    }
    if (amountGhs > maxDep) {
      throw new Error(`Deposit amount (GH₵ ${amountGhs}) exceeds the maximum deposit limit of GH₵ ${maxDep.toLocaleString()}`);
    }

    const pointsToAdd = Math.floor(amountGhs);

    const ref = `PAYSTACK-${Date.now()}-${securityService.generateCsprngToken(8).toUpperCase()}`;
    const txId = `tx-${securityService.generateUUID()}`;
    const depositId = `dep-${securityService.generateUUID()}`;

    // Create pending deposit transaction
    const tx: WalletTransaction = {
      id: txId,
      userToken,
      type: "deposit",
      currency: "points",
      amount: pointsToAdd,
      reference: ref,
      status: "pending",
      metaJson: JSON.stringify({
        amountGhs: pointsToAdd,
        rate: 1,
        email: email || `${profile.username.toLowerCase().replace(/\s+/g, "")}@damii.gh`,
        depositId,
      }),
      createdAt: new Date().toISOString(),
    };

    await dbRepository.createTransaction(tx);

    // Create dedicated record in deposits table
    const deposit: Deposit = {
      id: depositId,
      userId: userToken,
      amount: pointsToAdd,
      currency: "GHS",
      method: "momo",
      provider: "Paystack",
      reference: ref,
      status: "pending",
      phoneNumber: profile.phoneNumber || null,
      accountName: profile.username || null,
      fee: 0,
      netAmount: pointsToAdd,
      metadataJson: JSON.stringify({
        email: email || `${profile.username.toLowerCase().replace(/\s+/g, "")}@damii.gh`,
        callbackUrl: customCallbackUrl || "",
      }),
      walletTransactionId: txId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbRepository.createDeposit(deposit);

    // Record initial action trail
    await dbRepository.recordDepositAction({
      id: `act-${securityService.generateUUID()}`,
      depositId: deposit.id,
      action: "create",
      actorId: userToken,
      actorName: profile.username,
      previousStatus: null,
      newStatus: "pending",
      notes: `Initiated Paystack deposit topup of GH₵ ${pointsToAdd} (${pointsToAdd} Marbles)`,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    const paystackConfig = await getEffectivePaystackConfig();
    const secretKey = (paystackConfig.secretKey || "").trim();
    if (!secretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured on the server. Please configure your Paystack secret key in Settings.");
    }

    const rawBase = (customCallbackUrl || process.env.NEXT_PUBLIC_APP_URL || "https://damii.gh").trim().replace(/\/+$/, "");
    let callbackUrl: string;
    if (rawBase.includes("?")) {
      callbackUrl = `${rawBase}&ref=${encodeURIComponent(ref)}`;
    } else {
      const pathWithWallet = rawBase.endsWith("/wallet") ? rawBase : `${rawBase}/wallet`;
      callbackUrl = `${pathWithWallet}?ref=${encodeURIComponent(ref)}`;
    }

    let authorizationUrl = "";
    let accessCode = "";

    try {
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email || `${profile.username.toLowerCase().replace(/[^a-z0-9]/g, "") || "player"}@damii.gh`,
          amount: Math.round(pointsToAdd * 100), // amount in pesewas (GH₵ 1.00 = 100 pesewas)
          reference: ref,
          currency: "GHS",
          channels: ["mobile_money", "card"],
          callback_url: callbackUrl,
          metadata: {
            userToken,
            username: profile.username,
            depositId,
            points: pointsToAdd,
            custom_fields: [
              {
                display_name: "DAMII Username",
                variable_name: "damii_username",
                value: profile.username,
              },
              {
                display_name: "Marbles",
                variable_name: "marbles_quantity",
                value: pointsToAdd.toString(),
              },
            ],
          },
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.status || !data?.data?.authorization_url) {
        const errMsg = data?.message || `HTTP ${response.status} failed to communicate with Paystack`;
        throw new Error(`Paystack Gateway: ${errMsg}`);
      }

      authorizationUrl = data.data.authorization_url;
      accessCode = data.data.access_code || "";
    } catch (err) {
      throw new Error("Paystack Gateway Error: " + (err instanceof Error ? err.message : String(err)));
    }

    return { reference: ref, authorizationUrl, accessCode, pointsToAdd, amountGhs: pointsToAdd, depositId };
  },

  async verifyAndCreditPaystack(reference: string) {
    if (!reference || typeof reference !== "string" || reference.trim().length < 5) {
      throw new Error("Invalid payment reference");
    }

    const cleanRef = reference.trim();

    return dbRepository.lockKey(`paystack:${cleanRef}`, async () => {
      // Check idempotency store
      const alreadyProcessed = await dbRepository.isPaystackRefProcessed(cleanRef);

      const all = await dbRepository.getAllTransactions(500);
      const tx = all.find((t) => t.reference === cleanRef);
      let deposit = await dbRepository.getDepositByReference(cleanRef);

      if (!tx && !deposit) {
        throw new Error("Transaction reference not found in system database");
      }

      if (tx?.status === "completed" || deposit?.status === "completed" || alreadyProcessed) {
        return { success: true, message: "Transaction already credited", tx, deposit };
      }

      const userToken = tx?.userToken || deposit?.userId || "";
      const expectedAmount = tx?.amount ?? deposit?.amount ?? 0;

      const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
      if (!secretKey) {
        throw new Error("PAYSTACK_SECRET_KEY is not configured on the server. Please add your key in Settings.");
      }

      const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json) {
        const msg = json?.message || `HTTP ${res.status} from Paystack verify endpoint`;
        throw new Error(`Paystack Verification Error: ${msg}`);
      }

      const paystackStatus = json.data?.status; // "success" | "failed" | "abandoned" | "ongoing" | "pending"
      const paidPesewas = json.data?.amount;
      const expectedPesewas = Math.round(expectedAmount * 100);

      if (paystackStatus === "success") {
        if (typeof paidPesewas === "number" && paidPesewas >= expectedPesewas) {
          await dbRepository.markPaystackRefProcessed(cleanRef);
          
          if (tx) {
            tx.status = "completed";
            await dbRepository.createTransaction(tx);
          }
          
          await dbRepository.updateProfileBalance(userToken, expectedAmount);
          
          // Write double-entry ledger entries referencing the deposit
          const ledgerEntries = await dbRepository.writeLedger([
            {
              userId: userToken,
              accountType: "available",
              entryType: "deposit",
              amount: String(expectedAmount),
              referenceType: "deposit",
              referenceId: deposit ? deposit.id : cleanRef,
            },
          ]).catch(() => []);

          const ledgerEntryId = ledgerEntries[0]?.id;

          // Update dedicated deposits table
          if (deposit) {
            deposit = await dbRepository.updateDeposit(deposit.id, {
              status: "completed",
              gatewayResponse: json.data?.gateway_response || "Successful",
              gatewayReference: json.data?.reference || cleanRef,
              verifiedAt: new Date().toISOString(),
              verifiedBy: "Paystack Gateway",
              approvedAt: new Date().toISOString(),
              approvedBy: "System Gateway",
              processedAt: new Date().toISOString(),
              ledgerEntryId: ledgerEntryId || null,
            });
          }

          // Record audit action trail on deposit
          if (deposit) {
            await dbRepository.recordDepositAction({
              id: `act-${securityService.generateUUID()}`,
              depositId: deposit.id,
              action: "verify",
              actorId: "paystack_gateway",
              actorName: "Paystack Verification API",
              previousStatus: "pending",
              newStatus: "verified",
              notes: `Gateway verified payment of GH₵ ${(paidPesewas / 100).toFixed(2)}. Channel: ${json.data?.channel || "Mobile Money"}`,
              createdAt: new Date().toISOString(),
            }).catch(() => {});

            await dbRepository.recordDepositAction({
              id: `act-${securityService.generateUUID()}`,
              depositId: deposit.id,
              action: "process",
              actorId: "system",
              actorName: "DAMII Settlement Engine",
              previousStatus: "verified",
              newStatus: "completed",
              notes: `Credited ${expectedAmount} Marbles to user wallet. Double-entry ledger #${ledgerEntryId || "auto"} created.`,
              createdAt: new Date().toISOString(),
            }).catch(() => {});
          }

          // Notify user of successful deposit
          notificationService.sendNotification({
            userToken,
            type: "account_alert",
            title: "💳 Mobile Money Deposit Confirmed",
            message: `GH₵ ${expectedAmount}.00 (${expectedAmount} Marbles) has been credited to your wallet.`,
            link: "/wallet",
            actionLabel: "View Balance",
          }).catch(() => {});

          return {
            success: true,
            message: `Successfully added GH₵ ${expectedAmount}.00 (${expectedAmount} Marbles) to your wallet!`,
            tx,
            deposit,
          };
        } else {
          throw new Error(`Payment amount mismatch: Expected GH₵ ${expectedAmount}, received GH₵ ${(paidPesewas || 0) / 100}`);
        }
      } else if (paystackStatus === "failed") {
        if (tx) {
          tx.status = "failed";
          await dbRepository.createTransaction(tx);
        }
        if (deposit) {
          await dbRepository.updateDeposit(deposit.id, {
            status: "failed",
            gatewayResponse: json.data?.gateway_response || "Payment declined",
          });
          await dbRepository.recordDepositAction({
            id: `act-${securityService.generateUUID()}`,
            depositId: deposit.id,
            action: "reject",
            actorId: "paystack_gateway",
            actorName: "Paystack Gateway",
            previousStatus: deposit.status,
            newStatus: "failed",
            notes: `Payment declined: ${json.data?.gateway_response || "Failed"}`,
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        }
        throw new Error(`Paystack Payment Failed: ${json.data?.gateway_response || "Payment was declined by provider"}`);
      } else {
        // Payment is still awaiting user authorization on phone/card
        return {
          success: false,
          pending: true,
          status: paystackStatus || "pending",
          message: `Payment is currently ${paystackStatus || "pending"}. Please complete the payment on Paystack.`,
          tx,
          deposit,
        };
      }
    });
  },

  // --- Explicit Deposit Lifecycle Actions ---
  async verifyDeposit(depositIdOrRef: string, adminToken?: string) {
    let deposit = await dbRepository.getDeposit(depositIdOrRef);
    if (!deposit) {
      deposit = await dbRepository.getDepositByReference(depositIdOrRef);
    }
    if (!deposit) throw new Error("Deposit record not found.");

    if (deposit.status === "completed") {
      return { success: true, message: "Deposit is already verified and completed.", deposit };
    }

    const caller = adminToken ? await dbRepository.getProfile(adminToken) : null;
    const actorId = adminToken || "system";
    const actorName = caller?.username || "Admin / Gateway";

    const prevStatus = deposit.status;
    const updated = await dbRepository.updateDeposit(deposit.id, {
      status: "verified",
      verifiedAt: new Date().toISOString(),
      verifiedBy: actorName,
    });

    await dbRepository.recordDepositAction({
      id: `act-${securityService.generateUUID()}`,
      depositId: deposit.id,
      action: "verify",
      actorId,
      actorName,
      previousStatus: prevStatus,
      newStatus: "verified",
      notes: `Deposit of GH₵ ${deposit.amount} verified by ${actorName}`,
      createdAt: new Date().toISOString(),
    });

    return { success: true, message: `Deposit #${deposit.id} verified.`, deposit: updated };
  },

  async approveDeposit(depositIdOrRef: string, adminToken: string, notes?: string) {
    let deposit = await dbRepository.getDeposit(depositIdOrRef);
    if (!deposit) deposit = await dbRepository.getDepositByReference(depositIdOrRef);
    if (!deposit) throw new Error("Deposit record not found.");

    if (deposit.status === "completed") {
      return { success: true, message: "Deposit has already been completed.", deposit };
    }

    const caller = await dbRepository.getProfile(adminToken);
    const actorName = caller?.username || "Admin";

    const prevStatus = deposit.status;
    const updated = await dbRepository.updateDeposit(deposit.id, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: actorName,
    });

    await dbRepository.recordDepositAction({
      id: `act-${securityService.generateUUID()}`,
      depositId: deposit.id,
      action: "approve",
      actorId: adminToken,
      actorName,
      previousStatus: prevStatus,
      newStatus: "approved",
      notes: notes || `Deposit approved by ${actorName}`,
      createdAt: new Date().toISOString(),
    });

    return { success: true, message: `Deposit #${deposit.id} approved.`, deposit: updated };
  },

  async processDeposit(depositIdOrRef: string, actorToken: string, notes?: string) {
    let deposit = await dbRepository.getDeposit(depositIdOrRef);
    if (!deposit) deposit = await dbRepository.getDepositByReference(depositIdOrRef);
    if (!deposit) throw new Error("Deposit record not found.");

    if (deposit.status === "completed") {
      return { success: true, message: "Deposit has already been processed.", deposit };
    }

    const caller = await dbRepository.getProfile(actorToken);
    const actorName = caller?.username || "Admin";

    // Credit user balance
    await dbRepository.updateProfileBalance(deposit.userId, deposit.amount);

    // Write ledger entries
    const ledgerEntries = await dbRepository.writeLedger([
      {
        userId: deposit.userId,
        accountType: "available",
        entryType: "deposit",
        amount: String(deposit.amount),
        referenceType: "deposit",
        referenceId: deposit.id,
      },
    ]).catch(() => []);

    const ledgerEntryId = ledgerEntries[0]?.id;
    const prevStatus = deposit.status;

    const updated = await dbRepository.updateDeposit(deposit.id, {
      status: "completed",
      processedAt: new Date().toISOString(),
      ledgerEntryId: ledgerEntryId || null,
    });

    await dbRepository.recordDepositAction({
      id: `act-${securityService.generateUUID()}`,
      depositId: deposit.id,
      action: "process",
      actorId: actorToken,
      actorName,
      previousStatus: prevStatus,
      newStatus: "completed",
      notes: notes || `Processed and credited GH₵ ${deposit.amount} (${deposit.amount} Marbles) to user.`,
      createdAt: new Date().toISOString(),
    });

    // Notify user
    notificationService.sendNotification({
      userToken: deposit.userId,
      type: "account_alert",
      title: "💳 Deposit Approved & Processed",
      message: `GH₵ ${deposit.amount}.00 (${deposit.amount} Marbles) has been credited to your wallet balance.`,
      link: "/wallet",
      actionLabel: "View Balance",
    }).catch(() => {});

    return { success: true, message: `Deposit #${deposit.id} processed and credited.`, deposit: updated };
  },

  async rejectDeposit(depositIdOrRef: string, adminToken: string, reason: string) {
    let deposit = await dbRepository.getDeposit(depositIdOrRef);
    if (!deposit) deposit = await dbRepository.getDepositByReference(depositIdOrRef);
    if (!deposit) throw new Error("Deposit record not found.");

    if (deposit.status === "completed") {
      throw new Error("Cannot reject a completed deposit.");
    }

    const caller = await dbRepository.getProfile(adminToken);
    const actorName = caller?.username || "Admin";

    const prevStatus = deposit.status;
    const updated = await dbRepository.updateDeposit(deposit.id, {
      status: "rejected",
      metadataJson: JSON.stringify({
        ...JSON.parse(deposit.metadataJson || "{}"),
        rejectionReason: reason,
        rejectedBy: actorName,
        rejectedAt: new Date().toISOString(),
      }),
    });

    await dbRepository.recordDepositAction({
      id: `act-${securityService.generateUUID()}`,
      depositId: deposit.id,
      action: "reject",
      actorId: adminToken,
      actorName,
      previousStatus: prevStatus,
      newStatus: "rejected",
      notes: `Rejected deposit: ${reason}`,
      createdAt: new Date().toISOString(),
    });

    return { success: true, message: `Deposit #${deposit.id} rejected.`, deposit: updated };
  },

  async getDepositDetails(depositIdOrRef: string) {
    let deposit = await dbRepository.getDeposit(depositIdOrRef);
    if (!deposit) deposit = await dbRepository.getDepositByReference(depositIdOrRef);
    if (!deposit) return null;

    const actions = await dbRepository.listDepositActions(deposit.id);
    const userProfile = await dbRepository.getProfile(deposit.userId);

    return {
      deposit,
      actions,
      user: userProfile ? {
        token: userProfile.token,
        username: userProfile.username,
        phoneNumber: userProfile.phoneNumber,
        status: userProfile.status,
      } : null,
    };
  },

  async listDeposits(filter?: { userId?: string; status?: string; limit?: number }) {
    return dbRepository.listDeposits(filter);
  },

  /**
   * Validates and formats a Ghanaian Mobile Money phone number.
   * Accepts:
   *  - 10-digit national numbers: 024XXXXXXX, 054XXXXXXX, 020XXXXXXX, 050XXXXXXX, 026XXXXXXX, 027XXXXXXX, 056XXXXXXX, etc.
   *  - International numbers: +23324XXXXXXX, 23324XXXXXXX, 0023324XXXXXXX
   * Normalizes to:
   *  - nationalFormat: "024XXXXXXX" (Required for Paystack Mobile Money transfers)
   *  - internationalFormat: "+23324XXXXXXX"
   *  - detectedProvider: "MTN" | "Telecel" | "AT"
   */
  validateAndFormatMomoPhone(
    rawPhone: string,
    provider?: string
  ): {
    isValid: boolean;
    nationalFormat: string;
    internationalFormat: string;
    detectedProvider: string;
    error?: string;
  } {
    if (!rawPhone || typeof rawPhone !== "string") {
      return {
        isValid: false,
        nationalFormat: "",
        internationalFormat: "",
        detectedProvider: "MTN",
        error: "Mobile Money phone number is required.",
      };
    }

    // Strip spaces, hyphens, brackets, dots, and common separators
    let clean = rawPhone.replace(/[\s\-\(\)\.]/g, "").trim();

    // Standardize international prefix +233 / 233 / 00233 to national 0
    if (clean.startsWith("+233")) {
      clean = "0" + clean.slice(4);
    } else if (clean.startsWith("00233")) {
      clean = "0" + clean.slice(5);
    } else if (clean.startsWith("233") && clean.length === 12) {
      clean = "0" + clean.slice(3);
    }

    // Must be exactly 10 digits starting with 0
    const ghanaMobileRegex = /^0(20|50|24|25|53|54|55|59|26|27|56|57)[0-9]{7}$/;
    const genericGhanaRegex = /^0[235][0-9]{8}$/;

    if (!genericGhanaRegex.test(clean) || clean.length !== 10) {
      return {
        isValid: false,
        nationalFormat: "",
        internationalFormat: "",
        detectedProvider: "MTN",
        error: `Invalid Ghana Mobile Money phone number format ("${rawPhone}"). Phone must be a valid 10-digit Ghana mobile number (e.g. 024XXXXXXX, 020XXXXXXX, 026XXXXXXX) or international (+233) format.`,
      };
    }

    // Determine telecom carrier from 3-digit national prefix
    const prefix = clean.slice(0, 3);
    let detectedProvider = "MTN";

    if (["024", "025", "053", "054", "055", "059"].includes(prefix)) {
      detectedProvider = "MTN";
    } else if (["020", "050"].includes(prefix)) {
      detectedProvider = "Telecel";
    } else if (["026", "027", "056", "057"].includes(prefix)) {
      detectedProvider = "AT";
    }

    // If an explicit provider was supplied, ensure compatibility or note discrepancy
    if (provider) {
      const pUpper = provider.toUpperCase().trim();
      if ((pUpper.includes("VOD") || pUpper.includes("TELECEL")) && detectedProvider !== "Telecel") {
        return {
          isValid: false,
          nationalFormat: clean,
          internationalFormat: `+233${clean.slice(1)}`,
          detectedProvider,
          error: `Phone prefix "${prefix}" belongs to ${detectedProvider}, but Telecel/Vodafone Cash was specified as the destination network.`,
        };
      }
      if ((pUpper.includes("TIGO") || pUpper.includes("AIRTEL") || pUpper.includes("ATL") || pUpper === "AT") && detectedProvider !== "AT") {
        return {
          isValid: false,
          nationalFormat: clean,
          internationalFormat: `+233${clean.slice(1)}`,
          detectedProvider,
          error: `Phone prefix "${prefix}" belongs to ${detectedProvider}, but AT (AirtelTigo) Money was specified as the destination network.`,
        };
      }
      if (pUpper.includes("MTN") && detectedProvider !== "MTN") {
        return {
          isValid: false,
          nationalFormat: clean,
          internationalFormat: `+233${clean.slice(1)}`,
          detectedProvider,
          error: `Phone prefix "${prefix}" belongs to ${detectedProvider}, but MTN Mobile Money was specified as the destination network.`,
        };
      }
    }

    return {
      isValid: true,
      nationalFormat: clean,
      internationalFormat: `+233${clean.slice(1)}`,
      detectedProvider,
    };
  },

  async requestWithdrawal(userToken: string, amountGhs: number, momoNumber?: string, momoProvider?: string) {
    if (amountGhs <= 0 || isNaN(amountGhs)) {
      throw new Error("Withdrawal amount must be a positive number greater than zero GHS");
    }
    const profile = await dbRepository.getProfile(userToken);
    if (!profile) throw new Error("User profile not found. Please log in first.");
    if (profile.status === "banned") throw new Error("Account is suspended. Please contact platform support.");

    const settings = await dbRepository.getAdminSettings();

    // Check emergency cashout lockout
    if (settings.disableWithdrawals) {
      throw new Error("Withdrawals are temporarily paused for platform system maintenance. Please try again later.");
    }

    // 1. Available Balance Validation
    const availableBalance = Number(profile.points ?? 0);
    if (availableBalance < amountGhs) {
      throw new Error(
        `Insufficient available balance. You have GH₵ ${availableBalance.toFixed(2)} available, which cannot cover the requested withdrawal of GH₵ ${amountGhs.toFixed(2)}.`
      );
    }

    // 2. Minimum & Maximum Per-Transaction Limit Validations
    const minWd = settings.minWithdrawalGhs ?? 10;
    const maxWd = settings.maxWithdrawalGhs ?? 2000;
    const maxDailyWd = settings.maxDailyWithdrawalGhs ?? 5000;

    if (amountGhs < minWd) {
      throw new Error(`Withdrawal amount (GH₵ ${amountGhs.toFixed(2)}) is below the minimum allowed withdrawal limit of GH₵ ${minWd.toFixed(2)}.`);
    }
    if (amountGhs > maxWd) {
      throw new Error(`Withdrawal amount (GH₵ ${amountGhs.toFixed(2)}) exceeds the maximum single-transaction limit of GH₵ ${maxWd.toLocaleString()}.`);
    }

    // 3. 24-Hour Daily Aggregate Limit Validation
    const userTxs = await dbRepository.getUserTransactions(userToken, 200);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent24hWithdrawals = userTxs
      .filter((t) => t.type === "withdrawal" && t.status !== "failed" && t.createdAt >= oneDayAgo)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (recent24hWithdrawals + amountGhs > maxDailyWd) {
      const remainingDailyLimit = Math.max(0, maxDailyWd - recent24hWithdrawals);
      throw new Error(
        `24-hour daily withdrawal limit of GH₵ ${maxDailyWd.toLocaleString()} reached. You have requested GH₵ ${recent24hWithdrawals.toFixed(2)} in the last 24h. Remaining available limit: GH₵ ${remainingDailyLimit.toFixed(2)}.`
      );
    }

    // 4. Mobile Money Phone Number & Provider Validation
    let user = await dbRepository.getUserById(userToken);
    if (!user && profile.phoneNumber) {
      user = await dbRepository.getUserByPhone(profile.phoneNumber);
    }

    const candidatePhone = momoNumber || (user?.phoneVerifiedAt ? user.phoneNumber : null) || user?.phoneNumber || profile.phoneNumber;
    if (!candidatePhone) {
      throw new Error("Withdrawals require a verified Mobile Money phone number. Please provide or verify your mobile number.");
    }

    const candidateProvider = momoProvider || user?.momoNetwork || "MTN";
    const phoneCheck = this.validateAndFormatMomoPhone(candidatePhone, candidateProvider);

    if (!phoneCheck.isValid) {
      throw new Error(phoneCheck.error || "Invalid Mobile Money phone number format.");
    }

    const targetMomoNumber = phoneCheck.nationalFormat;
    const targetProvider = phoneCheck.detectedProvider || candidateProvider;
    const ghsValue = Number(amountGhs.toFixed(2));

    // Deduct wallet balance immediately upon valid request submission
    await dbRepository.updateProfileBalance(userToken, -ghsValue);

    const ref = `WITHDRAW-${Date.now()}-${securityService.generateCsprngToken(4).toUpperCase()}`;
    const tx: WalletTransaction = {
      id: `tx-wdraw-${Date.now()}-${securityService.generateCsprngToken(4)}`,
      userToken,
      type: "withdrawal",
      currency: "points",
      amount: -ghsValue,
      reference: ref,
      status: "pending",
      metaJson: JSON.stringify({
        momoNumber: targetMomoNumber,
        momoPhoneInternational: phoneCheck.internationalFormat,
        momoProvider: targetProvider,
        ghsValue,
        requestedAt: new Date().toISOString(),
      }),
      createdAt: new Date().toISOString(),
    };
    await dbRepository.createTransaction(tx);
    await dbRepository.writeLedger([
      {
        userId: userToken,
        accountType: "available",
        entryType: "withdrawal",
        amount: String(-ghsValue),
        referenceType: "momo_withdrawal",
        referenceId: ref,
      },
    ]).catch(() => []);

    // Notify user of cashout request submission
    notificationService.sendNotification({
      userToken,
      type: "account_alert",
      title: "💸 Cashout Request Submitted",
      message: `Your withdrawal request of GH₵ ${ghsValue.toFixed(2)} to ${targetProvider} (${targetMomoNumber}) has been queued for disbursement.`,
      link: "/wallet",
      actionLabel: "View Wallet",
    }).catch(() => {});

    return {
      reference: ref,
      pointsDeducted: ghsValue,
      ghsValue,
      targetMomoNumber,
      targetProvider,
    };
  },

  // --- Paystack Transfers & Payout Methods ---
  getPaystackBankCode(provider?: string): string {
    const p = String(provider || "").toUpperCase().trim();
    if (p.includes("VOD") || p.includes("TELECEL")) return "VOD";
    if (p.includes("TIGO") || p.includes("AIRTEL") || p.includes("ATL")) return "ATL";
    return "MTN";
  },

  async getPaystackBalance() {
    const paystackConfig = await getEffectivePaystackConfig();
    const secretKey = (paystackConfig.secretKey || "").trim();
    if (!secretKey) {
      return { configured: false, balances: [], ghsBalance: 0, message: "PAYSTACK_SECRET_KEY not configured" };
    }

    try {
      const res = await fetch("https://api.paystack.co/balance", {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.status) {
        return { configured: true, balances: [], ghsBalance: 0, error: json?.message || `HTTP ${res.status} from Paystack` };
      }

      const rawBalances = Array.isArray(json.data) ? json.data : [];
      const balances = rawBalances.map((b: any) => ({
        currency: b.currency,
        balancePesewas: b.balance,
        balanceGhs: b.currency === "GHS" ? Number((b.balance / 100).toFixed(2)) : b.balance,
      }));

      const ghsBalance = balances.find((b: any) => b.currency === "GHS")?.balanceGhs ?? 0;

      return { configured: true, balances, ghsBalance, raw: json.data };
    } catch (err) {
      return { configured: true, balances: [], ghsBalance: 0, error: err instanceof Error ? err.message : "Network error" };
    }
  },

  async createTransferRecipient(name: string, accountNumber: string, bankCode: string, currency = "GHS") {
    const paystackConfig = await getEffectivePaystackConfig();
    const secretKey = (paystackConfig.secretKey || "").trim();
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured on the server.");

    // Validate and format Mobile Money phone number
    const phoneCheck = this.validateAndFormatMomoPhone(accountNumber, bankCode);
    if (!phoneCheck.isValid) {
      throw new Error(phoneCheck.error || `Invalid Mobile Money account number ("${accountNumber}")`);
    }

    const cleanBankCode = this.getPaystackBankCode(phoneCheck.detectedProvider || bankCode);
    const cleanAccount = phoneCheck.nationalFormat;

    const res = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "mobile_money",
        name: name || "Mobile Money Beneficiary",
        account_number: cleanAccount,
        bank_code: cleanBankCode,
        currency: currency || "GHS",
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.status || !json?.data?.recipient_code) {
      const msg = json?.message || `Paystack transfer recipient creation failed (HTTP ${res.status})`;
      throw new Error(msg);
    }

    return {
      recipientCode: json.data.recipient_code as string,
      recipientId: json.data.id,
      details: json.data.details,
      data: json.data,
      formattedPhone: cleanAccount,
      detectedProvider: phoneCheck.detectedProvider,
    };
  },

  async initiatePaystackTransfer(recipientCode: string, amountGhs: number, reference: string, reason: string) {
    const paystackConfig = await getEffectivePaystackConfig();
    const secretKey = (paystackConfig.secretKey || "").trim();
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured on the server.");

    const amountPesewas = Math.round(amountGhs * 100);
    if (amountPesewas <= 0) throw new Error("Invalid transfer amount in GHS");

    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: amountPesewas,
        recipient: recipientCode,
        reference: reference,
        reason: reason || "DAMII Platform Cashout",
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.status) {
      const msg = json?.message || `Paystack transfer initiation failed (HTTP ${res.status})`;
      throw new Error(msg);
    }

    return {
      success: true,
      transferCode: json.data?.transfer_code as string,
      transferId: json.data?.id as number,
      status: (json.data?.status || "pending") as "pending" | "processing" | "success" | "failed",
      data: json.data,
    };
  },

  async verifyPaystackTransfer(reference: string) {
    const paystackConfig = await getEffectivePaystackConfig();
    const secretKey = (paystackConfig.secretKey || "").trim();
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured on the server.");

    const res = await fetch(`https://api.paystack.co/transfer/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.status) {
      throw new Error(json?.message || `Failed to verify transfer with Paystack (HTTP ${res.status})`);
    }
    return json.data;
  },

  async processWithdrawalPayout(txIdOrRef: string, adminToken?: string) {
    let tx = await dbRepository.getTransaction(txIdOrRef);
    if (!tx) {
      tx = await dbRepository.getTransactionByReference(txIdOrRef);
    }
    if (!tx) {
      const all = await dbRepository.getAllTransactions(500);
      tx = all.find((t) => t.id === txIdOrRef || t.reference === txIdOrRef) || null;
    }

    if (!tx) throw new Error("Withdrawal transaction not found.");
    if (tx.type !== "withdrawal") throw new Error("Transaction is not a withdrawal request.");
    if (tx.status === "completed") throw new Error("Withdrawal has already been completed and paid out.");
    if (tx.status === "failed") throw new Error("Cannot disburse a failed or refunded withdrawal.");

    const profile = await dbRepository.getProfile(tx.userToken);
    let meta: Record<string, any> = {};
    try {
      meta = tx.metaJson ? JSON.parse(tx.metaJson) : {};
    } catch {
      meta = {};
    }

    const rawMomoNumber = meta.momoNumber || profile?.phoneNumber;
    const momoProvider = meta.momoProvider || "MTN";
    const amountGhs = Math.abs(tx.amount);

    if (!rawMomoNumber) {
      throw new Error("No destination Mobile Money phone number found for this withdrawal request.");
    }

    // 1. Phone number validation and format verification before payout
    const phoneCheck = this.validateAndFormatMomoPhone(rawMomoNumber, momoProvider);
    if (!phoneCheck.isValid) {
      throw new Error(`Payout aborted: Invalid Mobile Money phone number format ("${rawMomoNumber}"). ${phoneCheck.error || ""}`);
    }

    const momoNumber = phoneCheck.nationalFormat;
    const targetProvider = phoneCheck.detectedProvider || momoProvider;

    // 2. Admin settings limit compliance check
    const settings = await dbRepository.getAdminSettings();
    const minWd = settings.minWithdrawalGhs ?? 10;
    const maxWd = settings.maxWithdrawalGhs ?? 2000;

    if (amountGhs < minWd) {
      throw new Error(`Withdrawal amount (GH₵ ${amountGhs.toFixed(2)}) is below the platform minimum limit of GH₵ ${minWd.toFixed(2)}.`);
    }
    if (amountGhs > maxWd) {
      throw new Error(`Withdrawal amount (GH₵ ${amountGhs.toFixed(2)}) exceeds the platform maximum single-transaction limit of GH₵ ${maxWd.toLocaleString()}.`);
    }

    // 3. Float Balance Verification (if Paystack secret key is configured)
    const paystackConfig = await getEffectivePaystackConfig();
    const secretKey = (paystackConfig.secretKey || "").trim();
    if (secretKey) {
      const balanceInfo = await this.getPaystackBalance();
      if (balanceInfo.configured && !balanceInfo.error && balanceInfo.ghsBalance < amountGhs) {
        throw new Error(
          `Insufficient Paystack float balance (Available: GH₵ ${balanceInfo.ghsBalance.toFixed(2)}, Required: GH₵ ${amountGhs.toFixed(2)}). Please top up your Paystack balance to disburse this transfer.`
        );
      }
    }

    // 4. Create recipient code if not already saved
    let recipientCode = meta.recipientCode;
    if (!recipientCode) {
      const recipientName = profile?.fullName || profile?.username || "DAMII Player";
      const recipientRes = await this.createTransferRecipient(recipientName, momoNumber, targetProvider);
      recipientCode = recipientRes.recipientCode;
      meta.recipientCode = recipientCode;
    }

    // 5. Initiate Paystack Transfer
    const transferRef = tx.reference.startsWith("TRANSFER-") ? tx.reference : `TRANSFER-${tx.reference}`;
    const transferReason = `DAMII Cashout: @${profile?.username || "player"} (${momoNumber})`;

    const transferRes = await this.initiatePaystackTransfer(recipientCode, amountGhs, transferRef, transferReason);

    // 6. Update Transaction Metadata & Status
    meta.momoNumber = momoNumber;
    meta.momoProvider = targetProvider;
    meta.transferCode = transferRes.transferCode;
    meta.transferId = transferRes.transferId;
    meta.transferStatus = transferRes.status;
    meta.payoutInitiatedAt = new Date().toISOString();
    meta.processedByAdmin = adminToken || "system";

    tx.status = transferRes.status === "success" ? "completed" : "pending";
    tx.metaJson = JSON.stringify(meta);

    await dbRepository.createTransaction(tx);

    // Log admin audit action
    if (adminToken) {
      const caller = await dbRepository.getProfile(adminToken);
      await dbRepository.createAdminLog({
        id: `adminlog-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        adminToken,
        adminName: caller?.username || "Admin",
        action: "PROCESS_PAYSTACK_PAYOUT",
        target: tx.id,
        detailsJson: JSON.stringify({
          reference: tx.reference,
          amountGhs,
          momoNumber,
          momoProvider: targetProvider,
          transferCode: transferRes.transferCode,
          status: transferRes.status,
        }),
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    }

    // Notify user that payout is dispatched
    notificationService.sendNotification({
      userToken: tx.userToken,
      type: "account_alert",
      title: "🚀 Mobile Money Transfer Dispatched",
      message: `Your withdrawal of GH₵ ${amountGhs.toFixed(2)} to ${targetProvider} (${momoNumber}) has been submitted to Paystack. Funds will arrive in your wallet shortly.`,
      link: "/wallet",
      actionLabel: "View Wallet",
    }).catch(() => {});

    return {
      success: true,
      transaction: tx,
      transfer: transferRes,
      message: `Transfer of GH₵ ${amountGhs.toFixed(2)} dispatched to ${targetProvider} (${momoNumber}) via Paystack. Status: ${transferRes.status.toUpperCase()}`,
    };
  },

  async rejectWithdrawal(txIdOrRef: string, adminToken: string, reason: string) {
    let tx = await dbRepository.getTransaction(txIdOrRef);
    if (!tx) {
      tx = await dbRepository.getTransactionByReference(txIdOrRef);
    }
    if (!tx) {
      const all = await dbRepository.getAllTransactions(500);
      tx = all.find((t) => t.id === txIdOrRef || t.reference === txIdOrRef) || null;
    }

    if (!tx) throw new Error("Withdrawal transaction not found.");
    if (tx.type !== "withdrawal") throw new Error("Transaction is not a withdrawal request.");
    if (tx.status === "completed") throw new Error("Cannot reject an already completed withdrawal.");
    if (tx.status === "failed") throw new Error("This withdrawal has already been rejected and refunded.");

    const refundAmount = Math.abs(tx.amount);
    let meta: Record<string, any> = {};
    try {
      meta = tx.metaJson ? JSON.parse(tx.metaJson) : {};
    } catch {
      meta = {};
    }

    meta.rejectionReason = reason;
    meta.rejectedAt = new Date().toISOString();
    meta.rejectedBy = adminToken;

    tx.status = "failed";
    tx.metaJson = JSON.stringify(meta);

    // Save updated transaction
    await dbRepository.createTransaction(tx);

    // Refund points to user balance
    await dbRepository.updateProfileBalance(tx.userToken, refundAmount);

    // Record ledger entry for refund
    await dbRepository.writeLedger([
      {
        userId: tx.userToken,
        accountType: "available",
        entryType: "withdrawal_refund",
        amount: String(refundAmount),
        referenceType: "withdrawal_rejection",
        referenceId: tx.reference,
      },
    ]).catch(() => []);

    // Log admin audit action
    const caller = await dbRepository.getProfile(adminToken);
    await dbRepository.createAdminLog({
      id: `adminlog-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      adminToken,
      adminName: caller?.username || "Admin",
      action: "REJECT_WITHDRAWAL",
      target: tx.id,
      detailsJson: JSON.stringify({
        reference: tx.reference,
        amountGhs: refundAmount,
        reason,
      }),
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    // Notify user of rejection and refund
    notificationService.sendNotification({
      userToken: tx.userToken,
      type: "account_alert",
      title: "⚠️ Withdrawal Request Declined",
      message: `Your withdrawal of GH₵ ${refundAmount.toFixed(2)} was declined and refunded to your wallet balance. Reason: ${reason}`,
      link: "/wallet",
      actionLabel: "View Wallet",
    }).catch(() => {});

    return {
      success: true,
      transaction: tx,
      refundAmount,
      message: `Withdrawal rejected and GH₵ ${refundAmount.toFixed(2)} refunded to user balance.`,
    };
  },

  async batchProcessWithdrawals(txIds: string[], adminToken?: string) {
    const results: Array<{ id: string; success: boolean; error?: string; message?: string }> = [];

    for (const id of txIds) {
      try {
        const res = await this.processWithdrawalPayout(id, adminToken);
        results.push({ id, success: true, message: res.message });
      } catch (err) {
        results.push({ id, success: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return {
      total: txIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },

  async handleTransferWebhook(event: { event: string; data: any }) {
    const eventType = String(event.event || "").toLowerCase();
    const data = event.data || {};
    const ref = data.reference;
    const transferCode = data.transfer_code;

    // Look for matching withdrawal transaction
    let tx: WalletTransaction | null = null;
    if (ref) {
      tx = await dbRepository.getTransactionByReference(ref);
      if (!tx && ref.startsWith("TRANSFER-")) {
        tx = await dbRepository.getTransactionByReference(ref.replace(/^TRANSFER-/, ""));
      }
    }

    if (!tx) {
      const all = await dbRepository.getAllTransactions(500);
      tx = all.find((t) => {
        if (t.reference === ref || (ref && t.reference === ref.replace(/^TRANSFER-/, ""))) return true;
        try {
          const meta = t.metaJson ? JSON.parse(t.metaJson) : {};
          if (transferCode && meta.transferCode === transferCode) return true;
        } catch {}
        return false;
      }) || null;
    }

    if (!tx) {
      return { success: false, message: "Transaction not found for transfer webhook" };
    }

    let meta: Record<string, any> = {};
    try {
      meta = tx.metaJson ? JSON.parse(tx.metaJson) : {};
    } catch {}

    const amountGhs = Math.abs(tx.amount);

    if (eventType === "transfer.success") {
      tx.status = "completed";
      meta.transferCompletedAt = new Date().toISOString();
      meta.transferStatus = "success";
      meta.gatewayResponse = data.gateway_response || "Successful";
      tx.metaJson = JSON.stringify(meta);
      await dbRepository.createTransaction(tx);

      // Write ledger entry for settlement audit
      await dbRepository.writeLedger([
        {
          userId: tx.userToken,
          accountType: "available",
          entryType: "withdrawal_settlement",
          amount: "0",
          referenceType: "paystack_transfer_success",
          referenceId: tx.reference,
        },
      ]).catch(() => []);

      // System audit log
      await dbRepository.createAdminLog({
        id: `adminlog-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        adminToken: "system",
        adminName: "Paystack Webhook",
        action: "PAYSTACK_TRANSFER_SUCCESS",
        target: tx.id,
        detailsJson: JSON.stringify({
          reference: tx.reference,
          amountGhs,
          transferCode,
          userToken: tx.userToken,
          status: "completed",
        }),
        createdAt: new Date().toISOString(),
      }).catch(() => {});

      notificationService.sendNotification({
        userToken: tx.userToken,
        type: "account_alert",
        title: "✅ Mobile Money Cashout Completed",
        message: `GH₵ ${amountGhs.toFixed(2)} has been successfully transferred to your Mobile Money account.`,
        link: "/wallet",
        actionLabel: "View Balance",
      }).catch(() => {});

      return { success: true, status: "completed", tx };
    } else if (eventType === "transfer.failed" || eventType === "transfer.reversed") {
      if (tx.status !== "failed") {
        tx.status = "failed";
        meta.transferFailedAt = new Date().toISOString();
        meta.transferStatus = eventType === "transfer.reversed" ? "reversed" : "failed";
        meta.failureReason = data.gateway_response || data.reason || "Paystack transfer failed";
        tx.metaJson = JSON.stringify(meta);
        await dbRepository.createTransaction(tx);

        // Refund user balance
        await dbRepository.updateProfileBalance(tx.userToken, amountGhs);

        // Write ledger refund
        await dbRepository.writeLedger([
          {
            userId: tx.userToken,
            accountType: "available",
            entryType: "withdrawal_refund",
            amount: String(amountGhs),
            referenceType: "paystack_transfer_failure",
            referenceId: tx.reference,
          },
        ]).catch(() => []);

        // System audit log
        await dbRepository.createAdminLog({
          id: `adminlog-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          adminToken: "system",
          adminName: "Paystack Webhook",
          action: "PAYSTACK_TRANSFER_FAILED",
          target: tx.id,
          detailsJson: JSON.stringify({
            reference: tx.reference,
            amountGhs,
            transferCode,
            userToken: tx.userToken,
            reason: meta.failureReason,
            status: "failed_and_refunded",
          }),
          createdAt: new Date().toISOString(),
        }).catch(() => {});

        notificationService.sendNotification({
          userToken: tx.userToken,
          type: "account_alert",
          title: "❌ Cashout Transfer Failed & Refunded",
          message: `Your transfer of GH₵ ${amountGhs.toFixed(2)} could not be processed by the mobile network and was refunded to your wallet. Reason: ${meta.failureReason}`,
          link: "/wallet",
          actionLabel: "View Wallet",
        }).catch(() => {});
      }
      return { success: true, status: "failed_and_refunded", tx };
    }

    return { success: true, message: `Ignored unhandled transfer event: ${eventType}` };
  },

  // --- Wager Escrow Locking & Payouts ---
  /**
   * 1. Host creates a wager match:
   * Immediately deduct the wager amount from the host's balance and place it into Escrow.
   */
  async createWagerEscrowHost(roomCode: string, wagerAmount: number, hostToken: string): Promise<WagerEscrow> {
    return dbRepository.lockKey(`room_wager:${roomCode}`, async () => {
      const host = await dbRepository.getProfile(hostToken);
      const hostBalance = Math.max(host?.marbles ?? 0, host?.points ?? 0);

      if (!host || hostBalance < wagerAmount) {
        throw new Error(`Insufficient balance for GH₵ ${wagerAmount} Wager (Available: GH₵ ${hostBalance.toFixed(2)})`);
      }

      // Deduct wager from host immediately upon game creation
      if ((host.marbles ?? 0) >= wagerAmount) {
        await dbRepository.updateProfileMarblesBalance(hostToken, -wagerAmount);
      } else {
        await dbRepository.updateProfileBalance(hostToken, -wagerAmount);
      }

      const escrow: WagerEscrow = {
        id: `escrow-${Date.now()}-${securityService.generateCsprngToken(4)}`,
        roomCode,
        amountMarbles: wagerAmount, // Initially host's locked portion
        amountPoints: wagerAmount,
        player1Token: hostToken,
        player2Token: null,
        lockedAt: new Date().toISOString(),
        status: "locked",
        winnerToken: null,
        disbursedAt: null,
      };

      await dbRepository.createEscrow(escrow);

      const now = new Date().toISOString();
      await dbRepository.createTransaction({
        id: `tx-wager-host-${Date.now()}-${securityService.generateCsprngToken(4)}`,
        userToken: hostToken,
        type: "wager_lock",
        currency: "points",
        amount: -wagerAmount,
        reference: escrow.id,
        status: "completed",
        metaJson: JSON.stringify({ roomCode, role: "host" }),
        createdAt: now,
      });

      await dbRepository.writeLedger([
        {
          userId: hostToken,
          accountType: "available",
          entryType: "wager_lock",
          amount: String(-wagerAmount),
          referenceType: "room",
          referenceId: roomCode,
        },
        {
          userId: hostToken,
          accountType: "escrow",
          entryType: "wager_lock",
          amount: String(wagerAmount),
          referenceType: "room",
          referenceId: roomCode,
        },
      ]).catch(() => []);

      return escrow;
    });
  },

  /**
   * 2. Guest joins the wager match:
   * Immediately deduct the guest's wager amount upon clicking to join and place into Escrow, completing the total pot.
   */
  async joinWagerEscrowGuest(escrowId: string, guestToken: string, expectedWagerAmount?: number): Promise<WagerEscrow> {
    return dbRepository.lockKey(`wager_escrow:${escrowId}`, async () => {
      const escrow = await dbRepository.getEscrow(escrowId);
      if (!escrow || escrow.status !== "locked") {
        throw new Error("Wager escrow not found or is no longer active");
      }

      if (escrow.player1Token === guestToken) {
        throw new Error("Host cannot join as their own opponent");
      }

      if (escrow.player2Token && escrow.player2Token !== guestToken) {
        throw new Error("Another player has already joined this match escrow");
      }

      // If guest is already attached and escrow total is completed, return it
      if (escrow.player2Token === guestToken) {
        return escrow;
      }

      const wagerAmount = expectedWagerAmount || escrow.amountPoints;
      const guest = await dbRepository.getProfile(guestToken);
      const guestBalance = Math.max(guest?.marbles ?? 0, guest?.points ?? 0);

      if (!guest || guestBalance < wagerAmount) {
        throw new Error(`Insufficient balance. You need GH₵ ${wagerAmount} to join this wager match (Available: GH₵ ${guestBalance.toFixed(2)})`);
      }

      // Deduct wager from guest immediately upon clicking join
      if ((guest.marbles ?? 0) >= wagerAmount) {
        await dbRepository.updateProfileMarblesBalance(guestToken, -wagerAmount);
      } else {
        await dbRepository.updateProfileBalance(guestToken, -wagerAmount);
      }

      // Complete total escrow pot (Host stake + Guest stake)
      escrow.player2Token = guestToken;
      escrow.amountPoints = escrow.amountPoints + wagerAmount;
      escrow.amountMarbles = escrow.amountMarbles + wagerAmount;
      await dbRepository.saveEscrow(escrow);

      const now = new Date().toISOString();
      await dbRepository.createTransaction({
        id: `tx-wager-guest-${Date.now()}-${securityService.generateCsprngToken(4)}`,
        userToken: guestToken,
        type: "wager_lock",
        currency: "points",
        amount: -wagerAmount,
        reference: escrow.id,
        status: "completed",
        metaJson: JSON.stringify({ roomCode: escrow.roomCode, role: "guest" }),
        createdAt: now,
      });

      await dbRepository.writeLedger([
        {
          userId: guestToken,
          accountType: "available",
          entryType: "wager_lock",
          amount: String(-wagerAmount),
          referenceType: "room",
          referenceId: escrow.roomCode,
        },
        {
          userId: guestToken,
          accountType: "escrow",
          entryType: "wager_lock",
          amount: String(wagerAmount),
          referenceType: "room",
          referenceId: escrow.roomCode,
        },
      ]).catch(() => []);

      return escrow;
    });
  },

  /**
   * 3. Refund host if an unjoined room is cancelled, left, or expires.
   */
  async refundHostWagerEscrow(escrowId: string, hostToken?: string): Promise<WagerEscrow> {
    return dbRepository.lockKey(`wager_escrow:${escrowId}`, async () => {
      const escrow = await dbRepository.getEscrow(escrowId);
      if (!escrow || escrow.status !== "locked") {
        return escrow || ({} as WagerEscrow);
      }

      if (hostToken && escrow.player1Token !== hostToken) {
        throw new Error("Unauthorized to refund this host escrow");
      }

      // If an opponent joined, handle standard two-player refund instead
      if (escrow.player2Token) {
        return this.disburseWagerEscrow(escrowId, null);
      }

      const refundAmount = escrow.amountPoints;
      const now = new Date().toISOString();

      escrow.status = "refunded";
      escrow.disbursedAt = now;
      await dbRepository.saveEscrow(escrow);

      // Refund host full initial stake
      await dbRepository.updateProfileBalance(escrow.player1Token, refundAmount);

      await dbRepository.createTransaction({
        id: `tx-wager-ref-host-${Date.now()}-${securityService.generateCsprngToken(4)}`,
        userToken: escrow.player1Token,
        type: "wager_refund",
        currency: "points",
        amount: refundAmount,
        reference: escrow.id,
        status: "completed",
        metaJson: JSON.stringify({ roomCode: escrow.roomCode, reason: "unjoined_room_cancelled" }),
        createdAt: now,
      });

      await dbRepository.writeLedger([
        {
          userId: escrow.player1Token,
          accountType: "escrow",
          entryType: "wager_refund",
          amount: String(-refundAmount),
          referenceType: "room",
          referenceId: escrow.roomCode,
        },
        {
          userId: escrow.player1Token,
          accountType: "available",
          entryType: "wager_refund",
          amount: String(refundAmount),
          referenceType: "room",
          referenceId: escrow.roomCode,
        },
      ]).catch(() => []);

      return escrow;
    });
  },

  /**
   * 4. Refund guest when host declines or guest withdraws before match start
   */
  async refundGuestWagerEscrow(escrowId: string, guestToken: string): Promise<WagerEscrow> {
    return dbRepository.lockKey(`wager_escrow:${escrowId}`, async () => {
      const escrow = await dbRepository.getEscrow(escrowId);
      if (!escrow || escrow.status !== "locked") {
        return escrow || ({} as WagerEscrow);
      }

      if (escrow.player2Token !== guestToken) {
        return escrow;
      }

      const halfPot = Math.floor(escrow.amountPoints / 2);
      const refundAmount = halfPot > 0 ? halfPot : escrow.amountPoints;
      const now = new Date().toISOString();

      // Refund guest balance
      await dbRepository.updateProfileBalance(guestToken, refundAmount);

      // Decrement escrow total pot back to host stake
      escrow.player2Token = null;
      escrow.amountPoints = Math.max(0, escrow.amountPoints - refundAmount);
      escrow.amountMarbles = Math.max(0, escrow.amountMarbles - refundAmount);
      await dbRepository.saveEscrow(escrow);

      await dbRepository.createTransaction({
        id: `tx-wager-ref-guest-${Date.now()}-${securityService.generateCsprngToken(4)}`,
        userToken: guestToken,
        type: "wager_refund",
        currency: "points",
        amount: refundAmount,
        reference: escrow.id,
        status: "completed",
        metaJson: JSON.stringify({ roomCode: escrow.roomCode, reason: "challenge_declined_or_withdrawn" }),
        createdAt: now,
      });

      await dbRepository.writeLedger([
        {
          userId: guestToken,
          accountType: "escrow",
          entryType: "wager_refund",
          amount: String(-refundAmount),
          referenceType: "room",
          referenceId: escrow.roomCode,
        },
        {
          userId: guestToken,
          accountType: "available",
          entryType: "wager_refund",
          amount: String(refundAmount),
          referenceType: "room",
          referenceId: escrow.roomCode,
        },
      ]).catch(() => []);

      return escrow;
    });
  },

  async lockWagerEscrow(roomCode: string, wagerAmount: number, player1Token: string, player2Token: string): Promise<WagerEscrow> {
    return dbRepository.lockKey(`room_wager:${roomCode}`, async () => {
      const p1 = await dbRepository.getProfile(player1Token);
      const p2 = await dbRepository.getProfile(player2Token);

      const p1Balance = Math.max(p1?.marbles ?? 0, p1?.points ?? 0);
      const p2Balance = Math.max(p2?.marbles ?? 0, p2?.points ?? 0);

      if (!p1 || p1Balance < wagerAmount) throw new Error(`Host has insufficient balance for GH₵ ${wagerAmount} Wager (Available: GH₵ ${p1Balance.toFixed(2)})`);
      if (!p2 || p2Balance < wagerAmount) throw new Error(`Guest has insufficient balance for GH₵ ${wagerAmount} Wager (Available: GH₵ ${p2Balance.toFixed(2)})`);

      // Deduct wager balance from both players (prioritizing marbles or points)
      let p1Deducted = false;
      let p2Deducted = false;
      try {
        if ((p1.marbles ?? 0) >= wagerAmount) {
          await dbRepository.updateProfileMarblesBalance(player1Token, -wagerAmount);
        } else {
          await dbRepository.updateProfileBalance(player1Token, -wagerAmount);
        }
        p1Deducted = true;

        if ((p2.marbles ?? 0) >= wagerAmount) {
          await dbRepository.updateProfileMarblesBalance(player2Token, -wagerAmount);
        } else {
          await dbRepository.updateProfileBalance(player2Token, -wagerAmount);
        }
        p2Deducted = true;
      } catch (err) {
        if (p1Deducted) await dbRepository.updateProfileBalance(player1Token, wagerAmount).catch(() => {});
        if (p2Deducted) await dbRepository.updateProfileBalance(player2Token, wagerAmount).catch(() => {});
        throw err;
      }

      const escrow: WagerEscrow = {
        id: `escrow-${Date.now()}-${securityService.generateCsprngToken(4)}`,
        roomCode,
        amountMarbles: wagerAmount * 2,
        amountPoints: wagerAmount * 2, // Total pot
        player1Token,
        player2Token,
        lockedAt: new Date().toISOString(),
        status: "locked",
        winnerToken: null,
        disbursedAt: null,
      };

      await dbRepository.createEscrow(escrow);

      const now = new Date().toISOString();
      await dbRepository.createTransaction({
        id: `tx-wager-p1-${Date.now()}-${securityService.generateCsprngToken(4)}`,
        userToken: player1Token,
        type: "wager_lock",
        currency: "points",
        amount: -wagerAmount,
        reference: escrow.id,
        status: "completed",
        metaJson: JSON.stringify({ roomCode }),
        createdAt: now,
      });

      await dbRepository.createTransaction({
        id: `tx-wager-p2-${Date.now()}-${securityService.generateCsprngToken(4)}`,
        userToken: player2Token,
        type: "wager_lock",
        currency: "points",
        amount: -wagerAmount,
        reference: escrow.id,
        status: "completed",
        metaJson: JSON.stringify({ roomCode }),
        createdAt: now,
      });

      await dbRepository.writeLedger([
        {
          userId: player1Token,
          accountType: "available",
          entryType: "wager_lock",
          amount: String(-wagerAmount),
          referenceType: "room",
          referenceId: roomCode,
        },
        {
          userId: player1Token,
          accountType: "escrow",
          entryType: "wager_lock",
          amount: String(wagerAmount),
          referenceType: "room",
          referenceId: roomCode,
        },
        {
          userId: player2Token,
          accountType: "available",
          entryType: "wager_lock",
          amount: String(-wagerAmount),
          referenceType: "room",
          referenceId: roomCode,
        },
        {
          userId: player2Token,
          accountType: "escrow",
          entryType: "wager_lock",
          amount: String(wagerAmount),
          referenceType: "room",
          referenceId: roomCode,
        },
      ]).catch(() => []);

      return escrow;
    });
  },

  async disburseWagerEscrow(escrowId: string, winnerToken: string | null): Promise<WagerEscrow> {
    return dbRepository.lockKey(`wager_escrow:${escrowId}`, async () => {
      const escrow = await dbRepository.getEscrow(escrowId);
      if (!escrow || escrow.status !== "locked") {
        throw new Error("Escrow not found or already settled");
      }

      const now = new Date().toISOString();
      const settings = await dbRepository.getAdminSettings();
      const wagerFeePercent = settings.wagerFeePercent ?? 5;

      if (winnerToken) {
        // Validate that the winnerToken is strictly one of the two participants in this match escrow
        if (winnerToken !== escrow.player1Token && winnerToken !== escrow.player2Token) {
          throw new Error(
            `Security violation: Winner token (${winnerToken}) is not a registered participant in escrow #${escrow.id}. Escrow funds can only be disbursed to authorized match participants.`
          );
        }

        // Calculate platform fee percentage on total pot
        const totalPot = escrow.amountPoints;
        const platformFee = Math.round((totalPot * wagerFeePercent) / 100);
        const winnerPayout = totalPot - platformFee;

        escrow.status = "disbursed";
        escrow.winnerToken = winnerToken;
        escrow.disbursedAt = now;
        await dbRepository.saveEscrow(escrow);

        // Credit net payout to winner
        await dbRepository.updateProfileBalance(winnerToken, winnerPayout);

        // Record transaction for winner
        await dbRepository.createTransaction({
          id: `tx-wager-win-${Date.now()}-${securityService.generateCsprngToken(4)}`,
          userToken: winnerToken,
          type: "wager_win",
          currency: "points",
          amount: winnerPayout,
          reference: escrow.id,
          status: "completed",
          metaJson: JSON.stringify({ roomCode: escrow.roomCode, totalPot, platformFee, wagerFeePercent }),
          createdAt: now,
        });

        // Notify winner of victory and pot payout
        notificationService.sendNotification({
          userToken: winnerToken,
          type: "wager_result",
          title: "🏆 Wager Match Won!",
          message: `Congratulations! You won GH₵ ${winnerPayout.toFixed(2)} in Room #${escrow.roomCode}.`,
          link: "/wallet",
          actionLabel: "View Payout",
          actionPayload: { roomCode: escrow.roomCode, winnerPayout },
        }).catch(() => {});

        // Record platform fee entry for system ledger
        if (platformFee > 0) {
          await dbRepository.createTransaction({
            id: `tx-fee-${Date.now()}-${securityService.generateCsprngToken(4)}`,
            userToken: "system-house",
            type: "platform_fee",
            currency: "points",
            amount: platformFee,
            reference: escrow.id,
            status: "completed",
            metaJson: JSON.stringify({ roomCode: escrow.roomCode, totalPot, wagerFeePercent }),
            createdAt: now,
          });
        }

        const wagerStakePerPlayer = Math.floor(escrow.amountPoints / 2);
        await dbRepository.writeLedger([
          {
            userId: escrow.player1Token,
            accountType: "escrow",
            entryType: "wager_win",
            amount: String(-wagerStakePerPlayer),
            referenceType: "room",
            referenceId: escrow.roomCode,
          },
          ...(escrow.player2Token ? [{
            userId: escrow.player2Token,
            accountType: "escrow" as const,
            entryType: "wager_win" as const,
            amount: String(-wagerStakePerPlayer),
            referenceType: "room",
            referenceId: escrow.roomCode,
          }] : []),
          {
            userId: winnerToken,
            accountType: "available",
            entryType: "wager_win",
            amount: String(winnerPayout),
            referenceType: "room",
            referenceId: escrow.roomCode,
          },
          ...(platformFee > 0 ? [{
            userId: "platform-treasury",
            accountType: "available" as const,
            entryType: "platform_fee" as const,
            amount: String(platformFee),
            referenceType: "room",
            referenceId: escrow.roomCode,
          }] : []),
        ]).catch(() => []);
      } else {
        // Refund full wager amount on draw or cancellation
        escrow.status = "refunded";
        escrow.disbursedAt = now;
        await dbRepository.saveEscrow(escrow);

        const isSinglePlayer = !escrow.player2Token;
        const refundPerPlayer = isSinglePlayer ? escrow.amountPoints : Math.floor(escrow.amountPoints / 2);
        await dbRepository.updateProfileBalance(escrow.player1Token, refundPerPlayer);
        if (escrow.player2Token) {
          await dbRepository.updateProfileBalance(escrow.player2Token, refundPerPlayer);
        }

        await dbRepository.createTransaction({
          id: `tx-wager-ref-p1-${Date.now()}-${securityService.generateCsprngToken(4)}`,
          userToken: escrow.player1Token,
          type: "wager_refund",
          currency: "points",
          amount: refundPerPlayer,
          reference: escrow.id,
          status: "completed",
          metaJson: JSON.stringify({ roomCode: escrow.roomCode }),
          createdAt: now,
        });

        if (escrow.player2Token) {
          await dbRepository.createTransaction({
            id: `tx-wager-ref-p2-${Date.now()}-${securityService.generateCsprngToken(4)}`,
            userToken: escrow.player2Token,
            type: "wager_refund",
            currency: "points",
            amount: refundPerPlayer,
            reference: escrow.id,
            status: "completed",
            metaJson: JSON.stringify({ roomCode: escrow.roomCode }),
            createdAt: now,
          });
        }

        await dbRepository.writeLedger([
          {
            userId: escrow.player1Token,
            accountType: "escrow",
            entryType: "wager_refund",
            amount: String(-refundPerPlayer),
            referenceType: "room",
            referenceId: escrow.roomCode,
          },
          {
            userId: escrow.player1Token,
            accountType: "available",
            entryType: "wager_refund",
            amount: String(refundPerPlayer),
            referenceType: "room",
            referenceId: escrow.roomCode,
          },
          ...(escrow.player2Token ? [
            {
              userId: escrow.player2Token,
              accountType: "escrow" as const,
              entryType: "wager_refund" as const,
              amount: String(-refundPerPlayer),
              referenceType: "room",
              referenceId: escrow.roomCode,
            },
            {
              userId: escrow.player2Token,
              accountType: "available" as const,
              entryType: "wager_refund" as const,
              amount: String(refundPerPlayer),
              referenceType: "room",
              referenceId: escrow.roomCode,
            },
          ] : []),
        ]).catch(() => []);

        // Notify both players of draw and refunded stakes
        notificationService.sendNotification({
          userToken: escrow.player1Token,
          type: "wager_result",
          title: "🤝 Wager Match Draw",
          message: `The match in Room #${escrow.roomCode} ended in a draw. Your stake of GH₵ ${refundPerPlayer.toFixed(2)} has been refunded.`,
          link: "/wallet",
          actionLabel: "View Wallet",
        }).catch(() => {});

        if (escrow.player2Token) {
          notificationService.sendNotification({
            userToken: escrow.player2Token,
            type: "wager_result",
            title: "🤝 Wager Match Draw",
            message: `The match in Room #${escrow.roomCode} ended in a draw. Your stake of GH₵ ${refundPerPlayer.toFixed(2)} has been refunded.`,
            link: "/wallet",
            actionLabel: "View Wallet",
          }).catch(() => {});
        }
      }

      return escrow;
    });
  },
};
