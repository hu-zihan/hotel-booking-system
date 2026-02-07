import express from 'express';
import { prisma } from '../config/prisma.js';
import ngeohash from 'ngeohash';
import {ParseAddress} from 'address-parse';
import { haversine } from '../utils/util.js';
const router = express.Router();
// Try multiple precisions (from fine -> coarse) and pick nearest candidate in JS
async function findAreaByLatLng(lat, lon){
    // precisions: try finer first, then broader prefixes
    const precisions = [6,5,4];
    for(const p of precisions){
        const center = ngeohash.encode(lat, lon, p);
        const neighbors = ngeohash.neighbors(center);
        neighbors.push(center);
        // query for any area whose geohash starts with any of these prefixes
        const whereOr = neighbors.map(h => ({ geohash: { startsWith: h } }));
        const candidates = await prisma.area_adcode_location.findMany({
            where: { OR: whereOr },
            take: 50 // limit safety
        });
        if(candidates && candidates.length){
            // compute distance for candidates that have lat/lon
            const scored = candidates
                .map(c => {
                    const clat = parseFloat(c.lat);
                    const clon = parseFloat(c.lon);
                    if(Number.isFinite(clat) && Number.isFinite(clon)){
                        return { item: c, dist: haversine(lat, lon, clat, clon) };
                    }
                    return null;
                })
                .filter(Boolean)
                .sort((a,b) => a.dist - b.dist);
            if(scored.length) return scored[0].item;
            // if no lat/lon present, just return first candidate
            return candidates[0];
        }
    }
    return null;
}
router.get("/location",async (req,res)=>{
    const {latitude,longitude} = req.query;
    if(!latitude || !longitude){
        return res.status(400).json({error: "Missing latitude or longitude parameters"});
    }
    const lat = Number(latitude);
    const lon = Number(longitude);
    if(!Number.isFinite(lat) || !Number.isFinite(lon)){
        return res.status(400).json({error: "Invalid latitude or longitude"});
    }
    try{
        // 1) try to find matching area record with multi-precision fallback
        const cityRaw = await findAreaByLatLng(lat, lon);
        if(cityRaw){
            const parsed = new ParseAddress(cityRaw.desc || '')[0] || {};
            const city_adcode = (parsed.city && new ParseAddress(parsed.city)[0]?.code) || cityRaw.adcode || null;
            return res.json({ ok: true, location: { city: parsed.city || '', adcode: city_adcode } });
        }
        // 3) optional: could call an external reverse-geocoding service here if configured
        return res.status(404).json({ error: "No location data found for the given coordinates" });
    }catch(err){
        console.error('location lookup error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;