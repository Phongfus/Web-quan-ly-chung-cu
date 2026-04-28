"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComplaint = exports.updateComplaint = exports.createComplaint = exports.getComplaintById = exports.getComplaints = void 0;
const prisma_1 = require("../../config/prisma");
const generateComplaintId = (existingIds) => {
    const numbers = existingIds
        .map((id) => id.match(/^KN(\d{4})$/))
        .filter((match) => !!match)
        .map((match) => parseInt(match[1], 10));
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `KN${nextNumber.toString().padStart(4, "0")}`;
};
const getComplaints = async (req, res) => {
    try {
        const userRole = req.user?.role;
        const userId = req.user?.id;
        let whereCondition = {};
        if (userRole !== 'ADMIN') {
            // Nếu không phải admin, chỉ lấy complaint của user hiện tại
            whereCondition = { userId: userId };
        }
        const data = await prisma_1.prisma.complaint.findMany({
            where: whereCondition,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        phone: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        code: true,
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
        console.error("Get complaints error:", error);
        res.status(500).json({
            message: "Không thể lấy danh sách khiếu nại",
        });
    }
};
exports.getComplaints = getComplaints;
const getComplaintById = async (req, res) => {
    try {
        const id = req.params.id;
        const userRole = req.user?.role;
        const userId = req.user?.id;
        const data = await prisma_1.prisma.complaint.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        phone: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        code: true,
                    },
                },
            },
        });
        if (!data) {
            return res.status(404).json({
                message: "Không tìm thấy khiếu nại",
            });
        }
        // Chỉ user tạo complaint hoặc admin mới được xem chi tiết
        if (userRole !== 'ADMIN' && data.userId !== userId) {
            return res.status(403).json({
                message: "Không có quyền xem khiếu nại này",
            });
        }
        res.json(data);
    }
    catch (error) {
        console.error("Get complaint by id error:", error);
        res.status(500).json({
            message: "Không thể lấy thông tin khiếu nại",
        });
    }
};
exports.getComplaintById = getComplaintById;
const createComplaint = async (req, res) => {
    try {
        const { title, content, apartmentId } = req.body;
        const userId = req.user?.id;
        // Kiểm tra dữ liệu bắt buộc
        if (!title || !content || !apartmentId) {
            return res.status(400).json({
                message: "Thiếu dữ liệu bắt buộc: title, content, apartmentId",
            });
        }
        // Kiểm tra căn hộ có tồn tại
        const apartment = await prisma_1.prisma.apartment.findUnique({
            where: { id: apartmentId },
        });
        if (!apartment) {
            return res.status(404).json({
                message: "Căn hộ không tồn tại",
            });
        }
        // Tạo ID khiếu nại tự động (KN0001, KN0002, ...)
        const existingIds = await prisma_1.prisma.complaint.findMany({
            where: {
                id: {
                    startsWith: "KN",
                },
            },
            select: {
                id: true,
            },
        });
        const complaintId = generateComplaintId(existingIds.map((item) => item.id));
        const data = await prisma_1.prisma.complaint.create({
            data: {
                id: complaintId,
                title,
                content,
                apartmentId,
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        phone: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        code: true,
                    },
                },
            },
        });
        res.status(201).json(data);
    }
    catch (error) {
        console.error("Create complaint error:", error);
        if (error.code === 'P2003') {
            return res.status(400).json({
                message: "Dữ liệu không hợp lệ",
            });
        }
        res.status(500).json({
            message: error.message || "Không thể tạo khiếu nại",
        });
    }
};
exports.createComplaint = createComplaint;
const updateComplaint = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, content, apartmentId, status } = req.body;
        const userRole = req.user?.role;
        const userId = req.user?.id;
        // Kiểm tra complaint tồn tại và quyền truy cập
        const existingComplaint = await prisma_1.prisma.complaint.findUnique({
            where: { id },
        });
        if (!existingComplaint) {
            return res.status(404).json({
                message: "Không tìm thấy khiếu nại",
            });
        }
        // Chỉ user tạo complaint hoặc admin mới được update
        if (userRole !== 'ADMIN' && existingComplaint.userId !== userId) {
            return res.status(403).json({
                message: "Không có quyền cập nhật khiếu nại này",
            });
        }
        // Admin có thể update tất cả, user chỉ update title, content, apartmentId
        let updateData = {};
        if (userRole === 'ADMIN') {
            updateData = {
                title,
                content,
                apartmentId,
                status,
            };
        }
        else {
            updateData = {
                title,
                content,
                apartmentId,
            };
        }
        const data = await prisma_1.prisma.complaint.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        phone: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        code: true,
                    },
                },
            },
        });
        res.json(data);
    }
    catch (error) {
        console.error("Update complaint error:", error);
        if (error.code === 'P2025') {
            return res.status(404).json({
                message: "Không tìm thấy khiếu nại",
            });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({
                message: "Dữ liệu không hợp lệ",
            });
        }
        res.status(500).json({
            message: error.message || "Không thể cập nhật khiếu nại",
        });
    }
};
exports.updateComplaint = updateComplaint;
const deleteComplaint = async (req, res) => {
    try {
        const id = req.params.id;
        const userRole = req.user?.role;
        const userId = req.user?.id;
        // Kiểm tra complaint tồn tại và quyền truy cập
        const existingComplaint = await prisma_1.prisma.complaint.findUnique({
            where: { id },
        });
        if (!existingComplaint) {
            return res.status(404).json({
                message: "Không tìm thấy khiếu nại",
            });
        }
        // Chỉ user tạo complaint hoặc admin mới được delete
        if (userRole !== 'ADMIN' && existingComplaint.userId !== userId) {
            return res.status(403).json({
                message: "Không có quyền xóa khiếu nại này",
            });
        }
        await prisma_1.prisma.complaint.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error("Delete complaint error:", error);
        if (error.code === 'P2025') {
            return res.status(404).json({
                message: "Không tìm thấy khiếu nại",
            });
        }
        res.status(500).json({
            message: "Không thể xóa khiếu nại",
        });
    }
};
exports.deleteComplaint = deleteComplaint;
