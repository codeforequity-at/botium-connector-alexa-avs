const yargs = require('yargs')
const amazonAuthorize = require('./Authorize')
const AVS = require('./AVS')

const _parseArgs = () => {
  return Promise.resolve(
    yargs.usage(
      'Usage: $0 -c [str] -p [str]')
      .demandOption(['c', 'p'])
      .alias('c', 'client-id')
      .nargs('c', 1)
      .describe('c', 'Client id')
      .alias('p', 'product-id')
      .nargs('p', 1)
      .describe('p', 'Product id')
      .version(false) // do not parse version from package.json
      .argv
  )
}

//if (!process.stdin.setRawMode) {
  if (false) {
  console.log('Start in terminal!!!')
  process.exit(-1)
}

let args
_parseArgs()
  .then((result) => {
    args = result
    return amazonAuthorize.RefreshTokenAcquireRequest(result.c, result.p)
  })
  .then((deviceTokenResponse) => {
    //console.log(`Refresh token acquired`)
    //console.log(`The proper Capabilities:`)
    //console.log(`${AVS.ALEXA_AVS_AVS_CLIENT_ID} = ${args.c}`)
    //console.log(`${AVS.ALEXA_AVS_AVS_REFRESH_TOKEN} = ${deviceTokenResponse.c}`)
  })
  .catch((err) => console.log(err))
