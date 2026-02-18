import express from 'express';
import multer from 'multer';
import { prisma } from '../config/prisma.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { addHotel, getHotelById, uploadHotelBanner } from '../utils/hotelUtils.js';

const router = express.Router();

// 配置 multer（内存存储）
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only images allowed'), false);
    }
});

/**
 * 商户添加酒店 - 复用 hotelUtils.addHotel
 */
router.post("/hotels", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const merchantId = BigInt(req.user.id);
        const result = await addHotel({ ...req.body, merchant_id: merchantId });
        
        return res.status(201).json({
            message: result.message,
            data: result.hotel,
            ok: true
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message || "Failed to create hotel",
            ok: false
        });
    }
});

/**
 * 列举商户自己的酒店
 */
router.get("/hotels", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const merchantId = BigInt(req.user.id);
        const { page = 1, pageSize = 10 } = req.query;

        const hotels = await prisma.hotel.findMany({
            where: { merchant_id: merchantId },
            include: { hotel_info: true },
            skip: (parseInt(page) - 1) * parseInt(pageSize),
            take: parseInt(pageSize),
            orderBy: { created_at: "desc" }
        });

        const total = await prisma.hotel.count({ where: { merchant_id: merchantId } });

        return res.json({
            data: { hotels, total, page: parseInt(page), pageSize: parseInt(pageSize) },
            ok: true
        });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch hotels", ok: false });
    }
});

/**
 * 查询单个酒店详情 - 复用 hotelUtils.getHotelById
 */
router.get("/hotels/:hotelId", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const { hotelId } = req.params;
        const merchantId = BigInt(req.user.id);
        
        const hotel = await getHotelById(BigInt(hotelId));

        if (BigInt(hotel.merchant_id) !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        return res.json({ data: hotel, ok: true });
    } catch (error) {
        return res.status(404).json({ error: error.message, ok: false });
    }
});

/**
 * 上传酒店 Banner 图片 - 复用 hotelUtils.uploadHotelBanner
 */
router.post("/hotels/:hotelId/banner", authenticateToken, authorizeRoles("merchant"), upload.single('banner'), async (req, res) => {
    try {
        const { hotelId } = req.params;
        const merchantId = BigInt(req.user.id);

        const hotel = await prisma.hotel.findUnique({ where: { id: BigInt(hotelId) } });
        
        if (!hotel || BigInt(hotel.merchant_id) !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded", ok: false });
        }

        // 调用封装的上传函数
        const sortOrder = parseInt(req.body.sortOrder) || 0;
        const result = await uploadHotelBanner(
            BigInt(hotelId),
            req.file.buffer,
            req.file.originalname,
            sortOrder
        );

        return res.status(201).json({
            data: result.imageRecord,
            ok: true
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || "Upload failed", ok: false });
    }
});

/**
 * 商户删除酒店
 */
router.delete("/hotels/:hotelId", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const { hotelId } = req.params;
        const merchantId = BigInt(req.user.id);

        const hotel = await prisma.hotel.findUnique({
            where: { id: BigInt(hotelId) }
        });

        if (!hotel) {
            return res.status(404).json({
                error: "Hotel not found",
                ok: false
            });
        }

        if (hotel.merchant_id !== merchantId) {
            return res.status(403).json({
                error: "You do not have permission to delete this hotel",
                ok: false
            });
        }

        await prisma.hotel.delete({
            where: { id: BigInt(hotelId) }
        });

        return res.json({
            message: "Hotel deleted successfully",
            ok: true
        });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to delete hotel",
            ok: false
        });
    }
});
router.get("/hotels/:hotelId/review-history",authenticateToken,authorizeRoles("merchant"), async (req, res) => {
    const {hotelId} = req.params
    const review_result = prisma.hotel_review_reason.findFirst({
        where: {
            hotelId: BigInt(hotelId),
            review_result: "reject"
        },
        select:{
            reason:true,
            operator_user_id:true,
        }
    })
    const auditor = prisma.users.findUnique({
        where : {
            id: review_result.operator_user_id
        },
        select : {
            display_name:true,
            avatar_url:true
        }
    });
    return res.json({
        data: {
            reason: review_result.reason,
            auditor: auditor
        },
        ok: true
    })
    
});
export default router;
