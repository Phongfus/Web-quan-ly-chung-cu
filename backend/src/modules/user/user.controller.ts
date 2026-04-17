import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { hashPassword } from "../../utils/hash";

export const getUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json(users);
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
          apartmentId,
        },
      },
    },
  });

  res.json(user);
};