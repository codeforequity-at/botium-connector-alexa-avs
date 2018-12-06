const debug = require('debug')('botium-connector-alexa_avs')

const Capabilities = {
  ALEXA_AVS_TTS: 'ALEXA_AVS_TTS',
  ALEXA_AVS_STT: 'ALEXA_AVS_STT'
}

const Defaults = {
  [Capabilities.ALEXA_AVS_TTS]: 'GOOGLE_CLOUD_TEXT_TO_SPEECH',
  [Capabilities.ALEXA_AVS_STT]: 'GOOGLE_CLOUD_SPEECH'
}

class BotiumConnectorAlexaAvs {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  Validate () {
    debug('Validate called')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS]) this.caps[Capabilities.ALEXA_AVS_TTS] = Defaults[Capabilities.ALEXA_AVS_TTS]

    this.tts = new (require('./tts/' + _.startCase(Capabilities.ALEXA_AVS_TTS)))(this.caps)
    this.tts.Validate()

    this.stt = new (require('./stt/' + _.startCase(Capabilities.ALEXA_AVS_STT)))(this.caps)
    this.stt.Validate()

    this.avs = new (require('./AVS'))(this.caps)
    this.avs.Validate()

    return Promise.resolve()
  }

  Build () {
    debug('Build called')
    this.tts.Build()
    this.stt.Build()
    this.avs.Build()
    return Promise.resolve()
  }

  Start () {
    debug('Start called')

    this.sessionClient = new dialogflow.SessionsClient(this.sessionOpts)
    this.conversationId = uuidV1()
    this.sessionPath = this.sessionClient.sessionPath(this.caps[Capabilities.DIALOGFLOW_PROJECT_ID], this.conversationId)
    this.queryParams = null

    this.contextClient = new dialogflow.ContextsClient(this.sessionOpts)
    return Promise.all(this._getContextSuffixes().map((c) => this._createContext(c)))
  }

  UserSays (msg) {
    debug('UserSays called')
    if (!this.sessionClient) return Promise.reject(new Error('not built'))

    return new Promise((resolve, reject) => {
      const request = {
        session: this.sessionPath,
        queryInput: {
          text: {
            text: msg.messageText,
            languageCode: this.caps[Capabilities.DIALOGFLOW_LANGUAGE_CODE]
          }
        }
      }
      request.queryParams = this.queryParams
      debug(`dialogflow request: ${JSON.stringify(request, null, 2)}`)

      this.sessionClient.detectIntent(request).then((responses) => {
        const response = responses[0]
        debug(`dialogflow response: ${JSON.stringify(response, null, 2)}`)

        response.queryResult.outputContexts.forEach(context => {
          context.parameters = structjson.jsonToStructProto(
            structjson.structProtoToJson(context.parameters)
          )
        })
        this.queryParams = {
          contexts: response.queryResult.outputContexts
        }
        resolve(this)

        if (this.caps[Capabilities.DIALOGFLOW_USE_INTENT]) {
          if (response.queryResult.intent) {
            const botMsg = { sender: 'bot', sourceData: response.queryResult, messageText: response.queryResult.intent.displayName }
            setTimeout(() => this.queueBotSays(botMsg), 0)
          }
        } else {
          const fulfillmentMessages = response.queryResult.fulfillmentMessages.filter(f =>
            (this.caps[Capabilities.DIALOGFLOW_OUTPUT_PLATFORM] && f.platform === this.caps[Capabilities.DIALOGFLOW_OUTPUT_PLATFORM]) ||
            (!this.caps[Capabilities.DIALOGFLOW_OUTPUT_PLATFORM] && (f.platform === 'PLATFORM_UNSPECIFIED' || !f.platform))
          )
          fulfillmentMessages.forEach((fulfillmentMessage) => {
            if (fulfillmentMessage.text) {
              const botMsg = { sender: 'bot', sourceData: response.queryResult, messageText: fulfillmentMessage.text.text[0] }
              setTimeout(() => this.queueBotSays(botMsg), 0)
            } else if (fulfillmentMessage.image) {
              const botMsg = {
                sender: 'bot',
                sourceData: response.queryResult,
                media: [{
                  mediaUri: fulfillmentMessage.image.imageUri,
                  mimeType: mime.lookup(fulfillmentMessage.image.imageUri) || 'application/unknown'
                }]
              }
              setTimeout(() => this.queueBotSays(botMsg), 0)
            } else if (fulfillmentMessage.quickReplies) {
              const botMsg = {
                sender: 'bot',
                sourceData: response.queryResult,
                buttons: fulfillmentMessage.quickReplies.quickReplies.map((q) => ({ text: q }))
              }
              setTimeout(() => this.queueBotSays(botMsg), 0)
            } else if (fulfillmentMessage.card) {
              const botMsg = {
                sender: 'bot',
                sourceData: response.queryResult,
                cards: [{
                  text: fulfillmentMessage.card.title,
                  image: fulfillmentMessage.card.imageUri && {
                    mediaUri: fulfillmentMessage.card.imageUri,
                    mimeType: mime.lookup(fulfillmentMessage.card.imageUri) || 'application/unknown'
                  },
                  buttons: fulfillmentMessage.card.buttons && fulfillmentMessage.card.buttons.map((q) => ({ text: q.text, payload: q.postback }))
                }]
              }
              setTimeout(() => this.queueBotSays(botMsg), 0)
            }
          })
        }
      }).catch((err) => {
        reject(new Error(`Cannot send message to dialogflow container: ${util.inspect(err)}`))
      })
    })
  }

  Stop () {
    debug('Stop called')
    this.sessionClient = null
    this.sessionPath = null
    this.queryParams = null
    return Promise.resolve()
  }

  Clean () {
    debug('Clean called')
    this.sessionOpts = null
    return Promise.resolve()
  }

  _createContext (contextSuffix) {
    const contextPath = this.contextClient.contextPath(this.caps[Capabilities.DIALOGFLOW_PROJECT_ID],
      this.conversationId, this.caps[Capabilities.DIALOGFLOW_INPUT_CONTEXT_NAME + contextSuffix])
    const context = {lifespanCount: parseInt(this.caps[Capabilities.DIALOGFLOW_INPUT_CONTEXT_LIFESPAN + contextSuffix]), name: contextPath}
    if (this.caps[Capabilities.DIALOGFLOW_INPUT_CONTEXT_PARAMETERS + contextSuffix]) {
      context.parameters = structjson.jsonToStructProto(this.caps[Capabilities.DIALOGFLOW_INPUT_CONTEXT_PARAMETERS + contextSuffix])
    }
    const request = {parent: this.sessionPath, context: context}
    return this.contextClient.createContext(request)
  }

  _getContextSuffixes () {
    const suffixes = []
    const contextNameCaps = _.pickBy(this.caps, (v, k) => k.startsWith(Capabilities.DIALOGFLOW_INPUT_CONTEXT_NAME))
    _(contextNameCaps).keys().sort().each((key) => {
      suffixes.push(key.substring(Capabilities.DIALOGFLOW_INPUT_CONTEXT_NAME.length))
    })
    return suffixes
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorAlexaAvs
}
