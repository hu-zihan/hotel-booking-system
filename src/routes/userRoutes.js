
import express from 'express';
import bcrypt from "bcrypt";
import multer from 'multer';
import { prisma } from '../config/prisma.js';
import jwt from "jsonwebtoken";
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload, deleteByUrl } from '../utils/ossUtils.js';

const router = express.Router();
const SALT_ROUNDS = 12;

// 配置 multer（内存存储）
const uploadAvatar = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});
const roleMap = {
    1: "consumer",
    2: "merchant",
    3: "auditor"
};
const roleNameMap = {
    1: "用户",
    2: "商户",
    3: "审计员"
};
router.post("/register",async (req, res) => {
    const { username, password,role = 1} = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required", ok: false });
    }
    if(role == 2 || role == 3){
        return res.status(400).json({ error: "管理用户暂不开放注册,请用测试账号", ok: false });
    }
    const existingUser = await prisma.users.findUnique({
        where: { username }
    });
    if (existingUser) {
        return res.status(400).json({ error: "Username already exists" ,ok : false});
    }
    const displayed_id = Math.floor(100000 + Math.random() * 900000); // 生成一个6位数的随机ID
    const display_name = `${roleNameMap[role] || "用户"}${displayed_id}`;
    try {
        const passwordHash = await bcrypt.hash(password,SALT_ROUNDS)
        const newUser = await prisma.users.create({
            data: {
                username,
                password_hash:passwordHash,
                role: roleMap[role] || "consumer",
                display_name: display_name
            }
        });
        res.json({ message: "User registered successfully", data: { id: newUser.id, username: newUser.username, role: newUser.role, display_name: newUser.display_name }, ok: true });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Failed to register user" });
    }
})
router.post("/login",async (req, res) => {
    const {username,password} = req.body;
    if(!username || !password){
        return res.status(400).json({error : "Username and password are required",ok:false});
    }
    try{
        const user = await prisma.users.findUnique({
            where :{username},
            select: {id:true,username:true,password_hash:true,role:true,display_name:true}
        })
        if(!user){
            return res.status(401).json({error:"Invalid username or password",ok:false})
        }
        const matched = await bcrypt.compare(password,user.password_hash);
        if(!matched){
            return res.status(401).json({error:"Invalid username or password",ok:false})
        }
        const token = jwt.sign({id:user.id,username:user.username,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN || "7d"});
        return res.json({message:"Login successful",data:{user_id:user.id,username:user.username,role:user.role,display_name:user.display_name},token,ok:true});
    }
    catch(error){
        console.error("Error logging in:", error);
    return res.status(500).json({ error: "Failed to login", ok: false });
    }
});

// 获取当前用户信息
router.get("/info", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: {
                username: true,
                display_name: true,
                avatar_url: true,
                role: true,
                phone: true,
                email: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found", ok: false });
        }

        return res.json({
            data: user,
            ok: true
        });
    } catch (error) {
        console.error("Error fetching user info:", error);
        return res.status(500).json({ error: "Failed to fetch user info", ok: false });
    }
});

// 更新用户资料（display_name）
router.put("/profile", authenticateToken, async (req, res) => {
    const { display_name } = req.body;
    const userId = req.user.id;

    if (!display_name) {
        return res.status(400).json({ error: "Display name is required", ok: false });
    }

    if (display_name.length > 64) {
        return res.status(400).json({ error: "Display name must be less than 64 characters", ok: false });
    }

    try {
        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: { display_name },
            select: { id: true, username: true, display_name: true, avatar_url: true, role: true }
        });

        return res.json({
            message: "Profile updated successfully",
            data: updatedUser,
            ok: true
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ error: "Failed to update profile", ok: false });
    }
});

// 上传用户头像
router.post("/avatar", authenticateToken, uploadAvatar.single('avatar'), async (req, res) => {
    const userId = req.user.id;

    if (!req.file) {
        return res.status(400).json({ error: "Avatar image is required", ok: false });
    }

    try {
        // 获取当前用户的现有头像
        const currentUser = await prisma.users.findUnique({
            where: { id: userId },
            select: { avatar_url: true }
        });

        // 如果用户已有头像，删除旧头像
        if (currentUser?.avatar_url) {
            try {
                await deleteByUrl(currentUser.avatar_url);
            } catch (deleteError) {
                console.error("Error deleting old avatar:", deleteError);
                // 继续上传新头像，不因删除旧头像失败而中断
            }
        }

        // 生成唯一文件名
        const timestamp = Date.now();
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const fileName = `avatars/${userId}/avatar_${timestamp}.${ext}`;

        // 上传新头像
        const result = await upload(req.file.buffer, fileName);

        // 更新数据库中的头像URL
        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: { avatar_url: result.url },
            select: { id: true, username: true, display_name: true, avatar_url: true, role: true }
        });

        return res.json({
            message: "Avatar uploaded successfully",
            data: updatedUser,
            ok: true
        });
    } catch (error) {
        console.error("Error uploading avatar:", error);
        return res.status(500).json({ error: "Failed to upload avatar", ok: false });
    }
});

export default router;
export { roleMap };