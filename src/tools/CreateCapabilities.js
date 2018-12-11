const yargs = require('yargs')
const jsonutil = require('jsonutil')

const amazonAuth = require('../avs/auth/cbl/authentication')
const AVS = require('../avs/AVS')
const DEFAULT_LANGUAGE_CODE = 'en_us'
const DEFAULT_AMAZON_CONFIG = '../../cfg/config.json'
const DEFAULT_GOOGLE_CONFIG = '../../cfg/googleConfig.json'

const _parseArgs = () => {
  return Promise.resolve(
    yargs.usage(
      'Usage: $0 -a [str] -g [str] -l [str]')

      .alias('a', 'amazon-config')
      .nargs('a', 1)
      .describe('a', 'Amazon config file')
      .default('a', DEFAULT_AMAZON_CONFIG)

      .alias('g', 'google-config')
      .nargs('g', 1)
      .describe('g', 'Google config file')
      .default('g', DEFAULT_GOOGLE_CONFIG)

      .alias('l', 'language-code')
      .nargs('l', 1)
      .describe('l', `Language code`)
      .default('l', DEFAULT_LANGUAGE_CODE)

      .version(false) // do not parse version from package.json
      .argv
  )
}

let args
let amazonConfigJson
let googleConfigJson
_parseArgs()
  .then((result) => {
    args = result
    amazonConfigJson = jsonutil.readFileSync(result.a)
    googleConfigJson = jsonutil.readFileSync(result.g)
    return amazonAuth.RefreshTokenAcquireRequest(amazonConfigJson.deviceInfo.clientId, amazonConfigJson.deviceInfo.productId)
  })
  .then((deviceTokenResponse) => {
    const caps =
    {
      ALEXA_AVS_AVS_CLIENT_ID: amazonConfigJson.deviceInfo.clientId,
      ALEXA_AVS_AVS_REFRESH_TOKEN: deviceTokenResponse.refresh_token,
      ALEXA_AVS_AVS_LANGUAGE_CODE: args.l,
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY: googleConfigJson.private_key,
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL: '',
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE: args.l,
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY: googleConfigJson.private_key,
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL: '',
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE: args.l
    }
    console.log(`Capabilities:\n ${JSON.stringify(caps, null, 2)}`)
  })
  .catch((err) => console.log(err))
