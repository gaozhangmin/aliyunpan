import { app } from 'electron'
import { getStaticPath } from './utils/mainfile'
import launch from './launch'

app.setAboutPanelOptions({
  applicationName: 'boxplayer',
  copyright: 'copyright ©2023 gaozhangmin',
  website: 'https://github.com/gaozhangmin/aliyunpan',
  iconPath: getStaticPath('icon_64x64.png'),
  applicationVersion: '30'
})

const appLaunch = new launch()