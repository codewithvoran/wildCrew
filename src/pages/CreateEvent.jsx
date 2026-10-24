import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { formatAddress, searchAddresses } from "../helpers/addressHelpers";
import { uploadImage } from "../helpers/storageHelpers";

export default function CreateEvent() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Event form
  const [form, setForm] = useState({
    title: "",
    address: "",
    latitude: null,
    longitude: null,
    location: "",
    date: "",
    time: "",
    difficulty: "easy",
    maxHeadcount: 5,
    description: "",
    activityType: "hiking",
  });

  // Address suggestions
  const [autoCompletes, setAutoCompletes] = useState([]);

  // Images
  const [file, setFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle normal input changes
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Handle address search
  const handleAddressChange = async (e) => {
    const query = e.target.value;

    // Update address field
    setForm((prev) => ({
      ...prev,
      address: query,
      latitude: null,
      longitude: null,
    }));

    // Clear suggestions
    if (!query.trim()) {
      setAutoCompletes([]);
      return;
    }

    try {
      const results = await searchAddresses(query);

      setAutoCompletes(results);
    } catch (error) {
      console.error("Address search error:", error);

      setAutoCompletes([]);
    }
  };

  // Submit event
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Check date
    if (new Date(form.date) < new Date().setHours(0, 0, 0, 0)) {
      setError("Event date cannot be in the past.");
      return;
    }

    // Make sure an address was selected
    if (form.latitude === null || form.longitude === null) {
      setError("Please select an address from the suggestions.");
      return;
    }

    // Make sure time is selected
    if (!form.time) {
      setError("Please select an event time.");
      return;
    }

    setLoading(true);

    try {
      // Upload cover image
      let coverImage = "";

      if (file) {
        coverImage = await uploadImage(file, "eventImages");
      }

      // Upload gallery images
      const gallery = await Promise.all(
        galleryFiles.map((file) => uploadImage(file, "eventGallery")),
      );

      // Save event to Firestore
      await addDoc(collection(db, "events"), {
        ...form,
        maxHeadcount: Number(form.maxHeadcount),
        currentHeadcount: 0,
        coverImage,
        gallery,
        organizerId: user.uid,
        organizerName: user.displayName || user.email,
        createdAt: serverTimestamp(),
      });

      // Go back to feed
      navigate("/feed");
    } catch (err) {
      setError(err.message || "Failed to create event.");
    } finally {
      setLoading(false);
    }
  };

  // Wait for authentication
  if (authLoading) {
    return <div className="text-center py-5">Loading...</div>;
  }

  // User must be logged in
  if (!user) {
    return (
      <div className="text-center py-5">
        <h4>Please log in to create an event.</h4>

        <button
          className="btn btn-success mt-2"
          onClick={() => navigate("/login")}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: "500px" }}>
      <h2 className="mb-4">Create Event</h2>

      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {/* Title */}
        <div>
          <label className="form-label">Title</label>

          <input
            name="title"
            className="form-control"
            placeholder="Sunrise Hike"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        {/* Address */}
        <div className="position-relative">
          <label className="form-label">Address</label>

          <input
            name="address"
            className="form-control"
            placeholder="Toronto, Ontario, Canada"
            value={form.address}
            onChange={handleAddressChange}
            required
          />

          {autoCompletes.length > 0 && (
            <ul
              className="list-group position-absolute w-100"
              style={{
                zIndex: 1000,
              }}
            >
              {autoCompletes.map((feature, i) => {
                const { properties, geometry } = feature;

                const address = formatAddress(properties);

                return (
                  <li key={i} className="list-group-item p-0">
                    <button
                      type="button"
                      className="list-group-item list-group-item-action border-0"
                      onClick={() => {
                        const [longitude, latitude] = geometry.coordinates;

                        setForm((prev) => ({
                          ...prev,
                          address,
                          latitude,
                          longitude,
                        }));

                        setAutoCompletes([]);
                      }}
                    >
                      {address}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="form-label">Location</label>

          <input
            name="location"
            className="form-control"
            placeholder="Blue Mountain Trailhead"
            value={form.location}
            onChange={handleChange}
            required
          />
        </div>

        {/* Date + Time */}
        <div className="row g-2">
          <div className="col">
            <label className="form-label">Date</label>

            <input
              name="date"
              type="date"
              className="form-control"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col">
            <label className="form-label">Time</label>

            <input
              name="time"
              type="time"
              className="form-control"
              value={form.time}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Max Attendees */}
        <div>
          <label className="form-label">Max Attendees</label>

          <input
            name="maxHeadcount"
            type="number"
            min="1"
            value={form.maxHeadcount}
            className="form-control"
            onChange={handleChange}
            required
          />
        </div>

        {/* Activity + Difficulty */}
        <div className="row g-2">
          <div className="col">
            <label className="form-label">Activity</label>

            <select
              name="activityType"
              value={form.activityType}
              className="form-select"
              onChange={handleChange}
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
              name="difficulty"
              value={form.difficulty}
              className="form-select"
              onChange={handleChange}
            >
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="form-label">Description</label>

          <textarea
            name="description"
            rows={3}
            className="form-control"
            value={form.description}
            onChange={handleChange}
            required
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="form-label">Cover Image</label>

          <input
            type="file"
            accept="image/*"
            className="form-control"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </div>

        {/* Additional Images */}
        <div>
          <label className="form-label">Additional Images</label>

          <input
            type="file"
            accept="image/*"
            className="form-control"
            multiple
            onChange={(e) => setGalleryFiles(Array.from(e.target.files))}
          />
        </div>

        {/* Error */}
        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {/* Submit */}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}
