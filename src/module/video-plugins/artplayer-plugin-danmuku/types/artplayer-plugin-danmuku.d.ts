import type Artplayer from 'artplayer'

export = artplayerPluginDanmuku;
export as namespace artplayerPluginDanmuku;

type Danmu = {
  /**
   * 弹幕文本
   */
  text: string;

  /**
   * 弹幕发送模式，0为滚动，1为静止
   */
  mode?: 0 | 1;

  /**
   * 弹幕颜色
   */
  color?: string;

  /**
   * 弹幕出现的时间，单位为秒
   */
  time?: number;

  /**
   * 弹幕是否有描边
   */
  border?: boolean;
};

type Option = {
  /**
   * 弹幕源，可以是弹幕数组，xml 地址或者一个返回 Promise 的函数
   */
  danmuku: Danmu[] | string | ((option: any) => Promise<any>) | ((option: any) => Promise<Danmu[]>) | Promise<Danmu[]>

  /**
   * 弹幕默认是否隐藏
   */
  hide?: boolean

  /**
   * 弹幕持续时间，单位秒，范围在[1 ~ 10]
   */
  speed?: number

  /**
   * 弹幕上下边距，支持数字和高度的百分比
   */
  margin?: [number | `${number}%`, number | `${number}%`]

  /**
   * 弹幕透明度，范围在[0 ~ 1]
   */
  opacity?: number

  /**
   * 默认字体颜色
   */
  color?: string

  /**
   * 默认弹幕发送模式，0为滚动，1为静止
   */
  mode?: 0 | 1

  /**
   * 字体大小，支持数字和高度的百分比
   */
  fontSize?: number | `${number}%`

  /**
   * 是否防重叠
   */
  antiOverlap?: boolean

  /**
   * 是否使用 web worker
   */
  useWorker?: boolean

  /**
   * 是否同步到播放速度
   */
  synchronousPlayback?: boolean

  /**
   * 搜索方式
   */
  sourceType?: string

  /**
   * 匹配标题
   */
  matchType?: string

  /**
   * 匹配集数
   */
  matchEsp?: string | number
}

type Danmuku = {
  name: 'artplayerPluginDanmuku';

  /**
   * 发送一条实时弹幕
   */
  emit: (danmu: Danmu) => Danmuku;

  /**
   * 重载弹幕源，或者切换新弹幕
   */
  load: () => Promise<Danmuku>;

  /**
   * 实时改变弹幕配置
   */
  config: (option: Option) => Danmuku;

  /**
   * 隐藏弹幕层
   */
  hide: () => Danmuku;

  /**
   * 显示弹幕层
   */
  show: () => Danmuku;

  /**
   * 是否隐藏弹幕层
   */
  isHide: boolean;

  /**
   * 是否弹幕层停止状态
   */
  isStop: boolean;
};

declare const artplayerPluginDanmuku: (option: Option) => (art: Artplayer) => Danmuku
