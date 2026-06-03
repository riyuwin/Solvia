import React, { useEffect, useRef, useState } from "react";
import "../../css/dashboard.css";
import { FaChartArea, FaChartLine, FaCheckCircle, FaClock, FaCoins, FaLeaf, FaMoneyBillWave, FaTools } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import MaoSidebar from "./MaoSidebar";
import TopHeaderUser from "../admin_page/TopHeaderUser";

/* ================= CONSTANTS ================= */
const TOTAL_GRIDS = 25;
const BASE_COST = 45000;
const FARM_AREA = 1;
const FARMGATE_PRICE = 14;

const stageFactor = (stage) => {
    if (stage === "Reproductive Stage") return 1.2;
    if (stage === "Ripening Stage") return 1.4;
    return 1.0;
};

const irrigationFactor = (status) =>
    status === "Non-Irrigated" ? 0.9 : 1.0;

/* ================= HELPER ================= */
const formatPeso = (value) => "₱" + Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MAODashboardPage() {
    const mapRef = useRef(null);
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [accounts, setAccounts] = useState({});
    const [typhoons, setTyphoons] = useState({});
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [currentUserMunicipality, setCurrentMunicipality] = useState(null);

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


    const COLORS = ["#2a5298", "#f0ad4e", "#5cb85c", "#d9534f", "#6f42c1"];
    const BAR_COLORS = ["#2a5298", "#f0ad4e", "#5cb85c", "#d9534f"];

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

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


    /* ================= FIRESTORE ================= */
    useEffect(() => {
        const unsubscribeUsers = onSnapshot(collection(db, "AccountInformation"), (snap) => {
            const map = {};
            snap.docs.forEach(d => { map[d.id] = d.data(); });
            setAccounts(map);
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubscribeReports = onSnapshot(collection(db, "DamageRecordInformation"), (snap) => {
            setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubscribeTyphoons = onSnapshot(collection(db, "TyphoonRecords"), (snap) => {
            const map = {};
            snap.docs.forEach(d => { map[d.id] = d.data().name || d.id; });
            setTyphoons(map);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeReports();
            unsubscribeTyphoons();
        };
    }, []);

    /* ================= DASHBOARD METRICS ================= */
    const farmerUsers = users.filter(u => u.role === "Farmer");
    const totalHectares = farmerUsers.reduce((sum, u) => sum + (parseFloat(u.AreaFarmland) || 0), 0);
    const totalVerified = farmerUsers.filter(u => u.accountStatus === "Verified").length;
    const totalPendingHectares = farmerUsers.reduce(
        (sum, u) => (u.accountStatus === "Pending" ? sum + (parseFloat(u.AreaFarmland) || 0) : sum),
        0
    );

    /* ================= FILTER REPORTS CURRENT MONTH ================= */
    const currentMonthReports = reports.filter(r => {
        if (!r.DateOfLosses) return false;
        const d = r.DateOfLosses.toDate ? r.DateOfLosses.toDate() : new Date(r.DateOfLosses);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    /* ================= COMPUTATIONS ================= */
    /* ================= COMPUTED REPORTS (FROM SAVED DATA ONLY) ================= */
    const computedReports = currentMonthReports.map(r => ({
        ...r,

        // already computed & saved in Firestore
        D: Number(r.DamagePercent) || 0,
        V: Number(r.Volume) || 0,
        TD: Number(r.TotalDamageCost) || 0,
        VF: Number(r.ValueFarmgatePrice) || 0,
        TRC: Number(r.RehabilitationCost) || 0,

        // optional extras if needed later
        TotalAreaLoss: Number(r.TotalAreaLoss) || 0,
        YieldLossPercent: Number(r.YieldLossPercent) || 0
    }));


    const sum = (key) => relevantReports.reduce((acc, r) => {
        if (key === "AreaFarmland") {
            const account = accounts[r.UserID];
            if (!account || !account[key]) return acc;
            return acc + parseFloat(account[key] || 0);
        }
        return acc + (r[key] || 0);
    }, 0);


    /* ================= BAR DATA PER MUNICIPALITY ================= */
    const municipalities = [
        "Basud", "Capalonga", "Daet", "Jose Panganiban", "Labo",
        "Mercedes", "Paracale", "San Lorenzo", "San Vicente",
        "Santa Elena", "Talisay", "Vinzons"
    ];

    const municipalityData = municipalities.map(name => {
        const reportsInMunicipality = computedReports.filter(r => {
            const account = accounts[r.UserID] || {};
            return account.Municipality === name;
        });

        return {
            name,
            V: reportsInMunicipality.reduce((acc, r) => acc + r.V, 0),
            TD: reportsInMunicipality.reduce((acc, r) => acc + r.TD, 0),
            VF: reportsInMunicipality.reduce((acc, r) => acc + r.VF, 0),
            TRC: reportsInMunicipality.reduce((acc, r) => acc + r.TRC, 0),
        };
    });

    // Replace your current municipalityData with this:
    const municipalityDataFiltered = municipalities
        .filter(name => {
            // If user is MAO, show only their municipality
            if (currentUserRole === "MAO") {
                return name === currentUserMunicipality;
            }
            // Otherwise (Provincial MAO), show all
            return true;
        })
        .map(name => {
            const reportsInMunicipality = computedReports.filter(r => {
                const account = accounts[r.UserID] || {};
                return account.Municipality === name;
            });

            return {
                name,
                V: reportsInMunicipality.reduce((acc, r) => acc + r.V, 0),
                TD: reportsInMunicipality.reduce((acc, r) => acc + r.TD, 0),
                VF: reportsInMunicipality.reduce((acc, r) => acc + r.VF, 0),
                TRC: reportsInMunicipality.reduce((acc, r) => acc + r.TRC, 0),
                TDL: reportsInMunicipality.reduce((acc, r) => acc + r.TDL, 0),
            };
        });


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


    /* ================= PIE DATA PER TYPHOON ================= */

    // Filter reports based on currentUserRole
    const relevantReportsForPie = computedReports.filter(r => {
        const account = accounts[r.UserID] || {};
        return currentUserRole === "MAO"
            ? account.Municipality === currentUserMunicipality
            : true; // Provincial MAO sees all
    });
    const typhoonMap = {};
    relevantReportsForPie.forEach(r => {
        if (!r.TyphoonID) return;
        typhoonMap[r.TyphoonID] = (typhoonMap[r.TyphoonID] || 0) + r.D;
    });

    const pieDataFiltered = Object.keys(typhoonMap).map(id => ({
        name: typhoons[id] || id,
        value: Number(typhoonMap[id].toFixed(2)),
    }));

    return (
        <div className="dashboard-wrapper">
            <MaoSidebar collapsed={sidebarCollapsed} toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />

            <div className={`right-panel ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
                <TopHeaderUser />

                <h2>MAO Dashboard</h2>
                <p>Overview of system activity (Current Month)</p>

                <div ref={mapRef} style={{ minHeight: "800px", background: "#ffffff3f", borderRadius: "10px", padding: "20px" }}>
                    {/* TOP CARDS */}
                    <div className="dashboard-cards">
                        <div className="dashboard-card">
                            <div className="card-icon bg-primary"><FaChartArea /></div>
                            <div className="card-content">
                                <h6>Total Verified Hectares</h6>
                                <h3>{sum("AreaFarmland")?.toFixed(2)}</h3>
                            </div>
                        </div>
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
                            </div>
                        </div>
                    </div>


                    {/* CHARTS */}
                    <div className="dashboard-charts">
                        <div className="chart-card">
                            <h5>Monthly Reports per Municipality</h5>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barangayDataFiltered}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatPeso(value)} />
                                    <Legend />
                                    <Bar dataKey="V" fill={BAR_COLORS[0]} name="Volume Loss" />
                                    <Bar dataKey="TD" fill={BAR_COLORS[1]} name="Total Damage" />
                                    <Bar dataKey="VF" fill={BAR_COLORS[2]} name="Farmgate Value" />
                                    <Bar dataKey="TRC" fill={BAR_COLORS[3]} name="Rehabilitation Cost" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">

                            <h5>Municipality Status</h5><br />

                            {municipalityDataFiltered.map((m) => {
                                let level = "Low Damage";
                                let bgClass = "bg-map-safe";
                                let imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_safe.png`;

                                if (m.TD === 0) {
                                    level = "No Damage";
                                } else if (m.TD > 0 && m.TD <= 50000) {
                                    level = "Low Damage";
                                } else if (m.TD > 50000 && m.TD <= 150000) {
                                    level = "Moderate Damage";
                                    bgClass = "bg-map-moderate";
                                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_warning.png`;
                                } else if (m.TD > 150000) {
                                    level = "High Damage";
                                    bgClass = "bg-map-high";
                                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_severe.png`;
                                }

                                return (
                                    <div key={m.name} className="dashboard-card-mao">
                                        <div className={`card-icon-mao ${bgClass}`}>
                                            <img className="map_img_item" src={imgSrc} alt={m.name} />
                                        </div>
                                        <div className="card-content">
                                            <h6>{m.name}</h6>
                                            <h3>{level}</h3>
                                            <small>Total Damage: {formatPeso(m.TD)}</small>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>



                    </div>

                    <div className="dashboard-charts-whole1">



                        <div className="chart-card">
                            <h5>Damage Percentage per Typhoon</h5>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieDataFiltered} // <-- use filtered data
                                        dataKey="value"
                                        innerRadius={60}
                                        outerRadius={100}
                                        label={({ name, value }) => `${name}: ${value}%`}
                                    >
                                        {pieDataFiltered.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => value.toFixed(2) + "%"} />
                                </PieChart>
                            </ResponsiveContainer>

                        </div>

                        <div className="chart-card">
                            <h5>Farmers with Highest Total Loss</h5>

                            {(() => {
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

                                const recordsWithLoss = computedReports
                                    .map(r => {
                                        const totalAreaLoss = Number(r.TotalAreaLoss) || 0;
                                        const account = accounts[r.UserID] || {};

                                        return {
                                            id: r.id,
                                            user: account.role === "Farmer"
                                                ? `${account.FirstName || ""} ${account.LastName || ""}`
                                                : r.UserID,
                                            municipality: account.Municipality || "",
                                            avatar:
                                                account.AvatarIndex != null
                                                    ? avatars[account.AvatarIndex]
                                                    : "/assets/img/default_avatar.png",
                                            totalAreaLoss,
                                            StageCultivation: r.StageCultivation,
                                            RehabilitationCost: r.RehabilitationCost,
                                            IrrigationStatus: r.IrrigationStatus,
                                            FarmerNumber: r.FarmerNumber,
                                        };
                                    })

                                    // only records with actual loss
                                    .filter(r => r.totalAreaLoss > 0)

                                    // MAO municipality filter
                                    .filter(r => {
                                        if (currentUserRole === "MAO") {
                                            return r.municipality === currentUserMunicipality;
                                        }
                                        return true;
                                    })

                                    // sort highest loss first
                                    .sort((a, b) => b.totalAreaLoss - a.totalAreaLoss)

                                    // TOP 5 only
                                    .slice(0, 5);

                                if (!recordsWithLoss.length) {
                                    return <p>No losses recorded this month.</p>;
                                }

                                return (
                                    <div style={{ overflowX: "auto" }}>
                                        <table className="farmer-loss-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Avatar</th>
                                                    <th>Farmer Number</th>
                                                    <th>Farmer Name</th>
                                                    <th>Municipality</th>
                                                    <th>Stage Cultivation</th>
                                                    <th>Irrigation Status</th>
                                                    <th>Total Rehabilitation Cost</th>
                                                    <th>Total Loss Area (%)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recordsWithLoss.map((r, idx) => (
                                                    <tr key={r.id || idx}>
                                                        <td>{idx + 1}</td>
                                                        <td>
                                                            <img
                                                                src={r.avatar}
                                                                alt={r.user}
                                                                style={{
                                                                    width: "40px",
                                                                    height: "40px",
                                                                    borderRadius: "50%",
                                                                }}
                                                            />
                                                        </td>  

                                                        <td>{r.FarmerNumber}</td>
                                                        <td>{r.user}</td>
                                                        <td>{r.municipality}</td>
                                                        <td>{r.StageCultivation}</td>
                                                        <td>{r.IrrigationStatus}</td>
                                                        <td>{r.RehabilitationCost}</td>
                                                        <td>{r.totalAreaLoss.toFixed(2)}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}


                        </div>


                    </div>


                </div>
            </div>
        </div>
    );
}
