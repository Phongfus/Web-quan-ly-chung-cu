import { Router } from "express";
import * as controller from "./apartmentType.controller";

const router = Router();

router.get("/", controller.getApartmentTypes);

export default router;