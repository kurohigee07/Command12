import { Router, type IRouter } from "express";
import healthRouter from "./health";
import apiTesterRouter from "./api-tester";
import scraperRouter from "./scraper";
import dashboardRouter from "./dashboard";
import telegramRouter from "./telegram";
import notificationsRouter from "./notifications";
import pipelineRouter from "./pipeline";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(telegramRouter);
router.use(notificationsRouter);
router.use(pipelineRouter);
router.use(apiTesterRouter);
router.use(scraperRouter);

export default router;
