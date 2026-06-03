import ReportsPage from "../../components/admin_page/ReportsPage";
import RoleGuard from "../../components/auth/RoleGuard";


function Reports() {

    return (
        <>
            <RoleGuard allowedRoles={["PAO"]}>
                <ReportsPage />
            </RoleGuard>
        </>
    )

}

export default Reports;