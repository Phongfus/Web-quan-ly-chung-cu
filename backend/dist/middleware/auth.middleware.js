"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = require("../config/prisma");
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = decoded;
        // Kiểm tra user còn active không
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { isActive: true },
        });
        if (!user || !user.isActive) {
            return res.status(403).json({ message: "Account is deactivated" });
        }
        next();
    }
    catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
};
exports.authMiddleware = authMiddleware;
