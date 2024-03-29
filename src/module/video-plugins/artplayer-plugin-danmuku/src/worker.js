function getDanmuTop({ target, emits, clientWidth, clientHeight, marginBottom, marginTop, antiOverlap }) {
  const danmus = emits
    .filter((item) => item.mode === target.mode && item.top <= clientHeight - marginBottom)
    .sort((prev, next) => prev.top - next.top)

  if (danmus.length === 0) {
    return marginTop
  }

  danmus.unshift({
    top: 0,
    left: 0,
    right: 0,
    height: marginTop,
    width: clientWidth,
    speed: 0,
    distance: clientWidth
  })

  danmus.push({
    top: clientHeight - marginBottom,
    left: 0,
    right: 0,
    height: marginBottom,
    width: clientWidth,
    speed: 0,
    distance: clientWidth
  })

  for (let index = 1; index < danmus.length; index += 1) {
    const item = danmus[index]
    const prev = danmus[index - 1]
    const prevBottom = prev.top + prev.height
    const diff = item.top - prevBottom
    if (diff >= target.height) {
      return prevBottom
    }
  }

  const topMap = []
  for (let index = 1; index < danmus.length - 1; index += 1) {
    const item = danmus[index]
    if (topMap.length) {
      const last = topMap[topMap.length - 1]
      if (last[0].top === item.top) {
        last.push(item)
      } else {
        topMap.push([item])
      }
    } else {
      topMap.push([item])
    }
  }

  if (antiOverlap) {
    switch (target.mode) {
      case 0: {
        const result = topMap.find((list) => {
          return list.every((danmu) => {
            if (clientWidth < danmu.distance) return false
            if (target.speed < danmu.speed) return true
            const overlapTime = danmu.right / (target.speed - danmu.speed)
            if (overlapTime > danmu.time) return true
            return false
          })
        })

        return result && result[0] ? result[0].top : undefined
      }
      case 1:
        return undefined
      default:
        break
    }
  } else {
    switch (target.mode) {
      case 0:
        topMap.sort((prev, next) => {
          const nextMinRight = Math.min(...next.map((item) => item.right))
          const prevMinRight = Math.min(...prev.map((item) => item.right))
          return nextMinRight * next.length - prevMinRight * prev.length
        })
        break
      case 1:
        topMap.sort((prev, next) => {
          const nextMaxWidth = Math.max(...next.map((item) => item.width))
          const prevMaxWidth = Math.max(...prev.map((item) => item.width))
          return prevMaxWidth * prev.length - nextMaxWidth * next.length
        })
        break
      default:
        break
    }

    return topMap[0][0].top
  }
}

onmessage = (event) => {
  const { data } = event
  const top = getDanmuTop(data)
  self.postMessage({
    top,
    id: data.id
  })
}
