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
router.post("/auditHotel", authenticateToken, authorizeRoles("auditor"), async (req, res) => {
    const { hotelIdList, status } = req.body;

    if (!hotelIdList || status === undefined) {
        return res.status(400).json({
            error: "Missing required fields",
            ok: false
        });
    }

    try {
        const hotel = await prisma.hotel.findUnique({
            where: { id: BigInt(hotelId) }
        });

        if (!hotel) {
            return res.status(404).json({
                error: "Hotel not found",
                ok: false
            });
        }

        // 更新酒店审核状态
        hotel.audit_status = status;
        await prisma.hotel.update({
            where: { id: hotel.id },
            data: hotel
        });

        return res.json({
            message: "Hotel audit status updated successfully",
            ok: true
        });
    } catch (error) {
        console.error("Error auditing hotel:", error);
        return res.status(500).json({
            error: "Failed to audit hotel",
            ok: false
        });
    }
});
export default router;