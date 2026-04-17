import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const generateServiceId = async () => {
  const existingIds = await prisma.serviceRequest.findMany({
    where: {
      id: {
        startsWith: "SC",
      },
    },
    select: {
      id: true,
    },
  });

  const numbers = existingIds
    .map((item) => item.id.match(/^SC(\d{4})$/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => parseInt(match[1], 10))
    .sort((a, b) => a - b);

  let nextNumber = 1;
  for (const number of numbers) {
    if (number !== nextNumber) {
      break;
    }
    nextNumber += 1;
  }

  return `SC${nextNumber.toString().padStart(4, "0")}`;
};

// Tạo yêu cầu dịch vụ mới
export const createService = async (req: AuthRequest, res: Response) => {
  try {
    let { apartmentId, type, description } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // Validate required fields
    if (!type || !description) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc: type, description",
      });
    }

    // Lấy thông tin user để check role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Nếu là resident và không có apartmentId, tự động lấy từ resident record
    if (user.role === "RESIDENT" && !apartmentId) {
      const resident = await prisma.resident.findUnique({
        where: { userId },
        select: { apartmentId: true },
      });

      if (!resident) {
        return res.status(404).json({
          message: "Không tìm thấy thông tin cư dân",
        });
      }

      apartmentId = resident.apartmentId;
    }

    // Validate apartmentId (bắt buộc cho admin, resident sẽ tự động lấy)
    if (!apartmentId) {
      return res.status(400).json({
        message: "Thiếu thông tin apartmentId",
      });
    }

    const serviceId = await generateServiceId();

    const data = await prisma.serviceRequest.create({
      data: {
        id: serviceId,
        apartmentId,
        userId,
        description,
        type,
        status: "PENDING",
      },
      include: {
        apartment: {
          select: {
            code: true,
          },
        },
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(data);
  } catch (error: any) {
    console.error("Create service error:", error);
    res.status(500).json({
      message: error.message || "Không thể tạo yêu cầu dịch vụ",
    });
  }
};

// Lấy danh sách dịch vụ
export const getServices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Lấy thông tin user để check role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let whereCondition: any = {};

    if (user.role === "RESIDENT") {

      // lấy apartment của resident
      const resident = await prisma.resident.findUnique({
        where: { userId },
        select: { apartmentId: true },
      });

      if (!resident) {
        return res.status(404).json({
          message: "Không tìm thấy thông tin cư dân",
        });
      }

      // Resident xem tất cả service của căn hộ mình
      whereCondition.apartmentId = resident.apartmentId;
    }

    const data = await prisma.serviceRequest.findMany({
      where: whereCondition,
      include: {
        apartment: {
          select: {
            code: true,
          },
        },
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(data);
  } catch (error) {
    console.error("Get services error:", error);

    res.status(500).json({
      message: "Không thể lấy danh sách dịch vụ",
    });
  }
};

// Lấy chi tiết dịch vụ
export const getServiceById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Lấy thông tin user để check role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const id = req.params.id as string;

    const data = await prisma.serviceRequest.findUnique({
      where: { id },

      include: {
        apartment: true,

        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!data) {
      return res.status(404).json({
        message: "Không tìm thấy yêu cầu",
      });
    }

    // Resident chỉ xem được request của chính mình
    if (user.role === "RESIDENT" && data.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(data);
  } catch (error) {
    console.error("Get service error:", error);

    res.status(500).json({
      message: "Không thể lấy thông tin yêu cầu",
    });
  }
};

// Cập nhật dịch vụ
export const updateService = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Lấy thông tin user để check role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const id = req.params.id as string;

    // Kiểm tra quyền sở hữu service request
    const existingService = await prisma.serviceRequest.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingService) {
      return res.status(404).json({ message: "Service request not found" });
    }

    // Resident chỉ có thể cập nhật service của chính mình
    if (user.role === "RESIDENT" && existingService.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status, description, type } = req.body;

    // Chuẩn bị data để update
    const updateData: any = {
      description,
      type,
    };

    // Chỉ admin mới có thể cập nhật status
    if (user.role !== "RESIDENT" && status) {
      updateData.status = status;
    }

    const data = await prisma.serviceRequest.update({
      where: { id },
      data: updateData,
      include: {
        apartment: {
          select: {
            code: true,
          },
        },
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.json(data);
  } catch (error) {
    console.error("Update service error:", error);
    res.status(500).json({
      message: "Không thể cập nhật yêu cầu",
    });
  }
};

// Xóa dịch vụ
export const deleteService = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Lấy thông tin user để check role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const id = req.params.id as string;

    // Kiểm tra quyền sở hữu service request
    const existingService = await prisma.serviceRequest.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingService) {
      return res.status(404).json({ message: "Service request not found" });
    }

    // Resident chỉ có thể xóa service của chính mình
    if (user.role === "RESIDENT" && existingService.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await prisma.serviceRequest.delete({
      where: { id },
    });

    res.json({
      message: "Đã xóa yêu cầu dịch vụ",
    });
  } catch (error) {
    console.error("Delete service error:", error);

    res.status(500).json({
      message: "Không thể xóa yêu cầu",
    });
  }
};