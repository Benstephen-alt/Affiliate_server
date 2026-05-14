import { verifyToken } from "../utils/jwt.js";
import { Affiliate } from "../models/Affiliate.js";

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export async function requireAffiliate(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== "affiliate") {
      return res.status(403).json({ error: "Affiliate access required" });
    }

    const affiliate = await Affiliate.findById(decoded.affiliateId);

    if (!affiliate) {
      return res.status(401).json({ error: "Affiliate not found. Please login again." });
    }

    req.affiliate = affiliate;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Session expired. Please login again." });
  }
}

export function requireAdmin(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: "Admin session expired. Please login again." });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Admin session expired. Please login again." });
  }
}
