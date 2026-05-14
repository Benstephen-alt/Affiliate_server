import mongoose from "mongoose";
import { env } from "../config/env.js";

const AffiliateSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    walletAddress: { type: String, required: true, unique: true, lowercase: true, trim: true },
    groupLink: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    approvedWalletCount: { type: Number, default: 0 },
    rejectedWalletCount: { type: Number, default: 0 },
    eligible: { type: Boolean, default: false },
    weeklyRewardNaira: { type: Number, default: env.AFFILIATE_WEEKLY_REWARD_NAIRA },
    weeklyRewardUsd: { type: Number, default: env.AFFILIATE_WEEKLY_REWARD_USD },
  },
  { timestamps: true }
);

export const Affiliate = mongoose.model("Affiliate", AffiliateSchema);
