import { Router } from "express";
import { createResident, getUsers } from "./user.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

// cho ADMIN + RESIDENT xem danh sách user (để chat)
router.get(
  "/",
  authMiddleware,
  requireRole(["ADMIN", "RESIDENT"]),
  getUsers
);

// chỉ ADMIN được tạo cư dân
router.post(
  "/create-resident",
  authMiddleware,
  requireRole("ADMIN"),
  createResident
);

export default router;