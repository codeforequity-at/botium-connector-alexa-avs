'use strict'

const request = require('request')
const _ = require('lodash')
const stream = require('stream')
const isStream = require('is-stream')
const isBuffer = require('is-buffer')
const streamToBuffer = require('stream-to-buffer')
const https = require('https')
const AudioContext = require('web-audio-api').AudioContext
const audioContext = new AudioContext()
const {AccessTokenRefreshRequest} = require('./core')
const httpParser = require('http-message-parser')

const ALEXA_AVS_AVS_CLIENT_ID = 'ALEXA_AVS_AVS_CLIENT_ID'
const ALEXA_AVS_AVS_REFRESH_TOKEN = 'ALEXA_AVS_AVS_REFRESH_TOKEN'

const Capabilities = {
  ALEXA_AVS_AVS_CLIENT_ID,
  ALEXA_AVS_AVS_REFRESH_TOKEN,
  ALEXA_AVS_AVS_LANGUAGE_CODE: 'ALEXA_AVS_AVS_LANGUAGE_CODE'
}

class AVS {
  constructor (caps) {
    this.caps = caps
  }

  Validate () {
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_ID]) throw new Error('ALEXA_AVS_AVS_CLIENT_ID capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_REFRESH_TOKEN]) throw new Error('ALEXA_AVS_AVS_REFRESH_TOKEN capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_AVS_LANGUAGE_CODE capability required')
  }

  Build () {
    return AccessTokenRefreshRequest(this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_ID], this.caps[Capabilities.ALEXA_AVS_AVS_REFRESH_TOKEN])
      .then((result) => { this.accessToken = result.access_token })
  }

  Ask (audio) {
    return new Promise((resolve, reject) => {
      const formData = {
        metadata: {
          'messageHeader': {},
          'messageBody': {
            'profile': 'alexa-close-talk',
            'locale': this.caps[Capabilities.ALEXA_AVS_AVS_LANGUAGE_CODE],
            'format': 'audio/L16; rate=16000; channels=1'
          }
        },
        audio
      }
      formData.metadata = JSON.stringify(formData.metadata)

      request(
        {
          method: 'POST',
          url: 'https://access-alexa-na.amazon.com/v1/avs/speechrecognizer/recognize',
          headers: {
            'authorization': `Bearer ${this.accessToken}`
          },
          formData: formData,
          json: true
        }, (err, httpResponse, body) => {
          if (err) {
            return reject(err)
          }

          httpParser(body).multipart.forEach(function (part) {
            var headers = part.headers
            var bodyBuffer = part.body
            var contentType = _.get(headers, 'Content-Type')

            if (bodyBuffer) {
              if (contentType === 'audio/mpeg') {
                console.log(JSON.stringify({
                  headers: headers
                }))
                var fs = require('fs')

                // function to encode file data to base64 encoded string
                function base64_encode (file) {
                  // read binary data
                  var bitmap = fs.readFileSync(file)
                  // convert binary data to base64 encoded string
                  return {base64: new Buffer(bitmap).toString('base64'), row: bitmap}
                }

                const mp3AsBase64 = base64_encode('./a.mp3')
                console.log('steam?: ' + isStream(bodyBuffer))
                console.log('buffer?: ' + isBuffer(bodyBuffer))
                fs.writeFile('received.mp3', bodyBuffer, function (err) {
                  console.log(err)
                })
                const decode = require('audio-decode')
                var audioType = require('audio-type');
                console.log('type: '  + audioType(bodyBuffer))
                decode(bodyBuffer).then(audioBuffer => {
                  console.log(audioBuffer)
                }, (err) => {
                  console.log(err)
                })
/*                audioContext.decodeAudioData(
                  bodyBuffer,
                  function (buffer) {
                    console.log('Decoded buffer:', buffer)
                    fs.writeFile('received.mp3', bodyBuffer, function (err) {
                      console.log(err)
                    })
                  },
                  function (err) {
                    console.log(err)
                  }
                )*/
              } else if (contentType === 'application/json') {
                var body = JSON.parse(bodyBuffer.toString('utf8'))
                var directives = _.get(body, ['messageBody', 'directives'])
                var streamUrls = []
                if (directives) {
                  body.messageBody.directives = directives.map(function (directive, i) {
                    var audioItem = _.get(directive, ['payload', 'audioItem'])
                    if (audioItem) {
                      var streams = _.get(audioItem, 'streams')
                      if (streams) {
                        directive.payload.audioItem.streams = streams.map(function (stream, j) {
                          if (/^https?/.test(stream.streamUrl)) {
                            streamUrls.push({
                              propertyPath: ['messageBody', 'directives', i, 'payload', 'audioItem', 'streams', j],
                              url: stream.streamUrl
                            })
                          }
                          return stream
                        })
                      }
                    }
                    return directive
                  })
                }

                var streamUrlsSize = _.size(streamUrls)
                if (streamUrlsSize) {
                  var completed = 0
                  streamUrls.forEach(function (stream) {
                    var urls = []
                    request(stream.url, function (error, response, bodyResponse) {
                      urls.push(bodyResponse)
                      _.set(body, stream.propertyPath.concat('streamMp3Urls'), urls)
                      if (++completed === streamUrlsSize) {
                        send(new Buffer(JSON.stringify(body)))
                      }
                    })
                  })
                } else {
                  send(bodyBuffer)
                }

                function send (bodyBuffer) {
                  /* console.log(
                    JSON.stringify({
                      headers: headers,
                      body: bodyBuffer.toString('utf8')
                    })
                  ) */
                }
              }
            }
          })
          return resolve(httpParser(body).multipart[1].body)
        })
    })
  }
}

module.exports = {
  AVS,
  ALEXA_AVS_AVS_CLIENT_ID,
  ALEXA_AVS_AVS_REFRESH_TOKEN
}
