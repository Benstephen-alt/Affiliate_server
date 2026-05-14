import express from "express";

import { Affiliate } from "../models/Affiliate.js";
import { AffiliateMember } from "../models/AffiliateMember.js";
import { AffiliatePayout } from "../models/AffiliatePayout.js";
import { env } from "../config/env.js";
import { requireAffiliate } from "../middleware/auth.js";
import { isValidEvmAddress, normalizeWallet, parseWalletList } from "../utils/wallet.js";
import { findStakersProUser } from "../utils/stakersproCheck.js";

export const affiliateRouter = express.Router();

affiliateRouter.get("/me", requireAffiliate, async (req, res) => {
  const affiliate = await refreshAffiliateCounts(req.affiliate._id);

  const recentMembers = await AffiliateMember.find({ affiliateId: affiliate._id })
    .sort({ updatedAt: -1 })
    .limit(40);

  const payouts = await AffiliatePayout.find({ affiliateId: affiliate._id })
    .sort({ createdAt: -1 })
    .limit(20);

  return res.json({
    affiliate,
    requiredWallets: env.AFFILIATE_REQUIRED_WALLETS,
    weeklyRewardNaira: env.AFFILIATE_WEEKLY_REWARD_NAIRA,
    weeklyRewardUsd: env.AFFILIATE_WEEKLY_REWARD_USD,
    remainingWallets: Math.max(env.AFFILIATE_REQUIRED_WALLETS - affiliate.approvedWalletCount, 0),
    recentMembers,
    payouts,
  });
});

affiliateRouter.post("/members/add", requireAffiliate, async (req, res) => {
  const result = await processWallet({
    affiliate: req.affiliate,
    walletAddress: req.body.walletAddress,
    source: "manual",
  });

  const affiliate = await refreshAffiliateCounts(req.affiliate._id);

  return res.json({
    result,
    affiliate,
    requiredWallets: env.AFFILIATE_REQUIRED_WALLETS,
    remainingWallets: Math.max(env.AFFILIATE_REQUIRED_WALLETS - affiliate.approvedWalletCount, 0),
  });
});

affiliateRouter.post("/members/bulk", requireAffiliate, async (req, res) => {
  const wallets = parseWalletList(req.body.walletsText);

  if (!wallets.length) {
    return res.status(400).json({ error: "No wallet addresses supplied" });
  }

  const results = [];

  for (const walletAddress of wallets) {
    results.push(await processWallet({ affiliate: req.affiliate, walletAddress, source: "bulk" }));
  }

  const affiliate = await refreshAffiliateCounts(req.affiliate._id);

  return res.json({
    totalSubmitted: wallets.length,
    results,
    affiliate,
    requiredWallets: env.AFFILIATE_REQUIRED_WALLETS,
    remainingWallets: Math.max(env.AFFILIATE_REQUIRED_WALLETS - affiliate.approvedWalletCount, 0),
  });
});

async function processWallet({ affiliate, walletAddress, source }) {
  const wallet = normalizeWallet(walletAddress);

  if (affiliate.status !== "approved") {
    return { walletAddress: wallet, status: "rejected", reason: "Affiliate account must be approved before uploading members" };
  }

  if (!isValidEvmAddress(wallet)) {
    return { walletAddress: wallet, status: "rejected", reason: "Invalid EVM wallet address" };
  }

  if (wallet === affiliate.walletAddress) {
    return { walletAddress: wallet, status: "rejected", reason: "Affiliate cannot upload own wallet address" };
  }

  const existing = await AffiliateMember.findOne({ walletAddress: wallet });

  if (existing) {
    return handleExistingWallet({ existing, affiliate, wallet, source });
  }

  return createNewWalletRecord({ affiliate, wallet, source });
}

async function handleExistingWallet({ existing, affiliate, wallet, source }) {
  const isSameAffiliate = String(existing.affiliateId) === String(affiliate._id);

  if (!isSameAffiliate) {
    if (existing.status === "approved") {
      return { walletAddress: wallet, status: "rejected", reason: "Wallet already belongs to another affiliate group" };
    }

    return {
      walletAddress: wallet,
      status: "rejected",
      reason: "Wallet was previously submitted by another affiliate and is locked for review",
    };
  }

  if (existing.status === "approved") {
    return { walletAddress: wallet, status: "approved", reason: "Wallet was already approved for your group" };
  }

  const stakersProUser = await findStakersProUser(wallet);

  if (!stakersProUser.found) {
    existing.retryCount += 1;
    existing.lastCheckedAt = new Date();
    existing.rejectionReason = "Wallet is still not found in StakersPro user database";
    existing.source = source;
    await existing.save();

    return {
      walletAddress: wallet,
      status: "rejected",
      reason: "Wallet is still not a verified StakersPro user. Upload it again after the user stakes or appears in the database.",
    };
  }

  existing.status = "approved";
  existing.rejectionReason = "";
  existing.stakersProUserFound = true;
  existing.stakersProSource = stakersProUser.source;
  existing.lastCheckedAt = new Date();
  existing.approvedAt = new Date();
  existing.retryCount += 1;
  existing.source = source;
  await existing.save();

  return {
    walletAddress: wallet,
    status: "approved",
    reason: "Wallet was previously rejected, but it is now verified as a StakersPro user and has been approved",
  };
}

async function createNewWalletRecord({ affiliate, wallet, source }) {
  const stakersProUser = await findStakersProUser(wallet);

  if (!stakersProUser.found) {
    await AffiliateMember.create({
      affiliateId: affiliate._id,
      walletAddress: wallet,
      status: "rejected",
      rejectionReason: "Wallet was not found in StakersPro user database",
      stakersProUserFound: false,
      source,
      lastCheckedAt: new Date(),
    });

    return {
      walletAddress: wallet,
      status: "rejected",
      reason: "Wallet was not found in StakersPro user database. You can upload it again later after it becomes a StakersPro user.",
    };
  }

  await AffiliateMember.create({
    affiliateId: affiliate._id,
    walletAddress: wallet,
    status: "approved",
    rejectionReason: "",
    stakersProUserFound: true,
    stakersProSource: stakersProUser.source,
    source,
    lastCheckedAt: new Date(),
    approvedAt: new Date(),
  });

  return { walletAddress: wallet, status: "approved", reason: "Wallet approved as valid StakersPro account" };
}

export async function refreshAffiliateCounts(affiliateId) {
  const [approvedWalletCount, rejectedWalletCount] = await Promise.all([
    AffiliateMember.countDocuments({ affiliateId, status: "approved" }),
    AffiliateMember.countDocuments({ affiliateId, status: "rejected" }),
  ]);

  const eligible = approvedWalletCount >= env.AFFILIATE_REQUIRED_WALLETS;

  return Affiliate.findByIdAndUpdate(
    affiliateId,
    {
      approvedWalletCount,
      rejectedWalletCount,
      eligible,
      weeklyRewardNaira: env.AFFILIATE_WEEKLY_REWARD_NAIRA,
      weeklyRewardUsd: env.AFFILIATE_WEEKLY_REWARD_USD,
    },
    { new: true }
  ).select("-passwordHash");
}
