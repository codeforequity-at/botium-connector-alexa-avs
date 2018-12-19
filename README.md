# Botium Connector for Amazon Alexa with AVS

[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

## How it works ?
* Converts text to speech ([Cloud Speech-to-Text API](https://cloud.google.com/text-to-speech/))
* Asks Alexa with [Amazon AVS](https://developer.amazon.com/de/docs/alexa-voice-service/get-started-with-alexa-voice-service.html)
* Converts answer to text ([Cloud Text-to-Speech API, aka Cloud Speech API](https://cloud.google.com/speech-to-text/))

## Requirements

### Node.js v10
Node.js v8 required, but Node.js v10 recommended because Http2 module of Node.js (AVS uses HTTP2) 

### Google Cloud Text-to-Speech API
1.  Select or create a Cloud Platform project.
    [Go to the projects page][projects]
1.  Enable billing for your project.
    [Enable billing][billing]
1.  Enable the Google Cloud Text-to-Speech API.
    [Enable the API][enable_api]
1.  [Set up authentication with a service account][auth] so you can access the
    API from your local workstation.
[projects]: https://console.cloud.google.com/project
[billing]: https://support.google.com/cloud/answer/6293499#enable-billing
[enable_api]: https://console.cloud.google.com/flows/enableapi?apiid=texttospeech.googleapis.com
[auth]: https://cloud.google.com/docs/authentication/getting-started

### Amazon AVS API of the Product to test
[Steps to setup](https://developer.amazon.com/de/docs/alexa-voice-service/code-based-linking-other-platforms.html#step1)

### Google Cloud Speech-to-Text API
* Same steps as in Google Cloud Text-to-Speech API, just other API
* It is recommended that Speech-to-Text and Text-to-Speech API are sharing the same project

## Capabilities

###ALEXA_AVS_AVS_CLIENT_ID
See json downloaded from AVS
###ALEXA_AVS_AVS_REFRESH_TOKEN
The simpliest way to acquire it, is CreateCapabilities tool
###ALEXA_AVS_AVS_LANGUAGE_CODE
Language setting for Alexa. Example: en_US
###ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY
See json downloaded from Google
###ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL
See json downloaded from Google
###ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE
Language setting for Goolge. Usually same as ALEXA_AVS_AVS_LANGUAGE_CODE
###ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY
See json downloaded from Google. Same as ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY if they sharing the same project
###ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL
See json downloaded from Google. Same as ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL if they sharing the same project
###ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE
Language setting for Goolge. Usually same as ALEXA_AVS_AVS_LANGUAGE_CODE and ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE

## CreateCapabilities tool
This tool creates cabilities for connector, and registers 
1. Copy AVS credential (config.json) to ./cfg dir (or you can use custom path with custom filename)
1. Copy and rename Google Cloud credential to ./cfg dir as googleConfig.json. (Suppose Speech-to-Text and Text-to-Speech API are sharing the same project) (or you can use custom path with custom filename)
1. Start tools/CreateCapabilities.js. There are optional parameters for config files, and for language. You can see them with --help 
1. Follow the steps of tools/CreateCapabilities.js.
1. After it is finished, displays the required Capabilities.

## TODO
1. If a text is very long (more thousand), then connector dies because AVS error. Long messages should be sent in chunks.
1. Stream/connection create/close optimalization. Create/close global, for dialog, or for question-answer pair?
1. Auth token lifetime is 1h. Deal with it. (Acquire it frequently, or catch error, and refresh token)
