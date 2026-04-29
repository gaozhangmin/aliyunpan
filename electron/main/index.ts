import { app } from 'electron'
import { getStaticPath } from './utils/mainfile'
import launch from './launch'

app.setAboutPanelOptions({
  applicationName: 'BoxPlayer',
  copyright: 'copyright ©2026 GaoZhangMin',
  website: 'https://github.com/gaozhangmin/aliyunpan',
  iconPath: getStaticPath('icon_64x64.png'),
  applicationVersion: '30'
})

const appLaunch = new launch()