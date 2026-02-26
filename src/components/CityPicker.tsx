import { useState, useMemo } from 'react';
import { Popup, SearchBar, Button } from 'antd-mobile';

// 热门城市数据，按拼音排序
const HOT_CITIES = [
  { name: '北京', pinyin: 'beijing' },
  { name: '成都', pinyin: 'chengdu' },
  { name: '重庆', pinyin: 'chongqing' },
  { name: '广州', pinyin: 'guangzhou' },
  { name: '杭州', pinyin: 'hangzhou' },
  { name: '南京', pinyin: 'nanjing' },
  { name: '上海', pinyin: 'shanghai' },
  { name: '深圳', pinyin: 'shenzhen' },
  { name: '苏州', pinyin: 'suzhou' },
  { name: '天津', pinyin: 'tianjin' },
  { name: '武汉', pinyin: 'wuhan' },
  { name: '西安', pinyin: 'xian' },
  { name: '厦门', pinyin: 'xiamen' },
  { name: '长沙', pinyin: 'changsha' },
  { name: '郑州', pinyin: 'zhengzhou' },
  { name: '济南', pinyin: 'jinan' },
  { name: '青岛', pinyin: 'qingdao' },
  { name: '大连', pinyin: 'dalian' },
  { name: '沈阳', pinyin: 'shenyang' },
  { name: '昆明', pinyin: 'kunming' },
].sort((a, b) => a.pinyin.localeCompare(b.pinyin));

interface CityPickerProps {
  visible: boolean;
  onClose: () => void;
  currentCity: string;
  onSelect: (city: string) => void;
}

export default function CityPicker({ visible, onClose, currentCity, onSelect }: CityPickerProps) {
  const [searchValue, setSearchValue] = useState('');

  // 根据搜索过滤城市
  const filteredCities = useMemo(() => {
    if (!searchValue) return HOT_CITIES;
    const value = searchValue.toLowerCase();
    return HOT_CITIES.filter(city =>
      city.name.includes(searchValue) || city.pinyin.includes(value)
    );
  }, [searchValue]);

  // 按拼音首字母分组
  const groupedCities = useMemo(() => {
    const groups: Record<string, typeof HOT_CITIES> = {};
    filteredCities.forEach(city => {
      const letter = city.pinyin.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(city);
    });
    return groups;
  }, [filteredCities]);

  const handleSelect = (city: string) => {
    onSelect(city);
    onClose();
    setSearchValue('');
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      bodyStyle={{ height: '70vh', borderRadius: '16px 16px 0 0' }}
      position="bottom"
    >
      <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 12, fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
          选择城市
        </div>
        <SearchBar
          placeholder="搜索城市"
          value={searchValue}
          onChange={setSearchValue}
          style={{ '--border-radius': '8px', marginBottom: 12 }}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {Object.entries(groupedCities).map(([letter, cities]) => (
            <div key={letter}>
              <div style={{
                background: '#f5f5f5',
                padding: '6px 12px',
                fontSize: 12,
                color: '#666',
                fontWeight: 'bold'
              }}>
                {letter}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', padding: '8px 12px', gap: '8px' }}>
                {cities.map(city => (
                  <Button
                    key={city.name}
                    size="small"
                    color={city.name === currentCity ? 'primary' : 'default'}
                    fill={city.name === currentCity ? 'solid' : 'outline'}
                    onClick={() => handleSelect(city.name)}
                  >
                    {city.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {filteredCities.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              未找到匹配的城市
            </div>
          )}
        </div>
      </div>
    </Popup>
  );
}
