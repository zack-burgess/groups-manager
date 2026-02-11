import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { api } from "../api";
import ManageEmployeesModal from "./ManageEmployeesModal";
import AboutModal from "./AboutModal";

export default function Banner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [gearOpen, setGearOpen] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const gearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setGearOpen(false);
      }
    }
    if (gearOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [gearOpen]);

  async function handleReset() {
    await api.admin.resetDatabase();
    logout();
    navigate("/login");
  }

  return (
    <>
      <header className="banner">
        <span className="banner-title" onClick={() => navigate("/profile")}>
          Groups Manager
        </span>
        <div className="banner-actions">
          <button className="banner-btn" onClick={() => navigate("/profile")}>
            My Profile
          </button>
          <button className="banner-btn" onClick={() => navigate("/search")}>
            Search
          </button>
          <div className="gear-wrapper" ref={gearRef}>
            <button
              className="banner-btn gear-btn"
              onClick={() => setGearOpen(!gearOpen)}
            >
              ⚙&#xFE0E;
            </button>
            {gearOpen && (
              <div className="gear-dropdown">
                <button
                  onClick={() => {
                    setGearOpen(false);
                    setShowEmployees(true);
                  }}
                >
                  Create &amp; Manage Employees
                </button>
                <button onClick={() => { setGearOpen(false); setShowResetConfirm(true); }}>
                  Reset Demo
                </button>
                <hr className="gear-divider" />
                <button
                  onClick={() => {
                    setGearOpen(false);
                    setShowAbout(true);
                  }}
                >
                  About
                </button>
                <button
                  onClick={() => {
                    setGearOpen(false);
                    logout();
                    navigate("/login");
                  }}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {showEmployees && (
        <ManageEmployeesModal
          onClose={() => setShowEmployees(false)}
          adminEmail={user?.email || ""}
        />
      )}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reset Demo</h2>
              <button className="modal-close" onClick={() => setShowResetConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>All employee and group changes will be reverted. Continue?</p>
              <div className="confirm-actions">
                <button className="btn-secondary" onClick={() => setShowResetConfirm(false)}>Cancel</button>
                <button className="btn-danger" onClick={() => { setShowResetConfirm(false); handleReset(); }}>Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
