import { crearApp } from "./app";
import { env } from "../../shared/config/env";

const app = crearApp();

app.listen(env.port, () => {
  console.log(`API escuchando en http://localhost:${env.port}`);
});
