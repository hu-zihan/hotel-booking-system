
import { GeoHash } from "geohash";
import { prisma } from "../config/prisma.js";
import ngeohash from 'ngeohash';
import { mergeSameStation } from "./util.js";
import { upload as uploadToOSS, deleteByUrl } from "./ossUtils.js";
/**
 * 添加酒店
 * 
 * 必要字段（POST 请求体）：
 * {
 *   name: string,              // 酒店名称（必填）
 *   address: string,           // 详细地址（必填）
 *   latitude?: number,         // 纬度（选填，审核后可通过高德API补充）
 *   longitude?: number,        // 经度（选填，审核后可通过高德API补充）
 *   phone?: string,            // 联系电话
 *   nameEn?: string,           // 英文名称
 *   desc?: string,             // 酒店简介
 *   openDate?: string,         // 开业时间 (YYYY-MM-DD)
 *   star?: number,             // 星级 0~5
 *   minPrice?: number,         // 最低价
 *   adcode?: string,           // 行政区划代码
 *   merchant_id?: BigInt,      // 商户ID（添加酒店时可选，用于标识商户）
 * }
 * 
 * 返回值：
 * {
 *   hotel: {酒店记录},
 *   hotelInfo: {酒店扩展信息},
 *   success: true,
 *   message: string
 * }
 */
export async function addHotel(hotelData) {
    // 验证必填字段
    const { name, address } = hotelData;
    if (!name || !address) {
        throw new Error('缺少必填字段: name, address');
    }
    
    try {
        const { latitude, longitude, merchant_id } = hotelData;
        
        // 计算 geohash (仅当有坐标时)
        let geohash = null;
        if (latitude !== undefined && longitude !== undefined) {
            geohash = ngeohash.encode(latitude, longitude, 12);
        }

        // 开启事务，同时写入 hotel 和 hotel_info
        const result = await prisma.$transaction(async (tx) => {
            // 1. 创建酒店主记录
            const hotel = await tx.hotel.create({
                data: {
                    name: name,
                    address: address,
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                    geohash: geohash || '',
                    adcode: hotelData.adcode || null,
                    star: hotelData.star || 0,
                    min_price: hotelData.minPrice || 0,
                    merchant_id: merchant_id || null,  // 如果提供了商户ID，则关联
                    audit_status: 0,  // 默认待审核
                    status: 0,        // 默认下架
                }
            });

            // 2. 创建酒店扩展信息记录
            const hotelInfo = await tx.hotel_info.create({
                data: {
                    hotel_id: hotel.id,
                    name_en: hotelData.nameEn || null,
                    phone: hotelData.phone || null,
                    open_date: hotelData.openDate ? new Date(hotelData.openDate) : null,
                    desc: hotelData.desc || null,
                }
            });

            return {
                hotel: {
                    ...hotel,
                    id: hotel.id.toString() // 将 BigInt 转换为字符串
                },
                hotelInfo: {
                    ...hotelInfo,
                    hotel_id: hotelInfo.hotel_id.toString()
                },
                success: true,
                message: `酒店 "${name}" 已提交审核，ID: ${hotel.id}`
            };
        });

        return result;
    } catch (error) {
        console.error('添加酒店失败:', error);
        throw error;
    }
}
export async function getHotelById(hotelId) {
    const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        include: {
            hotel_info: true,
        }
    })
    
    if (!hotel) {
        throw new Error('酒店不存在');
    }
    
    // 获取所有图片
    const hotelImage = await prisma.hotel_image.findMany({
        where: { hotel_id: hotel.id },
        select: {
            id: true,
            image_url: true,
            image_type: true,
            room_type_id: true,
            sort_order: true
        },
        orderBy: { sort_order: 'asc' }
    });
    
    // 分类图片
    // image_type: 0 = banner, 2 = details, 1 = room_type
    const bannerUrls = hotelImage
        .filter(img => img.image_type === 0)
        .map(img => img.image_url);
    
    // 房型图片按 room_type_id 分组
    const roomTypeImages = hotelImage
        .filter(img => img.room_type_id !== null)
        .reduce((acc, img) => {
            const roomTypeId = img.room_type_id.toString();
            if (!acc[roomTypeId]) {
                acc[roomTypeId] = [];
            }
            acc[roomTypeId].push(img.image_url);
            return acc;
        }, []);
    
    return {
        ...hotel,
        id: hotel.id.toString(), // BigInt 转字符串
        images: {
            bannerUrls,      // Banner 图片 URL 数组
            roomTypeImages   // 房型图片对象 { roomTypeId: [url1, url2, ...] }
        }
    };
}
function geohashCandidate(lat,lon,precision=6){
    const center = ngeohash.encode(lat,lon,precision);
    const hashNeighbors = ngeohash.neighbors(center);
    return [center,...hashNeighbors];
}
export async function searchHotelStationById(hotel_id) {
    const hotel = await prisma.hotel.findUnique({
        where: { id: hotel_id },
    })
    
    if (!hotel || !hotel.latitude || !hotel.longitude) {
        throw new Error('酒店坐标信息不完整,缺乏地址解析功能');
    }
    
    const candidates = geohashCandidate(hotel.latitude, hotel.longitude, 5);
    const stations = await prisma.station.findMany({
        where: {
            OR: candidates.map((gh) => ({
                geohash: { startsWith: gh }
            }))
        }
    });
    
    const result = stations
        .map((s) => ({
            ...s,
            id: s.id.toString(), // 转换 BigInt 为字符串
            distance: distanceMeter(
                hotel.latitude,
                hotel.longitude,
                s.latitude_d,
                s.longitude_d
            ),
        }))
        .filter((s) => s.distance !== null && s.distance <= 2000)
        .sort((a, b) => a.distance - b.distance);
    return mergeSameStation(result).filter(value => value.distance <= 800);
}
// 计算两点间距离（米）
function distanceMeter(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * 上传酒店 Banner 图片
 * 
 * @param {BigInt} hotelId - 酒店ID
 * @param {Buffer} fileBuffer - 文件Buffer（来自multer）
 * @param {string} originalName - 原始文件名
 * @param {number} sortOrder - 排序顺序，默认为0
 * @returns {Promise<{url: string, imageRecord: object}>} 图片URL和数据库记录
 */
export async function uploadHotelBanner(hotelId, fileBuffer, originalName, sortOrder = 0, image_type = 0) {
    if (!hotelId || !fileBuffer) {
        throw new Error('缺少必填参数: hotelId 或 fileBuffer');
    }

    // 验证酒店是否存在
    const hotel = await prisma.hotel.findUnique({
        where: { id: BigInt(hotelId) }
    });

    if (!hotel) {
        throw new Error('酒店不存在');
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const ext = originalName.split('.').pop();
    const fileName = `hotels/${hotelId}/banner_${timestamp}.${ext}`;

    // 上传到 OSS
    const uploadResult = await uploadToOSS(fileBuffer, fileName);

    // 保存到数据库（image_type: 0 = banner 1 = roomType, 2 = detail）
    const imageRecord = await prisma.hotel_image.create({
        data: {
            hotel_id: Number(hotelId),
            image_url: uploadResult.url,
            image_type: image_type,  // banner 类型
            sort_order: sortOrder
        }
    });

    return {
        url: uploadResult.url,
        imageRecord: {
            ...imageRecord,
            id: imageRecord.id.toString(),
            hotel_id: imageRecord.hotel_id.toString()
        }
    };
}

/**
 * 更新酒店信息（商户编辑页面使用）
 * 
 * @param {BigInt} hotelId - 酒店ID
 * @param {Object} updateData - 更新数据
 * @param {string} updateData.name - 酒店名称
 * @param {string} updateData.address - 详细地址
 * @param {number} updateData.latitude - 纬度
 * @param {number} updateData.longitude - 经度
 * @param {string} updateData.adcode - 行政区划代码
 * @param {number} updateData.star - 星级 0~5
 * @param {number} updateData.minPrice - 最低价
 * @param {string} updateData.nameEn - 英文名称
 * @param {string} updateData.phone - 联系电话
 * @param {string} updateData.openDate - 开业时间 (YYYY-MM-DD)
 * @param {string} updateData.desc - 酒店简介
 * @returns {Promise<{hotel: object, hotelInfo: object, success: boolean, message: string}>}
 */
export async function updateHotel(hotelId, updateData) {
    if (!hotelId) {
        throw new Error('缺少必填参数: hotelId');
    }

    try {
        // 验证酒店是否存在
        const existingHotel = await prisma.hotel.findUnique({
            where: { id: BigInt(hotelId) },
            include: { hotel_info: true }
        });

        if (!existingHotel) {
            throw new Error('酒店不存在');
        }

        const { latitude, longitude } = updateData;
        
        // 如果坐标更新了，重新计算 geohash
        let geohash = existingHotel.geohash;
        if (latitude !== undefined && longitude !== undefined) {
            geohash = ngeohash.encode(parseFloat(latitude), parseFloat(longitude), 12);
        }

        // 开启事务，同时更新 hotel 和 hotel_info
        const result = await prisma.$transaction(async (tx) => {
            // 准备 hotel 表的更新数据
            const hotelUpdateData = {};
            if (updateData.name !== undefined) hotelUpdateData.name = updateData.name;
            if (updateData.address !== undefined) hotelUpdateData.address = updateData.address;
            if (updateData.latitude !== undefined) hotelUpdateData.latitude = parseFloat(updateData.latitude);
            if (updateData.longitude !== undefined) hotelUpdateData.longitude = parseFloat(updateData.longitude);
            if (updateData.adcode !== undefined) hotelUpdateData.adcode = updateData.adcode;
            if (updateData.star !== undefined) hotelUpdateData.star = updateData.star;
            if (updateData.minPrice !== undefined) hotelUpdateData.min_price = updateData.minPrice;
            if (geohash !== existingHotel.geohash) hotelUpdateData.geohash = geohash;
            hotelUpdateData.updated_at = new Date();

            // 1. 更新酒店主记录
            const hotel = await tx.hotel.update({
                where: { id: BigInt(hotelId) },
                data: hotelUpdateData
            });

            // 准备 hotel_info 表的更新数据
            const infoUpdateData = {};
            if (updateData.nameEn !== undefined) infoUpdateData.name_en = updateData.nameEn;
            if (updateData.phone !== undefined) infoUpdateData.phone = updateData.phone;
            if (updateData.openDate !== undefined) {
                infoUpdateData.open_date = updateData.openDate ? new Date(updateData.openDate) : null;
            }
            if (updateData.desc !== undefined) infoUpdateData.desc = updateData.desc;
            infoUpdateData.updated_at = new Date();

            // 2. 更新酒店扩展信息记录
            const hotelInfo = await tx.hotel_info.update({
                where: { hotel_id: BigInt(hotelId) },
                data: infoUpdateData
            });

            return {
                hotel: {
                    ...hotel,
                    id: hotel.id.toString()
                },
                hotelInfo: {
                    ...hotelInfo,
                    hotel_id: hotelInfo.hotel_id.toString()
                },
                success: true,
                message: `酒店 "${hotel.name}" 信息已更新`
            };
        });

        return result;
    } catch (error) {
        console.error('更新酒店失败:', error);
        throw error;
    }
}