import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import dayjs from 'dayjs';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? String(req.query.year) : dayjs().format('YYYY');
    
    console.log('📊 Dashboard API called with year:', year);

    const currentYear = dayjs(`${year}-01-01`);
    const startOfYear = currentYear.startOf('year').toDate();
    const endOfYear = currentYear.endOf('year').toDate();

    // ===== BASIC STATS =====
    const [totalApartment, totalResident, totalRevenue, totalMaintenance, newResidents, paidBills, unpaidBills, upcomingOverdueBills, overdueBills] =
      await Promise.all([
        prisma.apartment.count(),
        prisma.resident.count(),
        prisma.bill.aggregate({
          _sum: { amount: true },
          where: {
            year: Number(year),
          },
        }),
        prisma.serviceRequest.count({
          where: {
            createdAt: {
              gte: startOfYear,
              lte: endOfYear,
            },
          },
        }),
        prisma.user.count({
          where: {
            role: 'RESIDENT',
            createdAt: {
              gte: startOfYear,
              lte: endOfYear,
            },
          },
        }),
        prisma.bill.count({
          where: {
            status: 'PAID',
            year: Number(year),
          },
        }),
        prisma.bill.count({
          where: {
            status: 'UNPAID',
            year: Number(year),
          },
        }),
        prisma.bill.count({
          where: {
            status: 'UPCOMING_OVERDUE',
            year: Number(year),
          },
        }),
        prisma.bill.count({
          where: {
            status: 'OVERDUE',
            year: Number(year),
          },
        }),
      ]);

    // ===== REVENUE RAW =====
    const revenueRaw = await prisma.$queryRaw<any[]>`
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
      const found = revenueRaw.find((r: any) => Number(r.month) === m);

      return {
        month: `T${m}`,
        value: found?.value || 0,
      };
    });

    // ===== BILL DATA =====
    const billData = await prisma.$queryRaw<any[]>`
      SELECT
        status,
        SUM(amount)::int as value
      FROM "Bill"
      WHERE year = ${year}::int
      GROUP BY status
    `;

    const billChartData = billData.map((item: any) => ({
      type: item.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
      value: item.value,
    }));

    // ===== RESIDENT CHART =====
    const residentData = await prisma.$queryRaw<any[]>`
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
  } catch (error) {
    console.error('❌ Dashboard Error:', error);
    res.status(500).json({ 
      message: 'Dashboard error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};