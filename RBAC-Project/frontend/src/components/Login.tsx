import React, { useState } from "react";
import API from "../api/axios";

const Login = ({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await API.post("/auth/login", { email, password });

            // The JWT is set as an httpOnly cookie by the server — only cache
            // the (non-sensitive) user info for the UI.
            localStorage.setItem("user", JSON.stringify(response.data.user));

            alert("Login Successful!");
            onLoginSuccess(response.data.user);
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed");
        }
    };

    return (
        <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc" }}>
            <h2>Login</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <form onSubmit={handleLogin}>
                <div>
                    <label>Email:</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                </div>
                <div style={{ marginTop: "10px" }}>
                    <label>Password:</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                </div>
                <button type="submit" style={{ marginTop: "15px" }}>Login</button>
            </form>
        </div>
    );
};

export default Login;