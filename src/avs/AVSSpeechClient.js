const util = require('util')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const debug = require('debug')('botium-connector-alexa-avs-avs')
const { v1: uuidv1 } = require('uuid')
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

const { AccessTokenRefreshRequest } = require('./core')
const { postForm } = require('../utils/http2')

const BASE_URL_DEFAULT = 'https://alexa.eu.gateway.devices.a2z.com'
const ALEXA_AVS_AVS_BASE_URL = 'ALEXA_AVS_AVS_BASE_URL'
const ALEXA_AVS_AVS_CLIENT_ID = 'ALEXA_AVS_AVS_CLIENT_ID'
const ALEXA_AVS_AVS_CLIENT_SECRET = 'ALEXA_AVS_AVS_CLIENT_SECRET'
const ALEXA_AVS_AVS_REFRESH_TOKEN = 'ALEXA_AVS_AVS_REFRESH_TOKEN'
const CONTEXT = [
  {
    header: {
      namespace: 'SpeechRecognizer',
      name: 'RecognizerState'
    },
    payload: {

    }
  },
  {
    header: {
      namespace: 'Speaker',
      name: 'VolumeState'
    },
    payload: {
      volume: 10,
      muted: false
    }
  },
  {
    header: {
      namespace: 'Alerts',
      name: 'AlertsState'
    },
    payload: {
      allAlerts: [],
      activeAlerts: []
    }
  },
  {
    header: {
      namespace: 'SpeechSynthesizer',
      name: 'SpeechState'
    },
    payload: {
      token: '',
      offsetInMilliseconds: 0,
      playerActivity: 'FINISHED'
    }
  },
  {
    header: {
      namespace: 'AudioPlayer',
      name: 'PlaybackState'
    },
    payload: {
      token: '',
      offsetInMilliseconds: 0,
      playerActivity: 'IDLE'
    }
  }
]

const Capabilities = {
  ALEXA_AVS_AVS_BASE_URL,
  ALEXA_AVS_AVS_CLIENT_ID,
  ALEXA_AVS_AVS_CLIENT_SECRET,
  ALEXA_AVS_AVS_REFRESH_TOKEN,
  ALEXA_AVS_AVS_LANGUAGE_CODE: 'ALEXA_AVS_AVS_LANGUAGE_CODE'
}

class AVS {
  constructor (caps, tempDirectory) {
    this.caps = caps
    this.tempDirectory = tempDirectory
    this.messageId = 0
  }

  Validate () {
    debug('Validate called')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_ID]) throw new Error('ALEXA_AVS_AVS_CLIENT_ID capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_SECRET]) throw new Error('ALEXA_AVS_AVS_CLIENT_SECRET capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_REFRESH_TOKEN]) throw new Error('ALEXA_AVS_AVS_REFRESH_TOKEN capability required')
    // it is validated, but not used. It looks strange that we cant specifiy the language for AVS, so better leave it here
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_AVS_LANGUAGE_CODE capability required')
  }

  Build () {
    debug('Build called')
    // 1) acquiring access token from refresh token
    return AccessTokenRefreshRequest(this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_ID], this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_SECRET], this.caps[Capabilities.ALEXA_AVS_AVS_REFRESH_TOKEN])
      .then((result) => new Promise((resolve, reject) => {
        debug('Access token acquired')
        this.accessToken = result.access_token

        // 2) creating avs client
        this.client = http2.connect(this.caps[Capabilities.ALEXA_AVS_AVS_BASE_URL] || BASE_URL_DEFAULT)
        this.client.on('error', (err) => debug(`Client Error ${err}`))
        this.client.on('socketError', (err) => debug(`Client Socket Error ${err}`))
        this.client.on('goaway', (err) => debug(`Client GoAway ${err}`))
        this.client.on('response', (headers, flags) => debug(`Client response: ${JSON.stringify(headers, null, 2)}`))
        this.client.on('data', (chunk) => debug('Client data'))
        this.client.on('end', (chunk) => debug('Client end'))
        debug('AVS http2-client created')

        // 3) creating downchannel
        const requestOptions = {
          ':method': 'GET',
          ':scheme': 'https',
          ':path': '/v20160207/directives',
          authorization: 'Bearer ' + this.accessToken
        }
        debug(`Downchannel created ${util.inspect(requestOptions)}`)

        const req = this.client.request(requestOptions)
        req.on('error', (e) => debug(`Downchannel error ${e}`))
        req.on('socketError', (e) => debug(`Downchannel socket error ${e}`))
        req.on('goaway', (e) => debug(`Downchannel goaway ${e}`))
        req.on('response', (headers, flags) => {
          debug(`Downchannel create status: ${JSON.stringify(headers, null, 2)}`)
          resolve()
        })
        req.on('data', (chunk) => debug(`Downchannel data received ${chunk}`))
        req.on('end', () => debug('Downchannel closed'))
        req.end()
      }))
  }

  Start () {
    debug('Start called')
    return Promise.resolve()
  }

  async UserSays (audio) {
    debug('UserSays called')
    if (debug.enabled) {
      fs.writeFileSync(path.resolve(this.tempDirectory, 'UserSays.wav'), audio)
    }

    const metadata = JSON.stringify(
      {
        context: CONTEXT,
        event: {
          header: {
            namespace: 'SpeechRecognizer',
            name: 'Recognize',
            messageId: uuidv1(),
            dialogRequestId: uuidv1()
          },
          payload: {
            profile: 'FAR_FIELD',
            format: 'AUDIO_L16_RATE_16000_CHANNELS_1'
          }
        }
      })

    const form = new FormData()
    form.append('metadata', metadata)
    form.append('audio', audio, { contentType: 'application/octet-stream' })

    const request = {
      ':method': 'POST',
      ':scheme': 'https',
      ':path': '/v20160207/events',
      authorization: `Bearer ${this.accessToken}`
    }

    const parsedMessage = await postForm(this.client, request, form)
    if (parsedMessage) {
      // log the json part of the message
      if (debug.enabled) {
        for (const multipartIndex in parsedMessage.multipart) {
          const part = parsedMessage.multipart[multipartIndex]
          if (part.headers['Content-Type'] && part.headers['Content-Type'].indexOf('application/json') === 0) {
            debug(`UserSays response, multipart ${multipartIndex} Body: ${part.body.toString('utf8')}`)
          } else {
            debug(`UserSays response, multipart ${multipartIndex}: ${util.inspect(part)}`)
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
          fs.writeFileSync(path.resolve(this.tempDirectory, `AlexaSaid${index}.mp3`), ab.payload)
        })
      }
      return audioBuffers
    } else {
      debug('UserSays response is empty')
    }
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
