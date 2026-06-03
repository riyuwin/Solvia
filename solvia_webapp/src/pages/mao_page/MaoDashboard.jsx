import RoleGuard from "../../components/auth/RoleGuard";
import MAODashboardPage from "../../components/mao_page/MaoDashboardPage";


function MaoDashboard() {

    return (
        <>
            <RoleGuard allowedRoles={["MAO"]}>
                <MAODashboardPage />
            </RoleGuard> 
        </>
    )

}

export default MaoDashboard;