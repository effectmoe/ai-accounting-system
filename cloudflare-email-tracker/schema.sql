-- Email Tracking Events Table
CREATE TABLE IF NOT EXISTS email_tracking_events (
  id TEXT PRIMARY KEY,
  tracking_id TEXT NOT NULL,
  email_id TEXT,
  message_id TEXT,
  quote_id TEXT,
  invoice_id TEXT,
  delivery_note_id TEXT,
  receipt_id TEXT,
  recipient_email TEXT,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  email_client TEXT,
  country TEXT,
  city TEXT,
  link_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tracking_id ON email_tracking_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_quote_id ON email_tracking_events(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoice_id ON email_tracking_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON email_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_timestamp ON email_tracking_events(timestamp);

-- Email Send Records Table
CREATE TABLE IF NOT EXISTS email_send_records (
  id TEXT PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE,
  message_id TEXT,
  quote_id TEXT,
  invoice_id TEXT,
  delivery_note_id TEXT,
  receipt_id TEXT,
  recipient_email TEXT NOT NULL,
  sender_email TEXT,
  subject TEXT,
  sent_at TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  last_opened_at TEXT,
  last_clicked_at TEXT,
  resend_count INTEGER DEFAULT 0,
  last_resend_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for email send records
CREATE INDEX IF NOT EXISTS idx_send_tracking_id ON email_send_records(tracking_id);
CREATE INDEX IF NOT EXISTS idx_send_quote_id ON email_send_records(quote_id);
CREATE INDEX IF NOT EXISTS idx_send_invoice_id ON email_send_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_send_recipient ON email_send_records(recipient_email);
CREATE INDEX IF NOT EXISTS idx_send_status ON email_send_records(status);
