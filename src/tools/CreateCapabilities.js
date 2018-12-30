#!/usr/bin/env node
const yargs = require('yargs')
const jsonutil = require('jsonutil')
const fs = require('fs')

const amazonCore = require('../avs/core')
const DEFAULT_LANGUAGE_CODE = 'en_US'
const DEFAULT_AMAZON_CONFIG = 'amazonConfig.json'
const DEFAULT_GOOGLE_CONFIG = 'googleConfig.json'

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
    return amazonCore.RefreshTokenAcquireRequest(amazonConfigJson.deviceInfo.clientId, amazonConfigJson.deviceInfo.productId)
  })
  .then((deviceTokenResponse) => {
    console.log(`Amazon Capabilities sending...`)
    return amazonCore.SendCapabilities(deviceTokenResponse.access_token)
      .then(() => {
        console.log(`Amazon Capabilities sent`)
      })
      .then(() => {
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
            ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE: args.l,
            ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY: googleConfigJson.private_key,
            ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL: googleConfigJson.client_email,
            ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE: args.l
          }
        const asString = JSON.stringify(caps, null, 2)
        console.log(`Botium Capabilities (to use for copy & paste):\n ${asString}`)

        if (fs.existsSync(`botium.json`)) {
          console.log(`File botium.json already existing, I won't overwrite it. Please remove it first before running again.`)
        } else {
          const botiumJsonAsString = JSON.stringify({
            botium: {
              Capabilities: caps

            }
          }, null, 2)
          fs.writeFileSync(`botium.json`, botiumJsonAsString)
        }
      })
  })
  .catch((err) => console.log(err))
