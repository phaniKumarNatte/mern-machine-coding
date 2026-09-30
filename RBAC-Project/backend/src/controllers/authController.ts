import { Request, Response } from "express";
import mongoose from "mongoose";
import User, { IUser } from "../models/User"; // Path to your User model
import Session, { ISession } from "../models/Session";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { AuthRequest } from "../middleware/authMiddleware";

// Secret keys for the two token types (in production, always set these via env vars!)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "super-secret-access-key-for-rbac";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "super-secret-refresh-key-for-rbac";

const ACCESS_TOKEN_EXPIRY = "15m"; // short-lived: limits the damage window if it's ever stolen
const REFRESH_TOKEN_EXPIRY = "7d"; // long-lived: lets the user stay logged in without re-entering credentials

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const BASE_COOKIE_OPTIONS = {
    httpOnly: true, // inaccessible to JavaScript, mitigates XSS token theft
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax" as const, // sent on same-site navigation, blocks basic CSRF vectors
};

const ACCESS_COOKIE_OPTIONS = {
    ...BASE_COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: "/", // sent on every request, since any endpoint may need auth
};

const REFRESH_COOKIE_OPTIONS = {
    ...BASE_COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    // Scoped to the refresh endpoint's exact mounted path (server.ts mounts authRoutes
    // at "/api/auth", and the refresh route is "/refresh") — the browser only attaches
    // this cookie to requests whose path starts with this value, so normal API calls
    // (and even /api/auth/logout) never see it.
    path: "/api/auth/refresh",
};

// Every login creates one *session* document (one row per device/browser: mobile,
// laptop, tab, ...) in the separate Session collection. sessionId is embedded in both
// tokens so later requests can be tied back to that one device's row without touching
// any other device's session.
//
// jti (a random per-token id) is included so that two tokens signed with the same
// payload within the same wall-clock second are never byte-identical. jsonwebtoken's
// HMAC signing is deterministic — same header + payload + secret always produces the
// same signature — and `iat` only has 1-second resolution, so a login immediately
// followed by a refresh (or two rapid refreshes) could otherwise mint the exact same
// refresh token twice. That would silently defeat rotation: the "new" hash would equal
// the "old" hash, so a stale/reused token could never be told apart from the current one.
const generateAccessToken = (userId: mongoose.Types.ObjectId | string, role: string, sessionId: mongoose.Types.ObjectId): string =>
    jwt.sign({ userId, role, sessionId, jti: crypto.randomUUID() }, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });

const generateRefreshToken = (userId: mongoose.Types.ObjectId | string, sessionId: mongoose.Types.ObjectId): string =>
    jwt.sign({ userId, sessionId, jti: crypto.randomUUID() }, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });

// Refresh tokens are hashed before being stored, exactly like passwords — if the DB
// ever leaks, the stored value alone can't be replayed as a valid refresh token.
const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

// Best-effort device fingerprinting from the User-Agent header — good enough to show a
// human "Chrome on desktop" in a session list, not meant to be a robust UA parser.
const parseDeviceType = (userAgent: string): ISession["deviceType"] => {
    if (!userAgent) return "unknown";
    if (/ipad|tablet/i.test(userAgent)) return "tablet";
    if (/mobile|android|iphone/i.test(userAgent)) return "mobile";
    return "desktop";
};

const parseDeviceName = (userAgent: string): string | undefined => {
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edg|OPR)\/[\d.]+/);
    return match?.[1];
};

// LOGIN: creates a brand new session document for this device and issues its first
// token pair. Every device/browser that logs in gets its own session row, so logging in
// on a phone never disturbs an already-logged-in laptop or tab.
const createSession = async (req: Request, res: Response, user: IUser): Promise<void> => {
    const sessionId = new mongoose.Types.ObjectId();
    const accessToken = generateAccessToken(user._id, user.role, sessionId);
    const refreshToken = generateRefreshToken(user._id, sessionId);
    const userAgent = req.headers["user-agent"] || "";
    const deviceName = parseDeviceName(userAgent);

    const newSession = new Session({
        _id: sessionId,
        userId: user._id,
        refreshTokenHash: hashToken(refreshToken),
        deviceType: parseDeviceType(userAgent),
        // exactOptionalPropertyTypes forbids `deviceName: undefined` — omit the key
        // entirely when there's nothing to report instead of assigning undefined to it.
        ...(deviceName ? { deviceName } : {}),
        userAgent,
        ipAddress: req.ip,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
        revokedAt: null,
    });
    await newSession.save();

    res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
};

// REFRESH: atomically swaps one session's refresh token for a new pair, but only if
// `presentedHash` still matches what's currently on file for that exact session. This
// closes the read-check-then-write race: if two requests for the SAME device/tab present
// the same still-valid hash at nearly the same instant, MongoDB serializes the two update
// operations — only the first one's filter still matches, so the second's
// findOneAndUpdate returns null instead of overwriting the winner's brand-new hash.
// Filtering by the session's own _id means this can never touch any other device's session.
const rotateSession = async (
    res: Response,
    userId: mongoose.Types.ObjectId | string,
    role: string,
    sessionId: mongoose.Types.ObjectId,
    presentedHash: string
): Promise<boolean> => {
    const newAccessToken = generateAccessToken(userId, role, sessionId);
    const newRefreshToken = generateRefreshToken(userId, sessionId);
    const newHash = hashToken(newRefreshToken);

    const rotated = await Session.findOneAndUpdate(
        { _id: sessionId, refreshTokenHash: presentedHash, revokedAt: null },
        {
            $set: {
                refreshTokenHash: newHash,
                lastUsedAt: new Date(),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
            },
        }
    );

    if (!rotated) {
        return false; // lost the race — another request for this same session rotated first
    }

    res.cookie("accessToken", newAccessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);
    return true;
};

const clearTokenCookies = (res: Response): void => {
    res.clearCookie("accessToken", { ...BASE_COOKIE_OPTIONS, path: ACCESS_COOKIE_OPTIONS.path });
    res.clearCookie("refreshToken", { ...BASE_COOKIE_OPTIONS, path: REFRESH_COOKIE_OPTIONS.path });
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

        // Create a new session document for THIS device and issue its token pair as
        // httpOnly cookies. Any other device already logged in keeps its own session.
        await createSession(req, res, user);

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

// 3. REFRESH CONTROLLER: exchanges one device's refresh token for a new access token
export const refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        res.status(401).json({ message: "No refresh token provided." });
        return;
    }

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as {
            userId: string;
            sessionId: string;
        };

        const user = await User.findById(decoded.userId);
        if (!user) {
            res.status(403).json({ message: "Invalid refresh token." });
            return;
        }

        const session = await Session.findById(decoded.sessionId).select("+refreshTokenHash");

        // No row for this session — already logged out (on this device or via
        // logout-others), expired and TTL-cleaned, or never existed. Other devices are
        // unaffected either way.
        if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
            res.status(403).json({ message: "Session not found. Please log in again." });
            return;
        }

        const presentedHash = hashToken(refreshToken);

        // If the presented token doesn't match what we just read for THIS session, it's
        // stale relative to this read — either an already-superseded token (stolen/reused)
        // or a request that simply arrived after another rotation of the same session
        // completed. Revoke only this one session; every other device's session is untouched.
        if (session.refreshTokenHash !== presentedHash) {
            session.revokedAt = new Date();
            await session.save();
            clearTokenCookies(res);
            res.status(403).json({ message: "Refresh token reuse detected. Please log in again." });
            return;
        }

        // Rotate atomically: only succeeds if this session's refreshTokenHash still
        // equals what we just saw. A concurrent request for the SAME session that raced
        // us to the database will lose this compare-and-swap instead of corrupting our
        // rotation (see rotateSession's comment for the full mechanics).
        const rotated = await rotateSession(res, user._id, user.role, session._id, presentedHash);
        if (!rotated) {
            // Lost the race — another request for this same session (e.g. two requests
            // from the same tab) rotated first. Its response already updated the shared
            // cookie jar with a fresh pair, so this is a "retry" signal, not a failure.
            res.status(409).json({ message: "Refresh already handled by another request. Please retry." });
            return;
        }

        res.status(200).json({ message: "Token refreshed" });
    } catch (error) {
        clearTokenCookies(res);
        res.status(403).json({ message: "Invalid or expired refresh token." });
    }
};

// 4. LOGOUT CONTROLLER: logs out only THIS device — every other session stays active
export const logout = async (req: Request, res: Response): Promise<void> => {
    // The refreshToken cookie is scoped to /api/auth/refresh, so it never reaches this
    // route — identify the session from the accessToken cookie instead (scoped to "/").
    const accessToken = req.cookies?.accessToken;

    if (accessToken) {
        try {
            // ignoreExpiration: logout should still revoke the session even if the access
            // token has just expired — we only need the signature to trust its payload.
            const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET, { ignoreExpiration: true }) as {
                userId: string;
                sessionId: string;
            };
            await Session.updateOne(
                { _id: decoded.sessionId, userId: decoded.userId },
                { $set: { revokedAt: new Date() } }
            );
        } catch {
            // Token missing/forged — nothing we can safely revoke, just clear cookies below.
        }
    }

    clearTokenCookies(res);
    res.status(200).json({ message: "Logged out successfully" });
};

// 5. LIST SESSIONS: shows every active device currently logged in (mobile, laptop, tab, ...)
export const listSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    // req.user is always set here — this route is mounted behind verifyToken — but
    // narrowing it explicitly (instead of `req.user?.userId`) keeps the query filter's
    // type as a plain string rather than `string | undefined`, which is what was
    // breaking Mongoose's filter-overload resolution under exactOptionalPropertyTypes.
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
    }
    const { userId, sessionId: currentSessionId } = req.user;

    const sessions = await Session.find({ userId, revokedAt: null }).sort({ lastUsedAt: -1 });

    // refreshTokenHash is select:false and never sent to the client — only enough
    // metadata to recognize a device.
    res.status(200).json({
        sessions: sessions.map((session) => ({
            id: session._id,
            deviceType: session.deviceType,
            deviceName: session.deviceName,
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
            createdAt: session.createdAt,
            lastUsedAt: session.lastUsedAt,
            expiresAt: session.expiresAt,
            current: session._id.toString() === currentSessionId,
        })),
    });
};

// 6. LOGOUT OTHER SESSIONS: revokes every device except the one making this request
export const logoutOtherSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized." });
        return;
    }
    const { userId, sessionId: currentSessionId } = req.user;

    await Session.updateMany(
        { userId, _id: { $ne: currentSessionId }, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );

    res.status(200).json({ message: "Logged out of all other devices." });
};
