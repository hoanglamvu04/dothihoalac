import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { uploadSingleImage } from "../../middlewares/upload.middleware.js";
import { uploadMedia } from "./media.controller.js";

const router = Router();

router.post(
  "/images",
  requireAuth,
  uploadSingleImage,
  uploadMedia,
);

export default router;