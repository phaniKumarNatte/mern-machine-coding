    import mongoose, { Schema, Document } from "mongoose";

// Optional: TypeScript interface for strict type checking
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true, // Ensures no duplicate emails
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ["user", "admin", "moderator"], // Restricts roles to only these valid options
            default: "user", // Default role assigned upon registration
        },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

export default mongoose.model<IUser>("User", userSchema);

