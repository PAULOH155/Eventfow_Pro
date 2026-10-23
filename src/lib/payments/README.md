# Payment provider boundary

This phase defines the provider contract only. No payment is created from the browser and no checkout is reported as successful.

A Mercado Pago implementation must live in a trusted server environment (for example, a Supabase Edge Function), use server-side secrets, verify webhook authenticity, query final provider status, and apply idempotency before updating orders or issuing tickets.

Never put access tokens in VITE_ variables: those values are exposed to the browser bundle. Live charges, refunds, reconciliation, and ticket issuance belong to a later phase.
