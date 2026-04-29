"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// --- IMPORT CÁC ROUTES ---
const auth_route_1 = __importDefault(require("./modules/auth/auth.route"));
const user_route_1 = __importDefault(require("./modules/user/user.route"));
const apartment_route_1 = __importDefault(require("./modules/apartment/apartment.route"));
const floor_route_1 = __importDefault(require("./modules/floor/floor.route"));
const apartmentType_route_1 = __importDefault(require("./modules/apartmentType/apartmentType.route"));
const dashboard_route_1 = __importDefault(require("./modules/dashboard/dashboard.route")); // Route Dashboard dùng chung
const service_route_1 = __importDefault(require("./modules/service/service.route"));
const resident_route_1 = __importDefault(require("./modules/resident/resident.route"));
const bill_route_1 = __importDefault(require("./modules/bill/bill.route"));
const message_route_1 = __importDefault(require("./modules/message/message.route"));
const vehicle_route_1 = __importDefault(require("./modules/vehicle/vehicle.route"));
const complaint_route_1 = __importDefault(require("./modules/complaint/complaint.route"));
const notification_route_1 = __importDefault(require("./modules/notification/notification.route"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
// --- MIDDLEWARE ---
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- ĐĂNG KÝ API ROUTES ---
app.use("/api/auth", auth_route_1.default);
app.use("/api/user", user_route_1.default);
app.use("/api/apartments", apartment_route_1.default);
app.use("/api/floors", floor_route_1.default);
app.use("/api/apartment-types", apartmentType_route_1.default);
/**
 * QUAN TRỌNG:
 * Sử dụng duy nhất 1 route cho Dashboard.
 * Logic phân quyền đã được gộp trong dashboard.controller.ts
 */
app.use("/api/dashboard", dashboard_route_1.default);
app.use("/api/services", service_route_1.default);
app.use("/api/residents", resident_route_1.default);
app.use("/api/bills", bill_route_1.default);
app.use("/api/vehicles", vehicle_route_1.default);
app.use("/api/messages", message_route_1.default);
app.use("/api/complaints", complaint_route_1.default);
app.use("/api/notifications", notification_route_1.default);
// Route mặc định kiểm tra server
app.get("/", (req, res) => {
    res.send("API đang chạy bình thường...");
});
// --- XỬ LÝ LỖI (ErrorHandler luôn phải ở cuối cùng) ---
app.use(error_middleware_1.errorHandler);
exports.default = app;
