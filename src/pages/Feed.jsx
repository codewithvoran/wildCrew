import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import EventCard from "../Components/EventCard";
import Filter, {
  DEFAULT_FILTERS,
  applyEventFilters,
} from "../Components/Filter";

export default function Feed() {
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState({}); // { [eventId]: { likes, comments } }
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Upcoming events (live)
  useEffect(() => {
    // Local date as YYYY-MM-DD. toISOString() uses UTC, which is already
    // "tomorrow" in Toronto after about 8 pm and would hide today's events.
    const today = new Date().toLocaleDateString("en-CA");

    const q = query(
      collection(db, "events"),
      where("date", ">=", today),
      orderBy("date", "asc"),
    );

    const unsubEvents = onSnapshot(
      q,
      (snapshot) => {
        setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Error loading events:", error);
        setLoading(false);
      },
    );

    return () => unsubEvents();
  }, []);

  // Like and comment counts. One listener per event, cleaned up when the
  // list of events changes or the page closes (the old version created new
  // listeners on every update and never removed them).
  const eventIds = events.map((e) => e.id).join(",");

  useEffect(() => {
    if (!eventIds) return;

    const unsubs = eventIds.split(",").flatMap((id) => [
      onSnapshot(collection(db, "events", id, "likes"), (snap) =>
        setCounts((prev) => ({
          ...prev,
          [id]: { ...prev[id], likes: snap.size },
        })),
      ),
      onSnapshot(collection(db, "events", id, "comments"), (snap) =>
        setCounts((prev) => ({
          ...prev,
          [id]: { ...prev[id], comments: snap.size },
        })),
      ),
    ]);

    return () => unsubs.forEach((unsub) => unsub());
  }, [eventIds]);

  // Apply the difficulty and location filters
  const visibleEvents = useMemo(
    () => applyEventFilters(events, filters),
    [events, filters],
  );

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h2 className="mb-0">Upcoming Events</h2>

        <Link to="/create" className="btn btn-primary rounded-pill">
          + Create Event
        </Link>
      </div>

      <Filter
        filters={filters}
        onChange={setFilters}
        resultCount={visibleEvents.length}
        totalCount={events.length}
      />

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading events...</span>
          </div>
        </div>
      )}

      {!loading && events.length === 0 && (
        <p className="text-muted">
          No upcoming events yet. Be the first to create one!
        </p>
      )}

      {!loading && events.length > 0 && visibleEvents.length === 0 && (
        <div className="text-center py-5">
          <p className="text-muted mb-2">No events match your filters.</p>
          <button
            type="button"
            className="btn btn-outline-success rounded-pill"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="row g-4">
        {visibleEvents.map((event) => (
          <EventCard
            key={event.id}
            id={event.id}
            title={event.title}
            location={event.address || event.location}
            date={event.date}
            difficulty={event.difficulty}
            currentHeadcount={event.currentHeadcount}
            maxHeadcount={event.maxHeadcount}
            likeCount={counts[event.id]?.likes ?? 0}
            commentCount={counts[event.id]?.comments ?? 0}
            coverImage={event.coverImage}
            lng={event.longitude}
            lat={event.latitude}
          />
        ))}
      </div>
    </div>
  );
}
