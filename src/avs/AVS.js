'use strict'

const request = require('request')

const {AccessTokenRefreshRequest} = require('./auth/cbl/authentication')

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
        headers: {
          'authorization': `Bearer ${this.accessToken}`
        },
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
      request.post({url: 'https://access-alexa-na.amazon.com/v1/avs/speechrecognizer/recognize', formData: formData}, function optionalCallback (err, httpResponse, body) {
        if (err) {
          return reject(err)
        }
        return resolve(body)
      })
    })
  }
}

module.exports = {
  AVS,
  ALEXA_AVS_AVS_CLIENT_ID,
  ALEXA_AVS_AVS_REFRESH_TOKEN
}
