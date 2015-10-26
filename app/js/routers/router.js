var application = require('../application');
module.exports = Backbone.Router.extend({
    routes:{
      "about" : "showAbout",
      "uri=:uri" : "showURI",
      //"(http://data.mimo-db.eu/):thesaurus(/)" : "showConcept",
      //"(http://data.mimo-db.eu/):thesaurus(/:id)(/)" : "showConcept",
      //"(http://data.mimo-db.eu/):thesaurus(/:id)(/:conceptName)(/)" : "showConcept",
      "*other"    : "defaultRoute"
    },
    
    showAbout: function showAbout( ) {
      // Set the current filter to be used
      //console.log("On aimerait afficher les infos ");
    },

    showConcept: function showConcept( thesaurus, id, name ) {
      // Set the current filter to be used
      if(id){
        id = parseInt(id,10);        
      }
      if(typeof id !== "number") id = null;
      
      application.collection.setActiveURI(thesaurus, id, name);
      Backbone.history.checkUrl();
      //console.log("router", thesaurus, id, name);
      
    },

    showURI: function showURI( uri ) {
      //console.log('showURI. You attempted to reach:' + uri);
      application.collection.showURI(uri);
      Backbone.history.checkUrl();
    },

    defaultRoute: function(other){
      //console.log('You attempted to reach:' + other);
      other = other.replace("uri=", "");
      application.collection.setActiveURI(other);
      Backbone.history.checkUrl();
    }

});