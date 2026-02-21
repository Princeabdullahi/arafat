import type { RequestHandler } from "express";
import { randomUUID } from "crypto";

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const id = randomUUID();
    (req as any).requestId = id;
    res.setHeader("x-request-id", id);
    next();
  };
}
