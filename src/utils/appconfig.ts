/**
 * 环境变量配置读取工具 - 前端版本
 * 用于在 Vue 组件中安全地读取敏感配置信息
 */

interface AppConfig {
  aliyun: {
    appId: string;
    appSecret: string;
  };
  baidu: {
    appId: string;
    appSecret: string;
    pcsAppId: string;
  };
  pan123: {
    appId: string;
    appSecret: string;
  };
  pan115: {
    appId: string;
    appSecret: string;
  };
  tmdb: {
    apiKey: string;
  };
}

class AppConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = {
      aliyun: {
        appId: import.meta.env.VITE_ALIYUN_APP_ID || '',
        appSecret: import.meta.env.VITE_ALIYUN_APP_SECRET || ''
      },
      baidu: {
        appId: import.meta.env.VITE_BAIDU_APP_ID || '',
        appSecret: import.meta.env.VITE_BAIDU_APP_SECRET || '',
        pcsAppId: import.meta.env.VITE_BAIDU_PCS_APP_ID || ''
      },
      pan123: {
        appId: import.meta.env.VITE_PAN123_APP_ID || '',
        appSecret: import.meta.env.VITE_PAN123_APP_SECRET || ''
      },
      pan115: {
        appId: import.meta.env.VITE_PAN115_APP_ID || '',
        appSecret: import.meta.env.VITE_PAN115_APP_SECRET || ''
      },
      tmdb: {
        apiKey: import.meta.env.VITE_TMDB_API_KEY || ''
      }
    };
  }

  // 获取阿里云盘配置
  getAliyunConfig() {
    return this.config.aliyun;
  }

  // 获取百度网盘配置
  getBaiduConfig() {
    return this.config.baidu;
  }

  // 获取123网盘配置
  getPan123Config() {
    return this.config.pan123;
  }

  // 获取115网盘配置
  getPan115Config() {
    return this.config.pan115;
  }

  // 获取TMDB配置
  getTmdbConfig() {
    return this.config.tmdb;
  }

  // 检查配置是否完整
  validateConfig() {
    const aliyun = this.getAliyunConfig();
    if (!aliyun.appId || !aliyun.appSecret) {
      console.warn('⚠️  阿里云盘配置不完整');
      return false;
    }
    return true;
  }
}

// 导出单例实例
const appConfig = new AppConfigManager();

export default appConfig;