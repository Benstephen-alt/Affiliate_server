import mongoose from "mongoose";

const AffiliatePayoutSchema = new mongoose.Schema(
  {
    affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: "Affiliate", required: true, index: true },
    walletAddress: { type: String, required: true, lowercase: true, trim: true },
    cycleKey: { type: String, required: true },
    amountNaira: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    txHash: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

AffiliatePayoutSchema.index({ affiliateId: 1, cycleKey: 1 }, { unique: true });

export const AffiliatePayout = mongoose.model("AffiliatePayout", AffiliatePayoutSchema);
