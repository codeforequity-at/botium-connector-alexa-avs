const BotiumConnectorAlexaAvs = require('./src/connector')
const { DeviceAuthorizationRequest, DeviceTokenRequest, SendCapabilities } = require('./src/avs/core')

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorAlexaAvs,
  PluginDesc: {
    name: 'Alexa Voice Service',
    provider: 'Botium',
    features: {
      conversationFlowTesting: false,
      e2eTesting: true,
      audioInput: true,
      supportedFileExtensions: ['.wav']
    },
    capabilities: [
      {
        name: 'ALEXA_AVS_STT',
        label: 'Speech Recognition Profile',
        type: 'speechrecognitionprofile',
        required: false
      },
      {
        name: 'ALEXA_AVS_TTS',
        label: 'Speech Synthesis Profile',
        type: 'speechsynthesisprofile',
        required: false
      }
    ],
    actions: [
      {
        name: 'DeviceAuthorizationRequest',
        description: 'DeviceAuthorizationRequest',
        run: async (caps, { clientId, productId }) => {
          return DeviceAuthorizationRequest(clientId, productId)
        }
      },
      {
        name: 'DeviceTokenRequest',
        description: 'DeviceTokenRequest',
        run: async (caps, { deviceCode, userCode }) => {
          return DeviceTokenRequest(deviceCode, userCode)
        }
      },
      {
        name: 'SendCapabilities',
        description: 'SendCapabilities',
        run: async (caps, { accessToken }) => {
          return SendCapabilities(accessToken)
        }
      }
    ]
  }
}
