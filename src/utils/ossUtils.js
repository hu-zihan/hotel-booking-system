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
export async function upload(file) {
    try{
        console.log("starting file upload...");
        const result = await client.put("hotels/",file);
        console.log("Upload successful:", result);
        if(result.status === 200){
            return result.url;
        }
        throw new Error(`Failed to upload file, status code: ${result.status}`);
    }catch(error){
         console.error('Error uploading file:', error);
         throw error;
    }
}