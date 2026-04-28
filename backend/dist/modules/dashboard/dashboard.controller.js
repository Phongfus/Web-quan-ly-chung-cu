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
        console.log('📊 Dashboard API called with year:', year);
        const currentYear = (0, dayjs_1.default)(`${year}-01-01`);
        const startOfYear = currentYear.startOf('year').toDate();
        const endOfYear = currentYear.endOf('year').toDate();
        // ===== BASIC STATS =====
        const [totalApartment, totalResident, totalRevenue, totalMaintenance, newResidents, paidBills, unpaidBills, upcomingOverdueBills, overdueBills] = await Promise.all([
            prisma_1.prisma.apartment.count(),
            prisma_1.prisma.resident.count(),
            prisma_1.prisma.bill.aggregate({
                _sum: { amount: true },
                where: {
                    year: Number(year),
                },
            }),
            prisma_1.prisma.serviceRequest.count({
                where: {
                    createdAt: {
                        gte: startOfYear,
                        lte: endOfYear,
                    },
                },
            }),
            prisma_1.prisma.user.count({
                where: {
                    role: 'RESIDENT',
                    createdAt: {
                        gte: startOfYear,
                        lte: endOfYear,
                    },
                },
            }),
            prisma_1.prisma.bill.count({
                where: {
                    status: 'PAID',
                    year: Number(year),
                },
            }),
            prisma_1.prisma.bill.count({
                where: {
                    status: 'UNPAID',
                    year: Number(year),
                },
            }),
            prisma_1.prisma.bill.count({
                where: {
                    status: 'UPCOMING_OVERDUE',
                    year: Number(year),
                },
            }),
            prisma_1.prisma.bill.count({
                where: {
                    status: 'OVERDUE',
                    year: Number(year),
                },
            }),
        ]);
        // ===== REVENUE RAW =====
        const revenueRaw = await prisma_1.prisma.$queryRaw `
      SELECT
        month,
        SUM(amount)::int as value
      FROM "Bill"
      WHERE year = ${year}::int
      GROUP BY month
      ORDER BY month
    `;
        // ===== FORMAT 12 MONTHS =====
        const revenueData = Array.from({ length: 12 }).map((_, i) => {
            const m = i + 1;
            const found = revenueRaw.find((r) => Number(r.month) === m);
            return {
                month: `T${m}`,
                value: found?.value || 0,
            };
        });
        // ===== BILL DATA =====
        const billData = await prisma_1.prisma.$queryRaw `
      SELECT
        status,
        SUM(amount)::int as value
      FROM "Bill"
      WHERE year = ${year}::int
      GROUP BY status
    `;
        const billChartData = billData.map((item) => ({
            type: item.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
            value: item.value,
        }));
        // ===== RESIDENT CHART =====
        const residentData = await prisma_1.prisma.$queryRaw `
      SELECT 
        TO_CHAR("createdAt", 'DD/MM') as day,
        COUNT(*)::int as value
      FROM "User"
      WHERE EXTRACT(year FROM "createdAt") = ${year}::int
      AND "role" = 'RESIDENT'
      GROUP BY TO_CHAR("createdAt", 'DD/MM')
      ORDER BY TO_CHAR("createdAt", 'DD/MM')
    `;
        // ===== ACTIVITIES =====
        const activities = [
            `Cư dân mới: ${newResidents}`,
            `Yêu cầu sửa chữa trong năm: ${totalMaintenance}`,
            `Hóa đơn đã thanh toán: ${paidBills}`,
            `Hóa đơn chưa thanh toán: ${unpaidBills}`,
            `Hóa đơn sắp quá hạn: ${upcomingOverdueBills}`,
            `Hóa đơn quá hạn: ${overdueBills}`,
        ];
        res.json({
            totalApartment,
            totalResident,
            revenue: totalRevenue._sum.amount || 0,
            maintenance: totalMaintenance,
            revenueData,
            residentData,
            billChartData,
            activities,
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
