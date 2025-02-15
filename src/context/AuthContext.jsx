// src/context/AuthContext.js
import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inactiveTimer, setInactiveTimer] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const startInactivityTimer = () => {
    if (inactiveTimer) clearTimeout(inactiveTimer);
    const timer = setTimeout(async () => {
      await signOut(auth);
      setUser(null);
    }, 60 * 60 * 1000);
    setInactiveTimer(timer);
  };

  const resetInactivityTimer = () => {
    startInactivityTimer();
  };

  const clearCredentials = () => {
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => form.reset());
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUser(currentUser);
          startInactivityTimer();
        } else {
          await signOut(auth);
          showToast("User not found");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      clearCredentials();
    });

    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keypress", resetInactivityTimer);
    window.addEventListener("beforeunload", clearCredentials);

    return () => {
      unsubscribe();
      window.removeEventListener("mousemove", resetInactivityTimer);
      window.removeEventListener("keypress", resetInactivityTimer);
      window.removeEventListener("beforeunload", clearCredentials);
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    if (inactiveTimer) clearTimeout(inactiveTimer);
    clearCredentials();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {!loading && (
        <>
          {toastMessage && (
            <div className="toast show position-fixed bottom-0 end-0 m-3 bg-danger text-white">
              <div className="toast-body">{toastMessage}</div>
            </div>
          )}
          {children}
        </>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
