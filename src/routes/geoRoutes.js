import express from 'express';
import { prisma } from '../config/prisma.js';
import ngeohash from 'ngeohash';
import {ParseAddress} from 'address-parse';
import { ok } from 'node:assert';
const router = express.Router();
router.get("/location",async (req,res)=>{
        const {latitude,longitude} = req.query;
        if(!latitude || !longitude){
            return res.status(400).json({error: "Missing latitude or longitude parameters"});
        }
        const center = ngeohash.encode(Number(latitude),Number(longitude),5);
        const hash = ngeohash.neighbors(center);
        hash.push(center);
        const cityRaw = await prisma.area_adcode_location.findFirst({
            where: {
                OR: hash.map(h=>{
                    return {
                        geohash: {
                            startsWith: h
                        }
                    }
                })
            },
        });
        if(!cityRaw){
            return res.status(404).json({error: "No location data found for the given coordinates"});
        }
        const parsedRaw = new ParseAddress(cityRaw.desc)[0];
        const city_adcode = new ParseAddress(parsedRaw.city)[0]?.code;
        res.json({
            ok: true,
            location:{city: parsedRaw.city, adcode: city_adcode}
        });
        
    });
export default router;