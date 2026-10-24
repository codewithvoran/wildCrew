import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Map from "../Components/Map";
import { getWeather } from "../helpers/weatherHelpers";
import { createNotification } from "../services/notificationService";
import ConfirmModal from "../Components/ConfirmModal";

const ACCEPTED = ["accepted", "approved"];
const REJECTED = ["rejected", "declined", "denied"];

const formatCommentTime = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return "Just now";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRequest, setMyRequest] = useState(undefined);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");
  const [liked, setLiked] = useState(false);
  const [weather, setWeather] = useState(null);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load Event details & weather
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const snap = await getDoc(doc(db, "events", id));

        if (snap.exists()) {
          const eventData = snap.data();
          setEvent({
            id: snap.id,
            ...eventData,
          });

          if (eventData.latitude && eventData.longitude) {
            getWeather(
              eventData.latitude,
              eventData.longitude,
              eventData.date,
              eventData.time,
            )
              .then((data) => setWeather(data))
              .catch((error) =>
                console.error("Error fetching weather:", error),
              );
          }
        }
      } catch (err) {
        console.error("Error loading event:", err);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id]);

  // Check current user's join request status
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "joinRequests"),
      where("eventId", "==", id),
      where("userId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setMyRequest(
          snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() },
        );
      },
      (err) => {
        console.error("Error checking requests:", err);
        setMyRequest(null);
      },
    );

    return () => unsubscribe();
  }, [id, user]);

  // Check if current user liked this event
  useEffect(() => {
    const checkExistingLike = async () => {
      if (!user || !id) return;

      try {
        const likeRef = doc(db, "events", id, "likes", user.uid);
        const snap = await getDoc(likeRef);
        setLiked(snap.exists());
      } catch (err) {
        console.error("Error checking like:", err);
      }
    };

    checkExistingLike();
  }, [id, user]);

  // Listen to live comments thread
  useEffect(() => {
    const q = query(
      collection(db, "events", id, "comments"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("Error loading comments:", err);
        setCommentError("Couldn't load comments.");
      },
    );

    return () => unsubscribe();
  }, [id]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !user) return;

    setPosting(true);
    setCommentError("");

    try {
      await addDoc(collection(db, "events", id, "comments"), {
        userId: user.uid,
        userName: user.displayName || user.email,
        userPhoto: user.photoURL || "",
        text,
        createdAt: serverTimestamp(),
      });

      // Bell notification for the organizer (not for their own comments)
      if (event?.organizerId && event.organizerId !== user.uid) {
        const who = user.displayName || user.email;
        createNotification({
          recipientId: event.organizerId,
          senderName: who,
          title: "New comment",
          message: `${who} commented on "${event.title}": ${text.slice(0, 80)}`,
          link: `/event/${id}`,
        }).catch((e) => console.error("Notification failed:", e));
      }

      setCommentText("");
    } catch (err) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  };

  // Opens the confirmation popup
  const handleDeleteComment = (commentId) => {
    setCommentToDelete(commentId);
  };

  // Runs when the user confirms in the popup
  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "events", id, "comments", commentToDelete));
    } catch (err) {
      setCommentError(err.message || "Failed to delete comment.");
    } finally {
      setDeleting(false);
      setCommentToDelete(null);
    }
  };

  // Submit join request including userPhoto
  const handleRequestToJoin = async () => {
    setRequesting(true);
    setMessage("");

    try {
      await addDoc(collection(db, "joinRequests"), {
        eventId: id,
        eventTitle: event.title,
        userId: user.uid,
        userName: user.displayName || user.email,
        userPhoto: user.photoURL || "",
        organizerId: event.organizerId,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setMessage("Request sent! The organizer will review it soon.");
    } catch (err) {
      setMessage(
        "Something went wrong: " + (err.message || "Failed to send request."),
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      setMessage("You must be logged in to like an event.");
      return;
    }

    try {
      const likeRef = doc(db, "events", id, "likes", user.uid);

      if (liked) {
        await deleteDoc(likeRef);
        setLiked(false);
        setMessage("You unliked this event!");
      } else {
        await setDoc(likeRef, {
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
        setLiked(true);
        setMessage("You liked this event!");

        // Bell notification for the organizer (not for their own likes)
        if (event?.organizerId && event.organizerId !== user.uid) {
          const who = user.displayName || user.email;
          createNotification({
            recipientId: event.organizerId,
            senderName: who,
            title: "New like",
            message: `${who} liked "${event.title}"`,
            link: `/event/${id}`,
          }).catch((e) => console.error("Notification failed:", e));
        }
      }
    } catch (err) {
      setMessage(
        "Something went wrong: " + (err.message || "Failed to update like."),
      );
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading event...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container py-5 text-center">
        <h3 className="fw-bold">Event Not Found</h3>
        <p className="text-muted">
          The event you are looking for does not exist or has been removed.
        </p>
        <button
          className="btn btn-outline-primary mt-2"
          onClick={() => navigate("/feed")}
        >
          Return to Feed
        </button>
      </div>
    );
  }

  const isFull = event.currentHeadcount >= event.maxHeadcount;
  const isOrganizer = user?.uid === event.organizerId;

  const requestStatus = String(myRequest?.status ?? "").toLowerCase();
  const hasRequest = !!myRequest;
  const isAccepted = ACCEPTED.includes(requestStatus);
  const isRejected = REJECTED.includes(requestStatus);
  const isPending = hasRequest && !isAccepted && !isRejected;
  const canRequest = !user || myRequest === null;

  const difficultyBadges = {
    easy: "bg-success-subtle text-success border-success-subtle",
    moderate: "bg-warning-subtle text-warning border-warning-subtle",
    hard: "bg-danger-subtle text-danger border-danger-subtle",
  };

  return (
    <div className="container py-4" style={{ maxWidth: "800px" }}>
      <button
        className="btn btn-link link-secondary text-decoration-none ps-0 mb-3 fw-semibold"
        onClick={() => navigate("/feed")}
      >
        <i className="bi bi-arrow-left"></i> Back to Feed
      </button>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
        {/* Event Header & Banner */}
        <div className="position-relative bg-dark" style={{ height: "320px" }}>
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-100 h-100 object-fit-cover opacity-90"
            />
          ) : (
            <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-secondary text-white">
              <span className="fs-1">WildCrew Event</span>
            </div>
          )}

          <div className="position-absolute top-0 start-0 m-3 d-flex gap-2">
            <span className="badge bg-dark bg-opacity-75 backdrop-blur px-3 py-2 rounded-pill text-capitalize fw-normal">
              {event.activityType || "Outdoor"}
            </span>

            <span
              className={`badge border px-3 py-2 rounded-pill text-capitalize fw-normal ${
                difficultyBadges[event.difficulty] || "bg-secondary text-white"
              }`}
            >
              {event.difficulty}
            </span>
          </div>

          {weather && (
            <div className="position-absolute top-0 end-0 m-3 d-flex gap-2">
              <h2 className="fw-bold text-white bg-dark bg-opacity-50 px-3 py-1 rounded-3">
                {weather}° C
              </h2>
            </div>
          )}

          <div className="position-absolute bottom-0 end-0 m-3 text-end">
            <h1 className="fw-bold text-white">{event.title}</h1>
          </div>
        </div>

        {/* Primary Details */}
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <div>
              <h1 className="fw-bold h2 mb-1">{event.title}</h1>
              <p className="text-secondary mb-0 fs-6">
                <i className="bi bi-geo-alt me-1"></i>
                {event.address || event.location}
              </p>
            </div>

            <div className="text-end">
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fs-6 rounded-pill">
                {event.currentHeadcount} / {event.maxHeadcount} Joined
              </span>
            </div>
          </div>

          <hr className="my-4 text-muted opacity-25" />

          <div className="row g-3 mb-4">
            <div className="col-sm-6">
              <div className="p-3 bg-light rounded-3 border border-light-subtle">
                <small className="text-muted d-block uppercase tracking-wider mb-1">
                  Date & Time
                </small>
                <span className="fw-semibold text-dark">
                  {event.date} {event.time && "at " + event.time}
                </span>
              </div>
            </div>

            <div className="col-sm-6">
              <div className="p-3 bg-light rounded-3 border border-light-subtle">
                <small className="text-muted d-block uppercase tracking-wider mb-1">
                  Organizer
                </small>
                <span className="fw-semibold text-dark">
                  {event.organizerName || "WildCrew Member"}
                </span>
              </div>
            </div>
          </div>

          <h5 className="fw-bold mb-2">About this Activity</h5>
          <p
            className="text-secondary leading-relaxed mb-4"
            style={{ whiteSpace: "pre-line" }}
          >
            {event.description}
          </p>

          {/* PARTICIPANTS SECTION */}
          {event?.participants && event.participants.length > 0 && (
            <div className="mb-4">
              <h5 className="fw-bold mb-3">Participants</h5>
              <div className="d-flex flex-wrap gap-3">
                {event.participants.map((participant, index) => (
                  <div
                    key={participant.id || index}
                    className="d-flex align-items-center gap-2 bg-light rounded-pill pe-3 p-1 border shadow-sm"
                  >
                    {participant.photoURL ? (
                      <img
                        src={participant.photoURL}
                        alt={participant.displayName}
                        referrerPolicy="no-referrer"
                        className="rounded-circle"
                        width={38}
                        height={38}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                        style={{ width: 38, height: 38, fontSize: "0.9rem" }}
                      >
                        {(participant.displayName || "A")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="fw-medium text-dark small">
                      {participant.displayName || "Attendee"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {event.gallery && event.gallery.length > 0 && (
            <div className="mt-4">
              <h5 className="fw-bold mb-3">Event Gallery</h5>
              <div className="row g-3">
                {event.gallery.map((imgUrl, index) => (
                  <div className="col-6 col-md-4" key={index}>
                    <div
                      className="rounded-3 overflow-hidden border shadow-sm"
                      style={{ height: "140px" }}
                    >
                      <img
                        src={imgUrl}
                        alt={`Gallery ${index + 1}`}
                        className="w-100 h-100 object-fit-cover hover-zoom"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location Map */}
        {event.longitude != null && event.latitude != null && (
          <div className="card-body border-top">
            <h5 className="fw-bold mb-3">Location</h5>
            <p className="text-secondary mb-3">
              <i className="bi bi-geo-alt me-2"></i>
              {event.address || event.location}
            </p>
            <Map lng={event.longitude} lat={event.latitude} />
          </div>
        )}

        {/* Social Actions */}
        <div className="card-body border-top">
          <div className="d-flex align-items-center justify-content-between">
            <button
              className="btn btn-outline-secondary border-0 shadow-sm"
              onClick={handleLike}
            >
              <i
                className={`bi ${
                  liked ? "bi-heart-fill text-danger" : "bi-heart"
                }`}
              ></i>{" "}
              {liked ? "Liked" : "Like"}
            </button>

            <button
              className="btn btn-outline-secondary border-0 shadow-sm"
              onClick={() =>
                document
                  .getElementById("comments")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <i className="bi bi-chat"></i> Comment
              {comments.length > 0 && ` (${comments.length})`}
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="card-body border-top" id="comments">
          <h5 className="fw-bold mb-3">Comments ({comments.length})</h5>

          {user ? (
            <form onSubmit={handlePostComment} className="d-flex gap-2 mb-4">
              <input
                className="form-control rounded-pill"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={500}
              />
              <button
                className="btn btn-primary rounded-pill px-4"
                disabled={posting || !commentText.trim()}
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </form>
          ) : (
            <p className="text-muted mb-4">
              <button
                className="btn btn-link p-0 align-baseline"
                onClick={() => navigate("/login")}
              >
                Log in
              </button>{" "}
              to join the conversation.
            </p>
          )}

          {commentError && (
            <div className="alert alert-danger py-2 small">{commentError}</div>
          )}

          {comments.length === 0 ? (
            <p className="text-muted mb-0">No comments yet. Be the first!</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {comments.map((c) => (
                <div key={c.id} className="d-flex gap-2">
                  {c.userPhoto ? (
                    <img
                      src={c.userPhoto}
                      alt={c.userName}
                      referrerPolicy="no-referrer"
                      className="rounded-circle flex-shrink-0"
                      width={38}
                      height={38}
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 38, height: 38 }}
                    >
                      {(c.userName || "?")[0].toUpperCase()}
                    </div>
                  )}

                  <div className="flex-grow-1 bg-light rounded-3 px-3 py-2">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <span className="fw-semibold">{c.userName}</span>
                        {c.userId === event.organizerId && (
                          <span className="badge bg-success ms-2">
                            Organizer
                          </span>
                        )}
                        <small className="text-muted ms-2">
                          {formatCommentTime(c.createdAt)}
                        </small>
                      </div>

                      {(user?.uid === c.userId || isOrganizer) && (
                        <button
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={() => handleDeleteComment(c.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
                      {c.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer / Join Status Banner */}
        <div className="card-footer bg-light p-4 border-top-0 rounded-bottom-4">
          {isOrganizer && (
            <div className="alert alert-info border-0 shadow-sm m-0">
              <strong>You are the organizer</strong> of this event. Manage
              incoming join requests from your dashboard.
            </div>
          )}

          {!isOrganizer && canRequest && !isFull && (
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div>
                <h6 className="mb-0 fw-semibold">
                  Ready to join this adventure?
                </h6>
                <small className="text-muted">
                  The organizer will review your request once submitted.
                </small>
              </div>

              <button
                className="btn btn-primary btn-lg px-4 rounded-pill fw-semibold shadow-sm"
                onClick={handleRequestToJoin}
                disabled={requesting}
              >
                {requesting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Sending...
                  </>
                ) : (
                  "Request to Join"
                )}
              </button>
            </div>
          )}

          {!isOrganizer && isAccepted && (
            <div className="alert alert-success border-0 shadow-sm m-0">
              <strong>✓ You're in!</strong> The organizer accepted your request.
              See you on {event.date}
              {event.time && " at " + event.time}.
            </div>
          )}

          {!isOrganizer && isRejected && (
            <div className="alert alert-danger border-0 shadow-sm m-0">
              <strong>Request not accepted.</strong> The organizer couldn't
              accept your request this time. Check the feed for other events.
            </div>
          )}

          {!isOrganizer && isPending && (
            <div className="alert alert-secondary border-0 shadow-sm m-0">
              <strong>⏳ Request pending.</strong> Waiting for organizer
              approval.
            </div>
          )}

          {!isOrganizer && isFull && canRequest && (
            <div className="alert alert-warning border-0 shadow-sm m-0">
              This event is currently full ({event.maxHeadcount}/
              {event.maxHeadcount} spots filled).
            </div>
          )}

          {message && (
            <div className="alert alert-success border-0 shadow-sm mt-3 mb-0">
              {message}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        show={commentToDelete !== null}
        title="Delete comment?"
        message="This comment will be permanently removed. This can't be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteComment}
        onCancel={() => setCommentToDelete(null)}
      />
    </div>
  );
}
