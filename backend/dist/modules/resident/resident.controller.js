"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteResident = exports.updateResident = exports.createResident = exports.getResidentById = exports.getResidents = exports.getCurrentResident = void 0;
const prisma_1 = require("../../config/prisma");
const hash_1 = require("../../utils/hash");
const resident_id_1 = require("../../utils/resident-id");
// Lấy thông tin resident của user hiện tại
const getCurrentResident = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const data = await prisma_1.prisma.resident.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        phone: true,
                        isActive: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        code: true,
                        status: true,
                    },
                },
            },
        });
        if (!data) {
            return res.status(404).json({
                message: "Không tìm thấy thông tin cư dân",
            });
        }
        res.json(data);
    }
    catch (error) {
        console.error("Get current resident error:", error);
        res.status(500).json({
            message: "Không thể lấy thông tin cư dân",
        });
    }
};
exports.getCurrentResident = getCurrentResident;
// Lấy danh sách cư dân
const getResidents = async (req, res) => {
    try {
        const userRole = req.user?.role;
        const userId = req.user?.id;
        let whereCondition = {};
        if (userRole !== 'ADMIN') {
            // Nếu không phải admin, chỉ lấy resident của user hiện tại
            whereCondition = { userId: userId };
        }
        const data = await prisma_1.prisma.resident.findMany({
            where: whereCondition,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        phone: true,
                        isActive: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        code: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.json(data);
    }
    catch (error) {
        console.error("Get residents error:", error);
        res.status(500).json({
            message: "Không thể lấy danh sách cư dân",
        });
    }
};
exports.getResidents = getResidents;
// Lấy chi tiết cư dân
const getResidentById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await prisma_1.prisma.resident.findUnique({
            where: { id: String(id) },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        phone: true,
                        isActive: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        code: true,
                        status: true,
                    },
                },
                vehicles: true,
            },
        });
        if (!data) {
            return res.status(404).json({
                message: "Không tìm thấy cư dân",
            });
        }
        res.json(data);
    }
    catch (error) {
        console.error("Get resident error:", error);
        res.status(500).json({
            message: "Không thể lấy thông tin cư dân",
        });
    }
};
exports.getResidentById = getResidentById;
// Tạo cư dân mới
const createResident = async (req, res) => {
    try {
        const { email, password, fullName, phone, apartmentId, identityCard, dateOfBirth, apartmentStatus } = req.body;
        // Kiểm tra dữ liệu bắt buộc
        if (!email || !password || !fullName || !apartmentId) {
            return res.status(400).json({
                message: "Thiếu dữ liệu bắt buộc: email, password, fullName, apartmentId",
            });
        }
        // Kiểm tra apartmentStatus hợp lệ
        if (!apartmentStatus || !['RENTED', 'SOLD'].includes(apartmentStatus)) {
            return res.status(400).json({
                message: "Trạng thái căn hộ không hợp lệ. Chỉ chấp nhận RENTED hoặc SOLD",
            });
        }
        // Kiểm tra căn hộ có tồn tại
        const apartment = await prisma_1.prisma.apartment.findUnique({
            where: { id: apartmentId },
            include: { residents: { select: { id: true } } },
        });
        if (!apartment) {
            return res.status(404).json({
                message: "Căn hộ không tồn tại",
            });
        }
        // Kiểm tra căn hộ đã có cư dân chưa
        if (apartment.residents.length > 0) {
            return res.status(409).json({
                message: "Căn hộ này đã có cư dân liên kết rồi",
            });
        }
        // Tạo user và resident trong một transaction
        const data = await prisma_1.prisma.$transaction(async (tx) => {
            const hashedPassword = await (0, hash_1.hashPassword)(password);
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    fullName,
                    phone: phone || null,
                    role: "RESIDENT",
                },
            });
            // Sinh ID cư dân tự động (CD0001, CD0002, ...)
            const residentId = await (0, resident_id_1.generateNextResidentId)();
            const resident = await tx.resident.create({
                data: {
                    id: residentId,
                    userId: user.id,
                    apartmentId,
                    identityCard: identityCard || null,
                    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            fullName: true,
                            phone: true,
                            isActive: true,
                        },
                    },
                    apartment: {
                        select: {
                            id: true,
                            code: true,
                            status: true,
                        },
                    },
                },
            });
            // Cập nhật trạng thái căn hộ
            await tx.apartment.update({
                where: { id: apartmentId },
                data: { status: apartmentStatus },
            });
            return resident;
        });
        res.status(201).json(data);
    }
    catch (error) {
        console.error("Create resident error:", error);
        // Xử lý các lỗi cụ thể
        if (error.code === 'P2002') {
            return res.status(409).json({
                message: "Email này đã được sử dụng",
            });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({
                message: "Căn hộ không tồn tại",
            });
        }
        res.status(500).json({
            message: error.message || "Không thể tạo cư dân",
        });
    }
};
exports.createResident = createResident;
// Cập nhật cư dân
const updateResident = async (req, res) => {
    try {
        const id = req.params.id;
        const { fullName, phone, apartmentId, identityCard, dateOfBirth, isActive, apartmentStatus } = req.body;
        const data = await prisma_1.prisma.$transaction(async (tx) => {
            // Cập nhật thông tin user
            const resident = await tx.resident.findUnique({
                where: { id: String(id) },
                select: { userId: true, apartmentId: true },
            });
            if (!resident) {
                throw new Error("Resident not found");
            }
            // Nếu thay đổi căn hộ, kiểm tra căn hộ mới có trống không
            if (apartmentId && apartmentId !== resident.apartmentId) {
                const newApartment = await tx.apartment.findUnique({
                    where: { id: apartmentId },
                    include: { residents: { select: { id: true } } },
                });
                if (!newApartment) {
                    throw new Error("Căn hộ không tồn tại");
                }
                if (newApartment.residents.length > 0) {
                    throw new Error("Căn hộ này đã có cư dân liên kết rồi");
                }
            }
            await tx.user.update({
                where: { id: resident.userId },
                data: {
                    fullName,
                    phone,
                    isActive,
                },
            });
            // Cập nhật thông tin resident
            const updatedResident = await tx.resident.update({
                where: { id: String(id) },
                data: {
                    apartmentId,
                    identityCard,
                    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            fullName: true,
                            phone: true,
                            isActive: true,
                        },
                    },
                    apartment: {
                        select: {
                            id: true,
                            code: true,
                            status: true,
                        },
                    },
                },
            });
            // Cập nhật trạng thái căn hộ nếu có
            if (apartmentStatus && apartmentId) {
                await tx.apartment.update({
                    where: { id: apartmentId },
                    data: { status: apartmentStatus },
                });
            }
            return updatedResident;
        });
        res.json(data);
    }
    catch (error) {
        console.error("Update resident error:", error);
        // Xử lý các lỗi cụ thể
        if (error.message === "Căn hộ này đã có cư dân liên kết rồi") {
            return res.status(409).json({
                message: "Căn hộ này đã có cư dân liên kết rồi",
            });
        }
        if (error.message === "Căn hộ không tồn tại") {
            return res.status(404).json({
                message: "Căn hộ không tồn tại",
            });
        }
        if (error.message === "Resident not found") {
            return res.status(404).json({
                message: "Không tìm thấy cư dân",
            });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({
                message: "Căn hộ này đã được liên kết với một cư dân khác",
            });
        }
        res.status(500).json({
            message: error.message || "Không thể cập nhật cư dân",
        });
    }
};
exports.updateResident = updateResident;
// Xóa cư dân
const deleteResident = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.prisma.$transaction(async (tx) => {
            const resident = await tx.resident.findUnique({
                where: { id: String(id) },
                select: { userId: true },
            });
            if (!resident) {
                throw new Error("Resident not found");
            }
            // Xóa resident trước (do ràng buộc khóa ngoại)
            await tx.resident.delete({
                where: { id: String(id) },
            });
            // Xóa user
            await tx.user.delete({
                where: { id: resident.userId },
            });
        });
        res.json({
            message: "Đã xóa cư dân thành công",
        });
    }
    catch (error) {
        console.error("Delete resident error:", error);
        res.status(500).json({
            message: "Không thể xóa cư dân",
        });
    }
};
exports.deleteResident = deleteResident;
