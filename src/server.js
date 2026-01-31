
import express from 'express';
import dotenv from 'dotenv';
import { testdbConnection,pool } from './config/mysql.js';
import {prisma} from './config/prisma.js';
import { getLocationByAdcode } from './utils/adcode2locUtil.js';
dotenv.config();
import hotelRoutes from './routes/HotelRoutes.js';

// 全局 BigInt 序列化支持
BigInt.prototype.toJSON = function() {
    return this.toString();
};

const app = express();
app.use(express.json());
app.use('/hotels', hotelRoutes);
app.get("/health", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ message: "Hello from server! it's healthy" }));
    res.end();
});
const port = process.env.PORT;
const server = app.listen(port, async() => {
    console.log(`Server is running on port ${port}`);
    const testAdcode = '120106'; 
    const location = await getLocationByAdcode(testAdcode);
    console.log(`Location for adcode ${testAdcode}:`, location);
    // 测试 atcode 插入
})