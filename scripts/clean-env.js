#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Git 提交前清理敏感信息脚本
 * 只清理模板文件（.env.template, .env.example）中的敏感信息
 * .env 文件不会被清理，因为它在 .gitignore 中被忽略，不会提交到 GitHub
 */

const ENV_FILES = []; // 不清理 .env 文件，因为它不会提交到 GitHub
const ENV_TEMPLATE_FILES = ['.env.example']; // 只保留 .env.example，不创建 .env.template

function cleanEnvFiles() {
  console.log('🔒 开始清理环境变量文件...\n');

  let totalClearedKeys = [];
  let totalModifiedFiles = [];

  ENV_FILES.forEach(envFile => {
    if (!fs.existsSync(envFile)) {
      console.log(`⚠️  ${envFile} 文件不存在，跳过清理`);
      return;
    }

    try {
      let content = fs.readFileSync(envFile, 'utf8');
      let modified = false;
      let clearedKeys = [];

      // 使用正则表达式匹配所有的 KEY=value 格式
      const keyValuePattern = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/gm;

      content = content.replace(keyValuePattern, (match, key, value) => {
        // 如果值不为空且不是占位符，则清空它
        if (value.trim() &&
            !value.includes('your_actual_') &&
            !value.includes('YOUR_') &&
            value !== '') {
          clearedKeys.push(key);
          modified = true;
          return `${key}=`;
        }
        return match;
      });

      if (modified) {
        fs.writeFileSync(envFile, content, 'utf8');
        totalModifiedFiles.push(envFile);
        totalClearedKeys.push(...clearedKeys);
        console.log(`✅ 已清理 ${envFile} 中的 ${clearedKeys.length} 个环境变量`);
      } else {
        console.log(`✅ ${envFile} 已是安全状态，无需清理`);
      }

    } catch (error) {
      console.error(`❌ 清理 ${envFile} 时出错: ${error.message}`);
      process.exit(1);
    }
  });

  if (totalModifiedFiles.length > 0) {
    console.log(`\n✅ 总共清理了 ${totalModifiedFiles.length} 个文件中的 ${totalClearedKeys.length} 个环境变量`);
    const uniqueKeys = [...new Set(totalClearedKeys)];
    console.log(`🔍 清理的变量类型: ${uniqueKeys.join(', ')}`);
  } else {
    console.log('\n✅ 所有环境变量文件已是安全状态，无需清理');
  }
}

function ensureTemplateExists() {
  ENV_TEMPLATE_FILES.forEach(templateFile => {
    if (!fs.existsSync(templateFile)) {
      console.log(`📝 创建环境变量模板文件: ${templateFile}`);

      const templateContent = `# Apple 开发者信息
APPLE_ID=your-apple-id@example.com
APPLE_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=your-team-id

# 阿里云盘配置（后端用）
ALIYUN_APP_ID=
ALIYUN_APP_SECRET=

# 阿里云盘配置（前端用）
VITE_ALIYUN_APP_ID=
VITE_ALIYUN_APP_SECRET=

# 百度网盘配置
BAIDU_APP_ID=
BAIDU_APP_SECRET=
BAIDU_API_KEY=
VITE_BAIDU_APP_ID=
VITE_BAIDU_APP_SECRET=
VITE_BAIDU_API_KEY=

# 123网盘配置
PAN123_APP_ID=
PAN123_APP_SECRET=
VITE_PAN123_APP_ID=
VITE_PAN123_APP_SECRET=

# 115网盘配置
PAN115_APP_ID=
PAN115_APP_SECRET=
VITE_PAN115_APP_ID=
VITE_PAN115_APP_SECRET=

# 可选：指定特定证书（如果有多个同类证书）
# CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
`;

      fs.writeFileSync(templateFile, templateContent, 'utf8');
      console.log(`✅ ${templateFile} 创建完成`);
    }
  });
}

function main() {
  console.log('🚀 Git Pre-commit: 环境变量安全清理\n');

  ensureTemplateExists();
  cleanEnvFiles();

  console.log('\n🔒 环境变量清理完成！');
  console.log('\n💡 提示：');
  console.log('   - 所有环境变量文件中的敏感信息已被清空');
  console.log('   - 请在本地保留包含真实密钥的环境变量文件');
  console.log('   - 开发时使用模板文件作为参考');
}

// 如果是直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { cleanEnvFiles, ensureTemplateExists };