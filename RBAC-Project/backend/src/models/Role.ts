import mongoose, { Document } from "mongoose";

// Define allowed role types
export type RoleType = "admin" | "user" | "manager";

export interface IRole extends Document {
    name: RoleType; // Uses the type union for strict checking
    createdAt: Date;
    updatedAt: Date;
}

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true, // Prevents duplicate roles like two "admin" entries
            enum: ["admin", "user", "manager"], // Enforces allowed values at the DB level too
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<IRole>("Role", roleSchema);

