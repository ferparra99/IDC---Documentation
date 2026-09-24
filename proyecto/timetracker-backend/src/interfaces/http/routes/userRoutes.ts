import { Router } from "express";
import * as usersController from "../controllers/usersController";
import { asyncHandler } from "../middlewares/errorHandler";
import { authMiddleware } from "../middlewares/authMiddleware";

export const userRoutes = Router();

userRoutes.use(authMiddleware);

userRoutes.get("/", asyncHandler(usersController.listar));
userRoutes.post("/", asyncHandler(usersController.crear));
