import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // console.log("this is children", children);
    // console.log("serverTimestamp", serverTimestamp()); // this will not work, this will only work inside firebase function.
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Check if they exist in Firestore
      // console.log(firebaseUser);
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);
        // If the user doesn't exist in Firestore, create a new document
        if (!snap.exists()) {
          await setDoc(userRef, {
            name: firebaseUser.displayName || "",
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || "",
            //password is the default provider for email/password authentication
            provider: firebaseUser.providerData[0]?.providerId || "password",
            createdAt: serverTimestamp(),
          });
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {/*  if loading is not true, render the children */}
      {!loading && children}
    </AuthContext.Provider>
  );
}
