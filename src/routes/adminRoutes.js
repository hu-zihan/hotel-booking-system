import express from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
const router = express.Router();
router.get("/dashboard",authenticateToken,authorizeRoles("auditor"), async (req, res) => {
    try{
        const hotelNotAudit = await prisma.hotel.findMany({
            where : {audit_status: 0},
            select : {id:true,name:true,address:true}
        });
        res.json({
            hotelNotAudit: hotelNotAudit,
            ok : true
        });

    }
    catch(error){
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({error: "Failed to fetch dashboard data",ok:false});
    }
});

// 获取所有酒店列表（审核员用）
router.get("/hotels", authenticateToken, authorizeRoles("auditor"), async (req, res) => {
    try {
        const { page = 1, pageSize = 10, audit_status, status, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(pageSize);

        const where = {};

        // 审核状态筛选
        if (audit_status !== undefined && audit_status !== "all") {
            where.audit_status = parseInt(audit_status);
        }

        // 上架状态筛选
        if (status !== undefined && status !== "all") {
            where.status = parseInt(status);
        }

        // 关键词搜索
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { address: { contains: search } }
            ];
        }

        const [hotels, total] = await Promise.all([
            prisma.hotel.findMany({
                where,
                skip,
                take: parseInt(pageSize),
                orderBy: { created_at: 'desc' }
            }),
            prisma.hotel.count({ where })
        ]);

        // 获取商户信息
        const merchantIds = [...new Set(hotels.map(h => h.merchant_id))];
        const merchants = await prisma.users.findMany({
            where: { id: { in: merchantIds } },
            select: { id: true, username: true, display_name: true }
        });
        const merchantMap = new Map(merchants.map(m => [Number(m.id), m]));
        // 格式化返回数据
        const formattedHotels = hotels.map(h => {
            const merchant = merchantMap.get(h.merchant_id);
            return {
                id: h.id.toString(),
                name: h.name,
                address: h.address,
                star: h.star,
                min_price: parseFloat(h.min_price),
                audit_status: h.audit_status,
                status: h.status,
                created_at: h.created_at.toISOString(),
                merchant_name: merchant?.display_name || merchant?.username || '未知'
            };
        });

        res.json({
            ok: true,
            data: {
                hotels: formattedHotels,
                total,
                page: parseInt(page),
                pageSize: parseInt(pageSize)
            }
        });
    } catch (error) {
        console.error("Error fetching hotels:", error);
        res.status(500).json({ error: "Failed to fetch hotels", ok: false });
    }
});
router.post("/hotels/:hotelId/audit", authenticateToken, authorizeRoles("auditor"), async (req, res) => {
    const { hotelId } = req.params;
    const {approved,reason} = req.body
    if (approved === undefined || typeof approved !== "boolean") {
        return res.status(400).json({ error: "Approved field is required and must boolean", ok: false });
    }
    if(!approved && (!reason || typeof reason !== "string")){
        return res.status(400).json({ error: "Reason is required when rejecting a hotel", ok: false });
    }
    try{
        const hotel = await prisma.hotel.findUnique({
            where : {id: BigInt(hotelId)}
        });
        if(!hotel){
            return res.status(404).json({error: "Hotel not found",ok:false});
        }
        const updatedHotel = await prisma.hotel.update({
            where : {id: BigInt(hotelId)},
            data : {
                audit_status: approved ? 1 : 2,
            }});
        
        // 记录审核日志
        await prisma.hotel_review_reason.create({
            data : {
                hotel_id: BigInt(hotelId),
                reason: reason || null,
                review_result: approved ? "pass" : "reject",
                operator_user_id: BigInt(req.user.id),
                action_type: "audit"
            }
        });
        return res.json({ok:true,message:`Hotel ${hotelId} ${approved ? "approved" : "rejected"} successfully`})
    }catch(error){
        console.error('审核酒店失败:', error);
        return res.status(500).json({ error: '审核酒店失败', ok: false ,error_details: error.message});
    }
});
router.post("/hotels/:hotelId/online", authenticateToken, authorizeRoles("auditor"), async (req, res) => {
    const { hotelId } = req.params;
    try{
        const hotel = await prisma.hotel.findUnique({
            where : {id: Number(hotelId)}
        });
        if(!hotel){
            return res.status(404).json({error: "Hotel not found",ok:false});
        }
        if(hotel.audit_status !== 1){
            return res.status(400).json({error: "Hotel must be approved before going online",ok:false});
        }
        const updatedHotel = await prisma.hotel.update({
            where : {id: Number(hotelId)},
            data : {
                status: 1,
            }});
        return res.json({ok:true,message:`Hotel ${hotelId} is now online`})
    }
    catch(error){
        console.error('酒店上线失败:', error);
        return res.status(500).json({ error: '酒店上线失败', ok: false ,error_details: error.message});
    }
});
router.post("/hotels/:hotelId/offline", authenticateToken, authorizeRoles("auditor"), async (req, res) => {
    const { hotelId } = req.params;
    try{
        const hotel = await prisma.hotel.findUnique({
            where : {id: BigInt(hotelId)}
        });
        if(!hotel){
            return res.status(404).json({error: "Hotel not found",ok:false});
        }
        const updatedHotel = await prisma.hotel.update({
            where : {id: Number(hotelId)},
            data : {
                status: 0,
            }});
        return res.json({ok:true,message:`Hotel ${hotelId} is now offline`})
    }
    catch(error){
        console.error('酒店下线失败:', error);
        return res.status(500).json({ error: '酒店下线失败', ok: false ,error_details: error.message});
    }
});
export default router;