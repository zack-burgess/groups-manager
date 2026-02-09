import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Banner() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [gearOpen, setGearOpen] = useState(false);

  return (
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
        <div className="gear-wrapper">
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
  );
}
