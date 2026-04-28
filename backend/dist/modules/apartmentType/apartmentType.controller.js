"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApartmentTypes = void 0;
const prisma_1 = require("../../config/prisma");
const getApartmentTypes = async (_, res) => {
    const data = await prisma_1.prisma.apartmentType.findMany();
    res.json(data);
};
exports.getApartmentTypes = getApartmentTypes;
