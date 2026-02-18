import React, { useMemo, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
//  引入了最新的 ErrorBlock 组件，替换掉了已弃用的 Empty
// 新增引入 Dropdown, Radio, Space 组件
import { NavBar, ErrorBlock, Dropdown, Radio, Space } from 'antd-mobile';
import { mockHotels } from '../../mockData'; 
import HotelCard from '../../components/hotelCard';

export default function ListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
// --- 引用定义 ---
  const dropdownRef = useRef(null);

  // 1. 获取并格式化 URL 参数
  const city = searchParams.get('city') || '';
  const keyword = searchParams.get('keyword') || '';
  const tagsParam = searchParams.get('tags') || '';
  // 如果有标签，把字符串 '亲子,湖景' 劈开变成数组 ['亲子', '湖景']
  const selectedTags = tagsParam ? tagsParam.split(',') : [];
  // 2. 新增本地状态：用于页内的高级筛选 (星级和价格)
  const [starFilter, setStarFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');

  // --- 交互优化函数：选中后自动关闭菜单 ---
  const handleStarChange = (val) => {
    setStarFilter(val);
    dropdownRef.current?.close(); // 3. 选中即关闭，体验丝滑
  };

  const handlePriceChange = (val) => {
    setPriceFilter(val);
    dropdownRef.current?.close(); // 3. 选中即关闭
  };

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

      // 关卡 D：星级匹配 (动态比较器)
      let matchStar = true;
      if (starFilter !== 'all') {
        matchStar = hotel.star === parseInt(starFilter);
      }

      // 关卡 E：价格匹配 (区间比较器)
      let matchPrice = true;
      if (priceFilter === '0-300') matchPrice = hotel.price <= 300;
      else if (priceFilter === '300-600') matchPrice = hotel.price > 300 && hotel.price <= 600;
      else if (priceFilter === '600-1000') matchPrice = hotel.price > 600 && hotel.price <= 1000;
      else if (priceFilter === '1000+') matchPrice = hotel.price > 1000;

      // 必须同时通过五道关卡！(AND 逻辑)
      return matchCity && matchKeyword && matchTags && matchStar && matchPrice;
    });
  }, [city, keyword, selectedTags, starFilter, priceFilter]); // 依赖项增加了两个本地状态

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

      {/* --- 新增：高级筛选下拉菜单 (吸顶设计) --- */}
      <div style={{ position: 'sticky', top: '45px', zIndex: 9, borderBottom: '1px solid #eee', background: '#fff' }}>
        <Dropdown ref={dropdownRef}>
          <Dropdown.Item key='star' title='酒店星级'>
            <div style={{ padding: '16px' }}>
              <Radio.Group value={starFilter} onChange={handleStarChange}>
                <Space direction='vertical' block>
                  <Radio value='all'>不限星级</Radio>
                  <Radio value='5'>五星级/豪华</Radio>
                  <Radio value='4'>四星级/高档</Radio>
                  <Radio value='3'>三星级/舒适</Radio>
                  <Radio value='2'>二星级及以下/经济</Radio>
                </Space>
              </Radio.Group>
            </div>
          </Dropdown.Item>
          
          <Dropdown.Item key='price' title='价格区间'>
            <div style={{ padding: '16px' }}>
              <Radio.Group value={priceFilter} onChange={handlePriceChange}>
                <Space direction='vertical' block>
                  <Radio value='all'>不限价格</Radio>
                  <Radio value='0-300'>¥300 以下</Radio>
                  <Radio value='300-600'>¥300 - ¥600</Radio>
                  <Radio value='600-1000'>¥600 - ¥1000</Radio>
                  <Radio value='1000+'>¥1000 以上</Radio>
                </Space>
              </Radio.Group>
            </div>
          </Dropdown.Item>
        </Dropdown>
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