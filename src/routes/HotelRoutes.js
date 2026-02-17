import express from 'express';
import { prisma } from '../config/prisma.js';
import { addHotel,getHotelById,searchHotelStationById} from '../utils/hotelUtils.js';
import { ok } from 'node:assert';
import { info } from 'node:console';
import { authenticateToken } from '../middleware/authMiddleware.js';
const router = express.Router();

// Define your hotel-related routes here
router.get("/list",(req,res)=>{
    res.json({message: "List of hotels"});
});
router.post("/add",(req,res)=>{
    const {name} = req.body;
    console.log('收到的 name:', name);
    console.log('完整的请求体:', req.body);
    prisma.test_table.create({
        data: { name }
    }).then((result)=>{
        console.log("Hotel added:", result);
        res.json({message: "Hotel added", hotel: result});
    }).catch((error)=>{
        res.status(500).json({error: "Failed to add hotel"});
    });
})
router.post("/addHotel", async (req, res) => {
    try {
        const hotelData = req.body;
        const result = await addHotel(hotelData);
        res.json(result);
    } catch (error) {
        console.error('添加酒店出错:', error);
        res.status(500).json({ error: '添加酒店失败' });
    }
});
router.get("/getHotelInfo" ,async (req, res) => {
    try {
        const {hotelId} = req.query;
        if (!hotelId) {
            return res.status(400).json({ 
                error: "Hotel ID is required",
                ok: false
            });
        }
        
        const hotelRaw = await getHotelById(hotelId);
        const stationsRaw = await searchHotelStationById(BigInt(hotelId));
        
        // 过滤 hotel 对象中不需要的字段
        const {adcode, geohash, audit_status, status, created_at, updated_at, hotel_info, ...hotel} = hotelRaw;
        
        // 过滤 hotel_info 对象中不需要的字段
        if (hotel_info) {
            const {hotel_id, created_at: info_created, updated_at: info_updated, ...cleanInfo} = hotel_info;
            hotel.hotel_info = cleanInfo;
        }
        
        // 过滤并格式化站点数据
        const stations = stationsRaw.map((station) => ({
            name: station.cn_name,
            en_name: station.en_name,
            distance: station.distance,
            line_name: station.line_name,
            line_color: station.line_color,
        }));
        
        return res.json({hotel: hotel, stations: stations, ok: true});
    } catch (error) {
        console.error('获取酒店信息失败:', error);
        return res.status(500).json({ error: error.message, ok: false });
    }
});
export default router;