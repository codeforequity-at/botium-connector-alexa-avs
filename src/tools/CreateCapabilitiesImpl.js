#!/usr/bin/env node
const jsonutil = require('jsonutil')
const fs = require('fs')
const readlineSync = require('readline-sync')

const amazonCore = require('../avs/core')
const BotiumConnectorAlexaAvs = require('../../index').PluginClass

const DEFAULT_LANGUAGE_CODE = 'en-US'
const DEFAULT_BUCKET_NAME = 'botium-connector-alexa-avs'
const DEFAULT_AMAZON_CONFIG = 'amazonConfig.json'
const DEFAULT_GOOGLE_CONFIG = 'googleConfig.json'
const OUTPUT_JSON = 'botium.json'

const _extractArgs = () => {
  const result = {}

  // global languageCode, can be overwritten per service
  const languageCode = readlineSync.question(`Language code? (${DEFAULT_LANGUAGE_CODE}) `, {
    defaultInput: DEFAULT_LANGUAGE_CODE
  })

  result.tts = readlineSync.question('Text to speech provider (a) Amazon Polly or (g) Google Cloud Text to Speech? (a) ', { limit: /(a|g|)/ })
  result.tts = result.tts || 'a'

  result.stt = readlineSync.question('Speech to text provider (a) Amazon Transcribe or (g) Google Cloud Speech? (g) ', { limit: /(a|g|)/ })
  result.stt = result.stt || 'g'

  do {
    result.amazonConfigPath = readlineSync.question(`Amazon config? (${DEFAULT_AMAZON_CONFIG}) `, {
      defaultInput: DEFAULT_AMAZON_CONFIG
    })
    try {
      result.amazonConfig = jsonutil.readFileSync(result.amazonConfigPath)
    } catch (ex) {
      console.log(`Can not load "${result.amazonConfigPath}". (${ex})`)
    }
  } while (!result.amazonConfig)

  result.amazonConfig.languageCode = result.amazonConfig.languageCode || languageCode
  result.amazonConfig.bucketName = result.amazonConfig.bucketName || DEFAULT_BUCKET_NAME

  if (result.stt === 'g' || result.tts === 'g') {
    do {
      result.googleConfigPath = readlineSync.question(`Google config? (${DEFAULT_GOOGLE_CONFIG}) `, {
        defaultInput: DEFAULT_GOOGLE_CONFIG
      })
      try {
        result.googleConfig = jsonutil.readFileSync(result.googleConfigPath)
      } catch (ex) {
        console.log(`Can not load "${result.googleConfigPath}". (${ex})`)
      }
    } while (!result.googleConfig)

    result.googleConfig.languageCode = result.googleConfig.languageCode || languageCode
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

  const capsTTS = (args.tts === 'g')
    ? {
      ALEXA_AVS_TTS: 'GOOGLE_CLOUD_TEXT_TO_SPEECH',
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY: args.googleConfig.private_key,
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL: args.googleConfig.client_email,
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE: args.googleConfig.languageCode
    }
    : {
      ALEXA_AVS_TTS: 'AMAZON_POLLY',
      ALEXA_AVS_TTS_AMAZON_POLLY_REGION: args.amazonConfig.region,
      ALEXA_AVS_TTS_AMAZON_POLLY_ACCESS_KEY_ID: args.amazonConfig.accessKeyId,
      ALEXA_AVS_TTS_AMAZON_POLLY_SECRET_ACCESS_KEY: args.amazonConfig.secretAccessKey,
      ALEXA_AVS_TTS_AMAZON_POLLY_LANGUAGE_CODE: args.amazonConfig.languageCode
    }

  const capsSTT = (args.stt === 'g')
    ? {
      ALEXA_AVS_STT: 'GOOGLE_CLOUD_SPEECH',
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY: args.googleConfig.private_key,
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL: args.googleConfig.client_email,
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE: args.googleConfig.languageCode
    }
    : {
      ALEXA_AVS_STT: 'AMAZON_TRANSCRIBE',
      ALEXA_AVS_STT_AMAZON_TRANSCRIBE_REGION: args.amazonConfig.region,
      ALEXA_AVS_STT_AMAZON_TRANSCRIBE_ACCESS_KEY_ID: args.amazonConfig.accessKeyId,
      ALEXA_AVS_STT_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY: args.amazonConfig.secretAccessKey,
      ALEXA_AVS_STT_AMAZON_TRANSCRIBE_LANGUAGE_CODE: args.amazonConfig.languageCode,
      ALEXA_AVS_STT_AMAZON_TRANSCRIBE_BUCKET_NAME: args.amazonConfig.bucketName
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
    connector.Validate()
    console.log('Capabilities are valid')
  } catch (error) {
    console.log(error.toString())
  }
}
