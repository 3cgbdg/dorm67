import type { NextFunction, Request, Response } from "express";
import { admin } from "../firebaseAdmin.js";

export type AuthRequest = Request & { userId?: string };

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const token = authHeader.replace("Bearer ", "");
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message });
  }
}
