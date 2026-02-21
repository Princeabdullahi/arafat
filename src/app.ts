import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import type { Request, Response } from "express";

import { errorHandler } from "./middleware/errorHandler";
import { requestId } from "./middleware/requestId";
import { routes } from "./routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(requestId());
  app.use(helmet());
  app.use(cors());

  app.use(
    express.json({
      limit: "1mb",
      verify: (req: Request, _res: Response, buf: Buffer) => {
        (req as any).rawBody = buf;
      },
    })
  );

  app.use(morgan("combined"));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(routes);

  app.use(errorHandler());

  return app;
}
