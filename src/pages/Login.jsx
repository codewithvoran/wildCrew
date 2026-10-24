import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { auth, db, googleProvider } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/feed");
      }
    });

    return () => unsubscribe();
  }, []);

  const createUserProfile = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || email.split("@")[0],
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp(),
      });
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (isSignUp) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(res.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/feed");
    } catch (err) {
      setError(err.message);
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await createUserProfile(res.user);
      navigate("/feed");
    } catch (err) {
      console.log(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setInfo("");
  };

  return (
    <div className="d-flex min-vh-100">
      {/* Left panel */}
      <div
        className="d-none d-lg-flex flex-column justify-content-between text-white p-5"
        style={{
          width: "45%",
          background: "green",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold" style={{ fontSize: "1.6rem" }}>
            WildCrew
          </span>
        </div>

        <div>
          <h1
            className="fw-bold mb-3"
            style={{ fontSize: "2.5rem", lineHeight: 1.2 }}
          >
            Find your next
            <br />
            adventure crew.
          </h1>
          <p className="fs-5 text-white-50 mb-0" style={{ maxWidth: "380px" }}>
            Create trips, join hikes, and connect with people who love the
            outdoor activities.
          </p>
        </div>

        <p className="text-white-50 small mb-0">
          &copy; {new Date().getFullYear()} WildCrew
        </p>
      </div>

      {/* Right panel */}
      <div
        className="d-flex align-items-center justify-content-center flex-grow-1 bg-light"
        style={{ minHeight: "100vh" }}
      >
        <div className="w-100 px-4" style={{ maxWidth: "400px" }}>
          <div className="d-flex d-lg-none align-items-center gap-2 justify-content-center mb-4">
            <span
              className="d-flex align-items-center justify-content-center rounded-circle bg-success text-white"
              style={{ width: 40, height: 40, fontSize: "1.3rem" }}
            ></span>
            <span
              className="fw-bold"
              style={{ color: "#2f6b3a", fontSize: "1.4rem" }}
            >
              WildCrew
            </span>
          </div>

          <h2 className="fw-bold mb-1">
            {isSignUp ? "Create an account" : "Welcome back"}
          </h2>
          <p className="text-muted mb-4">
            {isSignUp
              ? "Join the crew and start planning your next trip."
              : "Log in to see what's happening on the trail."}
          </p>

          <form onSubmit={handleEmailAuth}>
            <div className="mb-3">
              <label className="form-label fw-medium">Email</label>
              <input
                type="email"
                className="form-control form-control-lg rounded-3"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={isSignUp ? "mb-4" : "mb-2"}>
              <label className="form-label fw-medium">Password</label>
              <input
                type="password"
                className="form-control form-control-lg rounded-3"
                placeholder="•••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {!isSignUp && (
              <div className="text-end mb-4">
                <Link
                  to="/forgot-password"
                  className="small text-decoration-none"
                  style={{ color: "#2f6b3a" }}
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-success btn-lg w-100 rounded-pill fw-medium"
              disabled={loading}
            >
              {loading ? "Please wait..." : isSignUp ? "Sign up" : "Log in"}
            </button>
          </form>

          <div className="d-flex align-items-center my-4">
            <hr className="flex-grow-1" />
            <span className="mx-3 text-muted small">OR</span>
            <hr className="flex-grow-1" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="btn btn-outline-secondary btn-lg w-100 rounded-pill d-flex align-items-center justify-content-center gap-2"
            disabled={loading}
          >
            Continue with Google
          </button>

          {error && (
            <div
              className="alert alert-danger mt-3 py-2 small rounded-3"
              role="alert"
            >
              {error}
            </div>
          )}

          {info && (
            <div
              className="alert alert-success mt-3 py-2 small rounded-3"
              role="alert"
            >
              {info}
            </div>
          )}

          <p className="text-center text-muted mt-4 mb-0">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <span
              onClick={toggleMode}
              className="fw-medium"
              style={{ color: "#2f6b3a", cursor: "pointer" }}
            >
              {isSignUp ? "Log in" : "Sign up"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
