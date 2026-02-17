
import express from 'express';
import dotenv from 'dotenv';
import { testdbConnection,pool } from './config/mysql.js';
import {prisma} from './config/prisma.js';
dotenv.config();
import hotelRoutes from './routes/HotelRoutes.js';
import geoRoutes from './routes/geoRoutes.js';
import userRoutes from './routes/userRoutes.js'
import merchantRoutes from './routes/merchantRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
// 全局 BigInt 序列化支持
BigInt.prototype.toJSON = function() {
    return this.toString();
};

const app = express();
app.use(express.json());
app.use('/hotels', hotelRoutes);
app.use('/geo', geoRoutes);
app.use('/user', userRoutes);
app.use('/merchant', merchantRoutes);
app.use("/admin",adminRoutes)
app.get("/health", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ message: "Hello from server! it's healthy" }));
    res.end();
});
const port = process.env.PORT;
const server = app.listen(port, "0.0.0.0",async() => {
    console.log(`Server is running on port ${port}`);
    // 测试 atcode 插入
})

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // 这里可以添加额外的错误处理逻辑，比如发送告警邮件等
})