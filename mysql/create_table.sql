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
CREATE TABLE IF NOT EXISTS hotel_review_reason (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  hotel_id BIGINT NOT NULL COMMENT '酒店ID',
  action_type ENUM('audit', 'publish', 'offline') NOT NULL COMMENT '动作类型',
  review_result ENUM('pass', 'reject') NOT NULL COMMENT '审核结果',
  reason VARCHAR(500) NULL COMMENT '不通过原因（reject时必填）',
  operator_user_id BIGINT NOT NULL COMMENT '审核员用户ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hotel_action (hotel_id, action_type),
  INDEX idx_operator (operator_user_id),
  CONSTRAINT fk_review_reason_hotel FOREIGN KEY (hotel_id) REFERENCES hotel(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_reason_operator FOREIGN KEY (operator_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='酒店审核工单理由记录';
CREATE TABLE hotel_image (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,

  hotel_id BIGINT NOT NULL,
  room_type_id BIGINT DEFAULT NULL,

  image_url VARCHAR(500) NOT NULL,

  image_type TINYINT NOT NULL DEFAULT 0 COMMENT '图片类型 0酒店Banner图片 1房型图片 2详情图片',

  sort_order INT NOT NULL DEFAULT 0,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_hotel_id (hotel_id),
  INDEX idx_room_type_id (room_type_id),
  INDEX idx_image_type (image_type),
  INDEX idx_hotel_type (hotel_id, image_type)
);
CREATE TABLE hotel_room_type (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,

  hotel_id BIGINT NOT NULL,

  name VARCHAR(100) NOT NULL,
  -- 例：豪华大床房 / 标准双床房

  bed_type TINYINT NOT NULL DEFAULT 0,
  -- 0=UNKNOWN 1=KING(大床) 2=TWIN(双床) 3=QUEEN 4=OTHER

  capacity INT NOT NULL DEFAULT 2,
  -- 可住人数

  breakfast_included TINYINT NOT NULL DEFAULT 0,
  -- 0=不含早 1=含早

  refundable TINYINT NOT NULL DEFAULT 1,
  -- 0=不可取消 1=可取消（DDL 冲刺用这个就够）

  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  -- 房型价格（以后你要做按日期库存/价格可以再扩展）

  stock INT NOT NULL DEFAULT 0,
  -- 简化库存（不做按天库存时先用它）

  status TINYINT NOT NULL DEFAULT 1,
  -- 1=上架 0=下架

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_hotel_id (hotel_id),
  INDEX idx_hotel_status (hotel_id, status),
  INDEX idx_price (price),

  CONSTRAINT fk_room_type_hotel FOREIGN KEY (hotel_id) REFERENCES hotel(id)
);

