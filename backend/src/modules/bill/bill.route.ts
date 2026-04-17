import { Router } from "express";
import * as controller from "./bill.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

// Tất cả routes đều cần authentication
router.use(authMiddleware);

// Routes cho admin
router.post("/", requireRole("ADMIN"), controller.createBill);
router.put("/:id", requireRole(["ADMIN", "RESIDENT"]), controller.updateBill);
router.delete("/:id", requireRole("ADMIN"), controller.deleteBill);

// Routes cho cả admin và resident
router.get("/", controller.getBills);
router.get("/:id", controller.getBillById);

export default router;
