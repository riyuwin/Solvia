import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import "../../css/dashboard.css";
import { FaChartArea, FaChartLine, FaCheckCircle, FaClock, FaCoins, FaLeaf, FaMoneyBillWave, FaTools } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import TopHeaderUser from "./TopHeaderUser";
import { getAuth, onAuthStateChanged } from "firebase/auth";

/* ================= CONSTANTS ================= */
/* const TOTAL_GRIDS = 25;
const BASE_COST = 45000;
const FARM_AREA = 1;
const FARMGATE_PRICE = 14; */
const stageFactor = () => 1;
const irrigationFactor = () => 1;

/* const stageFactor = (stage) => {
  if (stage === "Reproductive Stage") return 1.2;
  if (stage === "Ripening Stage") return 1.4;
  return 1.0;
};

const irrigationFactor = (status) =>
  status === "Non-Irrigated" ? 0.9 : 1.0; */

/* ================= HELPER ================= */
const formatPeso = (value) => "₱" + Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const mapRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [accounts, setAccounts] = useState({});
  const [typhoons, setTyphoons] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

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
    const d = r.DateOfLosses.toDate
      ? r.DateOfLosses.toDate()
      : new Date(r.DateOfLosses);

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

  const sum = (key) =>
    currentMonthReports.reduce(
      (acc, r) => acc + (Number(r[key]) || 0),
      0
    );

  /* ================= BAR DATA PER MUNICIPALITY ================= */
  const municipalities = [
    "Basud", "Capalonga", "Daet", "Jose Panganiban", "Labo",
    "Mercedes", "Paracale", "San Lorenzo", "San Vicente",
    "Santa Elena", "Talisay", "Vinzons"
  ];

  const municipalityData = municipalities.map(name => {
    const reportsInMunicipality = currentMonthReports.filter(r => {
      const account = accounts[r.UserID] || {};
      return account.Municipality === name;
    });

    return {
      name,
      Volume: reportsInMunicipality.reduce((a, r) => a + (Number(r.Volume) || 0), 0),
      TD: reportsInMunicipality.reduce((a, r) => a + (Number(r.TotalDamageCost) || 0), 0),
      VF: reportsInMunicipality.reduce((a, r) => a + (Number(r.ValueFarmgatePrice) || 0), 0),
      TRC: reportsInMunicipality.reduce((a, r) => a + (Number(r.RehabilitationCost) || 0), 0),
    };
  });


  /* ================= PIE DATA PER TYPHOON ================= */
  const typhoonMap = {};

  currentMonthReports.forEach(r => {
    if (!r.TyphoonID) return;
    typhoonMap[r.TyphoonID] =
      (typhoonMap[r.TyphoonID] || 0) +
      (Number(r.DamagePercent) || 0);
  });

  const pieData = Object.keys(typhoonMap).map(id => ({
    name: typhoons[id] || id,
    value: Number(typhoonMap[id].toFixed(2)),
  }));


  return (
    <div className="dashboard-wrapper">
      <Sidebar collapsed={sidebarCollapsed} toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className={`right-panel ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <TopHeaderUser />

        <h2>Dashboard</h2>
        <p>Overview of system activity (Current Month)</p>

        <div ref={mapRef} style={{ minHeight: "800px", background: "#ffffff3f", borderRadius: "10px", padding: "20px" }}>
          {/* TOP CARDS */}
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <div className="card-icon bg-primary"><FaChartArea /></div>
              <div className="card-content">
                <h6>Total Verified Hectares</h6>
                <h3>{totalHectares.toFixed(2)}</h3>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-icon bg-success"><FaCheckCircle /></div>
              <div className="card-content">
                <h6>Total Verified Farmers</h6>
                <h3>{totalVerified}</h3>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-icon bg-warning"><FaTools /></div>
              <div className="card-content">
                <h6>Total Rehabilitation Cost</h6>
                <h3>{formatPeso(sum("RehabilitationCost"))}</h3>
              </div>
            </div>
          </div>

          {/* MONTHLY METRICS */}
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <div className="card-icon bg-success"><FaLeaf /></div>
              <div className="card-content">
                <h6>Total Volume Loss</h6>
                <h3>{sum("Volume").toFixed(2)}</h3>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-icon bg-danger"><FaMoneyBillWave /></div>
              <div className="card-content">
                <h6>Total Damage (TD)</h6>
                <h3>{formatPeso(sum("TotalDamageCost"))}</h3>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-icon bg-info"><FaCoins /></div>
              <div className="card-content">
                <h6>Total Farmgate Value</h6>
                <h3>{formatPeso(sum("ValueFarmgatePrice"))}</h3>
              </div>
            </div>
          </div>

          {/* CHARTS */}
          <div className="dashboard-charts">
            <div className="chart-card">
              <h5>Monthly Reports per Municipality</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={municipalityData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatPeso(value)} />
                  <Legend />
                  <Bar dataKey="Volume" fill={BAR_COLORS[0]} name="Volume Loss" />
                  <Bar dataKey="TD" fill={BAR_COLORS[1]} name="Total Damage" />
                  <Bar dataKey="VF" fill={BAR_COLORS[2]} name="Farmgate Value" />
                  <Bar dataKey="TRC" fill={BAR_COLORS[3]} name="Rehabilitation Cost" />
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
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => value.toFixed(2) + "%"} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dashboard-charts-whole2">



            <div className="chart-card">
              <h5>Monthly Reports per Municipality</h5>

              {/* ==================== FIRST ROW (0-2) ==================== */}
              <div className="dashboard-cards">
                {[0, 1, 2].map((idx) => {
                  const m = municipalityData[idx];
                  let level = "Low Damage";
                  let bgClass = "bg-map-safe";
                  let imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_safe.png`;

                  if (m.TD === 0) {
                    level = "No Damage";
                    bgClass = "bg-map-safe";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_safe.png`;
                  } else if (m.TD >= 1 && m.TD <= 50000) {
                    level = "Low Damage";
                    bgClass = "bg-map-safe";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_safe.png`;
                  } else if (m.TD >= 1 && m.TD <= 50000) {
                    level = "Moderate Damage";
                    bgClass = "bg-map-moderate";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_warning.png`;
                  } else if (m.TD > 1) {
                    level = "High Damage";
                    bgClass = "bg-map-high";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_severe.png`;
                  }

                  return (
                    <div key={m.name} className="dashboard-card">
                      <div className={`card-icon ${bgClass}`}>
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

              {/* ==================== SECOND ROW (3-5) ==================== */}
              <div className="dashboard-cards">
                {[3, 4, 5].map((idx) => {
                  const m = municipalityData[idx];
                  let level = "Low Damage";
                  let bgClass = "bg-map-safe";
                  let imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_safe.png`;

                  if (m.TD === 0) {
                    level = "No Damage";
                  } else if (m.TD >= 1 && m.TD <= 50000) {
                    level = "Low Damage";
                  } else if (m.TD >= 50001 && m.TD <= 150000) {
                    level = "Moderate Damage";
                    bgClass = "bg-map-moderate";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_warning.png`;
                  } else if (m.TD > 150000) {
                    level = "High Damage";
                    bgClass = "bg-map-high";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_severe.png`;
                  }

                  return (
                    <div key={m.name} className="dashboard-card">
                      <div className={`card-icon ${bgClass}`}>
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

              {/* ==================== THIRD ROW (6-8) ==================== */}
              <div className="dashboard-cards">
                {[6, 7, 8].map((idx) => {
                  const m = municipalityData[idx];
                  let level = "Low Damage";
                  let bgClass = "bg-map-safe";
                  let imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_safe.png`;

                  if (m.TD === 0) {
                    level = "No Damage";
                  } else if (m.TD >= 1 && m.TD <= 50000) {
                    level = "Low Damage";
                  } else if (m.TD >= 50001 && m.TD <= 150000) {
                    level = "Moderate Damage";
                    bgClass = "bg-map-moderate";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_warning.png`;
                  } else if (m.TD > 150000) {
                    level = "High Damage";
                    bgClass = "bg-map-high";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_severe.png`;
                  }

                  return (
                    <div key={m.name} className="dashboard-card">
                      <div className={`card-icon ${bgClass}`}>
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

              {/* ==================== FOURTH ROW (9-11) ==================== */}
              <div className="dashboard-cards">
                {[9, 10, 11].map((idx) => {
                  const m = municipalityData[idx];
                  let level = "Low Damage";
                  let bgClass = "bg-map-safe";
                  let imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_safe.png`;

                  if (m.TD === 0) {
                    level = "No Damage";
                  } else if (m.TD >= 1 && m.TD <= 50000) {
                    level = "Low Damage";
                  } else if (m.TD >= 50001 && m.TD <= 150000) {
                    level = "Moderate Damage";
                    bgClass = "bg-map-moderate";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_warning.png`;
                  } else if (m.TD > 150000) {
                    level = "High Damage";
                    bgClass = "bg-map-high";
                    imgSrc = `/assets/img/${m.name.toLowerCase().replace(/ /g, "_")}_severe.png`;
                  }

                  return (
                    <div key={m.name} className="dashboard-card">
                      <div className={`card-icon ${bgClass}`}>
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

                // Map UserID -> total lost area
                const farmerLossMap = {};

                currentMonthReports.forEach(r => {
                  const loss = Number(r.TotalAreaLoss) || 0;
                  if (!farmerLossMap[r.UserID]) farmerLossMap[r.UserID] = 0;
                  farmerLossMap[r.UserID] += loss;

                  console.log(loss)

                });


                // Convert to array and sort descending
                const sortedFarmers = currentMonthReports
                  .map((r) => {
                    const account = accounts[r.UserID] || {};

                    return {
                      recordId: r.id,
                      userId: r.UserID,
                      StageCultivation: r.StageCultivation,
                      RehabilitationCost: r.RehabilitationCost,
                      IrrigationStatus: r.IrrigationStatus,
                      FarmerNumber: r.FarmerNumber,
                      municipality: account.Municipality ?? "",
                      user: account.role === "Farmer"
                        ? `${account.FirstName} ${account.LastName}`
                        : r.UserID,
                      avatar: account.AvatarIndex != null
                        ? avatars[account.AvatarIndex]
                        : "/assets/img/default_avatar.png",
                      totalLoss: Number(r.TotalAreaLoss) || 0,
                      dateLoss: r.DateOfLosses?.toDate
                        ? r.DateOfLosses.toDate()
                        : new Date(r.DateOfLosses),
                    };
                  })
                  .filter(r => r.totalLoss > 0)
                  .sort((a, b) => b.totalLoss - a.totalLoss)
                  .slice(0, 5);  

                if (!sortedFarmers.length) return <p>No losses recorded this month.</p>;

                return (
                  <div style={{ overflowX: "auto" }}>
                    <table className="farmer-loss-table">
                      {!sortedFarmers.length ? (
                        <p>No losses recorded this month.</p>
                      ) : (
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
                              {sortedFarmers.map((f, idx) => (
                                <tr key={f.recordId}>
                                  <td>{idx + 1}</td>
                                  <td>
                                    <img
                                      src={f.avatar}
                                      alt={f.user}
                                      style={{ width: "40px", height: "40px", borderRadius: "50%" }}
                                    />
                                  </td>
                                  <td>{f.FarmerNumber}</td>
                                  <td>{f.user}</td>
                                  <td>{f.municipality}</td>
                                  <td>{f.StageCultivation}</td>
                                  <td>{f.IrrigationStatus}</td>
                                  <td>{f.RehabilitationCost}</td>
                                  <td>{f.totalLoss.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

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
