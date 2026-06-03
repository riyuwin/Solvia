import React, { useEffect, useState } from "react";
import "../../css/accountverification.css";
import "../../css/dashboard.css";

import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where } from "firebase/firestore";

import Swal from "sweetalert2";
import { FaChartArea, FaCheckCircle, FaClock, FaDownload, FaEdit, FaFilter, FaTrash } from "react-icons/fa";
import Sidebar from "./Sidebar";

import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import TopHeaderUser from "./TopHeaderUser";
import { downloadPdfReport } from "./DownloadPdfReport";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function FarmerFloodReportPage() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [typhoons, setTyphoons] = useState([]);
    const [selectedYear, setSelectedYear] = useState("All");
    const [modalMode, setModalMode] = useState("view");

    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [currentUserMunicipality, setCurrentMunicipality] = useState(null);
    const [accounts, setAccounts] = useState({});

    const formatPeso = (value) => "₱" + Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 27 }, (_, i) => currentYear - i);

    const recordsPerPage = 10;


    useEffect(() => {
        if (!currentUserId || !accounts[currentUserId]) return;

        const userData = accounts[currentUserId];

        setCurrentUserData(userData);
        setCurrentUserRole(userData.role);
        setCurrentMunicipality(userData.municipality);

        console.log("===== CURRENT USER DETAILS =====");
        console.log("User ID:", currentUserId);
        console.log("Role:", userData.role);
        console.log("Full Data:", userData);
        console.log("Municipality:", userData.Municipality);
        console.log("================================");

    }, [currentUserId, accounts]);

    useEffect(() => {
        const auth = getAuth();

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("LOGGED IN USER ID:", user.uid);
                setCurrentUserId(user.uid);
            } else {
                console.log("NO USER LOGGED IN");
                setCurrentUserId(null);
            }
        });

        return () => unsubscribeAuth();
    }, []);
 
    useEffect(() => {
        const q = query(collection(db, "AccountInformation"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const map = {};
            snapshot.docs.forEach((doc) => {
                map[doc.id] = doc.data();
            });
            setUsers(map);
            setAccounts(map);
        });
        return () => unsubscribe();
    }, []);

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


    // Users mapping for name lookup
    const [users, setUsers] = useState({}); // {UserID: {FirstName, LastName}}
    useEffect(() => {
        const q = query(collection(db, "AccountInformation"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const map = {};
            snapshot.docs.forEach((doc) => {
                map[doc.id] = doc.data();
            });
            setUsers(map);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const currentYear = new Date().getFullYear();

        const q = query(
            collection(db, "TyphoonRecords"),
            where("year", "==", currentYear)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,       // Typhoon name (document ID)
                ...doc.data()
            }));
            setTyphoons(list);
        });

        return () => unsubscribe();
    }, []);


    /* ==================== FETCH REPORTS (REALTIME) ==================== */
    useEffect(() => {
        const q = query(collection(db, "DamageRecordInformation"), orderBy("AddedAt", "desc"));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                setReports(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (error) => {
                Swal.fire("Error", "Could not fetch reports", "error");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const yearFilteredReports = reports.filter(r => {
        if (selectedYear === "All") return true;

        if (!r.DateOfLosses) return false;

        const date =
            r.DateOfLosses.toDate
                ? r.DateOfLosses.toDate()
                : new Date(r.DateOfLosses);

        return date.getFullYear() === Number(selectedYear);
    });

    /* ==================== FILTER & PAGINATION ==================== */
    const filteredReports = yearFilteredReports.filter((r) =>
        r.UserID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.CauseOfLosses?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.StageCultivation?.toLowerCase().includes(searchTerm.toLowerCase())
    );


    const indexOfLast = currentPage * recordsPerPage;
    const indexOfFirst = indexOfLast - recordsPerPage;
    const currentRecords = filteredReports.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredReports.length / recordsPerPage);

    /* ==================== UTILS ==================== */
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
        }).format(dateObj);
    };

    /* ==================== DELETE REPORT ==================== */
    const handleDeleteReport = async (id) => {
        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "This will permanently delete the report!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
        });

        if (confirm.isConfirmed) {
            try {
                await deleteDoc(doc(db, "DamageRecordInformation", id));
                Swal.fire("Deleted!", "Report has been deleted.", "success");
            } catch (err) {
                Swal.fire("Error", err.message, "error");
            }
        }
    };

    const formatDateForInput = (date) => {
        if (!date) return "";

        // Firestore Timestamp
        if (date.toDate) {
            return date.toDate().toISOString().split("T")[0];
        }

        // JS Date
        if (date instanceof Date) {
            return date.toISOString().split("T")[0];
        }

        // String date (MM/DD/YYYY or others)
        const parsed = new Date(date);
        if (!isNaN(parsed)) {
            return parsed.toISOString().split("T")[0];
        }

        return "";
    };

    /* ==================== DASHBOARD STATS (YIELD LOSS) ==================== */
    /* ==================== DASHBOARD STATS (TOTAL AREA LOSS) ==================== */

    // total records
    const totalRecords = yearFilteredReports.length;

    // total unique affected farmers
    const totalAffectedFarmers = new Set(
        yearFilteredReports.map(r => r.UserID)
    ).size;


    // compute average total area loss (%)
    const totalAreaLossAverage =
        yearFilteredReports.length > 0
            ? yearFilteredReports.reduce((sum, r) => {
                const loss = Number(r.TotalAreaLoss);
                return sum + (isNaN(loss) ? 0 : loss);
            }, 0) / yearFilteredReports.length
            : 0;

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Farmer Reports", {
            pageSetup: {
                paperSize: 5,
                orientation: "landscape",
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 1,
            },
        });

        worksheet.pageSetup.margins = {
            left: 0.5,
            right: 0.3,
            top: 0.3,
            bottom: 0.5,
            header: 0.3,
            footer: 0.3,
        };

        const headers = [
            "#", "Report Number", "Farmer Name", "Typhoon Name", "Cause of Loss", "Stage of Cultivation",
            "Irrigation Status", "Before Calamity", "After Calamity", "Damage Percent", "Volume", "Total Damage Loss",
            "Value Farmgate Price", "Total Damage Loss", "Rehabilitation Cost", "Total Area Loss (%)",
            "Date of Loss", "Date of Harvest",
        ];

        // Title row
        worksheet.mergeCells(1, 1, 1, headers.length);
        const title = worksheet.getCell("A1");
        title.value = "FARMER DAMAGE REPORTS";
        title.font = { bold: true, size: 16 };
        title.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 40;

        // Header row
        worksheet.addRow(headers);
        const headerRow = worksheet.getRow(2);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        worksheet.getRow(2).height = 30;
        headerRow.eachCell(cell => {
            cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // Map TyphoonID to Typhoon Name
        const typhoonMap = {};
        typhoons.forEach(t => {
            typhoonMap[t.id] = t.name;
        });

        // Add data rows
        yearFilteredReports.forEach((r, index) => {
            const user = users[r.UserID] || { FirstName: "-", LastName: "-" };

            const dateOfLoss = r.DateOfLosses
                ? r.DateOfLosses.toDate
                    ? r.DateOfLosses.toDate().toLocaleDateString()
                    : new Date(r.DateOfLosses).toLocaleDateString()
                : "-";

            const dateHarvest = r.DateHarvest
                ? r.DateHarvest.toDate
                    ? r.DateHarvest.toDate().toLocaleDateString()
                    : new Date(r.DateHarvest).toLocaleDateString()
                : "-";

            const BF = Number(r.BeforeCalamity) || 0;
            const AF = Number(r.AfterCalamity) || 0;

            const row = worksheet.addRow([
                index + 1,
                r.FarmerNumber || "-",
                `${user.FirstName} ${user.LastName}`,
                typhoonMap[r.TyphoonID] || r.TyphoonID || "-",
                r.CauseOfLosses || "-",
                r.StageCultivation || "-",
                r.IrrigationStatus || "-",
                BF,
                AF,
                r.DamagePercent,
                r.Volume,
                r.TotalDamageCost,
                r.ValueFarmgatePrice,
                r.TotalDamageLoss,
                r.RehabilitationCost,
                r.TotalAreaLoss || "-",
                dateOfLoss,
                dateHarvest,
            ]);

            row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            row.eachCell(cell => {
                cell.border = {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                };
            });
        });

        // Set column widths
        worksheet.columns = [
            { width: 5 }, { width: 10 }, { width: 25 }, { width: 18 }, { width: 18 },
            { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 },
            { width: 18 }, { width: 15 }, { width: 18 }, { width: 20 },
            { width: 20 }, { width: 20 },
        ];

        worksheet.pageSetup.printTitlesRow = "1:2";

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
            `Farmer_Reports_${selectedYear === "All" ? "All_Years" : selectedYear}.xlsx`
        );
    };


    return (
        <div className="dashboard-wrapper">
            <Sidebar
                collapsed={sidebarCollapsed}
                toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            <div className={`right-panel ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
                <TopHeaderUser />
                <h2>Farmers Flood Report</h2>
                <p>View and manage farmer flood reports</p>

                {/* FILTER */}
                <div className="filter-add-row">
                    <div className="filter-container">
                        <FaFilter />
                        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                            <option value="All">All Years</option>
                            {years.map(y => <option key={y}>{y}</option>)}
                        </select>
                    </div>
                    <button className="btn-success" onClick={exportToExcel}>
                        <FaDownload /> Generate Reports
                    </button>
                </div>

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
                                <h6>Total Affected Farmers</h6>
                                <h3>{totalAffectedFarmers}</h3>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="card-icon bg-success">
                                <FaCheckCircle />
                            </div>
                            <div className="card-content">
                                <h6>Total Records</h6>
                                <h3>{totalRecords}</h3>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="card-icon bg-warning">
                                <FaClock />
                            </div>
                            <div className="card-content">
                                <h6>Average Total Area Loss</h6>
                                <h3>{totalAreaLossAverage.toFixed(2)}%</h3>
                            </div>
                        </div>
                    </div>


                    {/* ==================== REPORT TABLE ==================== */}
                    <div className="account-box" style={{ marginTop: "20px" }}>
                        <h4>Farmer Flood Reports</h4>

                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search by Farmer, Cause or Stage..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        {loading ? (
                            <p>Loading reports...</p>
                        ) : (
                            <>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Profile</th>
                                            <th>Report Number</th>
                                            <th>Farmer</th>
                                            <th>Cause of Loss</th>
                                            <th>Stage of Cultivation</th>
                                            <th>Before Calamity <br />Yield</th>
                                            <th>After Calamity <br />Yield</th>
                                            <th>Total Area Loss</th>
                                            <th>Date of Loss</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentRecords.map((r, i) => (
                                            <tr key={r.id}>
                                                <td>{indexOfFirst + i + 1}</td>
                                                <td>

                                                    <img
                                                        src={avatars[users[r.UserID].AvatarIndex]}
                                                        alt="Profile"
                                                        style={{
                                                            width: "60px",
                                                            height: "60px",
                                                            borderRadius: "50%",
                                                            objectFit: "cover",
                                                        }}
                                                    />

                                                </td>
                                                <td>{r.FarmerNumber}</td>
                                                <td>
                                                    {users[r.UserID]
                                                        ? `${users[r.UserID].FirstName} ${users[r.UserID].LastName}`
                                                        : r.UserID}
                                                </td>
                                                <td>{r.CauseOfLosses}</td>
                                                <td>{r.StageCultivation}</td>
                                                <td>{r.BeforeCalamity}</td>
                                                <td>{r.AfterCalamity}</td>
                                                <td>{r.TotalAreaLoss}%</td>
                                                <td>{r.DateOfLosses}</td>
                                                <td className="action-buttons">
                                                    <button
                                                        className="btn-modal-danger"
                                                        onClick={() => handleDeleteReport(r.id)}
                                                    >
                                                        <FaTrash /> Delete
                                                    </button>
                                                    <button
                                                        className="btn-primary"
                                                        onClick={() => {
                                                            setSelectedReport(r);
                                                            setModalMode("edit");
                                                        }}
                                                    >
                                                        <FaEdit /> Edit
                                                    </button>

                                                    <button
                                                        className="btn-success"
                                                        onClick={() => {
                                                            setSelectedReport(r);
                                                            setModalMode("view");
                                                        }}
                                                    >
                                                        <FaDownload /> View
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
                                            onClick={() => setCurrentPage(p => p - 1)}
                                        >
                                            Prev
                                        </button>
                                        <span>{currentPage} / {totalPages}</span>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => p + 1)}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ==================== EDIT REPORT MODAL ==================== */}
                {selectedReport && (
                    <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                            {/* PROFILE */}
                            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
                                {/* <img
                                    src="/assets/img/solvia_logo.png"
                                    alt="Profile"
                                    style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover" }}
                                /> */}

                                {users[selectedReport.UserID].AvatarIndex !== undefined && (
                                    <img
                                        src={avatars[users[selectedReport.UserID].AvatarIndex]}
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
                                        {users[selectedReport.UserID]
                                            ? `${users[selectedReport.UserID].FirstName} ${users[selectedReport.UserID].LastName}`
                                            : selectedReport.UserID}
                                    </p>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>Farmer</p>
                                </div>
                            </div>

                            <hr />

                            <label>Report Number</label>
                            <input
                                type="text"
                                value={selectedReport.FarmerNumber}
                                disabled={true}
                            />

                            {/* EDITABLE FIELDS */}
                            <label>Typhoon Name</label>
                            <select
                                value={selectedReport.TyphoonID || ""}
                                onChange={(e) =>
                                    setSelectedReport(prev => ({
                                        ...prev,
                                        TyphoonID: e.target.value
                                    }))
                                }
                            >
                                <option value="">-- Select Typhoon --</option>

                                {typhoons.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>


                            <label>Cause of Losses</label>
                            <input
                                type="text"
                                disabled={true}
                                value={selectedReport.CauseOfLosses}
                                onChange={(e) =>
                                    setSelectedReport(prev => ({ ...prev, CauseOfLosses: e.target.value }))
                                }
                            />

                            <label>Date of Loss</label>
                            <input
                                type="date"
                                value={formatDateForInput(selectedReport.DateOfLosses)}
                                onChange={(e) =>
                                    setSelectedReport(prev => ({
                                        ...prev,
                                        DateOfLosses: e.target.value
                                    }))
                                }
                            />


                            <label>Date Harvest</label>
                            <input
                                type="date"
                                value={formatDateForInput(selectedReport.DateHarvest)}
                                onChange={(e) =>
                                    setSelectedReport(prev => ({
                                        ...prev,
                                        DateHarvest: e.target.value
                                    }))
                                }
                            />


                            <label>Stage of Cultivation</label>
                            <input
                                type="text"
                                value={selectedReport.StageCultivation}
                                disabled={modalMode === "view"}
                                onChange={(e) =>
                                    setSelectedReport(prev => ({ ...prev, StageCultivation: e.target.value }))
                                }
                            />
                            <br />

                            <label>Irrigation Status</label>
                            <input
                                type="text"
                                value={selectedReport.IrrigationStatus}
                                onChange={(e) =>
                                    setSelectedReport(prev => ({ ...prev, IrrigationStatus: e.target.value }))
                                }
                            />

                            <br /><br />
                            <label>Yield Per Hectare</label><br /><hr />
                            <label>Before Yield</label>
                            <input
                                type="number"
                                value={selectedReport.BeforeCalamity}
                                onChange={(e) =>
                                    setSelectedReport(prev => ({ ...prev, BeforeCalamity: e.target.value }))
                                }
                            /> <br />
                            <label>After Yield</label>
                            <input
                                type="number"
                                value={selectedReport.AfterCalamity}
                                onChange={(e) =>
                                    setSelectedReport(prev => ({ ...prev, AfterCalamity: e.target.value }))
                                }
                            /><br /><br /><hr />

                            <label><i>Calculated Reports</i></label><br /><br />
                            {/* <label>Yield Loss Percent: <b>{selectedReport.YieldLossPercent}%</b></label><br /> */}
                            <label>Rehabilitation Cost: <b>{formatPeso(selectedReport.RehabilitationCost)}</b></label><br />
                            {/* <label>Total Damage Cost: <b>{formatPeso(selectedReport.TotalDamageCost)}</b></label><br /> */}
                            <label>Total Damage Loss: <b>{formatPeso(selectedReport.TotalDamageLoss)}</b></label><br />
                            {/* <label>Value Farmgate Price: <b>{formatPeso(selectedReport.ValueFarmgatePrice)}</b></label><br /><hr /> */}

                            {/* <label>Calculated Reports</label><br /><hr />
                            <label>RehabilitationCost: <b>{selectedReport.RehabilitationCost}</b></label><br /> 
                            <label>TotalDamageCost: <b>{selectedReport.TotalDamageCost}</b></label><br /> 
                            <label>TotalDamageLoss: <b>{selectedReport.TotalDamageLoss}</b></label><br /> 
                            <label>ValueFarmgatePrice: <b>{selectedReport.ValueFarmgatePrice}</b></label><br /> 
                            <label>Volume: <b>{selectedReport.Volume}</b></label><br /> 
                            <label>YieldLossPercent: <b>{selectedReport.YieldLossPercent}</b></label><br />  */}

                            {/* AREA PLACEMENT GRID */}
                            <div style={{ marginTop: "20px" }}>
                                <h5>Area Placement</h5>

                                <i>
                                    <label>Total Area Loss: </label>
                                    <label><b>{selectedReport.TotalAreaLoss}</b></label><br /><br />
                                </i>

                                {/* <input
                                type="number"
                                disabled={true}
                                value={selectedReport.TotalAreaLoss}
                                onChange={(e) =>
                                    setSelectedReport(prev => ({ ...prev, TotalAreaLoss: e.target.value }))
                                }
                            /> */}

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(6, 50px)",
                                        gridTemplateRows: "repeat(6, 50px)",
                                        gap: "0px",
                                    }}
                                >
                                    {[...Array(36)].map((_, idx) => {
                                        const isAffected = selectedReport.AreaPlacement?.includes(idx);

                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    width: "50px",
                                                    height: "50px",
                                                    backgroundImage: `url(${(() => {
                                                        const rightIndexes = [2, 8, 26, 32];
                                                        const leftIndexes = [3, 9, 27, 33];
                                                        const topIndexes = [18, 19, 22, 23];
                                                        const botIndexes = [12, 13, 16, 17];
                                                        const botRightIndex = 14;
                                                        const botLeftIndex = 15;
                                                        const topRightIndex = 20;
                                                        const topLeftIndex = 21;

                                                        if (idx === topRightIndex) return isAffected
                                                            ? "/assets/img/flood_grass_top_right.png"
                                                            : "/assets/img/grass_top_right.png";
                                                        else if (idx === topLeftIndex) return isAffected
                                                            ? "/assets/img/flood_grass_top_left.png"
                                                            : "/assets/img/grass_top_left.png";
                                                        else if (idx === botRightIndex) return isAffected
                                                            ? "/assets/img/flood_grass_bot_right.png"
                                                            : "/assets/img/grass_bot_right.png";
                                                        else if (idx === botLeftIndex) return isAffected
                                                            ? "/assets/img/flood_grass_bot_left.png"
                                                            : "/assets/img/grass_bot_left.png";
                                                        else if (topIndexes.includes(idx)) return isAffected
                                                            ? "/assets/img/flood_grass_top.png"
                                                            : "/assets/img/grass_top.png";
                                                        else if (botIndexes.includes(idx)) return isAffected
                                                            ? "/assets/img/flood_grass_bot.png"
                                                            : "/assets/img/grass_bot.png";
                                                        else if (rightIndexes.includes(idx)) return isAffected
                                                            ? "/assets/img/flood_grass_right.png"
                                                            : "/assets/img/grass_right.png";
                                                        else if (leftIndexes.includes(idx)) return isAffected
                                                            ? "/assets/img/flood_grass_left.png"
                                                            : "/assets/img/grass_left.png";
                                                        else return isAffected
                                                            ? "/assets/img/flood_grass_default.png"
                                                            : "/assets/img/grass_default.png";
                                                    })()
                                                        })`,
                                                    backgroundSize: "cover",
                                                    backgroundPosition: "center",
                                                    border: "0px solid #060a07ff",
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>


                            <hr style={{ marginTop: "20px" }} />
                            <div style={{ display: "flex", gap: "10px" }}>

                                {modalMode === "edit" && (
                                    <button
                                        className="btn-primary"
                                        onClick={async () => {
                                            try {
                                                await updateDoc(
                                                    doc(db, "DamageRecordInformation", selectedReport.id),
                                                    selectedReport
                                                );
                                                Swal.fire("Saved!", "Report updated successfully.", "success");
                                                setSelectedReport(null);
                                            } catch (err) {
                                                Swal.fire("Error", err.message, "error");
                                            }
                                        }}
                                    >
                                        Save
                                    </button>
                                )}

                                {modalMode === "view" && (
                                    <button
                                        className="btn-success"
                                        onClick={() =>
                                            downloadPdfReport(
                                                selectedReport,
                                                users,
                                                typhoons,
                                                {
                                                    id: currentUserId,
                                                    role: currentUserRole,
                                                    name: currentUserData
                                                        ? `${currentUserData.firstName} ${currentUserData.middleName} ${currentUserData.lastName}`
                                                        : "Unknown User",
                                                    currentUserMunicipality: currentUserMunicipality
                                                }
                                            )
                                        }
                                    >
                                        <FaDownload /> Download PDF
                                    </button>
                                )}


                                <button
                                    className="btn-modal-danger"
                                    onClick={() => setSelectedReport(null)}
                                >
                                    Close
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
