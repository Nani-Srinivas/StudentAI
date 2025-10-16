// import mongoose from "mongoose";

// const attendanceSchema = new mongoose.Schema({
//   className: String,
//   date: { type: Date, default: Date.now },
//   presentStudents: [String],
//   absentStudents: [String],
// });

// export default mongoose.model("Attendance", attendanceSchema);


// server/models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  className: { type: String, required: true },
  date: { type: Date, default: Date.now },
  students: [
    {
      name: String,
      status: { type: String, enum: ["present", "absent"], default: "present" },
    },
  ],
});

// Virtual for absent students
attendanceSchema.virtual("absentStudents").get(function () {
  return this.students.filter((student) => student.status === "absent");
});

// Virtual for present students
attendanceSchema.virtual("presentStudents").get(function () {
  return this.students.filter((student) => student.status === "present");
});

attendanceSchema.set("toJSON", { virtuals: true });
attendanceSchema.set("toObject", { virtuals: true });

export default mongoose.model("Attendance", attendanceSchema);
