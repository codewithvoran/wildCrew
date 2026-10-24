const { setGlobalOptions } = require("firebase-functions");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

// Cost control: cap concurrent containers per function
setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();
const db = admin.firestore();

const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");

// Must be a sender you verified in SendGrid (Settings -> Sender Authentication)
const FROM_EMAIL = "voranzov@gmail.com";
const APP_URL = "https://wildcrew-d554f.web.app";

/* ------------------------------------------------------------------ */
/* Firestore fields used:                                              */
/*   joinRequests/{id}: { eventId, userId }                            */
/*   events/{id}:       { title, date, time, location, address,        */
/*                        organizerId }                                */
/*   events/{id}/likes/{uid}, events/{id}/comments/{id}                */
/*   users/{uid}:       { email, displayName }                         */
/* ------------------------------------------------------------------ */

// Escape user-provided text before putting it in the HTML email
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

exports.notifyOrganizerOnJoinRequest = onDocumentCreated(
  {
    document: "joinRequests/{requestId}",
    secrets: [SENDGRID_API_KEY],
  },
  async (event) => {
    const request = event.data?.data();
    if (!request) return;

    try {
      // 1. The event being requested
      const eventSnap = await db.doc(`events/${request.eventId}`).get();
      if (!eventSnap.exists) {
        logger.warn("Event not found", request.eventId);
        return;
      }
      const eventData = eventSnap.data();

      // Skip if the organizer requested their own event
      if (request.userId === eventData.organizerId) return;

      // 2. The organizer (who gets the email)
      const organizerSnap = await db
        .doc(`users/${eventData.organizerId}`)
        .get();
      const organizer = organizerSnap.data();
      if (!organizer?.email) {
        logger.warn("Organizer has no email", eventData.organizerId);
        return;
      }

      // 3. The person asking to join
      const requesterSnap = await db.doc(`users/${request.userId}`).get();
      const requester = requesterSnap.data() || {};
      const requesterName =
        requester.displayName || requester.email || "Someone";

      // 4. Build the email
      const organizerName = organizer.displayName || "there";
      const when = [eventData.date, eventData.time]
        .filter(Boolean)
        .join(" at ");
      const where = eventData.location || eventData.address || "";

      sgMail.setApiKey(SENDGRID_API_KEY.value());
      await sgMail.send({
        to: organizer.email,
        from: { email: FROM_EMAIL, name: "WildCrew" },
        subject: `New join request for "${eventData.title}"`,
        text:
          `Hi ${organizerName},\n\n` +
          `${requesterName} wants to join your event "${eventData.title}"` +
          `${when ? ` (${when})` : ""}.\n\n` +
          `Review the request on your dashboard: ${APP_URL}/dashboard\n\n` +
          `- The WildCrew team`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#2f6b3a">New join request</h2>
            <p>Hi ${esc(organizerName)},</p>
            <p><strong>${esc(requesterName)}</strong> wants to join your event
               <strong>${esc(eventData.title)}</strong>.</p>
            ${when ? `<p style="margin:0">When: ${esc(when)}</p>` : ""}
            ${where ? `<p style="margin:0">Where: ${esc(where)}</p>` : ""}
            <p style="margin-top:20px">
              <a href="${APP_URL}/dashboard"
                 style="display:inline-block;background:#198754;color:#fff;
                        padding:10px 20px;border-radius:20px;text-decoration:none">
                Review request
              </a>
            </p>
            <p style="color:#888;font-size:12px">WildCrew</p>
          </div>`,
      });

      logger.info("Join request email sent", {
        requestId: event.params.requestId,
      });
    } catch (err) {
      // SendGrid hides its reason inside err.response.body
      logger.error(
        "Failed to send join request email",
        JSON.stringify(err.response?.body || String(err)),
      );
    }
  },
);

/* ------------------------------------------------------------------ */
/* Email the requester when the organizer accepts or rejects.          */
/* Status values are matched loosely so common spellings all work.     */
/* ------------------------------------------------------------------ */
const ACCEPTED = ["accepted", "approved"];
const REJECTED = ["rejected", "declined", "denied"];

const normalize = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase();

exports.notifyRequesterOnDecision = onDocumentUpdated(
  {
    document: "joinRequests/{requestId}",
    secrets: [SENDGRID_API_KEY],
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const oldStatus = normalize(before.status);
    const newStatus = normalize(after.status);

    // Only act when the status actually changed
    if (oldStatus === newStatus) return;

    const accepted = ACCEPTED.includes(newStatus);
    const rejected = REJECTED.includes(newStatus);
    if (!accepted && !rejected) return;

    try {
      // 1. The event
      const eventSnap = await db.doc(`events/${after.eventId}`).get();
      if (!eventSnap.exists) {
        logger.warn("Event not found", after.eventId);
        return;
      }
      const eventData = eventSnap.data();

      // 2. The requester (who gets the email)
      const requesterSnap = await db.doc(`users/${after.userId}`).get();
      const requester = requesterSnap.data();
      if (!requester?.email) {
        logger.warn("Requester has no email", after.userId);
        return;
      }

      // 3. Build the email
      const requesterName = requester.displayName || "there";
      const when = [eventData.date, eventData.time]
        .filter(Boolean)
        .join(" at ");
      const where = eventData.location || eventData.address || "";
      const eventUrl = `${APP_URL}/event/${after.eventId}`;

      const subject = accepted
        ? `You're in! "${eventData.title}"`
        : `Update on your request for "${eventData.title}"`;

      const headline = accepted ? "You're in!" : "Request not accepted";
      const color = accepted ? "#198754" : "#6c757d";
      const message = accepted
        ? `Good news: your request to join <strong>${esc(eventData.title)}</strong> was accepted.`
        : `Unfortunately, your request to join <strong>${esc(eventData.title)}</strong> wasn't accepted this time. Plenty of other adventures are waiting on the feed.`;
      const textMessage = accepted
        ? `Good news: your request to join "${eventData.title}" was accepted.`
        : `Unfortunately, your request to join "${eventData.title}" wasn't accepted this time.`;
      const buttonLabel = accepted ? "View event" : "Browse events";
      const buttonUrl = accepted ? eventUrl : `${APP_URL}/feed`;

      sgMail.setApiKey(SENDGRID_API_KEY.value());
      await sgMail.send({
        to: requester.email,
        from: { email: FROM_EMAIL, name: "WildCrew" },
        subject,
        text:
          `Hi ${requesterName},\n\n${textMessage}\n\n` +
          (accepted && when ? `When: ${when}\n` : "") +
          (accepted && where ? `Where: ${where}\n` : "") +
          `\n${buttonLabel}: ${buttonUrl}\n\n- The WildCrew team`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:${color}">${headline}</h2>
            <p>Hi ${esc(requesterName)},</p>
            <p>${message}</p>
            ${accepted && when ? `<p style="margin:0">When: ${esc(when)}</p>` : ""}
            ${accepted && where ? `<p style="margin:0">Where: ${esc(where)}</p>` : ""}
            <p style="margin-top:20px">
              <a href="${buttonUrl}"
                 style="display:inline-block;background:${color};color:#fff;
                        padding:10px 20px;border-radius:20px;text-decoration:none">
                ${buttonLabel}
              </a>
            </p>
            <p style="color:#888;font-size:12px">WildCrew</p>
          </div>`,
      });

      logger.info("Decision email sent", {
        requestId: event.params.requestId,
        status: newStatus,
      });
    } catch (err) {
      logger.error(
        "Failed to send decision email",
        JSON.stringify(err.response?.body || String(err)),
      );
    }
  },
);

/* ------------------------------------------------------------------ */
/* Like + comment notifications (sent to the event organizer)          */
/* ------------------------------------------------------------------ */

// Shared template so both emails look consistent
const sendOrganizerEmail = async ({
  to,
  subject,
  headline,
  bodyHtml,
  bodyText,
  eventId,
  buttonLabel,
}) => {
  const url = `${APP_URL}/event/${eventId}`;
  sgMail.setApiKey(SENDGRID_API_KEY.value());
  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: "WildCrew" },
    subject,
    text: `${bodyText}\n\n${buttonLabel}: ${url}\n\n- The WildCrew team`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2f6b3a">${headline}</h2>
        ${bodyHtml}
        <p style="margin-top:20px">
          <a href="${url}"
             style="display:inline-block;background:#198754;color:#fff;
                    padding:10px 20px;border-radius:20px;text-decoration:none">
            ${buttonLabel}
          </a>
        </p>
        <p style="color:#888;font-size:12px">WildCrew</p>
      </div>`,
  });
};

exports.notifyOrganizerOnLike = onDocumentCreated(
  {
    document: "events/{eventId}/likes/{likerId}",
    secrets: [SENDGRID_API_KEY],
  },
  async (event) => {
    const { eventId, likerId } = event.params;

    try {
      const eventSnap = await db.doc(`events/${eventId}`).get();
      if (!eventSnap.exists) return;
      const eventData = eventSnap.data();

      // Don't notify people about liking their own event
      if (likerId === eventData.organizerId) return;

      // Only email once per person per event, so like/unlike toggling can't spam
      try {
        await db.doc(`events/${eventId}/likeNotified/${likerId}`).create({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        return; // marker already exists: already emailed about this like
      }

      const liker = (await db.doc(`users/${likerId}`).get()).data() || {};
      const likerName = liker.displayName || liker.email || "Someone";

      const organizer = (
        await db.doc(`users/${eventData.organizerId}`).get()
      ).data();
      if (!organizer?.email) {
        logger.warn("Organizer has no email", eventData.organizerId);
        return;
      }
      const organizerName = organizer.displayName || "there";

      await sendOrganizerEmail({
        to: organizer.email,
        subject: `${likerName} liked "${eventData.title}"`,
        headline: "Someone liked your event",
        bodyHtml: `
          <p>Hi ${esc(organizerName)},</p>
          <p><strong>${esc(likerName)}</strong> liked your event
             <strong>${esc(eventData.title)}</strong>.</p>`,
        bodyText: `Hi ${organizerName},\n\n${likerName} liked your event "${eventData.title}".`,
        eventId,
        buttonLabel: "View event",
      });

      logger.info("Like email sent", { eventId, likerId });
    } catch (err) {
      logger.error(
        "Failed to send like email",
        JSON.stringify(err.response?.body || String(err)),
      );
    }
  },
);

exports.notifyOrganizerOnComment = onDocumentCreated(
  {
    document: "events/{eventId}/comments/{commentId}",
    secrets: [SENDGRID_API_KEY],
  },
  async (event) => {
    const comment = event.data?.data();
    if (!comment) return;
    const { eventId } = event.params;

    try {
      const eventSnap = await db.doc(`events/${eventId}`).get();
      if (!eventSnap.exists) return;
      const eventData = eventSnap.data();

      // Don't notify the organizer about their own comments
      if (comment.userId === eventData.organizerId) return;

      const commenterName = comment.userName || "Someone";
      const snippet = String(comment.text ?? "").slice(0, 200);

      const organizer = (
        await db.doc(`users/${eventData.organizerId}`).get()
      ).data();
      if (!organizer?.email) {
        logger.warn("Organizer has no email", eventData.organizerId);
        return;
      }
      const organizerName = organizer.displayName || "there";

      await sendOrganizerEmail({
        to: organizer.email,
        subject: `New comment on "${eventData.title}"`,
        headline: "New comment on your event",
        bodyHtml: `
          <p>Hi ${esc(organizerName)},</p>
          <p><strong>${esc(commenterName)}</strong> commented on
             <strong>${esc(eventData.title)}</strong>:</p>
          <blockquote style="margin:12px 0;padding:10px 14px;background:#f4f6f4;
                             border-left:4px solid #198754;border-radius:4px">
            ${esc(snippet)}
          </blockquote>`,
        bodyText: `Hi ${organizerName},\n\n${commenterName} commented on "${eventData.title}":\n\n"${snippet}"`,
        eventId,
        buttonLabel: "View comment",
      });

      logger.info("Comment email sent", {
        eventId,
        commentId: event.params.commentId,
      });
    } catch (err) {
      logger.error(
        "Failed to send comment email",
        JSON.stringify(err.response?.body || String(err)),
      );
    }
  },
);
