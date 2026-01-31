create Table IF NOT EXISTS area_adcode_location (
    adcode VARCHAR(10) PRIMARY KEY,
    lon VARCHAR(50),
    lat VARCHAR(50),
    `desc` VARCHAR(255)
);