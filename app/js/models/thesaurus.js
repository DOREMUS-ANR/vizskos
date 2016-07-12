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
  thesaurusLoading : null,
  comparator: 'rank',
 thesauri : [{id : 'http://www.mimo-db.eu/InstrumentsKeywords',
    named_id: 'InstrumentsKeywords',
    pattern : 'http://www.mimo-db.eu/InstrumentsKeywords',
    endpoint : 'http://data.mimo-db.eu/sparql/describe?uri=',
    data: 'http://www.mimo-db.eu/data/InstrumentsKeywords.json',
    base: 'http://www.mimo-db.eu/',
    name : 'MIMO Thesaurus'},
    {id : 'http://www.mimo-db.eu/HornbostelAndSachs',
    named_id: 'HornbostelAndSachs',
    pattern : 'http://www.mimo-db.eu/HornbostelAndSachs',
    endpoint : 'http://data.mimo-db.eu/sparql/describe?uri=',
    data: 'http://www.mimo-db.eu/data/HornbostelAndSachs.json',
    base: 'http://www.mimo-db.eu/',
    name: 'Sachs & Hornbostel classification'}
  ], /*
  thesauri : [{id : 'http://pas-sages.org/doremus/peuples/',
    named_id: 'Peuples',
    pattern : 'http://data.bnf.fr/ark',
    endpoint : '',
    data: 'http://pas-sages.org/doremus/peuples/data/peuples.json',
    base: 'http://pas-sages.org/doremus/peuples/',
    name : 'Peuples preview extraction',
    multiple_parents : true}
  ],*//*
  thesauri : [{id : 'http://pas-sages.org/doremus/iaml/',
    named_id: 'iaml',
    pattern : 'http://data.doremus.org/vocabulary/iaml/',
    endpoint : '',
    data: 'http://pas-sages.org/doremus/data/iaml.json',
    base: 'http://data.doremus.org/vocabulary/',
    name : 'Medium of Performance IAML'},
    {id : 'http://pas-sages.org/doremus/derivation/',
    named_id: 'derivation',
    pattern : 'http://data.doremus.org/vocabulary/derivation/',
    endpoint : '',
    data: 'http://pas-sages.org/doremus/data/derivation.json',
    base: 'http://data.doremus.org/vocabulary/',
    name : 'Types de dérivation entre oeuvres'}
  ],*/
  viewTypes : [{id : 2, name : 'tree'},{ id : 1, name : 'circular tree'}],
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

  //return the active concept
  getActiveConcept : function getActiveConceptThesaurus(){
    var theconcept = this.models.filter(function(element){
      return element.attributes.uri === this.activeURI;
    }.bind(this));
    return theconcept[0] || null;
  },

  //return the active thesaurus
  getActiveThesaurus : function getActiveThesaurus(){
    var thesaurus = this.activeThesaurus || this.thesaurusLoading;
    thesaurus.prefLabel = [thesaurus.name];
    thesaurus.type =  "skos:ConceptScheme";
    thesaurus.uri = thesaurus.id;
    return thesaurus;
  },

  //get thesauri (and which one is selected)
  getThesauri : function getThesauriThesaurus(){
    var thesaurus = this.getActiveThesaurus();
    this.thesauri.forEach(function (element, index) {
      if(thesaurus && element.id === thesaurus.id) {
        element.selected = true;
      }else{
        element.selected = false;
      }
    });
    return this.thesauri;
  },


  //set selected thesaurus
  setActiveThesaurus : function setActiveThesaurus(thesaurus){
      this.activeThesaurus = thesaurus;
  },
  //get thesaurus with named id
  getThesaurusWithNamedId : function getThesaurusWithNamedId(named_id){
    return _.findWhere(this.thesauri, {'named_id' : named_id});
  },

  //set filter
  setFilter : function setFilterThesaurus(keyword){
    sessionStorage.setItem("filter", keyword);
  },
  //get filter
  getFilter : function getFilterThesaurus(){
    return sessionStorage.getItem("filter") || "";
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
    //console.log("viewType", this.getViewType(), Number(sessionStorage.getItem("viewType")), type, Number(sessionStorage.getItem("viewType"))=== type );
    var oldtype = this.getViewType();
    sessionStorage.setItem("viewType", type);
    if( oldtype !== type){
      this.trigger("viewTypeChanged", this);
    }

  },

  //get the kind of nav selected
  getViewType : function getViewTypeThesaurus(){
    var viewType = Number(sessionStorage.getItem("viewType")) || 2;
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

  findKeywordInElement : function findKeywordInElementThesaurus(keyword, elt){
    if( typeof elt === "string" ){
      keyword = new RegExp(keyword, 'i');
      if(elt.search(keyword) !== -1) return true;
    }else if (Array.isArray(elt)){
      for(str in elt){
        if(this.findKeywordInElement(keyword, str)) return true;
      }
    } else if(typeof elt === "object" ){
      for(str in elt){
        if(this.findKeywordInElement(keyword, str)) return true;
      }
    }
    return false;
  },

  filter : function filterThesaurus(keyword){

    this.models.map(function(element){
      if(this.findKeywordInElement(keyword, element.attributes.prefLabel)
        || this.findKeywordInElement(keyword, element.attributes.altLabel)
        || this.findKeywordInElement(keyword, element.attributes["skos:definition"])){
        element.attributes.filtered = true;
      }else{
        element.attributes.filtered = false;
      }
      return element;
    }.bind(this));
    this.trigger("filterChanged", this);
  },

  getFilteredNodes : function getFilteredNodes(){
    return this.models.filter(function(element){
      if(element.attributes.filtered) return true;
    });
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


          this.loadThesaurus(whichThesaurus[0].named_id);
        }else{
          this.trigger("conceptChanged", this);
        }
      }else{
        //else if URI is a concept, load it first (before loading full nav)
        this.loadURI(uri, whichThesaurus[0]);
      }
    }else{

      //if URI matches nothing, then load first thesaurus in the settings
      this.loadThesaurus(this.thesauri[0].named_id);
    }
  },

  //load a single URI
  loadURI : function loadURIThesaurus(uri, thesaurus){
    //if it is not already the current one
    if(uri != this.activeURI){
      this.activeURI = uri;
      this.trigger("conceptChanged", this);

      if(this.activeThesaurus === null || this.activeThesaurus.id !== thesaurus.id){

        this.thesaurusLoading = thesaurus;
        this.trigger("conceptChanged", this);
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
            this.loadThesaurus(thesaurus.named_id);
          }.bind(this));
        }).fail(function(error){
          //if loading uri fails, load full thesaurus
          this.loadThesaurus(thesaurus.named_id);
        });
      }
    }
  },
  //loads thesaurus
  loadThesaurus : function loadThesaurus(named_id){
    //callback once loaded
    var thesaurus = this.getThesaurusWithNamedId(named_id);
    this.thesaurusLoading = thesaurus;

    var loadingCompleted  = function (collection){

      //compacts json-ld (to avoid deep objects that are complicated to handle and sort)
      jsonld.compact(collection, this.context, function(err, compacted) {
        this.setActiveThesaurus(thesaurus);
        //inform listeners
        this.trigger("navChanged", this);
        //this.trigger("navLoaded", this);
        this.trigger("conceptChanged", this);
        //build the tree
        this.prepareData(compacted["@graph"]);
        //loading completed
        this.loaded = true;
        this.thesaurusLoading = null;
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
        //return typeof prefLabel === "string";
        return prefLabel["@language"] === "fr";
      });
      if(Array.isArray(name) && name[0]){
        name = name[0]["@value"];
      }else if(prefLabels[0] && typeof prefLabels[0] === "string"){
        name = prefLabels[0];
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

  getNameWithUri : function getNameWithUriThesaurus(uri){
    var themodel = this.models.filter(function (element){
      return element.attributes["@id"] === uri;
    });
    if(themodel[0]) return this.getName(themodel[0].attributes["skos:prefLabel"]);
    return uri;
  },

  //get children concepts of a concept
  getChildren : function getChildren(node){

    var that = this;
    //var children = node.attributes["skos:narrower"];
    return this.models.filter(function (element){
      return element.attributes["skos:broader"] &&
      (element.attributes["skos:broader"] === node["@id"] ||
      element.attributes["skos:broader"].includes(node["@id"]));

    }).map(function (childElement){
      var name = that.getName(childElement.attributes["skos:prefLabel"]);
      var children = that.getChildren(childElement.attributes);
      var result = { name : name,
        uri : childElement.attributes["@id"],
        id : childElement.attributes["id"],
        filtered: childElement.attributes.filtered};
      if(children.length > 0) {
        result.children = children;
        result.size = children.length;
      }else{
        result.size = 1;
      }
      return result;
    }).sort(that.sortThesaurus);

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
    var that = this;
    if(!dataObj) return false;
    dataObj.forEach(function(elt){
      //elt.rank = that.counter;
      //console.log(elt);
      var themodel = _.findWhere(that.models, {id : elt.id });
      //console.log(themodel);
      themodel.set('rank', that.counter);
      that.counter ++;
      if (elt.children) that.findRank(elt.children);

    })

  },

  sortThesaurus : function sortThesaurus (a, b){

    var nameA=a.name.toLowerCase(), nameB=b.name.toLowerCase();
        //console.log(nameA, nameB);
    return nameA.localeCompare(nameB);

  },

  //get parent concepts of a concept
  getParent : function getParentThesaurus(node, data){

    if(data.length === 1) return [];

    var parent = [];

    if(node && node["skos:broader"] ){
      var grandParent;
      var elementParent = data.filter(function (elt){
        return elt["@id"] === node["skos:broader"] ||
        node["skos:broader"].includes(elt["@id"]);
      });
      if(this.activeThesaurus.multiple_parents === true){
        parent = Array.isArray(node["skos:broader"]) ? node["skos:broader"] : [node["skos:broader"]];
      }else{
        if(elementParent[0] && elementParent[0].parents){
          grandParent = elementParent[0].parents;
        }else {
          grandParent =  this.getParent(elementParent, data);
        }
        if(grandParent.length>0){
          parent = grandParent;
        }
        parent = parent.concat([node["skos:broader"]]);
      }
    }
    //console.log(parent);
    return parent;

  },
  //once the data is loaded, prepares a tree for nav rendering
  prepareData: function prepareDataThesaurus(data){
    var that = this;

    this.provData = data;
    //add parent hierarchy
    var data = data.map(function(element){
      var parent = this.getParent(element, data);

      if(parent && parent.length>0){
        element.parents = parent;
      }
      return element;
    }.bind(this));

    if(this.models.length === 1){
      this.add(data);
    }else{
      this.reset(data);
    }

    if(this.models.length>1){

    //creates hierarchical tree for nav
      var filteredTree = this.models.filter(function(element){
        return element.attributes["skos:topConceptOf"] !== undefined || that.getName(element.attributes["skos:prefLabel"]).match(/^Ethnologie --/);
      })
      .map(function (element){
        var children = that.getChildren(element.attributes);
        var result = { name : that.getName(element.attributes["skos:prefLabel"]),
          uri : element.attributes["@id"],
          id : element.attributes["id"]};
        if(children.length > 0) {
          result.children = children;
          result.size = children.length;
        }else{
          result.size = 1;
        }
        return result;
      });

      var dataTree = this.getActiveThesaurus();
      dataTree.children = filteredTree;


      this.counter = 1;
      // dataTree = this.sortThesaurus(dataTree, 1);

      //orders the collection according to the tree
      this.findRank(dataTree.children);
      this.models = _.sortBy(this.models, function(elt){ return Number(elt.attributes.rank);});
      //console.log(this.counter, this.models);

      //console.log(dataTree);
      this.conceptTree = dataTree;
      this.trigger("dataChanged");
    }


  }

});
