import { Request, Response } from "express";
import User from "../models/User"; // Path to your User model
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodeBuffer = require("node:buffer");

// Secret key for JWT (in production, use process.env.JWT_SECRET!)
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-rbac";
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day, keep in sync with the JWT's expiresIn

const COOKIE_OPTIONS = {
    httpOnly: true, // inaccessible to JavaScript, mitigates XSS token theft
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax" as const, // sent on same-site navigation, blocks basic CSRF vectors
    maxAge: COOKIE_MAX_AGE_MS,
};

// 1. REGISTER CONTROLLER
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('came here---');
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User already exists with this email." });
            return;
        }

        // Hash the password securely
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('name---',name);
        // Create new user (defaults to "user" role if not provided)
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || "user", 
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully!",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            },
        });
    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ message: "Server error during registration", error });
    }
};

// 2. LOGIN CONTROLLER
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({ message: "Invalid email or password." });
            return;
        }

        // Compare submitted password with the hashed password in DB
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ message: "Invalid email or password." });
            return;
        }

        // Generate a JWT token containing user ID and their RBAC role
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: "1d" } // Token expires in 1 day
        );

        // Store the JWT in an httpOnly cookie instead of the response body,
        // so client-side JS (and any XSS payload) can never read it.
        res.cookie("token", token, COOKIE_OPTIONS);

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Server error during login", error });
    }
};

// 3. LOGOUT CONTROLLER
export const logout = (_req: Request, res: Response): void => {
    res.clearCookie("token", {
        httpOnly: COOKIE_OPTIONS.httpOnly,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
    });
    res.status(200).json({ message: "Logged out successfully" });
};

