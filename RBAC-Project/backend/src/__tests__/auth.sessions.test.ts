import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app";
import User from "../models/User";
import Session from "../models/Session";

let mongod: MongoMemoryServer;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

afterEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
});

const CREDENTIALS = { name: "Test User", email: "test@example.com", password: "password123" };

// Registers CREDENTIALS once. Individual tests then log in (possibly multiple times,
// to simulate multiple devices) against this one account.
const registerUser = async () => {
    await request(app).post("/api/auth/register").send(CREDENTIALS);
};

const getCookie = (res: request.Response, name: string): string => {
    const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
    const line = raw?.find((c) => c.startsWith(`${name}=`));
    if (!line) throw new Error(`Cookie ${name} not found in response`);
    return line.split(";")[0]!.split("=")[1]!;
};

const decodeSessionId = (accessTokenCookieValue: string): string => {
    const payload = jwt.decode(accessTokenCookieValue) as { sessionId: string };
    return payload.sessionId;
};

describe("multi-device sessions", () => {
    beforeEach(registerUser);

    it("creates an independent session for simultaneous logins from different devices", async () => {
        const laptop = request.agent(app);
        const mobile = request.agent(app);

        const laptopRes = await laptop
            .post("/api/auth/login")
            .set("User-Agent", "LaptopBrowser")
            .send({ email: CREDENTIALS.email, password: CREDENTIALS.password });
        const mobileRes = await mobile
            .post("/api/auth/login")
            .set("User-Agent", "MobileBrowser")
            .send({ email: CREDENTIALS.email, password: CREDENTIALS.password });

        expect(laptopRes.status).toBe(200);
        expect(mobileRes.status).toBe(200);

        const laptopSessionId = decodeSessionId(getCookie(laptopRes, "accessToken"));
        const mobileSessionId = decodeSessionId(getCookie(mobileRes, "accessToken"));
        expect(laptopSessionId).not.toBe(mobileSessionId);

        const sessionCount = await Session.countDocuments({ revokedAt: null });
        expect(sessionCount).toBe(2);
    });

    it("refreshes each device's session independently", async () => {
        const laptop = request.agent(app);
        const mobile = request.agent(app);
        await laptop.post("/api/auth/login").set("User-Agent", "LaptopBrowser").send({
            email: CREDENTIALS.email,
            password: CREDENTIALS.password,
        });
        await mobile.post("/api/auth/login").set("User-Agent", "MobileBrowser").send({
            email: CREDENTIALS.email,
            password: CREDENTIALS.password,
        });

        const laptopRefresh = await laptop.post("/api/auth/refresh");
        const mobileRefresh = await mobile.post("/api/auth/refresh");

        expect(laptopRefresh.status).toBe(200);
        expect(mobileRefresh.status).toBe(200);

        // Both sessions should still exist and be independently rotated (2 active rows).
        expect(await Session.countDocuments({ revokedAt: null })).toBe(2);
    });

    it("logs out one device without affecting the other", async () => {
        const laptop = request.agent(app);
        const mobile = request.agent(app);
        const laptopLogin = await laptop.post("/api/auth/login").set("User-Agent", "LaptopBrowser").send({
            email: CREDENTIALS.email,
            password: CREDENTIALS.password,
        });
        await mobile.post("/api/auth/login").set("User-Agent", "MobileBrowser").send({
            email: CREDENTIALS.email,
            password: CREDENTIALS.password,
        });
        // Captured before logout: logout's Set-Cookie response clears the agent's own
        // jar, so replaying this captured value afterward is what actually proves the
        // session was revoked server-side, rather than just that the cookie is gone.
        const laptopRefreshToken = getCookie(laptopLogin, "refreshToken");

        const logoutRes = await laptop.post("/api/auth/logout");
        expect(logoutRes.status).toBe(200);

        const laptopRefresh = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${laptopRefreshToken}`);
        expect(laptopRefresh.status).toBe(403); // revoked server-side

        const mobileRefresh = await mobile.post("/api/auth/refresh");
        expect(mobileRefresh.status).toBe(200); // untouched
    });

    it("logs out every other session but keeps the calling device logged in", async () => {
        const laptop = request.agent(app);
        const mobile = request.agent(app);
        const tablet = request.agent(app);
        await laptop.post("/api/auth/login").set("User-Agent", "LaptopBrowser").send({
            email: CREDENTIALS.email,
            password: CREDENTIALS.password,
        });
        await mobile.post("/api/auth/login").set("User-Agent", "MobileBrowser").send({
            email: CREDENTIALS.email,
            password: CREDENTIALS.password,
        });
        await tablet.post("/api/auth/login").set("User-Agent", "TabletBrowser").send({
            email: CREDENTIALS.email,
            password: CREDENTIALS.password,
        });

        const res = await laptop.post("/api/auth/sessions/logout-others");
        expect(res.status).toBe(200);

        expect((await laptop.post("/api/auth/refresh")).status).toBe(200);
        expect((await mobile.post("/api/auth/refresh")).status).toBe(403);
        expect((await tablet.post("/api/auth/refresh")).status).toBe(403);

        const sessions = await Session.find({ revokedAt: null });
        expect(sessions).toHaveLength(1);
    });

    it("lists active sessions and flags the caller's own session as current", async () => {
        const laptop = request.agent(app);
        const mobile = request.agent(app);
        await laptop.post("/api/auth/login").set("User-Agent", "LaptopBrowser").send({
            email: CREDENTIALS.email,
            password: CREDENTIALS.password,
        });
        await mobile.post("/api/auth/login").set("User-Agent", "MobileBrowser").send({
            email: CREDENTIALS.email,
            password: CREDENTIALS.password,
        });

        const res = await laptop.get("/api/auth/sessions");
        expect(res.status).toBe(200);
        expect(res.body.sessions).toHaveLength(2);
        const current = res.body.sessions.find((s: { current: boolean }) => s.current);
        expect(current).toBeDefined();
        expect(current.userAgent).toBe("LaptopBrowser");
    });
});

describe("refresh token rotation and reuse detection", () => {
    beforeEach(registerUser);

    it("rotates the refresh token cookie on every successful refresh", async () => {
        const agent = request.agent(app);
        const loginRes = await agent
            .post("/api/auth/login")
            .send({ email: CREDENTIALS.email, password: CREDENTIALS.password });
        const originalRefreshToken = getCookie(loginRes, "refreshToken");

        const refreshRes = await agent.post("/api/auth/refresh");
        expect(refreshRes.status).toBe(200);
        const newRefreshToken = getCookie(refreshRes, "refreshToken");

        expect(newRefreshToken).not.toBe(originalRefreshToken);
    });

    it("detects reuse of an already-rotated refresh token and revokes that session", async () => {
        const agent = request.agent(app);
        const loginRes = await agent
            .post("/api/auth/login")
            .send({ email: CREDENTIALS.email, password: CREDENTIALS.password });
        const staleRefreshToken = getCookie(loginRes, "refreshToken");

        // Legitimate rotation — agent's cookie jar now holds the NEW refresh token.
        const firstRefresh = await agent.post("/api/auth/refresh");
        expect(firstRefresh.status).toBe(200);

        // Replay the OLD, already-superseded token directly (bypassing the agent's jar).
        const reuseRes = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${staleRefreshToken}`);
        expect(reuseRes.status).toBe(403);
        expect(reuseRes.body.message).toMatch(/reuse detected/i);

        // Reuse detection must revoke the whole session — even the legitimately-rotated
        // (new) token that replaced the stale one should now be rejected too.
        const afterReuse = await agent.post("/api/auth/refresh");
        expect(afterReuse.status).toBe(403);
    });

    it("isolates reuse detection to the affected session only", async () => {
        const laptop = request.agent(app);
        const mobile = request.agent(app);
        const laptopLogin = await laptop
            .post("/api/auth/login")
            .set("User-Agent", "LaptopBrowser")
            .send({ email: CREDENTIALS.email, password: CREDENTIALS.password });
        await mobile
            .post("/api/auth/login")
            .set("User-Agent", "MobileBrowser")
            .send({ email: CREDENTIALS.email, password: CREDENTIALS.password });

        const staleLaptopToken = getCookie(laptopLogin, "refreshToken");
        await laptop.post("/api/auth/refresh"); // rotates laptop's session

        // Replay laptop's stale token — should be flagged as reuse and revoke ONLY
        // the laptop session.
        await request(app).post("/api/auth/refresh").set("Cookie", `refreshToken=${staleLaptopToken}`);

        // Mobile's independent session must be completely unaffected.
        const mobileRefresh = await mobile.post("/api/auth/refresh");
        expect(mobileRefresh.status).toBe(200);
    });

    it("prevents two concurrent refresh requests for the same session from both succeeding", async () => {
        const agent = request.agent(app);
        await agent.post("/api/auth/login").send({ email: CREDENTIALS.email, password: CREDENTIALS.password });

        // Both requests are dispatched from the same cookie jar before either resolves,
        // so both present the identical, still-valid refresh token — this is the race
        // the atomic findOneAndUpdate compare-and-swap in rotateSession() is meant to close.
        const [first, second] = await Promise.all([agent.post("/api/auth/refresh"), agent.post("/api/auth/refresh")]);

        const statuses = [first.status, second.status].sort((a, b) => a - b);
        // Exactly one request may win the atomic rotation (200); the other must lose the
        // race (409), never both succeeding against the same original token.
        expect(statuses).toEqual([200, 409]);

        // The session itself must still be usable afterward (the winner's new token works).
        expect(await Session.countDocuments({ revokedAt: null })).toBe(1);
    });
});

describe("expired session handling", () => {
    beforeEach(registerUser);

    it("rejects a refresh once the session's expiresAt has passed, without waiting for TTL deletion", async () => {
        const agent = request.agent(app);
        await agent.post("/api/auth/login").send({ email: CREDENTIALS.email, password: CREDENTIALS.password });

        // Force the session into the past instead of waiting on Mongo's real TTL sweep
        // (which runs on a background interval and isn't test-suite-friendly to await).
        await Session.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

        const res = await agent.post("/api/auth/refresh");
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/session not found/i);
    });

    it("declares a TTL index on expiresAt so MongoDB auto-deletes expired sessions", () => {
        // Structural check that the cleanup mechanism is actually configured, since
        // waiting for MongoDB's real background TTL monitor to fire is not practical
        // inside a fast unit/integration test.
        const indexes = Session.schema.indexes();
        const ttlIndex = indexes.find(
            ([fields, options]) => fields.expiresAt !== undefined && options?.expireAfterSeconds === 0
        );
        expect(ttlIndex).toBeDefined();
    });
});
