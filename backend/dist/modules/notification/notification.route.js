"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("./notification.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get("/", notification_controller_1.getNotifications);
router.get("/unread-count", notification_controller_1.getUnreadCount);
router.get("/:id", notification_controller_1.getNotificationById);
router.put("/:id/read", notification_controller_1.markAsRead);
router.put("/mark-all-read", notification_controller_1.markAllAsRead);
// Admin only routes
router.post("/", (0, role_middleware_1.requireRole)("ADMIN"), notification_controller_1.createNotification);
router.put("/:id", (0, role_middleware_1.requireRole)("ADMIN"), notification_controller_1.updateNotification);
router.delete("/:id", (0, role_middleware_1.requireRole)("ADMIN"), notification_controller_1.deleteNotification);
exports.default = router;
