<template>
  <a-layout draggable="false">
    <a-layout-header id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <div class="flexauto"></div>
        <a-button type="text" tabindex="-1" title="最小化" @click="handleMinClick">
          <i class="iconfont iconzuixiaohua"></i>
        </a-button>
        <a-button type="text" tabindex="-1" title="最大化" @click="handleMaxClick">
          <i class="iconfont iconfullscreen"></i>
        </a-button>
        <a-button type="text" tabindex="-1" @click="closeByHide()">
          <i class="iconfont iconclose"></i>
        </a-button>
      </div>
    </a-layout-header>
  <div
    class="w-full h-screen bg-gray-100 overflow-hidden"
    id="demo_wrap"
  >
    <div
      class="flex flex-row justify-center w-full m-auto relative z-10"
      style="height: 90%;"
    >
      <div class="flex1 flex-col w-full md:w-5/12 bg-gray-100 rounded-lg mt-8">
        <div class="m-auto mt-4 mb-0">
          <div
            v-for="(audio, indexo) in audios.slice(index, index + 1)"
            :key="indexo"
            class="mb-4"
          >
            <h3 class="text-xl text-grey-darkest font-semibold">
              {{ audio.name }}
            </h3>
          </div>
          <div class="mt-15 m-auto relative" style="width: 400px">
            <img
              class="mt-20 rounded-3xl block shadow-lg"
              src="/public/images/music_bg.jpg"
              alt="Album Pic"
            />
          </div>
        </div>
        <div class="flex w-3/5 m-auto justify-between items-center ">
          <div class="text-grey-darker hover:bg-gray-300 rounded-full p-1">
            <svg
              @click="random = !random"
              :class="random ? 'text-blue-500' : ''"
              class="w-8 h-8 cursor-pointer"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path
                d="M6.59 12.83L4.4 15c-.58.58-1.59 1-2.4 1H0v-2h2c.29 0 .8-.2 1-.41l2.17-2.18 1.42 1.42zM16 4V1l4 4-4 4V6h-2c-.29 0-.8.2-1 .41l-2.17 2.18L9.4 7.17 11.6 5c.58-.58 1.59-1 2.41-1h2zm0 10v-3l4 4-4 4v-3h-2c-.82 0-1.83-.42-2.41-1l-8.6-8.59C2.8 6.21 2.3 6 2 6H0V4h2c.82 0 1.83.42 2.41 1l8.6 8.59c.2.2.7.41.99.41h2z"
              />
            </svg>
          </div>
          <div class="text-grey-darker hover:bg-gray-300 rounded-full p-1">
            <svg
              @click="prevButton ? previous() : ''"
              class="w-8 h-8 cursor-pointer"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M4 5h3v10H4V5zm12 0v10l-9-5 9-5z" />
            </svg>
          </div>
          <div
            class="text-white p-4 rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-lg"
          >
            <svg
              v-if="!pauseTrack"
              @click="play()"
              class="w-8 h-8 cursor-pointer"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <svg
              v-else
              @click="pause()"
              class="w-8 h-8 cursor-pointer"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
            </svg>
          </div>
          <div class="text-grey-darker hover:bg-gray-300 rounded-full p-1">
            <svg
              @click="nextButton ? next() : ''"
              class="w-8 h-8 cursor-pointer"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M13 5h3v10h-3V5zM4 5l9 5-9 5V5z" />
            </svg>
          </div>
          <div class="text-grey-darker hover:bg-gray-300 rounded-full p-1">
            <svg
              @click="repeat = !repeat"
              :class="repeat ? 'text-blue-500' : ''"
              class="w-8 h-8 cursor-pointer"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path
                d="M5 4a2 2 0 0 0-2 2v6H0l4 4 4-4H5V6h7l2-2H5zm10 4h-3l4-4 4 4h-3v6a2 2 0 0 1-2 2H6l2-2h7V8z"
              />
            </svg>
          </div>
        </div>
      </div>
      <div class="w-7/12 hidden md:block mt-1 ml-2">
        <ul
          class="w-full overflow-auto m-auto mb-2 bg-gray-100 pt-2"
          style="max-height: 100%"
          id="journal-scroll"
        >
          <li
            @click="selectSound(indexo)"
            :style="indexo == index ? '' : ''"
            :class="
              indexo == index
                ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white'
                : ''
            "
            class="flex py-1 rounded cursor-pointer w-11/12 m-auto"
            v-for="(audio, indexo) in audios"
            :key="indexo"
          >
            <div class="font-semibold m-auto">
              {{ indexo + 1 }}
            </div>
            <div class="w-3/5 font-semibold text-left m-auto">
              <div class="font-semibold text-sm">
                <p>{{ audio.name }}</p>
                <p class="text-xs text-gray-500">{{ audio.artist }}</p>
              </div>
            </div>
            <div class="w-1/5 m-auto">
              <svg
                v-if="state.audioPlaying[indexo]"
                class="w-6 h-6 m-auto"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
              </svg>
              <svg
                v-else
                class="w-6 h-6 m-auto"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </li>
        </ul>
      </div>
    </div>
    <div
      class="w-full bg-gradient-to-r from-gray-300 to-gray-400 relative z-10"
      style="height: 30%; bottom: 60px;"
    >
      <div class="flex1 w-11/12 h-20 items-center justify-around ml-10">
        <div
          class="w-2/12 md:flex items-center hidden"
          v-for="(audio, indexo) in audios.slice(index, index + 1)"
          :key="indexo"
        >
          <div class="flex flex-col mr-2 font-semibold">
            <p>{{ audio.name }}</p>
          </div>
        </div>
        <div class="flex md:w-8/12 items-center">
          <div class="text-sm text-grey-darker mr-4 font-semibold">
            <p>{{ timer }}</p>
          </div>
          <div class="mt-1 relative w-8/12 md:w-10/12">
            <div
              @click="seek($event)"
              ref="progress"
              class="h-1 bg-grey-dark cursor-pointer rounded-full bg-gray-500"
            >
              <div
                class="flex w-full justify-end h-1 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full relative"
                :style="{ width: step + '%' }"
              ></div>
            </div>
            <div
              class="flex w-full justify-end h-1 rounded-full relative"
              :style="{ width: step + '%' }"
            >
              <span
                id="progressButtonTimer"
                class="w-3 h-3 md:w-4 md:h-4 bg-gradient-to-r from-blue-500 to-blue-700 absolute pin-r pin-b -mb-1 rounded-full shadow"
              ></span>
              </div>
            </div>
            <div class="text-sm text-grey-darker w-2/12 md:w-1/12 font-semibold ml-4">
              <p>{{ duration }}</p>
            </div>
          </div>

        <div class="ml-4 w-1/5 flex m-auto items-center">
          <div
            class="w-3/12 hover:bg-gray-500 rounded-full"
            @click="mute()"
          >
            <svg
              v-if="mutePlayer"
              class="w-6 h-6 m-auto text-blue-500 cursor-pointer ml-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 30 30"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                clip-rule="evenodd"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
            <svg
              v-else
              class="w-6 h-6 m-auto cursor-pointer  ml-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          </div>
          <div class="w-9/12 md:w-10/12 m-auto relative" style='left: -40px'>
            <div
              @click="volume($event)"
              ref="volBar"
              class="h-1 bg-grey-dark cursor-pointer rounded-full bg-gray-500 m-auto relative"
              style="width: 100%"
            >
              <div
                class="flex justify-end h-1 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full relative"
                :style="{ width: volumeProgress + '%' }"
              ></div>
            </div>
            <div
              class="flex justify-end h-1 rounded-full relative"
              :style="{ width: volumeProgress + '%' }"
            >
              <span
                id="progressButtonVolume"
                class="w-3 h-3 md:w-4 md:h-4 bg-gradient-to-r from-teal-400 to-blue-500 absolute pin-r pin-b -mb-1 rounded-full shadow"
              ></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </a-layout>
</template>


<script>
import { ref, reactive } from "vue"


import { Howl, Howler } from "howler"
import { useAppStore } from '../store'
import AliFile from '../aliapi/file'

export default {
  mounted() {
    this.play()
    var barWidth = (0.9 * 100) / 100
    this.sliderBtnVol =
      this.volBar.offsetWidth * barWidth + this.volBar.offsetWidth * 0.05 - 25
  },

  beforeUnmount() {
    this.audios.forEach(audio => {
      if (audio.howl) {
        audio.howl.stop();
        audio.howl.unload();
      }
    });
  },

  setup() {
    const appStore = useAppStore()

    const getAudioUrl = async (index) => {
      if (appStore.pageAudio) {
        const driveId = appStore.pageAudio.drive_id
        const fileId = appStore.pageAudio.fileIdlist[index]
        const data = await AliFile.ApiAudioPreviewUrl(appStore.pageAudio.user_id, appStore.pageAudio?.drive_id, fileId)
        return data?.url
      }
      return ""
    }

    const audios = ref(appStore.pageAudio.fileIdlist.map((fileId, index) => {
      return {
        name: appStore.pageAudio.fileNamelist[index],
        artist: '',
        file: '',
        howl: null,
      }
    }))
    const step = ref(0)
    const nextButton = ref(true)
    const prevButton = ref(true)
    const random = ref(false)
    const repeat = ref(false)
    const index = ref(0)
    const duration = ref("00:00")
    const timer = ref("00:00")
    const pauseTrack = ref(false)
    const progress = ref(null)
    const volBar = ref(null)
    const sliderBtn = ref(0)
    const sliderBtnVol = ref(null)
    const volumeProgress = ref(90)
    const mutePlayer = ref(false)
    const state = reactive({
      audioPlaying: [],
    })
    function formatTime(secs) {
      var minutes = Math.floor(secs / 60) || 0
      var seconds = Math.floor(secs - minutes * 60) || 0

      return (
        (minutes < 10 ? "0" : "") +
        minutes +
        ":" +
        (seconds < 10 ? "0" : "") +
        seconds
      )
    }
    async function play() {
      var sound

      var audio = audios.value[index.value]
      if (audio.howl) {
        sound = audio.howl
      } else {
        state.audioPlaying[index.value] = false
        sound = audio.howl = new Howl({
          src: [await getAudioUrl(index.value)],
          html5: true, // A live stream can only be played through HTML5 Audio.
          // format: ["mp3", "aac", "wma", "ape", "aac", "cda", "dsf", "dtshd", "eac3", "m1a", "m2a", "m4a", "mka", "mpa", "mpc", "opus", "ra","tak","tta", "wv"],
          onplay: function() {
            pauseTrack.value = true
            nextButton.value = true
            prevButton.value = true
            duration.value = formatTime(sound.duration())
            requestAnimationFrame(stepFunction.bind(this))
          },
          onpause: function() {
            pauseTrack.value = false
          },
          onend: function() {
            next()
          },
          onseek: function() {
            window.requestAnimationFrame(stepFunction.bind(this))
          },
        })
      }

      sound.play()

      state.audioPlaying[index.value] = true
    }
    function pause(indexo) {
      var audio = audios.value[index.value].howl

      if (audio) {
        audio.pause()
        pauseTrack.value = false
        state.audioPlaying[index.value] = false
      }
    }

    function stepFunction() {
      var sound = audios.value[index.value].howl
      var seek = 0
      var duration = 0
      if (sound) {
        seek = sound.seek()
        duration = sound.duration()
      }
      timer.value = formatTime(Math.round(seek))
      if (duration !== 0) {
        step.value = (seek * 100) / duration
      } else {
        step.value = 0
      }

      sliderBtn.value =
        progress.value.offsetWidth * (step.value / 100) +
        progress.value.offsetWidth * 0.05 -
        25

      if (sound && sound.playing()) {
        window.requestAnimationFrame(stepFunction.bind(this))
      }
    }

    function seek(event) {
      var per = event.offsetX / progress.value.clientWidth

      var sound = audios.value[index.value].howl

      if (sound) {
        if (sound.playing()) {
          sound.pause()
          sound.seek(sound.duration() * per)
          var barWidth = (per * 100) / 100
          sliderBtn.value =
            progress.value.offsetWidth * barWidth +
            progress.value.offsetWidth * 0.05 -
            25
          sound.play()
        } else {
          sound.seek(sound.duration() * per)
          var barWidth = (per * 100) / 100
          sliderBtn.value =
            progress.value.offsetWidth * barWidth +
            progress.value.offsetWidth * 0.05 -
            25
        }
      }
    }

    function next() {
      nextButton.value = false
      var audio = audios.value[index.value].howl

      state.audioPlaying[index.value] = false

      mutePlayer.value ? (mutePlayer.value = false) : ""
      audio && audio.mute(true) ? audio.mute(false) : ""

      if (audio && audios.value.length - 1 == index.value) {
        audio.stop()
        audio.unload()

        repeat.value
          ? (index.value = index.value)
          : random.value
            ? (index.value = Math.floor(Math.random() * audios.value.length))
            : (index.value = 0)
      } else {
        if (audio) {
          audio.stop()
          audio.unload()
        }

        repeat.value
          ? (index.value = index.value)
          : random.value
            ? (index.value = Math.floor(Math.random() * audios.value.length))
            : index.value++
      }

      play()
    }

    function previous() {
      var audio = audios.value[index.value].howl
      prevButton.value = false
      state.audioPlaying[index.value] = false

      mutePlayer.value ? (mutePlayer.value = false) : ""
      audio && audio.mute(true) ? audio.mute(false) : ""

      if (!audio) {
        index.value = audios.value.length - 1
      } else if (audio && index.value == 0) {
        audio.stop()
        audio.unload()

        repeat.value
          ? (index.value = index.value)
          : random.value
            ? (index.value = Math.floor(Math.random() * audios.value.length))
            : (index.value = audios.value.length - 1)
      } else if (audio) {
        audio.stop()

        repeat.value
          ? (index.value = index.value)
          : random.value
            ? (index.value = Math.floor(Math.random() * audios.value.length))
            : index.value--
      }

      play()
    }
    function selectSound(indexSelected) {
      var audio = audios.value[index.value].howl

      if (audio) {
        audio.stop()
        audio.unload()
        state.audioPlaying[index.value] = false
      }

      index.value = indexSelected

      play()
    }

    function volume(event) {
      var per = event.layerX / parseFloat(volBar.value.scrollWidth)
      var barWidth = (per * 100) / 100
      volumeProgress.value = barWidth * 100
      sliderBtnVol.value =
        volBar.value.offsetWidth * barWidth +
        volBar.value.offsetWidth * 0.05 -
        25
      Howler.volume(per)
    }

    function mute() {
      var audio = audios.value[index.value].howl

      if (audio) {
        mutePlayer.value = !mutePlayer.value

        mutePlayer.value ? audio.mute(true) : audio.mute(false)
      }
    }
    function closeByHide() {
      window.close()
    }

    function handleMinClick() {
      if (window.WebToElectron) window.WebToElectron({ cmd: 'minsizeAudio' })
    }
    function handleMaxClick() {
      if (window.WebToElectron) window.WebToElectron({ cmd: 'maxsizeAudio' })
    }

    return {
      play,
      pause,
      duration,
      formatTime,
      audios,
      pauseTrack,
      next,
      previous,
      index,
      timer,
      step,
      stepFunction,
      seek,
      selectSound,
      state,
      random,
      repeat,
      progress,
      volume,
      volBar,
      volumeProgress,
      sliderBtn,
      mute,
      mutePlayer,
      sliderBtnVol,
      nextButton,
      prevButton,
      handleMinClick,
      handleMaxClick,
      closeByHide
    }
  },
}
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
* {

}
#journal-scroll::-webkit-scrollbar {
  width: 0.9rem;
  cursor: pointer;
}
#journal-scroll::-webkit-scrollbar-track {
  background-color: #ffffff;
  cursor: pointer;
}
#journal-scroll::-webkit-scrollbar-thumb {
  cursor: pointer;
  border-radius: 10px;
  background-color: #4096de;
  border: 3px solid #ffffff;
}
.cd-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #f7fafc;
}

#progressButtonTimer,
#progressButtonVolume {
  margin-top: -9px;
  right: -8px;
}

@media screen and (max-width: 768px) {
  #progressButtonTimer,
  #progressButtonVolume {
    margin-top: -8px;
    right: -7px;
  }
}

.flex1 {
  display: flex;
  flex: 100% 1 1;
}
</style>
