// src/views/mobile/HotelDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, Tag, Button, Space, Swiper, DatePicker, Stepper, Toast, Loading } from 'antd-mobile';
import { StarFill, EnvironmentOutline, TagOutline, ClockCircleOutline, PhoneFill, CalendarOutline, UnorderedListOutline } from 'antd-mobile-icons';
import { getHotelDetailWithGeo } from '../../api';
import RoomCard from '../../components/RoomCard';
import './HotelDetail.css';

// 格式化后的酒店数据类型
interface Station {
  name: string;
  en_name: string;
  distance: number;
  line_name: string[] | string;
  line_color: string[] | string;
}

interface FormattedHotel {
  id: string;
  name: { cn: string; en: string };
  address: string;
  star: number;
  score: number; // 评分，后端未返回则根据星级计算
  price: number;
  min_price: number;
  roomType: string;
  imageurl: string;
  images: string[];
  tags: string[];
  facilities: string[];
  hotel_info?: {
    name_en?: string;
    phone?: string;
    open_date?: string;
    desc?: string;
    tags?: string[];
    facilities?: string[];
    [key: string]: any;
  };
  rooms: Room[];
}

// 根据星级计算默认评分
const getDefaultScore = (star: number): number => {
  const scoreMap: Record<number, number> = {
    5: 4.8,
    4: 4.5,
    3: 4.0,
    2: 3.5,
    1: 3.0,
  };
  return scoreMap[star] || 4.0;
};

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 日期/人状态
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkIn, setCheckIn] = useState<Date>(today);
  const [checkOut, setCheckOut] = useState<Date>(tomorrow);
  const [adults, setAdults] = useState<number>(2);
  const [checkinVisible, setCheckinVisible] = useState<boolean>(false);
  const [checkoutVisible, setCheckoutVisible] = useState<boolean>(false);

  // 数据状态
  const [hotel, setHotel] = useState<FormattedHotel | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchHotelDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const result = await getHotelDetailWithGeo(id);
        if (result.ok && result.hotel) {
          const h = result.hotel;
          // 处理 banner_urls（后端返回的是 images.bannerUrls）
          const bannerUrls = h.images?.bannerUrls || h.banner_urls || [];
          // 处理 rooms（后端返回的是 roomTypes）
          const roomTypes = h.roomTypes || h.rooms || [];

          // 处理 tags 和 facilities（从 hotel_info 中获取）
          const hotelTags = h.hotel_info?.tags || [];
          const hotelFacilities = h.hotel_info?.facilities || [];

          const formattedHotel: FormattedHotel = {
            id: h.id,
            name: { cn: h.name, en: h.hotel_info?.name_en || h.name },
            address: h.address,
            star: h.star || 3,
            score: getDefaultScore(h.star || 3), // 后端无评分，根据星级计算
            price: h.min_price,
            min_price: h.min_price,
            roomType: h.hotel_info?.room_type || '标准房',
            imageurl: bannerUrls[0] || '',
            images: bannerUrls,
            tags: hotelTags,
            facilities: hotelFacilities,
            hotel_info: h.hotel_info,
            rooms: roomTypes.map((r: any) => ({
              id: r.id,
              type: r.name || r.room_type || r.type || '',
              price: r.price,
              breakfast: r.breakfast_included === 1 || r.breakfast === true,
              capacity: r.capacity || 2,
              size: r.room_space || r.size || 25,
              image_url: r.images?.[0]?.url || r.image_url || '',
            })),
          };
          setHotel(formattedHotel);
          // 处理 stations 数据
          if (result.stations && result.stations.length > 0) {
            setStations(result.stations);
          }
        } else {
          Toast.show({ content: '获取酒店详情失败', icon: 'fail' });
        }
      } catch (error) {
        console.error('获取酒店详情失败:', error);
        Toast.show({ content: '获取酒店详情失败', icon: 'fail' });
      } finally {
        setLoading(false);
      }
    };

    fetchHotelDetail();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', marginTop: '100px' }}>
        <Loading size="large" />
        <p style={{ marginTop: 16, color: '#999' }}>加载中...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>暂无酒店详情信息</p>
        <Button onClick={() => navigate(-1)}>返回列表</Button>
      </div>
    );
  }

  // 工具函数
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;

  const images = hotel.images?.length > 0 ? hotel.images : [hotel.imageurl];

  const renderStars = (star: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <StarFill key={i} style={{ color: i < star ? '#FFB400' : '#e0e0e0', fontSize: '13px' }} />
    ));

  // 渲染评分标签
  const renderScore = (score: number) => {
    const scoreText = score >= 4.8 ? '超棒' : score >= 4.5 ? '好评' : score >= 4.0 ? '不错' : '尚可';
    return (
      <span className="detail-score">
        {score} {scoreText}
      </span>
    );
  };

  const handleCheckinConfirm = (val: Date) => {
    setCheckIn(val);
    if (val >= checkOut) {
      const next = new Date(val);
      next.setDate(next.getDate() + 1);
      setCheckOut(next);
    }
    setCheckinVisible(false);
  };

  const handleCheckoutConfirm = (val: Date) => {
    if (val <= checkIn) {
      Toast.show({ content: '退房日期须晚于入住日期', icon: 'fail' });
      return;
    }
    setCheckOut(val);
    setCheckoutVisible(false);
  };

  const rooms = hotel.rooms || [];

  // 登录检查
  const checkLoginAndProceed = (callback: () => void) => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      Toast.show({ content: '请先登录', icon: 'fail' });
      navigate('/login', { state: { from: '/detail/' + id } });
      return;
    }
    callback && callback();
  };

  return (
    <div className="detail-page">
      {/* 顶部导航 */}
      <NavBar onBack={() => navigate(-1)} style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        酒店详情
      </NavBar>

      {/* 轮播图 */}
      <Swiper autoplay loop style={{ '--height': '250px' }}>
        {images.map((img, idx) => (
          <Swiper.Item key={idx}>
            <img src={img} alt={hotel.name.cn} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
          </Swiper.Item>
        ))}
      </Swiper>

      {/* 酒店基本信息 */}
      <div className="detail-header">
        <div className="detail-name">{hotel.name.cn}</div>
        <div className="detail-name-en">{hotel.name.en}</div>
        <div className="detail-stars-row">
          <div className="detail-stars">{renderStars(hotel.star)}</div>
          {renderScore(hotel.score)}
        </div>
        <div className="detail-address">
          <EnvironmentOutline style={{ fontSize: 14, marginRight: 4 }} />
          {hotel.address}
        </div>
        {/* 开业时间、电话 */}
        {(hotel.hotel_info?.open_date || hotel.hotel_info?.phone) && (
          <div className="detail-extra-info">
            {hotel.hotel_info?.open_date && (
              <span>
                <CalendarOutline style={{ fontSize: 12, marginRight: 4 }} />
                开业：{String(hotel.hotel_info.open_date).slice(0, 10)}
              </span>
            )}
            {hotel.hotel_info?.phone && (
              <span>
                <PhoneFill style={{ fontSize: 12, marginRight: 4 }} />
                电话：{hotel.hotel_info.phone}
              </span>
            )}
          </div>
        )}
        {/* 显示标签和设施 */}
        {(hotel.tags.length > 0 || hotel.facilities.length > 0) && (
          <div className="detail-tags">
            {hotel.tags.map(tag => (
              <Tag key={tag} color="primary" style={{ marginRight: 4, marginBottom: 4 }}>{tag}</Tag>
            ))}
            {hotel.facilities.slice(0, 4).map(facility => (
              <Tag key={facility} color="default" style={{ marginRight: 4, marginBottom: 4 }}>{facility}</Tag>
            ))}
          </div>
        )}
        {/* 显示地铁站信息 */}
        {stations.length > 0 && (
          <div className="detail-tags">
            {stations.slice(0, 2).map((station, idx) => {
              // 处理 line_name 和 line_color，可能是数组或字符串
              const lineNames = Array.isArray(station.line_name) ? station.line_name : [station.line_name];
              const lineColors = Array.isArray(station.line_color) ? station.line_color : [station.line_color];
              const firstLineName = lineNames[0] || '';
              const firstLineColor = lineColors[0] || '#1677ff';

              return (
                <Tag
                  key={idx}
                  style={{
                    marginRight: 4,
                    marginBottom: 4,
                    backgroundColor: `#${firstLineColor}`,
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  <UnorderedListOutline style={{ fontSize: 10, marginRight: 3 }} />
                  {firstLineName} · 距{station.name}{Math.round(station.distance)}米
                </Tag>
              );
            })}
          </div>
        )}
      </div>

      {/* 日期选择 */}
      <div className="detail-date-section">
        <div className="detail-date-row" onClick={() => setCheckinVisible(true)}>
          <div className="detail-date-item">
            <span className="detail-date-label">入住</span>
            <span className="detail-date-value">{fmt(checkIn)}</span>
            <span className="detail-date-week">{weekdays[checkIn.getDay()]}</span>
          </div>
          <div className="detail-nights-badge">共{nights}晚</div>
          <div className="detail-date-item detail-date-right" onClick={(e) => { e.stopPropagation(); setCheckoutVisible(true); }}>
            <span className="detail-date-label">离店</span>
            <span className="detail-date-value">{fmt(checkOut)}</span>
            <span className="detail-date-week">{weekdays[checkOut.getDay()]}</span>
          </div>
        </div>
         {/* 人数选择行 */}
        <div className="detail-people-row">
          <span className="detail-people-label">入住人数</span>
          <div className="detail-people-right">
            <Stepper
              min={1}
              max={10}
              value={adults}
              onChange={setAdults}
              style={{ '--border': '1px solid #ddd', '--border-radius': '4px', '--input-width': '36px' }}
            />
            <span className="detail-people-count"> 人</span>
          </div>
        </div>
      </div>

      {/* 房型列表 */}
      <div className="detail-rooms-section">
        <div className="section-title">房型列表</div>
        {rooms.length === 0 ? (
          <div className="no-rooms">暂无房型信息</div>
        ) : (
          <div style={{ padding: '0 12px' }}>
            {rooms.map((room: any) => (
              <RoomCard
                key={room.id}
                id={room.id}
                name={room.type}
                price={room.price}
                breakfast={room.breakfast}
                capacity={room.capacity}
                size={room.size}
                imageUrl={room.image_url}
                onBook={(r) => checkLoginAndProceed(() => Toast.show({ content: `已选：${r.name}`, icon: 'success' }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部占位 */}
      <div style={{ height: '80px' }} />

      {/* 底部预订栏 */}
      <div className="detail-bottom-bar">
        <div className="bottom-price">
          <span className="price-symbol">¥</span>
          <span className="price-num">{hotel.min_price}</span>
          <span className="price-unit">起</span>
        </div>
        <Button
          color="primary"
          size="large"
          style={{ padding: '0 28px' }}
          onClick={() => checkLoginAndProceed(() => Toast.show({ content: '正在进入预订流程…', icon: 'loading' }))}
        >
          立即预订
        </Button>
      </div>

      {/* 日期选择器 */}
      <DatePicker
        title="入住日期"
        visible={checkinVisible}
        onClose={() => setCheckinVisible(false)}
        defaultValue={checkIn}
        min={new Date()}
        onConfirm={handleCheckinConfirm}
        precision="day"
      />

      <DatePicker
        title="退房日期"
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        defaultValue={checkOut}
        min={(() => { const m = new Date(checkIn); m.setDate(m.getDate() + 1); return m; })()}
        onConfirm={handleCheckoutConfirm}
        precision="day"
      />
    </div>
  );
}
