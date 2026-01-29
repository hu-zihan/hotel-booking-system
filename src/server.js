
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import hotelRoutes from './routes/HotelRoutes.js';
const app = express();
app.use('/hotels', hotelRoutes);
app.get("/health", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ message: "Hello from server! it's healthy" }));
    res.end();
});
const port = process.env.PORT;
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})