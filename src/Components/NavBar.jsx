import { useEffect, useState, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { markAsRead } from "../services/notificationService";
import defaultProfile from "../assets/profile-default.png";

const NAV_LINKS = [
  { to: "/feed", label: "Feed" },
  { to: "/create", label: "Create Event" },
  { to: "/dashboard", label: "Dashboard" },
];

function NotificationDropdown({ notifications, pendingRequestsCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const totalBadgeCount = notifications.length + pendingRequestsCount;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="position-relative me-2" ref={dropdownRef}>
      <button
        className="btn border-0 text-secondary d-flex align-items-center justify-content-center p-2 rounded-circle bg-light"
        style={{ width: "42px", height: "42px" }}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <i className="bi bi-bell fs-5"></i>
        {totalBadgeCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white"
            style={{ fontSize: "0.68rem", padding: "0.3em 0.55em" }}
          >
            {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="card border-0 shadow-lg position-absolute end-0 mt-2 rounded-4 overflow-hidden"
          style={{
            width: "320px",
            maxWidth: "calc(100vw - 32px)",
            zIndex: 1050,
          }}
        >
          <div className="card-header bg-white py-3 px-3 d-flex justify-content-between align-items-center border-bottom border-light-subtle">
            <h6 className="fw-bold mb-0">Notifications</h6>
            {totalBadgeCount > 0 && (
              <span className="badge bg-primary-subtle text-primary rounded-pill">
                {totalBadgeCount} New
              </span>
            )}
          </div>

          <div
            className="list-group list-group-flush overflow-auto"
            style={{ maxHeight: "350px" }}
          >
            {pendingRequestsCount > 0 && (
              <Link
                to="/dashboard"
                className="list-group-item list-group-item-action p-3 bg-primary bg-opacity-10"
                onClick={() => setIsOpen(false)}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-person-plus-fill text-primary fs-5"></i>
                  <div>
                    <p className="mb-0 fw-bold small text-primary">
                      {pendingRequestsCount} Pending Join Request
                      {pendingRequestsCount > 1 ? "s" : ""}
                    </p>
                    <small className="text-muted">
                      Review attendee requests on your dashboard
                    </small>
                  </div>
                </div>
              </Link>
            )}

            {notifications.length > 0
              ? notifications.map((n) => (
                  <button
                    key={n.id}
                    className="list-group-item list-group-item-action p-3 text-start border-0 border-bottom border-light-subtle"
                    onClick={() => handleNotificationClick(n)}
                  >
                    <p className="mb-0 fw-bold small text-dark">{n.title}</p>
                    <p className="mb-0 small text-secondary">{n.message}</p>
                  </button>
                ))
              : pendingRequestsCount === 0 && (
                  <div className="text-center py-4 text-muted small">
                    <i className="bi bi-bell-slash fs-3 d-block mb-1"></i>
                    No new notifications
                  </div>
                )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, notifications, pendingRequestsCount, onLogout }) {
  return (
    <li className="nav-item d-flex align-items-center gap-2 gap-lg-3 ms-lg-3">
      {/* Desktop bell. On phones the bell is shown next to the menu button. */}
      <div className="d-none d-lg-block">
        <NotificationDropdown
          notifications={notifications}
          pendingRequestsCount={pendingRequestsCount}
        />
      </div>

      <div className="d-flex align-items-center gap-2 bg-light rounded-pill px-3 py-2">
        {user.photoURL ? (
          <img
            src={user.photoURL || defaultProfile}
            alt={user.displayName || user.email}
            referrerPolicy="no-referrer"
            className="rounded-circle"
            width={38}
            height={38}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold"
            style={{ width: 38, height: 38, fontSize: "0.9rem" }}
          >
            {(user.displayName || user.email).charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-dark fw-medium pe-1" style={{ fontSize: "1rem" }}>
          <Link
            to="/profile"
            className="text-dark text-decoration-none hover-underline"
          >
            {user.displayName || user.email}
          </Link>
        </span>
      </div>

      <button
        className="btn btn-outline-secondary rounded-pill px-4"
        style={{ fontSize: "1rem" }}
        onClick={onLogout}
      >
        Log out
      </button>
    </li>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    const qRequests = query(
      collection(db, "joinRequests"),
      where("organizerId", "==", user.uid),
      where("status", "==", "pending"),
    );

    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setPendingRequestsCount(snap.size);
    });

    return () => unsubRequests();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Two equality filters need no composite index. Sorting is done below
    // in JavaScript, so the bell works without creating an index.
    const qNotifs = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      where("read", "==", false),
    );

    const unsubNotifs = onSnapshot(
      qNotifs,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Newest first. A just-created notification may not have its
        // server timestamp yet, so treat a missing one as "now".
        const time = (n) => n.createdAt?.toMillis?.() ?? Date.now();
        list.sort((a, b) => time(b) - time(a));
        setNotifications(list);
      },
      (err) => {
        console.error("Notifications listener failed:", err);
      },
    );

    return () => unsubNotifs();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <nav
      className="navbar navbar-expand-lg navbar-light bg-white sticky-top py-3"
      style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.07)" }}
    >
      <div className="container">
        <Link
          className="navbar-brand fw-bold d-flex align-items-center gap-2"
          to={user ? "/feed" : "/login"}
        >
          <span style={{ color: "#2f6b3a", fontSize: "1.6rem" }}>WildCrew</span>
        </Link>

        {/* Phone layout: bell stays visible next to the menu button */}
        <div className="d-flex align-items-center gap-2 d-lg-none">
          {user && (
            <NotificationDropdown
              notifications={notifications}
              pendingRequestsCount={pendingRequestsCount}
            />
          )}

          <button
            className="navbar-toggler border-0"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarContent"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        </div>

        <div className="collapse navbar-collapse" id="navbarContent">
          {user && (
            <ul className="navbar-nav me-auto ms-lg-5 gap-lg-2">
              {NAV_LINKS.map(({ to, label }) => (
                <li className="nav-item" key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `nav-link px-3 py-2 rounded-pill ${
                        isActive
                          ? "text-success fw-semibold bg-success bg-opacity-10"
                          : "text-secondary"
                      }`
                    }
                    style={{ fontSize: "1.05rem" }}
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}

          <ul className="navbar-nav ms-auto align-items-center">
            {user ? (
              <UserMenu
                user={user}
                notifications={notifications}
                pendingRequestsCount={pendingRequestsCount}
                onLogout={handleLogout}
              />
            ) : (
              <li className="nav-item">
                <Link
                  className="btn btn-success rounded-pill px-4 py-2"
                  style={{ fontSize: "1rem" }}
                  to="/login"
                >
                  Log in
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
