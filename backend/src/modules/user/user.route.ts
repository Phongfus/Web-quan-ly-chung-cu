import { Router } from "express";
import { createResident } from "./user.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

router.post(
  "/create-resident",
  authMiddleware,
  requireRole("ADMIN"),
  createResident
);

export default router;