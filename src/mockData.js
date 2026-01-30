
/**
 * 酒店数据结构参考 (对齐文档必填维度)
 * 必须维度：酒店名(中/英), 酒店地址, 酒店星级, 酒店房型, 酒店价格, 酒店开业时间 [cite: 58]
 */

export const mockHotels = [
  {
    id: "h1", // 唯一标识
    name: {
      cn: "上海陆家嘴禧玥酒店", // 酒店名(中) [cite: 58]
      en: "Joyze Hotel Shanghai" // 酒店名(英) [cite: 58]
    },
    address: "上海市浦东新区浦东大道535号", // 酒店地址 [cite: 58]
    star: 5, // 酒店星级 [cite: 58]
    openDate: "2012-01-01", // 酒店开业时间 [cite: 58]
    price: 936, // 酒店价格 [cite: 58]
    roomType: "经典双床房", // 酒店房型 [cite: 58]
    
    // 扩展字段 (用于提升首页/列表页体验) [cite: 60, 63]
    imageurl: "https://dimg04.c-ctrip.com/images/1mc4e12000brcmr26CB9D_R_600_400_R5.webp", // 酒店 Banner 大图 
    tags: ["免费停车场", "江景房", "亲子酒店"], // 快捷标签 
    score: 4.8, // 评分 
    status: "approved", // 审核状态: approved(通过), pending(审核中), rejected(不通过) 
    isOnline: true // 下线状态: true(在线), false(下线) 
  }
];