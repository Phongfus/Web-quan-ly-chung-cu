import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

const generateApartmentId = (existingIds: string[]) => {
  const numbers = existingIds
    .map((id) => id.match(/^CH(\d{4})$/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => parseInt(match[1], 10));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `CH${nextNumber.toString().padStart(4, "0")}`;
};

const parseOptionalFloat = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim() === "" ? undefined : parseFloat(value);
  }
  if (typeof value === "number") {
    return value;
  }
  return undefined;
};

export const createApartment = async (req: Request, res: Response) => {
  const existingIds = await prisma.apartment.findMany({
    where: {
      id: {
        startsWith: "CH",
      },
    },
    select: {
      id: true,
    },
  });

  const data = {
    ...req.body,
    id: generateApartmentId(existingIds.map((item) => item.id)),
    area: parseOptionalFloat(req.body.area),
    salePrice: parseOptionalFloat(req.body.salePrice),
    rentPrice: parseOptionalFloat(req.body.rentPrice),
  } as any;

  if (data.area === undefined) delete data.area;
  if (data.salePrice === undefined) delete data.salePrice;
  if (data.rentPrice === undefined) delete data.rentPrice;

  const created = await prisma.apartment.create({
    data,
  });

  res.json(created);
};

export const getApartments = async (req: any, res: Response) => {
  try {
    const user = req.user;
    
    // If user is RESIDENT, show only their apartment and empty apartments
    if (user?.role === 'RESIDENT') {
      // Get resident info for this user
      const resident = await prisma.resident.findUnique({
        where: {
          userId: user.id,
        },
      });

      if (!resident) {
        // User is marked as RESIDENT but has no resident record
        return res.json([]);
      }

      // Get user's apartment and all empty apartments
      const data = await prisma.apartment.findMany({
        where: {
          OR: [
            { id: resident.apartmentId }, // User's own apartment
            {
              residents: {
                none: {}, // Empty apartments (no residents)
              },
            },
          ],
        },
        include: {
          floor: true,
          type: true,
          residents: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          id: 'asc',
        },
      });

      return res.json(data);
    }

    // If ADMIN or other roles, show all apartments
    const data = await prisma.apartment.findMany({
      include: {
        floor: true,
        type: true,
        residents: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    res.json(data);
  } catch (error) {
    console.error("Get apartments error:", error);
    res.status(500).json({
      message: "Không thể lấy danh sách căn hộ",
    });
  }
};

export const getAvailableApartments = async (_: Request, res: Response) => {
  try {
    // Lấy danh sách căn hộ chưa có cư dân liên kết
    const data = await prisma.apartment.findMany({
      where: {
        residents: {
          none: {}, // Không có residents nào
        },
      },
      include: {
        floor: true,
        type: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    res.json(data);
  } catch (error) {
    console.error("Get available apartments error:", error);
    res.status(500).json({
      message: "Không thể lấy danh sách căn hộ có sẵn",
    });
  }
};

export const updateApartment = async (req: Request, res: Response) => {
  const data = {
    ...req.body,
    area: parseOptionalFloat(req.body.area),
    salePrice: parseOptionalFloat(req.body.salePrice),
    rentPrice: parseOptionalFloat(req.body.rentPrice),
  } as any;

  if (data.area === undefined) delete data.area;
  if (data.salePrice === undefined) delete data.salePrice;
  if (data.rentPrice === undefined) delete data.rentPrice;

  const id = String(req.params.id);
  const updated = await prisma.apartment.update({
    where: { id },
    data,
  });

  res.json(updated);
};

export const deleteApartment = async (req: Request, res: Response) => {
  const id = String(req.params.id);

  await prisma.apartment.delete({
    where: { id },
  });

  res.status(204).send();
};