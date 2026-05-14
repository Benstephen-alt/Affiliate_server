import mongoose from "mongoose";

const LogSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ["info", "warn", "error"], default: "info" },
    message: { type: String, required: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export const Log = mongoose.model("Log", LogSchema);
