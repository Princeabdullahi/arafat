import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { whatsappSignatureVerifier } from "../middleware/whatsappSignatureVerifier";
import { whatsappWebhookService } from "../services/whatsappWebhookService";

export const webhookController = {
  verify: async (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === env.VERIFY_TOKEN) {
      return res.status(200).send(String(challenge ?? ""));
    }

    return res.sendStatus(403);
  },

  receive: [
    whatsappSignatureVerifier(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await whatsappWebhookService.handleIncoming(req.body);
        return res.sendStatus(200);
      } catch (err) {
        return next(err);
      }
    },
  ],
};
