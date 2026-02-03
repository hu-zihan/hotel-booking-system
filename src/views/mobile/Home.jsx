import React, { useState } from 'react';
import { Button, Calendar, SearchBar, Tag, Toast ,Popup} from 'antd-mobile';
import { EnvironmentOutline } from 'antd-mobile-icons';
import { mockHotels } from '../../mockData'; // 指向写好的 mockData.js
import './Home.css';
import { useNavigate } from 'react-router-dom';
import HotelCard from '../../components/hotelCard';

export default function MobileHome() {
  const navigate = useNavigate();
  // 状态：控制日历弹出层
  const [calendarVisible, setCalendarVisible] = useState(false);
  // 状态：存储选中的日期范围
  const [dateRange, setDateRange] = useState(null);

  // 处理查询点击
  const handleSearch = () => {
    if (!dateRange) {
      Toast.show({ content: '请选择入住和离店日期' });
      return;
    }
    // 之后我们会在这里编写跳转到列表页的代码
    console.log('查询条件：', { dateRange });
  };

  // 使用你修改后的 imageurl 字段
  const bannerHotel = mockHotels[0];

  return (
    <div className="home-page">
      {/* 1. 顶部 Banner 区域 */}
      <div className="banner">
        <img src={bannerHotel.imageurl} alt="hotel banner" />
        <div className="banner-mask">
          <span className="banner-text">推荐：{bannerHotel.name.cn}</span>
        </div>
      </div>

      {/* 2. 搜索卡片区域 */}
      <div className="search-container">
        {/* 城市/定位 */}
        <div className="search-row border-bottom">
          <span className="city">上海</span>
          <div className="location">
            <EnvironmentOutline /> 我的位置
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
          <SearchBar placeholder='搜索酒店、地点、关键词' className="search-bar" />
        </div>

        {/* 快捷标签 - 动态渲染 mockHotels 里的标签 */}
        <div className="tags-container">
          {bannerHotel.tags.map(tag => (
            <Tag key={tag} color='primary' fill='outline' className="tag-item">
              {tag}
            </Tag>
          ))}
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
                visible={calendarVisible} // 控制是否弹出
                onMaskClick={() => setCalendarVisible(false)} // 点击阴影关闭
                onClose={() => setCalendarVisible(false)}
            >
                <Calendar
                selectionMode='range'
                onConfirm={val => {
                    setDateRange(val); // 存入选中的日期
                    setCalendarVisible(false); // 选中后自动关闭弹窗
                }}
                />
        </Popup>
    </div>
  );
}