import express from "express";
import { markAttendance, getAttendance, generateReport, queryAttendance } from "../controllers/attendanceController.js";
const router = express.Router();

router.post("/voice", markAttendance);
router.get("/", getAttendance);
router.get("/report", generateReport );
router.post("/query", queryAttendance);

export default router;
