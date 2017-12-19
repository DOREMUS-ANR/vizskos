const _ = require('underscore');
const Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  // Default
  defaults: {
    concept : true, language : 'fr'
  },

  initialize: function initializeConcept(){

    //handlebars has trouble with properties containing @
    //sets "clean" properties
  	this.set('uri', this.attributes["@id"]);
    this.set('type', this.attributes["@type"]);

    //generates an id that can be used in classes attached to html elements (without http:// and /)
    var urlParts = this.attributes["@id"].split("/").join("");
    this.set('id', urlParts.substring((urlParts.length -10), urlParts.length));

    //conceptScheme (wether it's a top concept or not)
    if(this.attributes["skos:inScheme"]){
      this.set('conceptScheme', this.attributes["skos:inScheme"]);
    }else if(this.attributes["skos:topConceptOf"]){
      this.set('conceptScheme', this.attributes["skos:topConceptOf"]);
    }
    var scheme = this.collection.getActiveThesaurus();
    this.set('conceptSchemeName', scheme.name);
    this.set('conceptSchemeClass', scheme.class);

    this.set('conceptDefinition', this.attributes["skos:definition"]);

    //prefered labels
    if(this.attributes["skos:prefLabel"]){
      this.set('prefLabel', Array.isArray(this.attributes["skos:prefLabel"])? _.sortBy(this.attributes["skos:prefLabel"], this.sortByLanguage) : [this.attributes["skos:prefLabel"]] );
    }

    //alternate labels
    if(this.attributes["skos:altLabel"]){
      this.set('altLabel', Array.isArray(this.attributes["skos:altLabel"]) ? _.sortBy(this.attributes["skos:altLabel"], this.sortByLanguage) : [this.attributes["skos:altLabel"]] );
    }

    //parent
    if(this.attributes["skos:hasTopConcept"]){
      if(Array.isArray(this.attributes["skos:hasTopConcept"])){
        this.set('hasTopConcept', this.attributes["skos:hasTopConcept"].map(function(elt){ return elt["@id"];}));
      }else{
        this.set('hasTopConcept', this.attributes["skos:hasTopConcept"]["@id"]);
      }
    }
    //console.log("attributes",this.attributes);
    //children
    if(this.attributes["skos:narrower"]){
      this.set('narrower', Array.isArray(this.attributes["skos:narrower"])? this.attributes["skos:narrower"] : [this.attributes["skos:narrower"]]);
    }

    //matches
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
  //sort by language (alphabetical order)
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
