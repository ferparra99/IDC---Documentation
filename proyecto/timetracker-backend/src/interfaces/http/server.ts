import { crearApp } from "./app";
import { env } from "../../shared/config/env";
import { logger } from "../../shared/logger/logger";

const app = crearApp();

app.listen(env.port, () => {
  logger.info(`API escuchando en http://localhost:${env.port}`);
});
