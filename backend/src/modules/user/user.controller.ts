import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { hashPassword } from "../../utils/hash";

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