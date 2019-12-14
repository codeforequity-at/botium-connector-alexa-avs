const httpParser = require('http-message-parser')
const debug = require('debug')('botium-connector-alexa-avs-http2')

const postForm = (client, requestOptions, formData) => {
  return new Promise((resolve, reject) => {
    const payload = formData.getBuffer()

    requestOptions['content-type'] = `multipart/form-data; boundary=${formData.getBoundary()}`

    debug(`HTTP2 request ${JSON.stringify(requestOptions, null, 2)}`)
    var req = client.request(requestOptions)
    req.on('error', (err) => {
      debug(`HTTP2 request to ${requestOptions[':path']} error: ${err.message}`)
      return reject(err)
    })
    req.on('socketError', (err) => {
      debug(`HTTP2 request to ${requestOptions[':path']} socketError: ${err.message}`)
      return reject(err)
    })
    req.on('response', (headers, flags) => {
      debug(`HTTP2 request to ${requestOptions[':path']} got response: ${JSON.stringify(headers, null, 2)}`)
    })

    let outdata
    req.on('data', (chunk) => {
      outdata = outdata ? Buffer.concat([outdata, chunk]) : chunk
    })
    req.on('end', () => {
      if (outdata && outdata.length) {
        const parsedMessage = httpParser(outdata)
        resolve(parsedMessage)
      } else {
        resolve()
      }
    })

    req.write(payload)
    req.end()
  })
}

module.exports = {
  postForm
}
