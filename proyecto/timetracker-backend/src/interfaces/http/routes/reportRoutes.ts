import { Router } from "express";
import * as reportsController from "../controllers/reportsController";
import { asyncHandler } from "../middlewares/errorHandler";
import { authMiddleware } from "../middlewares/authMiddleware";

export const reportsRoutes = Router();

reportsRoutes.use(authMiddleware);

reportsRoutes.get("/excel", asyncHandler(reportsController.generarExcel));
