import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MobileHome from './views/mobile/Home';
import MobileUserLogin from './views/mobile/Login';
import MobileUserRegister from './views/mobile/Register';
import HotelDetail from './views/mobile/HotelDetail';
import ListPage from './views/mobile/HotelList';

function App() {
  return (
    // BrowserRouter 是路由的容器，必须包裹在最外层
    <BrowserRouter>
      <Routes>
        {/* path="/" 代表首页，显示 MobileHome 组件 */}
        <Route path="/" element={<MobileHome />} />
        
        {/* path="/login" 代表登录页，显示 MobileUserLogin 组件 */}
        <Route path="/login" element={<MobileUserLogin />} />

        {/* path="/register" 代表注册页，显示 MobileUserRegister 组件 */}
        <Route path="/register" element={<MobileUserRegister />} />

        <Route path="/list" element={<ListPage />} />

        {/* path="/detail/:id" 代表酒店详情页，显示 HotelDetail 组件 */}
        <Route path="/detail/:id" element={<HotelDetail />} />

        {/* 容错处理：通配符必须放到所有路由的最后，如果用户输入了不存在的地址，自动重定向回首页 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;