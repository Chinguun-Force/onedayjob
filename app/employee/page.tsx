import { LogoutButton } from "@/components/LogoutButton";

export default function EmployeeHome() {
    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h1>Employee Home</h1>
                {/* <LogoutButton /> */}
            </div>

            <p>Your notifications and profile</p>
        </div>
    );
}
