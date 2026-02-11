import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { AutomationRule } from "../api";
import Banner from "../components/Banner";
import AutomaticMembershipIcon from "../components/AutomaticMembershipIcon";

const ATTRIBUTES = [
  { value: "title", label: "Title" },
  { value: "organization", label: "Organization" },
  { value: "email", label: "Email" },
];

const OPERATORS = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "does_not_contain", label: "does not contain" },
  { value: "is_one_of", label: "is one of" },
  { value: "is_not_one_of", label: "is not one of" },
];

const MULTI_VALUE_OPERATORS = ["is_one_of", "is_not_one_of"];

interface FilterRow {
  attribute: string;
  operator: string;
  value: string;
}

function AutocompleteInput({
  value,
  onChange,
  attribute,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  attribute: string;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.groups.getDistinctValues(attribute).then(setSuggestions);
  }, [attribute]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
      />
      {showDropdown && filtered.length > 0 && (
        <div className="autocomplete-dropdown">
          {filtered.map((s) => (
            <div
              key={s}
              className="autocomplete-item"
              onMouseDown={() => { onChange(s); setShowDropdown(false); }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiValueInput({
  values,
  onChange,
  attribute,
}: {
  values: string[];
  onChange: (vals: string[]) => void;
  attribute: string;
}) {
  const [inputVal, setInputVal] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.groups.getDistinctValues(attribute).then(setSuggestions);
  }, [attribute]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputVal.toLowerCase()) &&
      !values.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  function addValue(val: string) {
    const trimmed = val.trim();
    if (trimmed && !values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...values, trimmed]);
    }
    setInputVal("");
    setShowDropdown(false);
  }

  function removeValue(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  return (
    <div className="multi-value-wrapper" ref={wrapperRef}>
      <div className="chip-container">
        {values.map((v, i) => (
          <span key={i} className="chip">
            {v}
            <button className="chip-remove" onClick={() => removeValue(i)} type="button">
              &times;
            </button>
          </span>
        ))}
        <div className="autocomplete-wrapper chip-input-wrapper">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => { setInputVal(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addValue(inputVal); }
              if (e.key === "Backspace" && !inputVal && values.length > 0) {
                removeValue(values.length - 1);
              }
            }}
            placeholder={values.length === 0 ? "Type to add values..." : ""}
          />
          {showDropdown && filtered.length > 0 && (
            <div className="autocomplete-dropdown">
              {filtered.map((s) => (
                <div
                  key={s}
                  className="autocomplete-item"
                  onMouseDown={() => addValue(s)}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AutomationRuleEdit() {
  const { id } = useParams();
  const groupId = Number(id);
  const navigate = useNavigate();
  const [existingRule, setExistingRule] = useState<AutomationRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [filters, setFilters] = useState<FilterRow[]>([{ attribute: "title", operator: "is", value: "" }]);
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [addOnUpdate, setAddOnUpdate] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const group = await api.groups.get(groupId);
        setGroupName(group.name);
        const rule = await api.groups.getRule(groupId);
        setExistingRule(rule);
        if (rule) {
          setFilters(rule.filters.map((f) => ({ attribute: f.attribute, operator: f.operator, value: f.value })));
          setLogic(rule.logic);
          setAddOnUpdate(rule.addOnUpdate);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
      setLoading(false);
    }
    load();
  }, [groupId]);

  function updateFilter(index: number, field: keyof FilterRow, value: string) {
    setFilters((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "attribute") {
        const isMulti = MULTI_VALUE_OPERATORS.includes(updated[index].operator);
        updated[index].value = isMulti ? "[]" : "";
      }
      if (field === "operator") {
        const wasMulti = MULTI_VALUE_OPERATORS.includes(prev[index].operator);
        const isMulti = MULTI_VALUE_OPERATORS.includes(value);
        if (wasMulti !== isMulti) {
          updated[index].value = isMulti ? "[]" : "";
        }
      }
      return updated;
    });
  }

  function addFilter() {
    setFilters((prev) => [...prev, { attribute: "title", operator: "is", value: "" }]);
  }

  function removeFilter(index: number) {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError("");
    for (const f of filters) {
      if (MULTI_VALUE_OPERATORS.includes(f.operator)) {
        const vals: string[] = JSON.parse(f.value || "[]");
        if (vals.length === 0) { setError("All filters must have a value"); return; }
      } else if (!f.value.trim()) { setError("All filters must have a value"); return; }
    }

    try {
      await api.groups.saveRule(groupId, {
        logic,
        addOnCreate: true,
        addOnUpdate,
        filters: filters.map((f, i) => ({ attribute: f.attribute, operator: f.operator, value: f.value, sortOrder: i })),
      });
      navigate(-1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save rule");
    }
  }

  async function handleDelete() {
    try {
      await api.groups.deleteRule(groupId);
      navigate(-1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  }

  function getMultiValues(val: string): string[] {
    try { return JSON.parse(val || "[]"); } catch { return []; }
  }

  if (loading) return <><Banner /><div className="page"><p>Loading...</p></div></>;

  return (
    <>
      <Banner />
      <div className="page">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← {groupName}
        </button>
        <h2>{existingRule ? <><AutomaticMembershipIcon size={22} /> Edit Automatic Membership</> : <><AutomaticMembershipIcon size={22} /> Configure Automatic Membership</>}</h2>
        <div className="group-form automation-form">
          <span className="automation-form-label">Filters</span>
          <div className="automation-filters-list">
            {filters.map((f, i) => (
              <div key={i} className="automation-filter-item">
                {i > 0 && (
                  <div className="automation-logic-toggle">
                    <select value={logic} onChange={(e) => setLogic(e.target.value as "AND" | "OR")}>
                      <option value="AND">and</option>
                      <option value="OR">or</option>
                    </select>
                  </div>
                )}
                <div className="automation-filter-row">
                  <select value={f.attribute} onChange={(e) => updateFilter(i, "attribute", e.target.value)}>
                    {ATTRIBUTES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  <select value={f.operator} onChange={(e) => updateFilter(i, "operator", e.target.value)}>
                    {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {MULTI_VALUE_OPERATORS.includes(f.operator) ? (
                    <MultiValueInput
                      values={getMultiValues(f.value)}
                      onChange={(vals) => updateFilter(i, "value", JSON.stringify(vals))}
                      attribute={f.attribute}
                    />
                  ) : (
                    <AutocompleteInput
                      value={f.value}
                      onChange={(val) => updateFilter(i, "value", val)}
                      attribute={f.attribute}
                      placeholder="Value..."
                    />
                  )}
                  {filters.length > 1 && (
                    <button className="automation-filter-remove" onClick={() => removeFilter(i)} type="button">&#x2715;</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button className="btn-link" onClick={addFilter} type="button">+ Add Another Filter</button>

          <hr className="automation-divider" />

          <span className="automation-form-label">Actions</span>
          <div className="automation-actions-config">
            <div className="automation-action-row">
              <label className="automation-action-label">
                <input type="checkbox" checked disabled />
                Add Member on Create
              </label>
              <span className="automation-action-info has-tooltip" data-tooltip="New hires matching filters are automatically added to group">&#9432;</span>
            </div>
            <div className="automation-action-row">
              <label className="automation-action-label">
                <input type="checkbox" checked={addOnUpdate} onChange={(e) => setAddOnUpdate(e.target.checked)} />
                Add Member on Update
              </label>
              <span className="automation-action-info has-tooltip" data-tooltip="Existing employees that now match filters are automatically added to group">&#9432;</span>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="form-actions automation-footer">
            {existingRule ? (
              <button type="button" className="btn-danger" onClick={handleDelete}>Delete Rule</button>
            ) : (
              <div />
            )}
            <div className="automation-footer-right">
              <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleSave}>Save Rule</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
