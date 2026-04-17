import { Router } from "express";
import * as controller from "./service.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

// Tất cả routes cần authentication
router.use(authMiddleware);

// Routes chỉ cho admin
router.post("/", controller.createService);
router.put("/:id", controller.updateService);
router.delete("/:id", controller.deleteService);

// Routes cho cả admin và resident
router.get("/", controller.getServices);
router.get("/:id", controller.getServiceById);

export default router;
