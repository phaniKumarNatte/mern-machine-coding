import { Router, Response } from "express";
import { register, login, logout } from "../controllers/authController";
import { verifyToken, authorizeRoles, AuthRequest } from "../middleware/authMiddleware";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Example 1: Protected route for any logged-in user
router.get("/profile", verifyToken, (req: AuthRequest, res: Response) => {
    res.status(200).json({ 
        message: "Welcome to your profile!", 
        user: req.user 
    });
});

// Example 2: Protected route ONLY for admins
router.get("/admin-dashboard", verifyToken, authorizeRoles("admin"), (req: AuthRequest, res: Response) => {
    res.status(200).json({ 
        message: "Welcome to the Admin Dashboard!" 
    });
});

// Example 3: Protected route for managers and admins
router.get("/manager-panel", verifyToken, authorizeRoles("admin", "manager"), (req: AuthRequest, res: Response) => {
    res.status(200).json({ 
        message: "Welcome to the Manager Panel!" 
    });
});

export default router;