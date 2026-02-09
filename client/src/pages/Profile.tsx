import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import type { UserProfile } from "../api";
import { useAuth } from "../auth";
import Banner from "../components/Banner";
import GroupIcon from "../components/GroupIcon";
import PersonIcon from "../components/PersonIcon";

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");

  const isOwnProfile = !id || Number(id) === user?.id;

  useEffect(() => {
    const load = async () => {
      try {
        const data = isOwnProfile ? await api.users.me() : await api.users.get(Number(id));
        setProfile(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    };
    load();
  }, [id, isOwnProfile]);

  if (error) return <><Banner /><div className="page"><p className="error">{error}</p></div></>;
  if (!profile) return <><Banner /><div className="page"><p>Loading...</p></div></>;

  return (
    <>
      <Banner />
      <div className="page">
        {id && (
          <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        )}
        <div className="profile-card">
          <h2><PersonIcon size={22} /> {profile.name}</h2>
          <p>{profile.title}</p>
          <p>{profile.organization}</p>
          <p className="email">{profile.email}</p>
        </div>

        <div className="section-header">
          <h3>{isOwnProfile ? "My Groups" : "Groups"}</h3>
          {isOwnProfile && (
            <button className="btn-primary" onClick={() => navigate("/groups/new")}>
              + New Group
            </button>
          )}
        </div>

        <div className="list">
          {profile.groups.length === 0 && <p className="empty">No groups yet.</p>}
          {profile.groups.map((group) => (
            <Link key={group.id} to={`/groups/${group.id}`} className="list-item group-list-item">
              <span className="group-list-name"><GroupIcon size={16} /> {group.name}</span>
              <span className="group-list-meta">{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
