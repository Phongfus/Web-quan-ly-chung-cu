import { prisma } from "../config/prisma";

/**
 * Tạo ID cư dân với định dạng CD0001, CD0002, v.v.
 * Tìm ID nhỏ nhất còn trống (điền khe hở)
 */
export const generateNextResidentId = async (): Promise<string> => {
  try {
    // Lấy tất cả cư dân hiện tại
    const residents = await prisma.resident.findMany({
      select: { id: true },
    });

    // Tách số từ các ID (CD0001 -> 1, CD0002 -> 2, ...)
    const usedNumbers = residents
      .map((r) => {
        const match = r.id.match(/CD(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null) as number[];

    // Sắp xếp và tìm số nhỏ nhất còn trống
    usedNumbers.sort((a, b) => a - b);
    let nextNumber = 1;

    for (const num of usedNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else if (num > nextNumber) {
        // Tìm thấy khe hở
        break;
      }
    }

    // Tạo ID với định dạng CD0001, CD0002, v.v.
    return `CD${String(nextNumber).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating resident ID:", error);
    throw error;
  }
};
