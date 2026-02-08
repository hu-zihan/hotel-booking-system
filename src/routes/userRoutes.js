import express from 'express';
import { prisma } from '../config/prisma';
const router = express.Router();
const roleMap = {
    1: "consumer",
    2: "merchant",
    3: "auditor"
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
        return res.status(400).json({ error: "Username already exists" });
    }
    try {
        const newUser = await prisma.users.create({
            data: {
                username,
                password,
                role: roleMap[role] || "consumer"
            }
        });
        res.json({ message: "User registered successfully", user: { id: newUser.id, username: newUser.username, role: newUser.role },ok : True});
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Failed to register user" });
    }
})

export default router;