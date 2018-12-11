const yargs = require('yargs')

const amazonAuthorize = require('../avs/auth/cbl/authentication')
const AVS = require('../avs/AVS')
const DEFAULT_LANGUAGE_CODE = 'en_us'

const _parseArgs = () => {
  return Promise.resolve(
    yargs.usage(
      'Usage: $0 -c [str] -p [str] -g [str] -l [str]')
      .demandOption(['c', 'p', 'g'])

      .alias('c', 'client-id')
      .nargs('c', 1)
      .describe('c', 'Amazon AVS Client id')

      .alias('p', 'product-id')
      .nargs('p', 1)
      .describe('p', 'Amazon AVS Product id')

      .alias('g', 'google-cloud-private-key')
      .nargs('g', 1)
      .describe('g', 'Google cloud private key with TextToSpeech, and Speech enabled')

      .alias('l', 'language-code')
      .nargs('l', 1)
      .describe('l', `Language code`)
      .default('l', DEFAULT_LANGUAGE_CODE)

      .version(false) // do not parse version from package.json
      .argv
  )
}

let args
_parseArgs()
  .then((result) => {
    args = result
    return amazonAuthorize.RefreshTokenAcquireRequest(result.c, result.p)
  })
  .then((deviceTokenResponse) => {
    const caps =
    {
      ALEXA_AVS_AVS_CLIENT_ID: args.c,
      ALEXA_AVS_AVS_REFRESH_TOKEN: deviceTokenResponse.refresh_token,
      ALEXA_AVS_AVS_LANGUAGE_CODE: args.l,
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY: args.p,
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL: '',
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE: args.l,
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY: args.p,
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL: '',
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE: args.l
    }
    console.log(`Capabilities:\n ${caps}`)
    console.log(`${AVS.ALEXA_AVS_AVS_CLIENT_ID} = ${args.c}`)
    console.log(`${AVS.ALEXA_AVS_AVS_REFRESH_TOKEN} = ${deviceTokenResponse.refresh_token}`)
  })
  .catch((err) => console.log(err))
