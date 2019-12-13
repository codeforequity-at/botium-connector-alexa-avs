const util = require('util')
const request = require('request-promise-native')
const debug = require('debug')('botium-connector-alexa-avs-tts-botium-speech-processing')

const BotiumSpeechProcessingBase = require('../utils/BotiumSpeechProcessingBase')

class BotiumSpeechProcessing extends BotiumSpeechProcessingBase {
  async Synthesize (text) {
    debug('Synthesize called')
    const ttsRequestOptions = Object.assign({}, this.defaultRequestTts)
    ttsRequestOptions.uri = `${ttsRequestOptions.uri}?text=${encodeURIComponent(text)}`

    try {
      debug(`Executing TTS with args ${util.inspect(ttsRequestOptions)}`)
      const audioAsWav = await request(ttsRequestOptions)
      return audioAsWav
    } catch (err) {
      throw new Error(`Failed synthesizing speech: ${err.message}`)
    }
  }
}

module.exports = BotiumSpeechProcessing
