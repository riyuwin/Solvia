import ManageTyphoonPage from "../../components/admin_page/ManageTyphoonPage";
import RoleGuard from "../../components/auth/RoleGuard";

function ManageTyphoon() {

    return (
        <>
            <RoleGuard allowedRoles={["PAO"]}>
                <ManageTyphoonPage />
            </RoleGuard>
        </>
    )

}

export default ManageTyphoon;