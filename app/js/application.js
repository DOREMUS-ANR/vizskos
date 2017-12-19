var AppView = require('./views/app');
var Router = require('./routers/router');
var Thesaurus = require('./models/thesaurus');

var Application = {
  initialize: function initializeApplication(params) {
    //create the collection of concepts
    this.collection = new Thesaurus([], {
      thesauri: params.thesauri
    });

    //create the app view, with a reference to the collection and this application
    this.appView = new AppView({
      el: "#" + params.id,
      collection: this.collection,
      attributes: {
        application: this
      }
    });

    //create the router, with a reference to the collection and this application
    this.router = new Router({
      collection: this.collection,
      attributes: {
        application: this
      }
    });
  },

  //fonction to handle the different kinds of URLs
  //note : backbone sends to the router only the part of the URL that comes after the domain
  //ex 1
  //the URL is "http://www.mimo-db.eu/uri=http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //the path is "uri=http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //ex 2
  //the URL is "http://localhost:3333/uri=http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //the path is "uri=http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //ex 3
  //the URL is "http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //the path is "InstrumentsKeywords/3305"
  //ex 4
  //the URL is "http://localhost:3333/http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //the path is "http://www.mimo-db.eu/InstrumentsKeywords/3305"
  processUri: function processUriApplication(path) {
    //path = "doremus/peuples/" + path;
    path = path;
    //if the path is the same as the location (ex 1)
    if (path.search(location.origin) !== -1) {
      //replace it with example 3, more user friendly
      return path.replace(location.origin, "");
      //else if the path is not the same as the location
    } else {
      //if the path does not contain uri=, add it
      if (path.search("uri=http") === -1) {
        return path.replace("http", "uri=http");
        //pass on the path
      } else {
        return path;
      }
    }
  }
};

module.exports = Application;
