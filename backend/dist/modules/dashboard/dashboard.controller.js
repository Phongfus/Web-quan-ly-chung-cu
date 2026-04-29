"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const prisma_1 = require("../../config/prisma");
const dayjs_1 = __importDefault(require("dayjs"));
const getDashboard = async (req, res) => {
    try {
        const year = req.query.year ? String(req.query.year) : (0, dayjs_1.default)().format('YYYY');
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        console.log('📊 Dashboard API called with year:', year, 'role:', user.role);
        const currentYear = (0, dayjs_1.default)(`${year}-01-01`);
        const startOfYear = currentYear.startOf('year').toDate();
        const endOfYear = currentYear.endOf('year').toDate();
        // =========================================================================
        // 1. LOGIC DÀNH CHO CƯ DÂN (RESIDENT)
        // =========================================================================
        if (user.role === 'RESIDENT') {
            const resident = await prisma_1.prisma.resident.findUnique({
                where: { userId: user.id },
                select: { apartmentId: true },
            });
            if (!resident) {
                return res.status(404).json({ message: 'Resident record not found' });
            }
            const apartmentId = resident.apartmentId;
            const apartment = await prisma_1.prisma.apartment.findUnique({
                where: { id: apartmentId },
                select: { code: true },
            });
            const apartmentCode = apartment?.code || 'N/A';
            const [memberCount, dueAmountAgg, paidAmountAgg, unpaidAmountAgg, upcomingOverdueAmountAgg, overdueAmountAgg, unpaidBillCount, serviceStatusCounts, notificationTargets, maintenanceRequests, costRows] = await Promise.all([
                prisma_1.prisma.resident.count({ where: { apartmentId } }),
                prisma_1.prisma.bill.aggregate({
                    _sum: { amount: true },
                    where: {
                        apartmentId,
                        year: Number(year),
                        status: { in: ['UNPAID', 'UPCOMING_OVERDUE', 'OVERDUE'] },
                    },
                }),
                prisma_1.prisma.bill.aggregate({
                    _sum: { amount: true },
                    where: {
                        apartmentId,
                        year: Number(year),
                        status: 'PAID',
                    },
                }),
                prisma_1.prisma.bill.aggregate({
                    _sum: { amount: true },
                    where: {
                        apartmentId,
                        year: Number(year),
                        status: 'UNPAID',
                    },
                }),
                prisma_1.prisma.bill.aggregate({
                    _sum: { amount: true },
                    where: {
                        apartmentId,
                        year: Number(year),
                        status: 'UPCOMING_OVERDUE',
                    },
                }),
                prisma_1.prisma.bill.aggregate({
                    _sum: { amount: true },
                    where: {
                        apartmentId,
                        year: Number(year),
                        status: 'OVERDUE',
                    },
                }),
                prisma_1.prisma.bill.count({
                    where: {
                        apartmentId,
                        year: Number(year),
                        status: { in: ['UNPAID', 'UPCOMING_OVERDUE', 'OVERDUE'] },
                    },
                }),
                prisma_1.prisma.serviceRequest.groupBy({
                    by: ['status'],
                    where: {
                        apartmentId,
                        createdAt: { gte: startOfYear, lte: endOfYear },
                    },
                    _count: { status: true },
                }),
                prisma_1.prisma.notificationTarget.findMany({
                    where: { userId: user.id },
                    orderBy: { notification: { createdAt: 'desc' } },
                    take: 5,
                    include: { notification: true },
                }),
                prisma_1.prisma.serviceRequest.findMany({
                    where: { apartmentId },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                }),
                prisma_1.prisma.$queryRaw `
          SELECT
            month,
            COALESCE(SUM("electricityFee"), 0)::int as electricity,
            COALESCE(SUM("waterFee"), 0)::int as water,
            COALESCE(SUM("serviceFee"), 0)::int as service
          FROM "Bill"
          WHERE year = ${year}::int AND "apartmentId" = ${apartmentId}
          GROUP BY month ORDER BY month
        `,
            ]);
            // Xử lý dữ liệu biểu đồ chi phí (Line Chart)
            const costData = Array.from({ length: 12 }).flatMap((_, index) => {
                const month = index + 1;
                const row = costRows.find((item) => Number(item.month) === month);
                return [
                    { month: `T${month}`, type: 'Điện', value: row?.electricity || 0 },
                    { month: `T${month}`, type: 'Nước', value: row?.water || 0 },
                    { month: `T${month}`, type: 'Phí dịch vụ', value: row?.service || 0 },
                ];
            });
            // Xử lý dữ liệu biểu đồ tròn (Pie Chart)
            const billChartData = [
                { type: 'Điện', value: costRows.reduce((sum, row) => sum + Number(row.electricity || 0), 0) },
                { type: 'Nước', value: costRows.reduce((sum, row) => sum + Number(row.water || 0), 0) },
                { type: 'Phí dịch vụ', value: costRows.reduce((sum, row) => sum + Number(row.service || 0), 0) },
            ];
            const paidInvoiceTotal = paidAmountAgg._sum.amount || 0;
            const unpaidInvoiceTotal = unpaidAmountAgg._sum.amount || 0;
            const upcomingOverdueTotal = upcomingOverdueAmountAgg._sum.amount || 0;
            const overdueTotal = overdueAmountAgg._sum.amount || 0;
            return res.json({
                totalApartment: apartmentCode,
                totalResident: memberCount,
                revenue: dueAmountAgg._sum.amount || 0,
                paidInvoiceTotal,
                unpaidInvoiceTotal,
                upcomingOverdueTotal,
                overdueTotal,
                maintenance: maintenanceRequests.length,
                revenueData: Array.from({ length: 12 }).map((_, i) => {
                    const month = i + 1;
                    const row = costRows.find((item) => Number(item.month) === month);
                    return {
                        month: `T${month}`,
                        value: (row?.electricity || 0) + (row?.water || 0) + (row?.service || 0),
                    };
                }),
                costData,
                billChartData,
                activities: [
                    `Thành viên căn hộ: ${memberCount}`,
                    `Hóa đơn cần thanh toán: ${unpaidBillCount}`,
                    `Tiền điện nước tháng này: ${(costRows[costRows.length - 1]?.electricity || 0).toLocaleString()}đ`,
                ],
                notifications: notificationTargets.map(t => ({
                    id: t.id, title: t.notification.title, content: t.notification.content,
                    createdAt: t.notification.createdAt, isRead: t.isRead
                })),
                maintenanceItems: maintenanceRequests.map(m => ({
                    id: m.id, type: m.type, status: m.status, description: m.description, createdAt: m.createdAt
                })),
                serviceStatusCounts: serviceStatusCounts.map(s => ({ status: s.status, count: s._count.status })),
            });
        }
        // =========================================================================
        // 2. LOGIC DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)
        // =========================================================================
        const [totalApartment, totalResident, totalRevenue, totalMaintenance, newResidents, paidBills, unpaidBills, upcomingOverdueBills, overdueBills] = await Promise.all([
            prisma_1.prisma.apartment.count(),
            prisma_1.prisma.resident.count(),
            prisma_1.prisma.bill.aggregate({ _sum: { amount: true }, where: { year: Number(year) } }),
            prisma_1.prisma.serviceRequest.count({ where: { createdAt: { gte: startOfYear, lte: endOfYear } } }),
            prisma_1.prisma.user.count({ where: { role: 'RESIDENT', createdAt: { gte: startOfYear, lte: endOfYear } } }),
            prisma_1.prisma.bill.count({ where: { status: 'PAID', year: Number(year) } }),
            prisma_1.prisma.bill.count({ where: { status: 'UNPAID', year: Number(year) } }),
            prisma_1.prisma.bill.count({ where: { status: 'UPCOMING_OVERDUE', year: Number(year) } }),
            prisma_1.prisma.bill.count({ where: { status: 'OVERDUE', year: Number(year) } }),
        ]);
        const revenueRaw = await prisma_1.prisma.$queryRaw `
      SELECT month, SUM(amount)::int as value FROM "Bill"
      WHERE year = ${year}::int GROUP BY month ORDER BY month
    `;
        const revenueData = Array.from({ length: 12 }).map((_, i) => {
            const m = i + 1;
            const found = revenueRaw.find((r) => Number(r.month) === m);
            return { month: `T${m}`, value: found?.value || 0 };
        });
        const billData = await prisma_1.prisma.$queryRaw `
      SELECT status, SUM(amount)::int as value FROM "Bill"
      WHERE year = ${year}::int GROUP BY status
    `;
        res.json({
            totalApartment,
            totalResident,
            revenue: totalRevenue._sum.amount || 0,
            maintenance: totalMaintenance,
            revenueData,
            billChartData: billData.map(item => ({
                type: item.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
                value: item.value,
            })),
            activities: [
                `Cư dân mới: ${newResidents}`,
                `Hóa đơn đã thu: ${paidBills}`,
                `Hóa đơn nợ: ${unpaidBills}`,
                `Yêu cầu bảo trì: ${totalMaintenance}`,
            ],
        });
    }
    catch (error) {
        console.error('❌ Dashboard Error:', error);
        res.status(500).json({
            message: 'Dashboard error',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
exports.getDashboard = getDashboard;
