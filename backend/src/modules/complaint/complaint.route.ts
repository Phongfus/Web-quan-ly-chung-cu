import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import * as controller from "./complaint.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", controller.getComplaints);
router.get("/:id", controller.getComplaintById);
router.post("/", controller.createComplaint);
router.put("/:id", controller.updateComplaint);
router.delete("/:id", controller.deleteComplaint);

export default router;