var application = require('../application');
module.exports = Backbone.Router.extend({
    routes:{
      "about" : "showAbout",
      "*other"    : "defaultRoute"
    },
    
    showAbout: function showAbout( ) {
      // Set the current filter to be used
      //console.log("On aimerait afficher les infos ");
    },

    defaultRoute: function(other){
      //console.log('You attempted to reach:' + other);
      if(!other) other = "";
      other = other.replace("uri=", "");
      application.collection.setActiveURI(other);
      Backbone.history.checkUrl();
    }

});