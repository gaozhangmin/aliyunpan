const PropertyParser = {
  parsePath(path: string) {
    let pathArray = path.split('/')
    let targetElement = pathArray.pop() || ''
    let targetElementArray = targetElement.split('.') || []
    if (targetElementArray.length > 1) {
      let ext = targetElementArray.pop() || ''
      targetElementArray.push(ext.toLowerCase())
      targetElement = targetElementArray.join('.')
    }
    if (pathArray.length <= 1) {
      pathArray[0] = '/'
    }
    let parentPath = pathArray.join('/')
    return {
      element: targetElement,
      parentFolder: parentPath
    }
  },

  parsePathTo(pathTo: string) {
    let pathArray = pathTo.split('/')
    let newPath = pathTo
    if (pathArray[pathArray.length - 1] == '' && pathTo !== '/') {
      pathArray.pop()
      newPath = pathArray.join('/')
    }
    return newPath
  },

  // 2023-11-27T19:47:21
  parseDate(dateString: string) {
    let dateArray = dateString.split('.')
    dateArray = dateArray[0].split('T')
    let date = dateArray[0].split('-')
    let time = dateArray[1].split(':')
    return new Date(parseInt(date[0]), parseInt(date[1]) - 1, parseInt(date[2]), parseInt(time[0]), parseInt(time[1]), parseInt(time[2])).getDate()
  },

  parseFileExt(fileName: string) {
    let fileNameArray = (fileName || '').split('.')
    return fileNameArray.length > 1 ? fileNameArray.pop() : ''
  },

  standarizePath(path: string) {
    if (!path) path = '/'
    const startIndex = path.indexOf('://')
    if (startIndex !== -1) {
      path = path.substr(startIndex + 3)
      path = path.substr(path.indexOf('/') + 1)
    }
    path = path.replace(/\\/g, '/')
    var rex = /\/\//g
    while (rex.test(path))
      path = path.replace(rex, '/')
    path = path.replace(/\/$/g, '')
    path = path.replace(/^([^\/])/g, '/$1')
    if (path.length === 0)
      path = '/'
    return path
  }
}

export default PropertyParser