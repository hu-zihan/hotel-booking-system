import { Button, Calendar, Loading, Popup, SearchBar, Swiper, Tag, Toast } from 'antd-mobile';
import { EnvironmentOutline } from 'antd-mobile-icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPopularHotels, reverseGeocode } from '../../api';
import CityPicker from '../../components/CityPicker';
import HotelCard from '../../components/hotelCard';
import { getDefaultScore } from '../../utils/score';
import './Home.css';

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
const getNights = (range: Date[]) => Math.max(1, Math.round((range[1].getTime() - range[0].getTime()) / 86400000));

// 酒店卡片数据类型
interface HotelCardData {
  id: string;
  name: { cn: string; en: string };
  address: string;
  star: number;
  price: number;
  min_price: number;
  imageurl: string;
  tags: string[];
  score?: number;
}

export default function MobileHome() {
  const navigate = useNavigate();
  // 状态：控制日历弹出层
  const [calendarVisible, setCalendarVisible] = useState(false);
  // 状态：存储选中的日期范围
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  // 临时状态：存储用户正在选择的日期（点击确认后才正式保存到 dateRange）
  const [tempDateRange, setTempDateRange] = useState<[Date, Date] | null>(null);
  // 状态：存储当前城市
  const [currentCity, setCurrentCity] = useState('上海');
  // 状态：定位加载中
  const [locating, setLocating] = useState(false);
  // 用户定位的经纬度
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  // 定位到的城市名称
  const [locatedCity, setLocatedCity] = useState<string | null>(null);
  //  搜索与筛选
  const [keyword, setKeyword] = useState(''); // 搜索关键字
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 已选中的标签

  // 价格筛选
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [priceVisible, setPriceVisible] = useState(false);

  // 星级筛选
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [starVisible, setStarVisible] = useState(false);

  // 城市选择器
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

  // ── 热门酒店数据 ────────────────────────────
  const [hotels, setHotels] = useState<HotelCardData[]>([]);
  const [hotTags, setHotTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载热门酒店
  useEffect(() => {
    const fetchPopularHotels = async () => {
      try {
        const result = await getPopularHotels(10);
        if (result.ok && result.data.popular) {
          const formatted = result.data.popular.map(h => ({
            id: h.id,
            name: { cn: h.name, en: h.name },
            star: h.star,
            price: h.min_price,
            min_price: h.min_price,
            imageurl: h.banner_urls?.[0] || '',
            tags: [],
            address: h.address || '',
            score: getDefaultScore(h.star || 3),
          }));
          setHotels(formatted);

          // 提取热门标签（暂时使用空数组，后端数据有标签时再处理）
          setHotTags([]);
        }
      } catch (error) {
        console.error('获取热门酒店失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularHotels();
  }, []);

  // 获取当前位置的函数
  const handleGetLocation = () => {
    // 检查浏览器是否支持地理定位
    if (!navigator.geolocation) {
      Toast.show({
        icon: 'fail',
        content: '您的浏览器不支持地理定位',
      });
      return;
    }

    setLocating(true);
    Toast.show({
      icon: 'loading',
      content: '定位中...',
      duration: 0, // 不自动关闭
    });

    navigator.geolocation.getCurrentPosition(
      // 成功获取位置
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('获取到的坐标：', latitude, longitude);

        // 保存用户定位的经纬度
        setUserLocation({ lat: latitude, lon: longitude });

        try {
          const result = await reverseGeocode(latitude, longitude);

          if (result.ok && result.location && result.location.city) {
            // 去掉"市"字
            const cityName = result.location.city.replace('市', '');
            setCurrentCity(cityName);
            // 保存定位到的城市名称
            setLocatedCity(cityName);
            Toast.clear();
            Toast.show({
              icon: 'success',
              content: `定位成功：${result.location.city}`,
            });
          } else {
            throw new Error('解析位置失败');
          }
        } catch (error) {
          console.error('定位失败：', error);
          Toast.clear();
          Toast.show({
            icon: 'fail',
            content: '定位失败，请稍后重试',
          });
        } finally {
          setLocating(false);
        }
      },
      // 获取位置失败
      (error) => {
        console.error('定位失败：', error);
        setLocating(false);
        Toast.clear();

        let errorMsg = '定位失败';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = '用户拒绝了定位请求';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = '位置信息不可用';
            break;
          case error.TIMEOUT:
            errorMsg = '定位请求超时';
            break;
          default:
            errorMsg = '未知的定位错误';
        }

        Toast.show({
          icon: 'fail',
          content: errorMsg,
        });
      },
      // 定位选项
      {
        enableHighAccuracy: true, // 启用高精度
        timeout: 10000, // 超时时间10秒
        maximumAge: 0 // 不使用缓存位置
      }
    );
  };

  // 标签点击切换
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // 处理查询点击
  const handleSearch = async () => {

    // 2. 构建查询参数
    const params = new URLSearchParams();

    // 放入城市
    params.append('city', currentCity);

    // 放入日期 (转换为时间戳或字符串)
    if (dateRange) {
        params.append('startDate', dateRange[0].getTime().toString());
        params.append('endDate', dateRange[1].getTime().toString());
    }

    // 放入关键字 (后端用 q 参数)
    if (keyword) params.append('q', keyword);

    // 放入标签
    if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

    // 放入价格筛选
    if (priceRange) {
        if (priceRange[0] > 0) params.append('minPrice', priceRange[0].toString());
        if (priceRange[1] > 0) params.append('maxPrice', priceRange[1].toString());
    }

    // 放入星级筛选
    if (starFilter) {
        params.append('minStar', starFilter.toString());
        params.append('maxStar', starFilter.toString());
    }

    // 放入用户定位的经纬度（只有当定位到的城市和当前选择的城市一致时才添加）
    if (userLocation && locatedCity && locatedCity === currentCity) {
        console.log('添加用户位置到查询参数：', userLocation);
        params.append('latitude', userLocation.lat.toString());
        params.append('longitude', userLocation.lon.toString());
    }

    // 3. 执行跳转 -> 列表页
    console.log('跳往列表页，参数：', params.toString());
    navigate(`/list?${params.toString()}`);
  };

  // 渲染顶部 Banner 区域的函数
  const renderBanner = () => {
    if (loading) {
      return (
        <div className="home-banner">
          <Loading />
        </div>
      );
    }
    const bannerHotels = hotels.slice(0, 4);
    if (bannerHotels.length === 0) return null;

    return (
      <div className="home-banner">
        <Swiper autoplay loop style={{ '--height': '220px' }}>
          {bannerHotels.map(h => (
            <Swiper.Item key={h.id}>
              <div
                onClick={() => navigate(`/detail/${h.id}`)}
                style={{ position: 'relative', height: '220px', cursor: 'pointer' }}
              >
                <img src={h.imageurl} alt={h.name.cn} className="home-banner-img" />
                <div className="home-banner-mask" />
                <div className="home-banner-text">
                  <span className="home-banner-tag">今日特惠</span>
                  <div className="home-banner-name">{h.name.cn}</div>
                </div>
              </div>
            </Swiper.Item>
          ))}
        </Swiper>
      </div>
    );
  };

  return (
    <div className="home-page">
      {/* 1. 顶部 Banner 区域 */}
      {renderBanner()}

      {/* 2. 搜索卡片区域 */}
      <div className="search-container">
        {/* 城市/定位 */}
        <div className="search-row border-bottom">
          <span className="city" onClick={() => setCityPickerVisible(true)} style={{ cursor: 'pointer' }}>
            {currentCity} ▼
          </span>
          <div
            className="location"
            onClick={handleGetLocation}
            style={{ cursor: 'pointer', opacity: locating ? 0.5 : 1 }}
          >
            {locating ? <Loading color="currentColor" /> : <EnvironmentOutline />} {locating ? '定位中...' : '我的位置'}
          </div>
        </div>

        {/* 日期选择 */}
        <div className="date-row" onClick={() => setCalendarVisible(true)}>
          <div className="date-block">
            <span className="date-block-label">入住</span>
            <span className={`date-block-value${!dateRange ? ' placeholder' : ''}`}>
              {dateRange ? fmt(dateRange[0]) : '请选择'}
            </span>
            <span className="date-block-week">
              {dateRange ? weekdays[dateRange[0].getDay()] : ''}
            </span>
          </div>
          <div className="date-nights-center">
            {dateRange ? `${getNights(dateRange)}晚` : '选日期'}
          </div>
          <div className="date-block date-block-right">
            <span className="date-block-label">离店</span>
            <span className={`date-block-value${!dateRange ? ' placeholder' : ''}`}>
              {dateRange ? fmt(dateRange[1]) : '请选择'}
            </span>
            <span className="date-block-week">
              {dateRange ? weekdays[dateRange[1].getDay()] : ''}
            </span>
          </div>
        </div>

        {/* 关键词搜索 */}
        <div className="search-row">
          <SearchBar
            placeholder='搜索酒店、地点、关键词'
            className="search-bar"
            value={keyword}
            onChange={val => setKeyword(val)} // Antd Mobile SearchBar 直接返回字符串
          />
        </div>

        {/* 价格和星级筛选 */}
        <div className="search-row" style={{ gap: '8px', flexWrap: 'wrap' }}>
          {/* 价格筛选按钮 */}
          <Tag
            color={priceRange ? 'primary' : 'default'}
            fill={priceRange ? 'solid' : 'outline'}
            onClick={() => setPriceVisible(true)}
            style={{ cursor: 'pointer' }}
          >
            {priceRange ? `¥${priceRange[0]}-${priceRange[1]}` : '价格'}
          </Tag>

          {/* 星级筛选按钮 */}
          <Tag
            color={starFilter ? 'primary' : 'default'}
            fill={starFilter ? 'solid' : 'outline'}
            onClick={() => setStarVisible(true)}
            style={{ cursor: 'pointer' }}
          >
            {starFilter ? `${starFilter}星` : '星级'}
          </Tag>

          {/* 已选筛选清除按钮 */}
          {(priceRange || starFilter) && (
            <Tag
              color="warning"
              fill="outline"
              onClick={() => { setPriceRange(null); setStarFilter(null); }}
              style={{ cursor: 'pointer' }}
            >
              清除筛选
            </Tag>
          )}
        </div>

        {/*快捷标签 (使用 hotTags 并支持点击)*/}
        <div className="tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 0' }}>
          {hotTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
                <Tag 
                    key={tag} 
                    // 选中时变成实心 primary 色，未选中时是空心默认色
                    color={isSelected ? 'primary' : 'default'} 
                    fill={isSelected ? 'solid' : 'outline'}
                    className="tag-item"
                    onClick={() => toggleTag(tag)}
                    style={{ cursor: 'pointer' }}
                >
                    {tag}
                </Tag>
            );
          })}
        </div>

        {/* 查询按钮 */}
        <Button block color='primary' size='large' onClick={handleSearch}>
          开始查询
        </Button>
      </div>

      {/* 3. 推荐酒店列表容器 */}
      <div className="hotel-list-container">
        <div className="section-header">
          <div className="section-header-line" />
          <span className="section-header-title">热门推荐</span>
          <span className="section-header-sub">精选好评酒店</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loading />
          </div>
        ) : (
          hotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              data={hotel}
              onClick={() => navigate(`/detail/${hotel.id}`)}
            />
          ))
        )}
      </div>

      {/* 价格筛选弹窗 */}
      <Popup
        visible={priceVisible}
        onMaskClick={() => setPriceVisible(false)}
        bodyStyle={{ padding: '16px', borderRadius: '12px 12px 0 0' }}
      >
        <div style={{ marginBottom: 16, fontWeight: 'bold' }}>选择价格范围</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: '不限', value: null },
            { label: '300以下', value: [0, 300] as [number, number] },
            { label: '300-600', value: [300, 600] as [number, number] },
            { label: '600-1000', value: [600, 1000] as [number, number] },
            { label: '1000-2000', value: [1000, 2000] as [number, number] },
            { label: '2000以上', value: [2000, 0] as [number, number] },
          ].map(item => (
            <Tag
              key={item.label}
              color={JSON.stringify(priceRange) === JSON.stringify(item.value) ? 'primary' : 'default'}
              fill={JSON.stringify(priceRange) === JSON.stringify(item.value) ? 'solid' : 'outline'}
              onClick={() => {
                setPriceRange(item.value);
                setPriceVisible(false);
              }}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              {item.label}
            </Tag>
          ))}
        </div>
      </Popup>

      {/* 星级筛选弹窗 */}
      <Popup
        visible={starVisible}
        onMaskClick={() => setStarVisible(false)}
        bodyStyle={{ padding: '16px', borderRadius: '12px 12px 0 0' }}
      >
        <div style={{ marginBottom: 16, fontWeight: 'bold' }}>选择酒店星级</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: '不限', value: null },
            { label: '五星级', value: 5 },
            { label: '四星级', value: 4 },
            { label: '三星级', value: 3 },
            { label: '二星级', value: 2 },
          ].map(item => (
            <Tag
              key={item.label}
              color={starFilter === item.value ? 'primary' : 'default'}
              fill={starFilter === item.value ? 'solid' : 'outline'}
              onClick={() => {
                setStarFilter(item.value);
                setStarVisible(false);
              }}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              {item.label}
            </Tag>
          ))}
        </div>
      </Popup>

      {/* 日历组件 */}
        <Popup
                visible={calendarVisible} // 控制弹窗显示
                onMaskClick={() => setCalendarVisible(false)} // 点击遮罩关闭
                onClose={() => {
                  setCalendarVisible(false); // 关闭弹窗
                  setTempDateRange(null); // 清空临时选择的日期
                }}
                bodyStyle={{ height: 'auto', maxHeight: '80vh' }} // 自适应高度，最高80%视窗
            >
                <div style={{ padding: '12px' }}>
                  {/* 日历选择器 - 范围模式 */}
                  <Calendar
                    selectionMode='range' // 范围选择模式
                    value={tempDateRange || dateRange} // 显示临时选择或已确认的日期
                    onChange={val => {
                      setTempDateRange(val); // 用户选择日期时存入临时状态
                    }}
                  />
                  {/* 确认按钮区域 */}
                  <div style={{ padding: '12px 0' }}>
                    <Button 
                      block // 按钮占满整行
                      color='primary' 
                      size='large'
                      disabled={!tempDateRange} // 未选择完整日期范围时禁用按钮
                      onClick={() => {
                        if (tempDateRange) {
                          setDateRange(tempDateRange); // 将临时日期保存到正式状态
                          // 保存到 localStorage
                          localStorage.setItem('checkInDate', tempDateRange[0].toISOString());
                          localStorage.setItem('checkOutDate', tempDateRange[1].toISOString());
                          setCalendarVisible(false); // 关闭弹窗
                          setTempDateRange(null); // 清空临时状态
                        }
                      }}
                    >
                      确认
                    </Button>
                  </div>
                </div>
        </Popup>

      {/* 城市选择器 */}
      <CityPicker
        visible={cityPickerVisible}
        onClose={() => setCityPickerVisible(false)}
        currentCity={currentCity}
        onSelect={(city) => {
          setCurrentCity(city);
        }}
      />
    </div>
  );
}