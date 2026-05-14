import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectDb() {
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
  });

  console.log(`Affiliate DB connected: ${env.MONGODB_DB_NAME}`);
}

export function getStakersProDb() {
  return mongoose.connection.client.db(env.STAKERSPRO_DB_NAME);
}
