import express from "express";
import bcrypt from "bcryptjs";
import validator from "validator";

import { Affiliate } from "../models/Affiliate.js";
import { env } from "../config/env.js";
import { isValidEvmAddress, normalizeWallet } from "../utils/wallet.js";
import { signToken } from "../utils/jwt.js";

export const authRouter = express.Router();

authRouter.post("/affiliate/register", async (req, res) => {
  try {
    const { fullName, email, phone, walletAddress, groupLink, password } = req.body;

    if (!fullName || !email || !phone || !walletAddress || !groupLink || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const wallet = normalizeWallet(walletAddress);

    if (!isValidEvmAddress(wallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    const existing = await Affiliate.findOne({
      $or: [{ email: email.toLowerCase() }, { walletAddress: wallet }],
    });

    if (existing) {
      return res.status(409).json({ error: "Affiliate email or wallet already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const affiliate = await Affiliate.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      walletAddress: wallet,
      groupLink,
      passwordHash,
    });

    const token = signToken({ role: "affiliate", affiliateId: affiliate._id });

    return res.status(201).json({ token, affiliate: sanitizeAffiliate(affiliate) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

authRouter.post("/affiliate/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const affiliate = await Affiliate.findOne({ email: String(email || "").toLowerCase() });

    if (!affiliate) {
      return res.status(401).json({ error: "Invalid login details" });
    }

    const passwordMatches = await bcrypt.compare(password || "", affiliate.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid login details" });
    }

    const token = signToken({ role: "affiliate", affiliateId: affiliate._id });
    return res.json({ token, affiliate: sanitizeAffiliate(affiliate) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

authRouter.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  if (email !== env.ADMIN_EMAIL || password !== env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin login details" });
  }

  const token = signToken({ role: "admin", email });
  return res.json({ token });
});

function sanitizeAffiliate(affiliate) {
  const obj = affiliate.toObject ? affiliate.toObject() : affiliate;
  delete obj.passwordHash;
  return obj;
}
