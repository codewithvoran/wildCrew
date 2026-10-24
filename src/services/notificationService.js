import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// Call this function when an event status changes or a comment is made
export const createNotification = async ({
  recipientId,
  senderName,
  title,
  message,
  link,
}) => {
  if (!recipientId) return;

  await addDoc(collection(db, "notifications"), {
    recipientId,
    senderName,
    title,
    message,
    link,
    read: false,
    createdAt: serverTimestamp(),
  });
};

// Mark a single notification as read
export const markAsRead = async (notificationId) => {
  const ref = doc(db, "notifications", notificationId);
  await updateDoc(ref, { read: true });
};
