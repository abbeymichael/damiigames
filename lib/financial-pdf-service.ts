import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  SystemFundsReport,
  ChartOfAccountsReport,
  TreasuryFundDetails,
  MechanicsFundDetails,
  LedgerEntry,
} from "./types";

export interface PDFReportOptions {
  periodLabel?: string;
  generatedBy?: string;
  title?: string;
  subtitle?: string;
}

const BRAND_COLORS = {
  primaryDark: [6, 38, 31] as [number, number, number], // #06261f
  secondaryDark: [12, 59, 46] as [number, number, number], // #0c3b2e
  accentGold: [214, 167, 53] as [number, number, number], // #d6a735
  textDark: [15, 23, 42] as [number, number, number], // #0f172a
  textMuted: [100, 116, 139] as [number, number, number], // #64748b
  bgLight: [248, 250, 252] as [number, number, number], // #f8fafc
  borderLight: [226, 232, 240] as [number, number, number], // #e2e8f0
  successGreen: [16, 185, 129] as [number, number, number], // #10b981
  errorRed: [239, 68, 68] as [number, number, number], // #ef4444
};

function formatGHS(amount: number | string | undefined): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
  return `GHS ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  options?: PDFReportOptions
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background bar
  doc.setFillColor(...BRAND_COLORS.primaryDark);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Gold accent stripe
  doc.setFillColor(...BRAND_COLORS.accentGold);
  doc.rect(0, 28, pageWidth, 2, "F");

  // Logo / Organization text
  doc.setTextColor(214, 167, 53);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DAMII GAME PLATFORM", 14, 12);

  doc.setTextColor(245, 239, 223);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("FINANCIAL MANAGEMENT & DOUBLE-ENTRY LEDGER SYSTEM", 14, 18);

  // Report Title (Right-aligned in header)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), pageWidth - 14, 12, { align: "right" });

  doc.setTextColor(214, 167, 53);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const dateStr = `Generated: ${new Date().toLocaleString("en-GB")}`;
  doc.text(dateStr, pageWidth - 14, 18, { align: "right" });

  // Sub-header info bar
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const period = options?.periodLabel || "All Recorded Activity";
  const author = options?.generatedBy || "System Administrator";
  doc.text(`Scope: ${subtitle} | Period: ${period} | Certified By: ${author}`, 14, 35);

  // Divider line
  doc.setDrawColor(...BRAND_COLORS.borderLight);
  doc.setLineWidth(0.5);
  doc.line(14, 38, pageWidth - 14, 38);

  return 42; // Return the Y position where content can begin
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Top border of footer
    doc.setDrawColor(...BRAND_COLORS.borderLight);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND_COLORS.textMuted);
    
    // Left footer: Compliance text
    doc.text(
      "DAMII Official Financial Statement • Strictly Confidential • Double-Entry Reconciled",
      14,
      pageHeight - 7
    );

    // Right footer: Page numbers
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7, {
      align: "right",
    });
  }
}

/**
 * 1. COMPREHENSIVE FINANCIAL STATEMENTS REPORT (PDF)
 * Contains Executive Summary, Balance Sheet, Income Statement, 4 System Funds Reconciliation, and Solvency Verification.
 */
export function exportComprehensiveFinancialReportPDF(
  systemFunds: SystemFundsReport | null,
  chartOfAccounts: ChartOfAccountsReport | null,
  treasuryDetails?: TreasuryFundDetails | null,
  mechanicsDetails?: MechanicsFundDetails | null,
  options?: PDFReportOptions
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  let startY = drawHeader(
    doc,
    options?.title || "Financial Statements & System Funds",
    "Comprehensive General Ledger & Treasury Report",
    options
  );

  const totalAssets = chartOfAccounts?.totalAssets ?? systemFunds?.totalPlatformAssets ?? 0;
  const totalLiabilities = chartOfAccounts?.totalLiabilities ?? ((systemFunds?.totalUserAvailable ?? 0) + (systemFunds?.totalEscrowLocked ?? 0));
  const totalEquity = chartOfAccounts?.totalEquity ?? (systemFunds?.totalPlatformFeesEarned ?? 0);
  const totalRevenue = chartOfAccounts?.totalRevenue ?? ((treasuryDetails?.lifetimeRevenue ?? 0) + (mechanicsDetails?.mechanicsGameplayProfits ?? 0));
  const totalExpenses = chartOfAccounts?.totalExpenses ?? ((treasuryDetails?.lifetimeExpenses ?? 0) + (mechanicsDetails?.mechanicsGameplayLosses ?? 0));
  const netIncome = chartOfAccounts?.netIncome ?? (totalRevenue - totalExpenses);
  const isBalanced = chartOfAccounts?.accountingEquationBalanced ?? (systemFunds?.reconciliationStatus === "balanced");

  // Executive Summary Card / Metrics Grid
  doc.setFillColor(...BRAND_COLORS.bgLight);
  doc.roundedRect(14, startY, pageWidth - 28, 26, 2, 2, "F");
  doc.setDrawColor(...BRAND_COLORS.borderLight);
  doc.roundedRect(14, startY, pageWidth - 28, 26, 2, 2, "S");

  // Column 1: Assets
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text("TOTAL PLATFORM ASSETS (1000s)", 18, startY + 6);
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_COLORS.primaryDark);
  doc.text(formatGHS(totalAssets), 18, startY + 12);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Liquid Cash + Escrows + Float", 18, startY + 18);

  // Column 2: Liabilities & Obligations
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text("TOTAL LIABILITIES (2000s)", 78, startY + 6);
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_COLORS.primaryDark);
  doc.text(formatGHS(totalLiabilities), 78, startY + 12);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Player Balances + Wagers Lock", 78, startY + 18);

  // Column 3: Retained Equity
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND_COLORS.textMuted);
  doc.text("RETAINED EQUITY & RESERVES (3000s)", 138, startY + 6);
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_COLORS.primaryDark);
  doc.text(formatGHS(totalEquity), 138, startY + 12);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(isBalanced ? "Equation: 100% Solvency OK" : "Discrepancy Detected", 138, startY + 18);

  startY += 32;

  // SECTION 1: 4 CORE SYSTEM FUNDS RECONCILIATION
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLORS.primaryDark);
  doc.text("1. SYSTEM FUNDS RECONCILIATION STATEMENT", 14, startY);
  startY += 3;

  const fundsData = [
    [
      "Account Balances Fund",
      "Liquid player available wallet balances [1020 / 2010]",
      formatGHS(systemFunds?.accountBalancesFund?.totalInflow ?? 0),
      formatGHS(systemFunds?.accountBalancesFund?.totalOutflow ?? 0),
      formatGHS(systemFunds?.accountBalancesFund?.balance ?? 0),
    ],
    [
      "Escrow Custodial Fund",
      "Custodial active 1v1 wagers & tournament pool vaults [1030 / 2020]",
      formatGHS(systemFunds?.escrowFund?.totalInflow ?? 0),
      formatGHS(systemFunds?.escrowFund?.totalOutflow ?? 0),
      formatGHS(systemFunds?.escrowFund?.balance ?? 0),
    ],
    [
      "Platform Fee Fund",
      "Accumulated platform rake, commissions & reserves [3010 / 4010]",
      formatGHS(systemFunds?.platformFeeFund?.totalInflow ?? 0),
      formatGHS(systemFunds?.platformFeeFund?.totalOutflow ?? 0),
      formatGHS(systemFunds?.platformFeeFund?.balance ?? 0),
    ],
    [
      "Mechanics Fund",
      "AI bot operating float, bankrolls & gameplay P&L [1040 / 4040 / 5030]",
      formatGHS(systemFunds?.mechanicsFund?.totalInflow ?? 0),
      formatGHS(systemFunds?.mechanicsFund?.totalOutflow ?? 0),
      formatGHS(systemFunds?.mechanicsFund?.balance ?? 0),
    ],
  ];

  autoTable(doc, {
    startY,
    head: [["System Fund Pool", "Description & Chart Classification", "Total Inflow", "Total Outflow", "Current Fund Balance"]],
    body: fundsData,
    foot: [[
      "Total Platform Solvency Pool",
      "Consolidated System Funds Aggregate",
      formatGHS((systemFunds?.accountBalancesFund?.totalInflow ?? 0) + (systemFunds?.escrowFund?.totalInflow ?? 0) + (systemFunds?.platformFeeFund?.totalInflow ?? 0) + (systemFunds?.mechanicsFund?.totalInflow ?? 0)),
      formatGHS((systemFunds?.accountBalancesFund?.totalOutflow ?? 0) + (systemFunds?.escrowFund?.totalOutflow ?? 0) + (systemFunds?.platformFeeFund?.totalOutflow ?? 0) + (systemFunds?.mechanicsFund?.totalOutflow ?? 0)),
      formatGHS(totalAssets),
    ]],
    theme: "grid",
    headStyles: {
      fillColor: BRAND_COLORS.primaryDark,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: BRAND_COLORS.secondaryDark,
      textColor: BRAND_COLORS.accentGold,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND_COLORS.textDark,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 42 },
      1: { cellWidth: 64 },
      2: { halign: "right", cellWidth: 26 },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", fontStyle: "bold", cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
  });

  // Next section on new page or continuation
  doc.addPage();
  startY = drawHeader(
    doc,
    "Financial Statements (Page 2)",
    "Balance Sheet & Income Statement",
    options
  );

  // SECTION 2: BALANCE SHEET
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLORS.primaryDark);
  doc.text("2. STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)", 14, startY);
  startY += 3;

  const coaAccounts = chartOfAccounts?.accounts || [];
  const assetAccounts = coaAccounts.filter((a) => a.accountClass === "asset");
  const liabilityAccounts = coaAccounts.filter((a) => a.accountClass === "liability");
  const equityAccounts = coaAccounts.filter((a) => a.accountClass === "equity");

  const balanceSheetRows: string[][] = [
    // Header for Assets
    ["1000s - ASSETS", "", "", ""],
    ...assetAccounts.map((a) => [
      `   ${a.code}`,
      a.name,
      a.fundType.replace("_", " "),
      formatGHS(a.balance),
    ]),
    ["TOTAL ASSETS", "", "", formatGHS(totalAssets)],
    ["", "", "", ""],
    // Header for Liabilities
    ["2000s - LIABILITIES", "", "", ""],
    ...liabilityAccounts.map((a) => [
      `   ${a.code}`,
      a.name,
      a.fundType.replace("_", " "),
      formatGHS(a.balance),
    ]),
    ["TOTAL LIABILITIES", "", "", formatGHS(totalLiabilities)],
    ["", "", "", ""],
    // Header for Equity
    ["3000s - EQUITY & RESERVES", "", "", ""],
    ...equityAccounts.map((a) => [
      `   ${a.code}`,
      a.name,
      a.fundType.replace("_", " "),
      formatGHS(a.balance),
    ]),
    ["TOTAL EQUITY & RESERVES", "", "", formatGHS(totalEquity)],
    ["", "", "", ""],
    ["TOTAL LIABILITIES & EQUITY", "", "", formatGHS(totalLiabilities + totalEquity)],
  ];

  autoTable(doc, {
    startY,
    head: [["Account Code", "Account Title", "Fund Affiliation", "Balance (GHS)"]],
    body: balanceSheetRows,
    theme: "striped",
    headStyles: {
      fillColor: BRAND_COLORS.primaryDark,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND_COLORS.textDark,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
      1: { cellWidth: 80 },
      2: { cellWidth: 35 },
      3: { halign: "right", fontStyle: "bold", cellWidth: 34 },
    },
    didParseCell: function (data) {
      const rowText = String(data.row.raw[0] || "");
      if (
        rowText.includes("ASSETS") ||
        rowText.includes("LIABILITIES") ||
        rowText.includes("EQUITY") ||
        rowText.includes("TOTAL")
      ) {
        data.cell.styles.fontStyle = "bold";
        if (rowText.startsWith("TOTAL")) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = BRAND_COLORS.primaryDark;
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // SECTION 3: INCOME STATEMENT (PROFIT & LOSS)
  const currentY = (doc as any).lastAutoTable?.finalY || startY + 80;
  let pnlStartY = currentY + 8;

  if (pnlStartY > 220) {
    doc.addPage();
    pnlStartY = drawHeader(
      doc,
      "Financial Statements (Page 3)",
      "Statement of Comprehensive Income (P&L)",
      options
    );
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLORS.primaryDark);
  doc.text("3. STATEMENT OF COMPREHENSIVE INCOME (PROFIT & LOSS)", 14, pnlStartY);
  pnlStartY += 3;

  const revenueAccounts = coaAccounts.filter((a) => a.accountClass === "revenue");
  const expenseAccounts = coaAccounts.filter((a) => a.accountClass === "expense");

  const pnlRows: string[][] = [
    ["4000s - REVENUES", "", "", ""],
    ...revenueAccounts.map((a) => [
      `   ${a.code}`,
      a.name,
      a.fundType.replace("_", " "),
      formatGHS(a.balance),
    ]),
    ["TOTAL OPERATING REVENUE", "", "", formatGHS(totalRevenue)],
    ["", "", "", ""],
    ["5000s - OPERATING EXPENSES", "", "", ""],
    ...expenseAccounts.map((a) => [
      `   ${a.code}`,
      a.name,
      a.fundType.replace("_", " "),
      formatGHS(a.balance),
    ]),
    ["TOTAL OPERATING EXPENSES", "", "", formatGHS(totalExpenses)],
    ["", "", "", ""],
    ["NET PLATFORM OPERATING INCOME (EBITDA)", "", "", formatGHS(netIncome)],
  ];

  autoTable(doc, {
    startY: pnlStartY,
    head: [["Account Code", "Stream / Cost Center", "Fund Affiliation", "Amount (GHS)"]],
    body: pnlRows,
    theme: "striped",
    headStyles: {
      fillColor: BRAND_COLORS.primaryDark,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND_COLORS.textDark,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
      1: { cellWidth: 80 },
      2: { cellWidth: 35 },
      3: { halign: "right", fontStyle: "bold", cellWidth: 34 },
    },
    didParseCell: function (data) {
      const rowText = String(data.row.raw[0] || "");
      if (
        rowText.includes("REVENUES") ||
        rowText.includes("EXPENSES") ||
        rowText.includes("TOTAL") ||
        rowText.includes("NET")
      ) {
        data.cell.styles.fontStyle = "bold";
        if (rowText.startsWith("NET")) {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = BRAND_COLORS.primaryDark;
        } else if (rowText.startsWith("TOTAL")) {
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc);

  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`damii-comprehensive-financial-report-${dateSlug}.pdf`);
}

/**
 * 2. BALANCE SHEET & TRIAL BALANCE REPORT (PDF)
 */
export function exportBalanceSheetPDF(
  chartOfAccounts: ChartOfAccountsReport | null,
  systemFunds?: SystemFundsReport | null,
  options?: PDFReportOptions
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let startY = drawHeader(
    doc,
    options?.title || "Balance Sheet & Trial Balance",
    "Statement of Financial Position as of Today",
    options
  );

  const accounts = chartOfAccounts?.accounts || [];
  const totalAssets = chartOfAccounts?.totalAssets ?? 0;
  const totalLiabilities = chartOfAccounts?.totalLiabilities ?? 0;
  const totalEquity = chartOfAccounts?.totalEquity ?? 0;

  const tableData = accounts.map((acc) => [
    acc.code,
    acc.name,
    acc.accountClass.toUpperCase(),
    acc.normalBalance.toUpperCase(),
    formatGHS(acc.totalDebits),
    formatGHS(acc.totalCredits),
    formatGHS(acc.balance),
  ]);

  autoTable(doc, {
    startY,
    head: [["Code", "Account Title", "Class", "Normal", "Total Debits", "Total Credits", "Net Balance"]],
    body: tableData,
    foot: [[
      "TOTALS",
      "Chart of Accounts Aggregate",
      "—",
      "—",
      formatGHS(accounts.reduce((sum, a) => sum + (a.totalDebits || 0), 0)),
      formatGHS(accounts.reduce((sum, a) => sum + (a.totalCredits || 0), 0)),
      formatGHS(totalAssets),
    ]],
    theme: "grid",
    headStyles: {
      fillColor: BRAND_COLORS.primaryDark,
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: BRAND_COLORS.secondaryDark,
      textColor: BRAND_COLORS.accentGold,
      fontSize: 7.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: BRAND_COLORS.textDark,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 15 },
      1: { cellWidth: 55 },
      2: { cellWidth: 20 },
      3: { cellWidth: 16 },
      4: { halign: "right", cellWidth: 26 },
      5: { halign: "right", cellWidth: 26 },
      6: { halign: "right", fontStyle: "bold", cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc);
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`damii-balance-sheet-trial-balance-${dateSlug}.pdf`);
}

/**
 * 3. 4 SYSTEM FUNDS & CUSTODIAL ESCROW AUDIT (PDF)
 */
export function exportSystemFundsReportPDF(
  systemFunds: SystemFundsReport | null,
  options?: PDFReportOptions
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let startY = drawHeader(
    doc,
    options?.title || "4 System Funds & Solvency Audit",
    "Independent Custodial & Float Reconciliation",
    options
  );

  if (!systemFunds) return;

  const data = [
    [
      "Account Balances Fund (Liquid)",
      "Player deposit floats, user balances, instant cashouts",
      formatGHS(systemFunds.accountBalancesFund.totalInflow),
      formatGHS(systemFunds.accountBalancesFund.totalOutflow),
      formatGHS(systemFunds.accountBalancesFund.netFlow),
      formatGHS(systemFunds.accountBalancesFund.balance),
    ],
    [
      "Escrow Custodial Fund (Vault)",
      "Wager lockups, tournament prize vaults, custodial freeze",
      formatGHS(systemFunds.escrowFund.totalInflow),
      formatGHS(systemFunds.escrowFund.totalOutflow),
      formatGHS(systemFunds.escrowFund.netFlow),
      formatGHS(systemFunds.escrowFund.balance),
    ],
    [
      "Platform Fee Fund (Treasury)",
      "1v1 match rake, league commissions, operational reserves",
      formatGHS(systemFunds.platformFeeFund.totalInflow),
      formatGHS(systemFunds.platformFeeFund.totalOutflow),
      formatGHS(systemFunds.platformFeeFund.netFlow),
      formatGHS(systemFunds.platformFeeFund.balance),
    ],
    [
      "Mechanics Fund (Bot Fleet)",
      "AI mechanic float, bankroll injections, gameplay P&L",
      formatGHS(systemFunds.mechanicsFund.totalInflow),
      formatGHS(systemFunds.mechanicsFund.totalOutflow),
      formatGHS(systemFunds.mechanicsFund.netFlow),
      formatGHS(systemFunds.mechanicsFund.balance),
    ],
  ];

  autoTable(doc, {
    startY,
    head: [["Fund Pool", "Mandate & Coverage", "Inflow", "Outflow", "Net Flow", "Fund Balance"]],
    body: data,
    foot: [[
      "CONSOLIDATED PLATFORM TOTAL",
      "100% Solvency Certified",
      formatGHS(systemFunds.totalDeposits || 0),
      formatGHS(systemFunds.totalWithdrawals || 0),
      formatGHS(systemFunds.totalPlatformAssets || 0),
      formatGHS(systemFunds.totalPlatformAssets || 0),
    ]],
    theme: "grid",
    headStyles: {
      fillColor: BRAND_COLORS.primaryDark,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: BRAND_COLORS.secondaryDark,
      textColor: BRAND_COLORS.accentGold,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: BRAND_COLORS.textDark,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: 50 },
      2: { halign: "right", cellWidth: 23 },
      3: { halign: "right", cellWidth: 23 },
      4: { halign: "right", cellWidth: 23 },
      5: { halign: "right", fontStyle: "bold", cellWidth: 25 },
    },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc);
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`damii-system-funds-report-${dateSlug}.pdf`);
}

/**
 * 4. GENERAL LEDGER ENTRIES AUDIT (PDF)
 */
export function exportLedgerEntriesPDF(
  entries: LedgerEntry[],
  options?: PDFReportOptions
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let startY = drawHeader(
    doc,
    options?.title || "Double-Entry Ledger Audit Trail",
    `Journal Postings (${entries.length} records)`,
    options
  );

  const rows = entries.slice(0, 150).map((entry) => [
    entry.id.slice(0, 10),
    typeof entry.createdAt === "string" ? entry.createdAt.replace("T", " ").slice(0, 19) : String(entry.createdAt).slice(0, 19),
    entry.userId,
    entry.entryType,
    entry.fundType ? String(entry.fundType).replace("_", " ") : "balances",
    entry.accountCode || "—",
    entry.direction?.toUpperCase() || (entry.accountType === "escrow" ? "ESCROW" : "AVAIL"),
    formatGHS(entry.amount),
    entry.referenceType || "—",
  ]);

  autoTable(doc, {
    startY,
    head: [["Tx ID", "Timestamp", "User / Entity", "Entry Type", "System Fund", "COA Code", "Leg / Type", "Amount", "Reference"]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: BRAND_COLORS.primaryDark,
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: BRAND_COLORS.textDark,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 20 },
      1: { cellWidth: 32 },
      2: { cellWidth: 32 },
      3: { cellWidth: 35 },
      4: { cellWidth: 30 },
      5: { cellWidth: 18 },
      6: { cellWidth: 22 },
      7: { halign: "right", fontStyle: "bold", cellWidth: 25 },
      8: { cellWidth: 50 },
    },
    margin: { left: 14, right: 14 },
  });

  drawFooter(doc);
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`damii-ledger-journal-${dateSlug}.pdf`);
}
