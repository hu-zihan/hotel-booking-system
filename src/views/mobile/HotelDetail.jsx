// src/views/mobile/HotelDetail.jsx
import React from 'react';
// useParams: 核心钩子，专门用于从 URL 路径中提取动态参数（如 :id）
// useNavigate: 用于在代码逻辑中触发页面跳转（如点击返回）
import { useParams, useNavigate } from 'react-router-dom';
// antd-mobile 组件库：提供符合移动端交互规范的 UI 零件
import { NavBar, Tag, Button, Space } from 'antd-mobile';
// 模拟数据源：在没有真实后端接口前，我们先从本地 mockData 读取数据
import { mockHotels } from '../../mockData';

/**
 * HotelDetail 页面组件
 * 职责：根据 URL 传入的 id，展示对应的酒店深度详情信息
 */
export default function HotelDetail() {
  // 1. 【获取参数】：从路由中提取 "id"（对应 App.jsx 中路由配置的 :id）
  const { id } = useParams(); 
  const navigate = useNavigate();

  // 2. 【数据寻址】：在 mock 数组中查找 id 与当前路径一致的酒店对象
  // 逻辑类比 SoC 的地址译码：匹配到正确的 ID 才能选中对应的存储单元
  const hotel = mockHotels.find(h => h.id === id);

  // 3. 【异常处理】：如果用户手动输入了错误的 ID，需要给一个友好的反馈
  if (!hotel) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>暂无酒店详情信息</p>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  return (
    <div className="detail-page" style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 顶部导航栏 
        onBack: 点击左侧返回箭头时，navigate(-1) 表示回到浏览器记录的上一页
      */}
      <NavBar onBack={() => navigate(-1)} style={{ background: '#fff' }}>
        {hotel.name.cn}
      </NavBar>

      {/* 酒店视觉区域：展示酒店主图 */}
      <div className="detail-banner">
        <img 
          src={hotel.imageurl} 
          alt={hotel.name.cn} 
          style={{ width: '100%', height: '240px', objectFit: 'cover' }} 
        />
      </div>

      {/* 核心信息展示区 */}
      <div style={{ padding: '16px', background: '#fff', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '20px', margin: '0 0 10px 0' }}>{hotel.name.cn}</h2>
        
        {/* 评分与标签 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ color: '#0086F6', fontWeight: 'bold', fontSize: '18px', marginRight: '8px' }}>
            {hotel.score}分
          </span>
          <Space>
            {hotel.tags.map(tag => (
              <Tag key={tag} color='primary' fill='outline' style={{ fontSize: '10px' }}>
                {tag}
              </Tag>
            ))}
          </Space>
        </div>

        {/* 详细地址 */}
        <div style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
          <strong>地址：</strong>{hotel.address}
        </div>
      </div>

      {/* 酒店属性详情（可选展示） */}
      <div style={{ padding: '16px', background: '#fff' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>酒店信息</h3>
        <div style={{ fontSize: '14px', color: '#666' }}>
          <p>星级：{hotel.star} 星级酒店</p>
          <p>开业时间：{hotel.openDate}</p>
          <p>推荐房型：{hotel.roomType}</p>
        </div>
      </div>

      {/* 底部吸底预订栏 
        使用 position: fixed 保证它始终悬浮在屏幕最下方
      */}
      <div style={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, 
        padding: '10px 16px', background: '#fff', borderTop: '1px solid #eee',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}>
        <div style={{ color: '#ff4d4f' }}>
          <span style={{ fontSize: '14px' }}>¥</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{hotel.price}</span>
          <span style={{ fontSize: '12px', color: '#999' }}> 起</span>
        </div>
        <Button color='primary' size='large' style={{ padding: '0 30px' }} onClick={() => alert('进入预订支付流程')}>
          立即预订
        </Button>
      </div>
    </div>
  );
}