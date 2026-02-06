"use client";

import { useEffect, useState } from "react";
import Aurora from "@/components/Aurora";

type Status = {
  chain_id: number;
  vault_address: string;
  usdc_address: string;
  decimals: number;
  idle_formatted: string;
  aave_formatted: string;
  total_formatted: string;
};

type Tx = { label: string; hash: string };

export default function ManageFundsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [busy, setBusy] = useState<{ agent: boolean; supply: boolean; withdraw: boolean; refresh: boolean }>({
    agent: false,
    supply: false,
    withdraw: false,
    refresh: false,
  });
  const [error, setError] = useState<string | null>(null);

  function pushLog(line: string) {
    setLogs((l) => [...l, line]);
  }

  async function refresh() {
    setBusy((b) => ({ ...b, refresh: true }));
    setError(null);
    try {
      const res = await fetch("/api/manage-funds/status");
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to fetch status");
      setStatus(data as Status);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy((b) => ({ ...b, refresh: false }));
    }
  }

  async function triggerAgent() {
    setBusy((b) => ({ ...b, agent: true }));
    setError(null);
    pushLog("[agent] POST /analyze ...");
    try {
      const res = await fetch("/api/manage-funds/agent-trigger", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || data?.body || "Agent trigger failed");
      pushLog(`[agent] ok (status ${data.status})`);
      if (data.body) pushLog(`[agent] response: ${String(data.body).slice(0, 500)}`);
    } catch (e: any) {
      setError(e?.message || String(e));
      pushLog(`[agent] error: ${e?.message || String(e)}`);
    } finally {
      setBusy((b) => ({ ...b, agent: false }));
    }
  }

  async function supplyAllIdleToAave() {
    setBusy((b) => ({ ...b, supply: true }));
    setError(null);
    pushLog("[vault] supply all idle -> aave ...");
    try {
      const res = await fetch("/api/manage-funds/supply", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Supply failed");
      if (data.skipped) {
        pushLog(`[vault] skipped: ${data.reason || "no-op"}`);
      } else {
        pushLog(`[vault] supply tx: ${data.tx_hash}`);
        setTxs((t) => [{ label: "Supply to Aave", hash: data.tx_hash }, ...t]);
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
      pushLog(`[vault] error: ${e?.message || String(e)}`);
    } finally {
      setBusy((b) => ({ ...b, supply: false }));
    }
  }

  async function withdrawAllFromAaveToIdle() {
    setBusy((b) => ({ ...b, withdraw: true }));
    setError(null);
    pushLog("[vault] withdraw all aave -> idle ...");
    try {
      const res = await fetch("/api/manage-funds/withdraw", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Withdraw failed");
      if (data.skipped) {
        pushLog(`[vault] skipped: ${data.reason || "no-op"}`);
      } else {
        pushLog(`[vault] withdraw tx: ${data.tx_hash}`);
        setTxs((t) => [{ label: "Withdraw from Aave", hash: data.tx_hash }, ...t]);
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
      pushLog(`[vault] error: ${e?.message || String(e)}`);
    } finally {
      setBusy((b) => ({ ...b, withdraw: false }));
    }
  }

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Aurora background reused from donor page */}
      <div className="fixed inset-0 h-full w-full">
        <Aurora
          colorStops={["#475569", "#64748b", "#475569"]}
          amplitude={1.2}
          blend={0.6}
          speed={0.8}
        />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 text-white">
        {/* Header row */}
        <div className="relative z-10 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Manage Funds</h1>
            <p className="mt-2 max-w-xl text-sm opacity-80">
              Operator-only controls for moving funds between idle and Aave, plus a yield-agent trigger.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs backdrop-blur-md hover:bg-white/10 transition disabled:opacity-50"
              disabled={busy.refresh}
              onClick={refresh}
              type="button"
            >
              {busy.refresh ? "Refreshing..." : "Refresh balances"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="relative z-10 mt-6 rounded-2xl border border-red-400/40 bg-black/70 px-4 py-3 text-sm text-red-200 shadow-lg backdrop-blur-md">
            {error}
          </div>
        ) : null}

        {/* Quick stats row */}
        <div className="relative z-10 mt-6 grid gap-4 text-xs sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-black/70 px-4 py-3 shadow-md backdrop-blur-xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Idle</div>
            <div className="mt-1 text-2xl font-semibold text-slate-50">{status ? status.idle_formatted : "—"}</div>
            <p className="mt-1 text-[11px] text-slate-400">USDC currently sitting idle in the vault.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/70 px-4 py-3 shadow-md backdrop-blur-xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">In Aave</div>
            <div className="mt-1 text-2xl font-semibold text-slate-50">{status ? status.aave_formatted : "—"}</div>
            <p className="mt-1 text-[11px] text-slate-400">USDC supplied to Aave (aUSDC balance).</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/70 px-4 py-3 shadow-md backdrop-blur-xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Total</div>
            <div className="mt-1 text-2xl font-semibold text-slate-50">{status ? status.total_formatted : "—"}</div>
            <p className="mt-1 text-[11px] text-slate-400">Idle + supplied to Aave.</p>
          </div>
        </div>

        {/* Action panel */}
        <section className="relative z-10 mt-8 rounded-3xl border border-white/15 bg-gradient-to-br from-slate-700/40 via-slate-900/80 to-black p-5 shadow-xl backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              <span className="text-[11px] font-semibold tracking-[0.22em] text-slate-200 uppercase">Controls</span>
            </div>
            {status ? (
              <div className="rounded-full border border-slate-300/40 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100">
                Base {status.chain_id}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-white/90 px-6 py-3 text-sm font-semibold tracking-wide text-black shadow-lg shadow-slate-300/40 transition hover:scale-[1.02] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={busy.agent}
              onClick={triggerAgent}
              type="button"
            >
              {busy.agent ? "Triggering..." : "Agent trigger"}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full bg-white/90 px-6 py-3 text-sm font-semibold tracking-wide text-black shadow-lg shadow-slate-300/40 transition hover:scale-[1.02] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={busy.supply}
              onClick={supplyAllIdleToAave}
              type="button"
            >
              {busy.supply ? "Supplying..." : "Supply all idle → Aave"}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-full bg-white/90 px-6 py-3 text-sm font-semibold tracking-wide text-black shadow-lg shadow-slate-300/40 transition hover:scale-[1.02] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={busy.withdraw}
              onClick={withdrawAllFromAaveToIdle}
              type="button"
            >
              {busy.withdraw ? "Withdrawing..." : "Withdraw all Aave → idle"}
            </button>
          </div>
        </section>

        {/* Transactions */}
        {txs.length > 0 ? (
          <section className="relative z-10 mt-8 rounded-3xl border border-white/15 bg-black/60 p-5 shadow-xl backdrop-blur-2xl">
            <h2 className="text-lg font-semibold text-slate-50">Transactions</h2>
            <div className="mt-4 space-y-3 text-xs sm:text-sm">
              {txs.map((tx, i) => (
                <div key={i} className="rounded-3xl border border-white/10 bg-black/70 p-4">
                  <div className="font-medium text-slate-50">{tx.label}</div>
                  <a
                    href={`https://basescan.org/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-[11px] text-slate-300 hover:text-white hover:underline"
                  >
                    {tx.hash}
                  </a>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Logs */}
        {logs.length > 0 ? (
          <section className="relative z-10 mt-8 rounded-3xl border border-white/15 bg-black/60 p-5 shadow-xl backdrop-blur-2xl">
            <h2 className="text-lg font-semibold text-slate-50">Logs</h2>
            <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-4 font-mono text-xs text-slate-100">
              {logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

