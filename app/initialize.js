var application = require('./js/application');

$(function() {

	//create the app
  	application.initialize();
  	
  	//route the initial url
  	Backbone.history.start({ pushState: true });
  	
});