var Application = {
  domainPattern : /http:\/\/data.mimo-db.eu/g,
  initialize: function initializeApplication() {
   
  	var AppView = require('./views/app');
  	var Router = require('./routers/router');
  	var Thesaurus = require('./models/thesaurus');
    
      this.collection = new Thesaurus();
      this.appView = new AppView({collection : this.collection, attributes : { application: this }}).render();
      this.router = new Router({collection : this.collection, attributes : { application: this }});
  
  },
  processUri : function processUriApplication(uri){
    //console.log(uri);
  	if(uri.search(this.domainPattern) != -1){
  		return uri.replace(this.domainPattern, '');
  	}else{
  		return uri;
  	}
  }
};

module.exports = Application;