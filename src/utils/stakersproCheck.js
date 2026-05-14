import { getStakersProDb } from "../db/mongo.js";
import { normalizeWallet } from "./wallet.js";

export async function findStakersProUser(walletAddress) {
  const wallet = normalizeWallet(walletAddress);
  const db = getStakersProDb();

  const collections = ["users", "stakes", "referrals"];
  const fields = [
    "walletAddress",
    "wallet",
    "address",
    "user",
    "account",
    "staker",
    "referrer",
    "referred",
    "referredUser",
  ];

  for (const collectionName of collections) {
    const collection = db.collection(collectionName);
    const query = {
      $or: fields.map((field) => ({ [field]: wallet })),
    };

    const document = await collection.findOne(query);

    if (document) {
      return {
        found: true,
        source: collectionName,
        documentId: String(document._id),
      };
    }
  }

  return {
    found: false,
    source: null,
    documentId: null,
  };
}
