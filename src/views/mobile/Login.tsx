import { useState } from 'react';
import { Form, Input, Button, Toast, Divider, NavBar } from 'antd-mobile';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../../api';
import './Login.css';

export default function MobileUserLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // 判断上一个页面是否是注册页
  const fromRegister = location.state?.from === '/register';

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);

      if (result.ok) {
        Toast.show({
          icon: 'success',
          content: '登录成功',
        });
        // 登录成功后返回上一页，如果是来自注册页则返回上上一页
        setTimeout(() => {
          if (fromRegister) {
            navigate(-2);
          } else {
            navigate(-1);
          }
        }, 500);
      } else {
        Toast.show({
          icon: 'fail',
          content: (result as any).error || '登录失败',
        });
      }
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: (error as Error).message || '登录失败',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <NavBar onBack={() => navigate(-1)} />
      <div className="login-header">
        <img src="https://yisu-hotel.oss-cn-hangzhou.aliyuncs.com/logo/yisu.jpg" alt="Ctrip Logo" />
        <p>易宿在手，说走就走</p>
      </div>

      <Form
        layout='horizontal'
        onFinish={onFinish}
        footer={
          <Button block type='submit' color='primary' size='large' className="login-submit">
            登录
          </Button>
        }
      >
        <Form.Item name='username' label='用户名' rules={[{ required: true, message: '请输入用户名' }]}>
          <Input placeholder='请输入用户名' clearable />
        </Form.Item>
        <Form.Item name='password' label='密码' rules={[{ required: true, message: '请输入密码' }]}>
          <Input placeholder='请输入密码' type='password' clearable />
        </Form.Item>
      </Form>

      <div className="login-footer">
        <Divider>其他登录方式</Divider>
        <div className="other-methods">
          <span>微信登录</span>
          <span className="separator">|</span>
          <span>账号密码</span>
        </div>
        <div className="register-link">
          还没有账号？<span onClick={() => navigate('/register')}>立即注册</span>
        </div>
      </div>
    </div>
  );
}