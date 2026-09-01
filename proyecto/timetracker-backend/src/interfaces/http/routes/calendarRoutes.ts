import { Router } from "express";
import * as calendarController from "../controllers/calendarController";
import { asyncHandler } from "../middlewares/errorHandler";
import { authMiddleware } from "../middlewares/authMiddleware";

export const calendarRoutes = Router();

calendarRoutes.use(authMiddleware);

calendarRoutes.get("/", asyncHandler(calendarController.obtenerMes));
