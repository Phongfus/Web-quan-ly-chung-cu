"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "User not found in request" });
        }
        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}, Your role: ${userRole}`
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
