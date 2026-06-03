import React, { useEffect, useState } from "react";
import "../../css/accountverification.css";
import "../../css/dashboard.css";

import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";

import Swal from "sweetalert2";
import { FaUsers, FaCheckCircle, FaClock } from "react-icons/fa";
import Sidebar from "./Sidebar";
import TopHeaderUser from "./TopHeaderUser";

export default function AccountVerificationPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const recordsPerPage = 10;

  /* ==================== FETCH USERS ==================== */
  useEffect(() => {
    const q = query(
      collection(db, "AccountInformation"),
      orderBy("createdAt", "desc") // 🔥 latest → oldest
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        Swal.fire("Error", "Could not fetch users", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* ==================== STATUS CHANGE ==================== */
  const handleStatusChange = async (userId, newStatus) => {
    try {
      await updateDoc(doc(db, "AccountInformation", userId), {
        accountStatus: newStatus,
      });
      Swal.fire("Success", `Account set to ${newStatus}`, "success");
      // No need to call fetchUsers(); onSnapshot updates state automatically
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire("Error", "Could not update status", "error");
    }
  };


  /* ==================== FILTER & PAGINATION ==================== */
  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.role}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentRecords = filteredUsers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);

  /* ==================== DASHBOARD COUNTS ==================== */
  const totalUsers = users.length;
  const totalVerified = users.filter(
    (u) => u.accountStatus === "Verified"
  ).length;
  const totalPending = users.filter(
    (u) => u.accountStatus === "Pending"
  ).length;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "-";
    const dateObj = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(dateObj)
      .replace(",", " |");
  };
  const avatars = [
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
  ];

  return (
    <div className="dashboard-wrapper">
      <Sidebar
        collapsed={sidebarCollapsed}
        toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`right-panel ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <TopHeaderUser />
        <h2>Admin Dashboard</h2>
        <p>Account overview & verification</p>

        <div
          id="map"
          style={{
            minHeight: "800px",
            background: "#ffffff3f",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          {/* ==================== DASHBOARD CARDS ==================== */}
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <div className="card-icon bg-primary">
                <FaUsers />
              </div>
              <div className="card-content">
                <h6>Total Registered Users</h6>
                <h3>{totalUsers}</h3>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-icon bg-success">
                <FaCheckCircle />
              </div>
              <div className="card-content">
                <h6>Verified Accounts</h6>
                <h3>{totalVerified}</h3>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-icon bg-warning">
                <FaClock />
              </div>
              <div className="card-content">
                <h6>Pending Accounts</h6>
                <h3>{totalPending}</h3>
              </div>
            </div>
          </div>


          {/* ==================== ACCOUNT TABLE ==================== */}
          <div className="account-box" style={{ marginTop: "40px" }}>
            <h4>Account Management</h4>

            <div className="search-container">
              <input
                type="text"
                placeholder="Search user..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {loading ? (
              <p>Loading users...</p>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Profile</th>
                      <th>Name</th>
                      <th>Email / Username</th>
                      <th>Role</th>
                      <th>Municipality</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((u, i) => {
                      const avatarIndex = u.AvatarIndex ?? u.avatarIndex;

                      return (
                        <tr key={u.id || u.UserID}>
                          <td>{indexOfFirst + i + 1}</td>

                          <td>
                            {Number.isInteger(avatarIndex) ? (
                              <img
                                src={avatars[avatarIndex]}
                                alt="Profile"
                                style={{
                                  width: "50px",
                                  height: "50px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <span>-</span>
                            )}
                          </td>

                          <td>{u.FirstName || u.firstName} {u.LastName || u.lastName}</td>
                          <td>{u.Username || u.email}</td>
                          <td>{u.role}</td>
                          <td>{u.Municipality || u.municipality || ""}</td>
                          <td>{u.accountStatus}</td>
                          <td>{formatTimestamp(u.createdAt)}</td>
                            <td className="action-buttons">
                              <button onClick={() => handleStatusChange(u.id, "Deactivated")}>Deactivate</button>
                              <button onClick={() => handleStatusChange(u.id, "Pending")}>Pending</button>
                              <button onClick={() => handleStatusChange(u.id, "Verified")}>Verify</button>
                            </td>
                        </tr>
                      );
                    })}
 
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <span>{currentPage} / {totalPages}</span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
