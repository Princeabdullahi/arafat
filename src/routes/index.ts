import { Router } from "express";
import { webhookRouter } from "./webhook";

export const routes = Router();

routes.use("/webhook", webhookRouter);
