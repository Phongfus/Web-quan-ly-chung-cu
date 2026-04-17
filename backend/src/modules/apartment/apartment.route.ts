import { Router } from "express";
import * as controller from "./apartment.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, controller.createApartment);
router.get("/available", controller.getAvailableApartments);
router.get("/", authMiddleware, controller.getApartments);
router.put("/:id", authMiddleware, controller.updateApartment);
router.delete("/:id", authMiddleware, controller.deleteApartment);

export default router;