const util = require('util')
const fs = require('fs')
const httpParser = require('http-message-parser')
const debug = require('debug')('botium-connector-alexa-avs-avs')
const currentVersion = require('node-version')
const major = parseInt(currentVersion.major, 10)
if (major < 9) {
  if (major < 8) {
    throw new Error(`Node v8 required, Node v10 preferred. Your version is ${currentVersion.original}`)
  } else {
    [console.log, debug].forEach(fn => fn(`Node v10 preferred. Your version is ${currentVersion.original}`))
  }
}
const http2 = require('http2')

const {AccessTokenRefreshRequest} = require('./core')

const BASE_URL = 'https://avs-alexa-eu.amazon.com'
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
    this.messageId = 0
  }

  Validate () {
    debug('Validate called')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_ID]) throw new Error('ALEXA_AVS_AVS_CLIENT_ID capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_REFRESH_TOKEN]) throw new Error('ALEXA_AVS_AVS_REFRESH_TOKEN capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_AVS_LANGUAGE_CODE capability required')
  }

  Build () {
    debug('Build called')
    // 1) acquiring access token from refresh token
    return AccessTokenRefreshRequest(this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_ID], this.caps[Capabilities.ALEXA_AVS_AVS_REFRESH_TOKEN])
      .then((result) => {
        debug('Access token acquired')
        this.accessToken = result.access_token

        // 2) creating avs client
        this.client = http2.connect(BASE_URL)
        this.client.on('error', (err) => console.error(`Client Error ${err}`))
        this.client.on('socketError', (err) => console.error(`Client Socket Error ${err}`))
        this.client.on('goaway', (err) => console.error(`Client GoAway ${err}`))
        this.client.on('response', (headers, flags) => console.log('Client response'))
        this.client.on('data', (chunk) => console.log('Client data'))
        this.client.on('end', (chunk) => console.log('Client end'))
        debug('AVS http2-client created')

        // 3) creating downchannel
        const options = {
          ':method': 'GET',
          ':scheme': 'https',
          ':path': '/v20160207/directives',
          'authorization': 'Bearer ' + this.accessToken
        }

        var req = this.client.request(options)
        req.on('error', (e) => console.error(`Downchannel error ${e}`))
        req.on('socketError', (e) => console.error(`Downchannel socket error ${e}`))
        req.on('goaway', (e) => console.error(`Downchannel goaway ${e}`))
        req.on('response', (headers, flags) => {
          debug(`Downchannel create status: ${JSON.stringify(headers, null, 2)}`)
        })
        req.on('data', (chunk) => debug(`Downchannel data received ${chunk}`))
        req.on('end', () => debug('Downchannel closed'))
        req.end()
        debug(`Downchannel creating ${util.inspect(options)}`)
      })
  }

  UserSays (audio) {
    debug('UserSays called')
    if (debug.enabled) {
      fs.writeFileSync(`UserSays.mp3`, audio)
    }

    return new Promise((resolve, reject) => {
      // data for synchronizing state.
      // we have stateless client,
      // so this can be always the same
      var metadata = JSON.stringify(
        {
          'context': [
            {
              'header': {
                'namespace': 'SpeechRecognizer',
                'name': 'RecognizerState'
              },
              'payload': {

              }
            },
            {
              'header': {
                'namespace': 'Speaker',
                'name': 'VolumeState'
              },
              'payload': {
                'volume': 10,
                'muted': false
              }
            },
            {
              'header': {
                'namespace': 'Alerts',
                'name': 'AlertsState'
              },
              'payload': {
                'allAlerts': [],
                'activeAlerts': []
              }
            },
            {
              'header': {
                'namespace': 'SpeechSynthesizer',
                'name': 'SpeechState'
              },
              'payload': {
                'token': '',
                'offsetInMilliseconds': 0,
                'playerActivity': 'FINISHED'
              }
            },
            {
              'header': {
                'namespace': 'AudioPlayer',
                'name': 'PlaybackState'
              },
              'payload': {
                'token': '',
                'offsetInMilliseconds': 0,
                'playerActivity': 'IDLE'
              }
            }
          ],
          'event': {
            'header': {
              'namespace': 'SpeechRecognizer',
              'name': 'Recognize',
              'messageId': '1eff3c5e-02e3-4dd3-9ca0-7c38937f005f',
              'dialogRequestId': 'a905c2bb-1bbd-45cf-9f85-6563d2546492'
            },
            'payload': {
              'profile': 'FAR_FIELD',
              'format': 'AUDIO_L16_RATE_16000_CHANNELS_1'
            }
          }
        })
      var data = '--this-is-my-boundary-for-alexa\r\n'
      data += 'Content-Disposition: form-data; name="metadata"\r\n'
      data += 'Content-Type: application/json; charset=UTF-8\r\n\r\n'
      data += metadata
      data += '\r\n'
      data += '--this-is-my-boundary-for-alexa\r\n'
      data += 'Content-Disposition: form-data; name="audio"\r\n'
      data += 'Content-Type:application/octet-stream\r\n\r\n'
      var payload = Buffer.concat([
        Buffer.from(data, 'utf8'),
        audio,
        Buffer.from('\r\n--this-is-my-boundary-for-alexa\r\n', 'utf8')
      ])
      var request = {
        ':method': 'POST',
        ':scheme': 'https',
        ':path': '/v20160207/events',
        'authorization': `Bearer  ${this.accessToken}`,
        'content-type': 'multipart/form-data; boundary=this-is-my-boundary-for-alexa'
      }

      debug(`UserSays request ${JSON.stringify(request, null, 2)}`)
      var req = this.client.request(request)
      req.on('error', (e) => {
        return reject(e)
      })
      req.on('socketError', (e) => {
        return reject(e)
      })
      let outdata
      req.on('data', (chunk) => {
        outdata = outdata ? Buffer.concat([outdata, chunk]) : chunk
      })
      req.on('end', () => {
        if (outdata && outdata.length) {
          const parsedMessage = httpParser(outdata)
          for (var multipartIndex in parsedMessage.multipart) {
            const part = parsedMessage.multipart[multipartIndex]
            if (debug.enabled) {
              debug(`UserSays response, multipart ${multipartIndex}: ${util.inspect(part)}`)
              if (part.headers['Content-Type'] && part.headers['Content-Type'].indexOf('application/json') === 0) {
                debug(`UserSays response, multipart ${multipartIndex} Body: ${part.body.toString('utf8')}`)
              }
            }
          }

          const contentPayload = parsedMessage.multipart.reduce((acc, part) => {
            if (part.headers && part.headers['Content-ID']) {
              debug(`Found Content Payload with CID ${part.headers['Content-ID']}`)
              acc[part.headers['Content-ID']] = part.body
            }
            return acc
          }, {})

          const directivePayload = parsedMessage.multipart.reduce((acc, part) => {
            if (part.headers && part.headers['Content-Type'].indexOf('application/json') === 0) {
              debug(`Found JSON Payload of type ${part.headers['Content-Type']}`)
              const partJson = JSON.parse(part.body.toString('utf8'))
              if (partJson.directive) {
                acc.push(partJson.directive)
              }
            }
            return acc
          }, [])

          const audioBuffers = []
          directivePayload.forEach(directive => {
            if (directive.header && directive.header.namespace === 'SpeechSynthesizer' && directive.header.name === 'Speak') {
              debug(`Found SpeechSynthesizer/Speak directive ${util.inspect(directive)}`)
              if (directive.payload.url.indexOf('cid:') === 0) {
                const lookupContentId = `<${directive.payload.url.substr(4)}>`
                if (contentPayload[lookupContentId]) {
                  audioBuffers.push({ format: directive.payload.format, payload: contentPayload[lookupContentId] })
                } else {
                  throw new Error(`Directive payload ${lookupContentId} not found in response.`)
                }
              } else {
                throw new Error(`Directive payload url ${directive.payload.url} not supported.`)
              }
            }
          })
          if (audioBuffers && audioBuffers.length > 0 && debug.enabled) {
            audioBuffers.forEach((ab, index) => {
              fs.writeFileSync(`AlexaSaid${index}.mp3`, ab.payload)
            })
          }
          resolve(audioBuffers)
        } else {
          debug(`UserSays response is empty`)
          resolve()
        }
      })

      req.write(payload)
      req.end()
    })
  }

  Stop () {
    debug('Stop called')
    return Promise.resolve()
  }

  Clean () {
    debug('Clean called')
    this.client.destroy()
    this.client = null
    this.accessToken = null
    return Promise.resolve()
  }
}

module.exports = {
  AVS,
  ALEXA_AVS_AVS_CLIENT_ID,
  ALEXA_AVS_AVS_REFRESH_TOKEN
}
