import { Router, Response } from "express";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { seed } from "../seed";

const router = Router();
router.use(authMiddleware);

function nameToEmail(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, ".");
  const domain = slug === "zack.burgess" ? "hey.com" : "company.com";
  return `${slug}@${domain}`;
}

// List all employees
router.get("/employees", async (_req: AuthRequest, res: Response) => {
  const employees = await prisma.user.findMany({
    orderBy: [{ suspendedAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      organization: true,
      suspendedAt: true,
    },
  });
  res.json(employees);
});

// Create employee
router.post("/employees", async (req: AuthRequest, res: Response) => {
  const { name, title, organization } = req.body;
  if (!name || !title || !organization) {
    res.status(400).json({ error: "Name, title, and organization are required" });
    return;
  }

  const email = nameToEmail(name);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "An employee with that name already exists" });
    return;
  }

  const user = await prisma.user.create({
    data: { name: name.trim(), email, title, organization },
  });

  // Auto-join all-employees and A-Team
  const autoGroups = await prisma.group.findMany({
    where: { name: { in: ["all-employees", "A-Team"] }, archivedAt: null },
  });
  for (const group of autoGroups) {
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
        addedById: req.userId!,
        isAdmin: group.name === "A-Team",
      },
    });
  }

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
    organization: user.organization,
    suspendedAt: user.suspendedAt,
  });
});

// Update employee
router.patch("/employees/:id", async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id as string);
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.email === process.env.ADMIN_EMAIL) {
    res.status(403).json({ error: "Cannot update the admin user" });
    return;
  }

  const { name, title, organization } = req.body;
  const updates: Record<string, string> = {};

  if (name !== undefined) {
    const trimmedName = name.trim();
    const newEmail = nameToEmail(trimmedName);
    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== targetId) {
      res.status(409).json({ error: "An employee with that name already exists" });
      return;
    }
    updates.name = trimmedName;
    updates.email = newEmail;
  }
  if (title !== undefined) updates.title = title;
  if (organization !== undefined) updates.organization = organization;

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: updates,
  });

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    title: updated.title,
    organization: updated.organization,
    suspendedAt: updated.suspendedAt,
  });
});

// Suspend employee
router.post("/employees/:id/suspend", async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.id as string);
  if (targetId === req.userId) {
    res.status(400).json({ error: "Cannot suspend yourself" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.email === process.env.ADMIN_EMAIL) {
    res.status(403).json({ error: "Cannot suspend the admin user" });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetId },
      data: { suspendedAt: new Date() },
    });

    const activeMemberships = await tx.groupMember.findMany({
      where: { userId: targetId, removedAt: null },
    });

    for (const membership of activeMemberships) {
      await tx.groupMember.update({
        where: { id: membership.id },
        data: { removedAt: new Date(), removedById: null },
      });

      // Admin cascading logic
      if (membership.isAdmin) {
        const remainingAdmins = await tx.groupMember.count({
          where: {
            groupId: membership.groupId,
            isAdmin: true,
            removedAt: null,
            userId: { not: targetId },
            user: { suspendedAt: null },
          },
        });

        if (remainingAdmins === 0) {
          const activeMembers = await tx.groupMember.findMany({
            where: {
              groupId: membership.groupId,
              removedAt: null,
              userId: { not: targetId },
              user: { suspendedAt: null },
            },
            orderBy: { addedAt: "asc" },
            take: 1,
          });

          if (activeMembers.length > 0) {
            await tx.groupMember.update({
              where: { id: activeMembers[0].id },
              data: { isAdmin: true },
            });
          } else {
            await tx.group.update({
              where: { id: membership.groupId },
              data: { archivedAt: new Date() },
            });
          }
        }
      }
    }
  });

  res.json({ success: true });
});

// Reset database
router.post("/reset", async (_req: AuthRequest, res: Response) => {
  // Delete all data and re-seed
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
  await seed();
  res.json({ success: true });
});

export default router;
