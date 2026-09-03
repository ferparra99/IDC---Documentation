import { Router } from "express";
import { login, refresh, logout } from "../controllers/authController";
import { asyncHandler } from "../middlewares/errorHandler";

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(login));
authRoutes.post("/refresh", asyncHandler(refresh));
authRoutes.post("/logout", asyncHandler(logout));
