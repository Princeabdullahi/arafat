import { Router } from "express";
import { webhookController } from "../controllers/webhookController";

export const webhookRouter = Router();

webhookRouter.get("/", webhookController.verify);
webhookRouter.post("/", webhookController.receive);
