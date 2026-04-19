import { Router } from "express";
import {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  createNotification,
  updateNotification,
  deleteNotification,
} from "./notification.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/:id", getNotificationById);
router.put("/:id/read", markAsRead);
router.put("/mark-all-read", markAllAsRead);

// Admin only routes
router.post("/", requireRole("ADMIN"), createNotification);
router.put("/:id", requireRole("ADMIN"), updateNotification);
router.delete("/:id", requireRole("ADMIN"), deleteNotification);

export default router;