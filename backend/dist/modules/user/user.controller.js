"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResident = exports.getUsers = void 0;
const prisma_1 = require("../../config/prisma");
const hash_1 = require("../../utils/hash");
const crypto_1 = require("crypto");
const getUsers = async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    // ADMIN thấy danh sách cư dân
    if (user.role === "ADMIN") {
        const residents = await prisma_1.prisma.user.findMany({
            where: { role: "RESIDENT" },
            select: {
                id: true,
                fullName: true,
                phone: true,
                role: true
            }
        });
        return res.json(residents);
    }
    // RESIDENT chỉ thấy admin để chat
    if (user.role === "RESIDENT") {
        const admins = await prisma_1.prisma.user.findMany({
            where: { role: "ADMIN" },
            select: {
                id: true,
                fullName: true,
                phone: true,
                role: true
            }
        });
        return res.json(admins);
    }
    return res.status(403).json({ message: "Access denied" });
};
exports.getUsers = getUsers;
const createResident = async (req, res) => {
    const { email, password, fullName, apartmentId } = req.body;
    const hashed = await (0, hash_1.hashPassword)(password);
    const user = await prisma_1.prisma.user.create({
        data: {
            email,
            password: hashed,
            fullName,
            role: "RESIDENT",
            resident: {
                create: {
                    id: (0, crypto_1.randomUUID)(),
                    apartment: {
                        connect: {
                            id: apartmentId
                        }
                    }
                }
            }
        },
    });
    res.json(user);
};
exports.createResident = createResident;
