import bcrypt from "bcryptjs";
import prisma from "./prisma";

export async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("No ADMIN_EMAIL/ADMIN_PASSWORD set, skipping seed");
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Zack Burgess",
        title: "Product Manager/Builder",
        organization: "R&D",
        passwordHash,
      },
    });
    console.log(`Seeded admin user: ${adminEmail}`);
  } else {
    console.log("Admin user already exists");
  }
}
