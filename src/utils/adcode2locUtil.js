
import {prisma} from '../config/prisma.js';
import { GAODE_API_KEY } from './util.js';

// 根据行政区划代码获取经纬度 调用 api
async function apiGetlocation(adcode) {
    const params = new URLSearchParams({
        key: GAODE_API_KEY,
        subdistrict: 0,
        keywords: adcode}
    );
    const rep = await fetch(`https://restapi.amap.com/v3/config/district?${params.toString()}`);
    const data = await rep.json();
    return data.districts[0]?.center.split(','); // [lon, lat]
}

export async function getLocationByAdcode(adcode) {
    const record = await prisma.area_adcode_location.findUnique({
        where: {
            adcode: adcode
        }
    });
    if(!record){
        // 数据库中没有，调用API获取
        console.log('数据库中没有该adcode，调用API获取:', adcode);
        const location = await apiGetlocation(adcode);
        if(location && location.length === 2){
            // 存入数据库
            await prisma.area_adcode_location.create({
                data: {
                    adcode: adcode,
                    lon: location[0],
                    lat: location[1]
                }
            });
            return { lon: location[0], lat: location[1] };
        } else {
            return null;
        }
    }
    return { lon: record.lon, lat: record.lat };
}
