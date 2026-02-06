## Frontend + Orchestrator Service (Supabase-backed)

This folder contains:

- `supabase/schema.sql`: Postgres schema for donors, recipients, donations, donor recipient selection, and yield distribution events.
- `ui/`: React components used by Next routes under `app/`.
- `orchestrator/`: off-chain worker + helpers that replicate the exact onchain dynamics from `scripts/test-yield-flow.ts`.

### Environment variables (Next.js)

Public (browser):

- `NEXT_PUBLIC_BASE_MAINNET_RPC_URL` (preferred)
- `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` (fallback)
- `NEXT_PUBLIC_USDC_ADDRESS`
- `NEXT_PUBLIC_YIELD_ORCHESTRATOR_ADDRESS`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only (API routes + worker):

- `BASE_MAINNET_RPC_URL` (preferred)
- `BASE_SEPOLIA_RPC_URL` (fallback)
- `USDC_ADDRESS`
- `YIELD_ORCHESTRATOR_ADDRESS`
- `YIELD_STRATEGY_ADDRESS`
- `OPERATOR_PRIVATE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Running the worker locally

From repo root:

```bash
node frontend/orchestrator/cron.mjs
```

It runs every 2 minutes: calls `harvestStrategy` (report), then iterates donors and claims + transfers yield to their chosen recipient(s), recording tx hashes in Supabase.

