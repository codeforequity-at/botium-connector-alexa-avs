// Imports the Google Cloud client library
const speech = require('@google-cloud/speech')

const mp3ToWav = require('../utils/mp3ToWav')
const underlineLanguageCode = require('../utils/underlineLanguageCode')

const Capabilities = {
  ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY: 'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY',
  ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL: 'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL',
  ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE: 'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE'
}

class GoogleCloudSpeech {
  constructor (caps) {
    this.caps = caps
  }

  Validate () {
    if (!this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY]) throw new Error('ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL]) throw new Error('ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE capability required')
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

  Recognize (audioAsMP3) {
    return mp3ToWav(audioAsMP3)
      .then((audioAsWav) => {
        return this.client.recognize(Object.assign({audio: {content: audioAsWav}}, this.defaultRequest))
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
