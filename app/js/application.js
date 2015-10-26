var Application = {
  domainPattern : /http:\/\/[\w\.]*\//g,
  initialize: function initializeApplication() {
   
  	var AppView = require('./views/app');
  	var Router = require('./routers/router');
  	var Thesaurus = require('./models/thesaurus');
    
      this.collection = new Thesaurus();
      this.appView = new AppView({collection : this.collection, attributes : { application: this }}).render();
      this.router = new Router({collection : this.collection, attributes : { application: this }});
  
  },
  processUri : function processUriApplication(uri){
    //if the beginning of the uri is the same as the location    
    if(uri.search(location.origin) !== -1){
      return uri.replace(location.origin, "");
    }else if(uri.search("uri=http") === -1){
      return uri.replace("http", "uri=http");
    }else{
      return uri;
    }
  	/*if(uri.search(this.domainPattern) != -1){
  		return uri.replace(this.domainPattern, '');
  	}else{
  		return uri;
  	}*/
  }
};

module.exports = Application;