import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { hashPassword } from "../../utils/hash";
import { generateNextResidentId } from "../../utils/resident-id";

// Lấy danh sách cư dân
export const getResidents = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.resident.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            isActive: true,
          },
        },
        apartment: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(data);
  } catch (error) {
    console.error("Get residents error:", error);
    res.status(500).json({
      message: "Không thể lấy danh sách cư dân",
    });
  }
};

// Lấy chi tiết cư dân
export const getResidentById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const data = await prisma.resident.findUnique({
      where: { id: String(id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            isActive: true,
          },
        },
        apartment: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
        vehicles: true,
      },
    });

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy cư dân",
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Get resident error:", error);
    res.status(500).json({
      message: "Không thể lấy thông tin cư dân",
    });
  }
};

// Tạo cư dân mới
export const createResident = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone, apartmentId, identityCard, dateOfBirth } = req.body;

    // Kiểm tra dữ liệu bắt buộc
    if (!email || !password || !fullName || !apartmentId) {
      return res.status(400).json({
        message: "Thiếu dữ liệu bắt buộc: email, password, fullName, apartmentId",
      });
    }

    // Tạo user và resident trong một transaction
    const data = await prisma.$transaction(async (tx) => {
      const hashedPassword = await hashPassword(password);

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          phone: phone || null,
          role: "RESIDENT",
        },
      });

      // Sinh ID cư dân tự động (CD0001, CD0002, ...)
      const residentId = await generateNextResidentId();

      const resident = await tx.resident.create({
        data: {
          id: residentId,
          userId: user.id,
          apartmentId,
          identityCard: identityCard || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              isActive: true,
            },
          },
          apartment: {
            select: {
              id: true,
              code: true,
              status: true,
            },
          },
        },
      });

      return resident;
    });

    res.status(201).json(data);
  } catch (error: any) {
    console.error("Create resident error:", error);
    
    // Xử lý các lỗi cụ thể
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: "Email này đã được sử dụng",
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: "Căn hộ không tồn tại",
      });
    }

    res.status(500).json({
      message: error.message || "Không thể tạo cư dân",
    });
  }
};

// Cập nhật cư dân
export const updateResident = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { fullName, phone, apartmentId, identityCard, dateOfBirth, isActive } = req.body;

    const data = await prisma.$transaction(async (tx) => {
      // Cập nhật thông tin user
      const resident = await tx.resident.findUnique({
        where: { id: String(id) },
        select: { userId: true },
      });

      if (!resident) {
        throw new Error("Resident not found");
      }

      await tx.user.update({
        where: { id: resident.userId },
        data: {
          fullName,
          phone,
          isActive,
        },
      });

      // Cập nhật thông tin resident
      const updatedResident = await tx.resident.update({
        where: { id: String(id) },
        data: {
          apartmentId,
          identityCard,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              isActive: true,
            },
          },
          apartment: {
            select: {
              id: true,
              code: true,
              status: true,
            },
          },
        },
      });

      return updatedResident;
    });

    res.json(data);
  } catch (error) {
    console.error("Update resident error:", error);
    res.status(500).json({
      message: "Không thể cập nhật cư dân",
    });
  }
};

// Xóa cư dân
export const deleteResident = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.$transaction(async (tx) => {
      const resident = await tx.resident.findUnique({
        where: { id: String(id) },
        select: { userId: true },
      });

      if (!resident) {
        throw new Error("Resident not found");
      }

      // Xóa resident trước (do ràng buộc khóa ngoại)
      await tx.resident.delete({
        where: { id: String(id) },
      });

      // Xóa user
      await tx.user.delete({
        where: { id: resident.userId },
      });
    });

    res.json({
      message: "Đã xóa cư dân thành công",
    });
  } catch (error) {
    console.error("Delete resident error:", error);
    res.status(500).json({
      message: "Không thể xóa cư dân",
    });
  }
};
