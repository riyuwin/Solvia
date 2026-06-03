import MaoFarmerFloodReportPage from "../../components/mao_page/MaoFarmerFloodReportPage";
import RoleGuard from "../../components/auth/RoleGuard";

function MaoFarmerFloodReport() {

    return (
        <>
            <RoleGuard allowedRoles={["MAO"]}>
                <MaoFarmerFloodReportPage />
            </RoleGuard>
        </>
    )

}

export default MaoFarmerFloodReport;