import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

const generateComplaintId = (existingIds: string[]) => {
  const numbers = existingIds
    .map((id) => id.match(/^KN(\d{4})$/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => parseInt(match[1], 10));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `KN${nextNumber.toString().padStart(4, "0")}`;
};

export const getComplaints = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    let whereCondition = {};
    if (userRole !== 'ADMIN') {
      // Nếu không phải admin, chỉ lấy complaint của user hiện tại
      whereCondition = { userId: userId };
    }

    const data = await prisma.complaint.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
        apartment: {
          select: {
            id: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(data);
  } catch (error) {
    console.error("Get complaints error:", error);
    res.status(500).json({
      message: "Không thể lấy danh sách khiếu nại",
    });
  }
};

export const getComplaintById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    const data = await prisma.complaint.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
        apartment: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy khiếu nại",
      });
    }

    // Chỉ user tạo complaint hoặc admin mới được xem chi tiết
    if (userRole !== 'ADMIN' && data.userId !== userId) {
      return res.status(403).json({
        message: "Không có quyền xem khiếu nại này",
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Get complaint by id error:", error);
    res.status(500).json({
      message: "Không thể lấy thông tin khiếu nại",
    });
  }
};

export const createComplaint = async (req: Request, res: Response) => {
  try {
    const { title, content, apartmentId } = req.body;
    const userId = (req as any).user?.id;

    // Kiểm tra dữ liệu bắt buộc
    if (!title || !content || !apartmentId) {
      return res.status(400).json({
        message: "Thiếu dữ liệu bắt buộc: title, content, apartmentId",
      });
    }

    // Kiểm tra căn hộ có tồn tại
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
    });

    if (!apartment) {
      return res.status(404).json({
        message: "Căn hộ không tồn tại",
      });
    }

    // Tạo ID khiếu nại tự động (KN0001, KN0002, ...)
    const existingIds = await prisma.complaint.findMany({
      where: {
        id: {
          startsWith: "KN",
        },
      },
      select: {
        id: true,
      },
    });

    const complaintId = generateComplaintId(existingIds.map((item) => item.id));

    const data = await prisma.complaint.create({
      data: {
        id: complaintId,
        title,
        content,
        apartmentId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
        apartment: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    res.status(201).json(data);
  } catch (error: any) {
    console.error("Create complaint error:", error);

    if (error.code === 'P2003') {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
      });
    }

    res.status(500).json({
      message: error.message || "Không thể tạo khiếu nại",
    });
  }
};

export const updateComplaint = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, content, apartmentId, status } = req.body;
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    // Kiểm tra complaint tồn tại và quyền truy cập
    const existingComplaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existingComplaint) {
      return res.status(404).json({
        message: "Không tìm thấy khiếu nại",
      });
    }

    // Chỉ user tạo complaint hoặc admin mới được update
    if (userRole !== 'ADMIN' && existingComplaint.userId !== userId) {
      return res.status(403).json({
        message: "Không có quyền cập nhật khiếu nại này",
      });
    }

    // Admin có thể update tất cả, user chỉ update title, content, apartmentId
    let updateData: any = {};
    if (userRole === 'ADMIN') {
      updateData = {
        title,
        content,
        apartmentId,
        status,
      };
    } else {
      updateData = {
        title,
        content,
        apartmentId,
      };
    }

    const data = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
        apartment: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    res.json(data);
  } catch (error: any) {
    console.error("Update complaint error:", error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: "Không tìm thấy khiếu nại",
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
      });
    }

    res.status(500).json({
      message: error.message || "Không thể cập nhật khiếu nại",
    });
  }
};

export const deleteComplaint = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    // Kiểm tra complaint tồn tại và quyền truy cập
    const existingComplaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existingComplaint) {
      return res.status(404).json({
        message: "Không tìm thấy khiếu nại",
      });
    }

    // Chỉ user tạo complaint hoặc admin mới được delete
    if (userRole !== 'ADMIN' && existingComplaint.userId !== userId) {
      return res.status(403).json({
        message: "Không có quyền xóa khiếu nại này",
      });
    }

    await prisma.complaint.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Delete complaint error:", error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: "Không tìm thấy khiếu nại",
      });
    }

    res.status(500).json({
      message: "Không thể xóa khiếu nại",
    });
  }
};