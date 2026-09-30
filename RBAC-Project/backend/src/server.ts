import app from "./app";
import connectDB from "./config/db";

const startServer = async () => {
    try {
        await connectDB();
        app.listen(5000, () => {
            console.log("Server listening on port 5000");
        });
    } catch (error) {
        console.log("Server failed to start", error);
    }
};

startServer();
