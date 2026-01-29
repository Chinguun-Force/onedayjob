import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminEmail = "admin@demo.com";
  const empEmail = "employee@demo.com";
  const password = "Shine2025*";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin HR",
      role: "ADMIN",
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: empEmail },
    update: {},
    create: {
      email: empEmail,
      name: "Employee One",
      role: "EMPLOYEE",
      passwordHash,
    },
  });

  console.log("Seed done ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
