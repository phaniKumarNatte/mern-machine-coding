import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
    try {
        // Use an environment variable, falling back to local URI if not defined
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/roleBasedAuth";
        
        await mongoose.connect(mongoUri);
        
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1); // Exit process with failure
    }
};

export default connectDB;