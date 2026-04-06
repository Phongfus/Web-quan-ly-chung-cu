import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("123456", 10);

  // 👤 ADMIN
  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      email: "admin@gmail.com",
      password,
      fullName: "Admin",
      role: "ADMIN",
    },
  });

  console.log("✅ Admin:", admin.email);

  // 🏢 BUILDING
  const building = await prisma.building.create({
    data: {
      name: "Chung cư A",
      address: "Hà Nội",
    },
  });

  // 🧱 FLOOR + 🏠 APARTMENT TYPE
  const type = await prisma.apartmentType.create({
    data: {
      name: "2PN",
      bedrooms: 2,
      livingRooms: 1,
    },
  });

  const floors = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.floor.create({
        data: {
          number: i + 1,
          buildingId: building.id,
        },
      })
    )
  );

  // 🏠 APARTMENTS
  const apartments = [];

  for (const floor of floors) {
    for (let i = 1; i <= 4; i++) {
      const apt = await prisma.apartment.create({
        data: {
          code: `A${floor.number}${i.toString().padStart(2, "0")}`,
          floorId: floor.id,
          typeId: type.id,
        },
      });
      apartments.push(apt);
    }
  }

  console.log("✅ Apartments:", apartments.length);

  // 👤 USERS + RESIDENTS
  const users = [];

  for (let i = 1; i <= 20; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i}@mail.com`,
        password,
        fullName: `User ${i}`,
        role: "RESIDENT",
      },
    });

    const apartment =
      apartments[Math.floor(Math.random() * apartments.length)];

    await prisma.resident.create({
      data: {
        userId: user.id,
        apartmentId: apartment.id,
      },
    });

    users.push(user);
  }

  console.log("✅ Users:", users.length);

  // 💸 BILL (3 tháng)
  for (const apt of apartments) {
    for (let m = 1; m <= 3; m++) {
      await prisma.bill.create({
        data: {
          apartmentId: apt.id,
          amount: Math.floor(Math.random() * 2000000 + 500000),
          month: m,
          year: 2026,
          dueDate: new Date(),
          status: Math.random() > 0.5 ? "PAID" : "UNPAID",
        },
      });
    }
  }

  console.log("✅ Bills created");

  // 🔧 SERVICE REQUEST (maintenance)
  for (let i = 0; i < 10; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const apartment =
      apartments[Math.floor(Math.random() * apartments.length)];

    await prisma.serviceRequest.create({
      data: {
        userId: user.id,
        apartmentId: apartment.id,
        title: "Sửa điện",
        description: "Bóng đèn bị hỏng",
        type: "ELECTRIC",
        status: Math.random() > 0.5 ? "PENDING" : "PROCESSING",
      },
    });
  }

  console.log("✅ Service Requests created");

  // ⚡ UTILITY
  for (const apt of apartments) {
    await prisma.utility.create({
      data: {
        apartmentId: apt.id,
        electricityOld: 100,
        electricityNew: 150 + Math.random() * 50,
        waterOld: 50,
        waterNew: 80 + Math.random() * 20,
        month: 3,
        year: 2026,
      },
    });
  }

  console.log("✅ Utilities created");
    // 💳 PAYMENT (QUAN TRỌNG NHẤT)
  const bills = await prisma.bill.findMany();

  for (const bill of bills) {
    await prisma.payment.create({
      data: {
        billId: bill.id,
        amount: bill.amount,
        method: 'CASH',
        status: 'SUCCESS',
        createdAt: new Date(2026, bill.month - 1, 10), // theo tháng
      },
    });
  }

  console.log("✅ Payments created");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });