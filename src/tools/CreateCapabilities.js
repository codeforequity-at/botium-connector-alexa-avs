#!/usr/bin/env node
const jsonutil = require('jsonutil')
const fs = require('fs')
const readlineSync = require('readline-sync')

const amazonCore = require('../avs/core')
const BotiumConnectorAleaAvs = require('../../index')

const DEFAULT_LANGUAGE_CODE = 'en-US'
const DEFAULT_AMAZON_CONFIG = 'amazonConfig.json'
const DEFAULT_GOOGLE_CONFIG = 'googleConfig.json'
const OUTPUT_JSON = 'botium.json'
const tts = ['Amazon Polly', 'Google Cloud Text to Speech']
const stt = ['Amazon Transcribe', 'Google Cloud Speech']

const _extractArgs = () => {
  const result = {}

  result.tts = readlineSync.keyInSelect(tts, `Which Text-To-Speech provider?`, {
    cancel: false
  })

  result.stt = readlineSync.keyInSelect(stt, `Which Speech-To-Text provider?`, {
    cancel: false
  })

  result.languageCode = readlineSync.question(`Language code? (${DEFAULT_LANGUAGE_CODE})`, {
    defaultInput: DEFAULT_LANGUAGE_CODE
  })

  result.amazonConfig = readlineSync.question(`Amazon config? (${DEFAULT_AMAZON_CONFIG})`, {
    defaultInput: DEFAULT_AMAZON_CONFIG
  })

  if (result.stt === 1 || result.tts === 1) {
    result.googleConfig = readlineSync.question(`Google config? (${DEFAULT_GOOGLE_CONFIG})`, {
      defaultInput: DEFAULT_GOOGLE_CONFIG
    })
  }

  return result
}

const _main = async () => {
  // 1) does json already exist?
  if (fs.existsSync(OUTPUT_JSON)) {
    if (!readlineSync.keyInYN(`File ${OUTPUT_JSON} already exists. Continue?`)) {
      console.log('exiting....')
      return
    }
  }

  // 2) get args from user
  const args = _extractArgs()

  // 3) read config files
  let amazonConfigJson
  let googleConfigJson
  try {
    amazonConfigJson = jsonutil.readFileSync(args.amazonConfig)
  } catch (ex) {
    throw new Error(`Amazon config "${args.amazonConfig}" not found!`)
  }
  if (args.googleConfig) {
    try {
      googleConfigJson = jsonutil.readFileSync(args.googleConfig)
    } catch (ex) {
      throw new Error(`Google config "${args.googleConfig}" not found!`)
    }
  }

  // 3) register device, bind device to user, get access token from refresh token
  const deviceTokenResponse = await amazonCore.RefreshTokenAcquireRequest(amazonConfigJson.deviceInfo.clientId, amazonConfigJson.deviceInfo.productId)

  // 4) Sending some static capabilities to Amazon. Maybe this must be moved to client lib.
  console.log(`Amazon Capabilities sending...`)
  await amazonCore.SendCapabilities(deviceTokenResponse.access_token)
  console.log(`Amazon Capabilities sent`)

  // 5) create capabilities.
  const caps =
    {
      PROJECTNAME: 'Botium Project Alexa AVS',
      CONTAINERMODE: 'alexa-avs',
      ALEXA_AVS_AVS_CLIENT_ID: amazonConfigJson.deviceInfo.clientId,
      ALEXA_AVS_AVS_CLIENT_SECRET: amazonConfigJson.deviceInfo.clientSecret,
      ALEXA_AVS_AVS_REFRESH_TOKEN: deviceTokenResponse.refresh_token,
      ALEXA_AVS_AVS_LANGUAGE_CODE: args.l,
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY: googleConfigJson.private_key,
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL: googleConfigJson.client_email,
      ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE: args.languageCode,
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY: googleConfigJson.private_key,
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL: googleConfigJson.client_email,
      ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE: args.l
    }
  const asString = JSON.stringify(caps, null, 2)
  console.log(`Botium Capabilities (to use for copy & paste):\n ${asString}`)
  if (!fs.existsSync(OUTPUT_JSON) || readlineSync.keyInYN(`File ${OUTPUT_JSON} already exists. Overwrite?`)) {
    const botiumJsonAsString = JSON.stringify({
      botium: {
        Capabilities: caps

      }
    }, null, 2)
    fs.writeFileSync(OUTPUT_JSON, botiumJsonAsString)
  }

  // 5) create capabilities.
  console.log(`Validating Capabilities`)
  const connector = new BotiumConnectorAleaAvs()
  try {
    connector.validate()
    console.log(`Capabilities are valid`)
  } catch (error) {
    console.log(`Capabilities are not valid!!!`)
    console.log(error)
  }
}

_main()
  .catch((err) => console.err(`Fatal error ${err}`))
