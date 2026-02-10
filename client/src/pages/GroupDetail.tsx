import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import type { GroupDetail as GroupDetailType } from "../api";
import { useAuth } from "../auth";
import Banner from "../components/Banner";
import GroupIcon from "../components/GroupIcon";
import PersonIcon from "../components/PersonIcon";

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupDetailType | null>(null);
  const [error, setError] = useState("");

  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<{ id: number; name: string; title: string }[]>([]);

  const isOwner = group?.owner.id === user?.id;
  const canManageMembers = isOwner || !!group?.openMembership;

  useEffect(() => {
    loadGroup();
  }, [id]);

  const loadGroup = async () => {
    try {
      const data = await api.groups.get(Number(id));
      setGroup(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load group");
    }
  };

  const handleRemoveMember = async (userId: number) => {
    await api.groups.removeMember(Number(id), userId);
    loadGroup();
  };

  const handleSearchMembers = async () => {
    if (!memberSearch.trim()) {
      setMemberResults([]);
      return;
    }
    const results = await api.users.search(memberSearch);
    const currentMemberIds = new Set(group?.members.map((m) => m.id));
    setMemberResults(results.filter((r) => !currentMemberIds.has(r.id)));
  };

  const handleAddMember = async (userId: number) => {
    await api.groups.addMember(Number(id), userId);
    setMemberSearch("");
    setMemberResults([]);
    loadGroup();
  };

  if (error) return <><Banner /><div className="page"><p className="error">{error}</p></div></>;
  if (!group) return <><Banner /><div className="page"><p>Loading...</p></div></>;

  return (
    <>
      <Banner />
      <div className="page">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="group-header">
          <div className="section-header">
            <h2><GroupIcon size={22} /> {group.name}</h2>
            {isOwner && (
              <button className="btn-secondary" onClick={() => navigate(`/groups/${id}/edit`)}>
                Edit
              </button>
            )}
          </div>
          <p className="group-description">{group.description}</p>
          <p>
            Owner: <Link to={`/profile/${group.owner.id}`}>{group.owner.name}</Link>
          </p>
        </div>

        <h3>Members ({group.members.length})</h3>
        <div className="list">
          {group.members.map((member) => (
            <div key={member.id} className="list-item member-item">
              <Link to={`/profile/${member.id}`} className="member-link"><PersonIcon size={16} /> {member.name} <span className="member-title">· {member.title}</span></Link>
              {(isOwner || member.id === user?.id) && (
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveMember(member.id)}
                  title={member.id === user?.id ? "Leave group" : "Remove member"}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {canManageMembers && (
            <div className="add-member">
              <input
                type="text"
                placeholder="Find person to add..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchMembers())}
              />
              <button className="btn-primary" onClick={handleSearchMembers}>
                Find
              </button>
              {memberResults.length > 0 && (
                <div className="member-results">
                  {memberResults.map((person) => (
                    <div key={person.id} className="member-result-item">
                      <span className="member-link"><PersonIcon size={14} /> {person.name} · {person.title}</span>
                      <button onClick={() => handleAddMember(person.id)}>Add</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
