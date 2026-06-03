import MaoReportsPage from "../../components/mao_page/MaoReportsPage";
import RoleGuard from "../../components/auth/RoleGuard";

function MaoReports() {

    return (
        <>
            <RoleGuard allowedRoles={["MAO"]}>
                <MaoReportsPage />
            </RoleGuard>
        </>
    )

}

export default MaoReports;