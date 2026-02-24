import { esClient, createIndexIfNotExists, bulkIndex } from '../config/elasticsearchConfig.js';
import { prisma } from '../config/prisma.js';
import { ParseAddress } from 'address-parse';

/**
 * 解析地址获取城市名称
 */
function parseCityFromAddress(address) {
    if (!address) return null;
    try {
        const result = new ParseAddress(address);
        if (result && result.length > 0) {
            return result[0].city || null;
        }
    } catch (e) {
        console.error('解析地址失败:', e);
    }
    return null;
}

/**
 * 酒店索引映射配置
 */
const hotelMappings = {
    properties: {
        id: { type: 'keyword' },
        name: {
            type: 'text',
            analyzer: 'standard',
            fields: {
                keyword: { type: 'keyword' }
            }
        },
        address: {
            type: 'text',
            analyzer: 'standard'
        },
        city: { type: 'keyword' },  // 城市名称
        location: { type: 'geo_point' },  // 地理位置
        star: { type: 'integer' },
        min_price: { type: 'float' },
        adcode: { type: 'keyword' },
        geohash: { type: 'keyword' },
        audit_status: { type: 'integer' },
        status: { type: 'integer' },
        merchant_id: { type: 'integer' },
        desc: { type: 'text' },
        phone: { type: 'keyword' },
        name_en: { type: 'text' },
        banner_urls: { type: 'keyword' },  // Banner 图片 URL 数组
        created_at: { type: 'date' },
        updated_at: { type: 'date' }
    }
};

/**
 * 初始化酒店索引
 */
export async function initHotelIndex() {
    try {
        await createIndexIfNotExists('hotels', hotelMappings);
        console.log('✅ Hotel index initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize hotel index:', error);
        return false;
    }
}

/**
 * 同步单个酒店到 Elasticsearch
 * @param {BigInt} hotelId - 酒店ID
 */
export async function syncHotelToES(hotelId) {
    try {
        const hotelIdBigInt = BigInt(hotelId);
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelIdBigInt },
            include: { hotel_info: true }
        });

        if (!hotel) {
            throw new Error('Hotel not found');
        }

        // 获取酒店的 Banner 图片
        const bannerImages = await prisma.hotel_image.findMany({
            where: {
                hotel_id: hotelIdBigInt,
                image_type: 0  // Banner 类型
            },
            orderBy: { sort_order: 'asc' },
            select: { image_url: true }
        });

        const bannerUrls = bannerImages.map(img => img.image_url);

        const document = {
            id: hotel.id.toString(),
            name: hotel.name,
            address: hotel.address,
            city: parseCityFromAddress(hotel.address),
            location: hotel.latitude && hotel.longitude ? {
                lat: parseFloat(hotel.latitude),
                lon: parseFloat(hotel.longitude)
            } : null,
            star: hotel.star,
            min_price: parseFloat(hotel.min_price),
            adcode: hotel.adcode,
            geohash: hotel.geohash,
            audit_status: hotel.audit_status,
            status: hotel.status,
            merchant_id: hotel.merchant_id,
            desc: hotel.hotel_info?.desc,
            phone: hotel.hotel_info?.phone,
            name_en: hotel.hotel_info?.name_en,
            banner_urls: bannerUrls,
            created_at: hotel.created_at,
            updated_at: hotel.updated_at
        };

        await esClient.index({
            index: 'hotels',
            id: document.id,
            document,
            refresh: true
        });

        console.log(`✅ Hotel ${hotelId} synced to ES (with ${bannerUrls.length} banners)`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to sync hotel ${hotelId}:`, error);
        throw error;
    }
}

/**
 * 同步所有酒店到 Elasticsearch
 * @param {Object} options - 选项
 * @param {boolean} options.onlyApproved - 是否只同步审核通过的酒店，默认 false
 */
export async function syncAllHotelsToES(options = {}) {
    const { onlyApproved = false } = options;

    try {
        console.log('🔄 Starting to sync hotels to Elasticsearch...');

        // 查询条件
        const where = onlyApproved 
            ? { audit_status: 1, status: 1 }  // 只同步审核通过且上架的
            : {};  // 同步所有酒店

        const hotels = await prisma.hotel.findMany({
            where,
            include: { hotel_info: true }
        });

        console.log(`📊 Found ${hotels.length} hotels to sync`);

        if (hotels.length === 0) {
            console.log('ℹ️  No hotels to sync');
            return { synced: 0, total: 0 };
        }

        // 获取所有酒店的 Banner 图片
        const hotelIds = hotels.map(h => h.id);
        const allBanners = await prisma.hotel_image.findMany({
            where: {
                hotel_id: { in: hotelIds },
                image_type: 0  // Banner 类型
            },
            orderBy: { sort_order: 'asc' },
            select: {
                hotel_id: true,
                image_url: true
            }
        });

        // 按酒店ID分组 Banner
        const bannersByHotel = allBanners.reduce((acc, banner) => {
            const hotelId = banner.hotel_id.toString();
            if (!acc[hotelId]) {
                acc[hotelId] = [];
            }
            acc[hotelId].push(banner.image_url);
            return acc;
        }, {});

        // 转换为 ES 文档格式
        const documents = hotels.map(hotel => ({
            id: hotel.id.toString(),
            name: hotel.name,
            address: hotel.address,
            city: parseCityFromAddress(hotel.address),
            location: hotel.latitude && hotel.longitude ? {
                lat: parseFloat(hotel.latitude),
                lon: parseFloat(hotel.longitude)
            } : null,
            star: hotel.star,
            min_price: parseFloat(hotel.min_price),
            adcode: hotel.adcode,
            geohash: hotel.geohash,
            audit_status: hotel.audit_status,
            status: hotel.status,
            merchant_id: hotel.merchant_id,
            desc: hotel.hotel_info?.desc,
            phone: hotel.hotel_info?.phone,
            name_en: hotel.hotel_info?.name_en,
            banner_urls: bannersByHotel[hotel.id.toString()] || [],
            created_at: hotel.created_at,
            updated_at: hotel.updated_at
        }));

        // 批量索引
        await bulkIndex('hotels', documents);

        console.log(`✅ Successfully synced ${hotels.length} hotels to Elasticsearch`);
        return { synced: hotels.length, total: hotels.length };
    } catch (error) {
        console.error('❌ Failed to sync hotels:', error);
        throw error;
    }
}

/**
 * 从 Elasticsearch 删除酒店
 * @param {BigInt} hotelId - 酒店ID
 */
export async function deleteHotelFromES(hotelId) {
    try {
        await esClient.delete({
            index: 'hotels',
            id: hotelId.toString(),
            refresh: true
        });

        console.log(`✅ Hotel ${hotelId} deleted from ES`);
        return true;
    } catch (error) {
        if (error.meta?.statusCode === 404) {
            console.log(`ℹ️  Hotel ${hotelId} not found in ES`);
            return true;
        }
        console.error(`❌ Failed to delete hotel ${hotelId}:`, error);
        throw error;
    }
}

/**
 * 更新 Elasticsearch 中的酒店信息
 * @param {BigInt} hotelId - 酒店ID
 */
export async function updateHotelInES(hotelId) {
    try {
        await syncHotelToES(hotelId);
        console.log(`✅ Hotel ${hotelId} updated in ES`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to update hotel ${hotelId}:`, error);
        throw error;
    }
}
