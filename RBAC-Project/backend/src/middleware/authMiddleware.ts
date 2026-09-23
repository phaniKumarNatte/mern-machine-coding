import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-rbac";

// Extend Express Request interface so TypeScript knows about req.user
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

// 1. AUTHENTICATION MIDDLEWARE: Verifies the JWT token
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const token = req.cookies?.token;

    if (!token) {
        res.status(401).json({ message: "Access denied. No token provided." });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
        req.user = decoded; // Attach user payload to the request object
        next(); // Move to the next middleware or controller
    } catch (error) {
        res.status(403).json({ message: "Invalid or expired token." });
    }
};

// 2. AUTHORIZATION MIDDLEWARE: Checks if user has the required role
export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized. User data missing." });
            return;
        }

        // Check if the user's role is included in the allowed roles array
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ 
                message: `Access forbidden. Requires one of the following roles: ${allowedRoles.join(", ")}` 
            });
            return;
        }

        next(); // User has the right role, proceed!
    };
};