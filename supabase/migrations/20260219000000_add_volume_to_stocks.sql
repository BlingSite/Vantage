-- Add volume column to stocks table (e.g. from Finnhub quote "v").
-- Volume is typically a large integer (shares traded).
ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS volume BIGINT;

COMMENT ON COLUMN stocks.volume IS 'Trading volume (shares traded), e.g. from Finnhub quote.';
