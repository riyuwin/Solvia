import React, { useRef, useState, useEffect } from "react";
import "../../css/dashboard.css";

import {
    FaLeaf,
    FaChartLine,
    FaFilter,
    FaDownload,
    FaMoneyBillWave,
    FaCoins,
    FaExclamationTriangle,
    FaTools,
    FaChartArea,
    FaCheckCircle,
} from "react-icons/fa";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

import { db } from "../../firebase";
import { collection, onSnapshot, orderBy } from "firebase/firestore";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import MaoSidebar from "./MaoSidebar";
import TopHeaderUser from "../admin_page/TopHeaderUser";
import { getAuth, onAuthStateChanged } from "firebase/auth";

/* ================= CONSTANTS ================= */
/* const TOTAL_GRIDS = 25;
const BASE_COST = 45000;
const FARM_AREA = 1;
const FARMGATE_PRICE = 14; */

const stageFactor = (stage) => (stage === "Reproductive Stage" ? 1.2 : stage === "Ripening Stage" ? 1.4 : 1.0);
const irrigationFactor = (status) => (status === "Non-Irrigated" ? 0.9 : 1.0);

/* ================= HELPER ================= */
const formatPeso = (value) => "₱" + Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MaoReportsPage() {
    const mapRef = useRef(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedYear, setSelectedYear] = useState("All");

    const today = new Date();
    const currentMonth = today.getMonth();

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 27 }, (_, i) => currentYear - i);

    const [reports, setReports] = useState([]);
    const [accounts, setAccounts] = useState({});
    const [typhoons, setTyphoons] = useState({});
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [currentUserMunicipality, setCurrentMunicipality] = useState(null);

    /* ================= AUTH ================= */
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) setCurrentUserId(user.uid);
            else setCurrentUserId(null);
        });
        return () => unsubscribe();
    }, []);

    /* ================= FIRESTORE ================= */
    useEffect(() => {
        onSnapshot(collection(db, "AccountInformation"), (snap) => {
            const map = {};
            snap.docs.forEach((d) => {
                const data = d.data();
                map[d.id] = data;
            });
            setAccounts(map);

            // Set current user role & municipality
            if (currentUserId && map[currentUserId]) {
                setCurrentUserRole(map[currentUserId].role);
                setCurrentMunicipality(map[currentUserId].municipality);
            }
        });
    }, [currentUserId]);

    useEffect(() => onSnapshot(collection(db, "DamageRecordInformation"), (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }), []);

    useEffect(() => onSnapshot(collection(db, "TyphoonRecords"), (snap) => {
        const map = {};
        snap.docs.forEach((d) => { map[d.id] = d.data().name || d.id; });
        setTyphoons(map);
    }), []);

    /* ================= FILTER REPORTS ================= */
    const filteredReports = reports.filter((r) => {
        // Year filter
        if (selectedYear !== "All") {
            if (!r.AddedAt) return false;
            const year = r.AddedAt.toDate ? r.AddedAt.toDate().getFullYear() : new Date(r.AddedAt).getFullYear();
            if (year.toString() !== selectedYear) return false;
        }
        // Municipality filter for MAO
        if (currentUserRole === "MAO") {
            const account = accounts[r.UserID] || {};
            if (account.Municipality !== currentUserMunicipality) return false;
        }
        return true;
    });

    /* ================= COMPUTATIONS ================= */
    /* const computed = filteredReports.map((r) => {
        const DG = r.AreaPlacement?.length || 0;
        const BF = Number(r.BeforeCalamity) || 0;
        const AF = Number(r.AfterCalamity) || 0;

        const D = (DG / TOTAL_GRIDS) * 100;
        const Y = BF === 0 ? 0 : ((BF - AF) / BF) * 100;
        const V = (D / 100) * BF * (Y / 100);
        const TD = (D / 100) * (Y / 100) * BASE_COST;
        const VF = V * FARMGATE_PRICE * 1000;
        const TDL = TD + VF;
        const TRC = FARM_AREA * (D / 100) * BASE_COST * stageFactor(r.StageCultivation) * irrigationFactor(r.IrrigationStatus);

        return { ...r, D, V, TD, VF, TDL, TRC };
    }); */
    /* ================= COMPUTED (FROM SAVED DATA) ================= */
    const computed = filteredReports.map(r => ({
        ...r,
        D: Number(r.DamagePercent) || 0,
        V: Number(r.Volume) || 0,
        TD: Number(r.TotalDamageCost) || 0,
        VF: Number(r.ValueFarmgatePrice) || 0,
        TDL: Number(r.TotalDamageLoss) || 0,
        TRC: Number(r.RehabilitationCost) || 0,
    }));


    const totalReports = computed.length;
    const uniqueFarmers = new Set(computed.map((r) => r.UserID)).size;

    const sum = (key) => relevantReports.reduce((acc, r) => {
        // For AreaFarmland, check if it's in users
        if (key === "AreaFarmland") {
            const account = accounts[r.UserID];
            if (!account || !account[key]) return acc;
            return acc + parseFloat(account[key] || 0);
        }

        // For other report keys (V, TD, VF, TRC)
        return acc + (r[key] || 0);
    }, 0);

    /* ================= CHART DATA ================= */
    // BAR CHART PER YEAR
    const barData = years.map((y) => {
        const count = reports.filter((r) => {
            if (!r.AddedAt) return false;
            const year = r.AddedAt.toDate ? r.AddedAt.toDate().getFullYear() : new Date(r.AddedAt).getFullYear();
            return year === y && (currentUserRole !== "MAO" || (accounts[r.UserID]?.Municipality === currentUserMunicipality));
        }).length;

        return { name: y.toString(), value: count };
    });

    const typhoonMap = {};
    computed.forEach((r) => {
        if (r.TyphoonID) typhoonMap[r.TyphoonID] = (typhoonMap[r.TyphoonID] || 0) + r.D;
    });

    /* const typhoonMap = {};
    computed.forEach((r) => { if (r.TyphoonID) typhoonMap[r.TyphoonID] = (typhoonMap[r.TyphoonID] || 0) + r.D; }); */
    const pieData = Object.keys(typhoonMap).map((id) => ({ name: typhoons[id] || id, value: Number(typhoonMap[id].toFixed(2)) }));
    const COLORS = ["#2a5298", "#f0ad4e", "#5cb85c", "#d9534f", "#6f42c1"];

    /* ================= FILTER REPORTS CURRENT MONTH ================= */
    const currentMonthReports = reports.filter(r => {
        if (!r.DateOfLosses) return false;
        const d = r.DateOfLosses.toDate ? r.DateOfLosses.toDate() : new Date(r.DateOfLosses);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    /* ================= COMPUTATIONS ================= */
    /* const computedReports = currentMonthReports.map(r => {
        const DG = r.AreaPlacement?.length || 0;
        const BF = Number(r.BeforeCalamity) || 0;
        const AF = Number(r.AfterCalamity) || 0;

        const D = (DG / TOTAL_GRIDS) * 100;
        const Y = BF === 0 ? 0 : ((BF - AF) / BF) * 100;
        const V = (D / 100) * BF * (Y / 100);
        const TD = (D / 100) * (Y / 100) * BASE_COST;
        const VF = V * FARMGATE_PRICE * 1000;
        const TRC = FARM_AREA * (D / 100) * BASE_COST * stageFactor(r.StageCultivation) * irrigationFactor(r.IrrigationStatus);

        return { ...r, D, V, TD, VF, TRC };
    }); */

    /* ================= CURRENT MONTH (FROM SAVED DATA) ================= */
    const computedReports = currentMonthReports.map(r => ({
        ...r,
        D: Number(r.DamagePercent) || 0,
        V: Number(r.Volume) || 0,
        TD: Number(r.TotalDamageCost) || 0,
        VF: Number(r.ValueFarmgatePrice) || 0,
        TRC: Number(r.RehabilitationCost) || 0,
        TDL: Number(r.TotalDamageLoss) || 0,   // ✅ ADD THIS
    }));


    // Filter accounts to only the current MAO municipality
    const relevantReports = computedReports.filter(r => {
        const account = accounts[r.UserID] || {};
        if (currentUserRole === "MAO") {
            // Only include reports in this MAO's municipality
            return account.Municipality === currentUserMunicipality;
        }
        return true; // Provincial MAO sees all
    });


    // Aggregate per barangay
    const barangayMap = {};
    relevantReports.forEach(r => {
        const account = accounts[r.UserID] || {};
        const barangay = account.Barangay || "Unknown";

        if (!barangayMap[barangay]) {
            barangayMap[barangay] = { name: barangay, V: 0, TD: 0, VF: 0, TRC: 0 };
        }

        barangayMap[barangay].V += r.V || 0;
        barangayMap[barangay].TD += r.TD || 0;
        barangayMap[barangay].VF += r.VF || 0;
        barangayMap[barangay].TRC += r.TRC || 0;
    });

    const barangayDataFiltered = Object.values(barangayMap);


    /* ================= EXCEL EXPORT ================= */
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
            "No.", "Farmer Name", "Typhoon Name", "Stage", "Irrigation",
            "Before Calamity", "After Calamity", "Total Area Loss (%)",
            "Volume Loss", "Total Damaged (TD)", "Value Farmgate (VF)", "Total Damage Loss (TDL)", "Total Rehabilitation Cost (TRC)", "Date of Losses",
        ];

        worksheet.mergeCells(1, 1, 1, headers.length);
        const title = worksheet.getCell("A1");
        title.value = "FARMER DAMAGE REPORTS";
        title.font = { bold: true, size: 16 };
        title.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(1).height = 40;

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

        const sortedReports = [...filteredReports].sort((a, b) => {
            const dateA = a.DateOfLosses ? (a.DateOfLosses.toDate ? a.DateOfLosses.toDate() : new Date(a.DateOfLosses)) : new Date(0);
            const dateB = b.DateOfLosses ? (b.DateOfLosses.toDate ? b.DateOfLosses.toDate() : new Date(b.DateOfLosses)) : new Date(0);
            return dateB - dateA;
        });

        sortedReports.forEach((r, idx) => {
            const account = accounts[r.UserID] || { firstName: "-", lastName: "-" };
            const DG = r.AreaPlacement?.length || 0;
            const BF = Number(r.BeforeCalamity) || 0;
            const AF = Number(r.AfterCalamity) || 0;

            /* const D = (DG / TOTAL_GRIDS) * 100;
            const Y = BF === 0 ? 0 : (BF - AF) / BF;
            const V = (D / 100) * BF * Y;
            const TD = (D / 100) * Y * BASE_COST;
            const VF = V * FARMGATE_PRICE * 1000;
            const TDL = TD + VF;
            const TRC =
                FARM_AREA *
                (D / 100) *
                BASE_COST *
                stageFactor(r.StageCultivation) *
                irrigationFactor(r.IrrigationStatus); */

            const D = Number(r.DamagePercent) || 0;
            const V = Number(r.Volume) || 0;
            const TD = Number(r.TotalDamageCost) || 0;
            const VF = Number(r.ValueFarmgatePrice) || 0;
            const TDL = Number(r.TotalDamageLoss) || 0;
            const TRC = Number(r.RehabilitationCost) || 0;


            let dateString = "-";
            if (r.DateOfLosses) {
                const dateObj = r.DateOfLosses.toDate ? r.DateOfLosses.toDate() : new Date(r.DateOfLosses);
                dateString = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
            }

            const row = worksheet.addRow([
                idx + 1,
                `${account.FirstName} ${account.LastName}`,
                typhoons[r.TyphoonID] || r.TyphoonID || "-",
                r.StageCultivation || "-",
                r.IrrigationStatus || "-",
                BF,
                AF,
                D,
                V,
                TD,
                VF,
                TDL,
                TRC,
                dateString,
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

        worksheet.columns = [
            { width: 5 }, { width: 25 }, { width: 18 }, { width: 18 },
            { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 },
            { width: 18 }, { width: 15 }, { width: 18 }, { width: 20 },
            { width: 20 }, { width: 15 },
        ];

        worksheet.pageSetup.printTitlesRow = "1:2";

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
            `Farmer_Reports_${selectedYear}.xlsx`);
    };

    return (
        <div className="dashboard-wrapper">
            <MaoSidebar collapsed={sidebarCollapsed} toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <div className={`right-panel ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
                <TopHeaderUser />
                <h2>MAO Reports</h2>
                <p>Overview of farmer flood damage reports</p>

                <div ref={mapRef} style={{ minHeight: "800px", background: "#ffffff3f", borderRadius: "10px", padding: "20px" }}>
                    {/* FILTER */}
                    <div className="filter-add-row">
                        <div className="filter-container">
                            <FaFilter />
                            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                                <option value="All">All Years</option>
                                {years.map((y) => <option key={y}>{y}</option>)}
                            </select>
                        </div>
                        <button className="btn-success" onClick={exportToExcel}><FaDownload /> Generate Excel</button>
                    </div>

                    <div className="dashboard-cards">
                        {/* <div className="dashboard-card">
                            <div className="card-icon bg-primary"><FaChartArea /></div>
                            <div className="card-content">
                                <h6>Total Verified Hectares</h6>
                                <h3>{sum("AreaFarmland")?.toFixed(2)}</h3>
                                <h3>{formatPeso(sum("TDL"))}</h3>
                            </div>
                        </div> */}
 
                        <div className="dashboard-card">
                            <div className="card-icon bg-success"><FaCheckCircle /></div>
                            <div className="card-content">
                                <h6>Total Verified Farmers</h6>
                                <h3>{relevantReports.filter(r => accounts[r.UserID]?.role === "Farmer" && accounts[r.UserID]?.accountStatus === "Verified").length}</h3>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="card-icon bg-warning"><FaTools /></div>
                            <div className="card-content">
                                <h6>Total Rehabilitation Cost</h6>
                                <h3>{formatPeso(sum("TRC"))}</h3>
                            </div>
                        </div>
                        
                        <div className="dashboard-card">
                            <div className="card-icon bg-danger"><FaExclamationTriangle /></div>
                            <div className="card-content">
                                <h6>Total Damage Loss</h6> 
                                <h3>{formatPeso(sum("TDL"))}</h3>
                            </div>
                        </div>
                    </div>

                    {/* MONTHLY METRICS */}
                    <div className="dashboard-cards">
                        <div className="dashboard-card">
                            <div className="card-icon bg-success"><FaLeaf /></div>
                            <div className="card-content">
                                <h6>Total Volume Loss</h6>
                                <h3>{formatPeso(sum("V"))}</h3>
                            </div>
                        </div>
                        <div className="dashboard-card">
                            <div className="card-icon bg-danger"><FaMoneyBillWave /></div>
                            <div className="card-content">
                                <h6>Total Damage (TD)</h6>
                                <h3>{formatPeso(sum("TD"))}</h3>
                            </div>
                        </div>
                        <div className="dashboard-card">
                            <div className="card-icon bg-info"><FaCoins /></div>
                            <div className="card-content">
                                <h6>Total Farmgate Value</h6>
                                <h3>{formatPeso(sum("VF"))}</h3>
                                {/* <h3>{formatPeso(sum("TDL"))}</h3> */}
                            </div>
                        </div> 
                    </div>


                    {/* CHARTS */}
                    <div className="dashboard-charts">
                        <div className="chart-card">
                            <h5>Total Monthly Damage Reports</h5>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barData}>
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#2a5298" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <h5>Damage Percentage per Typhoon</h5>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        innerRadius={60}
                                        outerRadius={110}
                                        label={({ name, value }) => `${name}: ${value}%`}
                                    >
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
