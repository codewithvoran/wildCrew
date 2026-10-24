import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../firebase";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const hasValidParams = mode === "resetPassword" && !!oobCode;

  // "verifying" | "ready" | "invalid" | "success"
  const [verifyStatus, setStatus] = useState("verifying");
  // Missing/wrong URL params are derived during render, not set in an effect
  const status = hasValidParams ? verifyStatus : "invalid";
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check the one-time code when the page opens
  useEffect(() => {
    if (!hasValidParams) return;

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setAccountEmail(email);
        setStatus("ready");
      })
      .catch((err) => {
        console.log(err);
        setStatus("invalid");
      });
  }, [hasValidParams, oobCode]);

  // After success, send the user back to login
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(t);
  }, [status, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("success");
    } catch (err) {
      console.log(err);
      if (
        err.code === "auth/expired-action-code" ||
        err.code === "auth/invalid-action-code"
      ) {
        setStatus("invalid");
      } else if (err.code === "auth/weak-password") {
        setError("That password is too weak. Try a longer one.");
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
            Back on the
            <br />
            trail in a minute.
          </h1>
          <p className="fs-5 text-white-50 mb-0" style={{ maxWidth: "380px" }}>
            Choose a new password and get back to planning your next adventure.
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

          {/* Verifying */}
          {status === "verifying" && (
            <div className="text-center py-5">
              <div className="spinner-border text-success mb-3" role="status" />
              <p className="text-muted mb-0">Checking your reset link...</p>
            </div>
          )}

          {/* Invalid / expired link */}
          {status === "invalid" && (
            <div className="text-center">
              <h2 className="fw-bold mb-2">Link expired or invalid</h2>
              <p className="text-muted mb-4">
                This reset link has already been used or has expired. Request a
                new one from the login page.
              </p>
              <Link
                to="/login"
                className="btn btn-success btn-lg w-100 rounded-pill fw-medium"
              >
                Back to login
              </Link>
            </div>
          )}

          {/* Form */}
          {status === "ready" && (
            <>
              <h2 className="fw-bold mb-1">Set a new password</h2>
              <p className="text-muted mb-4">
                Resetting the password for{" "}
                <span className="fw-medium">{accountEmail}</span>
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-medium">New password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control form-control-lg rounded-3"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium">
                    Confirm password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control form-control-lg rounded-3"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>

                <div className="form-check mb-4">
                  <input
                    id="showPw"
                    type="checkbox"
                    className="form-check-input"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  <label htmlFor="showPw" className="form-check-label small">
                    Show passwords
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-success btn-lg w-100 rounded-pill fw-medium"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Reset password"}
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

          {/* Success */}
          {status === "success" && (
            <div className="text-center">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle bg-success text-white mx-auto mb-3"
                style={{ width: 64, height: 64, fontSize: "2rem" }}
              >
                ✓
              </div>
              <h2 className="fw-bold mb-2">Password updated</h2>
              <p className="text-muted mb-4">
                You can now log in with your new password. Redirecting you to
                the login page...
              </p>
              <Link
                to="/login"
                className="btn btn-success btn-lg w-100 rounded-pill fw-medium"
              >
                Go to login now
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
