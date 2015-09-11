var application = require('../application');
module.exports = Backbone.Router.extend({
    routes:{
      "about" : "showAbout",
      "(http://data.mimo-db.eu/):thesaurus(/)" : "showConcept",
      "(http://data.mimo-db.eu/):thesaurus(/:id)(/)" : "showConcept",
      "(http://data.mimo-db.eu/):thesaurus(/:id)(/:conceptName)(/)" : "showConcept",
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

    defaultRoute: function(other){
      //console.log('Invalid. You attempted to reach:' + other);
      application.collection.setActiveURI("InstrumentsKeywords", null);
    }

});