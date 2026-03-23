# 环境变量配置说明

## 📋 概述

为了保护敏感信息（如各网盘的 App ID 和 App Secret），本项目使用环境变量文件来统一管理所有的敏感配置。项目支持 Node.js 环境变量和 Vite 前端环境变量两套配置。

## 🔧 配置步骤

### 1. 后端配置（Node.js）
```bash
cp .env.template .env
```

### 2. 前端配置（Vite）
```bash
cp .env.development.template .env.development
cp .env.production.template .env.production
```

### 3. 填入真实的配置信息
编辑对应的环境变量文件，将占位符替换为真实的密钥：

**后端 (.env):**
```bash
# 阿里云盘配置
ALIYUN_APP_ID=your_real_app_id
ALIYUN_APP_SECRET=your_real_app_secret
```

**前端 (.env.development):**
```bash
# 阿里云盘配置
VITE_ALIYUN_APP_ID=your_real_app_id
VITE_ALIYUN_APP_SECRET=your_real_app_secret
```

## 🔒 安全机制

### 自动清理
- 每次 `git commit` 前，系统会自动将所有环境变量文件中的密钥值清空
- 支持多个环境文件：`.env`, `.env.development`, `.env.production`
- 只保留配置键名，确保不会意外提交敏感信息到 GitHub

### 文件保护
- 所有包含真实密钥的环境变量文件都在 `.gitignore` 中
- 只有模板文件会被提交到版本控制
- 前端和后端配置分离管理

## 📝 在代码中使用配置

### 前端 Vue 组件中使用
```typescript
import appConfig from './src/utils/appconfig';

// 获取阿里云盘配置
const { appId, appSecret } = appConfig.getAliyunConfig();

// 获取其他网盘配置
const baiduConfig = appConfig.getBaiduConfig();
const tmdbConfig = appConfig.getTmdbConfig();

// 检查配置完整性
if (!appConfig.validateConfig()) {
  console.error('配置不完整，请检查环境变量文件');
}
```

### 后端 Node.js 中使用
```javascript
const config = require('./src/utils/config');

// 获取阿里云盘配置
const aliyunConfig = config.getAliyunConfig();

// 直接获取环境变量
const aliyunAppId = config.get('ALIYUN_APP_ID');
```

## 🛠 维护和更新

### 添加新的配置项
1. 在所有模板文件中添加新的配置键
2. 在对应的实际环境文件中添加真实值
3. 在配置管理器中添加对应的获取方法
4. 确保清理脚本能识别新的配置项

### 手动清理敏感信息
```bash
node scripts/clean-env.js
```

# 环境变量配置说明

## 📋 概述

为了保护敏感信息（如各网盘的 App ID 和 App Secret），本项目使用统一的环境变量文件来管理所有的敏感配置。不区分开发和生产环境，简化配置管理。

## 🔧 配置步骤

### 1. 复制模板文件
```bash
cp .env.template .env
```

### 2. 填入真实的配置信息
编辑 `.env` 文件，将占位符替换为真实的密钥：

```bash
# 阿里云盘配置（后端用）
ALIYUN_APP_ID=your_real_app_id
ALIYUN_APP_SECRET=your_real_app_secret

# 阿里云盘配置（前端用）
VITE_ALIYUN_APP_ID=your_real_app_id
VITE_ALIYUN_APP_SECRET=your_real_app_secret
```

**注意**：前端可访问的环境变量必须以 `VITE_` 开头。

## 🔒 安全机制

### 自动清理
- 每次 `git commit` 前，系统会自动将 `.env` 文件中的所有密钥值清空
- 只保留配置键名，确保不会意外提交敏感信息到 GitHub
- 支持前端和后端的环境变量（VITE_ 前缀和普通前缀）

### 文件保护
- `.env` 文件已添加到 `.gitignore`，不会被提交到版本控制
- `.env.template` 作为模板文件，只包含键名，可以安全提交
- 统一配置，简化管理

## 📝 在代码中使用配置

### 前端 Vue 组件中使用
```typescript
import appConfig from './src/utils/appconfig';

// 获取阿里云盘配置
const { appId, appSecret } = appConfig.getAliyunConfig();

// 获取其他网盘配置
const baiduConfig = appConfig.getBaiduConfig();
const tmdbConfig = appConfig.getTmdbConfig();

// 检查配置完整性
if (!appConfig.validateConfig()) {
  console.error('配置不完整，请检查环境变量文件');
}
```

### 后端 Node.js 中使用
```javascript
const config = require('./src/utils/config');

// 获取阿里云盘配置
const aliyunConfig = config.getAliyunConfig();

// 直接获取环境变量
const aliyunAppId = config.get('ALIYUN_APP_ID');
```

## 🛠 维护和更新

### 添加新的配置项
1. 在 `.env.template` 中添加新的配置键（后端和前端版本）
2. 在 `.env` 中添加相应的真实值
3. 在配置管理器中添加对应的获取方法

### 手动清理敏感信息
```bash
node scripts/clean-env.js
```

## 🏗 项目结构

```
├── .env                      # 统一环境变量文件（开发+生产）
├── .env.template             # 环境变量模板文件
├── src/utils/config.js       # 后端配置管理器
├── src/utils/appconfig.ts    # 前端配置管理器
└── scripts/clean-env.js      # 环境变量清理脚本
```

## ⚠️ 重要提醒

1. **环境变量前缀**：前端可访问的变量必须以 `VITE_` 开头
2. **双重配置**：对于需要前后端都访问的配置，需要配置两个版本（VITE_ 和普通）
3. **备份重要**：在本地保留包含真实密钥的 `.env` 文件备份
4. **统一管理**：不区分开发和生产环境，使用同一套配置
5. **定期检查**：确保 `.gitignore` 正确配置，避免意外提交敏感信息

## 📱 支持的网盘服务

当前配置支持以下服务（每个服务都有后端和前端两个版本）：

- ✅ 阿里云盘 (ALIYUN_APP_ID / VITE_ALIYUN_APP_ID, ALIYUN_APP_SECRET / VITE_ALIYUN_APP_SECRET)
- ✅ 百度网盘 (BAIDU_*, VITE_BAIDU_*)
- ✅ 123网盘 (PAN123_*, VITE_PAN123_*)
- ✅ 115网盘 (PAN115_*, VITE_PAN115_*)
- ✅ 夸克网盘 (QUARK_*, VITE_QUARK_*)
- ✅ 天翼云盘 (TIANYI_*, VITE_TIANYI_*)
- ✅ TMDB API (TMDB_API_KEY / VITE_TMDB_API_KEY)
- ✅ 其他配置 (ARIA2_SECRET, DATABASE_URL, JWT_SECRET)

## 🎯 使用场景

| 运行方式 | 使用的环境文件 | 说明 |
|----------|----------------|------|
| `pnpm dev` | `.env` | 开发调试 |
| `pnpm build` | `.env` | 构建网页版 |
| `pnpm build:electron` | `.env` | 打包桌面应用 |

**简化优势**：
- ✅ 只需要维护一个 `.env` 文件
- ✅ 配置统一，减少出错
- ✅ 适合桌面应用的使用场景
- ✅ 自动清理机制保证安全