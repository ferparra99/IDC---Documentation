import { Router } from "express";
import { authRoutes } from "./authRoutes";
import { attendanceRoutes } from "./attendanceRoutes";
import { configRoutes } from "./configRoutes";
import { calendarRoutes } from "./calendarRoutes";
import { leavesRoutes } from "./leaveRoutes";
import { tripsRoutes } from "./tripRoutes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/attendance", attendanceRoutes);
apiRouter.use("/config", configRoutes);
apiRouter.use("/calendar", calendarRoutes);
apiRouter.use("/leaves", leavesRoutes);
apiRouter.use("/trips", tripsRoutes);
