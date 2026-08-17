import { Router, type IRouter } from "express";
import { GetNotificationStatusResponse } from "@workspace/api-zod";
import { getNotificationStatus } from "../lib/notifications/dispatcher";

const router: IRouter = Router();

router.get("/notifications/status", (_req, res): void => {
  res.json(GetNotificationStatusResponse.parse(getNotificationStatus()));
});

export default router;