import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import dayjs from 'dayjs';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;

    const current = dayjs(month as string);
    const year = current.year();

    const startOfMonth = current.startOf('month').toDate();
    const endOfMonth = current.endOf('month').toDate();

    // ===== BASIC STATS =====
    const [totalApartment, totalResident, payments, maintenance] =
      await Promise.all([
        prisma.apartment.count(),
        prisma.resident.count(),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
        prisma.serviceRequest.count(),
      ]);

    // ===== REVENUE RAW =====
    const revenueRaw = await prisma.$queryRaw<any[]>`
      SELECT 
        EXTRACT(MONTH FROM "createdAt") as month,
        SUM(amount)::int as value
      FROM "Payment"
      WHERE EXTRACT(YEAR FROM "createdAt") = ${year}
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

    // ===== RESIDENT CHART =====
    const residentData = await prisma.$queryRaw<any[]>`
      SELECT 
        TO_CHAR("createdAt", 'DD') as day,
        COUNT(*)::int as value
      FROM "Resident"
      WHERE "createdAt" BETWEEN ${startOfMonth} AND ${endOfMonth}
      GROUP BY day
      ORDER BY day
    `;

    // ===== ACTIVITIES =====
    const activities = [
      'Cư dân mới đăng ký',
      'Thanh toán hóa đơn',
      'Yêu cầu sửa chữa',
      'Cập nhật căn hộ',
    ];

    res.json({
      totalApartment,
      totalResident,
      revenue: payments._sum.amount || 0,
      maintenance,

      revenueData,
      residentData,
      activities,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Dashboard error' });
  }
};