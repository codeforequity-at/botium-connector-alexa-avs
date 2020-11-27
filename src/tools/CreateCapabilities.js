#!/usr/bin/env node
require('./CreateCapabilitiesImpl').execute()
  .catch((err) => console.error(err.toString()))
