import express from "express";

import { Affiliate } from "../models/Affiliate.js";
import { AffiliateMember } from "../models/AffiliateMember.js";
import { AffiliatePayout } from "../models/AffiliatePayout.js";
import { Log } from "../models/Log.js";
import { env } from "../config/env.js";
import { requireAdmin } from "../middleware/auth.js";
import { refreshAffiliateCounts } from "./affiliate.js";

export const adminRouter = express.Router();

adminRouter.get("/overview", requireAdmin, async (req, res) => {
  const [totalAffiliates, pendingAffiliates, approvedAffiliates, eligibleAffiliates, totalMembers, approvedMembers, rejectedMembers, pendingPayouts] = await Promise.all([
    Affiliate.countDocuments(),
    Affiliate.countDocuments({ status: "pending" }),
    Affiliate.countDocuments({ status: "approved" }),
    Affiliate.countDocuments({ eligible: true }),
    AffiliateMember.countDocuments(),
    AffiliateMember.countDocuments({ status: "approved" }),
    AffiliateMember.countDocuments({ status: "rejected" }),
    AffiliatePayout.countDocuments({ status: "pending" }),
  ]);

  return res.json({
    requiredWallets: env.AFFILIATE_REQUIRED_WALLETS,
    weeklyRewardNaira: env.AFFILIATE_WEEKLY_REWARD_NAIRA,
    weeklyRewardUsd: env.AFFILIATE_WEEKLY_REWARD_USD,
    totalAffiliates,
    pendingAffiliates,
    approvedAffiliates,
    eligibleAffiliates,
    totalMembers,
    approvedMembers,
    rejectedMembers,
    pendingPayouts,
  });
});

adminRouter.get("/affiliates", requireAdmin, async (req, res) => {
  const affiliates = await Affiliate.find().select("-passwordHash").sort({ createdAt: -1 });
  return res.json({ affiliates });
});

adminRouter.patch("/affiliates/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body;

  if (!["pending", "approved", "rejected", "suspended"].includes(status)) {
    return res.status(400).json({ error: "Invalid affiliate status" });
  }

  const affiliate = await Affiliate.findByIdAndUpdate(req.params.id, { status }, { new: true }).select("-passwordHash");

  if (!affiliate) {
    return res.status(404).json({ error: "Affiliate not found" });
  }

  await Log.create({ level: "info", message: "Affiliate status updated", meta: { affiliateId: req.params.id, status } });
  return res.json({ affiliate });
});

adminRouter.get("/payouts/eligible", requireAdmin, async (req, res) => {
  const affiliates = await Affiliate.find({ status: "approved", eligible: true })
    .select("-passwordHash")
    .sort({ approvedWalletCount: -1 });

  return res.json({ weeklyRewardNaira: env.AFFILIATE_WEEKLY_REWARD_NAIRA, weeklyRewardUsd: env.AFFILIATE_WEEKLY_REWARD_USD, affiliates });
});

adminRouter.post("/payouts/create-weekly", requireAdmin, async (req, res) => {
  const cycleKey = req.body.cycleKey || getCurrentWeekKey();
  const eligibleAffiliates = await Affiliate.find({ status: "approved", eligible: true });
  const results = [];

  for (const affiliate of eligibleAffiliates) {
    const freshAffiliate = await refreshAffiliateCounts(affiliate._id);

    if (!freshAffiliate.eligible) {
      results.push({ affiliateId: affiliate._id, walletAddress: affiliate.walletAddress, status: "skipped", reason: "Affiliate is no longer eligible" });
      continue;
    }

    try {
      const payout = await AffiliatePayout.create({
        affiliateId: affiliate._id,
        walletAddress: affiliate.walletAddress,
        cycleKey,
        amountNaira: env.AFFILIATE_WEEKLY_REWARD_NAIRA,
        amountUsd: env.AFFILIATE_WEEKLY_REWARD_USD,
        status: "pending",
      });

      results.push({ affiliateId: affiliate._id, walletAddress: affiliate.walletAddress, status: "pending", payoutId: payout._id });
    } catch (error) {
      results.push({ affiliateId: affiliate._id, walletAddress: affiliate.walletAddress, status: "skipped", reason: "Already created for this week" });
    }
  }

  return res.json({ cycleKey, weeklyRewardNaira: env.AFFILIATE_WEEKLY_REWARD_NAIRA, weeklyRewardUsd: env.AFFILIATE_WEEKLY_REWARD_USD, results });
});

adminRouter.patch("/payouts/:id/mark-paid", requireAdmin, async (req, res) => {
  const { txHash, note } = req.body;

  const payout = await AffiliatePayout.findByIdAndUpdate(req.params.id, { status: "paid", txHash: txHash || "", note: note || "" }, { new: true });

  if (!payout) {
    return res.status(404).json({ error: "Payout not found" });
  }

  return res.json({ payout });
});

adminRouter.get("/payouts", requireAdmin, async (req, res) => {
  const payouts = await AffiliatePayout.find()
    .populate("affiliateId", "fullName email walletAddress approvedWalletCount")
    .sort({ createdAt: -1 })
    .limit(100);

  return res.json({ payouts });
});

function getCurrentWeekKey() {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - firstDayOfYear) / 86400000 + firstDayOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}
