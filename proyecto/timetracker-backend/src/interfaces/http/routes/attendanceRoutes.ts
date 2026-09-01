import { Router } from "express";
import * as attendanceController from "../controllers/attendanceController";
import { asyncHandler } from "../middlewares/errorHandler";
import { authMiddleware } from "../middlewares/authMiddleware";

export const attendanceRoutes = Router();

attendanceRoutes.use(authMiddleware);

attendanceRoutes.get("/today", asyncHandler(attendanceController.obtenerEstadoHoy));
attendanceRoutes.post("/start", asyncHandler(attendanceController.iniciar));
attendanceRoutes.post("/finish", asyncHandler(attendanceController.finalizar));
attendanceRoutes.put("/:id", asyncHandler(attendanceController.editar));
attendanceRoutes.get("/", asyncHandler(attendanceController.listar));
attendanceRoutes.get("/summary", asyncHandler(attendanceController.resumenSemanal));
