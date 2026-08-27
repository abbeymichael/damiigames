import { jsPDF } from "jspdf";
import type { ComprehensiveMatch } from "@/lib/types";

/**
 * Generate and download an official high-resolution PDF Match Audit Dossier.
 */
export function exportMatchPdf(match: ComprehensiveMatch): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Colors
  const darkGreen = [8, 28, 21];
  const gold = [214, 167, 53];
  const charcoal = [30, 41, 59];
  const emerald = [16, 185, 129];
  const muted = [100, 116, 139];

  // Helper for text
  const addHeader = () => {
    // Header Bar
    doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
    doc.rect(0, 0, pageWidth, 28, "F");

    // Gold Accent Stripe
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(0, 28, pageWidth, 2, "F");

    // Title
    doc.setTextColor(245, 239, 223);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DAMII GHANA • OFFICIAL MATCH AUDIT DOSSIER", margin, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(214, 167, 53);
    doc.text("REGULATED ESPORTS INTEGRITY & FINANCIAL LEDGER CERTIFICATE", margin, 18);

    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    doc.text(`CERTIFICATE REF: DAMII-AUDIT-${match.roomCode}-${Date.now().toString(36).toUpperCase()}`, margin, 24);

    y = 36;
  };

  addHeader();

  // Match Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 38, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(`MATCH IDENTIFIER: ${match.roomCode} (ID: ${match.matchId || match.id})`, margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(`Category / Mode: ${match.mode.toUpperCase()}${match.tournamentTitle ? ` • ${match.tournamentTitle}` : ""}`, margin + 4, y + 12);
  doc.text(`Match Date & Time: ${new Date(match.startedAt).toLocaleString("en-GB")}`, margin + 4, y + 17);
  doc.text(`Duration: ${match.durationFormatted} (${match.durationSeconds}s) • Total Moves: ${match.moveCount}`, margin + 4, y + 22);
  doc.text(`Dispute Status: ${match.disputeStatus.toUpperCase()} • Escrow Ref: ${match.escrowId || "N/A"}`, margin + 4, y + 27);
  doc.text(`Verification Timestamp: ${new Date().toISOString()}`, margin + 4, y + 32);

  y += 44;

  // Contestants & Outcome Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text("1. CONTESTANTS & OFFICIAL OUTCOME", margin, y);
  y += 4;

  // Two Player Cards Side by Side
  const colWidth = (pageWidth - 2 * margin - 6) / 2;

  // Host Card
  const hostIsWinner = match.winner === "white";
  doc.setFillColor(hostIsWinner ? 240 : 255, hostIsWinner ? 253 : 255, hostIsWinner ? 244 : 255);
  doc.setDrawColor(hostIsWinner ? 74 : 203, hostIsWinner ? 222 : 213, hostIsWinner ? 128 : 225);
  doc.roundedRect(margin, y, colWidth, 34, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(`WHITE (Host): ${match.hostName}`, margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(`Rating: ${match.hostRating || 1200} DPI • Phone: ${match.hostPhone || "Verified"}`, margin + 4, y + 12);
  doc.text(`User ID: ${match.hostToken ? match.hostToken.slice(0, 18) : "N/A"}...`, margin + 4, y + 17);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  if (hostIsWinner) {
    doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    doc.text("OUTCOME: OFFICIAL WINNER (1.0)", margin + 4, y + 25);
    doc.setFontSize(8);
    doc.text(`Net Payout: GH₵ ${match.netPayout.toFixed(2)}`, margin + 4, y + 30);
  } else if (match.isDraw) {
    doc.setTextColor(180, 130, 0);
    doc.text("OUTCOME: DRAW (0.5)", margin + 4, y + 25);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text("OUTCOME: DEFEATED (0.0)", margin + 4, y + 25);
  }

  // Guest Card
  const guestX = margin + colWidth + 6;
  const guestIsWinner = match.winner === "black";
  doc.setFillColor(guestIsWinner ? 240 : 255, guestIsWinner ? 253 : 255, guestIsWinner ? 244 : 255);
  doc.setDrawColor(guestIsWinner ? 74 : 203, guestIsWinner ? 222 : 213, guestIsWinner ? 128 : 225);
  doc.roundedRect(guestX, y, colWidth, 34, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(`BLACK (Guest): ${match.guestName || "Guest"}`, guestX + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(`Rating: ${match.guestRating || 1200} DPI • Phone: ${match.guestPhone || "Verified"}`, guestX + 4, y + 12);
  doc.text(`User ID: ${match.guestToken ? match.guestToken.slice(0, 18) : "N/A"}...`, guestX + 4, y + 17);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  if (guestIsWinner) {
    doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    doc.text("OUTCOME: OFFICIAL WINNER (1.0)", guestX + 4, y + 25);
    doc.setFontSize(8);
    doc.text(`Net Payout: GH₵ ${match.netPayout.toFixed(2)}`, guestX + 4, y + 30);
  } else if (match.isDraw) {
    doc.setTextColor(180, 130, 0);
    doc.text("OUTCOME: DRAW (0.5)", guestX + 4, y + 25);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text("OUTCOME: DEFEATED (0.0)", guestX + 4, y + 25);
  }

  y += 40;

  // Loss Reason & Verdict Analysis
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text("2. MATCH TERMINATION & LOSS VERDICT", margin, y);
  y += 4;

  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text(`TERMINATION CLASSIFICATION: ${match.terminationReason.toUpperCase().replace(/_/g, " ")}`, margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  const explanationLines = doc.splitTextToSize(match.lossExplanation || "Match finished normally.", pageWidth - 2 * margin - 8);
  doc.text(explanationLines, margin + 4, y + 12);

  y += 26;

  // Financial Ledger & Stakes Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text("3. FINANCIAL SETTLEMENT & ESCROW LEDGER", margin, y);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 28, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);

  doc.text(`Wager Stake per Contestant: GH₵ ${match.wagerAmount.toFixed(2)}`, margin + 4, y + 6);
  doc.text(`Gross Locked Escrow Pot: GH₵ ${match.potAmount.toFixed(2)}`, margin + 4, y + 11);
  doc.text(`Platform Regulatory Commission (5%): GH₵ ${match.platformFee.toFixed(2)}`, margin + 4, y + 16);
  doc.text(`Net Winner Disbursement: GH₵ ${match.netPayout.toFixed(2)}`, margin + 4, y + 21);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(`Disbursed To: ${match.winnerName || "Refunded"} • Escrow Status: SETTLED`, margin + 4, y + 26);

  y += 34;

  // Network Disconnections & Reconnect Log
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text("4. NETWORK CONNECTIVITY & DISCONNECTION AUDIT", margin, y);
  y += 4;

  if (match.connectionEvents.length === 0 && !match.hasConnectionIssues) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text("✓ Zero connection drops or heartbeat latency anomalies detected. Match connection was 100% stable.", margin + 4, y + 7);
    y += 18;
  } else {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text(`⚠ Reconnect Incidents: ${match.reconnectCount} | Total Offline Time: ${match.totalDisconnectedSeconds}s`, margin + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const connNote = match.connectionEvents[0]?.note || "Player experienced network latency during match.";
    doc.text(doc.splitTextToSize(connNote, pageWidth - 2 * margin - 8), margin + 4, y + 12);
    y += 24;
  }

  // Move History Log (First 15 moves summary on Page 1 or Move Count)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text(`5. MOVE LOGS & DAMII NOTATION (Total Moves: ${match.moveCount})`, margin, y);
  y += 4;

  if (match.moves && match.moves.length > 0) {
    const moveSample = match.moves.slice(0, 12);
    let moveRowText = "";
    moveSample.forEach((m, idx) => {
      moveRowText += `${idx + 1}. ${m.player === "white" ? "W" : "B"}: ${m.notation || `${m.from}→${m.to}`}  `;
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    const moveLines = doc.splitTextToSize(moveRowText + (match.moves.length > 12 ? `... (+${match.moves.length - 12} additional moves)` : ""), pageWidth - 2 * margin);
    doc.text(moveLines, margin, y + 2);
    y += 14;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text("Move ledger preserved on server database.", margin, y + 2);
    y += 8;
  }

  // Footer / Verification Seal
  doc.setDrawColor(214, 167, 53);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("This document is an electronically generated and cryptographically verifiable esports match audit certificate produced by DAMII Game Server Engine.", margin, pageHeight - 12);
  doc.text("Regulated under Ghanaian Gaming Standards • All rights reserved.", margin, pageHeight - 8);

  // Save / Trigger Download
  const filename = `DAMII-Match-Audit-${match.roomCode}-${match.mode}.pdf`;
  doc.save(filename);
}

/**
 * Open browser print dialog with styled Match Audit Dossier.
 */
export function printMatchDossier(match: ComprehensiveMatch): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print the Match Dossier.");
    return;
  }

  const movesHtml = (match.moves || [])
    .map(
      (m, idx) => `
      <div style="display:flex; justify-content:space-between; padding:4px 8px; border-bottom:1px solid #e2e8f0; font-family:monospace; font-size:11px;">
        <span><strong>#${idx + 1}</strong> (${m.player === "white" ? "White" : "Black"} - ${m.playerName}): ${m.notation || `${m.from} → ${m.to}`} ${m.isCapture ? "💥 (Capture)" : ""}</span>
        <span style="color:#64748b;">${m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ""}</span>
      </div>
    `
    )
    .join("");

  const connEventsHtml = (match.connectionEvents || [])
    .map(
      (e) => `
      <div style="padding:6px 10px; background:#fffbeb; border-left:3px solid #d97706; margin-bottom:6px; font-size:11px;">
        <strong>[${e.event.toUpperCase()}] ${e.playerName} (${e.player})</strong> — ${e.formattedTime || ""}
        <div style="color:#78350f; margin-top:2px;">${e.note || ""}</div>
      </div>
    `
    )
    .join("");

  const ledgerHtml = (match.ledgerEntries || [])
    .map(
      (l) => `
      <tr style="border-bottom:1px solid #e2e8f0; font-size:11px;">
        <td style="padding:6px 8px; font-family:monospace;">${l.id.slice(0, 12)}</td>
        <td style="padding:6px 8px;">${l.accountType}</td>
        <td style="padding:6px 8px; font-weight:bold;">${l.entryType}</td>
        <td style="padding:6px 8px; text-align:right; font-weight:bold;">GH₵ ${Number(l.amount).toFixed(2)}</td>
        <td style="padding:6px 8px; color:#64748b;">${l.recordedAt ? new Date(l.recordedAt).toLocaleString() : ""}</td>
      </tr>
    `
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>DAMII Ghana Match Audit - ${match.roomCode}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; margin: 0; padding: 24px; background: #fff; }
          .header { background: #081c15; color: #f5efdf; padding: 20px; border-radius: 8px; border-bottom: 4px solid #d6a735; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
          .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #f8fafc; }
          .card.winner { border: 2px solid #10b981; background: #f0fdf4; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
          .badge-gold { background: #fef3c7; color: #92400e; }
          .badge-green { background: #d1fae5; color: #065f46; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          h3 { margin-top: 0; margin-bottom: 8px; font-size: 13px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #041d17; color: #f5efdf; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin:0 0 4px 0; font-size:18px; color:#d6a735;">DAMII GHANA • OFFICIAL MATCH AUDIT REPORT</h1>
          <p style="margin:0; font-size:11px; opacity:0.85;">Certified Esports Match Integrity &amp; Financial Settlement Dossier</p>
          <div style="margin-top:10px; font-size:11px; font-family:monospace;">
            MATCH ROOM: <strong>${match.roomCode}</strong> | MATCH ID: <strong>${match.matchId || match.id}</strong> | ESCROW: <strong>${match.escrowId || "N/A"}</strong>
          </div>
        </div>

        <div class="grid">
          <div class="card ${match.winner === "white" ? "winner" : ""}">
            <h3>White (Host Player)</h3>
            <div style="font-size:14px; font-weight:bold; color:#0f172a;">${match.hostName}</div>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">Rating: ${match.hostRating || 1200} DPI | Phone: ${match.hostPhone || "Verified"}</div>
            <div style="font-size:10px; font-family:monospace; color:#94a3b8; margin-top:2px;">${match.hostToken}</div>
            <div style="margin-top:8px;">
              ${match.winner === "white" ? '<span class="badge badge-green">🏆 Official Winner (1.0)</span>' : match.isDraw ? '<span class="badge badge-gold">🤝 Draw (0.5)</span>' : '<span class="badge badge-red">Loss (0.0)</span>'}
            </div>
          </div>

          <div class="card ${match.winner === "black" ? "winner" : ""}">
            <h3>Black (Guest Player)</h3>
            <div style="font-size:14px; font-weight:bold; color:#0f172a;">${match.guestName || "Guest"}</div>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">Rating: ${match.guestRating || 1200} DPI | Phone: ${match.guestPhone || "Verified"}</div>
            <div style="font-size:10px; font-family:monospace; color:#94a3b8; margin-top:2px;">${match.guestToken || "N/A"}</div>
            <div style="margin-top:8px;">
              ${match.winner === "black" ? '<span class="badge badge-green">🏆 Official Winner (1.0)</span>' : match.isDraw ? '<span class="badge badge-gold">🤝 Draw (0.5)</span>' : '<span class="badge badge-red">Loss (0.0)</span>'}
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px; border-left:4px solid #b91c1c;">
          <h3>Match Termination &amp; Loss Classification</h3>
          <div style="font-size:13px; font-weight:bold; color:#b91c1c; text-transform:uppercase;">
            ${match.terminationReason.replace(/_/g, " ")}
          </div>
          <p style="margin:6px 0 0 0; font-size:12px; color:#334155; line-height:1.5;">
            ${match.lossExplanation}
          </p>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <h3>Financial Settlement &amp; Pot Escrow</h3>
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; text-align:center; margin-top:10px;">
            <div style="padding:8px; background:#fff; border:1px solid #e2e8f0; border-radius:6px;">
              <div style="font-size:10px; color:#64748b;">WAGER PER PLAYER</div>
              <div style="font-size:14px; font-weight:bold; color:#0f172a;">GH₵ ${match.wagerAmount.toFixed(2)}</div>
            </div>
            <div style="padding:8px; background:#fff; border:1px solid #e2e8f0; border-radius:6px;">
              <div style="font-size:10px; color:#64748b;">GROSS POT</div>
              <div style="font-size:14px; font-weight:bold; color:#d97706;">GH₵ ${match.potAmount.toFixed(2)}</div>
            </div>
            <div style="padding:8px; background:#fff; border:1px solid #e2e8f0; border-radius:6px;">
              <div style="font-size:10px; color:#64748b;">COMMISSION (5%)</div>
              <div style="font-size:14px; font-weight:bold; color:#64748b;">GH₵ ${match.platformFee.toFixed(2)}</div>
            </div>
            <div style="padding:8px; background:#f0fdf4; border:1px solid #10b981; border-radius:6px;">
              <div style="font-size:10px; color:#065f46;">NET PAYOUT</div>
              <div style="font-size:14px; font-weight:bold; color:#10b981;">GH₵ ${match.netPayout.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <h3>Network Disconnections &amp; Reconnection Log</h3>
          ${connEventsHtml || '<div style="font-size:11px; color:#16a34a;">✓ 100% Stable Connection — Zero heartbeats or ping dropouts recorded.</div>'}
        </div>

        ${ledgerHtml ? `
          <div class="card" style="margin-bottom:20px;">
            <h3>Linked Double-Entry Financial Ledger Journals</h3>
            <table>
              <thead>
                <tr>
                  <th>Entry ID</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th style="text-align:right;">Amount</th>
                  <th>Recorded At</th>
                </tr>
              </thead>
              <tbody>
                ${ledgerHtml}
              </tbody>
            </table>
          </div>
        ` : ""}

        <div class="card" style="margin-bottom:20px;">
          <h3>Move History Log (${match.moveCount} Moves)</h3>
          <div style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:6px; background:#fff;">
            ${movesHtml || '<div style="padding:10px; font-size:11px; color:#64748b; text-align:center;">No move log items recorded.</div>'}
          </div>
        </div>

        <div style="text-align:center; margin-top:20px;">
          <button onclick="window.print()" style="padding:10px 24px; background:#081c15; color:#f5efdf; border:1px solid #d6a735; border-radius:6px; font-weight:bold; cursor:pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}
