import { useState, useEffect } from "react";
import { api } from "../api";
import type { Employee } from "../api";

const TITLES = [
  "Hiring Manager",
  "Product Manager",
  "Product Manager & Builder",
  "Engineer",
  "Designer",
  "Engineering Manager",
  "Recruiter",
  "Marketing Manager",
  "Account Executive",
  "Analyst",
  "UX Researcher",
];

const ORGANIZATIONS = [
  "Human Resources",
  "Research & Development",
  "Marketing",
  "Sales",
  "Finance",
  "Operations",
];

function nameToEmail(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, ".");
  const domain = slug === "zack.burgess" ? "hey.com" : "company.com";
  return `${slug}@${domain}`;
}

interface Props {
  onClose: () => void;
  adminEmail: string;
}

export default function ManageEmployeesModal({ onClose, adminEmail }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editOrg, setEditOrg] = useState("");

  // Create form state
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState(TITLES[0]);
  const [newOrg, setNewOrg] = useState(ORGANIZATIONS[0]);

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const data = await api.admin.getEmployees();
    setEmployees(data);
  }

  const activeEmployees = employees
    .filter((e) => !e.suspendedAt)
    .sort((a, b) => {
      if (a.email === adminEmail) return -1;
      if (b.email === adminEmail) return 1;
      return b.id - a.id; // newest first
    });
  const suspendedEmployees = employees
    .filter((e) => e.suspendedAt)
    .sort((a, b) => new Date(b.suspendedAt!).getTime() - new Date(a.suspendedAt!).getTime());

  function expandEmployee(emp: Employee) {
    if (expandedId === emp.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(emp.id);
    setEditName(emp.name);
    setEditTitle(emp.title);
    setEditOrg(emp.organization);
    setError("");
  }

  function isNameTaken(name: string, excludeId?: number): boolean {
    const email = nameToEmail(name);
    return employees.some((e) => e.email === email && e.id !== excludeId);
  }

  function getNameError(name: string, excludeId?: number): string {
    const trimmed = name.trim();
    if (!trimmed) return "";
    if (isNameTaken(trimmed, excludeId)) return "An employee with that name already exists";
    return "";
  }

  async function handleUpdate(emp: Employee) {
    setError("");
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    if (isNameTaken(trimmed, emp.id)) {
      setError("An employee with that name already exists");
      return;
    }
    try {
      await api.admin.updateEmployee(emp.id, {
        name: trimmed,
        title: editTitle,
        organization: editOrg,
      });
      setExpandedId(null);
      await loadEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSuspend(emp: Employee) {
    try {
      await api.admin.suspendEmployee(emp.id);
      setExpandedId(null);
      await loadEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreate() {
    setError("");
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    if (isNameTaken(trimmed)) {
      setError("An employee with that name already exists");
      return;
    }
    try {
      await api.admin.createEmployee({
        name: trimmed,
        title: newTitle,
        organization: newOrg,
      });
      setCreating(false);
      setNewName("");
      setNewTitle(TITLES[0]);
      setNewOrg(ORGANIZATIONS[0]);
      await loadEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function isUpdateDisabled(emp: Employee): boolean {
    const trimmed = editName.trim();
    if (!trimmed) return true;
    if (isNameTaken(trimmed, emp.id)) return true;
    return (
      trimmed === emp.name &&
      editTitle === emp.title &&
      editOrg === emp.organization
    );
  }

  const editNameError = expandedId ? getNameError(editName, expandedId) : "";
  const newNameError = creating ? getNameError(newName) : "";

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>{creating ? "Create Employee" : "Manage Employees"}</h2>
          {!creating && <button className="modal-close" onClick={onClose}>&times;</button>}
        </div>
        <div className="modal-body">
          {!creating && (
            <button
              className="btn-primary"
              style={{ marginBottom: "1rem", width: "100%" }}
              onClick={() => { setCreating(true); setExpandedId(null); setError(""); }}
            >
              Create Employee
            </button>
          )}

          {creating && (
            <div className="employee-create-form">
              <div className="form-field">
                <label>Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="First Last"
                />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input
                  type="text"
                  className="email-input-disabled"
                  placeholder="first.last@company.com"
                  value={newName.trim() ? nameToEmail(newName) : ""}
                  readOnly
                  tabIndex={-1}
                />
                {newNameError && <p className="error">{newNameError}</p>}
              </div>
              <div className="form-field">
                <label>Title</label>
                <select value={newTitle} onChange={(e) => setNewTitle(e.target.value)}>
                  {TITLES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Organization</label>
                <select value={newOrg} onChange={(e) => setNewOrg(e.target.value)}>
                  {ORGANIZATIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              {error && <p className="error">{error}</p>}
              <div className="form-actions" style={{ marginTop: "0.75rem" }}>
                <button className="btn-secondary" onClick={() => { setCreating(false); setError(""); }}>
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreate}
                  disabled={!newName.trim() || isNameTaken(newName.trim())}
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {!creating && (
            <>
              <h3 className="employee-section-header">Active Employees ({activeEmployees.length})</h3>
              <div className="employee-list">
                {activeEmployees.map((emp) => (
                  <div key={emp.id}>
                    <div
                      className="employee-item"
                      onClick={() => emp.email !== adminEmail && expandEmployee(emp)}
                    >
                      <div>
                        <span className="employee-name">{emp.name}</span>
                        <span className="employee-title">{emp.title}</span>
                      </div>
                      {emp.email !== adminEmail && (
                        <button
                          className="icon-btn"
                          onClick={(e) => { e.stopPropagation(); expandEmployee(emp); }}
                        >
                          ✏
                        </button>
                      )}
                    </div>
                    {expandedId === emp.id && (
                      <div className="employee-item-expanded">
                        <div className="form-field">
                          <label>Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label>Email</label>
                          <input
                            type="text"
                            className="email-input-disabled"
                  placeholder="first.last@company.com"
                            value={editName.trim() ? nameToEmail(editName) : ""}
                            readOnly
                            tabIndex={-1}
                          />
                          {editNameError && <p className="error">{editNameError}</p>}
                        </div>
                        <div className="form-field">
                          <label>Title</label>
                          <select value={editTitle} onChange={(e) => setEditTitle(e.target.value)}>
                            {TITLES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-field">
                          <label>Organization</label>
                          <select value={editOrg} onChange={(e) => setEditOrg(e.target.value)}>
                            {ORGANIZATIONS.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>
                        {error && <p className="error">{error}</p>}
                        <div className="employee-actions">
                          <button
                            className="btn-primary"
                            onClick={() => handleUpdate(emp)}
                            disabled={isUpdateDisabled(emp)}
                          >
                            Update
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => handleSuspend(emp)}
                          >
                            Suspend
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {suspendedEmployees.length > 0 && (
                <div className="suspended-section">
                  <h3 className="employee-section-header">Suspended Employees ({suspendedEmployees.length})</h3>
                  <div className="employee-list">
                    {suspendedEmployees.map((emp) => (
                      <div key={emp.id} className="employee-item employee-suspended">
                        <div>
                          <span className="employee-name">{emp.name}</span>
                          <span className="employee-title">{emp.title}</span>
                        </div>
                        <span className="employee-date">
                          {new Date(emp.suspendedAt!).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
