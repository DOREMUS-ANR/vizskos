var application = require('./js/application');

document.VizSKOS = application;

document.addEventListener('DOMContentLoaded', function() {

	//create the app
  //application.initialize();

  //route the initial url
  Backbone.history.start({ pushState: true });

});

var Application = {

  initialize: function initializeApplication(params) {

  	var AppView = require('./views/app');
  	var Router = require('./routers/router');
  	var Thesaurus = require('./models/thesaurus');

    //create the collection of concepts
    this.collection = new Thesaurus([],{ thesauri: params.thesauri });

    //create the app view, with a reference to the collection and this application
    this.appView = new AppView({ el: "#" + params.id, collection : this.collection, attributes : { application: this }});

    //create the router, with a reference to the collection and this application
    this.router = new Router({collection : this.collection, attributes : { application: this }});

  },

  //fonction to handle the different kinds of URLs
  //note : backbone sends to the router only the part of the URL that comes after the domain
  //ex 1
  //the URL is "http://www.mimo-db.eu/uri=http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //the path is "uri=http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //ex 2
  //the URL is "http://localhost:3333/uri=http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //the path is "uri=http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //ex 3
  //the URL is "http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //the path is "InstrumentsKeywords/3305"
  //ex 4
  //the URL is "http://localhost:3333/http://www.mimo-db.eu/InstrumentsKeywords/3305"
  //the path is "http://www.mimo-db.eu/InstrumentsKeywords/3305"
  processUri : function processUriApplication(path){
    //path = "doremus/peuples/" + path;
    path = path;
    //if the path is the same as the location (ex 1)
    if(path.search(location.origin) !== -1){
      //replace it with example 3, more user friendly
      return path.replace(location.origin, "");
    //else if the path is not the same as the location
    }else {
      //if the path does not contain uri=, add it
      if(path.search("uri=http") === -1){
        return path.replace("http", "uri=http");
      //pass on the path
      }else{
        return path;
      }
    }
  }
};

module.exports = Application;

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
 /*thesauri : [{id : 'http://www.mimo-db.eu/InstrumentsKeywords',
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
  ],
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
    this.thesauri = options.thesauri;
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

var application = require('../application');
module.exports = Backbone.Router.extend({
    routes:{
      "" : "defaultRoute", /* showHome to use the Home template*/
      "about" : "showAbout",
      "*other"    : "defaultRoute"
    },

    showAbout: function showAbout( ) {
      //console.log("On aimerait afficher les infos ");

    },

    showHome: function showHome( ) {
      //
      application.appView.setPage('home');
      Backbone.history.checkUrl();
    },

    defaultRoute: function(other){
      if(!other) other ="";
      application.appView.setPage('thesaurus');
      //if other is defined, remove "uri=" to get the URI
      //other = other.replace("doremus/peuples/uri=", "") ;
      other = other.replace("uri=", "") ;
      //send the URI to the collection
      application.collection.setActiveURI(other);
      //update router
      Backbone.history.checkUrl();

    }

});

var View = require('./view');
var ConceptView = require('./concept');
var FooterView = require('./footer');
var HeaderView = require('./header');
var HomeView = require('./home');
var NavView = require('./nav');
var SelectNavView = require('./selectNav');

var _ = require('underscore');

module.exports = View.extend({


    template : require('./templates/main.hbs'),
    page: null,

    //if page has changed, render again
    setPage: function setPageApp(newPage) {
      if(newPage !== this.page){
      	this.page = newPage;
      	(this.$('article').length > 0) ? this.afterRender() : this.render();
      }
    },

    //after rendering
    afterRender: function afterRenderApp() {

     	if(this.page === 'home'){
     		this.headerView = new HeaderView({collection : this.collection, el: this.$('header .logo')}).render();
     		this.homeView = new HomeView({collection : this.collection, el: this.$('article')}).render();
     		this.footerView = new FooterView({collection : this.collection, el: this.$('footer')}).render();
     	}else if(this.page === 'thesaurus'){
      	this.headerView = new HeaderView({collection : this.collection, el: this.$('header .logo')}).render();
      	this.conceptView = new ConceptView({collection : this.collection, el: this.$('article')});
      	this.navView = new NavView({collection : this.collection, el: this.$('nav.nav')}).render();
      	this.selectNavView = new SelectNavView({collection : this.collection, el: this.$('header .tools') }).render();

      }
    }
});

var View = require('./view');
var application = require('../application');
require('./templates/helpers.js');

module.exports = View.extend({

    events: {
      'click .close': 'close',
      'click .link': 'activateLink',
      'click .next': 'next',
      'click .prev': 'prev'
    },

    template : require('./templates/concept.hbs'),

    //set up listeners
    afterInit: function afterInitConcept(){
      this.listenTo(this.collection, 'conceptChanged', this.render);
      this.listenTo(this.collection, 'conceptToggled', this.conceptToggled);
      this.listenTo(this.collection, 'dataChanged', this.render);
    },
    //get information to render the template
    getRenderData: function getConceptRenderData(){
      this.model = this.collection.getActiveConcept();
      return this.model ? $.extend({ language :'en' }, this.model.attributes) : this.collection.getActiveThesaurus();
    },
    //close the concept section
    close: function closeConcept(element) {
      this.collection.toggleConcept();
      element.preventDefault();
    },
    //show next concept
    next: function nextConcept(element) {
      var newmodel = this.model.getRelative(1);
      application.router.navigate(application.processUri(newmodel.attributes["@id"]), {trigger : true});
      element.preventDefault();
    },
    //show previous concept
    prev: function prevConcept(element) {
      var newmodel = this.model.getRelative(-1);
      application.router.navigate(application.processUri(newmodel.attributes["@id"]), {trigger : true});
      element.preventDefault();
    },
    //show / hide concept
    conceptToggled: function conceptToggledConcept(element) {
      if(this.collection.conceptClosed){
        this.$el.addClass("closed");
      }else{
        this.$el.removeClass("closed");
      }
    },
    // Open / reduce the concept section
    activateLink: function activateLinkConcept(element) {
      application.router.navigate(application.processUri($(element.currentTarget).attr("href")), {trigger : true});
      element.preventDefault();
    }
});

var View = require('./view');

module.exports = View.extend({
    template : require('./templates/footer.hbs'),
    // The DOM events specific to a concept.
    events: {
      'change #selectNav': 'selectNav',
    },
    //
    getRenderData: function getRenderDataFooter(){
      return{
      };
    },
    //
});

var View = require('./view');

module.exports = View.extend({
    template : require('./templates/header.hbs'),
    // The DOM events specific to a concept.
    events: {
      'change #selectNav': 'selectNav',
    },
    //
    getRenderData: function getRenderDataHeader(){
      return{
      };
    },
    //
});

var View = require('./view');

module.exports = View.extend({
    template : require('./templates/home.hbs'),

    events: {
      'mouseover .box': 'changeBackground',
    },
    //
    getRenderData: function getRenderDataHome(){
      return{};
    },
    //
    changeBackground: function changeBackgroundHome(event){
      this.$el.find(".home").css("backgroundImage", $(event.currentTarget).find("a").css("backgroundImage"));
    }
});

var View = require('./view');
var NavCircle = require('./navCircle');
var NavTree = require('./navTree');
module.exports = View.extend({

    // set up listeners
    afterInit: function afterInitNav(){
     
      this.listenTo(this.collection, 'viewTypeChanged', this.render);
      

    },
    
    // the nav does not render a handlebars template
    // instead it instanciates a new object to deal with d3js
    render: function renderNav() {
      this.$el.empty();
      if(this.collection.getViewType() === 1){
        this.navView = new NavCircle({collection : this.collection}).preRender();
      }else if(this.collection.getViewType() === 2){
        this.navView = new NavTree({collection : this.collection}).preRender();
      }

    }

});

var View = require('./view');
var application = require('../application');
module.exports = View.extend({

    // nav listens for changes in the collection.
    afterInit: function afterInitNav(){

      this.listenTo(this.collection, 'conceptChanged', this.showSelectedNode);
      this.listenTo(this.collection, 'dataChanged', this.dataChanged);

      $(window).on("resize", this.resize.bind(this));
      this.root = this.collection.conceptTree;
    },

    //initialize size variables
    //and apply them to svg elements
    setSize: function setSizeNav(){
      this.height = $(window).height() ;
      this.width = $(window).width() ;
      this.whiteRadius = 120;
      this.yRadius = (this.height - 40) / 2;
      this.xRadius = this.yRadius;
      this.rotate = 0;
      this.x = d3.scale.linear().range([0, this.width]);
      this.y = d3.scale.linear().range([0, this.height]);
      this.duration = 750;

      this.cluster
        .size([360, this.yRadius - this.whiteRadius]);

      this.svg
        .style("width", this.width + "px")
        .style("height", this.height + "px");

      this.vis
        .attr("width", this.width)
        .attr("height", this.height);
    },

    //
    resize: function resizeNav() {

      this.setSize();
      this.render(this.root);
    },

    //when new data are available
    dataChanged: function dataChanged() {
      //get them
      this.root = this.collection.conceptTree;
      //re-render
      if(this.root){
        this.root.x0 = this.height / 2;
        this.root.y0 = 0;

        this.preRender();
      }
    },

    //preRender - called when the object is created (ie when the type of nav changes)
    //or when new data are available
    //(but when nav is opened/closed render function is called directly)
    preRender: function preRenderNav() {
      //remove previous
      $("nav.nav").empty();

      //creates tree circular projection
      this.cluster = d3.layout.tree()
        .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
      this.diagonal = d3.svg.diagonal.radial()
        .projection( function(d) { return [d.y, d.x / 180 * Math.PI]; } );

      //main svg node
      this.svg = d3.select("#vizskos .nav");
      this.vis = this.svg.append("svg:svg");

      //node containing all other
      this.main = this.vis
        .append("svg:g")
          .attr("class", "main " + this.collection.getActiveThesaurus().named_id);

      //partition view
      this.partition = d3.layout.partition()
        .value(function(d) { return d.size; });

      //white circle (decorative)
      this.arc = this.main.append("svg:path")
        .attr("class", "arc");

      //apply size to elements
      this.setSize();

      //call render function
      if(this.root) this.render(this.root);

    },

    //render function
    //source is this.root
    render : function renderNav(source) {

      if(source !== undefined){

        var nodes = this.cluster.nodes(this.collection.conceptTree);
        var links = this.cluster.links(nodes);
        var whiteRadius = this.whiteRadius;

        this.main
            .attr("transform", "translate(" + (100 + this.xRadius ) + "," + (25 + this.yRadius) + ")");

        var node = this.main.selectAll("g.node").data(nodes);
        var link = this.main.selectAll("path.link").data(links);

        this.arc.attr("d", d3.svg.arc().innerRadius(this.yRadius - this.whiteRadius).outerRadius(this.yRadius).startAngle(0).endAngle(2 * Math.PI));

        var linkEnter = link.enter()
          .append("svg:path")
            .attr("class", "link")
            .attr("d", this.diagonal);

        var linkUpdate = link.transition()
          .duration(this.duration)
          .attr("d", this.diagonal);


        var linkExit = link.exit().transition()
          .duration(this.duration)
          .attr("transform", function(d,i) {return "rotate(" + (source.x - 90) + ")translate(" + (source.y ) + ")"; })
          .remove();

        var nodeEnter = node.enter()
          .append("svg:g")
            .attr("class", function(d) { return d.children ? "node parent node_" + d.id : "node child node_" + d.id; })
            .attr("transform", function(d,i) { return  "rotate(" + (source.x - 90) + ")translate(" + (source.y ) + ")"; });


        var nodeEnterCircle = nodeEnter.append("svg:circle")
          .attr("r", 4,5)
          .attr("class", function(d) { return d._children ? "children" : ""; })
          .on("mousedown", this.toggleNode.bind(this) );

        var nodeEnterLabel = nodeEnter.append("svg:text")
          .attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
          .attr("dy", ".31em")
          .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
          .attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
          .text(function(d) { return d.name; })
          .on("mousedown", this.selectNode.bind(this) );

        var nodeUpdate = node.transition()
          .duration(this.duration)
          .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y ) + ")"; });

        nodeUpdate.select("circle")
          .attr("class", function(d) { return d._children ? "children" : ""; });


        var nodeExit = node.exit()
          .transition()
            .duration(this.duration)
            .attr("transform", function(d) { return "rotate(" + (source.x - 90) + ")translate(" + (source.y ) + ")"; })
            .remove();

        nodeExit.select("circle")
          .attr("r", 1e-6);

        nodeExit.select("text")
          .style("fill-opacity", 1e-6);

        // Stash the old positions for transition.
        node.forEach(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });

        this.showSelectedNode();
      }
    },
    //open / close a branch of the tree
    toggleNode: function toggleNodeNav(d, i) {
      var depth = d.depth;
      console.log("?", depth);
      var open = (d._children) ? true : false;
      //open all nodes
      function toggleChildren (node){
        if(((!open && node.depth >= depth) ||(open && node.depth > depth +1) ) && node.children){
          node._children = node.children;
          node.children = null;
        }else if(((open && node.depth <= depth) ) && node._children){
          node.children = node._children;
          node._children = null;
        }
      }
      //goes through all children
      function toggleAllChildren (node){
        var children = node.children || node._children;
        if(children){
          for (var i = 0; i < children.length; i++){
            toggleChildren(children[i]);
            toggleAllChildren(children[i]);
          }
        }
      }

      toggleAllChildren(this.root);
      //

     this.render(this.root)
    },

    //highlight selected concept (listener conceptChanged)
    showSelectedNode: function showSelectedNodeNav(uri) {
      d3.select(".node.selected").classed("selected", false);
      var themodel = this.collection.getActiveConcept();
      if(themodel) d3.select(".node_"+ themodel.attributes.id).classed("selected", true);
    },

    //when a text concept is clicked
    selectNode: function selectNodeNav(d, i) {
      //send request to the router
      application.router.navigate(application.processUri(d.uri), {trigger : true});
      //backbone being smart enough not to trigger the route if concept already selected
      //we need to make sure the pop-up is open
      this.collection.toggleConcept(true);
      d3.event.stopPropagation();
    }

});

var View = require('./view');
var application = require('../application');
module.exports = View.extend({

    // nav listens for changes in the collection.
    afterInit: function afterInitNav(){
      this.listenTo(this.collection, 'conceptChanged', this.conceptChanged);
      this.listenTo(this.collection, 'dataChanged', this.dataChanged);
      $(window).on("resize", this.resize.bind(this));
      this.root = this.collection.conceptTree;
    },

    //init size variables
    initSize: function initSizeNav() {
      this.height = $(window).height();
      this.width = $(window).width() ;
      this.i = 0;
      this.duration = 750;
    },

    //apply size to svg elements
    setSize: function setSizeNav() {
      this.initSize();

      this.svg
        .style("width", this.width + "px")
        .style("height", this.height + "px");

      this.vis
        .attr("width", this.width)
        .attr("height", this.height);
    },


    dataChanged: function dataChanged() {
      this.root = this.collection.conceptTree;
      if(this.root){
        this.root.x0 = this.height / 2;
        this.root.y0 = 0;
        this.preRender();
      }
    },

    filterChanged: function filterChanged() {
      console.log("filterChanged");
      this.showFilteredNodes();
    },

    resize: function resizeNav() {
      this.setSize();
      this.render(this.root);
    },

    // Re-renders the titles of the todo item.
    preRender: function preRenderNav() {

        this.initSize();
        $("nav.nav").empty();
        this.tree = d3.layout.tree()
          .size([this.height, this.width]);
        //
        this.diagonal = d3.svg.diagonal()
          .projection( function(d) { return [d.y, d.x]; } );
        //
        this.svg = d3.select("nav.nav");
        //
        this.vis = this.svg.append("svg:svg");
        //
        this.main = this.vis
          .append("svg:g")
            .attr("class", "main " + this.collection.getActiveThesaurus().named_id);

        this.setSize();

        if(this.root) this.render(this.root);

    },
    //render the nav
    render : function renderNav(source) {

      if(source !== undefined){

      // Compute the new tree layout.
      var nodes = this.tree.nodes(this.root).reverse(),
          links = this.tree.links(nodes);

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { d.y = d.depth * 180; });

      // Update the nodes…
      var node = this.main.selectAll("g.node")
          .data(nodes, function(d) { return d.id || (d.id = ++this.i); });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("g")
          .attr("class", function(d){ return d.filtered ? "node node_"+d.id+" filtered": "node node_"+d.id; })
          .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
          .on("click", function(d) { this.selectNode(d); }.bind(this)); //d3.selectAll(".node").classed("selected", false); d3.select(".node_" + d.id).classed("selected", true);


      nodeEnter.append("circle")
          .attr("r", 1e-6)
          .attr("class", function(d) { return d._children ? "children" : ""; });
          //.on("click", this.toggleNode.bind(this));

      nodeEnter.append("text")
          .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
          .attr("dy", ".35em")
          .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
          .text(function(d) { return d.name; })
          .style("fill-opacity", 1e-6)


      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
          .duration(this.duration)
          .attr("class", function(d){ //return d.filtered ? "node node_"+d.id+" filtered": "node node_"+d.id;
            var themodel = this.collection.getActiveConcept();
            var id = (themodel) ? themodel.attributes.id : null;
            return (typeof id === "string" && id === d.id) ? "node node_"+d.id+" selected": "node node_"+d.id;
          }.bind(this))
          .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

      nodeUpdate.select("circle")
          .attr("r", 4.5)
          .attr("class", function(d) { return d._children ? "children" : ""; });

      nodeUpdate.select("text")
          .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
          .duration(this.duration)
          .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
          .remove();

      nodeExit.select("circle")
          .attr("r", 1e-6);

      nodeExit.select("text")
          .style("fill-opacity", 1e-6);

      // Update the links…
      var link = this.main.selectAll("path.link")
          .data(links, function(d) { return d.target.id; });

      var diagonal = this.diagonal;
      // Enter any new links at the parent's previous position.
      link.enter().insert("path", "g")
          .attr("class", "link")
          .attr("d", function(d) {
            var o = {x: source.x0, y: source.y0};
            return diagonal({source: o, target: o});
          });

      // Transition links to their new position.
      link.transition()
          .duration(this.duration)
          .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
          .duration(this.duration)
          .attr("d", function(d) {
            var o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o});
          })
          .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });

      }
    },
    //open / close a branch of the tree
    toggleNode: function toggleNodeNav(d) {
      //console.log(d);
      //open all nodes
      function toggleChildren (node, open){
        //console.log(node,open)
        if(!open && node.children){
          node._children = node.children;
          node.children = null;
        }else if(open && node._children){
          node.children = node._children;
          node._children = null;
        }
      }
      //open all children
      function openAllChildren (node){
        var children = node.children || node._children;
        if(children){
          for (var i = 0; i < children.length; i++){
            //console.log("element",node.children[i]);
            toggleChildren(children[i], true);
            openAllChildren(children[i]);
          }
        }
      }
      openAllChildren(this.root);
      //
      function closeSiblings(node){
        if (!node.parent) return;
        var siblings = node.parent.children;
        for (var i = 0; i < siblings.length; i++){
          if(siblings[i].uri !== node.uri){
            toggleChildren(siblings[i], false);
          }
        }
        closeSiblings(node.parent);
      }
      closeSiblings(d);
      this.render(this.root);
    },
    //
    findNode: function findNodeNav(node, uri) {
      var children = node.children || node._children;
      //console.log("enfants", children, uri)
      var that = this;
      var nodeFound;
      if(children){
        children.forEach(function(element){
          if(element.uri === uri) {
            nodeFound = element;
          }
          if(!nodeFound) nodeFound = that.findNode(element, uri);
        })
        return nodeFound;
      }
    },
     //highlight selected concept (listener conceptChanged)
    conceptChanged: function conceptChangedNav() {

      var themodel = this.collection.getActiveConcept();
      var id = (themodel) ? themodel.attributes.id : null;

      if(typeof id === "string") {
        var alreadySelected = d3.select(".node.node_" + id + ".selected");
        if(! alreadySelected[0][0] && d3.select(".node")[0][0]) {
          d3.selectAll(".node.selected").classed("selected", false);
          d3.select(".node_" + id).classed("selected", true);
          this.toggleNode(this.findNode(this.root, themodel.attributes.uri));
        }
      }
    },

    //when a text concept is clicked
    selectNode: function selectNodeNav(d, i) {
      //send request to the router
      application.router.navigate(application.processUri(d.uri), {trigger : true});

      //backbone being smart enough not to trigger the route if concept already selected
      //we need to make sure the pop-up is open
      this.collection.toggleConcept(true);

      d3.event.stopPropagation();
    }

});

var View = require('./view');
var application = require('../application');
module.exports = View.extend({
    
    template : require('./templates/selectNav.hbs'),
    // The DOM events specific to a concept.
    events: {
      'change #selectNav': 'selectNav',
      'change #selectThesaurus': 'selectThesaurus',
      'change #search': 'search',
    },
    //
    afterInit: function afterInitSelectNav(){
      this.listenTo(this.collection, 'dataChanged', this.render);
      this.listenTo(this.collection, 'viewTypeChanged', this.render);
    },
    //
    getRenderData: function getRenderDataSelectNav(){
      return{
        viewTypes : this.collection.getViewTypes(),
        thesauri : this.collection.getThesauri()
      };
    },
    //  
    selectNav: function selectNav(event) {      
      this.collection.setViewType(Number($(event.target).val()));
    },
    search: function selectNav(event) {
      this.collection.filter($(event.target).val());
    },
    //  
    selectThesaurus: function selectThesaurus(event) {      
      //this.collection.setActiveThesaurus($(event.target).val());
      //this.collection.loadThesaurus();
      var uri = this.collection.getThesaurusWithNamedId($(event.target).val()).id;
      application.router.navigate(application.processUri(uri), {trigger : true});
    }

});
var __templateData = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "    <nav>\n      <a class=\"prev\" href=\"/\"><</a>\n      <a class=\"next\" href=\"/\">></a>\n    </nav>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <h1>"
    + ((stack1 = (helpers.label_with_language || (depth0 && depth0.label_with_language) || helpers.helperMissing).call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.prefLabel : depth0),(depth0 != null ? depth0.language : depth0),{"name":"label_with_language","hash":{},"data":data})) != null ? stack1 : "")
    + "</h1>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <h2><code>skos:definition</code></h2>\n        <p class=\"definition\">"
    + ((stack1 = (helpers.translation_label || (depth0 && depth0.translation_label) || helpers.helperMissing).call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.conceptDefinition : depth0),{"name":"translation_label","hash":{},"data":data})) != null ? stack1 : "")
    + "</p>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},"prefLabel && concept",{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"8":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <h2><code>skos:prefLabel</code></h2>\n        <ul>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.prefLabel : depth0),{"name":"each","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ul>\n";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing;

  return "          <li>"
    + ((stack1 = (helpers.translation_label || (depth0 && depth0.translation_label) || alias2).call(alias1,depth0,{"name":"translation_label","hash":{},"data":data})) != null ? stack1 : "")
    + " ("
    + ((stack1 = (helpers.translation_language || (depth0 && depth0.translation_language) || alias2).call(alias1,depth0,{"name":"translation_language","hash":{},"data":data})) != null ? stack1 : "")
    + ")</li>\n";
},"11":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <h2><code>skos:altLabel</code></h2>\n        <ul>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.altLabel : depth0),{"name":"each","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ul>\n";
},"13":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <h2><code>skos:hasTopConcept</code></h2>\n        <ul>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.hasTopConcept : depth0),{"name":"each","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ul>\n";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda;

  return "            <li><a href=\""
    + ((stack1 = alias1(depth0, depth0)) != null ? stack1 : "")
    + "\" class=\"link\">"
    + ((stack1 = alias1(depth0, depth0)) != null ? stack1 : "")
    + "</a></li>\n";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <h2><code>skos:broader</code></h2>\n        <ul>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.parents : depth0),{"name":"each","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ul>\n";
},"17":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing;

  return "            <li class=\"parent_"
    + container.escapeExpression(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\"><a href=\""
    + ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "")
    + "\" class=\"link\">"
    + ((stack1 = (helpers.name_with_uri || (depth0 && depth0.name_with_uri) || alias2).call(alias1,depth0,{"name":"name_with_uri","hash":{},"data":data})) != null ? stack1 : "")
    + "</a></li>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <h2><code>skos:narrower</code></h2>\n        <ul>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.narrower : depth0),{"name":"each","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ul>\n";
},"20":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "          <li><a href=\""
    + ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "")
    + "\" class=\"link\">"
    + ((stack1 = (helpers.name_with_uri || (depth0 && depth0.name_with_uri) || helpers.helperMissing).call(depth0 != null ? depth0 : {},depth0,{"name":"name_with_uri","hash":{},"data":data})) != null ? stack1 : "")
    + "</a></li>\n";
},"22":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <h2><code>skos:exactMatch</code></h2>\n        <ul>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.exactMatch : depth0),{"name":"each","hash":{},"fn":container.program(23, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ul>\n";
},"23":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing;

  return "        	<li><a href=\""
    + ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "")
    + "\" "
    + ((stack1 = (helpers.is_internal_link || (depth0 && depth0.is_internal_link) || alias2).call(alias1,depth0,{"name":"is_internal_link","hash":{},"data":data})) != null ? stack1 : "")
    + ">"
    + ((stack1 = (helpers.name_with_uri || (depth0 && depth0.name_with_uri) || alias2).call(alias1,depth0,{"name":"name_with_uri","hash":{},"data":data})) != null ? stack1 : "")
    + "</a></li>\n";
},"25":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <h2><code>skos:closeMatch</code></h2>\n        <ul>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.closeMatch : depth0),{"name":"each","hash":{},"fn":container.program(26, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ul>\n";
},"26":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda;

  return "        	<li><a href=\""
    + ((stack1 = alias1(depth0, depth0)) != null ? stack1 : "")
    + "\" "
    + ((stack1 = (helpers.is_internal_link || (depth0 && depth0.is_internal_link) || helpers.helperMissing).call(depth0 != null ? depth0 : {},depth0,{"name":"is_internal_link","hash":{},"data":data})) != null ? stack1 : "")
    + ">"
    + ((stack1 = alias1(depth0, depth0)) != null ? stack1 : "")
    + "</a></li>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function";

  return "<div class=\"concept "
    + ((stack1 = ((helper = (helper = helpers.foldedClass || (depth0 != null ? depth0.foldedClass : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"foldedClass","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\">\n  <header class=\""
    + ((stack1 = ((helper = (helper = helpers.conceptSchemeClass || (depth0 != null ? depth0.conceptSchemeClass : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"conceptSchemeClass","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\">\n    <a class=\"close\" href=\"/\">X</a>\n    <p class=\"context\"><!--<a href=\""
    + ((stack1 = ((helper = (helper = helpers.conceptScheme || (depth0 != null ? depth0.conceptScheme : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"conceptScheme","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\" class=\"link\">--><span>ConceptScheme : "
    + ((stack1 = ((helper = (helper = helpers.conceptScheme || (depth0 != null ? depth0.conceptScheme : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"conceptScheme","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</span><!--</a>--></p>\n  </header>\n  <div class=\"body\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.concept : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    <hgroup>\n      <code>"
    + ((stack1 = ((helper = (helper = helpers.type || (depth0 != null ? depth0.type : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</code>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.prefLabel : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "      <p>"
    + ((stack1 = ((helper = (helper = helpers.uri || (depth0 != null ? depth0.uri : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"uri","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "</p>\n\n    </hgroup>\n    <detail>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.conceptDefinition : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.concept : depth0),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.altLabel : depth0),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.hasTopConcept : depth0),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.parents : depth0),{"name":"if","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.narrower : depth0),{"name":"if","hash":{},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.exactMatch : depth0),{"name":"if","hash":{},"fn":container.program(22, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.closeMatch : depth0),{"name":"if","hash":{},"fn":container.program(25, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    </detail>\n  </div>\n</div>\n";
},"useData":true});
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
;var __templateData = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<ul>\n	<li><a href=\"http://www.philharmoniedeparis.fr\" target=\"_blank\"><img src=\"images/logos/philharmonie.png\" alt=\"Philharmonie de Paris\" /></a></li>\n	<li><a href=\"http://www.ed.ac.uk\" target=\"_blank\"><img src=\"images/logos/edinburgh.png\" alt=\"The University of Edinburgh\" /></a></li>\n	<li><a href=\"http://www.gnm.de\" target=\"_blank\"><img src=\"images/logos/gnm.png\" alt=\"Germanisches National Museum\" /></a></li>\n	<li><a href=\"http://www.mim.be\" target=\"_blank\"><img src=\"images/logos/mim.png\" alt=\"Musik Instrumenten Museum\" /></a></li>\n	<li><a href=\"http://network.icom.museum/cimcim/\" target=\"_blank\"><img src=\"images/logos/icom.png\" alt=\"International Council of Museums\" /></a></li>\n</ul>";
},"useData":true});
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
;var __templateData = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<a href=\"/\"><img src=\"/images/logos/mimo.png\" alt=\"MIMO - Musical Instruments Museums Online\" /></a>\n<!--VIZKOS-->\n";
},"useData":true});
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
;var Handlebars = require("hbsfy/runtime");
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

});

Handlebars.registerHelper('translation_language', function(labelObject) {
	if (!labelObject) return;
	//specific to MIMO thesaurus, pivot language has no language attribute
	//(it's a convention, not a real language)
	if (typeof labelObject  === "string") return "pivot";
	return labelObject["@language"];
});

Handlebars.registerHelper('translation_label', function(labelObject) {
	if (!labelObject) return;
	//specific to MIMO thesaurus, pivot language has no language attribute
	//(it's a convention, not a real language)
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

Handlebars.registerHelper('name_with_uri', function(uri) {
	if (!uri) return;
	return application.collection.getNameWithUri(uri);
});

Handlebars.registerHelper('is_internal_link', function(uri) {
	if(!uri) return;
  	if(application.collection.matchAnyThesaurus(uri)){
  		return " class='link'";
  	}else{
  		return " target='_blank'";
  	}
});

var __templateData = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div class=\"home\" style=\"background:url('images/international1.jpg') left top no-repeat fixed;\">\n	<div class=\"box international\">\n		<a href=\"http://www.mimo-international.com/MIMO/\" style=\"background: url('images/international1.jpg') left top no-repeat fixed; \">\n			<div class=\"text\">\n				<h2>Museum collections</h2>\n				<p><span>Explore the world collections of musical instruments.</span></p>\n			</div>\n		</a>\n	</div>\n	<div class=\"box thesaurus\">\n		<a href=\"InstrumentsKeywords/\" style=\"background:url('images/vizskos.png')  left top no-repeat fixed;\">\n			<div class=\"text\">\n				<h2>Vocabulary</h2>\n				<p><span>Browse MIMO thesaurus and Hornbostel &amp; Sachs Classification using VIZSKOS, a SKOS data visualization tool.</span></p>\n			</div>\n		</a>\n	</div>\n	<div class=\"box admin\">\n		<a href=\"http://www.mimo-db.eu/mimo/infodoc/page-daccueil-infodoc.aspx?_lg=EN-en\" style=\"background:url('images/international3.jpg') left top no-repeat fixed; \">\n			<div class=\"text\">\n				<h2>Database</h2>\n				<p><span>Use MIMO-DB backoffice to administrate your collection and perform advanced search.</span></p>\n			</div>\n		</a>\n	</div>\n\n</div>";
},"useData":true});
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
;var __templateData = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<main class=\"main\">\n  <header>\n  	<div class=\"logo\"></div>\n  	<nav class=\"tools\"></nav>\n  </header>\n  \n  <nav class=\"nav\">\n    \n  </nav>\n  <article></article>\n</main>\n<footer></footer>";
},"useData":true});
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
;var __templateData = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "  		<option value=\""
    + alias4(((helper = (helper = helpers.named_id || (depth0 != null ? depth0.named_id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"named_id","hash":{},"data":data}) : helper)))
    + "\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.selected : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + " >"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</option>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return " selected=\"selected\" ";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "  		<option value=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.selected : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + " >"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</option>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<form>\n	<select id=\"selectThesaurus\" name=\"selectThesaurus\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.thesauri : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "	</select><br />\n	<select id=\"selectNav\" name=\"selectNav\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.viewTypes : depth0),{"name":"each","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "	</select>\n</form>\n<!--<br />\n	<input name=\"search\" id=\"search\" placeholder=\"Rechercher\" />-->\n";
},"useData":true});
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
;var _ = require('underscore');
var helpers = require('./templates/helpers');

module.exports = Backbone.View.extend({
  initialize: function initializeView() {
    _.bindAll(this, 'template', 'getRenderData', 'render', 'afterRender');
    this.afterInit();
  },
  afterInit: function afterInitView() {},
  template: function templateView() {},
  getRenderData: function getRenderDataView() {},

  render: function renderView() {
    this.$el.empty();
    this.$el.html(this.template(this.getRenderData()));
    _.defer(this.afterRender); //setTimeOut(0)
  },

  afterRender: function afterRenderView() {}
});


//# sourceMappingURL=app.js.map