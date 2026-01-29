
import express from 'express';
import dotenv from 'dotenv';
import { testdbConnection,pool } from './config/mysql.js';
import {prisma} from './config/prisma.js';
dotenv.config();
import hotelRoutes from './routes/HotelRoutes.js';
const app = express();
app.use('/hotels', hotelRoutes);
app.get("/health", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ message: "Hello from server! it's healthy" }));
    res.end();
});
const port = process.env.PORT;
const server = app.listen(port, async() => {
    prisma.test_table.create({data:{name:"test"}}).then(()=>{
        console.log("Prisma DB connection insert successful!");
    }).catch((error)=>{
        console.error("Prisma DB connection failed:", error);
        process.exit(1); // ❗ 启动即失败，直接退出
    });
    console.log(`Server is running on port ${port}`);
})