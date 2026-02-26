/**
 * @file HotelList.jsx
 * @description 移动端酒店列表页组件
 * 功能包括：从 URL 读取初始搜索参数、城市/日期/人数/关键词条件修改、
 * 多维度筛选（星级/价格/早餐/快捷标签）与排序、分页无限滚动加载、
 * 以及列表卡片子组件 ListHotelCard 的渲染。
 */
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  NavBar, SearchBar, Dropdown, Radio, Space, Tag, Button,
  Popup, DatePicker, Stepper, InfiniteScroll, ErrorBlock, Toast,
} from 'antd-mobile';
import { EnvironmentOutline, StarFill, SearchOutline } from 'antd-mobile-icons';
import { mockHotels } from '../../mockData';
import './HotelList.css';

// ── 常量 ────────────────────────────────────────

/** 每页加载的酒店数量 */
const PAGE_SIZE = 4;

/** 可选城市列表 */
const CITIES = ['上海', '南京', '北京', '杭州', '成都', '广州'];

/** 中文星期映射，索引与 Date.getDay() 对应（0 = 周日） */
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 将 Date 对象格式化为 "M/D" 字符串
 * @param {Date} d
 * @returns {string} 例如 "2/26"
 */
const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

/** 快捷筛选标签选项 */
const QUICK_TAGS = ['免费停车场', '含早餐', '近地铁', '亲子酒店', '健身房', 'SPA', '湖景', '江景房'];

/**
 * 根据评分返回对应的文字描述
 * @param {number} s - 评分（0~5）
 * @returns {string} 评价文字
 */
const scoreLevel = (s) => s >= 4.8 ? '超棒' : s >= 4.5 ? '好评' : s >= 4.0 ? '不错' : '尚可';

/**
 * 根据评分返回对应的 CSS 徽章类名
 * @param {number} s - 评分（0~5）
 * @returns {string} CSS 类名
 */
const scoreBadgeClass = (s) => s >= 4.8 ? 'score-orange' : s >= 4.5 ? 'score-blue' : s >= 4.0 ? 'score-green' : 'score-gray';

/**
 * ListPage - 酒店列表页主组件
 * 从 URL query 参数中读取初始搜索条件，
 * 支持在页面内修改城市/日期/人数/关键词/筛选项并实时过滤列表。
 */
export default function ListPage() {
  // React Router 导航与 URL 参数钩子
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Dropdown 组件的 ref，用于手动关闭下拉菜单
  const dropdownRef = useRef(null);

  // ── 从 URL 取初始参数 ────────────────────────
  // 首页跳转时通过 URLSearchParams 传入，列表页读取作为初始值
  const initCity    = searchParams.get('city')    || '上海';
  const initKeyword = searchParams.get('keyword') || '';
  const tagsParam   = searchParams.get('tags')    || '';
  // tags 为逗号分隔字符串，拆分为数组；无标签时为空数组
  const initTags    = tagsParam ? tagsParam.split(',') : [];

  // ── 顶部条件状态 ─────────────────────────────
  // 默认入住今天、退房明天
  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const [city, setCity]               = useState(initCity);      // 当前选中城市
  const [keyword, setKeyword]         = useState(initKeyword);   // 关键词搜索
  const [checkIn, setCheckIn]         = useState(today);         // 入住日期
  const [checkOut, setCheckOut]       = useState(tomorrow);      // 退房日期
  const [adults, setAdults]           = useState(2);             // 入住人数，默认 2 人

  // ── 弹层显示控制 ──────────────────────────────
  const [cityVisible,     setCityVisible]     = useState(false); // 城市选择弹层
  const [checkinVisible,  setCheckinVisible]  = useState(false); // 入住日期选择器
  const [checkoutVisible, setCheckoutVisible] = useState(false); // 退房日期选择器
  const [peopleVisible,   setPeopleVisible]   = useState(false); // 人数选择弹层
  const [searchVisible,   setSearchVisible]   = useState(false); // 搜索框弹层

  // ── 筛选状态 ─────────────────────────────────
  const [starFilter,      setStarFilter]      = useState('all');      // 星级筛选，'all' 表示不限
  const [priceFilter,     setPriceFilter]     = useState('all');      // 价格区间筛选
  const [sortOrder,       setSortOrder]       = useState('recommend'); // 排序方式
  const [breakfastFilter, setBreakfastFilter] = useState('all');      // 含早餐筛选
  const [quickTagFilter,  setQuickTagFilter]  = useState([]);         // 快捷标签多选

  // ── 分页状态 ─────────────────────────────────
  const [page, setPage] = useState(1); // 当前已加载的页数，初始第 1 页

  // 计算入住晚数，最少 1 晚
  const nights = Math.max(1, Math.round((checkOut - checkIn) / 86400000));

  // ── 筛选条件变化时重置回第 1 页 ────────────────
  // 避免筛选后分页仍停在旧页，导致数据显示不完整
  useEffect(() => { setPage(1); }, [city, keyword, starFilter, priceFilter, sortOrder, breakfastFilter, quickTagFilter]);

  // ── 过滤 + 排序（useMemo 缓存，依赖变化才重新计算）───────
  /**
   * 根据当前全部筛选条件对 mockHotels 进行过滤和排序。
   * 依赖：city、keyword、initTags、starFilter、priceFilter、
   *       sortOrder、breakfastFilter、quickTagFilter
   */
  const filteredHotels = useMemo(() => {
    let list = mockHotels.filter((h) => {
      // 城市匹配：移除"市"字后做模糊匹配（"上海市" → "上海"）
      const matchCity    = city    ? h.address.includes(city.replace('市', '')) : true;
      // 关键词匹配：中文名 / 英文名（不区分大小写）/ 地址
      const matchKw      = keyword ? h.name.cn.includes(keyword) || h.name.en.toLowerCase().includes(keyword.toLowerCase()) || h.address.includes(keyword) : true;
      // 来自首页的标签参数，要求酒店同时包含所有标签（AND 逻辑）
      const matchTags    = initTags.length > 0 ? initTags.every(t => h.tags?.includes(t)) : true;
      // 星级精确匹配
      const matchStar    = starFilter  !== 'all' ? h.star === parseInt(starFilter) : true;
      // 含早餐：检查 rooms 中是否存在 breakfast 为 true 的房型
      const matchBreakfast = breakfastFilter === 'yes' ? h.rooms?.some(r => r.breakfast) : true;
      // 快捷标签：在 tags 和 facilities 合并后同时包含所有选中标签（AND 逻辑）
      const matchQuick   = quickTagFilter.length > 0
        ? quickTagFilter.every(t => [...(h.tags||[]), ...(h.facilities||[])].includes(t))
        : true;
      // 价格区间匹配
      let matchPrice = true;
      if      (priceFilter === '0-300')    matchPrice = h.price <= 300;
      else if (priceFilter === '300-600')  matchPrice = h.price > 300 && h.price <= 600;
      else if (priceFilter === '600-1000') matchPrice = h.price > 600 && h.price <= 1000;
      else if (priceFilter === '1000+')    matchPrice = h.price > 1000;
      return matchCity && matchKw && matchTags && matchStar && matchPrice && matchBreakfast && matchQuick;
    });

    // 排序：默认综合推荐（不改变原数组顺序），其余用 spread 创建副本再排序
    if      (sortOrder === 'price_asc')  list = [...list].sort((a, b) => a.price - b.price);
    else if (sortOrder === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sortOrder === 'score')      list = [...list].sort((a, b) => b.score - a.score);

    return list;
  }, [city, keyword, initTags.join(','), starFilter, priceFilter, sortOrder, breakfastFilter, quickTagFilter]);

  // ── 分页截取 ──────────────────────────────────
  // 仅取前 page * PAGE_SIZE 条数据渲染，其余由无限滚动按需追加
  const visibleHotels = filteredHotels.slice(0, page * PAGE_SIZE);
  // 是否还有更多数据可以加载
  const hasMore       = visibleHotels.length < filteredHotels.length;

  /**
   * 无限滚动加载更多：延迟 600ms 模拟网络请求，然后将 page + 1
   * useCallback 保证函数引用稳定，避免 InfiniteScroll 重复触发
   */
  const loadMore = useCallback(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setPage(p => p + 1);
        resolve();
      }, 600);
    });
  }, []);

  // ── 日期工具 ──────────────────────────────────

  /**
   * 确认入住日期
   * 若所选入住日期 >= 当前退房日期，自动将退房日期顺延至入住次日，确保日期有效
   * @param {Date} val - 用户在 DatePicker 中选择的入住日期
   */
  const handleCheckinConfirm = (val) => {
    setCheckIn(val);
    if (val >= checkOut) {
      const next = new Date(val); next.setDate(val.getDate() + 1);
      setCheckOut(next);
    }
    setCheckinVisible(false);
  };

  /**
   * 确认退房日期
   * 若所选退房日期 <= 入住日期，则提示错误并拒绝更新
   * @param {Date} val - 用户在 DatePicker 中选择的退房日期
   */
  const handleCheckoutConfirm = (val) => {
    if (val <= checkIn) { Toast.show({ content: '退房须晚于入住', icon: 'fail' }); return; }
    setCheckOut(val);
    setCheckoutVisible(false);
  };

  // ── 筛选标签文字映射 ──────────────────────────
  // 用于 Dropdown.Item 的 title 显示：将 state 值映射为用户可读的中文标签
  const starLabel  = { all: '星级', 5: '五星', 4: '四星', 3: '三星', 2: '经济' };
  const priceLabel = { all: '价格', '0-300': '¥~300', '300-600': '300-600', '600-1000': '600-1k', '1000+': '1k+' };
  const sortLabel  = { recommend: '排序', price_asc: '低→高', price_desc: '高→低', score: '评分' };

  // 是否有任何筛选项处于非默认状态，用于控制"重置"按钮的显示
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

      {/* 快捷标签筛选行：横向滚动，支持多选，选中状态高亮 */}
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

      {/* 搜索结果摘要：展示过滤后的酒店总数及当前搜索条件 */}
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

/**
 * ListHotelCard - 酒店列表单条卡片
 * 左侧展示酒店封面图（含含早徽章），右侧展示名称、星级、地址、设施标签和价格信息。
 *
 * @param {Object}   props
 * @param {Object}   props.hotel   - 酒店数据对象（来自 mockData）
 * @param {number}   props.nights  - 入住晚数，用于计算总价
 * @param {Function} props.onClick - 点击卡片的回调，通常用于跳转详情页
 */
function ListHotelCard({ hotel, nights, onClick }) {
  const { name, imageurl, tags, score, star, price, address, facilities, rooms } = hotel;
  // 判断是否有任意房型含早餐
  const hasBreakfast = rooms?.some(r => r.breakfast);
  // 取所有房型中的最低价格；若无 rooms 数据则回退到酒店基准价
  const minPrice = rooms ? Math.min(...rooms.map(r => r.price)) : price;
  // 按晚数计算总价
  const totalPrice = minPrice * nights;

  /**
   * 渲染 n 颗星星（满星金色，空星灰色）
   * @param {number} n - 星级数量
   * @returns {JSX.Element[]}
   */
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

          {/* 第四行：设施/标签（优先显示 facilities，最多展示 3 个，避免撑破布局）*/}
          <div className="lc-tags">
            {(facilities || tags).slice(0, 3).map(t => (
              <span key={t} className="lc-tag">{t}</span>
            ))}
          </div>
        </div>

        {/* ── 下半区：价格信息 ── 显示最低起步价及按晚数计算的总价 */}
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
