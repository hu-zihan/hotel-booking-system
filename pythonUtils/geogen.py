import geohash
import pymysql
import dotenv
import os
import logging

dotenv.load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_DATABASE', 'test'),
    'port': int(os.getenv('DB_PORT', 3306))
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def get_db_conn():
    if pymysql is None:
        raise RuntimeError("pymysql is required but not installed. Install with: pip install pymysql")
    return pymysql.connect(
        host=DB_CONFIG['host'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        database=DB_CONFIG['database'],
        port=DB_CONFIG['port'],
        charset='utf8mb4'
    )


def generate_station_geohash():
    """
    获取地铁站的所有数据，用经纬度生成 geohash，然后更新数据库
    """
    conn = None
    cursor = None
    try:
        conn = get_db_conn()
        cursor = conn.cursor()

        # 1. 查询所有地铁站数据
        select_sql = "SELECT id, cn_name, lon, lat FROM station WHERE lon IS NOT NULL AND lat IS NOT NULL"
        cursor.execute(select_sql)
        stations = cursor.fetchall()
        
        logging.info(f"获取到 {len(stations)} 个地铁站数据")

        # 2. 遍历每个站点，生成 geohash 并更新
        update_sql = "UPDATE station SET geohash = %s WHERE id = %s"
        count = 0
        
        for station in stations:
            station_id = station[0]
            cn_name = station[1]
            lon = float(station[2])
            lat = float(station[3])
            
            try:
                # 生成 geohash (精度 8 位，约 19m x 19m)
                gh = geohash.encode(lat, lon, precision=12)
                cursor.execute(update_sql, (gh, station_id))
                count += 1
                
                if count % 100 == 0:
                    conn.commit()
                    logging.info(f"已更新 {count} 个站点的 geohash")
                    
            except Exception as e:
                logging.error(f"处理站点 {cn_name} (ID: {station_id}) 失败: {e}")

        conn.commit()
        logging.info(f"完成！共更新 {count} 个地铁站的 geohash")

    except Exception as e:
        logging.error(f"数据库操作失败: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == '__main__':
    generate_station_geohash()