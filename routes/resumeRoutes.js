// server/routes/resumeRoutes.js
import express from "express";
import multer from "multer";
import { parseResume } from "../controllers/resumeController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const singleAny = (req, res, next) => {
  upload.single("resume")(req, res, (err) => {
    if (err) return next(err);
    if (req.file) return next();
    upload.single("file")(req, res, next);
  });
};

// canonical endpoint the frontend uses
router.post("/parse", singleAny, parseResume);

// keep the old aliases working too (frontend tried these earlier)
router.post("/upload/resume", singleAny, parseResume);
router.post("/applications/parse-resume", singleAny, parseResume);

export default router;
