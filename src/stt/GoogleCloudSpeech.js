
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
  ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT: 'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT'
}

const Defaults = {
  [Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT]: 'true'
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

  Recognize (audioAsMP3, expectedAnswer) {
    debug('Recognize called')
    return mp3ToWav(audioAsMP3)
      .then((audioAsWav) => {
        const currentRequest = Object.assign({audio: {content: audioAsWav}}, this.defaultRequest)

        if (expectedAnswer && this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT]) {
          currentRequest.config.speechContexts = [{phrases: tokenizer(expectedAnswer).filter((token) => !token.startsWith(VARIABLE_PREFIX))}]
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
}

module.exports = GoogleCloudSpeech
