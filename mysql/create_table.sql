    create Table IF NOT EXISTS area_adcode_location (
        adcode VARCHAR(10) PRIMARY KEY,
        lon VARCHAR(50),
        lat VARCHAR(50),
    `desc` VARCHAR(255)
    );

CREATE Table if not exists station(
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '自增主键',
    cn_name VARCHAR(255) COMMENT '站点中文名称',
    en_name VARCHAR(255) COMMENT '站点英文名称',
    line_name VARCHAR(255) COMMENT '线路名称',
    line_color VARCHAR(50) COMMENT '线路颜色',
    city_name VARCHAR(100) COMMENT '所属城市',
    lon VARCHAR(50) COMMENT '经度',
    lat VARCHAR(50) COMMENT '纬度'
) ;