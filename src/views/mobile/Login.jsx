import { useState } from 'react';
import { Form, Input, Button, Toast, Divider } from 'antd-mobile';
import { useNavigate } from 'react-router-dom'; // 稍后安装路由后使用
import './Login.css';

export default function MobileUserLogin() {
  const onFinish = (values) => {
    console.log('用户登录数据:', values);
    Toast.show({
      icon: 'success',
      content: '登录成功',
    });
    // 登录成功后通常返回首页或之前的页面
  };

  return (
    <div className="login-wrapper">
      <div className="login-header">
        <img src="https://pic.c-ctrip.com/common/c_logo2022.png" alt="易宿 Logo" />
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
        <Form.Item name='mobile' label='手机号' rules={[{ required: true, message: '请输入手机号' }]}>
          <Input placeholder='请输入手机号' clearable />
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