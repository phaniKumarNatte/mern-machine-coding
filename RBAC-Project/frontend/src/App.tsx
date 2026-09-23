import { useState, useEffect } from "react";
import Login from "./components/Login";
import API from "./api/axios";

function App() {
    const [user, setUser] = useState<any>(null);
    const [dashboardData, setDashboardData] = useState("");

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    // Example of hitting a protected Admin route
    const fetchAdminDashboard = async () => {
        try {
            const res = await API.get("/auth/admin-dashboard");
            setDashboardData(res.data.message);
        } catch (err: any) {
            alert(err.response?.data?.message || "Unauthorized access");
        }
    };

    const handleLogout = async () => {
        try {
            // The token cookie is httpOnly, so only the server can clear it.
            await API.post("/auth/logout");
        } catch (err) {
            console.error("Logout request failed:", err);
        }
        localStorage.removeItem("user");
        setUser(null);
        setDashboardData("");
    };

    if (!user) {
        return <Login onLoginSuccess={(userData) => setUser(userData)} />;
    }

    return (
        <div style={{ padding: "30px", fontFamily: "sans-serif" }}>
            <h1>Welcome, {user.name}</h1>
            <p>Role: <strong>{user.role}</strong></p>
            <button onClick={handleLogout}>Logout</button>

            <hr style={{ margin: "20px 0" }} />

            {/* RBAC conditional rendering on the frontend */}
            {user.role === "admin" && (
                <div>
                    <h3>Admin Controls</h3>
                    <button onClick={fetchAdminDashboard}>Load Admin Dashboard Data</button>
                    {dashboardData && <p style={{ color: "green" }}>{dashboardData}</p>}
                </div>
            )}
        </div>
    );
}

export default App;