import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import Banner from "../components/Banner";

interface PersonResult {
  id: number;
  name: string;
  title: string;
}

interface GroupResult {
  id: number;
  name: string;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [searched, setSearched] = useState(!!initialQuery);

  const runSearch = useCallback(async (q: string) => {
    const [peopleResults, groupResults] = await Promise.all([
      api.users.search(q),
      api.groups.search(q),
    ]);
    setPeople(peopleResults);
    setGroups(groupResults);
    setSearched(true);
  }, []);

  useEffect(() => {
    if (initialQuery) {
      runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearchParams({ q: query }, { replace: true });
    runSearch(query);
  };

  return (
    <>
      <Banner />
      <div className="page">
        {searched && (
          <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        )}
        {searched && <h2>Search Results</h2>}
        {!searched && <h2>Search</h2>}

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search Groups and People..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit">Go</button>
        </form>

        {searched && (
          <>
            <h3>People</h3>
            <div className="list">
              {people.length === 0 && <p className="empty">No people found.</p>}
              {people.map((person) => (
                <Link key={person.id} to={`/profile/${person.id}`} className="list-item">
                  {person.name} · {person.title}
                </Link>
              ))}
            </div>

            <h3>Groups</h3>
            <div className="list">
              {groups.length === 0 && <p className="empty">No groups found.</p>}
              {groups.map((group) => (
                <Link key={group.id} to={`/groups/${group.id}`} className="list-item">
                  {group.name}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
