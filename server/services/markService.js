const mongoose = require("mongoose");
const ExamMark = require("../models/ExamMark");
const Student = require("../models/Student");

function normalizeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function cleanString(value) {
  return String(value || "").trim();
}

function validateExamType(examType, examNo) {
  if (examType === "monthly" && (examNo < 1 || examNo > 12)) {
    throw new Error("Monthly exam number must be from 1 to 12.");
  }

  if (examType === "semester" && (examNo < 1 || examNo > 3)) {
    throw new Error("Semester exam number must be 1, 2, or 3.");
  }

  if (examType === "class_test" && (examNo < 1 || examNo > 2)) {
    throw new Error("Class test number must be 1 or 2 for a month.");
  }
}

function gradeFromPercent(percent) {
  if (percent >= 80) return "A+";
  if (percent >= 70) return "A";
  if (percent >= 60) return "A-";
  if (percent >= 50) return "B";
  if (percent >= 40) return "C";
  if (percent >= 33) return "D";
  return "F";
}

function resultStatus(percent, contribution) {
  if (contribution > 100) return "Over weighted";
  if (contribution < 100) return "Incomplete weight";
  return percent >= 33 ? "Passed" : "Failed";
}

async function ensureContributionLimit({ student, subject, academicYear, contributionPercent }, excludeId = null) {
  const match = { student: new mongoose.Types.ObjectId(student), subject, academicYear };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }

  const existing = await ExamMark.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$contributionPercent" } } },
  ]);

  const currentTotal = Number(existing[0]?.total || 0);
  const nextTotal = Number((currentTotal + Number(contributionPercent || 0)).toFixed(2));
  if (nextTotal > 100) {
    throw new Error(`Total final result contribution for this student, subject, and year cannot exceed 100%. Current: ${currentTotal}%, new total: ${nextTotal}%.`);
  }
}

async function ensureExamSlotIsUnique(payload, excludeId = null) {
  const query = {
    student: payload.student,
    subject: payload.subject,
    academicYear: payload.academicYear,
    examType: payload.examType,
    examNo: payload.examNo,
  };

  if (payload.examType === "class_test") {
    query.month = payload.month;
  }

  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    query._id = { $ne: excludeId };
  }

  const existing = await ExamMark.findOne(query);
  if (!existing) return;

  if (payload.examType === "monthly") {
    throw new Error(`Monthly exam ${payload.examNo} is already entered for this student, subject, and year.`);
  }

  if (payload.examType === "semester") {
    throw new Error(`Semester exam ${payload.examNo} is already entered for this student, subject, and year.`);
  }

  throw new Error(`Class test ${payload.examNo} is already entered for ${payload.month} for this student, subject, and year.`);
}

async function buildMarkPayload(payload, userId) {
  const student = await Student.findById(payload.student);
  if (!student) {
    throw new Error("Student was not found.");
  }

  const subject = cleanString(payload.subject);
  if (!subject) {
    throw new Error("Subject is required.");
  }

  const examType = cleanString(payload.examType);
  if (!["monthly", "semester", "class_test"].includes(examType)) {
    throw new Error("Exam type must be monthly, semester, or class_test.");
  }

  const examNo = Math.trunc(normalizeNumber(payload.examNo, 1));
  validateExamType(examType, examNo);

  const academicYear = Math.trunc(normalizeNumber(payload.academicYear, new Date().getFullYear()));
  const totalMarks = normalizeNumber(payload.totalMarks, 0);
  const obtainedMarks = normalizeNumber(payload.obtainedMarks, 0);
  const contributionPercent = normalizeNumber(payload.contributionPercent, 0);

  if (totalMarks <= 0) {
    throw new Error("Total marks must be greater than 0.");
  }

  if (obtainedMarks < 0 || obtainedMarks > totalMarks) {
    throw new Error("Obtained marks must be between 0 and total marks.");
  }

  if (contributionPercent < 0 || contributionPercent > 100) {
    throw new Error("Contribution percent must be between 0 and 100.");
  }

  const rawMonth = cleanString(payload.month);
  if (examType === "class_test" && !rawMonth) {
    throw new Error("Month is required for class tests, because there are 2 class tests per month.");
  }

  const month = examType === "class_test" ? rawMonth : "";
  const weightedScore = Number(((obtainedMarks / totalMarks) * contributionPercent).toFixed(2));
  const percentage = Number(((obtainedMarks / totalMarks) * 100).toFixed(2));

  return {
    student: student.id,
    className: student.className,
    subject,
    academicYear,
    examType,
    examNo,
    month,
    totalMarks,
    obtainedMarks,
    contributionPercent,
    percentage,
    weightedScore,
    note: cleanString(payload.note),
    enteredBy: userId,
  };
}

async function createMark(payload, userId) {
  const markPayload = await buildMarkPayload(payload, userId);
  await ensureExamSlotIsUnique(markPayload);
  await ensureContributionLimit(markPayload);
  const mark = await ExamMark.create(markPayload);
  return mark.populate("student", "name className rollNumber dueAmount contactInfo");
}

async function updateMark(id, payload, userId) {
  const markPayload = await buildMarkPayload(payload, userId);
  await ensureExamSlotIsUnique(markPayload, id);
  await ensureContributionLimit(markPayload, id);
  const mark = await ExamMark.findByIdAndUpdate(id, markPayload, { new: true, runValidators: true })
    .populate("student", "name className rollNumber dueAmount contactInfo");

  if (!mark) {
    throw new Error("Mark record was not found.");
  }

  return mark;
}

async function getResultSummary(filters = {}) {
  const match = {};
  if (filters.className) match.className = filters.className;
  if (filters.student && mongoose.Types.ObjectId.isValid(filters.student)) {
    match.student = new mongoose.Types.ObjectId(filters.student);
  }
  if (filters.subject) match.subject = filters.subject;
  if (filters.academicYear) match.academicYear = Math.trunc(normalizeNumber(filters.academicYear));

  const rows = await ExamMark.aggregate([
    { $match: match },
    {
      $group: {
        _id: { student: "$student", subject: "$subject", academicYear: "$academicYear", className: "$className" },
        totalWeightedScore: { $sum: "$weightedScore" },
        totalContributionPercent: { $sum: "$contributionPercent" },
        totalObtainedMarks: { $sum: "$obtainedMarks" },
        totalMarks: { $sum: "$totalMarks" },
        examsCount: { $sum: 1 },
        monthlyCount: { $sum: { $cond: [{ $eq: ["$examType", "monthly"] }, 1, 0] } },
        semesterCount: { $sum: { $cond: [{ $eq: ["$examType", "semester"] }, 1, 0] } },
        classTestCount: { $sum: { $cond: [{ $eq: ["$examType", "class_test"] }, 1, 0] } },
      },
    },
    { $sort: { "_id.className": 1, "_id.subject": 1 } },
  ]);

  const students = await Student.find({ _id: { $in: rows.map((row) => row._id.student) } }).select("name className rollNumber dueAmount contactInfo");
  const studentMap = new Map(students.map((student) => [student.id, student]));

  return rows.map((row) => {
    const finalResultPercent = Number(row.totalWeightedScore.toFixed(2));
    const totalContributionPercent = Number(row.totalContributionPercent.toFixed(2));
    return {
      id: `${row._id.student}-${row._id.subject}-${row._id.academicYear}`,
      student: studentMap.get(String(row._id.student)),
      className: row._id.className,
      subject: row._id.subject,
      academicYear: row._id.academicYear,
      examsCount: row.examsCount,
      monthlyCount: row.monthlyCount,
      semesterCount: row.semesterCount,
      classTestCount: row.classTestCount,
      totalMarks: row.totalMarks,
      totalObtainedMarks: row.totalObtainedMarks,
      totalContributionPercent,
      finalResultPercent,
      grade: gradeFromPercent(finalResultPercent),
      resultStatus: resultStatus(finalResultPercent, totalContributionPercent),
    };
  });
}

module.exports = {
  createMark,
  getResultSummary,
  gradeFromPercent,
  resultStatus,
  updateMark,
};
