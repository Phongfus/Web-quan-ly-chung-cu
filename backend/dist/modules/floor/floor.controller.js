"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFloors = void 0;
const prisma_1 = require("../../config/prisma");
const getFloors = async (_, res) => {
    const data = await prisma_1.prisma.floor.findMany({
        include: {
            building: true,
        },
    });
    res.json(data);
};
exports.getFloors = getFloors;
