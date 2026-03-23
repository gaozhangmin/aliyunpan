### 小白羊v3版本源码帮助

v3采用 ts + vue3 + vite + electron 模板开发

#### 1.下载源代码

```
https://github.com/gaozhangmin/aliyunpan.git
```

#### 2.打开代码目录，安装依赖

```cmd
npm install pnpm -g
pnpm install
pnpm config set registry https://registry.npmmirror.com
```

#### 3.环境配置

##### 3.1 创建环境变量文件

复制示例配置文件并根据需要修改：

```cmd
cp .env.example .env
```

##### 3.2 配置网盘 API 密钥

编辑 `.env` 文件，配置各网盘平台的 APP_ID 和 APP_SECRET：

```bash
# 阿里云盘配置
VITE_ALIYUN_APP_ID=your_aliyun_app_id
VITE_ALIYUN_APP_SECRET=your_aliyun_app_secret

# 百度网盘配置
VITE_BAIDU_APP_ID=your_baidu_app_id
VITE_BAIDU_APP_SECRET=your_baidu_app_secret
VITE_BAIDU_PCS_APP_ID=your_baidu_pcs_app_id

# 123网盘配置
VITE_PAN123_APP_ID=your_123pan_app_id
VITE_PAN123_APP_SECRET=your_123pan_app_secret

# 115网盘配置
VITE_PAN115_APP_ID=your_115pan_app_id
VITE_PAN115_APP_SECRET=your_115pan_app_secret
```

##### 3.3 获取网盘 API 密钥

**阿里云盘**：
1. 访问 [阿里云盘开放平台](https://www.aliyundrive.com/drive/file/backup)
2. 登录并创建应用
3. 获取 APP_ID 和 APP_SECRET

**百度网盘**：
1. 访问 [百度网盘开放平台](https://pan.baidu.com/union/doc/)
2. 登录并创建应用
3. 获取 API Key (APP_ID) 和 Secret Key (APP_SECRET)

**123云盘**：
1. 访问 [123云盘开发者平台](https://www.123pan.com/developers)
2. 注册开发者并创建应用
3. 获取 ClientID 和 ClientSecret

**115网盘**：
1. 联系 115 官方获取开发者权限
2. 获取相应的 APP_ID 和 APP_SECRET

> **注意**：
> - 请妥善保管你的 API 密钥，不要提交到公开仓库
> - `.env` 文件已在 `.gitignore` 中，不会被 Git 追踪
> - 如需自定义配置，可参考 `.env.example` 文件

#### 4.开发调试运行

```cmd
pnpm run dev
```

执行命令后会调起electron窗口，配合vscode正常开发调试即可

#### 5.打包

```cmd
pnpm run build:electron
```

#### 6.macOS 签名配置（可选）

如需在 macOS 上进行代码签名，需要在 `.env` 文件中配置：

```bash
# Apple 开发者信息
APPLE_ID=your-apple-id@example.com
APPLE_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=your-team-id

# 可选：指定特定证书
# CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
```

然后使用签名版本打包：

```cmd
pnpm run build:mac:signed
```

#### 7.项目结构说明

```
├── electron/           # Electron 主进程和预加载脚本
├── src/
│   ├── components/     # Vue 组件
│   ├── store/         # Pinia 状态管理
│   ├── utils/         # 工具函数
│   ├── aliapi/        # 阿里云盘 API
│   ├── cloudbaidu/    # 百度网盘 API
│   ├── cloud123/      # 123云盘 API
│   ├── cloud115/      # 115网盘 API
│   └── views/         # 页面视图
├── .env.example       # 环境变量示例文件
├── vite.config.ts     # Vite 配置
└── package.json       # 项目依赖配置
```

#### 8.常见问题

**Q: 启动时提示网盘 API 配置错误？**
A: 请检查 `.env` 文件是否正确配置了相应网盘的 APP_ID 和 APP_SECRET

**Q: 如何添加新的网盘支持？**
A: 参考现有网盘 API 实现，在对应目录下添加新的 API 模块

**Q: 打包后的应用无法正常使用网盘功能？**
A: 确保环境变量在构建时被正确注入，检查 `vite.config.ts` 中的环境变量配置

#### 9.贡献代码

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request