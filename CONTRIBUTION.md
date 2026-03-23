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

##### 3.1 配置网盘 API 密钥

编辑 `src/config.ts` 文件，配置各网盘平台的 APP_ID 和 APP_SECRET：

```typescript
export default class Config {
  // 阿里云盘配置
  static ALIYUN_APP_ID = 'your_aliyun_app_id'
  static ALIYUN_APP_SECRET = 'your_aliyun_app_secret'

  // 百度网盘配置
  static BAIDU_APP_ID = 'your_baidu_app_id'
  static BAIDU_APP_SECRET = 'your_baidu_app_secret'
  static BAIDU_PCS_APP_ID = 'your_baidu_pcs_app_id'

  // 123网盘配置
  static PAN123_APP_ID = 'your_123pan_app_id'
  static PAN123_APP_SECRET = 'your_123pan_app_secret'

  // 115网盘配置
  static PAN115_APP_ID = 'your_115pan_app_id'
  static PAN115_APP_SECRET = 'your_115pan_app_secret'

  // macOS 代码签名配置（如需签名打包）
  static APPLE_ID = 'your-apple-id@example.com'
  static APPLE_PASSWORD = 'your-app-specific-password'
  static APPLE_TEAM_ID = 'your-team-id'

  // TMDB 配置（可选）
  static TMDB_API_KEY = 'your_tmdb_api_key'
}
```

##### 3.2 获取网盘 API 密钥

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
> - 请妥善保管你的 API 密钥，提交前会自动清理敏感信息
> - 项目配置了 pre-commit hook，会自动清除 `src/config.ts` 中的敏感配置
> - 提交后使用 `npm run config:restore` 恢复本地配置

#### 4.开发调试运行

```cmd
pnpm run dev
```

执行命令后会调起electron窗口，配合vscode正常开发调试即可

#### 5.打包

```cmd
pnpm run build:electron
```

#### 6.配置管理命令

项目提供了便捷的配置管理命令：

```cmd
# 手动清理配置中的敏感信息（模拟提交前清理）
npm run config:clean

# 恢复真实配置（提交后使用）
npm run config:restore
```

#### 7.macOS 签名打包（可选）

如需在 macOS 上进行代码签名，需要在 `src/config.ts` 中配置 Apple 相关信息，然后使用：

```cmd
npm run build:mac:signed
```

或者构建所有平台（包含签名版本）：

```cmd
npm run build:all
```

#### 8.项目结构说明

```
├── electron/           # Electron 主进程和预加载脚本
├── src/
│   ├── components/     # Vue 组件
│   ├── config.ts       # 配置文件（包含 API 密钥等）
│   ├── store/         # Pinia 状态管理
│   ├── utils/         # 工具函数
│   ├── aliapi/        # 阿里云盘 API
│   ├── cloudbaidu/    # 百度网盘 API
│   ├── cloud123/      # 123云盘 API
│   ├── cloud115/      # 115网盘 API
│   └── views/         # 页面视图
├── scripts/           # 构建和配置脚本
├── .env.example       # 环境变量示例文件（已弃用）
├── vite.config.ts     # Vite 配置
└── package.json       # 项目依赖配置
```

#### 9.常见问题

**Q: 启动时提示网盘 API 配置错误？**
A: 请检查 `src/config.ts` 文件是否正确配置了相应网盘的 APP_ID 和 APP_SECRET

**Q: 提交代码后本地配置被清空了？**
A: 这是正常的安全机制，使用 `npm run config:restore` 命令恢复本地配置

**Q: 如何添加新的网盘支持？**
A: 参考现有网盘 API 实现，在对应目录下添加新的 API 模块

**Q: 打包后的应用无法正常使用网盘功能？**
A: 确保 `src/config.ts` 中的配置在构建前是完整的，不要使用被清理后的版本进行构建

#### 10.贡献代码

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request