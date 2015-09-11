exports.config =
  files:
    javascripts:
      joinTo:
        'javascripts/app.js': /^app/
        'javascripts/vendor.js': /^vendor|^bower_components/
      order:
        before: [
          'vendor/javascripts/jquery.js',
          'vendor/javascripts/underscore.js',
          'vendor/javascripts/backbone.js',
          'vendor/javascripts/d3.js',
          'vendor/javascripts/jsonld.js'
        ]
    stylesheets:
      joinTo:
        'css/vendor.css': /^vendor/
        'css/app.css': /^app/

    templates:
      joinTo: 'javascripts/app.js'

  modules:
    wrapper: false
    definition: false

  plugins:
    browserify:
      # A string of extensions that will be used in Brunch and for browserify. 
      # Default: js json coffee ts jsx hbs jade. 
      extensions: """
      js coffee hbs
      """
 
      bundles:
        'javascripts/app.js':
          # Passed to browserify. 
          entry: 'app/initialize.js'
 
          # Anymatch, as used in Brunch. 
          matcher: /^app/
 
          # Direct access to the browserify bundler to do anything you need. 
          onBrowserifyLoad: (bundler) -> console.log 'onWatchifyLoad'
 
          # Any files watched by browserify won't be in brunch's regular 
          # pipeline. If you do anything before your javascripts are compiled, 
          # now's the time. 
          onBeforeBundle: (bundler) -> console.log 'onBeforeBundle'
 
          # Any files watched by browserify won't be in brunch's regular 
          # pipeline. If you do anything after your javascripts are compiled, 
          # now's the time. 
          onAfterBundle: (error, bundleContents) -> console.log 'onAfterBundle'
 
          # Any options to pass to `browserify`. 
          # `extensions` will be set to a proper list of 
          # `plugins.browserify.extensions` 
          instanceOptions: {}
 
          # Any options to pass to `browserify.bundle`. 
          # `debug` will be set to `!production` if not already defined. 
          bundleOptions: {}