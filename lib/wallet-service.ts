import { dbRepository } from "./db-client";
import { securityService } from "./security";
import { WalletTransaction, WagerEscrow } from "./types";
import { notificationService } from "./notification-service";

export const walletService = {
  // 1 GHS = 100 Points
  POINTS_PER_GHS: 100,

  async getBalance(token: string) {
    const profile = await dbRepository.getProfile(token);
    if (!profile) {
      return { points: 0, rating: 1000, username: "", role: "user", phoneNumber: "", wins: 0, losses: 0, draws: 0 };
    }
    return {
      points: profile.points,
      rating: profile.rating,
      username: profile.username,
      role: profile.role,
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

    // Create pending deposit transaction
    const tx: WalletTransaction = {
      id: `tx-${securityService.generateUUID()}`,
      userToken,
      type: "deposit",
      currency: "points",
      amount: pointsToAdd,
      reference: ref,
      status: "pending",
      metaJson: JSON.stringify({ amountGhs: pointsToAdd, rate: 1, email: email || `${profile.username.toLowerCase().replace(/\s+/g, "")}@damii.gh` }),
      createdAt: new Date().toISOString(),
    };

    await dbRepository.createTransaction(tx);

    const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
    if (!secretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured on the server. Please configure your Paystack secret key in Settings.");
    }

    const baseCallback = customCallbackUrl || process.env.NEXT_PUBLIC_APP_URL || "https://damii.gh";
    const callbackUrl = baseCallback.includes("?")
      ? `${baseCallback}&ref=${encodeURIComponent(ref)}`
      : `${baseCallback.replace(/\/$/, "")}/wallet?ref=${encodeURIComponent(ref)}`;

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

    return { reference: ref, authorizationUrl, accessCode, pointsToAdd, amountGhs: pointsToAdd };
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

      if (!tx) {
        throw new Error("Transaction reference not found in system database");
      }

      if (tx.status === "completed" || alreadyProcessed) {
        return { success: true, message: "Transaction already credited", tx };
      }

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
      const expectedPesewas = Math.round(tx.amount * 100);

      if (paystackStatus === "success") {
        if (typeof paidPesewas === "number" && paidPesewas >= expectedPesewas) {
          await dbRepository.markPaystackRefProcessed(cleanRef);
          tx.status = "completed";
          await dbRepository.createTransaction(tx);
          await dbRepository.updateProfileBalance(tx.userToken, tx.amount);
          await dbRepository.writeLedger([
            {
              userId: tx.userToken,
              accountType: "available",
              entryType: "deposit",
              amount: String(tx.amount),
              referenceType: "paystack",
              referenceId: cleanRef,
            },
          ]).catch(() => []);

          // Notify user of successful deposit
          notificationService.sendNotification({
            userToken: tx.userToken,
            type: "account_alert",
            title: "💳 Mobile Money Deposit Confirmed",
            message: `GH₵ ${tx.amount}.00 (${tx.amount} Marbles) has been credited to your wallet.`,
            link: "/wallet",
            actionLabel: "View Balance",
          }).catch(() => {});

          return { success: true, message: `Successfully added GH₵ ${tx.amount}.00 (${tx.amount} Marbles) to your wallet!`, tx };
        } else {
          throw new Error(`Payment amount mismatch: Expected GH₵ ${tx.amount}, received GH₵ ${(paidPesewas || 0) / 100}`);
        }
      } else if (paystackStatus === "failed") {
        tx.status = "failed";
        await dbRepository.createTransaction(tx);
        throw new Error(`Paystack Payment Failed: ${json.data?.gateway_response || "Payment was declined by provider"}`);
      } else {
        // Payment is still awaiting user authorization on phone/card
        return {
          success: false,
          pending: true,
          status: paystackStatus || "pending",
          message: `Payment is currently ${paystackStatus || "pending"}. Please complete the payment on Paystack.`,
          tx,
        };
      }
    });
  },

  async requestWithdrawal(userToken: string, amountGhs: number, momoNumber?: string, momoProvider?: string) {
    if (amountGhs <= 0) throw new Error("Withdrawal amount must be greater than zero GHS");
    const profile = await dbRepository.getProfile(userToken);
    if (!profile) throw new Error("User profile not found. Please log in first.");
    if (profile.status === "banned") throw new Error("Account is banned. Please contact support.");

    // Retrieve user record to get verified phone number
    let user = await dbRepository.getUserById(userToken);
    if (!user && profile.phoneNumber) {
      user = await dbRepository.getUserByPhone(profile.phoneNumber);
    }

    // Determine verified phone number strictly from account
    const verifiedPhone = (user?.phoneVerifiedAt ? user.phoneNumber : null) || user?.phoneNumber || profile.phoneNumber;
    if (!verifiedPhone) {
      throw new Error("Withdrawals require a verified phone number on your account. Please complete phone verification in your profile before requesting a cashout.");
    }

    // Strictly withdraw to the account's verified phone number only
    const targetMomoNumber = verifiedPhone;
    const targetProvider = momoProvider || user?.momoNetwork || "MTN";

    const settings = await dbRepository.getAdminSettings();
    const minWd = settings.minWithdrawalGhs ?? 10;
    const maxWd = settings.maxWithdrawalGhs ?? 2000;
    const maxDailyWd = settings.maxDailyWithdrawalGhs ?? 5000;

    if (amountGhs < minWd) {
      throw new Error(`Withdrawal amount (GH₵ ${amountGhs}) is below the minimum withdrawal limit of GH₵ ${minWd}`);
    }
    if (amountGhs > maxWd) {
      throw new Error(`Withdrawal amount (GH₵ ${amountGhs}) exceeds the maximum single withdrawal limit of GH₵ ${maxWd.toLocaleString()}`);
    }

    // Daily withdrawal aggregate limit check
    const userTxs = await dbRepository.getUserTransactions(userToken, 200);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent24hWithdrawals = userTxs
      .filter((t) => t.type === "withdrawal" && t.status !== "failed" && t.createdAt >= oneDayAgo)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (recent24hWithdrawals + amountGhs > maxDailyWd) {
      const remainingLimit = Math.max(0, maxDailyWd - recent24hWithdrawals);
      throw new Error(
        `24-hour withdrawal limit of GH₵ ${maxDailyWd.toLocaleString()} reached. You have requested GH₵ ${recent24hWithdrawals.toLocaleString()} in the last 24h (Remaining limit: GH₵ ${remainingLimit.toLocaleString()})`
      );
    }

    if (profile.points < amountGhs) throw new Error(`Insufficient wallet balance. You have GH₵ ${profile.points}`);

    const ghsValue = Number(amountGhs.toFixed(2));

    // Deduct wallet balance
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
      metaJson: JSON.stringify({ momoNumber: targetMomoNumber, momoProvider: targetProvider, ghsValue }),
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

    return { reference: ref, pointsDeducted: ghsValue, ghsValue, targetMomoNumber, targetProvider };
  },

  // --- Paystack Transfers & Payout Methods ---
  getPaystackBankCode(provider?: string): string {
    const p = String(provider || "").toUpperCase().trim();
    if (p.includes("VOD") || p.includes("TELECEL")) return "VOD";
    if (p.includes("TIGO") || p.includes("AIRTEL") || p.includes("ATL")) return "ATL";
    return "MTN";
  },

  async getPaystackBalance() {
    const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
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
    const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured on the server.");

    const cleanBankCode = this.getPaystackBankCode(bankCode);
    const cleanAccount = accountNumber.trim().replace(/^\+233/, "0").replace(/^233/, "0");

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
    };
  },

  async initiatePaystackTransfer(recipientCode: string, amountGhs: number, reference: string, reason: string) {
    const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
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
    const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
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

    const profile = await dbRepository.getProfile(tx.userToken);
    let meta: Record<string, any> = {};
    try {
      meta = tx.metaJson ? JSON.parse(tx.metaJson) : {};
    } catch {
      meta = {};
    }

    const momoNumber = meta.momoNumber || profile?.phoneNumber;
    const momoProvider = meta.momoProvider || "MTN";
    const amountGhs = Math.abs(tx.amount);

    if (!momoNumber) {
      throw new Error("No destination Mobile Money phone number found for this withdrawal request.");
    }

    // 1. Create recipient code if not already saved
    let recipientCode = meta.recipientCode;
    if (!recipientCode) {
      const recipientName = profile?.fullName || profile?.username || "DAMII Player";
      const recipientRes = await this.createTransferRecipient(recipientName, momoNumber, momoProvider);
      recipientCode = recipientRes.recipientCode;
      meta.recipientCode = recipientCode;
    }

    // 2. Initiate Paystack Transfer
    const transferRef = tx.reference.startsWith("TRANSFER-") ? tx.reference : `TRANSFER-${tx.reference}`;
    const transferReason = `DAMII Cashout: @${profile?.username || "player"} (${momoNumber})`;

    const transferRes = await this.initiatePaystackTransfer(recipientCode, amountGhs, transferRef, transferReason);

    // 3. Update Transaction Metadata & Status
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
          momoProvider,
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
      message: `Your withdrawal of GH₵ ${amountGhs.toFixed(2)} to ${momoProvider} (${momoNumber}) has been submitted to Paystack. Funds will arrive in your wallet shortly.`,
      link: "/wallet",
      actionLabel: "View Wallet",
    }).catch(() => {});

    return {
      success: true,
      transaction: tx,
      transfer: transferRes,
      message: `Transfer of GH₵ ${amountGhs.toFixed(2)} dispatched to ${momoProvider} (${momoNumber}) via Paystack. Status: ${transferRes.status.toUpperCase()}`,
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
      tx.metaJson = JSON.stringify(meta);
      await dbRepository.createTransaction(tx);

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
  async lockWagerEscrow(roomCode: string, wagerAmount: number, player1Token: string, player2Token: string): Promise<WagerEscrow> {
    const p1 = await dbRepository.getProfile(player1Token);
    const p2 = await dbRepository.getProfile(player2Token);

    const p1Balance = Math.max(p1?.marbles ?? 0, p1?.points ?? 0);
    const p2Balance = Math.max(p2?.marbles ?? 0, p2?.points ?? 0);

    if (!p1 || p1Balance < wagerAmount) throw new Error(`Host has insufficient Marbles for GH₵ ${wagerAmount} Wager`);
    if (!p2 || p2Balance < wagerAmount) throw new Error(`Guest has insufficient Marbles for GH₵ ${wagerAmount} Wager`);

    // Deduct wager balance from both players (prioritizing marbles or points)
    if ((p1.marbles ?? 0) >= wagerAmount) {
      await dbRepository.updateProfileMarblesBalance(player1Token, -wagerAmount);
    } else {
      await dbRepository.updateProfileBalance(player1Token, -wagerAmount);
    }

    if ((p2.marbles ?? 0) >= wagerAmount) {
      await dbRepository.updateProfileMarblesBalance(player2Token, -wagerAmount);
    } else {
      await dbRepository.updateProfileBalance(player2Token, -wagerAmount);
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
  },

  async disburseWagerEscrow(escrowId: string, winnerToken: string | null): Promise<WagerEscrow> {
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
        id: `tx-wager-win-${Date.now()}`,
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
          id: `tx-fee-${Date.now()}`,
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
      // Refund both players full wager amount on draw
      escrow.status = "refunded";
      escrow.disbursedAt = now;
      await dbRepository.saveEscrow(escrow);

      const refundPerPlayer = Math.floor(escrow.amountPoints / 2);
      await dbRepository.updateProfileBalance(escrow.player1Token, refundPerPlayer);
      if (escrow.player2Token) {
        await dbRepository.updateProfileBalance(escrow.player2Token, refundPerPlayer);
      }

      await dbRepository.createTransaction({
        id: `tx-wager-ref-p1-${Date.now()}`,
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
          id: `tx-wager-ref-p2-${Date.now()}`,
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
  },
};
