const util = require('util')
const request = require('request-promise-native')
const debug = require('debug')('botium-connector-alexa-avs-stt-botium-speech-processing')

const BotiumSpeechProcessingBase = require('../utils/BotiumSpeechProcessingBase')

class BotiumSpeechProcessing extends BotiumSpeechProcessingBase {
  async Recognize (audioAsMP3) {
    debug('Recognize called')

    const convertRequestOptions = Object.assign({
      body: audioAsMP3
    },
    this.defaultRequestConvert)

    let audioAsWav
    try {
      debug(`Executing Convert with args ${util.inspect(convertRequestOptions)}`)
      audioAsWav = await request(convertRequestOptions)
    } catch (err) {
      throw new Error(`Failed converting MP3 to WAV: ${err.message}`)
    }

    const sttRequestOptions = Object.assign({
      body: audioAsWav
    },
    this.defaultRequestStt)

    try {
      debug(`Executing STT with args ${util.inspect(sttRequestOptions)}`)
      const sttResponseRaw = await request(sttRequestOptions)
      debug(`STT response: ${util.inspect(sttResponseRaw)}`)
      const sttResponse = JSON.parse(sttResponseRaw)
      return sttResponse.text
    } catch (err) {
      throw new Error(`Failed recognizing text: ${err.message}`)
    }
  }
}

module.exports = BotiumSpeechProcessing
