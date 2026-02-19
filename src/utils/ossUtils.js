import OSS from "ali-oss";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();
const client = new OSS({
  // 从环境变量中获取访问凭证。运行本代码示例之前，请确保已设置环境变量OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET。
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  // yourRegion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
  region: 'oss-cn-hangzhou',
  //使用V4签名
  authorizationV4: true,
  // yourBucketName填写Bucket名称。
  bucket: 'yisu-hotel',
  // yourEndpoint填写Bucket所在地域对应的内网Endpoint。以华东1（杭州）为例，Endpoint填写为https://oss-cn-hangzhou-internal.aliyuncs.com。
  endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
});
async function put(file) {
    try {
        console.log('Starting file upload... current Path is:', process.cwd());
        const result = await client.put('hotels/test.txt', path.join(process.cwd(), 'test.txt'));
        console.log('Upload successful:', result);
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}
export async function upload(file, fileName) {
    try {
        console.log("starting file upload...");
        
        // 支持 Buffer 和 文件路径
        let uploadData;
        if (Buffer.isBuffer(file)) {
            uploadData = file;
        } else if (typeof file === 'string') {
            uploadData = path.join(process.cwd(), file);
        } else {
            uploadData = file;
        }
        
        const result = await client.put(fileName, uploadData);
        console.log("Upload successful:", result);
        
        return { url: result.url, ...result };
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

/**
 * 根据文件 URL 删除 OSS 中的文件
 * @param {string} fileUrl - OSS 文件的完整 URL (从数据库中获取)
 * @returns {Promise<boolean>} 删除是否成功
 */
export async function deleteByUrl(fileUrl) {
    try {
        if (!fileUrl) {
            throw new Error('文件 URL 不能为空');
        }

        // 从 URL 中提取文件路径
        // 例如: https://yisu-hotel.oss-cn-hangzhou.aliyuncs.com/hotels/123/banner_1234567890.jpg
        // 提取出: hotels/123/banner_1234567890.jpg
        const url = new URL(fileUrl);
        const fileName = url.pathname.substring(1); // 去掉开头的 /

        console.log(`Deleting file from OSS: ${fileName}`);
        
        const result = await client.delete(fileName);
        
        if (result.res && result.res.status === 204) {
            console.log(`File deleted successfully: ${fileName}`);
            return true;
        }
        
        throw new Error(`Failed to delete file, status code: ${result.res?.status}`);
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
}

/**
 * 根据文件名删除 OSS 中的文件
 * @param {string} fileName - OSS 中的文件路径 (例如: hotels/123/banner_1234567890.jpg)
 * @returns {Promise<boolean>} 删除是否成功
 */
export async function deleteByFileName(fileName) {
    try {
        if (!fileName) {
            throw new Error('文件名不能为空');
        }

        console.log(`Deleting file from OSS: ${fileName}`);
        
        const result = await client.delete(fileName);
        
        if (result.res && result.res.status === 204) {
            console.log(`File deleted successfully: ${fileName}`);
            return true;
        }
        
        throw new Error(`Failed to delete file, status code: ${result.res?.status}`);
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
}