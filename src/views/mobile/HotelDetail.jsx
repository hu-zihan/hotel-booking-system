// src/views/mobile/HotelDetail.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, Tag, Button, Space, Swiper, DatePicker, Stepper, Toast } from 'antd-mobile';
import { StarFill, EnvironmentOutline, TagOutline, ClockCircleOutline } from 'antd-mobile-icons';
import { mockHotels } from '../../mockData';
import './HotelDetail.css';

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── 日期/人数 状态 ──────────────────────────
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(2);
  const [checkinVisible, setCheckinVisible] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  // ── 数据寻址 ────────────────────────────────
 const hotel = mockHotels.find(h => String(h.id) === String(id));

  if (!hotel) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>暂无酒店详情信息</p>
        <Button onClick={() => navigate(-1)}>返回列表</Button>
      </div>
    );
  }

  // ── 工具函数 ────────────────────────────────
  const nights = Math.max(1, Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const fmt = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;

  const images = hotel.images?.length > 0 ? hotel.images : [hotel.imageurl];

  const renderStars = (star) =>
    Array.from({ length: 5 }, (_, i) => (
      <StarFill key={i} style={{ color: i < star ? '#FFB400' : '#e0e0e0', fontSize: '13px' }} />
    ));

  const handleCheckinConfirm = (val) => {
    setCheckIn(val);
    if (val >= checkOut) {
      const next = new Date(val);
      next.setDate(next.getDate() + 1);
      setCheckOut(next);
    }
    setCheckinVisible(false);
  };

  const handleCheckoutConfirm = (val) => {
    if (val <= checkIn) {
      Toast.show({ content: '退房日期须晚于入住日期', icon: 'fail' });
      return;
    }
    setCheckOut(val);
    setCheckoutVisible(false);
  };

  const rooms = hotel.rooms || [{ id: 'default', type: hotel.roomType, price: hotel.price, breakfast: false, capacity: 2, size: 25 }];

  // ── 渲染 ────────────────────────────────────
  return (
    <div className="detail-page">

      {/* ① 顶部导航：显示酒店名 + 返回列表 */}
      <NavBar
        className="detail-navbar"
        onBack={() => navigate(-1)}
      >
        {hotel.name.cn}
      </NavBar>

      {/* ② 大图 Banner — 支持左右滑动 */}
      <div className="detail-swiper-wrap">
        <Swiper loop autoplay style={{ '--height': '240px' }}>
          {images.map((img, idx) => (
            <Swiper.Item key={idx}>
              <img
                src={img}
                alt={`${hotel.name.cn} 图片${idx + 1}`}
                className="detail-swiper-img"
              />
            </Swiper.Item>
          ))}
        </Swiper>
        <span className="detail-img-count">
          {images.length} 张图片
        </span>
      </div>

      {/* ③ 酒店基础信息：名称 / 星级 / 设施 / 地址 */}
      <div className="detail-card">
        <h2 className="detail-hotel-name">{hotel.name.cn}</h2>
        <p className="detail-hotel-en">{hotel.name.en}</p>

        {/* 星级 + 评分 */}
        <div className="detail-star-row">
          <div className="detail-stars">
            {renderStars(hotel.star)}
            <span className="detail-star-label">{hotel.star}星级</span>
          </div>
          <span className="detail-score">{hotel.score} 分</span>
        </div>

        {/* 设施标签 */}
        <div className="detail-tags-title">
          <TagOutline style={{ marginRight: 4, color: '#ff7b47' }} />
          酒店设施
        </div>
        <Space wrap>
          {(hotel.facilities || hotel.tags).map(f => (
            <Tag key={f} color="primary" fill="outline" style={{ fontSize: '11px' }}>
              {f}
            </Tag>
          ))}
        </Space>

        {/* 地址 */}
        <div className="detail-address">
          <EnvironmentOutline style={{ color: '#0086F6', marginRight: '4px', flexShrink: 0 }} />
          {hotel.address}
        </div>

        {/* 开业时间 */}
        <div className="detail-open-date">
          <ClockCircleOutline style={{ color: '#aaa', marginRight: '4px', flexShrink: 0 }} />
          开业时间：{hotel.openDate}
        </div>
      </div>

      {/* ④ 日历 + 人间夜 Banner */}
      <div className="detail-card">
        <div className="detail-section-title">入住信息</div>

        {/* 日期选择行 */}
        <div className="detail-date-row">
          <div className="detail-date-item" onClick={() => setCheckinVisible(true)}>
            <div className="detail-date-label">入住</div>
            <div className="detail-date-value">{fmt(checkIn)}</div>
            <div className="detail-date-week">{weekdays[checkIn.getDay()]}</div>
          </div>

          <div className="detail-nights-badge">
            共 {nights} 晚
          </div>

          <div className="detail-date-item detail-date-right" onClick={() => setCheckoutVisible(true)}>
            <div className="detail-date-label">退房</div>
            <div className="detail-date-value">{fmt(checkOut)}</div>
            <div className="detail-date-week">{weekdays[checkOut.getDay()]}</div>
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
            <span className="detail-people-count">{adults} 人</span>
          </div>
        </div>
      </div>

      {/* ⑤ 房型价格列表 */}
      <div className="detail-card detail-rooms-card">
        <div className="detail-section-title">选择房型</div>
        {rooms.map((room, idx) => (
          <div key={room.id || idx} className={`detail-room-item${idx < rooms.length - 1 ? ' detail-room-divider' : ''}`}>
            {/* 房型缩略图 */}
            {room.imageurl && (
              <img src={room.imageurl} alt={room.type} className="detail-room-thumb" />
            )}
            <div className="detail-room-info">
              <div className="detail-room-type">{room.type}</div>
              <div className="detail-room-tags">
                <span className="detail-room-tag">{room.capacity} 人入住</span>
                {room.size && <span className="detail-room-tag">{room.size} ㎡</span>}
                <span className={`detail-room-tag ${room.breakfast ? 'tag-breakfast' : ''}`}>
                  {room.breakfast ? '含早餐' : '不含早餐'}
                </span>
              </div>
            </div>
            <div className="detail-room-price-col">
              <div className="detail-room-price">
                <span className="price-unit">¥</span>
                <span className="price-num">{room.price}</span>
                <span className="price-per">/晚</span>
              </div>
              <Button
                size="small"
                color="primary"
                style={{ marginTop: '8px' }}
                onClick={() => Toast.show({ content: `已选：${room.type}`, icon: 'success' })}
              >
                预订
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* DatePicker 弹出层 */}
      <DatePicker
        title="选择入住日期"
        visible={checkinVisible}
        onClose={() => setCheckinVisible(false)}
        defaultValue={checkIn}
        min={new Date()}
        onConfirm={handleCheckinConfirm}
        precision="day"
      />
      <DatePicker
        title="选择退房日期"
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        defaultValue={checkOut}
        min={(() => { const m = new Date(checkIn); m.setDate(m.getDate() + 1); return m; })()}
        onConfirm={handleCheckoutConfirm}
        precision="day"
      />

      {/* 底部吸底预订栏 */}
      <div className="detail-footer">
        <div>
          <div className="detail-footer-price">
            <span className="footer-unit">¥</span>
            <span className="footer-num">{hotel.price}</span>
            <span className="footer-per"> 起/晚</span>
          </div>
          <div className="detail-footer-meta">
            {fmt(checkIn)} — {fmt(checkOut)} · {nights} 晚 · {adults} 人
          </div>
        </div>
        <Button
          color="primary"
          size="large"
          style={{ padding: '0 28px' }}
          onClick={() => Toast.show({ content: '正在进入预订流程…', icon: 'loading' })}
        >
          立即预订
        </Button>
      </div>
    </div>
  );
}