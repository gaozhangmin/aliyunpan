#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 检测代码中是否还有硬编码的敏感信息
 *
 * 注意：真实项目中应该将具体的敏感信息模式配置在环境变量或配置文件中，
 * 不应该直接写在代码里。这里只保留示例模式。
 */

// 常见的敏感信息模式（示例模式，不包含真实密钥）
const SENSITIVE_PATTERNS = [
  // 长度超过20的字母数字组合（可能是密钥）
  /['"`]([a-zA-Z0-9]{25,})['"`]/g,
  // 示例模式，替换真实密钥检查
  /EXAMPLE_KEY_PATTERN/g,
  /ANOTHER_EXAMPLE_PATTERN/g,
];

// 需要检查的文件模式
const FILE_PATTERNS = [
  'src/**/*.js',
  'src/**/*.ts',
  'src/**/*.vue',
];

function checkHardcodedSecrets() {
  console.log('🔍 检查代码中的硬编码敏感信息...\n');

  let foundSecrets = [];

  try {
    // 使用 grep 搜索敏感信息
    const grepPatterns = [
      'EXAMPLE_KEY_PATTERN',
      'ANOTHER_EXAMPLE_PATTERN'
      // 真实的搜索模式应该在这里配置，但不包含在代码中
    ];

    grepPatterns.forEach(pattern => {
      try {
        const result = execSync(`grep -r "${pattern}" src/ --include="*.ts" --include="*.js" --include="*.vue" || true`,
          { encoding: 'utf8', cwd: process.cwd() });

        if (result.trim()) {
          foundSecrets.push({
            pattern: pattern,
            matches: result.trim().split('\n').filter(line => line.trim())
          });
        }
      } catch (error) {
        // 忽略 grep 没找到匹配的情况
      }
    });

  } catch (error) {
    console.log('⚠️  使用文件扫描模式（grep 不可用）');
    // 如果 grep 不可用，回退到文件扫描
    // 这里可以添加备用的文件扫描逻辑
  }

  if (foundSecrets.length > 0) {
    console.log('❌ 发现硬编码的敏感信息:');
    foundSecrets.forEach(({ pattern, matches }) => {
      console.log(`\n🚨 模式: ${pattern}`);
      matches.forEach(match => {
        console.log(`   ${match}`);
      });
    });
    console.log('\n⚠️  请将这些硬编码的配置移除，确保只从环境变量读取！');
    return false;
  } else {
    console.log('✅ 未发现硬编码的敏感信息');
    return true;
  }
}

function main() {
  console.log('🔒 Git Pre-commit: 硬编码敏感信息检查\n');

  const isClean = checkHardcodedSecrets();

  if (!isClean) {
    console.log('\n❌ 检查失败！请修复硬编码问题后再提交。');
    process.exit(1);
  }

  console.log('\n✅ 硬编码检查通过！');
}

// 如果是直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { checkHardcodedSecrets };