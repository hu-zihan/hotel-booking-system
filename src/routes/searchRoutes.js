import express from 'express';
import { esClient } from '../config/elasticsearchConfig.js';
import { getLocation } from '../utils/util.js';

const router = express.Router();

/**
 * 搜索酒店
 *
 * 查询参数：
 * - q: 搜索关键词（比如"万豪""西湖"）
 * - page: 页码，默认 1
 * - pageSize: 每页数量，默认 10，最大 50
 * - city: 城市名称（如"上海"、"南京"）
 * - adcode: 行政区代码筛选
 * - minPrice: 最低价格
 * - maxPrice: 最高价格
 * - minStar: 最低星级（0-5）
 * - maxStar: 最高星级（0-5）
 * - latitude: 用户纬度
 * - longitude: 用户经度
 * - radiusKm: 距离影响半径（公里，默认 20）
 */
router.get('/hotels', async (req, res) => {
    try {
        const {
            q = '',
            page = 1,
            pageSize = 10,
            city,
            adcode,
            minPrice,
            maxPrice,
            minStar,
            maxStar,
            latitude,
            longitude,
            radiusKm = 20
        } = req.query;

        // 参数验证
        const pageNum = Math.max(1, parseInt(page));
        const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize)));
        const from = (pageNum - 1) * pageSizeNum;

        // 构建查询条件
        const must = [];
        const filter = [
            { term: { audit_status: 1 } },  // 只查询审核通过的
            { term: { status: 1 } }          // 只查询上架的
        ];
        const should = [];

        // 关键词搜索
        if (q && q.trim()) {
            must.push({
                multi_match: {
                    query: q.trim(),
                    fields: ['name^3', 'address^2', 'desc'],  // name 权重最高
                    type: 'best_fields',
                    operator: 'or',
                    fuzziness: 'AUTO'  // 支持模糊匹配
                }
            });
        }

        // 行政区代码筛选
        if (adcode) {
            filter.push({ term: { adcode } });
        }

        // 城市名称筛选 - 通过 getLocation 获取 adcode
        if (city && !adcode) {
            try {
                const adcodes = await getLocation(city);
                if (adcodes && adcodes.length > 0) {
                    // 使用 prefix 查询匹配城市 adcode（省级或市级）
                    const primaryAdcode = adcodes[0];
                    if (primaryAdcode.length === 2) {
                        // 省级代码，如 "32" 匹配 32xxxxxx
                        filter.push({ prefix: { adcode: primaryAdcode } });
                    } else if (primaryAdcode.length === 4) {
                        // 市级代码，如 "3201" 匹配 3201xxxx
                        filter.push({ prefix: { adcode: primaryAdcode } });
                    } else {
                        // 区级代码精确匹配
                        filter.push({ term: { adcode: primaryAdcode } });
                    }
                }
            } catch (err) {
                console.error('获取城市adcode失败:', err);
            }
        }

        // 价格区间筛选
        if (minPrice || maxPrice) {
            const priceRange = {};
            if (minPrice) priceRange.gte = parseFloat(minPrice);
            if (maxPrice) priceRange.lte = parseFloat(maxPrice);
            filter.push({ range: { min_price: priceRange } });
        }

        // 星级区间筛选
        if (minStar || maxStar) {
            const starRange = {};
            if (minStar) starRange.gte = parseInt(minStar);
            if (maxStar) starRange.lte = parseInt(maxStar);
            filter.push({ range: { star: starRange } });
        }

        // 排序逻辑
        let sort = [];

        if (q && q.trim()) {
            // 有关键词时，先按相关性排序
            sort.push({ _score: 'desc' });
        }

        if (latitude && longitude) {
            const lat = parseFloat(latitude);
            const lon = parseFloat(longitude);
            const radius = parseFloat(radiusKm);

            // 添加距离过滤（可选，如果希望硬性限制距离）
            filter.push({
                geo_distance: {
                    distance: `${radius}km`,
                    location: { lat, lon }
                }
            });

            // 添加距离排序
            sort.push({
                _geo_distance: {
                    location: { lat, lon },
                    order: 'asc',
                    unit: 'km',
                    mode: 'min'
                }
            });
        }

        // 最后按价格排序
        sort.push({ min_price: 'asc' });

        // 构建完整查询
        const searchQuery = {
            index: 'hotels',
            body: {
                from,
                size: pageSizeNum,
                _source: [
                    'id', 'name', 'address', 'city', 'location', 'star', 'min_price',
                    'adcode', 'geohash', 'banner_urls', 'highlight'
                ],
                query: {
                    bool: {
                        must: must.length > 0 ? must : [{ match_all: {} }],
                        filter,
                        should
                    }
                },
                sort,
                // 高亮显示匹配的关键词
                highlight: q && q.trim() ? {
                    fields: {
                        name: {
                            pre_tags: ['<em>'],
                            post_tags: ['</em>']
                        },
                        address: {
                            pre_tags: ['<em>'],
                            post_tags: ['</em>']
                        }
                    }
                } : undefined
            }
        };

        // 执行搜索
        const result = await esClient.search(searchQuery);

        // 格式化返回结果
        const hotels = result.hits.hits.map(hit => {
            const hotel = { ...hit._source };
            
            // 添加距离信息（如果有地理位置排序）
            if (latitude && longitude && hit.sort) {
                hotel.distance = hit.sort[0];  // 第一个排序字段是距离
            }

            // 添加高亮信息
            if (hit.highlight) {
                hotel.highlight = hit.highlight;
            }

            return hotel;
        });

        // 城市匹配排在前面
        if (city) {
            const cityNoSuffix = city.replace(/市$/, '');
            hotels.sort((a, b) => {
                const aCity = a.city || '';
                const bCity = b.city || '';
                const aMatch = aCity === city || aCity === cityNoSuffix + '市' ? 1 : 0;
                const bMatch = bCity === city || bCity === cityNoSuffix + '市' ? 1 : 0;
                return bMatch - aMatch;
            });
        }

        // 返回结果
        res.json({
            ok: true,
            data: {
                hotels,
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    total: result.hits.total.value,
                    totalPages: Math.ceil(result.hits.total.value / pageSizeNum)
                },
                query: {
                    keyword: q,
                    city,
                    adcode,
                    priceRange: { minPrice, maxPrice },
                    starRange: { minStar, maxStar },
                    location: latitude && longitude ? { latitude, longitude, radiusKm } : null
                }
            }
        });

    } catch (error) {
        console.error('搜索失败:', error);
        
        // 如果是 ES 索引不存在的错误
        if (error.meta?.body?.error?.type === 'index_not_found_exception') {
            return res.status(503).json({
                ok: false,
                error: 'Search service not initialized. Please sync hotels to Elasticsearch first.',
                code: 'INDEX_NOT_FOUND'
            });
        }

        res.status(500).json({
            ok: false,
            error: error.message || 'Search failed'
        });
    }
});

/**
 * 获取搜索建议（自动补全）
 * 
 * 查询参数：
 * - q: 搜索关键词前缀
 * - limit: 返回数量，默认 5
 */
router.get('/hotels/suggest', async (req, res) => {
    try {
        const { q, limit = 5 } = req.query;

        if (!q || !q.trim()) {
            return res.json({
                ok: true,
                data: { suggestions: [] }
            });
        }

        const result = await esClient.search({
            index: 'hotels',
            body: {
                size: parseInt(limit),
                query: {
                    bool: {
                        must: [
                            {
                                multi_match: {
                                    query: q.trim(),
                                    fields: ['name^3', 'address'],
                                    type: 'phrase_prefix'
                                }
                            }
                        ],
                        filter: [
                            { term: { audit_status: 1 } },
                            { term: { status: 1 } }
                        ]
                    }
                },
                _source: ['id', 'name', 'address', 'star']
            }
        });

        const suggestions = result.hits.hits.map(hit => ({
            id: hit._source.id,
            name: hit._source.name,
            address: hit._source.address,
            star: hit._source.star
        }));

        res.json({
            ok: true,
            data: { suggestions }
        });

    } catch (error) {
        console.error('获取建议失败:', error);
        res.status(500).json({
            ok: false,
            error: error.message || 'Failed to get suggestions'
        });
    }
});

/**
 * 热门搜索关键词
 * 
 * 查询参数：
 * - limit: 返回数量，默认 10
 */
router.get('/hotels/popular', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // 聚合查询，获取热门酒店
        const result = await esClient.search({
            index: 'hotels',
            body: {
                size: parseInt(limit),
                query: {
                    bool: {
                        filter: [
                            { term: { audit_status: 1 } },
                            { term: { status: 1 } }
                        ]
                    }
                },
                sort: [
                    { star: 'desc' },
                    { min_price: 'asc' }
                ],
                _source: ['id', 'name', 'star', 'min_price', 'banner_urls', 'address', 'city']
            }
        });

        const popular = result.hits.hits.map(hit => ({
            id: hit._source.id,
            name: hit._source.name,
            star: hit._source.star,
            min_price: hit._source.min_price,
            banner_urls: hit._source.banner_urls,
            address: hit._source.address,
            city: hit._source.city
        }));

        res.json({
            ok: true,
            data: { popular }
        });

    } catch (error) {
        console.error('获取热门酒店失败:', error);
        res.status(500).json({
            ok: false,
            error: error.message || 'Failed to get popular hotels'
        });
    }
});

export default router;
