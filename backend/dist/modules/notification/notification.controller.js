"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.updateNotification = exports.createNotification = exports.getUnreadCount = exports.markAllAsRead = exports.markAsRead = exports.getNotificationById = exports.getNotifications = void 0;
const prisma_1 = require("../../config/prisma");
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        if (userRole === "ADMIN") {
            const [notifications, total] = await Promise.all([
                prisma_1.prisma.notification.findMany({
                    orderBy: {
                        createdAt: "desc",
                    },
                    skip,
                    take: limitNum,
                }),
                prisma_1.prisma.notification.count(),
            ]);
            const formatted = notifications.map((notification) => ({
                ...notification,
                isRead: true,
                targetId: notification.id,
            }));
            return res.json({
                data: formatted,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        }
        const [targets, total] = await Promise.all([
            prisma_1.prisma.notificationTarget.findMany({
                where: {
                    userId,
                },
                orderBy: {
                    notification: {
                        createdAt: "desc",
                    },
                },
                skip,
                take: limitNum,
                include: {
                    notification: true,
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.notificationTarget.count({
                where: {
                    userId,
                },
            }),
        ]);
        const notifications = targets.map((target) => ({
            ...target.notification,
            isRead: target.isRead,
            targetId: target.id,
        }));
        res.json({
            data: notifications,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error("Get notifications error:", error);
        res.status(500).json({
            message: error.message || "Không thể lấy danh sách thông báo",
        });
    }
};
exports.getNotifications = getNotifications;
const getNotificationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (userRole === "ADMIN") {
            const notification = await prisma_1.prisma.notification.findUnique({
                where: { id: id },
            });
            if (!notification) {
                return res.status(404).json({
                    message: "Thông báo không tồn tại",
                });
            }
            return res.json({
                ...notification,
                isRead: true,
                targetId: notification.id,
            });
        }
        const target = await prisma_1.prisma.notificationTarget.findFirst({
            where: {
                notificationId: id,
                userId,
            },
            include: {
                notification: true,
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
        });
        if (!target) {
            return res.status(404).json({
                message: "Thông báo không tồn tại",
            });
        }
        const notification = {
            ...target.notification,
            isRead: target.isRead,
            targetId: target.id,
        };
        res.json(notification);
    }
    catch (error) {
        console.error("Get notification error:", error);
        res.status(500).json({
            message: error.message || "Không thể lấy thông báo",
        });
    }
};
exports.getNotificationById = getNotificationById;
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const target = await prisma_1.prisma.notificationTarget.findFirst({
            where: {
                notificationId: id,
                userId,
            },
        });
        if (!target) {
            return res.status(404).json({
                message: "Thông báo không tồn tại",
            });
        }
        const updated = await prisma_1.prisma.notificationTarget.update({
            where: {
                id: target.id,
            },
            data: {
                isRead: true,
            },
            include: {
                notification: true,
            },
        });
        const notification = {
            ...updated.notification,
            isRead: updated.isRead,
            targetId: updated.id,
        };
        res.json(notification);
    }
    catch (error) {
        console.error("Mark as read error:", error);
        res.status(500).json({
            message: error.message || "Không thể đánh dấu đã đọc",
        });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        await prisma_1.prisma.notificationTarget.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
        res.json({
            message: "Đã đánh dấu tất cả thông báo là đã đọc",
        });
    }
    catch (error) {
        console.error("Mark all as read error:", error);
        res.status(500).json({
            message: error.message || "Không thể đánh dấu tất cả đã đọc",
        });
    }
};
exports.markAllAsRead = markAllAsRead;
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const count = await prisma_1.prisma.notificationTarget.count({
            where: {
                userId,
                isRead: false,
            },
        });
        res.json({
            unreadNotifications: count,
        });
    }
    catch (error) {
        console.error("Get unread count error:", error);
        res.status(500).json({
            message: error.message || "Không thể lấy số lượng thông báo chưa đọc",
        });
    }
};
exports.getUnreadCount = getUnreadCount;
const createNotification = async (req, res) => {
    try {
        const { title, content, userIds } = req.body;
        if (!title || !content || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                message: "Thiếu dữ liệu bắt buộc: title, content, userIds",
            });
        }
        // Kiểm tra users tồn tại
        const users = await prisma_1.prisma.user.findMany({
            where: {
                id: {
                    in: userIds,
                },
            },
            select: {
                id: true,
            },
        });
        if (users.length !== userIds.length) {
            return res.status(400).json({
                message: "Một số user không tồn tại",
            });
        }
        const notification = await prisma_1.prisma.notification.create({
            data: {
                title,
                content,
                targets: {
                    create: userIds.map((userId) => ({
                        userId,
                    })),
                },
            },
            include: {
                targets: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                    },
                },
            },
        });
        res.status(201).json(notification);
    }
    catch (error) {
        console.error("Create notification error:", error);
        res.status(500).json({
            message: error.message || "Không thể tạo thông báo",
        });
    }
};
exports.createNotification = createNotification;
const updateNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        if (!title && !content) {
            return res.status(400).json({
                message: "Cần cung cấp title hoặc content để cập nhật",
            });
        }
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { id: id },
        });
        if (!notification) {
            return res.status(404).json({
                message: "Thông báo không tồn tại",
            });
        }
        const updated = await prisma_1.prisma.notification.update({
            where: { id: id },
            data: {
                ...(title && { title }),
                ...(content && { content }),
            },
            include: {
                targets: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                    },
                },
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Update notification error:", error);
        res.status(500).json({
            message: error.message || "Không thể cập nhật thông báo",
        });
    }
};
exports.updateNotification = updateNotification;
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { id: id },
        });
        if (!notification) {
            return res.status(404).json({
                message: "Thông báo không tồn tại",
            });
        }
        await prisma_1.prisma.notification.delete({
            where: { id: id },
        });
        res.json({
            message: "Đã xóa thông báo",
        });
    }
    catch (error) {
        console.error("Delete notification error:", error);
        res.status(500).json({
            message: error.message || "Không thể xóa thông báo",
        });
    }
};
exports.deleteNotification = deleteNotification;
