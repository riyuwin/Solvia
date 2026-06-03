import FarmerRegistryPage from "../../components/admin_page/FarmerRegistry";
import RoleGuard from "../../components/auth/RoleGuard";


function FarmerRegistry() {

    return (
        <>
            <RoleGuard allowedRoles={["PAO"]}>
                <FarmerRegistryPage />
            </RoleGuard>
        </>
    )

}

export default FarmerRegistry;