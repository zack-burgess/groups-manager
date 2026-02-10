import { Router, Response } from "express";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/me", async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      ownedGroups: true,
      memberships: {
        where: { removedAt: null },
        include: {
          group: {
            include: {
              members: { where: { removedAt: null }, select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const groups = user.memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    memberCount: m.group.members.length,
  }));
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
    organization: user.organization,
    groups,
  });
});

router.get("/search", async (req: AuthRequest, res: Response) => {
  const q = req.query.q as string;
  if (!q) {
    res.json([]);
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      suspendedAt: null,
      OR: [
        { name: { contains: q } },
        { title: { contains: q } },
      ],
    },
    select: { id: true, name: true, title: true },
  });

  res.json(users);
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string);
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        where: { removedAt: null },
        include: {
          group: {
            include: {
              members: { where: { removedAt: null }, select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const groups = user.memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    memberCount: m.group.members.length,
  }));
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
    organization: user.organization,
    groups,
  });
});

export default router;
