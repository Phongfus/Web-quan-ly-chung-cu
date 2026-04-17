import { Router } from "express";
import * as controller from "./resident.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

// POST endpoint không yêu cầu role ADMIN (chỉ yêu cầu là user thường)
router.post("/", controller.createResident);

// Tất cả routes khác đều cần authentication
router.use(authMiddleware);
router.get("/current", controller.getCurrentResident);
router.get("/", controller.getResidents);
router.get("/:id", controller.getResidentById);
router.put("/:id", requireRole("ADMIN"), controller.updateResident);
router.delete("/:id", requireRole("ADMIN"), controller.deleteResident);

export default router;
