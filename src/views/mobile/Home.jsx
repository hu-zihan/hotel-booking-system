/**
 * @file Home.jsx
 * @description 移动端酒店首页组件
 * 功能包括：Banner 轮播展示、城市 GPS 定位、日期范围选择、
 * 关键词搜索、标签筛选、热门酒店推荐列表。
 */
import React, { useState } from 'react';
import { Button, Calendar, SearchBar, Tag,Popup,Swiper, Image, Toast } from 'antd-mobile';
import { EnvironmentOutline } from 'antd-mobile-icons';
import { mockHotels } from '../../mockData'; // 指向写好的 mockData.js
import './Home.css';
import { useNavigate } from 'react-router-dom';
import HotelCard from '../../components/hotelCard';

// --- 模块级常量（组件外定义，仅计算一次，不随重渲染重复执行）---

// 聚合所有酒店的 tags：flatMap 展平 → Set 去重 → 取前 5 个作为快捷筛选标签
const hotTags = [...new Set(mockHotels.flatMap(h => h.tags || []))].slice(0, 5);

// 中文星期映射，索引与 Date.getDay() 对应（0 = 周日）
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 将 Date 对象格式化为 "M月D日" 字符串
 * @param {Date} d - 日期对象
 * @returns {string} 例如 "2月26日"
 */
const fmt = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;

/**
 * 计算日期范围的入住晚数，最少返回 1 晚
 * @param {[Date, Date]} range - [入住日期, 离店日期]
 * @returns {number} 入住晚数
 */
const getNights = (range) => Math.max(1, Math.round((range[1] - range[0]) / 86400000));

/**
 * MobileHome - 移动端酒店首页
 * 集成搜索条件录入（城市/日期/关键词/标签）与热门酒店推荐展示。
 */
export default function MobileHome() {
  // React Router 导航钩子，用于跳转列表页 / 详情页
  const navigate = useNavigate();

  // 控制日期选择弹出层的显示与隐藏
  const [calendarVisible, setCalendarVisible] = useState(false);
  // 已确认的日期范围 [入住 Date, 离店 Date]，未选择时为 null
  const [dateRange, setDateRange] = useState(null);
  // 临时日期范围：用户在日历滑动选择时的中间状态，点击"确认"后才同步到 dateRange
  const [tempDateRange, setTempDateRange] = useState(null);
  // 当前搜索城市，默认"上海"，可通过 GPS 定位自动更新
  const [currentCity, setCurrentCity] = useState('上海');
  // 是否正在执行 GPS 定位，用于控制按钮 UI 与提示文字
  const [locating, setLocating] = useState(false);
  // 从 mock 数据随机取一个酒店（备用，实际 Banner 由 renderBanner 负责）
  const bannerHotel = mockHotels[Math.floor(Math.random() * mockHotels.length)];
  // 关键词搜索输入值，绑定 SearchBar
  const [keyword, setKeyword] = useState('');
  // 已选中的快捷标签列表，支持多选
  const [selectedTags, setSelectedTags] = useState([]);

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
          const response = await fetch(`/geo/location?${params}`);

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

  /**
   * 切换标签选中状态
   * - 已选中 → 从列表中移除（取消选中）
   * - 未选中 → 追加到列表末尾（选中）
   * @param {string} tag - 被点击的标签文本
   */
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  /**
   * 处理「开始查询」按钮点击
   * 1. 校验日期是否已选择，未选则提示并终止
   * 2. 将城市、日期时间戳、关键词、标签序列化为 URLSearchParams
   * 3. 跳转至酒店列表页 /list，携带全部查询参数
   */
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

  /**
   * 渲染顶部 Banner 轮播区域
   * 取 mockHotels 前 4 条数据构建自动播放的 Swiper 轮播图，
   * 点击任意图片跳转至对应酒店详情页。
   * @returns {JSX.Element} Banner 轮播组件
   */
  const renderBanner = () => {
    // 取前 4 条酒店数据作为轮播内容
    const bannerHotels = mockHotels.slice(0, 4);
    return (
      <div className="home-banner">
        <Swiper autoplay loop style={{ '--height': '220px' }}>
          {bannerHotels.map(h => (
            <Swiper.Item key={h.id}>
              <div
                onClick={() => navigate(`/detail/${h.id}`)}
                style={{ position: 'relative', height: '220px', cursor: 'pointer' }}
              >
                <img src={h.imageurl} alt={h.name.cn} className="home-banner-img" />
                <div className="home-banner-mask" />
                <div className="home-banner-text">
                  <span className="home-banner-tag">今日特惠</span>
                  <div className="home-banner-name">{h.name.cn}</div>
                </div>
              </div>
            </Swiper.Item>
          ))}
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

        {/* 日期选择 */}
        <div className="date-row" onClick={() => setCalendarVisible(true)}>
          <div className="date-block">
            <span className="date-block-label">入住</span>
            <span className={`date-block-value${!dateRange ? ' placeholder' : ''}`}>
              {dateRange ? fmt(dateRange[0]) : '请选择'}
            </span>
            <span className="date-block-week">
              {dateRange ? weekdays[dateRange[0].getDay()] : ''}
            </span>
          </div>
          <div className="date-nights-center">
            {dateRange ? `${getNights(dateRange)}晚` : '选日期'}
          </div>
          <div className="date-block date-block-right">
            <span className="date-block-label">离店</span>
            <span className={`date-block-value${!dateRange ? ' placeholder' : ''}`}>
              {dateRange ? fmt(dateRange[1]) : '请选择'}
            </span>
            <span className="date-block-week">
              {dateRange ? weekdays[dateRange[1].getDay()] : ''}
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

      {/* 3. 推荐酒店列表容器 */}
      <div className="hotel-list-container">
        <div className="section-header">
          <div className="section-header-line" />
          <span className="section-header-title">热门推荐</span>
          <span className="section-header-sub">精选好评酒店</span>
        </div>
    
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