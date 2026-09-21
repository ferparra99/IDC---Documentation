import { Router } from "express";
import * as leavesController from "../controllers/leavesController";
import { asyncHandler } from "../middlewares/errorHandler";
import { authMiddleware } from "../middlewares/authMiddleware";

export const leavesRoutes = Router();

leavesRoutes.use(authMiddleware);

// Admin primero para evitar conflicto con :id
leavesRoutes.get("/pendientes", asyncHandler(leavesController.pendientes));
leavesRoutes.get("/admin", asyncHandler(leavesController.listarTodosAdmin));
leavesRoutes.post("/:id/aprobar", asyncHandler(leavesController.aprobar));
leavesRoutes.post("/:id/rechazar", asyncHandler(leavesController.rechazar));

leavesRoutes.post("/", asyncHandler(leavesController.crear));
leavesRoutes.get("/", asyncHandler(leavesController.listar));
leavesRoutes.put("/:id", asyncHandler(leavesController.editar));
leavesRoutes.get("/:id/preview", asyncHandler(leavesController.preview));
leavesRoutes.post("/:id/submit", asyncHandler(leavesController.enviar));
