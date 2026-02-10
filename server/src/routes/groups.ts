import { Router, Response } from "express";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

async function isGroupAdmin(userId: number, groupId: number): Promise<boolean> {
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      isAdmin: true,
      removedAt: null,
    },
    include: { user: { select: { suspendedAt: true } } },
  });
  return !!membership && !membership.user.suspendedAt;
}

router.post("/", async (req: AuthRequest, res: Response) => {
  const { name, description, openMembership } = req.body;
  if (!name || !description) {
    res.status(400).json({ error: "Name and description are required" });
    return;
  }

  const group = await prisma.group.create({
    data: {
      name,
      description,
      ownerId: req.userId!,
      openMembership: openMembership ?? false,
      members: {
        create: {
          userId: req.userId!,
          addedById: req.userId!,
          isAdmin: true,
        },
      },
    },
    include: {
      owner: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(group);
});

router.get("/search", async (req: AuthRequest, res: Response) => {
  const q = req.query.q as string;
  if (!q) {
    res.json([]);
    return;
  }

  const groups = await prisma.group.findMany({
    where: {
      name: { contains: q },
      archivedAt: null,
    },
    include: {
      members: { where: { removedAt: null }, select: { id: true } },
    },
  });

  res.json(groups.map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: g.members.length,
  })));
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string);
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      members: {
        where: { removedAt: null },
        include: {
          user: { select: { id: true, name: true, title: true } },
        },
      },
    },
  });

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  res.json({
    id: group.id,
    name: group.name,
    description: group.description,
    openMembership: group.openMembership,
    owner: group.owner,
    createdAt: group.createdAt,
    members: group.members.map((m) => ({
      ...m.user,
      isAdmin: m.isAdmin,
    })),
  });
});

router.patch("/:id", async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string);
  const group = await prisma.group.findUnique({ where: { id } });

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  if (!(await isGroupAdmin(req.userId!, id))) {
    res.status(403).json({ error: "Only group admins can edit" });
    return;
  }

  const { name, description, openMembership } = req.body;
  const updated = await prisma.group.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(openMembership !== undefined && { openMembership }),
    },
  });

  res.json(updated);
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string);
  const group = await prisma.group.findUnique({ where: { id } });

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  if (!(await isGroupAdmin(req.userId!, id))) {
    res.status(403).json({ error: "Only group admins can delete" });
    return;
  }

  await prisma.group.delete({ where: { id } });
  res.json({ success: true });
});

router.post("/:id/members", async (req: AuthRequest, res: Response) => {
  const groupId = parseInt(req.params.id as string);
  const { userId } = req.body;

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  if (!group.openMembership && !(await isGroupAdmin(req.userId!, groupId))) {
    res.status(403).json({ error: "You don't have permission to add members" });
    return;
  }

  const latestMembership = await prisma.groupMember.findFirst({
    where: { groupId, userId },
    orderBy: { addedAt: "desc" },
  });

  if (latestMembership && !latestMembership.removedAt) {
    res.status(409).json({ error: "User is already a member" });
    return;
  }

  const member = await prisma.groupMember.create({
    data: {
      groupId,
      userId,
      addedById: req.userId!,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(member.user);
});

router.delete("/:id/members/:userId", async (req: AuthRequest, res: Response) => {
  const groupId = parseInt(req.params.id as string);
  const userId = parseInt(req.params.userId as string);

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const isAdmin = await isGroupAdmin(req.userId!, groupId);
  const isRemovingSelf = userId === req.userId;
  if (!isAdmin && !isRemovingSelf) {
    res.status(403).json({ error: "You don't have permission to remove members" });
    return;
  }

  const latestMembership = await prisma.groupMember.findFirst({
    where: { groupId, userId, removedAt: null },
    orderBy: { addedAt: "desc" },
  });

  if (!latestMembership) {
    res.status(404).json({ error: "User is not a current member" });
    return;
  }

  await prisma.groupMember.update({
    where: { id: latestMembership.id },
    data: {
      removedAt: new Date(),
      removedById: req.userId,
    },
  });

  res.json({ success: true });
});

export default router;
