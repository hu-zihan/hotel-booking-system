import { esClient, createIndexIfNotExists, bulkIndex } from '../config/elasticsearchConfig.js';
import { prisma } from '../config/prisma.js';

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
        const hotel = await prisma.hotel.findUnique({
            where: { id: BigInt(hotelId) },
            include: { hotel_info: true }
        });

        if (!hotel) {
            throw new Error('Hotel not found');
        }

        const document = {
            id: hotel.id.toString(),
            name: hotel.name,
            address: hotel.address,
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
            created_at: hotel.created_at,
            updated_at: hotel.updated_at
        };

        await esClient.index({
            index: 'hotels',
            id: document.id,
            document,
            refresh: true
        });

        console.log(`✅ Hotel ${hotelId} synced to ES`);
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

        // 转换为 ES 文档格式
        const documents = hotels.map(hotel => ({
            id: hotel.id.toString(),
            name: hotel.name,
            address: hotel.address,
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
