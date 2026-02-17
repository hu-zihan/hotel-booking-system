import express from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
const router = express.Router();
router.get("/dashboard",authenticateToken,authorizeRoles("auditor"), async (req, res) => {
    try{
        const hotelNotAudit = await prisma.hotel.findMany({
            where : {audit_status: 0},
            select : {id:true,name:true,address:true}
        });
        res.json({
            hotelNotAudit: hotelNotAudit,
            ok : true
        });

    }
    catch(error){
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({error: "Failed to fetch dashboard data",ok:false});
    }
});
router.post("/hotels/:hotelId/audit", authenticateToken, authorizeRoles("auditor"), async (req, res) => {
    const { hotelId } = req.params;
    const {approved,reason} = req.body
    if (approved === undefined || typeof approved !== "boolean") {
        return res.status(400).json({ error: "Approved field is required and must boolean", ok: false });
    }
    if(!approved && (!reason || typeof reason !== "string")){
        return res.status(400).json({ error: "Reason is required when rejecting a hotel", ok: false });
    }
    try{
        const hotel = await prisma.hotel.findUnique({
            where : {id: BigInt(hotelId)}
        });
        if(!hotel){
            return res.status(404).json({error: "Hotel not found",ok:false});
        }
        const updatedHotel = await prisma.hotel.update({
            where : {id: BigInt(hotelId)},
            data : {
                audit_status: approved ? 1 : 2,
            }});
        
        // 记录审核日志
        await prisma.hotel_review_reason.create({
            data : {
                hotel_id: BigInt(hotelId),
                reason: reason || null,
                review_result: approved ? "pass" : "reject",
                operator_user_id: BigInt(req.user.id),
                action_type: "audit"
            }
        });
        return res.json({ok:true,message:`Hotel ${hotelId} ${approved ? "approved" : "rejected"} successfully`})
    }catch(error){
        console.error('审核酒店失败:', error);
        return res.status(500).json({ error: '审核酒店失败', ok: false ,error_details: error.message});
    }
});
router.post("/hotels/:hotelId/online", authenticateToken, authorizeRoles("auditor"), async (req, res) => {

});
export default router;