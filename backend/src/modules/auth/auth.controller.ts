import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { comparePassword } from "../../utils/hash";
import { signToken } from "../../utils/jwt";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: "Account is deactivated" });
  }

  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    return res.status(400).json({ message: "Wrong password" });
  }

  const token = signToken({
    id: user.id,
    role: user.role,
  });

  res.json({ token });
};

export const me = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
};
