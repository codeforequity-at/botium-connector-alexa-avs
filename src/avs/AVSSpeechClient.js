'use strict'

const http2 = require('http2')
const FormData = require('form-data')
const httpParser = require('http-message-parser')

const {AccessTokenRefreshRequest} = require('./core')

const BASE_URL = 'https://avs-alexa-eu.amazon.com'
const BASE_REQUEST_DATA = {
  'event':
    {
      'header':
        {
          'namespace': 'SpeechRecognizer',
          'name': 'Recognize',
          'messageId': 'message-123',
          'dialogRequestId': 'dialogRequest-321'
        },
      'payload':
        {
          'profile': 'CLOSE_TALK',
          'format': 'AUDIO_L16_RATE_16000_CHANNELS_1'
        }
    }
}
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
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_ID]) throw new Error('ALEXA_AVS_AVS_CLIENT_ID capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_REFRESH_TOKEN]) throw new Error('ALEXA_AVS_AVS_REFRESH_TOKEN capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_AVS_LANGUAGE_CODE capability required')
  }

  Build () {
    // 1) acquiring access token from refresh token
    return AccessTokenRefreshRequest(this.caps[Capabilities.ALEXA_AVS_AVS_CLIENT_ID], this.caps[Capabilities.ALEXA_AVS_AVS_REFRESH_TOKEN])
      .then((result) => {
        this.accessToken = result.access_token

        // 2) creating avs client
        this.client = http2.connect(BASE_URL)
        this.client.on('error', (err) => console.error(`Client Error ${err}`))
        this.client.on('socketError', (err) => console.error(`Client Socket Error ${err}`))
        this.client.on('goaway', (err) => console.error(`Client GoAway ${err}`))
        this.client.on('response', (headers, flags) => console.log('Client response'))
        this.client.on('data', (chunk) => console.log('Client data'))
        this.client.on('end', (chunk) => console.log('Client end'))

        // 3) creating downchannel
        const options = {
          ':method': 'GET',
          ':scheme': 'https',
          ':path': '/v20160207/directives',
          'authorization': 'Bearer ' + this.accessToken
        }

        console.log(`Creating downchannel ${JSON.stringify(options, null, 2)}`)
        var req = this.client.request(options)
        req.on('error', (e) => console.error(`Downchannel error ${e}`))
        req.on('socketError', (e) => console.error(`Downchannel socket error ${e}`))
        req.on('goaway', (e) => console.error(`Downchannel goaway ${e}`))
        req.on('response', (headers, flags) => console.log(`Downchannel response ${JSON.stringify(headers)}`))
        req.on('data', (chunk) => console.log('Downchannel data'))
        req.on('end', (chunk) => console.log('Downchannel end'))
        req.end()

        // 4) synchronize states
      })
  }

  Ask (audio) {
    return new Promise((resolve, reject) => {
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
        new Buffer(audio, 'binary'),
        Buffer.from('\r\n--this-is-my-boundary-for-alexa\r\n', 'utf8')
      ])

      this.client.on('error', (err) => console.error({payload: err}))
      this.client.on('socketError', (err) => console.error({payload: err}))

      var request = {
        ':method': 'POST',
        ':scheme': 'https',
        ':path': '/v20160207/events',
        'authorization': `Bearer  ${this.accessToken}`,
        'content-type': 'multipart/form-data; boundary=this-is-my-boundary-for-alexa'
      }

      var req = this.client.request(request)

      req.on('error', (e) => console.error(`Ask error ${e}`))
      req.on('socketError', (e) => console.error(`Ask socket error ${e}`))
      req.on('goaway', (e) => console.error(`Ask goaway ${e}`))
      req.on('response', (headers, flags) => console.log(`Ask response ${JSON.stringify(headers)}`))
      let outdata
      req.on('data', (chunk) => {
        console.log('Ask data')
        outdata = outdata ? Buffer.concat(outdata, chunk) : chunk
      })
      req.on('end', () => {
        if (outdata.length) {
          console.log(`Ask end <<<\n${outdata}\n>>>`)
          const parsedMessage = httpParser(outdata)
          console.log(`Ask end, parsed ${parsedMessage}`)
          const audioBuffer = parsedMessage.multipart[1].body
          require('fs').writeFile('AlexaSaid.mp3', audioBuffer, () => {
            resolve(audioBuffer)
          })

        }
      })

      req.write(payload)
      req.end()
    })
  }
}

module.exports = {
  AVS,
  ALEXA_AVS_AVS_CLIENT_ID,
  ALEXA_AVS_AVS_REFRESH_TOKEN
}

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

const fs = require('fs')

fs.readFile('asWav.wav', (err, content) => {
  if (err) {
    console.error(err)
  }
  avs.Validate()
  avs.Build()
    .then(() => {
      return avs.Ask(content)
    })
    .catch((err) => console.log(err))
})
