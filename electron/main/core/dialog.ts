import { app, dialog } from 'electron'

export function ShowErrorAndRelaunch(title: string, errmsg: string) {
  dialog
    .showMessageBox({
      type: 'error',
      buttons: ['ok'],
      title: title + '，小白羊将自动退出',
      message: '错误信息:' + errmsg
    })
    .then((_) => {
      setTimeout(() => {
        app.relaunch()
        try {
          app.exit()
        } catch {
        }
      }, 100)
    })
}

export function ShowErrorAndExit(title: string, errmsg: string) {
  dialog
    .showMessageBox({
      type: 'error',
      buttons: ['ok'],
      title: title + '，小白羊将自动退出',
      message: '错误信息:' + errmsg
    })
    .then((_) => {
      setTimeout(() => {
        try {
          app.exit()
        } catch {
        }
      }, 100)
    })
}

export function ShowError(title: string, errmsg: string) {
  dialog
    .showMessageBox({
      type: 'error',
      buttons: ['ok'],
      title: title,
      message: '错误信息:' + errmsg
    })
    .then((_) => {
    })
}