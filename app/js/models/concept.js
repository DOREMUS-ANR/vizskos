module.exports = Backbone.Model.extend({

  // Default
  defaults: {

  },
  initialize: function initializeConcept(){
  	this.set('uri', this.attributes["@id"]);
  	var urlParts = this.attributes["@id"].split("/");
    this.set('id', (urlParts[4] &&  parseInt(urlParts[4], 10) > 0) ? parseInt(urlParts[4], 10) :null);
    this.set('type', this.attributes["@type"]);

    if(this.attributes["skos:inScheme"]){
      this.set('conceptScheme', this.attributes["skos:inScheme"]);
    }else if(this.attributes["skos:topConceptOf"]){
      this.set('conceptScheme', this.attributes["skos:topConceptOf"]);
    }
    
    var scheme = this.collection.getThesaurusName(this.get('conceptScheme'), this.attributes["@id"]);
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
      //
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
    //this.setPrefLabels();
    //console.log("on teste", this.getNamedRelatedConcepts(this.attributes["skos:narrower"]));
  },
  getNamedRelatedConcepts: function getNamedRelatedConcepts(concept) {
    if(!Array.isArray(concept)) concept = [concept];
    return concept.map(function(elt){
      var conceptinfos = _.findWhere(this.collection, {'@id' : elt});
      //return conceptinfos.prefLabel["pivot"];
    })
  },
  formatLabel: function formatLabelConcept(elt){
    if(typeof elt === "string") {
      return {"@language" : pivot, "@value" : elt};
    }else{
      return elt;
    }
  },
  setPrefLabels: function setPrefLabelsConcept() {
    var prefLabel = {};
    var that = this;
    var labels = [];
    if(Array.isArray(this.attributes["skos:prefLabel"])){
      labels = this.attributes["skos:prefLabel"] ;
    }else{
      labels.push(this.attributes["skos:prefLabel"]);
    }
    if(labels){
      labels.forEach(function(elt, index){
        var label = that.formatLabel(elt);
        prefLabel[label["@language"]] = label["@value"];
      });
      this.set('prefLabels', prefLabel);
    }
    console.log("yes", this, prefLabel);
  },
  getRelative: function getRelativeConcept(direction) {
    return this.collection.at(this.collection.indexOf(this) + direction);
  },
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