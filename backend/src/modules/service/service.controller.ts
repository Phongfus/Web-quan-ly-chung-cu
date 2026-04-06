import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

// Tạo yêu cầu dịch vụ mới
export const createService = async (req: AuthRequest, res: Response) => {
  try {
    const { apartmentId, type, description, title } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const data = await prisma.serviceRequest.create({
      data: {
        apartmentId,
        userId,
        title,
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
  } catch (error) {
    console.error("Create service error:", error);

    res.status(500).json({
      message: "Không thể tạo yêu cầu dịch vụ",
    });
  }
};

// Lấy danh sách dịch vụ
export const getServices = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.serviceRequest.findMany({
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
export const getServiceById = async (req: Request, res: Response) => {
  try {
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

    res.json(data);
  } catch (error) {
    console.error("Get service error:", error);

    res.status(500).json({
      message: "Không thể lấy thông tin yêu cầu",
    });
  }
};

// Cập nhật dịch vụ
export const updateService = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const { status, description, title } = req.body;

    const data = await prisma.serviceRequest.update({
      where: { id },

      data: {
        status,
        description,
        title,
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

    res.json(data);
  } catch (error) {
    console.error("Update service error:", error);

    res.status(500).json({
      message: "Không thể cập nhật yêu cầu",
    });
  }
};

// Xóa dịch vụ
export const deleteService = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

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