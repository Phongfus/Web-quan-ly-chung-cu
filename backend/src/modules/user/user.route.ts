import { Router } from "express";
import { createResident, getUsers } from "./user.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

router.get("/", authMiddleware, requireRole("ADMIN"), getUsers);
router.post(
  "/create-resident",
  authMiddleware,
  requireRole("ADMIN"),
  createResident
);

export default router;