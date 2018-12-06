'use strict'

const Buffer = require('buffer').Buffer

const AMAZON_ERROR_CODES = require('./AmazonErrorCodes.js')

const ALEXA_AVS_AVS_CLIENT_ID = 'ALEXA_AVS_AVS_CLIENT_ID'
const ALEXA_AVS_AVS_REFRESH_TOKEN = 'ALEXA_AVS_AVS_REFRESH_TOKEN'

const Capabilities = {
  ALEXA_AVS_AVS_CLIENT_ID,
  ALEXA_AVS_AVS_REFRESH_TOKEN
}

class AVS {
  constructor (caps) {
    this.caps = caps
  }

  Validate () {
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_DEVICE_CODE]) throw new Error('ALEXA_AVS_AVS_DEVICE_CODE capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_AVS_USER_CODE]) throw new Error('ALEXA_AVS_AVS_USER_CODE capability required')
  }

  Build () {
  }

  sendAudio (dataView) {
  }
}

module.exports = {
  AVS,
  ALEXA_AVS_AVS_CLIENT_ID,
  ALEXA_AVS_AVS_REFRESH_TOKEN
}
