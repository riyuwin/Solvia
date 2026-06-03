// src/components/TopHeaderUser.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../firebase";

// Avatar images
/* const avatars = [
  "/assets/img/solvia_avatar1.png",
  "/assets/img/solvia_avatar2.png",
  "/assets/img/solvia_avatar3.png",
  "/assets/img/solvia_avatar4.png",
  "/assets/img/solvia_avatar5.png",
  "/assets/img/solvia_avatar6.png",
  "/assets/img/solvia_avatar7.png",
  "/assets/img/solvia_avatar8.png",
  "/assets/img/solvia_avatar9.png",
  "/assets/img/solvia_avatar10.png",
  "/assets/img/solvia_avatar11.png",
  "/assets/img/solvia_avatar12.png",
]; */
  const avatars = [
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar1.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar2.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar3.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar4.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar5.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar6.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar7.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar8.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar9.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar10.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar11.png`,
    `${import.meta.env.BASE_URL}assets/img/solvia_avatar12.png`,
  ];

/* ---------- MODAL STYLES ---------- */
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "#fff",
  padding: "25px",
  borderRadius: "12px",
  width: "360px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  textAlign: "center",
};

export default function TopHeaderUser() {
  const [accounts, setAccounts] = useState({});
  const [reports, setReports] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  /* ---------- AUTH ---------- */
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user ? user.uid : null);
    });
  }, []);

  /* ---------- FIRESTORE ---------- */
  useEffect(() => {
    const unsubAccounts = onSnapshot(
      collection(db, "AccountInformation"),
      (snap) => {
        const map = {};
        snap.forEach((d) => (map[d.id] = d.data()));
        setAccounts(map);
      }
    );

    const unsubReports = onSnapshot(
      collection(db, "DamageRecordInformation"),
      (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubAccounts();
      unsubReports();
    };
  }, []);

  const user = currentUserId ? accounts[currentUserId] : null;

  /* ---------- AVATAR FALLBACK ---------- */
  // Compute top farmer by total loss
  const farmerLossMap = {};
  reports.forEach((r) => {
    const loss =
      (Number(r.BeforeCalamity) || 0) -
      (Number(r.AfterCalamity) || 0);
    if (!farmerLossMap[r.UserID]) farmerLossMap[r.UserID] = 0;
    farmerLossMap[r.UserID] += loss;
  });

  const topFarmerAvatar = Object.entries(farmerLossMap)
    .map(([uid]) => {
      const acc = accounts[uid];
      return acc?.avatarIndex != null ? avatars[acc.avatarIndex] : null;
    })
    .find(Boolean);

  // Display current user's avatar if available, else fallback
  const displayAvatar =
    user?.avatarIndex != null && avatars[user.avatarIndex] !== undefined
      ? avatars[user.avatarIndex]
      : topFarmerAvatar || "/assets/profile_avatar.png";

  return (
    <>
      {/* HEADER */}
      <div
        className="dashboard-greeting"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h4 style={{ margin: 0 }}>Good Day!</h4>
          <p style={{ margin: 0, color: "#555" }}>
            Welcome Back{user?.firstName ? `, ${user.firstName}` : ""}!
          </p>
        </div>

        <img
          src={displayAvatar}
          alt="Profile"
          onClick={() => setShowModal(true)}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid #ddd",
            cursor: "pointer",
          }}
        />
      </div>

      <hr />

      {/* MODAL */}
      {showModal && user && (
        <div style={overlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            {/* AVATAR */}
            <img
              src={displayAvatar}
              alt="Profile"
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #eee",
                marginBottom: "10px",
              }}
            />

            <h3 style={{ marginBottom: "10px" }}>
              {user.firstName} {user.middleName} {user.lastName}
            </h3>

            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
            { user.role === "MAO" && 
                <>
                    <p><strong>Municipality:</strong> {user.municipality}</p>                
                </>
            }
            <p><strong>Gender:</strong> {user.gender}</p>
            <p><strong>Contact:</strong> {user.contact}</p>
            <p><strong>Status:</strong> {user.accountStatus}</p>

            <button
              onClick={() => setShowModal(false)}
              style={{
                marginTop: "15px",
                padding: "8px 15px",
                borderRadius: "6px",
                border: "none",
                background: "#333",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
