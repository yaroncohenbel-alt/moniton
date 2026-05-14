import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import mealPlansRouter from "./mealPlans.js";
import taximeterRouter from "./taximeter.js";
import placesRouter from "./places.js";
import stripeRouter from "./stripe.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mealPlansRouter);
router.use(taximeterRouter);
router.use(placesRouter);
router.use(stripeRouter);

export default router;
