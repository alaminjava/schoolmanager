import { useState } from "react";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "students", label: "Students", icon: "student" },
  { key: "fees", label: "Fee Management", icon: "card" },
  { key: "employees", label: "Employees", icon: "users" },
  { key: "marks", label: "Marks & Results", icon: "marks" },
  { key: "resultCards", label: "Result Cards", icon: "report" },
  { key: "routines", label: "Class Routine", icon: "calendar" },
  { key: "salaries", label: "Salary & Increment", icon: "briefcase" },
  { key: "reports", label: "Reports", icon: "chart" },
  { key: "benchmark", label: "Market Benchmark", icon: "spark" },
];

const viewDescriptions = {
  dashboard: "Live overview of students, employees, collections, dues, marks, and routines.",
  students: "Add, edit, filter, and open complete student profiles with payments and academic marks.",
  fees: "Manage class fee rules, generate monthly fees, generate exam fees, and record student payments.",
  employees: "Manage teachers, staff, admins, and accountants with salary and contact details.",
  marks: "Record monthly exams, semester exams, and class tests with teacher-defined totals and result weights.",
  resultCards: "Generate printable result card PDFs for each exam, and allow students to view their own exam reports.",
  routines: "Build and maintain class routines by class, day, subject, teacher, room, and time.",
  salaries: "Track salary payments and salary increment history for teachers and employees.",
  reports: "Review financial and academic summaries for school decision-making.",
  benchmark: "Compare this system with market-leading school ERP/SIS patterns and see the next product roadmap.",
};

function Icon({ name }) {
  const props = { className: "app-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const icons = {
    dashboard: <><path d="M4 13h6V4H4v9Z"/><path d="M14 20h6V4h-6v16Z"/><path d="M4 20h6v-3H4v3Z"/></>,
    student: <><path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z"/><path d="M6.5 11v4.2c0 1.7 2.5 3.1 5.5 3.1s5.5-1.4 5.5-3.1V11"/><path d="M20 9v5"/></>,
    users: <><path d="M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M2.8 21c.6-3.9 2.9-6.2 6.2-6.2s5.6 2.3 6.2 6.2"/><path d="M17.5 10.2a3 3 0 1 0-.8-5.8"/><path d="M17.2 14.6c2.3.5 3.8 2.5 4.2 5.4"/></>,
    card: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"/><path d="M3 9h18"/><path d="M7 15h4"/></>,
    marks: <><path d="M6 3.5h9l3 3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><path d="M8 12h8"/><path d="M8 16h5"/></>,
    report: <><path d="M5 3h14v18H5V3Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h4"/><path d="M16 15l1.2 1.2L20 13.5"/></>,
    calendar: <><path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3 10h18"/><path d="M8 14h3"/><path d="M14 14h2"/><path d="M8 18h2"/></>,
    briefcase: <><path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"/><path d="M4 8h16v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8Z"/><path d="M4 12h16"/><path d="M10 12v2h4v-2"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-7"/></>,
    spark: <><path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/><path d="M5 14l.7 1.8L7.5 16.5l-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14Z"/></>,
    menu: <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
    collapse: <><path d="M15 18 9 12l6-6"/><path d="M20 4v16"/></>,
  };
  return <svg {...props}>{icons[name] || icons.dashboard}</svg>;
}

function getInitials(name = "User") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function UserAvatar({ user, small = false }) {
  const className = small ? "profile-avatar small" : "profile-avatar";
  if (user?.photoUrl) {
    return <span className={className}><img alt={user.name || "User"} src={user.photoUrl} /></span>;
  }
  return <span className={className}>{getInitials(user?.name)}</span>;
}

export default function AdminLayout({ activeView, children, onLogout, onViewChange, user }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const activeItem = navItems.find((item) => item.key === activeView) || navItems[0];

  return (
    <div className={isCollapsed ? "erp-shell sidebar-collapsed" : "erp-shell"}>
      <aside className="erp-sidebar">
        <div className="brand-box user-brand-box">
          <button aria-label={isCollapsed ? "Expand menu" : "Minimize menu"} className="sidebar-toggle" type="button" onClick={() => setIsCollapsed((value) => !value)} title={isCollapsed ? "Open menu" : "Minimize menu"}>
            <Icon name={isCollapsed ? "menu" : "collapse"} />
          </button>
          <UserAvatar user={user} />
          <div className="brand-copy profile-copy">
            <h1>{user.name}</h1>
            <small>{user.role}</small>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="School modules">
          {navItems.map((item) => (
            <button aria-label={item.label} className={activeView === item.key ? "nav-button active" : "nav-button"} key={item.key} type="button" onClick={() => onViewChange(item.key)} title={item.label}>
              <span className="nav-icon"><Icon name={item.icon} /></span>
              <span className="nav-text">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="erp-main">
        <header className="erp-topbar clean-topbar">
          <div className="topbar-title">
            <h2><span className="title-icon"><Icon name={activeItem.icon} /></span>{activeItem.label}</h2>
            <small>{viewDescriptions[activeView]}</small>
          </div>
          <div className="topbar-actions">
            <select className="control mobile-nav" value={activeView} onChange={(event) => onViewChange(event.target.value)}>
              {navItems.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <span className="topbar-user-chip"><UserAvatar user={user} small /><strong>{user.name}</strong></span>
            <button className="btn dark" type="button" onClick={onLogout}>Logout</button>
          </div>
        </header>
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
