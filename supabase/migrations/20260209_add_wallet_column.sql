-- Add wallet_address column to profiles to support fixed account login
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS wallet_address TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);