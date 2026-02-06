import Link from "next/link";

export default function AppEntry() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-3xl p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Yield Donation Dapp
        </h1>
        <p className="mt-2 text-sm opacity-80 text-zinc-700 dark:text-zinc-300">
          Donors deposit USDC via the orchestrator. A worker periodically calls report, claims yield
          per donor, and transfers it to the recipient(s) chosen by that donor.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            className="rounded-xl border bg-white p-6 hover:bg-zinc-50 dark:bg-black dark:hover:bg-zinc-900"
            href="/donor"
          >
            <div className="text-lg font-semibold">Donor</div>
            <div className="mt-1 text-sm opacity-70">
              Pick recipients per deposit, approve USDC, deposit, and view your history.
            </div>
          </Link>

          <Link
            className="rounded-xl border bg-white p-6 hover:bg-zinc-50 dark:bg-black dark:hover:bg-zinc-900"
            href="/streamer"
          >
            <div className="text-lg font-semibold">Streamer</div>
            <div className="mt-1 text-sm opacity-70">
              Register and view received yield distributions.
            </div>
          </Link>

          <Link
            className="rounded-xl border bg-white p-6 hover:bg-zinc-50 dark:bg-black dark:hover:bg-zinc-900"
            href="/distribute-yield"
          >
            <div className="text-lg font-semibold">Distribute Yield</div>
            <div className="mt-1 text-sm opacity-70">
              Manually trigger yield distribution process with logs and transactions.
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

