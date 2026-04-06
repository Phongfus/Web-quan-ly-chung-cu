import { Router } from "express";
import * as controller from "./bill.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

// Tất cả routes đều cần authentication và role ADMIN
router.use(authMiddleware, requireRole("ADMIN"));

router.get("/", controller.getBills);
router.get("/apartment/:apartmentId", controller.getBillsByApartment);
router.get("/:id", controller.getBillById);
router.post("/", controller.createBill);
router.put("/:id", controller.updateBill);
router.delete("/:id", controller.deleteBill);

export default router;
