import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import {
  FaTachometerAlt,
  FaChartBar,
  FaUser,
  FaUserShield,
  FaBars,
  FaWind,
  FaSignOutAlt,
} from "react-icons/fa";
import { FaHouseFloodWater } from "react-icons/fa6";
import "../../css/sidebar.css";

export default function MaoSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [role, setRole] = useState(null); // PAO / MAO
  const [loadingRole, setLoadingRole] = useState(true);

  /* ================= MOBILE COLLAPSE ================= */
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsCollapsed(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* ================= INSTANT ROLE FETCH ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null);
        setLoadingRole(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "AccountInformation", user.uid));
        if (snap.exists()) {
          setRole(snap.data().role);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRole(false);
      }
    });

    return () => unsub();
  }, []);

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    await signOut(auth);
    Swal.fire("Logged Out", "You have been logged out.", "success");
    navigate("/");
  };

  return (
    <>
      {isMobile && !isCollapsed && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <div
        className={`left-panel ${
          isCollapsed ? "collapsed" : ""
        } ${isMobile ? "mobile" : ""}`}
      >
        {/* HEADER */}
        <div className="sidebar-header">
          <button
            className="burger-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <FaBars />
          </button>

          {!isCollapsed && (
            <>
              <img
                /* src="/assets/img/solvia_logo5.png" */
                src={`${import.meta.env.BASE_URL}assets/img/solvia_logo5.png`}
                alt="Solvia Logo"
                className="left-logo"
              />
              <h1>SOLVIA</h1>
              <p>A Web-Based Computational System for Modeling and Calculating Crop Damage in Flood-Affected Farmland</p>
              <hr />
            </>
          )}
        </div>

        {!isCollapsed && <label className="menu_name">Menu</label>}

        {/* MENU */}
        <div className="sidebar-menu">
          <button
            className={location.pathname === "/mao/dashboard" ? "active" : ""}
            onClick={() => navigate("/mao/dashboard")}
          >
            <span className="menu-icon"><FaTachometerAlt /></span>
            {!isCollapsed && "Dashboard"}
          </button>

          <button
            className={
              location.pathname === "/mao/farmer_flood_report" ? "active" : ""
            }
            onClick={() => navigate("/mao/farmer_flood_report")}
          >
            <span className="menu-icon"><FaHouseFloodWater /></span>
            {!isCollapsed && "Farmers Flood Report"}
          </button>

          <button
            className={
              location.pathname === "/mao/farmer_registry" ? "active" : ""
            }
            onClick={() => navigate("/mao/farmer_registry")}
          >
            <span className="menu-icon"><FaUser /></span>
            {!isCollapsed && "Farmer Registry"}
          </button>

          <button
            className={location.pathname === "/mao/reports" ? "active" : ""}
            onClick={() => navigate("/mao/reports")}
          >
            <span className="menu-icon"><FaChartBar /></span>
            {!isCollapsed && "Reports and Statistics"}
          </button>
 
        </div>

        {/* LOGOUT */}
        <div className="sidebar-logout">
          <button onClick={handleLogout}>
            <span className="menu-icon"><FaSignOutAlt /></span>
            {!isCollapsed && "Logout"}
          </button>
        </div>
      </div>
    </>
  );
}
