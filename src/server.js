
import express from 'express';
import dotenv from 'dotenv';
import { testdbConnection,pool } from './config/mysql.js';
import {prisma} from './config/prisma.js';
dotenv.config();
import hotelRoutes from './routes/HotelRoutes.js';
const app = express();
app.use(express.json());
app.use('/hotels', hotelRoutes);
app.get("/health", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ message: "Hello from server! it's healthy" }));
    res.end();
});
const port = process.env.PORT;
const server = app.listen(port, async() => {
    console.log(`Server is running on port ${port}`);
})