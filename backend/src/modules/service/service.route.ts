import { Router } from "express";
import * as controller from "./service.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, controller.createService);
router.get("/", authMiddleware, controller.getServices);
router.get("/:id", authMiddleware, controller.getServiceById);
router.put("/:id", authMiddleware, controller.updateService);
router.delete("/:id", authMiddleware, controller.deleteService);

export default router;
