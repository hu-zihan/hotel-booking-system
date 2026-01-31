import dotenv from 'dotenv';
dotenv.config();
import { ParseAddress } from 'address-parse';
export const GAODE_API_KEY = process.env.GAODE_API_KEY;
// 调用高德地图API获取地理编码 类型列表
async function getLocationFromAmap(address) {
    const params = new URLSearchParams({
        key: GAODE_API_KEY,
        address: address,
    });
    const rep = await fetch(`https://restapi.amap.com/v3/geocode/geo?${params.toString()}`);
    console.log('调用高德地图API解析地址:', `https://restapi.amap.com/v3/geocode/geo?${params.toString()}`);
    const data = await rep.json();  // 需要 await
    console.log('高德API返回:', data);
    return data;   
}
// 解析地址，返回行政区划代码列表 loc: 地址字符串
// example: "北京市朝阳区望京街道" --> ["110105"]
// example : 南村镇 --> multi
export async function getLocation(loc){
    const addressList = new ParseAddress(loc);
    const codeList = [];
    
    // ParseAddress 返回的是数组，取第一个结果
    if(!addressList || addressList.length === 0){
        console.log('本地解析失败，调用高德API...');
        const amapResult = await getLocationFromAmap(loc);
        if(amapResult && amapResult.geocodes && amapResult.geocodes.length > 0){
            for(const item of amapResult.geocodes){
                if(item.adcode){
                    codeList.push(item.adcode);
                }
            }
        }
        return codeList;
    }
    const address = addressList[0];
    // 检查是否精确到区级
    if(address.area && String(address.area).trim() !== ''){
        console.log('本地解析精确到区，直接返回');
        codeList.push(address.code);
        return codeList;
    }
    
    console.log('本地解析未到区级，调用高德API...');
    const amapResult = await getLocationFromAmap(loc);
    if(amapResult && amapResult.geocodes && amapResult.geocodes.length > 0){
        for(const item of amapResult.geocodes){
            if(item.adcode){
                codeList.push(item.adcode);
            }
        }
    }
    return codeList;
}   
export function mergeSameStation(stations) {
    const stationMap = {};  // 改用普通对象
    
    for (let station of stations) {
        if (!stationMap[station.cn_name]) {
            // 首次遇到该站点
            stationMap[station.cn_name] = {
                cn_name: station.cn_name,
                en_name: station.en_name,
                distance: station.distance,
                line_name: [station.line_name],
                line_color: [station.line_color],
            };
        } else {
            // 已存在同名站点，合并线路信息
            const existing = stationMap[station.cn_name];
            existing.line_name.push(station.line_name);
            existing.line_color.push(station.line_color);
        }
    }
    
    // 转换为数组并按最小距离排序
    return Object.values(stationMap).sort((a, b) => a.distance - b.distance);
}



// // test
// const locatins_list = [
//     "北京市朝阳区望京街道",
//     "上海市浦东新区世纪大道100号",
//     "广州市天河区体育西路",
//     "深圳市南山区深南大道1001号",
//     "杭州市西湖区文三路90号",
//     "成都市武侯区人民南路四段",
//     "重庆市渝中区解放碑街道",
//     "武汉市洪山区珞喻路",
//     "西安市雁塔区小寨东路",
//     "南京市鼓楼区中央路",
//     "南村镇",
// ]
// for(const loc of locatins_list){
//     getLocation(loc).then(codes=>{
//         console.log(`地址: ${loc} => 行政区划代码:`, codes);
//     });
// }