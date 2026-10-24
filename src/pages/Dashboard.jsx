import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { createNotification } from "../services/notificationService";

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "joinRequests"),
      where("organizerId", "==", user.uid),
      where("status", "==", "pending"),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching join requests:", err);
        setError("Failed to load requests.");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user]);

  const respond = async (request, newStatus) => {
    setProcessingId(request.id);
    setError("");

    try {
      if (newStatus === "accepted") {
        await runTransaction(db, async (transaction) => {
          const eventRef = doc(db, "events", request.eventId);
          const eventSnap = await transaction.get(eventRef);

          if (!eventSnap.exists()) {
            throw new Error("This event no longer exists.");
          }

          const eventData = eventSnap.data();
          const currentCount = eventData.currentHeadcount || 0;
          const maxCount = eventData.maxHeadcount || 0;

          if (currentCount >= maxCount) {
            throw new Error(
              "This event is already full — cannot accept more attendees.",
            );
          }

          const currentParticipants = eventData.participants || [];
          const alreadyIn = currentParticipants.some(
            (p) => p.id === request.userId,
          );

          const updatedParticipants = alreadyIn
            ? currentParticipants
            : [
                ...currentParticipants,
                {
                  id: request.userId,
                  displayName: request.userName || "Attendee",
                  photoURL: request.userPhoto || "",
                },
              ];

          transaction.update(eventRef, {
            currentHeadcount: currentCount + 1,
            participants: updatedParticipants,
          });

          const requestRef = doc(db, "joinRequests", request.id);
          transaction.update(requestRef, {
            status: "accepted",
            updatedAt: serverTimestamp(),
          });
        });

        await createNotification({
          recipientId: request.userId,
          senderName: user.displayName || user.email,
          title: "Request Approved!",
          message: `Your request to join "${request.eventTitle}" was accepted.`,
          link: `/event/${request.eventId}`,
        });
      } else {
        const requestRef = doc(db, "joinRequests", request.id);
        await runTransaction(db, async (transaction) => {
          transaction.update(requestRef, {
            status: "rejected",
            updatedAt: serverTimestamp(),
          });
        });

        await createNotification({
          recipientId: request.userId,
          senderName: user.displayName || user.email,
          title: "Request Update",
          message: `Your request to join "${request.eventTitle}" was declined.`,
          link: `/event/${request.eventId}`,
        });
      }
    } catch (err) {
      console.error("Action failed:", err);
      setError(err.message || "Failed to process request.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: "800px" }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold mb-1">Organizer Dashboard</h2>
          <p className="text-muted mb-0">
            Manage incoming requests to join your activities
          </p>
        </div>

        {requests.length > 0 && (
          <span className="badge bg-primary rounded-pill px-3 py-2 fs-6">
            {requests.length} Pending
          </span>
        )}
      </div>

      {error && (
        <div
          className="alert alert-danger alert-dismissible fade show shadow-sm"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border border-light-subtle">
          <i className="bi bi-inbox fs-1 text-secondary mb-2 d-block"></i>
          <h5 className="fw-semibold">All caught up!</h5>
          <p className="text-muted mb-0">No pending join requests right now.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="card border-0 shadow-sm rounded-3 overflow-hidden"
            >
              <div className="card-body p-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <Link
                    to={`/profile/${r.userId}`}
                    className="text-decoration-none"
                  >
                    {r.userPhoto ? (
                      <img
                        src={r.userPhoto}
                        alt={r.userName}
                        referrerPolicy="no-referrer"
                        className="rounded-circle border"
                        width={50}
                        height={50}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center fw-bold fs-5"
                        style={{ width: 50, height: 50 }}
                      >
                        {(r.userName || "?")[0].toUpperCase()}
                      </div>
                    )}
                  </Link>

                  <div>
                    <Link
                      to={`/profile/${r.userId}`}
                      className="text-dark text-decoration-none fw-bold fs-6 mb-0 d-block hover-underline"
                    >
                      {r.userName}{" "}
                      <i className="bi bi-box-arrow-up-right fs-7 ms-1 text-muted"></i>
                    </Link>

                    <small className="text-muted d-block mt-1">
                      Wants to join{" "}
                      <Link
                        to={`/event/${r.eventId}`}
                        className="fw-semibold text-primary text-decoration-none"
                      >
                        {r.eventTitle}{" "}
                        <i className="bi bi-arrow-right-short"></i>
                      </Link>
                    </small>
                  </div>
                </div>

                <div className="d-flex gap-2 align-items-center">
                  <Link
                    to={`/event/${r.eventId}`}
                    className="btn btn-outline-secondary btn-sm px-3 rounded-pill fw-semibold"
                  >
                    View Event
                  </Link>

                  <button
                    className="btn btn-success btn-sm px-3 rounded-pill fw-semibold shadow-sm d-flex align-items-center gap-1"
                    disabled={processingId === r.id}
                    onClick={() => respond(r, "accepted")}
                  >
                    {processingId === r.id ? (
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                      />
                    ) : (
                      <i className="bi bi-check-lg"></i>
                    )}
                    Accept
                  </button>

                  <button
                    className="btn btn-outline-danger btn-sm px-3 rounded-pill fw-semibold"
                    disabled={processingId === r.id}
                    onClick={() => respond(r, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
