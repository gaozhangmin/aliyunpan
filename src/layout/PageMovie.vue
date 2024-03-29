<script lang="ts">
import { defineComponent, ref, reactive, PropType, onMounted, onUnmounted, watchEffect, watch } from 'vue'
import { IAliGetFileModel } from '../aliapi/alimodels'
import AliHttp from '../aliapi/alihttp'
import { modalCloseAll } from '../utils/modal'
import { humanTime } from '../utils/format'
import DB from '../utils/db'
import { menuOpenFile } from '../utils/openfile'
import { useModalStore, useServerStore } from '../store'
import Config from '../config'


type Item = IAliGetFileModel

export default defineComponent({
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    movies: {
      type:  Array as PropType<Item[]>,
      required: true
    }
  },
  setup: function(props) {
    const tvSeasonsMap = new Map()
    const tvSeriesMap = new Map()
    const castMap = new Map()
    const movieMap = new Map()
    const okLoading = ref(false)
    const movieFile = ref({} as IAliGetFileModel)
    const movieid = ref(-1)
    const watched = ref(false)
    const percent = ref(0)
    const tvSeasonNum = ref(-1)
    const tvEpisodeNum = ref(-1)
    const initalTvData = {
      'air_date': '',
      'episode_number': 1,
      'episode_type': 'standard',
      'id': 62085,
      'name': 'Pilot',
      'season_name': '',
      'season_backdrop': '',
      'overview': '',
      'production_code': '',
      'runtime': 59,
      'season_number': 1,
      'show_id': 1396,
      'still_path': '',
      'vote_average': -1,
      'vote_count': 327,
      'crew': [
        {
          'department': 'Directing',
          'job': 'Director',
          'credit_id': '52542275760ee313280006e8',
          'adult': false,
          'gender': 2,
          'id': 66633,
          'known_for_department': 'Writing',
          'name': 'Vince Gilligan',
          'original_name': 'Vince Gilligan',
          'popularity': 5.608,
          'profile_path': ''
        }
      ],
      'guest_stars': [
        {
          'character': 'Steven Gomez',
          'credit_id': '5271b489760ee35b3e0881a7',
          'order': 7,
          'adult': false,
          'gender': 2,
          'id': 61535,
          'known_for_department': 'Acting',
          'name': 'Steven Michael Quezada',
          'original_name': 'Steven Michael Quezada',
          'popularity': 6.355,
          'profile_path': ''
        }
      ]
    }
    const tvepisodedet = ref(initalTvData)

    const tvdet = ref({
      '_id': '',
      'air_date': '2008-01-20',
      'episodes': [
        {
          'air_date': '2008-01-20',
          'episode_number': 1,
          'episode_type': 'standard',
          'id': 62085,
          'name': 'Pilot',
          'overview': '',
          'production_code': '',
          'runtime': 59,
          'season_number': 1,
          'show_id': 1396,
          'still_path': '/ydlY3iPfeOAvu8gVqrxPoMvzNCn.jpg',
          'vote_average': 8.292,
          'vote_count': 327,
          'crew': [
            {
              'department': 'Directing',
              'job': 'Director',
              'credit_id': '52542275760ee313280006e8',
              'adult': false,
              'gender': 2,
              'id': 66633,
              'known_for_department': 'Writing',
              'name': 'Vince Gilligan',
              'original_name': 'Vince Gilligan',
              'popularity': 5.608,
              'profile_path': '/z3E0DhBg1V1PZVEtS9vfFPzOWYB.jpg'
            }
          ],
          'guest_stars': [
            {
              'character': 'Steven Gomez',
              'credit_id': '5271b489760ee35b3e0881a7',
              'order': 7,
              'adult': false,
              'gender': 2,
              'id': 61535,
              'known_for_department': 'Acting',
              'name': 'Steven Michael Quezada',
              'original_name': 'Steven Michael Quezada',
              'popularity': 6.355,
              'profile_path': '/4BRo6oc26kePVYxgNzYwUrDagVO.jpg'
            }
          ]
        }
      ],
      'name': 'Season 1',
      'overview': '',
      'id': 3572,
      'poster_path': '',
      'season_number': 1,
      'vote_average': 8.2
    })

    const initalmovieData = {
      'adult': false,
      'backdrop_path': '',
      'belongs_to_collection': {
        'id': -1,
        'name': '',
        'poster_path': '',
        'backdrop_path': ''
      },
      'budget': -1,
      'genres': [
        {
          'id': -1,
          'name': ''
        }
      ],
      'homepage': '',
      'id': -1,
      'imdb_id': '',
      'original_language': 'en',
      'original_title': '',
      'overview': '',
      'popularity': -1,
      'poster_path': '',
      'production_companies': [
        {
          'id': -1,
          'logo_path': '',
          'name': '',
          'origin_country': 'US'
        }
      ],
      'production_countries': [],
      'release_date': '',
      'revenue': 821708551,
      'runtime': 121,
      'spoken_languages': [
        {
          'english_name': 'English',
          'iso_639_1': 'en',
          'name': 'English'
        }
      ],
      'status': '',
      'tagline': '',
      'title': '',
      'name': '',
      'video': false,
      'vote_average': -1,
      'vote_count': -1,
      last_air_date: '',
      number_of_seasons: -1,
      number_of_episodes: -1

    }

    const moviedet = ref(initalmovieData)

    const initialCastData = [{
      'adult': false,
      'gender': 2,
      'id': -1,
      'known_for_department': 'Acting',
      'name': '',
      'original_name': '',
      'popularity': 30.746,
      'profile_path': '',
      'cast_id': 31,
      'character': '',
      'credit_id': '',
      'order': 0
    }]
    const castdata = ref(initialCastData)
    const crewdata = ref(initialCastData)

    const initialDirector = {
      'adult': false,
      'gender': 2,
      'id': -1,
      'known_for_department': '',
      'name': '',
      'original_name': '',
      'popularity': 1.22,
      'profile_path': '',
      'credit_id': '',
      'department': 'Directing',
      'job': 'Director'
    }
    const director = ref(initialDirector)
    const loader = ref(true)

    const initialgenre = [{
      'id': -1,
      'name': ''
    },
      {
        'id': -1,
        'name': ''
      }]
    const moviegenres = ref(initialgenre)


    onMounted(() => {
      setTimeout(async () => {
        if (props.movies.length > 0) {
          const res = props.movies.slice().sort((a, b) => {
            if (a.episode_name && b.episode_name) {
              // @ts-ignore
              return a.episode_num - b.episode_num || a.episode_name.localeCompare(b.episode_name)
            } else if (a.minfo && a.minfo.title && b.minfo && b.minfo.title) {
              return a.minfo .title.localeCompare(b.minfo.title)
            } else if (a.name && b.name) {
              return a.name.localeCompare(b.name)
            }
            return 0 // 默认情况
          })
          const defaultMovie = res[0]

          movieid.value = defaultMovie.minfo?.id || -1
          tvSeasonNum.value = defaultMovie.season_num || -1
          tvEpisodeNum.value = defaultMovie.episode_num || -1
          movieFile.value = defaultMovie
          const videoInfo = await DB.getVideoInfo(movieFile.value.file_id)
          if (videoInfo) {
            watched.value = videoInfo.watched
            percent.value = videoInfo.play_cursor / videoInfo.duration
          }
          if (movieid.value != -1) {
            if (defaultMovie.minfo?.media_type === 'movie') {
              if (defaultMovie.minfo && defaultMovie.minfo.cached) {
                // @ts-ignore
                moviedet.value = defaultMovie.minfo
                // @ts-ignore
                moviegenres.value = defaultMovie.minfo.genres
                fetchCast()
              } else {
                fetchMovie()
              }
            } else if (defaultMovie.minfo?.media_type === 'tv') {
              fetchTV()
            } else {
              loader.value = false
            }
          } else {
            loader.value = false
          }

          watch(() => props.movies, async (newMovies, oldMovies) => {
            if (newMovies.length > 0) {
              const res = newMovies.slice().sort((a, b) => {
                if (a.episode_name && b.episode_name) {
                  // @ts-ignore
                  return a.episode_num - b.episode_num || a.episode_name.localeCompare(b.episode_name)
                } else if (a.minfo && a.minfo.title && b.minfo && b.minfo.title) {
                  return a.minfo.title.localeCompare(b.minfo.title)
                } else if (a.name && b.name) {
                  return a.name.localeCompare(b.name)
                }
                return 0 // 默认情况
              })
              const defaultMovie = res[0]

              movieid.value = defaultMovie.minfo?.id || -1
              tvSeasonNum.value = defaultMovie.season_num || -1
              tvEpisodeNum.value = defaultMovie.episode_num || -1
              movieFile.value = defaultMovie
              const videoInfo = await DB.getVideoInfo(movieFile.value.file_id)
              if (videoInfo) {
                watched.value = videoInfo.watched
                percent.value = videoInfo.play_cursor / videoInfo.duration
              }
              if (movieid.value != -1) {
                if (defaultMovie.minfo?.media_type === 'movie') {
                  if (defaultMovie.minfo && defaultMovie.minfo.cached) {
                    // @ts-ignore
                    moviedet.value = defaultMovie.minfo
                    // @ts-ignore
                    moviegenres.value = defaultMovie.minfo.genres
                    fetchCast()
                  } else {
                    fetchMovie()
                  }
                } else if (defaultMovie.minfo?.media_type === 'tv') {
                  fetchTV()
                } else {
                  loader.value = false
                }
              } else {
                moviedet.value = initalmovieData
                tvepisodedet.value = initalTvData
                castdata.value = initialCastData
                moviegenres.value = initialgenre
                director.value = initialDirector
                loader.value = false
              }
            }
          });
        }
      }, 1000)
    })

    const selectMovie = async (movie: IAliGetFileModel) => {
      movieid.value = movie.minfo?.id || -1
      tvSeasonNum.value = movie.season_num || -1
      tvEpisodeNum.value = movie.episode_num || -1
      movieFile.value = movie
      const videoInfo = await DB.getVideoInfo(movie.file_id)
      if (videoInfo) {
        watched.value = videoInfo.watched
        percent.value = videoInfo.play_cursor / videoInfo.duration
      } else {
        watched.value = false
        percent.value = 0
      }
      if (movie.minfo?.id) {
        if (movie.minfo?.media_type === 'movie') {
          if (movie.minfo && movie.minfo.cached) {
            // @ts-ignore
            moviedet.value = movie.minfo
            // @ts-ignore
            moviegenres.value = movie.minfo.genres
            fetchCast()
          } else {
            fetchMovie()
          }
        } else if (movie.minfo?.media_type === 'tv') {
          fetchTV()
        } else {
          loader.value = false
        }
      } else {
        moviedet.value = initalmovieData
        tvepisodedet.value = initalTvData
        castdata.value = initialCastData
        moviegenres.value = initialgenre
        director.value = initialDirector
        loader.value = false
      }
    }

    const fetchMovie = async () => {
      if (movieMap.has(movieid.value)) {
        const data = movieMap.get(movieid.value)
        moviedet.value = data
        moviegenres.value = data.genres
        if (data.credits) {
          const allCast = data.credits.cast
          const allCrew = data.credits.crew
          if (allCrew.length > 0) {
            // @ts-ignore
            const res = allCrew.filter(crew => crew.job === 'Director' || crew.job === 'Casting')
            if (res.length > 0) {
              director.value = res[0]
            }
            // @ts-ignore
            crewdata.value = allCrew.filter(crew => crew.profile_path !== null && crew.profile_path !== undefined)
          }
          // @ts-ignore
          castdata.value = allCast.filter(cast => cast.profile_path !== null && cast.profile_path !== undefined)
        }
      } else {
        const url = `${Config.tmdbProxyUrl}/3/movie/${movieid.value}?api_key=87d8eb3d0895eaf37c2929fd5d9f7cce&language=zh-CN&append_to_response=credits`
        const resp = await AliHttp.GetWithOutUserId(url)
        if (AliHttp.IsSuccess(resp.code)) {
          moviedet.value = resp.body
          moviegenres.value = resp.body.genres
          movieMap.set(movieid.value, resp.body)
          if (resp.body.credits) {
            const allCast = resp.body.credits.cast
            const allCrew = resp.body.credits.crew
            if (allCrew.length > 0) {
              // @ts-ignore
              const res = allCrew.filter(crew => crew.job === 'Director' || crew.job === 'Casting')
              if (res.length > 0) {
                director.value = res[0]
              }
              // @ts-ignore
              crewdata.value = allCrew.filter(crew => crew.profile_path !== null && crew.profile_path !== undefined)
            }
            // @ts-ignore
            castdata.value = allCast.filter(cast => cast.profile_path !== null && cast.profile_path !== undefined)
          }

        }
      }
      loader.value = false
      // fetchCast()
    }

    const fetchTV = async () => {
      if (tvSeriesMap.has(movieid.value)) {
        const data = tvSeriesMap.get(movieid.value)
        moviegenres.value = data.genres
        moviedet.value = data
      } else if (movieFile.value.minfo && movieFile.value.minfo.cached) {
        tvSeriesMap.set(movieid.value, movieFile.value.minfo)
        // @ts-ignore
        moviegenres.value = movieFile.value.minfo.genres
        // @ts-ignore
        moviedet.value = movieFile.value.minfo
      } else {
        const urlTv = `${Config.tmdbProxyUrl}/3/tv/${movieid.value}?api_key=87d8eb3d0895eaf37c2929fd5d9f7cce&language=zh-CN`
        const resp = await AliHttp.GetWithOutUserId(urlTv)
        if (AliHttp.IsSuccess(resp.code)) {
          tvSeriesMap.set(movieid.value, resp.body)
          moviegenres.value = resp.body.genres
          moviedet.value = resp.body
        }
      }
      if (tvSeasonsMap.has(movieid.value+tvSeasonNum.value)) {
        const data = tvSeasonsMap.get(movieid.value+tvSeasonNum.value)
        const allCast = data.credits.cast
        const allCrew = data.credits.crew
        if (allCrew.length > 0) {
          // @ts-ignore
          const results = allCrew.filter(crew => crew.job === 'Director' || crew.job === 'Casting')
          if (results.length > 0) {
            director.value = results[0]
          }
        }
        // @ts-ignore
        castdata.value = allCast.filter(cast => cast.profile_path !== null && cast.profile_path !== undefined)
        // @ts-ignore
        crewdata.value = allCrew.filter(crew => crew.profile_path !== null && crew.profile_path !== undefined)
        // @ts-ignore
        const episodeData = data.episodes.filter(episode => episode.episode_number === tvEpisodeNum.value)
        if (episodeData.length > 0) {
          tvepisodedet.value = episodeData[0]
          tvepisodedet.value.season_name = data.name
          tvepisodedet.value.season_backdrop = moviedet.value.backdrop_path
        }
      } else {
        const urlSeason = `${Config.tmdbProxyUrl}/3/tv/${movieid.value}/season/${tvSeasonNum.value}?api_key=87d8eb3d0895eaf37c2929fd5d9f7cce&language=zh-CN&append_to_response=credits`
        const resp = await AliHttp.GetWithOutUserId(urlSeason)
        if (AliHttp.IsSuccess(resp.code)) {
          const allCast = resp.body.credits.cast
          const allCrew = resp.body.credits.crew
          if (allCrew.length > 0) {
            // @ts-ignore
            const results = allCrew.filter(crew => crew.job === 'Director' || crew.job === 'Casting')
            if (results.length > 0) {
              director.value = results[0]
            }
            // @ts-ignore
            crewdata.value = allCrew.filter(crew => crew.profile_path !== null && crew.profile_path !== undefined)
          }
          if (allCast.length > 0) {
            // @ts-ignore
            castdata.value = allCast.filter(cast => cast.profile_path !== null && cast.profile_path !== undefined).sort((a, b) => a.order - b.order)
          }
          // @ts-ignore
          const episodeData = resp.body.episodes.filter(episode => episode.episode_number === tvEpisodeNum.value)

          if (episodeData.length > 0) {
            tvepisodedet.value = episodeData[0]
            tvepisodedet.value.season_name = resp.body.name
            tvepisodedet.value.season_backdrop = moviedet.value.backdrop_path
          }
          tvSeasonsMap.set(movieid.value+tvSeasonNum.value, resp.body)
        }

      }
      loader.value = false
      // fetchTvCast()
    }

    const fetchTvCast = async () => {
      if (castMap.has(movieid.value + tvSeasonNum.value)) {
        const castData = castMap.get(movieid.value + tvSeasonNum.value)
        const allCast = castData.cast
        const allCrew = castData.crew
        if (allCrew.length > 0) {
          // @ts-ignore
          const results = allCrew.filter(crew => crew.job === 'Director' || crew.job === 'Casting')
          if (results.length > 0) {
            director.value = results[0]
          }
        }
        // @ts-ignore
        castdata.value = allCast.filter(cast => cast.profile_path !== null && cast.profile_path !== undefined)
        // @ts-ignore
        crewdata.value = allCrew.filter(crew => crew.profile_path !== null && crew.profile_path !== undefined)
        loader.value = false
      } else {
        const url = `${Config.tmdbProxyUrl}/3/tv/${movieid.value}/season/${tvSeasonNum.value}/credits?api_key=87d8eb3d0895eaf37c2929fd5d9f7cce&language=zh-CN`
        const resp = await AliHttp.GetWithOutUserId(url)
        if (AliHttp.IsSuccess(resp.code)) {
          castMap.set(movieid.value + tvSeasonNum.value, resp.body)
          const allCast = resp.body.cast
          const allCrew = resp.body.crew
          if (allCrew.length > 0) {
            // @ts-ignore
            const results = allCrew.filter(crew => crew.job === 'Director' || crew.job === 'Casting')
            if (results.length > 0) {
              director.value = results[0]
            }
            // @ts-ignore
            crewdata.value = allCrew.filter(crew => crew.profile_path !== null && crew.profile_path !== undefined)
          }
          if (allCast.length > 0) {
            // @ts-ignore
            castdata.value = allCast.filter(cast => cast.profile_path !== null && cast.profile_path !== undefined).sort((a, b) => a.order - b.order)
          }
        }
        loader.value = false
      }
    }

    const fetchCast = async () => {
      if (castMap.has(movieid.value)) {
        const castData = castMap.get(movieid.value)
        const allCast = castData.cast
        const allCrew = castData.crew
        if (allCrew.length > 0) {
          // @ts-ignore
          const res = allCrew.filter(crew => crew.job === 'Director' || crew.job === 'Casting')
          if (res.length > 0) {
            director.value = res[0]
          }
        }
        // @ts-ignore
        castdata.value = allCast.filter(cast => cast.profile_path !== null && cast.profile_path !== undefined)
        // @ts-ignore
        crewdata.value = allCrew.filter(crew => crew.profile_path !== null && crew.profile_path !== undefined)
      } else {
        const url = `${Config.tmdbProxyUrl}/3/movie/${movieid.value}/credits?api_key=87d8eb3d0895eaf37c2929fd5d9f7cce&language=zh-CN`
        const resp = await AliHttp.GetWithOutUserId(url)
        if (AliHttp.IsSuccess(resp.code)) {
          castMap.set(movieid.value, resp.body)
          const allCast = resp.body.cast
          const allCrew = resp.body.crew
          if (allCrew.length > 0) {
            // @ts-ignore
            const res = allCrew.filter(crew => crew.job === 'Director' || crew.job === 'Casting')
            if (res.length > 0) {
              director.value = res[0]
            }
            // @ts-ignore
            crewdata.value = allCrew.filter(crew => crew.profile_path !== null && crew.profile_path !== undefined)
          }
          // @ts-ignore
          castdata.value = allCast.filter(cast => cast.profile_path !== null && cast.profile_path !== undefined)
        }
      }
      loader.value = false

    }
    const handleClose = () => {
      if (okLoading.value) okLoading.value = false
    }

    const toggleWatched = async () => {
      if (!watched.value) {
        percent.value = 100
        const videoInfo = await DB.getVideoInfo(movieFile.value.file_id)
        if (videoInfo) {
          videoInfo.play_cursor = videoInfo.duration
          videoInfo.watched = true
          await DB.saveVideoInfo(movieFile.value.file_id, videoInfo)
        } else {
          await DB.saveVideoInfo(movieFile.value.file_id,
            {
              file_id: movieFile.value.file_id, drive_id: movieFile.value.drive_id,
              play_cursor: movieFile.value.duration || 0, duration: movieFile.value.duration || -1, watched: true
            }
          )
        }
      } else {
        percent.value = 0
        const videoInfo = await DB.getVideoInfo(movieFile.value.file_id)
        if (videoInfo) {
          videoInfo.play_cursor = 0
          videoInfo.watched = false
          await DB.saveVideoInfo(movieFile.value.file_id, videoInfo)
        } else {
          await DB.saveVideoInfo(movieFile.value.file_id,
            {
              file_id: movieFile.value.file_id, drive_id: movieFile.value.drive_id,
              play_cursor: 0, duration: movieFile.value.duration || -1, watched: false
            }
          )
        }
      }
      watched.value = !watched.value
    }

    const play = () => {
      menuOpenFile(movieFile.value)
    }

    const episodeNameGen = (seasonName: string, episodeName: String, episode: number) => {
      return `${seasonName} • 第${episode}集 - ${episodeName}`
    }

    const translateStatus = (status: string) => {
      const statusMap: { [key: string]: string } = {
        'Returning Series': '连载中',
        'Planned': '计划中',
        'In Production': '制作中',
        'Ended': '已完结',
        'Released': '已上映',
        'Canceled': '已取消',
        'Pilot': '试播中'
      }

      return statusMap[status] || ''
    }

    const getCountry = () => {
      if (moviedet.value.production_countries && moviedet.value.production_countries.length > 0) {
        // @ts-ignore
        return moviedet.value.production_countries[0].iso_3166_1
      }
      return ''

    }

    const getSortedMovies = () => {
      const res = props.movies.slice().sort((a, b) => {
        if (a.episode_name && b.episode_name) {
          // @ts-ignore
          return a.episode_num - b.episode_num || a.episode_name.localeCompare(b.episode_name)
        } else if (a.minfo && a.minfo.title && b.minfo && b.minfo.title) {
          return a.minfo.title.localeCompare(b.minfo.title)
        } else if (a.name && b.name) {
          return a.name.localeCompare(b.name)
        }
        return 0 // 默认情况
      })
      return res
    }

    const searchMeta = () => {
      useModalStore().showModal('moviemeta', { movies: [movieFile.value] })
    }

    return {
      moviedet,
      castdata,
      director,
      moviegenres,
      loader,
      watched,
      crewdata,
      toggleWatched,
      movieFile,
      fetchMovie,
      fetchCast,
      percent,
      play,
      tvepisodedet,
      tvSeasonNum,
      tvEpisodeNum,
      handleClose,
      translateStatus,
      episodeNameGen,
      getCountry,
      getSortedMovies,
      searchMeta,
      selectMovie
    }
  },
  methods: {
    useModalStore,
    humanTime,
    handleHide() {
      modalCloseAll()
    }
  }
})
</script>

<template>
<!--  <a-modal :visible="visible" modal-class="modalclass" :footer="false" :unmount-on-close="true" :mask-closable="false" @cancel="handleHide" @close="handleClose">-->
<!--  <div>-->
    <div v-if=loader>
<!--      <span class="loader m-10"></span>-->
    </div>
    <div class="scroll-container" v-else>
      <!-- poster -->
      <div class="relative h-auto md:h-[82vh] flex justify-center ">

        <img
          v-if="tvepisodedet.still_path"
          :src="'https://image.tmdb.org/t/p/original/' + tvepisodedet.still_path"
          class="h-full w-full"
        />
        <img
          v-else-if="moviedet.backdrop_path"
          :src="'https://image.tmdb.org/t/p/original/' + moviedet.backdrop_path"
          class="h-full w-full"
        />
        <img
          v-else
          :src="movieFile.thumbnail"
          class="h-full w-full"
        />
        <div class="blur-overlay"></div>
        <div class="absolute bottom-5 left-0 p-3 justify-between  items-center space-y-2">
          <div class="flex space-x-4">
            <div @click='play()' class="bg-white text-black flex items-center rounded-2xl px-20 py-5 hover:scale-110">
              <span v-if='movieFile.play_cursor' class="font-bold play-button">继续 {{humanTime(movieFile.play_cursor || 0)}}</span>
              <span v-else class="font-bold play-button">播放</span>
            </div>
            <div :class="{'bg-gray-300': !watched, 'bg-white': watched}" class="text-black flex items-center rounded-2xl px-4 py-4 hover:scale-110">
              <button @click="toggleWatched" class="focus:outline-none">
                <svg v-if="watched" class="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <svg v-else class="w-5 h-5 text-gray-500" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M62 32S51.9 52 32 52S2 32 2 32s10.1-20 30-20s30 20 30 20" fill="#231f20"></path>
                  <path d="M57 32s-8.4 16.7-25 16.7S7 32 7 32s8.4-16.7 25-16.7S57 32 57 32z" fill="#ffffff"></path>
                  <path d="M45.4 32c0 7.5-6 13.5-13.5 13.5s-13.5-6-13.5-13.5s6-13.5 13.5-13.5s13.5 6 13.5 13.5" fill="#42ade2"></path>
                  <path d="M39.4 32c0 4.1-3.4 7.5-7.5 7.5s-7.5-3.4-7.5-7.5s3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" fill="#231f20"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </button>
            </div>
          </div>
          <div class="text-black flex items-center rounded-2xl px-20 py-5  justify-center  bg-gray-300">
            <span class="font-bold">预告片</span>
          </div>
          <div class="absolute bottom-1 text-white text-left play-button overflow-scroll" style='margin-left: 350px'>
            <div class="flex items-center">
              <p v-if='tvepisodedet.season_name' class="text-2xl md:text-3xl font-bold text-white">{{ episodeNameGen(tvepisodedet.season_name, tvepisodedet.name, tvepisodedet.episode_number) }}</p>
              <p v-else-if='moviedet.title || moviedet.name' class="text-2xl md:text-3xl font-bold text-white">{{ moviedet.title  || moviedet.name }}</p>
              <p v-else class="text-2xl md:text-3xl font-bold text-white mb-10 movie-name1">{{ movieFile.name }}</p>
              <Button class='ml-10' :class="{'editmeta': !tvepisodedet.season_name && !moviedet.title && !moviedet.name}" @click='searchMeta'>
                <i class="iconfont iconedit-square" />编辑元数据
              </Button>
            </div>
            <div class="flex items-center mt-2 mb-2 "> <!-- 使用 Flexbox 容器 -->
              <svg height="15px" width="15px" version="1.1" id="Capa_1" viewBox="0 0 47.94 47.94" xml:space="preserve" fill="#000000">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                  <path style="fill:#ED8A19;" d="M26.285,2.486l5.407,10.956c0.376,0.762,1.103,1.29,1.944,1.412l12.091,1.757 c2.118,0.308,2.963,2.91,1.431,4.403l-8.749,8.528c-0.608,0.593-0.886,1.448-0.742,2.285l2.065,12.042 c0.362,2.109-1.852,3.717-3.746,2.722l-10.814-5.685c-0.752-0.395-1.651-0.395-2.403,0l-10.814,5.685 c-1.894,0.996-4.108-0.613-3.746-2.722l2.065-12.042c0.144-0.837-0.134-1.692-0.742-2.285l-8.749-8.528 c-1.532-1.494-0.687-4.096,1.431-4.403l12.091-1.757c0.841-0.122,1.568-0.65,1.944-1.412l5.407-10.956 C22.602,0.567,25.338,0.567,26.285,2.486z"></path>
                </g>
              </svg>
              <p v-if='tvepisodedet.vote_average > 0' class="text-sm font-semibold ml-2 text-green-400">{{ tvepisodedet.vote_average.toFixed(1)  }}</p>
              <p v-else-if='moviedet.vote_average > 0' class="text-sm font-semibold ml-2 text-green-400 ">{{ moviedet.vote_average.toFixed(1) }}</p>
              <p v-else  class="text-sm font-semibold ml-2 text-green-400 ">{{ 0 }}</p>
              <p v-show='movieFile.media_duration || movieFile.duration' class="text-sm font-semibold ml-5 text-green-400">时长: {{movieFile.media_duration || humanTime(movieFile.duration || 0) || '' }}</p>
              <p v-show='movieFile.media_height != undefined' class="text-sm font-semibold ml-5 text-green-400 ">{{ movieFile.media_height?.toString()+'p'}}</p>
              <p v-if='tvepisodedet.air_date' class="text-sm font-semibold ml-5 text-green-400 ">首映: {{ tvepisodedet.air_date }}</p>
              <p v-else-if='moviedet.release_date' class="text-sm font-semibold ml-5 text-green-400 ">首映: {{ moviedet.release_date }}</p>
              <p v-show='moviedet.last_air_date' class="text-sm font-semibold ml-5 text-green-400 ">更新: {{ moviedet.last_air_date }}</p>
              <p v-show='moviedet.number_of_seasons != -1' class="text-sm font-semibold ml-5 text-green-400 ">总{{ moviedet.number_of_seasons }}季-总{{ moviedet.number_of_episodes }}集</p>
              <p v-show='getCountry()' class="text-sm font-semibold ml-5 text-green-400 ">地区: {{ getCountry() }}</p>
              <p v-show='translateStatus(moviedet.status)' class="text-sm font-semibold ml-5 text-green-400 ">{{ translateStatus(moviedet.status) }}</p>
            </div>
            <div  v-show='moviedet.id !== -1' class="flex  mt-2 mb-2 items-center">
              <div
                v-for="tag in moviegenres"
                :key="tag.id"
                class="text-blue-300 font-semibold bg-gray-700 rounded-full px-4 py-1 m-1">
                {{ tag.name }}
              </div>
            </div>
            <p v-if='tvepisodedet.overview' class="text-base font-bold break-text "  >{{ tvepisodedet.overview }}</p>
            <p v-else-if='moviedet.overview' class="text-base font-bold  break-text ">{{ moviedet.overview }}</p>
          </div>
        </div>
        <div class='movieprogress1'>
          <a-progress
            :percent='percent' :show-text='false'
            :stroke-width='5'
            size='large' status='warning' :style="{left:'-6px'}" />
        </div>
      </div>
      <!-- 电影列表 -->
      <div class="flex flex-col mt-10 movie-container ml-2">
        <div
          v-for="movie in getSortedMovies()"
          :key="movie.minfo?.id || movie.file_id"
          @click="selectMovie(movie)"
          class="cursor-pointer px-2">
          <img
            v-if='movie.minfo'
            :src="movie.season_poster ? 'https://image.tmdb.org/t/p/original' + movie.season_poster: 'https://image.tmdb.org/t/p/original' + movie.minfo?.poster_path"
            class="w-40 h-50 rounded-xl postimg"
          />
          <img
            v-else
            :src="movie.thumbnail"
            class="w-30 h-40 rounded-xl postimg"
          />
          <p v-if='movie.episode_name' class="text-base text-center font-semibold movie-name  ml-5">{{ `${movie.episode_num}•${movie.episode_name}` }}</p>
          <p v-else class="text-base text-center font-semibold  movie-name ml-5">{{ movie.minfo?.title ? movie.minfo?.title: movie.name}}</p>
        </div>
      </div>
      <!-- cast -->
      <div  class="cast-container flex-col items-center">
        <h1 class="text-3xl text-blue-300 font-semibold text-center p-2">演员</h1>

        <div class="items-center md:px-5 flex flex-row my-5 max-w-full flex-start overflow-x-aul, to relative scrollbar-thin scrollbar-thumb-gray-500/20 scrollbar-track-gray-900/90 md:pb-3">
          <div
            v-if='director.id != -1'
            class="flex min-w-[9rem] max-w-[9rem] md:max-w-[10rem] h-full text-center mx-1">
            <img
              v-if='director.profile_path'
              :src="'https://image.tmdb.org/t/p/w500' + director.profile_path"
              class="w-full h-full rounded-xl" />
            <svg v-else viewBox="0 0 256 256" version="1.1" id="svg8" fill="#000000">
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="M 16.056766,240 H 239.94325" id="path905" ></path> <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 16.056766,240 c 0,-47.97569 31.983762,-64.0813 31.983762,-64.0813 15.991919,-9.23291 31.9838,0 47.975681,-15.99189" id="path907"></path>
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 96.016209,159.92681 c 0,0 15.991921,15.99189 31.983801,15.99189" id="path909" ></path>
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 239.94325,240 c 0,-47.97569 -31.9838,-64.0813 -31.9838,-64.0813 -15.99188,-9.23291 -31.98376,0 -47.97564,-15.99189" id="path907-5"></path>
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 159.98381,159.92681 c 0,0 -15.99192,15.99189 -31.9838,15.99189" id="path909-6" ></path>
              <path id="path974" style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none" d="m 128.00001,15.99977 c 31.9838,0 47.97568,15.991881 47.97568,63.967561 0,39.979759 -31.9838,63.967599 -47.97568,63.967599" ></path>
              <path id="path974-1" style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none" d="m 128.00001,15.99977 c -31.983801,0 -47.975682,15.991881 -47.975682,63.967561 0,39.979759 31.983802,63.967599 47.975682,63.967599" ></path>
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 159.98381,159.92681 -7.41232,-27.66304" id="path1014"></path> <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 96.016209,159.92681 7.412321,-27.66304" id="path1016" ></path>
            </svg>
            <div class="text-container">
              <p class="text-black movie-name">{{ director.name }}</p>
              <p class="text-blue-300 movie-name">(导演)</p>
            </div>
          </div>
          <div
            v-for="cast in castdata"
            class="flex min-w-[9rem] max-w-[9rem] md:max-w-[10rem] h-full text-center mx-1">
            <img
              v-if='cast.profile_path'
              :src="'https://image.tmdb.org/t/p/w500' + cast.profile_path"
              class="w-full h-full rounded-xl" />
            <svg v-else viewBox="0 0 256 256" version="1.1" id="svg8" fill="#000000">
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="M 16.056766,240 H 239.94325" id="path905"></path> <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 16.056766,240 c 0,-47.97569 31.983762,-64.0813 31.983762,-64.0813 15.991919,-9.23291 31.9838,0 47.975681,-15.99189" id="path907"></path>
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 96.016209,159.92681 c 0,0 15.991921,15.99189 31.983801,15.99189" id="path909" ></path>
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 239.94325,240 c 0,-47.97569 -31.9838,-64.0813 -31.9838,-64.0813 -15.99188,-9.23291 -31.98376,0 -47.97564,-15.99189" id="path907-5" ></path>
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 159.98381,159.92681 c 0,0 -15.99192,15.99189 -31.9838,15.99189" id="path909-6" ></path>
              <path id="path974" style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none" d="m 128.00001,15.99977 c 31.9838,0 47.97568,15.991881 47.97568,63.967561 0,39.979759 -31.9838,63.967599 -47.97568,63.967599"></path>
              <path id="path974-1" style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none" d="m 128.00001,15.99977 c -31.983801,0 -47.975682,15.991881 -47.975682,63.967561 0,39.979759 31.983802,63.967599 47.975682,63.967599" ></path>
              <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 159.98381,159.92681 -7.41232,-27.66304" id="path1014" ></path> <path style="fill:none;stroke:#b8b7b7;stroke-width:15.99953938;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 96.016209,159.92681 7.412321,-27.66304" id="path1016" ></path>
            </svg>
            <div class="text-container">
              <p class="text-black movie-name">{{ cast.name }}</p>
              <p class="text-blue-300 movie-name">({{ cast.character }})</p>
            </div>
          </div>
        </div>
      </div>
    </div>
<!--  </div>-->
<!--  </a-modal>-->
</template>

<style>
.scroll-container {
  height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.text-container {
  margin-top: 240px;
  margin-left: -120px;
}

.text-container p {
  margin: 0;
}
.play-button {
  white-space: nowrap;
}
.blur-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 35%; /* 调整此值来控制虚化部分的高度 */
  background: radial-gradient(ellipse at center, rgba(3, 3, 3, 0.6) 0%, rgba(0, 0, 0, 0) 70%);
  backdrop-filter: blur(5px); /* 调整此值来控制虚化的程度 */
}
.movieprogress1 {
  width: 100%;
  font-size: 10px;
  line-height: 18px;
  position: absolute;
  left: 0;
  right:0;
  bottom: -5px;
}
.break-text {
  white-space: pre-line !important;
  overflow: scroll !important;
  text-overflow: ellipsis !important;
  max-height: 100px !important;
}
.movie-name {
  white-space: nowrap;
  overflow: hidden; /* 隐藏超出容器的文本 */
  text-overflow: ellipsis; /* 使用省略号表示截断的文本 */
  max-width: 100px;
}
.movie-name1 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  max-width: 500px;
}
.cast-container {
  white-space: nowrap; /* 防止文本换行 */
  overflow-x: scroll; /* 允许水平滚动 */
  overflow-y: hidden; /* 禁止垂直滚动 */
  width: 100%; /* 适应容器宽度 */
  max-width: 100%; /* 可以根据需要调整最大宽度 */
}

.editmeta {
  margin-top: -30px;
}

.movie-container {
  display: flex !important;
  overflow-x: scroll  !important;
  overflow-y: visible  !important;
  width: 100%  !important;
  max-width: 100%  !important;
}
.postimg {
  max-width: fit-content  !important;
}
</style>
