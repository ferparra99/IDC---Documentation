import { Router } from "express";
import * as tripsController from "../controllers/tripsController";
import { asyncHandler } from "../middlewares/errorHandler";
import { authMiddleware } from "../middlewares/authMiddleware";

export const tripsRoutes = Router();

tripsRoutes.use(authMiddleware);

tripsRoutes.post("/", asyncHandler(tripsController.crear));
tripsRoutes.get("/", asyncHandler(tripsController.listar));
tripsRoutes.put("/:id", asyncHandler(tripsController.editar));
tripsRoutes.delete("/:id", asyncHandler(tripsController.eliminar));
