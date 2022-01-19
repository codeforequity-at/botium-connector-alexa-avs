#!/usr/bin/env node
const fs = require('fs')
const readlineSync = require('readline-sync')

const amazonCore = require('../avs/core')
const BotiumConnectorAlexaAvs = require('../../index').PluginClass

const DEFAULT_LANGUAGE_CODE = 'en-US'
const DEFAULT_BUCKET_NAME = 'botium-connector-alexa-avs'
const DEFAULT_AMAZON_CONFIG = 'amazonConfig.json'
const DEFAULT_GOOGLE_CONFIG = 'googleConfig.json'
const DEFAULT_BSP_URL = 'http://my-botium-speech-processing-url'
const OUTPUT_JSON = 'botium.json'

const _extractArgs = () => {
  const result = {}

  // global languageCode, can be overwritten per service
  const languageCode = readlineSync.question(`Language code? (${DEFAULT_LANGUAGE_CODE}) `, {
    defaultInput: DEFAULT_LANGUAGE_CODE
  })

  result.tts = readlineSync.question('Text to speech provider (a) Botium Speech Processing (b) Amazon Polly (c) Google Cloud Text to Speech (n) none ? ', { limit: /(a|b|c|n)/ })
  result.tts = result.tts || 'n'

  result.stt = readlineSync.question('Speech to text provider (a) Botium Speech Processing (b) Amazon Transcribe (c) Google Cloud Speech (n) none ? ', { limit: /(a|b|c|n)/ })
  result.stt = result.stt || 'n'

  do {
    result.amazonConfigPath = readlineSync.question(`Amazon config? (${DEFAULT_AMAZON_CONFIG}) `, {
      defaultInput: DEFAULT_AMAZON_CONFIG
    })
    try {
      result.amazonConfig = JSON.parse(fs.readFileSync(result.amazonConfigPath, 'utf8'))
    } catch (ex) {
      console.log(`Can not load "${result.amazonConfigPath}". (${ex})`)
    }
  } while (!result.amazonConfig)

  result.amazonConfig.languageCode = result.amazonConfig.languageCode || languageCode
  result.amazonConfig.bucketName = result.amazonConfig.bucketName || DEFAULT_BUCKET_NAME

  if (result.stt === 'c' || result.tts === 'c') {
    do {
      result.googleConfigPath = readlineSync.question(`Google config? (${DEFAULT_GOOGLE_CONFIG}) `, {
        defaultInput: DEFAULT_GOOGLE_CONFIG
      })
      try {
        result.googleConfig = JSON.parse(fs.readFileSync(result.googleConfigPath, 'utf8'))
      } catch (ex) {
        console.log(`Can not load "${result.googleConfigPath}". (${ex})`)
      }
    } while (!result.googleConfig)

    result.googleConfig.languageCode = result.googleConfig.languageCode || languageCode
  }

  if (result.stt !== 'n' || result.tts !== 'n') {
    do {
      result.bspUrl = readlineSync.question(`Botium Speech Processing url? (${DEFAULT_BSP_URL}) `, {
        defaultInput: DEFAULT_BSP_URL
      })
    } while (!result.bspUrl)
  }

  return result
}

const _createCapabilities = (args, deviceTokenResponse) => {
  const capsAVS = {
    PROJECTNAME: 'Botium Project Alexa AVS',
    CONTAINERMODE: 'alexa-avs',
    ALEXA_AVS_AVS_CLIENT_ID: args.amazonConfig.deviceInfo.clientId,
    ALEXA_AVS_AVS_CLIENT_SECRET: args.amazonConfig.deviceInfo.clientSecret,
    ALEXA_AVS_AVS_REFRESH_TOKEN: deviceTokenResponse.refresh_token,
    ALEXA_AVS_AVS_LANGUAGE_CODE: args.amazonConfig.languageCode
  }

  const capsTTS = {}
  if (args.tts === 'a') {
    Object.assign(capsTTS, {
      ALEXA_AVS_TTS_URL: `${args.bspUrl}/api/tts/${args.amazonConfig.languageCode.substring(0, 2)}`
    })
  }
  if (args.tts === 'b') {
    Object.assign(capsTTS, {
      ALEXA_AVS_TTS_URL: `${args.bspUrl}/api/tts/${args.amazonConfig.languageCode}`,
      ALEXA_AVS_TTS_PARAMS: {
        tts: 'polly'
      },
      ALEXA_AVS_TTS_BODY: {
        polly: {
          credentials: {
            region: args.amazonConfig.region,
            accessKeyId: args.amazonConfig.accessKeyId,
            secretAccessKey: args.amazonConfig.secretAccessKey
          }
        }
      }
    })
  }
  if (args.tts === 'c') {
    Object.assign(capsTTS, {
      ALEXA_AVS_TTS_URL: `${args.bspUrl}/api/tts/${args.googleConfig.languageCode}`,
      ALEXA_AVS_TTS_PARAMS: {
        tts: 'google'
      },
      ALEXA_AVS_TTS_BODY: {
        google: {
          credentials: {
            private_key: args.googleConfig.private_key,
            client_email: args.googleConfig.client_email
          }
        }
      }
    })
  }

  const capsSTT = {}
  if (args.stt === 'a') {
    Object.assign(capsSTT, {
      ALEXA_AVS_STT_URL: `${args.bspUrl}/api/stt/${args.amazonConfig.languageCode.substring(0, 2)}`
    })
  }
  if (args.stt === 'b') {
    Object.assign(capsSTT, {
      ALEXA_AVS_STT_URL: `${args.bspUrl}/api/stt/${args.amazonConfig.languageCode}`,
      ALEXA_AVS_STT_PARAMS: {
        stt: 'awstranscribe'
      },
      ALEXA_AVS_STT_BODY: {
        awstranscribe: {
          credentials: {
            region: args.amazonConfig.region,
            accessKeyId: args.amazonConfig.accessKeyId,
            secretAccessKey: args.amazonConfig.secretAccessKey
          }
        }
      }
    })
  }
  if (args.stt === 'c') {
    Object.assign(capsSTT, {
      ALEXA_AVS_STT_URL: `${args.bspUrl}/api/stt/${args.googleConfig.languageCode}`,
      ALEXA_AVS_STT_PARAMS: {
        stt: 'google'
      },
      ALEXA_AVS_STT_BODY: {
        google: {
          credentials: {
            private_key: args.googleConfig.private_key,
            client_email: args.googleConfig.client_email
          }
        }
      }
    })
  }
  return Object.assign(capsAVS, capsTTS, capsSTT)
}

module.exports.execute = async () => {
  // 1) does json already exist?
  if (fs.existsSync(OUTPUT_JSON)) {
    if (readlineSync.question(`File ${OUTPUT_JSON} already exists. Continue? [Y/n] `, { limit: /(y|n|)/ }) === 'n') {
      console.log('exiting....')
      return
    }
  }

  // 2) get args from user
  const args = _extractArgs()

  // 3) register device, bind device to user, get access token from refresh token
  const deviceTokenResponse = await amazonCore.RefreshTokenAcquireRequest(args.amazonConfig.deviceInfo.clientId, args.amazonConfig.deviceInfo.productId)

  // 4) Sending some static capabilities to Amazon. Maybe this must be moved to client lib.
  console.log('Amazon Capabilities sending...')
  await amazonCore.SendCapabilities(deviceTokenResponse.access_token)
  console.log('Amazon Capabilities sent')

  // 5) create capabilities.
  const caps = _createCapabilities(args, deviceTokenResponse)
  const asString = JSON.stringify(caps, null, 2)
  console.log(`Botium Capabilities (to use for copy & paste):\n ${asString}`)
  if (!fs.existsSync(OUTPUT_JSON) || readlineSync.question(`File ${OUTPUT_JSON} already exists. Overwrite? [y/N] `, { limit: /(y|n|)/ }) === 'y') {
    const botiumJsonAsString = JSON.stringify({
      botium: {
        Capabilities: caps

      }
    }, null, 2)
    fs.writeFileSync(OUTPUT_JSON, botiumJsonAsString)
  }

  // 6) validating capabilities.
  console.log('Validating Capabilities')
  const connector = new BotiumConnectorAlexaAvs({ container: {}, queueBotSays: () => {}, caps })
  try {
    await connector.Validate()
    console.log('Capabilities are valid')
  } catch (error) {
    console.log(error.toString())
  }
}
