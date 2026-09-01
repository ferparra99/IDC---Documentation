import { Router } from "express";
import * as configController from "../controllers/configController";
import { asyncHandler } from "../middlewares/errorHandler";
import { authMiddleware, requiereRol } from "../middlewares/authMiddleware";

export const configRoutes = Router();

configRoutes.use(authMiddleware);

configRoutes.get("/", asyncHandler(configController.obtenerConfiguracion));
configRoutes.put("/:clave", requiereRol("administrador"), asyncHandler(configController.actualizarConfiguracion));
