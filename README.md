# School Manager

A role-based school management system with Admin, Teacher, Staff, Accountant, and Student access.

## Main Features

- Collapsible Admin Console: one-click minimize/expand sidebar.
- Minimized sidebar shows role icons for Admin, Teacher, Staff, Accountant, and Student.
- Expanded sidebar shows full navigation text with icons.
- Admin can add, edit, update, and delete students and employees.
- Teacher can add students and edit the details of any student.
- Teacher can access students by class, view due payments, and view marks.
- Teacher can create, update, and delete class routines.
- Teacher can enter, update, and delete marks for monthly exams, semester exams, and class tests.
- Accountant/Admin can manage class fee rules, payment records, salary ledgers, and salary increments.
- Teacher/employee users can view only their own salary and increment records when their profile email/name matches the employee record.
- Student users can view only their own profile, marks, results, and payment records when their profile email/name matches the student record.
- Total marks and contribution percentage are entered by the teacher.
- Salary ledger and salary increment history are available.
- Student profile includes personal details, due payments, marks, and final result summaries.
- Outfit font and interactive modern colors are used in the UI.

## Applied Business Logic

### Role Rules

- Admin: full control over students, employees, class fees, payments, marks, routines, salaries, and increments.
- Teacher: academic control. Teachers can add/edit students, view all students by class, manage routines, and manage marks.
- Accountant/Accounts: financial control. They manage payments, class fee rules, salary ledgers, and increments, but they do not edit marks.
- Staff/Employee: limited operational/self access.
- Student: own profile only.

### Student Rules

- Student name is required.
- Class fee rule/class is required.
- Roll/ID is required.
- Roll/ID remains unique inside the same class.
- Admin can delete students.
- Teacher can add/edit students but cannot delete students.

### Result Rules

- Monthly exam number must be 1 to 12.
- Semester exam number must be 1 to 3.
- Class test number must be 1 or 2 for each month.
- Class tests require a month.
- Obtained marks cannot be greater than total marks.
- Total marks must be greater than 0.
- Contribution percentage must be 0 to 100.
- Total final-result contribution for one student + subject + year cannot exceed 100%.
- Final result status becomes `Passed`, `Failed`, `Incomplete weight`, or `Over weighted` based on weighted score and contribution total.

### Routine Rules

- Class, day, start time, end time, subject, and teacher name are required.
- End time must be later than start time.
- The same class cannot have two overlapping active routine slots.
- The same teacher cannot have two overlapping active routine slots.

### Finance Rules

- Due amount = total amount - paid amount.
- Payment status becomes unpaid, partial, or paid automatically.
- Salary due is recalculated after salary payment records are created/updated.
- Student due is recalculated after payment records are created/updated.

## Database Connection

Create a `.env` file in the project root:

```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/EducationManagement
JWT_SECRET=change-this-secret-before-production
VITE_API_URL=http://localhost:5001
```

Use your existing MongoDB database name in `MONGODB_URI`. This upgrade does not delete or reset your existing database data.

Optional:

```env
MONGODB_DB=EducationManagement
```

Use `MONGODB_DB` only if your `MONGODB_URI` does not already include the database name.

## Install and Run

```bash
npm install
npm run server
```

Open a second terminal:

```bash
npm run client
```

Client URL:

```text
http://localhost:5173
```

Server URL:

```text
http://localhost:5001
```

## Notes

- If your old database already has student, employee, payment, salary, or class fee data, it will load from MongoDB.
- The frontend data loader is safer: one failed API module will not stop the whole dashboard from loading.
- New academic/routine/increment features use separate collections, so existing student/employee/payment schemas are preserved.


## GitHub-inspired UI Refresh

- Admin Console sidebar uses SVG icons and can minimize/expand with one click.
- Minimized mode keeps only Admin, Teacher, Staff, Accountant, and Student role icons visible.
- UI uses Outfit font, GitHub-style dark sidebar, bordered cards, clean tables, clear hover states, and visible focus states.
- Backend/database schema is unchanged; this update only improves the frontend interface and API port setup.


## Network Error Fix

This version uses Vite proxy to avoid frontend/backend port mismatch. Run from the project root:

```powershell
npm install
npm run dev
```

`npm run dev` starts both the backend on `http://localhost:5001` and the frontend on `http://localhost:5173`.

If you want two terminals instead:

```powershell
npm run server
```

Then:

```powershell
npm run client
```

Make sure MongoDB is running and `.env` has your correct database name.


## 2026 Market-Leading School ERP Comparison Update

I compared this project against common feature patterns in leading school management/SIS platforms such as PowerSchool-style SIS systems, Blackbaud/Veracross-style private-school platforms, and OpenEduCat/Fedena-style ERP platforms. The updated UI now includes a **Market Benchmark** module and a more premium dashboard experience.

### What was added in this version

- Fixed the common `Route not found` issue caused by duplicated `/api/api/...` requests.
- Added a frontend API base URL guard so `VITE_API_URL=/api` works correctly with the Vite proxy.
- Added a backend safety middleware that rewrites accidental `/api/api/...` requests to `/api/...`.
- Changed the default backend port from `5000` to `5001` to match the project `.env` and Vite proxy.
- Added a clearer `EADDRINUSE` message if the selected server port is already running.
- Added a premium blue/yellow/white school SaaS UI refresh.
- Added searchable tables across the dashboard so users can find records faster.
- Added a market benchmark page comparing your modules with leading school ERP/SIS expectations.
- Added dashboard quick-action cards for Students, Marks, and Fees.
- Added a collection-rate hero card and better decision-focused KPI cards.
- Added a roadmap panel for attendance, parent portal, online payment, notifications, audit logs, and reports.

### Current strength of this project

Your system already has a good operational base: role-based access, student records, class fee rules, payment ledger, employee records, salaries, salary increments, routines with overlap prevention, marks, weighted result calculation, and student profile summaries.

### Recommended next product upgrades

1. Attendance module with class/date-wise attendance and parent alerts.
2. Parent portal and student portal dashboard with notices, dues, and results.
3. Online payment gateway with receipt/PDF export.
4. Printable report cards and transcript-style reports.
5. Notice/SMS/email communication module.
6. Audit logs for admin actions.
7. Dashboard charts for monthly collection, unpaid fees, attendance, and exam performance.

## Route Not Found Fix Details

The old setup could create requests like this:

```text
/api/api/marks/results
/api/api/dashboard
```

But the backend routes are defined as:

```text
/api/marks/results
/api/dashboard
```

So the updated `client/src/api.js` now treats `VITE_API_URL=/api` as a Vite proxy mode and keeps Axios `baseURL` empty. This lets existing service calls like `/api/dashboard` hit the correct backend route.

Run everything from the root folder:

```powershell
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Latest update: result-card PDF and clean user header

This version removes the unused role shortcut strip and the old branding text in the sidebar. The layout now shows only the logged-in user avatar/initials, username, role, and module navigation.

### New features added

- Admin can update school report-card settings from **Result Cards > School Settings**:
  - School name
  - Subtitle
  - Left logo URL
  - Right logo URL
  - Address, phone, website
  - Report title
  - Principal name
  - Default remarks
  - Admission/notice text
- Teachers/admins can open **Result Cards**, filter by student and exam, then click **Download PDF**.
- Students can open **Result Cards** and see their own exam-wise generated result cards.
- The result-card design is based on a printed progress report layout with logos, school header, student information, subject marks table, total, result, remarks, notice, and signatures.
- PDF generation uses the browser print dialog. Click **Download PDF**, then choose **Save as PDF**.

### New API endpoint

```text
GET /api/school-settings
PUT /api/school-settings    Admin only
```
#   s c h o o l m a n a g e r  
 