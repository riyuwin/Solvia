import React, { useRef, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import "../../css/dashboard.css";

import {
  FaUsers,
  FaLeaf,
  FaChartLine,
  FaFilter,
  FaDownload,
  FaMoneyBillWave,
  FaCoins,
  FaExclamationTriangle,
  FaTools,
} from "react-icons/fa";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  CartesianGrid,
  Line,
} from "recharts";

import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import TopHeaderUser from "./TopHeaderUser";

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

export default function ReportsPage() {
  const mapRef = useRef(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedYear, setSelectedYear] = useState("All");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 27 }, (_, i) => currentYear - i);

  const [reports, setReports] = useState([]);
  const [typhoons, setTyphoons] = useState({});
  const [accounts, setAccounts] = useState({}); // AccountInformation mapping

  /* ================= FIRESTORE ================= */
  useEffect(() => {
    return onSnapshot(collection(db, "DamageRecordInformation"), (snap) =>
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "TyphoonRecords"), (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        map[d.id] = d.data().name || d.id;
      });
      setTyphoons(map);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "AccountInformation"), (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        map[d.id] = {
          firstName: data.FirstName || "-",
          lastName: data.LastName || "-",
          Municipality: data.Municipality || "-",
        };
      });
      setAccounts(map);
    });
  }, []);

  /* ================= FILTER ================= */
  const filteredReports = reports.filter(r => {
    if (selectedYear === "All") return true;
    if (!r.AddedAt) return false;
    return r.AddedAt.toDate().getFullYear().toString() === selectedYear;
  });

  /* ===== MERGE REPORTS WITH ACCOUNT INFO ===== */
  const reportWithAccounts = filteredReports.map(r => {
    const account = accounts[r.UserID] || {};
    return { ...r, Municipality: account.Municipality || "-", account };
  });

  /* ================= COMPUTATIONS ================= */
  /* const computed = reportWithAccounts.map(r => {
    const DG = r.AreaPlacement?.length || 0;
    const BF = Number(r.BeforeCalamity) || 0;
    const AF = Number(r.AfterCalamity) || 0;

    const D = (DG / TOTAL_GRIDS) * 100;
    const Y = BF === 0 ? 0 : ((BF - AF) / BF) * 100;
    const V = (D / 100) * BF * (Y / 100);
    const TD = (D / 100) * (Y / 100) * BASE_COST;
    const VF = V * FARMGATE_PRICE * 1000;
    const TDL = TD + VF;
    const TRC =
      FARM_AREA *
      (D / 100) *
      BASE_COST *
      stageFactor(r.StageCultivation) *
      irrigationFactor(r.IrrigationStatus);

    return { ...r, D, V, TD, VF, TDL, TRC };
  }); */

  /* const totalReports = computed.length;
  const uniqueFarmers = new Set(computed.map(r => r.UserID)).size;

  const sum = (key) => computed.reduce((a, b) => a + (b[key] || 0), 0); */

  const totalReports = reportWithAccounts.length;

  const uniqueFarmers = new Set(
    reportWithAccounts.map(r => r.UserID)
  ).size;

  const sum = (key) =>
    reportWithAccounts.reduce(
      (acc, r) => acc + (Number(r[key]) || 0),
      0
    );


  /* ================= BAR CHART ================= */
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const barData = months.map((m, idx) => ({
    name: m,
    value: filteredReports.filter(r => {
      if (!r.DateOfLosses) return false;
      const d = r.DateOfLosses.toDate ? r.DateOfLosses.toDate() : new Date(r.DateOfLosses);
      return d.getMonth() === idx;
    }).length,
  }));

  /* ================= PIE ================= */
  const typhoonMap = {};
  reportWithAccounts.forEach(r => {
    if (!r.TyphoonID) return;

    typhoonMap[r.TyphoonID] =
      (typhoonMap[r.TyphoonID] || 0) +
      (Number(r.DamagePercent) || 0);
  });


  const pieData = Object.keys(typhoonMap).map(id => ({
    name: typhoons[id] || id,
    value: Number(typhoonMap[id].toFixed(2)),
  }));

  const COLORS = ["#2a5298", "#f0ad4e", "#5cb85c", "#d9534f", "#6f42c1"];

  /* ================= MUNICIPALITY DATA ================= */
  const municipalities = [
    "Basud", "Capalonga", "Daet", "J. Pang", "Labo",
    "Mercedes", "Paracale", "San Lorenzo Ruiz", "San Vicente",
    "Sta. Elena", "Talisay", "Vinzons"
  ];

  const municipalityReportCount = municipalities.map(name => ({
    name,
    value: reportWithAccounts.filter(r => r.Municipality === name).length,
  }));

  const municipalityHectares = municipalities.map(name => {
    const reportsInMunicipality = reportWithAccounts.filter(r => r.Municipality === name);

    if (reportsInMunicipality.length === 0) return { name, value: 0 };

    const totalPercentage = reportsInMunicipality.reduce(
      (acc, r) => acc + (Number(r.TotalAreaLoss) || 0),
      0
    );


    // Average percentage per municipality, rounded to 2 decimals
    const avgPercentage = Math.round((totalPercentage / reportsInMunicipality.length) * 100) / 100;

    return { name, value: avgPercentage };
  });



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
      "No.", "Report Number", "Farmer Name", "Typhoon Name", "Stage", "Irrigation",
      "Before Calamity", "After Calamity", "Total Area Loss (%)",
      "Volume Loss", "TD", "VF", "TDL", "TRC", "Date of Losses",
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

      const D = (DG / TOTAL_GRIDS) * 100;
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
        irrigationFactor(r.IrrigationStatus);

      let dateString = "-";
      if (r.DateOfLosses) {
        const dateObj = r.DateOfLosses.toDate ? r.DateOfLosses.toDate() : new Date(r.DateOfLosses);
        dateString = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
      }

      /* const row = worksheet.addRow([
        idx + 1,
        `${account.firstName} ${account.lastName}`,
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
      ]); */

      const row = worksheet.addRow([
        idx + 1,
        r.FarmerNumber,
        `${account.firstName} ${account.lastName}`,
        typhoons[r.TyphoonID] || r.TyphoonID || "-",
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
      { width: 5 }, { width: 10 }, { width: 25 }, { width: 18 }, { width: 18 },
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
      <Sidebar
        collapsed={sidebarCollapsed}
        toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`right-panel ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <TopHeaderUser />
        <h2>Reports</h2>
        <p>Overview of farmer flood damage reports</p>

        <div ref={mapRef} style={{ minHeight: "800px", background: "#ffffff3f", borderRadius: "10px", padding: "20px" }}>
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

          {/* DASHBOARD CARDS */}
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <div className="card-icon bg-success"><FaLeaf /></div>
              <div className="card-content">
                <h6>Affected Farmers</h6>
                <h3>{uniqueFarmers.toLocaleString()}</h3>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-icon bg-warning"><FaChartLine /></div>
              <div className="card-content">
                <h6>Total Volume Loss</h6>
                <h3>{sum("Volume").toFixed(2)}</h3>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-icon bg-success"><FaTools /></div>
              <div className="card-content">
                <h6>Total Rehabilitation Cost</h6>
                <h3>₱{sum("RehabilitationCost").toLocaleString()}</h3>
              </div>
            </div>
          </div>

          <div className="dashboard-cards">
            <div className="dashboard-card">
              <div className="card-icon bg-info"><FaCoins /></div>
              <div className="card-content">
                <h6>Farmgate Value</h6>
                <h3>₱{sum("ValueFarmgatePrice").toLocaleString()}</h3>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-icon bg-danger"><FaMoneyBillWave /></div>
              <div className="card-content">
                <h6>Total Damage (TD)</h6>
                <h3>₱{sum("TotalDamageCost").toLocaleString()}</h3>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-icon bg-warning"><FaExclamationTriangle /></div>
              <div className="card-content">
                <h6>Total Damage Loss</h6>
                <h3>₱{sum("TotalDamageLoss").toLocaleString()}</h3>
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

          <div className="dashboard-charts-whole1">

            <div className="chart-card">
              <h5>Total Area Loss per Municipality (%)</h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={municipalityHectares}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                  >
                    {municipalityHectares.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h5>Total Reports per Municipality</h5>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={municipalityReportCount}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2a5298"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>


          </div>

        </div>
      </div>
    </div>
  );
}
