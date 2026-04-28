"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.login = void 0;
const prisma_1 = require("../../config/prisma");
const hash_1 = require("../../utils/hash");
const jwt_1 = require("../../utils/jwt");
const login = async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }
    if (!user.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
    }
    const isValid = await (0, hash_1.comparePassword)(password, user.password);
    if (!isValid) {
        return res.status(400).json({ message: "Wrong password" });
    }
    const token = (0, jwt_1.signToken)({
        id: user.id,
        role: user.role,
    });
    res.json({ token });
};
exports.login = login;
const me = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await prisma_1.prisma.user.findUnique({
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
exports.me = me;
