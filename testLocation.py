import requests
import json
import time
from typing import Dict, List, Tuple

class LocationAPITester:
    def __init__(self, base_url: str = "http://localhost:8182"):
        self.base_url = base_url
        self.api_endpoint = f"{self.base_url}/geo/location"
    
    def get_city_coordinates(self) -> Dict[str, List[Tuple[str, float, float]]]:
        """
        返回中国主要城市及区县的经纬度测试数据
        格式: {"城市名": [("区县名", 经度, 纬度), ...]}
        """
        return {
            "北京市": [
                ("北京市中心", 116.3975, 39.9087),
                ("东城区", 116.4164, 39.9284),
                ("西城区", 116.3659, 39.9123),
                ("朝阳区", 116.4432, 39.9215),
                ("海淀区", 116.2983, 39.9599),
                ("丰台区", 116.2862, 39.8586),
                ("通州区", 116.6586, 39.9025),
                ("昌平区", 116.2313, 40.2207),
            ],
            "上海市": [
                ("上海市中心", 121.4737, 31.2304),
                ("黄浦区", 121.4844, 31.2317),
                ("徐汇区", 121.4365, 31.1883),
                ("长宁区", 121.4246, 31.2204),
                ("静安区", 121.4482, 31.2272),
                ("浦东新区", 121.5677, 31.2459),
                ("闵行区", 121.3813, 31.1128),
                ("宝山区", 121.4896, 31.4055),
            ],
            "广州市": [
                ("广州市中心", 113.2644, 23.1291),
                ("天河区", 113.3612, 23.1247),
                ("越秀区", 113.2672, 23.1285),
                ("海珠区", 113.3170, 23.0840),
                ("荔湾区", 113.2430, 23.1249),
                ("白云区", 113.2732, 23.1573),
                ("黄埔区", 113.4809, 23.1760),
                ("番禺区", 113.3841, 22.9372),
            ],
            "深圳市": [
                ("深圳市中心", 114.0579, 22.5431),
                ("福田区", 114.0550, 22.5215),
                ("罗湖区", 114.1318, 22.5483),
                ("南山区", 113.9294, 22.5310),
                ("宝安区", 113.8839, 22.5533),
                ("龙岗区", 114.2469, 22.7209),
                ("龙华区", 114.0453, 22.6585),
                ("坪山区", 114.3505, 22.7088),
            ],
            "其他城市": [
                ("保定市", 115.4648, 38.8739),
                ("保定市莲池区", 115.4974, 38.8836),
                ("保定市竞秀区", 115.4587, 38.8773),
                ("武汉市", 114.3052, 30.5928),
                ("武汉市江汉区", 114.2709, 30.6014),
                ("武汉市武昌区", 114.3162, 30.5539),
                ("成都市", 104.0668, 30.5728),
                ("成都市锦江区", 104.0805, 30.6577),
                ("成都市青羊区", 104.0630, 30.6679),
                ("重庆市", 106.5516, 29.5630),
                ("重庆市渝中区", 106.5629, 29.5567),
                ("重庆市江北区", 106.5743, 29.6067),
                ("西安市", 108.9398, 34.3416),
                ("西安市碑林区", 108.9460, 34.2511),
                ("西安市雁塔区", 108.9466, 34.2134),
                ("杭州市", 120.1551, 30.2741),
                ("杭州市上城区", 120.1693, 30.2426),
                ("杭州市西湖区", 120.1302, 30.2596),
            ]
        }
    
    def call_location_api(self, longitude: float, latitude: float) -> Dict:
        """调用定位API"""
        try:
            url = f"{self.api_endpoint}?longitude={longitude}&latitude={latitude}"
            response = requests.get(url, timeout=5)
            print(response)
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json(),
                    "status_code": response.status_code
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "status_code": response.status_code
                }
        except requests.exceptions.Timeout:
            return {"success": False, "error": "请求超时"}
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": f"请求异常: {str(e)}"}
        except json.JSONDecodeError:
            return {"success": False, "error": "JSON解析失败"}
    
    def test_single_location(self, location_name: str, longitude: float, latitude: float) -> Dict:
        """测试单个位置"""
        print(f"测试: {location_name} ({longitude}, {latitude})")
        
        result = self.call_location_api(longitude, latitude)
        print(result)
        if result["success"]:
            api_data = result["data"]
            api_loc = api_data.get("location", {}) if isinstance(api_data, dict) else {}
            # 尝试从API响应中提取城市信息
            api_city = api_loc.get("city", "") if isinstance(api_loc, dict) else ""
            api_adcode = api_loc.get("adcode", "") if isinstance(api_loc, dict) else ""

            # 简单验证：检查是否返回了有效数据
            is_valid = bool(api_city and api_adcode)
            
            return {
                "location": location_name,
                "coordinates": (longitude, latitude),
                "api_response": api_data,
                "api_city": api_city,
                "api_adcode": api_adcode,
                "success": True,
                "valid_response": is_valid
            }
        else:
            return {
                "location": location_name,
                "coordinates": (longitude, latitude),
                "error": result["error"],
                "success": False
            }
    
    def run_comprehensive_test(self, delay: float = 0.5) -> Dict:
        """运行全面的测试"""
        print("=" * 60)
        print("开始定位API准确性测试")
        print("=" * 60)
        
        test_data = self.get_city_coordinates()
        all_results = []
        summary = {
            "total_tests": 0,
            "successful": 0,
            "failed": 0,
            "valid_responses": 0,
            "by_city": {}
        }
        
        for city, locations in test_data.items():
            print(f"\n{'='*40}")
            print(f"测试城市: {city}")
            print(f"{'='*40}")
            
            city_results = []
            for loc_name, lon, lat in locations:
                summary["total_tests"] += 1
                
                # 测试单个位置
                result = self.test_single_location(loc_name, lon, lat)
                city_results.append(result)
                
                # 更新统计
                if result["success"]:
                    summary["successful"] += 1
                    if result.get("valid_response", False):
                        summary["valid_responses"] += 1
                else:
                    summary["failed"] += 1
                
                # 显示结果
                if result["success"]:
                    city = result.get("api_city")
                    adcode = result.get("api_adcode")
                    print(f"成功:city:{city}, adcode:{adcode}")
                else:
                    print(f"  ✗ 失败: {result.get('error', '未知错误')}")
                
                # 延迟避免请求过快
                time.sleep(delay)
            
            all_results.extend(city_results)
            summary["by_city"][city] = {
                "total": len(locations),
                "successful": sum(1 for r in city_results if r["success"]),
                "valid_responses": sum(1 for r in city_results if r.get("valid_response", False))
            }
        
        # 打印汇总报告
        print(f"\n{'='*60}")
        print("测试汇总报告")
        print(f"{'='*60}")
        print(f"总测试数: {summary['total_tests']}")
        print(f"成功请求: {summary['successful']} ({summary['successful']/summary['total_tests']*100:.1f}%)")
        print(f"有效响应: {summary['valid_responses']} ({summary['valid_responses']/summary['total_tests']*100:.1f}%)")
        print(f"失败请求: {summary['failed']}")
        
        print(f"\n按城市统计:")
        for city, stats in summary["by_city"].items():
            success_rate = stats["successful"] / stats["total"] * 100 if stats["total"] > 0 else 0
            valid_rate = stats["valid_responses"] / stats["total"] * 100 if stats["total"] > 0 else 0
            print(f"  {city}: {stats['successful']}/{stats['total']} 成功 ({success_rate:.1f}%), "
                  f"{stats['valid_responses']} 有效 ({valid_rate:.1f}%)")
        
        return {
            "summary": summary,
            "detailed_results": all_results
        }
    
    def test_edge_cases(self):
        """测试边界和特殊情况"""
        print(f"\n{'='*40}")
        print("边界情况测试")
        print(f"{'='*40}")
        
        edge_cases = [
            ("中国最东端", 135.05, 48.45),  # 黑龙江抚远
            ("中国最西端", 73.40, 39.40),   # 新疆帕米尔高原
            ("中国最南端", 112.35, 3.85),   # 南沙群岛曾母暗沙
            ("中国最北端", 123.27, 53.33),  # 黑龙江漠河
            ("城市边界点1", 116.0, 39.0),   # 北京附近
            ("城市边界点2", 121.0, 31.0),   # 上海附近
        ]
        
        for case_name, lon, lat in edge_cases:
            result = self.test_single_location(case_name, lon, lat)
            
            if result["success"]:
                city = result.get("api_city", "未知")
                print(f"  {case_name}: 返回 {city}")
            else:
                print(f"  {case_name}: 失败 - {result.get('error')}")


def main():
    # 创建测试器
    tester = LocationAPITester("http://127.0.0.1:8182")
    
    # 运行全面测试
    test_results = tester.run_comprehensive_test(delay=0.3)
    
    # 测试边界情况
    tester.test_edge_cases()
    
    # 保存详细结果到文件
    with open("location_api_test_results.json", "w", encoding="utf-8") as f:
        json.dump(test_results, f, ensure_ascii=False, indent=2)
    
    print(f"\n详细结果已保存到: location_api_test_results.json")


if __name__ == "__main__":
    main()