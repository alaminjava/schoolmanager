const Employee = require("../models/Employee");
const Student = require("../models/Student");

const ADMIN_ROLES = ["admin"];
const FINANCE_ROLES = ["admin", "accounts", "accountant"];
const ACADEMIC_ROLES = ["admin", "teacher"];
const STUDENT_WRITE_ROLES = ["admin", "teacher"];
const STUDENT_READ_ROLES = ["admin", "teacher", "staff", "accounts", "accountant", "audit"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function hasRole(user, roles) {
  return roles.includes(user?.role);
}

function isAdmin(user) {
  return hasRole(user, ADMIN_ROLES);
}

function isFinance(user) {
  return hasRole(user, FINANCE_ROLES);
}

function isAcademic(user) {
  return hasRole(user, ACADEMIC_ROLES);
}

function canReadAllStudents(user) {
  return hasRole(user, STUDENT_READ_ROLES);
}

function canWriteStudents(user) {
  return hasRole(user, STUDENT_WRITE_ROLES);
}

async function findEmployeeForUser(user) {
  if (!user) return null;

  const email = normalize(user.email);
  const name = normalize(user.name);
  const search = [];

  if (email) search.push({ "contactInfo.email": email });
  if (name) search.push({ name: new RegExp(`^${escapeRegex(name)}$`, "i") });

  if (!search.length) return null;
  return Employee.findOne({ $or: search });
}

async function findStudentForUser(user) {
  if (!user) return null;

  const email = normalize(user.email);
  const name = normalize(user.name);
  const search = [];

  if (email) search.push({ "contactInfo.email": email });
  if (name) search.push({ name: new RegExp(`^${escapeRegex(name)}$`, "i") });

  if (!search.length) return null;
  return Student.findOne({ $or: search });
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  ACADEMIC_ROLES,
  ADMIN_ROLES,
  FINANCE_ROLES,
  STUDENT_READ_ROLES,
  STUDENT_WRITE_ROLES,
  canReadAllStudents,
  canWriteStudents,
  findEmployeeForUser,
  findStudentForUser,
  hasRole,
  isAcademic,
  isAdmin,
  isFinance,
};
