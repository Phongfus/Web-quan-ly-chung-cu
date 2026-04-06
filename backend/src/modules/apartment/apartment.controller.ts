import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

export const createApartment = async (req: Request, res: Response) => {
  const data = await prisma.apartment.create({
    data: req.body,
  });

  res.json(data);
};

export const getApartments = async (_: Request, res: Response) => {
  const data = await prisma.apartment.findMany({
    include: {
      floor: true,
      type: true,
    },
  });

  res.json(data);
};