-- Apply after stripe_migration.sql and before deploying the checkout reminder feature.
alter table public.orders
  add column if not exists checkout_cart jsonb,
  add column if not exists checkout_key_hash text,
  add column if not exists checkout_locked_until timestamptz,
  add column if not exists reminder_attempt jsonb,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists reminder_email_id text;

create unique index if not exists orders_checkout_key_hash_idx
  on public.orders (checkout_key_hash)
  where checkout_key_hash is not null;
