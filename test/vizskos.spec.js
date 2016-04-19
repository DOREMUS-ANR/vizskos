var chai = require('../node_modules/chai/chai');
var expect = chai.expect;
var application = require('../app/initialize');


describe("Thesaurus Viewer", function() {
  	
	describe("Router", function() {

 

  	});

  	describe("Navigation Interface", function() {

    	it("should a", function() {
     
    	});

  	});


  	describe('Thesaurus Collection', function() {
	  	
  		describe('should define a uri', function() {
	    	expect(application.collection.activeURI).not.to.equal(null);
	  	});

	  	describe('should select a thesaurus', function() {
	    	expect(application.collection.activeThesaurus).not.to.equal(null);
	  	});
	});
});