const { URLSearchParams } = require('url')
const { v1: uuidv1 } = require('uuid')
const axios = require('axios').default
const readlineSync = require('readline-sync')

const { getAxiosShortenedOutput, getAxiosErrOutput } = require('../utils/axios')

const _keypress = (question) => {
  return readlineSync.question(question)
}

/*
{
  "user_code": "{{STRING}}",
  "device_code": "{{STRING}}",
  "verification_uri": "{{STRING}}",
  "expires_in": {{INTEGER}},
  "interval": {{INTEGER}}
  "client_id": "{{STRING}}",
  "product_id": "{{STRING}}",
  "device_serial_number": "{{STRING}}"
}
 */
const DeviceAuthorizationRequest = async (clientId, productId) => {
  const deviceSerialNumber = uuidv1()
  console.log('Device serial number: ' + deviceSerialNumber)

  const form = new URLSearchParams()
  form.append('response_type', 'device_code')
  form.append('client_id', clientId)
  form.append('scope', 'alexa:all')
  form.append('scope_data', JSON.stringify({
    'alexa:all': {
      productID: productId,
      productInstanceAttributes:
        {
          deviceSerialNumber: deviceSerialNumber
        }
    }
  }))
  const axiosRequestParams = {
    url: 'https://api.amazon.com/auth/O2/create/codepair',
    method: 'POST',
    data: form.toString()
  }
  let axiosResponse = null
  try {
    axiosResponse = await axios(axiosRequestParams)
  } catch (err) {
    throw new Error(`_deviceAuthorizationRequest failed: ${getAxiosErrOutput(err)}`)
  }
  if (axiosResponse.status !== 200) {
    throw new Error(`_deviceAuthorizationRequest failed with status code ${axiosResponse.status}: ${getAxiosShortenedOutput(axiosResponse.data)}`)
  }
  return Object.assign(
    axiosResponse.data,
    {
      client_id: clientId,
      product_id: productId,
      device_serial_number: deviceSerialNumber
    })
}

/*
  {
    "user_code": "{{STRING}}",
    "device_code": "{{STRING}}",
    "verification_uri": "{{STRING}}",
    "expires_in": {{INTEGER}},
    "interval": {{INTEGER}}
  }
*/
const DeviceTokenRequest = async (deviceCode, userCode) => {
  const form = new URLSearchParams()
  form.append('grant_type', 'device_code')
  form.append('device_code', deviceCode)
  form.append('user_code', userCode)
  const axiosRequestParams = {
    url: 'https://api.amazon.com/auth/O2/token',
    method: 'POST',
    data: form.toString()
  }
  let axiosResponse = null
  try {
    axiosResponse = await axios(axiosRequestParams)
  } catch (err) {
    throw new Error(`_deviceTokenRequest failed: ${getAxiosErrOutput(err)}`)
  }
  if (axiosResponse.status !== 200) {
    throw new Error(`_deviceTokenRequest failed with status code ${axiosResponse.status}: ${getAxiosShortenedOutput(axiosResponse.data)}`)
  }
  return axiosResponse.data
}

/*
{
  "access_token": "{{STRING}}",
  "refresh_token": "{{STRING}}",
  "token_type": "bearer",
  "expires_in": {{INTEGER}}
}
*/
const AccessTokenRefreshRequest = async (clientId, clientSecret, refreshToken) => {
  const form = new URLSearchParams()
  form.append('grant_type', 'refresh_token')
  form.append('refresh_token', refreshToken)
  form.append('client_id', clientId)
  form.append('client_secret', clientSecret)
  const axiosRequestParams = {
    url: 'https://api.amazon.com/auth/O2/token?',
    method: 'POST',
    data: form.toString()
  }
  let axiosResponse = null
  try {
    axiosResponse = await axios(axiosRequestParams)
  } catch (err) {
    throw new Error(`AccessTokenRefreshRequest failed: ${getAxiosErrOutput(err)}`)
  }
  if (axiosResponse.status !== 200) {
    throw new Error(`AccessTokenRefreshRequest failed with status code ${axiosResponse.status}: ${getAxiosShortenedOutput(axiosResponse.data)}`)
  }
  return axiosResponse.data
}

/*
  {
    "access_token": "{{STRING}}",
    "refresh_token": "{{STRING}}",
    "token_type": "bearer",
    "expires_in": {{INTEGER}}
    "user_code": "{{STRING}}",
    "device_code": "{{STRING}}",
    "verification_uri": "{{STRING}}",
    "interval": {{INTEGER}}
    "client_id": "{{STRING}}",
    "product_id": "{{STRING}}",
    "device_serial_number": "{{STRING}}"
  }
*/
const RefreshTokenAcquireRequest = async (clientId, productId) => {
  console.log('Authorizing device...')

  const deviceAuthorizationResponse = await DeviceAuthorizationRequest(clientId, productId)
  console.log(`Please login on ${deviceAuthorizationResponse.verification_uri} and enter ${deviceAuthorizationResponse.user_code}`) // Print the HTML for the Google homepage.
  console.log('Press enter after done')
  _keypress(' ')
  console.log('Acquiring token...')
  const deviceTokenResponse = await DeviceTokenRequest(deviceAuthorizationResponse.device_code, deviceAuthorizationResponse.user_code)
  console.log('Token acquired: ' + JSON.stringify(deviceTokenResponse))
  return Object.assign(deviceAuthorizationResponse, deviceTokenResponse)
}

const SendCapabilities = async (accessToken, retryDelay = 0.5) => {
  const axiosRequestParams = {
    url: 'https://api.amazonalexa.com/v1/devices/@self/capabilities',
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    data: {
      envelopeVersion: '20160207',
      capabilities: [
        {
          type: 'AlexaInterface',
          interface: 'SpeechRecognizer',
          version: '2.0'
        }
      ]
    }
  }
  let axiosResponse = null
  try {
    axiosResponse = await axios(axiosRequestParams)
  } catch (err) {
    throw new Error(`SendCapabilities failed: ${getAxiosErrOutput(err)}`)
  }
  if (axiosResponse.status === 500) {
    retryDelay = retryDelay * 2
    if (retryDelay > 256) {
      throw new Error('Too much retry, giving up!')
    }

    return new Promise((resolve, reject) => {
      setTimeout(
        () => SendCapabilities(accessToken, retryDelay).then(resolve).catch(reject),
        retryDelay * 1000
      )
    })
  } else if (axiosResponse.status !== 204) {
    throw new Error(`SendCapabilities expected status code 204, got ${axiosResponse.status}: ${getAxiosShortenedOutput(axiosResponse.data)}`)
  }
}

module.exports = {
  DeviceAuthorizationRequest,
  DeviceTokenRequest,
  AccessTokenRefreshRequest,
  RefreshTokenAcquireRequest,
  SendCapabilities
}
