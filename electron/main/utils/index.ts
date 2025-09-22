import net from 'net'

export function portIsOccupied(port: number) {
  const server = net.createServer().listen(port, '0.0.0.0')
  return new Promise<number>((resolve, reject) => {
    server.on('listening', () => {
      console.log(`the server is runnint on port ${port}`)
      server.close()
      resolve(port) // 返回可用端口
    })
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(portIsOccupied(port + 1)) // 如传入端口号被占用则 +1
        console.log(`this port ${port} is occupied.try another.`)
      } else {
        console.log(err)
        // reject(err)
        resolve(port)
      }
    })
  })
}