import express from 'express';
import multer from 'multer';
import { prisma } from '../config/prisma.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { addHotel, getHotelById, getHotelByIdWithRoomTypes, uploadHotelBanner, updateHotel } from '../utils/hotelUtils.js';
import { deleteByUrl,upload } from '../utils/ossUtils.js';
const router = express.Router();

// 配置 multer（内存存储）
const uploadmemory = multer({
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

        const hotel = await getHotelByIdWithRoomTypes(BigInt(hotelId));

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
router.post("/hotels/:hotelId/image", authenticateToken, authorizeRoles("merchant"), uploadmemory.single('banner'), async (req, res) => {
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
    const { hotelId } = req.params;
    const merchantId = Number(req.user.id);

    try {
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

        // 先查询酒店的所有图片
        const hotelImages = await prisma.hotel_image.findMany({
            where: { hotel_id: Number(hotelId) }
        });

        // 删除 OSS 上的图片文件
        for (const img of hotelImages) {
            if (img.image_url) {
                try {
                    await deleteByUrl(img.image_url);
                    console.log(`Deleted OSS image: ${img.image_url}`);
                } catch (ossError) {
                    console.error(`Failed to delete OSS image: ${img.image_url}`, ossError);
                    // 继续删除其他图片，不阻断流程
                }
            }
        }

        // 删除数据库中的酒店（cascade 会自动删除 hotel_image 记录）
        await prisma.hotel.delete({
            where: { id: Number(hotelId) }
        });

        return res.json({
            message: "Hotel deleted successfully",
            ok: true
        });
    } catch (error) {
        console.error("Error deleting hotel:", error);
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

/**
 * 商户获取酒店房型列表
 */
router.get("/hotels/:hotelId/room-types", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const { hotelId } = req.params;
        const merchantId = Number(req.user.id);

        const hotel = await prisma.hotel.findUnique({
            where: { id: Number(hotelId) }
        });

        if (!hotel || hotel.merchant_id !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        const roomTypes = await prisma.hotel_room_type.findMany({
            where: { hotel_id: Number(hotelId) },
            include: {
                hotel_image: {
                    orderBy: { sort_order: 'asc' }
                }
            },
            orderBy: { price: 'asc' }
        });

        return res.json({
            ok: true,
            data: roomTypes.map(rt => ({
                id: rt.id.toString(),
                name: rt.name,
                bed_type: rt.bed_type,
                capacity: rt.capacity,
                breakfast_included: rt.breakfast_included,
                refundable: rt.refundable,
                price: parseFloat(rt.price),
                stock: rt.stock,
                status: rt.status,
                room_space: rt.room_space ? parseFloat(rt.room_space) : null,
                images: rt.hotel_image.map(img => ({
                    id: img.id.toString(),
                    url: img.image_url,
                    sort_order: img.sort_order
                }))
            }))
        });
    } catch (error) {
        console.error("Error fetching room types:", error);
        return res.status(500).json({ error: "Internal server error", ok: false });
    }
});

/**
 * 商户新增房型（支持同时上传图片）
 */
router.post("/hotels/:hotelId/room-types", authenticateToken, authorizeRoles("merchant"), uploadmemory.array('images', 10), async (req, res) => {
    try {
        const { hotelId } = req.params;
        const merchantId = Number(req.user.id);
        const { name, bed_type, capacity, breakfast_included, refundable, price, stock, status, room_space } = req.body;
        const files = req.files;

        const hotel = await prisma.hotel.findUnique({
            where: { id: Number(hotelId) }
        });

        if (!hotel || hotel.merchant_id !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        if (!name || price === undefined) {
            return res.status(400).json({ error: "Name and price are required", ok: false });
        }

        const roomType = await prisma.hotel_room_type.create({
            data: {
                hotel_id: Number(hotelId),
                name,
                bed_type: Number(bed_type) || 0,
                capacity: Number(capacity) || 2,
                breakfast_included: breakfast_included ? 1 : 0,
                refundable: Number(refundable) || 1,
                price: Number(price),
                stock: Number(stock) || 0,
                status: Number(status) || 1,
                room_space: room_space ? Number(room_space) : null
            }
        });

        // 如果有上传图片，保存到数据库
        const uploadedImages = [];
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const ext = file.originalname.split('.').pop();
                const ossPath = `hotel/${hotelId}/room-type/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
                const imageUrl = await upload(file.buffer, ossPath);

                const image = await prisma.hotel_image.create({
                    data: {
                        hotel_id: Number(hotelId),
                        room_type_id: roomType.id,
                        image_url: imageUrl.url,
                        image_type: 1, // 房型图片
                        sort_order: i
                    }
                });

                uploadedImages.push({
                    id: image.id.toString(),
                    url: image.image_url,
                    sort_order: image.sort_order
                });
            }
        }

        // 如果房型价格低于酒店当前最低价，更新酒店的 min_price
        const currentMinPrice = parseFloat(hotel.min_price);
        if (parseFloat(price) < currentMinPrice) {
            await prisma.hotel.update({
                where: { id: Number(hotelId) },
                data: { min_price: price }
            });
        }

        return res.status(201).json({
            ok: true,
            data: {
                id: roomType.id.toString(),
                name: roomType.name,
                price: parseFloat(roomType.price),
                images: uploadedImages
            },
            message: "Room type created successfully"
        });
    } catch (error) {
        console.error("Error creating room type:", error);
        return res.status(500).json({ error: error.message || "Internal server error", ok: false });
    }
});

/**
 * 商户修改房型
 */
router.put("/room-types/:roomTypeId", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const { roomTypeId } = req.params;
        const merchantId = Number(req.user.id);
        const { name, bed_type, capacity, breakfast_included, refundable, price, stock, status, room_space } = req.body;

        const roomType = await prisma.hotel_room_type.findUnique({
            where: { id: BigInt(roomTypeId) },
            include: { hotel: true }
        });

        if (!roomType || roomType.hotel.merchant_id !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        const oldPrice = parseFloat(roomType.price);
        const newPrice = price !== undefined ? parseFloat(price) : oldPrice;

        const updatedRoomType = await prisma.hotel_room_type.update({
            where: { id: BigInt(roomTypeId) },
            data: {
                ...(name && { name }),
                ...(bed_type !== undefined && { bed_type }),
                ...(capacity !== undefined && { capacity }),
                ...(breakfast_included !== undefined && { breakfast_included:Number(breakfast_included) }),
                ...(refundable !== undefined && { refundable:Number(refundable) }),
                ...(price !== undefined && { price: newPrice }),
                ...(stock !== undefined && { stock: Number(stock) }),
                ...(status !== undefined && { status:Number(status) }),
                ...(room_space !== undefined && { room_space: room_space ? Number(room_space) : null }),
                updated_at: new Date()
            }
        });

        // 如果价格降低了，更新酒店的 min_price
        if (newPrice < oldPrice) {
            await prisma.hotel.update({
                where: { id: roomType.hotel_id },
                data: { min_price: newPrice.toString() }
            });
        } else if (newPrice > oldPrice) {
            // 如果价格上涨了，检查是否需要更新酒店 min_price
            const hotel = await prisma.hotel.findUnique({
                where: { id: roomType.hotel_id }
            });
            const minRoomPrice = await prisma.hotel_room_type.findFirst({
                where: { hotel_id: roomType.hotel_id, status: 1 },
                orderBy: { price: 'asc' }
            });
            if (minRoomPrice && parseFloat(minRoomPrice.price) > parseFloat(hotel.min_price)) {
                await prisma.hotel.update({
                    where: { id: roomType.hotel_id },
                    data: { min_price: minRoomPrice.price }
                });
            }
        }

        return res.json({
            ok: true,
            data: {
                id: updatedRoomType.id.toString(),
                name: updatedRoomType.name,
                price: parseFloat(updatedRoomType.price)
            },
            message: "Room type updated successfully"
        });
    } catch (error) {
        console.error("Error updating room type:", error);
        return res.status(500).json({ error: error.message || "Internal server error", ok: false });
    }
});

/**
 * 商户删除房型
 */
router.delete("/room-types/:roomTypeId", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const { roomTypeId } = req.params;
        const merchantId = Number(req.user.id);

        const roomType = await prisma.hotel_room_type.findUnique({
            where: { id: BigInt(roomTypeId) },
            include: { hotel: true }
        });

        if (!roomType || roomType.hotel.merchant_id !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        const hotelId = roomType.hotel_id;
        const deletedPrice = parseFloat(roomType.price);

        // 先删除 OSS 上的房型图片
        const roomImages = await prisma.hotel_image.findMany({
            where: { room_type_id: BigInt(roomTypeId) }
        });

        for (const img of roomImages) {
            if (img.image_url) {
                try {
                    await deleteByUrl(img.image_url);
                } catch (ossError) {
                    console.error(`Failed to delete OSS image: ${img.image_url}`, ossError);
                }
            }
        }

        // 删除数据库中的房型（cascade 会自动删除 hotel_image 记录）
        await prisma.hotel_room_type.delete({
            where: { id: BigInt(roomTypeId) }
        });

        // 如果删除的是最低价的房型，更新酒店的 min_price
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId }
        });

        if (parseFloat(hotel.min_price) === deletedPrice) {
            const minRoomPrice = await prisma.hotel_room_type.findFirst({
                where: { hotel_id: hotelId, status: 1 },
                orderBy: { price: 'asc' }
            });
            const newMinPrice = minRoomPrice ? minRoomPrice.price : '0';
            await prisma.hotel.update({
                where: { id: hotelId },
                data: { min_price: newMinPrice }
            });
        }

        return res.json({
            ok: true,
            message: "Room type deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting room type:", error);
        return res.status(500).json({ error: error.message || "Internal server error", ok: false });
    }
});

/**
 * 商户上传房型图片
 */
router.post("/room-types/:roomTypeId/images", authenticateToken, authorizeRoles("merchant"), uploadmemory.single('image'), async (req, res) => {
    try {
        const { roomTypeId } = req.params;
        const merchantId = Number(req.user.id);

        const roomType = await prisma.hotel_room_type.findUnique({
            where: { id: BigInt(roomTypeId) },
            include: { hotel: true }
        });

        if (!roomType || roomType.hotel.merchant_id !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded", ok: false });
        }

        const { upload } = await import('../utils/ossUtils.js');
        const ext = req.file.originalname.split('.').pop();
        const ossPath = `hotel/${roomType.hotel_id}/room-type/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const imageUrl = await upload(req.file.buffer, ossPath);

        const sortOrder = parseInt(req.body.sort_order) || 0;

        const image = await prisma.hotel_image.create({
            data: {
                hotel_id: roomType.hotel_id,
                room_type_id: BigInt(roomTypeId),
                image_url: imageUrl.url,
                image_type: 1, // 房型图片类型 (0=Banner, 1=房型, 2=详情)
                sort_order: sortOrder
            }
        });

        return res.status(201).json({
            ok: true,
            data: {
                id: image.id.toString(),
                url: image.image_url,
                sort_order: image.sort_order
            },
            message: "Room type image uploaded successfully"
        });
    } catch (error) {
        console.error("Error uploading room type image:", error);
        return res.status(500).json({ error: error.message || "Internal server error", ok: false });
    }
});

/**
 * 商户删除房型图片
 */
router.delete("/room-types/:roomTypeId/images/:imageId", authenticateToken, authorizeRoles("merchant"), async (req, res) => {
    try {
        const { roomTypeId, imageId } = req.params;
        const merchantId = Number(req.user.id);

        const roomType = await prisma.hotel_room_type.findUnique({
            where: { id: BigInt(roomTypeId) },
            include: { hotel: true }
        });

        if (!roomType || roomType.hotel.merchant_id !== merchantId) {
            return res.status(403).json({ error: "Permission denied", ok: false });
        }

        const image = await prisma.hotel_image.findUnique({
            where: { id: BigInt(imageId) }
        });

        if (!image || image.room_type_id !== BigInt(roomTypeId)) {
            return res.status(404).json({ error: "Image not found", ok: false });
        }

        // 删除 OSS 上的文件
        if (image.image_url) {
            await deleteByUrl(image.image_url);
        }

        await prisma.hotel_image.delete({
            where: { id: BigInt(imageId) }
        });

        return res.json({ ok: true, message: "Image deleted successfully" });
    } catch (error) {
        console.error("Error deleting room type image:", error);
        return res.status(500).json({ error: error.message || "Internal server error", ok: false });
    }
});

export default router;
