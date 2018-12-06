const yargs = require('yargs')

const amazonAuthorize = require('./Authorize')

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

_parseArgs()
  .then((result) => amazonAuthorize.RefreshTokenAcquireRequest(result.c, result.p))
  .catch((err) => console.log(err))
