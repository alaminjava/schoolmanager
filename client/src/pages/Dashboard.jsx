import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import AdminLayout from "../layouts/AdminLayout";
import { getErrorMessage } from "../api";
import { erpApi, loadERPData } from "../services/erpService";

const money = new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 });
const year = new Date().getFullYear();
const currentMonth = new Date().toISOString().slice(0, 7);

const emptyForms = {
  classFee: { className: "", admissionFee: 0, sessionFee: 0, monthlyFee: 0, examFee: 0 },
  student: { name: "", classFee: "", rollNumber: "", phone: "", email: "", guardianName: "", address: "", dateOfBirth: "", admissionDate: new Date().toISOString().slice(0, 10), status: "active" },
  payment: { student: "", feeType: "monthly", amount: 0, paidAmount: 0, billingMonth: currentMonth, term: "", note: "" },
  employee: { name: "", role: "teacher", salaryType: "monthly", salaryAmount: 0, phone: "", email: "", address: "", assignedClass: "", subject: "", joiningDate: new Date().toISOString().slice(0, 10), status: "active" },
  salary: { employee: "", salaryMonth: currentMonth, amount: 0, paidAmount: 0, note: "" },
  monthlyFees: { month: currentMonth },
  examFees: { term: "Term 1" },
  monthlySalaries: { month: currentMonth },
  mark: { student: "", subject: "", academicYear: year, examType: "monthly", examNo: 1, month: currentMonth, totalMarks: 100, obtainedMarks: 0, contributionPercent: 0, note: "" },
  routine: { className: "", day: "Saturday", startTime: "09:00", endTime: "10:00", subject: "", teacherName: "", room: "", status: "active", note: "" },
  increment: { employee: "", previousSalary: 0, incrementAmount: 0, newSalary: 0, effectiveDate: new Date().toISOString().slice(0, 10), reason: "" },
  schoolSettings: { schoolName: "Your School Name", subtitle: "An English Medium School", leftLogoUrl: "", rightLogoUrl: "", address: "School address here", phone: "", website: "", defaultExamTitle: "Progress Report", admissionNotice: "Admission open. Contact school office for details.", principalName: "Principal", resultRemarksDefault: "She/He has been consistently progressing." },
};

const marketFeatureRows = [
  { feature: "Student Information System", market: "Central student records, profile history, guardians, documents, attendance, behavior, and transcript-ready data.", yourSystem: "Student profiles, class/roll validation, guardian/contact details, dues, marks, and final result summary.", priority: "Strong base" },
  { feature: "Gradebook & Results", market: "Teacher gradebook, weighted assessments, report cards, transcripts, standards-based progress tracking.", yourSystem: "Monthly, semester, and class test marks with total marks, obtained marks, contribution percentage, grade, and pass/fail status.", priority: "Competitive" },
  { feature: "Fee & Finance", market: "Billing automation, payment gateway, invoices, refunds, discounts, and finance reports.", yourSystem: "Class fee rules, admission/session/monthly/exam fees, payment ledger, due calculation, salary ledger, and increments.", priority: "Add online payment next" },
  { feature: "Timetable", market: "Drag-and-drop scheduling, conflict checks, room/teacher workload, calendar sync.", yourSystem: "Routine creation with teacher/class overlap prevention, room, day, time, subject, and status.", priority: "Good workflow" },
  { feature: "Portals & Communication", market: "Separate admin, teacher, parent, student portals with alerts, notices, SMS/email, mobile access.", yourSystem: "Role-based login is ready; student self-view works when profile matches email/name.", priority: "Parent portal next" },
  { feature: "Analytics & Usability", market: "Executive dashboards, searchable tables, quick actions, trend cards, role-based shortcuts, audit-ready reports.", yourSystem: "This update adds smart dashboard cards, searchable tables, benchmark panel, quick actions, and modern mobile-friendly UI.", priority: "Upgraded now" },
];

const quickImprovements = [
  "Unified dashboard for academic, people, and finance decisions",
  "Searchable records so non-technical users can find data quickly",
  "Market benchmark view inspired by leading SIS/ERP platforms",
  "Role-based quick actions for Admin, Teacher, Accountant, Staff, and Student",
  "Clear empty states, cleaner cards, stronger mobile responsiveness, and easier navigation",
];

function toDateInput(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function Field({ children, label, hint }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function SectionHeader({ action, eyebrow, title }) {
  return (
    <div className="section-header">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <div className="action-row">{action}</div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Status({ status }) {
  return <span className={`status ${status}`}>{status || "active"}</span>;
}

function GradeBadge({ grade }) {
  return <span className={`grade-badge grade-${String(grade || "na").toLowerCase().replace("+", "plus")}`}>{grade || "N/A"}</span>;
}

function ResultStatus({ status }) {
  const safeStatus = String(status || "Incomplete weight");
  return <span className={`result-status ${safeStatus.toLowerCase().replaceAll(" ", "-")}`}>{safeStatus}</span>;
}


function gradeFromPercentClient(percent) {
  const value = Number(percent || 0);
  if (value >= 80) return "A+";
  if (value >= 70) return "A";
  if (value >= 60) return "A-";
  if (value >= 50) return "B";
  if (value >= 40) return "C";
  if (value >= 33) return "D";
  return "F";
}

function getStudentId(value) {
  if (!value) return "";
  return value._id || value.id || value;
}

function formatExamName(cardOrMark) {
  const type = String(cardOrMark.examType || "exam").replace("_", " ");
  const label = type.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const number = cardOrMark.examNo ? ` ${cardOrMark.examNo}` : "";
  const month = cardOrMark.month ? ` • ${cardOrMark.month}` : "";
  return `${label}${number}${month}`;
}

function buildResultCards(marks = [], students = []) {
  const studentMap = new Map(students.map((student) => [student._id, student]));
  const groups = new Map();

  marks.forEach((mark) => {
    const studentId = getStudentId(mark.student);
    if (!studentId) return;
    const key = [studentId, mark.academicYear, mark.examType, mark.examNo, mark.month || ""].join("|");
    const student = mark.student && typeof mark.student === "object" ? mark.student : studentMap.get(studentId);

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        studentId,
        student,
        academicYear: mark.academicYear,
        examType: mark.examType,
        examNo: mark.examNo,
        month: mark.month || "",
        subjects: [],
        totalMarks: 0,
        obtainedMarks: 0,
      });
    }

    const card = groups.get(key);
    const totalMarks = Number(mark.totalMarks || 0);
    const obtainedMarks = Number(mark.obtainedMarks || 0);
    const percentage = totalMarks ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
    card.subjects.push({
      subject: mark.subject,
      totalMarks,
      obtainedMarks,
      percentage,
      grade: gradeFromPercentClient(percentage),
      note: mark.note || "",
    });
    card.totalMarks += totalMarks;
    card.obtainedMarks += obtainedMarks;
  });

  return [...groups.values()].map((card) => {
    const percentage = card.totalMarks ? Number(((card.obtainedMarks / card.totalMarks) * 100).toFixed(2)) : 0;
    return {
      ...card,
      percentage,
      grade: gradeFromPercentClient(percentage),
      resultStatus: percentage >= 33 ? "Pass" : "Fail",
      examLabel: formatExamName(card),
    };
  }).sort((a, b) => String(b.academicYear).localeCompare(String(a.academicYear)) || a.examLabel.localeCompare(b.examLabel));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function logoHtml(url, fallback) {
  const safeUrl = String(url || "").trim();
  if (safeUrl) {
    return `<div class="logo"><img src="${escapeHtml(safeUrl)}" alt="logo" /></div>`;
  }
  return `<div class="logo fallback">${escapeHtml(fallback)}</div>`;
}

function resultCardHtml(card, settings = {}) {
  const schoolName = settings.schoolName || "Your School Name";
  const subtitle = settings.subtitle || "An English Medium School";
  const title = settings.defaultExamTitle || "Progress Report";
  const student = card.student || {};
  const rows = card.subjects.map((subject, index) => `
    <tr>
      <td>${index + 1}</td>
      <td class="subject">${escapeHtml(subject.subject)}</td>
      <td>${subject.totalMarks}</td>
      <td>${subject.obtainedMarks}</td>
      <td>${subject.percentage}%</td>
      <td>${escapeHtml(subject.grade)}</td>
      <td>${escapeHtml(subject.note || "-")}</td>
    </tr>`).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(student.name || "Student")} - ${escapeHtml(card.examLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; color: #111827; font-family: Arial, Helvetica, sans-serif; background: #f3f4f6; }
  .sheet { width: 900px; max-width: 100%; margin: 0 auto; background: #fff; border: 2px solid #111827; padding: 10px; }
  .school-header { display: grid; grid-template-columns: 105px 1fr 105px; gap: 10px; align-items: center; border-bottom: 3px solid #991b1b; padding-bottom: 8px; }
  .logo { width: 92px; height: 92px; border: 2px solid #111827; border-radius: 50%; display: grid; place-items: center; overflow: hidden; margin: auto; font-weight: 900; color: #991b1b; text-align: center; }
  .logo img { width: 100%; height: 100%; object-fit: cover; }
  .school-title { text-align: center; }
  .school-title h1 { margin: 0; color: #dc2626; font-size: 44px; letter-spacing: 2px; text-transform: uppercase; }
  .school-title h2 { margin: 4px 0 0; color: #047857; font-size: 20px; }
  .school-title p { margin: 5px 0 0; font-weight: 700; }
  .exam-title { text-align: center; padding: 12px 0 8px; border-bottom: 2px solid #111827; }
  .exam-title h2 { margin: 0; color: #7f1d1d; font-size: 26px; }
  .exam-title h3 { display: inline-block; margin: 8px 0 0; border-bottom: 2px solid #7f1d1d; color: #7f1d1d; text-transform: uppercase; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #111827; margin: 10px 0; }
  .info-grid div { padding: 9px; border-right: 1px solid #111827; font-size: 15px; }
  .info-grid div:last-child { border-right: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { border: 1px solid #111827; padding: 8px; text-align: center; }
  th { background: #f9fafb; font-size: 15px; }
  td.subject { text-align: left; font-weight: 700; }
  tfoot td { font-weight: 900; background: #f9fafb; }
  .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 14px; }
  .box { border: 1px solid #111827; min-height: 120px; }
  .box h3 { margin: 0; padding: 8px; border-bottom: 1px solid #111827; text-align: center; }
  .box p { margin: 0; padding: 8px 10px; border-bottom: 1px solid #d1d5db; }
  .remarks { margin-top: 12px; border: 1px solid #111827; padding: 12px; text-align: center; font-size: 18px; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 44px; text-align: center; }
  .signatures span { display: block; border-top: 1px solid #111827; padding-top: 8px; font-weight: 700; }
  .notice { margin-top: 14px; border: 1px solid #111827; padding: 10px; font-size: 13px; }
  .powered { text-align: center; margin-top: 12px; color: #2563eb; font-weight: 800; }
  @media print { body { padding: 0; background: #fff; } .sheet { width: 100%; border-color: #111827; } @page { size: A4 portrait; margin: 10mm; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="school-header">
      ${logoHtml(settings.leftLogoUrl, "LOGO")}
      <div class="school-title">
        <h1>${escapeHtml(schoolName)}</h1>
        <h2>${escapeHtml(subtitle)}</h2>
        <p>${escapeHtml(settings.address || "")}${settings.phone ? ` • ${escapeHtml(settings.phone)}` : ""}${settings.website ? ` • ${escapeHtml(settings.website)}` : ""}</p>
      </div>
      ${logoHtml(settings.rightLogoUrl, "LOGO")}
    </div>
    <div class="exam-title">
      <h2>${escapeHtml(card.examLabel)} Examination ${escapeHtml(card.academicYear)}</h2>
      <h3>${escapeHtml(title)} - ${escapeHtml(card.student?.className || card.student?.class || "Class")}</h3>
    </div>
    <div class="info-grid">
      <div><strong>Student Name:</strong> ${escapeHtml(student.name || "Student")}</div>
      <div><strong>Guardian:</strong> ${escapeHtml(student.contactInfo?.guardianName || "Not set")}</div>
      <div><strong>Student ID / Roll:</strong> ${escapeHtml(student.rollNumber || card.studentId)}</div>
    </div>
    <table>
      <thead>
        <tr><th>SL</th><th>Subjects</th><th>Max Marks</th><th>Marks Obt.</th><th>Percentage</th><th>Grade</th><th>Note</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="2">TOTAL</td><td>${card.totalMarks}</td><td>${card.obtainedMarks}</td><td>${card.percentage}%</td><td>${escapeHtml(card.grade)}</td><td>${escapeHtml(card.resultStatus)}</td></tr>
      </tfoot>
    </table>
    <div class="bottom-grid">
      <div class="box"><h3>Co-Scholastic Areas</h3><p><strong>Discipline:</strong> Excellent</p><p><strong>Reading Skill:</strong> Fluent</p><p><strong>Writing Skill:</strong> Good</p><p><strong>Interest:</strong> Reading</p></div>
      <div class="box"><h3>Result</h3><p><strong>Status:</strong> ${escapeHtml(card.resultStatus)}</p><p><strong>Percentage:</strong> ${card.percentage}%</p><p><strong>Grade:</strong> ${escapeHtml(card.grade)}</p><p><strong>Rank:</strong> -</p></div>
    </div>
    <div class="notice"><strong>Notice:</strong> ${escapeHtml(settings.admissionNotice || "")}</div>
    <div class="remarks"><strong>Remarks:</strong> <u>${escapeHtml(settings.resultRemarksDefault || "She/He has been consistently progressing.")}</u></div>
    <div class="signatures"><span>Class Teacher</span><span>${escapeHtml(settings.principalName || "Principal")}</span><span>Guardian</span></div>
    <div class="powered">Generated by School Management System</div>
  </div>
</body>
</html>`;
}

function downloadResultCard(card, settings) {
  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) {
    return false;
  }
  printWindow.document.open();
  printWindow.document.write(resultCardHtml(card, settings));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 450);
  return true;
}

function DataTable({ columns, rows, title, subtitle, searchable = true, searchPlaceholder = "Search records..." }) {
  const [query, setQuery] = useState("");
  const safeRows = rows || [];
  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return safeRows;

    return safeRows.filter((row) => {
      const searchableText = columns
        .map((column) => {
          if (column.search) return column.search(row);
          const rawValue = row[column.key];
          if (rawValue && typeof rawValue === "object") return JSON.stringify(rawValue);
          return rawValue ?? "";
        })
        .join(" ")
        .toLowerCase();
      return searchableText.includes(keyword);
    });
  }, [columns, query, safeRows]);

  return (
    <div className="table-card smart-table-card">
      {(title || subtitle || searchable) && (
        <div className="table-toolbar">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {searchable && (
            <label className="table-search" aria-label="Search table">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
            </label>
          )}
        </div>
      )}
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {filteredRows.length ? filteredRows.map((row, index) => (
            <tr key={row._id || row.id || `${row.feature || row.name || "row"}-${row.className || row.subject || index}`}>
              {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
            </tr>
          )) : (
            <tr><td className="empty-cell" colSpan={columns.length}>{query ? "No matching records found." : "No records found."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard({ token, user, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [data, setData] = useState({
    dashboard: { totalStudents: 0, totalEmployees: 0, totalIncome: 0, totalDue: 0, monthlyCollection: [], recentPayments: [] },
    classFees: [],
    students: [],
    employees: [],
    payments: [],
    salaries: [],
    marks: [],
    markResults: [],
    routines: [],
    increments: [],
    schoolSettings: emptyForms.schoolSettings,
  });
  const [modal, setModal] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForms.classFee);
  const [profileStudent, setProfileStudent] = useState(null);
  const [resultCardFilter, setResultCardFilter] = useState({ student: "", exam: "" });
  const [classFilter, setClassFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user.role === "admin";
  const financeAllowed = ["admin", "accounts", "accountant"].includes(user.role);
  const teacherAllowed = ["admin", "teacher"].includes(user.role);
  const studentWriteAllowed = ["admin", "teacher"].includes(user.role);
  const teacherReadAllowed = ["admin", "teacher", "staff", "accounts", "accountant", "audit"].includes(user.role);
  const studentReadAllowed = teacherReadAllowed || user.role === "student";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loadERPData(token));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const classNames = useMemo(() => {
    const names = new Set(data.classFees.map((item) => item.className));
    data.students.forEach((item) => names.add(item.className));
    data.routines.forEach((item) => names.add(item.className));
    return [...names].filter(Boolean).sort();
  }, [data.classFees, data.students, data.routines]);

  const filteredStudents = useMemo(() => {
    return classFilter ? data.students.filter((student) => student.className === classFilter) : data.students;
  }, [classFilter, data.students]);

  function openModal(type, row = null) {
    setError("");
    setSuccess("");
    setEditingId(row?._id || "");

    if (!row) {
      setForm(emptyForms[type]);
      setModal(type);
      return;
    }

    if (type === "classFee") {
      setForm({ className: row.className, admissionFee: row.admissionFee || 0, sessionFee: row.sessionFee || 0, monthlyFee: row.monthlyFee || 0, examFee: row.examFee || 0 });
    }
    if (type === "student") {
      setForm({
        name: row.name || "",
        classFee: row.classFee?._id || row.classFee || "",
        rollNumber: row.rollNumber || "",
        phone: row.contactInfo?.phone || "",
        email: row.contactInfo?.email || "",
        guardianName: row.contactInfo?.guardianName || "",
        address: row.contactInfo?.address || "",
        dateOfBirth: row.dateOfBirth ? toDateInput(row.dateOfBirth) : "",
        admissionDate: row.admissionDate ? toDateInput(row.admissionDate) : new Date().toISOString().slice(0, 10),
        status: row.status || "active",
      });
    }
    if (type === "employee") {
      setForm({
        name: row.name || "",
        role: row.role || "teacher",
        salaryType: row.salaryType || "monthly",
        salaryAmount: row.salaryAmount || 0,
        phone: row.contactInfo?.phone || "",
        email: row.contactInfo?.email || "",
        address: row.contactInfo?.address || "",
        assignedClass: row.assignedClass || "",
        subject: row.subject || "",
        joiningDate: toDateInput(row.joiningDate),
        status: row.status || "active",
      });
    }
    if (type === "payment") {
      setForm({
        student: row.student?._id || row.student || "",
        feeType: row.feeType || "monthly",
        amount: row.amount || 0,
        paidAmount: row.paidAmount || 0,
        billingMonth: row.billingMonth || currentMonth,
        term: row.term || "",
        note: row.note || "",
      });
    }
    if (type === "mark") {
      setForm({
        student: row.student?._id || row.student || "",
        subject: row.subject || "",
        academicYear: row.academicYear || year,
        examType: row.examType || "monthly",
        examNo: row.examNo || 1,
        month: row.month || currentMonth,
        totalMarks: row.totalMarks || 100,
        obtainedMarks: row.obtainedMarks || 0,
        contributionPercent: row.contributionPercent || 0,
        note: row.note || "",
      });
    }
    if (type === "routine") {
      setForm({
        className: row.className || "",
        day: row.day || "Saturday",
        startTime: row.startTime || "09:00",
        endTime: row.endTime || "10:00",
        subject: row.subject || "",
        teacherName: row.teacherName || "",
        room: row.room || "",
        status: row.status || "active",
        note: row.note || "",
      });
    }
    if (type === "increment") {
      setForm({
        employee: row.employee?._id || row.employee || "",
        previousSalary: row.previousSalary || 0,
        incrementAmount: row.incrementAmount || 0,
        newSalary: row.newSalary || 0,
        effectiveDate: toDateInput(row.effectiveDate),
        reason: row.reason || "",
      });
    }
    if (type === "schoolSettings") {
      setForm({ ...emptyForms.schoolSettings, ...(data.schoolSettings || {}) });
    }
    setModal(type);
  }

  async function handleDelete(type, id) {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    setError("");
    setSuccess("");
    try {
      if (type === "classFee") await erpApi.deleteClassFee(token, id);
      if (type === "student") await erpApi.deleteStudent(token, id);
      if (type === "employee") await erpApi.deleteEmployee(token, id);
      if (type === "mark") await erpApi.deleteMark(token, id);
      if (type === "routine") await erpApi.deleteRoutine(token, id);
      if (type === "increment") await erpApi.deleteIncrement(token, id);
      setSuccess("Record deleted successfully.");
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (modal === "classFee") {
        editingId ? await erpApi.updateClassFee(token, editingId, form) : await erpApi.createClassFee(token, form);
        setSuccess(editingId ? "Class fee rule updated." : "Class fee rule created.");
      }
      if (modal === "student") {
        const payload = {
          name: form.name,
          classFee: form.classFee,
          rollNumber: form.rollNumber,
          status: form.status,
          contactInfo: { phone: form.phone, email: form.email, guardianName: form.guardianName, address: form.address },
          dateOfBirth: form.dateOfBirth,
          admissionDate: form.admissionDate,
        };
        editingId ? await erpApi.updateStudent(token, editingId, payload) : await erpApi.createStudent(token, payload);
        setSuccess(editingId ? "Student updated." : "Student added with admission and session fees.");
      }
      if (modal === "payment") {
        editingId ? await erpApi.updatePayment(token, editingId, form) : await erpApi.createPayment(token, form);
        setSuccess(editingId ? "Student payment updated." : "Student payment recorded.");
      }
      if (modal === "employee") {
        const payload = {
          name: form.name,
          role: form.role,
          salaryType: form.salaryType,
          salaryAmount: form.salaryAmount,
          assignedClass: form.assignedClass,
          subject: form.subject,
          joiningDate: form.joiningDate,
          status: form.status,
          contactInfo: { phone: form.phone, email: form.email, address: form.address },
        };
        editingId ? await erpApi.updateEmployee(token, editingId, payload) : await erpApi.createEmployee(token, payload);
        setSuccess(editingId ? "Employee updated." : "Employee added.");
      }
      if (modal === "salary") {
        await erpApi.createSalary(token, form);
        setSuccess("Salary payment recorded.");
      }
      if (modal === "monthlyFees") {
        const { data: response } = await erpApi.generateMonthlyFees(token, form);
        setSuccess(`${response.created} monthly fee records generated.`);
      }
      if (modal === "examFees") {
        const { data: response } = await erpApi.generateExamFees(token, form);
        setSuccess(`${response.created} exam fee records generated.`);
      }
      if (modal === "monthlySalaries") {
        const { data: response } = await erpApi.generateSalaries(token, form);
        setSuccess(`${response.created} salary records generated.`);
      }
      if (modal === "mark") {
        editingId ? await erpApi.updateMark(token, editingId, form) : await erpApi.createMark(token, form);
        setSuccess(editingId ? "Mark updated." : "Mark entered.");
      }
      if (modal === "routine") {
        editingId ? await erpApi.updateRoutine(token, editingId, form) : await erpApi.createRoutine(token, form);
        setSuccess(editingId ? "Class routine updated." : "Class routine created.");
      }
      if (modal === "increment") {
        editingId ? await erpApi.updateIncrement(token, editingId, form) : await erpApi.createIncrement(token, form);
        setSuccess(editingId ? "Salary increment updated." : "Salary increment recorded.");
      }
      if (modal === "schoolSettings") {
        await erpApi.updateSchoolSettings(token, form);
        setSuccess("School name, logos, and report-card settings updated.");
      }

      setModal(null);
      setEditingId("");
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const paidCollection = data.payments.reduce((total, row) => total + Number(row.paidAmount || 0), 0);
  const visibleDue = data.payments.reduce((total, row) => total + Number(row.dueAmount || 0), 0);
  const totalBilled = paidCollection + visibleDue;
  const collectionRate = totalBilled ? Math.round((paidCollection / totalBilled) * 100) : 0;
  const activeStudents = data.students.filter((student) => student.status !== "inactive").length;
  const activeEmployees = data.employees.filter((employee) => employee.status !== "inactive").length;
  const todayRoutineSlots = data.routines.filter((routine) => routine.status !== "inactive").length;

  const schoolSettings = data.schoolSettings || emptyForms.schoolSettings;
  const resultCards = useMemo(() => buildResultCards(data.marks, data.students), [data.marks, data.students]);
  const resultCardStudents = useMemo(() => {
    const map = new Map();
    resultCards.forEach((card) => {
      if (card.studentId && !map.has(card.studentId)) {
        map.set(card.studentId, card.student?.name || "Student");
      }
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [resultCards]);
  const resultCardExamOptions = useMemo(() => {
    const source = resultCardFilter.student ? resultCards.filter((card) => card.studentId === resultCardFilter.student) : resultCards;
    return source.map((card) => ({ id: card.id, label: `${card.student?.name || "Student"} - ${card.examLabel} (${card.academicYear})` }));
  }, [resultCards, resultCardFilter.student]);
  const visibleResultCards = useMemo(() => {
    return resultCards.filter((card) => {
      if (resultCardFilter.student && card.studentId !== resultCardFilter.student) return false;
      if (resultCardFilter.exam && card.id !== resultCardFilter.exam) return false;
      return true;
    });
  }, [resultCards, resultCardFilter]);

  const renderDashboard = () => (
    <div className="stack dashboard-stack">
      <section className="dashboard-hero panel">
        <div>
          <p className="eyebrow">Market-ready School OS</p>
          <h1>Run students, exams, fees, people, and routines from one simple console.</h1>
          <p className="hero-copy">Inspired by leading SIS platforms, this dashboard now focuses on fast decisions, fewer clicks, clear records, and role-based school operations.</p>
          <div className="hero-actions">
            {studentWriteAllowed && <button className="btn primary" type="button" onClick={() => openModal("student")}>Add Student</button>}
            {teacherAllowed && <button className="btn soft" type="button" onClick={() => openModal("mark")}>Enter Marks</button>}
            {financeAllowed && <button className="btn warn" type="button" onClick={() => openModal("payment")}>Record Payment</button>}
          </div>
        </div>
        <div className="hero-score-card">
          <span>Collection Rate</span>
          <strong>{collectionRate}%</strong>
          <small>{money.format(paidCollection)} collected • {money.format(visibleDue)} visible due</small>
        </div>
      </section>

      <div className="stats-grid premium-stats">
        <StatCard label="Active Students" value={activeStudents || data.dashboard.totalStudents || 0} />
        <StatCard label="Students With Due" value={data.students.filter((student) => Number(student.dueAmount || 0) > 0).length} />
        {financeAllowed && <StatCard label="Collected Fees" value={money.format(data.dashboard.totalIncome || paidCollection || 0)} />}
        <StatCard label="Visible Fee Due" value={money.format(visibleDue)} />
        <StatCard label="Marks Entered" value={data.marks.length} />
        <StatCard label="Active Routine Slots" value={todayRoutineSlots} />
        <StatCard label="Employees" value={activeEmployees || data.dashboard.totalEmployees || 0} />
      </div>

      <section className="quick-action-grid">
        <article className="quick-card">
          <span>01</span>
          <h3>Student Hub</h3>
          <p>Filter by class, open full student profiles, check dues, marks, and final results instantly.</p>
          <button className="btn soft" type="button" onClick={() => setActiveView("students")}>Open Students</button>
        </article>
        <article className="quick-card">
          <span>02</span>
          <h3>Academic Flow</h3>
          <p>Routine conflict checks and weighted result logic help teachers avoid manual mistakes.</p>
          <button className="btn soft" type="button" onClick={() => setActiveView("marks")}>Open Marks</button>
        </article>
        <article className="quick-card highlight">
          <span>03</span>
          <h3>Finance Control</h3>
          <p>Generate fees, record payments, monitor dues, and manage salary ledgers in one place.</p>
          <button className="btn dark" type="button" onClick={() => setActiveView("fees")}>Open Fees</button>
        </article>
      </section>

      <DataTable
        title="Recent Payments"
        subtitle="Latest visible transactions and dues"
        searchPlaceholder="Search by student, type, amount..."
        columns={[
          { key: "student", label: "Student", search: (row) => row.student?.name, render: (row) => row.student?.name || "Student" },
          { key: "type", label: "Type", search: (row) => row.feeType, render: (row) => <span className="capitalize">{row.feeType}</span> },
          { key: "paid", label: "Paid", search: (row) => row.paidAmount, render: (row) => money.format(row.paidAmount || 0) },
          { key: "due", label: "Due", search: (row) => row.dueAmount, render: (row) => money.format(row.dueAmount || 0) },
        ]}
        rows={data.dashboard.recentPayments || []}
      />

      <section className="market-snapshot panel">
        <div>
          <p className="eyebrow">Benchmark Upgrade</p>
          <h3>What market-leading school systems usually include</h3>
          <p>Strong school ERP platforms combine SIS, attendance, gradebook, fees, timetable, parent/student portals, reports, and role-based security. Your app already covers the core operational base and this UI update makes it easier for real school users.</p>
        </div>
        <div className="snapshot-list">
          {quickImprovements.map((item) => <span key={item}>✓ {item}</span>)}
        </div>
      </section>
    </div>
  );

  const renderStudents = () => (
    <>
      <SectionHeader
        eyebrow="Student Management"
        title="Student Profiles and Details"
        action={(
          <>
            <select className="control small" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">All classes</option>
              {classNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            {studentWriteAllowed && <button className="btn primary" type="button" onClick={() => openModal("student")}>Add Student</button>}
          </>
        )}
      />
      <DataTable
        columns={[
          { key: "name", label: "Student", render: (row) => <div><strong>{row.name}</strong><small>Roll {row.rollNumber}</small></div> },
          { key: "class", label: "Class", render: (row) => row.className },
          { key: "guardian", label: "Guardian", render: (row) => row.contactInfo?.guardianName || "Not set" },
          { key: "phone", label: "Phone", render: (row) => row.contactInfo?.phone || "Not set" },
          { key: "due", label: "Due Payment", render: (row) => <strong className="danger-text">{money.format(row.dueAmount || 0)}</strong> },
          { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
          { key: "actions", label: "Actions", render: (row) => (
            <div className="action-row compact">
              <button className="btn soft" type="button" onClick={() => setProfileStudent(row)}>Profile</button>
              {studentWriteAllowed && <button className="btn soft" type="button" onClick={() => openModal("student", row)}>Edit</button>}
              {isAdmin && <button className="btn danger" type="button" onClick={() => handleDelete("student", row._id)}>Delete</button>}
            </div>
          )},
        ]}
        rows={filteredStudents}
      />
    </>
  );

  const renderFees = () => (
    <div className="stack">
      <SectionHeader
        eyebrow="Fee Management"
        title="Class Fee Rules and Payment Ledger"
        action={financeAllowed && (
          <>
            <button className="btn primary" type="button" onClick={() => openModal("classFee")}>Add Class Rule</button>
            <button className="btn dark" type="button" onClick={() => openModal("monthlyFees")}>Generate Monthly</button>
            <button className="btn warn" type="button" onClick={() => openModal("examFees")}>Generate Exam</button>
            <button className="btn success" type="button" onClick={() => openModal("payment")}>Record Payment</button>
          </>
        )}
      />
      <DataTable
        columns={[
          { key: "className", label: "Class", render: (row) => <strong>{row.className}</strong> },
          { key: "admissionFee", label: "Admission", render: (row) => money.format(row.admissionFee || 0) },
          { key: "sessionFee", label: "Session", render: (row) => money.format(row.sessionFee || 0) },
          { key: "monthlyFee", label: "Monthly", render: (row) => money.format(row.monthlyFee || 0) },
          { key: "examFee", label: "Exam", render: (row) => money.format(row.examFee || 0) },
          { key: "actions", label: "Actions", render: (row) => financeAllowed && (
            <div className="action-row compact">
              <button className="btn soft" type="button" onClick={() => openModal("classFee", row)}>Edit</button>
              {isAdmin && <button className="btn danger" type="button" onClick={() => handleDelete("classFee", row._id)}>Delete</button>}
            </div>
          )},
        ]}
        rows={data.classFees}
      />
      <DataTable
        columns={[
          { key: "student", label: "Student", render: (row) => row.student?.name || "Student" },
          { key: "feeType", label: "Type", render: (row) => <span className="capitalize">{row.feeType}</span> },
          { key: "amount", label: "Amount", render: (row) => money.format(row.amount || 0) },
          { key: "paid", label: "Paid", render: (row) => money.format(row.paidAmount || 0) },
          { key: "due", label: "Due", render: (row) => money.format(row.dueAmount || 0) },
          { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
          { key: "actions", label: "Actions", render: (row) => financeAllowed && (
            <div className="action-row compact">
              <button className="btn soft" type="button" onClick={() => openModal("payment", row)}>Edit</button>
            </div>
          )},
        ]}
        rows={data.payments}
      />
    </div>
  );

  const renderEmployees = () => (
    <>
      <SectionHeader
        eyebrow="Employee Management"
        title="Employees and Teachers"
        action={financeAllowed && <button className="btn primary" type="button" onClick={() => openModal("employee")}>Add Employee</button>}
      />
      <DataTable
        columns={[
          { key: "name", label: "Employee", render: (row) => <div><strong>{row.name}</strong><small className="capitalize">{row.role}</small></div> },
          { key: "assignment", label: "Assignment", render: (row) => row.role === "teacher" ? `${row.assignedClass || "No class"} / ${row.subject || "No subject"}` : "-" },
          { key: "salaryType", label: "Salary Type", render: (row) => <span className="capitalize">{row.salaryType}</span> },
          { key: "salary", label: "Salary", render: (row) => money.format(row.salaryAmount || 0) },
          { key: "due", label: "Due Salary", render: (row) => <strong className="danger-text">{money.format(row.dueSalary || 0)}</strong> },
          { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
          { key: "actions", label: "Actions", render: (row) => financeAllowed && (
            <div className="action-row compact">
              <button className="btn soft" type="button" onClick={() => openModal("employee", row)}>Edit</button>
              {isAdmin && <button className="btn danger" type="button" onClick={() => handleDelete("employee", row._id)}>Delete</button>}
            </div>
          )},
        ]}
        rows={data.employees}
      />
    </>
  );

  const renderMarks = () => (
    <div className="stack">
      <SectionHeader
        eyebrow="Academic Marks"
        title="Monthly, Semester, and Class Test Marks"
        action={teacherAllowed && <button className="btn primary" type="button" onClick={() => openModal("mark")}>Enter Marks</button>}
      />
      <div className="info-card">
        Business rules active: monthly exams are limited to 12 per year, semester exams to 3 per year, and class tests to 2 per month. Obtained marks cannot exceed total marks, and each student-subject-year final contribution cannot exceed 100%.
      </div>
      <DataTable
        columns={[
          { key: "student", label: "Student", render: (row) => row.student?.name || "Student" },
          { key: "class", label: "Class", render: (row) => row.className },
          { key: "subject", label: "Subject", render: (row) => row.subject },
          { key: "type", label: "Exam", render: (row) => <span className="capitalize">{row.examType?.replace("_", " ")} #{row.examNo}</span> },
          { key: "marks", label: "Marks", render: (row) => `${row.obtainedMarks}/${row.totalMarks}` },
          { key: "percentage", label: "Percentage", render: (row) => `${row.percentage || Math.round((row.obtainedMarks / row.totalMarks) * 100)}%` },
          { key: "percent", label: "Contribution", render: (row) => `${row.contributionPercent}%` },
          { key: "score", label: "Final Score", render: (row) => `${row.weightedScore}%` },
          { key: "actions", label: "Actions", render: (row) => teacherAllowed && (
            <div className="action-row compact">
              <button className="btn soft" type="button" onClick={() => openModal("mark", row)}>Edit</button>
              <button className="btn danger" type="button" onClick={() => handleDelete("mark", row._id)}>Delete</button>
            </div>
          )},
        ]}
        rows={data.marks}
      />
      <SectionHeader eyebrow="Auto Calculation" title="Final Result Summary" />
      <DataTable
        columns={[
          { key: "student", label: "Student", render: (row) => row.student?.name || "Student" },
          { key: "class", label: "Class", render: (row) => row.className },
          { key: "subject", label: "Subject", render: (row) => row.subject },
          { key: "year", label: "Year", render: (row) => row.academicYear },
          { key: "exams", label: "Records", render: (row) => `${row.examsCount} records` },
          { key: "mix", label: "Exam Mix", render: (row) => `M:${row.monthlyCount || 0} S:${row.semesterCount || 0} CT:${row.classTestCount || 0}` },
          { key: "marks", label: "Raw Marks", render: (row) => `${row.totalObtainedMarks}/${row.totalMarks}` },
          { key: "weight", label: "Contribution Used", render: (row) => `${row.totalContributionPercent}%` },
          { key: "final", label: "Final Result", render: (row) => <strong>{row.finalResultPercent}%</strong> },
          { key: "grade", label: "Grade", render: (row) => <GradeBadge grade={row.grade} /> },
          { key: "resultStatus", label: "Status", render: (row) => <ResultStatus status={row.resultStatus} /> },
        ]}
        rows={data.markResults}
      />
    </div>
  );


  const renderResultCards = () => (
    <div className="stack result-card-page">
      <SectionHeader
        eyebrow="Printable PDF Reports"
        title={user.role === "student" ? "My Exam Result Cards" : "Generate Student Result Card PDF"}
        action={(
          <>
            {isAdmin && <button className="btn dark" type="button" onClick={() => openModal("schoolSettings")}>School Settings</button>}
            {teacherAllowed && <button className="btn primary" type="button" onClick={() => openModal("mark")}>Enter Marks</button>}
          </>
        )}
      />

      <section className="result-builder panel">
        <div>
          <p className="eyebrow">Report card design</p>
          <h3>{schoolSettings.schoolName || "Your School Name"}</h3>
          <p>This page creates exam-wise report cards similar to a printed school progress report. Admin can change school name, subtitle, address, phone, website, logos, notice, principal name, and remarks. Teachers can download/print the PDF. Students can view their own generated exam cards.</p>
        </div>
        <div className="result-filter-grid">
          <Field label="Student">
            <select className="control" value={resultCardFilter.student} onChange={(event) => setResultCardFilter({ student: event.target.value, exam: "" })}>
              <option value="">All students</option>
              {resultCardStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </Field>
          <Field label="Exam">
            <select className="control" value={resultCardFilter.exam} onChange={(event) => setResultCardFilter({ ...resultCardFilter, exam: event.target.value })}>
              <option value="">All exams</option>
              {resultCardExamOptions.map((exam) => <option key={exam.id} value={exam.id}>{exam.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {visibleResultCards.length ? (
        <div className="result-card-list">
          {visibleResultCards.map((card) => (
            <article className="report-preview-card panel" key={card.id}>
              <div className="report-preview-header">
                <div className="report-logo-row">
                  <span className="report-logo-preview">{schoolSettings.leftLogoUrl ? <img alt="Left school logo" src={schoolSettings.leftLogoUrl} /> : "Logo"}</span>
                  <div>
                    <h3>{schoolSettings.schoolName || "Your School Name"}</h3>
                    <p>{schoolSettings.subtitle || "An English Medium School"}</p>
                    <small>{schoolSettings.address || "School address here"}</small>
                  </div>
                  <span className="report-logo-preview">{schoolSettings.rightLogoUrl ? <img alt="Right school logo" src={schoolSettings.rightLogoUrl} /> : "Logo"}</span>
                </div>
                <h4>{card.examLabel} Examination {card.academicYear}</h4>
                <strong>{schoolSettings.defaultExamTitle || "Progress Report"} - {card.student?.className || "Class"}</strong>
              </div>

              <div className="report-student-strip">
                <span><strong>Student:</strong> {card.student?.name || "Student"}</span>
                <span><strong>Guardian:</strong> {card.student?.contactInfo?.guardianName || "Not set"}</span>
                <span><strong>Roll/ID:</strong> {card.student?.rollNumber || card.studentId}</span>
              </div>

              <div className="report-preview-table-wrap">
                <table className="report-preview-table">
                  <thead><tr><th>Subject</th><th>Max</th><th>Obtained</th><th>%</th><th>Grade</th></tr></thead>
                  <tbody>
                    {card.subjects.map((subject) => (
                      <tr key={`${card.id}-${subject.subject}`}>
                        <td>{subject.subject}</td>
                        <td>{subject.totalMarks}</td>
                        <td>{subject.obtainedMarks}</td>
                        <td>{subject.percentage}%</td>
                        <td><GradeBadge grade={subject.grade} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td>Total</td><td>{card.totalMarks}</td><td>{card.obtainedMarks}</td><td>{card.percentage}%</td><td><GradeBadge grade={card.grade} /></td></tr></tfoot>
                </table>
              </div>

              <div className="report-result-strip">
                <span><strong>Result:</strong> {card.resultStatus}</span>
                <span><strong>Percentage:</strong> {card.percentage}%</span>
                <span><strong>Grade:</strong> {card.grade}</span>
              </div>

              <div className="report-actions">
                <button className="btn primary" type="button" onClick={() => {
                  const opened = downloadResultCard(card, schoolSettings);
                  if (!opened) setError("Popup was blocked. Please allow popups and click Download PDF again.");
                }}>Download PDF</button>
                {teacherAllowed && <button className="btn soft" type="button" onClick={() => setActiveView("marks")}>Edit Marks</button>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="info-card">
          <h3>No result card available yet</h3>
          <p>Enter marks for a student first. Each exam group will automatically become a downloadable result card.</p>
        </div>
      )}
    </div>
  );

  const renderRoutines = () => (
    <>
      <SectionHeader
        eyebrow="Class Routine"
        title="Teacher Routine Planner"
        action={teacherAllowed && <button className="btn primary" type="button" onClick={() => openModal("routine")}>Add Routine</button>}
      />
      <DataTable
        columns={[
          { key: "class", label: "Class", render: (row) => row.className },
          { key: "day", label: "Day", render: (row) => row.day },
          { key: "time", label: "Time", render: (row) => `${row.startTime} - ${row.endTime}` },
          { key: "subject", label: "Subject", render: (row) => row.subject },
          { key: "teacher", label: "Teacher", render: (row) => row.teacherName },
          { key: "room", label: "Room", render: (row) => row.room || "-" },
          { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
          { key: "actions", label: "Actions", render: (row) => teacherAllowed && (
            <div className="action-row compact">
              <button className="btn soft" type="button" onClick={() => openModal("routine", row)}>Edit</button>
              <button className="btn danger" type="button" onClick={() => handleDelete("routine", row._id)}>Delete</button>
            </div>
          )},
        ]}
        rows={data.routines}
      />
    </>
  );

  const renderSalaries = () => (
    <div className="stack">
      <SectionHeader
        eyebrow="Salary Management"
        title="Salary Ledger and Increment"
        action={financeAllowed && (
          <>
            <button className="btn dark" type="button" onClick={() => openModal("monthlySalaries")}>Generate Monthly</button>
            <button className="btn success" type="button" onClick={() => openModal("salary")}>Pay Salary</button>
            <button className="btn primary" type="button" onClick={() => openModal("increment")}>Add Increment</button>
          </>
        )}
      />
      <DataTable
        columns={[
          { key: "employee", label: "Employee", render: (row) => row.employee?.name || "Employee" },
          { key: "month", label: "Month", render: (row) => row.salaryMonth },
          { key: "amount", label: "Amount", render: (row) => money.format(row.amount || 0) },
          { key: "paid", label: "Paid", render: (row) => money.format(row.paidAmount || 0) },
          { key: "due", label: "Due", render: (row) => money.format(row.dueAmount || 0) },
          { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
        ]}
        rows={data.salaries}
      />
      <SectionHeader eyebrow="Teacher/Employee Increment" title="Salary Increment History" />
      <DataTable
        columns={[
          { key: "employee", label: "Employee", render: (row) => row.employee?.name || "Employee" },
          { key: "previous", label: "Previous", render: (row) => money.format(row.previousSalary || 0) },
          { key: "increment", label: "Increment", render: (row) => money.format(row.incrementAmount || 0) },
          { key: "new", label: "New Salary", render: (row) => money.format(row.newSalary || 0) },
          { key: "date", label: "Effective", render: (row) => toDateInput(row.effectiveDate) },
          { key: "reason", label: "Reason", render: (row) => row.reason || "-" },
          { key: "actions", label: "Actions", render: (row) => financeAllowed && (
            <div className="action-row compact">
              <button className="btn soft" type="button" onClick={() => openModal("increment", row)}>Edit</button>
              {isAdmin && <button className="btn danger" type="button" onClick={() => handleDelete("increment", row._id)}>Delete</button>}
            </div>
          )},
        ]}
        rows={data.increments}
      />
    </div>
  );

  const renderReports = () => (
    <div className="stack">
      <SectionHeader eyebrow="Reports" title="Financial and Academic Snapshot" />
      <div className="stats-grid">
        {financeAllowed && <StatCard label="Collected Fees" value={money.format(data.dashboard.totalIncome || paidCollection || 0)} />}
        <StatCard label="Student Fee Due" value={money.format(visibleDue)} />
        <StatCard label="Visible Salary Due" value={money.format(data.salaries.reduce((total, row) => total + Number(row.dueAmount || 0), 0))} />
        <StatCard label="Final Result Records" value={data.markResults.length} />
        <StatCard label="Collection Rate" value={`${collectionRate}%`} />
      </div>
      <div className="business-rules-grid">
        <article className="info-card"><h3>Role Logic</h3><p>Admin controls everything. Teachers handle student entry, student updates, routines, and marks. Accountants handle money. Students only see their own academic and payment records when matched by profile email/name.</p></article>
        <article className="info-card"><h3>Result Logic</h3><p>Teachers enter obtained marks, total marks, and final-result contribution. The system blocks totals above 100% and marks above total marks.</p></article>
        <article className="info-card"><h3>Routine Logic</h3><p>The system prevents overlapping class periods for the same class or the same teacher on the same day.</p></article>
      </div>
      <DataTable
        title="System Improvement Checklist"
        subtitle="A practical roadmap to make this product closer to a premium SIS/ERP."
        searchPlaceholder="Search feature, market expectation, current status..."
        columns={[
          { key: "feature", label: "Feature Area", render: (row) => <strong>{row.feature}</strong> },
          { key: "market", label: "Market Leader Pattern", render: (row) => row.market },
          { key: "yourSystem", label: "Your System Now", render: (row) => row.yourSystem },
          { key: "priority", label: "Priority", render: (row) => <span className="status partial">{row.priority}</span> },
        ]}
        rows={marketFeatureRows}
      />
    </div>
  );

  const renderBenchmark = () => (
    <div className="stack benchmark-page">
      <SectionHeader eyebrow="Market Comparison" title="Your School Manager vs. Leading School ERP/SIS" />
      <section className="benchmark-hero panel">
        <div>
          <h3>Market-leading direction</h3>
          <p>Platforms such as PowerSchool, Blackbaud, Veracross, Fedena, and OpenEduCat compete on centralized student records, attendance, gradebook, reports, finance, parent/student portals, integrations, and analytics. This project now has a cleaner UI layer and a strong operational base, but parent portal, attendance, online payment, notifications, and audit logs should be the next product-level upgrades.</p>
        </div>
        <div className="benchmark-score-grid">
          <span><strong>Core SIS</strong><small>Ready</small></span>
          <span><strong>Finance</strong><small>Ready</small></span>
          <span><strong>Gradebook</strong><small>Ready</small></span>
          <span><strong>Parent Portal</strong><small>Next</small></span>
        </div>
      </section>
      <DataTable
        title="Detailed Comparison Matrix"
        subtitle="Use this table as a product roadmap before adding new database modules."
        searchPlaceholder="Search SIS, finance, portal, analytics..."
        columns={[
          { key: "feature", label: "Feature Area", render: (row) => <strong>{row.feature}</strong> },
          { key: "market", label: "Market-leading System", render: (row) => row.market },
          { key: "yourSystem", label: "Your System", render: (row) => row.yourSystem },
          { key: "priority", label: "Recommendation", render: (row) => <span className="status active">{row.priority}</span> },
        ]}
        rows={marketFeatureRows}
      />
      <section className="next-roadmap-grid">
        <article className="info-card"><h3>Next Phase 1</h3><p>Add attendance module, parent/student notice board, and printable student report cards.</p></article>
        <article className="info-card"><h3>Next Phase 2</h3><p>Add online payment gateway, invoices/receipts PDF, discount/scholarship rules, and fee reminders.</p></article>
        <article className="info-card"><h3>Next Phase 3</h3><p>Add audit logs, document upload, SMS/email alerts, and dashboard charts for monthly trends.</p></article>
      </section>
    </div>
  );

  const modalTitle = {
    classFee: editingId ? "Edit Class Fee Rule" : "Add Class Fee Rule",
    student: editingId ? "Edit Student" : "Add Student",
    payment: editingId ? "Edit Student Payment" : "Record Student Payment",
    employee: editingId ? "Edit Employee" : "Add Employee",
    salary: "Pay Salary",
    monthlyFees: "Generate Monthly Fees",
    examFees: "Generate Exam Fees",
    monthlySalaries: "Generate Monthly Salaries",
    mark: editingId ? "Edit Mark" : "Enter Mark",
    routine: editingId ? "Edit Class Routine" : "Add Class Routine",
    increment: editingId ? "Edit Salary Increment" : "Add Salary Increment",
    schoolSettings: "School & Report Card Settings",
  }[modal];

  const selectedProfilePayments = profileStudent ? data.payments.filter((payment) => (payment.student?._id || payment.student) === profileStudent._id) : [];
  const selectedProfileMarks = profileStudent ? data.marks.filter((mark) => (mark.student?._id || mark.student) === profileStudent._id) : [];
  const selectedProfileResults = profileStudent ? data.markResults.filter((result) => (result.student?._id || result.student) === profileStudent._id) : [];

  return (
    <AdminLayout activeView={activeView} onLogout={onLogout} onViewChange={setActiveView} user={user}>
      {error && <p className="alert error">{error}</p>}
      {success && <p className="alert success">{success}</p>}
      {loading ? <p className="panel">Loading ERP data...</p> : (
        <>
          {activeView === "dashboard" && renderDashboard()}
          {activeView === "students" && studentReadAllowed && renderStudents()}
          {activeView === "fees" && renderFees()}
          {activeView === "employees" && renderEmployees()}
          {activeView === "marks" && renderMarks()}
          {activeView === "resultCards" && renderResultCards()}
          {activeView === "routines" && renderRoutines()}
          {activeView === "salaries" && renderSalaries()}
          {activeView === "reports" && renderReports()}
          {activeView === "benchmark" && renderBenchmark()}
        </>
      )}

      {profileStudent && (
        <Modal title="Student Full Profile" onClose={() => setProfileStudent(null)}>
          <div className="profile-grid">
            <div className="info-card">
              <h3>{profileStudent.name}</h3>
              <p><strong>Class:</strong> {profileStudent.className}</p>
              <p><strong>Roll:</strong> {profileStudent.rollNumber}</p>
              <p><strong>Guardian:</strong> {profileStudent.contactInfo?.guardianName || "Not set"}</p>
              <p><strong>Phone:</strong> {profileStudent.contactInfo?.phone || "Not set"}</p>
              <p><strong>Email:</strong> {profileStudent.contactInfo?.email || "Not set"}</p>
              <p><strong>Date of Birth:</strong> {profileStudent.dateOfBirth ? toDateInput(profileStudent.dateOfBirth) : "Not set"}</p>
              <p><strong>Admission Date:</strong> {profileStudent.admissionDate ? toDateInput(profileStudent.admissionDate) : "Not set"}</p>
              <p><strong>Address:</strong> {profileStudent.contactInfo?.address || "Not set"}</p>
              <p><strong>Total Due:</strong> {money.format(profileStudent.dueAmount || 0)}</p>
            </div>
            <div className="info-card">
              <h3>Due Payments</h3>
              {selectedProfilePayments.length ? selectedProfilePayments.map((payment) => (
                <p key={payment._id}>{payment.feeType} {payment.billingMonth || payment.term}: due {money.format(payment.dueAmount || 0)}</p>
              )) : <p>No payment records.</p>}
            </div>
            <div className="info-card full-span">
              <h3>Marks</h3>
              {selectedProfileMarks.length ? selectedProfileMarks.map((mark) => (
                <p key={mark._id}>{mark.subject} - {mark.examType.replace("_", " ")} #{mark.examNo}: {mark.obtainedMarks}/{mark.totalMarks}, weighted contribution {mark.weightedScore}%</p>
              )) : <p>No mark records.</p>}
            </div>
            <div className="info-card full-span">
              <h3>Final Results</h3>
              {selectedProfileResults.length ? selectedProfileResults.map((result) => (
                <p key={result.id}>{result.subject} {result.academicYear}: <strong>{result.finalResultPercent}%</strong> <GradeBadge grade={result.grade} /> <ResultStatus status={result.resultStatus} /></p>
              )) : <p>No final result summary yet.</p>}
            </div>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={modalTitle} onClose={() => { setModal(null); setEditingId(""); }}>
          <form className="modal-form" onSubmit={handleSubmit}>
            {modal === "classFee" && (
              <div className="form-grid">
                <Field label="Class Name"><input className="control" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} required /></Field>
                {[
                  ["admissionFee", "Admission Fee"],
                  ["sessionFee", "Session Fee"],
                  ["monthlyFee", "Monthly Fee"],
                  ["examFee", "Exam Fee"],
                ].map(([field, label]) => (
                  <Field label={label} key={field}><input className="control" min="0" type="number" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></Field>
                ))}
              </div>
            )}

            {modal === "student" && (
              <div className="form-grid">
                <Field label="Name"><input className="control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Class"><select className="control" value={form.classFee} onChange={(e) => setForm({ ...form, classFee: e.target.value })} required><option value="">Select class</option>{data.classFees.map((item) => <option key={item._id} value={item._id}>{item.className}</option>)}</select></Field>
                <Field label="Roll / ID"><input className="control" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required /></Field>
                <Field label="Phone"><input className="control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Email"><input className="control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Guardian"><input className="control" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></Field>
                <Field label="Date of Birth"><input className="control" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></Field>
                <Field label="Admission Date"><input className="control" type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} /></Field>
                <Field label="Status"><select className="control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
                <Field label="Address"><textarea className="control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
              </div>
            )}

            {modal === "payment" && (
              <div className="form-grid">
                <Field label="Student"><select className="control" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} required><option value="">Select student</option>{data.students.map((item) => <option key={item._id} value={item._id}>{item.name} - {item.className}</option>)}</select></Field>
                <Field label="Fee Type"><select className="control" value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })}><option value="admission">Admission</option><option value="session">Session</option><option value="monthly">Monthly</option><option value="exam">Exam</option></select></Field>
                <Field label="Amount"><input className="control" min="0" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
                <Field label="Paid Amount"><input className="control" min="0" type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} /></Field>
                <Field label="Billing Month"><input className="control" type="month" value={form.billingMonth} onChange={(e) => setForm({ ...form, billingMonth: e.target.value })} /></Field>
                <Field label="Exam Term"><input className="control" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></Field>
                <Field label="Note"><input className="control" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
              </div>
            )}

            {modal === "employee" && (
              <div className="form-grid">
                <Field label="Name"><input className="control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Role"><select className="control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="teacher">Teacher</option><option value="staff">Staff</option><option value="admin">Admin</option><option value="accountant">Accountant</option><option value="accounts">Accounts</option></select></Field>
                <Field label="Salary Type"><select className="control" value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value })}><option value="monthly">Monthly</option><option value="fixed">Fixed</option><option value="hourly">Hourly</option></select></Field>
                <Field label="Salary Amount"><input className="control" min="0" type="number" value={form.salaryAmount} onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })} /></Field>
                <Field label="Assigned Class"><input className="control" value={form.assignedClass} onChange={(e) => setForm({ ...form, assignedClass: e.target.value })} list="classes" /></Field>
                <Field label="Subject"><input className="control" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
                <Field label="Phone"><input className="control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Email"><input className="control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Joining Date"><input className="control" type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></Field>
                <Field label="Address"><textarea className="control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
                <Field label="Status"><select className="control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
              </div>
            )}

            {modal === "salary" && (
              <div className="form-grid">
                <Field label="Employee"><select className="control" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} required><option value="">Select employee</option>{data.employees.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></Field>
                <Field label="Salary Month"><input className="control" type="month" value={form.salaryMonth} onChange={(e) => setForm({ ...form, salaryMonth: e.target.value })} /></Field>
                <Field label="Amount"><input className="control" min="0" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
                <Field label="Paid Amount"><input className="control" min="0" type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} /></Field>
                <Field label="Note"><input className="control" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
              </div>
            )}

            {modal === "mark" && (
              <div className="form-grid">
                <Field label="Student"><select className="control" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} required><option value="">Select student</option>{data.students.map((item) => <option key={item._id} value={item._id}>{item.name} - {item.className}</option>)}</select></Field>
                <Field label="Subject"><input className="control" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></Field>
                <Field label="Academic Year"><input className="control" min="2000" type="number" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></Field>
                <Field label="Exam Type"><select className="control" value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value, examNo: 1 })}><option value="monthly">Monthly Exam</option><option value="semester">Semester Exam</option><option value="class_test">Class Test</option></select></Field>
                <Field label="Exam Number" hint="Monthly: 1-12, Semester: 1-3, Class test: 1-2 per month"><input className="control" min="1" type="number" value={form.examNo} onChange={(e) => setForm({ ...form, examNo: e.target.value })} /></Field>
                <Field label="Month" hint="Required for class tests"><input className="control" type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>
                <Field label="Total Marks"><input className="control" min="1" type="number" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} required /></Field>
                <Field label="Obtained Marks"><input className="control" min="0" type="number" value={form.obtainedMarks} onChange={(e) => setForm({ ...form, obtainedMarks: e.target.value })} required /></Field>
                <Field label="Final Result Contribution %"><input className="control" min="0" max="100" type="number" value={form.contributionPercent} onChange={(e) => setForm({ ...form, contributionPercent: e.target.value })} /></Field>
                <Field label="Note"><input className="control" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
              </div>
            )}

            {modal === "routine" && (
              <div className="form-grid">
                <Field label="Class"><input className="control" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} list="classes" required /></Field>
                <datalist id="classes">{classNames.map((name) => <option key={name} value={name} />)}</datalist>
                <Field label="Day"><select className="control" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>{["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => <option key={day} value={day}>{day}</option>)}</select></Field>
                <Field label="Start Time"><input className="control" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
                <Field label="End Time"><input className="control" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
                <Field label="Subject"><input className="control" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></Field>
                <Field label="Teacher Name"><input className="control" value={form.teacherName} onChange={(e) => setForm({ ...form, teacherName: e.target.value })} required /></Field>
                <Field label="Room"><input className="control" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></Field>
                <Field label="Status"><select className="control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
              </div>
            )}

            {modal === "increment" && (
              <div className="form-grid">
                <Field label="Employee"><select className="control" value={form.employee} onChange={(e) => {
                  const selected = data.employees.find((item) => item._id === e.target.value);
                  setForm({ ...form, employee: e.target.value, previousSalary: selected?.salaryAmount || 0, newSalary: selected?.salaryAmount || 0 });
                }} required><option value="">Select employee</option>{data.employees.map((item) => <option key={item._id} value={item._id}>{item.name} - {item.role}</option>)}</select></Field>
                <Field label="Previous Salary"><input className="control" min="0" type="number" value={form.previousSalary} onChange={(e) => setForm({ ...form, previousSalary: e.target.value })} /></Field>
                <Field label="Increment Amount"><input className="control" min="0" type="number" value={form.incrementAmount} onChange={(e) => setForm({ ...form, incrementAmount: e.target.value, newSalary: Number(form.previousSalary || 0) + Number(e.target.value || 0) })} /></Field>
                <Field label="New Salary"><input className="control" min="0" type="number" value={form.newSalary} onChange={(e) => setForm({ ...form, newSalary: e.target.value })} /></Field>
                <Field label="Effective Date"><input className="control" type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} /></Field>
                <Field label="Reason"><textarea className="control" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
              </div>
            )}


            {modal === "schoolSettings" && (
              <div className="form-grid">
                <Field label="School Name"><input className="control" value={form.schoolName || ""} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required /></Field>
                <Field label="Subtitle"><input className="control" value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
                <Field label="Left Logo URL"><input className="control" value={form.leftLogoUrl || ""} onChange={(e) => setForm({ ...form, leftLogoUrl: e.target.value })} placeholder="Paste logo image URL" /></Field>
                <Field label="Right Logo URL"><input className="control" value={form.rightLogoUrl || ""} onChange={(e) => setForm({ ...form, rightLogoUrl: e.target.value })} placeholder="Paste logo image URL" /></Field>
                <Field label="Address"><input className="control" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
                <Field label="Phone"><input className="control" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Website"><input className="control" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
                <Field label="Report Title"><input className="control" value={form.defaultExamTitle || ""} onChange={(e) => setForm({ ...form, defaultExamTitle: e.target.value })} /></Field>
                <Field label="Principal Name"><input className="control" value={form.principalName || ""} onChange={(e) => setForm({ ...form, principalName: e.target.value })} /></Field>
                <Field label="Default Remarks"><input className="control" value={form.resultRemarksDefault || ""} onChange={(e) => setForm({ ...form, resultRemarksDefault: e.target.value })} /></Field>
                <Field label="Admission/Notice Text"><textarea className="control" value={form.admissionNotice || ""} onChange={(e) => setForm({ ...form, admissionNotice: e.target.value })} /></Field>
              </div>
            )}

            {modal === "monthlyFees" && <Field label="Billing Month"><input className="control" type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>}
            {modal === "examFees" && <Field label="Exam Term"><input className="control" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} required /></Field>}
            {modal === "monthlySalaries" && <Field label="Salary Month"><input className="control" type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>}

            <div className="modal-actions">
              <button className="btn soft" type="button" onClick={() => { setModal(null); setEditingId(""); }}>Cancel</button>
              <button className="btn primary" type="submit">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}
