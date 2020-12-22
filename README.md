# Botium Connector for Amazon Alexa with AVS

[![NPM](https://nodei.co/npm/botium-connector-alexa-avs.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-alexa-avs/)

[ ![Codeship Status for codeforequity-at/botium-connector-alexa-avs](https://app.codeship.com/projects/f379ece0-ee76-0136-6e85-5afc45d94643/status?branch=master)](https://app.codeship.com/projects/320125)
[![npm version](https://badge.fury.io/js/botium-connector-alexa-avs.svg)](https://badge.fury.io/js/botium-connector-alexa-avs)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your Amazon Alexa Skills.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles ? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works ?
A virtual Alexa device is registered to be used in testing, and it Works the same ways as a physical Alexa device. It is not bound to any Alexa Skill, so you have to activate your Alexa skill with its activation utterance.

The steps for Botium to run a conversation with an Alexa skill are:

* Converts [BotiumScript text](hhttps://botium-docs.readthedocs.io/en/latest/05_botiumscript/index.html) to speech ([Botium Speech Processing](https://github.com/codeforequity-at/botium-speech-processing), [Cloud Speech-to-Text API](https://cloud.google.com/text-to-speech/) or [Amazon Polly](https://aws.amazon.com/polly))
* Asks Alexa with [Amazon AVS](https://developer.amazon.com/de/docs/alexa-voice-service/get-started-with-alexa-voice-service.html)
* Converts answer to text ([Botium Speech Processing](https://github.com/codeforequity-at/botium-speech-processing), [Cloud Text-to-Speech API, aka Cloud Speech API](https://cloud.google.com/speech-to-text/) or [Amazon Transcribe](https://aws.amazon.com/transcribe/))
* Makes [BotiumScript assertions](hhttps://botium-docs.readthedocs.io/en/latest/05_botiumscript/index.html#using-asserters)

_**Warning 1**: TTS and STT can translate wrong. And so the test will fail, even if Alexa works well.
Google STT handles this problem more sophisticated. See ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT Capability. Another option is to use a homophones list to translate utterances always recognized wrong ("let us" vs "lettuce" ...), see ALEXA_AVS_STT_HOMOPHONES capability below._

_**Warning 2**: When using the cloud-based APIs, there are costs involved.Please check the pricing of the choosen cloud APIs._

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.ai)

The Alexa skill to test doesn't have to be published - it can be tested while still in "development mode", making this connector the perfect choice for __Continuous Testing in CI Pipelines__.

## Requirements
For Text-To-Speech and Speech-To-Text, this connector currently supports [Botium Speech Processing](https://github.com/codeforequity-at/botium-speech-processing) as well as cloud services by Amazon and Google. You only have to configure **one** of them.

### Node.js v10
Node.js v8 required, but Node.js v10 recommended because Http2 module of Node.js (AVS uses HTTP2) 

### ALSA backend (Linux only)

Depending on your Linux distribution:

    > sudo yum install alsa-lib-devel
    or
    > sudo apt-get install libasound2-dev

_See [here](https://github.com/TooTallNate/node-speaker) for more info._

### Botium Speech Processing

Please see  [Botium Speech Processing repository](https://github.com/codeforequity-at/botium-speech-processing) for installation instructions.

### Google Cloud Text-to-Speech API
1. [Select or create](https://console.cloud.google.com/project) a Cloud Platform project
2. [Enable billing](https://support.google.com/cloud/answer/6293499#enable-billing) for your project (free tier available).
3. [Enable](https://console.cloud.google.com/flows/enableapi?apiid=texttospeech.googleapis.com) the Google Cloud Text-to-Speech API.
4. [Set up authentication with a service account](https://cloud.google.com/docs/authentication/getting-started) so you can access the API from your local workstation.
    1. Make sure to select _Owner_ or _Cloud Speech Service Agent_ as role
5. **Save the JSON credentials file, you will need it later.**

### Google Cloud Speech-to-Text API
* Same steps as in Google Cloud Text-to-Speech API, just other API
* It is recommended that Speech-to-Text and Text-to-Speech API are sharing the same project and the same credentials

### Amazon Polly
[See steps](https://docs.aws.amazon.com/polly/latest/dg/setting-up.html)  

In short:
* [Create an IAM user](https://console.aws.amazon.com/iam/) (see [here](https://docs.aws.amazon.com/de_de/IAM/latest/UserGuide/id_users_create.html) for help)
  * Important: choose _Programmatic access_ as access type
  * **Note access key and secret, you will need it later**
* Choose _Attach existing policies to user directly_ to give permissions _AmazonPollyFullAccess_
  * Feel free to use finer grained policies if you know what you are doing

### Amazon Transcribe
_Amazon Transcribe is **very slow** for our usecase, use Botium Speech Processing or Google Cloud Speech-to-Text API if possible_

_Amazon Transcribe only worked for **english language** in our tests_

* [Create an S3 Bucket](https://console.aws.amazon.com/s3/)
  * Botium uses default name _botium-connector-alexa-avs_
* Amazon Polly and Amazon Transcribe are sharing the same IAM user by default (can be changed in botium.json later)
* Add existing policies _AmazonTranscribeFullAccess_ and _AmazonS3FullAccess_ to this user
  * Feel free to use finer grained policies if you know what you are doing

### Amazon AVS API of the Product to test

In the [Alexa Voice Service Developer console](https://developer.amazon.com/alexa/console/avs/home), you have to register a virtual Alexa device and enable [code-based linking](https://developer.amazon.com/de-DE/docs/alexa/alexa-voice-service/code-based-linking-other-platforms.html).

1. Follow [**Step 1: Enable CBL**](https://developer.amazon.com/de/docs/alexa-voice-service/code-based-linking-other-platforms.html#step1)
2. **note your "Client ID", the "Client secret" and your "Product ID", you will need it later**

## Preparing Botium Capabilities

The connector repository includes a tool to compose the Botium capabilities (including private keys, access tokens etc). Create a project directory of your choice, and follow the steps below.

### 1. Prepare amazonConfig.json

_Note: If you use Botium Box, then this step is optional. You can import the created amazonConfig.json in Botium Box, or you enter the values (AVS Product ID, Client ID...) in the Botium Box connector wizard._

* Copy **AVS "Client ID", the "Client secret" and your "Product ID"** from steps above (Amazon AVS API of the Product to test) to a file named amazonConfig.json (see sample in cfg folder of this repository):
* When using Amazon Transcibe / Amazon Polly:
    * Set region you want to use (Be aware, a region has not all APIs. For example eu-west-1 has Polly, Transcribe, and S3 too)
    * Copy Access Key ID, and Secret Access Key from steps above  (Amazon Polly, Amazon Transcribe)
* When using Amazon Transcibe
    * Create a bucket in S3, or use an existing one. 

```
{
  "deviceInfo": {
    "clientId": "xxx_required_for_AVS",
    "clientSecret": "xxx_required_for_AVS",
    "productId": "xxx_required_for_AVS"
  },
  "region": "xxx_optional_Polly_or_Transcribe",
  "accessKeyId": "xxx_optional_Polly_or_Transcribe",
  "secretAccessKey": "xxx_optional_Polly_or_Transcribe",
  "bucketName": "xxx_optional_Polly_or_Transcribe"
}

```

### 2. Prepare googleConfig.json (Optional)

Copy and rename Google Cloud JSON credentials to a file named googleConfig.json. (Suppose Speech-to-Text and Text-to-Speech API are sharing the same project)

```
{
  "type": "service_account",
  "project_id": "xxx",
  ...
}

```

### 3. Run the "Botium Connector Alexa AVS Initialization Tool"

There are several ways of running this tool, depending on how you installed it:

When you are using the Botium CLI, then just run
```
> botium-cli init-alexa-avs
```

When you installed the NPM package for this repository, then run
```
> botium-connector-alexa-avs-init
```

When you cloned or downloaded this repository, and you are in the "samples" folder, then run
```
> npm run init-alexa-avs
or
> ./node_modules/.bin/botium-connector-alexa-avs-init
```

If you use **Botium Box**, you dont have to use this tool - follow the suggested steps, you will be presented a hyperlink you have to open in your browser to connect the Botium virtual device to your Amazon account.

### 4. Use the generated botium.json
A file named botium.json is generated containing the required capabilities to be used with Botium.

_You can remove the amazonConfig.json and googleConfig.json now_

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __alexa-avs__ to activate this connector.

### ALEXA_AVS_AVS_CLIENT_ID
See json downloaded from AVS

### ALEXA_AVS_AVS_CLIENT_SECRET
See json downloaded from AVS

### ALEXA_AVS_AVS_REFRESH_TOKEN
The simpliest way to acquire it, is the initialization tool described above

### ALEXA_AVS_AVS_LANGUAGE_CODE
Language setting for Alexa. Example: en_US

### ALEXA_AVS_STT_HOMOPHONES
This connector uses speech recognition for turning the output speech coming back from Alexa into text. This process is not perfect, even with the best STT engines available - to compensate for this, homophones can be specified for errors that occur when a reply from Alexa is misunderstood. The text will be replaced in actual responses from the virtual Alexa device.

Homophones lists can be specified as JSON lists or as CSV, embedded in botium.json or as an external file.

**Specify in botium.json**
```
  "ALEXA_AVS_STT_HOMOPHONES": {
    "lettuce": ["let us"],
    "fairy": ["ferry", "fair I"]
  }
```

**Specify in botium.json as CSV text**
```
  "ALEXA_AVS_STT_HOMOPHONES": "lettuce,let us\r\nfairy,ferry,fair I"
```

**Point to homophones file in botium.json**
```
  "ALEXA_AVS_STT_HOMOPHONES": "./homophones.txt"
```
_homophones.txt:_
```
lettuce,let us
fairy,ferry,fair I
```


### ALEXA_AVS_TTS
_Default: BOTIUM_SPEECH_PROCESSING_

BOTIUM_SPEECH_PROCESSING or GOOGLE_CLOUD_TEXT_TO_SPEECH or AMAZON_POLLY or NONE

### Capabilities for Botium Speech Processing

### ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_URL
Botium Speech Processing server url

### ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_APIKEY
Botium Speech Processing API Key (optional)

### ALEXA_AVS_TTS_BOTIUM_SPEECH_PROCESSING_LANGUAGE / ALEXA_AVS_STT_BOTIUM_SPEECH_PROCESSING_LANGUAGE
Botium Speech Processing language for TTS / STT

### Capabilities for Google Cloud Text To Speech

#### ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY
See json downloaded from Google

#### ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL
See json downloaded from Google

#### ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE
Language setting for Google. Usually same as ALEXA_AVS_AVS_LANGUAGE_CODE

### Capabilities for Amazon Polly

#### ALEXA_AVS_TTS_AMAZON_POLLY_REGION
Amazon region. Any region can be used which supports Amazon Polly

#### ALEXA_AVS_TTS_AMAZON_POLLY_ACCESS_KEY_ID
See json downloaded from Amazon

#### ALEXA_AVS_TTS_AMAZON_POLLY_SECRET_ACCESS_KEY
See json downloaded from Amazon

#### ALEXA_AVS_TTS_AMAZON_POLLY_LANGUAGE_CODE
Language setting for Amazon. Usually same as ALEXA_AVS_AVS_LANGUAGE_CODE

### ALEXA_AVS_STT
_Default: BOTIUM_SPEECH_PROCESSING_

BOTIUM_SPEECH_PROCESSING or GOOGLE_CLOUD_SPEECH or AMAZON_TRANSCRIBE

### Capabilities for Botium Speech Processing
see above

### Capabilities for Google Cloud Speech

#### ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY
See json downloaded from Google. Same as ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY if they sharing the same project

#### ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL
See json downloaded from Google. Same as ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL if they sharing the same project

#### ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE
Language setting for Goolge. Usually same as ALEXA_AVS_AVS_LANGUAGE_CODE and ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE

### ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT
_Default: true_

After we got speech response from Alexa, and we are sending it to Google STT, there is a possibility to send 
the expected answer with it. Google will use this as [hint](https://cloud.google.com/speech-to-text/docs/basics#phrase-hints).

If this flag is true, then the test is not strict. It can accept small differences between answer of Alexa, and our expectations in testcase. Because Google STT corrects the difference.

If this flag is false, then the test is strict. A test can fail even if the answer of Alexa, and our expectations in testcase are the same. Just because Google STT doesn't translate well.

### ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED
_Default: true_

The utterance is negated
```
#me
hi!

#bot
!goodbye
``` 

Then it will be send as expected answer to Google STT, expect this flag is false.

### Capabilities for Amazon Transcribe

#### ALEXA_AVS_STT_AMAZON_TRANSCRIBE_REGION
Amazon region. Any region can be used which supports Amazon Polly

#### ALEXA_AVS_STT_AMAZON_TRANSCRIBE_ACCESS_KEY_ID
See json downloaded from Amazon

#### ALEXA_AVS_STT_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY
See json downloaded from Amazon

#### ALEXA_AVS_STT_AMAZON_TRANSCRIBE_LANGUAGE_CODE
Language setting for Amazon. Usually same as ALEXA_AVS_AVS_LANGUAGE_CODE

#### ALEXA_AVS_STT_AMAZON_TRANSCRIBE_BUCKET_NAME
The name of an existing S3 bucket

## Open Issues and Restrictions
* If a text is very long (more thousand), then connector dies because AVS error. Long messages should be sent in chunks.
* Stream/connection create/close optimalization. Create/close global, for dialog, or for question-answer pair?
* Auth token lifetime is 1h. Deal with it. (Acquire it frequently, or catch error, and refresh token)
