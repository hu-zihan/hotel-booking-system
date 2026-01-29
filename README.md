# Yisu Hotel Backend

这是 Yisu 酒店管理系统的后端服务项目。

## 项目简介

本项目是基于 Node.js 和 Express 框架开发的酒店管理系统后端服务，使用 MySQL 作为数据库存储酒店相关数据。

## 技术栈

- **Node.js** - JavaScript 运行时环境
- **Express 5.x** - Web 应用框架
- **MySQL 8.x** - 关系型数据库
- **Docker & Docker Compose** - 容器化部署
- **dotenv** - 环境变量管理
- **Nodemon** - 开发环境热重载

## 环境要求

- Node.js >= 18.0.0（推荐使用 LTS 版本）
- Docker & Docker Compose
- npm 或 yarn 包管理器

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd backend
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

项目根目录下已包含 `.env` 文件，包含以下配置：

```env
PORT=8182                                    # 后端服务端口
DB_HOST=localhost                         # MySQL 主机地址
DB_PORT=23306                             # MySQL 端口（映射到宿主机的端口）
DB_USER=yisu_hotel_db_admin              # MySQL 用户名
DB_PASSWORD=hotelAdminPassword            # MySQL 密码
DB_DATABASE=yisu_hotel_db                # 数据库名称
```

**注意：** 在生产环境中，请务必修改默认密码！

### 4. 启动 MySQL 数据库

使用 Docker Compose 启动 MySQL 容器：

```bash
docker-compose up -d
```

这将启动一个 MySQL 容器，配置详情：
- **容器名称：** `yisu_hotel_mysql`
- **数据库版本：** MySQL Latest
- **Root 密码：** `yisuHotelRootPassword`
- **数据库名：** `yisu_hotel_db`
- **管理员用户：** `hoteldb_admin`
- **管理员密码：** `hotelAdminPassword`
- **宿主机端口：** `23306` → 容器端口 `3306`
- **数据持久化：** 使用 Docker volume `yisu_mysql_data`
- **初始化脚本：** `./mysql/init.sql`（如果存在）

### 5. 启动开发服务器

```bash
npm run dev
```

服务将在 `http://localhost:8182` 启动。

## 可用命令

- `npm run dev` - 启动开发服务器（支持热重载）
- `docker-compose up -d` - 启动 MySQL 数据库容器
- `docker-compose down` - 停止并移除容器
- `docker-compose logs mysql` - 查看 MySQL 容器日志

## 项目结构

```
backend/
├── src/
│   ├── index.js              # 应用入口文件（旧）
│   ├── server.js             # 服务器主文件
│   └── routes/
│       └── HotelRoutes.js    # 酒店相关路由
├── mysql/
│   └── init.sql              # 数据库初始化脚本
├── .env                      # 环境变量配置
├── docker-compose.yml        # Docker Compose 配置
├── package.json              # 项目依赖配置
└── README.md                 # 项目说明文档
```

## API 接口

### 健康检查

- **GET** `/health`
  - 描述：检查服务器健康状态
  - 响应：`{ message: "Hello from server! it's healthy" }`

### 酒店相关接口

- **GET** `/hotels/hello`
  - 描述：测试接口
  - 响应：`{ message: "Hello from server! it's healthy" }`

## 数据库管理

### 连接到 MySQL

使用以下命令连接到容器内的 MySQL：

```bash
docker exec -it yisu_hotel_mysql mysql -u hoteldb_admin -p
# 密码：hotelAdminPassword
```

或者从宿主机连接：

```bash
mysql -h 127.0.0.1 -P 23306 -u hoteldb_admin -p
# 密码：hotelAdminPassword
```

### 数据备份

```bash
docker exec yisu_hotel_mysql mysqldump -u root -p yisu_hotel_db > backup.sql
```

## 开发注意事项

1. **模块系统：** 项目使用 ES Modules（`"type": "module"`），请使用 `import/export` 而不是 `require/module.exports`
2. **端口冲突：** 如果 `23306` 端口已被占用，请修改 `docker-compose.yml` 和 `.env` 中的端口配置
3. **数据持久化：** 数据库数据存储在 Docker volume 中，删除容器不会丢失数据
4. **初始化脚本：** 如需要初始化表结构，请在 `./mysql/init.sql` 中编写 SQL 脚本

## 故障排除

### 端口已被占用

如果遇到端口冲突，修改 `.env` 和 `docker-compose.yml` 中的端口号。

### 无法连接数据库

1. 确认 Docker 容器正在运行：`docker ps`
2. 检查容器日志：`docker-compose logs mysql`
3. 验证环境变量配置是否正确

### Node.js 版本不兼容

项目使用 Express 5.x，建议使用 Node.js 20 或更高版本。

## 作者

**Yuxuan Yu**

## 许可证

MIT License
