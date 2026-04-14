import { Request, Response } from "express";
import { prisma } from "../../config/prisma";

// Lấy danh sách hóa đơn
export const getBills = async (_req: Request, res: Response) => {
  try {
    const data = await prisma.bill.findMany({
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
  } catch (error) {
    console.error("Get bills error:", error);
    res.status(500).json({
      message: "Không thể lấy danh sách hóa đơn",
    });
  }
};

// Lấy chi tiết hóa đơn
export const getBillById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const data = await prisma.bill.findUnique({
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
  } catch (error) {
    console.error("Get bill error:", error);
    res.status(500).json({
      message: "Không thể lấy thông tin hóa đơn",
    });
  }
};

const generateBillId = async () => {
  const existingIds = await prisma.bill.findMany({
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
    .filter((match): match is RegExpMatchArray => !!match)
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
export const createBill = async (req: Request, res: Response) => {
  try {
    const {
      apartmentId,
      electricityFee,
      waterFee,
      serviceFee,
      amount,
      month,
      year,
      dueDate,
    } = req.body;

    const billId = await generateBillId();

    const data = await prisma.bill.create({
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
        status: "UNPAID",
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
  } catch (error) {
    console.error("Create bill error:", error);
    res.status(500).json({
      message: "Không thể tạo hóa đơn",
    });
  }
};

// Cập nhật hóa đơn
export const updateBill = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const {
      electricityFee,
      waterFee,
      serviceFee,
      amount,
      month,
      year,
      dueDate,
      status,
    } = req.body;

    const data = await prisma.bill.update({
      where: { id },
      data: {
        electricityFee,
        waterFee,
        serviceFee,
        amount,
        month,
        year,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
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

    res.json(data);
  } catch (error) {
    console.error("Update bill error:", error);
    res.status(500).json({
      message: "Không thể cập nhật hóa đơn",
    });
  }
};
// Xóa hóa đơn
export const deleteBill = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.bill.delete({
      where: { id },
    });

    res.json({
      message: "Đã xóa hóa đơn thành công",
    });
  } catch (error) {
    console.error("Delete bill error:", error);
    res.status(500).json({
      message: "Không thể xóa hóa đơn",
    });
  }
};

// Lấy hóa đơn theo căn hộ
export const getBillsByApartment = async (req: Request, res: Response) => {
  try {
    const apartmentId = req.params.apartmentId as string;

    const data = await prisma.bill.findMany({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Không thể lấy danh sách hóa đơn",
    });
  }
};