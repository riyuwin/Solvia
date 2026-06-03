import AdminMenuPage from "../../components/admin_page/AdminMenuPage";
import RoleGuard from "../../components/auth/RoleGuard";


function AdminMenu() {

    return (
        <>
            <RoleGuard allowedRoles={["PAO"]}>
                <AdminMenuPage />
            </RoleGuard>
        </>
    )

}

export default AdminMenu;