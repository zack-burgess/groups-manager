import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import type { GroupDetail as GroupDetailType, AutomationFilter } from "../api";
import { useAuth } from "../auth";
import Banner from "../components/Banner";
import GroupIcon from "../components/GroupIcon";
import PersonIcon from "../components/PersonIcon";
import AutomaticMembershipIcon from "../components/AutomaticMembershipIcon";

function formatFilter(f: AutomationFilter) {
  const attrLabel: Record<string, string> = { email: "Email", title: "Title", organization: "Organization" };
  const opLabel: Record<string, string> = {
    is: "is",
    is_not: "is not",
    contains: "contains",
    does_not_contain: "does not contain",
    is_one_of: "is one of",
    is_not_one_of: "is not one of",
  };
  const attr = attrLabel[f.attribute] || f.attribute;
  const op = opLabel[f.operator] || f.operator;
  const valueText = (f.operator === "is_one_of" || f.operator === "is_not_one_of")
    ? (JSON.parse(f.value) as string[]).map((v) => `"${v}"`).join(", ")
    : `"${f.value}"`;
  return (
    <>
      <span className="filter-attr">{attr}</span>{" "}
      <span className="filter-op">{op}</span>{" "}
      <span className="filter-val">{valueText}</span>
    </>
  );
}

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupDetailType | null>(null);
  const [error, setError] = useState("");

  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<{ id: number; name: string; title: string }[]>([]);

  const isAdmin = group?.members.some((m) => m.id === user?.id && m.isAdmin) ?? false;
  const canManageMembers = isAdmin || !!group?.openMembership;

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

  const handlePromoteMember = async (userId: number) => {
    await api.groups.promoteAdmin(Number(id), userId);
    loadGroup();
  };

  const handleDemoteMember = async (userId: number) => {
    await api.groups.demoteAdmin(Number(id), userId);
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
    setMemberResults((prev) => prev.filter((p) => p.id !== userId));
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
            {isAdmin && (
              <button className="btn-secondary" onClick={() => navigate(`/groups/${id}/edit`)}>
                Edit Group
              </button>
            )}
          </div>
          <p className="group-description">{group.description}</p>
          <div className="automation-inline">
            <div className="automation-inline-header">
              <span className="automation-inline-label"><AutomaticMembershipIcon size={16} /> Automatic Membership</span>
              {isAdmin && (
                group.automationRule ? (
                  <button
                    className="automation-edit-btn has-tooltip"
                    onClick={() => navigate(`/groups/${id}/automation`)}
                    data-tooltip="Edit Rule"
                  >
                    <span className="pencil-icon">✏</span>
                  </button>
                ) : (
                  <button className="automation-inline-btn" onClick={() => navigate(`/groups/${id}/automation`)}>
                    Create Rule
                  </button>
                )
              )}
            </div>
            {group.automationRule ? (
              <>
                {group.automationRule.filters.map((f, i) => (
                  <div key={i} className="automation-inline-row automation-inline-indent">
                    {i === 0 ? <>When{" "}</> : <span className="automation-inline-spacer" aria-hidden="true">When </span>}{formatFilter(f)}{i < group.automationRule!.filters.length - 1 && (
                      <span className="automation-logic"> {group.automationRule!.logic.toLowerCase()}</span>
                    )}
                  </div>
                ))}
                <div className="automation-inline-row automation-inline-indent">
                  add Member{" "}<span className="automation-trigger">on Create</span>{group.automationRule.addOnUpdate ? <>{" "}and{" "}<span className="automation-trigger">on Update</span></> : null}.
                </div>
              </>
            ) : (
              <div className="automation-inline-row automation-inline-indent">
                <span className="automation-inline-empty">No rule configured, yet.</span>
              </div>
            )}
          </div>
        </div>

        <h3 style={{ marginTop: "2.5rem" }}>Members ({group.members.length})</h3>
        <p className="membership-hint">
          {group.openMembership ? "Anyone" : "Admins"} can add members. Anyone can remove themselves.
        </p>
        <div className="list">
          {group.members.map((member, idx) => (
            <div key={member.id} className="list-item member-item">
              <Link to={`/profile/${member.id}`} className="member-link">
                <PersonIcon size={16} /> {member.name}
                <span className="member-title">· {member.title}</span>
              </Link>
              <div className="member-actions">
                <span className={member.isAdmin ? "admin-badge" : "member-badge"}>
                  {member.isAdmin ? "Admin" : "Member"}
                </span>
                {isAdmin && member.isAdmin && (
                  <button
                    className={`remove-btn has-tooltip${idx === 0 ? " tooltip-below" : ""}`}
                    onClick={() => handleDemoteMember(member.id)}
                    data-tooltip="Move to Member"
                  >
                    ✕
                  </button>
                )}
                {isAdmin && !member.isAdmin && (
                  <button
                    className={`promote-btn has-tooltip${idx === 0 ? " tooltip-below" : ""}`}
                    onClick={() => handlePromoteMember(member.id)}
                    data-tooltip="Make Admin"
                  >
                    ↑
                  </button>
                )}
                {(isAdmin || member.id === user?.id) && !member.isAdmin && (
                  <button
                    className={`remove-btn has-tooltip${idx === 0 ? " tooltip-below" : ""}`}
                    onClick={() => handleRemoveMember(member.id)}
                    data-tooltip="Remove from Group"
                  >
                    ✕
                  </button>
                )}
              </div>
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
                      <div className="member-actions">
                        <span className="member-badge" style={{ visibility: "hidden" }}>Member</span>
                        <button className="promote-btn has-tooltip" onClick={() => handleAddMember(person.id)} data-tooltip="Make Member">&#x2191;</button>
                        <span className="remove-btn" style={{ visibility: "hidden" }}>✕</span>
                      </div>
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
