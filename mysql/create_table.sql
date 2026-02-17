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
CREATE TABLE hotel (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '酒店ID',
  `name`        VARCHAR(128) NOT NULL COMMENT '酒店名称',
  `address`     VARCHAR(255) NOT NULL COMMENT '详细地址',
  adcode      VARCHAR(12)  NULL COMMENT '行政区adcode',
  latitude    DECIMAL(10,7)  COMMENT '纬度',
  longitude   DECIMAL(10,7)  COMMENT '经度',
  geohash     VARCHAR(12)   NOT NULL COMMENT 'geohash',
  star        TINYINT NOT NULL DEFAULT 0 COMMENT '星级 0~5',
  min_price   DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT '最低价(分)',
  audit_status TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态 0待审核 1通过 2拒绝',
  `status`       TINYINT NOT NULL DEFAULT 0 COMMENT '上架状态 1上架 0下架',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_adcode (adcode),
  INDEX idx_geohash (geohash),
  INDEX idx_price (min_price),
  INDEX idx_audit (audit_status, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='酒店主表(含审核)';

CREATE TABLE hotel_info (
  hotel_id     BIGINT PRIMARY KEY COMMENT '酒店ID',
--   之后要增加所商户户ID字段,商户是和user表关联的,暂时不加,user中有customer_type区分商户和普通用户,以及审核员
  name_en      VARCHAR(128) NULL COMMENT '英文名',
  phone        VARCHAR(32)  NULL COMMENT '联系电话',
  open_date    DATE NULL COMMENT '开业时间',
  `desc`  TEXT NULL COMMENT '酒店简介',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_info_hotel
    FOREIGN KEY (hotel_id)
    REFERENCES hotel(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='酒店扩展信息表';
CREATE TABLE `users` (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  -- 用户角色
  role ENUM('consumer', 'merchant', 'auditor') NOT NULL COMMENT '用户角色',
  -- 登录凭证（任选其一登录）
  username VARCHAR(64) NOT NULL UNIQUE COMMENT '用户名',
  phone VARCHAR(20) UNIQUE COMMENT '手机号',
  email VARCHAR(128) UNIQUE COMMENT '邮箱',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码hash',
  -- 状态控制
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active' COMMENT '账号状态',
  -- 展示信息
  display_name VARCHAR(64) COMMENT '展示名/商户名/审核员名',
  avatar_url VARCHAR(255) COMMENT '头像',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
