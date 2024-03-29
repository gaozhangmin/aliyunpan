import axios from 'axios'
import { performance } from 'perf_hooks'

let QPS = 5
// 校准本地和服务端之间的时间差
let OFFSET = 250
// 间隔时间
let INTERVAL = 1000

const qpsMap = new Map()
const qpsController = () => async (config: any) => {
  if (config.url.indexOf('aliyundrive') < 0 && config.url.indexOf('alipan') < 0) return config
  const now = Math.trunc(performance.timeOrigin + performance.now())
  let { count, ts } = qpsMap.get(config.url) || { count: 1, ts: now }
  // 通过位运算实现取整，提高效率
  if ((now / INTERVAL) >> 0 <= (ts / INTERVAL) >> 0) {
    // 如果当前时间 ≤ Map中该接口的ts时间，说明前面已经有超过并发后在等待的请求了
    // 只比较秒，忽略毫秒，因为QPS是以秒为周期计算的，即每秒多少个请求数
    if (count < QPS) {
      // 如果当前url的请求数没有达到QPS的限制，则计数器+1
      count++
    } else {
      // 否则，重置计数器，同时将时间戳设置为当前ts的下一整秒
      // 这里需要将ts设置为当前ts的下一秒，而不是当前时间，因为当前ts可能已经远大于当前时间了
      ts = INTERVAL * Math.ceil(ts / INTERVAL + 1)
      count = 1
    }
  } else {
    // 否则：当前时间大于ts，说明已经没有排队的请求了（可能有未完成的，但是都已经请求了）
    // 则将当前ts重置
    ts = now
    count = 1
  }

  qpsMap.set(config.url, { count, ts })
  // 计算休眠时间：
  // 由于本地服务器和远程服务器之间可能存在时间差会发生这种情况：
  // 前5个请求在10:00:00.200时发送过去后，此时本地时间可能到了10:00:00.900到来的第六请求由于超出了QPS=5的限制，会休眠100ms
  // 但是由于本地和服务端时间差的问题，第六个休眠100ms后发送了请求，服务端的时间可能才是10:00:00.950，导致了QPS超限报错
  // 所以，这里添加一个OFFSET偏移值来纠正本地和服务端之间的时间差问题，默认为50ms，若出现QPS超限，请酌情增大此值
  let sleep = ts - now
  sleep = sleep > 0 ? sleep + OFFSET : 0
  // 让当前的请求睡一会儿再请求
  if (sleep > 0) {
    await new Promise<void>(resolve => setTimeout(() => resolve(), sleep))
  }
  return config
}

axios.interceptors.request.use(qpsController())
axios.defaults.withCredentials = false
export default axios