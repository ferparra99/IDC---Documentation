import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { apiRouter } from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

export function crearApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ data: { status: "ok" } });
  });

  app.use("/api/v1", apiRouter);

  app.use((req, res) => {
    res.status(404).json({ error: { code: "RUTA_NO_ENCONTRADA", message: `${req.method} ${req.path} no existe.` } });
  });

  app.use(errorHandler);

  return app;
}
