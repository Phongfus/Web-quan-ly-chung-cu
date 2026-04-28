"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillsByApartment = exports.deleteBill = exports.updateBill = exports.createBill = exports.getBillById = exports.getBills = void 0;
const prisma_1 = require("../../config/prisma");
// Lấy danh sách hóa đơn
const getBills = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Lấy thông tin user để check role
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let whereCondition = {};
        if (user.role === "RESIDENT") {
            // Lấy resident của user
            const resident = await prisma_1.prisma.resident.findUnique({
                where: { userId },
                select: { apartmentId: true },
            });
            if (!resident) {
                return res.status(404).json({ message: "Resident not found" });
            }
            whereCondition.apartmentId = resident.apartmentId;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        // 🔍 Cập nhật status UNPAID → OVERDUE nếu quá hạn
        await prisma_1.prisma.bill.updateMany({
            where: {
                status: "UNPAID",
                dueDate: {
                    lt: today,
                },
                ...whereCondition, // Chỉ update bills của resident nếu là resident
            },
            data: {
                status: "OVERDUE",
            },
        });
        // 🟡 Cập nhật status UNPAID → UPCOMING_OVERDUE nếu còn 3 ngày
        await prisma_1.prisma.bill.updateMany({
            where: {
                status: "UNPAID",
                dueDate: {
                    gte: today,
                    lte: threeDaysLater,
                },
                ...whereCondition,
            },
            data: {
                status: "UPCOMING_OVERDUE",
            },
        });
        const data = await prisma_1.prisma.bill.findMany({
            where: whereCondition,
            include: {
                apartment: {
                    select: {
                        id: true,
                        code: true,
                    },
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        method: true,
                        status: true,
                        createdAt: true,
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
        console.error("Get bills error:", error);
        res.status(500).json({
            message: "Không thể lấy danh sách hóa đơn",
        });
    }
};
exports.getBills = getBills;
// Lấy chi tiết hóa đơn
const getBillById = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Lấy thông tin user để check role
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const id = req.params.id;
        // Nếu là resident, check xem bill có phải của apartment của họ không
        if (user.role === "RESIDENT") {
            const resident = await prisma_1.prisma.resident.findUnique({
                where: { userId },
                select: { apartmentId: true },
            });
            if (!resident) {
                return res.status(404).json({ message: "Resident not found" });
            }
            const bill = await prisma_1.prisma.bill.findUnique({
                where: { id },
                select: { apartmentId: true },
            });
            if (!bill || bill.apartmentId !== resident.apartmentId) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        const data = await prisma_1.prisma.bill.findUnique({
            where: { id },
            include: {
                apartment: {
                    select: {
                        id: true,
                        code: true,
                    },
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        method: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!data) {
            return res.status(404).json({
                message: "Không tìm thấy hóa đơn",
            });
        }
        res.json(data);
    }
    catch (error) {
        console.error("Get bill error:", error);
        res.status(500).json({
            message: "Không thể lấy thông tin hóa đơn",
        });
    }
};
exports.getBillById = getBillById;
const generateBillId = async () => {
    const existingIds = await prisma_1.prisma.bill.findMany({
        where: {
            id: {
                startsWith: "HD",
            },
        },
        select: {
            id: true,
        },
    });
    const numbers = existingIds
        .map((item) => item.id.match(/^HD(\d{4})$/))
        .filter((match) => !!match)
        .map((match) => parseInt(match[1], 10))
        .sort((a, b) => a - b);
    let nextNumber = 1;
    for (const number of numbers) {
        if (number !== nextNumber) {
            break;
        }
        nextNumber += 1;
    }
    return `HD${nextNumber.toString().padStart(4, "0")}`;
};
// Tạo hóa đơn mới
const createBill = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Lấy thông tin user để check role
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role === "RESIDENT") {
            return res.status(403).json({ message: "Residents cannot create bills" });
        }
        const { apartmentId, electricityFee, waterFee, serviceFee, amount, month, year, dueDate, status: initialStatus, } = req.body;
        const apartment = await prisma_1.prisma.apartment.findUnique({
            where: { id: apartmentId },
            select: { status: true },
        });
        if (!apartment) {
            return res.status(404).json({
                message: 'Không tìm thấy căn hộ',
            });
        }
        if (!['SOLD', 'RENTED', 'OCCUPIED'].includes(apartment.status)) {
            return res.status(400).json({
                message: 'Chỉ được tạo hóa đơn cho căn hộ đã bán hoặc cho thuê',
            });
        }
        // Xác định status cuối cùng
        let finalStatus = initialStatus || "UNPAID";
        if (finalStatus === "UNPAID") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const threeDaysLater = new Date(today);
            threeDaysLater.setDate(threeDaysLater.getDate() + 3);
            const billDueDate = new Date(dueDate);
            if (billDueDate >= today && billDueDate <= threeDaysLater) {
                finalStatus = "UPCOMING_OVERDUE";
            }
        }
        const billId = await generateBillId();
        const data = await prisma_1.prisma.bill.create({
            data: {
                id: billId,
                apartmentId,
                electricityFee: electricityFee || 0,
                waterFee: waterFee || 0,
                serviceFee: serviceFee || 0,
                amount,
                month,
                year,
                dueDate: new Date(dueDate),
                status: finalStatus,
            },
            include: {
                apartment: {
                    select: {
                        id: true,
                        code: true,
                    },
                },
                payments: true,
            },
        });
        res.status(201).json(data);
    }
    catch (error) {
        console.error("Create bill error:", error);
        res.status(500).json({
            message: "Không thể tạo hóa đơn",
        });
    }
};
exports.createBill = createBill;
// Cập nhật hóa đơn
const updateBill = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Lấy thông tin user để check role
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const id = req.params.id;
        // Nếu là resident, check xem bill có phải của apartment của họ không
        if (user.role === "RESIDENT") {
            const resident = await prisma_1.prisma.resident.findUnique({
                where: { userId },
                select: { apartmentId: true },
            });
            if (!resident) {
                return res.status(404).json({ message: "Resident not found" });
            }
            const bill = await prisma_1.prisma.bill.findUnique({
                where: { id },
                select: { apartmentId: true },
            });
            if (!bill || bill.apartmentId !== resident.apartmentId) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Check current bill status
        const currentBill = await prisma_1.prisma.bill.findUnique({
            where: { id },
            select: { status: true },
        });
        if (!currentBill) {
            return res.status(404).json({ message: "Bill not found" });
        }
        if (user.role === "RESIDENT" && currentBill.status === 'PAID') {
            return res.status(400).json({ message: "Bill is already paid" });
        }
        const { electricityFee, waterFee, serviceFee, amount, month, year, dueDate, status: initialStatus, paymentMethod, bankAccount, notes, } = req.body;
        // Nếu là resident, chỉ cho phép thanh toán hoặc cập nhật status thành PAID nếu có payment thành công
        if (user.role === "RESIDENT") {
            if (electricityFee !== undefined || waterFee !== undefined || serviceFee !== undefined ||
                month !== undefined || year !== undefined || dueDate !== undefined ||
                (amount !== undefined && !paymentMethod)) { // Cho phép amount chỉ nếu có paymentMethod
                return res.status(403).json({ message: "Người dân chỉ có thể thanh toán hoặc cập nhật trạng thái thành PAID, không được sửa chi tiết hóa đơn" });
            }
            if (initialStatus !== undefined && initialStatus !== 'PAID' && !paymentMethod) { // Cho phép initialStatus khác nếu có paymentMethod
                return res.status(403).json({ message: "Người dân chỉ có thể đặt trạng thái thành PAID" });
            }
            if (initialStatus === 'PAID' && !paymentMethod) {
                // Kiểm tra xem có payment thành công không
                const successfulPayment = await prisma_1.prisma.payment.findFirst({
                    where: {
                        billId: id,
                        status: 'SUCCESS'
                    }
                });
                if (!successfulPayment) {
                    return res.status(403).json({ message: "Không thể đánh dấu hóa đơn đã thanh toán nếu chưa có thanh toán thành công" });
                }
            }
            if (!paymentMethod && initialStatus !== 'PAID') {
                return res.status(403).json({ message: "Người dân chỉ có thể truy cập endpoint này để thanh toán hoặc đánh dấu đã thanh toán" });
            }
        }
        // Xử lý thanh toán nếu có paymentMethod
        let finalStatus;
        let shouldUpdateBillStatus = false;
        if (paymentMethod) {
            let paymentStatus;
            if (paymentMethod === 'CASH') {
                // Thanh toán tiền mặt - xác nhận ngay
                paymentStatus = 'SUCCESS';
                shouldUpdateBillStatus = true;
                finalStatus = 'PAID';
            }
            else if (paymentMethod === 'BANK_TRANSFER') {
                // Thanh toán chuyển khoản - chờ xác nhận
                paymentStatus = 'PENDING';
                shouldUpdateBillStatus = false;
                // Giữ nguyên status hiện tại của bill
                finalStatus = initialStatus || "UNPAID";
            }
            else {
                paymentStatus = 'SUCCESS';
                shouldUpdateBillStatus = true;
                finalStatus = 'PAID';
            }
            if (paymentMethod === 'CASH') {
                // Sử dụng transaction để đảm bảo cả payment và bill update đều thành công
                await prisma_1.prisma.$transaction(async (tx) => {
                    // Tạo payment record
                    const billInfo = await tx.bill.findUnique({
                        where: { id },
                        select: { amount: true }
                    });
                    await tx.payment.create({
                        data: {
                            billId: id,
                            amount: billInfo?.amount || 0,
                            method: paymentMethod,
                            bankAccount,
                            notes,
                            status: paymentStatus,
                        },
                    });
                    // Cập nhật status bill
                    await tx.bill.update({
                        where: { id },
                        data: {
                            status: finalStatus,
                        },
                    });
                });
            }
            else {
                const billInfo = await prisma_1.prisma.bill.findUnique({
                    where: { id },
                    select: { amount: true }
                });
                if (!billInfo) {
                    throw new Error("Bill not found");
                }
                await prisma_1.prisma.payment.create({
                    data: {
                        billId: id,
                        amount: billInfo.amount,
                        method: paymentMethod,
                        bankAccount,
                        notes,
                        status: paymentStatus,
                    },
                });
            }
            // Chỉ cập nhật status bill nếu cần (đã xử lý trong transaction cho CASH)
            if (!shouldUpdateBillStatus && paymentMethod !== 'CASH') {
                finalStatus = initialStatus || "UNPAID";
            }
        }
        else {
            // Xác định status cuối cùng nếu không có thanh toán
            finalStatus = initialStatus || "UNPAID";
            if (finalStatus === "UNPAID" && dueDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const threeDaysLater = new Date(today);
                threeDaysLater.setDate(threeDaysLater.getDate() + 3);
                const billDueDate = new Date(dueDate);
                if (billDueDate >= today && billDueDate <= threeDaysLater) {
                    finalStatus = "UPCOMING_OVERDUE";
                }
            }
        }
        const updateData = {};
        // chỉ update field nào được gửi lên
        if (electricityFee !== undefined)
            updateData.electricityFee = electricityFee;
        if (waterFee !== undefined)
            updateData.waterFee = waterFee;
        if (serviceFee !== undefined)
            updateData.serviceFee = serviceFee;
        if (amount !== undefined)
            updateData.amount = amount;
        if (month !== undefined)
            updateData.month = month;
        if (year !== undefined)
            updateData.year = year;
        if (dueDate)
            updateData.dueDate = new Date(dueDate);
        // Chỉ set status nếu chưa được update trong transaction (cho CASH)
        if (!(paymentMethod === 'CASH' && shouldUpdateBillStatus)) {
            updateData.status = finalStatus;
        }
        let data;
        if (Object.keys(updateData).length > 0) {
            data = await prisma_1.prisma.bill.update({
                where: { id },
                data: updateData,
                include: {
                    apartment: {
                        select: {
                            id: true,
                            code: true,
                        },
                    },
                    payments: true,
                },
            });
        }
        else {
            data = await prisma_1.prisma.bill.findUnique({
                where: { id },
                include: {
                    apartment: {
                        select: {
                            id: true,
                            code: true,
                        },
                    },
                    payments: true,
                },
            });
        }
        res.json(data);
    }
    catch (error) {
        console.error("Update bill error:", error);
        res.status(500).json({
            message: "Không thể cập nhật hóa đơn",
        });
    }
};
exports.updateBill = updateBill;
// Xóa hóa đơn
const deleteBill = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Lấy thông tin user để check role
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role === "RESIDENT") {
            return res.status(403).json({ message: "Residents cannot delete bills" });
        }
        const id = req.params.id;
        await prisma_1.prisma.bill.delete({
            where: { id },
        });
        res.json({
            message: "Đã xóa hóa đơn thành công",
        });
    }
    catch (error) {
        console.error("Delete bill error:", error);
        res.status(500).json({
            message: "Không thể xóa hóa đơn",
        });
    }
};
exports.deleteBill = deleteBill;
// Lấy hóa đơn theo căn hộ
const getBillsByApartment = async (req, res) => {
    try {
        const apartmentId = req.params.apartmentId;
        const data = await prisma_1.prisma.bill.findMany({
            where: { apartmentId },
            include: {
                apartment: {
                    select: {
                        id: true,
                        code: true,
                    },
                },
                payments: true,
            },
        });
        res.json(data);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Không thể lấy danh sách hóa đơn",
        });
    }
};
exports.getBillsByApartment = getBillsByApartment;
