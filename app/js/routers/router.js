var application = require('../application');
module.exports = Backbone.Router.extend({
    routes:{
      "" : "defaultRoute", /* showHome to use the Home template*/
      "about" : "showAbout",
      "*other"    : "defaultRoute"
    },

    showAbout: function showAbout( ) {
      //console.log("On aimerait afficher les infos ");

    },

    showHome: function showHome( ) {
      //
      application.appView.setPage('home');
      Backbone.history.checkUrl();
    },

    defaultRoute: function(other){
      if(!other) other ="";
      application.appView.setPage('thesaurus');
      //if other is defined, remove "uri=" to get the URI
      //other = other.replace("doremus/peuples/uri=", "") ;
      other = other.replace("uri=", "") ;
      //send the URI to the collection
      application.collection.setActiveURI(other);
      //update router
      Backbone.history.checkUrl();

    }

});
