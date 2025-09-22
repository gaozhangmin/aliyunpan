import { app } from 'electron'
import { getStaticPath } from './utils/mainfile'
import launch from './launch'

app.setAboutPanelOptions({
  applicationName: '小白羊云盘',
  copyright: 'Zhangmin Gao',
  website: 'https://github.com/gaozhangmin/aliyunpan',
  iconPath: getStaticPath('icon_64x64.png'),
  applicationVersion: '30'
})

const appLaunch = new launch()