import axios, { AxiosInstance } from 'axios'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
  }
}
let QPS = 30
let OFFSET = 0
let INTERVAL = 1000
const qpsMap = new Map()

const qpsController = () => async (config: any) => {
    if (config.url.indexOf('api.aliyundrive.com') < 0
      && config.url.indexOf('openapi.aliyundrive.com') < 0) return config
    if (config.url.indexOf('openapi.aliyundrive.com') < 0) {
      QPS = 2
      OFFSET = 2500
      INTERVAL = 1000
    } else {
      QPS = 30
      OFFSET = 0
      INTERVAL = 1000
    }
    const now = new Date().getTime()
    let { count, ts } = qpsMap.get(config.url) || { count: 1, ts: now }
    if ((now / INTERVAL) >> 0 <= (ts / INTERVAL) >> 0) {
      if (count < QPS) {
        count++
      } else {
        ts = INTERVAL * Math.ceil(ts / INTERVAL + 1)
        count = 1
      }
    } else {
      ts = now
      count = 1
    }
    qpsMap.set(config.url, { count, ts })
    let sleep = ts - now
    sleep = sleep > 0 ? sleep + OFFSET : 0
    if (sleep > 0) {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), sleep))
    }
    return config
  }

axios.interceptors.request.use(qpsController())
axios.defaults.withCredentials = false

export default axios