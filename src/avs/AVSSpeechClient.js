'use strict'

let http2
const httpParser = require('http-message-parser')
const debug = require('debug')('botium-connector-alexa-avs-avs')
const currentVersion = require('node-version')

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
    const major = parseInt(currentVersion.major, 10)
    if (major < 9) {
      if (major < 8) {
        throw new Error(`Node v8 required, Node v10 preferred. Your version is ${currentVersion.original}`)
      } else {
        console.log(`Node v10 preferred. Your version is ${currentVersion.original}`)
        debug(`Node v10 preferred. Your version is ${currentVersion.original}`)
      }
    }
    debug('Validate called')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_ID]) throw new Error('ALEXA_AVS_AVS_CLIENT_ID capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_REFRESH_TOKEN]) throw new Error('ALEXA_AVS_AVS_REFRESH_TOKEN capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_AVS_LANGUAGE_CODE capability required')
  }

  Build () {
    debug('Build called')
    http2 = require('http2')
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
        req.on('data', (chunk) => debug('Downchannel data received'))
        req.on('end', (chunk) => debug('Downchannel closed'))
        req.end()
        debug(`Downchannel creating ${options}`)
      })
  }

  UserSays (audio) {
    debug('UserSays called')
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
        if (outdata.length) {
          const parsedMessage = httpParser(outdata)
          debug(`UserSays response`)
          const audioBuffer = parsedMessage.multipart[1].body
          // TODO just debug!
          require('fs').writeFile('AlexaSaid.mp3', audioBuffer, () => {
            resolve(audioBuffer)
          })
        } else {
          debug(`UserSays response is empty`)
          resolve(Buffer.alloc(0))
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

const _test = () => {
  const fs = require('fs')

  const avs = new AVS(
    {
      'ALEXA_AVS_AVS_CLIENT_ID': 'amzn1.application-oa2-client.30b9586bdef64da39b6823c5dd428ebd',
      'ALEXA_AVS_AVS_REFRESH_TOKEN': 'Atzr|IwEBIITWaJSHsyGrJFr_xW0NCnJzFapyIwROB0JS1CY5RG2En27PCzoOvwMiX-bY3KYmk0xnapuvdqmqPvkBVfW55dzgCbgrlFkhXhEBnaGStzYNl3H-eqnV0ILJ19S4JcJNfzOsNk15mAq0uOKa-VQbIspmJfDQrDP-IRLZ2LSyAJrW5I_g_-5PEn891gXm_4kKRjlwD0R8z7fs4V3qaRmpIVuQJkU_LB52-oJGC3rzeRe1GcxGc9-cOsoiFVk_EwZH1cuHMbNbQtbzJMHQjs3yXgfCnFWpGmQRN75b_2vYZEgH0N-rExUTGaDTy1HrdO8mrmqgJXAAi5h2FDFuVzGwHGET7Uv6eNnXRFocVmR0HACDkHXuBGAs0v3HglBE6bSPhJf055ldFTe2wxC7anYiN5uFTaecqugkBOqcierJfM_tGMiyoBU8YwY9jtIr_kBZhBDhWzNsI4K_5BwjWOJTXt6A2nR8C94bz1LByy3m5hF0Ffg5S5CbMtDXq9xl_bgEs_vbbqNscgiSOfTKRtj5wbVa',
      'ALEXA_AVS_AVS_LANGUAGE_CODE': 'en_US',
      'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY': '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCzK1UNvGUTGJPe\nYlGSsju5gZh/EffJ7H00eB9Q5l+1m06qpv9CN8wKSTt0br1K5Ny1/OmiZXixHv7I\nRCedPjRDUk2khx4QKX9Ck8v4M4pk+5S6rHxUEo7N4u0C0H3U+L/yKPxWWiBKXryv\nWn2x5SZp1f1arueC5VtK1Cym7xkRArj53x/gajGz4aEWs2viSPznlDQynfy1Jv9k\nOKuRzQ4lGGbJykff2czzd22EQR9Sy4oAGJVaU5M62ReFWuwd/+i05MkcaetrgSyY\n3ELMyqwCDGeJFoH32DOtUFZPrdxIicdllS2csE7o94zrz1cQshJ99l/Wpr5xg/nD\nWdulStzTAgMBAAECggEADm5CivkuEOQtYL99f3nAirfv7uglE4vrJ7M3Hn53nfp0\n0xThQVWaJwfv9HhI4cPeLQBCVxSiLG3pKnsmz6jnb7asz0AcwUN+Xv/lcUfBcVG8\nEG79Eo5uFxIccdoWEHW6jAgWDuRyblsECoGY1x+0QNj973Rf7DCJ8lR1hjqCw9ZY\nA3E0e5lyLHYvhtU5wb7Kh+ozV+Nz7y+TWlt1vL8aygrzS8w7raNcy8aLxQu7FJb3\nGK6fPSsTfb0PW0EXh8l+MKb/u+Yz+h4QaIvuv8O8CH8E19Jgc09H0Se5ZcXb3RC8\npWJlwEDIm0GsPXYEw3xQsujaJzV7OqWs7BMOocDDSQKBgQDznXBRR6L0kfi9jVxX\nA3GqUEc/xsfjdJjE9lwu1zAaPinsXG4Ui1ZQLMXw/002shg44D5P/+NU1Nz+/utj\neqej76u/L3dpphZJztTvD6x+rBDRXpnRk0MqJGXHL6NoEfdua5J2v/pyY9ADhaSb\npSu93mRMU7KTAc2qqCDNEAGB+wKBgQC8RyfVOfFShltxcUv+x9/q8ICqgUhYgwv1\nhA74PrTu/x7pc+fzUXTLpwgHroQc/Z8h52O+fR+6cU6DvYhZ6l6yILTQElfA+Tx+\n5qBTcCz0aVr9vhT8W2FngQiBIimPKGe7NGadatV9RFKOHwf40a7qOw4C7As1o5w8\n1aDbt6DxCQKBgB8GG7meH9h5hm3NRMcn/x+rXYd3rxj+Tj43CYJFkTCmXfxlwPcI\nz5MiQIryWEjw4TjNBeJ2OeMhwIsQt7VRd2vfJ8YPK2ve5NO9bUyMeHEhRHsFSx1v\nXYxOWk/Fd0/XieUb+ej5hdFveJwaNt5DaJCjc65ssj8aabCj/JlgwnBlAoGAIWWZ\nyjfZ96J/i/Ll4Q7BSGJa4GPIWnL8ZxOCuEQfQhmc+RonNcDoL8u0H/Cz3JScap4p\n0jtNqnu4yqOPESwCmiQ1DoeCa2eKdJQiMkq+nqgljMbv4AexknOP96AAsTUgmVNl\nNF0j+3FoF2+nsVo4ZbIN/TSzlFMuPphCTVcYREkCgYEAxGLCxx57sDdpeIMV3ztR\ncivteDbgU+T2dGodeWbYYXECOR2whf1uYliVVTUH8LRKD/NgXLrESHfrpak2Ar+3\nQHvC5/yy8TEDh2vteDDaaau1zjfcCQrY8ELSrzkSFtgo6gfXJiT6B00pmknrVAmd\nDwz9vMUf6Ljyrrq9Iw3AOhk=\n-----END PRIVATE KEY-----\n',
      'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL': 'botiumspeech-read@botiumspeech.iam.gserviceaccount.com',
      'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE': 'en_US',
      'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY': '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCzK1UNvGUTGJPe\nYlGSsju5gZh/EffJ7H00eB9Q5l+1m06qpv9CN8wKSTt0br1K5Ny1/OmiZXixHv7I\nRCedPjRDUk2khx4QKX9Ck8v4M4pk+5S6rHxUEo7N4u0C0H3U+L/yKPxWWiBKXryv\nWn2x5SZp1f1arueC5VtK1Cym7xkRArj53x/gajGz4aEWs2viSPznlDQynfy1Jv9k\nOKuRzQ4lGGbJykff2czzd22EQR9Sy4oAGJVaU5M62ReFWuwd/+i05MkcaetrgSyY\n3ELMyqwCDGeJFoH32DOtUFZPrdxIicdllS2csE7o94zrz1cQshJ99l/Wpr5xg/nD\nWdulStzTAgMBAAECggEADm5CivkuEOQtYL99f3nAirfv7uglE4vrJ7M3Hn53nfp0\n0xThQVWaJwfv9HhI4cPeLQBCVxSiLG3pKnsmz6jnb7asz0AcwUN+Xv/lcUfBcVG8\nEG79Eo5uFxIccdoWEHW6jAgWDuRyblsECoGY1x+0QNj973Rf7DCJ8lR1hjqCw9ZY\nA3E0e5lyLHYvhtU5wb7Kh+ozV+Nz7y+TWlt1vL8aygrzS8w7raNcy8aLxQu7FJb3\nGK6fPSsTfb0PW0EXh8l+MKb/u+Yz+h4QaIvuv8O8CH8E19Jgc09H0Se5ZcXb3RC8\npWJlwEDIm0GsPXYEw3xQsujaJzV7OqWs7BMOocDDSQKBgQDznXBRR6L0kfi9jVxX\nA3GqUEc/xsfjdJjE9lwu1zAaPinsXG4Ui1ZQLMXw/002shg44D5P/+NU1Nz+/utj\neqej76u/L3dpphZJztTvD6x+rBDRXpnRk0MqJGXHL6NoEfdua5J2v/pyY9ADhaSb\npSu93mRMU7KTAc2qqCDNEAGB+wKBgQC8RyfVOfFShltxcUv+x9/q8ICqgUhYgwv1\nhA74PrTu/x7pc+fzUXTLpwgHroQc/Z8h52O+fR+6cU6DvYhZ6l6yILTQElfA+Tx+\n5qBTcCz0aVr9vhT8W2FngQiBIimPKGe7NGadatV9RFKOHwf40a7qOw4C7As1o5w8\n1aDbt6DxCQKBgB8GG7meH9h5hm3NRMcn/x+rXYd3rxj+Tj43CYJFkTCmXfxlwPcI\nz5MiQIryWEjw4TjNBeJ2OeMhwIsQt7VRd2vfJ8YPK2ve5NO9bUyMeHEhRHsFSx1v\nXYxOWk/Fd0/XieUb+ej5hdFveJwaNt5DaJCjc65ssj8aabCj/JlgwnBlAoGAIWWZ\nyjfZ96J/i/Ll4Q7BSGJa4GPIWnL8ZxOCuEQfQhmc+RonNcDoL8u0H/Cz3JScap4p\n0jtNqnu4yqOPESwCmiQ1DoeCa2eKdJQiMkq+nqgljMbv4AexknOP96AAsTUgmVNl\nNF0j+3FoF2+nsVo4ZbIN/TSzlFMuPphCTVcYREkCgYEAxGLCxx57sDdpeIMV3ztR\ncivteDbgU+T2dGodeWbYYXECOR2whf1uYliVVTUH8LRKD/NgXLrESHfrpak2Ar+3\nQHvC5/yy8TEDh2vteDDaaau1zjfcCQrY8ELSrzkSFtgo6gfXJiT6B00pmknrVAmd\nDwz9vMUf6Ljyrrq9Iw3AOhk=\n-----END PRIVATE KEY-----\n',
      'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL': 'botiumspeech-read@botiumspeech.iam.gserviceaccount.com',
      'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE': 'en_US'
    }
  )

  fs.readFile('./test/AlexaWakeUp.wav', (err, content) => {
    if (err) {
      console.error(err)
    }
    avs.Validate()
    avs.Build()
      .then(() => {
        return avs.UserSays(content)
      })
      .then(() => {
        return avs.Clean(content)
      })
      .catch((err) => console.log(err))
  })
}
