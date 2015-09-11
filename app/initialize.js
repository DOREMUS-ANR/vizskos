var application = require('./js/application');

$(function() {

  	application.initialize();
  	Backbone.history.start({ pushState: true });
  	
});