import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma";

const router = Router();

router.get("/check-email", async (req: Request, res: Response) => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const isAdmin = email === process.env.ADMIN_EMAIL;

  res.json({
    exists: !!user,
    requiresPassword: isAdmin,
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.suspendedAt) {
    res.status(403).json({ error: "Account is suspended" });
    return;
  }

  if (user.passwordHash) {
    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.post("/signup", async (req: Request, res: Response) => {
  const { email, name, title, organization } = req.body;
  if (!email || !name || !title || !organization) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const user = await prisma.user.create({
    data: { email, name, title, organization },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

export default router;
