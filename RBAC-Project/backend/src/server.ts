import express from "express";
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes"; // Import routes
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true, // allow the browser to send/receive the httpOnly cookie
    })
);
// Mount the auth routes
app.use("/api/auth", authRoutes);

const startServer = async () => {
    try {
        await connectDB();
        app.listen(5000, () => {
            console.log("Server listening on port 5000");
        });
    } catch (error) {
        console.log("Server failed to start", error);
    }   
};

startServer();