import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
// 1. 引入了最新的 ErrorBlock 组件，替换掉了已弃用的 Empty
import { NavBar, ErrorBlock } from 'antd-mobile'; 
import { mockHotels } from '../../mockData'; 
import HotelCard from '../../components/hotelCard';

export default function ListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 1. 获取并格式化 URL 参数
  const city = searchParams.get('city') || '';
  const keyword = searchParams.get('keyword') || '';
  const tagsParam = searchParams.get('tags') || '';
  // 如果有标签，把字符串 '亲子,湖景' 劈开变成数组 ['亲子', '湖景']
  const selectedTags = tagsParam ? tagsParam.split(',') : [];

  // 2. 核心魔法：使用 useMemo 缓存过滤结果，提升性能
  const filteredHotels = useMemo(() => {
    return mockHotels.filter((hotel) => {
      // 关卡 A：城市匹配 (只要地址里包含这个城市名就算通过)
      const matchCity = city ? hotel.address.includes(city.replace('市', '')) : true;

      // 关卡 B：关键字匹配 (中英文名、地址里只要包含关键字就算通过)
      const matchKeyword = keyword
        ? hotel.name.cn.includes(keyword) || 
          hotel.name.en.toLowerCase().includes(keyword.toLowerCase()) || 
          hotel.address.includes(keyword)
        : true;

      // 关卡 C：标签匹配 (数组的 every 方法：要求酒店包含【所有】你选中的标签)
      const matchTags = selectedTags.length > 0
        ? selectedTags.every((t) => hotel.tags?.includes(t))
        : true;

      // 必须同时通过三道关卡 (AND 逻辑)
      return matchCity && matchKeyword && matchTags;
    });
  }, [city, keyword, selectedTags]); // 只有这三个条件变了，才重新计算

  return (
    <div className="list-page" style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 顶部导航栏，固定在顶部 */}
      <NavBar onBack={() => navigate(-1)} style={{ background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        酒店列表
      </NavBar>

      {/* 搜索条件回显区：告诉用户现在正在看什么条件的结果 */}
      <div style={{ padding: '10px 16px', background: '#fff', fontSize: '13px', color: '#666', marginBottom: '12px' }}>
        {city && <span style={{ marginRight: '12px' }}>📍 {city}</span>}
        {keyword && <span style={{ marginRight: '12px' }}>🔍 "{keyword}"</span>}
        {selectedTags.map(tag => (
           <span key={tag} style={{ marginRight: '6px', background: '#e6f4ff', color: '#1677ff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
             {tag}
           </span>
        ))}
      </div>

      {/* 列表渲染区 */}
      <div style={{ padding: '0 16px 20px' }}>
        {filteredHotels.length > 0 ? (
          // 如果有数据，循环渲染 HotelCard
          filteredHotels.map((hotel) => (
            <div key={hotel.id} style={{ marginBottom: '12px' }}>
              <HotelCard 
                data={hotel} 
                onClick={() => navigate(`/detail/${hotel.id}`)} 
              />
            </div>
          ))
        ) : (
          // 2. 使用更规范的 ErrorBlock 组件渲染空状态
          <div style={{ marginTop: '60px' }}>
            <ErrorBlock 
              status='empty' 
              title='暂无结果' 
              description='没有找到符合条件的酒店，请换个关键词试试' 
            />
          </div>
        )}
      </div>
    </div>
  );
}