const textToSpeech = require('@google-cloud/text-to-speech')

const Capabilities = {
  ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY: 'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY',
  ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL: 'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL',
  ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE: 'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE'
}

class GoogleCloudTextToSpeech {
  constructor (caps) {
    this.caps = caps
  }

  Validate () {
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY]) throw new Error('ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL]) throw new Error('ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE capability required')
  }

  Build () {
    // Creates a client
    this.client = new textToSpeech.TextToSpeechClient({
      credentials: {
        'private_key': this.caps[Capabilities.ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY],
        'client_email': this.caps[Capabilities.ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL]
      }
    })

    this.defaultRequest = {
      // Select the language and SSML Voice Gender (optional)
      voice: {languageCode: this.caps[Capabilities.ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE], ssmlGender: 'NEUTRAL'},
      // Select the type of audio encoding
      audioConfig: {audioEncoding: 'LINEAR16'}
    }
  }

  Synthesize (text) {
    return new Promise((resolve, reject) => {
      this.client.synthesizeSpeech(Object.assign({input: {text}}, this.defaultRequest), (err, response) => {
        if (err) {
          return reject(err)
        }

        return resolve(response.audioContent)
      })
    })
  }
}

module.exports = GoogleCloudTextToSpeech
