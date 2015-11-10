module.exports = Backbone.Model.extend({

  // Default
  defaults: {
    concept : true
  },

  initialize: function initializeConcept(){
    
    //handlebars has trouble with properties containing @ or : caracters
    //sets "clean" properties

  	this.set('uri', this.attributes["@id"]);
  	
    //generates an id that can be used in classes attached to html elements (without http:// and /)
    var urlParts = this.attributes["@id"].split("/").join("");
    this.set('id', urlParts.substring((urlParts.length -10), urlParts.length));
    
    this.set('type', this.attributes["@type"]);

    if(this.attributes["skos:inScheme"]){
      this.set('conceptScheme', this.attributes["skos:inScheme"]);
    }else if(this.attributes["skos:topConceptOf"]){
      this.set('conceptScheme', this.attributes["skos:topConceptOf"]);
    }
    
    var scheme = this.collection.activeThesaurus.name;
    this.set('conceptSchemeName', scheme.name);
    this.set('conceptSchemeClass', scheme.class);
    
    if(this.attributes["skos:altLabel"]){
      this.set('altLabel', Array.isArray(this.attributes["skos:altLabel"]) ? _.sortBy(this.attributes["skos:altLabel"], this.sortByLanguage) : [this.attributes["skos:altLabel"]] );
    }
    if(this.attributes["skos:prefLabel"]){
      this.set('prefLabel', Array.isArray(this.attributes["skos:prefLabel"])? _.sortBy(this.attributes["skos:prefLabel"], this.sortByLanguage) : [this.attributes["skos:prefLabel"]] );
    }
    if(this.attributes["skos:hasTopConcept"]){
      if(Array.isArray(this.attributes["skos:hasTopConcept"])){
        this.set('hasTopConcept', this.attributes["skos:hasTopConcept"].map(function(elt){ return elt["@id"];}));
      }else{
        this.set('hasTopConcept', this.attributes["skos:hasTopConcept"]["@id"]);
      }
    }
    if(this.attributes["skos:narrower"]){
      this.set('narrower', Array.isArray(this.attributes["skos:narrower"])? this.attributes["skos:narrower"] : [this.attributes["skos:narrower"]]);
    }
    if(this.attributes["skos:exactMatch"]){
      this.set('exactMatch', Array.isArray(this.attributes["skos:exactMatch"]) ? this.attributes["skos:exactMatch"] : [this.attributes["skos:exactMatch"]]);
    }
    if(this.attributes["skos:closeMatch"] ){
      this.set('closeMatch', Array.isArray(this.attributes["skos:closeMatch"]) ? this.attributes["skos:closeMatch"] : [this.attributes["skos:closeMatch"]]);
    }
    
  },
  //returns previous or next concept in the collection
  getRelative: function getRelativeConcept(direction) {
    return this.collection.at(this.collection.indexOf(this) + direction);
  },
  //sort by language in alphabetical order
  sortByLanguage : function sortByLanguageConcept(elt){
    if(elt["@language"]){
      switch(elt["@language"]){
        case "ca" :
          return 1;
        case "de" :
          return 2;
        case "en" :
          return 3;
        case "fr" :
          return 4;
        case "it" :
          return 5;
        case "nl" :
          return 6;
        case "sv" :
          return 7;
      }
    }
    return 0;
  }
});