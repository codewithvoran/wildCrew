import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      console.log(err);
      if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex min-vh-100">
      {/* Left panel */}
      <div
        className="d-none d-lg-flex flex-column justify-content-between text-white p-5"
        style={{ width: "45%", background: "green" }}
      >
        <span className="fw-bold" style={{ fontSize: "1.6rem" }}>
          WildCrew
        </span>

        <div>
          <h1
            className="fw-bold mb-3"
            style={{ fontSize: "2.5rem", lineHeight: 1.2 }}
          >
            Lost the trail?
            <br />
            We'll help you back.
          </h1>
          <p className="fs-5 text-white-50 mb-0" style={{ maxWidth: "380px" }}>
            Enter your email and we'll send you a link to reset your password.
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
          <div className="d-lg-none text-center mb-4">
            <span
              className="fw-bold"
              style={{ color: "#2f6b3a", fontSize: "1.4rem" }}
            >
              WildCrew
            </span>
          </div>

          {sent ? (
            <div className="text-center">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle bg-success text-white mx-auto mb-3"
                style={{ width: 64, height: 64, fontSize: "2rem" }}
              >
                ✓
              </div>
              <h2 className="fw-bold mb-2">Check your email</h2>
              <p className="text-muted mb-1">
                If an account exists for{" "}
                <span className="fw-medium">{email}</span>, a reset link is on
                its way.
              </p>
              <p className="text-muted small mb-4">
                Don't see it? Check your spam folder.
              </p>
              <button
                type="button"
                className="btn btn-outline-secondary w-100 rounded-pill mb-3"
                onClick={() => setSent(false)}
              >
                Use a different email
              </button>
              <Link
                to="/login"
                className="text-decoration-none"
                style={{ color: "#2f6b3a" }}
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="fw-bold mb-1">Forgot your password?</h2>
              <p className="text-muted mb-4">
                No worries. Enter the email you signed up with and we'll send a
                reset link.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label fw-medium">Email</label>
                  <input
                    type="email"
                    className="form-control form-control-lg rounded-3"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-success btn-lg w-100 rounded-pill fw-medium"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>

                {error && (
                  <div
                    className="alert alert-danger mt-3 py-2 small rounded-3"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
              </form>

              <p className="text-center mt-4 mb-0">
                <Link
                  to="/login"
                  className="text-decoration-none"
                  style={{ color: "#2f6b3a" }}
                >
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
