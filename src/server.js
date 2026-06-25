import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import dns from "dns";

dns.setServers(["1.1.1.1","8.8.8.8"]);

const port =process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Welcome to AI Fitness Server");
});


connectDB().then(()=>{
    app.listen(port, () => {
        console.log(`Server is running on port http://localhost:${port}`);
    });
}).catch((err)=>{
    console.error("Failed to connect to the database:", err);
    process.exit(1);
});