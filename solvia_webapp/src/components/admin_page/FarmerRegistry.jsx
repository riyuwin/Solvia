import React, { useEffect, useState } from "react";
import "../../css/accountverification.css";
import "../../css/dashboard.css";

import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import Swal from "sweetalert2";
import { FaUsers, FaCheckCircle, FaClock, FaLandmark, FaChartArea } from "react-icons/fa";
import Sidebar from "./Sidebar";
import TopHeaderUser from "./TopHeaderUser";

export default function FarmerRegistryPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null); // for modal

  const recordsPerPage = 10;

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


  /* ==================== FETCH USERS (REALTIME) ==================== */
  useEffect(() => {
    const q = query(collection(db, "AccountInformation"), orderBy("role", "asc"));
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

  /* ==================== FILTER & PAGINATION ==================== */
  const farmerUsers = users.filter((u) => u.role === "Farmer");

  const filteredUsers = farmerUsers.filter((u) =>
    `${u.FirstName} ${u.LastName} ${u.Email}`.toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentRecords = filteredUsers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);

  /* ==================== DASHBOARD COUNTS ==================== */
  const totalHectares = farmerUsers.reduce((sum, u) => {
    const hectares = parseFloat(u.AreaFarmland) || 0;
    return sum + hectares;
  }, 0);

  const totalVerified = farmerUsers.filter((u) => u.accountStatus === "Verified").length;

  const totalPendingHectares = farmerUsers.reduce((sum, u) => {
    if (u.accountStatus === "Pending") {
      return sum + (parseFloat(u.AreaFarmland) || 0);
    }
    return sum;
  }, 0);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "-";
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

  return (
    <div className="dashboard-wrapper">
      <Sidebar
        collapsed={sidebarCollapsed}
        toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`right-panel ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <TopHeaderUser />
        <h2>Farmer Registry</h2>
        <p>Farmer registry overview & verification</p>


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
                <FaChartArea />
              </div>
              <div className="card-content">
                <h6>Total Hectares</h6>
                <h3>{totalHectares.toFixed(2)}</h3>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-icon bg-success">
                <FaCheckCircle />
              </div>
              <div className="card-content">
                <h6>Verified Farmers</h6>
                <h3>{totalVerified}</h3>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-icon bg-warning">
                <FaClock />
              </div>
              <div className="card-content">
                <h6>Pending Hectares</h6>
                <h3>{totalPendingHectares.toFixed(2)}</h3>
              </div>
            </div>
          </div>

          {/* ==================== FARMER TABLE ==================== */}
          <div className="account-box" style={{ marginTop: "40px" }}>
            <h4>Farmer Registry</h4>

            <div className="search-container">
              <input
                type="text"
                placeholder="Search farmer..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {loading ? (
              <p>Loading farmers...</p>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Profile</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Gender</th>
                      <th>Farmland <br />(Hectare/s)</th>
                      <th>Municipality</th>
                      <th>Barangay</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((u, i) => (
                      <tr key={u.id}>
                        <td>{indexOfFirst + i + 1}</td>
                        <td>
                          <img
                            src={avatars[u.AvatarIndex]}
                            alt="Profile"
                            style={{
                              width: "60px",
                              height: "60px",
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        </td>
                        <td>{u.FirstName} {u.MiddleName} {u.LastName}</td>
                        <td>{u.Email}</td>
                        <td>{u.Gender}</td>
                        <td>{u.AreaFarmland}</td>
                        <td>{u.Municipality}</td>
                        <td>{u.Barangay}</td>
                        <td>{u.accountStatus}</td>
                        <td>{formatTimestamp(u.createdAt)}</td>
                        <td>
                          <button className="btn-primary" onClick={() => setSelectedFarmer(u)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
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

          {/* ==================== MODAL ==================== */}
          {selectedFarmer && (
            <div className="modal-overlay" onClick={() => setSelectedFarmer(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* PROFILE */}
                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
                  {selectedFarmer?.AvatarIndex !== undefined && (
                    <img
                      src={avatars[selectedFarmer.AvatarIndex]}
                      alt="Profile"
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  )}

                  <div>
                    <p style={{ margin: 0, fontWeight: "bold", fontSize: "16px" }}>
                      {selectedFarmer.Username}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>Farmer</p>
                  </div>
                </div>
                <hr />

                <h3>Farmer Info</h3>
                <hr />
                <p><strong>Name:</strong> {selectedFarmer.FirstName} {selectedFarmer.LastName}</p>
                <p><strong>Email:</strong> {selectedFarmer.Email}</p>
                <p><strong>Role:</strong> {selectedFarmer.role}</p>
                <p><strong>Birthdate:</strong> {selectedFarmer.Birthdate}</p>
                <p><strong>Status:</strong> {selectedFarmer.accountStatus}</p>
                <p><strong>Contact:</strong> {selectedFarmer.MobileNumber || "-"}</p>
                <p><strong>Address:</strong> {selectedFarmer.StreetName} {selectedFarmer.Barangay} {selectedFarmer.Municipality}, {selectedFarmer.Province}</p>
                <hr />
                <p><strong>Area Farmland:</strong> {selectedFarmer.AreaFarmland || "-"} hectare/s</p>
                <hr />
                <p>Base Cost:</p>
                <p><strong>Land Preparations:</strong> {selectedFarmer.LandPreparation || "-"} hectare/s</p>
                <p><strong>Fertilizer:</strong> {selectedFarmer.Fertilizer || "-"} hectare/s</p>
                <p><strong>Seed:</strong> {selectedFarmer.Seeds || "-"} hectare/s</p>
                <p><strong>Labor:</strong> {selectedFarmer.Labor || "-"} hectare/s</p>
                <hr />
                <p><strong>Created:</strong> {formatTimestamp(selectedFarmer.createdAt)}</p>
                <hr /><br />

                <button className="btn-modal-danger" onClick={() => setSelectedFarmer(null)}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
