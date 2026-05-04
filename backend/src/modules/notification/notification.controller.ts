import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { getSocketServer } from "../../config/socket";

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    if (userRole === "ADMIN") {
      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limitNum,
        }),
        prisma.notification.count(),
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
      prisma.notificationTarget.findMany({
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
      prisma.notificationTarget.count({
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
  } catch (error: any) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      message: error.message || "Không thể lấy danh sách thông báo",
    });
  }
};

export const getNotificationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (userRole === "ADMIN") {
      const notification = await prisma.notification.findUnique({
        where: { id: id as string },
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

    const target = await prisma.notificationTarget.findFirst({
      where: {
        notificationId: id as string,
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
  } catch (error: any) {
    console.error("Get notification error:", error);
    res.status(500).json({
      message: error.message || "Không thể lấy thông báo",
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const target = await prisma.notificationTarget.findFirst({
      where: {
        notificationId: id as string,
        userId,
      },
    });

    if (!target) {
      return res.status(404).json({
        message: "Thông báo không tồn tại",
      });
    }

    const updated = await prisma.notificationTarget.update({
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

    // Emit socket event to user
    const io = getSocketServer();
    if (io) {
      const unreadCount = await prisma.notificationTarget.count({
        where: {
          userId,
          isRead: false,
        },
      });

      io.to(`user:${userId}`).emit("notification:read", {
        notificationId: id,
        unreadCount,
      });
      io.to(`user:${userId}`).emit("notification:count-updated", {
        unreadCount,
      });
    }

    res.json(notification);
  } catch (error: any) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      message: error.message || "Không thể đánh dấu đã đọc",
    });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await prisma.notificationTarget.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Emit socket event to user
    const io = getSocketServer();
    if (io) {
      io.to(`user:${userId}`).emit("notification:allread", {
        userId,
      });
      io.to(`user:${userId}`).emit("notification:count-updated", {
        unreadCount: 0,
      });
    }

    res.json({
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
    });
  } catch (error: any) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      message: error.message || "Không thể đánh dấu tất cả đã đọc",
    });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const count = await prisma.notificationTarget.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({
      unreadNotifications: count,
    });
  } catch (error: any) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      message: error.message || "Không thể lấy số lượng thông báo chưa đọc",
    });
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const { title, content, userIds } = req.body;

    if (!title || !content || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: "Thiếu dữ liệu bắt buộc: title, content, userIds",
      });
    }

    // Kiểm tra users tồn tại
    const users = await prisma.user.findMany({
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

    const notification = await prisma.notification.create({
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

    // Emit socket event to each user
    const io = getSocketServer();
    if (io) {
      console.log('Emitting notification:new to users:', userIds);
      await Promise.all(
        userIds.map(async (userId) => {
          const unreadCount = await prisma.notificationTarget.count({
            where: {
              userId,
              isRead: false,
            },
          });

          io.to(`user:${userId}`).emit("notification:new", {
            id: notification.id,
            title: notification.title,
            content: notification.content,
            createdAt: notification.createdAt,
            unreadCount,
          });
          io.to(`user:${userId}`).emit("notification:count-updated", {
            unreadCount,
          });
        }),
      );
    }

    res.status(201).json(notification);
  } catch (error: any) {
    console.error("Create notification error:", error);
    res.status(500).json({
      message: error.message || "Không thể tạo thông báo",
    });
  }
};

export const updateNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title && !content) {
      return res.status(400).json({
        message: "Cần cung cấp title hoặc content để cập nhật",
      });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: id as string },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Thông báo không tồn tại",
      });
    }

    const updated = await prisma.notification.update({
      where: { id: id as string },
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
  } catch (error: any) {
    console.error("Update notification error:", error);
    res.status(500).json({
      message: error.message || "Không thể cập nhật thông báo",
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: id as string },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Thông báo không tồn tại",
      });
    }

    await prisma.notification.delete({
      where: { id: id as string },
    });

    res.json({
      message: "Đã xóa thông báo",
    });
  } catch (error: any) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      message: error.message || "Không thể xóa thông báo",
    });
  }
};