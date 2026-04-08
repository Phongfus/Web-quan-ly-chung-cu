import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

const generateApartmentId = (existingIds: string[]) => {
  const numbers = existingIds
    .map((id) => id.match(/^CH(\d{3})$/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => parseInt(match[1], 10));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `CH${nextNumber.toString().padStart(3, "0")}`;
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

export const getApartments = async (_: Request, res: Response) => {
  const data = await prisma.apartment.findMany({
    include: {
      floor: true,
      type: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  res.json(data);
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