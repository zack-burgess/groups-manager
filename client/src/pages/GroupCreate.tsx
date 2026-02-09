import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { GroupDetail } from "../api";
import { useAuth } from "../auth";
import Banner from "../components/Banner";

export default function GroupForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [openMembership, setOpenMembership] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [group, setGroup] = useState<GroupDetail | null>(null);

  useEffect(() => {
    if (isEdit) {
      api.groups.get(Number(id)).then((data) => {
        setGroup(data);
        setName(data.name);
        setDescription(data.description);
        setOpenMembership(data.openMembership);
        setLoading(false);
      }).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load group");
        setLoading(false);
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isEdit) {
        await api.groups.update(Number(id), { name, description, openMembership });
        navigate(`/groups/${id}`, { replace: true });
      } else {
        const created = await api.groups.create({ name, description, openMembership });
        navigate(`/groups/${created.id}`, { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save group");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    await api.groups.delete(Number(id));
    navigate("/profile");
  };

  if (loading) return <><Banner /><div className="page"><p>Loading...</p></div></>;

  return (
    <>
      <Banner />
      <div className="page">
        <form className="group-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="membership-toggle">
            <label>Who can manage members?</label>
            <div className="toggle-options">
              <button
                type="button"
                className={`toggle-btn ${!openMembership ? "active" : ""}`}
                onClick={() => setOpenMembership(false)}
              >
                Admins
              </button>
              <button
                type="button"
                className={`toggle-btn ${openMembership ? "active" : ""}`}
                onClick={() => setOpenMembership(true)}
              >
                Everyone
              </button>
            </div>
          </div>
          <p className="owner-label">Owner: {isEdit ? group?.owner.name : user?.name}</p>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>

        {isEdit && (
          <button className="btn-danger" onClick={handleDelete}>
            Delete Group
          </button>
        )}
      </div>
    </>
  );
}
