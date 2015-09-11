_ = require 'underscore'
sysPath = require 'path'

module.exports = class UnderscoreCompiler
  brunchPlugin: yes
  type: 'template'
  extension: 'jst'

  constructor: (@config) ->
    null

  compile: (data, path, callback) ->
    try
      templateSettings = @config.plugins?.underscore
      content = _.template(data, null, templateSettings).source
      result = "module.exports = #{content};"
    catch err
      error = err
    finally
      callback error, result
