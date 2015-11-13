var jsonld = require('jsonld');
var concept = require('./concept');
var application = require('../application');
module.exports = Backbone.Collection.extend({
  
  //default properties
  //Warning : they are reset when all concepts in the collection are reset, 
  //not when some are added or removed 

  model: concept,
  loaded: false,
  activeURI : null,
  activeThesaurus : null,
  comparator: 'rank',
  thesauri : [
    {'id' : 'http://www.mimo-db.eu/InstrumentsKeywords', 'pattern' : 'http://www.mimo-db.eu/InstrumentsKeywords', 'endpoint' : 'http://data.mimo-db.eu:9091/sparql/describe?uri=', 'data': 'http://www.mimo-db.eu/data/InstrumentsKeywords.json', 'base': 'http://www.mimo-db.eu/', 'name' : 'MIMO Thesaurus'},
    {'id' : 'http://www.mimo-db.eu/HornbostelAndSachs', 'pattern' : 'http://www.mimo-db.eu/HornbostelAndSachs', 'endpoint' : 'http://data.mimo-db.eu:9091/sparql/describe?uri=', 'data': 'http://www.mimo-db.eu/data/HornbostelAndSachs.json', 'base': 'http://www.mimo-db.eu/', 'name': 'Sachs & Hornbostel classification'}
  ],
  viewTypes : [{ 'id' : 1, 'name' : 'circular tree'},{ 'id' : 2, 'name' : 'tree'}],
  conceptClosed : false,
  context : {
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "skos:Concept": {"@type": "@id"},
    "skos:inScheme": {"@type": "@id"},
    "skos:narrower": {"@type": "@id"},
    "skos:exactMatch": {"@type": "@id"},
    "skos:broader": {"@type": "@id"},
    "skos:closeMatch": {"@type": "@id"},
    "skos:topConceptOf": {"@type": "@id"}
  },

  initialize : function(models, options){
  },

  //returns the active concept
  getActiveConcept : function getActiveConceptThesaurus(){
    var theconcept = this.models.filter(function(element){
      return element.attributes.uri === this.activeURI;
    }.bind(this));
    return theconcept[0] || null;
  },

  //returns the active conceptScheme 
  getActiveThesaurus : function getActiveThesaurus(){
    //might be available as a model, depending on how the graph is served
    var theconcept = _.findWhere(this.models, {'@type' : 'ConceptScheme'});
    //otherwise emulated with settings infos
    if(theconcept === undefined){
      if(!this.activeThesaurus) this.activeThesaurus = this.thesauri[0];
      theconcept = {
        "conceptScheme" : this.activeThesaurus.id,
        "type" : "skos:ConceptScheme",
        "prefLabel" : [this.activeThesaurus.name]
      }
    }
    return theconcept;
  },

  //get thesauri (and which one is selected)
  getThesauri : function getThesauriThesaurus(){
    var thesaurus = this.getActiveThesaurus();
    this.thesauri.forEach(function (element, index) {
      if(element.id === thesaurus.id) {
        element.selected = true;
      }else{
        element.selected = false;
      }
    });
    return this.thesauri;
  },

  //get selected thesaurus
  getActiveThesaurus : function getActiveThesaurus(){
    var thesaurus = this.activeThesaurus || this.thesauri[0];
    return thesaurus;
  },

  //set selected thesaurus
  setActiveThesaurus : function setActiveThesaurus(thesaurus){
    if(this.activeThesaurus === null || thesaurus.id !== this.activeThesaurus.id){
      this.activeThesaurus = thesaurus;
      this.trigger("thesaurusChanged", this);
    }
  },

  //get available kinds of nav (and which one is selected)
  getViewTypes : function getViewTypesThesaurus(){
    var viewType = this.getViewType();
    this.viewTypes.forEach(function (element, index) {
      if(element.id === viewType) {
        element.selected = true;
      }else{
        element.selected = false;
      }
    });
    return this.viewTypes;
  },

  //set the kind of nav selected
  setViewType : function setViewTypeThesaurus(type){
    if( Number(sessionStorage.getItem("viewType")) !== type){
      sessionStorage.setItem("viewType", type);
      this.trigger("viewTypeChanged", this);
    }
  },

  //get the kind of nav selected
  getViewType : function getViewTypeThesaurus(){
    var viewType = Number(sessionStorage.getItem("viewType")) || 1;
    return viewType;
  },

  //checks if a URI corresponds to any of the Thesauri available in settings
  matchAnyThesaurus : function matchAnyThesaurus(uri){
    for(var i = 0; i< this.thesauri.length; i++){
      var thesaurus = this.thesauri[i];
      if(this.matchPattern(thesaurus.pattern, uri)) return true;
    }
    return false;
  },

  //checks if a URI matches a pattern
  matchPattern : function matchPatternThesaurus(pattern, uri){
     var myRegExp = new RegExp("^" + pattern + "([\\w\\/\\.]*)", "g");
     return (uri.match(myRegExp) !== null)? true: false;
  },

  //selected URI sent by the router
  setActiveURI : function setActiveURIThesaurus(uri){

    //if the URI is not complete (cf application.js, ex 3), adds domain
    if(uri.search("http") === -1) uri = location.origin + "/" + uri;
    
    //the URI is a thesaurus (true) or a concept (false)
    var isFullThesaurus;
    //in both cases finds which thesaurus
    var whichThesaurus = this.thesauri.filter(function(element){
      var myRegExp = new RegExp("^" + element.pattern + "([\\w\\/\\.]*)", "g");
      if (element.id === uri) {
        isFullThesaurus = true;
        return element;
      }else if(this.matchPattern(element.pattern, uri)){
        return element;
      }
    }.bind(this));
    if(whichThesaurus.length>0){
      if(isFullThesaurus){
        //is uri one of the thesauri ? load it !
        this.activeURI = uri;
        if(this.activeThesaurus === null || this.activeThesaurus.id !== whichThesaurus[0].id){
          this.activeThesaurus = whichThesaurus[0];
          this.loadThesaurus(whichThesaurus[0]);
        }else{
          this.trigger("conceptChanged", this);
        }
      }else{
        //else if URI is a concept, load it first (before loading full nav)    
        this.loadURI(uri, whichThesaurus[0]);
      }
    }else{

      //if URI matches nothing, then load first thesaurus in the settings
      this.activeThesaurus = this.thesauri[0];
      this.loadThesaurus(this.thesauri[0]);
    }    
  },

  //load a single URI
  loadURI : function loadURIThesaurus(uri, thesaurus){
    //if it is not already the current one
    if(uri != this.activeURI){
      this.activeURI = uri;
      this.trigger("conceptChanged", this);

      if(this.activeThesaurus === null || this.activeThesaurus.id !== thesaurus.id){
        this.activeThesaurus = thesaurus;
        $.ajax({
          'url': thesaurus.endpoint + uri,
          'headers': {'Accept' : 'application/ld+json'},
          'dataType': 'json',
          'context': this
        }).done(function(collection){
          var collection = _.where(collection, {'@id': uri});
          //compacts json-ld (to avoid deep objects that are complicated to handle and sort)
          jsonld.compact(collection, this.context, function(err, compacted) {
            //build the tree
            this.prepareData([compacted]);
            //inform listeners
            this.trigger("conceptChanged", this);
            //load full thesaurus for nav
            this.loadThesaurus(thesaurus);
          }.bind(this));
        }).fail(function(error){
          //if loading uri fails, load full thesaurus
          this.loadThesaurus(thesaurus);
        });
      }
    }
  },

  //loads thesaurus
  loadThesaurus : function loadThesaurus(thesaurus){
    //callback once loaded
    var loadingCompleted  = function (collection){
      //compacts json-ld (to avoid deep objects that are complicated to handle and sort)
      jsonld.compact(collection, this.context, function(err, compacted) { 
        //build the tree
        this.prepareData(compacted["@graph"]);
        //loading completed
        this.loaded = true;
        //inform listeners
        this.trigger("navChanged", this);
        this.trigger("conceptChanged", this);
      }.bind(this));

    }
    this.loaded = false;

    $.ajax({  
      'url': thesaurus.endpoint + thesaurus.id ,
      'headers': {'Accept' : 'application/ld+json'},
      'context': this,
      'dataType': 'json',
      'crossDomain' : true
    })
    .done(loadingCompleted)
    .fail(function(error){
      //console.log("essai n°3", thesaurus.data)
      $.ajax({
        'url': thesaurus.data ,
        'context': this,
        'dataType': 'json',
        'crossDomain' : true
      }).done(loadingCompleted)
      .fail(function(error){
        //console.log(error);
      })
    });
    
  },
  
  //get name of a concept
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

  //get children concepts of a concept
  getChildren : function getChildren(node){
    
    var that = this;
    return this.models.filter(function (element){
      return element.attributes["skos:broader"] === node["@id"];

    }).map(function (childElement){
      var name = that.getName(childElement.attributes["skos:prefLabel"]);
      var children = that.getChildren(childElement.attributes);
      var result = {"name" : name, uri : childElement.attributes["@id"], id : childElement.attributes["id"]};
      if(children.length > 0) {
        result.children = children;
        result.size = children.length;
      }else{ 
        result.size = 1;
      }
      return result;
    });

  },

  //get parent concepts of a concept
  getParent : function getParentThesaurus(nodeId, data){
    
    var that = this;

    var element = data.filter(function (element){
      return element["@id"] === nodeId;
    });
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
    //gives a rank property to each concept according to its place in the tree 
    //to enable prev/next navigation
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

  //once the data is loaded, prepares a tree for nav rendering
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

    if(this.models.length>1){
      this.reset(data);
    }else{
      this.add(data);
    }
    
    //creates hierarchical tree for nav
    var filteredTree = this.models.filter(function(element){
      return element.attributes["skos:topConceptOf"] !== undefined;
    }).map(function (element){
      var children = that.getChildren(element.attributes);
      var result = { "name" : that.getName(element.attributes["skos:prefLabel"]), uri : element.attributes["@id"], id : element.attributes["id"]};
      if(children.length > 0) {
        result.children = children;
        result.size = children.length;
      }else{
        result.size = 1;
      }
      return result;
    });

    var dataTree = {"name" : this.activeThesaurus.name };
    dataTree.children = filteredTree;
    
    this.counter = 1;
    
    //orders the collection according to the tree
    this.findRank(dataTree);
    this.sort();
    //console.log(dataTree);
    this.conceptTree = dataTree;
    this.trigger("dataChanged");

  }

});