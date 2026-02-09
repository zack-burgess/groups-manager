import bcrypt from "bcryptjs";
import prisma from "./prisma";

export async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("No ADMIN_EMAIL/ADMIN_PASSWORD set, skipping seed");
    return;
  }

  // Seed admin user
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Zack Burgess",
        title: "Product Builder | Design, Code and PM",
        organization: "Research & Development",
        passwordHash,
      },
    });
    console.log(`Seeded admin user: ${adminEmail}`);
  } else {
    console.log("Admin user already exists");
  }

  // Seed Jane
  let jane = await prisma.user.findUnique({ where: { email: "jane.smith@company.com" } });
  if (!jane) {
    jane = await prisma.user.create({
      data: {
        email: "jane.smith@company.com",
        name: "Jane Smith",
        title: "Designer",
        organization: "Research & Development",
      },
    });
    console.log("Seeded user: Jane Smith");
  }

  // Seed R&D group
  const existingGroup = await prisma.group.findFirst({ where: { name: "R&D" } });
  if (!existingGroup) {
    await prisma.group.create({
      data: {
        name: "R&D",
        description: "Discuss tools for building products, including vibe-coding.",
        ownerId: admin.id,
        openMembership: true,
        members: {
          createMany: {
            data: [
              { userId: admin.id, addedById: admin.id },
              { userId: jane.id, addedById: admin.id },
            ],
          },
        },
      },
    });
    console.log("Seeded group: Product Builders");
  }
}
