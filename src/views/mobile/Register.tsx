import { useState } from 'react';
import { Form, Input, Button, Toast, NavBar } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { register } from '../../api';
import './Login.css';
export default function MobileUserRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      Toast.show({
        icon: 'fail',
        content: '两次输入的密码不一致',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await register(values.username, values.password);

      if (result.ok) {
        Toast.show({
          icon: 'success',
          content: '注册成功，请登录',
        });
        // 注册成功后返回登录页，并带上前一个页面的信息
        setTimeout(() => {
          navigate('/login', { state: { from: '/register' } });
        }, 500);
      } else {
        Toast.show({
          icon: 'fail',
          content: (result as any).error || '注册失败',
        });
      }
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: (error as Error).message || '注册失败',
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
        <p>加入我们，开始旅程</p>
      </div>

      <Form
        layout='horizontal'
        onFinish={onFinish}
        footer={
          <Button block type='submit' color='primary' size='large' className="login-submit">
            注册
          </Button>
        }
      >
        <Form.Item name='username' label='用户名' rules={[{ required: true, message: '请输入用户名' }]}>
          <Input placeholder='请输入用户名' clearable />
        </Form.Item>
        <Form.Item name='password' label='密码' rules={[{ required: true, message: '请输入密码' }]}>
          <Input placeholder='请输入密码' type='password' clearable />
        </Form.Item>
        <Form.Item name='confirmPassword' label='确认密码' rules={[{ required: true, message: '请再次输入密码' }]}>
          <Input placeholder='请再次输入密码' type='password' clearable />
        </Form.Item>
      </Form>

      <div className="login-footer">
        <div className="register-link">
          已有账号？<span onClick={() => navigate('/login')}>立即登录</span>
        </div>
      </div>
    </div>
  );
}
