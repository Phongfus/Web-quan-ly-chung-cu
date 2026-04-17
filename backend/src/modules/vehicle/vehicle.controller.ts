import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

// Lấy danh sách phương tiện
export const getVehicles = async (req: AuthRequest, res: Response) => {
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
      // Resident chỉ xem được phương tiện của căn hộ mình
      const resident = await prisma.resident.findUnique({
        where: { userId },
        select: { apartmentId: true },
      });

      if (!resident) {
        return res.status(404).json({ message: "Resident not found" });
      }

      whereCondition.apartmentId = resident.apartmentId;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: whereCondition,
      include: {
        apartment: {
          select: {
            code: true,
          },
        },
        owner: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.json(vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Tạo phương tiện mới
export const createVehicle = async (req: AuthRequest, res: Response) => {
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

    if (user.role === "RESIDENT") {
      return res.status(403).json({ message: "Residents cannot create vehicles" });
    }

    const { ownerId, apartmentId, type, licensePlate } = req.body;

    // Tạo ID tự động dạng PT0001, PT0002, ...
    const lastVehicle = await prisma.vehicle.findFirst({
      where: {
        id: {
          startsWith: 'PT',
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastVehicle) {
      const lastNumber = parseInt(lastVehicle.id.substring(2));
      nextNumber = lastNumber + 1;
    }

    const newId = `PT${nextNumber.toString().padStart(4, '0')}`;

    const vehicle = await prisma.vehicle.create({
      data: {
        id: newId,
        ownerId,
        apartmentId,
        type,
        licensePlate,
      },
      include: {
        apartment: {
          select: {
            code: true,
          },
        },
        owner: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error("Error creating vehicle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Cập nhật phương tiện
export const updateVehicle = async (req: AuthRequest, res: Response) => {
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

    if (user.role === "RESIDENT") {
      return res.status(403).json({ message: "Residents cannot update vehicles" });
    }

    const id = Array.isArray(req.params.id)? req.params.id[0]: req.params.id;
    const { ownerId, apartmentId, type, licensePlate } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ownerId,
        apartmentId,
        type,
        licensePlate,
      },
      include: {
        apartment: {
          select: {
            code: true,
          },
        },
        owner: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.json(vehicle);
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Xóa phương tiện
export const deleteVehicle = async (req: AuthRequest, res: Response) => {
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

    if (user.role === "RESIDENT") {
      return res.status(403).json({ message: "Residents cannot delete vehicles" });
    }

    const id = Array.isArray(req.params.id)? req.params.id[0]: req.params.id;

    await prisma.vehicle.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};