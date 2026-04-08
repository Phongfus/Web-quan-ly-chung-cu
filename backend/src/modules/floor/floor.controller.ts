import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

export const getFloors = async (_: Request, res: Response) => {
  const data = await prisma.floor.findMany({
    include: {
      building: true,
    },
  });

  res.json(data);
};