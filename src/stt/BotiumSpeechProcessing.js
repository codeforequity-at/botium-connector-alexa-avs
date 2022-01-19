const util = require('util')
const axios = require('axios').default
const FormData = require('form-data')
const debug = require('debug')('botium-connector-alexa-avs-stt-botium-speech-processing')

const { Capabilities, BotiumSpeechProcessingBase } = require('../utils/BotiumSpeechProcessingBase')
const tokenizer = require('../utils/tokenizer')
const VARIABLE_PREFIX = '$'

class BotiumSpeechProcessing extends BotiumSpeechProcessingBase {
  async Recognize (audioAsMP3, conversation, currentStepIndex) {
    debug('Recognize called')
    if (!this.axiosSttParams) throw new Error('STT not configured, only audio output supported')

    const convertRequest = {
      ...this.axiosConvertParams,
      data: audioAsMP3,
      responseType: 'arraybuffer'
    }

    let convertResponse = null
    let audioAsWav = null
    try {
      debug(`Executing Convert with args ${util.inspect(convertRequest)}`)
      convertResponse = await axios(convertRequest)
    } catch (err) {
      throw new Error(`Converting MP3 to WAV failed - ${this._getAxiosShortenedOutput(err)}`)
    }
    if (Buffer.isBuffer(convertResponse.data)) {
      audioAsWav = convertResponse.data
    } else {
      throw new Error(`Converting MP3 to WAV failed, response is: ${this._getAxiosShortenedOutput(convertResponse.data)}`)
    }

    let sttResponse = null
    let sttRequest = null
    try {
      const body = this._getBody(Capabilities.ALEXA_AVS_STT_BODY)
      if (body) {
        const form = new FormData()
        form.append('content', audioAsWav, { filename: 'input.wav', contentType: 'audio/wav' })
        for (const key of Object.keys(body)) {
          form.append(key, JSON.stringify(body[key]))
        }

        sttRequest = {
          ...this.axiosSttParams,
          headers: {
            ...(this.axiosSttParams.headers || {}),
            ...form.getHeaders()
          },
          data: form
        }
      } else {
        sttRequest = {
          ...this.axiosSttParams,
          headers: {
            ...(this.axiosSttParams.headers || {}),
            'Content-Type': 'audio/wav'
          },
          data: audioAsWav
        }
      }
      const expectedAnswer = this._getExpectedAnswer(conversation, currentStepIndex)
      if (expectedAnswer) {
        sttRequest.params = {
          ...(sttRequest.params || {}),
          hint: expectedAnswer
        }
      }
      debug(`Executing STT with args ${util.inspect(sttRequest)}`)
      sttResponse = await axios(sttRequest)
    } catch (err) {
      throw new Error(`STT failed - ${this._getAxiosErrOutput(err)}`)
    }
    if (sttResponse.data) {
      return sttResponse.data.text || ''
    } else {
      throw new Error(`STT failed, response is: ${this._getAxiosShortenedOutput(sttResponse.data)}`)
    }
  }

  _getExpectedAnswer (conversation, currentStepIndex) {
    if (!conversation || !(currentStepIndex >= 0)) {
      return null
    }
    if (!this.caps[Capabilities.ALEXA_AVS_STT_SEND_TEXT_AS_PHRASE_HINT]) {
      return null
    }

    let result = null
    for (let i = currentStepIndex + 1; i < conversation.length && conversation[i].sender === 'bot'; i++) {
      const meSaysStep = conversation[i]
      if ((meSaysStep.messageText && meSaysStep.messageText.length > 0)) {
        if (!meSaysStep.not || this.caps[Capabilities.ALEXA_AVS_STT_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED]) {
          result = tokenizer(meSaysStep.messageText).filter((token) => !token.startsWith(VARIABLE_PREFIX)).join(' ')
        } else {
          debug(`Expected answer, not answer skipped ${meSaysStep.messageText}`)
        }
      }
    }
    if (result) {
      debug(`Expected answer ${result}`)
    }
    return result
  }
}

module.exports = BotiumSpeechProcessing
