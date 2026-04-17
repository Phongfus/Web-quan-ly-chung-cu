import { Router } from "express";
import * as controller from "./vehicle.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

// Tất cả routes cần authentication
router.use(authMiddleware);

// Routes chỉ cho admin
router.post("/", controller.createVehicle);
router.put("/:id", controller.updateVehicle);
router.delete("/:id", controller.deleteVehicle);

// Routes cho cả admin và resident
router.get("/", controller.getVehicles);

export default router;