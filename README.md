# Botium Connector for Amazon Alexa with AVS

[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your Amazon Alexa Skills.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles ? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works ?
The steps for Botium to run a conversation with an Alexa skill are:

* Converts text to speech ([Cloud Speech-to-Text API](https://cloud.google.com/text-to-speech/))
* Asks Alexa with [Amazon AVS](https://developer.amazon.com/de/docs/alexa-voice-service/get-started-with-alexa-voice-service.html)
* Converts answer to text ([Cloud Text-to-Speech API, aka Cloud Speech API](https://cloud.google.com/speech-to-text/))

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Requirements

### Node.js v10
Node.js v8 required, but Node.js v10 recommended because Http2 module of Node.js (AVS uses HTTP2) 

### Google Cloud Text-to-Speech API
1.  [Select or create](https://console.cloud.google.com/project) a Cloud Platform project
2.  [Enable billing](https://support.google.com/cloud/answer/6293499#enable-billing) for your project (free tier available).
3.  [Enable](https://console.cloud.google.com/flows/enableapi?apiid=texttospeech.googleapis.com) the Google Cloud Text-to-Speech API.
4.  [Set up authentication with a service account](https://cloud.google.com/docs/authentication/getting-started) so you can access the
    API from your local workstation. You will need the JSON credentials file later.

### Google Cloud Speech-to-Text API
* Same steps as in Google Cloud Text-to-Speech API, just other API
* It is recommended that Speech-to-Text and Text-to-Speech API are sharing the same project and the same credentials

### Amazon AVS API of the Product to test
[Steps to setup](https://developer.amazon.com/de/docs/alexa-voice-service/code-based-linking-other-platforms.html#step1) - follow "Step 1: Enable CBL" and note your "Client ID" and your "Product ID".

## Preparing Botium Capabilities

This tool creates cabilities for connector, and registers 
1. Copy AVS credential (config.json) to ./cfg dir (or you can use custom path with custom filename)
2. Copy and rename Google Cloud credential to ./cfg dir as googleConfig.json. (Suppose Speech-to-Text and Text-to-Speech API are sharing the same project) (or you can use custom path with custom filename)
3. Start tools/CreateCapabilities.js. There are optional parameters for config files, and for language. You can see them with --help 
4. Follow the steps of tools/CreateCapabilities.js.
5. After it is finished, displays the required Capabilities.


## Supported Capabilities

### ALEXA_AVS_AVS_CLIENT_ID
See json downloaded from AVS

### ALEXA_AVS_AVS_REFRESH_TOKEN
The simpliest way to acquire it, is CreateCapabilities tool

### ALEXA_AVS_AVS_LANGUAGE_CODE
Language setting for Alexa. Example: en_US

### ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY
See json downloaded from Google

### ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL
See json downloaded from Google

### ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE
Language setting for Goolge. Usually same as ALEXA_AVS_AVS_LANGUAGE_CODE

### ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY
See json downloaded from Google. Same as ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY if they sharing the same project

### ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL
See json downloaded from Google. Same as ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL if they sharing the same project

### ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE
Language setting for Goolge. Usually same as ALEXA_AVS_AVS_LANGUAGE_CODE and ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE



## Open Issues and Restrictions
* If a text is very long (more thousand), then connector dies because AVS error. Long messages should be sent in chunks.
* Stream/connection create/close optimalization. Create/close global, for dialog, or for question-answer pair?
* Auth token lifetime is 1h. Deal with it. (Acquire it frequently, or catch error, and refresh token)
