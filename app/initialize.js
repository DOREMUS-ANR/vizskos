var application = require('./js/application');

document.addEventListener('DOMContentLoaded', function() {

	//create the app
  	application.initialize();
  	
  	//route the initial url
  	Backbone.history.start({ pushState: true });
  	
});