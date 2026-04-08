import { Router } from "express";
import * as controller from "./apartment.controller";

const router = Router();

router.post("/", controller.createApartment);
router.get("/", controller.getApartments);
router.put("/:id", controller.updateApartment);
router.delete("/:id", controller.deleteApartment);

export default router;