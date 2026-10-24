import { useId } from "react";

export const DEFAULT_FILTERS = { difficulty: "all", search: "" };

const DIFFICULTIES = [
  { value: "all", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
];

export function applyEventFilters(events, filters) {
  const { difficulty, search } = { ...DEFAULT_FILTERS, ...filters };
  const q = search.trim().toLowerCase();

  return events.filter((e) => {
    if (difficulty !== "all" && e.difficulty !== difficulty) return false;

    if (q) {
      // Matches the place name or the full address
      const haystack = [e.location, e.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export default function EventFilters({
  filters,
  onChange,
  resultCount,
  totalCount,
}) {
  const uid = useId();
  const searchId = `${uid}-search`;

  const isFiltered =
    filters.difficulty !== "all" || filters.search.trim() !== "";

  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <section
      aria-label="Filter events"
      className="card border-0 shadow-sm rounded-4 p-3 mb-4"
    >
      <div className="row g-3 align-items-end">
        {/* Location search */}
        <div className="col-12 col-md-5">
          <label htmlFor={searchId} className="form-label fw-medium mb-1">
            Search by location
          </label>
          <div className="input-group">
            <input
              id={searchId}
              type="search"
              className="form-control"
              placeholder="e.g. Blue Mountain or Toronto"
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              autoComplete="off"
            />
            {filters.search && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => update({ search: "" })}
                aria-label="Clear location search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Difficulty (radio group: arrow keys move between options) */}
        <div className="col-12 col-md-7">
          <fieldset>
            <legend className="form-label fw-medium mb-1 fs-6">
              Difficulty
            </legend>
            <div className="d-flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => {
                const inputId = `${uid}-diff-${d.value}`;
                return (
                  <div key={d.value}>
                    <input
                      type="radio"
                      className="btn-check"
                      name={`${uid}-difficulty`}
                      id={inputId}
                      value={d.value}
                      checked={filters.difficulty === d.value}
                      onChange={() => update({ difficulty: d.value })}
                    />
                    <label
                      className="btn btn-outline-success rounded-pill"
                      htmlFor={inputId}
                    >
                      {d.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>
      </div>

      {/* Result count (announced by screen readers) + clear button */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
        <span className="text-muted small" role="status" aria-live="polite">
          {isFiltered
            ? `Showing ${resultCount} of ${totalCount} events`
            : `${totalCount} events`}
        </span>

        {isFiltered && (
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}
