import express from 'express';
import bcrypt from "bcrypt";
import { prisma } from '../config/prisma';
import jwt from "jsonwebtoken";
const router = express.Router();
const SALT_ROUNDS = 12;
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
        res.status(400).json({ error: "Username and password are required" });
    }
    //TODO: add password hashing
    const existingUser = await prisma.users.findUnique({
        where: { username }
    });
    if (existingUser) {
        return res.status(400).json({ error: "Username already exists" ,ok : False});
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
        res.json({ message: "User registered successfully", user: { id: newUser.id, username: newUser.username, role: newUser.role },ok : True});
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Failed to register user" });
    }
})
router.post("/login",async (req, res) => {
    const {username,password} = req.body;
    if(!username || !password){
        return res.status(400).json({error : "Username and password are required",ok:False});
    }
    try{
        const user = await prisma.users.findUnique({
            where :{username},
            select: {id:true,username:true,password_hash:true,role:true}
        })
        if(!user){
            return res.status(401).json({error:"Invalid username or password",ok:False})
        }
        const matched = await bcrypt.compare(password,user.password_hash);
        if(!matched){
            return res.status(401).json({error:"Invalid username or password",ok:False})
        }
        const token = jwt.sign({id:user.id,username:user.username,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN || "7d"});
        return res.json({message:"Login successful",user:{id:user.id,username:user.username,role:user.role},token,ok:True});
    }
    catch(error){
        console.error("Error logging in:", error);
    return res.status(500).json({ error: "Failed to login", ok: false });
    }
});

export default router;
export { roleMap };