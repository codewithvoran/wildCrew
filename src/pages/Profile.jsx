import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// Status words your Dashboard may write (matched loosely, case-insensitive)
const ACCEPTED = ["accepted", "approved"];

/* ---------------------------- helpers ---------------------------- */
// Your events store date ("YYYY-MM-DD") and time ("HH:mm") as strings.
// Building the Date without a "Z" keeps it in the user's local time zone.
const eventDateTime = (e) => {
  if (!e?.date) return null;
  const d = new Date(`${e.date}T${e.time || "00:00"}`);
  return isNaN(d) ? null : d;
};

const formatWhen = (e) => {
  const d = eventDateTime(e);
  if (!d) return "Date TBD";
  const day = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return e.time ? `${day} at ${e.time}` : day;
};

const formatMemberSince = (value) => {
  const d = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!d || isNaN(d)) return "—";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const difficultyColor = {
  easy: "success",
  moderate: "warning",
  hard: "danger",
};

/* ---------------------------- event card ---------------------------- */
function EventCard({ event, onEdit, onDelete }) {
  return (
    <div className="card h-100 shadow-sm border-0 rounded-4 overflow-hidden">
      {event.coverImage ? (
        <img
          src={event.coverImage}
          alt={event.title}
          className="card-img-top"
          style={{ height: 150, objectFit: "cover" }}
        />
      ) : (
        <div
          className="bg-light d-flex align-items-center justify-content-center text-muted"
          style={{ height: 150 }}
        >
          No image
        </div>
      )}

      <div className="card-body d-flex flex-column">
        <div className="d-flex gap-1 mb-2 flex-wrap">
          {event.activityType && (
            <span className="badge bg-dark bg-opacity-75 text-capitalize fw-normal">
              {event.activityType}
            </span>
          )}
          {event.difficulty && (
            <span
              className={`badge text-capitalize fw-normal bg-${
                difficultyColor[event.difficulty] || "secondary"
              }`}
            >
              {event.difficulty}
            </span>
          )}
        </div>

        <h6 className="card-title mb-1">{event.title || "Untitled event"}</h6>
        <p className="small text-muted mb-1">{formatWhen(event)}</p>
        <p className="small mb-1 text-truncate">
          {event.location || event.address || "No location"}
        </p>
        <p className="small text-muted mb-3">
          {event.currentHeadcount ?? 0} / {event.maxHeadcount ?? "?"} joined
        </p>

        <div className="mt-auto d-flex gap-2">
          <Link
            to={`/event/${event.id}`}
            className="btn btn-sm btn-outline-primary flex-fill"
          >
            View
          </Link>
          {onEdit && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => onEdit(event)}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => onDelete(event)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EventGrid({ events, loading, emptyText, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }
  if (!events.length) {
    return <p className="text-muted text-center py-5 mb-0">{emptyText}</p>;
  }
  return (
    <div className="row g-3">
      {events.map((e) => (
        <div key={e.id} className="col-sm-6 col-lg-4">
          <EventCard event={e} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- modal ---------------------------- */
function Modal({ title, children, onClose }) {
  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            {children}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}

/* ---------------------------- page ---------------------------- */
export default function Profile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null); // users/{uid} document
  const [hosted, setHosted] = useState([]);
  const [joined, setJoined] = useState([]);
  const [loadingHosted, setLoadingHosted] = useState(true);
  const [loadingJoined, setLoadingJoined] = useState(true);

  const [tab, setTab] = useState("hosting");
  const [message, setMessage] = useState(null); // { type, text }

  const [editEvent, setEditEvent] = useState(null);
  const [form, setForm] = useState({});
  const [savingEvent, setSavingEvent] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* My profile document (live, so edits show up right away) */
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => setProfile(snap.exists() ? snap.data() : {}),
      () => setProfile({}),
    );
  }, [user]);

  /* Events I organize (live) */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "events"),
      where("organizerId", "==", user.uid),
    );
    return onSnapshot(
      q,
      (snap) => {
        setHosted(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingHosted(false);
      },
      (err) => {
        setMessage({ type: "danger", text: err.message });
        setLoadingHosted(false);
      },
    );
  }, [user]);

  /* Events I joined: my accepted requests -> fetch each event */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "joinRequests"),
      where("userId", "==", user.uid),
    );
    return onSnapshot(
      q,
      async (snap) => {
        try {
          const ids = [
            ...new Set(
              snap.docs
                .map((d) => d.data())
                .filter((r) =>
                  ACCEPTED.includes(String(r.status ?? "").toLowerCase()),
                )
                .map((r) => r.eventId),
            ),
          ];
          const docs = await Promise.all(
            ids.map((id) => getDoc(doc(db, "events", id))),
          );
          setJoined(
            docs
              .filter((d) => d.exists())
              .map((d) => ({ id: d.id, ...d.data() })),
          );
        } catch (err) {
          setMessage({ type: "danger", text: err.message });
        } finally {
          setLoadingJoined(false);
        }
      },
      (err) => {
        setMessage({ type: "danger", text: err.message });
        setLoadingJoined(false);
      },
    );
  }, [user]);

  const byDate = (dir) => (a, b) =>
    dir *
    ((eventDateTime(a)?.getTime() || 0) - (eventDateTime(b)?.getTime() || 0));

  const hostedSorted = useMemo(() => [...hosted].sort(byDate(-1)), [hosted]);
  const upcoming = useMemo(() => {
    const now = new Date();
    return joined
      .filter((e) => !eventDateTime(e) || eventDateTime(e) >= now)
      .sort(byDate(1));
  }, [joined]);
  const attended = useMemo(() => {
    const now = new Date();
    return joined
      .filter((e) => eventDateTime(e) && eventDateTime(e) < now)
      .sort(byDate(-1));
  }, [joined]);

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">
          You need to be logged in to view this page.
        </p>
      </div>
    );
  }

  const name = profile?.displayName || user.displayName || "WildCrew Member";
  const photo = profile?.photoURL || user.photoURL;
  const initials = (name || user.email || "?")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");

  /* ---------- event edit / delete ---------- */
  const openEdit = (event) => {
    setEditEvent(event);
    setForm({
      title: event.title || "",
      location: event.location || "",
      date: event.date || "",
      time: event.time || "",
      activityType: event.activityType || "hiking",
      difficulty: event.difficulty || "easy",
      maxHeadcount: event.maxHeadcount ?? 5,
      description: event.description || "",
    });
  };

  const saveEvent = async (e) => {
    e.preventDefault();

    const max = Number(form.maxHeadcount);
    if (max < (editEvent.currentHeadcount ?? 0)) {
      setMessage({
        type: "danger",
        text: `Max attendees can't be lower than the ${editEvent.currentHeadcount} people already joined.`,
      });
      return;
    }

    setSavingEvent(true);
    try {
      await updateDoc(doc(db, "events", editEvent.id), {
        title: form.title.trim(),
        location: form.location.trim(),
        date: form.date,
        time: form.time,
        activityType: form.activityType,
        difficulty: form.difficulty,
        maxHeadcount: max,
        description: form.description.trim(),
      });
      setMessage({ type: "success", text: "Event updated." });
      setEditEvent(null);
    } catch (err) {
      setMessage({ type: "danger", text: err.message });
    } finally {
      setSavingEvent(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const id = deleteTarget.id;
      // Remove the event's join requests and likes so nothing is orphaned
      const [reqs, likes] = await Promise.all([
        getDocs(
          query(collection(db, "joinRequests"), where("eventId", "==", id)),
        ),
        getDocs(collection(db, "events", id, "likes")),
      ]);
      const batch = writeBatch(db);
      reqs.forEach((r) => batch.delete(r.ref));
      likes.forEach((l) => batch.delete(l.ref));
      batch.delete(doc(db, "events", id));
      await batch.commit();

      setMessage({
        type: "success",
        text: `"${deleteTarget.title}" was deleted.`,
      });
      setDeleteTarget(null);
    } catch (err) {
      setMessage({ type: "danger", text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const tabs = [
    { key: "hosting", label: "My Events", count: hostedSorted.length },
    { key: "upcoming", label: "Joined (Upcoming)", count: upcoming.length },
    { key: "attended", label: "Attended", count: attended.length },
  ];

  return (
    <div className="container py-4" style={{ maxWidth: 1100 }}>
      {message && (
        <div
          className={`alert alert-${message.type} alert-dismissible`}
          role="alert"
        >
          {message.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setMessage(null)}
          />
        </div>
      )}

      {/* ---------------- Header ---------------- */}
      <div className="card shadow-sm border-0 rounded-4 mb-4 overflow-hidden">
        <div
          style={{
            height: 120,
            background:
              "linear-gradient(135deg, #2f855a 0%, #276749 50%, #2c5282 100%)",
          }}
        />
        <div className="card-body pt-0">
          <div className="d-flex flex-column flex-md-row align-items-md-end gap-3">
            {photo ? (
              <img
                src={photo}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="rounded-circle border border-4 border-white bg-white"
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "cover",
                  marginTop: -60,
                }}
              />
            ) : (
              <div
                className="rounded-circle border border-4 border-white bg-secondary text-white d-flex align-items-center justify-content-center"
                style={{
                  width: 120,
                  height: 120,
                  fontSize: 42,
                  marginTop: -60,
                }}
              >
                {initials}
              </div>
            )}

            <div className="flex-grow-1">
              <h3 className="mb-0">{name}</h3>
              <div className="text-muted">{user.email}</div>
              {profile?.location && (
                <div className="small text-muted mt-1">
                  📍 {profile.location}
                </div>
              )}
            </div>

            <div className="d-flex gap-2">
              <Link to="/create" className="btn btn-success rounded-pill">
                + New Event
              </Link>
              <Link
                to="/profile/edit"
                className="btn btn-outline-primary rounded-pill"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          {profile?.bio && (
            <p className="mt-3 mb-0 text-secondary">{profile.bio}</p>
          )}

          <div className="row text-center mt-4 g-2">
            {[
              ["Hosted", hostedSorted.length],
              ["Upcoming", upcoming.length],
              ["Attended", attended.length],
              [
                "Member since",
                formatMemberSince(
                  profile?.createdAt || user.metadata?.creationTime,
                ),
              ],
            ].map(([label, value]) => (
              <div key={label} className="col-6 col-md-3">
                <div className="border rounded-3 py-2">
                  <div className="fs-5 fw-bold">{value}</div>
                  <div className="small text-muted">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- Events ---------------- */}
      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-header bg-white border-0 pt-3">
          <ul className="nav nav-tabs card-header-tabs">
            {tabs.map((t) => (
              <li key={t.key} className="nav-item">
                <button
                  className={`nav-link ${tab === t.key ? "active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}{" "}
                  <span className="badge rounded-pill bg-secondary">
                    {t.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          {tab === "hosting" && (
            <EventGrid
              events={hostedSorted}
              loading={loadingHosted}
              emptyText="You haven't created any events yet."
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          )}
          {tab === "upcoming" && (
            <EventGrid
              events={upcoming}
              loading={loadingJoined}
              emptyText="No upcoming events. Browse the feed and request to join one!"
            />
          )}
          {tab === "attended" && (
            <EventGrid
              events={attended}
              loading={loadingJoined}
              emptyText="You haven't attended any events yet."
            />
          )}
        </div>
      </div>

      {/* ---------------- Edit event modal ---------------- */}
      {editEvent && (
        <Modal title="Edit Event" onClose={() => setEditEvent(null)}>
          <form onSubmit={saveEvent}>
            <div className="modal-body d-flex flex-column gap-3">
              <div>
                <label className="form-label">Title</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Location</label>
                <input
                  className="form-control"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  required
                />
                <div className="form-text">
                  The map address can't be changed here. Delete and recreate the
                  event to move it.
                </div>
              </div>
              <div className="row g-2">
                <div className="col">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="col">
                  <label className="form-label">Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="row g-2">
                <div className="col">
                  <label className="form-label">Activity</label>
                  <select
                    className="form-select"
                    value={form.activityType}
                    onChange={(e) =>
                      setForm({ ...form, activityType: e.target.value })
                    }
                  >
                    <option value="hiking">Hiking</option>
                    <option value="running">Running</option>
                    <option value="cycling">Cycling</option>
                    <option value="swimming">Swimming</option>
                  </select>
                </div>
                <div className="col">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-select"
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm({ ...form, difficulty: e.target.value })
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Max attendees</label>
                <input
                  type="number"
                  min={Math.max(1, editEvent.currentHeadcount ?? 1)}
                  className="form-control"
                  value={form.maxHeadcount}
                  onChange={(e) =>
                    setForm({ ...form, maxHeadcount: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  rows={4}
                  className="form-control"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setEditEvent(null)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" disabled={savingEvent}>
                {savingEvent ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------- Delete confirm modal ---------------- */}
      {deleteTarget && (
        <Modal title="Delete event?" onClose={() => setDeleteTarget(null)}>
          <div className="modal-body">
            <p className="mb-0">
              <strong>{deleteTarget.title}</strong>, its join requests and likes
              will be permanently deleted. This can't be undone.
            </p>
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
