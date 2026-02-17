
import { GeoHash } from "geohash";
import { prisma } from "../config/prisma.js";
import ngeohash from 'ngeohash';
import { mergeSameStation } from "./util.js";
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
    
    return {
            ...hotel,
            id: hotel.id.toString() // BigInt 转字符串
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