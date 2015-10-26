var Handlebars = require("hbsfy/runtime");
var application = require("../../application");

Handlebars.registerHelper('label_with_language', function(labels, language) {
	//if a language is specified 

	if(language) {
		var filteredLabels = labels.filter(function(element){
			return element["@language"] === language;
		})
		if(filteredLabels[0]) return filteredLabels[0]["@value"];
	}
	
	//otherwise get "pivot" element, the only one which is a string 
	
	var filteredLabels = labels.filter(function(element){
		return typeof element === "string";
	})
	return filteredLabels[0];
	
	return "";
});

Handlebars.registerHelper('translation_language', function(labelObject) {
	if (!labelObject) return; 
	if (typeof labelObject  === "string") return "pivot";
	return labelObject["@language"];
});

Handlebars.registerHelper('translation_label', function(labelObject) {
	if (!labelObject) return; 
	if (typeof labelObject  === "string") return labelObject;
	return labelObject["@value"];
});

Handlebars.registerHelper('properties_list', function(property) {
  	if(Array.isArray(property)) return property;
  	return [property];
});

Handlebars.registerHelper('process_uri', function(uri) {
	if(!uri) return;
	return application.processUri(uri);
});

Handlebars.registerHelper('is_internal_link', function(uri) {
	if(!uri) return;
  	if(application.collection.matchAnyThesaurus(uri)){
  		return " class='link'";
  	}else{
  		return " target='_blank'";
  	}
});