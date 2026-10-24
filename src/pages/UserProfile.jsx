import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("organized"); // "organized" | "joined"

  // Redirect to self profile page if viewing own user ID
  useEffect(() => {
    if (currentUser && currentUser.uid === userId) {
      navigate("/profile", { replace: true });
    }
  }, [currentUser, userId, navigate]);

  useEffect(() => {
    const fetchUserDataAndEvents = async () => {
      setLoading(true);
      try {
        // 1. Fetch Target User Document
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          setProfileUser({ id: userSnap.id, ...userSnap.data() });
        } else {
          setProfileUser(null);
        }

        // 2. Fetch Events Organized by this User
        const organizedQuery = query(
          collection(db, "events"),
          where("organizerId", "==", userId),
        );
        const organizedSnap = await getDocs(organizedQuery);
        setUserEvents(
          organizedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );

        // 3. Fetch Events Joined by this User (Accepted Requests)
        const joinedQuery = query(
          collection(db, "joinRequests"),
          where("userId", "==", userId),
          where("status", "==", "accepted"),
        );
        const joinedSnap = await getDocs(joinedQuery);

        const eventIds = joinedSnap.docs.map((doc) => doc.data().eventId);
        if (eventIds.length > 0) {
          const eventsPromises = eventIds.map((id) =>
            getDoc(doc(db, "events", id)),
          );
          const eventSnaps = await Promise.all(eventsPromises);
          const validJoined = eventSnaps
            .filter((snap) => snap.exists())
            .map((snap) => ({ id: snap.id, ...snap.data() }));
          setJoinedEvents(validJoined);
        } else {
          setJoinedEvents([]);
        }
      } catch (err) {
        console.error("Error fetching public user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserDataAndEvents();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading profile...</span>
        </div>
      </div>
    );
  }

  // Profile not found
  if (!profileUser) {
    return (
      <div className="container py-5 text-center">
        <h3 className="fw-bold">User Not Found</h3>
        <p className="text-muted">
          The member you are looking for does not exist or has been removed.
        </p>
        <button
          className="btn btn-outline-primary rounded-pill mt-2"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  const displayedEvents = activeTab === "organized" ? userEvents : joinedEvents;

  return (
    <div className="container py-4" style={{ maxWidth: "800px" }}>
      {/* Back Button */}
      <button
        className="btn btn-link link-secondary text-decoration-none ps-0 mb-3 fw-semibold"
        onClick={() => navigate(-1)}
      >
        <i className="bi bi-arrow-left"></i> Back
      </button>

      {/* Main Profile Header Card */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
        {/* Cover Image Header */}
        <div className="position-relative bg-dark" style={{ height: "200px" }}>
          {profileUser.coverImage ? (
            <img
              src={profileUser.coverImage}
              alt="Profile Cover"
              className="w-100 h-100 object-fit-cover opacity-85"
            />
          ) : (
            <div className="w-100 h-100 bg-primary bg-gradient d-flex align-items-center justify-content-center"></div>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="card-body p-4 pt-0 position-relative">
          <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-3">
            {/* Avatar */}
            <div className="position-relative" style={{ marginTop: "-60px" }}>
              {profileUser.photoURL ? (
                <img
                  src={profileUser.photoURL}
                  alt={profileUser.displayName || profileUser.name}
                  className="rounded-circle border border-4 border-white shadow-sm"
                  width={120}
                  height={120}
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center fw-bold fs-1 border border-4 border-white shadow-sm"
                  style={{ width: 120, height: 120 }}
                >
                  {(profileUser.displayName ||
                    profileUser.name ||
                    profileUser.email ||
                    "?")[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Quick Stats Badges */}
            <div className="d-flex gap-2">
              <span className="badge bg-light text-dark border px-3 py-2 rounded-pill fw-semibold">
                {userEvents.length} Organized
              </span>
              <span className="badge bg-light text-dark border px-3 py-2 rounded-pill fw-semibold">
                {joinedEvents.length} Joined
              </span>
            </div>
          </div>

          {/* User Details */}
          <h2 className="fw-bold h3 mb-1">
            {profileUser.displayName || profileUser.name || "WildCrew Member"}
          </h2>

          {profileUser.location && (
            <p className="text-secondary mb-2 fs-6">
              <i className="bi bi-geo-alt me-1"></i>
              {profileUser.location}
            </p>
          )}

          {profileUser.bio && (
            <p
              className="text-secondary mt-3 mb-0 leading-relaxed"
              style={{ whiteSpace: "pre-line" }}
            >
              {profileUser.bio}
            </p>
          )}
        </div>
      </div>

      {/* Activity Tabs Section */}
      <div className="card border-0 shadow-sm rounded-4 p-4">
        <ul className="nav nav-pills nav-fill mb-4 bg-light rounded-pill p-1 border border-light-subtle">
          <li className="nav-item">
            <button
              className={`btn w-100 rounded-pill fw-semibold ${
                activeTab === "organized"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted border-0"
              }`}
              onClick={() => setActiveTab("organized")}
            >
              Organized ({userEvents.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`btn w-100 rounded-pill fw-semibold ${
                activeTab === "joined"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted border-0"
              }`}
              onClick={() => setActiveTab("joined")}
            >
              Joined ({joinedEvents.length})
            </button>
          </li>
        </ul>

        {/* Activity Cards List */}
        {displayedEvents.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-calendar-x fs-2 d-block mb-2"></i>
            No {activeTab} activities to show yet.
          </div>
        ) : (
          <div className="row g-3">
            {displayedEvents.map((evt) => (
              <div key={evt.id} className="col-12 col-md-6">
                <div className="card h-100 border-0 shadow-sm rounded-3 overflow-hidden bg-light-subtle">
                  {evt.coverImage && (
                    <img
                      src={evt.coverImage}
                      alt={evt.title}
                      className="card-img-top object-fit-cover"
                      style={{ height: "140px" }}
                    />
                  )}
                  <div className="card-body p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="badge bg-primary-subtle text-primary text-capitalize rounded-pill px-2.5 py-1">
                          {evt.activityType || "Outdoor"}
                        </span>
                        {evt.difficulty && (
                          <span className="badge bg-secondary-subtle text-secondary text-capitalize rounded-pill px-2.5 py-1">
                            {evt.difficulty}
                          </span>
                        )}
                      </div>

                      <h6 className="fw-bold card-title mb-1">{evt.title}</h6>

                      <p className="small text-muted mb-1">
                        <i className="bi bi-geo-alt me-1"></i>
                        {evt.location || evt.address}
                      </p>

                      <p className="small text-muted mb-0">
                        <i className="bi bi-calendar-event me-1"></i>
                        {evt.date} {evt.time && `at ${evt.time}`}
                      </p>
                    </div>

                    <Link
                      to={`/events/${evt.id}`}
                      className="btn btn-outline-primary btn-sm rounded-pill mt-3 w-100 fw-semibold"
                    >
                      View Activity
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
