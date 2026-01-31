ALTER TABLE station
ADD COLUMN latitude_d  DECIMAL(10,7) NULL COMMENT '数值纬度',
ADD COLUMN longitude_d DECIMAL(10,7) NULL COMMENT '数值经度',
ADD INDEX idx_lat_lng (latitude_d, longitude_d);
UPDATE station
SET
  latitude_d  = CAST(lat AS DECIMAL(10,7)),
  longitude_d = CAST(lon AS DECIMAL(10,7))
WHERE lat IS NOT NULL AND lon IS NOT NULL;

ALTER TABLE hotel
MODIFY COLUMN min_price DECIMAL(10,3) NOT NULL COMMENT '最低价(元)';

ALTER TABLE station
ADD COLUMN geohash VARCHAR(12) NULL COMMENT 'geohash';

ALTER TABLE hotel
MODIFY COLUMN longitude DECIMAL(10,7)  NULL COMMENT '经度',
MODIFY COLUMN latitude DECIMAL(10,7)  NULL COMMENT '纬度';