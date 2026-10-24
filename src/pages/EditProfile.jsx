import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { uploadImage } from "../helpers/storageHelpers";

const MAX_PHOTO_MB = 5;

export default function EditProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ displayName: "", bio: "", location: "" });
  const [photoURL, setPhotoURL] = useState(""); // current saved photo
  const [file, setFile] = useState(null); // newly chosen photo
  const [preview, setPreview] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Load the saved profile
  useEffect(() => {
    if (!user) return;

    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        const data = snap.exists() ? snap.data() : {};
        setForm({
          displayName: data.displayName || user.displayName || "",
          bio: data.bio || "",
          location: data.location || "",
        });
        setPhotoURL(data.photoURL || user.photoURL || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProfile(false));
  }, [user]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhoto = (e) => {
    const chosen = e.target.files[0];
    if (!chosen) return;

    if (!chosen.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (chosen.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`Photo must be smaller than ${MAX_PHOTO_MB} MB.`);
      return;
    }

    setError("");
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  };

  const removePhoto = () => {
    setFile(null);
    setPreview("");
    setPhotoURL("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!form.displayName.trim()) {
      setError("Display name can't be empty.");
      return;
    }

    setSaving(true);
    try {
      let finalPhoto = photoURL;
      if (file) {
        finalPhoto = await uploadImage(file, "profileImages");
      }

      // 1. Firebase Auth profile (used by useAuth().user)
      await updateProfile(auth.currentUser, {
        displayName: form.displayName.trim(),
        photoURL: finalPhoto || null,
      });

      // 2. Firestore users document (used by emails and the profile page)
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: form.displayName.trim(),
          bio: form.bio.trim(),
          location: form.location.trim(),
          photoURL: finalPhoto || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setError("");
    setInfo("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setInfo("We sent a password reset link to " + user.email + ".");
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || (user && loadingProfile)) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">
          You need to be logged in to edit your profile.
        </p>
        <Link to="/login" className="btn btn-success">
          Go to Login
        </Link>
      </div>
    );
  }

  const shownPhoto = preview || photoURL;
  const initials = (form.displayName || user.email || "?")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");
  const hasPassword = user.providerData?.some(
    (p) => p.providerId === "password",
  );

  return (
    <div className="container py-4" style={{ maxWidth: 640 }}>
      <Link
        to="/profile"
        className="btn btn-link link-secondary text-decoration-none ps-0 mb-2 fw-semibold"
      >
        ← Back to profile
      </Link>

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-4">
          <h3 className="fw-bold mb-4">Edit Profile</h3>

          <form onSubmit={handleSave} className="d-flex flex-column gap-3">
            {/* Photo */}
            <div className="d-flex align-items-center gap-3">
              {shownPhoto ? (
                <img
                  src={shownPhoto}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="rounded-circle border"
                  style={{ width: 96, height: 96, objectFit: "cover" }}
                />
              ) : (
                <div
                  className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                  style={{ width: 96, height: 96, fontSize: 34 }}
                >
                  {initials}
                </div>
              )}

              <div>
                <label className="btn btn-outline-primary btn-sm rounded-pill mb-2">
                  Change photo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handlePhoto}
                  />
                </label>
                {shownPhoto && (
                  <div>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger p-0"
                      onClick={removePhoto}
                    >
                      Remove photo
                    </button>
                  </div>
                )}
                <div className="form-text">
                  JPG or PNG, up to {MAX_PHOTO_MB} MB.
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="form-label fw-medium">Display name</label>
              <input
                name="displayName"
                className="form-control"
                value={form.displayName}
                onChange={handleChange}
                maxLength={50}
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="form-label fw-medium">Location</label>
              <input
                name="location"
                className="form-control"
                placeholder="Toronto, Ontario"
                value={form.location}
                onChange={handleChange}
                maxLength={60}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="form-label fw-medium">About you</label>
              <textarea
                name="bio"
                rows={4}
                className="form-control"
                placeholder="Tell the crew what you love to do outdoors..."
                value={form.bio}
                onChange={handleChange}
                maxLength={300}
              />
              <div className="form-text text-end">{form.bio.length}/300</div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="form-label fw-medium">Email</label>
              <input
                className="form-control"
                value={user.email || ""}
                disabled
              />
              <div className="form-text">Email can't be changed here.</div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small mb-0">{error}</div>
            )}
            {info && (
              <div className="alert alert-success py-2 small mb-0">{info}</div>
            )}

            <div className="d-flex gap-2">
              <button
                className="btn btn-success rounded-pill px-4"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              <Link
                to="/profile"
                className="btn btn-outline-secondary rounded-pill px-4"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* Password */}
          {hasPassword && (
            <>
              <hr className="my-4" />
              <h6 className="fw-bold">Password</h6>
              <p className="text-muted small">
                We'll email you a link to choose a new password.
              </p>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-pill"
                onClick={handlePasswordReset}
              >
                Send password reset email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
