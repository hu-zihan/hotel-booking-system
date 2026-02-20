import express from 'express';
import multer from 'multer';
import { prisma } from '../config/prisma.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { addHotel, getHotelById, uploadHotelBanner, updateHotel } from '../utils/hotelUtils.js';
import { deleteByUrl } from '../utils/ossUtils.js';

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
        const merchantId = Number(req.user.id);
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
 * 列举商户自己的酒店 - 复用 hotelUtils.getHotelById，含 Banner 信息
 */
router.get("/hotels", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const merchantId = Number(req.user.id);
        const { page = 1, pageSize = 10 } = req.query;

        // 1. 先分页查出属于该商户的酒店 ID 列表
        const [hotelIds, total] = await Promise.all([
            prisma.hotel.findMany({
                where: { merchant_id: merchantId },
                select: { id: true },
                skip: (parseInt(page) - 1) * parseInt(pageSize),
                take: parseInt(pageSize),
                orderBy: { created_at: "desc" }
            }),
            prisma.hotel.count({ where: { merchant_id: merchantId } })
        ]);

        // 2. 并发调用 getHotelById，每个酒店都会带回 images.bannerUrls 等完整信息
        const hotels = await Promise.all(
            hotelIds.map(({ id }) => getHotelById(id))
        );

        return res.json({
            data: { hotels, total, page: parseInt(page), pageSize: parseInt(pageSize) },
            ok: true
        });
    } catch (error) {
        console.error("GET /merchant/hotels error:", error);
        return res.status(500).json({
            error: "Failed to fetch hotels",
            detail: String(error?.message ?? error),
            ok: false
        });
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
router.post("/hotels/:hotelId/image", authenticateToken, authorizeRoles("merchant"), upload.single('banner'), async (req, res) => {
    try {
        const { hotelId} = req.params;
        const merchantId = BigInt(req.user.id);
        const image_type = req.body.image_type ? parseInt(req.body.image_type) : 0;
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
            Number(hotelId),
            req.file.buffer,
            req.file.originalname,
            sortOrder,
            image_type
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
 * 商户修改酒店信息 - 复用 hotelUtils.updateHotel
 */
router.put("/hotels/:hotelId", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const { hotelId } = req.params;
        const merchantId = Number(req.user.id);

        // 验证酒店归属
        const hotel = await prisma.hotel.findUnique({
            where: { id: Number(hotelId) }
        });

        if (!hotel) {
            return res.status(404).json({ error: "Hotel not found", ok: false });
        }

        if (Number(hotel.merchant_id) !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        const result = await updateHotel(BigInt(hotelId), req.body);

        return res.json({
            message: result.message,
            data: result.hotel,
            ok: true
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message || "Failed to update hotel",
            ok: false
        });
    }
});

/**
 * 商户删除酒店
 */
router.delete("/hotels/:hotelId", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const { hotelId } = req.params;
        const merchantId = Number(req.user.id);

        const hotel = await prisma.hotel.findUnique({
            where: { id: Number(hotelId) }
        });

        if (!hotel) {
            return res.status(404).json({
                error: "Hotel not found",
                ok: false
            });
        }
        console.log(`Merchant ${merchantId} attempting to delete hotel ${hotelId} owned by merchant ${hotel.merchant_id}`);
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
    console.log(`Fetching review history for hotel ID: ${hotelId}`);
    const review_result = await prisma.hotel_review_reason.findFirst({
        where: {
            hotel_id: Number(hotelId),
            review_result: "reject"
        },
        select:{
            reason:true,
            operator_user_id:true,
            created_at:true
        }
    })
    console.log("Review result:", review_result);
    const auditor = await prisma.users.findUnique({
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
            created_at: review_result.created_at,
            auditor: auditor
        },
        ok: true
    })
    
});
router.get("/hotels/:hotelId/images", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    const { hotelId } = req.params;
    const merchantId = Number(req.user.id);

    try {
        const hotel = await prisma.hotel.findUnique({
            where: { id: Number(hotelId) }
        });
        
        if(!hotel || hotel.merchant_id !== merchantId){
            return res.status(403).json({ error: "Permission denied", ok: false });
        }
        
        const images = await prisma.hotel_image.findMany({
            where: { hotel_id: Number(hotelId) },
            orderBy: { sort_order: 'asc' }
        });
        
        // 按图片类型分类
        let banner_urls = [];
        let roomType_urls = [];
        let details_urls = [];
        
        images.forEach(image => {
            const imageData = {
                id: image.id,
                url: image.image_url,
                sort_order: image.sort_order,
                room_type_id: image.room_type_id // 对于房型图片可能有room_type_id
            };
            
            switch(image.image_type) {
                case 0: // 酒店Banner图片
                    banner_urls.push(imageData);
                    break;
                case 1: // 房型图片
                    roomType_urls.push(imageData);
                    break;
                case 2: // 详情图片
                    details_urls.push(imageData);
                    break;
                default:
                    // 未知类型，可以根据需要处理
                    console.log(`Unknown image type: ${image.image_type}`);
            }
        });
        
        return res.status(200).json({
            ok: true,
            data: {
                hotel_id: hotelId,
                banner_images: banner_urls,
                room_type_images: roomType_urls,
                detail_images: details_urls,
                all_images: images // 可选：返回所有图片的原始数据
            }
        });
        
    } catch (error) {
        console.error("Error fetching hotel images:", error);
        return res.status(500).json({ 
            error: "Internal server error", 
            ok: false 
        });
    }
});
router.delete("/hotels/:hotelId/images/:imageId", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    const { hotelId, imageId} = req.params;
    const merchantId = Number(req.user.id);
    const image_url = req.body.image_url; // 前端需要传回要删除的图片 URL，以便删除 OSS 上的文件
    try {
        const hotel = await prisma.hotel.findUnique({
            where: { id: Number(hotelId) }
        });

        if (!hotel || hotel.merchant_id !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        const image = await prisma.hotel_image.findUnique({
            where: { id: Number(imageId) }
        });

        if (!image || image.hotel_id !== hotel.id) {
            return res.status(404).json({ error: "Image not found", ok: false });
        }

        await prisma.hotel_image.delete({
            where: { id: Number(imageId) }
        });

        // 删除 OSS 上的文件
        if (image_url) {
            await deleteByUrl(image_url);
        }

        return res.json({ message: "Image deleted successfully", ok: true });
    } catch (error) {
        console.error("Error deleting hotel image:", error);
        return res.status(500).json({ error: "Internal server error", ok: false });
    }
});
export default router;
