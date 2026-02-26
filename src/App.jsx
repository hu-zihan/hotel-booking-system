/**
 * @file App.jsx
 * @description 应用根组件，负责全局路由配置。
 * 使用 React Router v6 的 BrowserRouter + Routes 方案，
 * 统一管理移动端各页面的路径映射关系。
 *
 * 路由表：
 *   /           → 首页（MobileHome）
 *   /login      → 登录页（MobileUserLogin）
 *   /list       → 酒店列表页（ListPage）
 *   /detail/:id → 酒店详情页（HotelDetail），:id 为酒店唯一标识
 *   *           → 其余未知路径重定向至首页
 */

// React Router 核心组件：BrowserRouter 提供 History API 路由上下文，
// Routes / Route 声明路径与组件的映射，Navigate 用于重定向
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 移动端页面组件
import MobileHome from './views/mobile/Home';       // 首页
import MobileUserLogin from './views/mobile/Login'; // 登录页
import HotelDetail from './views/mobile/HotelDetail'; // 酒店详情页
import ListPage from './views/mobile/HotelList.jsx';  // 酒店列表页

/**
 * App 组件 - 应用入口根组件
 * 挂载全局路由，所有页面组件均通过此处注册的路由进行渲染。
 * @returns {JSX.Element} 包含完整路由配置的应用根节点
 */
function App() {
  return (
    // BrowserRouter 是路由的容器，必须包裹在最外层，为子组件提供路由上下文
    <BrowserRouter>
      <Routes>
        {/* 首页：path="/" 精确匹配根路径，渲染移动端首页 */}
        <Route path="/" element={<MobileHome />} />

        {/* 登录页：path="/login" 渲染登录表单组件 */}
        <Route path="/login" element={<MobileUserLogin />} />

        {/* 酒店列表页：path="/list" 接收来自首页的查询参数（城市/日期/关键词/标签）*/}
        <Route path="/list" element={<ListPage />} />

        {/* 酒店详情页：path="/detail/:id"，:id 为动态参数，对应具体酒店的唯一 ID */}
        <Route path="/detail/:id" element={<HotelDetail />} />

        {/* 兜底路由：通配符 * 必须放在所有路由最后，
            匹配所有未定义路径并重定向回首页，防止出现空白页 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;