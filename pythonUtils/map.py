import jionlp as jio
from addressparser import latlng
"""
生成 中国省市区对应的行政区划代码及经纬度文件
"""
china_location = jio.china_location_loader()
province_name_list = list(china_location)
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
                adcode = china_location[province_name][city_name][district_name]["_admin_code"]
                lat,lng = latlng[(province_name,city_name,district_name)]
                print(adcode,province_name,city_name,district_name,lat,lng)
            except:
                pass
