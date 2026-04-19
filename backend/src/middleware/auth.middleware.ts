import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/prisma";

export const authMiddleware = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    // Kiểm tra user còn active không
    const user = await prisma.user.findUnique({
      where: { id: (decoded as any).id },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};