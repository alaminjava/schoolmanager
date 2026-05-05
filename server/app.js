const cors = require("cors");
const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const authRoutes = require("./routes/authRoutes");
const classFeeRoutes = require("./routes/classFeeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const healthRoutes = require("./routes/healthRoutes");
const incrementRoutes = require("./routes/incrementRoutes");
const markRoutes = require("./routes/markRoutes");
const routineRoutes = require("./routes/routineRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const schoolSettingRoutes = require("./routes/schoolSettingRoutes");
const studentRoutes = require("./routes/studentRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Safety net for older frontend builds or misconfigured env values that send /api/api/...
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/api/")) {
    req.url = req.url.replace("/api/api/", "/api/");
  }
  next();
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/class-fees", classFeeRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/marks", markRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api/salary-increments", incrementRoutes);
app.use("/api/school-settings", schoolSettingRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
