import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import dayjs from 'dayjs';

interface DashboardRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const getDashboard = async (req: DashboardRequest, res: Response) => {
  try {
    const year = req.query.year ? String(req.query.year) : dayjs().format('YYYY');
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('📊 Dashboard API called with year:', year, 'role:', user.role);

    // ✅ FIX TIMEZONE CHUẨN UTC
    const startUTC = new Date(`${year}-01-01T00:00:00.000Z`);
    const endUTC = new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`);

    // =========================================================================
    // 1. RESIDENT
    // =========================================================================
    if (user.role === 'RESIDENT') {
      const resident = await prisma.resident.findUnique({
        where: { userId: user.id },
        select: { apartmentId: true },
      });

      if (!resident) {
        return res.status(404).json({ message: 'Resident record not found' });
      }

      const apartmentId = resident.apartmentId;

      const apartment = await prisma.apartment.findUnique({
        where: { id: apartmentId },
        select: { code: true },
      });

      const apartmentCode = apartment?.code || 'N/A';

      const [
        memberCount,
        paidAmountAgg,
        unpaidAmountAgg,
        upcomingOverdueAmountAgg,
        overdueAmountAgg,
        paidBillCount,
        unpaidBillCount,
        upcomingOverdueBillCount,
        overdueBillCount,
        notificationTargets,
        maintenanceRequests,
        costRows
      ] = await Promise.all([
        prisma.resident.count({ where: { apartmentId } }),

        prisma.bill.aggregate({
          _sum: { amount: true },
          where: { apartmentId, year: Number(year), status: 'PAID' },
        }),

        prisma.bill.aggregate({
          _sum: { amount: true },
          where: { apartmentId, year: Number(year), status: 'UNPAID' },
        }),

        prisma.bill.aggregate({
          _sum: { amount: true },
          where: { apartmentId, year: Number(year), status: 'UPCOMING_OVERDUE' },
        }),

        prisma.bill.aggregate({
          _sum: { amount: true },
          where: { apartmentId, year: Number(year), status: 'OVERDUE' },
        }),

        prisma.bill.count({
          where: { apartmentId, year: Number(year), status: 'PAID' },
        }),

        prisma.bill.count({
          where: { apartmentId, year: Number(year), status: 'UNPAID' },
        }),

        prisma.bill.count({
          where: { apartmentId, year: Number(year), status: 'UPCOMING_OVERDUE' },
        }),

        prisma.bill.count({
          where: { apartmentId, year: Number(year), status: 'OVERDUE' },
        }),

        prisma.notificationTarget.findMany({
          where: { userId: user.id },
          orderBy: { notification: { createdAt: 'desc' } },
          take: 5,
          include: { notification: true },
        }),

        prisma.serviceRequest.findMany({
          where: { apartmentId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),

        prisma.$queryRaw<any[]>`
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

      const costData = Array.from({ length: 12 }).flatMap((_, index) => {
        const month = index + 1;
        const row = costRows.find((item: any) => Number(item.month) === month);
        return [
          { month: `T${month}`, type: 'Điện', value: row?.electricity || 0 },
          { month: `T${month}`, type: 'Nước', value: row?.water || 0 },
          { month: `T${month}`, type: 'Phí dịch vụ', value: row?.service || 0 },
        ];
      });

      const billChartData = [
        { type: 'Điện', value: costRows.reduce((sum, r) => sum + Number(r.electricity || 0), 0) },
        { type: 'Nước', value: costRows.reduce((sum, r) => sum + Number(r.water || 0), 0) },
        { type: 'Phí dịch vụ', value: costRows.reduce((sum, r) => sum + Number(r.service || 0), 0) },
      ];

      return res.json({
        totalApartment: apartmentCode,
        totalResident: memberCount,
        paidInvoiceTotal: paidAmountAgg._sum.amount || 0,
        unpaidInvoiceTotal: unpaidAmountAgg._sum.amount || 0,
        upcomingOverdueTotal: upcomingOverdueAmountAgg._sum.amount || 0,
        overdueTotal: overdueAmountAgg._sum.amount || 0,
        maintenance: maintenanceRequests.length,
        costData,
        billChartData,
        activities: [
          `Hóa đơn chưa thanh toán: ${unpaidBillCount}`,
          `Hóa đơn sắp quá hạn: ${upcomingOverdueBillCount}`,
          `Hóa đơn quá hạn: ${overdueBillCount}`,
        ],
        notifications: notificationTargets.map(t => ({
          id: t.id,
          title: t.notification.title,
          content: t.notification.content,
          createdAt: t.notification.createdAt,
          isRead: t.isRead
        })),
        maintenanceItems: maintenanceRequests,
      });
    }

    // =========================================================================
    // 2. ADMIN
    // =========================================================================
    const [
      totalApartment,
      totalResident,
      totalRevenue,
      totalMaintenance,
      complaintPending,
      paidBills,
      unpaidBills,
      upcomingOverdueBills,
      overdueBills
    ] = await Promise.all([
      prisma.apartment.count(),

      prisma.resident.count(),

      prisma.bill.aggregate({
        _sum: { amount: true },
        where: { year: Number(year) }
      }),

      prisma.serviceRequest.count({
        where: { createdAt: { gte: startUTC, lt: endUTC } }
      }),

      // ✅ FIX CHUẨN
      prisma.complaint.count({
        where: {
          status: 'PENDING',
          createdAt: { gte: startUTC, lt: endUTC }
        }
      }),

      prisma.bill.count({ where: { status: 'PAID', year: Number(year) } }),
      prisma.bill.count({ where: { status: 'UNPAID', year: Number(year) } }),
      prisma.bill.count({ where: { status: 'UPCOMING_OVERDUE', year: Number(year) } }),
      prisma.bill.count({ where: { status: 'OVERDUE', year: Number(year) } }),
    ]);

    const revenueRaw = await prisma.$queryRaw<any[]>`
      SELECT month, SUM(amount)::int as value
      FROM "Bill"
      WHERE year = ${year}::int
      GROUP BY month ORDER BY month
    `;

    const revenueData = Array.from({ length: 12 }).map((_, i) => {
      const m = i + 1;
      const found = revenueRaw.find((r: any) => Number(r.month) === m);
      return { month: `T${m}`, value: found?.value || 0 };
    });

    const billData = await prisma.$queryRaw<any[]>`
      SELECT status, SUM(amount)::int as value
      FROM "Bill"
      WHERE year = ${year}::int
      GROUP BY status
    `;

    res.json({
      totalApartment,
      totalResident,
      revenue: totalRevenue._sum.amount || 0,
      maintenance: totalMaintenance,
      complaintPending,
      revenueData,
      billChartData: billData.map(item => ({
        type: item.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
        value: item.value,
      })),
      activities: [
        `Hóa đơn đã thanh toán: ${paidBills}`,
        `Hóa đơn chưa thanh toán: ${unpaidBills}`,
        `Hóa đơn sắp quá hạn: ${upcomingOverdueBills}`,
        `Hóa đơn quá hạn: ${overdueBills}`,
        `Yêu cầu sửa chữa: ${totalMaintenance}`,
      ],
    });

  } catch (error) {
    console.error('❌ Dashboard Error:', error);
    res.status(500).json({
      message: 'Dashboard error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};