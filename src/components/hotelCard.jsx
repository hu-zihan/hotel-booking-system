// src/components/HotelCard.jsx
import React from 'react';
import { StarFill, EnvironmentOutline } from 'antd-mobile-icons';

export default function HotelCard({ data, onClick }) {
  const { name, imageurl, tags, facilities, score, star, price, address, rooms } = data;

  const hasBreakfast = rooms?.some(r => r.breakfast);
  const minPrice = rooms ? Math.min(...rooms.map(r => r.price)) : price;

  const renderStars = (n) =>
    Array.from({ length: 5 }, (_, i) => (
      React.createElement(StarFill, { key: i, style: { color: i < n ? '#FFB400' : '#e0e0e0', fontSize: '10px' } })
    ));

  return (
    <div
      className="hotel-card"
      onClick={onClick}
      style={{
        display: 'flex',
        marginBottom: '12px',
        background: '#fff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'transform 0.15s',
      }}
      onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.985)')}
      onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ position: 'relative', flexShrink: 0, width: 116 }}>
        <img
          src={imageurl}
          alt={name.cn}
          style={{ width: 116, height: '100%', minHeight: 130, objectFit: 'cover', display: 'block' }}
        />
        {hasBreakfast && (
          <span style={{
            position: 'absolute', bottom: 6, left: 0,
            background: '#52c41a', color: '#fff',
            fontSize: 10, padding: '2px 6px',
            borderRadius: '0 4px 4px 0',
          }}>{'\u542b\u65e9'}</span>
        )}
      </div>

      <div style={{ flex: 1, padding: '10px 12px 10px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
          <span style={{ fontWeight: 'bold', fontSize: 15, color: '#222', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
            {name.cn}
          </span>
          <span style={{ background: '#0086F6', color: '#fff', fontSize: 13, fontWeight: 'bold', borderRadius: '4px 4px 0 4px', padding: '1px 6px', flexShrink: 0 }}>
            {score}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 5 }}>
          {renderStars(star)}
          <span style={{ fontSize: 10, color: '#aaa', marginLeft: 4 }}>{star}{'\u661f\u7ea7'}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
          {(facilities || tags).slice(0, 3).map(t => (
            <span key={t} style={{ fontSize: 10, color: '#0086F6', background: '#eaf4ff', padding: '1px 5px', borderRadius: 3 }}>{t}</span>
          ))}
        </div>
        {address && (
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: '#aaa', marginBottom: 6, overflow: 'hidden' }}>
            <EnvironmentOutline style={{ fontSize: 11, marginRight: 2, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#aaa', marginRight: 2 }}>{'\u6700\u4f4e'}</span>
          <span style={{ fontSize: 12, color: '#ff4d4f' }}>{'\u00a5'}</span>
          <span style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f', lineHeight: 1 }}>{minPrice}</span>
          <span style={{ fontSize: 11, color: '#aaa' }}>{'\u8d77/\u665a'}</span>
        </div>
      </div>
    </div>
  );
}