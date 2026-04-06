import { Router } from "express";
import * as controller from "./resident.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

// Tất cả routes đều cần authentication và role ADMIN
router.use(authMiddleware, requireRole("ADMIN"));

router.get("/", controller.getResidents);
router.get("/:id", controller.getResidentById);
router.post("/", controller.createResident);
router.put("/:id", controller.updateResident);
router.delete("/:id", controller.deleteResident);

export default router;
