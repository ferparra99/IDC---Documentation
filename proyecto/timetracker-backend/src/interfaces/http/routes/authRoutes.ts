import { Router } from "express";
import { login } from "../controllers/authController";
import { asyncHandler } from "../middlewares/errorHandler";

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(login));
