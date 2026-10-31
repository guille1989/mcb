-- Run once in the Supabase SQL editor BEFORE deploying the Stripe checkout:
-- the new code reads and writes these columns.

alter table orders
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists amount_in_cents bigint,
  add column if not exists currency text;

-- Stripe orders are charged in euros, so they carry no COP amount.
alter table orders alter column amount_in_cents_cop drop not null;

-- Orders paid through Wompi were charged in pesos; keep their amount under the new columns.
update orders
  set currency = 'cop', amount_in_cents = amount_in_cents_cop
  where currency is null and amount_in_cents_cop is not null;

create index if not exists orders_stripe_session_id_idx on orders (stripe_session_id);
