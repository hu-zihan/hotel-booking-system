import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Elasticsearch 客户端配置
 * 基于 docker-compose.yml 中的配置
 */
const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    // 由于 docker-compose 中 xpack.security.enabled=false，所以不需要认证
    auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD 
        ? {
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD
        }
        : undefined,
    // 请求超时设置
    requestTimeout: 30000,
    // 重试设置
    maxRetries: 3,
    // 连接池设置
    compression: 'gzip'
});

/**
 * 测试 Elasticsearch 连接
 */
export async function testESConnection() {
    try {
        const health = await esClient.cluster.health();
        console.log('✅ Elasticsearch connected successfully');
        console.log('Cluster status:', health.status);
        console.log('Number of nodes:', health.number_of_nodes);
        return true;
    } catch (error) {
        console.error('❌ Elasticsearch connection failed:', error.message);
        return false;
    }
}

/**
 * 创建索引（如果不存在）
 * @param {string} indexName - 索引名称
 * @param {object} mappings - 索引映射配置
 */
export async function createIndexIfNotExists(indexName, mappings) {
    try {
        const exists = await esClient.indices.exists({ index: indexName });
        
        if (!exists) {
            await esClient.indices.create({
                index: indexName,
                body: {
                    settings: {
                        number_of_shards: 1,
                        number_of_replicas: 0,
                        analysis: {
                            analyzer: {
                                ik_max_word_analyzer: {
                                    type: 'standard'  // 如果安装了 IK 分词器，可以改为 'ik_max_word'
                                },
                                ik_smart_analyzer: {
                                    type: 'standard'  // 如果安装了 IK 分词器，可以改为 'ik_smart'
                                }
                            }
                        }
                    },
                    mappings: mappings
                }
            });
            console.log(`✅ Index "${indexName}" created successfully`);
        } else {
            console.log(`ℹ️  Index "${indexName}" already exists`);
        }
    } catch (error) {
        console.error(`❌ Failed to create index "${indexName}":`, error.message);
        throw error;
    }
}

/**
 * 删除索引
 * @param {string} indexName - 索引名称
 */
export async function deleteIndex(indexName) {
    try {
        await esClient.indices.delete({ index: indexName });
        console.log(`✅ Index "${indexName}" deleted successfully`);
    } catch (error) {
        console.error(`❌ Failed to delete index "${indexName}":`, error.message);
        throw error;
    }
}

/**
 * 批量索引文档
 * @param {string} indexName - 索引名称
 * @param {array} documents - 文档数组
 */
export async function bulkIndex(indexName, documents) {
    try {
        const body = documents.flatMap(doc => [
            { index: { _index: indexName, _id: doc.id } },
            doc
        ]);

        const result = await esClient.bulk({ refresh: true, body });
        
        if (result.errors) {
            const erroredDocuments = [];
            result.items.forEach((action, i) => {
                const operation = Object.keys(action)[0];
                if (action[operation].error) {
                    erroredDocuments.push({
                        status: action[operation].status,
                        error: action[operation].error,
                        document: documents[i]
                    });
                }
            });
            console.error('❌ Bulk indexing errors:', erroredDocuments);
        }
        
        console.log(`✅ Bulk indexed ${documents.length} documents to "${indexName}"`);
        return result;
    } catch (error) {
        console.error('❌ Bulk indexing failed:', error.message);
        throw error;
    }
}

export { esClient };
export default esClient;
