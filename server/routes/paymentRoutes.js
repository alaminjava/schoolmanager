const express = require("express");
const {
  createExamFees,
  createMonthlyFees,
  createPayment,
  getPayments,
  updatePayment,
} = require("../controllers/paymentController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const financeAccess = permitRoles("admin", "accounts", "accountant");

router.use(protect);
router.get("/", getPayments);
router.post("/", financeAccess, createPayment);
router.put("/:id", financeAccess, updatePayment);
router.post("/generate-monthly", financeAccess, createMonthlyFees);
router.post("/generate-exam", financeAccess, createExamFees);

module.exports = router;
