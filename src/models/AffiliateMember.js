import mongoose from "mongoose";

const AffiliateMemberSchema = new mongoose.Schema(
  {
    affiliateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Affiliate",
      required: true,
      index: true,
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["approved", "rejected"],
      required: true,
    },
    rejectionReason: { type: String, default: "" },
    stakersProUserFound: { type: Boolean, default: false },
    stakersProSource: { type: String, default: "" },
    source: { type: String, enum: ["manual", "bulk"], default: "manual" },
    retryCount: { type: Number, default: 0 },
    lastCheckedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const AffiliateMember = mongoose.model("AffiliateMember", AffiliateMemberSchema);
