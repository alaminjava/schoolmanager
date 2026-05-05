const Student = require("../models/Student");
const StudentPayment = require("../models/StudentPayment");
const ExamMark = require("../models/ExamMark");
const { createStudent, updateStudent } = require("../services/feeService");
const { canReadAllStudents, canWriteStudents, findStudentForUser, isAdmin } = require("../utils/access");

async function studentScope(req, baseQuery = {}) {
  const query = { ...baseQuery };

  if (canReadAllStudents(req.user)) {
    return query;
  }

  if (req.user?.role === "student") {
    const student = await findStudentForUser(req.user);
    query._id = student?._id || null;
    return query;
  }

  query._id = null;
  return query;
}

async function getStudents(req, res, next) {
  try {
    const baseQuery = {};
    if (req.query.className) baseQuery.className = req.query.className;
    if (req.query.status) baseQuery.status = req.query.status;

    const query = await studentScope(req, baseQuery);
    const students = await Student.find(query).populate("classFee").sort({ className: 1, rollNumber: 1 });
    return res.json({ students });
  } catch (error) {
    return next(error);
  }
}

async function getStudent(req, res, next) {
  try {
    const scopedQuery = await studentScope(req, { _id: req.params.id });
    const student = await Student.findOne(scopedQuery).populate("classFee");
    if (!student) {
      return res.status(404).json({ message: "Student was not found or you do not have access." });
    }

    const [payments, marks] = await Promise.all([
      StudentPayment.find({ student: student.id }).sort({ date: -1 }),
      ExamMark.find({ student: student.id }).sort({ academicYear: -1, subject: 1, examType: 1, examNo: 1 }),
    ]);

    return res.json({ student, payments, marks });
  } catch (error) {
    return next(error);
  }
}

async function createStudentRecord(req, res, next) {
  try {
    if (!canWriteStudents(req.user)) {
      return res.status(403).json({ message: "Only admin or teacher users can add students." });
    }

    const student = await createStudent(req.body);
    return res.status(201).json({ student });
  } catch (error) {
    return next(error);
  }
}

async function updateStudentRecord(req, res, next) {
  try {
    if (!canWriteStudents(req.user)) {
      return res.status(403).json({ message: "Only admin or teacher users can edit students." });
    }

    const student = await updateStudent(req.params.id, req.body);
    return res.json({ student });
  } catch (error) {
    return next(error);
  }
}

async function deleteStudentRecord(req, res, next) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Only admin can delete student records." });
    }

    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student was not found." });
    }

    await Promise.all([
      StudentPayment.deleteMany({ student: student.id }),
      ExamMark.deleteMany({ student: student.id }),
    ]);
    return res.json({ message: "Student deleted.", student });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createStudentRecord,
  deleteStudentRecord,
  getStudent,
  getStudents,
  updateStudentRecord,
};
