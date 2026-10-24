import { Link } from "react-router-dom";
import defaultCover from "../assets/profile-default.png"; // Fallback cover image

function EventCard({
  title,
  location,
  date,
  difficulty = "easy",
  currentHeadcount = 0,
  maxHeadcount = 0,
  likeCount = 0,
  commentCount = 0, // 1. Added commentCount prop
  coverImage,
  id,
}) {
  // Color mapping for difficulty badges
  const difficultyBadges = {
    easy: "bg-success-subtle text-success border-success-subtle",
    moderate: "bg-warning-subtle text-warning border-warning-subtle",
    hard: "bg-danger-subtle text-danger border-danger-subtle",
  };

  const isFull = currentHeadcount >= maxHeadcount && maxHeadcount > 0;

  return (
    <div className="col-12 col-sm-6 col-md-4 mb-4">
      <Link to={`/event/${id}`} className="text-decoration-none text-dark">
        <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden card-hover transition-all">
          {/* Image Container with Floating Badges */}
          <div
            className="position-relative bg-light"
            style={{ height: "200px" }}
          >
            <img
              src={coverImage || defaultCover}
              className="w-100 h-100 object-fit-cover"
              alt={title}
              onError={(e) => {
                e.target.src = defaultCover;
              }}
            />

            {/* Difficulty Badge (Top Right) */}
            <div className="position-absolute top-0 end-0 m-3">
              <span
                className={`badge border px-3 py-2 rounded-pill text-capitalize fw-semibold shadow-sm ${
                  difficultyBadges[difficulty] || "bg-secondary text-white"
                }`}
              >
                {difficulty}
              </span>
            </div>

            {/* Event Full Overlay (Top Left) */}
            {isFull && (
              <div className="position-absolute top-0 start-0 m-3">
                <span className="badge bg-dark text-white px-3 py-2 rounded-pill fw-normal shadow-sm">
                  FULL
                </span>
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="card-body d-flex flex-column justify-content-between p-3">
            <div>
              <h5
                className="card-title fw-bold text-truncate mb-2"
                title={title}
              >
                {title}
              </h5>

              <p className="card-text text-secondary small mb-1 text-truncate">
                <i className="bi bi-geo-alt me-1"></i>
                {location || "Location TBD"}
              </p>

              <p className="card-text text-muted small mb-3">
                <i className="bi bi-calendar-event me-1"></i>
                {date || "Date TBD"}
              </p>
            </div>

            {/* Footer Metadata Bar */}
            <div className="d-flex align-items-center justify-content-between pt-2 border-top border-light-subtle mt-auto">
              {/* Headcount */}
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1.5 rounded-pill small">
                {currentHeadcount}/{maxHeadcount} joined
              </span>

              {/* Likes & Comments Group */}
              <div className="d-flex align-items-center gap-3 text-muted small fw-semibold">
                {/* Like Counter */}
                <div className="d-flex align-items-center gap-1">
                  <i className="bi bi-heart"></i>
                  <span>{likeCount}</span>
                </div>

                {/* Comment Counter */}
                <div className="d-flex align-items-center gap-1">
                  <i className="bi bi-chat"></i>
                  <span>{commentCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default EventCard;
