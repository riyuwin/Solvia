import DashboardPage from "../../components/admin_page/DashboardPage";
import RoleGuard from "../../components/auth/RoleGuard";


function Dashboard() {

    return (
        <>
            <RoleGuard allowedRoles={["PAO"]}>
                <DashboardPage />
            </RoleGuard>
        </>
    )

}

export default Dashboard;