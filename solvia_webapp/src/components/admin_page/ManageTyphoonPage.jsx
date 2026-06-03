import React, { useEffect, useState } from "react";
import "../../css/accountverification.css";
import "../../css/dashboard.css";

import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

import Swal from "sweetalert2";
import { FaPlus, FaFilter, FaEdit, FaTrash } from "react-icons/fa";
import Sidebar from "./Sidebar";
import TopHeaderUser from "./TopHeaderUser";

export default function ManageTyphoonPage() {
  const [typhoons, setTyphoons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedYear, setSelectedYear] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTyphoon, setEditingTyphoon] = useState(null);

  const [newTyphoon, setNewTyphoon] = useState({
    name: "",
    year: new Date().getFullYear(),
  });

  /* ==================== FETCH TYPHOONS ==================== */
  useEffect(() => {
    const q = query(collection(db, "TyphoonRecords"), orderBy("year", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTyphoons(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        Swal.fire("Error", "Could not fetch typhoons", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* ==================== ADD NEW TYPHOON ==================== */
  const handleAddTyphoon = async () => {
    const { name, year } = newTyphoon;

    if (!name || !year) {
      Swal.fire("Error", "All fields are required", "error");
      return;
    }

    try {
      await addDoc(collection(db, "TyphoonRecords"), {
        name,
        year: parseInt(year),
        createdAt: new Date(),
      });

      Swal.fire("Success", "Typhoon record added", "success");
      setShowAddModal(false);
      setNewTyphoon({ name: "", year: new Date().getFullYear() });
    } catch (err) {
      Swal.fire("Error", "Failed to add typhoon: " + err.message, "error");
    }
  };

  /* ==================== EDIT TYPHOON ==================== */
  const handleEditTyphoon = async () => {
    if (!editingTyphoon.name || !editingTyphoon.year) {
      Swal.fire("Error", "All fields are required", "error");
      return;
    }

    try {
      await updateDoc(doc(db, "TyphoonRecords", editingTyphoon.id), {
        name: editingTyphoon.name,
        year: parseInt(editingTyphoon.year),
      });

      Swal.fire("Success", "Typhoon record updated", "success");
      setShowEditModal(false);
      setEditingTyphoon(null);
    } catch (err) {
      Swal.fire("Error", "Failed to update typhoon: " + err.message, "error");
    }
  };

  /* ==================== DELETE TYPHOON ==================== */
  const handleDeleteTyphoon = async (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will delete the typhoon record permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await deleteDoc(doc(db, "TyphoonRecords", id));
        Swal.fire("Deleted!", "Typhoon record has been deleted.", "success");
      }
    });
  };

  /* ==================== FILTER ==================== */
  const filteredTyphoons =
    selectedYear === "All" ? typhoons : typhoons.filter((t) => t.year === parseInt(selectedYear));

  /* ==================== PAGINATION ==================== */
  const recordsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentRecords = filteredTyphoons.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredTyphoons.length / recordsPerPage);

  const years = [...new Set(typhoons.map((t) => t.year))].sort((a, b) => b - a);

  return (
    <div className="dashboard-wrapper">
      <Sidebar
        collapsed={sidebarCollapsed}
        toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`right-panel ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <TopHeaderUser />
        <h2>Manage Typhoons</h2>
        <p>Input, view, and manage typhoon records by year</p>


        <div
          id="map"
          style={{
            minHeight: "800px",
            background: "#ffffff3f",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          {/* ==================== TYPHOON TABLE ==================== */}
          <div className="account-box" style={{ marginTop: "20px" }}>
            {/* ==================== SINGLE ROW: FILTER + ADD ==================== */}

            <h4>Typhoon Management</h4>

            <div className="filter-add-row">
              {/* Filter */}
              <div className="filter-container">
                <FaFilter className="filter-icon" />
                <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                  <option value="All">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add button */}
              <button className="btn-success add-btn" onClick={() => setShowAddModal(true)}>
                <FaPlus /> Add Typhoon
              </button>
            </div>

            {loading ? (
              <p>Loading typhoons...</p>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Year</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((t, i) => (
                      <tr key={t.id}>
                        <td>{indexOfFirst + i + 1}</td>
                        <td>{t.name}</td>
                        <td>{t.year}</td>
                        <td>
                          {t.createdAt?.toDate
                            ? t.createdAt.toDate().toLocaleString()
                            : new Date(t.createdAt).toLocaleString()}
                        </td>
                        <td className="action-buttons">

                          <button onClick={() => handleDeleteTyphoon(t.id)}>
                            <FaTrash /> Delete
                          </button>

                          <button
                            onClick={() => {
                              setEditingTyphoon(t);
                              setShowEditModal(true);
                            }}
                          >
                            <FaEdit /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="pagination" style={{ marginTop: "10px" }}>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <span style={{ margin: "0 8px" }}>
                      {currentPage} / {totalPages}
                    </span>
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

          {/* ==================== ADD MODAL ==================== */}
          {showAddModal && (
            <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Add New Typhoon</h3>
                <hr />
                <label>Name:</label>
                <input
                  type="text"
                  value={newTyphoon.name}
                  onChange={(e) => setNewTyphoon({ ...newTyphoon, name: e.target.value })}
                />

                <label>Year:</label>
                <input
                  type="number"
                  value={newTyphoon.year}
                  onChange={(e) => setNewTyphoon({ ...newTyphoon, year: e.target.value })}
                />

                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <button className="btn-primary" onClick={handleAddTyphoon}>
                    Save
                  </button>
                  <button className="btn-danger" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== EDIT MODAL ==================== */}
          {showEditModal && editingTyphoon && (
            <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Edit Typhoon</h3>
                <hr />
                <label>Name:</label>
                <input
                  type="text"
                  value={editingTyphoon.name}
                  onChange={(e) =>
                    setEditingTyphoon({ ...editingTyphoon, name: e.target.value })
                  }
                />
                <br />
                <label>Year:</label>
                <input
                  type="number"
                  value={editingTyphoon.year}
                  onChange={(e) =>
                    setEditingTyphoon({ ...editingTyphoon, year: e.target.value })
                  }
                />

                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <button className="btn-primary" onClick={handleEditTyphoon}>
                    Save
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTyphoon(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
