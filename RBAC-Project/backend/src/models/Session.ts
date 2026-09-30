import mongoose, { Schema, Document, Types } from "mongoose";

// One document per logged-in device/browser (mobile, laptop, tab, ...). Replaces the
// old User.sessions embedded array — see interview.md for why: TTL auto-cleanup, no
// 16MB-per-user document ceiling, and session queries that don't require pulling the
// whole user document along with them.
export interface ISession extends Document {
    // _id (inherited from Document) doubles as the "sessionId" embedded in that device's JWTs
    userId: Types.ObjectId;
    refreshTokenHash: string; // hash of this device's currently-valid refresh token
    deviceType: "mobile" | "tablet" | "desktop" | "unknown";
    deviceName?: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
    lastUsedAt: Date; // bumped on every successful rotation
    expiresAt: Date; // TTL-indexed — MongoDB deletes the doc automatically once this passes
    revokedAt: Date | null; // soft-revoke marker (logout, reuse detection, logout-others)
}

// No <ISession> generic here — matching User.ts's pattern of letting Schema infer the
// raw shape and tagging only the model with mongoose.model<ISession>(...) below. Passing
// a Document-extending interface as the Schema's own generic breaks query/create
// overload resolution under this project's `exactOptionalPropertyTypes` setting.
const sessionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true, // every listSessions()/logout-others query filters by userId
    },
    refreshTokenHash: {
        type: String,
        required: true,
        select: false, // never returned by a plain find/findById — same hygiene as a password hash
    },
    deviceType: {
        type: String,
        enum: ["mobile", "tablet", "desktop", "unknown"],
        default: "unknown",
    },
    deviceName: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
});

// TTL index: MongoDB's background task deletes a document once its expiresAt has passed
// (expireAfterSeconds: 0 means "expire exactly at the stored date", not N seconds after
// insertion). This is why expired sessions clean themselves up with no cron job needed.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Speeds up listSessions()'s "active sessions for this user" query.
sessionSchema.index({ userId: 1, revokedAt: 1 });

// The atomic rotation in refresh() filters by { _id, refreshTokenHash, revokedAt }.
// _id is already uniquely indexed by MongoDB by default, so that filter is a single-
// document point lookup — no additional compound index is needed for it to be atomic
// or fast; this index only helps the rarer "look up a session by its hash directly"
// pattern (e.g. investigating a leaked token) without a full collection scan.
sessionSchema.index({ refreshTokenHash: 1 });

export default mongoose.model<ISession>("Session", sessionSchema);
