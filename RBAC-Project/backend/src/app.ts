import express from "express";
import authRoutes from "./routes/authRoutes";
import cors from "cors";
import cookieParser from "cookie-parser";

// Express app construction lives here (separate from server.ts's DB-connect + listen)
// so tests can import and exercise it directly with supertest, against whatever Mongo
// connection the test setup has already established, without binding a real port.
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true, // allow the browser to send/receive the httpOnly cookie
    })
);
app.use("/api/auth", authRoutes);

export default app;
