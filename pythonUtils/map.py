import os
import logging
import jionlp as jio
from addressparser import latlng

try:
    import pymysql
except Exception:
    pymysql = None

DB_CONFIG = {
    'host': os.environ.get('DB_HOST', '127.0.0.1'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', ''),
    'database': os.environ.get('DB_NAME', 'test'),
    'port': int(os.environ.get('DB_PORT', 3306))
}

"""
生成 中国省市区对应的行政区划代码及经纬度并写入 MySQL 表

表结构（如果不存在会自动创建）：
  create table IF NOT EXISTS area_adcode_location (
      adcode VARCHAR(10) PRIMARY KEY,
      lon VARCHAR(50),
      lat VARCHAR(50),
      `desc` VARCHAR(255)
  );

desc 字段由 province_name + city_name + district_name 组成（无分隔符）。
"""

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def get_db_conn():
    if pymysql is None:
        raise RuntimeError("pymysql is required but not installed. Install with: pip install pymysql")

    cfg = DB_CONFIG
    conn = pymysql.connect(host=cfg['host'], port=cfg['port'], user=cfg['user'], password=cfg['password'], database=cfg['database'], charset='utf8mb4')
    return conn


def ensure_table(cursor):
    create_sql = """
    CREATE TABLE IF NOT EXISTS area_adcode_location (
        adcode VARCHAR(10) PRIMARY KEY,
        lon VARCHAR(50),
        lat VARCHAR(50),
        `desc` VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
    cursor.execute(create_sql)


def parse_lon_lat(val):
    """
    解析 latlng 中的值，返回 (lon, lat) 字符串形式；失败则返回 ("", "").
    支持 tuple/list (lat, lon) 或字符串 'lat,lon'.
    """
    if val is None:
        return "", ""
    if isinstance(val, (list, tuple)) and len(val) >= 2:
        a, b = val[0], val[1]
        return str(b).strip(), str(a).strip()
    if isinstance(val, str):
        parts = [p.strip() for p in val.replace(';', ',').split(',') if p.strip()]
        if len(parts) >= 2:
            return parts[1], parts[0]
        parts = [p for p in val.split() if p]
        if len(parts) >= 2:
            return parts[1], parts[0]
    return "", ""


def main():
    china_location = jio.china_location_loader()
    province_name_list = list(china_location)

    conn = None
    cursor = None
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        ensure_table(cursor)

        insert_sql = (
            "INSERT INTO area_adcode_location (adcode, lon, lat, `desc`) VALUES (%s, %s, %s, %s) "
            "ON DUPLICATE KEY UPDATE lon=VALUES(lon), lat=VALUES(lat), `desc`=VALUES(`desc`)"
        )

        count = 0
        for province_name in province_name_list:
            if province_name.startswith("_"):
                continue
            city_name_list = list(china_location[province_name])
            for city_name in city_name_list:
                if city_name.startswith("_"):
                    continue
                district_name_list = list(china_location[province_name][city_name])
                for district_name in district_name_list:
                    if district_name.startswith("_"):
                        continue
                    try:
                        item = china_location[province_name][city_name][district_name]
                        adcode = item.get("_admin_code")
                        if not adcode:
                            continue
                        raw_ll = None
                        try:
                            raw_ll = latlng[(province_name, city_name, district_name)]
                        except Exception:
                            raw_ll = None

                        lon, lat = parse_lon_lat(raw_ll)
                        desc = f"{province_name}{city_name}{district_name}"

                        cursor.execute(insert_sql, (adcode, lon, lat, desc))
                        count += 1
                        if count % 100 == 0:
                            conn.commit()
                            logging.info("Committed %d rows", count)

                    except Exception as e:
                        logging.exception("failed to process %s %s %s: %s", province_name, city_name, district_name, e)

        conn.commit()
        logging.info("Finished. Total rows processed (attempted inserts): %d", count)

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == '__main__':
    main()
