// import Attendance from "../models/Attendance.js";
// import { parseAttendanceCommand } from "../utils/openai.js";

// export const markAttendance = async (req, res) => {
//   const { command } = req.body;

//   // Simple command parsing example:
//   // "Mark all present except Ramesh and Priya in Class 7B"
//   const match = command.match(/except (.+) in Class (.+)/i);
//   if (match) {
//     const absentees = match[1].split(' and ').map(n => n.trim());
//     const className = match[2].trim();
//     console.log(`Marking attendance for class ${className}, absentees: ${absentees}`);

//     // Update DB using Mongoose (mock example)
//     // await Student.updateMany({ class: className }, { present: true });
//     // await Student.updateMany({ name: { $in: absentees } }, { present: false });

//     res.json({ success: true, message: `Attendance updated for Class ${className}` });
//   } else {
//     res.status(400).json({ success: false, message: 'Could not parse command' });
//   }
// };

export const getAttendance = async (req, res) => {
  console.log("Get Attendance is Called");
  const records = await Attendance.find().sort({ date: -1 });
  res.json(records);
};

export const generateReport = async (req, res) => {
  console.log("Generate Report API is called");
  const records = await Attendance.find();
  const summary = records.reduce((acc, rec) => {
    acc[rec.className] = (acc[rec.className] || 0) + rec.absentStudents.length;
    return acc;
  }, {});

  res.json({ summary });
};

// server/controllers/attendanceController.js
import Attendance from "../models/Attendance.js";
import { parseAttendanceCommand, parseAttendanceQuery } from "../utils/openai.js";

/**
 * markAttendance — used by POST /api/attendance/voice
 * expects: { transcript: "Mark all present except Ramesh and Priya in Class 7B" }
 */
export const markAttendance = async (req, res) => {
  console.log("Mark Attendance API is called via voice command");
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ message: "Transcript is required" });

    // parse transcript -> structured JSON using OpenAI helper
    const parsed = await parseAttendanceCommand(transcript);
    if (parsed?.error) return res.status(400).json({ message: "Failed to parse command", detail: parsed.error });

    // parsed expected shape: { className: "7B", action: "mark all present", exceptions: ["Ramesh","Priya"] }
    const { className, action, exceptions = [] } = parsed;

    // For demo purposes: get a class student list (replace with real DB lookup in prod)
    const classStudents = await getStudentsForClass(className);

    // Build students array with statuses
    const students = classStudents.map((name) => {
      // If action indicates "present" and name is in exceptions => absent
      const normalizedAction = (action || "").toLowerCase();
      const isException = exceptions.map((e) => e.toLowerCase()).includes(name.toLowerCase());

      let status = "absent";
      if (normalizedAction.includes("present")) status = isException ? "absent" : "present";
      else if (normalizedAction.includes("absent")) status = isException ? "present" : "absent";
      else status = isException ? "absent" : "present"; // fallback

      return { name, status };
    });

    const record = await Attendance.create({ className, students });

    return res.json({ message: `Attendance recorded for class ${className}`, data: record });
  } catch (err) {
    console.error("markAttendance error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const queryAttendance = async (req, res) => {
  console.log("Query Attendance API is called");
  try {
    const { transcript } = req.body;
    console.log("Transcript:", transcript);
    if (!transcript) return res.status(400).json({ message: "Transcript is required" });

    // parse transcript -> structured JSON using OpenAI helper
    const parsed = await parseAttendanceQuery(transcript);
    console.log("Parsed query:", parsed);
    if (parsed?.error) return res.status(400).json({ message: "Failed to parse query", detail: parsed.error });

    const { className, date, query } = parsed;

    let queryBuilder = {};
    if (className) {
      queryBuilder.className = className;
    }
    if (date) {
      queryBuilder.date = {
        $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
      }
    }

    const records = await Attendance.find(queryBuilder);

    if (!records || records.length === 0) {
      return res.json({ message: "No records found for this query." });
    }

    let response = {};
    if (query === 'present') {
      response.presentStudents = records.map(r => r.presentStudents).flat();
    } else if (query === 'absent') {
      response.absentStudents = records.map(r => r.absentStudents).flat();
    } else {
      response.records = records;
    }

    return res.json({ message: "Query successful", data: response });
  } catch (err) {
    console.error("queryAttendance error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Demo helper — in your real app, lookup students from DB
async function getStudentsForClass(className) {
  // Example static list — swap with Student model lookup
  return ["Ramesh", "Priya", "Arjun", "Meena", "Kavya"];
}

