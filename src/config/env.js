import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 4100),
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "affiliate_rewards",
  STAKERSPRO_DB_NAME: process.env.STAKERSPRO_DB_NAME || "referral_rewards_pro",
  JWT_SECRET: process.env.JWT_SECRET || "change_me_in_production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@stakerspro.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
  AFFILIATE_REQUIRED_WALLETS: Number(process.env.AFFILIATE_REQUIRED_WALLETS || 100),
  AFFILIATE_WEEKLY_REWARD_NAIRA: Number(process.env.AFFILIATE_WEEKLY_REWARD_NAIRA || 120000),
  AFFILIATE_WEEKLY_REWARD_USD: Number(process.env.AFFILIATE_WEEKLY_REWARD_USD || 80),
};

if (!env.MONGODB_URI) {
  throw new Error("MONGODB_URI is required");
}
