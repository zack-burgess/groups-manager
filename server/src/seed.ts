import bcrypt from "bcryptjs";
import prisma from "./prisma";

export async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("No ADMIN_EMAIL/ADMIN_PASSWORD set, skipping seed");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Create all users
  const zack = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Zack Burgess",
      title: "Product Manager & Builder",
      organization: "Research & Development",
      passwordHash,
    },
  });

  const jane = await prisma.user.create({
    data: {
      email: "jane.smith@company.com",
      name: "Jane Smith",
      title: "Designer",
      organization: "Research & Development",
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: "alex.chen@company.com",
      name: "Alex Chen",
      title: "Engineer",
      organization: "Research & Development",
    },
  });

  const maria = await prisma.user.create({
    data: {
      email: "maria.garcia@company.com",
      name: "Maria Garcia",
      title: "Engineering Manager",
      organization: "Research & Development",
    },
  });

  const sam = await prisma.user.create({
    data: {
      email: "sam.patel@company.com",
      name: "Sam Patel",
      title: "Product Manager",
      organization: "Research & Development",
    },
  });

  const lisa = await prisma.user.create({
    data: {
      email: "lisa.wong@company.com",
      name: "Lisa Wong",
      title: "Recruiter",
      organization: "Human Resources",
    },
  });

  const nina = await prisma.user.create({
    data: {
      email: "nina.torres@company.com",
      name: "Nina Torres",
      title: "Hiring Manager",
      organization: "Human Resources",
    },
  });

  const tom = await prisma.user.create({
    data: {
      email: "tom.rivera@company.com",
      name: "Tom Rivera",
      title: "Marketing Manager",
      organization: "Marketing",
    },
  });

  const emma = await prisma.user.create({
    data: {
      email: "emma.johnson@company.com",
      name: "Emma Johnson",
      title: "Account Executive",
      organization: "Sales",
    },
  });

  const david = await prisma.user.create({
    data: {
      email: "david.kim@company.com",
      name: "David Kim",
      title: "Analyst",
      organization: "Finance",
    },
  });

  const rachel = await prisma.user.create({
    data: {
      email: "rachel.lee@company.com",
      name: "Rachel Lee",
      title: "Analyst",
      organization: "Operations",
    },
  });

  const priya = await prisma.user.create({
    data: {
      email: "priya.sharma@company.com",
      name: "Priya Sharma",
      title: "UX Researcher",
      organization: "Research & Development",
    },
  });

  const everyone = [zack, jane, alex, maria, sam, lisa, nina, tom, emma, david, rachel, priya];

  // all-employees — everyone, open membership, owned by Zack
  await prisma.group.create({
    data: {
      name: "all-employees",
      description: "Company-wide group for all employees.",
      ownerId: zack.id,
      openMembership: true,
      members: {
        createMany: {
          data: everyone.map((u) => ({ userId: u.id, addedById: zack.id })),
        },
      },
    },
  });

  // R&D — R&D org members, owned by Zack
  await prisma.group.create({
    data: {
      name: "R&D",
      description: "Research & Development team discussions.",
      ownerId: zack.id,
      openMembership: true,
      members: {
        createMany: {
          data: [zack, jane, alex, maria, sam, priya].map((u) => ({ userId: u.id, addedById: zack.id })),
        },
      },
    },
  });

  // Designers — owned by Jane
  await prisma.group.create({
    data: {
      name: "Designers",
      description: "Design team coordination and reviews.",
      ownerId: jane.id,
      openMembership: false,
      members: {
        createMany: {
          data: [jane, zack, priya].map((u) => ({ userId: u.id, addedById: jane.id })),
        },
      },
    },
  });

  // Engineers — owned by Maria (Engineering Manager)
  await prisma.group.create({
    data: {
      name: "Engineers",
      description: "Engineering discussions, code reviews, and architecture.",
      ownerId: maria.id,
      openMembership: false,
      members: {
        createMany: {
          data: [maria, alex, zack].map((u) => ({ userId: u.id, addedById: maria.id })),
        },
      },
    },
  });

  // Product Managers — owned by Zack
  await prisma.group.create({
    data: {
      name: "Product Managers",
      description: "Product strategy, roadmaps, and prioritization.",
      ownerId: zack.id,
      openMembership: false,
      members: {
        createMany: {
          data: [zack, sam].map((u) => ({ userId: u.id, addedById: zack.id })),
        },
      },
    },
  });

  // Marketing — owned by Tom
  await prisma.group.create({
    data: {
      name: "Marketing",
      description: "Marketing campaigns, strategy, and content.",
      ownerId: tom.id,
      openMembership: true,
      members: {
        createMany: {
          data: [tom, emma].map((u) => ({ userId: u.id, addedById: tom.id })),
        },
      },
    },
  });

  // Recruiting — owned by Lisa
  await prisma.group.create({
    data: {
      name: "Recruiting",
      description: "Hiring pipeline, candidate discussions, and interview coordination.",
      ownerId: lisa.id,
      openMembership: false,
      members: {
        createMany: {
          data: [lisa, nina].map((u) => ({ userId: u.id, addedById: lisa.id })),
        },
      },
    },
  });

  // A-team — owned by Zack, includes recruiters/hiring managers
  await prisma.group.create({
    data: {
      name: "A-Team",
      description: "Hiring top, collaborative talent. You know the ones.",
      ownerId: zack.id,
      openMembership: false,
      members: {
        create: {
          userId: zack.id,
          addedById: zack.id,
        },
      },
    },
  });

  console.log(`Seeded ${everyone.length} users and 8 groups`);

}
