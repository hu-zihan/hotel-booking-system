import React, { useState } from 'react';
import { Button, Calendar, SearchBar, Tag,Popup,Swiper, Image, Toast } from 'antd-mobile';
import { EnvironmentOutline } from 'antd-mobile-icons';
import { mockHotels } from '../../mockData'; // 指向写好的 mockData.js
import './Home.css';
import { useNavigate } from 'react-router-dom';
import HotelCard from '../../components/hotelCard';

// --- 新增逻辑 1: 提取热门标签 (放在组件外，只计算一次) ---
// flatMap 把所有酒店的 tags 数组铺平，Set 去重，slice 取前 5 个
const hotTags = [...new Set(mockHotels.flatMap(h => h.tags || []))].slice(0, 5);

export default function MobileHome() {
  const navigate = useNavigate();
  // 状态：控制日历弹出层
  const [calendarVisible, setCalendarVisible] = useState(false);
  // 状态：存储选中的日期范围
  const [dateRange, setDateRange] = useState(null);
  // 临时状态：存储用户正在选择的日期（点击确认后才正式保存到 dateRange）
  const [tempDateRange, setTempDateRange] = useState(null);
  // 状态：存储当前城市
  const [currentCity, setCurrentCity] = useState('上海');
  // 状态：定位加载中
  const [locating, setLocating] = useState(false);
  // 从 mock 数据中随机选一个酒店作为 Banner 推荐
  const bannerHotel = mockHotels[Math.floor(Math.random() * mockHotels.length)];
  //  搜索与筛选 
  const [keyword, setKeyword] = useState(''); // 搜索关键字
  const [selectedTags, setSelectedTags] = useState([]); // 已选中的标签

  // 获取当前位置的函数
  const handleGetLocation = () => {
    // 检查浏览器是否支持地理定位
    if (!navigator.geolocation) {
      Toast.show({
        icon: 'fail',
        content: '您的浏览器不支持地理定位',
      });
      return;
    }

    setLocating(true);
    Toast.show({
      icon: 'loading',
      content: '定位中...',
      duration: 0, // 不自动关闭
    });

    navigator.geolocation.getCurrentPosition(
      // 成功获取位置
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('获取到的坐标：', latitude, longitude);

        try {
          // 使用URLSearchParams构建查询参数，发送GET请求
          const params = new URLSearchParams({
            latitude,
            longitude
          });
          const response = await fetch(`/api/location/geocode?${params}`);

          if (!response.ok) {
            throw new Error('后端接口调用失败');
          }

          const data = await response.json();
          
          // 后端返回格式：{ ok: true, location: { city: '上海市', adcode: '310100' } }
          if (data.ok && data.location && data.location.city) {
            setCurrentCity(data.location.city);
            Toast.clear();
            Toast.show({
              icon: 'success',
              content: `定位成功：${data.location.city}`,
            });
          } else {
            throw new Error(data.message || '解析位置失败');
          }
        } catch (error) {
          console.error('定位失败：', error);
          Toast.clear();
          Toast.show({
            icon: 'fail',
            content: '定位失败，请稍后重试',
          });
        } finally {
          setLocating(false);
        }
      },
      // 获取位置失败
      (error) => {
        console.error('定位失败：', error);
        setLocating(false);
        Toast.clear();
        
        let errorMsg = '定位失败';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = '用户拒绝了定位请求';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = '位置信息不可用';
            break;
          case error.TIMEOUT:
            errorMsg = '定位请求超时';
            break;
          default:
            errorMsg = '未知的定位错误';
        }
        
        Toast.show({
          icon: 'fail',
          content: errorMsg,
        });
      },
      // 定位选项
      {
        enableHighAccuracy: true, // 启用高精度
        timeout: 10000, // 超时时间10秒
        maximumAge: 0 // 不使用缓存位置
      }
    );
  };

  // 标签点击切换
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // 处理查询点击
  const handleSearch = () => {
    // 1. 先做“拦截”：如果没选日期，弹窗报错并中断代码执行
    if (!dateRange) {
        alert( '请选择入住日期' );
        return; 
    }

    // 2. 构建查询参数
    const params = new URLSearchParams();
    
    // 放入城市
    params.append('city', currentCity);
    
    // 放入日期 (转换为时间戳或字符串)
    if (dateRange) {
        params.append('startDate', dateRange[0].getTime());
        params.append('endDate', dateRange[1].getTime());
    }

    // 放入关键字
    if (keyword) params.append('keyword', keyword);
    
    // 放入标签
    if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

    // 3. 执行跳转 -> 列表页
    console.log('跳往列表页，参数：', params.toString());
    navigate(`/list?${params.toString()}`);
  };

  // 渲染顶部 Banner 区域的函数
  const renderBanner = () => {
    // 我们选取数组中的第一个酒店作为广告推荐
    const bannerHotel = mockHotels[0];

    return (
      <div className="home-banner" style={{ padding: '12px' }}>
        <Swiper autoplay loop style={{ '--border-radius': '12px' }}>
          <Swiper.Item>
            <div
              // 点击 Banner 直接触发跳转逻辑，通过反引号嵌入酒店 ID
              onClick={() => navigate(`/detail/${bannerHotel.id}`)}
              style={{ position: 'relative', cursor: 'pointer' }}
            >
              <Image
                src={bannerHotel.imageurl} // 使用 mock 数据中的 banner 大图
                alt="酒店广告"
                fit="cover"
                style={{ width: '100%', height: '160px', borderRadius: '12px' }}
              />
              {/* 在 Banner 上方叠加文字提示 */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                color: '#fff',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                fontWeight: 'bold'
              }}>
                今日特惠：{bannerHotel.name.cn}
              </div>
            </div>
          </Swiper.Item>
        </Swiper>
      </div>
    );
  };

  return (
    <div className="home-page">
      {/* 1. 顶部 Banner 区域 */}
      {renderBanner()}

      {/* 2. 搜索卡片区域 */}
      <div className="search-container">
        {/* 城市/定位 */}
        <div className="search-row border-bottom">
          <span className="city">{currentCity}</span>
          <div 
            className="location" 
            onClick={handleGetLocation}
            style={{ cursor: 'pointer', opacity: locating ? 0.5 : 1 }}
          >
            <EnvironmentOutline /> {locating ? '定位中...' : '我的位置'}
          </div>
        </div>

        {/* 日期选择 - 文档要求必考点 */}
        <div className="search-row border-bottom" onClick={() => setCalendarVisible(true)}>
          <div className="date-info">
            <span className="date-label">入住 - 离店</span>
            <span className="date-value">
              {dateRange 
                ? `${dateRange[0].toLocaleDateString()} 至 ${dateRange[1].toLocaleDateString()}` 
                : '请选择日期'}
            </span>
          </div>
        </div>

        {/* 关键词搜索 */}
        <div className="search-row">
          <SearchBar 
            placeholder='搜索酒店、地点、关键词' 
            className="search-bar" 
            value={keyword}
            onChange={val => setKeyword(val)} // Antd Mobile SearchBar 直接返回字符串
          />
        </div>

        {/*快捷标签 (使用 hotTags 并支持点击)*/}
        <div className="tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 0' }}>
          {hotTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
                <Tag 
                    key={tag} 
                    // 选中时变成实心 primary 色，未选中时是空心默认色
                    color={isSelected ? 'primary' : 'default'} 
                    fill={isSelected ? 'solid' : 'outline'}
                    className="tag-item"
                    onClick={() => toggleTag(tag)}
                    style={{ cursor: 'pointer' }}
                >
                    {tag}
                </Tag>
            );
          })}
        </div>

        {/* 查询按钮 */}
        <Button block color='primary' size='large' onClick={handleSearch}>
          开始查询
        </Button>
      </div>

        {/* 3.推荐酒店列表容器 */}
      <div className="hotel-list-container" style={{ padding: '16px', background: '#f5f5f5' }}>
        <h3 style={{ marginBottom: '12px' }}>热门推荐</h3>
    
         {mockHotels.map((hotel) => (
          <HotelCard 
            key={hotel.id} 
            data={hotel} 
            onClick={() => navigate(`/detail/${hotel.id}`)}  //点击进入酒店详情页，使用反引号包裹路径，通过 ${hotel.id} 动态地将当前酒店的 ID（如 'h1'）拼接到 URL 中
          />
        ))}
      </div>

      {/* 日历组件 */}
        <Popup
                visible={calendarVisible} // 控制弹窗显示
                onMaskClick={() => setCalendarVisible(false)} // 点击遮罩关闭
                onClose={() => {
                  setCalendarVisible(false); // 关闭弹窗
                  setTempDateRange(null); // 清空临时选择的日期
                }}
                bodyStyle={{ height: 'auto', maxHeight: '80vh' }} // 自适应高度，最高80%视窗
            >
                <div style={{ padding: '12px' }}>
                  {/* 日历选择器 - 范围模式 */}
                  <Calendar
                    selectionMode='range' // 范围选择模式
                    value={tempDateRange || dateRange} // 显示临时选择或已确认的日期
                    onChange={val => {
                      setTempDateRange(val); // 用户选择日期时存入临时状态
                    }}
                  />
                  {/* 确认按钮区域 */}
                  <div style={{ padding: '12px 0' }}>
                    <Button 
                      block // 按钮占满整行
                      color='primary' 
                      size='large'
                      disabled={!tempDateRange} // 未选择完整日期范围时禁用按钮
                      onClick={() => {
                        if (tempDateRange) {
                          setDateRange(tempDateRange); // 将临时日期保存到正式状态
                          setCalendarVisible(false); // 关闭弹窗
                          setTempDateRange(null); // 清空临时状态
                        }
                      }}
                    >
                      确认
                    </Button>
                  </div>
                </div>
        </Popup>
    </div>
  );
}