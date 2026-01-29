import express from 'express';
import { prisma } from '../config/prisma.js';
const router = express.Router();

// Define your hotel-related routes here
router.get("/list",(req,res)=>{
    res.json({message: "List of hotels"});
});
router.post("/add",(req,res)=>{
    const {name} = req.body;
    console.log('收到的 name:', name);
    console.log('完整的请求体:', req.body);
    prisma.test_table.create({
        data: { name }
    }).then((result)=>{
        console.log("Hotel added:", result);
        res.json({message: "Hotel added", hotel: result});
    }).catch((error)=>{
        res.status(500).json({error: "Failed to add hotel"});
    });
})
export default router;