const jQuery = require('jquery');
const Backbone = require('backbone');
var application = require('./js/application');

window.application = application;

document.addEventListener('DOMContentLoaded', function() {
  application.initialize({
    id: 'vizskos',
    thesauri: [{
        id: 'http://www.mimo-db.eu/InstrumentsKeywords',
        /*URI of the thesaurus*/
        named_id: 'InstrumentsKeywords',
        /*id used in the DOM (without / : . chars)*/
        pattern: 'http://www.mimo-db.eu/InstrumentsKeywords',
        /*used to find out if the URI of a concept belongs to a thesaurus */
        endpoint: 'http://data.mimo-db.eu/sparql/describe?uri=',
        /*SPARQL endpoint*/
        data: 'http://www.mimo-db.eu/data/InstrumentsKeywords.json',
        /*json-ld fallback file*/
        base: 'http://www.mimo-db.eu/',
        /*host domain*/
        name: 'MIMO Thesaurus' /*display name*/
      },
      {
        id: 'http://www.mimo-db.eu/HornbostelAndSachs',
        named_id: 'HornbostelAndSachs',
        pattern: 'http://www.mimo-db.eu/HornbostelAndSachs',
        endpoint: 'http://data.mimo-db.eu/sparql/describe?uri=',
        data: 'http://www.mimo-db.eu/data/HornbostelAndSachs.json',
        base: 'http://www.mimo-db.eu/',
        name: 'Sachs & Hornbostel classification'
      }
    ]
  });
  //route the initial url
  Backbone.history.start({
    pushState: true
  });

});
