import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login"; 
import Dashboard from "./pages/admin_page/Dashboard";
import Signup from "./components/auth/Signup"; 
import FarmerRegistry from "./pages/admin_page/FarmerRegistry"; 
import Reports from "./pages/admin_page/Reports";
import AccountVerification from "./pages/admin_page/AccountVerification";
import ManageTyphoon from "./pages/admin_page/ManageTyphoon";
import FarmerFloodReportPage from "./components/admin_page/FarmersFloodReportPage";
import MaoDashboard from "./pages/mao_page/MaoDashboard";
import MaoFarmerFloodReport from "./pages/mao_page/MaoFarmerFloodReport";
import MaoFarmerRegistry from "./pages/mao_page/MaoFarmerRegistry";
import MaoReports from "./pages/mao_page/MaoReports";
import Unauthorized from "./components/auth/Unauthorized";

function App() {
  return (
    <>

      <BrowserRouter>
        <Routes>
          {/* Auth Pages */}
          <Route path="/" element={<Login />} /> 
          <Route path="/signup" element={<Signup />} /> 
          <Route path="/unauthorized" element={<Unauthorized />} /> 

          {/* Admin Pages */}
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/manage_typhoon" element={<ManageTyphoon />} />
          <Route path="/admin/farmer_registry" element={<FarmerRegistry />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/account_management" element={<AccountVerification />} /> 
          <Route path="/admin/farmer_flood_report" element={<FarmerFloodReportPage />} /> 
          {/* <Route path="/admin/account_verification" element={<AccountVerification />} />
          <Route path="/admin/menu" element={<AdminMenu />} /> */}
          
          {/* MAO Pages */}
          <Route path="/mao/dashboard" element={<MaoDashboard />} />
          <Route path="/mao/farmer_flood_report" element={<MaoFarmerFloodReport />} /> 
          <Route path="/mao/farmer_registry" element={<MaoFarmerRegistry />} />
          <Route path="/mao/reports" element={<MaoReports />} />

        </Routes>
      </ BrowserRouter>

    </>
  )
}

export default App
