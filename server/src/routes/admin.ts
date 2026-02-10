import { Router, Response } from "express";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.post("/:id/suspend", async (req: AuthRequest, res: Response) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: req.userId },
  });

  if (!currentUser || currentUser.email !== process.env.ADMIN_EMAIL) {
    res.status(403).json({ error: "Only the admin can suspend users" });
    return;
  }

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
        data: {
          removedAt: new Date(),
          removedById: null,
        },
      });
    }
  });

  res.json({ success: true });
});

export default router;
