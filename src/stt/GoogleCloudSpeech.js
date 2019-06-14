
const util = require('util')
const speech = require('@google-cloud/speech')
const debug = require('debug')('botium-connector-alexa-avs-stt-google-cloud-speech')

const mp3ToWav = require('../utils/mp3ToWav')
const tokenizer = require('../utils/tokenizer')
const underlineLanguageCode = require('../utils/underlineLanguageCode')

const VARIABLE_PREFIX = '$'

const Capabilities = {
  ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY: 'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY',
  ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL: 'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL',
  ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE: 'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE',
  ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT: 'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT',
  ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED: 'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED'
}

const Defaults = {
  [Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT]: 'true',
  [Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED]: 'true'
}

class GoogleCloudSpeech {
  constructor (caps) {
    this.caps = caps
  }

  Validate () {
    if (!this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY]) throw new Error('ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL]) throw new Error('ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE capability required')

    if (this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT] !== false) this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT] = Defaults[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT]
    if (this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED] !== false) this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED] = Defaults[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT]
  }

  Build () {
    // Creates a client
    this.client = new speech.SpeechClient({
      credentials: {
        'private_key': this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY],
        'client_email': this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL]
      }
    })

    this.defaultRequest = {
      config: {
        encoding: 'LINEAR16',
        // if it is set, then google checks wether it is correct.
        // sampleRateHertz: 16000,
        languageCode: underlineLanguageCode(this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE])
      }
    }
  }

  Start () {
    debug('Start called')
    return Promise.resolve()
  }

  Recognize (audioAsMP3, conversation, currentStepIndex) {
    debug('Recognize called')
    return mp3ToWav(audioAsMP3)
      .then((audioAsWav) => {
        const currentRequest = Object.assign({audio: {content: audioAsWav}}, this.defaultRequest)
        const expectedAnswer = this._getExpectedAnswer(conversation, currentStepIndex)
        if (expectedAnswer) {
          currentRequest.config.speechContexts = [{phrases: expectedAnswer}]
        }
        debug(`Executing STT with args ${util.inspect(currentRequest)}`)
        return this.client.recognize(currentRequest)
      })
      .then(data => {
        const response = data[0]
        const transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n')
        return transcription
      })
  }

  Stop () {
    return Promise.resolve()
  }

  Clean () {
    this.defaultRequest = null
    this.client = null
    return Promise.resolve()
  }

  _getExpectedAnswer (conversation, currentStepIndex) {
    if (!conversation || !(currentStepIndex >= 0)) {
      debug(`Expected answer feature is not supported`)
      return null
    }
    if (!this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT]) {
      debug(`Expected answer turned off`)
      return null
    }

    const result = []
    for (let i = currentStepIndex + 1; i < conversation.length && conversation[i].sender === 'bot'; i++) {
      const meSaysStep = conversation[i]
      if ((meSaysStep.messageText && meSaysStep.messageText.length > 0)) {
        if (!meSaysStep.not || this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED]) {
          result.push(tokenizer(meSaysStep.messageText).filter((token) => !token.startsWith(VARIABLE_PREFIX)).join(' '))
        } else {
          debug(`Expected answer, not answer skipped ${meSaysStep.messageText}`)
        }
      }
    }

    debug(`Expected answer ${result}`)

    return result
  }
}

module.exports = GoogleCloudSpeech
