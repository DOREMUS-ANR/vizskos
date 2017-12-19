exports.config =
  files:
    javascripts:
      joinTo:
        'js/app.js': /^app/
        'js/vendor.js': /^(?!app)/
      # order:
      #   before: [
      #     /^bower_components\/jquery/,
      #     /^bower_components\/underscore/
      #   ]
    stylesheets:
      joinTo:
        'css/vendor.css': /^vendor/
        'css/app.css': /^app/

    templates:
      joinTo: 'js/app.js'

  modules:
    wrapper: 'commonjs'
    definition: 'commonjs'

  plugins:
    browserify:
      # A string of extensions that will be used in Brunch and for browserify.
      # Default: js json coffee ts jsx hbs jade.
      extensions: """
      js coffee hbs
      """

      bundles:
        'js/app.js':
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
