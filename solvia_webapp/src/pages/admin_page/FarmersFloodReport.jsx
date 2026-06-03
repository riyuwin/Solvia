import FarmerFloodReportPage from "../../components/admin_page/FarmersFloodReportPage";
import RoleGuard from "../../components/auth/RoleGuard";

function FarmersFloodReport() {

    return (
        <>
            <RoleGuard allowedRoles={["PAO"]}>
                <FarmerFloodReportPage />
            </RoleGuard>
        </>
    )

}

export default FarmersFloodReport;