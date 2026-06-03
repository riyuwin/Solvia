import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

import DashboardPage from "../../components/admin_page/DashboardPage";
import LoginForm from "../../components/auth/LoginForm";
import MAODashboardPage from "../../components/mao_page/MaoDashboardPage";

import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No session, stay on login
        setLoading(false);
        return;
      }

      try {
        // Get user data
        const userDoc = await getDoc(doc(db, "AccountInformation", user.uid));
        const userData = userDoc.data();

        if (!userData || !userData.role) {
          // Role not found, logout or redirect
          setLoading(false);
          return;
        }

        // Redirect based on role
        if (userData.role === "MAO") {
          navigate("/mao/dashboard", { replace: true });
        } else if (userData.role === "PAO") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          // Other roles or fallback
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  /* if (loading) return <p>Loading...</p>; */

  return <LoginForm />;
}
