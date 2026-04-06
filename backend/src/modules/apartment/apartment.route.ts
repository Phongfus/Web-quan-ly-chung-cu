import { Router } from "express";
import * as controller from "./apartment.controller";

const router = Router();

router.post("/", controller.createApartment);
router.get("/", controller.getApartments);

export default router;