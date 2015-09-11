var jsonld = require('jsonld');
var concept = require('./concept');
var application = require('../application');
module.exports = Backbone.Collection.extend({
  
  model: concept,
  loaded: false,
  activeConceptId : null,
  activeThesaurus : null,
  thesaurusNames : {'InstrumentsKeywords' : 'MIMO Thesaurus', 'hs': 'Sachs & Hornbostel classification'},
  url: 'http://data.mimo-db.eu:9091/',
  viewTypes : [{ 'id' : 1, 'name' : 'circular tree'},{ 'id' : 2, 'name' : 'tree'}],
  viewType : (parseInt(sessionStorage.getItem("viewType")) || 1),
  //viewType :  1,
  conceptClosed : false,

  initialize : function(models, options){

    if(!this.loaded && this.activeThesaurus){
      //this.loadData();
    }
 
  },
  loadData : function loadDataThesaurus(conceptUri){
 
    var context = {
      "skos": "http://www.w3.org/2004/02/skos/core#",
      "skos:Concept": {"@type": "@id"},
      "skos:inScheme": {"@type": "@id"},
      "skos:narrower": {"@type": "@id"},
      "skos:exactMatch": {"@type": "@id"},
      "skos:broader": {"@type": "@id"},
      "skos:closeMatch": {"@type": "@id"},
      "skos:topConceptOf": {"@type": "@id"}
    };
    if(conceptUri){
      this.loaded = false;
      $.ajax({
        'url': this.url + "sparql/describe?uri=" + conceptUri,
        'headers': {'Accept' : 'application/ld+json'},
        'context': this
      }).done(function(collection){
        jsonld.compact(collection, context, function(err, compacted) {  
          this.prepareData(compacted["@graph"]);
          this.trigger("conceptChanged", this);
          this.loadData();
        }.bind(this));
      }).fail(function(error){
        this.loadData();
      });
    }else{

      $.ajax({
        'url': this.url + this.activeThesaurus,
        'headers': {'Accept' : 'application/ld+json'},
        'context': this
      }).done(function(collection){

        jsonld.compact(collection, context, function(err, compacted) {  
          this.prepareData(compacted["@graph"]);
          this.loaded = true;
          this.trigger("navChanged", this);
          this.trigger("conceptChanged", this);

        }.bind(this));
      });
    }
  },

  getActiveConcept : function getActiveConceptThesaurus(){
    //console.log("connait-on l'id ?", this.activeConceptId);
    var theconcept = this.models.filter(function(element){
      return element.attributes.id === this.activeConceptId;
    }.bind(this));
    //console.log("result ", theconcept[0]);
    return theconcept[0] || null;
  },

  getViewTypes : function getViewTypesThesaurus(){
    this.viewTypes.forEach(function (element, index) {
      if(element.id === this.viewType) this.viewTypes[index].selected = true;
    });
    
    return this.viewTypes;
  },

  getThesaurusName : function getThesaurusName(thesaurusUri, conceptUri){
    //console.log("c'est ici", thesaurusUri, conceptUri);
    if(thesaurusUri) {
      var shortUri = application.processUri(thesaurusUri).replace("/", "");
    }else{
      var shortUri = application.processUri(conceptUri).replace("/", "");
    }
    return {'name' : this.thesaurusNames[shortUri], 'class' : shortUri};
  },

  setActiveURI : function setActiveURIThesaurus(thesaurus, conceptId, name){
  
    this.activeConceptId = conceptId;
    
    if(this.activeThesaurus !== thesaurus){
      
      this.activeThesaurus = thesaurus;
      this.loaded = false;
      if(!conceptId) {
        this.loadData();
      }else{
        this.loadData("http://data.mimo-db.eu/" + thesaurus + "/" + this.activeConceptId + "/" + name );
      }
    }
    
    if(this.loaded) {
      this.toggleConcept(true);
      this.trigger("conceptChanged", this);
    }

  },
  
  setViewType : function setViewTypeThesaurus(type){
    
    this.viewType = type;
    sessionStorage.setItem("viewType", type);
    this.trigger("viewTypeChanged", this);

  },
  getName : function getName (prefLabels){
    
    if(!prefLabels) return "";
    if(Array.isArray(prefLabels)){
      var name = prefLabels.filter(function(prefLabel){
        return typeof prefLabel === "string";
      });
      if(Array.isArray(name)){
        name = name[0];
      }else{
        name = prefLabels[0]["@value"];
      }
    }else if(prefLabels["@value"]){
      var name = prefLabels["@value"];
    }else{
      var name = prefLabels;
    }
    return name;

  },
  getChildren : function getChildren(node){
    
    var that = this;
    return this.models.filter(function (element){
      return element.attributes["skos:broader"] === node["@id"];

    }).map(function (childElement){
      var name = that.getName(childElement.attributes["skos:prefLabel"]);
      var children = that.getChildren(childElement.attributes);
      var result = {"name" : name, id : application.processUri(childElement.attributes["@id"]), rid : childElement.attributes["id"]};
      if(children.length > 0) {
        result.children = children;
        result.size = children.length;
      }else{  
        result.size = 1;
      }
      return result;
    });

  },
  getParent : function getParentThesaurus(nodeId, data){
    
    var that = this;
    var element = _.findWhere(data, {"@id" : nodeId});
    if(element === undefined) return [];
    var parent = new Array();

    if(element.parents){
      return element.parents;
    }else if(element["skos:broader"]) {
      var grandParent =  that.getParent(element["skos:broader"], data);

      if(grandParent.length>0){
        parent = grandParent;
      }
      
      parent = parent.concat([element["skos:broader"]]);
    }
    return parent;      
    
  },
  toggleConcept : function toggleConceptThesaurus(visible){
    if(visible){
      if(visible === true){
        this.conceptClosed = false;
      }else{
        this.conceptClosed = true;
      }
    }else{
      this.conceptClosed = !this.conceptClosed;
    }
    this.trigger("conceptToggled");

  },
  findRank : function findRankThesaurus (dataObj){
    
    if(!dataObj) return false;
    for(var element in dataObj) {
      var themodel = _.findWhere(this.models, function(elt){
        elt.attributes["@id"] == element["@id"];
      });
      themodel.set("rank", this.counter);
      this.counter ++;
      if (element.children) this.findRank(element.children);
    };

  },
  comparator : function comparatorThesaurus (model) {
    return model.get('rank');
  },
  prepareData: function prepareDataThesaurus(data){
    var that = this;

    //add parent hierarchy
    var data = data.map(function(element){
      var parent = that.getParent(element["@id"], data);
      if(parent.length>0){
        element.parents = parent;
      }
      return element;
    });

    //reset the collection
    this.reset(data);

    //creates hierarchical tree for nav
    var filteredTree = this.models.filter(function(element){
      return element.attributes["skos:topConceptOf"] !== undefined;
    }).map(function (element){
      var children = that.getChildren(element.attributes);
      var result = { "name" : that.getName(element.attributes["skos:prefLabel"]), id : application.processUri(element.attributes["@id"]) , rid : element.attributes["id"]};
      if(children.length > 0) {
        result.children = children;
        result.size = children.length;
      }else{
        result.size = 1;
      }
      return result;
    });

    var dataTree = {"name" : this.thesaurusNames[this.activeThesaurus]};
    dataTree.children = filteredTree;
    
    this.counter = 1;
    
    //orders the collection according to the tree
    this.findRank(dataTree);
    this.sort();

    this.conceptTree = dataTree;
    this.trigger("dataChanged");

  }

});