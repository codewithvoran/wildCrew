import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { createNotification } from "./notificationService";

// Looks up the event and notifies its organizer (never the actor themselves).
// Failures are logged but never block the like/comment itself.
const notifyOrganizer = async (eventId, user, title, buildMessage) => {
  try {
    const snap = await getDoc(doc(db, "events", eventId));
    if (!snap.exists()) return;

    const event = snap.data();
    if (!event.organizerId || event.organizerId === user.uid) return;

    const who = user.displayName || user.email;
    await createNotification({
      recipientId: event.organizerId,
      senderName: who,
      title,
      message: buildMessage(who, event.title),
      link: `/event/${eventId}`,
    });
  } catch (err) {
    console.error("Notification failed:", err);
  }
};

export const postComment = async (eventId, user, text) => {
  const ref = await addDoc(collection(db, "events", eventId, "comments"), {
    userId: user.uid,
    userName: user.displayName || user.email,
    userPhoto: user.photoURL || "",
    text,
    createdAt: serverTimestamp(),
  });

  notifyOrganizer(
    eventId,
    user,
    "New comment",
    (who, eventTitle) =>
      `${who} commented on "${eventTitle}": ${String(text).slice(0, 80)}`,
  );

  return ref;
};

export const deleteComment = async (eventId, commentId) => {
  return await deleteDoc(doc(db, "events", eventId, "comments", commentId));
};

export const sendJoinRequest = async (
  eventId,
  eventTitle,
  user,
  organizerId,
) => {
  return await addDoc(collection(db, "joinRequests"), {
    eventId,
    eventTitle,
    userId: user.uid,
    userName: user.displayName || user.email,
    organizerId,
    status: "pending",
    createdAt: serverTimestamp(),
  });
};

// NOTE: this takes only the user's id, so the notification looks up the
// display name from the signed-in user object passed as the 4th argument.
// Existing calls toggleLikeEvent(eventId, userId, isLiked) still work, but
// pass the user object as a 4th argument to enable the like notification:
//   toggleLikeEvent(eventId, user.uid, liked, user)
export const toggleLikeEvent = async (eventId, userId, isLiked, user) => {
  const likeRef = doc(db, "events", eventId, "likes", userId);
  if (isLiked) {
    await deleteDoc(likeRef);
    return false;
  } else {
    await setDoc(likeRef, {
      userId,
      createdAt: serverTimestamp(),
    });

    if (user) {
      notifyOrganizer(
        eventId,
        user,
        "New like",
        (who, eventTitle) => `${who} liked "${eventTitle}"`,
      );
    }

    return true;
  }
};
