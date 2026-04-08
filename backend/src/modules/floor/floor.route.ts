import { Router } from "express";
import * as controller from "./floor.controller";

const router = Router();

router.get("/", controller.getFloors);

export default router;