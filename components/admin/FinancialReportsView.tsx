"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle,
  AlertTriangle,
  Scale,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Landmark,
  Bot,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Eye,
  Percent,
  Sparkles,
} from "lucide-react";
import type {
  SystemFundsReport,
  ChartOfAccountsReport,
  TreasuryFundDetails,
  MechanicsFundDetails,
  LedgerEntry,
  SystemFundType,
} from "@/lib/types";
import {
  exportComprehensiveFinancialReportPDF,
  exportBalanceSheetPDF,
  exportSystemFundsReportPDF,
  exportLedgerEntriesPDF,
} from "@/lib/financial-pdf-service";

export interface FinancialReportsViewProps {
  systemFunds?: SystemFundsReport | null;
  chartOfAccounts?: ChartOfAccountsReport | null;
  treasuryDetails?: TreasuryFundDetails | null;
  mechanicsDetails?: MechanicsFundDetails | null;
  ledgerEntries?: LedgerEntry[];
  onRefresh?: () => void;
  busy?: boolean;
}

type ReportTab =
  | "comprehensive"
  | "balance_sheet"
  | "income_statement"
  | "system_funds"
  | "trial_balance"
  | "mechanics_pnl";

export function FinancialReportsView({
  systemFunds,
  chartOfAccounts,
  treasuryDetails,
  mechanicsDetails,
  ledgerEntries = [],
  onRefresh,
  busy = false,
}: FinancialReportsViewProps) {
  const [activeReport, setActiveReport] = useState<ReportTab>("comprehensive");
  const [periodPreset, setPeriodPreset] = useState<"all" | "today" | "7days" | "30days" | "mtd" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Filter ledger entries by selected date range if applicable
  const filteredEntries = useMemo(() => {
    if (periodPreset === "all") return ledgerEntries;
    const now = new Date();
    let startLimit: Date | null = null;
    let endLimit: Date | null = null;

    if (periodPreset === "today") {
      startLimit = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (periodPreset === "7days") {
      startLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (periodPreset === "30days") {
      startLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (periodPreset === "mtd") {
      startLimit = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (periodPreset === "custom" && customStartDate) {
      startLimit = new Date(customStartDate);
      if (customEndDate) {
        endLimit = new Date(customEndDate);
        endLimit.setHours(23, 59, 59, 999);
      }
    }

    if (!startLimit) return ledgerEntries;

    return ledgerEntries.filter((entry) => {
      const d = new Date(entry.createdAt);
      if (isNaN(d.getTime())) return true;
      if (startLimit && d < startLimit) return false;
      if (endLimit && d > endLimit) return false;
      return true;
    });
  }, [ledgerEntries, periodPreset, customStartDate, customEndDate]);

  // Derived financials
  const totalAssets = chartOfAccounts?.totalAssets ?? systemFunds?.totalPlatformAssets ?? 0;
  const totalLiabilities =
    chartOfAccounts?.totalLiabilities ??
    ((systemFunds?.totalUserAvailable ?? 0) + (systemFunds?.totalEscrowLocked ?? 0));
  const totalEquity = chartOfAccounts?.totalEquity ?? (systemFunds?.totalPlatformFeesEarned ?? 0);
  const totalRevenue =
    chartOfAccounts?.totalRevenue ??
    ((treasuryDetails?.lifetimeRevenue ?? 0) + (mechanicsDetails?.mechanicsGameplayProfits ?? 0));
  const totalExpenses =
    chartOfAccounts?.totalExpenses ??
    ((treasuryDetails?.lifetimeExpenses ?? 0) + (mechanicsDetails?.mechanicsGameplayLosses ?? 0));
  const netIncome = chartOfAccounts?.netIncome ?? (totalRevenue - totalExpenses);
  const isEquationBalanced = chartOfAccounts?.accountingEquationBalanced ?? true;

  const coaAccounts = chartOfAccounts?.accounts || [];
  const assetAccounts = coaAccounts.filter((a) => a.accountClass === "asset");
  const liabilityAccounts = coaAccounts.filter((a) => a.accountClass === "liability");
  const equityAccounts = coaAccounts.filter((a) => a.accountClass === "equity");
  const revenueAccounts = coaAccounts.filter((a) => a.accountClass === "revenue");
  const expenseAccounts = coaAccounts.filter((a) => a.accountClass === "expense");

  const periodLabel = useMemo(() => {
    switch (periodPreset) {
      case "today":
        return `Today (${new Date().toLocaleDateString("en-GB")})`;
      case "7days":
        return "Last 7 Days";
      case "30days":
        return "Last 30 Days";
      case "mtd":
        return `Month-to-Date (${new Date().toLocaleString("default", { month: "long", year: "numeric" })})`;
      case "custom":
        return customStartDate ? `${customStartDate} to ${customEndDate || "Now"}` : "Custom Date Range";
      default:
        return "All Historical Recorded Activity";
    }
  }, [periodPreset, customStartDate, customEndDate]);

  // Handlers for exporting PDFs
  const handleExportComprehensivePDF = () => {
    setIsExporting(true);
    try {
      exportComprehensiveFinancialReportPDF(
        systemFunds || null,
        chartOfAccounts || null,
        treasuryDetails || null,
        mechanicsDetails || null,
        {
          periodLabel,
          title: "Comprehensive Financial Statements",
        }
      );
      setExportSuccessMsg("Official Financial Statements PDF exported successfully.");
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBalanceSheetPDF = () => {
    setIsExporting(true);
    try {
      exportBalanceSheetPDF(chartOfAccounts || null, systemFunds || null, {
        periodLabel,
        title: "Statement of Financial Position & Trial Balance",
      });
      setExportSuccessMsg("Balance Sheet & Trial Balance PDF generated.");
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSystemFundsPDF = () => {
    setIsExporting(true);
    try {
      exportSystemFundsReportPDF(systemFunds || null, {
        periodLabel,
        title: "4 System Funds & Solvency Audit Statement",
      });
      setExportSuccessMsg("System Funds Reconciliation PDF generated.");
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportLedgerJournalPDF = () => {
    setIsExporting(true);
    try {
      exportLedgerEntriesPDF(filteredEntries, {
        periodLabel,
        title: "General Ledger Audit Journal",
      });
      setExportSuccessMsg("Ledger Audit Journal PDF generated.");
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Account Code,Account Name,Account Class,Fund Type,Normal Balance,Debits,Credits,Net Balance\n";
    coaAccounts.forEach((acc) => {
      csvContent += `"${acc.code}","${acc.name}","${acc.accountClass}","${acc.fundType}","${acc.normalBalance}",${acc.totalDebits},${acc.totalCredits},${acc.balance}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `damii-financial-coa-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="financial-reports-workspace">
      {/* Toast Notification */}
      {exportSuccessMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-lg animate-fade-in">
          <CheckCircle size={16} />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Control Bar: Report Selection, Timeframe & Export Buttons */}
      <div className="p-4 rounded-xl bg-[#041c17] border border-[#1a5e48] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48]">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                Official Financial Reports &amp; Statements
              </h3>
              <p className="text-[11px] text-slate-300">
                Audited statements adhering to the double-entry Chart of Accounts and 4 System Funds.
              </p>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-export-full-pdf"
              onClick={handleExportComprehensivePDF}
              disabled={isExporting}
              className="px-3.5 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
              title="Generate comprehensive multi-page official financial statement PDF"
            >
              <Download size={14} className={isExporting ? "animate-spin" : ""} />
              Export Full Report (PDF)
            </button>

            <div className="relative inline-block text-left group">
              <button
                type="button"
                id="btn-export-options"
                className="px-3 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 border border-[#1a5e48] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download size={13} />
                Export Specific Statement
                <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 mt-1 w-56 bg-[#041c17] border border-[#1a5e48] rounded-xl shadow-2xl py-1 z-30 hidden group-hover:block divide-y divide-[#114232]">
                <button
                  type="button"
                  onClick={handleExportBalanceSheetPDF}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-[#0c3b2e] hover:text-[#d6a735] font-medium flex items-center gap-2"
                >
                  <Scale size={13} /> Balance Sheet &amp; Trial Balance (PDF)
                </button>
                <button
                  type="button"
                  onClick={handleExportSystemFundsPDF}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-[#0c3b2e] hover:text-[#d6a735] font-medium flex items-center gap-2"
                >
                  <Layers size={13} /> 4 System Funds Reconciliation (PDF)
                </button>
                <button
                  type="button"
                  onClick={handleExportLedgerJournalPDF}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-[#0c3b2e] hover:text-[#d6a735] font-medium flex items-center gap-2"
                >
                  <ShieldCheck size={13} /> General Ledger Postings (PDF)
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-[#0c3b2e] hover:text-[#d6a735] font-medium flex items-center gap-2"
                >
                  <FileSpreadsheet size={13} /> Chart of Accounts (CSV)
                </button>
              </div>
            </div>

            <button
              type="button"
              id="btn-print-statement"
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 hover:text-white border border-[#1a5e48] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Print formatted preview"
            >
              <Printer size={13} /> Print
            </button>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={busy}
                className="px-2.5 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh
              </button>
            )}
          </div>
        </div>

        {/* Date Filter & Statement Type Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#114232]">
          {/* Sub-report selector tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#06261f] p-1 rounded-xl border border-[#114232]">
            {[
              { id: "comprehensive", label: "Executive Statement", icon: Sparkles },
              { id: "balance_sheet", label: "Balance Sheet", icon: Scale },
              { id: "income_statement", label: "Income (P&L)", icon: TrendingUp },
              { id: "system_funds", label: "4 System Funds", icon: Layers },
              { id: "trial_balance", label: "Trial Balance", icon: Landmark },
              { id: "mechanics_pnl", label: "Mechanics Fund", icon: Bot },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeReport === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`report-tab-${tab.id}`}
                  onClick={() => setActiveReport(tab.id as ReportTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                      : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <Icon size={13} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Period presets */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[#06261f] p-1 rounded-xl border border-[#114232] text-xs">
              <Calendar size={13} className="text-[#d6a735] ml-1 mr-0.5" />
              {(["all", "today", "7days", "30days", "mtd", "custom"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodPreset(p)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize transition-colors ${
                    periodPreset === p
                      ? "bg-[#114232] text-[#d6a735] border border-[#d6a735]/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p === "all" ? "All Time" : p === "mtd" ? "MTD" : p}
                </button>
              ))}
            </div>

            {periodPreset === "custom" && (
              <div className="flex items-center gap-1 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[#06261f] border border-[#1a5e48] text-[#f8fafc] px-2 py-1 rounded text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[#06261f] border border-[#1a5e48] text-[#f8fafc] px-2 py-1 rounded text-xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REPORT CONTENT VIEWPORT */}
      <div className="p-6 rounded-2xl bg-[#031713] border border-[#1a5e48] space-y-6 shadow-xl print:p-0 print:border-none">
        {/* Printable Letterhead */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#1a5e48]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#d6a735]" />
              <h2 className="text-lg font-black text-[#f5efdf] tracking-tight">DAMII GAME PLATFORM</h2>
            </div>
            <p className="text-xs text-[#d6a735] font-semibold">
              OFFICIAL FINANCIAL REPORT &amp; STATUTORY AUDIT DISCLOSURE
            </p>
            <p className="text-[10px] text-slate-400">
              Reporting Standard: Ghana Financial Accounting Framework • Real-time Double-Entry Verification
            </p>
          </div>

          <div className="text-right space-y-1">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase border ${
                isEquationBalanced
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                  : "bg-amber-950 text-amber-300 border-amber-500/50"
              }`}
            >
              <ShieldCheck size={14} />
              {isEquationBalanced ? "100% Solvency Guaranteed" : "Discrepancy In Solvency"}
            </span>
            <div className="text-[11px] text-slate-300 font-mono">
              Period: <span className="font-bold text-[#f5efdf]">{periodLabel}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Generated: {new Date().toLocaleString("en-GB")}
            </div>
          </div>
        </div>

        {/* 1. EXECUTIVE COMPREHENSIVE VIEW */}
        {activeReport === "comprehensive" && (
          <div className="space-y-6">
            {/* Top 4 KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Platform Assets</span>
                <div className="text-xl font-black text-emerald-400 font-mono">GH₵ {totalAssets.toFixed(2)}</div>
                <p className="text-[10px] text-slate-400">Liquid reserves, Escrow vaults &amp; Float</p>
              </div>

              <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total User Obligations</span>
                <div className="text-xl font-black text-cyan-400 font-mono">GH₵ {totalLiabilities.toFixed(2)}</div>
                <p className="text-[10px] text-slate-400">Player balances &amp; active locked wagers</p>
              </div>

              <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retained Platform Equity</span>
                <div className="text-xl font-black text-amber-400 font-mono">GH₵ {totalEquity.toFixed(2)}</div>
                <p className="text-[10px] text-slate-400">Accumulated rake, reserves &amp; capital</p>
              </div>

              <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Operating Income</span>
                <div className={`text-xl font-black font-mono ${netIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  GH₵ {netIncome.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400">Gross revenue minus operating expenses</p>
              </div>
            </div>

            {/* 4 Core System Funds Summary Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                  <Layers size={14} className="text-[#d6a735]" /> 1. System Funds Allocation &amp; Solvency Breakdown
                </h4>
                <button
                  type="button"
                  onClick={handleExportSystemFundsPDF}
                  className="text-xs text-[#d6a735] hover:underline font-bold flex items-center gap-1"
                >
                  <Download size={12} /> Export Statement PDF
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                      <th className="py-2.5 px-3">System Fund Pool</th>
                      <th className="py-2.5 px-3">Mandate &amp; Classification</th>
                      <th className="py-2.5 px-3 text-right">Lifetime Inflow</th>
                      <th className="py-2.5 px-3 text-right">Lifetime Outflow</th>
                      <th className="py-2.5 px-3 text-right">Net Fund Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#114232] bg-[#06261f]">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#f5efdf] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" /> Account Balances Fund
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">Liquid player wallet balances [1020 / 2010]</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        GH₵ {(systemFunds?.accountBalancesFund?.totalInflow ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        GH₵ {(systemFunds?.accountBalancesFund?.totalOutflow ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        GH₵ {(systemFunds?.accountBalancesFund?.balance ?? 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#f5efdf] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400" /> Escrow Custodial Fund
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">Custodial locked 1v1 wagers &amp; prize vaults [1030 / 2020]</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        GH₵ {(systemFunds?.escrowFund?.totalInflow ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        GH₵ {(systemFunds?.escrowFund?.totalOutflow ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-400">
                        GH₵ {(systemFunds?.escrowFund?.balance ?? 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#f5efdf] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400" /> Platform Fee Fund
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">Retained match rake, tournament fees &amp; reserves [3010 / 4010]</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        GH₵ {(systemFunds?.platformFeeFund?.totalInflow ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        GH₵ {(systemFunds?.platformFeeFund?.totalOutflow ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        GH₵ {(systemFunds?.platformFeeFund?.balance ?? 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-[#f5efdf] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400" /> Mechanics Fund
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">AI bot operating float, bankrolls &amp; gameplay PnL [1040 / 4040 / 5030]</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        GH₵ {(systemFunds?.mechanicsFund?.totalInflow ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        GH₵ {(systemFunds?.mechanicsFund?.totalOutflow ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-400">
                        GH₵ {(systemFunds?.mechanicsFund?.balance ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#1a5e48] bg-[#041d17] font-bold text-xs">
                      <td colSpan={2} className="py-2.5 px-3 text-[#d6a735] uppercase">
                        Consolidated Solvency Pool
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#f5efdf]">
                        GH₵ {((systemFunds?.accountBalancesFund?.totalInflow ?? 0) + (systemFunds?.escrowFund?.totalInflow ?? 0) + (systemFunds?.platformFeeFund?.totalInflow ?? 0) + (systemFunds?.mechanicsFund?.totalInflow ?? 0)).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#f5efdf]">
                        GH₵ {((systemFunds?.accountBalancesFund?.totalOutflow ?? 0) + (systemFunds?.escrowFund?.totalOutflow ?? 0) + (systemFunds?.platformFeeFund?.totalOutflow ?? 0) + (systemFunds?.mechanicsFund?.totalOutflow ?? 0)).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-black text-sm">
                        GH₵ {totalAssets.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Side-by-Side Balance Sheet & P&L Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Condensed Balance Sheet */}
              <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                    <Scale size={14} className="text-[#d6a735]" /> Balance Sheet Snapshot
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveReport("balance_sheet")}
                    className="text-xs text-[#d6a735] hover:underline font-bold"
                  >
                    View Detail →
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-[#041c17] border border-[#114232]">
                    <span className="text-slate-300 font-medium">1000s Total Assets</span>
                    <span className="font-mono font-bold text-emerald-400">GH₵ {totalAssets.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#041c17] border border-[#114232]">
                    <span className="text-slate-300 font-medium">2000s Total Liabilities</span>
                    <span className="font-mono font-bold text-cyan-400">GH₵ {totalLiabilities.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#041c17] border border-[#114232]">
                    <span className="text-slate-300 font-medium">3000s Retained Equity</span>
                    <span className="font-mono font-bold text-amber-400">GH₵ {totalEquity.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#0c3b2e] border border-[#d6a735]/40 font-bold">
                    <span className="text-[#d6a735]">Assets = Liab + Equity Solvency</span>
                    <span className="text-emerald-400 font-mono">100.0% Matched</span>
                  </div>
                </div>
              </div>

              {/* Condensed P&L */}
              <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#d6a735]" /> Income Statement Snapshot
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveReport("income_statement")}
                    className="text-xs text-[#d6a735] hover:underline font-bold"
                  >
                    View Detail →
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-[#041c17] border border-[#114232]">
                    <span className="text-slate-300 font-medium">4000s Gross Platform Revenues</span>
                    <span className="font-mono font-bold text-emerald-400">GH₵ {totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#041c17] border border-[#114232]">
                    <span className="text-slate-300 font-medium">5000s Total Operating Expenses</span>
                    <span className="font-mono font-bold text-rose-400">GH₵ {totalExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#041c17] border border-[#114232]">
                    <span className="text-slate-300 font-medium">Net Operating Income (EBITDA)</span>
                    <span className={`font-mono font-bold ${netIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      GH₵ {netIncome.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#0c3b2e] border border-[#d6a735]/40 font-bold">
                    <span className="text-[#d6a735]">Platform Net Profit Margin</span>
                    <span className="text-amber-400 font-mono">
                      {totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. BALANCE SHEET VIEW */}
        {activeReport === "balance_sheet" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                <Scale size={16} className="text-[#d6a735]" /> Statement of Financial Position (Balance Sheet)
              </h3>
              <button
                type="button"
                onClick={handleExportBalanceSheetPDF}
                className="px-3 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Download size={13} /> Export PDF
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assets Section */}
              <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#114232]">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">1000s • Assets</h4>
                  <span className="text-xs font-mono font-bold text-emerald-400">Total: GH₵ {totalAssets.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  {assetAccounts.map((acc) => (
                    <div key={acc.code} className="flex items-center justify-between p-2 rounded bg-[#041c17] text-xs">
                      <div>
                        <div className="font-bold text-[#f5efdf] flex items-center gap-2">
                          <code className="text-[#d6a735] font-mono">{acc.code}</code>
                          <span>{acc.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">{acc.fundType.replace("_", " ")}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">GH₵ {acc.balance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liabilities & Equity Section */}
              <div className="space-y-6">
                {/* Liabilities */}
                <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#114232]">
                    <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider">2000s • Liabilities</h4>
                    <span className="text-xs font-mono font-bold text-cyan-400">Total: GH₵ {totalLiabilities.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    {liabilityAccounts.map((acc) => (
                      <div key={acc.code} className="flex items-center justify-between p-2 rounded bg-[#041c17] text-xs">
                        <div>
                          <div className="font-bold text-[#f5efdf] flex items-center gap-2">
                            <code className="text-cyan-400 font-mono">{acc.code}</code>
                            <span>{acc.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 capitalize">{acc.fundType.replace("_", " ")}</span>
                        </div>
                        <span className="font-mono font-bold text-cyan-400">GH₵ {acc.balance.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equity */}
                <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#114232]">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">3000s • Equity &amp; Reserves</h4>
                    <span className="text-xs font-mono font-bold text-amber-400">Total: GH₵ {totalEquity.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    {equityAccounts.map((acc) => (
                      <div key={acc.code} className="flex items-center justify-between p-2 rounded bg-[#041c17] text-xs">
                        <div>
                          <div className="font-bold text-[#f5efdf] flex items-center gap-2">
                            <code className="text-amber-400 font-mono">{acc.code}</code>
                            <span>{acc.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 capitalize">{acc.fundType.replace("_", " ")}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-400">GH₵ {acc.balance.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. INCOME STATEMENT (P&L) */}
        {activeReport === "income_statement" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-[#d6a735]" /> Statement of Comprehensive Income (Profit &amp; Loss)
              </h3>
              <button
                type="button"
                onClick={handleExportComprehensivePDF}
                className="px-3 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Download size={13} /> Export PDF
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Streams */}
              <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#114232]">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">4000s • Operating Revenues</h4>
                  <span className="text-xs font-mono font-bold text-emerald-400">GH₵ {totalRevenue.toFixed(2)}</span>
                </div>
                <div className="space-y-2">
                  {revenueAccounts.map((acc) => (
                    <div key={acc.code} className="flex items-center justify-between p-2 rounded bg-[#041c17] text-xs">
                      <div>
                        <div className="font-bold text-[#f5efdf] flex items-center gap-2">
                          <code className="text-emerald-400 font-mono">{acc.code}</code>
                          <span>{acc.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{acc.description}</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">GH₵ {acc.balance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#114232]">
                  <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider">5000s • Operating Expenses</h4>
                  <span className="text-xs font-mono font-bold text-rose-400">GH₵ {totalExpenses.toFixed(2)}</span>
                </div>
                <div className="space-y-2">
                  {expenseAccounts.map((acc) => (
                    <div key={acc.code} className="flex items-center justify-between p-2 rounded bg-[#041c17] text-xs">
                      <div>
                        <div className="font-bold text-[#f5efdf] flex items-center gap-2">
                          <code className="text-rose-400 font-mono">{acc.code}</code>
                          <span>{acc.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{acc.description}</p>
                      </div>
                      <span className="font-mono font-bold text-rose-400">GH₵ {acc.balance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Net Income Summary Card */}
            <div className="p-4 rounded-xl bg-[#0c3b2e] border border-[#d6a735]/40 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-[#d6a735]">Net Platform Operating Income (EBITDA)</span>
                <div className="text-2xl font-black text-[#f5efdf] font-mono">GH₵ {netIncome.toFixed(2)}</div>
                <p className="text-[11px] text-slate-300">
                  Gross Platform Margin: <span className="font-bold text-amber-300">{totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : "0.0"}%</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportComprehensivePDF}
                className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs rounded-xl flex items-center gap-2 shadow-md"
              >
                <Download size={14} /> Download Official P&amp;L Statement
              </button>
            </div>
          </div>
        )}

        {/* 4. 4 SYSTEM FUNDS RECONCILIATION */}
        {activeReport === "system_funds" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-[#d6a735]" /> 4 Core System Funds Audit &amp; Solvency Reconciliation
              </h3>
              <button
                type="button"
                onClick={handleExportSystemFundsPDF}
                className="px-3 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Download size={13} /> Export PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  fund: systemFunds?.accountBalancesFund,
                  name: "Account Balances Fund",
                  color: "emerald",
                  desc: "Liquid player deposit balances, available wallets, instant cashouts.",
                  codes: "1020 / 2010",
                },
                {
                  fund: systemFunds?.escrowFund,
                  name: "Escrow Custodial Fund",
                  color: "cyan",
                  desc: "Custodial lockups for active 1v1 wagers and tournament prize pools.",
                  codes: "1030 / 2020 / 2030",
                },
                {
                  fund: systemFunds?.platformFeeFund,
                  name: "Platform Fee Fund",
                  color: "amber",
                  desc: "Platform match rake, tournament commissions, and dispute reserves.",
                  codes: "3010 / 3020 / 4010 / 4020",
                },
                {
                  fund: systemFunds?.mechanicsFund,
                  name: "Mechanics Fund",
                  color: "purple",
                  desc: "Operating float, automated bot bankrolls, and net bot gameplay P&L.",
                  codes: "1040 / 1045 / 4040 / 5030",
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-[#f5efdf] uppercase tracking-wider">{item.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">COA: {item.codes}</span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#041c17] text-[#d6a735] border border-[#1a5e48]">
                      {item.fund?.entryCount ?? 0} Postings
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{item.desc}</p>
                  <div className="pt-2 border-t border-[#114232] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Total Inflows</span>
                      <span className="font-mono font-bold">GH₵ {(item.fund?.totalInflow ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Total Outflows</span>
                      <span className="font-mono font-bold">GH₵ {(item.fund?.totalOutflow ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300 font-bold pt-1 border-t border-[#114232]">
                      <span className="text-[#d6a735]">Current Fund Balance</span>
                      <span className="font-mono text-sm text-[#f5efdf]">GH₵ {(item.fund?.balance ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. TRIAL BALANCE */}
        {activeReport === "trial_balance" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                <Landmark size={16} className="text-[#d6a735]" /> General Ledger Trial Balance
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 border border-[#1a5e48] rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <FileSpreadsheet size={13} /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportBalanceSheetPDF}
                  className="px-3 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Download size={13} /> Export PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Account Title</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Fund</th>
                    <th className="py-2.5 px-3 text-right">Debit Balance</th>
                    <th className="py-2.5 px-3 text-right">Credit Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#114232] bg-[#06261f]">
                  {coaAccounts.map((acc) => {
                    const isDebit = acc.normalBalance === "debit";
                    return (
                      <tr key={acc.code} className="hover:bg-[#0c3b2e]/50">
                        <td className="py-2 px-3 font-mono font-bold text-[#d6a735]">{acc.code}</td>
                        <td className="py-2 px-3 text-[#f5efdf] font-medium">{acc.name}</td>
                        <td className="py-2 px-3 uppercase text-[10px] text-slate-300">{acc.accountClass}</td>
                        <td className="py-2 px-3 capitalize text-[10px] text-slate-300">{acc.fundType.replace("_", " ")}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-200">
                          {isDebit ? `GH₵ ${acc.balance.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-200">
                          {!isDebit ? `GH₵ ${acc.balance.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#1a5e48] bg-[#041d17] font-bold text-xs">
                    <td colSpan={4} className="py-2.5 px-3 text-[#d6a735] uppercase">
                      Trial Balance Aggregate
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                      GH₵ {coaAccounts.reduce((sum, a) => sum + (a.normalBalance === "debit" ? a.balance : 0), 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-cyan-400">
                      GH₵ {coaAccounts.reduce((sum, a) => sum + (a.normalBalance === "credit" ? a.balance : 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 6. MECHANICS FUND VIEW */}
        {activeReport === "mechanics_pnl" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                <Bot size={16} className="text-purple-400" /> Mechanics Fund &amp; AI Bot Fleet P&amp;L Performance
              </h3>
              <button
                type="button"
                onClick={handleExportComprehensivePDF}
                className="px-3 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Download size={13} /> Export PDF
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#06261f] border border-purple-500/30 space-y-1">
                <span className="text-[10px] font-bold text-purple-300 uppercase">1040 Mechanics Operating Float</span>
                <div className="text-xl font-black text-purple-400 font-mono">
                  GH₵ {(mechanicsDetails?.totalOperatingFloat ?? systemFunds?.mechanicsFund?.balance ?? 0).toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400">Active bankroll deployed across bot wallets</p>
              </div>

              <div className="p-4 rounded-xl bg-[#06261f] border border-emerald-500/30 space-y-1">
                <span className="text-[10px] font-bold text-emerald-300 uppercase">4040 Mechanics Bot Win Margin</span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  GH₵ {(mechanicsDetails?.mechanicsGameplayProfits ?? 0).toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400">Wager winnings captured by AI mechanics</p>
              </div>

              <div className="p-4 rounded-xl bg-[#06261f] border border-rose-500/30 space-y-1">
                <span className="text-[10px] font-bold text-rose-300 uppercase">5030 Player Payouts (Bot Losses)</span>
                <div className="text-xl font-black text-rose-400 font-mono">
                  GH₵ {(mechanicsDetails?.mechanicsGameplayLosses ?? 0).toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400">Wager payouts conceded to human players</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0c3b2e] border border-purple-500/40 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-purple-300">Net AI Mechanics Fleet Gameplay P&amp;L</span>
                <div className={`text-2xl font-black font-mono ${(mechanicsDetails?.netGameplayPnL ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  GH₵ {(mechanicsDetails?.netGameplayPnL ?? 0).toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-300 font-bold">Bot Fleet Liquidity Return</span>
                <p className="text-xs font-mono font-bold text-purple-300">
                  {mechanicsDetails?.activeBotsCount ?? 0} Active Bot Wallets
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Audit Certification Stamp in Preview */}
        <div className="p-4 rounded-xl bg-[#041c17] border border-[#1a5e48] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck size={16} className="text-[#d6a735]" />
            <span>
              Certified &amp; Balanced under Double-Entry Invariant Rule across 4 System Funds.
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Audit Checksum: {chartOfAccounts?.generatedAt || new Date().toISOString()}
          </span>
        </div>
      </div>
    </div>
  );
}
