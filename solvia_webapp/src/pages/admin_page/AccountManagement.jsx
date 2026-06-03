import DashboardPage from "../../components/admin_page/DashboardPage";
import RoleGuard from "../../components/auth/RoleGuard";

function AccountManagement() {

    return (
        <>
            <RoleGuard allowedRoles={["PAO"]}>
                <DashboardPage />
            </RoleGuard>
        </>
    )

}

export default AccountManagement;