# 🏨 Hotel Project

基于 React + Vite 构建的移动端酒店预订应用，提供酒店搜索、筛选、列表浏览及详情查看等核心功能。

---

## 📋 目录

- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [功能特性](#功能特性)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [页面说明](#页面说明)
- [路由配置](#路由配置)

---

## 项目简介

Hotel Project 是一款面向移动端设计的酒店预订 Web 应用，采用 React 19 + Vite 7 技术栈开发，UI 组件库使用 Ant Design Mobile，提供流畅的移动端使用体验。

---

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| [React](https://react.dev/) | ^19.2.0 | 前端框架 |
| [Vite](https://vite.dev/) | ^7.2.4 | 构建工具 / 开发服务器 |
| [React Router DOM](https://reactrouter.com/) | ^7.13.0 | 客户端路由 |
| [Ant Design Mobile](https://mobile.ant.design/) | ^5.42.3 | 移动端 UI 组件库 |
| [Ant Design](https://ant.design/) | ^6.2.2 | PC 端 UI 组件库 |
| [ESLint](https://eslint.org/) | ^9.39.1 | 代码规范检查 |

---

## 功能特性

- 🏠 **首页**：Banner 轮播展示、城市 GPS 定位、日期范围选择、关键词搜索、快捷标签筛选、热门酒店推荐
- 📋 **酒店列表**：多维度筛选（星级 / 价格区间 / 含早餐 / 快捷标签）、综合/价格/评分排序、无限滚动分页加载
- 🏪 **酒店详情**：酒店图片、基本信息、房型选择、设施介绍等
- 🔐 **用户登录**：登录表单页面

---

## 项目结构

```
hotel-project/
├── public/                  # 静态资源
├── src/
│   ├── assets/              # 图片、字体等本地资源
│   ├── components/
│   │   └── hotelCard.jsx    # 酒店卡片公共组件
│   ├── views/
│   │   └── mobile/          # 移动端页面
│   │       ├── Home.jsx         # 首页
│   │       ├── Home.css
│   │       ├── HotelList.jsx    # 酒店列表页
│   │       ├── HotelList.css
│   │       ├── HotelDetail.jsx  # 酒店详情页
│   │       ├── HotelDetail.css
│   │       ├── Login.jsx        # 登录页
│   │       └── Login.css
│   ├── App.jsx              # 根组件，全局路由配置
│   ├── main.jsx             # 应用入口
│   ├── mockData.js          # 模拟酒店数据
│   ├── App.css
│   └── index.css
├── index.html
├── vite.config.js           # Vite 配置
├── eslint.config.js         # ESLint 配置
└── package.json
```

---

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

启动后访问 [http://localhost:5173](http://localhost:5173)

### 构建生产包

```bash
npm run build
```

### 预览生产包

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

---

## 页面说明

### 首页 `/`

- 顶部 Swiper 轮播图（取前 4 条酒店数据）
- 城市选择 + GPS 一键定位（调用浏览器 Geolocation API + 后端逆地理编码接口 `/api/location/geocode`）
- 入住 / 离店日期选择（日历弹层，支持范围选择）
- 关键词搜索框
- 快捷标签多选筛选
- 热门酒店推荐列表（`HotelCard` 组件）

### 酒店列表页 `/list`

接收来自首页的 URL 查询参数：

| 参数 | 说明 |
|------|------|
| `city` | 城市名 |
| `startDate` | 入住日期时间戳 |
| `endDate` | 离店日期时间戳 |
| `keyword` | 搜索关键词 |
| `tags` | 逗号分隔的标签列表 |

- 支持在列表页内修改城市、日期、人数、关键词
- 筛选条（星级 / 价格 / 早餐 / 排序）使用 Dropdown 组件
- 快捷标签横向滚动多选
- 无限滚动加载，每次加载 4 条

### 酒店详情页 `/detail/:id`

通过路由动态参数 `:id` 获取对应酒店数据，展示详细信息。

### 登录页 `/login`

用户账号登录入口。

---

## 路由配置

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `MobileHome` | 首页 |
| `/login` | `MobileUserLogin` | 登录页 |
| `/list` | `ListPage` | 酒店列表页 |
| `/detail/:id` | `HotelDetail` | 酒店详情页 |
| `*` | `Navigate to /` | 未知路径重定向至首页 |

