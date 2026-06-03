import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; 
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";

export default function RoleGuard({ allowedRoles, children }) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in, redirect to login
        navigate("/", { replace: true });
        return;
      }

      try {
        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, "AccountInformation", user.uid));
        const userData = userDoc.data();

        if (!userData || !allowedRoles.includes(userData.role)) {
          // Role not allowed, redirect
          navigate("/unauthorized", { replace: true });
        } else {
          // Allowed
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        navigate("/unauthorized", { replace: true });
      }
    });

    return () => unsubscribe();
  }, [allowedRoles, navigate]);

  /* if (loading) {
    return <p>Loading...</p>; // Or a spinner
  } */

  return <>{children}</>;
}
