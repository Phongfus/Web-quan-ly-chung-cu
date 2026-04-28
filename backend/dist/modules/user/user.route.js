"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const router = (0, express_1.Router)();
// cho ADMIN + RESIDENT xem danh sách user (để chat)
router.get("/", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(["ADMIN", "RESIDENT"]), user_controller_1.getUsers);
// chỉ ADMIN được tạo cư dân
router.post("/create-resident", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("ADMIN"), user_controller_1.createResident);
exports.default = router;
