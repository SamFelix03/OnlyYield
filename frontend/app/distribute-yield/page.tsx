"use client";

import { useState } from "react";

type Transaction = { type: string; hash: string; description: string };

export default function DistributeYieldPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function triggerDistribution() {
    setIsRunning(true);
    setLogs([]);
    setTransactions([]);
    setError(null);

    try {
      const res = await fetch("/api/distribute-yield", { method: "POST" });
      const data = await res.json();

      if (data.logs) setLogs(data.logs);
      if (data.transactions) setTransactions(data.transactions);
      if (!res.ok) {
        setError(data.error || "Distribution failed");
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl px-6 py-10 text-white">
        <h1 className="text-2xl font-semibold">Distribute Yield</h1>
      <p className="mt-2 text-sm opacity-80">
        Manually trigger the yield distribution process. This will harvest yield, claim it for each donation, and distribute to selected recipients.
      </p>

      <div className="mt-6">
        <button
          className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
          disabled={isRunning}
          onClick={triggerDistribution}
        >
          {isRunning ? "Running..." : "Trigger Distribution"}
        </button>
      </div>

      {error ? <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</div> : null}

      {transactions.length > 0 && (
        <section className="mt-10 rounded-xl border p-5">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <div className="mt-4 space-y-2 text-sm">
            {transactions.map((tx, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="font-medium">{tx.description}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-zinc-100 px-2 py-1 text-xs">{tx.type}</span>
                  <a
                    href={`https://basescan.org/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {tx.hash}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {logs.length > 0 && (
        <section className="mt-10 rounded-xl border p-5">
          <h2 className="text-lg font-semibold">Logs</h2>
          <div className="mt-4 max-h-96 overflow-y-auto rounded-lg bg-zinc-50 p-4 font-mono text-xs text-black">
            {logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
