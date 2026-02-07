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
    tags: ["免费停车场", "江景房", "亲子酒店"],
    score: 4.8,
    status: "approved",
    isOnline: true
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
    tags: ["地标建筑", "行政酒廊", "免费停车场"],
    score: 4.9,
    status: "approved",
    isOnline: true
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
    tags: ["亲子酒店", "湖景", "健身房"],
    score: 4.6,
    status: "approved",
    isOnline: true
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
    tags: ["商务出行", "极速WIFI", "近地铁"],
    score: 4.7,
    status: "approved",
    isOnline: true
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
    tags: ["奢华", "高空视野", "SPA", "下午茶"],
    score: 5.0,
    status: "approved",
    isOnline: true
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
    tags: ["经济", "无窗", "行李寄存"],
    score: 4.2,
    status: "approved",
    isOnline: true
  }
];