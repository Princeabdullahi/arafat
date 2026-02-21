import type { RequestHandler } from "express";
import crypto from "crypto";
import { env } from "../config/env";

export function whatsappSignatureVerifier(): RequestHandler {
  return (req, res, next) => {
    const signature = req.get("x-hub-signature-256");
    if (!signature) {
      return res.sendStatus(401);
    }

    const [algo, provided] = signature.split("=");
    if (algo !== "sha256" || !provided) {
      return res.sendStatus(401);
    }

    const rawBody: Buffer = (req as any).rawBody ?? Buffer.from("", "utf8");
    const expected = crypto.createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");

    const providedBuf = Buffer.from(provided, "hex");
    const expectedBuf = Buffer.from(expected, "hex");

    if (providedBuf.length !== expectedBuf.length) {
      return res.sendStatus(401);
    }

    const ok = crypto.timingSafeEqual(providedBuf, expectedBuf);
    if (!ok) {
      return res.sendStatus(401);
    }

    return next();
  };
}
