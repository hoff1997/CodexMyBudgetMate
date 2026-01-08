-- Migration: Add leveled bill support for seasonal expenses
-- This enables NZ-focused seasonal bill averaging (power, gas, water)

-- Add leveling columns to envelopes table
ALTER TABLE envelopes
ADD COLUMN IF NOT EXISTS is_leveled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS leveling_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS seasonal_pattern TEXT DEFAULT NULL;

-- Add constraint for valid seasonal patterns
ALTER TABLE envelopes
ADD CONSTRAINT valid_seasonal_pattern
CHECK (seasonal_pattern IS NULL OR seasonal_pattern IN ('winter-peak', 'summer-peak', 'custom'));

-- Add comment explaining the leveling_data structure
COMMENT ON COLUMN envelopes.leveling_data IS 'JSON structure: {
  "monthlyAmounts": [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec],
  "yearlyAverage": number,
  "bufferPercent": number (default 10),
  "estimationType": "12-month" | "quick-estimate",
  "highSeasonEstimate": number (for quick-estimate only),
  "lowSeasonEstimate": number (for quick-estimate only),
  "lastUpdated": ISO date string
}';

-- Create index for quick lookups of leveled bills
CREATE INDEX IF NOT EXISTS idx_envelopes_is_leveled ON envelopes(is_leveled) WHERE is_leveled = TRUE;

-- Create index for seasonal pattern queries
CREATE INDEX IF NOT EXISTS idx_envelopes_seasonal_pattern ON envelopes(seasonal_pattern) WHERE seasonal_pattern IS NOT NULL;
