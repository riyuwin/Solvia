import MaoFarmerRegistryPage from "../../components/mao_page/MaoFarmerRegistryPage";
import RoleGuard from "../../components/auth/RoleGuard";

function MaoFarmerRegistry() {

    return (
        <>
            <RoleGuard allowedRoles={["MAO"]}>
                <MaoFarmerRegistryPage />
            </RoleGuard>
        </>
    )

}

export default MaoFarmerRegistry;