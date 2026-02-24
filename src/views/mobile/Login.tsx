import { useState } from 'react';
import { Form, Input, Button, Toast, Divider } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { login } from '../../api';
import './Login.css';

export default function MobileUserLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);

      if (result.ok) {
        Toast.show({
          icon: 'success',
          content: '登录成功',
        });
        // 登录成功后返回上一页或首页
        setTimeout(() => {
          navigate(-1);
        }, 500);
      } else {
        Toast.show({
          icon: 'fail',
          content: result.error || '登录失败',
        });
      }
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error.message || '登录失败',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-header">
        <img src="https://pic.c-ctrip.com/common/c_logo2022.png" alt="Ctrip Logo" />
        <p>易宿在手，说走就走</p>
      </div>

      <Form
        layout='horizontal'
        onFinish={onFinish}
        footer={
          <Button block type='submit' color='primary' size='large' className="login-submit">
            登录 / 注册
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
      </div>
    </div>
  );
}