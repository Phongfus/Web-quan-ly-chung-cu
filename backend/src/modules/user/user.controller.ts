import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { hashPassword } from "../../utils/hash";
import { randomUUID } from "crypto";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const getUsers = async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // ADMIN thấy danh sách cư dân
  if (user.role === "ADMIN") {
    const residents = await prisma.user.findMany({
      where: { role: "RESIDENT" },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true
      }
    });

    return res.json(residents);
  }

  // RESIDENT chỉ thấy admin để chat
  if (user.role === "RESIDENT") {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true
      }
    });

    return res.json(admins);
  }

  return res.status(403).json({ message: "Access denied" });
};
export const createResident = async (req: Request, res: Response) => {
  const { email, password, fullName, apartmentId } = req.body;

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      fullName,
      role: "RESIDENT",

      resident: {
        create: {
          id: randomUUID(),
          apartment: {
            connect: {
              id: apartmentId
            }
          }
        }
      }

    },
  });

  res.json(user);
};