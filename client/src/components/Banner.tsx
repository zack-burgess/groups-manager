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
              ⚙
            </button>
            {gearOpen && (
              <div className="gear-dropdown">
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
                    setShowEmployees(true);
                  }}
                >
                  Create &amp; Manage Employees
                </button>
                <button onClick={() => { setGearOpen(false); handleReset(); }}>
                  Clear Database &amp; Logout
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
    </>
  );
}
