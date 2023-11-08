import { createPinia } from 'pinia'
import useAppStore from './appstore'
import useKeyboardStore from './keyboardstore'
import useMouseStore from './mousestore'
import type { KeyboardState } from './keyboardstore'
import type { MouseState } from './mousestore'
import useLogStore from './logstore'
import useModalStore from './modalstore'
import type { ModalState } from './modalstore'
import useWinStore from './winstore'
import type { WinState } from './winstore'
import useSettingStore from '../setting/settingstore'
import useUserStore from '../user/userstore'
import type { ITokenInfo } from '../user/userstore'
import usePanTreeStore from '../pan/pantreestore'
import usePanFileStore from '../pan/panfilestore'
import useResPanTreeStore from '../resPan/pantreestore'
import useResPanFileStore from '../resPan/panfilestore'

import useServerStore from './serverstore'
import type { IOtherShareLinkModel } from '../share/share/OtherShareStore'
import type { IShareSiteModel } from './serverstore'
import useMyShareStore from '../share/share/MyShareStore'
import useOtherShareStore from '../share/share/OtherShareStore'
import useMyFollowingStore from '../share/following/MyFollowingStore'
import useOtherFollowingStore from '../share/following/OtherFollowingStore'
import type { FollowingState } from '../share/following/OtherFollowingStore'

import useUploadingStore from '../down/UploadingStore'
import useUploadedStore from '../down/UploadedStore'
import useDownedStore from '../down/DownedStore'
import useDowningStore from '../down/DowningStore'

import useFootStore from './footstore'
import type { AsyncModel } from './footstore'
import useM3u8DownloadingStore from '../down/m3u8/M3u8DownloadingStore'
import useM3u8DownloadedStore from '../down/m3u8/M3u8DownloadedStore'

const pinia = createPinia()
export {
  useAppStore,
  useSettingStore,
  useLogStore,
  useModalStore,
  ModalState,
  useWinStore,
  WinState,
  useMouseStore,
  useKeyboardStore,
  KeyboardState,
  MouseState,
  useUserStore,
  ITokenInfo,
  usePanTreeStore,
  usePanFileStore,
  useResPanTreeStore,
  useResPanFileStore,
  useServerStore,
  IOtherShareLinkModel,
  IShareSiteModel,
  useMyShareStore,
  useOtherShareStore,
  useOtherFollowingStore,
  FollowingState,
  useMyFollowingStore,
  useFootStore,
  AsyncModel,
  useUploadingStore,
  useUploadedStore,
  useDowningStore,
  useDownedStore,
  useM3u8DownloadingStore,
  useM3u8DownloadedStore
}
export default pinia
