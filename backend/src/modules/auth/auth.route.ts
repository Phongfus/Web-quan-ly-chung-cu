import { Router } from "express";
import { login, me, changePassword } from "./auth.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/change-password", authMiddleware, changePassword);

export default router;