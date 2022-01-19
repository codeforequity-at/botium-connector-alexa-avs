const util = require('util')
const axios = require('axios').default
const debug = require('debug')('botium-connector-alexa-avs-tts-botium-speech-processing')

const { Capabilities, BotiumSpeechProcessingBase } = require('../utils/BotiumSpeechProcessingBase')

class BotiumSpeechProcessing extends BotiumSpeechProcessingBase {
  async Synthesize (text) {
    debug(`Synthesize called for text "${text}"`)
    if (!this.axiosTtsParams) throw new Error('TTS not configured, only audio input supported')

    const ttsRequest = {
      ...this.axiosTtsParams,
      params: {
        ...(this.axiosTtsParams.params || {}),
        text: text
      },
      data: this._getBody(Capabilities.ALEXA_AVS_TTS_BODY),
      responseType: 'arraybuffer'
    }

    let ttsResponse = null
    try {
      debug(`Executing TTS with args ${util.inspect(ttsRequest)}`)
      ttsResponse = await axios(ttsRequest)
    } catch (err) {
      throw new Error(`TTS "${text}" failed - ${this._getAxiosErrOutput(err)}`)
    }
    if (Buffer.isBuffer(ttsResponse.data)) {
      return ttsResponse.data
    } else {
      throw new Error(`TTS failed, response is: ${this._getAxiosShortenedOutput(ttsResponse.data)}`)
    }
  }
}

module.exports = BotiumSpeechProcessing
