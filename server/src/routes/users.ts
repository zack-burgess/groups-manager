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
        include: { group: true },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const groups = user.memberships.map((m) => m.group);
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
  const id = parseInt(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        where: { removedAt: null },
        include: { group: true },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const groups = user.memberships.map((m) => m.group);
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
