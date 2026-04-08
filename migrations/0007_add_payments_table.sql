-- Migration: Add payments table

CREATE TABLE IF NOT EXISTS payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id varchar NOT NULL REFERENCES members(id),
  amount integer NOT NULL,
  method text NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  payment_date timestamp NOT NULL DEFAULT now(),
  notes text,
  received_by_user_id varchar REFERENCES users(id),
  external_provider text,
  external_payment_id text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);