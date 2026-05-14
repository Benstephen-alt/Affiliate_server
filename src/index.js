import express from "express";
import cors from "cors";

import { connectDb } from "./db/mongo.js";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { affiliateRouter } from "./routes/affiliate.js";
import { adminRouter } from "./routes/admin.js";

async function bootstrap() {
  await connectDb();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (req, res) => {
    return res.json({ ok: true, service: "StakersPro Affiliate API V2" });
  });

  app.get("/health", (req, res) => {
    return res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/affiliate", affiliateRouter);
  app.use("/api/admin", adminRouter);

  app.listen(env.PORT, () => {
    console.log(`Affiliate backend running on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Server bootstrap failed", error);
  process.exit(1);
});
