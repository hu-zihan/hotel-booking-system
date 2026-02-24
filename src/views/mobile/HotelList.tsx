import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  NavBar, SearchBar, Dropdown, Radio, Space, Tag, Button,
  Popup, DatePicker, Stepper, InfiniteScroll, ErrorBlock, Toast,
} from 'antd-mobile';
import { EnvironmentOutline, StarFill, SearchOutline } from 'antd-mobile-icons';
import { searchHotels, Hotel, SearchParams } from '../../api';
import './HotelList.css';

// 酒店卡片数据类型
interface HotelCardData {
  id: string;
  name: { cn: string; en: string };
  address: string;
  star: number;
  price: number;
  min_price: number;
  imageurl: string;
  banner_urls?: string[];
  location?: { lat: number; lon: number };
  distance?: number;
  tags: string[];
  facilities: string[];
  rooms?: { breakfast: boolean }[];
  score?: number;
}

// ── 常量 ────────────────────────────────────────
const CITIES = ['上海', '南京', '北京', '杭州', '成都', '广州'];
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
const QUICK_TAGS = ['免费停车场', '含早餐', '近地铁', '亲子酒店', '健身房', 'SPA', '湖景', '江景房'];
const scoreLevel = (s: number) => s >= 4.8 ? '超棒' : s >= 4.5 ? '好评' : s >= 4.0 ? '不错' : '尚可';
const scoreBadgeClass = (s: number) => s >= 4.8 ? 'score-orange' : s >= 4.5 ? 'score-blue' : s >= 4.0 ? 'score-green' : 'score-gray';

// 城市名到 adcode 的映射
const CITY_ADCODE_MAP: Record<string, string> = {
  '上海': '310100',
  '南京': '320100',
  '北京': '110000',
  '杭州': '330100',
  '成都': '510100',
  '广州': '440100',
};

export default function ListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dropdownRef = useRef(null);

  // ── 从 URL 取初始参数 ────────────────────────
  const initCity    = searchParams.get('city')    || '上海';
  const initKeyword = searchParams.get('keyword') || '';
  const tagsParam   = searchParams.get('tags')    || '';
  const initTags    = tagsParam ? tagsParam.split(',') : [];

  // ── 顶部条件状态 ─────────────────────────────
  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const [city, setCity]               = useState<string>(initCity);
  const [keyword, setKeyword]         = useState<string>(initKeyword);
  const [checkIn, setCheckIn]         = useState<Date>(today);
  const [checkOut, setCheckOut]       = useState<Date>(tomorrow);
  const [adults, setAdults]           = useState<number>(2);

  // ── 数据状态 ────────────────────────────────
  const [hotels, setHotels]           = useState<HotelCardData[]>([]);
  const [loading, setLoading]         = useState<boolean>(false);
  const [total, setTotal]             = useState<number>(0);

  // 弹层控制
  const [cityVisible,     setCityVisible]     = useState<boolean>(false);
  const [checkinVisible,  setCheckinVisible]  = useState<boolean>(false);
  const [checkoutVisible, setCheckoutVisible] = useState<boolean>(false);
  const [peopleVisible,   setPeopleVisible]   = useState<boolean>(false);
  const [searchVisible,   setSearchVisible]   = useState<boolean>(false);

  // ── 筛选状态 ─────────────────────────────────
  const [starFilter,      setStarFilter]      = useState<string>('all');
  const [priceFilter,     setPriceFilter]     = useState<string>('all');
  const [sortOrder,       setSortOrder]       = useState<string>('recommend');
  const [breakfastFilter, setBreakfastFilter] = useState<string>('all');
  const [quickTagFilter,  setQuickTagFilter]  = useState<string[]>([]);

  // ── 分页状态 ─────────────────────────────────
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));

  // ── 获取酒店列表 ─────────────────────────────
  const fetchHotels = useCallback(async (pageNum = 1, isLoadMore = false) => {
    setLoading(true);
    try {
      // 构建筛选参数
      const params = {
        q: keyword,
        page: pageNum,
        pageSize: PAGE_SIZE,
        adcode: CITY_ADCODE_MAP[city],
      };

      // 价格筛选
      if (priceFilter === '0-300') {
        params.maxPrice = 300;
      } else if (priceFilter === '300-600') {
        params.minPrice = 300;
        params.maxPrice = 600;
      } else if (priceFilter === '600-1000') {
        params.minPrice = 600;
        params.maxPrice = 1000;
      } else if (priceFilter === '1000+') {
        params.minPrice = 1000;
      }

      // 星级筛选
      if (starFilter !== 'all') {
        params.minStar = parseInt(starFilter);
        params.maxStar = parseInt(starFilter);
      }

      const result = await searchHotels(params);

      if (result.ok) {
        // 格式化后端数据为前端需要的格式
        const formattedHotels = result.data.hotels.map(h => ({
          id: h.id,
          name: { cn: h.name, en: h.name },
          address: h.address,
          star: h.star,
          price: h.min_price,
          min_price: h.min_price,
          imageurl: h.banner_urls?.[0] || '',
          banner_urls: h.banner_urls,
          location: h.location,
          distance: h.distance,
          tags: [],
          facilities: [],
        }));

        if (isLoadMore) {
          setHotels(prev => [...prev, ...formattedHotels]);
        } else {
          setHotels(formattedHotels);
        }
        setTotal(result.data.pagination.total);
      }
    } catch (error) {
      console.error('获取酒店列表失败:', error);
      Toast.show({
        icon: 'fail',
        content: '获取酒店列表失败',
      });
    } finally {
      setLoading(false);
    }
  }, [city, keyword, starFilter, priceFilter]);

  // 首次加载和筛选条件变化时获取数据
  useEffect(() => {
    setPage(1);
    fetchHotels(1, false);
  }, [city, keyword, starFilter, priceFilter]);

  // ── 筛选后重置分页 ────────────────────────────
  useEffect(() => { setPage(1); }, [city, keyword, starFilter, priceFilter, sortOrder, breakfastFilter, quickTagFilter]);

  // ── 当前页显示的数据 ──────────────────────────
  const visibleHotels = hotels;
  const hasMore = hotels.length < total;

  const loadMore = useCallback(async () => {
    if (loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchHotels(nextPage, true);
  }, [page, loading, fetchHotels]);

  // ── 日期工具 ──────────────────────────────────
  const handleCheckinConfirm = (val) => {
    setCheckIn(val);
    if (val >= checkOut) {
      const next = new Date(val); next.setDate(val.getDate() + 1);
      setCheckOut(next);
    }
    setCheckinVisible(false);
  };
  const handleCheckoutConfirm = (val) => {
    if (val <= checkIn) { Toast.show({ content: '退房须晚于入住', icon: 'fail' }); return; }
    setCheckOut(val);
    setCheckoutVisible(false);
  };

  // ── 星级 label map ────────────────────────────
  const starLabel  = { all: '星级', 5: '五星', 4: '四星', 3: '三星', 2: '经济' };
  const priceLabel = { all: '价格', '0-300': '¥~300', '300-600': '300-600', '600-1000': '600-1k', '1000+': '1k+' };
  const sortLabel  = { recommend: '排序', price_asc: '低→高', price_desc: '高→低', score: '评分' };

  const isFiltered = starFilter !== 'all' || priceFilter !== 'all' || sortOrder !== 'recommend' || breakfastFilter !== 'all';

  // ── 渲染 ─────────────────────────────────────
  return (
    <div className="list-page">

      {/* ① 顶部导航 */}
      <div className="list-sticky-top">
        <NavBar className="list-navbar" onBack={() => navigate(-1)}>
          酒店列表
        </NavBar>

        {/* ① 条件栏：单行布局 */}
        <div className="list-cond-bar">
          {/* 城市 */}
          <button className="cond-chip cond-city" onClick={() => setCityVisible(true)}>
            <EnvironmentOutline style={{ fontSize: 13, marginRight: 3 }} />
            {city}
          </button>

          {/* 日期段 */}
          <div className="cond-dates" onClick={() => setCheckinVisible(true)}>
            <span className="cond-date-item">
              <div className="cond-date-d">{fmt(checkIn)}</div>
              <div className="cond-date-w">{weekdays[checkIn.getDay()]}</div>
            </span>
            <span className="cond-nights">{nights}晚</span>
            <span className="cond-date-item" onClick={(e) => { e.stopPropagation(); setCheckoutVisible(true); }}>
              <div className="cond-date-d">{fmt(checkOut)}</div>
              <div className="cond-date-w">{weekdays[checkOut.getDay()]}</div>
            </span>
          </div>

          {/* 人数 */}
          <button className="cond-chip cond-people" onClick={() => setPeopleVisible(true)}>
            {adults}人
          </button>

          {/* 搜索图标 */}
          <button className="cond-chip cond-search-btn" onClick={() => setSearchVisible(true)}>
            <SearchOutline style={{ fontSize: 15, color: '#666' }} />
          </button>
        </div>

        {/* ② 筛选条 */}
        <div className="list-filter-bar">
          <Dropdown ref={dropdownRef}>
            <Dropdown.Item
              key="sort"
              title={<span className={sortOrder !== 'recommend' ? 'filter-active' : ''}>{sortLabel[sortOrder]}</span>}
            >
              <div className="dropdown-content">
                <Radio.Group value={sortOrder} onChange={(v) => { setSortOrder(v); dropdownRef.current?.close(); }}>
                  <Space direction="vertical" block>
                    <Radio value="recommend">综合推荐</Radio>
                    <Radio value="price_asc">价格从低到高</Radio>
                    <Radio value="price_desc">价格从高到低</Radio>
                    <Radio value="score">评分最高</Radio>
                  </Space>
                </Radio.Group>
              </div>
            </Dropdown.Item>

            <Dropdown.Item
              key="star"
              title={<span className={starFilter !== 'all' ? 'filter-active' : ''}>{starLabel[starFilter]}</span>}
            >
              <div className="dropdown-content">
                <Radio.Group value={starFilter} onChange={(v) => { setStarFilter(v); dropdownRef.current?.close(); }}>
                  <Space direction="vertical" block>
                    <Radio value="all">不限星级</Radio>
                    <Radio value="5">五星级 / 豪华</Radio>
                    <Radio value="4">四星级 / 高档</Radio>
                    <Radio value="3">三星级 / 舒适</Radio>
                    <Radio value="2">二星级及以下 / 经济</Radio>
                  </Space>
                </Radio.Group>
              </div>
            </Dropdown.Item>

            <Dropdown.Item
              key="price"
              title={<span className={priceFilter !== 'all' ? 'filter-active' : ''}>{priceLabel[priceFilter]}</span>}
            >
              <div className="dropdown-content">
                <Radio.Group value={priceFilter} onChange={(v) => { setPriceFilter(v); dropdownRef.current?.close(); }}>
                  <Space direction="vertical" block>
                    <Radio value="all">不限价格</Radio>
                    <Radio value="0-300">¥300 以下</Radio>
                    <Radio value="300-600">¥300 – ¥600</Radio>
                    <Radio value="600-1000">¥600 – ¥1000</Radio>
                    <Radio value="1000+">¥1000 以上</Radio>
                  </Space>
                </Radio.Group>
              </div>
            </Dropdown.Item>

            <Dropdown.Item
              key="more"
              title={<span className={breakfastFilter !== 'all' ? 'filter-active' : ''}>更多</span>}
            >
              <div className="dropdown-content">
                <div className="dropdown-section-title">早餐</div>
                <Radio.Group value={breakfastFilter} onChange={(v) => { setBreakfastFilter(v); dropdownRef.current?.close(); }}>
                  <Space direction="vertical" block>
                    <Radio value="all">不限</Radio>
                    <Radio value="yes">含早餐</Radio>
                  </Space>
                </Radio.Group>
              </div>
            </Dropdown.Item>
          </Dropdown>

          {/* 已选筛选数量徽章 */}
          {isFiltered && (
            <button
              className="filter-reset-btn"
              onClick={() => { setStarFilter('all'); setPriceFilter('all'); setSortOrder('recommend'); setBreakfastFilter('all'); }}
            >
              重置
            </button>
          )}
        </div>
      </div>

      {/* 快捷标签筛选行 */}
      <div className="quick-tags-row">
        {QUICK_TAGS.map(tag => (
          <button
            key={tag}
            className={`quick-tag${quickTagFilter.includes(tag) ? ' active' : ''}`}
            onClick={() => setQuickTagFilter(prev =>
              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 结果计数 */}
      <div className="list-result-count">
        共 <strong>{filteredHotels.length}</strong> 家 · {city} · {fmt(checkIn)}—{fmt(checkOut)} · {nights}晚 · {adults}人
      </div>

      {/* ③ 酒店列表 */}
      <div className="list-cards">
        {filteredHotels.length === 0 ? (
          <div style={{ marginTop: 60 }}>
            <ErrorBlock status="empty" title="暂无结果" description="换个条件试试吧" />
          </div>
        ) : (
          <>
            {visibleHotels.map((hotel) => (
              <ListHotelCard
                key={hotel.id}
                hotel={hotel}
                nights={nights}
                onClick={() => navigate(`/detail/${hotel.id}`)}
              />
            ))}
            <InfiniteScroll loadMore={loadMore} hasMore={hasMore} threshold={50}>
              {hasMore
                ? <div className="list-loading-hint">加载中…</div>
                : <div className="list-no-more">— 已显示全部 {filteredHotels.length} 家酒店 —</div>
              }
            </InfiniteScroll>
          </>
        )}
      </div>

      {/* ── 弹层区 ── */}

      {/* 城市选择 */}
      <Popup visible={cityVisible} onMaskClick={() => setCityVisible(false)} bodyStyle={{ borderRadius: '12px 12px 0 0', padding: '20px 16px 32px' }}>
        <div className="popup-title">选择城市</div>
        <Space wrap>
          {CITIES.map(c => (
            <Button
              key={c}
              size="small"
              color={city === c ? 'primary' : 'default'}
              fill={city === c ? 'solid' : 'outline'}
              onClick={() => { setCity(c); setCityVisible(false); }}
            >
              {c}
            </Button>
          ))}
        </Space>
      </Popup>

      {/* 搜索框 */}
      <Popup visible={searchVisible} onMaskClick={() => setSearchVisible(false)} bodyStyle={{ padding: '16px', borderRadius: '12px 12px 0 0' }}>
        <div className="popup-title">搜索酒店</div>
        <SearchBar
          placeholder="酒店名 / 地址 / 关键词"
          defaultValue={keyword}
          onSearch={(v) => { setKeyword(v); setSearchVisible(false); }}
          onClear={() => setKeyword('')}
          showCancelButton
          onCancel={() => setSearchVisible(false)}
          style={{ '--border-radius': '8px' }}
        />
      </Popup>

      {/* 人数弹层 */}
      <Popup visible={peopleVisible} onMaskClick={() => setPeopleVisible(false)} bodyStyle={{ padding: '20px 16px 32px', borderRadius: '12px 12px 0 0' }}>
        <div className="popup-title">入住人数</div>
        <div className="people-row">
          <span>成人</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Stepper min={1} max={10} value={adults} onChange={setAdults} />
            <span className="people-count">{adults} 人</span>
          </div>
        </div>
        <Button block color="primary" style={{ marginTop: 16 }} onClick={() => setPeopleVisible(false)}>确定</Button>
      </Popup>

      {/* 入住日期 */}
      <DatePicker
        title="入住日期"
        visible={checkinVisible}
        onClose={() => setCheckinVisible(false)}
        defaultValue={checkIn}
        min={new Date()}
        onConfirm={handleCheckinConfirm}
        precision="day"
      />

      {/* 退房日期 */}
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

// ── 列表卡片子组件 ────────────────────────────────
function ListHotelCard({ hotel, nights, onClick }) {
  const { name, imageurl, tags, score, star, price, address, facilities, rooms } = hotel;
  const hasBreakfast = rooms?.some(r => r.breakfast);
  const minPrice = rooms ? Math.min(...rooms.map(r => r.price)) : price;
  const totalPrice = minPrice * nights;
  // 模拟评论数（真实项目从接口获取）
  const renderStars = (n) =>
    Array.from({ length: 5 }, (_, i) => (
      <StarFill key={i} style={{ color: i < n ? '#FFB400' : '#e0e0e0', fontSize: '10px' }} />
    ));

  return (
    <div className="lc-card" onClick={onClick}>
      {/* 左侧图片 */}
      <div className="lc-img-wrap">
        <img src={imageurl} alt={name.cn} className="lc-img" />
        {hasBreakfast && <span className="lc-breakfast-badge">含早</span>}
      </div>

      {/* 右侧信息 */}
      <div className="lc-body">

        {/* ── 上半区 ── */}
        <div>
          {/* 第一行：名称 + 评分徽章 */}
          <div className="lc-name-row">
            <span className="lc-name">{name.cn}</span>
            <div className={`lc-score-badge ${scoreBadgeClass(score)}`}>
              <span className="lc-score-num">{score}</span>
              <span className="lc-score-label">{scoreLevel(score)}</span>
            </div>
          </div>

          {/* 第二行：星级 */}
          <div className="lc-stars-row">
            {renderStars(star)}
            <span className="lc-star-text">{star}星</span>
          </div>

          {/* 第三行：地址 */}
          <div className="lc-address">
            <EnvironmentOutline style={{ fontSize: 11, marginRight: 3, color: '#bbb', flexShrink: 0 }} />
            <span>{address}</span>
          </div>

          {/* 第四行：设施标签 */}
          <div className="lc-tags">
            {(facilities || tags).slice(0, 3).map(t => (
              <span key={t} className="lc-tag">{t}</span>
            ))}
          </div>
        </div>

        {/* ── 下半区：价格 ── */}
        <div className="lc-price-area">
          <div>
            <div className="lc-price-main">
              <span className="lc-price-unit">¥</span>
              <span className="lc-price-num">{minPrice}</span>
              <span className="lc-price-per">起/晚</span>
            </div>
            <div className="lc-price-total">{nights}晚共¥{totalPrice}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
