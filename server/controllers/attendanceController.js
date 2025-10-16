import Attendance from "../models/Attendance.js";
import { parseAttendanceCommand, parseAttendanceQuery } from "../utils/openai.js";

// Demo helper — in a real app, this would look up students from a database.
async function getStudentsForClass(className) {
  // Example static list.
  console.log(`Fetching hardcoded student list for class: ${className}`);
  return ["Ramesh", "Priya", "Arjun", "Meena", "Kavya"];
}

// Helper to process filters for database queries
const processFilter = (filter) => {
  if (!filter) return filter;
  const processed = { ...filter };

  // Handle date range for date strings
  if (processed.date && typeof processed.date === 'string') {
    const day = processed.date;
    processed.date = {
      $gte: new Date(new Date(day).setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(day).setHours(23, 59, 59, 999)),
    };
  }

  // Handle case-insensitive className, matching if it ends with the provided string
  if (processed.className && typeof processed.className === 'string') {
    processed.className = new RegExp(`${processed.className}$`, 'i');
  }

  return processed;
};

/**
 * Handles voice commands for marking, updating, or deleting attendance.
 * Endpoint: POST /api/attendance/voice
 */
export const markAttendance = async (req, res) => {
  console.log("Mark Attendance API called with body:", req.body);
  try {
    const { transcript, force = false } = req.body;
    if (!transcript) {
      return res.status(400).json({ message: "Transcript is required" });
    }

    const { intent, payload, error } = await parseAttendanceCommand(transcript);

    if (error) {
      return res.status(400).json({ message: "Failed to parse command", detail: error });
    }

    if ((intent === 'DELETE' || intent === 'UPDATE') && !force) {
      console.log(`Confirmation required for intent: ${intent}`);
      const actionMessage = intent === 'DELETE' ? 'delete this record' : 'update record(s)';
      return res.json({
        confirmationRequired: true,
        message: `Are you sure you want to ${actionMessage}? This action cannot be undone.`,
      });
    }

    console.log(`Executing command with intent: ${intent}`);
    switch (intent) {
      case 'CREATE':
        const { className, students: studentExceptions } = payload;
        const allClassStudents = await getStudentsForClass(className);

        const students = allClassStudents.map(name => {
          const exception = studentExceptions.find(s => s.name.toLowerCase() === name.toLowerCase());
          return { name, status: exception ? exception.status : 'present' };
        });

        const record = await Attendance.create({ className, students });
        return res.status(201).json({ message: `Attendance recorded for class ${className}`, data: record });

      case 'DELETE':
        const deleteFilter = processFilter(payload.filter);
        if (!deleteFilter || Object.keys(deleteFilter).length === 0) {
          return res.status(400).json({ message: "A filter is required to delete a record." });
        }
        const deleteResult = await Attendance.findOneAndDelete(deleteFilter);
        if (!deleteResult) {
          return res.status(404).json({ message: "Record to delete not found." });
        }
        return res.json({ message: "Attendance record successfully deleted." });

      case 'UPDATE':
        const updateFilter = processFilter(payload.filter);
        if (!updateFilter || Object.keys(updateFilter).length === 0) {
          return res.status(400).json({ message: "A filter is required to update records." });
        }

        const { updates } = payload;
        if (updates && updates.newClassName) {
          const updateResult = await Attendance.updateMany(updateFilter, { $set: { className: updates.newClassName } });
          if (updateResult.matchedCount === 0) {
            return res.status(404).json({ message: "No records found with that class name to update." });
          }
          return res.json({ message: `Successfully updated ${updateResult.modifiedCount} records to className '${updates.newClassName}'.` });
        } else if (updates && updates.students && updates.students.length > 0) {
          const studentUpdates = updates.students;
          let modifiedCount = 0;

          for (const studentUpdate of studentUpdates) {
            const result = await Attendance.updateOne(
              updateFilter,
              { $set: { "students.$[elem].status": studentUpdate.status } },
              { arrayFilters: [{ "elem.name": new RegExp(`^${studentUpdate.name}$`, 'i') }] }
            );
            modifiedCount += result.modifiedCount;
          }

          if (modifiedCount === 0) {
            return res.status(404).json({ message: "Could not find matching students to update in the specified record." });
          }

          return res.json({ message: `Successfully updated status for ${modifiedCount} student(s).` });
        } else if (updates && updates.studentNameChange) {
          const { from, to } = updates.studentNameChange;
          const result = await Attendance.updateMany(
            updateFilter,
            { $set: { "students.$[elem].name": to } },
            { arrayFilters: [{ "elem.name": new RegExp(`^${from}$`, 'i') }] }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ message: `Could not find student '${from}' to update in the specified record(s).` });
          }

          return res.json({ message: `Successfully changed student name from '${from}' to '${to}' in ${result.modifiedCount} records.` });
        } else {
          return res.status(400).json({ message: "Unknown or unsupported update operation." });
        }

      default:
        console.warn(`Unknown intent: ${intent}`);
        return res.status(400).json({ message: `Unknown intent: ${intent}` });
    }
  } catch (err) {
    console.error("markAttendance controller error:", err);
    return res.status(500).json({ message: "Server error during attendance marking." });
  }
};

/**
 * Retrieves all attendance records.
 * Endpoint: GET /api/attendance
 */
export const getAttendance = async (req, res) => {
  console.log("Get Attendance is Called");
  try {
    const records = await Attendance.find().sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error("getAttendance controller error:", err);
    return res.status(500).json({ message: "Server error while fetching attendance." });
  }
};

/**
 * Generates a summary report of attendance.
 * Endpoint: GET /api/attendance/report
 */
export const generateReport = async (req, res) => {
  console.log("Generate Report API is called");
  try {
    const records = await Attendance.find();
    const summary = records.reduce((acc, rec) => {
      const absentCount = rec.students.filter(s => s.status === 'absent').length;
      acc[rec.className] = (acc[rec.className] || 0) + absentCount;
      return acc;
    }, {});
    res.json({ summary });
  } catch (err) {
    console.error("generateReport controller error:", err);
    return res.status(500).json({ message: "Server error while generating report." });
  }
};

/**
 * Handles natural language queries about attendance.
 * Endpoint: POST /api/attendance/query
 */
export const queryAttendance = async (req, res) => {
  console.log("Query Attendance API is called");
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ message: "Transcript is required" });
    }

    const parsed = await parseAttendanceQuery(transcript);
    if (parsed?.error) {
      return res.status(400).json({ message: "Failed to parse query", detail: parsed.error });
    }

    const { className, date, query } = parsed;
    let queryBuilder = {};
    if (className) {
      // Use a flexible regex to match inconsistent class names
      queryBuilder.className = new RegExp(`${className}$`, 'i');
    }
    if (date) {
      queryBuilder.date = {
        $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
      };
    }

    const records = await Attendance.find(queryBuilder);
    if (!records || records.length === 0) {
      return res.json({ message: "No records found for this query.", data: {} });
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
    return res.status(500).json({ message: "Server error during query." });
  }
};
