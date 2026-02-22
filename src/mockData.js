/**
 * 酒店数据结构参考 (对齐文档必填维度)
 * 必须维度：酒店名(中/英), 酒店地址, 酒店星级, 酒店房型, 酒店价格, 酒店开业时间
 */

export const mockHotels = [
  // --- 原有数据 (保留) ---
  {
    id: "h1",
    name: {
      cn: "上海陆家嘴禧玥酒店",
      en: "Joyze Hotel Shanghai"
    },
    address: "上海市浦东新区浦东大道535号",
    star: 5,
    openDate: "2012-01-01",
    price: 936,
    roomType: "经典双床房",
    imageurl: "https://dimg04.c-ctrip.com/images/1mc4e12000brcmr26CB9D_R_600_400_R5.webp",
    images: [
      "https://dimg04.c-ctrip.com/images/1mc4e12000brcmr26CB9D_R_600_400_R5.webp",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1170&q=80",
    ],
    tags: ["免费停车场", "江景房", "亲子酒店"],
    facilities: ["免费WiFi", "停车场", "游泳池", "健身房", "儿童乐园", "餐厅", "客房服务"],
    score: 4.8,
    status: "approved",
    isOnline: true,
    rooms: [
      { id: "r1-1", type: "经典双床房", price: 936, breakfast: false, capacity: 2, size: 32, imageurl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=400&q=80" },
      { id: "r1-2", type: "豪华江景大床房", price: 1280, breakfast: true, capacity: 2, size: 45, imageurl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80" },
      { id: "r1-3", type: "行政套房", price: 2100, breakfast: true, capacity: 3, size: 68, imageurl: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=400&q=80" },
    ]
  },

  // --- 新增数据 (用于测试搜索和筛选) ---
  
  // 1. 高端/五星/南京新街口
  {
    id: "h2",
    name: {
      cn: "南京金陵饭店",
      en: "Jinling Hotel Nanjing"
    },
    address: "南京市鼓楼区汉中路2号 (新街口地铁站旁)",
    star: 5,
    openDate: "1983-10-04",
    price: 899,
    roomType: "豪华大床房",
    imageurl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=1170&q=80",
    ],
    tags: ["地标建筑", "行政酒廊", "免费停车场"],
    facilities: ["免费WiFi", "停车场", "商务中心", "餐厅", "酒吧", "行李寄存"],
    score: 4.9,
    status: "approved",
    isOnline: true,
    rooms: [
      { id: "r2-1", type: "豪华大床房", price: 899, breakfast: false, capacity: 2, size: 38, imageurl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=400&q=80" },
      { id: "r2-2", type: "行政大床房(含早)", price: 1100, breakfast: true, capacity: 2, size: 42, imageurl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80" },
      { id: "r2-3", type: "豪华套房", price: 2500, breakfast: true, capacity: 4, size: 85, imageurl: "https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=400&q=80" },
    ]
  },

  // 2. 中端/四星/玄武湖/亲子
  {
    id: "h3",
    name: {
      cn: "南京玄武湖假日酒店",
      en: "Holiday Inn Nanjing Xuanwu Lake"
    },
    address: "南京市玄武区龙蟠路193号",
    star: 4,
    openDate: "2010-05-20",
    price: 458,
    roomType: "湖景家庭房",
    imageurl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1025&q=80",
    images: [
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1025&q=80",
      "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1170&q=80",
    ],
    tags: ["亲子酒店", "湖景", "健身房"],
    facilities: ["免费WiFi", "健身房", "儿童乐园", "湖景餐厅", "游泳池"],
    score: 4.6,
    status: "approved",
    isOnline: true,
    rooms: [
      { id: "r3-1", type: "标准大床房", price: 358, breakfast: false, capacity: 2, size: 28, imageurl: "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=400&q=80" },
      { id: "r3-2", type: "湖景家庭房", price: 458, breakfast: true, capacity: 4, size: 52, imageurl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=400&q=80" },
      { id: "r3-3", type: "亲子套房", price: 680, breakfast: true, capacity: 4, size: 65, imageurl: "https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=400&q=80" },
    ]
  },

  // 3. 经济型/三星/夫子庙/商务
  {
    id: "h4",
    name: {
      cn: "全季酒店(南京夫子庙店)",
      en: "JI Hotel Nanjing Confucius Temple"
    },
    address: "南京市秦淮区建康路1号",
    star: 3,
    openDate: "2018-06-01",
    price: 320,
    roomType: "标准双床房",
    imageurl: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
    images: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1606402179428-a57976d71fa4?auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1170&q=80",
    ],
    tags: ["商务出行", "极速WIFI", "近地铁"],
    facilities: ["高速WiFi", "商务中心", "近地铁", "行李寄存", "24小时前台"],
    score: 4.7,
    status: "approved",
    isOnline: true,
    rooms: [
      { id: "r4-1", type: "标准大床房", price: 299, breakfast: false, capacity: 2, size: 22, imageurl: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=400&q=80" },
      { id: "r4-2", type: "标准双床房", price: 320, breakfast: false, capacity: 2, size: 24, imageurl: "https://images.unsplash.com/photo-1606402179428-a57976d71fa4?auto=format&fit=crop&w=400&q=80" },
      { id: "r4-3", type: "商务大床房(含早)", price: 399, breakfast: true, capacity: 2, size: 28, imageurl: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=400&q=80" },
    ]
  },

  // 4. 奢华/五星/德基/高价位测试
  {
    id: "h5",
    name: {
      cn: "南京丽思卡尔顿酒店",
      en: "The Ritz-Carlton, Nanjing"
    },
    address: "南京市玄武区中山路18号",
    star: 5,
    openDate: "2020-06-28",
    price: 2200,
    roomType: "尊贵客房",
    imageurl: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1049&q=80",
    images: [
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1049&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1157&q=80",
      "https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=1169&q=80",
    ],
    tags: ["奢华", "高空视野", "SPA", "下午茶"],
    facilities: ["管家服务", "SPA水疗", "无边泳池", "米其林餐厅", "私人管家", "直升机停机坪"],
    score: 5.0,
    status: "approved",
    isOnline: true,
    rooms: [
      { id: "r5-1", type: "尊贵客房", price: 2200, breakfast: true, capacity: 2, size: 55, imageurl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=400&q=80" },
      { id: "r5-2", type: "豪华全景套房", price: 3800, breakfast: true, capacity: 2, size: 90, imageurl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=400&q=80" },
      { id: "r5-3", type: "总统套房", price: 8800, breakfast: true, capacity: 4, size: 180, imageurl: "https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=400&q=80" },
    ]
  },

  // 5. 经济型/二星/低价位测试
  {
    id: "h6",
    name: {
      cn: "汉庭酒店(新街口中心店)",
      en: "HanTing Hotel Xinjiekou"
    },
    address: "南京市秦淮区淮海路50号",
    star: 2,
    openDate: "2015-03-15",
    price: 180,
    roomType: "特惠大床房",
    imageurl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1631049421450-348ccd7f8949?auto=format&fit=crop&w=1170&q=80",
    ],
    tags: ["经济", "无窗", "行李寄存"],
    facilities: ["免费WiFi", "前台24h", "行李寄存"],
    score: 4.2,
    status: "approved",
    isOnline: true,
    rooms: [
      { id: "r6-1", type: "特惠大床房", price: 180, breakfast: false, capacity: 2, size: 18, imageurl: "https://images.unsplash.com/photo-1631049421450-348ccd7f8949?auto=format&fit=crop&w=400&q=80" },
      { id: "r6-2", type: "标准双床房", price: 210, breakfast: false, capacity: 2, size: 20, imageurl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80" },
    ]
  }
];