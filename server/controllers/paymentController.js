const StudentPayment = require("../models/StudentPayment");
const { findStudentForUser } = require("../utils/access");
const {
  generateExamFees,
  generateMonthlyFees,
  recordStudentPayment,
  updateStudentPayment,
} = require("../services/feeService");

async function getPayments(req, res, next) {
  try {
    const query = {};
    if (req.query.student) query.student = req.query.student;
    if (req.query.status) query.status = req.query.status;
    if (req.query.feeType) query.feeType = req.query.feeType;

    if (req.user?.role === "student") {
      const student = await findStudentForUser(req.user);
      query.student = student?._id || null;
    }

    const payments = await StudentPayment.find(query)
      .populate("student", "name className rollNumber contactInfo")
      .sort({ date: -1, createdAt: -1 });

    return res.json({ payments });
  } catch (error) {
    return next(error);
  }
}

async function createPayment(req, res, next) {
  try {
    const payment = await recordStudentPayment(req.body);
    return res.status(201).json({ payment });
  } catch (error) {
    return next(error);
  }
}

async function updatePayment(req, res, next) {
  try {
    const payment = await updateStudentPayment(req.params.id, req.body);
    return res.json({ payment });
  } catch (error) {
    return next(error);
  }
}

async function createMonthlyFees(req, res, next) {
  try {
    const payments = await generateMonthlyFees(req.body);
    return res.status(201).json({ created: payments.length, payments });
  } catch (error) {
    return next(error);
  }
}

async function createExamFees(req, res, next) {
  try {
    const payments = await generateExamFees(req.body);
    return res.status(201).json({ created: payments.length, payments });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createExamFees,
  createMonthlyFees,
  createPayment,
  getPayments,
  updatePayment,
};
