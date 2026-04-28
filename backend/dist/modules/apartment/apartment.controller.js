"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApartment = exports.updateApartment = exports.getAvailableApartments = exports.getApartments = exports.createApartment = void 0;
const prisma_1 = require("../../config/prisma");
const generateApartmentId = (existingIds) => {
    const numbers = existingIds
        .map((id) => id.match(/^CH(\d{4})$/))
        .filter((match) => !!match)
        .map((match) => parseInt(match[1], 10));
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `CH${nextNumber.toString().padStart(4, "0")}`;
};
const parseOptionalFloat = (value) => {
    if (typeof value === "string") {
        return value.trim() === "" ? undefined : parseFloat(value);
    }
    if (typeof value === "number") {
        return value;
    }
    return undefined;
};
const createApartment = async (req, res) => {
    const existingIds = await prisma_1.prisma.apartment.findMany({
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
    };
    if (data.area === undefined)
        delete data.area;
    if (data.salePrice === undefined)
        delete data.salePrice;
    if (data.rentPrice === undefined)
        delete data.rentPrice;
    const created = await prisma_1.prisma.apartment.create({
        data,
    });
    res.json(created);
};
exports.createApartment = createApartment;
const getApartments = async (req, res) => {
    try {
        const user = req.user;
        // If user is RESIDENT, show only their apartment and empty apartments
        if (user?.role === 'RESIDENT') {
            // Get resident info for this user
            const resident = await prisma_1.prisma.resident.findUnique({
                where: {
                    userId: user.id,
                },
            });
            if (!resident) {
                // User is marked as RESIDENT but has no resident record
                return res.json([]);
            }
            // Get user's apartment and all empty apartments
            const data = await prisma_1.prisma.apartment.findMany({
                where: {
                    OR: [
                        { id: resident.apartmentId }, // User's own apartment
                        {
                            residents: {
                                none: {}, // Empty apartments (no residents)
                            },
                        },
                    ],
                },
                include: {
                    floor: true,
                    type: true,
                    residents: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    fullName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    id: 'asc',
                },
            });
            return res.json(data);
        }
        // If ADMIN or other roles, show all apartments
        const data = await prisma_1.prisma.apartment.findMany({
            include: {
                floor: true,
                type: true,
                residents: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                fullName: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                id: 'asc',
            },
        });
        res.json(data);
    }
    catch (error) {
        console.error("Get apartments error:", error);
        res.status(500).json({
            message: "Không thể lấy danh sách căn hộ",
        });
    }
};
exports.getApartments = getApartments;
const getAvailableApartments = async (_, res) => {
    try {
        // Lấy danh sách căn hộ chưa có cư dân liên kết
        const data = await prisma_1.prisma.apartment.findMany({
            where: {
                residents: {
                    none: {}, // Không có residents nào
                },
            },
            include: {
                floor: true,
                type: true,
            },
            orderBy: {
                id: 'asc',
            },
        });
        res.json(data);
    }
    catch (error) {
        console.error("Get available apartments error:", error);
        res.status(500).json({
            message: "Không thể lấy danh sách căn hộ có sẵn",
        });
    }
};
exports.getAvailableApartments = getAvailableApartments;
const updateApartment = async (req, res) => {
    const data = {
        ...req.body,
        area: parseOptionalFloat(req.body.area),
        salePrice: parseOptionalFloat(req.body.salePrice),
        rentPrice: parseOptionalFloat(req.body.rentPrice),
    };
    if (data.area === undefined)
        delete data.area;
    if (data.salePrice === undefined)
        delete data.salePrice;
    if (data.rentPrice === undefined)
        delete data.rentPrice;
    const id = String(req.params.id);
    const updated = await prisma_1.prisma.apartment.update({
        where: { id },
        data,
    });
    res.json(updated);
};
exports.updateApartment = updateApartment;
const deleteApartment = async (req, res) => {
    const id = String(req.params.id);
    await prisma_1.prisma.apartment.delete({
        where: { id },
    });
    res.status(204).send();
};
exports.deleteApartment = deleteApartment;
