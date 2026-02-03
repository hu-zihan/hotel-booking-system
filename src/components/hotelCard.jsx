// src/components/HotelCard.jsx
import React from 'react';

/**
 * HotelCard 组件：用于展示单个酒店的摘要信息卡片
 * @param {Object} props.data - 包含酒店名、价格、评分、标签等详细数据的对象
 * @param {Function} props.onClick - 点击整个卡片时触发的导航或逻辑回调
 */


export default function HotelCard({ data, onClick }) {
  // 解构赋值：从 data 中提取出我们需要的具体字段，这样下面写代码更简洁
  const { name, imageurl, tags, score, star, price } = data;

  return (
    <div 
      className="hotel-card" 
      onClick={onClick} // 这里的 onClick 是从父组件 Home.jsx 传下来的“传送指令”
      style={{ 
        display: 'flex', 
        marginBottom: '15px', 
        background: '#fff', 
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        cursor: 'pointer', // 添加鼠标指针样式，表示可点击
        transition: 'transform 0.2s' // 添加过渡效果
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} // 鼠标悬停时放大
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} // 鼠标离开时恢复
    >
      {/* 酒店左侧：图片展示区 */}
      <img 
        src={imageurl} 
        alt={name.cn}
        style={{ width: '120px', height: '120px', objectFit: 'cover' }} 
      />
      
      {/* 酒店右侧：详情信息区 */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* 显示酒店中文名 */}
          <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{name.cn}</div>
          
          {/* 标签列表：使用第二层 map 渲染该酒店特有的标签 */}
          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {tags.map(tag => (
              <span key={tag} style={{ 
                fontSize: '10px', color: '#0086F6', background: '#e6f3ff',
                padding: '2px 6px', borderRadius: '4px'
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* 评分与星级展示 */}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            <span style={{ color: '#faad14', fontWeight: 'bold' }}>{score}分</span> · {star}星级
          </div>
        </div>

        {/* 价格区域：右对齐突出显示 */}
        <div style={{ textAlign: 'right', color: '#ff4d4f', fontSize: '20px', fontWeight: 'bold' }}>
          <span style={{ fontSize: '12px', color: '#999', fontWeight: 'normal' }}>¥</span>
          {price}
          <span style={{ fontSize: '12px', color: '#999', fontWeight: 'normal' }}> 起</span>
        </div>
      </div>
    </div>
  );
}