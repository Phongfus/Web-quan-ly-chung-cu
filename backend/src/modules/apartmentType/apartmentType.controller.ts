import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

export const getApartmentTypes = async (_: Request, res: Response) => {
  const data = await prisma.apartmentType.findMany();

  res.json(data);
};