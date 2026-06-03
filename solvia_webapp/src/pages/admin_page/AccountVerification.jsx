import AccountVerificationPage from "../../components/admin_page/AccountVerificationPage";
import RoleGuard from "../../components/auth/RoleGuard";

function AccountVerification() {

    return (
        <>
            <RoleGuard allowedRoles={["PAO"]}>
                <AccountVerificationPage /> 
            </RoleGuard>
        </>
    )

}

export default AccountVerification;