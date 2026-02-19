
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { testdbConnection,pool } from './config/mysql.js';
import {prisma} from './config/prisma.js';
dotenv.config();
import hotelRoutes from './routes/HotelRoutes.js';
import geoRoutes from './routes/geoRoutes.js';
import userRoutes from './routes/userRoutes.js'
import merchantRoutes from './routes/merchantRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import { testESConnection } from './config/elasticsearchConfig.js';
import { initHotelIndex, syncAllHotelsToES } from './utils/esHotelSync.js';

// 全局 BigInt 序列化支持
BigInt.prototype.toJSON = function() {
    return this.toString();
};

const app = express();
// CORS 配置
// 支持通过环境变量 CORS_ORIGIN 指定允许的来源，逗号分隔；
// 如果未设置，则默认允许常见本地开发源。
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

const corsOptions = {
    origin: function(origin, callback) {
        // 如果没有 origin（例如 curl 或同源请求），允许。
        if (!origin) return callback(null, true);

        // 支持通配符 '*' 的场景
        if (allowedOrigins.length === 1 && allowedOrigins[0] === '*') {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With']
};

app.use(cors(corsOptions));

app.use(express.json());
app.use('/hotels', hotelRoutes);
app.use('/geo', geoRoutes);
app.use('/user', userRoutes);
app.use('/merchant', merchantRoutes);
app.use("/admin",adminRoutes)
app.use('/search', searchRoutes);

app.get("/health", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ message: "Hello from server! it's healthy" }));
    res.end();
});

const port = process.env.PORT;
const server = app.listen(port, "0.0.0.0",async() => {
    console.log(`Server is running on port ${port}`);
    
    // 初始化 Elasticsearch
    try {
        await testESConnection();
        await initHotelIndex();
        await syncAllHotelsToES({ onlyApproved: true });
    } catch (error) {
        console.error('Elasticsearch initialization warning:', error.message);
        console.log('⚠️  Search functionality may not be available');
    }
})

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // 这里可以添加额外的错误处理逻辑，比如发送告警邮件等
})