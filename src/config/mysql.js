import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
// console.log('ENV CHECK:', {
//   DB_HOST: process.env.DB_HOST,
//   MYSQL_PORT: process.env.MYSQL_PORT,
//   MYSQL_USER: process.env.MYSQL_USER,
//   MYSQL_DATABASE: process.env.MYSQL_DATABASE,
//   HAS_PASSWORD: !!process.env.MYSQL_PASSWORD,
// });

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost", // ⭐ docker 内用 mysql
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+08:00"
});
export async function testdbConnection(){
    try {
        const connection = await pool.getConnection();
        console.log("Database connection successful!");
        connection.release();
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1); // ❗ 启动即失败，直接退出
    }
}