import express from 'express';
const router = express.Router();

// Define your hotel-related routes here
router.get("list",(res,req)=>{
    res.send("Hotel list");
});

export default router;