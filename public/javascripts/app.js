(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var application = require('./js/application');

$(function() {

	//create the app
  	application.initialize();
  	
  	//route the initial url
  	Backbone.history.start({ pushState: true });
  	
});
},{"./js/application":2}],2:[function(require,module,exports){
var Application = {

  initialize: function initializeApplication() {
   
  	var AppView = require('./views/app');
  	var Router = require('./routers/router');
  	var Thesaurus = require('./models/thesaurus');
    
    //create the collection of concepts 
    this.collection = new Thesaurus();
    
    //create the app view, with a reference to the collection and this application
    this.appView = new AppView({collection : this.collection, attributes : { application: this }});
    
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
},{"./models/thesaurus":4,"./routers/router":5,"./views/app":6}],3:[function(require,module,exports){
module.exports = Backbone.Model.extend({

  // Default
  defaults: {
    concept : true
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
    var scheme = this.collection.getActiveThesaurus().name;
    this.set('conceptSchemeName', scheme.name);
    this.set('conceptSchemeClass', scheme.class);
    
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
},{}],4:[function(require,module,exports){
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
  thesauri : [
    {'id' : 'http://www.mimo-db.eu/InstrumentsKeywords', 'named_id': 'InstrumentsKeywords', 'pattern' : 'http://www.mimo-db.eu/InstrumentsKeywords', 'endpoint' : 'http://data.mimo-db.eu:9091/sparql/describe?uri=', 'data': 'http://www.mimo-db.eu/data/InstrumentsKeywords.json', 'base': 'http://www.mimo-db.eu/', 'name' : 'MIMO Thesaurus'},
    {'id' : 'http://www.mimo-db.eu/HornbostelAndSachs', 'named_id': 'HornbostelAndSachs', 'pattern' : 'http://www.mimo-db.eu/HornbostelAndSachs', 'endpoint' : 'http://data.mimo-db.eu:9091/sparql/describe?uri=', 'data': 'http://www.mimo-db.eu/data/HornbostelAndSachs.json', 'base': 'http://www.mimo-db.eu/', 'name': 'Sachs & Hornbostel classification'}
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
    //console.log(thesaurus, this.activeThesaurus, this.thesaurusLoading);
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
    console.log("viewType", this.getViewType(), Number(sessionStorage.getItem("viewType")), type, Number(sessionStorage.getItem("viewType"))=== type );
    var oldtype = this.getViewType();
    sessionStorage.setItem("viewType", type);
    if( oldtype !== type){
      
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
      console.log("essai n°3", thesaurus.data)
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

    if(this.models.length === 1){
      this.add(data);
    }else{
      this.reset(data); 
    }

    if(this.models.length>1){
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

      var dataTree = {"name" : this.getActiveThesaurus().name };
      dataTree.children = filteredTree;
      
      this.counter = 1;
      
      //orders the collection according to the tree
      this.findRank(dataTree);
      this.sort();
      //console.log(dataTree);
      this.conceptTree = dataTree;
      this.trigger("dataChanged");
    }
  }

});
},{"../application":2,"./concept":3,"jsonld":35}],5:[function(require,module,exports){
var application = require('../application');
module.exports = Backbone.Router.extend({
    routes:{
      "" : "showHome",
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
      other = other.replace("uri=", "") ;
      //send the URI to the collection
      application.collection.setActiveURI(other);
      //update router
      Backbone.history.checkUrl();
      
    }

});
},{"../application":2}],6:[function(require,module,exports){
var View = require('./view');
var ConceptView = require('./concept');
var FooterView = require('./footer');
var HeaderView = require('./header');
var HomeView = require('./home');
var NavView = require('./nav');
var SelectNavView = require('./selectNav');

var _ = require('underscore');

module.exports = View.extend({
    
    el: '#vizskos',
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
},{"./concept":7,"./footer":8,"./header":9,"./home":10,"./nav":11,"./selectNav":14,"./templates/main.hbs":20,"./view":22,"underscore":38}],7:[function(require,module,exports){
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
},{"../application":2,"./templates/concept.hbs":15,"./templates/helpers.js":18,"./view":22}],8:[function(require,module,exports){
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
},{"./templates/footer.hbs":16,"./view":22}],9:[function(require,module,exports){
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
},{"./templates/header.hbs":17,"./view":22}],10:[function(require,module,exports){
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

    changeBackground: function changeBackgroundHome(event){
      this.$el.find(".home").css("backgroundImage", $(event.currentTarget).find("a").css("backgroundImage"));
    }
  

});
},{"./templates/home.hbs":19,"./view":22}],11:[function(require,module,exports){
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
        this.navView = new NavCircle({collection : this.collection}).render();
      }else if(this.collection.getViewType() === 2){
        this.navView = new NavTree({collection : this.collection}).render();
      }

    }

});

},{"./navCircle":12,"./navTree":13,"./view":22}],12:[function(require,module,exports){
var View = require('./view');
var application = require('../application');
module.exports = View.extend({
    events: {
      'scroll': 'zoom',
    },
    changeScale: function zoomNav() {
      //this.main.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    },
    initSize: function initSizeNav() {
      this.height = $(window).height() ;
      this.width = $(window).width() ;
      this.whiteRadius = 120;
      this.yRadius = (this.height - 40) / 2;
      this.xRadius = this.yRadius;
      this.rotate = 0;
      this.x = d3.scale.linear().range([0, this.width]),
      this.y = d3.scale.linear().range([0, this.height]);
      this.duration = 750;
    },
    setSize: function setSizeNav(){
      this.initSize();
      
      this.cluster
        .size([360, this.yRadius - this.whiteRadius]);

      this.svg
        .style("width", this.width + "px")
        .style("height", this.height + "px");

      this.vis
        .attr("width", this.width)
        .attr("height", this.height);
    },
    resize: function resizeNav() {
      
      this.setSize();
      this.render(this.root);
    },

    // The NavView listens for changes to its model, re-rendering.
    afterInit: function afterInitNav(){
      this.preRender();
      this.listenTo(this.collection, 'conceptChanged', this.showSelectedNode);
      this.listenTo(this.collection, 'dataChanged', this.dataChanged);

      $(window).on("resize", this.resize.bind(this));
      
    },
    dataChanged: function dataChanged() {
      this.root = this.collection.conceptTree;
      if(this.root){
        this.root.x0 = this.height / 2;
        this.root.y0 = 0;

        this.preRender();
      }
    },
    // Re-renders the titles of the todo item.
    preRender: function preRenderNav() {
      
      //if(this.collection.loaded){
     
        this.cluster = d3.layout.tree()
          .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
   
        //
        this.diagonal = d3.svg.diagonal.radial()
          .projection( function(d) { return [d.y, d.x / 180 * Math.PI]; } );
        //
        
        this.svg = d3.select("#vizskos .nav");
        //this.svg.empty();
        this.vis =  d3.select("#vizskos .nav svg");
        if(this.vis) this.vis.remove();

        this.vis = this.svg.append("svg:svg");
        //
        this.main = this.vis
          .append("svg:g")
            .attr("class", "main " + this.collection.getActiveThesaurus().named_id);

        //partition view
        this.partition = d3.layout.partition()
          .value(function(d) { return d.size; });

        this.zoom = d3.behavior.zoom()
          .on("zoom", this.changeScale.bind(this));
        
        this.arc = this.main.append("svg:path")
          .attr("class", "arc");

        this.setSize();
        

        if(this.root) this.render(this.root);
        
        
      //}
     
    },
    render : function renderNav(source) {
      
      if(source !== undefined){
      
      //console.log("la source", source, source.x, Number.isNaN(source.x));
     

        var nodes = this.cluster.nodes(this.collection.conceptTree);
        var links = this.cluster.links(nodes);
        var whiteRadius = this.whiteRadius;

        this.main
            .attr("transform", "translate(" + (100 + this.xRadius ) + "," + (25 + this.yRadius) + ")");

        //this.main.call(this.zoom);

        var node = this.main.selectAll("g.node").data(nodes);
        var link = this.main.selectAll("path.link").data(links);
        
        this.arc.attr("d", d3.svg.arc().innerRadius(this.yRadius - this.whiteRadius).outerRadius(this.yRadius).startAngle(0).endAngle(2 * Math.PI));

         var linkUpdate = link.transition()
          .duration(this.duration)
          .attr("d", this.diagonal);

        var linkEnter = link.enter()
          .append("svg:path")
            .attr("class", "link")
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
      if (d.children) {
        d._children = d.children;
        d.children = null;              
      } else {
        d.children = d._children;
        d._children = null;
      }
      this.render(d);
    },
    //highlight selected node (listener conceptChanged)
    showSelectedNode: function showSelectedNodeNav(uri) {
      d3.select(".node.selected").classed("selected", false);
      var themodel = this.collection.getActiveConcept();
      if(themodel) d3.select(".node_"+ themodel.attributes.id).classed("selected", true);
    },
    //when a node is clicked
    selectNode: function selectNodeNav(d, i) {
      //send request to the router
      application.router.navigate(application.processUri(d.uri), {trigger : true});
      //backbone being smart enough not to trigger the route if concept already selected
      //we need to make sure the pop-up is open
      if(this.collection.getActiveConcept().id == d.uri) {
        this.collection.toggleConcept(true);
      }
      d3.event.stopPropagation();
    }

});

},{"../application":2,"./view":22}],13:[function(require,module,exports){
var View = require('./view');
var application = require('../application');
module.exports = View.extend({

    //gets window size
    initSize: function initSizeNav() {
      this.height = $(window).height();
      this.width = $(window).width() ;
      this.i = 0;
      this.duration = 750;
    },

    //
    setSize: function setSizeNav() {
      this.initSize();
 
      this.svg
        .style("width", this.width + "px")
        .style("height", this.height + "px");

      this.vis
        .attr("width", this.width)
        .attr("height", this.height);

    },

    // The NavView listens for changes to its model, re-rendering.
    afterInit: function afterInitNav(){
      this.preRender();
      
      this.listenTo(this.collection, 'conceptChanged', this.showSelectedNode);
      this.listenTo(this.collection, 'dataChanged', this.dataChanged);

      $(window).on("resize", this.resize.bind(this));
      

    },
    dataChanged: function dataChanged() {
      this.root = this.collection.conceptTree;
      if(this.root){
        source.x0 = this.height / 2;
        source.y0 = 0;
        this.preRender();
        
      }
    },
    resize: function resizeNav() {
      
      this.setSize();
      this.render(this.root);
    },
    // Re-renders the titles of the todo item.
    preRender: function preRenderNav() {
      console.log("isloaded", this.collection.loaded);
      //if(this.collection.loaded){

        this.initSize();
       
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
            .attr("class", "main " + this.collection.activeThesaurus);  

        this.setSize();
     
        if(this.root) this.render(this.root);

       
      //}
 
    },
    //render the nav
    render : function renderNav(source) {
      if(source !== undefined){
      
      //if(this.collection.loaded){
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
          .attr("class", function(d){ return "node node_"+d.id; })
          .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; });

      nodeEnter.append("circle")
          .attr("r", 1e-6)
          .attr("class", function(d) { return d._children ? "children" : ""; })
          .on("click", this.toggleNode.bind(this));

      nodeEnter.append("text")
          .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
          .attr("dy", ".35em")
          .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
          .text(function(d) { return d.name; })
          .style("fill-opacity", 1e-6)
          .on("click", this.selectNode.bind(this));

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
          .duration(this.duration)
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

       this.showSelectedNode();

      }
    },
    //open / close a branch of the tree
    toggleNode: function toggleNodeNav(d, i) {
      if (d.children) {
        d._children = d.children;
        d.children = null;              
      } else {
        d.children = d._children;
        d._children = null;
      }
      this.render(d);
    },
    showSelectedNode: function showSelectedNodeNav(uri) {
      //if(this.collection.loaded){
        d3.select(".node.selected").classed("selected", false);
        var themodel = this.collection.getActiveConcept();
        if(themodel) d3.select(".node_"+ themodel.attributes.id).classed("selected", true);
      //}
    },
    selectNode: function selectNodeNav(d, i) {
      //send request to the router
      application.router.navigate(application.processUri(d.uri), {trigger : true});
      //backbone being smart enough not to trigger the route if concept already selected
      //we need to make sure the pop-up is open
      if(this.collection.getActiveConcept().id == d.uri) {
        this.collection.toggleConcept(true);
      }
      d3.event.stopPropagation();
    }

});

},{"../application":2,"./view":22}],14:[function(require,module,exports){
var View = require('./view');
var application = require('../application');
module.exports = View.extend({
    
    template : require('./templates/selectNav.hbs'),
    // The DOM events specific to a concept.
    events: {
      'change #selectNav': 'selectNav',
      'change #selectThesaurus': 'selectThesaurus',
    },
    //
    afterInit: function afterInitSelectNav(){
      this.listenTo(this.collection, 'dataChanged', this.render);
      this.listenTo(this.collection, 'viewTypeChanged', this.render);
      this.listenTo(this.collection, 'thesaurusChanged', this.render);
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
    //  
    selectThesaurus: function selectThesaurus(event) {      
      //this.collection.setActiveThesaurus($(event.target).val());
      //this.collection.loadThesaurus();
      var uri = this.collection.getThesaurusWithNamedId($(event.target).val()).id;
      application.router.navigate(application.processUri(uri), {trigger : true});
    }

});
},{"../application":2,"./templates/selectNav.hbs":21,"./view":22}],15:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, helperMissing=helpers.helperMissing, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  
  return "\n    <nav>\n      <a class=\"prev\" href=\"/\"><</a>\n      <a class=\"next\" href=\"/\">></a>      \n    </nav>\n    ";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n        <h1>";
  stack1 = (helper = helpers.label_with_language || (depth0 && depth0.label_with_language),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.prefLabel), (depth0 && depth0.language), options) : helperMissing.call(depth0, "label_with_language", (depth0 && depth0.prefLabel), (depth0 && depth0.language), options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h1>\n      ";
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n        <h2><code>skos:definition</code></h2>\n        <p class=\"definition\">";
  stack1 = (helper = helpers.translation_label || (depth0 && depth0.translation_label),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0['skos:definition']), options) : helperMissing.call(depth0, "translation_label", (depth0 && depth0['skos:definition']), options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n      ";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, "prefLabel && concept", {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  return buffer;
  }
function program8(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <h2><code>skos:prefLabel</code></h2>\n        <ul>\n        ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.prefLabel), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      ";
  return buffer;
  }
function program9(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n          <li>";
  stack1 = (helper = helpers.translation_label || (depth0 && depth0.translation_label),options={hash:{},data:data},helper ? helper.call(depth0, depth0, options) : helperMissing.call(depth0, "translation_label", depth0, options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " (";
  stack1 = (helper = helpers.translation_language || (depth0 && depth0.translation_language),options={hash:{},data:data},helper ? helper.call(depth0, depth0, options) : helperMissing.call(depth0, "translation_language", depth0, options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ")</li>\n        ";
  return buffer;
  }

function program11(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <h2><code>skos:altLabel</code></h2>\n        <ul>\n        ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.altLabel), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      ";
  return buffer;
  }

function program13(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <h2><code>skos:hasTopConcept</code></h2>\n        <ul>\n          ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.hasTopConcept), {hash:{},inverse:self.noop,fn:self.program(14, program14, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      ";
  return buffer;
  }
function program14(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <li><a href=\"";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" class=\"link\">";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</a></li>\n          ";
  return buffer;
  }

function program16(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <h2><code>skos:broader</code></h2>\n        <ul>\n          ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.parents), {hash:{},inverse:self.noop,fn:self.program(17, program17, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      ";
  return buffer;
  }
function program17(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <li class=\"parent_"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.index)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"><a href=\"";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" class=\"link\">";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</a></li>\n          ";
  return buffer;
  }

function program19(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <h2>Children <code>skos:narrower</code></h2>\n        <ul>\n        ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.narrower), {hash:{},inverse:self.noop,fn:self.program(20, program20, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      ";
  return buffer;
  }
function program20(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n          <li><a href=\"";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" class=\"link\">";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</a></li>\n        ";
  return buffer;
  }

function program22(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <h2><code>skos:exactMatch</code></h2>\n        <ul>\n      	";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.exactMatch), {hash:{},inverse:self.noop,fn:self.program(23, program23, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      ";
  return buffer;
  }
function program23(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n        	<li><a href=\"";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" ";
  stack1 = (helper = helpers.is_internal_link || (depth0 && depth0.is_internal_link),options={hash:{},data:data},helper ? helper.call(depth0, depth0, options) : helperMissing.call(depth0, "is_internal_link", depth0, options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</a></li>\n     	 	";
  return buffer;
  }

function program25(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <h2><code>skos:closeMatch</code></h2>\n        <ul>\n      	";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.closeMatch), {hash:{},inverse:self.noop,fn:self.program(23, program23, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      ";
  return buffer;
  }

  buffer += "<div class=\"concept ";
  if (helper = helpers.foldedClass) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.foldedClass); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n  <header class=\"";
  if (helper = helpers.conceptSchemeClass) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.conceptSchemeClass); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n    <a class=\"close\" href=\"/\">X</a>\n    <p class=\"context\"><a href=\"";
  if (helper = helpers.conceptScheme) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.conceptScheme); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" class=\"link\">";
  if (helper = helpers.conceptScheme) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.conceptScheme); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</a></p>\n  </header>\n  <div class=\"body\">\n    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.concept), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <hgroup>\n      <code>";
  if (helper = helpers.type) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.type); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</code>\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.prefLabel), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      <p>";
  if (helper = helpers.uri) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.uri); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n\n    </hgroup>\n    <detail>\n\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0['skos:definition']), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.concept), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.altLabel), {hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.hasTopConcept), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.parents), {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.narrower), {hash:{},inverse:self.noop,fn:self.program(19, program19, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.exactMatch), {hash:{},inverse:self.noop,fn:self.program(22, program22, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.closeMatch), {hash:{},inverse:self.noop,fn:self.program(25, program25, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n    </detail>\n  </div>\n</div>";
  return buffer;
  });

},{"hbsfy/runtime":33}],16:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<ul>\n	<li><a href=\"http://www.philharmoniedeparis.fr\" target=\"_blank\"><img src=\"images/logos/philharmonie.png\" alt=\"Philharmonie de Paris\" /></a></li>\n	<li><a href=\"http://www.ed.ac.uk\" target=\"_blank\"><img src=\"images/logos/edinburgh.png\" alt=\"The University of Edinburgh\" /></a></li>\n	<li><a href=\"http://www.gnm.de\" target=\"_blank\"><img src=\"images/logos/gnm.png\" alt=\"Germanisches National Museum\" /></a></li>\n	<li><a href=\"http://www.mim.be\" target=\"_blank\"><img src=\"images/logos/mim.png\" alt=\"Musik Instrumenten Museum\" /></a></li>\n	<li><a href=\"http://network.icom.museum/cimcim/\" target=\"_blank\"><img src=\"images/logos/icom.png\" alt=\"International Council of Museums\" /></a></li>\n</ul>";
  });

},{"hbsfy/runtime":33}],17:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<a href=\"/\"><img src=\"/images/logos/mimo.png\" alt=\"MIMO - Musical Instruments Museums Online\" /></a>";
  });

},{"hbsfy/runtime":33}],18:[function(require,module,exports){
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

Handlebars.registerHelper('is_internal_link', function(uri) {
	if(!uri) return;
  	if(application.collection.matchAnyThesaurus(uri)){
  		return " class='link'";
  	}else{
  		return " target='_blank'";
  	}
});
},{"../../application":2,"hbsfy/runtime":33}],19:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"home\" style=\"background:url('images/international1.jpg') left top no-repeat fixed;\">\n	<div class=\"box international\">\n		<a href=\"http://www.mimo-international.com/MIMO/\" style=\"background: url('images/international1.jpg') left top no-repeat fixed; \">\n			<div class=\"text\">\n				<h2>MIMO International</h2>\n				<p><span>Explore the world collections of musical instruments. More than 55000 instruments...</span></p>\n			</div>\n		</a>\n	</div>\n	<div class=\"box thesaurus\">\n		<a href=\"InstrumentsKeywords/\" style=\"background:url('images/vizskos.png')  left top no-repeat fixed;\">\n			<div class=\"text\">\n				<h2>VIZSKOS</h2>\n				<p><span>View MIMO thesaurus and Hornbostel &amp; Sachs classiffication in SKOS</span></p>\n			</div>\n		</a>\n	</div>\n	<div class=\"box admin\">\n		<a href=\"http://www.mimo-db.eu/mimo/infodoc/page-daccueil-infodoc.aspx?_lg=EN-en\" style=\"background:url('images/international3.jpg') left top no-repeat fixed; \">\n			<div class=\"text\">\n				<h2>MIMO DB</h2>\n				<p><span>MIMO admin</span></p>\n			</div>\n		</a>\n	</div>\n\n</div>";
  });

},{"hbsfy/runtime":33}],20:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<main class=\"main\">\n  <header>\n  	<div class=\"logo\"></div>\n  	<nav class=\"tools\"></nav>\n  </header>\n  \n  <nav class=\"nav\">\n    \n  </nav>\n  <article></article>\n</main>\n<footer></footer>";
  });

},{"hbsfy/runtime":33}],21:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  		<option value=\"";
  if (helper = helpers.named_id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.named_id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.selected), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " >";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</option>\n	";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return " selected=\"selected\" ";
  }

function program4(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  		<option value=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.selected), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " >";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</option>\n	";
  return buffer;
  }

  buffer += "<form>\n	<select id=\"selectThesaurus\" name=\"selectThesaurus\">\n	";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.thesauri), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n	</select><br />\n	<select id=\"selectNav\" name=\"selectNav\">\n	";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.viewTypes), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n	</select>\n	<!--<input name=\"search\" id=\"search\" placeholder=\"Rechercher\" />-->\n</form>";
  return buffer;
  });

},{"hbsfy/runtime":33}],22:[function(require,module,exports){
var _ = require('underscore');
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
},{"./templates/helpers":18,"underscore":38}],23:[function(require,module,exports){

},{}],24:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("sfauuP"))
},{"sfauuP":25}],25:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],26:[function(require,module,exports){
"use strict";
/*globals Handlebars: true */
var base = require("./handlebars/base");

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)
var SafeString = require("./handlebars/safe-string")["default"];
var Exception = require("./handlebars/exception")["default"];
var Utils = require("./handlebars/utils");
var runtime = require("./handlebars/runtime");

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
var create = function() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = SafeString;
  hb.Exception = Exception;
  hb.Utils = Utils;

  hb.VM = runtime;
  hb.template = function(spec) {
    return runtime.template(spec, hb);
  };

  return hb;
};

var Handlebars = create();
Handlebars.create = create;

exports["default"] = Handlebars;
},{"./handlebars/base":27,"./handlebars/exception":28,"./handlebars/runtime":29,"./handlebars/safe-string":30,"./handlebars/utils":31}],27:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "1.3.0";
exports.VERSION = VERSION;var COMPILER_REVISION = 4;
exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};
exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

exports.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function(name, fn, inverse) {
    if (toString.call(name) === objectType) {
      if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
      Utils.extend(this.helpers, name);
    } else {
      if (inverse) { fn.not = inverse; }
      this.helpers[name] = fn;
    }
  },

  registerPartial: function(name, str) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials,  name);
    } else {
      this.partials[name] = str;
    }
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function(arg) {
    if(arguments.length === 2) {
      return undefined;
    } else {
      throw new Exception("Missing helper: '" + arg + "'");
    }
  });

  instance.registerHelper('blockHelperMissing', function(context, options) {
    var inverse = options.inverse || function() {}, fn = options.fn;

    if (isFunction(context)) { context = context.call(this); }

    if(context === true) {
      return fn(this);
    } else if(context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if(context.length > 0) {
        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      return fn(context);
    }
  });

  instance.registerHelper('each', function(context, options) {
    var fn = options.fn, inverse = options.inverse;
    var i = 0, ret = "", data;

    if (isFunction(context)) { context = context.call(this); }

    if (options.data) {
      data = createFrame(options.data);
    }

    if(context && typeof context === 'object') {
      if (isArray(context)) {
        for(var j = context.length; i<j; i++) {
          if (data) {
            data.index = i;
            data.first = (i === 0);
            data.last  = (i === (context.length-1));
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) { 
              data.key = key; 
              data.index = i;
              data.first = (i === 0);
            }
            ret = ret + fn(context[key], {data: data});
            i++;
          }
        }
      }
    }

    if(i === 0){
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function(conditional, options) {
    if (isFunction(conditional)) { conditional = conditional.call(this); }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function(conditional, options) {
    return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
  });

  instance.registerHelper('with', function(context, options) {
    if (isFunction(context)) { context = context.call(this); }

    if (!Utils.isEmpty(context)) return options.fn(context);
  });

  instance.registerHelper('log', function(context, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, context);
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 3,

  // can be overridden in the host environment
  log: function(level, obj) {
    if (logger.level <= level) {
      var method = logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};
exports.logger = logger;
function log(level, obj) { logger.log(level, obj); }

exports.log = log;var createFrame = function(object) {
  var obj = {};
  Utils.extend(obj, object);
  return obj;
};
exports.createFrame = createFrame;
},{"./exception":28,"./utils":31}],28:[function(require,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var line;
  if (node && node.firstLine) {
    line = node.firstLine;

    message += ' - ' + line + ':' + node.firstColumn;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (line) {
    this.lineNumber = line;
    this.column = node.firstColumn;
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],29:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];
var COMPILER_REVISION = require("./base").COMPILER_REVISION;
var REVISION_CHANGES = require("./base").REVISION_CHANGES;

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = REVISION_CHANGES[currentRevision],
          compilerVersions = REVISION_CHANGES[compilerRevision];
      throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Exception("No environment passed to template");
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  var invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
    var result = env.VM.invokePartial.apply(this, arguments);
    if (result != null) { return result; }

    if (env.compile) {
      var options = { helpers: helpers, partials: partials, data: data };
      partials[name] = env.compile(partial, { data: data !== undefined }, env);
      return partials[name](context, options);
    } else {
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    }
  };

  // Just add water
  var container = {
    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,
    programs: [],
    program: function(i, fn, data) {
      var programWrapper = this.programs[i];
      if(data) {
        programWrapper = program(i, fn, data);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = program(i, fn);
      }
      return programWrapper;
    },
    merge: function(param, common) {
      var ret = param || common;

      if (param && common && (param !== common)) {
        ret = {};
        Utils.extend(ret, common);
        Utils.extend(ret, param);
      }
      return ret;
    },
    programWithDepth: env.VM.programWithDepth,
    noop: env.VM.noop,
    compilerInfo: null
  };

  return function(context, options) {
    options = options || {};
    var namespace = options.partial ? options : env,
        helpers,
        partials;

    if (!options.partial) {
      helpers = options.helpers;
      partials = options.partials;
    }
    var result = templateSpec.call(
          container,
          namespace, context,
          helpers,
          partials,
          options.data);

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  };
}

exports.template = template;function programWithDepth(i, fn, data /*, $depth */) {
  var args = Array.prototype.slice.call(arguments, 3);

  var prog = function(context, options) {
    options = options || {};

    return fn.apply(this, [context, options.data || data].concat(args));
  };
  prog.program = i;
  prog.depth = args.length;
  return prog;
}

exports.programWithDepth = programWithDepth;function program(i, fn, data) {
  var prog = function(context, options) {
    options = options || {};

    return fn(context, options.data || data);
  };
  prog.program = i;
  prog.depth = 0;
  return prog;
}

exports.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
  var options = { partial: true, helpers: helpers, partials: partials, data: data };

  if(partial === undefined) {
    throw new Exception("The partial " + name + " could not be found");
  } else if(partial instanceof Function) {
    return partial(context, options);
  }
}

exports.invokePartial = invokePartial;function noop() { return ""; }

exports.noop = noop;
},{"./base":27,"./exception":28,"./utils":31}],30:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],31:[function(require,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = require("./safe-string")["default"];

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr] || "&amp;";
}

function extend(obj, value) {
  for(var key in value) {
    if(Object.prototype.hasOwnProperty.call(value, key)) {
      obj[key] = value[key];
    }
  }
}

exports.extend = extend;var toString = Object.prototype.toString;
exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
var isFunction = function(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
if (isFunction(/x/)) {
  isFunction = function(value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
var isArray = Array.isArray || function(value) {
  return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
};
exports.isArray = isArray;

function escapeExpression(string) {
  // don't escape SafeStrings, since they're already safe
  if (string instanceof SafeString) {
    return string.toString();
  } else if (!string && string !== 0) {
    return "";
  }

  // Force a string conversion as this will be done by the append regardless and
  // the regex test will do this transparently behind the scenes, causing issues if
  // an object's to string has escaped characters in it.
  string = "" + string;

  if(!possible.test(string)) { return string; }
  return string.replace(badChars, escapeChar);
}

exports.escapeExpression = escapeExpression;function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

exports.isEmpty = isEmpty;
},{"./safe-string":30}],32:[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime');

},{"./dist/cjs/handlebars.runtime":26}],33:[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":32}],34:[function(require,module,exports){
// Ignore module for browserify (see package.json)
},{}],35:[function(require,module,exports){
(function (process,global,__dirname){
/**
 * A JavaScript implementation of the JSON-LD API.
 *
 * @author Dave Longley
 *
 * BSD 3-Clause License
 * Copyright (c) 2011-2014 Digital Bazaar, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of the Digital Bazaar, Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
(function() {

// determine if in-browser or using node.js
var _nodejs = (
  typeof process !== 'undefined' && process.versions && process.versions.node);
var _browser = !_nodejs &&
  (typeof window !== 'undefined' || typeof self !== 'undefined');
if(_browser) {
  if(typeof global === 'undefined') {
    if(typeof window !== 'undefined') {
      global = window;
    } else if(typeof self !== 'undefined') {
      global = self;
    } else if(typeof $ !== 'undefined') {
      global = $;
    }
  }
}

// attaches jsonld API to the given object
var wrapper = function(jsonld) {

/* Core API */

/**
 * Performs JSON-LD compaction.
 *
 * @param input the JSON-LD input to compact.
 * @param ctx the context to compact with.
 * @param [options] options to use:
 *          [base] the base IRI to use.
 *          [compactArrays] true to compact arrays to single values when
 *            appropriate, false not to (default: true).
 *          [graph] true to always output a top-level graph (default: false).
 *          [expandContext] a context to expand with.
 *          [skipExpansion] true to assume the input is expanded and skip
 *            expansion, false not to, defaults to false.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, compacted, ctx) called once the operation completes.
 */
jsonld.compact = function(input, ctx, options, callback) {
  if(arguments.length < 2) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not compact, too few arguments.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  if(ctx === null) {
    return jsonld.nextTick(function() {
      callback(new JsonLdError(
        'The compaction context must not be null.',
        'jsonld.CompactError', {code: 'invalid local context'}));
    });
  }

  // nothing to compact
  if(input === null) {
    return jsonld.nextTick(function() {
      callback(null, null);
    });
  }

  // set default options
  if(!('base' in options)) {
    options.base = (typeof input === 'string') ? input : '';
  }
  if(!('compactArrays' in options)) {
    options.compactArrays = true;
  }
  if(!('graph' in options)) {
    options.graph = false;
  }
  if(!('skipExpansion' in options)) {
    options.skipExpansion = false;
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }
  if(!('link' in options)) {
    options.link = false;
  }
  if(options.link) {
    // force skip expansion when linking, "link" is not part of the public
    // API, it should only be called from framing
    options.skipExpansion = true;
  }

  var expand = function(input, options, callback) {
    jsonld.nextTick(function() {
      if(options.skipExpansion) {
        return callback(null, input);
      }
      jsonld.expand(input, options, callback);
    });
  };

  // expand input then do compaction
  expand(input, options, function(err, expanded) {
    if(err) {
      return callback(new JsonLdError(
        'Could not expand input before compaction.',
        'jsonld.CompactError', {cause: err}));
    }

    // process context
    var activeCtx = _getInitialContext(options);
    jsonld.processContext(activeCtx, ctx, options, function(err, activeCtx) {
      if(err) {
        return callback(new JsonLdError(
          'Could not process context before compaction.',
          'jsonld.CompactError', {cause: err}));
      }

      var compacted;
      try {
        // do compaction
        compacted = new Processor().compact(activeCtx, null, expanded, options);
      } catch(ex) {
        return callback(ex);
      }

      cleanup(null, compacted, activeCtx, options);
    });
  });

  // performs clean up after compaction
  function cleanup(err, compacted, activeCtx, options) {
    if(err) {
      return callback(err);
    }

    if(options.compactArrays && !options.graph && _isArray(compacted)) {
      if(compacted.length === 1) {
        // simplify to a single item
        compacted = compacted[0];
      } else if(compacted.length === 0) {
        // simplify to an empty object
        compacted = {};
      }
    } else if(options.graph && _isObject(compacted)) {
      // always use array if graph option is on
      compacted = [compacted];
    }

    // follow @context key
    if(_isObject(ctx) && '@context' in ctx) {
      ctx = ctx['@context'];
    }

    // build output context
    ctx = _clone(ctx);
    if(!_isArray(ctx)) {
      ctx = [ctx];
    }
    // remove empty contexts
    var tmp = ctx;
    ctx = [];
    for(var i = 0; i < tmp.length; ++i) {
      if(!_isObject(tmp[i]) || Object.keys(tmp[i]).length > 0) {
        ctx.push(tmp[i]);
      }
    }

    // remove array if only one context
    var hasContext = (ctx.length > 0);
    if(ctx.length === 1) {
      ctx = ctx[0];
    }

    // add context and/or @graph
    if(_isArray(compacted)) {
      // use '@graph' keyword
      var kwgraph = _compactIri(activeCtx, '@graph');
      var graph = compacted;
      compacted = {};
      if(hasContext) {
        compacted['@context'] = ctx;
      }
      compacted[kwgraph] = graph;
    } else if(_isObject(compacted) && hasContext) {
      // reorder keys so @context is first
      var graph = compacted;
      compacted = {'@context': ctx};
      for(var key in graph) {
        compacted[key] = graph[key];
      }
    }

    callback(null, compacted, activeCtx);
  }
};

/**
 * Performs JSON-LD expansion.
 *
 * @param input the JSON-LD input to expand.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [keepFreeFloatingNodes] true to keep free-floating nodes,
 *            false not to, defaults to false.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, expanded) called once the operation completes.
 */
jsonld.expand = function(input, options, callback) {
  if(arguments.length < 1) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not expand, too few arguments.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }
  if(!('keepFreeFloatingNodes' in options)) {
    options.keepFreeFloatingNodes = false;
  }

  jsonld.nextTick(function() {
    // if input is a string, attempt to dereference remote document
    if(typeof input === 'string') {
      var done = function(err, remoteDoc) {
        if(err) {
          return callback(err);
        }
        try {
          if(!remoteDoc.document) {
            throw new JsonLdError(
              'No remote document found at the given URL.',
              'jsonld.NullRemoteDocument');
          }
          if(typeof remoteDoc.document === 'string') {
            remoteDoc.document = JSON.parse(remoteDoc.document);
          }
        } catch(ex) {
          return callback(new JsonLdError(
            'Could not retrieve a JSON-LD document from the URL. URL ' +
            'dereferencing not implemented.', 'jsonld.LoadDocumentError', {
              code: 'loading document failed',
              cause: ex,
              remoteDoc: remoteDoc
          }));
        }
        expand(remoteDoc);
      };
      var promise = options.documentLoader(input, done);
      if(promise && 'then' in promise) {
        promise.then(done.bind(null, null), done);
      }
      return;
    }
    // nothing to load
    expand({contextUrl: null, documentUrl: null, document: input});
  });

  function expand(remoteDoc) {
    // set default base
    if(!('base' in options)) {
      options.base = remoteDoc.documentUrl || '';
    }
    // build meta-object and retrieve all @context URLs
    var input = {
      document: _clone(remoteDoc.document),
      remoteContext: {'@context': remoteDoc.contextUrl}
    };
    if('expandContext' in options) {
      var expandContext = _clone(options.expandContext);
      if(typeof expandContext === 'object' && '@context' in expandContext) {
        input.expandContext = expandContext;
      } else {
        input.expandContext = {'@context': expandContext};
      }
    }
    _retrieveContextUrls(input, options, function(err, input) {
      if(err) {
        return callback(err);
      }

      var expanded;
      try {
        var processor = new Processor();
        var activeCtx = _getInitialContext(options);
        var document = input.document;
        var remoteContext = input.remoteContext['@context'];

        // process optional expandContext
        if(input.expandContext) {
          activeCtx = processor.processContext(
            activeCtx, input.expandContext['@context'], options);
        }

        // process remote context from HTTP Link Header
        if(remoteContext) {
          activeCtx = processor.processContext(
            activeCtx, remoteContext, options);
        }

        // expand document
        expanded = processor.expand(
          activeCtx, null, document, options, false);

        // optimize away @graph with no other properties
        if(_isObject(expanded) && ('@graph' in expanded) &&
          Object.keys(expanded).length === 1) {
          expanded = expanded['@graph'];
        } else if(expanded === null) {
          expanded = [];
        }

        // normalize to an array
        if(!_isArray(expanded)) {
          expanded = [expanded];
        }
      } catch(ex) {
        return callback(ex);
      }
      callback(null, expanded);
    });
  }
};

/**
 * Performs JSON-LD flattening.
 *
 * @param input the JSON-LD to flatten.
 * @param ctx the context to use to compact the flattened output, or null.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, flattened) called once the operation completes.
 */
jsonld.flatten = function(input, ctx, options, callback) {
  if(arguments.length < 1) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not flatten, too few arguments.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  } else if(typeof ctx === 'function') {
    callback = ctx;
    ctx = null;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('base' in options)) {
    options.base = (typeof input === 'string') ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // expand input
  jsonld.expand(input, options, function(err, _input) {
    if(err) {
      return callback(new JsonLdError(
        'Could not expand input before flattening.',
        'jsonld.FlattenError', {cause: err}));
    }

    var flattened;
    try {
      // do flattening
      flattened = new Processor().flatten(_input);
    } catch(ex) {
      return callback(ex);
    }

    if(ctx === null) {
      return callback(null, flattened);
    }

    // compact result (force @graph option to true, skip expansion)
    options.graph = true;
    options.skipExpansion = true;
    jsonld.compact(flattened, ctx, options, function(err, compacted) {
      if(err) {
        return callback(new JsonLdError(
          'Could not compact flattened output.',
          'jsonld.FlattenError', {cause: err}));
      }
      callback(null, compacted);
    });
  });
};

/**
 * Performs JSON-LD framing.
 *
 * @param input the JSON-LD input to frame.
 * @param frame the JSON-LD frame to use.
 * @param [options] the framing options.
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [embed] default @embed flag: '@last', '@always', '@never', '@link'
 *            (default: '@last').
 *          [explicit] default @explicit flag (default: false).
 *          [requireAll] default @requireAll flag (default: true).
 *          [omitDefault] default @omitDefault flag (default: false).
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, framed) called once the operation completes.
 */
jsonld.frame = function(input, frame, options, callback) {
  if(arguments.length < 2) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not frame, too few arguments.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('base' in options)) {
    options.base = (typeof input === 'string') ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }
  if(!('embed' in options)) {
    options.embed = '@last';
  }
  options.explicit = options.explicit || false;
  if(!('requireAll' in options)) {
    options.requireAll = true;
  }
  options.omitDefault = options.omitDefault || false;

  jsonld.nextTick(function() {
    // if frame is a string, attempt to dereference remote document
    if(typeof frame === 'string') {
      var done = function(err, remoteDoc) {
        if(err) {
          return callback(err);
        }
        try {
          if(!remoteDoc.document) {
            throw new JsonLdError(
              'No remote document found at the given URL.',
              'jsonld.NullRemoteDocument');
          }
          if(typeof remoteDoc.document === 'string') {
            remoteDoc.document = JSON.parse(remoteDoc.document);
          }
        } catch(ex) {
          return callback(new JsonLdError(
            'Could not retrieve a JSON-LD document from the URL. URL ' +
            'dereferencing not implemented.', 'jsonld.LoadDocumentError', {
              code: 'loading document failed',
              cause: ex,
              remoteDoc: remoteDoc
          }));
        }
        doFrame(remoteDoc);
      };
      var promise = options.documentLoader(frame, done);
      if(promise && 'then' in promise) {
        promise.then(done.bind(null, null), done);
      }
      return;
    }
    // nothing to load
    doFrame({contextUrl: null, documentUrl: null, document: frame});
  });

  function doFrame(remoteFrame) {
    // preserve frame context and add any Link header context
    var frame = remoteFrame.document;
    var ctx;
    if(frame) {
      ctx = frame['@context'];
      if(remoteFrame.contextUrl) {
        if(!ctx) {
          ctx = remoteFrame.contextUrl;
        } else if(_isArray(ctx)) {
          ctx.push(remoteFrame.contextUrl);
        } else {
          ctx = [ctx, remoteFrame.contextUrl];
        }
        frame['@context'] = ctx;
      } else {
        ctx = ctx || {};
      }
    } else {
      ctx = {};
    }

    // expand input
    jsonld.expand(input, options, function(err, expanded) {
      if(err) {
        return callback(new JsonLdError(
          'Could not expand input before framing.',
          'jsonld.FrameError', {cause: err}));
      }

      // expand frame
      var opts = _clone(options);
      opts.isFrame = true;
      opts.keepFreeFloatingNodes = true;
      jsonld.expand(frame, opts, function(err, expandedFrame) {
        if(err) {
          return callback(new JsonLdError(
            'Could not expand frame before framing.',
            'jsonld.FrameError', {cause: err}));
        }

        var framed;
        try {
          // do framing
          framed = new Processor().frame(expanded, expandedFrame, opts);
        } catch(ex) {
          return callback(ex);
        }

        // compact result (force @graph option to true, skip expansion,
        // check for linked embeds)
        opts.graph = true;
        opts.skipExpansion = true;
        opts.link = {};
        jsonld.compact(framed, ctx, opts, function(err, compacted, ctx) {
          if(err) {
            return callback(new JsonLdError(
              'Could not compact framed output.',
              'jsonld.FrameError', {cause: err}));
          }
          // get graph alias
          var graph = _compactIri(ctx, '@graph');
          // remove @preserve from results
          opts.link = {};
          compacted[graph] = _removePreserve(ctx, compacted[graph], opts);
          callback(null, compacted);
        });
      });
    });
  }
};

/**
 * **Experimental**
 *
 * Links a JSON-LD document's nodes in memory.
 *
 * @param input the JSON-LD document to link.
 * @param ctx the JSON-LD context to apply.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, linked) called once the operation completes.
 */
jsonld.link = function(input, ctx, options, callback) {
  // API matches running frame with a wildcard frame and embed: '@link'
  // get arguments
  var frame = {};
  if(ctx) {
    frame['@context'] = ctx;
  }
  frame['@embed'] = '@link';
  jsonld.frame(input, frame, options, callback);
};

/**
 * **Deprecated**
 *
 * Performs JSON-LD objectification.
 *
 * @param input the JSON-LD document to objectify.
 * @param ctx the JSON-LD context to apply.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, linked) called once the operation completes.
 */
jsonld.objectify = function(input, ctx, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('base' in options)) {
    options.base = (typeof input === 'string') ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // expand input
  jsonld.expand(input, options, function(err, _input) {
    if(err) {
      return callback(new JsonLdError(
        'Could not expand input before linking.',
        'jsonld.LinkError', {cause: err}));
    }

    var flattened;
    try {
      // flatten the graph
      flattened = new Processor().flatten(_input);
    } catch(ex) {
      return callback(ex);
    }

    // compact result (force @graph option to true, skip expansion)
    options.graph = true;
    options.skipExpansion = true;
    jsonld.compact(flattened, ctx, options, function(err, compacted, ctx) {
      if(err) {
        return callback(new JsonLdError(
          'Could not compact flattened output before linking.',
          'jsonld.LinkError', {cause: err}));
      }
      // get graph alias
      var graph = _compactIri(ctx, '@graph');
      var top = compacted[graph][0];

      var recurse = function(subject) {
        // can't replace just a string
        if(!_isObject(subject) && !_isArray(subject)) {
          return;
        }

        // bottom out recursion on re-visit
        if(_isObject(subject)) {
          if(recurse.visited[subject['@id']]) {
            return;
          }
          recurse.visited[subject['@id']] = true;
        }

        // each array element *or* object key
        for(var k in subject) {
          var obj = subject[k];
          var isid = (jsonld.getContextValue(ctx, k, '@type') === '@id');

          // can't replace a non-object or non-array unless it's an @id
          if(!_isArray(obj) && !_isObject(obj) && !isid) {
            continue;
          }

          if(_isString(obj) && isid) {
            subject[k] = obj = top[obj];
            recurse(obj);
          } else if(_isArray(obj)) {
            for(var i = 0; i < obj.length; ++i) {
              if(_isString(obj[i]) && isid) {
                obj[i] = top[obj[i]];
              } else if(_isObject(obj[i]) && '@id' in obj[i]) {
                obj[i] = top[obj[i]['@id']];
              }
              recurse(obj[i]);
            }
          } else if(_isObject(obj)) {
            var sid = obj['@id'];
            subject[k] = obj = top[sid];
            recurse(obj);
          }
        }
      };
      recurse.visited = {};
      recurse(top);

      compacted.of_type = {};
      for(var s in top) {
        if(!('@type' in top[s])) {
          continue;
        }
        var types = top[s]['@type'];
        if(!_isArray(types)) {
          types = [types];
        }
        for(var t in types) {
          if(!(types[t] in compacted.of_type)) {
            compacted.of_type[types[t]] = [];
          }
          compacted.of_type[types[t]].push(top[s]);
        }
      }
      callback(null, compacted);
    });
  });
};

/**
 * Performs RDF dataset normalization on the given JSON-LD input. The output
 * is an RDF dataset unless the 'format' option is used.
 *
 * @param input the JSON-LD input to normalize.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [format] the format if output is a string:
 *            'application/nquads' for N-Quads.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, normalized) called once the operation completes.
 */
jsonld.normalize = function(input, options, callback) {
  if(arguments.length < 1) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not normalize, too few arguments.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('base' in options)) {
    options.base = (typeof input === 'string') ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // convert to RDF dataset then do normalization
  var opts = _clone(options);
  delete opts.format;
  opts.produceGeneralizedRdf = false;
  jsonld.toRDF(input, opts, function(err, dataset) {
    if(err) {
      return callback(new JsonLdError(
        'Could not convert input to RDF dataset before normalization.',
        'jsonld.NormalizeError', {cause: err}));
    }

    // do normalization
    new Processor().normalize(dataset, options, callback);
  });
};

/**
 * Converts an RDF dataset to JSON-LD.
 *
 * @param dataset a serialized string of RDF in a format specified by the
 *          format option or an RDF dataset to convert.
 * @param [options] the options to use:
 *          [format] the format if dataset param must first be parsed:
 *            'application/nquads' for N-Quads (default).
 *          [rdfParser] a custom RDF-parser to use to parse the dataset.
 *          [useRdfType] true to use rdf:type, false to use @type
 *            (default: false).
 *          [useNativeTypes] true to convert XSD types into native types
 *            (boolean, integer, double), false not to (default: false).
 * @param callback(err, output) called once the operation completes.
 */
jsonld.fromRDF = function(dataset, options, callback) {
  if(arguments.length < 1) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not convert from RDF, too few arguments.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('useRdfType' in options)) {
    options.useRdfType = false;
  }
  if(!('useNativeTypes' in options)) {
    options.useNativeTypes = false;
  }

  if(!('format' in options) && _isString(dataset)) {
    // set default format to nquads
    if(!('format' in options)) {
      options.format = 'application/nquads';
    }
  }

  jsonld.nextTick(function() {
    // handle special format
    var rdfParser;
    if(options.format) {
      // check supported formats
      rdfParser = options.rdfParser || _rdfParsers[options.format];
      if(!rdfParser) {
        return callback(new JsonLdError(
          'Unknown input format.',
          'jsonld.UnknownFormat', {format: options.format}));
      }
    } else {
      // no-op parser, assume dataset already parsed
      rdfParser = function() {
        return dataset;
      };
    }

    var callbackCalled = false;
    try {
      // rdf parser may be async or sync, always pass callback
      dataset = rdfParser(dataset, function(err, dataset) {
        callbackCalled = true;
        if(err) {
          return callback(err);
        }
        fromRDF(dataset, options, callback);
      });
    } catch(e) {
      if(!callbackCalled) {
        return callback(e);
      }
      throw e;
    }
    // handle synchronous or promise-based parser
    if(dataset) {
      // if dataset is actually a promise
      if('then' in dataset) {
        return dataset.then(function(dataset) {
          fromRDF(dataset, options, callback);
        }, callback);
      }
      // parser is synchronous
      fromRDF(dataset, options, callback);
    }

    function fromRDF(dataset, options, callback) {
      // convert from RDF
      new Processor().fromRDF(dataset, options, callback);
    }
  });
};

/**
 * Outputs the RDF dataset found in the given JSON-LD object.
 *
 * @param input the JSON-LD input.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [format] the format to use to output a string:
 *            'application/nquads' for N-Quads.
 *          [produceGeneralizedRdf] true to output generalized RDF, false
 *            to produce only standard RDF (default: false).
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, dataset) called once the operation completes.
 */
jsonld.toRDF = function(input, options, callback) {
  if(arguments.length < 1) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not convert to RDF, too few arguments.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('base' in options)) {
    options.base = (typeof input === 'string') ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // expand input
  jsonld.expand(input, options, function(err, expanded) {
    if(err) {
      return callback(new JsonLdError(
        'Could not expand input before serialization to RDF.',
        'jsonld.RdfError', {cause: err}));
    }

    var dataset;
    try {
      // output RDF dataset
      dataset = Processor.prototype.toRDF(expanded, options);
      if(options.format) {
        if(options.format === 'application/nquads') {
          return callback(null, _toNQuads(dataset));
        }
        throw new JsonLdError(
          'Unknown output format.',
          'jsonld.UnknownFormat', {format: options.format});
      }
    } catch(ex) {
      return callback(ex);
    }
    callback(null, dataset);
  });
};

/**
 * **Experimental**
 *
 * Recursively flattens the nodes in the given JSON-LD input into a map of
 * node ID => node.
 *
 * @param input the JSON-LD input.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [namer] a jsonld.UniqueNamer to use to label blank nodes.
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, nodeMap) called once the operation completes.
 */
jsonld.createNodeMap = function(input, options, callback) {
  if(arguments.length < 1) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not create node map, too few arguments.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // set default options
  if(!('base' in options)) {
    options.base = (typeof input === 'string') ? input : '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // expand input
  jsonld.expand(input, options, function(err, _input) {
    if(err) {
      return callback(new JsonLdError(
        'Could not expand input before creating node map.',
        'jsonld.CreateNodeMapError', {cause: err}));
    }

    var nodeMap;
    try {
      nodeMap = new Processor().createNodeMap(_input, options);
    } catch(ex) {
      return callback(ex);
    }

    callback(null, nodeMap);
  });
};

/**
 * **Experimental**
 *
 * Merges two or more JSON-LD documents into a single flattened document.
 *
 * @param docs the JSON-LD documents to merge together.
 * @param ctx the context to use to compact the merged result, or null.
 * @param [options] the options to use:
 *          [base] the base IRI to use.
 *          [expandContext] a context to expand with.
 *          [namer] a jsonld.UniqueNamer to use to label blank nodes.
 *          [mergeNodes] true to merge properties for nodes with the same ID,
 *            false to ignore new properties for nodes with the same ID once
 *            the ID has been defined; note that this may not prevent merging
 *            new properties where a node is in the `object` position
 *            (default: true).
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, merged) called once the operation completes.
 */
jsonld.merge = function(docs, ctx, options, callback) {
  if(arguments.length < 1) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not merge, too few arguments.'));
    });
  }
  if(!_isArray(docs)) {
    return jsonld.nextTick(function() {
      callback(new TypeError('Could not merge, "docs" must be an array.'));
    });
  }

  // get arguments
  if(typeof options === 'function') {
    callback = options;
    options = {};
  } else if(typeof ctx === 'function') {
    callback = ctx;
    ctx = null;
    options = {};
  }
  options = options || {};

  // expand all documents
  var expanded = [];
  var error = null;
  var count = docs.length;
  for(var i = 0; i < docs.length; ++i) {
    var opts = {};
    for(var key in options) {
      opts[key] = options[key];
    }
    jsonld.expand(docs[i], opts, expandComplete);
  }

  function expandComplete(err, _input) {
    if(error) {
      return;
    }
    if(err) {
      error = err;
      return callback(new JsonLdError(
        'Could not expand input before flattening.',
        'jsonld.FlattenError', {cause: err}));
    }
    expanded.push(_input);
    if(--count === 0) {
      merge(expanded);
    }
  }

  function merge(expanded) {
    var mergeNodes = true;
    if('mergeNodes' in options) {
      mergeNodes = options.mergeNodes;
    }

    var namer = options.namer || new UniqueNamer('_:b');
    var graphs = {'@default': {}};

    var defaultGraph;
    try {
      for(var i = 0; i < expanded.length; ++i) {
        // uniquely relabel blank nodes
        var doc = expanded[i];
        doc = jsonld.relabelBlankNodes(doc, {
          namer: new UniqueNamer('_:b' + i + '-')
        });

        // add nodes to the shared node map graphs if merging nodes, to a
        // separate graph set if not
        var _graphs = (mergeNodes || i === 0) ? graphs : {'@default': {}};
        _createNodeMap(doc, _graphs, '@default', namer);

        if(_graphs !== graphs) {
          // merge document graphs but don't merge existing nodes
          for(var graphName in _graphs) {
            var _nodeMap = _graphs[graphName];
            if(!(graphName in graphs)) {
              graphs[graphName] = _nodeMap;
              continue;
            }
            var nodeMap = graphs[graphName];
            for(var key in _nodeMap) {
              if(!(key in nodeMap)) {
                nodeMap[key] = _nodeMap[key];
              }
            }
          }
        }
      }

      // add all non-default graphs to default graph
      defaultGraph = _mergeNodeMaps(graphs);
    } catch(ex) {
      return callback(ex);
    }

    // produce flattened output
    var flattened = [];
    var keys = Object.keys(defaultGraph).sort();
    for(var ki = 0; ki < keys.length; ++ki) {
      var node = defaultGraph[keys[ki]];
      // only add full subjects to top-level
      if(!_isSubjectReference(node)) {
        flattened.push(node);
      }
    }

    if(ctx === null) {
      return callback(null, flattened);
    }

    // compact result (force @graph option to true, skip expansion)
    options.graph = true;
    options.skipExpansion = true;
    jsonld.compact(flattened, ctx, options, function(err, compacted) {
      if(err) {
        return callback(new JsonLdError(
          'Could not compact merged output.',
          'jsonld.MergeError', {cause: err}));
      }
      callback(null, compacted);
    });
  }
};

/**
 * Relabels all blank nodes in the given JSON-LD input.
 *
 * @param input the JSON-LD input.
 * @param [options] the options to use:
 *          [namer] a jsonld.UniqueNamer to use.
 */
jsonld.relabelBlankNodes = function(input, options) {
  options = options || {};
  var namer = options.namer || new UniqueNamer('_:b');
  return _labelBlankNodes(namer, input);
};

/**
 * The default document loader for external documents. If the environment
 * is node.js, a callback-continuation-style document loader is used; otherwise,
 * a promises-style document loader is used.
 *
 * @param url the URL to load.
 * @param callback(err, remoteDoc) called once the operation completes,
 *          if using a non-promises API.
 *
 * @return a promise, if using a promises API.
 */
jsonld.documentLoader = function(url, callback) {
  var err = new JsonLdError(
    'Could not retrieve a JSON-LD document from the URL. URL ' +
    'dereferencing not implemented.', 'jsonld.LoadDocumentError',
    {code: 'loading document failed'});
  if(_nodejs) {
    return callback(err, {contextUrl: null, documentUrl: url, document: null});
  }
  return jsonld.promisify(function(callback) {
    callback(err);
  });
};

/**
 * Deprecated default document loader. Use or override jsonld.documentLoader
 * instead.
 */
jsonld.loadDocument = function(url, callback) {
  var promise = jsonld.documentLoader(url, callback);
  if(promise && 'then' in promise) {
    promise.then(callback.bind(null, null), callback);
  }
};

/* Promises API */

/**
 * Creates a new promises API object.
 *
 * @param [options] the options to use:
 *          [api] an object to attach the API to.
 *          [version] 'json-ld-1.0' to output a standard JSON-LD 1.0 promises
 *            API, 'jsonld.js' to output the same with augmented proprietary
 *            methods (default: 'jsonld.js')
 *
 * @return the promises API object.
 */
jsonld.promises = function(options) {
  options = options || {};
  var slice = Array.prototype.slice;
  var promisify = jsonld.promisify;

  // handle 'api' option as version, set defaults
  var api = options.api || {};
  var version = options.version || 'jsonld.js';
  if(typeof options.api === 'string') {
    if(!options.version) {
      version = options.api;
    }
    api = {};
  }

  api.expand = function(input) {
    if(arguments.length < 1) {
      throw new TypeError('Could not expand, too few arguments.');
    }
    return promisify.apply(null, [jsonld.expand].concat(slice.call(arguments)));
  };
  api.compact = function(input, ctx) {
    if(arguments.length < 2) {
      throw new TypeError('Could not compact, too few arguments.');
    }
    var compact = function(input, ctx, options, callback) {
      // ensure only one value is returned in callback
      jsonld.compact(input, ctx, options, function(err, compacted) {
        callback(err, compacted);
      });
    };
    return promisify.apply(null, [compact].concat(slice.call(arguments)));
  };
  api.flatten = function(input) {
    if(arguments.length < 1) {
      throw new TypeError('Could not flatten, too few arguments.');
    }
    return promisify.apply(
      null, [jsonld.flatten].concat(slice.call(arguments)));
  };
  api.frame = function(input, frame) {
    if(arguments.length < 2) {
      throw new TypeError('Could not frame, too few arguments.');
    }
    return promisify.apply(null, [jsonld.frame].concat(slice.call(arguments)));
  };
  api.fromRDF = function(dataset) {
    if(arguments.length < 1) {
      throw new TypeError('Could not convert from RDF, too few arguments.');
    }
    return promisify.apply(
      null, [jsonld.fromRDF].concat(slice.call(arguments)));
  };
  api.toRDF = function(input) {
    if(arguments.length < 1) {
      throw new TypeError('Could not convert to RDF, too few arguments.');
    }
    return promisify.apply(null, [jsonld.toRDF].concat(slice.call(arguments)));
  };
  api.normalize = function(input) {
    if(arguments.length < 1) {
      throw new TypeError('Could not normalize, too few arguments.');
    }
    return promisify.apply(
      null, [jsonld.normalize].concat(slice.call(arguments)));
  };

  if(version === 'jsonld.js') {
    api.link = function(input, ctx) {
      if(arguments.length < 2) {
        throw new TypeError('Could not link, too few arguments.');
      }
      return promisify.apply(
        null, [jsonld.link].concat(slice.call(arguments)));
    };
    api.objectify = function(input) {
      return promisify.apply(
        null, [jsonld.objectify].concat(slice.call(arguments)));
    };
    api.createNodeMap = function(input) {
      return promisify.apply(
        null, [jsonld.createNodeMap].concat(slice.call(arguments)));
    };
    api.merge = function(input) {
      return promisify.apply(
        null, [jsonld.merge].concat(slice.call(arguments)));
    };
  }

  try {
    jsonld.Promise = global.Promise || require('es6-promise').Promise;
  } catch(e) {
    var f = function() {
      throw new Error('Unable to find a Promise implementation.');
    };
    for(var method in api) {
      api[method] = f;
    }
  }

  return api;
};

/**
 * Converts a node.js async op into a promise w/boxed resolved value(s).
 *
 * @param op the operation to convert.
 *
 * @return the promise.
 */
jsonld.promisify = function(op) {
  if(!jsonld.Promise) {
    try {
      jsonld.Promise = global.Promise || require('es6-promise').Promise;
    } catch(e) {
      throw new Error('Unable to find a Promise implementation.');
    }
  }
  var args = Array.prototype.slice.call(arguments, 1);
  return new jsonld.Promise(function(resolve, reject) {
    op.apply(null, args.concat(function(err, value) {
      if(!err) {
        resolve(value);
      } else {
        reject(err);
      }
    }));
  });
};

// extend jsonld.promises w/jsonld.js methods
jsonld.promises({api: jsonld.promises});

/* WebIDL API */

function JsonLdProcessor() {}
JsonLdProcessor.prototype = jsonld.promises({version: 'json-ld-1.0'});
JsonLdProcessor.prototype.toString = function() {
  if(this instanceof JsonLdProcessor) {
    return '[object JsonLdProcessor]';
  }
  return '[object JsonLdProcessorPrototype]';
};
jsonld.JsonLdProcessor = JsonLdProcessor;

// IE8 has Object.defineProperty but it only
// works on DOM nodes -- so feature detection
// requires try/catch :-(
var canDefineProperty = !!Object.defineProperty;
if(canDefineProperty) {
  try {
    Object.defineProperty({}, 'x', {});
  } catch(e) {
    canDefineProperty = false;
  }
}

if(canDefineProperty) {
  Object.defineProperty(JsonLdProcessor, 'prototype', {
    writable: false,
    enumerable: false
  });
  Object.defineProperty(JsonLdProcessor.prototype, 'constructor', {
    writable: true,
    enumerable: false,
    configurable: true,
    value: JsonLdProcessor
  });
}

// setup browser global JsonLdProcessor
if(_browser && typeof global.JsonLdProcessor === 'undefined') {
  if(canDefineProperty) {
    Object.defineProperty(global, 'JsonLdProcessor', {
      writable: true,
      enumerable: false,
      configurable: true,
      value: JsonLdProcessor
    });
  } else {
    global.JsonLdProcessor = JsonLdProcessor;
  }
}

/* Utility API */

// define setImmediate and nextTick
if(typeof process === 'undefined' || !process.nextTick) {
  if(typeof setImmediate === 'function') {
    jsonld.setImmediate = jsonld.nextTick = function(callback) {
      return setImmediate(callback);
    };
  } else {
    jsonld.setImmediate = function(callback) {
      setTimeout(callback, 0);
    };
    jsonld.nextTick = jsonld.setImmediate;
  }
} else {
  jsonld.nextTick = process.nextTick;
  if(typeof setImmediate === 'function') {
    jsonld.setImmediate = setImmediate;
  } else {
    jsonld.setImmediate = jsonld.nextTick;
  }
}

/**
 * Parses a link header. The results will be key'd by the value of "rel".
 *
 * Link: <http://json-ld.org/contexts/person.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"
 *
 * Parses as: {
 *   'http://www.w3.org/ns/json-ld#context': {
 *     target: http://json-ld.org/contexts/person.jsonld,
 *     type: 'application/ld+json'
 *   }
 * }
 *
 * If there is more than one "rel" with the same IRI, then entries in the
 * resulting map for that "rel" will be arrays.
 *
 * @param header the link header to parse.
 */
jsonld.parseLinkHeader = function(header) {
  var rval = {};
  // split on unbracketed/unquoted commas
  var entries = header.match(/(?:<[^>]*?>|"[^"]*?"|[^,])+/g);
  var rLinkHeader = /\s*<([^>]*?)>\s*(?:;\s*(.*))?/;
  for(var i = 0; i < entries.length; ++i) {
    var match = entries[i].match(rLinkHeader);
    if(!match) {
      continue;
    }
    var result = {target: match[1]};
    var params = match[2];
    var rParams = /(.*?)=(?:(?:"([^"]*?)")|([^"]*?))\s*(?:(?:;\s*)|$)/g;
    while(match = rParams.exec(params)) {
      result[match[1]] = (match[2] === undefined) ? match[3] : match[2];
    }
    var rel = result['rel'] || '';
    if(_isArray(rval[rel])) {
      rval[rel].push(result);
    } else if(rel in rval) {
      rval[rel] = [rval[rel], result];
    } else {
      rval[rel] = result;
    }
  }
  return rval;
};

/**
 * Creates a simple document cache that retains documents for a short
 * period of time.
 *
 * FIXME: Implement simple HTTP caching instead.
 *
 * @param size the maximum size of the cache.
 */
jsonld.DocumentCache = function(size) {
  this.order = [];
  this.cache = {};
  this.size = size || 50;
  this.expires = 30 * 1000;
};
jsonld.DocumentCache.prototype.get = function(url) {
  if(url in this.cache) {
    var entry = this.cache[url];
    if(entry.expires >= +new Date()) {
      return entry.ctx;
    }
    delete this.cache[url];
    this.order.splice(this.order.indexOf(url), 1);
  }
  return null;
};
jsonld.DocumentCache.prototype.set = function(url, ctx) {
  if(this.order.length === this.size) {
    delete this.cache[this.order.shift()];
  }
  this.order.push(url);
  this.cache[url] = {ctx: ctx, expires: (+new Date() + this.expires)};
};

/**
 * Creates an active context cache.
 *
 * @param size the maximum size of the cache.
 */
jsonld.ActiveContextCache = function(size) {
  this.order = [];
  this.cache = {};
  this.size = size || 100;
};
jsonld.ActiveContextCache.prototype.get = function(activeCtx, localCtx) {
  var key1 = JSON.stringify(activeCtx);
  var key2 = JSON.stringify(localCtx);
  var level1 = this.cache[key1];
  if(level1 && key2 in level1) {
    return level1[key2];
  }
  return null;
};
jsonld.ActiveContextCache.prototype.set = function(
  activeCtx, localCtx, result) {
  if(this.order.length === this.size) {
    var entry = this.order.shift();
    delete this.cache[entry.activeCtx][entry.localCtx];
  }
  var key1 = JSON.stringify(activeCtx);
  var key2 = JSON.stringify(localCtx);
  this.order.push({activeCtx: key1, localCtx: key2});
  if(!(key1 in this.cache)) {
    this.cache[key1] = {};
  }
  this.cache[key1][key2] = _clone(result);
};

/**
 * Default JSON-LD cache.
 */
jsonld.cache = {
  activeCtx: new jsonld.ActiveContextCache()
};

/**
 * Document loaders.
 */
jsonld.documentLoaders = {};

/**
 * Creates a built-in jquery document loader.
 *
 * @param $ the jquery instance to use.
 * @param options the options to use:
 *          secure: require all URLs to use HTTPS.
 *          usePromise: true to use a promises API, false for a
 *            callback-continuation-style API; defaults to true if Promise
 *            is globally defined, false if not.
 *
 * @return the jquery document loader.
 */
jsonld.documentLoaders.jquery = function($, options) {
  options = options || {};
  var loader = function(url, callback) {
    if(url.indexOf('http:') !== 0 && url.indexOf('https:') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; only "http" and "https" URLs are ' +
        'supported.',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }
    if(options.secure && url.indexOf('https') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; secure mode is enabled and ' +
        'the URL\'s scheme is not "https".',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }
    $.ajax({
      url: url,
      accepts: {
        json: 'application/ld+json, application/json'
      },
      // ensure Accept header is very specific for JSON-LD/JSON
      headers: {
        'Accept': 'application/ld+json, application/json'
      },
      dataType: 'json',
      crossDomain: true,
      success: function(data, textStatus, jqXHR) {
        var doc = {contextUrl: null, documentUrl: url, document: data};

        // handle Link Header
        var contentType = jqXHR.getResponseHeader('Content-Type');
        var linkHeader = jqXHR.getResponseHeader('Link');
        if(linkHeader && contentType !== 'application/ld+json') {
          // only 1 related link header permitted
          linkHeader = jsonld.parseLinkHeader(linkHeader)[LINK_HEADER_REL];
          if(_isArray(linkHeader)) {
            return callback(new JsonLdError(
              'URL could not be dereferenced, it has more than one ' +
              'associated HTTP Link Header.',
              'jsonld.InvalidUrl',
              {code: 'multiple context link headers', url: url}), doc);
          }
          if(linkHeader) {
            doc.contextUrl = linkHeader.target;
          }
        }

        callback(null, doc);
      },
      error: function(jqXHR, textStatus, err) {
        callback(new JsonLdError(
          'URL could not be dereferenced, an error occurred.',
          'jsonld.LoadDocumentError',
          {code: 'loading document failed', url: url, cause: err}),
          {contextUrl: null, documentUrl: url, document: null});
      }
    });
  };

  var usePromise = (typeof Promise !== 'undefined');
  if('usePromise' in options) {
    usePromise = options.usePromise;
  }
  if(usePromise) {
    return function(url) {
      return jsonld.promisify(loader, url);
    };
  }
  return loader;
};

/**
 * Creates a built-in node document loader.
 *
 * @param options the options to use:
 *          secure: require all URLs to use HTTPS.
 *          strictSSL: true to require SSL certificates to be valid,
 *            false not to (default: true).
 *          maxRedirects: the maximum number of redirects to permit, none by
 *            default.
 *          usePromise: true to use a promises API, false for a
 *            callback-continuation-style API; false by default.
 *
 * @return the node document loader.
 */
jsonld.documentLoaders.node = function(options) {
  options = options || {};
  var strictSSL = ('strictSSL' in options) ? options.strictSSL : true;
  var maxRedirects = ('maxRedirects' in options) ? options.maxRedirects : -1;
  var request = require('request');
  var http = require('http');
  var cache = new jsonld.DocumentCache();
  function loadDocument(url, redirects, callback) {
    if(url.indexOf('http:') !== 0 && url.indexOf('https:') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; only "http" and "https" URLs are ' +
        'supported.',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }
    if(options.secure && url.indexOf('https') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; secure mode is enabled and ' +
        'the URL\'s scheme is not "https".',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }
    var doc = cache.get(url);
    if(doc !== null) {
      return callback(null, doc);
    }
    request({
      url: url,
      headers: {
        'Accept': 'application/ld+json, application/json'
      },
      strictSSL: strictSSL,
      followRedirect: false
    }, handleResponse);

    function handleResponse(err, res, body) {
      doc = {contextUrl: null, documentUrl: url, document: body || null};

      // handle error
      if(err) {
        return callback(new JsonLdError(
          'URL could not be dereferenced, an error occurred.',
          'jsonld.LoadDocumentError',
          {code: 'loading document failed', url: url, cause: err}), doc);
      }
      var statusText = http.STATUS_CODES[res.statusCode];
      if(res.statusCode >= 400) {
        return callback(new JsonLdError(
          'URL could not be dereferenced: ' + statusText,
          'jsonld.InvalidUrl', {
            code: 'loading document failed',
            url: url,
            httpStatusCode: res.statusCode
          }), doc);
      }

      // handle Link Header
      if(res.headers.link &&
        res.headers['content-type'] !== 'application/ld+json') {
        // only 1 related link header permitted
        var linkHeader = jsonld.parseLinkHeader(
          res.headers.link)[LINK_HEADER_REL];
        if(_isArray(linkHeader)) {
          return callback(new JsonLdError(
            'URL could not be dereferenced, it has more than one associated ' +
            'HTTP Link Header.',
            'jsonld.InvalidUrl',
            {code: 'multiple context link headers', url: url}), doc);
        }
        if(linkHeader) {
          doc.contextUrl = linkHeader.target;
        }
      }

      // handle redirect
      if(res.statusCode >= 300 && res.statusCode < 400 &&
        res.headers.location) {
        if(redirects.length === maxRedirects) {
          return callback(new JsonLdError(
            'URL could not be dereferenced; there were too many redirects.',
            'jsonld.TooManyRedirects', {
              code: 'loading document failed',
              url: url,
              httpStatusCode: res.statusCode,
              redirects: redirects
            }), doc);
        }
        if(redirects.indexOf(url) !== -1) {
          return callback(new JsonLdError(
            'URL could not be dereferenced; infinite redirection was detected.',
            'jsonld.InfiniteRedirectDetected', {
              code: 'recursive context inclusion',
              url: url,
              httpStatusCode: res.statusCode,
              redirects: redirects
            }), doc);
        }
        redirects.push(url);
        return loadDocument(res.headers.location, redirects, callback);
      }
      // cache for each redirected URL
      redirects.push(url);
      for(var i = 0; i < redirects.length; ++i) {
        cache.set(
          redirects[i],
          {contextUrl: null, documentUrl: redirects[i], document: body});
      }
      callback(err, doc);
    }
  }

  var loader = function(url, callback) {
    loadDocument(url, [], callback);
  };
  if(options.usePromise) {
    return function(url) {
      return jsonld.promisify(loader, url);
    };
  }
  return loader;
};

/**
 * Creates a built-in XMLHttpRequest document loader.
 *
 * @param options the options to use:
 *          secure: require all URLs to use HTTPS.
 *          usePromise: true to use a promises API, false for a
 *            callback-continuation-style API; defaults to true if Promise
 *            is globally defined, false if not.
 *          [xhr]: the XMLHttpRequest API to use.
 *
 * @return the XMLHttpRequest document loader.
 */
jsonld.documentLoaders.xhr = function(options) {
  var rlink = /(^|(\r\n))link:/i;
  options = options || {};
  var loader = function(url, callback) {
    if(url.indexOf('http:') !== 0 && url.indexOf('https:') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; only "http" and "https" URLs are ' +
        'supported.',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }
    if(options.secure && url.indexOf('https') !== 0) {
      return callback(new JsonLdError(
        'URL could not be dereferenced; secure mode is enabled and ' +
        'the URL\'s scheme is not "https".',
        'jsonld.InvalidUrl', {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    }
    var xhr = options.xhr || XMLHttpRequest;
    var req = new xhr();
    req.onload = function(e) {
      if(req.status >= 400) {
        return callback(new JsonLdError(
          'URL could not be dereferenced: ' + req.statusText,
          'jsonld.LoadDocumentError', {
            code: 'loading document failed',
            url: url,
            httpStatusCode: req.status
          }), {contextUrl: null, documentUrl: url, document: null});
      }

      var doc = {contextUrl: null, documentUrl: url, document: req.response};

      // handle Link Header (avoid unsafe header warning by existence testing)
      var contentType = req.getResponseHeader('Content-Type');
      var linkHeader;
      if(rlink.test(req.getAllResponseHeaders())) {
        linkHeader = req.getResponseHeader('Link');
      }
      if(linkHeader && contentType !== 'application/ld+json') {
        // only 1 related link header permitted
        linkHeader = jsonld.parseLinkHeader(linkHeader)[LINK_HEADER_REL];
        if(_isArray(linkHeader)) {
          return callback(new JsonLdError(
            'URL could not be dereferenced, it has more than one ' +
            'associated HTTP Link Header.',
            'jsonld.InvalidUrl',
            {code: 'multiple context link headers', url: url}), doc);
        }
        if(linkHeader) {
          doc.contextUrl = linkHeader.target;
        }
      }

      callback(null, doc);
    };
    req.onerror = function() {
      callback(new JsonLdError(
        'URL could not be dereferenced, an error occurred.',
        'jsonld.LoadDocumentError',
        {code: 'loading document failed', url: url}),
        {contextUrl: null, documentUrl: url, document: null});
    };
    req.open('GET', url, true);
    req.setRequestHeader('Accept', 'application/ld+json, application/json');
    req.send();
  };

  var usePromise = (typeof Promise !== 'undefined');
  if('usePromise' in options) {
    usePromise = options.usePromise;
  }
  if(usePromise) {
    return function(url) {
      return jsonld.promisify(loader, url);
    };
  }
  return loader;
};

/**
 * Assigns the default document loader for external document URLs to a built-in
 * default. Supported types currently include: 'jquery' and 'node'.
 *
 * To use the jquery document loader, the first parameter must be a reference
 * to the main jquery object.
 *
 * @param type the type to set.
 * @param [params] the parameters required to use the document loader.
 */
jsonld.useDocumentLoader = function(type) {
  if(!(type in jsonld.documentLoaders)) {
    throw new JsonLdError(
      'Unknown document loader type: "' + type + '"',
      'jsonld.UnknownDocumentLoader',
      {type: type});
  }

  // set document loader
  jsonld.documentLoader = jsonld.documentLoaders[type].apply(
    jsonld, Array.prototype.slice.call(arguments, 1));
};

/**
 * Processes a local context, resolving any URLs as necessary, and returns a
 * new active context in its callback.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param [options] the options to use:
 *          [documentLoader(url, callback(err, remoteDoc))] the document loader.
 * @param callback(err, ctx) called once the operation completes.
 */
jsonld.processContext = function(activeCtx, localCtx) {
  // get arguments
  var options = {};
  var callbackArg = 2;
  if(arguments.length > 3) {
    options = arguments[2] || {};
    callbackArg += 1;
  }
  var callback = arguments[callbackArg];

  // set default options
  if(!('base' in options)) {
    options.base = '';
  }
  if(!('documentLoader' in options)) {
    options.documentLoader = jsonld.loadDocument;
  }

  // return initial context early for null context
  if(localCtx === null) {
    return callback(null, _getInitialContext(options));
  }

  // retrieve URLs in localCtx
  localCtx = _clone(localCtx);
  if(!(_isObject(localCtx) && '@context' in localCtx)) {
    localCtx = {'@context': localCtx};
  }
  _retrieveContextUrls(localCtx, options, function(err, ctx) {
    if(err) {
      return callback(err);
    }
    try {
      // process context
      ctx = new Processor().processContext(activeCtx, ctx, options);
    } catch(ex) {
      return callback(ex);
    }
    callback(null, ctx);
  });
};

/**
 * Returns true if the given subject has the given property.
 *
 * @param subject the subject to check.
 * @param property the property to look for.
 *
 * @return true if the subject has the given property, false if not.
 */
jsonld.hasProperty = function(subject, property) {
  var rval = false;
  if(property in subject) {
    var value = subject[property];
    rval = (!_isArray(value) || value.length > 0);
  }
  return rval;
};

/**
 * Determines if the given value is a property of the given subject.
 *
 * @param subject the subject to check.
 * @param property the property to check.
 * @param value the value to check.
 *
 * @return true if the value exists, false if not.
 */
jsonld.hasValue = function(subject, property, value) {
  var rval = false;
  if(jsonld.hasProperty(subject, property)) {
    var val = subject[property];
    var isList = _isList(val);
    if(_isArray(val) || isList) {
      if(isList) {
        val = val['@list'];
      }
      for(var i = 0; i < val.length; ++i) {
        if(jsonld.compareValues(value, val[i])) {
          rval = true;
          break;
        }
      }
    } else if(!_isArray(value)) {
      // avoid matching the set of values with an array value parameter
      rval = jsonld.compareValues(value, val);
    }
  }
  return rval;
};

/**
 * Adds a value to a subject. If the value is an array, all values in the
 * array will be added.
 *
 * @param subject the subject to add the value to.
 * @param property the property that relates the value to the subject.
 * @param value the value to add.
 * @param [options] the options to use:
 *        [propertyIsArray] true if the property is always an array, false
 *          if not (default: false).
 *        [allowDuplicate] true to allow duplicates, false not to (uses a
 *          simple shallow comparison of subject ID or value) (default: true).
 */
jsonld.addValue = function(subject, property, value, options) {
  options = options || {};
  if(!('propertyIsArray' in options)) {
    options.propertyIsArray = false;
  }
  if(!('allowDuplicate' in options)) {
    options.allowDuplicate = true;
  }

  if(_isArray(value)) {
    if(value.length === 0 && options.propertyIsArray &&
      !(property in subject)) {
      subject[property] = [];
    }
    for(var i = 0; i < value.length; ++i) {
      jsonld.addValue(subject, property, value[i], options);
    }
  } else if(property in subject) {
    // check if subject already has value if duplicates not allowed
    var hasValue = (!options.allowDuplicate &&
      jsonld.hasValue(subject, property, value));

    // make property an array if value not present or always an array
    if(!_isArray(subject[property]) &&
      (!hasValue || options.propertyIsArray)) {
      subject[property] = [subject[property]];
    }

    // add new value
    if(!hasValue) {
      subject[property].push(value);
    }
  } else {
    // add new value as set or single value
    subject[property] = options.propertyIsArray ? [value] : value;
  }
};

/**
 * Gets all of the values for a subject's property as an array.
 *
 * @param subject the subject.
 * @param property the property.
 *
 * @return all of the values for a subject's property as an array.
 */
jsonld.getValues = function(subject, property) {
  var rval = subject[property] || [];
  if(!_isArray(rval)) {
    rval = [rval];
  }
  return rval;
};

/**
 * Removes a property from a subject.
 *
 * @param subject the subject.
 * @param property the property.
 */
jsonld.removeProperty = function(subject, property) {
  delete subject[property];
};

/**
 * Removes a value from a subject.
 *
 * @param subject the subject.
 * @param property the property that relates the value to the subject.
 * @param value the value to remove.
 * @param [options] the options to use:
 *          [propertyIsArray] true if the property is always an array, false
 *            if not (default: false).
 */
jsonld.removeValue = function(subject, property, value, options) {
  options = options || {};
  if(!('propertyIsArray' in options)) {
    options.propertyIsArray = false;
  }

  // filter out value
  var values = jsonld.getValues(subject, property).filter(function(e) {
    return !jsonld.compareValues(e, value);
  });

  if(values.length === 0) {
    jsonld.removeProperty(subject, property);
  } else if(values.length === 1 && !options.propertyIsArray) {
    subject[property] = values[0];
  } else {
    subject[property] = values;
  }
};

/**
 * Compares two JSON-LD values for equality. Two JSON-LD values will be
 * considered equal if:
 *
 * 1. They are both primitives of the same type and value.
 * 2. They are both @values with the same @value, @type, @language,
 *   and @index, OR
 * 3. They both have @ids they are the same.
 *
 * @param v1 the first value.
 * @param v2 the second value.
 *
 * @return true if v1 and v2 are considered equal, false if not.
 */
jsonld.compareValues = function(v1, v2) {
  // 1. equal primitives
  if(v1 === v2) {
    return true;
  }

  // 2. equal @values
  if(_isValue(v1) && _isValue(v2) &&
    v1['@value'] === v2['@value'] &&
    v1['@type'] === v2['@type'] &&
    v1['@language'] === v2['@language'] &&
    v1['@index'] === v2['@index']) {
    return true;
  }

  // 3. equal @ids
  if(_isObject(v1) && ('@id' in v1) && _isObject(v2) && ('@id' in v2)) {
    return v1['@id'] === v2['@id'];
  }

  return false;
};

/**
 * Gets the value for the given active context key and type, null if none is
 * set.
 *
 * @param ctx the active context.
 * @param key the context key.
 * @param [type] the type of value to get (eg: '@id', '@type'), if not
 *          specified gets the entire entry for a key, null if not found.
 *
 * @return the value.
 */
jsonld.getContextValue = function(ctx, key, type) {
  var rval = null;

  // return null for invalid key
  if(key === null) {
    return rval;
  }

  // get default language
  if(type === '@language' && (type in ctx)) {
    rval = ctx[type];
  }

  // get specific entry information
  if(ctx.mappings[key]) {
    var entry = ctx.mappings[key];

    if(_isUndefined(type)) {
      // return whole entry
      rval = entry;
    } else if(type in entry) {
      // return entry value for type
      rval = entry[type];
    }
  }

  return rval;
};

/** Registered RDF dataset parsers hashed by content-type. */
var _rdfParsers = {};

/**
 * Registers an RDF dataset parser by content-type, for use with
 * jsonld.fromRDF. An RDF dataset parser will always be given two parameters,
 * a string of input and a callback. An RDF dataset parser can be synchronous
 * or asynchronous.
 *
 * If the parser function returns undefined or null then it will be assumed to
 * be asynchronous w/a continuation-passing style and the callback parameter
 * given to the parser MUST be invoked.
 *
 * If it returns a Promise, then it will be assumed to be asynchronous, but the
 * callback parameter MUST NOT be invoked. It should instead be ignored.
 *
 * If it returns an RDF dataset, it will be assumed to be synchronous and the
 * callback parameter MUST NOT be invoked. It should instead be ignored.
 *
 * @param contentType the content-type for the parser.
 * @param parser(input, callback(err, dataset)) the parser function (takes a
 *          string as a parameter and either returns null/undefined and uses
 *          the given callback, returns a Promise, or returns an RDF dataset).
 */
jsonld.registerRDFParser = function(contentType, parser) {
  _rdfParsers[contentType] = parser;
};

/**
 * Unregisters an RDF dataset parser by content-type.
 *
 * @param contentType the content-type for the parser.
 */
jsonld.unregisterRDFParser = function(contentType) {
  delete _rdfParsers[contentType];
};

if(_nodejs) {
  // needed for serialization of XML literals
  if(typeof XMLSerializer === 'undefined') {
    var XMLSerializer = null;
  }
  if(typeof Node === 'undefined') {
    var Node = {
      ELEMENT_NODE: 1,
      ATTRIBUTE_NODE: 2,
      TEXT_NODE: 3,
      CDATA_SECTION_NODE: 4,
      ENTITY_REFERENCE_NODE: 5,
      ENTITY_NODE: 6,
      PROCESSING_INSTRUCTION_NODE: 7,
      COMMENT_NODE: 8,
      DOCUMENT_NODE: 9,
      DOCUMENT_TYPE_NODE: 10,
      DOCUMENT_FRAGMENT_NODE: 11,
      NOTATION_NODE:12
    };
  }
}

// constants
var XSD_BOOLEAN = 'http://www.w3.org/2001/XMLSchema#boolean';
var XSD_DOUBLE = 'http://www.w3.org/2001/XMLSchema#double';
var XSD_INTEGER = 'http://www.w3.org/2001/XMLSchema#integer';
var XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

var RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
var RDF_LIST = RDF + 'List';
var RDF_FIRST = RDF + 'first';
var RDF_REST = RDF + 'rest';
var RDF_NIL = RDF + 'nil';
var RDF_TYPE = RDF + 'type';
var RDF_PLAIN_LITERAL = RDF + 'PlainLiteral';
var RDF_XML_LITERAL = RDF + 'XMLLiteral';
var RDF_OBJECT = RDF + 'object';
var RDF_LANGSTRING = RDF + 'langString';

var LINK_HEADER_REL = 'http://www.w3.org/ns/json-ld#context';
var MAX_CONTEXT_URLS = 10;

/**
 * A JSON-LD Error.
 *
 * @param msg the error message.
 * @param type the error type.
 * @param details the error details.
 */
var JsonLdError = function(msg, type, details) {
  if(_nodejs) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
  } else if(typeof Error !== 'undefined') {
    this.stack = (new Error()).stack;
  }
  this.name = type || 'jsonld.Error';
  this.message = msg || 'An unspecified JSON-LD error occurred.';
  this.details = details || {};
};
if(_nodejs) {
  require('util').inherits(JsonLdError, Error);
} else if(typeof Error !== 'undefined') {
  JsonLdError.prototype = new Error();
}

/**
 * Constructs a new JSON-LD Processor.
 */
var Processor = function() {};

/**
 * Recursively compacts an element using the given active context. All values
 * must be in expanded form before this method is called.
 *
 * @param activeCtx the active context to use.
 * @param activeProperty the compacted property associated with the element
 *          to compact, null for none.
 * @param element the element to compact.
 * @param options the compaction options.
 *
 * @return the compacted value.
 */
Processor.prototype.compact = function(
  activeCtx, activeProperty, element, options) {
  // recursively compact array
  if(_isArray(element)) {
    var rval = [];
    for(var i = 0; i < element.length; ++i) {
      // compact, dropping any null values
      var compacted = this.compact(
        activeCtx, activeProperty, element[i], options);
      if(compacted !== null) {
        rval.push(compacted);
      }
    }
    if(options.compactArrays && rval.length === 1) {
      // use single element if no container is specified
      var container = jsonld.getContextValue(
        activeCtx, activeProperty, '@container');
      if(container === null) {
        rval = rval[0];
      }
    }
    return rval;
  }

  // recursively compact object
  if(_isObject(element)) {
    if(options.link && '@id' in element && element['@id'] in options.link) {
      // check for a linked element to reuse
      var linked = options.link[element['@id']];
      for(var i = 0; i < linked.length; ++i) {
        if(linked[i].expanded === element) {
          return linked[i].compacted;
        }
      }
    }

    // do value compaction on @values and subject references
    if(_isValue(element) || _isSubjectReference(element)) {
      var rval = _compactValue(activeCtx, activeProperty, element);
      if(options.link && _isSubjectReference(element)) {
        // store linked element
        if(!(element['@id'] in options.link)) {
          options.link[element['@id']] = [];
        }
        options.link[element['@id']].push({expanded: element, compacted: rval});
      }
      return rval;
    }

    // FIXME: avoid misuse of active property as an expanded property?
    var insideReverse = (activeProperty === '@reverse');

    var rval = {};

    if(options.link && '@id' in element) {
      // store linked element
      if(!(element['@id'] in options.link)) {
        options.link[element['@id']] = [];
      }
      options.link[element['@id']].push({expanded: element, compacted: rval});
    }

    // process element keys in order
    var keys = Object.keys(element).sort();
    for(var ki = 0; ki < keys.length; ++ki) {
      var expandedProperty = keys[ki];
      var expandedValue = element[expandedProperty];

      // compact @id and @type(s)
      if(expandedProperty === '@id' || expandedProperty === '@type') {
        var compactedValue;

        // compact single @id
        if(_isString(expandedValue)) {
          compactedValue = _compactIri(
            activeCtx, expandedValue, null,
            {vocab: (expandedProperty === '@type')});
        } else {
          // expanded value must be a @type array
          compactedValue = [];
          for(var vi = 0; vi < expandedValue.length; ++vi) {
            compactedValue.push(_compactIri(
              activeCtx, expandedValue[vi], null, {vocab: true}));
          }
        }

        // use keyword alias and add value
        var alias = _compactIri(activeCtx, expandedProperty);
        var isArray = (_isArray(compactedValue) && expandedValue.length === 0);
        jsonld.addValue(
          rval, alias, compactedValue, {propertyIsArray: isArray});
        continue;
      }

      // handle @reverse
      if(expandedProperty === '@reverse') {
        // recursively compact expanded value
        var compactedValue = this.compact(
          activeCtx, '@reverse', expandedValue, options);

        // handle double-reversed properties
        for(var compactedProperty in compactedValue) {
          if(activeCtx.mappings[compactedProperty] &&
            activeCtx.mappings[compactedProperty].reverse) {
            var value = compactedValue[compactedProperty];
            var container = jsonld.getContextValue(
              activeCtx, compactedProperty, '@container');
            var useArray = (container === '@set' || !options.compactArrays);
            jsonld.addValue(
              rval, compactedProperty, value, {propertyIsArray: useArray});
            delete compactedValue[compactedProperty];
          }
        }

        if(Object.keys(compactedValue).length > 0) {
          // use keyword alias and add value
          var alias = _compactIri(activeCtx, expandedProperty);
          jsonld.addValue(rval, alias, compactedValue);
        }

        continue;
      }

      // handle @index property
      if(expandedProperty === '@index') {
        // drop @index if inside an @index container
        var container = jsonld.getContextValue(
          activeCtx, activeProperty, '@container');
        if(container === '@index') {
          continue;
        }

        // use keyword alias and add value
        var alias = _compactIri(activeCtx, expandedProperty);
        jsonld.addValue(rval, alias, expandedValue);
        continue;
      }

      // skip array processing for keywords that aren't @graph or @list
      if(expandedProperty !== '@graph' && expandedProperty !== '@list' &&
        _isKeyword(expandedProperty)) {
        // use keyword alias and add value as is
        var alias = _compactIri(activeCtx, expandedProperty);
        jsonld.addValue(rval, alias, expandedValue);
        continue;
      }

      // Note: expanded value must be an array due to expansion algorithm.

      // preserve empty arrays
      if(expandedValue.length === 0) {
        var itemActiveProperty = _compactIri(
          activeCtx, expandedProperty, expandedValue, {vocab: true},
          insideReverse);
        jsonld.addValue(
          rval, itemActiveProperty, expandedValue, {propertyIsArray: true});
      }

      // recusively process array values
      for(var vi = 0; vi < expandedValue.length; ++vi) {
        var expandedItem = expandedValue[vi];

        // compact property and get container type
        var itemActiveProperty = _compactIri(
          activeCtx, expandedProperty, expandedItem, {vocab: true},
          insideReverse);
        var container = jsonld.getContextValue(
          activeCtx, itemActiveProperty, '@container');

        // get @list value if appropriate
        var isList = _isList(expandedItem);
        var list = null;
        if(isList) {
          list = expandedItem['@list'];
        }

        // recursively compact expanded item
        var compactedItem = this.compact(
          activeCtx, itemActiveProperty, isList ? list : expandedItem, options);

        // handle @list
        if(isList) {
          // ensure @list value is an array
          if(!_isArray(compactedItem)) {
            compactedItem = [compactedItem];
          }

          if(container !== '@list') {
            // wrap using @list alias
            var wrapper = {};
            wrapper[_compactIri(activeCtx, '@list')] = compactedItem;
            compactedItem = wrapper;

            // include @index from expanded @list, if any
            if('@index' in expandedItem) {
              compactedItem[_compactIri(activeCtx, '@index')] =
                expandedItem['@index'];
            }
          } else if(itemActiveProperty in rval) {
            // can't use @list container for more than 1 list
            throw new JsonLdError(
              'JSON-LD compact error; property has a "@list" @container ' +
              'rule but there is more than a single @list that matches ' +
              'the compacted term in the document. Compaction might mix ' +
              'unwanted items into the list.',
              'jsonld.SyntaxError', {code: 'compaction to list of lists'});
          }
        }

        // handle language and index maps
        if(container === '@language' || container === '@index') {
          // get or create the map object
          var mapObject;
          if(itemActiveProperty in rval) {
            mapObject = rval[itemActiveProperty];
          } else {
            rval[itemActiveProperty] = mapObject = {};
          }

          // if container is a language map, simplify compacted value to
          // a simple string
          if(container === '@language' && _isValue(compactedItem)) {
            compactedItem = compactedItem['@value'];
          }

          // add compact value to map object using key from expanded value
          // based on the container type
          jsonld.addValue(mapObject, expandedItem[container], compactedItem);
        } else {
          // use an array if: compactArrays flag is false,
          // @container is @set or @list , value is an empty
          // array, or key is @graph
          var isArray = (!options.compactArrays || container === '@set' ||
            container === '@list' ||
            (_isArray(compactedItem) && compactedItem.length === 0) ||
            expandedProperty === '@list' || expandedProperty === '@graph');

          // add compact value
          jsonld.addValue(
            rval, itemActiveProperty, compactedItem,
            {propertyIsArray: isArray});
        }
      }
    }

    return rval;
  }

  // only primitives remain which are already compact
  return element;
};

/**
 * Recursively expands an element using the given context. Any context in
 * the element will be removed. All context URLs must have been retrieved
 * before calling this method.
 *
 * @param activeCtx the context to use.
 * @param activeProperty the property for the element, null for none.
 * @param element the element to expand.
 * @param options the expansion options.
 * @param insideList true if the element is a list, false if not.
 *
 * @return the expanded value.
 */
Processor.prototype.expand = function(
  activeCtx, activeProperty, element, options, insideList) {
  var self = this;

  // nothing to expand
  if(element === null || element === undefined) {
    return null;
  }

  if(!_isArray(element) && !_isObject(element)) {
    // drop free-floating scalars that are not in lists
    if(!insideList && (activeProperty === null ||
      _expandIri(activeCtx, activeProperty, {vocab: true}) === '@graph')) {
      return null;
    }

    // expand element according to value expansion rules
    return _expandValue(activeCtx, activeProperty, element);
  }

  // recursively expand array
  if(_isArray(element)) {
    var rval = [];
    var container = jsonld.getContextValue(
      activeCtx, activeProperty, '@container');
    insideList = insideList || container === '@list';
    for(var i = 0; i < element.length; ++i) {
      // expand element
      var e = self.expand(activeCtx, activeProperty, element[i], options);
      if(insideList && (_isArray(e) || _isList(e))) {
        // lists of lists are illegal
        throw new JsonLdError(
          'Invalid JSON-LD syntax; lists of lists are not permitted.',
          'jsonld.SyntaxError', {code: 'list of lists'});
      }
      // drop null values
      if(e !== null) {
        if(_isArray(e)) {
          rval = rval.concat(e);
        } else {
          rval.push(e);
        }
      }
    }
    return rval;
  }

  // recursively expand object:

  // if element has a context, process it
  if('@context' in element) {
    activeCtx = self.processContext(activeCtx, element['@context'], options);
  }

  // expand the active property
  var expandedActiveProperty = _expandIri(
    activeCtx, activeProperty, {vocab: true});

  var rval = {};
  var keys = Object.keys(element).sort();
  for(var ki = 0; ki < keys.length; ++ki) {
    var key = keys[ki];
    var value = element[key];
    var expandedValue;

    // skip @context
    if(key === '@context') {
      continue;
    }

    // expand property
    var expandedProperty = _expandIri(activeCtx, key, {vocab: true});

    // drop non-absolute IRI keys that aren't keywords
    if(expandedProperty === null ||
      !(_isAbsoluteIri(expandedProperty) || _isKeyword(expandedProperty))) {
      continue;
    }

    if(_isKeyword(expandedProperty)) {
      if(expandedActiveProperty === '@reverse') {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; a keyword cannot be used as a @reverse ' +
          'property.', 'jsonld.SyntaxError',
          {code: 'invalid reverse property map', value: value});
      }
      if(expandedProperty in rval) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; colliding keywords detected.',
          'jsonld.SyntaxError',
          {code: 'colliding keywords', keyword: expandedProperty});
      }
    }

    // syntax error if @id is not a string
    if(expandedProperty === '@id' && !_isString(value)) {
      if(!options.isFrame) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@id" value must a string.',
          'jsonld.SyntaxError', {code: 'invalid @id value', value: value});
      }
      if(!_isObject(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@id" value must be a string or an ' +
          'object.', 'jsonld.SyntaxError',
          {code: 'invalid @id value', value: value});
      }
    }

    if(expandedProperty === '@type') {
      _validateTypeValue(value);
    }

    // @graph must be an array or an object
    if(expandedProperty === '@graph' &&
      !(_isObject(value) || _isArray(value))) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; "@graph" value must not be an ' +
        'object or an array.',
        'jsonld.SyntaxError', {code: 'invalid @graph value', value: value});
    }

    // @value must not be an object or an array
    if(expandedProperty === '@value' &&
      (_isObject(value) || _isArray(value))) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; "@value" value must not be an ' +
        'object or an array.',
        'jsonld.SyntaxError',
        {code: 'invalid value object value', value: value});
    }

    // @language must be a string
    if(expandedProperty === '@language') {
      if(value === null) {
        // drop null @language values, they expand as if they didn't exist
        continue;
      }
      if(!_isString(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@language" value must be a string.',
          'jsonld.SyntaxError',
          {code: 'invalid language-tagged string', value: value});
      }
      // ensure language value is lowercase
      value = value.toLowerCase();
    }

    // @index must be a string
    if(expandedProperty === '@index') {
      if(!_isString(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@index" value must be a string.',
          'jsonld.SyntaxError',
          {code: 'invalid @index value', value: value});
      }
    }

    // @reverse must be an object
    if(expandedProperty === '@reverse') {
      if(!_isObject(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; "@reverse" value must be an object.',
          'jsonld.SyntaxError', {code: 'invalid @reverse value', value: value});
      }

      expandedValue = self.expand(activeCtx, '@reverse', value, options);

      // properties double-reversed
      if('@reverse' in expandedValue) {
        for(var property in expandedValue['@reverse']) {
          jsonld.addValue(
            rval, property, expandedValue['@reverse'][property],
            {propertyIsArray: true});
        }
      }

      // FIXME: can this be merged with code below to simplify?
      // merge in all reversed properties
      var reverseMap = rval['@reverse'] || null;
      for(var property in expandedValue) {
        if(property === '@reverse') {
          continue;
        }
        if(reverseMap === null) {
          reverseMap = rval['@reverse'] = {};
        }
        jsonld.addValue(reverseMap, property, [], {propertyIsArray: true});
        var items = expandedValue[property];
        for(var ii = 0; ii < items.length; ++ii) {
          var item = items[ii];
          if(_isValue(item) || _isList(item)) {
            throw new JsonLdError(
              'Invalid JSON-LD syntax; "@reverse" value must not be a ' +
              '@value or an @list.', 'jsonld.SyntaxError',
              {code: 'invalid reverse property value', value: expandedValue});
          }
          jsonld.addValue(
            reverseMap, property, item, {propertyIsArray: true});
        }
      }

      continue;
    }

    var container = jsonld.getContextValue(activeCtx, key, '@container');

    if(container === '@language' && _isObject(value)) {
      // handle language map container (skip if value is not an object)
      expandedValue = _expandLanguageMap(value);
    } else if(container === '@index' && _isObject(value)) {
      // handle index container (skip if value is not an object)
      expandedValue = (function _expandIndexMap(activeProperty) {
        var rval = [];
        var keys = Object.keys(value).sort();
        for(var ki = 0; ki < keys.length; ++ki) {
          var key = keys[ki];
          var val = value[key];
          if(!_isArray(val)) {
            val = [val];
          }
          val = self.expand(activeCtx, activeProperty, val, options, false);
          for(var vi = 0; vi < val.length; ++vi) {
            var item = val[vi];
            if(!('@index' in item)) {
              item['@index'] = key;
            }
            rval.push(item);
          }
        }
        return rval;
      })(key);
    } else {
      // recurse into @list or @set
      var isList = (expandedProperty === '@list');
      if(isList || expandedProperty === '@set') {
        var nextActiveProperty = activeProperty;
        if(isList && expandedActiveProperty === '@graph') {
          nextActiveProperty = null;
        }
        expandedValue = self.expand(
          activeCtx, nextActiveProperty, value, options, isList);
        if(isList && _isList(expandedValue)) {
          throw new JsonLdError(
            'Invalid JSON-LD syntax; lists of lists are not permitted.',
            'jsonld.SyntaxError', {code: 'list of lists'});
        }
      } else {
        // recursively expand value with key as new active property
        expandedValue = self.expand(activeCtx, key, value, options, false);
      }
    }

    // drop null values if property is not @value
    if(expandedValue === null && expandedProperty !== '@value') {
      continue;
    }

    // convert expanded value to @list if container specifies it
    if(expandedProperty !== '@list' && !_isList(expandedValue) &&
      container === '@list') {
      // ensure expanded value is an array
      expandedValue = (_isArray(expandedValue) ?
        expandedValue : [expandedValue]);
      expandedValue = {'@list': expandedValue};
    }

    // FIXME: can this be merged with code above to simplify?
    // merge in reverse properties
    if(activeCtx.mappings[key] && activeCtx.mappings[key].reverse) {
      var reverseMap = rval['@reverse'] = rval['@reverse'] || {};
      if(!_isArray(expandedValue)) {
        expandedValue = [expandedValue];
      }
      for(var ii = 0; ii < expandedValue.length; ++ii) {
        var item = expandedValue[ii];
        if(_isValue(item) || _isList(item)) {
          throw new JsonLdError(
            'Invalid JSON-LD syntax; "@reverse" value must not be a ' +
            '@value or an @list.', 'jsonld.SyntaxError',
            {code: 'invalid reverse property value', value: expandedValue});
        }
        jsonld.addValue(
          reverseMap, expandedProperty, item, {propertyIsArray: true});
      }
      continue;
    }

    // add value for property
    // use an array except for certain keywords
    var useArray =
      ['@index', '@id', '@type', '@value', '@language'].indexOf(
        expandedProperty) === -1;
    jsonld.addValue(
      rval, expandedProperty, expandedValue, {propertyIsArray: useArray});
  }

  // get property count on expanded output
  keys = Object.keys(rval);
  var count = keys.length;

  if('@value' in rval) {
    // @value must only have @language or @type
    if('@type' in rval && '@language' in rval) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; an element containing "@value" may not ' +
        'contain both "@type" and "@language".',
        'jsonld.SyntaxError', {code: 'invalid value object', element: rval});
    }
    var validCount = count - 1;
    if('@type' in rval) {
      validCount -= 1;
    }
    if('@index' in rval) {
      validCount -= 1;
    }
    if('@language' in rval) {
      validCount -= 1;
    }
    if(validCount !== 0) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; an element containing "@value" may only ' +
        'have an "@index" property and at most one other property ' +
        'which can be "@type" or "@language".',
        'jsonld.SyntaxError', {code: 'invalid value object', element: rval});
    }
    // drop null @values
    if(rval['@value'] === null) {
      rval = null;
    } else if('@language' in rval && !_isString(rval['@value'])) {
      // if @language is present, @value must be a string
      throw new JsonLdError(
        'Invalid JSON-LD syntax; only strings may be language-tagged.',
        'jsonld.SyntaxError',
        {code: 'invalid language-tagged value', element: rval});
    } else if('@type' in rval && (!_isAbsoluteIri(rval['@type']) ||
      rval['@type'].indexOf('_:') === 0)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; an element containing "@value" and "@type" ' +
        'must have an absolute IRI for the value of "@type".',
        'jsonld.SyntaxError', {code: 'invalid typed value', element: rval});
    }
  } else if('@type' in rval && !_isArray(rval['@type'])) {
    // convert @type to an array
    rval['@type'] = [rval['@type']];
  } else if('@set' in rval || '@list' in rval) {
    // handle @set and @list
    if(count > 1 && !(count === 2 && '@index' in rval)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; if an element has the property "@set" ' +
        'or "@list", then it can have at most one other property that is ' +
        '"@index".', 'jsonld.SyntaxError',
        {code: 'invalid set or list object', element: rval});
    }
    // optimize away @set
    if('@set' in rval) {
      rval = rval['@set'];
      keys = Object.keys(rval);
      count = keys.length;
    }
  } else if(count === 1 && '@language' in rval) {
    // drop objects with only @language
    rval = null;
  }

  // drop certain top-level objects that do not occur in lists
  if(_isObject(rval) &&
    !options.keepFreeFloatingNodes && !insideList &&
    (activeProperty === null || expandedActiveProperty === '@graph')) {
    // drop empty object, top-level @value/@list, or object with only @id
    if(count === 0 || '@value' in rval || '@list' in rval ||
      (count === 1 && '@id' in rval)) {
      rval = null;
    }
  }

  return rval;
};

/**
 * Creates a JSON-LD node map (node ID => node).
 *
 * @param input the expanded JSON-LD to create a node map of.
 * @param [options] the options to use:
 *          [namer] the UniqueNamer to use.
 *
 * @return the node map.
 */
Processor.prototype.createNodeMap = function(input, options) {
  options = options || {};

  // produce a map of all subjects and name each bnode
  var namer = options.namer || new UniqueNamer('_:b');
  var graphs = {'@default': {}};
  _createNodeMap(input, graphs, '@default', namer);

  // add all non-default graphs to default graph
  return _mergeNodeMaps(graphs);
};

/**
 * Performs JSON-LD flattening.
 *
 * @param input the expanded JSON-LD to flatten.
 *
 * @return the flattened output.
 */
Processor.prototype.flatten = function(input) {
  var defaultGraph = this.createNodeMap(input);

  // produce flattened output
  var flattened = [];
  var keys = Object.keys(defaultGraph).sort();
  for(var ki = 0; ki < keys.length; ++ki) {
    var node = defaultGraph[keys[ki]];
    // only add full subjects to top-level
    if(!_isSubjectReference(node)) {
      flattened.push(node);
    }
  }
  return flattened;
};

/**
 * Performs JSON-LD framing.
 *
 * @param input the expanded JSON-LD to frame.
 * @param frame the expanded JSON-LD frame to use.
 * @param options the framing options.
 *
 * @return the framed output.
 */
Processor.prototype.frame = function(input, frame, options) {
  // create framing state
  var state = {
    options: options,
    graphs: {'@default': {}, '@merged': {}},
    subjectStack: [],
    link: {}
  };

  // produce a map of all graphs and name each bnode
  // FIXME: currently uses subjects from @merged graph only
  var namer = new UniqueNamer('_:b');
  _createNodeMap(input, state.graphs, '@merged', namer);
  state.subjects = state.graphs['@merged'];

  // frame the subjects
  var framed = [];
  _frame(state, Object.keys(state.subjects).sort(), frame, framed, null);
  return framed;
};

/**
 * Performs normalization on the given RDF dataset.
 *
 * @param dataset the RDF dataset to normalize.
 * @param options the normalization options.
 * @param callback(err, normalized) called once the operation completes.
 */
Processor.prototype.normalize = function(dataset, options, callback) {
  // create quads and map bnodes to their associated quads
  var quads = [];
  var bnodes = {};
  for(var graphName in dataset) {
    var triples = dataset[graphName];
    if(graphName === '@default') {
      graphName = null;
    }
    for(var ti = 0; ti < triples.length; ++ti) {
      var quad = triples[ti];
      if(graphName !== null) {
        if(graphName.indexOf('_:') === 0) {
          quad.name = {type: 'blank node', value: graphName};
        } else {
          quad.name = {type: 'IRI', value: graphName};
        }
      }
      quads.push(quad);

      var attrs = ['subject', 'object', 'name'];
      for(var ai = 0; ai < attrs.length; ++ai) {
        var attr = attrs[ai];
        if(quad[attr] && quad[attr].type === 'blank node') {
          var id = quad[attr].value;
          if(id in bnodes) {
            bnodes[id].quads.push(quad);
          } else {
            bnodes[id] = {quads: [quad]};
          }
        }
      }
    }
  }

  // mapping complete, start canonical naming
  var namer = new UniqueNamer('_:c14n');
  return hashBlankNodes(Object.keys(bnodes));

  // generates unique and duplicate hashes for bnodes
  function hashBlankNodes(unnamed) {
    var nextUnnamed = [];
    var duplicates = {};
    var unique = {};

    // hash quads for each unnamed bnode
    jsonld.setImmediate(function() {hashUnnamed(0);});
    function hashUnnamed(i) {
      if(i === unnamed.length) {
        // done, name blank nodes
        return nameBlankNodes(unique, duplicates, nextUnnamed);
      }

      // hash unnamed bnode
      var bnode = unnamed[i];
      var hash = _hashQuads(bnode, bnodes);

      // store hash as unique or a duplicate
      if(hash in duplicates) {
        duplicates[hash].push(bnode);
        nextUnnamed.push(bnode);
      } else if(hash in unique) {
        duplicates[hash] = [unique[hash], bnode];
        nextUnnamed.push(unique[hash]);
        nextUnnamed.push(bnode);
        delete unique[hash];
      } else {
        unique[hash] = bnode;
      }

      // hash next unnamed bnode
      jsonld.setImmediate(function() {hashUnnamed(i + 1);});
    }
  }

  // names unique hash bnodes
  function nameBlankNodes(unique, duplicates, unnamed) {
    // name unique bnodes in sorted hash order
    var named = false;
    var hashes = Object.keys(unique).sort();
    for(var i = 0; i < hashes.length; ++i) {
      var bnode = unique[hashes[i]];
      namer.getName(bnode);
      named = true;
    }

    if(named) {
      // continue to hash bnodes if a bnode was assigned a name
      hashBlankNodes(unnamed);
    } else {
      // name the duplicate hash bnodes
      nameDuplicates(duplicates);
    }
  }

  // names duplicate hash bnodes
  function nameDuplicates(duplicates) {
    // enumerate duplicate hash groups in sorted order
    var hashes = Object.keys(duplicates).sort();

    // process each group
    processGroup(0);
    function processGroup(i) {
      if(i === hashes.length) {
        // done, create JSON-LD array
        return createArray();
      }

      // name each group member
      var group = duplicates[hashes[i]];
      var results = [];
      nameGroupMember(group, 0);
      function nameGroupMember(group, n) {
        if(n === group.length) {
          // name bnodes in hash order
          results.sort(function(a, b) {
            a = a.hash;
            b = b.hash;
            return (a < b) ? -1 : ((a > b) ? 1 : 0);
          });
          for(var r in results) {
            // name all bnodes in path namer in key-entry order
            // Note: key-order is preserved in javascript
            for(var key in results[r].pathNamer.existing) {
              namer.getName(key);
            }
          }
          return processGroup(i + 1);
        }

        // skip already-named bnodes
        var bnode = group[n];
        if(namer.isNamed(bnode)) {
          return nameGroupMember(group, n + 1);
        }

        // hash bnode paths
        var pathNamer = new UniqueNamer('_:b');
        pathNamer.getName(bnode);
        _hashPaths(bnode, bnodes, namer, pathNamer,
          function(err, result) {
            if(err) {
              return callback(err);
            }
            results.push(result);
            nameGroupMember(group, n + 1);
          });
      }
    }
  }

  // creates the sorted array of RDF quads
  function createArray() {
    var normalized = [];

    /* Note: At this point all bnodes in the set of RDF quads have been
     assigned canonical names, which have been stored in the 'namer' object.
     Here each quad is updated by assigning each of its bnodes its new name
     via the 'namer' object. */

    // update bnode names in each quad and serialize
    for(var i = 0; i < quads.length; ++i) {
      var quad = quads[i];
      var attrs = ['subject', 'object', 'name'];
      for(var ai = 0; ai < attrs.length; ++ai) {
        var attr = attrs[ai];
        if(quad[attr] && quad[attr].type === 'blank node' &&
          quad[attr].value.indexOf('_:c14n') !== 0) {
          quad[attr].value = namer.getName(quad[attr].value);
        }
      }
      normalized.push(_toNQuad(quad, quad.name ? quad.name.value : null));
    }

    // sort normalized output
    normalized.sort();

    // handle output format
    if(options.format) {
      if(options.format === 'application/nquads') {
        return callback(null, normalized.join(''));
      }
      return callback(new JsonLdError(
        'Unknown output format.',
        'jsonld.UnknownFormat', {format: options.format}));
    }

    // output RDF dataset
    callback(null, _parseNQuads(normalized.join('')));
  }
};

/**
 * Converts an RDF dataset to JSON-LD.
 *
 * @param dataset the RDF dataset.
 * @param options the RDF serialization options.
 * @param callback(err, output) called once the operation completes.
 */
Processor.prototype.fromRDF = function(dataset, options, callback) {
  var defaultGraph = {};
  var graphMap = {'@default': defaultGraph};
  var referencedOnce = {};

  for(var name in dataset) {
    var graph = dataset[name];
    if(!(name in graphMap)) {
      graphMap[name] = {};
    }
    if(name !== '@default' && !(name in defaultGraph)) {
      defaultGraph[name] = {'@id': name};
    }
    var nodeMap = graphMap[name];
    for(var ti = 0; ti < graph.length; ++ti) {
      var triple = graph[ti];

      // get subject, predicate, object
      var s = triple.subject.value;
      var p = triple.predicate.value;
      var o = triple.object;

      if(!(s in nodeMap)) {
        nodeMap[s] = {'@id': s};
      }
      var node = nodeMap[s];

      var objectIsId = (o.type === 'IRI' || o.type === 'blank node');
      if(objectIsId && !(o.value in nodeMap)) {
        nodeMap[o.value] = {'@id': o.value};
      }

      if(p === RDF_TYPE && !options.useRdfType && objectIsId) {
        jsonld.addValue(node, '@type', o.value, {propertyIsArray: true});
        continue;
      }

      var value = _RDFToObject(o, options.useNativeTypes);
      jsonld.addValue(node, p, value, {propertyIsArray: true});

      // object may be an RDF list/partial list node but we can't know easily
      // until all triples are read
      if(objectIsId) {
        if(o.value === RDF_NIL) {
          // track rdf:nil uniquely per graph
          var object = nodeMap[o.value];
          if(!('usages' in object)) {
            object.usages = [];
          }
          object.usages.push({
            node: node,
            property: p,
            value: value
          });
        } else if(o.value in referencedOnce) {
          // object referenced more than once
          referencedOnce[o.value] = false;
        } else {
          // keep track of single reference
          referencedOnce[o.value] = {
            node: node,
            property: p,
            value: value
          };
        }
      }
    }
  }

  // convert linked lists to @list arrays
  for(var name in graphMap) {
    var graphObject = graphMap[name];

    // no @lists to be converted, continue
    if(!(RDF_NIL in graphObject)) {
      continue;
    }

    // iterate backwards through each RDF list
    var nil = graphObject[RDF_NIL];
    for(var i = 0; i < nil.usages.length; ++i) {
      var usage = nil.usages[i];
      var node = usage.node;
      var property = usage.property;
      var head = usage.value;
      var list = [];
      var listNodes = [];

      // ensure node is a well-formed list node; it must:
      // 1. Be referenced only once.
      // 2. Have an array for rdf:first that has 1 item.
      // 3. Have an array for rdf:rest that has 1 item.
      // 4. Have no keys other than: @id, rdf:first, rdf:rest, and,
      //   optionally, @type where the value is rdf:List.
      var nodeKeyCount = Object.keys(node).length;
      while(property === RDF_REST &&
        _isObject(referencedOnce[node['@id']]) &&
        _isArray(node[RDF_FIRST]) && node[RDF_FIRST].length === 1 &&
        _isArray(node[RDF_REST]) && node[RDF_REST].length === 1 &&
        (nodeKeyCount === 3 || (nodeKeyCount === 4 && _isArray(node['@type']) &&
          node['@type'].length === 1 && node['@type'][0] === RDF_LIST))) {
        list.push(node[RDF_FIRST][0]);
        listNodes.push(node['@id']);

        // get next node, moving backwards through list
        usage = referencedOnce[node['@id']];
        node = usage.node;
        property = usage.property;
        head = usage.value;
        nodeKeyCount = Object.keys(node).length;

        // if node is not a blank node, then list head found
        if(node['@id'].indexOf('_:') !== 0) {
          break;
        }
      }

      // the list is nested in another list
      if(property === RDF_FIRST) {
        // empty list
        if(node['@id'] === RDF_NIL) {
          // can't convert rdf:nil to a @list object because it would
          // result in a list of lists which isn't supported
          continue;
        }

        // preserve list head
        head = graphObject[head['@id']][RDF_REST][0];
        list.pop();
        listNodes.pop();
      }

      // transform list into @list object
      delete head['@id'];
      head['@list'] = list.reverse();
      for(var j = 0; j < listNodes.length; ++j) {
        delete graphObject[listNodes[j]];
      }
    }

    delete nil.usages;
  }

  var result = [];
  var subjects = Object.keys(defaultGraph).sort();
  for(var i = 0; i < subjects.length; ++i) {
    var subject = subjects[i];
    var node = defaultGraph[subject];
    if(subject in graphMap) {
      var graph = node['@graph'] = [];
      var graphObject = graphMap[subject];
      var subjects_ = Object.keys(graphObject).sort();
      for(var si = 0; si < subjects_.length; ++si) {
        var node_ = graphObject[subjects_[si]];
        // only add full subjects to top-level
        if(!_isSubjectReference(node_)) {
          graph.push(node_);
        }
      }
    }
    // only add full subjects to top-level
    if(!_isSubjectReference(node)) {
      result.push(node);
    }
  }

  callback(null, result);
};

/**
 * Outputs an RDF dataset for the expanded JSON-LD input.
 *
 * @param input the expanded JSON-LD input.
 * @param options the RDF serialization options.
 *
 * @return the RDF dataset.
 */
Processor.prototype.toRDF = function(input, options) {
  // create node map for default graph (and any named graphs)
  var namer = new UniqueNamer('_:b');
  var nodeMap = {'@default': {}};
  _createNodeMap(input, nodeMap, '@default', namer);

  var dataset = {};
  var graphNames = Object.keys(nodeMap).sort();
  for(var i = 0; i < graphNames.length; ++i) {
    var graphName = graphNames[i];
    // skip relative IRIs
    if(graphName === '@default' || _isAbsoluteIri(graphName)) {
      dataset[graphName] = _graphToRDF(nodeMap[graphName], namer, options);
    }
  }
  return dataset;
};

/**
 * Processes a local context and returns a new active context.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context to process.
 * @param options the context processing options.
 *
 * @return the new active context.
 */
Processor.prototype.processContext = function(activeCtx, localCtx, options) {
  // normalize local context to an array of @context objects
  if(_isObject(localCtx) && '@context' in localCtx &&
    _isArray(localCtx['@context'])) {
    localCtx = localCtx['@context'];
  }
  var ctxs = _isArray(localCtx) ? localCtx : [localCtx];

  // no contexts in array, clone existing context
  if(ctxs.length === 0) {
    return activeCtx.clone();
  }

  // process each context in order, update active context
  // on each iteration to ensure proper caching
  var rval = activeCtx;
  for(var i = 0; i < ctxs.length; ++i) {
    var ctx = ctxs[i];

    // reset to initial context
    if(ctx === null) {
      rval = activeCtx = _getInitialContext(options);
      continue;
    }

    // dereference @context key if present
    if(_isObject(ctx) && '@context' in ctx) {
      ctx = ctx['@context'];
    }

    // context must be an object by now, all URLs retrieved before this call
    if(!_isObject(ctx)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context must be an object.',
        'jsonld.SyntaxError', {code: 'invalid local context', context: ctx});
    }

    // get context from cache if available
    if(jsonld.cache.activeCtx) {
      var cached = jsonld.cache.activeCtx.get(activeCtx, ctx);
      if(cached) {
        rval = activeCtx = cached;
        continue;
      }
    }

    // update active context and clone new one before updating
    activeCtx = rval;
    rval = rval.clone();

    // define context mappings for keys in local context
    var defined = {};

    // handle @base
    if('@base' in ctx) {
      var base = ctx['@base'];

      // clear base
      if(base === null) {
        base = null;
      } else if(!_isString(base)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@base" in a ' +
          '@context must be a string or null.',
          'jsonld.SyntaxError', {code: 'invalid base IRI', context: ctx});
      } else if(base !== '' && !_isAbsoluteIri(base)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@base" in a ' +
          '@context must be an absolute IRI or the empty string.',
          'jsonld.SyntaxError', {code: 'invalid base IRI', context: ctx});
      }

      if(base !== null) {
        base = jsonld.url.parse(base || '');
      }
      rval['@base'] = base;
      defined['@base'] = true;
    }

    // handle @vocab
    if('@vocab' in ctx) {
      var value = ctx['@vocab'];
      if(value === null) {
        delete rval['@vocab'];
      } else if(!_isString(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@vocab" in a ' +
          '@context must be a string or null.',
          'jsonld.SyntaxError', {code: 'invalid vocab mapping', context: ctx});
      } else if(!_isAbsoluteIri(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@vocab" in a ' +
          '@context must be an absolute IRI.',
          'jsonld.SyntaxError', {code: 'invalid vocab mapping', context: ctx});
      } else {
        rval['@vocab'] = value;
      }
      defined['@vocab'] = true;
    }

    // handle @language
    if('@language' in ctx) {
      var value = ctx['@language'];
      if(value === null) {
        delete rval['@language'];
      } else if(!_isString(value)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; the value of "@language" in a ' +
          '@context must be a string or null.',
          'jsonld.SyntaxError',
          {code: 'invalid default language', context: ctx});
      } else {
        rval['@language'] = value.toLowerCase();
      }
      defined['@language'] = true;
    }

    // process all other keys
    for(var key in ctx) {
      _createTermDefinition(rval, ctx, key, defined);
    }

    // cache result
    if(jsonld.cache.activeCtx) {
      jsonld.cache.activeCtx.set(activeCtx, ctx, rval);
    }
  }

  return rval;
};

/**
 * Expands a language map.
 *
 * @param languageMap the language map to expand.
 *
 * @return the expanded language map.
 */
function _expandLanguageMap(languageMap) {
  var rval = [];
  var keys = Object.keys(languageMap).sort();
  for(var ki = 0; ki < keys.length; ++ki) {
    var key = keys[ki];
    var val = languageMap[key];
    if(!_isArray(val)) {
      val = [val];
    }
    for(var vi = 0; vi < val.length; ++vi) {
      var item = val[vi];
      if(!_isString(item)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; language map values must be strings.',
          'jsonld.SyntaxError',
          {code: 'invalid language map value', languageMap: languageMap});
      }
      rval.push({
        '@value': item,
        '@language': key.toLowerCase()
      });
    }
  }
  return rval;
}

/**
 * Labels the blank nodes in the given value using the given UniqueNamer.
 *
 * @param namer the UniqueNamer to use.
 * @param element the element with blank nodes to rename.
 *
 * @return the element.
 */
function _labelBlankNodes(namer, element) {
  if(_isArray(element)) {
    for(var i = 0; i < element.length; ++i) {
      element[i] = _labelBlankNodes(namer, element[i]);
    }
  } else if(_isList(element)) {
    element['@list'] = _labelBlankNodes(namer, element['@list']);
  } else if(_isObject(element)) {
    // rename blank node
    if(_isBlankNode(element)) {
      element['@id'] = namer.getName(element['@id']);
    }

    // recursively apply to all keys
    var keys = Object.keys(element).sort();
    for(var ki = 0; ki < keys.length; ++ki) {
      var key = keys[ki];
      if(key !== '@id') {
        element[key] = _labelBlankNodes(namer, element[key]);
      }
    }
  }

  return element;
}

/**
 * Expands the given value by using the coercion and keyword rules in the
 * given context.
 *
 * @param activeCtx the active context to use.
 * @param activeProperty the active property the value is associated with.
 * @param value the value to expand.
 *
 * @return the expanded value.
 */
function _expandValue(activeCtx, activeProperty, value) {
  // nothing to expand
  if(value === null || value === undefined) {
    return null;
  }

  // special-case expand @id and @type (skips '@id' expansion)
  var expandedProperty = _expandIri(activeCtx, activeProperty, {vocab: true});
  if(expandedProperty === '@id') {
    return _expandIri(activeCtx, value, {base: true});
  } else if(expandedProperty === '@type') {
    return _expandIri(activeCtx, value, {vocab: true, base: true});
  }

  // get type definition from context
  var type = jsonld.getContextValue(activeCtx, activeProperty, '@type');

  // do @id expansion (automatic for @graph)
  if(type === '@id' || (expandedProperty === '@graph' && _isString(value))) {
    return {'@id': _expandIri(activeCtx, value, {base: true})};
  }
  // do @id expansion w/vocab
  if(type === '@vocab') {
    return {'@id': _expandIri(activeCtx, value, {vocab: true, base: true})};
  }

  // do not expand keyword values
  if(_isKeyword(expandedProperty)) {
    return value;
  }

  var rval = {};

  if(type !== null) {
    // other type
    rval['@type'] = type;
  } else if(_isString(value)) {
    // check for language tagging for strings
    var language = jsonld.getContextValue(
      activeCtx, activeProperty, '@language');
    if(language !== null) {
      rval['@language'] = language;
    }
  }
  // do conversion of values that aren't basic JSON types to strings
  if(['boolean', 'number', 'string'].indexOf(typeof value) === -1) {
    value = value.toString();
  }
  rval['@value'] = value;

  return rval;
}

/**
 * Creates an array of RDF triples for the given graph.
 *
 * @param graph the graph to create RDF triples for.
 * @param namer a UniqueNamer for assigning blank node names.
 * @param options the RDF serialization options.
 *
 * @return the array of RDF triples for the given graph.
 */
function _graphToRDF(graph, namer, options) {
  var rval = [];

  var ids = Object.keys(graph).sort();
  for(var i = 0; i < ids.length; ++i) {
    var id = ids[i];
    var node = graph[id];
    var properties = Object.keys(node).sort();
    for(var pi = 0; pi < properties.length; ++pi) {
      var property = properties[pi];
      var items = node[property];
      if(property === '@type') {
        property = RDF_TYPE;
      } else if(_isKeyword(property)) {
        continue;
      }

      for(var ii = 0; ii < items.length; ++ii) {
        var item = items[ii];

        // RDF subject
        var subject = {};
        subject.type = (id.indexOf('_:') === 0) ? 'blank node' : 'IRI';
        subject.value = id;

        // skip relative IRI subjects
        if(!_isAbsoluteIri(id)) {
          continue;
        }

        // RDF predicate
        var predicate = {};
        predicate.type = (property.indexOf('_:') === 0) ? 'blank node' : 'IRI';
        predicate.value = property;

        // skip relative IRI predicates
        if(!_isAbsoluteIri(property)) {
          continue;
        }

        // skip blank node predicates unless producing generalized RDF
        if(predicate.type === 'blank node' && !options.produceGeneralizedRdf) {
          continue;
        }

        // convert @list to triples
        if(_isList(item)) {
          _listToRDF(item['@list'], namer, subject, predicate, rval);
        } else {
          // convert value or node object to triple
          var object = _objectToRDF(item);
          // skip null objects (they are relative IRIs)
          if(object) {
            rval.push({subject: subject, predicate: predicate, object: object});
          }
        }
      }
    }
  }

  return rval;
}

/**
 * Converts a @list value into linked list of blank node RDF triples
 * (an RDF collection).
 *
 * @param list the @list value.
 * @param namer a UniqueNamer for assigning blank node names.
 * @param subject the subject for the head of the list.
 * @param predicate the predicate for the head of the list.
 * @param triples the array of triples to append to.
 */
function _listToRDF(list, namer, subject, predicate, triples) {
  var first = {type: 'IRI', value: RDF_FIRST};
  var rest = {type: 'IRI', value: RDF_REST};
  var nil = {type: 'IRI', value: RDF_NIL};

  for(var i = 0; i < list.length; ++i) {
    var item = list[i];

    var blankNode = {type: 'blank node', value: namer.getName()};
    triples.push({subject: subject, predicate: predicate, object: blankNode});

    subject = blankNode;
    predicate = first;
    var object = _objectToRDF(item);

    // skip null objects (they are relative IRIs)
    if(object) {
      triples.push({subject: subject, predicate: predicate, object: object});
    }

    predicate = rest;
  }

  triples.push({subject: subject, predicate: predicate, object: nil});
}

/**
 * Converts a JSON-LD value object to an RDF literal or a JSON-LD string or
 * node object to an RDF resource.
 *
 * @param item the JSON-LD value or node object.
 *
 * @return the RDF literal or RDF resource.
 */
function _objectToRDF(item) {
  var object = {};

  // convert value object to RDF
  if(_isValue(item)) {
    object.type = 'literal';
    var value = item['@value'];
    var datatype = item['@type'] || null;

    // convert to XSD datatypes as appropriate
    if(_isBoolean(value)) {
      object.value = value.toString();
      object.datatype = datatype || XSD_BOOLEAN;
    } else if(_isDouble(value) || datatype === XSD_DOUBLE) {
      if(!_isDouble(value)) {
        value = parseFloat(value);
      }
      // canonical double representation
      object.value = value.toExponential(15).replace(/(\d)0*e\+?/, '$1E');
      object.datatype = datatype || XSD_DOUBLE;
    } else if(_isNumber(value)) {
      object.value = value.toFixed(0);
      object.datatype = datatype || XSD_INTEGER;
    } else if('@language' in item) {
      object.value = value;
      object.datatype = datatype || RDF_LANGSTRING;
      object.language = item['@language'];
    } else {
      object.value = value;
      object.datatype = datatype || XSD_STRING;
    }
  } else {
    // convert string/node object to RDF
    var id = _isObject(item) ? item['@id'] : item;
    object.type = (id.indexOf('_:') === 0) ? 'blank node' : 'IRI';
    object.value = id;
  }

  // skip relative IRIs
  if(object.type === 'IRI' && !_isAbsoluteIri(object.value)) {
    return null;
  }

  return object;
}

/**
 * Converts an RDF triple object to a JSON-LD object.
 *
 * @param o the RDF triple object to convert.
 * @param useNativeTypes true to output native types, false not to.
 *
 * @return the JSON-LD object.
 */
function _RDFToObject(o, useNativeTypes) {
  // convert IRI/blank node object to JSON-LD
  if(o.type === 'IRI' || o.type === 'blank node') {
    return {'@id': o.value};
  }

  // convert literal to JSON-LD
  var rval = {'@value': o.value};

  // add language
  if(o.language) {
    rval['@language'] = o.language;
  } else {
    var type = o.datatype;
    if(!type) {
      type = XSD_STRING;
    }
    // use native types for certain xsd types
    if(useNativeTypes) {
      if(type === XSD_BOOLEAN) {
        if(rval['@value'] === 'true') {
          rval['@value'] = true;
        } else if(rval['@value'] === 'false') {
          rval['@value'] = false;
        }
      } else if(_isNumeric(rval['@value'])) {
        if(type === XSD_INTEGER) {
          var i = parseInt(rval['@value'], 10);
          if(i.toFixed(0) === rval['@value']) {
            rval['@value'] = i;
          }
        } else if(type === XSD_DOUBLE) {
          rval['@value'] = parseFloat(rval['@value']);
        }
      }
      // do not add native type
      if([XSD_BOOLEAN, XSD_INTEGER, XSD_DOUBLE, XSD_STRING]
        .indexOf(type) === -1) {
        rval['@type'] = type;
      }
    } else if(type !== XSD_STRING) {
      rval['@type'] = type;
    }
  }

  return rval;
}

/**
 * Compares two RDF triples for equality.
 *
 * @param t1 the first triple.
 * @param t2 the second triple.
 *
 * @return true if the triples are the same, false if not.
 */
function _compareRDFTriples(t1, t2) {
  var attrs = ['subject', 'predicate', 'object'];
  for(var i = 0; i < attrs.length; ++i) {
    var attr = attrs[i];
    if(t1[attr].type !== t2[attr].type || t1[attr].value !== t2[attr].value) {
      return false;
    }
  }
  if(t1.object.language !== t2.object.language) {
    return false;
  }
  if(t1.object.datatype !== t2.object.datatype) {
    return false;
  }
  return true;
}

/**
 * Hashes all of the quads about a blank node.
 *
 * @param id the ID of the bnode to hash quads for.
 * @param bnodes the mapping of bnodes to quads.
 *
 * @return the new hash.
 */
function _hashQuads(id, bnodes) {
  // return cached hash
  if('hash' in bnodes[id]) {
    return bnodes[id].hash;
  }

  // serialize all of bnode's quads
  var quads = bnodes[id].quads;
  var nquads = [];
  for(var i = 0; i < quads.length; ++i) {
    nquads.push(_toNQuad(
      quads[i], quads[i].name ? quads[i].name.value : null, id));
  }
  // sort serialized quads
  nquads.sort();
  // return hashed quads
  var hash = bnodes[id].hash = sha1.hash(nquads);
  return hash;
}

/**
 * Produces a hash for the paths of adjacent bnodes for a bnode,
 * incorporating all information about its subgraph of bnodes. This
 * method will recursively pick adjacent bnode permutations that produce the
 * lexicographically-least 'path' serializations.
 *
 * @param id the ID of the bnode to hash paths for.
 * @param bnodes the map of bnode quads.
 * @param namer the canonical bnode namer.
 * @param pathNamer the namer used to assign names to adjacent bnodes.
 * @param callback(err, result) called once the operation completes.
 */
function _hashPaths(id, bnodes, namer, pathNamer, callback) {
  // create SHA-1 digest
  var md = sha1.create();

  // group adjacent bnodes by hash, keep properties and references separate
  var groups = {};
  var groupHashes;
  var quads = bnodes[id].quads;
  jsonld.setImmediate(function() {groupNodes(0);});
  function groupNodes(i) {
    if(i === quads.length) {
      // done, hash groups
      groupHashes = Object.keys(groups).sort();
      return hashGroup(0);
    }

    // get adjacent bnode
    var quad = quads[i];
    var bnode = _getAdjacentBlankNodeName(quad.subject, id);
    var direction = null;
    if(bnode !== null) {
      // normal property
      direction = 'p';
    } else {
      bnode = _getAdjacentBlankNodeName(quad.object, id);
      if(bnode !== null) {
        // reverse property
        direction = 'r';
      }
    }

    if(bnode !== null) {
      // get bnode name (try canonical, path, then hash)
      var name;
      if(namer.isNamed(bnode)) {
        name = namer.getName(bnode);
      } else if(pathNamer.isNamed(bnode)) {
        name = pathNamer.getName(bnode);
      } else {
        name = _hashQuads(bnode, bnodes);
      }

      // hash direction, property, and bnode name/hash
      var md = sha1.create();
      md.update(direction);
      md.update(quad.predicate.value);
      md.update(name);
      var groupHash = md.digest();

      // add bnode to hash group
      if(groupHash in groups) {
        groups[groupHash].push(bnode);
      } else {
        groups[groupHash] = [bnode];
      }
    }

    jsonld.setImmediate(function() {groupNodes(i + 1);});
  }

  // hashes a group of adjacent bnodes
  function hashGroup(i) {
    if(i === groupHashes.length) {
      // done, return SHA-1 digest and path namer
      return callback(null, {hash: md.digest(), pathNamer: pathNamer});
    }

    // digest group hash
    var groupHash = groupHashes[i];
    md.update(groupHash);

    // choose a path and namer from the permutations
    var chosenPath = null;
    var chosenNamer = null;
    var permutator = new Permutator(groups[groupHash]);
    jsonld.setImmediate(function() {permutate();});
    function permutate() {
      var permutation = permutator.next();
      var pathNamerCopy = pathNamer.clone();

      // build adjacent path
      var path = '';
      var recurse = [];
      for(var n in permutation) {
        var bnode = permutation[n];

        // use canonical name if available
        if(namer.isNamed(bnode)) {
          path += namer.getName(bnode);
        } else {
          // recurse if bnode isn't named in the path yet
          if(!pathNamerCopy.isNamed(bnode)) {
            recurse.push(bnode);
          }
          path += pathNamerCopy.getName(bnode);
        }

        // skip permutation if path is already >= chosen path
        if(chosenPath !== null && path.length >= chosenPath.length &&
          path > chosenPath) {
          return nextPermutation(true);
        }
      }

      // does the next recursion
      nextRecursion(0);
      function nextRecursion(n) {
        if(n === recurse.length) {
          // done, do next permutation
          return nextPermutation(false);
        }

        // do recursion
        var bnode = recurse[n];
        _hashPaths(bnode, bnodes, namer, pathNamerCopy,
          function(err, result) {
            if(err) {
              return callback(err);
            }
            path += pathNamerCopy.getName(bnode) + '<' + result.hash + '>';
            pathNamerCopy = result.pathNamer;

            // skip permutation if path is already >= chosen path
            if(chosenPath !== null && path.length >= chosenPath.length &&
              path > chosenPath) {
              return nextPermutation(true);
            }

            // do next recursion
            nextRecursion(n + 1);
          });
      }

      // stores the results of this permutation and runs the next
      function nextPermutation(skipped) {
        if(!skipped && (chosenPath === null || path < chosenPath)) {
          chosenPath = path;
          chosenNamer = pathNamerCopy;
        }

        // do next permutation
        if(permutator.hasNext()) {
          jsonld.setImmediate(function() {permutate();});
        } else {
          // digest chosen path and update namer
          md.update(chosenPath);
          pathNamer = chosenNamer;

          // hash the next group
          hashGroup(i + 1);
        }
      }
    }
  }
}

/**
 * A helper function that gets the blank node name from an RDF quad node
 * (subject or object). If the node is a blank node and its value
 * does not match the given blank node ID, it will be returned.
 *
 * @param node the RDF quad node.
 * @param id the ID of the blank node to look next to.
 *
 * @return the adjacent blank node name or null if none was found.
 */
function _getAdjacentBlankNodeName(node, id) {
  return (node.type === 'blank node' && node.value !== id ? node.value : null);
}

/**
 * Recursively flattens the subjects in the given JSON-LD expanded input
 * into a node map.
 *
 * @param input the JSON-LD expanded input.
 * @param graphs a map of graph name to subject map.
 * @param graph the name of the current graph.
 * @param namer the blank node namer.
 * @param name the name assigned to the current input if it is a bnode.
 * @param list the list to append to, null for none.
 */
function _createNodeMap(input, graphs, graph, namer, name, list) {
  // recurse through array
  if(_isArray(input)) {
    for(var i = 0; i < input.length; ++i) {
      _createNodeMap(input[i], graphs, graph, namer, undefined, list);
    }
    return;
  }

  // add non-object to list
  if(!_isObject(input)) {
    if(list) {
      list.push(input);
    }
    return;
  }

  // add values to list
  if(_isValue(input)) {
    if('@type' in input) {
      var type = input['@type'];
      // rename @type blank node
      if(type.indexOf('_:') === 0) {
        input['@type'] = type = namer.getName(type);
      }
    }
    if(list) {
      list.push(input);
    }
    return;
  }

  // Note: At this point, input must be a subject.

  // spec requires @type to be named first, so assign names early
  if('@type' in input) {
    var types = input['@type'];
    for(var i = 0; i < types.length; ++i) {
      var type = types[i];
      if(type.indexOf('_:') === 0) {
        namer.getName(type);
      }
    }
  }

  // get name for subject
  if(_isUndefined(name)) {
    name = _isBlankNode(input) ? namer.getName(input['@id']) : input['@id'];
  }

  // add subject reference to list
  if(list) {
    list.push({'@id': name});
  }

  // create new subject or merge into existing one
  var subjects = graphs[graph];
  var subject = subjects[name] = subjects[name] || {};
  subject['@id'] = name;
  var properties = Object.keys(input).sort();
  for(var pi = 0; pi < properties.length; ++pi) {
    var property = properties[pi];

    // skip @id
    if(property === '@id') {
      continue;
    }

    // handle reverse properties
    if(property === '@reverse') {
      var referencedNode = {'@id': name};
      var reverseMap = input['@reverse'];
      for(var reverseProperty in reverseMap) {
        var items = reverseMap[reverseProperty];
        for(var ii = 0; ii < items.length; ++ii) {
          var item = items[ii];
          var itemName = item['@id'];
          if(_isBlankNode(item)) {
            itemName = namer.getName(itemName);
          }
          _createNodeMap(item, graphs, graph, namer, itemName);
          jsonld.addValue(
            subjects[itemName], reverseProperty, referencedNode,
            {propertyIsArray: true, allowDuplicate: false});
        }
      }
      continue;
    }

    // recurse into graph
    if(property === '@graph') {
      // add graph subjects map entry
      if(!(name in graphs)) {
        graphs[name] = {};
      }
      var g = (graph === '@merged') ? graph : name;
      _createNodeMap(input[property], graphs, g, namer);
      continue;
    }

    // copy non-@type keywords
    if(property !== '@type' && _isKeyword(property)) {
      if(property === '@index' && '@index' in subject) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; conflicting @index property detected.',
          'jsonld.SyntaxError',
          {code: 'conflicting indexes', subject: subject});
      }
      subject[property] = input[property];
      continue;
    }

    // iterate over objects
    var objects = input[property];

    // if property is a bnode, assign it a new id
    if(property.indexOf('_:') === 0) {
      property = namer.getName(property);
    }

    // ensure property is added for empty arrays
    if(objects.length === 0) {
      jsonld.addValue(subject, property, [], {propertyIsArray: true});
      continue;
    }
    for(var oi = 0; oi < objects.length; ++oi) {
      var o = objects[oi];

      if(property === '@type') {
        // rename @type blank nodes
        o = (o.indexOf('_:') === 0) ? namer.getName(o) : o;
      }

      // handle embedded subject or subject reference
      if(_isSubject(o) || _isSubjectReference(o)) {
        // rename blank node @id
        var id = _isBlankNode(o) ? namer.getName(o['@id']) : o['@id'];

        // add reference and recurse
        jsonld.addValue(
          subject, property, {'@id': id},
          {propertyIsArray: true, allowDuplicate: false});
        _createNodeMap(o, graphs, graph, namer, id);
      } else if(_isList(o)) {
        // handle @list
        var _list = [];
        _createNodeMap(o['@list'], graphs, graph, namer, name, _list);
        o = {'@list': _list};
        jsonld.addValue(
          subject, property, o,
          {propertyIsArray: true, allowDuplicate: false});
      } else {
        // handle @value
        _createNodeMap(o, graphs, graph, namer, name);
        jsonld.addValue(
          subject, property, o, {propertyIsArray: true, allowDuplicate: false});
      }
    }
  }
}

function _mergeNodeMaps(graphs) {
  // add all non-default graphs to default graph
  var defaultGraph = graphs['@default'];
  var graphNames = Object.keys(graphs).sort();
  for(var i = 0; i < graphNames.length; ++i) {
    var graphName = graphNames[i];
    if(graphName === '@default') {
      continue;
    }
    var nodeMap = graphs[graphName];
    var subject = defaultGraph[graphName];
    if(!subject) {
      defaultGraph[graphName] = subject = {
        '@id': graphName,
        '@graph': []
      };
    } else if(!('@graph' in subject)) {
      subject['@graph'] = [];
    }
    var graph = subject['@graph'];
    var ids = Object.keys(nodeMap).sort();
    for(var ii = 0; ii < ids.length; ++ii) {
      var node = nodeMap[ids[ii]];
      // only add full subjects
      if(!_isSubjectReference(node)) {
        graph.push(node);
      }
    }
  }
  return defaultGraph;
}

/**
 * Frames subjects according to the given frame.
 *
 * @param state the current framing state.
 * @param subjects the subjects to filter.
 * @param frame the frame.
 * @param parent the parent subject or top-level array.
 * @param property the parent property, initialized to null.
 */
function _frame(state, subjects, frame, parent, property) {
  // validate the frame
  _validateFrame(frame);
  frame = frame[0];

  // get flags for current frame
  var options = state.options;
  var flags = {
    embed: _getFrameFlag(frame, options, 'embed'),
    explicit: _getFrameFlag(frame, options, 'explicit'),
    requireAll: _getFrameFlag(frame, options, 'requireAll')
  };

  // filter out subjects that match the frame
  var matches = _filterSubjects(state, subjects, frame, flags);

  // add matches to output
  var ids = Object.keys(matches).sort();
  for(var idx in ids) {
    var id = ids[idx];
    var subject = matches[id];

    if(flags.embed === '@link' && id in state.link) {
      // TODO: may want to also match an existing linked subject against
      // the current frame ... so different frames could produce different
      // subjects that are only shared in-memory when the frames are the same

      // add existing linked subject
      _addFrameOutput(parent, property, state.link[id]);
      continue;
    }

    /* Note: In order to treat each top-level match as a compartmentalized
    result, clear the unique embedded subjects map when the property is null,
    which only occurs at the top-level. */
    if(property === null) {
      state.uniqueEmbeds = {};
    }

    // start output for subject
    var output = {};
    output['@id'] = id;
    state.link[id] = output;

    // if embed is @never or if a circular reference would be created by an
    // embed, the subject cannot be embedded, just add the reference;
    // note that a circular reference won't occur when the embed flag is
    // `@link` as the above check will short-circuit before reaching this point
    if(flags.embed === '@never' ||
      _createsCircularReference(subject, state.subjectStack)) {
      _addFrameOutput(parent, property, output);
      continue;
    }

    // if only the last match should be embedded
    if(flags.embed === '@last') {
      // remove any existing embed
      if(id in state.uniqueEmbeds) {
        _removeEmbed(state, id);
      }
      state.uniqueEmbeds[id] = {parent: parent, property: property};
    }

    // push matching subject onto stack to enable circular embed checks
    state.subjectStack.push(subject);

    // iterate over subject properties
    var props = Object.keys(subject).sort();
    for(var i = 0; i < props.length; i++) {
      var prop = props[i];

      // copy keywords to output
      if(_isKeyword(prop)) {
        output[prop] = _clone(subject[prop]);
        continue;
      }

      // explicit is on and property isn't in the frame, skip processing
      if(flags.explicit && !(prop in frame)) {
        continue;
      }

      // add objects
      var objects = subject[prop];
      for(var oi = 0; oi < objects.length; ++oi) {
        var o = objects[oi];

        // recurse into list
        if(_isList(o)) {
          // add empty list
          var list = {'@list': []};
          _addFrameOutput(output, prop, list);

          // add list objects
          var src = o['@list'];
          for(var n in src) {
            o = src[n];
            if(_isSubjectReference(o)) {
              var subframe = (prop in frame ?
                frame[prop][0]['@list'] : _createImplicitFrame(flags));
              // recurse into subject reference
              _frame(state, [o['@id']], subframe, list, '@list');
            } else {
              // include other values automatically
              _addFrameOutput(list, '@list', _clone(o));
            }
          }
          continue;
        }

        if(_isSubjectReference(o)) {
          // recurse into subject reference
          var subframe = (prop in frame ?
            frame[prop] : _createImplicitFrame(flags));
          _frame(state, [o['@id']], subframe, output, prop);
        } else {
          // include other values automatically
          _addFrameOutput(output, prop, _clone(o));
        }
      }
    }

    // handle defaults
    var props = Object.keys(frame).sort();
    for(var i = 0; i < props.length; ++i) {
      var prop = props[i];

      // skip keywords
      if(_isKeyword(prop)) {
        continue;
      }

      // if omit default is off, then include default values for properties
      // that appear in the next frame but are not in the matching subject
      var next = frame[prop][0];
      var omitDefaultOn = _getFrameFlag(next, options, 'omitDefault');
      if(!omitDefaultOn && !(prop in output)) {
        var preserve = '@null';
        if('@default' in next) {
          preserve = _clone(next['@default']);
        }
        if(!_isArray(preserve)) {
          preserve = [preserve];
        }
        output[prop] = [{'@preserve': preserve}];
      }
    }

    // add output to parent
    _addFrameOutput(parent, property, output);

    // pop matching subject from circular ref-checking stack
    state.subjectStack.pop();
  }
}

/**
 * Creates an implicit frame when recursing through subject matches. If
 * a frame doesn't have an explicit frame for a particular property, then
 * a wildcard child frame will be created that uses the same flags that the
 * parent frame used.
 *
 * @param flags the current framing flags.
 *
 * @return the implicit frame.
 */
function _createImplicitFrame(flags) {
  var frame = {};
  for(var key in flags) {
    if(flags[key] !== undefined) {
      frame['@' + key] = [flags[key]];
    }
  }
  return [frame];
}

/**
 * Checks the current subject stack to see if embedding the given subject
 * would cause a circular reference.
 *
 * @param subjectToEmbed the subject to embed.
 * @param subjectStack the current stack of subjects.
 *
 * @return true if a circular reference would be created, false if not.
 */
function _createsCircularReference(subjectToEmbed, subjectStack) {
  for(var i = subjectStack.length - 1; i >= 0; --i) {
    if(subjectStack[i]['@id'] === subjectToEmbed['@id']) {
      return true;
    }
  }
  return false;
}

/**
 * Gets the frame flag value for the given flag name.
 *
 * @param frame the frame.
 * @param options the framing options.
 * @param name the flag name.
 *
 * @return the flag value.
 */
function _getFrameFlag(frame, options, name) {
  var flag = '@' + name;
  var rval = (flag in frame ? frame[flag][0] : options[name]);
  if(name === 'embed') {
    // default is "@last"
    // backwards-compatibility support for "embed" maps:
    // true => "@last"
    // false => "@never"
    if(rval === true) {
      rval = '@last';
    } else if(rval === false) {
      rval = '@never';
    } else if(rval !== '@always' && rval !== '@never' && rval !== '@link') {
      rval = '@last';
    }
  }
  return rval;
}

/**
 * Validates a JSON-LD frame, throwing an exception if the frame is invalid.
 *
 * @param frame the frame to validate.
 */
function _validateFrame(frame) {
  if(!_isArray(frame) || frame.length !== 1 || !_isObject(frame[0])) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; a JSON-LD frame must be a single object.',
      'jsonld.SyntaxError', {frame: frame});
  }
}

/**
 * Returns a map of all of the subjects that match a parsed frame.
 *
 * @param state the current framing state.
 * @param subjects the set of subjects to filter.
 * @param frame the parsed frame.
 * @param flags the frame flags.
 *
 * @return all of the matched subjects.
 */
function _filterSubjects(state, subjects, frame, flags) {
  // filter subjects in @id order
  var rval = {};
  for(var i = 0; i < subjects.length; ++i) {
    var id = subjects[i];
    var subject = state.subjects[id];
    if(_filterSubject(subject, frame, flags)) {
      rval[id] = subject;
    }
  }
  return rval;
}

/**
 * Returns true if the given subject matches the given frame.
 *
 * @param subject the subject to check.
 * @param frame the frame to check.
 * @param flags the frame flags.
 *
 * @return true if the subject matches, false if not.
 */
function _filterSubject(subject, frame, flags) {
  // check @type (object value means 'any' type, fall through to ducktyping)
  if('@type' in frame &&
    !(frame['@type'].length === 1 && _isObject(frame['@type'][0]))) {
    var types = frame['@type'];
    for(var i = 0; i < types.length; ++i) {
      // any matching @type is a match
      if(jsonld.hasValue(subject, '@type', types[i])) {
        return true;
      }
    }
    return false;
  }

  // check ducktype
  var wildcard = true;
  var matchesSome = false;
  for(var key in frame) {
    if(_isKeyword(key)) {
      // skip non-@id and non-@type
      if(key !== '@id' && key !== '@type') {
        continue;
      }
      wildcard = false;

      // check @id for a specific @id value
      if(key === '@id' && _isString(frame[key])) {
        if(subject[key] !== frame[key]) {
          return false;
        }
        matchesSome = true;
        continue;
      }
    }

    wildcard = false;

    if(key in subject) {
      // frame[key] === [] means do not match if property is present
      if(_isArray(frame[key]) && frame[key].length === 0 &&
        subject[key] !== undefined) {
        return false;
      }
      matchesSome = true;
      continue;
    }

    // all properties must match to be a duck unless a @default is specified
    var hasDefault = (_isArray(frame[key]) && _isObject(frame[key][0]) &&
      '@default' in frame[key][0]);
    if(flags.requireAll && !hasDefault) {
      return false;
    }
  }

  // return true if wildcard or subject matches some properties
  return wildcard || matchesSome;
}

/**
 * Removes an existing embed.
 *
 * @param state the current framing state.
 * @param id the @id of the embed to remove.
 */
function _removeEmbed(state, id) {
  // get existing embed
  var embeds = state.uniqueEmbeds;
  var embed = embeds[id];
  var parent = embed.parent;
  var property = embed.property;

  // create reference to replace embed
  var subject = {'@id': id};

  // remove existing embed
  if(_isArray(parent)) {
    // replace subject with reference
    for(var i = 0; i < parent.length; ++i) {
      if(jsonld.compareValues(parent[i], subject)) {
        parent[i] = subject;
        break;
      }
    }
  } else {
    // replace subject with reference
    var useArray = _isArray(parent[property]);
    jsonld.removeValue(parent, property, subject, {propertyIsArray: useArray});
    jsonld.addValue(parent, property, subject, {propertyIsArray: useArray});
  }

  // recursively remove dependent dangling embeds
  var removeDependents = function(id) {
    // get embed keys as a separate array to enable deleting keys in map
    var ids = Object.keys(embeds);
    for(var i = 0; i < ids.length; ++i) {
      var next = ids[i];
      if(next in embeds && _isObject(embeds[next].parent) &&
        embeds[next].parent['@id'] === id) {
        delete embeds[next];
        removeDependents(next);
      }
    }
  };
  removeDependents(id);
}

/**
 * Adds framing output to the given parent.
 *
 * @param parent the parent to add to.
 * @param property the parent property.
 * @param output the output to add.
 */
function _addFrameOutput(parent, property, output) {
  if(_isObject(parent)) {
    jsonld.addValue(parent, property, output, {propertyIsArray: true});
  } else {
    parent.push(output);
  }
}

/**
 * Removes the @preserve keywords as the last step of the framing algorithm.
 *
 * @param ctx the active context used to compact the input.
 * @param input the framed, compacted output.
 * @param options the compaction options used.
 *
 * @return the resulting output.
 */
function _removePreserve(ctx, input, options) {
  // recurse through arrays
  if(_isArray(input)) {
    var output = [];
    for(var i = 0; i < input.length; ++i) {
      var result = _removePreserve(ctx, input[i], options);
      // drop nulls from arrays
      if(result !== null) {
        output.push(result);
      }
    }
    input = output;
  } else if(_isObject(input)) {
    // remove @preserve
    if('@preserve' in input) {
      if(input['@preserve'] === '@null') {
        return null;
      }
      return input['@preserve'];
    }

    // skip @values
    if(_isValue(input)) {
      return input;
    }

    // recurse through @lists
    if(_isList(input)) {
      input['@list'] = _removePreserve(ctx, input['@list'], options);
      return input;
    }

    // handle in-memory linked nodes
    var idAlias = _compactIri(ctx, '@id');
    if(idAlias in input) {
      var id = input[idAlias];
      if(id in options.link) {
        var idx = options.link[id].indexOf(input);
        if(idx === -1) {
          // prevent circular visitation
          options.link[id].push(input);
        } else {
          // already visited
          return options.link[id][idx];
        }
      } else {
        // prevent circular visitation
        options.link[id] = [input];
      }
    }

    // recurse through properties
    for(var prop in input) {
      var result = _removePreserve(ctx, input[prop], options);
      var container = jsonld.getContextValue(ctx, prop, '@container');
      if(options.compactArrays && _isArray(result) && result.length === 1 &&
        container === null) {
        result = result[0];
      }
      input[prop] = result;
    }
  }
  return input;
}

/**
 * Compares two strings first based on length and then lexicographically.
 *
 * @param a the first string.
 * @param b the second string.
 *
 * @return -1 if a < b, 1 if a > b, 0 if a == b.
 */
function _compareShortestLeast(a, b) {
  if(a.length < b.length) {
    return -1;
  }
  if(b.length < a.length) {
    return 1;
  }
  if(a === b) {
    return 0;
  }
  return (a < b) ? -1 : 1;
}

/**
 * Picks the preferred compaction term from the given inverse context entry.
 *
 * @param activeCtx the active context.
 * @param iri the IRI to pick the term for.
 * @param value the value to pick the term for.
 * @param containers the preferred containers.
 * @param typeOrLanguage either '@type' or '@language'.
 * @param typeOrLanguageValue the preferred value for '@type' or '@language'.
 *
 * @return the preferred term.
 */
function _selectTerm(
  activeCtx, iri, value, containers, typeOrLanguage, typeOrLanguageValue) {
  if(typeOrLanguageValue === null) {
    typeOrLanguageValue = '@null';
  }

  // preferences for the value of @type or @language
  var prefs = [];

  // determine prefs for @id based on whether or not value compacts to a term
  if((typeOrLanguageValue === '@id' || typeOrLanguageValue === '@reverse') &&
    _isSubjectReference(value)) {
    // prefer @reverse first
    if(typeOrLanguageValue === '@reverse') {
      prefs.push('@reverse');
    }
    // try to compact value to a term
    var term = _compactIri(activeCtx, value['@id'], null, {vocab: true});
    if(term in activeCtx.mappings &&
      activeCtx.mappings[term] &&
      activeCtx.mappings[term]['@id'] === value['@id']) {
      // prefer @vocab
      prefs.push.apply(prefs, ['@vocab', '@id']);
    } else {
      // prefer @id
      prefs.push.apply(prefs, ['@id', '@vocab']);
    }
  } else {
    prefs.push(typeOrLanguageValue);
  }
  prefs.push('@none');

  var containerMap = activeCtx.inverse[iri];
  for(var ci = 0; ci < containers.length; ++ci) {
    // if container not available in the map, continue
    var container = containers[ci];
    if(!(container in containerMap)) {
      continue;
    }

    var typeOrLanguageValueMap = containerMap[container][typeOrLanguage];
    for(var pi = 0; pi < prefs.length; ++pi) {
      // if type/language option not available in the map, continue
      var pref = prefs[pi];
      if(!(pref in typeOrLanguageValueMap)) {
        continue;
      }

      // select term
      return typeOrLanguageValueMap[pref];
    }
  }

  return null;
}

/**
 * Compacts an IRI or keyword into a term or prefix if it can be. If the
 * IRI has an associated value it may be passed.
 *
 * @param activeCtx the active context to use.
 * @param iri the IRI to compact.
 * @param value the value to check or null.
 * @param relativeTo options for how to compact IRIs:
 *          vocab: true to split after @vocab, false not to.
 * @param reverse true if a reverse property is being compacted, false if not.
 *
 * @return the compacted term, prefix, keyword alias, or the original IRI.
 */
function _compactIri(activeCtx, iri, value, relativeTo, reverse) {
  // can't compact null
  if(iri === null) {
    return iri;
  }

  // default value and parent to null
  if(_isUndefined(value)) {
    value = null;
  }
  // default reverse to false
  if(_isUndefined(reverse)) {
    reverse = false;
  }
  relativeTo = relativeTo || {};

  // if term is a keyword, default vocab to true
  if(_isKeyword(iri)) {
    relativeTo.vocab = true;
  }

  // use inverse context to pick a term if iri is relative to vocab
  if(relativeTo.vocab && iri in activeCtx.getInverse()) {
    var defaultLanguage = activeCtx['@language'] || '@none';

    // prefer @index if available in value
    var containers = [];
    if(_isObject(value) && '@index' in value) {
      containers.push('@index');
    }

    // defaults for term selection based on type/language
    var typeOrLanguage = '@language';
    var typeOrLanguageValue = '@null';

    if(reverse) {
      typeOrLanguage = '@type';
      typeOrLanguageValue = '@reverse';
      containers.push('@set');
    } else if(_isList(value)) {
      // choose the most specific term that works for all elements in @list
      // only select @list containers if @index is NOT in value
      if(!('@index' in value)) {
        containers.push('@list');
      }
      var list = value['@list'];
      var commonLanguage = (list.length === 0) ? defaultLanguage : null;
      var commonType = null;
      for(var i = 0; i < list.length; ++i) {
        var item = list[i];
        var itemLanguage = '@none';
        var itemType = '@none';
        if(_isValue(item)) {
          if('@language' in item) {
            itemLanguage = item['@language'];
          } else if('@type' in item) {
            itemType = item['@type'];
          } else {
            // plain literal
            itemLanguage = '@null';
          }
        } else {
          itemType = '@id';
        }
        if(commonLanguage === null) {
          commonLanguage = itemLanguage;
        } else if(itemLanguage !== commonLanguage && _isValue(item)) {
          commonLanguage = '@none';
        }
        if(commonType === null) {
          commonType = itemType;
        } else if(itemType !== commonType) {
          commonType = '@none';
        }
        // there are different languages and types in the list, so choose
        // the most generic term, no need to keep iterating the list
        if(commonLanguage === '@none' && commonType === '@none') {
          break;
        }
      }
      commonLanguage = commonLanguage || '@none';
      commonType = commonType || '@none';
      if(commonType !== '@none') {
        typeOrLanguage = '@type';
        typeOrLanguageValue = commonType;
      } else {
        typeOrLanguageValue = commonLanguage;
      }
    } else {
      if(_isValue(value)) {
        if('@language' in value && !('@index' in value)) {
          containers.push('@language');
          typeOrLanguageValue = value['@language'];
        } else if('@type' in value) {
          typeOrLanguage = '@type';
          typeOrLanguageValue = value['@type'];
        }
      } else {
        typeOrLanguage = '@type';
        typeOrLanguageValue = '@id';
      }
      containers.push('@set');
    }

    // do term selection
    containers.push('@none');
    var term = _selectTerm(
      activeCtx, iri, value, containers, typeOrLanguage, typeOrLanguageValue);
    if(term !== null) {
      return term;
    }
  }

  // no term match, use @vocab if available
  if(relativeTo.vocab) {
    if('@vocab' in activeCtx) {
      // determine if vocab is a prefix of the iri
      var vocab = activeCtx['@vocab'];
      if(iri.indexOf(vocab) === 0 && iri !== vocab) {
        // use suffix as relative iri if it is not a term in the active context
        var suffix = iri.substr(vocab.length);
        if(!(suffix in activeCtx.mappings)) {
          return suffix;
        }
      }
    }
  }

  // no term or @vocab match, check for possible CURIEs
  var choice = null;
  for(var term in activeCtx.mappings) {
    // skip terms with colons, they can't be prefixes
    if(term.indexOf(':') !== -1) {
      continue;
    }
    // skip entries with @ids that are not partial matches
    var definition = activeCtx.mappings[term];
    if(!definition ||
      definition['@id'] === iri || iri.indexOf(definition['@id']) !== 0) {
      continue;
    }

    // a CURIE is usable if:
    // 1. it has no mapping, OR
    // 2. value is null, which means we're not compacting an @value, AND
    //   the mapping matches the IRI)
    var curie = term + ':' + iri.substr(definition['@id'].length);
    var isUsableCurie = (!(curie in activeCtx.mappings) ||
      (value === null && activeCtx.mappings[curie] &&
      activeCtx.mappings[curie]['@id'] === iri));

    // select curie if it is shorter or the same length but lexicographically
    // less than the current choice
    if(isUsableCurie && (choice === null ||
      _compareShortestLeast(curie, choice) < 0)) {
      choice = curie;
    }
  }

  // return chosen curie
  if(choice !== null) {
    return choice;
  }

  // compact IRI relative to base
  if(!relativeTo.vocab) {
    return _removeBase(activeCtx['@base'], iri);
  }

  // return IRI as is
  return iri;
}

/**
 * Performs value compaction on an object with '@value' or '@id' as the only
 * property.
 *
 * @param activeCtx the active context.
 * @param activeProperty the active property that points to the value.
 * @param value the value to compact.
 *
 * @return the compaction result.
 */
function _compactValue(activeCtx, activeProperty, value) {
  // value is a @value
  if(_isValue(value)) {
    // get context rules
    var type = jsonld.getContextValue(activeCtx, activeProperty, '@type');
    var language = jsonld.getContextValue(
      activeCtx, activeProperty, '@language');
    var container = jsonld.getContextValue(
      activeCtx, activeProperty, '@container');

    // whether or not the value has an @index that must be preserved
    var preserveIndex = (('@index' in value) &&
      container !== '@index');

    // if there's no @index to preserve ...
    if(!preserveIndex) {
      // matching @type or @language specified in context, compact value
      if(value['@type'] === type || value['@language'] === language) {
        return value['@value'];
      }
    }

    // return just the value of @value if all are true:
    // 1. @value is the only key or @index isn't being preserved
    // 2. there is no default language or @value is not a string or
    //   the key has a mapping with a null @language
    var keyCount = Object.keys(value).length;
    var isValueOnlyKey = (keyCount === 1 ||
      (keyCount === 2 && ('@index' in value) && !preserveIndex));
    var hasDefaultLanguage = ('@language' in activeCtx);
    var isValueString = _isString(value['@value']);
    var hasNullMapping = (activeCtx.mappings[activeProperty] &&
      activeCtx.mappings[activeProperty]['@language'] === null);
    if(isValueOnlyKey &&
      (!hasDefaultLanguage || !isValueString || hasNullMapping)) {
      return value['@value'];
    }

    var rval = {};

    // preserve @index
    if(preserveIndex) {
      rval[_compactIri(activeCtx, '@index')] = value['@index'];
    }

    if('@type' in value) {
      // compact @type IRI
      rval[_compactIri(activeCtx, '@type')] = _compactIri(
        activeCtx, value['@type'], null, {vocab: true});
    } else if('@language' in value) {
      // alias @language
      rval[_compactIri(activeCtx, '@language')] = value['@language'];
    }

    // alias @value
    rval[_compactIri(activeCtx, '@value')] = value['@value'];

    return rval;
  }

  // value is a subject reference
  var expandedProperty = _expandIri(activeCtx, activeProperty, {vocab: true});
  var type = jsonld.getContextValue(activeCtx, activeProperty, '@type');
  var compacted = _compactIri(
    activeCtx, value['@id'], null, {vocab: type === '@vocab'});

  // compact to scalar
  if(type === '@id' || type === '@vocab' || expandedProperty === '@graph') {
    return compacted;
  }

  var rval = {};
  rval[_compactIri(activeCtx, '@id')] = compacted;
  return rval;
}

/**
 * Creates a term definition during context processing.
 *
 * @param activeCtx the current active context.
 * @param localCtx the local context being processed.
 * @param term the term in the local context to define the mapping for.
 * @param defined a map of defining/defined keys to detect cycles and prevent
 *          double definitions.
 */
function _createTermDefinition(activeCtx, localCtx, term, defined) {
  if(term in defined) {
    // term already defined
    if(defined[term]) {
      return;
    }
    // cycle detected
    throw new JsonLdError(
      'Cyclical context definition detected.',
      'jsonld.CyclicalContext',
      {code: 'cyclic IRI mapping', context: localCtx, term: term});
  }

  // now defining term
  defined[term] = false;

  if(_isKeyword(term)) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; keywords cannot be overridden.',
      'jsonld.SyntaxError',
      {code: 'keyword redefinition', context: localCtx, term: term});
  }

  if(term === '') {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; a term cannot be an empty string.',
      'jsonld.SyntaxError',
      {code: 'invalid term definition', context: localCtx});
  }

  // remove old mapping
  if(activeCtx.mappings[term]) {
    delete activeCtx.mappings[term];
  }

  // get context term value
  var value = localCtx[term];

  // clear context entry
  if(value === null || (_isObject(value) && value['@id'] === null)) {
    activeCtx.mappings[term] = null;
    defined[term] = true;
    return;
  }

  // convert short-hand value to object w/@id
  if(_isString(value)) {
    value = {'@id': value};
  }

  if(!_isObject(value)) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; @context property values must be ' +
      'strings or objects.',
      'jsonld.SyntaxError',
      {code: 'invalid term definition', context: localCtx});
  }

  // create new mapping
  var mapping = activeCtx.mappings[term] = {};
  mapping.reverse = false;

  if('@reverse' in value) {
    if('@id' in value) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @reverse term definition must not ' +
        'contain @id.', 'jsonld.SyntaxError',
        {code: 'invalid reverse property', context: localCtx});
    }
    var reverse = value['@reverse'];
    if(!_isString(reverse)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @context @reverse value must be a string.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }

    // expand and add @id mapping
    var id = _expandIri(
      activeCtx, reverse, {vocab: true, base: false}, localCtx, defined);
    if(!_isAbsoluteIri(id)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @context @reverse value must be an ' +
        'absolute IRI or a blank node identifier.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }
    mapping['@id'] = id;
    mapping.reverse = true;
  } else if('@id' in value) {
    var id = value['@id'];
    if(!_isString(id)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; a @context @id value must be an array ' +
        'of strings or a string.',
        'jsonld.SyntaxError', {code: 'invalid IRI mapping', context: localCtx});
    }
    if(id !== term) {
      // expand and add @id mapping
      id = _expandIri(
        activeCtx, id, {vocab: true, base: false}, localCtx, defined);
      if(!_isAbsoluteIri(id) && !_isKeyword(id)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; a @context @id value must be an ' +
          'absolute IRI, a blank node identifier, or a keyword.',
          'jsonld.SyntaxError',
          {code: 'invalid IRI mapping', context: localCtx});
      }
      mapping['@id'] = id;
    }
  }

  if(!('@id' in mapping)) {
    // see if the term has a prefix
    var colon = term.indexOf(':');
    if(colon !== -1) {
      var prefix = term.substr(0, colon);
      if(prefix in localCtx) {
        // define parent prefix
        _createTermDefinition(activeCtx, localCtx, prefix, defined);
      }

      if(activeCtx.mappings[prefix]) {
        // set @id based on prefix parent
        var suffix = term.substr(colon + 1);
        mapping['@id'] = activeCtx.mappings[prefix]['@id'] + suffix;
      } else {
        // term is an absolute IRI
        mapping['@id'] = term;
      }
    } else {
      // non-IRIs *must* define @ids if @vocab is not available
      if(!('@vocab' in activeCtx)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; @context terms must define an @id.',
          'jsonld.SyntaxError',
          {code: 'invalid IRI mapping', context: localCtx, term: term});
      }
      // prepend vocab to term
      mapping['@id'] = activeCtx['@vocab'] + term;
    }
  }

  // IRI mapping now defined
  defined[term] = true;

  if('@type' in value) {
    var type = value['@type'];
    if(!_isString(type)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; an @context @type values must be a string.',
        'jsonld.SyntaxError',
        {code: 'invalid type mapping', context: localCtx});
    }

    if(type !== '@id' && type !== '@vocab') {
      // expand @type to full IRI
      type = _expandIri(
        activeCtx, type, {vocab: true, base: false}, localCtx, defined);
      if(!_isAbsoluteIri(type)) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; an @context @type value must be an ' +
          'absolute IRI.',
          'jsonld.SyntaxError',
          {code: 'invalid type mapping', context: localCtx});
      }
      if(type.indexOf('_:') === 0) {
        throw new JsonLdError(
          'Invalid JSON-LD syntax; an @context @type values must be an IRI, ' +
          'not a blank node identifier.',
          'jsonld.SyntaxError',
          {code: 'invalid type mapping', context: localCtx});
      }
    }

    // add @type to mapping
    mapping['@type'] = type;
  }

  if('@container' in value) {
    var container = value['@container'];
    if(container !== '@list' && container !== '@set' &&
      container !== '@index' && container !== '@language') {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @container value must be ' +
        'one of the following: @list, @set, @index, or @language.',
        'jsonld.SyntaxError',
        {code: 'invalid container mapping', context: localCtx});
    }
    if(mapping.reverse && container !== '@index' && container !== '@set' &&
      container !== null) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @container value for a @reverse ' +
        'type definition must be @index or @set.', 'jsonld.SyntaxError',
        {code: 'invalid reverse property', context: localCtx});
    }

    // add @container to mapping
    mapping['@container'] = container;
  }

  if('@language' in value && !('@type' in value)) {
    var language = value['@language'];
    if(language !== null && !_isString(language)) {
      throw new JsonLdError(
        'Invalid JSON-LD syntax; @context @language value must be ' +
        'a string or null.', 'jsonld.SyntaxError',
        {code: 'invalid language mapping', context: localCtx});
    }

    // add @language to mapping
    if(language !== null) {
      language = language.toLowerCase();
    }
    mapping['@language'] = language;
  }

  // disallow aliasing @context and @preserve
  var id = mapping['@id'];
  if(id === '@context' || id === '@preserve') {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; @context and @preserve cannot be aliased.',
      'jsonld.SyntaxError', {code: 'invalid keyword alias', context: localCtx});
  }
}

/**
 * Expands a string to a full IRI. The string may be a term, a prefix, a
 * relative IRI, or an absolute IRI. The associated absolute IRI will be
 * returned.
 *
 * @param activeCtx the current active context.
 * @param value the string to expand.
 * @param relativeTo options for how to resolve relative IRIs:
 *          base: true to resolve against the base IRI, false not to.
 *          vocab: true to concatenate after @vocab, false not to.
 * @param localCtx the local context being processed (only given if called
 *          during context processing).
 * @param defined a map for tracking cycles in context definitions (only given
 *          if called during context processing).
 *
 * @return the expanded value.
 */
function _expandIri(activeCtx, value, relativeTo, localCtx, defined) {
  // already expanded
  if(value === null || _isKeyword(value)) {
    return value;
  }

  // define term dependency if not defined
  if(localCtx && value in localCtx && defined[value] !== true) {
    _createTermDefinition(activeCtx, localCtx, value, defined);
  }

  relativeTo = relativeTo || {};
  if(relativeTo.vocab) {
    var mapping = activeCtx.mappings[value];

    // value is explicitly ignored with a null mapping
    if(mapping === null) {
      return null;
    }

    if(mapping) {
      // value is a term
      return mapping['@id'];
    }
  }

  // split value into prefix:suffix
  var colon = value.indexOf(':');
  if(colon !== -1) {
    var prefix = value.substr(0, colon);
    var suffix = value.substr(colon + 1);

    // do not expand blank nodes (prefix of '_') or already-absolute
    // IRIs (suffix of '//')
    if(prefix === '_' || suffix.indexOf('//') === 0) {
      return value;
    }

    // prefix dependency not defined, define it
    if(localCtx && prefix in localCtx) {
      _createTermDefinition(activeCtx, localCtx, prefix, defined);
    }

    // use mapping if prefix is defined
    var mapping = activeCtx.mappings[prefix];
    if(mapping) {
      return mapping['@id'] + suffix;
    }

    // already absolute IRI
    return value;
  }

  // prepend vocab
  if(relativeTo.vocab && '@vocab' in activeCtx) {
    return activeCtx['@vocab'] + value;
  }

  // prepend base
  var rval = value;
  if(relativeTo.base) {
    rval = _prependBase(activeCtx['@base'], rval);
  }

  return rval;
}

/**
 * Prepends a base IRI to the given relative IRI.
 *
 * @param base the base IRI.
 * @param iri the relative IRI.
 *
 * @return the absolute IRI.
 */
function _prependBase(base, iri) {
  // skip IRI processing
  if(base === null) {
    return iri;
  }
  // already an absolute IRI
  if(iri.indexOf(':') !== -1) {
    return iri;
  }

  // parse base if it is a string
  if(_isString(base)) {
    base = jsonld.url.parse(base || '');
  }

  // parse given IRI
  var rel = jsonld.url.parse(iri);

  // per RFC3986 5.2.2
  var transform = {
    protocol: base.protocol || ''
  };

  if(rel.authority !== null) {
    transform.authority = rel.authority;
    transform.path = rel.path;
    transform.query = rel.query;
  } else {
    transform.authority = base.authority;

    if(rel.path === '') {
      transform.path = base.path;
      if(rel.query !== null) {
        transform.query = rel.query;
      } else {
        transform.query = base.query;
      }
    } else {
      if(rel.path.indexOf('/') === 0) {
        // IRI represents an absolute path
        transform.path = rel.path;
      } else {
        // merge paths
        var path = base.path;

        // append relative path to the end of the last directory from base
        if(rel.path !== '') {
          path = path.substr(0, path.lastIndexOf('/') + 1);
          if(path.length > 0 && path.substr(-1) !== '/') {
            path += '/';
          }
          path += rel.path;
        }

        transform.path = path;
      }
      transform.query = rel.query;
    }
  }

  // remove slashes and dots in path
  transform.path = _removeDotSegments(transform.path, !!transform.authority);

  // construct URL
  var rval = transform.protocol;
  if(transform.authority !== null) {
    rval += '//' + transform.authority;
  }
  rval += transform.path;
  if(transform.query !== null) {
    rval += '?' + transform.query;
  }
  if(rel.fragment !== null) {
    rval += '#' + rel.fragment;
  }

  // handle empty base
  if(rval === '') {
    rval = './';
  }

  return rval;
}

/**
 * Removes a base IRI from the given absolute IRI.
 *
 * @param base the base IRI.
 * @param iri the absolute IRI.
 *
 * @return the relative IRI if relative to base, otherwise the absolute IRI.
 */
function _removeBase(base, iri) {
  // skip IRI processing
  if(base === null) {
    return iri;
  }

  if(_isString(base)) {
    base = jsonld.url.parse(base || '');
  }

  // establish base root
  var root = '';
  if(base.href !== '') {
    root += (base.protocol || '') + '//' + (base.authority || '');
  } else if(iri.indexOf('//')) {
    // support network-path reference with empty base
    root += '//';
  }

  // IRI not relative to base
  if(iri.indexOf(root) !== 0) {
    return iri;
  }

  // remove root from IRI and parse remainder
  var rel = jsonld.url.parse(iri.substr(root.length));

  // remove path segments that match (do not remove last segment unless there
  // is a hash or query)
  var baseSegments = base.normalizedPath.split('/');
  var iriSegments = rel.normalizedPath.split('/');
  var last = (rel.fragment || rel.query) ? 0 : 1;
  while(baseSegments.length > 0 && iriSegments.length > last) {
    if(baseSegments[0] !== iriSegments[0]) {
      break;
    }
    baseSegments.shift();
    iriSegments.shift();
  }

  // use '../' for each non-matching base segment
  var rval = '';
  if(baseSegments.length > 0) {
    // don't count the last segment (if it ends with '/' last path doesn't
    // count and if it doesn't end with '/' it isn't a path)
    baseSegments.pop();
    for(var i = 0; i < baseSegments.length; ++i) {
      rval += '../';
    }
  }

  // prepend remaining segments
  rval += iriSegments.join('/');

  // add query and hash
  if(rel.query !== null) {
    rval += '?' + rel.query;
  }
  if(rel.fragment !== null) {
    rval += '#' + rel.fragment;
  }

  // handle empty base
  if(rval === '') {
    rval = './';
  }

  return rval;
}

/**
 * Gets the initial context.
 *
 * @param options the options to use:
 *          [base] the document base IRI.
 *
 * @return the initial context.
 */
function _getInitialContext(options) {
  var base = jsonld.url.parse(options.base || '');
  return {
    '@base': base,
    mappings: {},
    inverse: null,
    getInverse: _createInverseContext,
    clone: _cloneActiveContext
  };

  /**
   * Generates an inverse context for use in the compaction algorithm, if
   * not already generated for the given active context.
   *
   * @return the inverse context.
   */
  function _createInverseContext() {
    var activeCtx = this;

    // lazily create inverse
    if(activeCtx.inverse) {
      return activeCtx.inverse;
    }
    var inverse = activeCtx.inverse = {};

    // handle default language
    var defaultLanguage = activeCtx['@language'] || '@none';

    // create term selections for each mapping in the context, ordered by
    // shortest and then lexicographically least
    var mappings = activeCtx.mappings;
    var terms = Object.keys(mappings).sort(_compareShortestLeast);
    for(var i = 0; i < terms.length; ++i) {
      var term = terms[i];
      var mapping = mappings[term];
      if(mapping === null) {
        continue;
      }

      var container = mapping['@container'] || '@none';

      // iterate over every IRI in the mapping
      var ids = mapping['@id'];
      if(!_isArray(ids)) {
        ids = [ids];
      }
      for(var ii = 0; ii < ids.length; ++ii) {
        var iri = ids[ii];
        var entry = inverse[iri];

        // initialize entry
        if(!entry) {
          inverse[iri] = entry = {};
        }

        // add new entry
        if(!entry[container]) {
          entry[container] = {
            '@language': {},
            '@type': {}
          };
        }
        entry = entry[container];

        if(mapping.reverse) {
          // term is preferred for values using @reverse
          _addPreferredTerm(mapping, term, entry['@type'], '@reverse');
        } else if('@type' in mapping) {
          // term is preferred for values using specific type
          _addPreferredTerm(mapping, term, entry['@type'], mapping['@type']);
        } else if('@language' in mapping) {
          // term is preferred for values using specific language
          var language = mapping['@language'] || '@null';
          _addPreferredTerm(mapping, term, entry['@language'], language);
        } else {
          // term is preferred for values w/default language or no type and
          // no language
          // add an entry for the default language
          _addPreferredTerm(mapping, term, entry['@language'], defaultLanguage);

          // add entries for no type and no language
          _addPreferredTerm(mapping, term, entry['@type'], '@none');
          _addPreferredTerm(mapping, term, entry['@language'], '@none');
        }
      }
    }

    return inverse;
  }

  /**
   * Adds the term for the given entry if not already added.
   *
   * @param mapping the term mapping.
   * @param term the term to add.
   * @param entry the inverse context typeOrLanguage entry to add to.
   * @param typeOrLanguageValue the key in the entry to add to.
   */
  function _addPreferredTerm(mapping, term, entry, typeOrLanguageValue) {
    if(!(typeOrLanguageValue in entry)) {
      entry[typeOrLanguageValue] = term;
    }
  }

  /**
   * Clones an active context, creating a child active context.
   *
   * @return a clone (child) of the active context.
   */
  function _cloneActiveContext() {
    var child = {};
    child['@base'] = this['@base'];
    child.mappings = _clone(this.mappings);
    child.clone = this.clone;
    child.inverse = null;
    child.getInverse = this.getInverse;
    if('@language' in this) {
      child['@language'] = this['@language'];
    }
    if('@vocab' in this) {
      child['@vocab'] = this['@vocab'];
    }
    return child;
  }
}

/**
 * Returns whether or not the given value is a keyword.
 *
 * @param v the value to check.
 *
 * @return true if the value is a keyword, false if not.
 */
function _isKeyword(v) {
  if(!_isString(v)) {
    return false;
  }
  switch(v) {
  case '@base':
  case '@context':
  case '@container':
  case '@default':
  case '@embed':
  case '@explicit':
  case '@graph':
  case '@id':
  case '@index':
  case '@language':
  case '@list':
  case '@omitDefault':
  case '@preserve':
  case '@requireAll':
  case '@reverse':
  case '@set':
  case '@type':
  case '@value':
  case '@vocab':
    return true;
  }
  return false;
}

/**
 * Returns true if the given value is an Object.
 *
 * @param v the value to check.
 *
 * @return true if the value is an Object, false if not.
 */
function _isObject(v) {
  return (Object.prototype.toString.call(v) === '[object Object]');
}

/**
 * Returns true if the given value is an empty Object.
 *
 * @param v the value to check.
 *
 * @return true if the value is an empty Object, false if not.
 */
function _isEmptyObject(v) {
  return _isObject(v) && Object.keys(v).length === 0;
}

/**
 * Returns true if the given value is an Array.
 *
 * @param v the value to check.
 *
 * @return true if the value is an Array, false if not.
 */
function _isArray(v) {
  return Array.isArray(v);
}

/**
 * Throws an exception if the given value is not a valid @type value.
 *
 * @param v the value to check.
 */
function _validateTypeValue(v) {
  // can be a string or an empty object
  if(_isString(v) || _isEmptyObject(v)) {
    return;
  }

  // must be an array
  var isValid = false;
  if(_isArray(v)) {
    // must contain only strings
    isValid = true;
    for(var i = 0; i < v.length; ++i) {
      if(!(_isString(v[i]))) {
        isValid = false;
        break;
      }
    }
  }

  if(!isValid) {
    throw new JsonLdError(
      'Invalid JSON-LD syntax; "@type" value must a string, an array of ' +
      'strings, or an empty object.', 'jsonld.SyntaxError',
      {code: 'invalid type value', value: v});
  }
}

/**
 * Returns true if the given value is a String.
 *
 * @param v the value to check.
 *
 * @return true if the value is a String, false if not.
 */
function _isString(v) {
  return (typeof v === 'string' ||
    Object.prototype.toString.call(v) === '[object String]');
}

/**
 * Returns true if the given value is a Number.
 *
 * @param v the value to check.
 *
 * @return true if the value is a Number, false if not.
 */
function _isNumber(v) {
  return (typeof v === 'number' ||
    Object.prototype.toString.call(v) === '[object Number]');
}

/**
 * Returns true if the given value is a double.
 *
 * @param v the value to check.
 *
 * @return true if the value is a double, false if not.
 */
function _isDouble(v) {
  return _isNumber(v) && String(v).indexOf('.') !== -1;
}

/**
 * Returns true if the given value is numeric.
 *
 * @param v the value to check.
 *
 * @return true if the value is numeric, false if not.
 */
function _isNumeric(v) {
  return !isNaN(parseFloat(v)) && isFinite(v);
}

/**
 * Returns true if the given value is a Boolean.
 *
 * @param v the value to check.
 *
 * @return true if the value is a Boolean, false if not.
 */
function _isBoolean(v) {
  return (typeof v === 'boolean' ||
    Object.prototype.toString.call(v) === '[object Boolean]');
}

/**
 * Returns true if the given value is undefined.
 *
 * @param v the value to check.
 *
 * @return true if the value is undefined, false if not.
 */
function _isUndefined(v) {
  return (typeof v === 'undefined');
}

/**
 * Returns true if the given value is a subject with properties.
 *
 * @param v the value to check.
 *
 * @return true if the value is a subject with properties, false if not.
 */
function _isSubject(v) {
  // Note: A value is a subject if all of these hold true:
  // 1. It is an Object.
  // 2. It is not a @value, @set, or @list.
  // 3. It has more than 1 key OR any existing key is not @id.
  var rval = false;
  if(_isObject(v) &&
    !(('@value' in v) || ('@set' in v) || ('@list' in v))) {
    var keyCount = Object.keys(v).length;
    rval = (keyCount > 1 || !('@id' in v));
  }
  return rval;
}

/**
 * Returns true if the given value is a subject reference.
 *
 * @param v the value to check.
 *
 * @return true if the value is a subject reference, false if not.
 */
function _isSubjectReference(v) {
  // Note: A value is a subject reference if all of these hold true:
  // 1. It is an Object.
  // 2. It has a single key: @id.
  return (_isObject(v) && Object.keys(v).length === 1 && ('@id' in v));
}

/**
 * Returns true if the given value is a @value.
 *
 * @param v the value to check.
 *
 * @return true if the value is a @value, false if not.
 */
function _isValue(v) {
  // Note: A value is a @value if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @value property.
  return _isObject(v) && ('@value' in v);
}

/**
 * Returns true if the given value is a @list.
 *
 * @param v the value to check.
 *
 * @return true if the value is a @list, false if not.
 */
function _isList(v) {
  // Note: A value is a @list if all of these hold true:
  // 1. It is an Object.
  // 2. It has the @list property.
  return _isObject(v) && ('@list' in v);
}

/**
 * Returns true if the given value is a blank node.
 *
 * @param v the value to check.
 *
 * @return true if the value is a blank node, false if not.
 */
function _isBlankNode(v) {
  // Note: A value is a blank node if all of these hold true:
  // 1. It is an Object.
  // 2. If it has an @id key its value begins with '_:'.
  // 3. It has no keys OR is not a @value, @set, or @list.
  var rval = false;
  if(_isObject(v)) {
    if('@id' in v) {
      rval = (v['@id'].indexOf('_:') === 0);
    } else {
      rval = (Object.keys(v).length === 0 ||
        !(('@value' in v) || ('@set' in v) || ('@list' in v)));
    }
  }
  return rval;
}

/**
 * Returns true if the given value is an absolute IRI, false if not.
 *
 * @param v the value to check.
 *
 * @return true if the value is an absolute IRI, false if not.
 */
function _isAbsoluteIri(v) {
  return _isString(v) && v.indexOf(':') !== -1;
}

/**
 * Clones an object, array, or string/number. If a typed JavaScript object
 * is given, such as a Date, it will be converted to a string.
 *
 * @param value the value to clone.
 *
 * @return the cloned value.
 */
function _clone(value) {
  if(value && typeof value === 'object') {
    var rval;
    if(_isArray(value)) {
      rval = [];
      for(var i = 0; i < value.length; ++i) {
        rval[i] = _clone(value[i]);
      }
    } else if(_isObject(value)) {
      rval = {};
      for(var key in value) {
        rval[key] = _clone(value[key]);
      }
    } else {
      rval = value.toString();
    }
    return rval;
  }
  return value;
}

/**
 * Finds all @context URLs in the given JSON-LD input.
 *
 * @param input the JSON-LD input.
 * @param urls a map of URLs (url => false/@contexts).
 * @param replace true to replace the URLs in the given input with the
 *           @contexts from the urls map, false not to.
 * @param base the base IRI to use to resolve relative IRIs.
 *
 * @return true if new URLs to retrieve were found, false if not.
 */
function _findContextUrls(input, urls, replace, base) {
  var count = Object.keys(urls).length;
  if(_isArray(input)) {
    for(var i = 0; i < input.length; ++i) {
      _findContextUrls(input[i], urls, replace, base);
    }
    return (count < Object.keys(urls).length);
  } else if(_isObject(input)) {
    for(var key in input) {
      if(key !== '@context') {
        _findContextUrls(input[key], urls, replace, base);
        continue;
      }

      // get @context
      var ctx = input[key];

      // array @context
      if(_isArray(ctx)) {
        var length = ctx.length;
        for(var i = 0; i < length; ++i) {
          var _ctx = ctx[i];
          if(_isString(_ctx)) {
            _ctx = _prependBase(base, _ctx);
            // replace w/@context if requested
            if(replace) {
              _ctx = urls[_ctx];
              if(_isArray(_ctx)) {
                // add flattened context
                Array.prototype.splice.apply(ctx, [i, 1].concat(_ctx));
                i += _ctx.length - 1;
                length = ctx.length;
              } else {
                ctx[i] = _ctx;
              }
            } else if(!(_ctx in urls)) {
              // @context URL found
              urls[_ctx] = false;
            }
          }
        }
      } else if(_isString(ctx)) {
        // string @context
        ctx = _prependBase(base, ctx);
        // replace w/@context if requested
        if(replace) {
          input[key] = urls[ctx];
        } else if(!(ctx in urls)) {
          // @context URL found
          urls[ctx] = false;
        }
      }
    }
    return (count < Object.keys(urls).length);
  }
  return false;
}

/**
 * Retrieves external @context URLs using the given document loader. Every
 * instance of @context in the input that refers to a URL will be replaced
 * with the JSON @context found at that URL.
 *
 * @param input the JSON-LD input with possible contexts.
 * @param options the options to use:
 *          documentLoader(url, callback(err, remoteDoc)) the document loader.
 * @param callback(err, input) called once the operation completes.
 */
function _retrieveContextUrls(input, options, callback) {
  // if any error occurs during URL resolution, quit
  var error = null;

  // recursive document loader
  var documentLoader = options.documentLoader;
  var retrieve = function(input, cycles, documentLoader, base, callback) {
    if(Object.keys(cycles).length > MAX_CONTEXT_URLS) {
      error = new JsonLdError(
        'Maximum number of @context URLs exceeded.',
        'jsonld.ContextUrlError',
        {code: 'loading remote context failed', max: MAX_CONTEXT_URLS});
      return callback(error);
    }

    // for tracking the URLs to retrieve
    var urls = {};

    // finished will be called once the URL queue is empty
    var finished = function() {
      // replace all URLs in the input
      _findContextUrls(input, urls, true, base);
      callback(null, input);
    };

    // find all URLs in the given input
    if(!_findContextUrls(input, urls, false, base)) {
      // no new URLs in input
      finished();
    }

    // queue all unretrieved URLs
    var queue = [];
    for(var url in urls) {
      if(urls[url] === false) {
        queue.push(url);
      }
    }

    // retrieve URLs in queue
    var count = queue.length;
    for(var i = 0; i < queue.length; ++i) {
      (function(url) {
        // check for context URL cycle
        if(url in cycles) {
          error = new JsonLdError(
            'Cyclical @context URLs detected.',
            'jsonld.ContextUrlError',
            {code: 'recursive context inclusion', url: url});
          return callback(error);
        }
        var _cycles = _clone(cycles);
        _cycles[url] = true;
        var done = function(err, remoteDoc) {
          // short-circuit if there was an error with another URL
          if(error) {
            return;
          }

          var ctx = remoteDoc ? remoteDoc.document : null;

          // parse string context as JSON
          if(!err && _isString(ctx)) {
            try {
              ctx = JSON.parse(ctx);
            } catch(ex) {
              err = ex;
            }
          }

          // ensure ctx is an object
          if(err) {
            err = new JsonLdError(
              'Dereferencing a URL did not result in a valid JSON-LD object. ' +
              'Possible causes are an inaccessible URL perhaps due to ' +
              'a same-origin policy (ensure the server uses CORS if you are ' +
              'using client-side JavaScript), too many redirects, a ' +
              'non-JSON response, or more than one HTTP Link Header was ' +
              'provided for a remote context.',
              'jsonld.InvalidUrl',
              {code: 'loading remote context failed', url: url, cause: err});
          } else if(!_isObject(ctx)) {
            err = new JsonLdError(
              'Dereferencing a URL did not result in a JSON object. The ' +
              'response was valid JSON, but it was not a JSON object.',
              'jsonld.InvalidUrl',
              {code: 'invalid remote context', url: url, cause: err});
          }
          if(err) {
            error = err;
            return callback(error);
          }

          // use empty context if no @context key is present
          if(!('@context' in ctx)) {
            ctx = {'@context': {}};
          } else {
            ctx = {'@context': ctx['@context']};
          }

          // append context URL to context if given
          if(remoteDoc.contextUrl) {
            if(!_isArray(ctx['@context'])) {
              ctx['@context'] = [ctx['@context']];
            }
            ctx['@context'].push(remoteDoc.contextUrl);
          }

          // recurse
          retrieve(ctx, _cycles, documentLoader, url, function(err, ctx) {
            if(err) {
              return callback(err);
            }
            urls[url] = ctx['@context'];
            count -= 1;
            if(count === 0) {
              finished();
            }
          });
        };
        var promise = documentLoader(url, done);
        if(promise && 'then' in promise) {
          promise.then(done.bind(null, null), done);
        }
      }(queue[i]));
    }
  };
  retrieve(input, {}, documentLoader, options.base, callback);
}

// define js 1.8.5 Object.keys method if not present
if(!Object.keys) {
  Object.keys = function(o) {
    if(o !== Object(o)) {
      throw new TypeError('Object.keys called on non-object');
    }
    var rval = [];
    for(var p in o) {
      if(Object.prototype.hasOwnProperty.call(o, p)) {
        rval.push(p);
      }
    }
    return rval;
  };
}

/**
 * Parses RDF in the form of N-Quads.
 *
 * @param input the N-Quads input to parse.
 *
 * @return an RDF dataset.
 */
function _parseNQuads(input) {
  // define partial regexes
  var iri = '(?:<([^:]+:[^>]*)>)';
  var bnode = '(_:(?:[A-Za-z0-9]+))';
  var plain = '"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"';
  var datatype = '(?:\\^\\^' + iri + ')';
  var language = '(?:@([a-z]+(?:-[a-z0-9]+)*))';
  var literal = '(?:' + plain + '(?:' + datatype + '|' + language + ')?)';
  var ws = '[ \\t]+';
  var wso = '[ \\t]*';
  var eoln = /(?:\r\n)|(?:\n)|(?:\r)/g;
  var empty = new RegExp('^' + wso + '$');

  // define quad part regexes
  var subject = '(?:' + iri + '|' + bnode + ')' + ws;
  var property = iri + ws;
  var object = '(?:' + iri + '|' + bnode + '|' + literal + ')' + wso;
  var graphName = '(?:\\.|(?:(?:' + iri + '|' + bnode + ')' + wso + '\\.))';

  // full quad regex
  var quad = new RegExp(
    '^' + wso + subject + property + object + graphName + wso + '$');

  // build RDF dataset
  var dataset = {};

  // split N-Quad input into lines
  var lines = input.split(eoln);
  var lineNumber = 0;
  for(var li = 0; li < lines.length; ++li) {
    var line = lines[li];
    lineNumber++;

    // skip empty lines
    if(empty.test(line)) {
      continue;
    }

    // parse quad
    var match = line.match(quad);
    if(match === null) {
      throw new JsonLdError(
        'Error while parsing N-Quads; invalid quad.',
        'jsonld.ParseError', {line: lineNumber});
    }

    // create RDF triple
    var triple = {};

    // get subject
    if(!_isUndefined(match[1])) {
      triple.subject = {type: 'IRI', value: match[1]};
    } else {
      triple.subject = {type: 'blank node', value: match[2]};
    }

    // get predicate
    triple.predicate = {type: 'IRI', value: match[3]};

    // get object
    if(!_isUndefined(match[4])) {
      triple.object = {type: 'IRI', value: match[4]};
    } else if(!_isUndefined(match[5])) {
      triple.object = {type: 'blank node', value: match[5]};
    } else {
      triple.object = {type: 'literal'};
      if(!_isUndefined(match[7])) {
        triple.object.datatype = match[7];
      } else if(!_isUndefined(match[8])) {
        triple.object.datatype = RDF_LANGSTRING;
        triple.object.language = match[8];
      } else {
        triple.object.datatype = XSD_STRING;
      }
      var unescaped = match[6]
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\');
      triple.object.value = unescaped;
    }

    // get graph name ('@default' is used for the default graph)
    var name = '@default';
    if(!_isUndefined(match[9])) {
      name = match[9];
    } else if(!_isUndefined(match[10])) {
      name = match[10];
    }

    // initialize graph in dataset
    if(!(name in dataset)) {
      dataset[name] = [triple];
    } else {
      // add triple if unique to its graph
      var unique = true;
      var triples = dataset[name];
      for(var ti = 0; unique && ti < triples.length; ++ti) {
        if(_compareRDFTriples(triples[ti], triple)) {
          unique = false;
        }
      }
      if(unique) {
        triples.push(triple);
      }
    }
  }

  return dataset;
}

// register the N-Quads RDF parser
jsonld.registerRDFParser('application/nquads', _parseNQuads);

/**
 * Converts an RDF dataset to N-Quads.
 *
 * @param dataset the RDF dataset to convert.
 *
 * @return the N-Quads string.
 */
function _toNQuads(dataset) {
  var quads = [];
  for(var graphName in dataset) {
    var triples = dataset[graphName];
    for(var ti = 0; ti < triples.length; ++ti) {
      var triple = triples[ti];
      if(graphName === '@default') {
        graphName = null;
      }
      quads.push(_toNQuad(triple, graphName));
    }
  }
  quads.sort();
  return quads.join('');
}

/**
 * Converts an RDF triple and graph name to an N-Quad string (a single quad).
 *
 * @param triple the RDF triple to convert.
 * @param graphName the name of the graph containing the triple, null for
 *          the default graph.
 * @param bnode the bnode the quad is mapped to (optional, for use
 *          during normalization only).
 *
 * @return the N-Quad string.
 */
function _toNQuad(triple, graphName, bnode) {
  var s = triple.subject;
  var p = triple.predicate;
  var o = triple.object;
  var g = graphName;

  var quad = '';

  // subject is an IRI
  if(s.type === 'IRI') {
    quad += '<' + s.value + '>';
  } else if(bnode) {
    // bnode normalization mode
    quad += (s.value === bnode) ? '_:a' : '_:z';
  } else {
    // bnode normal mode
    quad += s.value;
  }
  quad += ' ';

  // predicate is an IRI
  if(p.type === 'IRI') {
    quad += '<' + p.value + '>';
  } else if(bnode) {
    // FIXME: TBD what to do with bnode predicates during normalization
    // bnode normalization mode
    quad += '_:p';
  } else {
    // bnode normal mode
    quad += p.value;
  }
  quad += ' ';

  // object is IRI, bnode, or literal
  if(o.type === 'IRI') {
    quad += '<' + o.value + '>';
  } else if(o.type === 'blank node') {
    // normalization mode
    if(bnode) {
      quad += (o.value === bnode) ? '_:a' : '_:z';
    } else {
      // normal mode
      quad += o.value;
    }
  } else {
    var escaped = o.value
      .replace(/\\/g, '\\\\')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\"/g, '\\"');
    quad += '"' + escaped + '"';
    if(o.datatype === RDF_LANGSTRING) {
      if(o.language) {
        quad += '@' + o.language;
      }
    } else if(o.datatype !== XSD_STRING) {
      quad += '^^<' + o.datatype + '>';
    }
  }

  // graph
  if(g !== null) {
    if(g.indexOf('_:') !== 0) {
      quad += ' <' + g + '>';
    } else if(bnode) {
      quad += ' _:g';
    } else {
      quad += ' ' + g;
    }
  }

  quad += ' .\n';
  return quad;
}

/**
 * Parses the RDF dataset found via the data object from the RDFa API.
 *
 * @param data the RDFa API data object.
 *
 * @return the RDF dataset.
 */
function _parseRdfaApiData(data) {
  var dataset = {};
  dataset['@default'] = [];

  var subjects = data.getSubjects();
  for(var si = 0; si < subjects.length; ++si) {
    var subject = subjects[si];
    if(subject === null) {
      continue;
    }

    // get all related triples
    var triples = data.getSubjectTriples(subject);
    if(triples === null) {
      continue;
    }
    var predicates = triples.predicates;
    for(var predicate in predicates) {
      // iterate over objects
      var objects = predicates[predicate].objects;
      for(var oi = 0; oi < objects.length; ++oi) {
        var object = objects[oi];

        // create RDF triple
        var triple = {};

        // add subject
        if(subject.indexOf('_:') === 0) {
          triple.subject = {type: 'blank node', value: subject};
        } else {
          triple.subject = {type: 'IRI', value: subject};
        }

        // add predicate
        if(predicate.indexOf('_:') === 0) {
          triple.predicate = {type: 'blank node', value: predicate};
        } else {
          triple.predicate = {type: 'IRI', value: predicate};
        }

        // serialize XML literal
        var value = object.value;
        if(object.type === RDF_XML_LITERAL) {
          // initialize XMLSerializer
          if(!XMLSerializer) {
            _defineXMLSerializer();
          }
          var serializer = new XMLSerializer();
          value = '';
          for(var x = 0; x < object.value.length; x++) {
            if(object.value[x].nodeType === Node.ELEMENT_NODE) {
              value += serializer.serializeToString(object.value[x]);
            } else if(object.value[x].nodeType === Node.TEXT_NODE) {
              value += object.value[x].nodeValue;
            }
          }
        }

        // add object
        triple.object = {};

        // object is an IRI
        if(object.type === RDF_OBJECT) {
          if(object.value.indexOf('_:') === 0) {
            triple.object.type = 'blank node';
          } else {
            triple.object.type = 'IRI';
          }
        } else {
          // object is a literal
          triple.object.type = 'literal';
          if(object.type === RDF_PLAIN_LITERAL) {
            if(object.language) {
              triple.object.datatype = RDF_LANGSTRING;
              triple.object.language = object.language;
            } else {
              triple.object.datatype = XSD_STRING;
            }
          } else {
            triple.object.datatype = object.type;
          }
        }
        triple.object.value = value;

        // add triple to dataset in default graph
        dataset['@default'].push(triple);
      }
    }
  }

  return dataset;
}

// register the RDFa API RDF parser
jsonld.registerRDFParser('rdfa-api', _parseRdfaApiData);

/**
 * Creates a new UniqueNamer. A UniqueNamer issues unique names, keeping
 * track of any previously issued names.
 *
 * @param prefix the prefix to use ('<prefix><counter>').
 */
function UniqueNamer(prefix) {
  this.prefix = prefix;
  this.counter = 0;
  this.existing = {};
}
jsonld.UniqueNamer = UniqueNamer;

/**
 * Copies this UniqueNamer.
 *
 * @return a copy of this UniqueNamer.
 */
UniqueNamer.prototype.clone = function() {
  var copy = new UniqueNamer(this.prefix);
  copy.counter = this.counter;
  copy.existing = _clone(this.existing);
  return copy;
};

/**
 * Gets the new name for the given old name, where if no old name is given
 * a new name will be generated.
 *
 * @param [oldName] the old name to get the new name for.
 *
 * @return the new name.
 */
UniqueNamer.prototype.getName = function(oldName) {
  // return existing old name
  if(oldName && oldName in this.existing) {
    return this.existing[oldName];
  }

  // get next name
  var name = this.prefix + this.counter;
  this.counter += 1;

  // save mapping
  if(oldName) {
    this.existing[oldName] = name;
  }

  return name;
};

/**
 * Returns true if the given oldName has already been assigned a new name.
 *
 * @param oldName the oldName to check.
 *
 * @return true if the oldName has been assigned a new name, false if not.
 */
UniqueNamer.prototype.isNamed = function(oldName) {
  return (oldName in this.existing);
};

/**
 * A Permutator iterates over all possible permutations of the given array
 * of elements.
 *
 * @param list the array of elements to iterate over.
 */
var Permutator = function(list) {
  // original array
  this.list = list.sort();
  // indicates whether there are more permutations
  this.done = false;
  // directional info for permutation algorithm
  this.left = {};
  for(var i = 0; i < list.length; ++i) {
    this.left[list[i]] = true;
  }
};

/**
 * Returns true if there is another permutation.
 *
 * @return true if there is another permutation, false if not.
 */
Permutator.prototype.hasNext = function() {
  return !this.done;
};

/**
 * Gets the next permutation. Call hasNext() to ensure there is another one
 * first.
 *
 * @return the next permutation.
 */
Permutator.prototype.next = function() {
  // copy current permutation
  var rval = this.list.slice();

  /* Calculate the next permutation using the Steinhaus-Johnson-Trotter
   permutation algorithm. */

  // get largest mobile element k
  // (mobile: element is greater than the one it is looking at)
  var k = null;
  var pos = 0;
  var length = this.list.length;
  for(var i = 0; i < length; ++i) {
    var element = this.list[i];
    var left = this.left[element];
    if((k === null || element > k) &&
      ((left && i > 0 && element > this.list[i - 1]) ||
      (!left && i < (length - 1) && element > this.list[i + 1]))) {
      k = element;
      pos = i;
    }
  }

  // no more permutations
  if(k === null) {
    this.done = true;
  } else {
    // swap k and the element it is looking at
    var swap = this.left[k] ? pos - 1 : pos + 1;
    this.list[pos] = this.list[swap];
    this.list[swap] = k;

    // reverse the direction of all elements larger than k
    for(var i = 0; i < length; ++i) {
      if(this.list[i] > k) {
        this.left[this.list[i]] = !this.left[this.list[i]];
      }
    }
  }

  return rval;
};

// SHA-1 API
var sha1 = jsonld.sha1 = {};

if(_nodejs) {
  var crypto = require('crypto');
  sha1.create = function() {
    var md = crypto.createHash('sha1');
    return {
      update: function(data) {
        md.update(data, 'utf8');
      },
      digest: function() {
        return md.digest('hex');
      }
    };
  };
} else {
  sha1.create = function() {
    return new sha1.MessageDigest();
  };
}

/**
 * Hashes the given array of quads and returns its hexadecimal SHA-1 message
 * digest.
 *
 * @param nquads the list of serialized quads to hash.
 *
 * @return the hexadecimal SHA-1 message digest.
 */
sha1.hash = function(nquads) {
  var md = sha1.create();
  for(var i = 0; i < nquads.length; ++i) {
    md.update(nquads[i]);
  }
  return md.digest();
};

// only define sha1 MessageDigest for non-nodejs
if(!_nodejs) {

/**
 * Creates a simple byte buffer for message digest operations.
 */
sha1.Buffer = function() {
  this.data = '';
  this.read = 0;
};

/**
 * Puts a 32-bit integer into this buffer in big-endian order.
 *
 * @param i the 32-bit integer.
 */
sha1.Buffer.prototype.putInt32 = function(i) {
  this.data += (
    String.fromCharCode(i >> 24 & 0xFF) +
    String.fromCharCode(i >> 16 & 0xFF) +
    String.fromCharCode(i >> 8 & 0xFF) +
    String.fromCharCode(i & 0xFF));
};

/**
 * Gets a 32-bit integer from this buffer in big-endian order and
 * advances the read pointer by 4.
 *
 * @return the word.
 */
sha1.Buffer.prototype.getInt32 = function() {
  var rval = (
    this.data.charCodeAt(this.read) << 24 ^
    this.data.charCodeAt(this.read + 1) << 16 ^
    this.data.charCodeAt(this.read + 2) << 8 ^
    this.data.charCodeAt(this.read + 3));
  this.read += 4;
  return rval;
};

/**
 * Gets the bytes in this buffer.
 *
 * @return a string full of UTF-8 encoded characters.
 */
sha1.Buffer.prototype.bytes = function() {
  return this.data.slice(this.read);
};

/**
 * Gets the number of bytes in this buffer.
 *
 * @return the number of bytes in this buffer.
 */
sha1.Buffer.prototype.length = function() {
  return this.data.length - this.read;
};

/**
 * Compacts this buffer.
 */
sha1.Buffer.prototype.compact = function() {
  this.data = this.data.slice(this.read);
  this.read = 0;
};

/**
 * Converts this buffer to a hexadecimal string.
 *
 * @return a hexadecimal string.
 */
sha1.Buffer.prototype.toHex = function() {
  var rval = '';
  for(var i = this.read; i < this.data.length; ++i) {
    var b = this.data.charCodeAt(i);
    if(b < 16) {
      rval += '0';
    }
    rval += b.toString(16);
  }
  return rval;
};

/**
 * Creates a SHA-1 message digest object.
 *
 * @return a message digest object.
 */
sha1.MessageDigest = function() {
  // do initialization as necessary
  if(!_sha1.initialized) {
    _sha1.init();
  }

  this.blockLength = 64;
  this.digestLength = 20;
  // length of message so far (does not including padding)
  this.messageLength = 0;

  // input buffer
  this.input = new sha1.Buffer();

  // for storing words in the SHA-1 algorithm
  this.words = new Array(80);

  // SHA-1 state contains five 32-bit integers
  this.state = {
    h0: 0x67452301,
    h1: 0xEFCDAB89,
    h2: 0x98BADCFE,
    h3: 0x10325476,
    h4: 0xC3D2E1F0
  };
};

/**
 * Updates the digest with the given string input.
 *
 * @param msg the message input to update with.
 */
sha1.MessageDigest.prototype.update = function(msg) {
  // UTF-8 encode message
  msg = unescape(encodeURIComponent(msg));

  // update message length and input buffer
  this.messageLength += msg.length;
  this.input.data += msg;

  // process input
  _sha1.update(this.state, this.words, this.input);

  // compact input buffer every 2K or if empty
  if(this.input.read > 2048 || this.input.length() === 0) {
    this.input.compact();
  }
};

/**
 * Produces the digest.
 *
 * @return the digest as a hexadecimal string.
 */
sha1.MessageDigest.prototype.digest = function() {
  /* Determine the number of bytes that must be added to the message
  to ensure its length is congruent to 448 mod 512. In other words,
  a 64-bit integer that gives the length of the message will be
  appended to the message and whatever the length of the message is
  plus 64 bits must be a multiple of 512. So the length of the
  message must be congruent to 448 mod 512 because 512 - 64 = 448.

  In order to fill up the message length it must be filled with
  padding that begins with 1 bit followed by all 0 bits. Padding
  must *always* be present, so if the message length is already
  congruent to 448 mod 512, then 512 padding bits must be added. */

  // 512 bits == 64 bytes, 448 bits == 56 bytes, 64 bits = 8 bytes
  // _padding starts with 1 byte with first bit is set in it which
  // is byte value 128, then there may be up to 63 other pad bytes
  var len = this.messageLength;
  var padBytes = new sha1.Buffer();
  padBytes.data += this.input.bytes();
  padBytes.data += _sha1.padding.substr(0, 64 - ((len + 8) % 64));

  /* Now append length of the message. The length is appended in bits
  as a 64-bit number in big-endian order. Since we store the length
  in bytes, we must multiply it by 8 (or left shift by 3). So here
  store the high 3 bits in the low end of the first 32-bits of the
  64-bit number and the lower 5 bits in the high end of the second
  32-bits. */
  padBytes.putInt32((len >>> 29) & 0xFF);
  padBytes.putInt32((len << 3) & 0xFFFFFFFF);
  _sha1.update(this.state, this.words, padBytes);
  var rval = new sha1.Buffer();
  rval.putInt32(this.state.h0);
  rval.putInt32(this.state.h1);
  rval.putInt32(this.state.h2);
  rval.putInt32(this.state.h3);
  rval.putInt32(this.state.h4);
  return rval.toHex();
};

// private SHA-1 data
var _sha1 = {
  padding: null,
  initialized: false
};

/**
 * Initializes the constant tables.
 */
_sha1.init = function() {
  // create padding
  _sha1.padding = String.fromCharCode(128);
  var c = String.fromCharCode(0x00);
  var n = 64;
  while(n > 0) {
    if(n & 1) {
      _sha1.padding += c;
    }
    n >>>= 1;
    if(n > 0) {
      c += c;
    }
  }

  // now initialized
  _sha1.initialized = true;
};

/**
 * Updates a SHA-1 state with the given byte buffer.
 *
 * @param s the SHA-1 state to update.
 * @param w the array to use to store words.
 * @param input the input byte buffer.
 */
_sha1.update = function(s, w, input) {
  // consume 512 bit (64 byte) chunks
  var t, a, b, c, d, e, f, i;
  var len = input.length();
  while(len >= 64) {
    // the w array will be populated with sixteen 32-bit big-endian words
    // and then extended into 80 32-bit words according to SHA-1 algorithm
    // and for 32-79 using Max Locktyukhin's optimization

    // initialize hash value for this chunk
    a = s.h0;
    b = s.h1;
    c = s.h2;
    d = s.h3;
    e = s.h4;

    // round 1
    for(i = 0; i < 16; ++i) {
      t = input.getInt32();
      w[i] = t;
      f = d ^ (b & (c ^ d));
      t = ((a << 5) | (a >>> 27)) + f + e + 0x5A827999 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    for(; i < 20; ++i) {
      t = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]);
      t = (t << 1) | (t >>> 31);
      w[i] = t;
      f = d ^ (b & (c ^ d));
      t = ((a << 5) | (a >>> 27)) + f + e + 0x5A827999 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    // round 2
    for(; i < 32; ++i) {
      t = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]);
      t = (t << 1) | (t >>> 31);
      w[i] = t;
      f = b ^ c ^ d;
      t = ((a << 5) | (a >>> 27)) + f + e + 0x6ED9EBA1 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    for(; i < 40; ++i) {
      t = (w[i - 6] ^ w[i - 16] ^ w[i - 28] ^ w[i - 32]);
      t = (t << 2) | (t >>> 30);
      w[i] = t;
      f = b ^ c ^ d;
      t = ((a << 5) | (a >>> 27)) + f + e + 0x6ED9EBA1 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    // round 3
    for(; i < 60; ++i) {
      t = (w[i - 6] ^ w[i - 16] ^ w[i - 28] ^ w[i - 32]);
      t = (t << 2) | (t >>> 30);
      w[i] = t;
      f = (b & c) | (d & (b ^ c));
      t = ((a << 5) | (a >>> 27)) + f + e + 0x8F1BBCDC + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }
    // round 4
    for(; i < 80; ++i) {
      t = (w[i - 6] ^ w[i - 16] ^ w[i - 28] ^ w[i - 32]);
      t = (t << 2) | (t >>> 30);
      w[i] = t;
      f = b ^ c ^ d;
      t = ((a << 5) | (a >>> 27)) + f + e + 0xCA62C1D6 + t;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = t;
    }

    // update hash state
    s.h0 += a;
    s.h1 += b;
    s.h2 += c;
    s.h3 += d;
    s.h4 += e;

    len -= 64;
  }
};

} // end non-nodejs

if(!XMLSerializer) {

var _defineXMLSerializer = function() {
  XMLSerializer = require('xmldom').XMLSerializer;
};

} // end _defineXMLSerializer

// define URL parser
// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
// with local jsonld.js modifications
jsonld.url = {};
jsonld.url.parsers = {
  simple: {
    // RFC 3986 basic parts
    keys: ['href','scheme','authority','path','query','fragment'],
    regex: /^(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/
  },
  full: {
    keys: ['href','protocol','scheme','authority','auth','user','password','hostname','port','path','directory','file','query','fragment'],
    regex: /^(([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?(?:(((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
};
jsonld.url.parse = function(str, parser) {
  var parsed = {};
  var o = jsonld.url.parsers[parser || 'full'];
  var m = o.regex.exec(str);
  var i = o.keys.length;
  while(i--) {
    parsed[o.keys[i]] = (m[i] === undefined) ? null : m[i];
  }
  parsed.normalizedPath = _removeDotSegments(parsed.path, !!parsed.authority);
  return parsed;
};

/**
 * Removes dot segments from a URL path.
 *
 * @param path the path to remove dot segments from.
 * @param hasAuthority true if the URL has an authority, false if not.
 */
function _removeDotSegments(path, hasAuthority) {
  var rval = '';

  if(path.indexOf('/') === 0) {
    rval = '/';
  }

  // RFC 3986 5.2.4 (reworked)
  var input = path.split('/');
  var output = [];
  while(input.length > 0) {
    if(input[0] === '.' || (input[0] === '' && input.length > 1)) {
      input.shift();
      continue;
    }
    if(input[0] === '..') {
      input.shift();
      if(hasAuthority ||
        (output.length > 0 && output[output.length - 1] !== '..')) {
        output.pop();
      } else {
        // leading relative URL '..'
        output.push('..');
      }
      continue;
    }
    output.push(input.shift());
  }

  return rval + output.join('/');
}

if(_nodejs) {
  // use node document loader by default
  jsonld.useDocumentLoader('node');
} else if(typeof XMLHttpRequest !== 'undefined') {
  // use xhr document loader by default
  jsonld.useDocumentLoader('xhr');
}

if(_nodejs) {
  jsonld.use = function(extension) {
    switch(extension) {
      case 'request':
        // use node JSON-LD request extension
        jsonld.request = require('./request');
        break;
      default:
        throw new JsonLdError(
          'Unknown extension.',
          'jsonld.UnknownExtension', {extension: extension});
    }
  };

  // expose version
  var _module = {exports: {}, filename: __dirname};
  require('pkginfo')(_module, 'version');
  jsonld.version = _module.exports.version;
}

// end of jsonld API factory
return jsonld;
};

// external APIs:

// used to generate a new jsonld API instance
var factory = function() {
  return wrapper(function() {
    return factory();
  });
};

if(!_nodejs && (typeof define === 'function' && define.amd)) {
  // export AMD API
  define([], function() {
    // now that module is defined, wrap main jsonld API instance
    wrapper(factory);
    return factory;
  });
} else {
  // wrap the main jsonld API instance
  wrapper(factory);

  if(typeof require === 'function' &&
    typeof module !== 'undefined' && module.exports) {
    // export CommonJS/nodejs API
    module.exports = factory;
  }

  if(_browser) {
    // export simple browser API
    if(typeof jsonld === 'undefined') {
      jsonld = jsonldjs = factory;
    } else {
      jsonldjs = factory;
    }
  }
}

return factory;

})();

}).call(this,require("sfauuP"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},"/../node_modules/jsonld/js")
},{"./request":34,"crypto":34,"es6-promise":36,"http":34,"pkginfo":37,"request":34,"sfauuP":25,"util":34,"xmldom":34}],36:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.0.1
 */

(function() {
    "use strict";

    function $$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function $$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function $$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var $$utils$$_isArray;

    if (!Array.isArray) {
      $$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      $$utils$$_isArray = Array.isArray;
    }

    var $$utils$$isArray = $$utils$$_isArray;
    var $$utils$$now = Date.now || function() { return new Date().getTime(); };
    function $$utils$$F() { }

    var $$utils$$o_create = (Object.create || function (o) {
      if (arguments.length > 1) {
        throw new Error('Second argument not supported');
      }
      if (typeof o !== 'object') {
        throw new TypeError('Argument must be an object');
      }
      $$utils$$F.prototype = o;
      return new $$utils$$F();
    });

    var $$asap$$len = 0;

    var $$asap$$default = function asap(callback, arg) {
      $$asap$$queue[$$asap$$len] = callback;
      $$asap$$queue[$$asap$$len + 1] = arg;
      $$asap$$len += 2;
      if ($$asap$$len === 2) {
        // If len is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        $$asap$$scheduleFlush();
      }
    };

    var $$asap$$browserGlobal = (typeof window !== 'undefined') ? window : {};
    var $$asap$$BrowserMutationObserver = $$asap$$browserGlobal.MutationObserver || $$asap$$browserGlobal.WebKitMutationObserver;

    // test for web worker but not in IE10
    var $$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function $$asap$$useNextTick() {
      return function() {
        process.nextTick($$asap$$flush);
      };
    }

    function $$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new $$asap$$BrowserMutationObserver($$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function $$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = $$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function $$asap$$useSetTimeout() {
      return function() {
        setTimeout($$asap$$flush, 1);
      };
    }

    var $$asap$$queue = new Array(1000);

    function $$asap$$flush() {
      for (var i = 0; i < $$asap$$len; i+=2) {
        var callback = $$asap$$queue[i];
        var arg = $$asap$$queue[i+1];

        callback(arg);

        $$asap$$queue[i] = undefined;
        $$asap$$queue[i+1] = undefined;
      }

      $$asap$$len = 0;
    }

    var $$asap$$scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      $$asap$$scheduleFlush = $$asap$$useNextTick();
    } else if ($$asap$$BrowserMutationObserver) {
      $$asap$$scheduleFlush = $$asap$$useMutationObserver();
    } else if ($$asap$$isWorker) {
      $$asap$$scheduleFlush = $$asap$$useMessageChannel();
    } else {
      $$asap$$scheduleFlush = $$asap$$useSetTimeout();
    }

    function $$$internal$$noop() {}
    var $$$internal$$PENDING   = void 0;
    var $$$internal$$FULFILLED = 1;
    var $$$internal$$REJECTED  = 2;
    var $$$internal$$GET_THEN_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function $$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.')
    }

    function $$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        $$$internal$$GET_THEN_ERROR.error = error;
        return $$$internal$$GET_THEN_ERROR;
      }
    }

    function $$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function $$$internal$$handleForeignThenable(promise, thenable, then) {
       $$asap$$default(function(promise) {
        var sealed = false;
        var error = $$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            $$$internal$$resolve(promise, value);
          } else {
            $$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          $$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          $$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function $$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, thenable._result);
      } else if (promise._state === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, thenable._result);
      } else {
        $$$internal$$subscribe(thenable, undefined, function(value) {
          $$$internal$$resolve(promise, value);
        }, function(reason) {
          $$$internal$$reject(promise, reason);
        });
      }
    }

    function $$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        $$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = $$$internal$$getThen(maybeThenable);

        if (then === $$$internal$$GET_THEN_ERROR) {
          $$$internal$$reject(promise, $$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          $$$internal$$fulfill(promise, maybeThenable);
        } else if ($$utils$$isFunction(then)) {
          $$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          $$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function $$$internal$$resolve(promise, value) {
      if (promise === value) {
        $$$internal$$reject(promise, $$$internal$$selfFullfillment());
      } else if ($$utils$$objectOrFunction(value)) {
        $$$internal$$handleMaybeThenable(promise, value);
      } else {
        $$$internal$$fulfill(promise, value);
      }
    }

    function $$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      $$$internal$$publish(promise);
    }

    function $$$internal$$fulfill(promise, value) {
      if (promise._state !== $$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = $$$internal$$FULFILLED;

      if (promise._subscribers.length === 0) {
      } else {
        $$asap$$default($$$internal$$publish, promise);
      }
    }

    function $$$internal$$reject(promise, reason) {
      if (promise._state !== $$$internal$$PENDING) { return; }
      promise._state = $$$internal$$REJECTED;
      promise._result = reason;

      $$asap$$default($$$internal$$publishRejection, promise);
    }

    function $$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + $$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + $$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        $$asap$$default($$$internal$$publish, parent);
      }
    }

    function $$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          $$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function $$$internal$$ErrorObject() {
      this.error = null;
    }

    var $$$internal$$TRY_CATCH_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        $$$internal$$TRY_CATCH_ERROR.error = e;
        return $$$internal$$TRY_CATCH_ERROR;
      }
    }

    function $$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = $$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = $$$internal$$tryCatch(callback, detail);

        if (value === $$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          $$$internal$$reject(promise, $$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== $$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        $$$internal$$resolve(promise, value);
      } else if (failed) {
        $$$internal$$reject(promise, error);
      } else if (settled === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, value);
      } else if (settled === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, value);
      }
    }

    function $$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          $$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          $$$internal$$reject(promise, reason);
        });
      } catch(e) {
        $$$internal$$reject(promise, e);
      }
    }

    function $$$enumerator$$makeSettledResult(state, position, value) {
      if (state === $$$internal$$FULFILLED) {
        return {
          state: 'fulfilled',
          value: value
        };
      } else {
        return {
          state: 'rejected',
          reason: value
        };
      }
    }

    function $$$enumerator$$Enumerator(Constructor, input, abortOnReject, label) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor($$$internal$$noop, label);
      this._abortOnReject = abortOnReject;

      if (this._validateInput(input)) {
        this._input     = input;
        this.length     = input.length;
        this._remaining = input.length;

        this._init();

        if (this.length === 0) {
          $$$internal$$fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate();
          if (this._remaining === 0) {
            $$$internal$$fulfill(this.promise, this._result);
          }
        }
      } else {
        $$$internal$$reject(this.promise, this._validationError());
      }
    }

    $$$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return $$utils$$isArray(input);
    };

    $$$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    $$$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var $$$enumerator$$default = $$$enumerator$$Enumerator;

    $$$enumerator$$Enumerator.prototype._enumerate = function() {
      var length  = this.length;
      var promise = this.promise;
      var input   = this._input;

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    $$$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var c = this._instanceConstructor;
      if ($$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== $$$internal$$PENDING) {
          entry._onerror = null;
          this._settledAt(entry._state, i, entry._result);
        } else {
          this._willSettleAt(c.resolve(entry), i);
        }
      } else {
        this._remaining--;
        this._result[i] = this._makeResult($$$internal$$FULFILLED, i, entry);
      }
    };

    $$$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var promise = this.promise;

      if (promise._state === $$$internal$$PENDING) {
        this._remaining--;

        if (this._abortOnReject && state === $$$internal$$REJECTED) {
          $$$internal$$reject(promise, value);
        } else {
          this._result[i] = this._makeResult(state, i, value);
        }
      }

      if (this._remaining === 0) {
        $$$internal$$fulfill(promise, this._result);
      }
    };

    $$$enumerator$$Enumerator.prototype._makeResult = function(state, i, value) {
      return value;
    };

    $$$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      $$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt($$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt($$$internal$$REJECTED, i, reason);
      });
    };

    var $$promise$all$$default = function all(entries, label) {
      return new $$$enumerator$$default(this, entries, true /* abort on reject */, label).promise;
    };

    var $$promise$race$$default = function race(entries, label) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor($$$internal$$noop, label);

      if (!$$utils$$isArray(entries)) {
        $$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        $$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        $$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        $$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    };

    var $$promise$resolve$$default = function resolve(object, label) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$resolve(promise, object);
      return promise;
    };

    var $$promise$reject$$default = function reject(reason, label) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$reject(promise, reason);
      return promise;
    };

    var $$es6$promise$promise$$counter = 0;

    function $$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function $$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var $$es6$promise$promise$$default = $$es6$promise$promise$$Promise;

    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise’s eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function $$es6$promise$promise$$Promise(resolver) {
      this._id = $$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if ($$$internal$$noop !== resolver) {
        if (!$$utils$$isFunction(resolver)) {
          $$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof $$es6$promise$promise$$Promise)) {
          $$es6$promise$promise$$needsNew();
        }

        $$$internal$$initializePromise(this, resolver);
      }
    }

    $$es6$promise$promise$$Promise.all = $$promise$all$$default;
    $$es6$promise$promise$$Promise.race = $$promise$race$$default;
    $$es6$promise$promise$$Promise.resolve = $$promise$resolve$$default;
    $$es6$promise$promise$$Promise.reject = $$promise$reject$$default;

    $$es6$promise$promise$$Promise.prototype = {
      constructor: $$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === $$$internal$$FULFILLED && !onFulfillment || state === $$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor($$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          $$asap$$default(function(){
            $$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          $$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    var $$es6$promise$polyfill$$default = function polyfill() {
      var local;

      if (typeof global !== 'undefined') {
        local = global;
      } else if (typeof window !== 'undefined' && window.document) {
        local = window;
      } else {
        local = self;
      }

      var es6PromiseSupport =
        "Promise" in local &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "resolve" in local.Promise &&
        "reject" in local.Promise &&
        "all" in local.Promise &&
        "race" in local.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new local.Promise(function(r) { resolve = r; });
          return $$utils$$isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        local.Promise = $$es6$promise$promise$$default;
      }
    };

    var es6$promise$umd$$ES6Promise = {
      'Promise': $$es6$promise$promise$$default,
      'polyfill': $$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = es6$promise$umd$$ES6Promise;
    }
}).call(this);
}).call(this,require("sfauuP"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"sfauuP":25}],37:[function(require,module,exports){
(function (__dirname){
/*
 * pkginfo.js: Top-level include for the pkginfo module
 *
 * (C) 2011, Charlie Robbins
 *
 */
 
var fs = require('fs'),
    path = require('path');

//
// ### function pkginfo ([options, 'property', 'property' ..])
// #### @pmodule {Module} Parent module to read from.
// #### @options {Object|Array|string} **Optional** Options used when exposing properties.
// #### @arguments {string...} **Optional** Specified properties to expose.
// Exposes properties from the package.json file for the parent module on 
// it's exports. Valid usage:
//
// `require('pkginfo')()`
//
// `require('pkginfo')('version', 'author');`
//
// `require('pkginfo')(['version', 'author']);`
//
// `require('pkginfo')({ include: ['version', 'author'] });`
//
var pkginfo = module.exports = function (pmodule, options) {
  var args = [].slice.call(arguments, 2).filter(function (arg) {
    return typeof arg === 'string';
  });
  
  //
  // **Parse variable arguments**
  //
  if (Array.isArray(options)) {
    //
    // If the options passed in is an Array assume that
    // it is the Array of properties to expose from the
    // on the package.json file on the parent module.
    //
    options = { include: options };
  }
  else if (typeof options === 'string') {
    //
    // Otherwise if the first argument is a string, then
    // assume that it is the first property to expose from
    // the package.json file on the parent module.
    //
    options = { include: [options] };
  }
  
  //
  // **Setup default options**
  //
  options = options || {};
  
  // ensure that includes have been defined
  options.include = options.include || [];
  
  if (args.length > 0) {
    //
    // If additional string arguments have been passed in
    // then add them to the properties to expose on the 
    // parent module. 
    //
    options.include = options.include.concat(args);
  }
  
  var pkg = pkginfo.read(pmodule, options.dir).package;
  Object.keys(pkg).forEach(function (key) {
    if (options.include.length > 0 && !~options.include.indexOf(key)) {
      return;
    }
    
    if (!pmodule.exports[key]) {
      pmodule.exports[key] = pkg[key];
    }
  });
  
  return pkginfo;
};

//
// ### function find (dir)
// #### @pmodule {Module} Parent module to read from.
// #### @dir {string} **Optional** Directory to start search from.
// Searches up the directory tree from `dir` until it finds a directory
// which contains a `package.json` file. 
//
pkginfo.find = function (pmodule, dir) {
  if (! dir) {
    dir = path.dirname(pmodule.filename);
  }
  
  var files = fs.readdirSync(dir);
  
  if (~files.indexOf('package.json')) {
    return path.join(dir, 'package.json');
  }
  
  if (dir === '/') {
    throw new Error('Could not find package.json up from: ' + dir);
  }
  else if (!dir || dir === '.') {
    throw new Error('Cannot find package.json from unspecified directory');
  }
  
  return pkginfo.find(pmodule, path.dirname(dir));
};

//
// ### function read (pmodule, dir)
// #### @pmodule {Module} Parent module to read from.
// #### @dir {string} **Optional** Directory to start search from.
// Searches up the directory tree from `dir` until it finds a directory
// which contains a `package.json` file and returns the package information.
//
pkginfo.read = function (pmodule, dir) { 
  dir = pkginfo.find(pmodule, dir);
  
  var data = fs.readFileSync(dir).toString();
      
  return {
    dir: dir, 
    package: JSON.parse(data)
  };
};

//
// Call `pkginfo` on this module and expose version.
//
pkginfo(module, {
  dir: __dirname,
  include: ['version'],
  target: pkginfo
});
}).call(this,"/../node_modules/jsonld/node_modules/pkginfo/lib")
},{"fs":23,"path":24}],38:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS1icnVuY2gvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2luaXRpYWxpemUuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL2FwcGxpY2F0aW9uLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy9tb2RlbHMvY29uY2VwdC5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvbW9kZWxzL3RoZXNhdXJ1cy5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvcm91dGVycy9yb3V0ZXIuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL3ZpZXdzL2FwcC5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3MvY29uY2VwdC5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3MvZm9vdGVyLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy92aWV3cy9oZWFkZXIuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL3ZpZXdzL2hvbWUuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL3ZpZXdzL25hdi5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3MvbmF2Q2lyY2xlLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy92aWV3cy9uYXZUcmVlLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy92aWV3cy9zZWxlY3ROYXYuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL3ZpZXdzL3RlbXBsYXRlcy9jb25jZXB0LmhicyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3MvdGVtcGxhdGVzL2Zvb3Rlci5oYnMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL3ZpZXdzL3RlbXBsYXRlcy9oZWFkZXIuaGJzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy92aWV3cy90ZW1wbGF0ZXMvaGVscGVycy5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3MvdGVtcGxhdGVzL2hvbWUuaGJzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy92aWV3cy90ZW1wbGF0ZXMvbWFpbi5oYnMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL3ZpZXdzL3RlbXBsYXRlcy9zZWxlY3ROYXYuaGJzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy92aWV3cy92aWV3LmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5LWJydW5jaC9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS1icnVuY2gvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnktYnJ1bmNoL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9leGNlcHRpb24uanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9ydW50aW1lLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9qc29ubGQvYnJvd3Nlci9pZ25vcmUuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2pzb25sZC9qcy9qc29ubGQuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2pzb25sZC9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvanNvbmxkL25vZGVfbW9kdWxlcy9wa2dpbmZvL2xpYi9wa2dpbmZvLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy91bmRlcnNjb3JlL3VuZGVyc2NvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBOztBQ0RBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzduT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqOEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGFwcGxpY2F0aW9uID0gcmVxdWlyZSgnLi9qcy9hcHBsaWNhdGlvbicpO1xuXG4kKGZ1bmN0aW9uKCkge1xuXG5cdC8vY3JlYXRlIHRoZSBhcHBcbiAgXHRhcHBsaWNhdGlvbi5pbml0aWFsaXplKCk7XG4gIFx0XG4gIFx0Ly9yb3V0ZSB0aGUgaW5pdGlhbCB1cmxcbiAgXHRCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHsgcHVzaFN0YXRlOiB0cnVlIH0pO1xuICBcdFxufSk7IiwidmFyIEFwcGxpY2F0aW9uID0ge1xuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIGluaXRpYWxpemVBcHBsaWNhdGlvbigpIHtcbiAgIFxuICBcdHZhciBBcHBWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9hcHAnKTtcbiAgXHR2YXIgUm91dGVyID0gcmVxdWlyZSgnLi9yb3V0ZXJzL3JvdXRlcicpO1xuICBcdHZhciBUaGVzYXVydXMgPSByZXF1aXJlKCcuL21vZGVscy90aGVzYXVydXMnKTtcbiAgICBcbiAgICAvL2NyZWF0ZSB0aGUgY29sbGVjdGlvbiBvZiBjb25jZXB0cyBcbiAgICB0aGlzLmNvbGxlY3Rpb24gPSBuZXcgVGhlc2F1cnVzKCk7XG4gICAgXG4gICAgLy9jcmVhdGUgdGhlIGFwcCB2aWV3LCB3aXRoIGEgcmVmZXJlbmNlIHRvIHRoZSBjb2xsZWN0aW9uIGFuZCB0aGlzIGFwcGxpY2F0aW9uXG4gICAgdGhpcy5hcHBWaWV3ID0gbmV3IEFwcFZpZXcoe2NvbGxlY3Rpb24gOiB0aGlzLmNvbGxlY3Rpb24sIGF0dHJpYnV0ZXMgOiB7IGFwcGxpY2F0aW9uOiB0aGlzIH19KTtcbiAgICBcbiAgICAvL2NyZWF0ZSB0aGUgcm91dGVyLCB3aXRoIGEgcmVmZXJlbmNlIHRvIHRoZSBjb2xsZWN0aW9uIGFuZCB0aGlzIGFwcGxpY2F0aW9uXG4gICAgdGhpcy5yb3V0ZXIgPSBuZXcgUm91dGVyKHtjb2xsZWN0aW9uIDogdGhpcy5jb2xsZWN0aW9uLCBhdHRyaWJ1dGVzIDogeyBhcHBsaWNhdGlvbjogdGhpcyB9fSk7XG4gIFxuICB9LFxuXG4gIC8vZm9uY3Rpb24gdG8gaGFuZGxlIHRoZSBkaWZmZXJlbnQga2luZHMgb2YgVVJMc1xuICAvL25vdGUgOiBiYWNrYm9uZSBzZW5kcyB0byB0aGUgcm91dGVyIG9ubHkgdGhlIHBhcnQgb2YgdGhlIFVSTCB0aGF0IGNvbWVzIGFmdGVyIHRoZSBkb21haW4gXG4gIC8vZXggMVxuICAvL3RoZSBVUkwgaXMgXCJodHRwOi8vd3d3Lm1pbW8tZGIuZXUvdXJpPWh0dHA6Ly93d3cubWltby1kYi5ldS9JbnN0cnVtZW50c0tleXdvcmRzLzMzMDVcIlxuICAvL3RoZSBwYXRoIGlzIFwidXJpPWh0dHA6Ly93d3cubWltby1kYi5ldS9JbnN0cnVtZW50c0tleXdvcmRzLzMzMDVcIlxuICAvL2V4IDJcbiAgLy90aGUgVVJMIGlzIFwiaHR0cDovL2xvY2FsaG9zdDozMzMzL3VyaT1odHRwOi8vd3d3Lm1pbW8tZGIuZXUvSW5zdHJ1bWVudHNLZXl3b3Jkcy8zMzA1XCJcbiAgLy90aGUgcGF0aCBpcyBcInVyaT1odHRwOi8vd3d3Lm1pbW8tZGIuZXUvSW5zdHJ1bWVudHNLZXl3b3Jkcy8zMzA1XCJcbiAgLy9leCAzXG4gIC8vdGhlIFVSTCBpcyBcImh0dHA6Ly93d3cubWltby1kYi5ldS9JbnN0cnVtZW50c0tleXdvcmRzLzMzMDVcIlxuICAvL3RoZSBwYXRoIGlzIFwiSW5zdHJ1bWVudHNLZXl3b3Jkcy8zMzA1XCJcbiAgLy9leCA0XG4gIC8vdGhlIFVSTCBpcyBcImh0dHA6Ly9sb2NhbGhvc3Q6MzMzMy9odHRwOi8vd3d3Lm1pbW8tZGIuZXUvSW5zdHJ1bWVudHNLZXl3b3Jkcy8zMzA1XCJcbiAgLy90aGUgcGF0aCBpcyBcImh0dHA6Ly93d3cubWltby1kYi5ldS9JbnN0cnVtZW50c0tleXdvcmRzLzMzMDVcIlxuICBwcm9jZXNzVXJpIDogZnVuY3Rpb24gcHJvY2Vzc1VyaUFwcGxpY2F0aW9uKHBhdGgpe1xuICAgIC8vaWYgdGhlIHBhdGggaXMgdGhlIHNhbWUgYXMgdGhlIGxvY2F0aW9uIChleCAxKVxuICAgIGlmKHBhdGguc2VhcmNoKGxvY2F0aW9uLm9yaWdpbikgIT09IC0xKXtcbiAgICAgIC8vcmVwbGFjZSBpdCB3aXRoIGV4YW1wbGUgMywgbW9yZSB1c2VyIGZyaWVuZGx5XG4gICAgICByZXR1cm4gcGF0aC5yZXBsYWNlKGxvY2F0aW9uLm9yaWdpbiwgXCJcIik7XG4gICAgLy9lbHNlIGlmIHRoZSBwYXRoIGlzIG5vdCB0aGUgc2FtZSBhcyB0aGUgbG9jYXRpb25cbiAgICB9ZWxzZSB7XG4gICAgICAvL2lmIHRoZSBwYXRoIGRvZXMgbm90IGNvbnRhaW4gdXJpPSwgYWRkIGl0XG4gICAgICBpZihwYXRoLnNlYXJjaChcInVyaT1odHRwXCIpID09PSAtMSl7XG4gICAgICAgIHJldHVybiBwYXRoLnJlcGxhY2UoXCJodHRwXCIsIFwidXJpPWh0dHBcIik7XG4gICAgICAvL3Bhc3Mgb24gdGhlIHBhdGhcbiAgICAgIH1lbHNle1xuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwbGljYXRpb247IiwibW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG4gIC8vIERlZmF1bHRcbiAgZGVmYXVsdHM6IHtcbiAgICBjb25jZXB0IDogdHJ1ZVxuICB9LFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIGluaXRpYWxpemVDb25jZXB0KCl7XG4gICAgXG4gICAgLy9oYW5kbGViYXJzIGhhcyB0cm91YmxlIHdpdGggcHJvcGVydGllcyBjb250YWluaW5nIEBcbiAgICAvL3NldHMgXCJjbGVhblwiIHByb3BlcnRpZXNcbiAgXHR0aGlzLnNldCgndXJpJywgdGhpcy5hdHRyaWJ1dGVzW1wiQGlkXCJdKTtcbiAgICB0aGlzLnNldCgndHlwZScsIHRoaXMuYXR0cmlidXRlc1tcIkB0eXBlXCJdKTtcbiAgXHRcbiAgICAvL2dlbmVyYXRlcyBhbiBpZCB0aGF0IGNhbiBiZSB1c2VkIGluIGNsYXNzZXMgYXR0YWNoZWQgdG8gaHRtbCBlbGVtZW50cyAod2l0aG91dCBodHRwOi8vIGFuZCAvKVxuICAgIHZhciB1cmxQYXJ0cyA9IHRoaXMuYXR0cmlidXRlc1tcIkBpZFwiXS5zcGxpdChcIi9cIikuam9pbihcIlwiKTtcbiAgICB0aGlzLnNldCgnaWQnLCB1cmxQYXJ0cy5zdWJzdHJpbmcoKHVybFBhcnRzLmxlbmd0aCAtMTApLCB1cmxQYXJ0cy5sZW5ndGgpKTtcbiAgICBcbiAgICAvL2NvbmNlcHRTY2hlbWUgKHdldGhlciBpdCdzIGEgdG9wIGNvbmNlcHQgb3Igbm90KVxuICAgIGlmKHRoaXMuYXR0cmlidXRlc1tcInNrb3M6aW5TY2hlbWVcIl0pe1xuICAgICAgdGhpcy5zZXQoJ2NvbmNlcHRTY2hlbWUnLCB0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmluU2NoZW1lXCJdKTtcbiAgICB9ZWxzZSBpZih0aGlzLmF0dHJpYnV0ZXNbXCJza29zOnRvcENvbmNlcHRPZlwiXSl7XG4gICAgICB0aGlzLnNldCgnY29uY2VwdFNjaGVtZScsIHRoaXMuYXR0cmlidXRlc1tcInNrb3M6dG9wQ29uY2VwdE9mXCJdKTtcbiAgICB9XG4gICAgdmFyIHNjaGVtZSA9IHRoaXMuY29sbGVjdGlvbi5nZXRBY3RpdmVUaGVzYXVydXMoKS5uYW1lO1xuICAgIHRoaXMuc2V0KCdjb25jZXB0U2NoZW1lTmFtZScsIHNjaGVtZS5uYW1lKTtcbiAgICB0aGlzLnNldCgnY29uY2VwdFNjaGVtZUNsYXNzJywgc2NoZW1lLmNsYXNzKTtcbiAgICBcbiAgICAvL3ByZWZlcmVkIGxhYmVsc1xuICAgIGlmKHRoaXMuYXR0cmlidXRlc1tcInNrb3M6cHJlZkxhYmVsXCJdKXtcbiAgICAgIHRoaXMuc2V0KCdwcmVmTGFiZWwnLCBBcnJheS5pc0FycmF5KHRoaXMuYXR0cmlidXRlc1tcInNrb3M6cHJlZkxhYmVsXCJdKT8gXy5zb3J0QnkodGhpcy5hdHRyaWJ1dGVzW1wic2tvczpwcmVmTGFiZWxcIl0sIHRoaXMuc29ydEJ5TGFuZ3VhZ2UpIDogW3RoaXMuYXR0cmlidXRlc1tcInNrb3M6cHJlZkxhYmVsXCJdXSApO1xuICAgIH1cblxuICAgIC8vYWx0ZXJuYXRlIGxhYmVsc1xuICAgIGlmKHRoaXMuYXR0cmlidXRlc1tcInNrb3M6YWx0TGFiZWxcIl0pe1xuICAgICAgdGhpcy5zZXQoJ2FsdExhYmVsJywgQXJyYXkuaXNBcnJheSh0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmFsdExhYmVsXCJdKSA/IF8uc29ydEJ5KHRoaXMuYXR0cmlidXRlc1tcInNrb3M6YWx0TGFiZWxcIl0sIHRoaXMuc29ydEJ5TGFuZ3VhZ2UpIDogW3RoaXMuYXR0cmlidXRlc1tcInNrb3M6YWx0TGFiZWxcIl1dICk7XG4gICAgfVxuXG4gICAgLy9wYXJlbnRcbiAgICBpZih0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmhhc1RvcENvbmNlcHRcIl0pe1xuICAgICAgaWYoQXJyYXkuaXNBcnJheSh0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmhhc1RvcENvbmNlcHRcIl0pKXtcbiAgICAgICAgdGhpcy5zZXQoJ2hhc1RvcENvbmNlcHQnLCB0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmhhc1RvcENvbmNlcHRcIl0ubWFwKGZ1bmN0aW9uKGVsdCl7IHJldHVybiBlbHRbXCJAaWRcIl07fSkpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuc2V0KCdoYXNUb3BDb25jZXB0JywgdGhpcy5hdHRyaWJ1dGVzW1wic2tvczpoYXNUb3BDb25jZXB0XCJdW1wiQGlkXCJdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy9jaGlsZHJlblxuICAgIGlmKHRoaXMuYXR0cmlidXRlc1tcInNrb3M6bmFycm93ZXJcIl0pe1xuICAgICAgdGhpcy5zZXQoJ25hcnJvd2VyJywgQXJyYXkuaXNBcnJheSh0aGlzLmF0dHJpYnV0ZXNbXCJza29zOm5hcnJvd2VyXCJdKT8gdGhpcy5hdHRyaWJ1dGVzW1wic2tvczpuYXJyb3dlclwiXSA6IFt0aGlzLmF0dHJpYnV0ZXNbXCJza29zOm5hcnJvd2VyXCJdXSk7XG4gICAgfVxuXG4gICAgLy9tYXRjaGVzXG4gICAgaWYodGhpcy5hdHRyaWJ1dGVzW1wic2tvczpleGFjdE1hdGNoXCJdKXtcbiAgICAgIHRoaXMuc2V0KCdleGFjdE1hdGNoJywgQXJyYXkuaXNBcnJheSh0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmV4YWN0TWF0Y2hcIl0pID8gdGhpcy5hdHRyaWJ1dGVzW1wic2tvczpleGFjdE1hdGNoXCJdIDogW3RoaXMuYXR0cmlidXRlc1tcInNrb3M6ZXhhY3RNYXRjaFwiXV0pO1xuICAgIH1cbiAgICBpZih0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmNsb3NlTWF0Y2hcIl0gKXtcbiAgICAgIHRoaXMuc2V0KCdjbG9zZU1hdGNoJywgQXJyYXkuaXNBcnJheSh0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmNsb3NlTWF0Y2hcIl0pID8gdGhpcy5hdHRyaWJ1dGVzW1wic2tvczpjbG9zZU1hdGNoXCJdIDogW3RoaXMuYXR0cmlidXRlc1tcInNrb3M6Y2xvc2VNYXRjaFwiXV0pO1xuICAgIH1cbiAgICBcbiAgfSxcbiAgLy9yZXR1cm5zIHByZXZpb3VzIG9yIG5leHQgY29uY2VwdCBpbiB0aGUgY29sbGVjdGlvblxuICBnZXRSZWxhdGl2ZTogZnVuY3Rpb24gZ2V0UmVsYXRpdmVDb25jZXB0KGRpcmVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24uYXQodGhpcy5jb2xsZWN0aW9uLmluZGV4T2YodGhpcykgKyBkaXJlY3Rpb24pO1xuICB9LFxuICAvL3NvcnQgYnkgbGFuZ3VhZ2UgKGFscGhhYmV0aWNhbCBvcmRlcilcbiAgc29ydEJ5TGFuZ3VhZ2UgOiBmdW5jdGlvbiBzb3J0QnlMYW5ndWFnZUNvbmNlcHQoZWx0KXtcbiAgICBpZihlbHRbXCJAbGFuZ3VhZ2VcIl0pe1xuICAgICAgc3dpdGNoKGVsdFtcIkBsYW5ndWFnZVwiXSl7XG4gICAgICAgIGNhc2UgXCJjYVwiIDpcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgY2FzZSBcImRlXCIgOlxuICAgICAgICAgIHJldHVybiAyO1xuICAgICAgICBjYXNlIFwiZW5cIiA6XG4gICAgICAgICAgcmV0dXJuIDM7XG4gICAgICAgIGNhc2UgXCJmclwiIDpcbiAgICAgICAgICByZXR1cm4gNDtcbiAgICAgICAgY2FzZSBcIml0XCIgOlxuICAgICAgICAgIHJldHVybiA1O1xuICAgICAgICBjYXNlIFwibmxcIiA6XG4gICAgICAgICAgcmV0dXJuIDY7XG4gICAgICAgIGNhc2UgXCJzdlwiIDpcbiAgICAgICAgICByZXR1cm4gNztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cbn0pOyIsInZhciBqc29ubGQgPSByZXF1aXJlKCdqc29ubGQnKTtcbnZhciBjb25jZXB0ID0gcmVxdWlyZSgnLi9jb25jZXB0Jyk7XG52YXIgYXBwbGljYXRpb24gPSByZXF1aXJlKCcuLi9hcHBsaWNhdGlvbicpO1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gIFxuICAvL2RlZmF1bHQgcHJvcGVydGllc1xuICAvL1dhcm5pbmcgOiB0aGV5IGFyZSByZXNldCB3aGVuIGFsbCBjb25jZXB0cyBpbiB0aGUgY29sbGVjdGlvbiBhcmUgcmVzZXQsIFxuICAvL25vdCB3aGVuIHNvbWUgYXJlIGFkZGVkIG9yIHJlbW92ZWQgXG5cbiAgbW9kZWw6IGNvbmNlcHQsXG4gIGxvYWRlZDogZmFsc2UsXG4gIGFjdGl2ZVVSSSA6IG51bGwsXG4gIGFjdGl2ZVRoZXNhdXJ1cyA6IG51bGwsXG4gIHRoZXNhdXJ1c0xvYWRpbmcgOiBudWxsLFxuICBjb21wYXJhdG9yOiAncmFuaycsXG4gIHRoZXNhdXJpIDogW1xuICAgIHsnaWQnIDogJ2h0dHA6Ly93d3cubWltby1kYi5ldS9JbnN0cnVtZW50c0tleXdvcmRzJywgJ25hbWVkX2lkJzogJ0luc3RydW1lbnRzS2V5d29yZHMnLCAncGF0dGVybicgOiAnaHR0cDovL3d3dy5taW1vLWRiLmV1L0luc3RydW1lbnRzS2V5d29yZHMnLCAnZW5kcG9pbnQnIDogJ2h0dHA6Ly9kYXRhLm1pbW8tZGIuZXU6OTA5MS9zcGFycWwvZGVzY3JpYmU/dXJpPScsICdkYXRhJzogJ2h0dHA6Ly93d3cubWltby1kYi5ldS9kYXRhL0luc3RydW1lbnRzS2V5d29yZHMuanNvbicsICdiYXNlJzogJ2h0dHA6Ly93d3cubWltby1kYi5ldS8nLCAnbmFtZScgOiAnTUlNTyBUaGVzYXVydXMnfSxcbiAgICB7J2lkJyA6ICdodHRwOi8vd3d3Lm1pbW8tZGIuZXUvSG9ybmJvc3RlbEFuZFNhY2hzJywgJ25hbWVkX2lkJzogJ0hvcm5ib3N0ZWxBbmRTYWNocycsICdwYXR0ZXJuJyA6ICdodHRwOi8vd3d3Lm1pbW8tZGIuZXUvSG9ybmJvc3RlbEFuZFNhY2hzJywgJ2VuZHBvaW50JyA6ICdodHRwOi8vZGF0YS5taW1vLWRiLmV1OjkwOTEvc3BhcnFsL2Rlc2NyaWJlP3VyaT0nLCAnZGF0YSc6ICdodHRwOi8vd3d3Lm1pbW8tZGIuZXUvZGF0YS9Ib3JuYm9zdGVsQW5kU2FjaHMuanNvbicsICdiYXNlJzogJ2h0dHA6Ly93d3cubWltby1kYi5ldS8nLCAnbmFtZSc6ICdTYWNocyAmIEhvcm5ib3N0ZWwgY2xhc3NpZmljYXRpb24nfVxuICBdLFxuICB2aWV3VHlwZXMgOiBbeyAnaWQnIDogMSwgJ25hbWUnIDogJ2NpcmN1bGFyIHRyZWUnfSx7ICdpZCcgOiAyLCAnbmFtZScgOiAndHJlZSd9XSxcbiAgY29uY2VwdENsb3NlZCA6IGZhbHNlLFxuICBjb250ZXh0IDoge1xuICAgIFwic2tvc1wiOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDQvMDIvc2tvcy9jb3JlI1wiLFxuICAgIFwic2tvczpDb25jZXB0XCI6IHtcIkB0eXBlXCI6IFwiQGlkXCJ9LFxuICAgIFwic2tvczppblNjaGVtZVwiOiB7XCJAdHlwZVwiOiBcIkBpZFwifSxcbiAgICBcInNrb3M6bmFycm93ZXJcIjoge1wiQHR5cGVcIjogXCJAaWRcIn0sXG4gICAgXCJza29zOmV4YWN0TWF0Y2hcIjoge1wiQHR5cGVcIjogXCJAaWRcIn0sXG4gICAgXCJza29zOmJyb2FkZXJcIjoge1wiQHR5cGVcIjogXCJAaWRcIn0sXG4gICAgXCJza29zOmNsb3NlTWF0Y2hcIjoge1wiQHR5cGVcIjogXCJAaWRcIn0sXG4gICAgXCJza29zOnRvcENvbmNlcHRPZlwiOiB7XCJAdHlwZVwiOiBcIkBpZFwifVxuICB9LFxuXG4gIGluaXRpYWxpemUgOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpe1xuICB9LFxuXG4gIC8vcmV0dXJuIHRoZSBhY3RpdmUgY29uY2VwdFxuICBnZXRBY3RpdmVDb25jZXB0IDogZnVuY3Rpb24gZ2V0QWN0aXZlQ29uY2VwdFRoZXNhdXJ1cygpe1xuICAgIHZhciB0aGVjb25jZXB0ID0gdGhpcy5tb2RlbHMuZmlsdGVyKGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgcmV0dXJuIGVsZW1lbnQuYXR0cmlidXRlcy51cmkgPT09IHRoaXMuYWN0aXZlVVJJO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gICAgcmV0dXJuIHRoZWNvbmNlcHRbMF0gfHwgbnVsbDtcbiAgfSxcblxuICAvL3JldHVybiB0aGUgYWN0aXZlIHRoZXNhdXJ1c1xuICBnZXRBY3RpdmVUaGVzYXVydXMgOiBmdW5jdGlvbiBnZXRBY3RpdmVUaGVzYXVydXMoKXtcbiAgICB2YXIgdGhlc2F1cnVzID0gdGhpcy5hY3RpdmVUaGVzYXVydXMgfHwgdGhpcy50aGVzYXVydXNMb2FkaW5nO1xuICAgIC8vY29uc29sZS5sb2codGhlc2F1cnVzLCB0aGlzLmFjdGl2ZVRoZXNhdXJ1cywgdGhpcy50aGVzYXVydXNMb2FkaW5nKTtcbiAgICB0aGVzYXVydXMucHJlZkxhYmVsID0gW3RoZXNhdXJ1cy5uYW1lXTtcbiAgICB0aGVzYXVydXMudHlwZSA9ICBcInNrb3M6Q29uY2VwdFNjaGVtZVwiO1xuICAgIHRoZXNhdXJ1cy51cmkgPSB0aGVzYXVydXMuaWQ7XG4gICAgcmV0dXJuIHRoZXNhdXJ1cztcbiAgfSxcblxuICAvL2dldCB0aGVzYXVyaSAoYW5kIHdoaWNoIG9uZSBpcyBzZWxlY3RlZClcbiAgZ2V0VGhlc2F1cmkgOiBmdW5jdGlvbiBnZXRUaGVzYXVyaVRoZXNhdXJ1cygpe1xuICAgIHZhciB0aGVzYXVydXMgPSB0aGlzLmdldEFjdGl2ZVRoZXNhdXJ1cygpO1xuICAgIHRoaXMudGhlc2F1cmkuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCwgaW5kZXgpIHtcbiAgICAgIGlmKHRoZXNhdXJ1cyAmJiBlbGVtZW50LmlkID09PSB0aGVzYXVydXMuaWQpIHtcbiAgICAgICAgZWxlbWVudC5zZWxlY3RlZCA9IHRydWU7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgZWxlbWVudC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnRoZXNhdXJpO1xuICB9LFxuXG5cbiAgLy9zZXQgc2VsZWN0ZWQgdGhlc2F1cnVzXG4gIHNldEFjdGl2ZVRoZXNhdXJ1cyA6IGZ1bmN0aW9uIHNldEFjdGl2ZVRoZXNhdXJ1cyh0aGVzYXVydXMpe1xuICAgICAgdGhpcy5hY3RpdmVUaGVzYXVydXMgPSB0aGVzYXVydXM7XG4gIH0sXG4gIC8vZ2V0IHRoZXNhdXJ1cyB3aXRoIG5hbWVkIGlkXG4gIGdldFRoZXNhdXJ1c1dpdGhOYW1lZElkIDogZnVuY3Rpb24gZ2V0VGhlc2F1cnVzV2l0aE5hbWVkSWQobmFtZWRfaWQpe1xuICAgIHJldHVybiBfLmZpbmRXaGVyZSh0aGlzLnRoZXNhdXJpLCB7J25hbWVkX2lkJyA6IG5hbWVkX2lkfSk7XG4gIH0sXG5cbiAgLy9nZXQgYXZhaWxhYmxlIGtpbmRzIG9mIG5hdiAoYW5kIHdoaWNoIG9uZSBpcyBzZWxlY3RlZClcbiAgZ2V0Vmlld1R5cGVzIDogZnVuY3Rpb24gZ2V0Vmlld1R5cGVzVGhlc2F1cnVzKCl7XG4gICAgdmFyIHZpZXdUeXBlID0gdGhpcy5nZXRWaWV3VHlwZSgpO1xuICAgIHRoaXMudmlld1R5cGVzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQsIGluZGV4KSB7XG4gICAgICBpZihlbGVtZW50LmlkID09PSB2aWV3VHlwZSkge1xuICAgICAgICBlbGVtZW50LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgIH1lbHNle1xuICAgICAgICBlbGVtZW50LnNlbGVjdGVkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMudmlld1R5cGVzO1xuICB9LFxuXG4gIC8vc2V0IHRoZSBraW5kIG9mIG5hdiBzZWxlY3RlZFxuICBzZXRWaWV3VHlwZSA6IGZ1bmN0aW9uIHNldFZpZXdUeXBlVGhlc2F1cnVzKHR5cGUpe1xuICAgIGNvbnNvbGUubG9nKFwidmlld1R5cGVcIiwgdGhpcy5nZXRWaWV3VHlwZSgpLCBOdW1iZXIoc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShcInZpZXdUeXBlXCIpKSwgdHlwZSwgTnVtYmVyKHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oXCJ2aWV3VHlwZVwiKSk9PT0gdHlwZSApO1xuICAgIHZhciBvbGR0eXBlID0gdGhpcy5nZXRWaWV3VHlwZSgpO1xuICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oXCJ2aWV3VHlwZVwiLCB0eXBlKTtcbiAgICBpZiggb2xkdHlwZSAhPT0gdHlwZSl7XG4gICAgICBcbiAgICAgIHRoaXMudHJpZ2dlcihcInZpZXdUeXBlQ2hhbmdlZFwiLCB0aGlzKTtcbiAgICB9XG4gICAgXG4gIH0sXG5cbiAgLy9nZXQgdGhlIGtpbmQgb2YgbmF2IHNlbGVjdGVkXG4gIGdldFZpZXdUeXBlIDogZnVuY3Rpb24gZ2V0Vmlld1R5cGVUaGVzYXVydXMoKXtcbiAgICB2YXIgdmlld1R5cGUgPSBOdW1iZXIoc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShcInZpZXdUeXBlXCIpKSB8fCAxO1xuICAgIHJldHVybiB2aWV3VHlwZTtcbiAgfSxcblxuICAvL2NoZWNrcyBpZiBhIFVSSSBjb3JyZXNwb25kcyB0byBhbnkgb2YgdGhlIFRoZXNhdXJpIGF2YWlsYWJsZSBpbiBzZXR0aW5nc1xuICBtYXRjaEFueVRoZXNhdXJ1cyA6IGZ1bmN0aW9uIG1hdGNoQW55VGhlc2F1cnVzKHVyaSl7XG4gICAgZm9yKHZhciBpID0gMDsgaTwgdGhpcy50aGVzYXVyaS5sZW5ndGg7IGkrKyl7XG4gICAgICB2YXIgdGhlc2F1cnVzID0gdGhpcy50aGVzYXVyaVtpXTtcbiAgICAgIGlmKHRoaXMubWF0Y2hQYXR0ZXJuKHRoZXNhdXJ1cy5wYXR0ZXJuLCB1cmkpKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8vY2hlY2tzIGlmIGEgVVJJIG1hdGNoZXMgYSBwYXR0ZXJuXG4gIG1hdGNoUGF0dGVybiA6IGZ1bmN0aW9uIG1hdGNoUGF0dGVyblRoZXNhdXJ1cyhwYXR0ZXJuLCB1cmkpe1xuICAgICB2YXIgbXlSZWdFeHAgPSBuZXcgUmVnRXhwKFwiXlwiICsgcGF0dGVybiArIFwiKFtcXFxcd1xcXFwvXFxcXC5dKilcIiwgXCJnXCIpO1xuICAgICByZXR1cm4gKHVyaS5tYXRjaChteVJlZ0V4cCkgIT09IG51bGwpPyB0cnVlOiBmYWxzZTtcbiAgfSxcblxuICAvL3NlbGVjdGVkIFVSSSBzZW50IGJ5IHRoZSByb3V0ZXJcbiAgc2V0QWN0aXZlVVJJIDogZnVuY3Rpb24gc2V0QWN0aXZlVVJJVGhlc2F1cnVzKHVyaSl7XG5cbiAgICAvL2lmIHRoZSBVUkkgaXMgbm90IGNvbXBsZXRlIChjZiBhcHBsaWNhdGlvbi5qcywgZXggMyksIGFkZHMgZG9tYWluXG4gICAgaWYodXJpLnNlYXJjaChcImh0dHBcIikgPT09IC0xKSB1cmkgPSBsb2NhdGlvbi5vcmlnaW4gKyBcIi9cIiArIHVyaTtcbiAgICBcbiAgICAvL3RoZSBVUkkgaXMgYSB0aGVzYXVydXMgKHRydWUpIG9yIGEgY29uY2VwdCAoZmFsc2UpXG4gICAgdmFyIGlzRnVsbFRoZXNhdXJ1cztcbiAgICAvL2luIGJvdGggY2FzZXMgZmluZHMgd2hpY2ggdGhlc2F1cnVzXG4gICAgdmFyIHdoaWNoVGhlc2F1cnVzID0gdGhpcy50aGVzYXVyaS5maWx0ZXIoZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICB2YXIgbXlSZWdFeHAgPSBuZXcgUmVnRXhwKFwiXlwiICsgZWxlbWVudC5wYXR0ZXJuICsgXCIoW1xcXFx3XFxcXC9cXFxcLl0qKVwiLCBcImdcIik7XG4gICAgICBpZiAoZWxlbWVudC5pZCA9PT0gdXJpKSB7XG4gICAgICAgIGlzRnVsbFRoZXNhdXJ1cyA9IHRydWU7XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgICAgfWVsc2UgaWYodGhpcy5tYXRjaFBhdHRlcm4oZWxlbWVudC5wYXR0ZXJuLCB1cmkpKXtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIGlmKHdoaWNoVGhlc2F1cnVzLmxlbmd0aD4wKXtcbiAgICAgIGlmKGlzRnVsbFRoZXNhdXJ1cyl7XG4gICAgICAgIC8vaXMgdXJpIG9uZSBvZiB0aGUgdGhlc2F1cmkgPyBsb2FkIGl0ICFcbiAgICAgICAgdGhpcy5hY3RpdmVVUkkgPSB1cmk7XG4gICAgICAgIGlmKHRoaXMuYWN0aXZlVGhlc2F1cnVzID09PSBudWxsIHx8IHRoaXMuYWN0aXZlVGhlc2F1cnVzLmlkICE9PSB3aGljaFRoZXNhdXJ1c1swXS5pZCl7XG4gICAgICAgICAgXG5cbiAgICAgICAgICB0aGlzLmxvYWRUaGVzYXVydXMod2hpY2hUaGVzYXVydXNbMF0ubmFtZWRfaWQpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJjb25jZXB0Q2hhbmdlZFwiLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfWVsc2V7XG4gICAgICAgIC8vZWxzZSBpZiBVUkkgaXMgYSBjb25jZXB0LCBsb2FkIGl0IGZpcnN0IChiZWZvcmUgbG9hZGluZyBmdWxsIG5hdikgIFxuICAgICAgICB0aGlzLmxvYWRVUkkodXJpLCB3aGljaFRoZXNhdXJ1c1swXSk7XG4gICAgICB9XG4gICAgfWVsc2V7XG5cbiAgICAgIC8vaWYgVVJJIG1hdGNoZXMgbm90aGluZywgdGhlbiBsb2FkIGZpcnN0IHRoZXNhdXJ1cyBpbiB0aGUgc2V0dGluZ3NcbiAgICAgIHRoaXMubG9hZFRoZXNhdXJ1cyh0aGlzLnRoZXNhdXJpWzBdLm5hbWVkX2lkKTtcbiAgICB9ICAgIFxuICB9LFxuXG4gIC8vbG9hZCBhIHNpbmdsZSBVUklcbiAgbG9hZFVSSSA6IGZ1bmN0aW9uIGxvYWRVUklUaGVzYXVydXModXJpLCB0aGVzYXVydXMpe1xuICAgIC8vaWYgaXQgaXMgbm90IGFscmVhZHkgdGhlIGN1cnJlbnQgb25lXG4gICAgaWYodXJpICE9IHRoaXMuYWN0aXZlVVJJKXtcbiAgICAgIHRoaXMuYWN0aXZlVVJJID0gdXJpO1xuICAgICAgdGhpcy50cmlnZ2VyKFwiY29uY2VwdENoYW5nZWRcIiwgdGhpcyk7XG5cbiAgICAgIGlmKHRoaXMuYWN0aXZlVGhlc2F1cnVzID09PSBudWxsIHx8IHRoaXMuYWN0aXZlVGhlc2F1cnVzLmlkICE9PSB0aGVzYXVydXMuaWQpe1xuICBcbiAgICAgICAgdGhpcy50aGVzYXVydXNMb2FkaW5nID0gdGhlc2F1cnVzO1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJjb25jZXB0Q2hhbmdlZFwiLCB0aGlzKTtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAndXJsJzogdGhlc2F1cnVzLmVuZHBvaW50ICsgdXJpLFxuICAgICAgICAgICdoZWFkZXJzJzogeydBY2NlcHQnIDogJ2FwcGxpY2F0aW9uL2xkK2pzb24nfSxcbiAgICAgICAgICAnZGF0YVR5cGUnOiAnanNvbicsXG4gICAgICAgICAgJ2NvbnRleHQnOiB0aGlzXG4gICAgICAgIH0pLmRvbmUoZnVuY3Rpb24oY29sbGVjdGlvbil7XG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBfLndoZXJlKGNvbGxlY3Rpb24sIHsnQGlkJzogdXJpfSk7XG4gICAgICAgICAgLy9jb21wYWN0cyBqc29uLWxkICh0byBhdm9pZCBkZWVwIG9iamVjdHMgdGhhdCBhcmUgY29tcGxpY2F0ZWQgdG8gaGFuZGxlIGFuZCBzb3J0KVxuICAgICAgICAgIGpzb25sZC5jb21wYWN0KGNvbGxlY3Rpb24sIHRoaXMuY29udGV4dCwgZnVuY3Rpb24oZXJyLCBjb21wYWN0ZWQpIHtcbiAgICAgICAgICAgIC8vYnVpbGQgdGhlIHRyZWVcbiAgICAgICAgICAgIHRoaXMucHJlcGFyZURhdGEoW2NvbXBhY3RlZF0pO1xuICAgICAgICAgICAgLy9pbmZvcm0gbGlzdGVuZXJzXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJjb25jZXB0Q2hhbmdlZFwiLCB0aGlzKTtcbiAgICAgICAgICAgIC8vbG9hZCBmdWxsIHRoZXNhdXJ1cyBmb3IgbmF2XG4gICAgICAgICAgICB0aGlzLmxvYWRUaGVzYXVydXModGhlc2F1cnVzLm5hbWVkX2lkKTtcbiAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAvL2lmIGxvYWRpbmcgdXJpIGZhaWxzLCBsb2FkIGZ1bGwgdGhlc2F1cnVzXG4gICAgICAgICAgdGhpcy5sb2FkVGhlc2F1cnVzKHRoZXNhdXJ1cy5uYW1lZF9pZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvL2xvYWRzIHRoZXNhdXJ1c1xuICBsb2FkVGhlc2F1cnVzIDogZnVuY3Rpb24gbG9hZFRoZXNhdXJ1cyhuYW1lZF9pZCl7XG4gICAgLy9jYWxsYmFjayBvbmNlIGxvYWRlZFxuICAgIHZhciB0aGVzYXVydXMgPSB0aGlzLmdldFRoZXNhdXJ1c1dpdGhOYW1lZElkKG5hbWVkX2lkKTtcbiAgICB0aGlzLnRoZXNhdXJ1c0xvYWRpbmcgPSB0aGVzYXVydXM7XG5cbiAgICB2YXIgbG9hZGluZ0NvbXBsZXRlZCAgPSBmdW5jdGlvbiAoY29sbGVjdGlvbil7XG4gICAgICAvL2NvbXBhY3RzIGpzb24tbGQgKHRvIGF2b2lkIGRlZXAgb2JqZWN0cyB0aGF0IGFyZSBjb21wbGljYXRlZCB0byBoYW5kbGUgYW5kIHNvcnQpXG4gICAgICBqc29ubGQuY29tcGFjdChjb2xsZWN0aW9uLCB0aGlzLmNvbnRleHQsIGZ1bmN0aW9uKGVyciwgY29tcGFjdGVkKSB7IFxuICAgICAgICB0aGlzLnNldEFjdGl2ZVRoZXNhdXJ1cyh0aGVzYXVydXMpO1xuICAgICAgICAvL2luZm9ybSBsaXN0ZW5lcnNcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwibmF2Q2hhbmdlZFwiLCB0aGlzKTtcbiAgICAgICAgLy90aGlzLnRyaWdnZXIoXCJuYXZMb2FkZWRcIiwgdGhpcyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNvbmNlcHRDaGFuZ2VkXCIsIHRoaXMpO1xuICAgICAgICAvL2J1aWxkIHRoZSB0cmVlXG4gICAgICAgIHRoaXMucHJlcGFyZURhdGEoY29tcGFjdGVkW1wiQGdyYXBoXCJdKTtcbiAgICAgICAgLy9sb2FkaW5nIGNvbXBsZXRlZFxuICAgICAgICB0aGlzLmxvYWRlZCA9IHRydWU7XG4gICAgICAgIHRoaXMudGhlc2F1cnVzTG9hZGluZyA9IG51bGw7XG4gICAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgfVxuICAgIHRoaXMubG9hZGVkID0gZmFsc2U7XG5cbiAgICAkLmFqYXgoeyAgXG4gICAgICAndXJsJzogdGhlc2F1cnVzLmVuZHBvaW50ICsgdGhlc2F1cnVzLmlkICxcbiAgICAgICdoZWFkZXJzJzogeydBY2NlcHQnIDogJ2FwcGxpY2F0aW9uL2xkK2pzb24nfSxcbiAgICAgICdjb250ZXh0JzogdGhpcyxcbiAgICAgICdkYXRhVHlwZSc6ICdqc29uJyxcbiAgICAgICdjcm9zc0RvbWFpbicgOiB0cnVlXG4gICAgfSlcbiAgICAuZG9uZShsb2FkaW5nQ29tcGxldGVkKVxuICAgIC5mYWlsKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgIGNvbnNvbGUubG9nKFwiZXNzYWkgbsKwM1wiLCB0aGVzYXVydXMuZGF0YSlcbiAgICAgICQuYWpheCh7XG4gICAgICAgICd1cmwnOiB0aGVzYXVydXMuZGF0YSAsXG4gICAgICAgICdjb250ZXh0JzogdGhpcyxcbiAgICAgICAgJ2RhdGFUeXBlJzogJ2pzb24nLFxuICAgICAgICAnY3Jvc3NEb21haW4nIDogdHJ1ZVxuICAgICAgfSkuZG9uZShsb2FkaW5nQ29tcGxldGVkKVxuICAgICAgLmZhaWwoZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAvL2NvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgIH0pXG4gICAgfSk7XG4gICAgXG4gIH0sXG4gIFxuICAvL2dldCBuYW1lIG9mIGEgY29uY2VwdFxuICBnZXROYW1lIDogZnVuY3Rpb24gZ2V0TmFtZSAocHJlZkxhYmVscyl7XG4gICAgXG4gICAgaWYoIXByZWZMYWJlbHMpIHJldHVybiBcIlwiO1xuICAgIGlmKEFycmF5LmlzQXJyYXkocHJlZkxhYmVscykpe1xuICAgICAgdmFyIG5hbWUgPSBwcmVmTGFiZWxzLmZpbHRlcihmdW5jdGlvbihwcmVmTGFiZWwpe1xuICAgICAgICByZXR1cm4gdHlwZW9mIHByZWZMYWJlbCA9PT0gXCJzdHJpbmdcIjtcbiAgICAgIH0pO1xuICAgICAgaWYoQXJyYXkuaXNBcnJheShuYW1lKSl7XG4gICAgICAgIG5hbWUgPSBuYW1lWzBdO1xuICAgICAgfWVsc2V7XG4gICAgICAgIG5hbWUgPSBwcmVmTGFiZWxzWzBdW1wiQHZhbHVlXCJdO1xuICAgICAgfVxuICAgIH1lbHNlIGlmKHByZWZMYWJlbHNbXCJAdmFsdWVcIl0pe1xuICAgICAgdmFyIG5hbWUgPSBwcmVmTGFiZWxzW1wiQHZhbHVlXCJdO1xuICAgIH1lbHNle1xuICAgICAgdmFyIG5hbWUgPSBwcmVmTGFiZWxzO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZTtcblxuICB9LFxuXG4gIC8vZ2V0IGNoaWxkcmVuIGNvbmNlcHRzIG9mIGEgY29uY2VwdFxuICBnZXRDaGlsZHJlbiA6IGZ1bmN0aW9uIGdldENoaWxkcmVuKG5vZGUpe1xuICAgIFxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy5tb2RlbHMuZmlsdGVyKGZ1bmN0aW9uIChlbGVtZW50KXtcbiAgICAgIHJldHVybiBlbGVtZW50LmF0dHJpYnV0ZXNbXCJza29zOmJyb2FkZXJcIl0gPT09IG5vZGVbXCJAaWRcIl07XG5cbiAgICB9KS5tYXAoZnVuY3Rpb24gKGNoaWxkRWxlbWVudCl7XG4gICAgICB2YXIgbmFtZSA9IHRoYXQuZ2V0TmFtZShjaGlsZEVsZW1lbnQuYXR0cmlidXRlc1tcInNrb3M6cHJlZkxhYmVsXCJdKTtcbiAgICAgIHZhciBjaGlsZHJlbiA9IHRoYXQuZ2V0Q2hpbGRyZW4oY2hpbGRFbGVtZW50LmF0dHJpYnV0ZXMpO1xuICAgICAgdmFyIHJlc3VsdCA9IHtcIm5hbWVcIiA6IG5hbWUsIHVyaSA6IGNoaWxkRWxlbWVudC5hdHRyaWJ1dGVzW1wiQGlkXCJdLCBpZCA6IGNoaWxkRWxlbWVudC5hdHRyaWJ1dGVzW1wiaWRcIl19O1xuICAgICAgaWYoY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICAgICAgcmVzdWx0LnNpemUgPSBjaGlsZHJlbi5sZW5ndGg7XG4gICAgICB9ZWxzZXsgXG4gICAgICAgIHJlc3VsdC5zaXplID0gMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG5cbiAgfSxcblxuICAvL2dldCBwYXJlbnQgY29uY2VwdHMgb2YgYSBjb25jZXB0XG4gIGdldFBhcmVudCA6IGZ1bmN0aW9uIGdldFBhcmVudFRoZXNhdXJ1cyhub2RlSWQsIGRhdGEpe1xuICAgIFxuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIHZhciBlbGVtZW50ID0gZGF0YS5maWx0ZXIoZnVuY3Rpb24gKGVsZW1lbnQpe1xuICAgICAgcmV0dXJuIGVsZW1lbnRbXCJAaWRcIl0gPT09IG5vZGVJZDtcbiAgICB9KTtcbiAgICB2YXIgcGFyZW50ID0gbmV3IEFycmF5KCk7XG5cbiAgICBpZihlbGVtZW50LnBhcmVudHMpe1xuICAgICAgcmV0dXJuIGVsZW1lbnQucGFyZW50cztcbiAgICB9ZWxzZSBpZihlbGVtZW50W1wic2tvczpicm9hZGVyXCJdKSB7XG4gICAgICB2YXIgZ3JhbmRQYXJlbnQgPSAgdGhhdC5nZXRQYXJlbnQoZWxlbWVudFtcInNrb3M6YnJvYWRlclwiXSwgZGF0YSk7XG5cbiAgICAgIGlmKGdyYW5kUGFyZW50Lmxlbmd0aD4wKXtcbiAgICAgICAgcGFyZW50ID0gZ3JhbmRQYXJlbnQ7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHBhcmVudCA9IHBhcmVudC5jb25jYXQoW2VsZW1lbnRbXCJza29zOmJyb2FkZXJcIl1dKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmVudDsgICAgICBcbiAgICBcbiAgfSxcbiAgdG9nZ2xlQ29uY2VwdCA6IGZ1bmN0aW9uIHRvZ2dsZUNvbmNlcHRUaGVzYXVydXModmlzaWJsZSl7XG4gICAgaWYodmlzaWJsZSl7XG4gICAgICBpZih2aXNpYmxlID09PSB0cnVlKXtcbiAgICAgICAgdGhpcy5jb25jZXB0Q2xvc2VkID0gZmFsc2U7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5jb25jZXB0Q2xvc2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuY29uY2VwdENsb3NlZCA9ICF0aGlzLmNvbmNlcHRDbG9zZWQ7XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcihcImNvbmNlcHRUb2dnbGVkXCIpO1xuXG4gIH0sXG5cbiAgZmluZFJhbmsgOiBmdW5jdGlvbiBmaW5kUmFua1RoZXNhdXJ1cyAoZGF0YU9iail7XG4gICAgLy9naXZlcyBhIHJhbmsgcHJvcGVydHkgdG8gZWFjaCBjb25jZXB0IGFjY29yZGluZyB0byBpdHMgcGxhY2UgaW4gdGhlIHRyZWUgXG4gICAgLy90byBlbmFibGUgcHJldi9uZXh0IG5hdmlnYXRpb25cbiAgICBpZighZGF0YU9iaikgcmV0dXJuIGZhbHNlO1xuICAgIGZvcih2YXIgZWxlbWVudCBpbiBkYXRhT2JqKSB7XG4gICAgICB2YXIgdGhlbW9kZWwgPSBfLmZpbmRXaGVyZSh0aGlzLm1vZGVscywgZnVuY3Rpb24oZWx0KXtcbiAgICAgICAgZWx0LmF0dHJpYnV0ZXNbXCJAaWRcIl0gPT0gZWxlbWVudFtcIkBpZFwiXTtcbiAgICAgIH0pO1xuICAgICAgdGhlbW9kZWwuc2V0KFwicmFua1wiLCB0aGlzLmNvdW50ZXIpO1xuICAgICAgdGhpcy5jb3VudGVyICsrO1xuICAgICAgaWYgKGVsZW1lbnQuY2hpbGRyZW4pIHRoaXMuZmluZFJhbmsoZWxlbWVudC5jaGlsZHJlbik7XG4gICAgfTtcblxuICB9LFxuXG4gIC8vb25jZSB0aGUgZGF0YSBpcyBsb2FkZWQsIHByZXBhcmVzIGEgdHJlZSBmb3IgbmF2IHJlbmRlcmluZ1xuICBwcmVwYXJlRGF0YTogZnVuY3Rpb24gcHJlcGFyZURhdGFUaGVzYXVydXMoZGF0YSl7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy9hZGQgcGFyZW50IGhpZXJhcmNoeVxuICAgIHZhciBkYXRhID0gZGF0YS5tYXAoZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICB2YXIgcGFyZW50ID0gdGhhdC5nZXRQYXJlbnQoZWxlbWVudFtcIkBpZFwiXSwgZGF0YSk7XG4gICAgICBpZihwYXJlbnQubGVuZ3RoPjApe1xuICAgICAgICBlbGVtZW50LnBhcmVudHMgPSBwYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9KTtcblxuICAgIGlmKHRoaXMubW9kZWxzLmxlbmd0aCA9PT0gMSl7XG4gICAgICB0aGlzLmFkZChkYXRhKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMucmVzZXQoZGF0YSk7IFxuICAgIH1cblxuICAgIGlmKHRoaXMubW9kZWxzLmxlbmd0aD4xKXtcbiAgICAgIC8vY3JlYXRlcyBoaWVyYXJjaGljYWwgdHJlZSBmb3IgbmF2XG4gICAgICB2YXIgZmlsdGVyZWRUcmVlID0gdGhpcy5tb2RlbHMuZmlsdGVyKGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgICByZXR1cm4gZWxlbWVudC5hdHRyaWJ1dGVzW1wic2tvczp0b3BDb25jZXB0T2ZcIl0gIT09IHVuZGVmaW5lZDtcbiAgICAgIH0pLm1hcChmdW5jdGlvbiAoZWxlbWVudCl7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IHRoYXQuZ2V0Q2hpbGRyZW4oZWxlbWVudC5hdHRyaWJ1dGVzKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHsgXCJuYW1lXCIgOiB0aGF0LmdldE5hbWUoZWxlbWVudC5hdHRyaWJ1dGVzW1wic2tvczpwcmVmTGFiZWxcIl0pLCB1cmkgOiBlbGVtZW50LmF0dHJpYnV0ZXNbXCJAaWRcIl0sIGlkIDogZWxlbWVudC5hdHRyaWJ1dGVzW1wiaWRcIl19O1xuICAgICAgICBpZihjaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmVzdWx0LmNoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgICAgICAgcmVzdWx0LnNpemUgPSBjaGlsZHJlbi5sZW5ndGg7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIHJlc3VsdC5zaXplID0gMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBkYXRhVHJlZSA9IHtcIm5hbWVcIiA6IHRoaXMuZ2V0QWN0aXZlVGhlc2F1cnVzKCkubmFtZSB9O1xuICAgICAgZGF0YVRyZWUuY2hpbGRyZW4gPSBmaWx0ZXJlZFRyZWU7XG4gICAgICBcbiAgICAgIHRoaXMuY291bnRlciA9IDE7XG4gICAgICBcbiAgICAgIC8vb3JkZXJzIHRoZSBjb2xsZWN0aW9uIGFjY29yZGluZyB0byB0aGUgdHJlZVxuICAgICAgdGhpcy5maW5kUmFuayhkYXRhVHJlZSk7XG4gICAgICB0aGlzLnNvcnQoKTtcbiAgICAgIC8vY29uc29sZS5sb2coZGF0YVRyZWUpO1xuICAgICAgdGhpcy5jb25jZXB0VHJlZSA9IGRhdGFUcmVlO1xuICAgICAgdGhpcy50cmlnZ2VyKFwiZGF0YUNoYW5nZWRcIik7XG4gICAgfVxuICB9XG5cbn0pOyIsInZhciBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4uL2FwcGxpY2F0aW9uJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlJvdXRlci5leHRlbmQoe1xuICAgIHJvdXRlczp7XG4gICAgICBcIlwiIDogXCJzaG93SG9tZVwiLFxuICAgICAgXCJhYm91dFwiIDogXCJzaG93QWJvdXRcIixcbiAgICAgIFwiKm90aGVyXCIgICAgOiBcImRlZmF1bHRSb3V0ZVwiXG4gICAgfSxcbiAgICBcbiAgICBzaG93QWJvdXQ6IGZ1bmN0aW9uIHNob3dBYm91dCggKSB7XG4gICAgICAvL2NvbnNvbGUubG9nKFwiT24gYWltZXJhaXQgYWZmaWNoZXIgbGVzIGluZm9zIFwiKTtcbiAgICAgIFxuICAgIH0sXG5cbiAgICBzaG93SG9tZTogZnVuY3Rpb24gc2hvd0hvbWUoICkge1xuICAgICAgLy9cbiAgICAgIGFwcGxpY2F0aW9uLmFwcFZpZXcuc2V0UGFnZSgnaG9tZScpO1xuICAgICAgQmFja2JvbmUuaGlzdG9yeS5jaGVja1VybCgpO1xuICAgIH0sXG5cbiAgICBkZWZhdWx0Um91dGU6IGZ1bmN0aW9uKG90aGVyKXtcbiAgICAgIGlmKCFvdGhlcikgb3RoZXIgPVwiXCI7XG4gICAgICBhcHBsaWNhdGlvbi5hcHBWaWV3LnNldFBhZ2UoJ3RoZXNhdXJ1cycpO1xuICAgICAgLy9pZiBvdGhlciBpcyBkZWZpbmVkLCByZW1vdmUgXCJ1cmk9XCIgdG8gZ2V0IHRoZSBVUklcbiAgICAgIG90aGVyID0gb3RoZXIucmVwbGFjZShcInVyaT1cIiwgXCJcIikgO1xuICAgICAgLy9zZW5kIHRoZSBVUkkgdG8gdGhlIGNvbGxlY3Rpb25cbiAgICAgIGFwcGxpY2F0aW9uLmNvbGxlY3Rpb24uc2V0QWN0aXZlVVJJKG90aGVyKTtcbiAgICAgIC8vdXBkYXRlIHJvdXRlclxuICAgICAgQmFja2JvbmUuaGlzdG9yeS5jaGVja1VybCgpO1xuICAgICAgXG4gICAgfVxuXG59KTsiLCJ2YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIENvbmNlcHRWaWV3ID0gcmVxdWlyZSgnLi9jb25jZXB0Jyk7XG52YXIgRm9vdGVyVmlldyA9IHJlcXVpcmUoJy4vZm9vdGVyJyk7XG52YXIgSGVhZGVyVmlldyA9IHJlcXVpcmUoJy4vaGVhZGVyJyk7XG52YXIgSG9tZVZpZXcgPSByZXF1aXJlKCcuL2hvbWUnKTtcbnZhciBOYXZWaWV3ID0gcmVxdWlyZSgnLi9uYXYnKTtcbnZhciBTZWxlY3ROYXZWaWV3ID0gcmVxdWlyZSgnLi9zZWxlY3ROYXYnKTtcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGVsOiAnI3ZpenNrb3MnLFxuICAgIHRlbXBsYXRlIDogcmVxdWlyZSgnLi90ZW1wbGF0ZXMvbWFpbi5oYnMnKSxcbiAgICBwYWdlOiBudWxsLFxuXG4gICAgLy9pZiBwYWdlIGhhcyBjaGFuZ2VkLCByZW5kZXIgYWdhaW5cbiAgICBzZXRQYWdlOiBmdW5jdGlvbiBzZXRQYWdlQXBwKG5ld1BhZ2UpIHtcbiAgICBcbiAgICAgIFx0aWYobmV3UGFnZSAhPT0gdGhpcy5wYWdlKXtcbiAgICAgIFx0XHR0aGlzLnBhZ2UgPSBuZXdQYWdlO1xuICAgICAgXHRcdCh0aGlzLiQoJ2FydGljbGUnKS5sZW5ndGggPiAwKSA/IHRoaXMuYWZ0ZXJSZW5kZXIoKSA6IHRoaXMucmVuZGVyKCk7XG4gICAgICBcdH1cbiAgICB9LFxuXG4gICAgLy9hZnRlciByZW5kZXJpbmdcbiAgICBhZnRlclJlbmRlcjogZnVuY3Rpb24gYWZ0ZXJSZW5kZXJBcHAoKSB7XG5cbiAgICAgXHRpZih0aGlzLnBhZ2UgPT09ICdob21lJyl7XG4gICAgIFx0XHR0aGlzLmhlYWRlclZpZXcgPSBuZXcgSGVhZGVyVmlldyh7Y29sbGVjdGlvbiA6IHRoaXMuY29sbGVjdGlvbiwgZWw6IHRoaXMuJCgnaGVhZGVyIC5sb2dvJyl9KS5yZW5kZXIoKTtcbiAgICAgXHRcdHRoaXMuaG9tZVZpZXcgPSBuZXcgSG9tZVZpZXcoe2NvbGxlY3Rpb24gOiB0aGlzLmNvbGxlY3Rpb24sIGVsOiB0aGlzLiQoJ2FydGljbGUnKX0pLnJlbmRlcigpO1xuICAgICBcdFx0dGhpcy5mb290ZXJWaWV3ID0gbmV3IEZvb3RlclZpZXcoe2NvbGxlY3Rpb24gOiB0aGlzLmNvbGxlY3Rpb24sIGVsOiB0aGlzLiQoJ2Zvb3RlcicpfSkucmVuZGVyKCk7XG4gICAgIFx0fWVsc2UgaWYodGhpcy5wYWdlID09PSAndGhlc2F1cnVzJyl7XG4gICAgICBcdHRoaXMuaGVhZGVyVmlldyA9IG5ldyBIZWFkZXJWaWV3KHtjb2xsZWN0aW9uIDogdGhpcy5jb2xsZWN0aW9uLCBlbDogdGhpcy4kKCdoZWFkZXIgLmxvZ28nKX0pLnJlbmRlcigpO1xuICAgICAgXHR0aGlzLmNvbmNlcHRWaWV3ID0gbmV3IENvbmNlcHRWaWV3KHtjb2xsZWN0aW9uIDogdGhpcy5jb2xsZWN0aW9uLCBlbDogdGhpcy4kKCdhcnRpY2xlJyl9KTtcbiAgICAgIFx0dGhpcy5uYXZWaWV3ID0gbmV3IE5hdlZpZXcoe2NvbGxlY3Rpb24gOiB0aGlzLmNvbGxlY3Rpb24sIGVsOiB0aGlzLiQoJ25hdi5uYXYnKX0pLnJlbmRlcigpO1xuICAgICAgXHR0aGlzLnNlbGVjdE5hdlZpZXcgPSBuZXcgU2VsZWN0TmF2Vmlldyh7Y29sbGVjdGlvbiA6IHRoaXMuY29sbGVjdGlvbiwgZWw6IHRoaXMuJCgnaGVhZGVyIC50b29scycpIH0pLnJlbmRlcigpO1xuXG4gICAgICB9XG4gICAgfVxufSk7IiwidmFyIFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4uL2FwcGxpY2F0aW9uJyk7XG5yZXF1aXJlKCcuL3RlbXBsYXRlcy9oZWxwZXJzLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldy5leHRlbmQoe1xuXG4gICAgZXZlbnRzOiB7XG4gICAgICAnY2xpY2sgLmNsb3NlJzogJ2Nsb3NlJyxcbiAgICAgICdjbGljayAubGluayc6ICdhY3RpdmF0ZUxpbmsnLFxuICAgICAgJ2NsaWNrIC5uZXh0JzogJ25leHQnLFxuICAgICAgJ2NsaWNrIC5wcmV2JzogJ3ByZXYnXG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZSA6IHJlcXVpcmUoJy4vdGVtcGxhdGVzL2NvbmNlcHQuaGJzJyksXG4gICAgXG4gICAgLy9zZXQgdXAgbGlzdGVuZXJzXG4gICAgYWZ0ZXJJbml0OiBmdW5jdGlvbiBhZnRlckluaXRDb25jZXB0KCl7XG4gICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgJ2NvbmNlcHRDaGFuZ2VkJywgdGhpcy5yZW5kZXIpO1xuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdjb25jZXB0VG9nZ2xlZCcsIHRoaXMuY29uY2VwdFRvZ2dsZWQpO1xuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdkYXRhQ2hhbmdlZCcsIHRoaXMucmVuZGVyKTtcbiAgICB9LFxuICAgIC8vZ2V0IGluZm9ybWF0aW9uIHRvIHJlbmRlciB0aGUgdGVtcGxhdGVcbiAgICBnZXRSZW5kZXJEYXRhOiBmdW5jdGlvbiBnZXRDb25jZXB0UmVuZGVyRGF0YSgpe1xuICAgICAgdGhpcy5tb2RlbCA9IHRoaXMuY29sbGVjdGlvbi5nZXRBY3RpdmVDb25jZXB0KCk7XG4gICAgICByZXR1cm4gdGhpcy5tb2RlbCA/ICQuZXh0ZW5kKHsgbGFuZ3VhZ2UgOidlbicgfSwgdGhpcy5tb2RlbC5hdHRyaWJ1dGVzKSA6IHRoaXMuY29sbGVjdGlvbi5nZXRBY3RpdmVUaGVzYXVydXMoKTtcbiAgICB9LFxuICAgIC8vY2xvc2UgdGhlIGNvbmNlcHQgc2VjdGlvblxuICAgIGNsb3NlOiBmdW5jdGlvbiBjbG9zZUNvbmNlcHQoZWxlbWVudCkge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uLnRvZ2dsZUNvbmNlcHQoKTtcbiAgICAgIGVsZW1lbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuICAgIC8vc2hvdyBuZXh0IGNvbmNlcHRcbiAgICBuZXh0OiBmdW5jdGlvbiBuZXh0Q29uY2VwdChlbGVtZW50KSB7XG4gICAgICB2YXIgbmV3bW9kZWwgPSB0aGlzLm1vZGVsLmdldFJlbGF0aXZlKDEpO1xuICAgICAgYXBwbGljYXRpb24ucm91dGVyLm5hdmlnYXRlKGFwcGxpY2F0aW9uLnByb2Nlc3NVcmkobmV3bW9kZWwuYXR0cmlidXRlc1tcIkBpZFwiXSksIHt0cmlnZ2VyIDogdHJ1ZX0pO1xuICAgICAgZWxlbWVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0sXG4gICAgLy9zaG93IHByZXZpb3VzIGNvbmNlcHRcbiAgICBwcmV2OiBmdW5jdGlvbiBwcmV2Q29uY2VwdChlbGVtZW50KSB7XG4gICAgICB2YXIgbmV3bW9kZWwgPSB0aGlzLm1vZGVsLmdldFJlbGF0aXZlKC0xKTtcbiAgICAgIGFwcGxpY2F0aW9uLnJvdXRlci5uYXZpZ2F0ZShhcHBsaWNhdGlvbi5wcm9jZXNzVXJpKG5ld21vZGVsLmF0dHJpYnV0ZXNbXCJAaWRcIl0pLCB7dHJpZ2dlciA6IHRydWV9KTtcbiAgICAgIGVsZW1lbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuICAgIC8vc2hvdyAvIGhpZGUgY29uY2VwdFxuICAgIGNvbmNlcHRUb2dnbGVkOiBmdW5jdGlvbiBjb25jZXB0VG9nZ2xlZENvbmNlcHQoZWxlbWVudCkge1xuICAgICAgaWYodGhpcy5jb2xsZWN0aW9uLmNvbmNlcHRDbG9zZWQpe1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcyhcImNsb3NlZFwiKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLiRlbC5yZW1vdmVDbGFzcyhcImNsb3NlZFwiKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIC8vIE9wZW4gLyByZWR1Y2UgdGhlIGNvbmNlcHQgc2VjdGlvblxuICAgIGFjdGl2YXRlTGluazogZnVuY3Rpb24gYWN0aXZhdGVMaW5rQ29uY2VwdChlbGVtZW50KSB7XG4gICAgICBhcHBsaWNhdGlvbi5yb3V0ZXIubmF2aWdhdGUoYXBwbGljYXRpb24ucHJvY2Vzc1VyaSgkKGVsZW1lbnQuY3VycmVudFRhcmdldCkuYXR0cihcImhyZWZcIikpLCB7dHJpZ2dlciA6IHRydWV9KTtcbiAgICAgIGVsZW1lbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG59KTsiLCJ2YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICB0ZW1wbGF0ZSA6IHJlcXVpcmUoJy4vdGVtcGxhdGVzL2Zvb3Rlci5oYnMnKSxcbiAgICAvLyBUaGUgRE9NIGV2ZW50cyBzcGVjaWZpYyB0byBhIGNvbmNlcHQuXG4gICAgZXZlbnRzOiB7XG4gICAgICAnY2hhbmdlICNzZWxlY3ROYXYnOiAnc2VsZWN0TmF2JyxcbiAgICB9LFxuICAgXG4gICAgLy9cbiAgICBnZXRSZW5kZXJEYXRhOiBmdW5jdGlvbiBnZXRSZW5kZXJEYXRhRm9vdGVyKCl7XG4gICAgICByZXR1cm57XG4gICAgICAgIFxuICAgICAgfTtcbiAgICB9LFxuICAgIC8vICBcblxufSk7IiwidmFyIFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgdGVtcGxhdGUgOiByZXF1aXJlKCcuL3RlbXBsYXRlcy9oZWFkZXIuaGJzJyksXG4gICAgLy8gVGhlIERPTSBldmVudHMgc3BlY2lmaWMgdG8gYSBjb25jZXB0LlxuICAgIGV2ZW50czoge1xuICAgICAgJ2NoYW5nZSAjc2VsZWN0TmF2JzogJ3NlbGVjdE5hdicsXG4gICAgfSxcbiAgIFxuICAgIC8vXG4gICAgZ2V0UmVuZGVyRGF0YTogZnVuY3Rpb24gZ2V0UmVuZGVyRGF0YUhlYWRlcigpe1xuICAgICAgcmV0dXJue1xuICAgICAgICBcbiAgICAgIH07XG4gICAgfSxcbiAgICAvLyAgXG5cbn0pOyIsInZhciBWaWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldy5leHRlbmQoe1xuICAgIFxuICAgIHRlbXBsYXRlIDogcmVxdWlyZSgnLi90ZW1wbGF0ZXMvaG9tZS5oYnMnKSxcblxuICAgIGV2ZW50czoge1xuICAgICAgJ21vdXNlb3ZlciAuYm94JzogJ2NoYW5nZUJhY2tncm91bmQnLFxuICAgIH0sXG4gICAgLy9cbiAgICBnZXRSZW5kZXJEYXRhOiBmdW5jdGlvbiBnZXRSZW5kZXJEYXRhSG9tZSgpe1xuICAgICAgXG4gICAgICByZXR1cm57fTtcbiAgICB9LFxuXG4gICAgY2hhbmdlQmFja2dyb3VuZDogZnVuY3Rpb24gY2hhbmdlQmFja2dyb3VuZEhvbWUoZXZlbnQpe1xuICAgICAgdGhpcy4kZWwuZmluZChcIi5ob21lXCIpLmNzcyhcImJhY2tncm91bmRJbWFnZVwiLCAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmZpbmQoXCJhXCIpLmNzcyhcImJhY2tncm91bmRJbWFnZVwiKSk7XG4gICAgfVxuICBcblxufSk7IiwidmFyIFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciBOYXZDaXJjbGUgPSByZXF1aXJlKCcuL25hdkNpcmNsZScpO1xudmFyIE5hdlRyZWUgPSByZXF1aXJlKCcuL25hdlRyZWUnKTtcbm1vZHVsZS5leHBvcnRzID0gVmlldy5leHRlbmQoe1xuXG4gICAgLy8gc2V0IHVwIGxpc3RlbmVyc1xuICAgIGFmdGVySW5pdDogZnVuY3Rpb24gYWZ0ZXJJbml0TmF2KCl7XG4gICAgIFxuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICd2aWV3VHlwZUNoYW5nZWQnLCB0aGlzLnJlbmRlcik7XG4gICAgICBcblxuICAgIH0sXG4gICAgXG4gICAgLy8gdGhlIG5hdiBkb2VzIG5vdCByZW5kZXIgYSBoYW5kbGViYXJzIHRlbXBsYXRlXG4gICAgLy8gaW5zdGVhZCBpdCBpbnN0YW5jaWF0ZXMgYSBuZXcgb2JqZWN0IHRvIGRlYWwgd2l0aCBkM2pzXG4gICAgcmVuZGVyOiBmdW5jdGlvbiByZW5kZXJOYXYoKSB7XG4gICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgaWYodGhpcy5jb2xsZWN0aW9uLmdldFZpZXdUeXBlKCkgPT09IDEpe1xuICAgICAgICB0aGlzLm5hdlZpZXcgPSBuZXcgTmF2Q2lyY2xlKHtjb2xsZWN0aW9uIDogdGhpcy5jb2xsZWN0aW9ufSkucmVuZGVyKCk7XG4gICAgICB9ZWxzZSBpZih0aGlzLmNvbGxlY3Rpb24uZ2V0Vmlld1R5cGUoKSA9PT0gMil7XG4gICAgICAgIHRoaXMubmF2VmlldyA9IG5ldyBOYXZUcmVlKHtjb2xsZWN0aW9uIDogdGhpcy5jb2xsZWN0aW9ufSkucmVuZGVyKCk7XG4gICAgICB9XG5cbiAgICB9XG5cbn0pO1xuIiwidmFyIFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4uL2FwcGxpY2F0aW9uJyk7XG5tb2R1bGUuZXhwb3J0cyA9IFZpZXcuZXh0ZW5kKHtcbiAgICBldmVudHM6IHtcbiAgICAgICdzY3JvbGwnOiAnem9vbScsXG4gICAgfSxcbiAgICBjaGFuZ2VTY2FsZTogZnVuY3Rpb24gem9vbU5hdigpIHtcbiAgICAgIC8vdGhpcy5tYWluLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBkMy5ldmVudC50cmFuc2xhdGUgKyBcIilzY2FsZShcIiArIGQzLmV2ZW50LnNjYWxlICsgXCIpXCIpO1xuICAgIH0sXG4gICAgaW5pdFNpemU6IGZ1bmN0aW9uIGluaXRTaXplTmF2KCkge1xuICAgICAgdGhpcy5oZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCkgO1xuICAgICAgdGhpcy53aWR0aCA9ICQod2luZG93KS53aWR0aCgpIDtcbiAgICAgIHRoaXMud2hpdGVSYWRpdXMgPSAxMjA7XG4gICAgICB0aGlzLnlSYWRpdXMgPSAodGhpcy5oZWlnaHQgLSA0MCkgLyAyO1xuICAgICAgdGhpcy54UmFkaXVzID0gdGhpcy55UmFkaXVzO1xuICAgICAgdGhpcy5yb3RhdGUgPSAwO1xuICAgICAgdGhpcy54ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzAsIHRoaXMud2lkdGhdKSxcbiAgICAgIHRoaXMueSA9IGQzLnNjYWxlLmxpbmVhcigpLnJhbmdlKFswLCB0aGlzLmhlaWdodF0pO1xuICAgICAgdGhpcy5kdXJhdGlvbiA9IDc1MDtcbiAgICB9LFxuICAgIHNldFNpemU6IGZ1bmN0aW9uIHNldFNpemVOYXYoKXtcbiAgICAgIHRoaXMuaW5pdFNpemUoKTtcbiAgICAgIFxuICAgICAgdGhpcy5jbHVzdGVyXG4gICAgICAgIC5zaXplKFszNjAsIHRoaXMueVJhZGl1cyAtIHRoaXMud2hpdGVSYWRpdXNdKTtcblxuICAgICAgdGhpcy5zdmdcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgdGhpcy53aWR0aCArIFwicHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsIHRoaXMuaGVpZ2h0ICsgXCJweFwiKTtcblxuICAgICAgdGhpcy52aXNcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB0aGlzLndpZHRoKVxuICAgICAgICAuYXR0cihcImhlaWdodFwiLCB0aGlzLmhlaWdodCk7XG4gICAgfSxcbiAgICByZXNpemU6IGZ1bmN0aW9uIHJlc2l6ZU5hdigpIHtcbiAgICAgIFxuICAgICAgdGhpcy5zZXRTaXplKCk7XG4gICAgICB0aGlzLnJlbmRlcih0aGlzLnJvb3QpO1xuICAgIH0sXG5cbiAgICAvLyBUaGUgTmF2VmlldyBsaXN0ZW5zIGZvciBjaGFuZ2VzIHRvIGl0cyBtb2RlbCwgcmUtcmVuZGVyaW5nLlxuICAgIGFmdGVySW5pdDogZnVuY3Rpb24gYWZ0ZXJJbml0TmF2KCl7XG4gICAgICB0aGlzLnByZVJlbmRlcigpO1xuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdjb25jZXB0Q2hhbmdlZCcsIHRoaXMuc2hvd1NlbGVjdGVkTm9kZSk7XG4gICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgJ2RhdGFDaGFuZ2VkJywgdGhpcy5kYXRhQ2hhbmdlZCk7XG5cbiAgICAgICQod2luZG93KS5vbihcInJlc2l6ZVwiLCB0aGlzLnJlc2l6ZS5iaW5kKHRoaXMpKTtcbiAgICAgIFxuICAgIH0sXG4gICAgZGF0YUNoYW5nZWQ6IGZ1bmN0aW9uIGRhdGFDaGFuZ2VkKCkge1xuICAgICAgdGhpcy5yb290ID0gdGhpcy5jb2xsZWN0aW9uLmNvbmNlcHRUcmVlO1xuICAgICAgaWYodGhpcy5yb290KXtcbiAgICAgICAgdGhpcy5yb290LngwID0gdGhpcy5oZWlnaHQgLyAyO1xuICAgICAgICB0aGlzLnJvb3QueTAgPSAwO1xuXG4gICAgICAgIHRoaXMucHJlUmVuZGVyKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICAvLyBSZS1yZW5kZXJzIHRoZSB0aXRsZXMgb2YgdGhlIHRvZG8gaXRlbS5cbiAgICBwcmVSZW5kZXI6IGZ1bmN0aW9uIHByZVJlbmRlck5hdigpIHtcbiAgICAgIFxuICAgICAgLy9pZih0aGlzLmNvbGxlY3Rpb24ubG9hZGVkKXtcbiAgICAgXG4gICAgICAgIHRoaXMuY2x1c3RlciA9IGQzLmxheW91dC50cmVlKClcbiAgICAgICAgICAuc2VwYXJhdGlvbihmdW5jdGlvbihhLCBiKSB7IHJldHVybiAoYS5wYXJlbnQgPT0gYi5wYXJlbnQgPyAxIDogMikgLyBhLmRlcHRoOyB9KTtcbiAgIFxuICAgICAgICAvL1xuICAgICAgICB0aGlzLmRpYWdvbmFsID0gZDMuc3ZnLmRpYWdvbmFsLnJhZGlhbCgpXG4gICAgICAgICAgLnByb2plY3Rpb24oIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFtkLnksIGQueCAvIDE4MCAqIE1hdGguUEldOyB9ICk7XG4gICAgICAgIC8vXG4gICAgICAgIFxuICAgICAgICB0aGlzLnN2ZyA9IGQzLnNlbGVjdChcIiN2aXpza29zIC5uYXZcIik7XG4gICAgICAgIC8vdGhpcy5zdmcuZW1wdHkoKTtcbiAgICAgICAgdGhpcy52aXMgPSAgZDMuc2VsZWN0KFwiI3ZpenNrb3MgLm5hdiBzdmdcIik7XG4gICAgICAgIGlmKHRoaXMudmlzKSB0aGlzLnZpcy5yZW1vdmUoKTtcblxuICAgICAgICB0aGlzLnZpcyA9IHRoaXMuc3ZnLmFwcGVuZChcInN2ZzpzdmdcIik7XG4gICAgICAgIC8vXG4gICAgICAgIHRoaXMubWFpbiA9IHRoaXMudmlzXG4gICAgICAgICAgLmFwcGVuZChcInN2ZzpnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibWFpbiBcIiArIHRoaXMuY29sbGVjdGlvbi5nZXRBY3RpdmVUaGVzYXVydXMoKS5uYW1lZF9pZCk7XG5cbiAgICAgICAgLy9wYXJ0aXRpb24gdmlld1xuICAgICAgICB0aGlzLnBhcnRpdGlvbiA9IGQzLmxheW91dC5wYXJ0aXRpb24oKVxuICAgICAgICAgIC52YWx1ZShmdW5jdGlvbihkKSB7IHJldHVybiBkLnNpemU7IH0pO1xuXG4gICAgICAgIHRoaXMuem9vbSA9IGQzLmJlaGF2aW9yLnpvb20oKVxuICAgICAgICAgIC5vbihcInpvb21cIiwgdGhpcy5jaGFuZ2VTY2FsZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYXJjID0gdGhpcy5tYWluLmFwcGVuZChcInN2ZzpwYXRoXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImFyY1wiKTtcblxuICAgICAgICB0aGlzLnNldFNpemUoKTtcbiAgICAgICAgXG5cbiAgICAgICAgaWYodGhpcy5yb290KSB0aGlzLnJlbmRlcih0aGlzLnJvb3QpO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAvL31cbiAgICAgXG4gICAgfSxcbiAgICByZW5kZXIgOiBmdW5jdGlvbiByZW5kZXJOYXYoc291cmNlKSB7XG4gICAgICBcbiAgICAgIGlmKHNvdXJjZSAhPT0gdW5kZWZpbmVkKXtcbiAgICAgIFxuICAgICAgLy9jb25zb2xlLmxvZyhcImxhIHNvdXJjZVwiLCBzb3VyY2UsIHNvdXJjZS54LCBOdW1iZXIuaXNOYU4oc291cmNlLngpKTtcbiAgICAgXG5cbiAgICAgICAgdmFyIG5vZGVzID0gdGhpcy5jbHVzdGVyLm5vZGVzKHRoaXMuY29sbGVjdGlvbi5jb25jZXB0VHJlZSk7XG4gICAgICAgIHZhciBsaW5rcyA9IHRoaXMuY2x1c3Rlci5saW5rcyhub2Rlcyk7XG4gICAgICAgIHZhciB3aGl0ZVJhZGl1cyA9IHRoaXMud2hpdGVSYWRpdXM7XG5cbiAgICAgICAgdGhpcy5tYWluXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICgxMDAgKyB0aGlzLnhSYWRpdXMgKSArIFwiLFwiICsgKDI1ICsgdGhpcy55UmFkaXVzKSArIFwiKVwiKTtcblxuICAgICAgICAvL3RoaXMubWFpbi5jYWxsKHRoaXMuem9vbSk7XG5cbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLm1haW4uc2VsZWN0QWxsKFwiZy5ub2RlXCIpLmRhdGEobm9kZXMpO1xuICAgICAgICB2YXIgbGluayA9IHRoaXMubWFpbi5zZWxlY3RBbGwoXCJwYXRoLmxpbmtcIikuZGF0YShsaW5rcyk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFyYy5hdHRyKFwiZFwiLCBkMy5zdmcuYXJjKCkuaW5uZXJSYWRpdXModGhpcy55UmFkaXVzIC0gdGhpcy53aGl0ZVJhZGl1cykub3V0ZXJSYWRpdXModGhpcy55UmFkaXVzKS5zdGFydEFuZ2xlKDApLmVuZEFuZ2xlKDIgKiBNYXRoLlBJKSk7XG5cbiAgICAgICAgIHZhciBsaW5rVXBkYXRlID0gbGluay50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24odGhpcy5kdXJhdGlvbilcbiAgICAgICAgICAuYXR0cihcImRcIiwgdGhpcy5kaWFnb25hbCk7XG5cbiAgICAgICAgdmFyIGxpbmtFbnRlciA9IGxpbmsuZW50ZXIoKVxuICAgICAgICAgIC5hcHBlbmQoXCJzdmc6cGF0aFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmtcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZFwiLCB0aGlzLmRpYWdvbmFsKTtcblxuICAgICAgICB2YXIgbGlua0V4aXQgPSBsaW5rLmV4aXQoKS50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24odGhpcy5kdXJhdGlvbilcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkLGkpIHtyZXR1cm4gXCJyb3RhdGUoXCIgKyAoc291cmNlLnggLSA5MCkgKyBcIil0cmFuc2xhdGUoXCIgKyAoc291cmNlLnkgKSArIFwiKVwiOyB9KVxuICAgICAgICAgIC5yZW1vdmUoKTtcblxuICAgICAgICB2YXIgbm9kZUVudGVyID0gbm9kZS5lbnRlcigpXG4gICAgICAgICAgLmFwcGVuZChcInN2ZzpnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY2hpbGRyZW4gPyBcIm5vZGUgcGFyZW50IG5vZGVfXCIgKyBkLmlkIDogXCJub2RlIGNoaWxkIG5vZGVfXCIgKyBkLmlkOyB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCxpKSB7IHJldHVybiAgXCJyb3RhdGUoXCIgKyAoc291cmNlLnggLSA5MCkgKyBcIil0cmFuc2xhdGUoXCIgKyAoc291cmNlLnkgKSArIFwiKVwiOyB9KTtcbiAgICAgICAgXG5cbiAgICAgICAgdmFyIG5vZGVFbnRlckNpcmNsZSA9IG5vZGVFbnRlci5hcHBlbmQoXCJzdmc6Y2lyY2xlXCIpXG4gICAgICAgICAgLmF0dHIoXCJyXCIsIDQsNSlcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuX2NoaWxkcmVuID8gXCJjaGlsZHJlblwiIDogXCJcIjsgfSlcbiAgICAgICAgICAub24oXCJtb3VzZWRvd25cIiwgdGhpcy50b2dnbGVOb2RlLmJpbmQodGhpcykgKTtcblxuICAgICAgICB2YXIgbm9kZUVudGVyTGFiZWwgPSBub2RlRW50ZXIuYXBwZW5kKFwic3ZnOnRleHRcIilcbiAgICAgICAgICAuYXR0cihcImR4XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueCA8IDE4MCA/IDggOiAtODsgfSlcbiAgICAgICAgICAuYXR0cihcImR5XCIsIFwiLjMxZW1cIilcbiAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueCA8IDE4MCA/IFwic3RhcnRcIiA6IFwiZW5kXCI7IH0pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54IDwgMTgwID8gbnVsbCA6IFwicm90YXRlKDE4MClcIjsgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWU7IH0pXG4gICAgICAgICAgLm9uKFwibW91c2Vkb3duXCIsIHRoaXMuc2VsZWN0Tm9kZS5iaW5kKHRoaXMpICk7XG5cbiAgICAgICAgdmFyIG5vZGVVcGRhdGUgPSBub2RlLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5kdXJhdGlvbih0aGlzLmR1cmF0aW9uKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwicm90YXRlKFwiICsgKGQueCAtIDkwKSArIFwiKXRyYW5zbGF0ZShcIiArIChkLnkgKSArIFwiKVwiOyB9KTtcblxuICAgICAgICBub2RlVXBkYXRlLnNlbGVjdChcImNpcmNsZVwiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5fY2hpbGRyZW4gPyBcImNoaWxkcmVuXCIgOiBcIlwiOyB9KTtcbiAgICAgICAgXG5cbiAgICAgICAgdmFyIG5vZGVFeGl0ID0gbm9kZS5leGl0KClcbiAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24odGhpcy5kdXJhdGlvbilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwicm90YXRlKFwiICsgKHNvdXJjZS54IC0gOTApICsgXCIpdHJhbnNsYXRlKFwiICsgKHNvdXJjZS55ICkgKyBcIilcIjsgfSlcbiAgICAgICAgICAgIC5yZW1vdmUoKTtcblxuICAgICAgICBub2RlRXhpdC5zZWxlY3QoXCJjaXJjbGVcIilcbiAgICAgICAgICAuYXR0cihcInJcIiwgMWUtNik7XG5cbiAgICAgICAgbm9kZUV4aXQuc2VsZWN0KFwidGV4dFwiKVxuICAgICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxZS02KTtcblxuICAgICAgICAvLyBTdGFzaCB0aGUgb2xkIHBvc2l0aW9ucyBmb3IgdHJhbnNpdGlvbi5cbiAgICAgICAgbm9kZS5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICBkLngwID0gZC54O1xuICAgICAgICAgIGQueTAgPSBkLnk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuc2hvd1NlbGVjdGVkTm9kZSgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgLy9vcGVuIC8gY2xvc2UgYSBicmFuY2ggb2YgdGhlIHRyZWVcbiAgICB0b2dnbGVOb2RlOiBmdW5jdGlvbiB0b2dnbGVOb2RlTmF2KGQsIGkpIHtcbiAgICAgIGlmIChkLmNoaWxkcmVuKSB7XG4gICAgICAgIGQuX2NoaWxkcmVuID0gZC5jaGlsZHJlbjtcbiAgICAgICAgZC5jaGlsZHJlbiA9IG51bGw7ICAgICAgICAgICAgICBcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGQuY2hpbGRyZW4gPSBkLl9jaGlsZHJlbjtcbiAgICAgICAgZC5fY2hpbGRyZW4gPSBudWxsO1xuICAgICAgfVxuICAgICAgdGhpcy5yZW5kZXIoZCk7XG4gICAgfSxcbiAgICAvL2hpZ2hsaWdodCBzZWxlY3RlZCBub2RlIChsaXN0ZW5lciBjb25jZXB0Q2hhbmdlZClcbiAgICBzaG93U2VsZWN0ZWROb2RlOiBmdW5jdGlvbiBzaG93U2VsZWN0ZWROb2RlTmF2KHVyaSkge1xuICAgICAgZDMuc2VsZWN0KFwiLm5vZGUuc2VsZWN0ZWRcIikuY2xhc3NlZChcInNlbGVjdGVkXCIsIGZhbHNlKTtcbiAgICAgIHZhciB0aGVtb2RlbCA9IHRoaXMuY29sbGVjdGlvbi5nZXRBY3RpdmVDb25jZXB0KCk7XG4gICAgICBpZih0aGVtb2RlbCkgZDMuc2VsZWN0KFwiLm5vZGVfXCIrIHRoZW1vZGVsLmF0dHJpYnV0ZXMuaWQpLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCB0cnVlKTtcbiAgICB9LFxuICAgIC8vd2hlbiBhIG5vZGUgaXMgY2xpY2tlZFxuICAgIHNlbGVjdE5vZGU6IGZ1bmN0aW9uIHNlbGVjdE5vZGVOYXYoZCwgaSkge1xuICAgICAgLy9zZW5kIHJlcXVlc3QgdG8gdGhlIHJvdXRlclxuICAgICAgYXBwbGljYXRpb24ucm91dGVyLm5hdmlnYXRlKGFwcGxpY2F0aW9uLnByb2Nlc3NVcmkoZC51cmkpLCB7dHJpZ2dlciA6IHRydWV9KTtcbiAgICAgIC8vYmFja2JvbmUgYmVpbmcgc21hcnQgZW5vdWdoIG5vdCB0byB0cmlnZ2VyIHRoZSByb3V0ZSBpZiBjb25jZXB0IGFscmVhZHkgc2VsZWN0ZWRcbiAgICAgIC8vd2UgbmVlZCB0byBtYWtlIHN1cmUgdGhlIHBvcC11cCBpcyBvcGVuXG4gICAgICBpZih0aGlzLmNvbGxlY3Rpb24uZ2V0QWN0aXZlQ29uY2VwdCgpLmlkID09IGQudXJpKSB7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi50b2dnbGVDb25jZXB0KHRydWUpO1xuICAgICAgfVxuICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfVxuXG59KTtcbiIsInZhciBWaWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG52YXIgYXBwbGljYXRpb24gPSByZXF1aXJlKCcuLi9hcHBsaWNhdGlvbicpO1xubW9kdWxlLmV4cG9ydHMgPSBWaWV3LmV4dGVuZCh7XG5cbiAgICAvL2dldHMgd2luZG93IHNpemVcbiAgICBpbml0U2l6ZTogZnVuY3Rpb24gaW5pdFNpemVOYXYoKSB7XG4gICAgICB0aGlzLmhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICAgIHRoaXMud2lkdGggPSAkKHdpbmRvdykud2lkdGgoKSA7XG4gICAgICB0aGlzLmkgPSAwO1xuICAgICAgdGhpcy5kdXJhdGlvbiA9IDc1MDtcbiAgICB9LFxuXG4gICAgLy9cbiAgICBzZXRTaXplOiBmdW5jdGlvbiBzZXRTaXplTmF2KCkge1xuICAgICAgdGhpcy5pbml0U2l6ZSgpO1xuIFxuICAgICAgdGhpcy5zdmdcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgdGhpcy53aWR0aCArIFwicHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsIHRoaXMuaGVpZ2h0ICsgXCJweFwiKTtcblxuICAgICAgdGhpcy52aXNcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB0aGlzLndpZHRoKVxuICAgICAgICAuYXR0cihcImhlaWdodFwiLCB0aGlzLmhlaWdodCk7XG5cbiAgICB9LFxuXG4gICAgLy8gVGhlIE5hdlZpZXcgbGlzdGVucyBmb3IgY2hhbmdlcyB0byBpdHMgbW9kZWwsIHJlLXJlbmRlcmluZy5cbiAgICBhZnRlckluaXQ6IGZ1bmN0aW9uIGFmdGVySW5pdE5hdigpe1xuICAgICAgdGhpcy5wcmVSZW5kZXIoKTtcbiAgICAgIFxuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdjb25jZXB0Q2hhbmdlZCcsIHRoaXMuc2hvd1NlbGVjdGVkTm9kZSk7XG4gICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgJ2RhdGFDaGFuZ2VkJywgdGhpcy5kYXRhQ2hhbmdlZCk7XG5cbiAgICAgICQod2luZG93KS5vbihcInJlc2l6ZVwiLCB0aGlzLnJlc2l6ZS5iaW5kKHRoaXMpKTtcbiAgICAgIFxuXG4gICAgfSxcbiAgICBkYXRhQ2hhbmdlZDogZnVuY3Rpb24gZGF0YUNoYW5nZWQoKSB7XG4gICAgICB0aGlzLnJvb3QgPSB0aGlzLmNvbGxlY3Rpb24uY29uY2VwdFRyZWU7XG4gICAgICBpZih0aGlzLnJvb3Qpe1xuICAgICAgICBzb3VyY2UueDAgPSB0aGlzLmhlaWdodCAvIDI7XG4gICAgICAgIHNvdXJjZS55MCA9IDA7XG4gICAgICAgIHRoaXMucHJlUmVuZGVyKCk7XG4gICAgICAgIFxuICAgICAgfVxuICAgIH0sXG4gICAgcmVzaXplOiBmdW5jdGlvbiByZXNpemVOYXYoKSB7XG4gICAgICBcbiAgICAgIHRoaXMuc2V0U2l6ZSgpO1xuICAgICAgdGhpcy5yZW5kZXIodGhpcy5yb290KTtcbiAgICB9LFxuICAgIC8vIFJlLXJlbmRlcnMgdGhlIHRpdGxlcyBvZiB0aGUgdG9kbyBpdGVtLlxuICAgIHByZVJlbmRlcjogZnVuY3Rpb24gcHJlUmVuZGVyTmF2KCkge1xuICAgICAgY29uc29sZS5sb2coXCJpc2xvYWRlZFwiLCB0aGlzLmNvbGxlY3Rpb24ubG9hZGVkKTtcbiAgICAgIC8vaWYodGhpcy5jb2xsZWN0aW9uLmxvYWRlZCl7XG5cbiAgICAgICAgdGhpcy5pbml0U2l6ZSgpO1xuICAgICAgIFxuICAgICAgICB0aGlzLnRyZWUgPSBkMy5sYXlvdXQudHJlZSgpXG4gICAgICAgICAgLnNpemUoW3RoaXMuaGVpZ2h0LCB0aGlzLndpZHRoXSk7XG4gICAgICAgIC8vXG4gICAgICAgIHRoaXMuZGlhZ29uYWwgPSBkMy5zdmcuZGlhZ29uYWwoKVxuICAgICAgICAgIC5wcm9qZWN0aW9uKCBmdW5jdGlvbihkKSB7IHJldHVybiBbZC55LCBkLnhdOyB9ICk7XG4gICAgICAgIC8vXG4gICAgICAgIHRoaXMuc3ZnID0gZDMuc2VsZWN0KFwibmF2Lm5hdlwiKTtcbiAgICAgICAgLy9cbiAgICAgICAgdGhpcy52aXMgPSB0aGlzLnN2Zy5hcHBlbmQoXCJzdmc6c3ZnXCIpO1xuICAgICAgICAvL1xuICAgICAgICB0aGlzLm1haW4gPSB0aGlzLnZpc1xuICAgICAgICAgIC5hcHBlbmQoXCJzdmc6Z1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm1haW4gXCIgKyB0aGlzLmNvbGxlY3Rpb24uYWN0aXZlVGhlc2F1cnVzKTsgIFxuXG4gICAgICAgIHRoaXMuc2V0U2l6ZSgpO1xuICAgICBcbiAgICAgICAgaWYodGhpcy5yb290KSB0aGlzLnJlbmRlcih0aGlzLnJvb3QpO1xuXG4gICAgICAgXG4gICAgICAvL31cbiBcbiAgICB9LFxuICAgIC8vcmVuZGVyIHRoZSBuYXZcbiAgICByZW5kZXIgOiBmdW5jdGlvbiByZW5kZXJOYXYoc291cmNlKSB7XG4gICAgICBpZihzb3VyY2UgIT09IHVuZGVmaW5lZCl7XG4gICAgICBcbiAgICAgIC8vaWYodGhpcy5jb2xsZWN0aW9uLmxvYWRlZCl7XG4gICAgICAvLyBDb21wdXRlIHRoZSBuZXcgdHJlZSBsYXlvdXQuXG4gICAgICB2YXIgbm9kZXMgPSB0aGlzLnRyZWUubm9kZXModGhpcy5yb290KS5yZXZlcnNlKCksXG4gICAgICAgICAgbGlua3MgPSB0aGlzLnRyZWUubGlua3Mobm9kZXMpO1xuXG4gICAgICAvLyBOb3JtYWxpemUgZm9yIGZpeGVkLWRlcHRoLlxuICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkKSB7IGQueSA9IGQuZGVwdGggKiAxODA7IH0pO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIG5vZGVz4oCmXG4gICAgICB2YXIgbm9kZSA9IHRoaXMubWFpbi5zZWxlY3RBbGwoXCJnLm5vZGVcIilcbiAgICAgICAgICAuZGF0YShub2RlcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5pZCB8fCAoZC5pZCA9ICsrdGhpcy5pKTsgfSk7XG5cbiAgICAgIC8vIEVudGVyIGFueSBuZXcgbm9kZXMgYXQgdGhlIHBhcmVudCdzIHByZXZpb3VzIHBvc2l0aW9uLlxuICAgICAgdmFyIG5vZGVFbnRlciA9IG5vZGUuZW50ZXIoKS5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKXsgcmV0dXJuIFwibm9kZSBub2RlX1wiK2QuaWQ7IH0pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBzb3VyY2UueTAgKyBcIixcIiArIHNvdXJjZS54MCArIFwiKVwiOyB9KTtcblxuICAgICAgbm9kZUVudGVyLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgIC5hdHRyKFwiclwiLCAxZS02KVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5fY2hpbGRyZW4gPyBcImNoaWxkcmVuXCIgOiBcIlwiOyB9KVxuICAgICAgICAgIC5vbihcImNsaWNrXCIsIHRoaXMudG9nZ2xlTm9kZS5iaW5kKHRoaXMpKTtcblxuICAgICAgbm9kZUVudGVyLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IC0xMCA6IDEwOyB9KVxuICAgICAgICAgIC5hdHRyKFwiZHlcIiwgXCIuMzVlbVwiKVxuICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IFwiZW5kXCIgOiBcInN0YXJ0XCI7IH0pXG4gICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lOyB9KVxuICAgICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxZS02KVxuICAgICAgICAgIC5vbihcImNsaWNrXCIsIHRoaXMuc2VsZWN0Tm9kZS5iaW5kKHRoaXMpKTtcblxuICAgICAgLy8gVHJhbnNpdGlvbiBub2RlcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICB2YXIgbm9kZVVwZGF0ZSA9IG5vZGUudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmR1cmF0aW9uKHRoaXMuZHVyYXRpb24pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBkLnkgKyBcIixcIiArIGQueCArIFwiKVwiOyB9KTtcblxuICAgICAgbm9kZVVwZGF0ZS5zZWxlY3QoXCJjaXJjbGVcIilcbiAgICAgICAgICAuYXR0cihcInJcIiwgNC41KVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5fY2hpbGRyZW4gPyBcImNoaWxkcmVuXCIgOiBcIlwiOyB9KTtcblxuICAgICAgbm9kZVVwZGF0ZS5zZWxlY3QoXCJ0ZXh0XCIpXG4gICAgICAgICAgLnN0eWxlKFwiZmlsbC1vcGFjaXR5XCIsIDEpO1xuXG4gICAgICAvLyBUcmFuc2l0aW9uIGV4aXRpbmcgbm9kZXMgdG8gdGhlIHBhcmVudCdzIG5ldyBwb3NpdGlvbi5cbiAgICAgIHZhciBub2RlRXhpdCA9IG5vZGUuZXhpdCgpLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5kdXJhdGlvbih0aGlzLmR1cmF0aW9uKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgc291cmNlLnkgKyBcIixcIiArIHNvdXJjZS54ICsgXCIpXCI7IH0pXG4gICAgICAgICAgLnJlbW92ZSgpO1xuXG4gICAgICBub2RlRXhpdC5zZWxlY3QoXCJjaXJjbGVcIilcbiAgICAgICAgICAuYXR0cihcInJcIiwgMWUtNik7XG5cbiAgICAgIG5vZGVFeGl0LnNlbGVjdChcInRleHRcIilcbiAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMWUtNik7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgbGlua3PigKZcbiAgICAgIHZhciBsaW5rID0gdGhpcy5tYWluLnNlbGVjdEFsbChcInBhdGgubGlua1wiKVxuICAgICAgICAgIC5kYXRhKGxpbmtzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5pZDsgfSk7XG5cbiAgICAgIHZhciBkaWFnb25hbCA9IHRoaXMuZGlhZ29uYWw7XG4gICAgICAvLyBFbnRlciBhbnkgbmV3IGxpbmtzIGF0IHRoZSBwYXJlbnQncyBwcmV2aW91cyBwb3NpdGlvbi5cbiAgICAgIGxpbmsuZW50ZXIoKS5pbnNlcnQoXCJwYXRoXCIsIFwiZ1wiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXG4gICAgICAgICAgLmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBvID0ge3g6IHNvdXJjZS54MCwgeTogc291cmNlLnkwfTtcbiAgICAgICAgICAgIHJldHVybiBkaWFnb25hbCh7c291cmNlOiBvLCB0YXJnZXQ6IG99KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgLy8gVHJhbnNpdGlvbiBsaW5rcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICBsaW5rLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5kdXJhdGlvbih0aGlzLmR1cmF0aW9uKVxuICAgICAgICAgIC5hdHRyKFwiZFwiLCBkaWFnb25hbCk7XG5cbiAgICAgIC8vIFRyYW5zaXRpb24gZXhpdGluZyBub2RlcyB0byB0aGUgcGFyZW50J3MgbmV3IHBvc2l0aW9uLlxuICAgICAgbGluay5leGl0KCkudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmR1cmF0aW9uKHRoaXMuZHVyYXRpb24pXG4gICAgICAgICAgLmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBvID0ge3g6IHNvdXJjZS54LCB5OiBzb3VyY2UueX07XG4gICAgICAgICAgICByZXR1cm4gZGlhZ29uYWwoe3NvdXJjZTogbywgdGFyZ2V0OiBvfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAucmVtb3ZlKCk7XG5cbiAgICAgIC8vIFN0YXNoIHRoZSBvbGQgcG9zaXRpb25zIGZvciB0cmFuc2l0aW9uLlxuICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgIGQueDAgPSBkLng7XG4gICAgICAgIGQueTAgPSBkLnk7XG4gICAgICB9KTtcblxuICAgICAgIHRoaXMuc2hvd1NlbGVjdGVkTm9kZSgpO1xuXG4gICAgICB9XG4gICAgfSxcbiAgICAvL29wZW4gLyBjbG9zZSBhIGJyYW5jaCBvZiB0aGUgdHJlZVxuICAgIHRvZ2dsZU5vZGU6IGZ1bmN0aW9uIHRvZ2dsZU5vZGVOYXYoZCwgaSkge1xuICAgICAgaWYgKGQuY2hpbGRyZW4pIHtcbiAgICAgICAgZC5fY2hpbGRyZW4gPSBkLmNoaWxkcmVuO1xuICAgICAgICBkLmNoaWxkcmVuID0gbnVsbDsgICAgICAgICAgICAgIFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZC5jaGlsZHJlbiA9IGQuX2NoaWxkcmVuO1xuICAgICAgICBkLl9jaGlsZHJlbiA9IG51bGw7XG4gICAgICB9XG4gICAgICB0aGlzLnJlbmRlcihkKTtcbiAgICB9LFxuICAgIHNob3dTZWxlY3RlZE5vZGU6IGZ1bmN0aW9uIHNob3dTZWxlY3RlZE5vZGVOYXYodXJpKSB7XG4gICAgICAvL2lmKHRoaXMuY29sbGVjdGlvbi5sb2FkZWQpe1xuICAgICAgICBkMy5zZWxlY3QoXCIubm9kZS5zZWxlY3RlZFwiKS5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgZmFsc2UpO1xuICAgICAgICB2YXIgdGhlbW9kZWwgPSB0aGlzLmNvbGxlY3Rpb24uZ2V0QWN0aXZlQ29uY2VwdCgpO1xuICAgICAgICBpZih0aGVtb2RlbCkgZDMuc2VsZWN0KFwiLm5vZGVfXCIrIHRoZW1vZGVsLmF0dHJpYnV0ZXMuaWQpLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCB0cnVlKTtcbiAgICAgIC8vfVxuICAgIH0sXG4gICAgc2VsZWN0Tm9kZTogZnVuY3Rpb24gc2VsZWN0Tm9kZU5hdihkLCBpKSB7XG4gICAgICAvL3NlbmQgcmVxdWVzdCB0byB0aGUgcm91dGVyXG4gICAgICBhcHBsaWNhdGlvbi5yb3V0ZXIubmF2aWdhdGUoYXBwbGljYXRpb24ucHJvY2Vzc1VyaShkLnVyaSksIHt0cmlnZ2VyIDogdHJ1ZX0pO1xuICAgICAgLy9iYWNrYm9uZSBiZWluZyBzbWFydCBlbm91Z2ggbm90IHRvIHRyaWdnZXIgdGhlIHJvdXRlIGlmIGNvbmNlcHQgYWxyZWFkeSBzZWxlY3RlZFxuICAgICAgLy93ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGUgcG9wLXVwIGlzIG9wZW5cbiAgICAgIGlmKHRoaXMuY29sbGVjdGlvbi5nZXRBY3RpdmVDb25jZXB0KCkuaWQgPT0gZC51cmkpIHtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLnRvZ2dsZUNvbmNlcHQodHJ1ZSk7XG4gICAgICB9XG4gICAgICBkMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9XG5cbn0pO1xuIiwidmFyIFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4uL2FwcGxpY2F0aW9uJyk7XG5tb2R1bGUuZXhwb3J0cyA9IFZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICB0ZW1wbGF0ZSA6IHJlcXVpcmUoJy4vdGVtcGxhdGVzL3NlbGVjdE5hdi5oYnMnKSxcbiAgICAvLyBUaGUgRE9NIGV2ZW50cyBzcGVjaWZpYyB0byBhIGNvbmNlcHQuXG4gICAgZXZlbnRzOiB7XG4gICAgICAnY2hhbmdlICNzZWxlY3ROYXYnOiAnc2VsZWN0TmF2JyxcbiAgICAgICdjaGFuZ2UgI3NlbGVjdFRoZXNhdXJ1cyc6ICdzZWxlY3RUaGVzYXVydXMnLFxuICAgIH0sXG4gICAgLy9cbiAgICBhZnRlckluaXQ6IGZ1bmN0aW9uIGFmdGVySW5pdFNlbGVjdE5hdigpe1xuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdkYXRhQ2hhbmdlZCcsIHRoaXMucmVuZGVyKTtcbiAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCAndmlld1R5cGVDaGFuZ2VkJywgdGhpcy5yZW5kZXIpO1xuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICd0aGVzYXVydXNDaGFuZ2VkJywgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgLy9cbiAgICBnZXRSZW5kZXJEYXRhOiBmdW5jdGlvbiBnZXRSZW5kZXJEYXRhU2VsZWN0TmF2KCl7XG4gICAgICByZXR1cm57XG4gICAgICAgIHZpZXdUeXBlcyA6IHRoaXMuY29sbGVjdGlvbi5nZXRWaWV3VHlwZXMoKSxcbiAgICAgICAgdGhlc2F1cmkgOiB0aGlzLmNvbGxlY3Rpb24uZ2V0VGhlc2F1cmkoKVxuICAgICAgfTtcbiAgICB9LFxuICAgIC8vICBcbiAgICBzZWxlY3ROYXY6IGZ1bmN0aW9uIHNlbGVjdE5hdihldmVudCkgeyAgICAgIFxuICAgICAgdGhpcy5jb2xsZWN0aW9uLnNldFZpZXdUeXBlKE51bWJlcigkKGV2ZW50LnRhcmdldCkudmFsKCkpKTtcbiAgICB9LFxuICAgIC8vICBcbiAgICBzZWxlY3RUaGVzYXVydXM6IGZ1bmN0aW9uIHNlbGVjdFRoZXNhdXJ1cyhldmVudCkgeyAgICAgIFxuICAgICAgLy90aGlzLmNvbGxlY3Rpb24uc2V0QWN0aXZlVGhlc2F1cnVzKCQoZXZlbnQudGFyZ2V0KS52YWwoKSk7XG4gICAgICAvL3RoaXMuY29sbGVjdGlvbi5sb2FkVGhlc2F1cnVzKCk7XG4gICAgICB2YXIgdXJpID0gdGhpcy5jb2xsZWN0aW9uLmdldFRoZXNhdXJ1c1dpdGhOYW1lZElkKCQoZXZlbnQudGFyZ2V0KS52YWwoKSkuaWQ7XG4gICAgICBhcHBsaWNhdGlvbi5yb3V0ZXIubmF2aWdhdGUoYXBwbGljYXRpb24ucHJvY2Vzc1VyaSh1cmkpLCB7dHJpZ2dlciA6IHRydWV9KTtcbiAgICB9XG5cbn0pOyIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgaGVscGVyLCBoZWxwZXJNaXNzaW5nPWhlbHBlcnMuaGVscGVyTWlzc2luZywgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJcXG4gICAgPG5hdj5cXG4gICAgICA8YSBjbGFzcz1cXFwicHJldlxcXCIgaHJlZj1cXFwiL1xcXCI+PDwvYT5cXG4gICAgICA8YSBjbGFzcz1cXFwibmV4dFxcXCIgaHJlZj1cXFwiL1xcXCI+PjwvYT4gICAgICBcXG4gICAgPC9uYXY+XFxuICAgIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXIsIG9wdGlvbnM7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgxPlwiO1xuICBzdGFjazEgPSAoaGVscGVyID0gaGVscGVycy5sYWJlbF93aXRoX2xhbmd1YWdlIHx8IChkZXB0aDAgJiYgZGVwdGgwLmxhYmVsX3dpdGhfbGFuZ3VhZ2UpLG9wdGlvbnM9e2hhc2g6e30sZGF0YTpkYXRhfSxoZWxwZXIgPyBoZWxwZXIuY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLnByZWZMYWJlbCksIChkZXB0aDAgJiYgZGVwdGgwLmxhbmd1YWdlKSwgb3B0aW9ucykgOiBoZWxwZXJNaXNzaW5nLmNhbGwoZGVwdGgwLCBcImxhYmVsX3dpdGhfbGFuZ3VhZ2VcIiwgKGRlcHRoMCAmJiBkZXB0aDAucHJlZkxhYmVsKSwgKGRlcHRoMCAmJiBkZXB0aDAubGFuZ3VhZ2UpLCBvcHRpb25zKSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gxPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXIsIG9wdGlvbnM7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgyPjxjb2RlPnNrb3M6ZGVmaW5pdGlvbjwvY29kZT48L2gyPlxcbiAgICAgICAgPHAgY2xhc3M9XFxcImRlZmluaXRpb25cXFwiPlwiO1xuICBzdGFjazEgPSAoaGVscGVyID0gaGVscGVycy50cmFuc2xhdGlvbl9sYWJlbCB8fCAoZGVwdGgwICYmIGRlcHRoMC50cmFuc2xhdGlvbl9sYWJlbCksb3B0aW9ucz17aGFzaDp7fSxkYXRhOmRhdGF9LGhlbHBlciA/IGhlbHBlci5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDBbJ3Nrb3M6ZGVmaW5pdGlvbiddKSwgb3B0aW9ucykgOiBoZWxwZXJNaXNzaW5nLmNhbGwoZGVwdGgwLCBcInRyYW5zbGF0aW9uX2xhYmVsXCIsIChkZXB0aDAgJiYgZGVwdGgwWydza29zOmRlZmluaXRpb24nXSksIG9wdGlvbnMpKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIFwicHJlZkxhYmVsICYmIGNvbmNlcHRcIiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDgsIHByb2dyYW04LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8aDI+PGNvZGU+c2tvczpwcmVmTGFiZWw8L2NvZGU+PC9oMj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLnByZWZMYWJlbCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXIsIG9wdGlvbnM7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8bGk+XCI7XG4gIHN0YWNrMSA9IChoZWxwZXIgPSBoZWxwZXJzLnRyYW5zbGF0aW9uX2xhYmVsIHx8IChkZXB0aDAgJiYgZGVwdGgwLnRyYW5zbGF0aW9uX2xhYmVsKSxvcHRpb25zPXtoYXNoOnt9LGRhdGE6ZGF0YX0saGVscGVyID8gaGVscGVyLmNhbGwoZGVwdGgwLCBkZXB0aDAsIG9wdGlvbnMpIDogaGVscGVyTWlzc2luZy5jYWxsKGRlcHRoMCwgXCJ0cmFuc2xhdGlvbl9sYWJlbFwiLCBkZXB0aDAsIG9wdGlvbnMpKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAoXCI7XG4gIHN0YWNrMSA9IChoZWxwZXIgPSBoZWxwZXJzLnRyYW5zbGF0aW9uX2xhbmd1YWdlIHx8IChkZXB0aDAgJiYgZGVwdGgwLnRyYW5zbGF0aW9uX2xhbmd1YWdlKSxvcHRpb25zPXtoYXNoOnt9LGRhdGE6ZGF0YX0saGVscGVyID8gaGVscGVyLmNhbGwoZGVwdGgwLCBkZXB0aDAsIG9wdGlvbnMpIDogaGVscGVyTWlzc2luZy5jYWxsKGRlcHRoMCwgXCJ0cmFuc2xhdGlvbl9sYW5ndWFnZVwiLCBkZXB0aDAsIG9wdGlvbnMpKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIik8L2xpPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTExKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxoMj48Y29kZT5za29zOmFsdExhYmVsPC9jb2RlPjwvaDI+XFxuICAgICAgICA8dWw+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5hbHRMYWJlbCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEzKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxoMj48Y29kZT5za29zOmhhc1RvcENvbmNlcHQ8L2NvZGU+PC9oMj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuaGFzVG9wQ29uY2VwdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNCwgcHJvZ3JhbTE0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgICA8bGk+PGEgaHJlZj1cXFwiXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiIGNsYXNzPVxcXCJsaW5rXFxcIj5cIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvYT48L2xpPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgyPjxjb2RlPnNrb3M6YnJvYWRlcjwvY29kZT48L2gyPlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5wYXJlbnRzKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE3LCBwcm9ncmFtMTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICAgIDxsaSBjbGFzcz1cXFwicGFyZW50X1wiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKGRhdGEgPT0gbnVsbCB8fCBkYXRhID09PSBmYWxzZSA/IGRhdGEgOiBkYXRhLmluZGV4KSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxhIGhyZWY9XFxcIlwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBjbGFzcz1cXFwibGlua1xcXCI+XCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2E+PC9saT5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE5KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxoMj5DaGlsZHJlbiA8Y29kZT5za29zOm5hcnJvd2VyPC9jb2RlPjwvaDI+XFxuICAgICAgICA8dWw+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5uYXJyb3dlciksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMCwgcHJvZ3JhbTIwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgPGxpPjxhIGhyZWY9XFxcIlwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBjbGFzcz1cXFwibGlua1xcXCI+XCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2E+PC9saT5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8aDI+PGNvZGU+c2tvczpleGFjdE1hdGNoPC9jb2RlPjwvaDI+XFxuICAgICAgICA8dWw+XFxuICAgICAgXHRcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5leGFjdE1hdGNoKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIzLCBwcm9ncmFtMjMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMjMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgb3B0aW9ucztcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcdDxsaT48YSBocmVmPVxcXCJcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgXCI7XG4gIHN0YWNrMSA9IChoZWxwZXIgPSBoZWxwZXJzLmlzX2ludGVybmFsX2xpbmsgfHwgKGRlcHRoMCAmJiBkZXB0aDAuaXNfaW50ZXJuYWxfbGluayksb3B0aW9ucz17aGFzaDp7fSxkYXRhOmRhdGF9LGhlbHBlciA/IGhlbHBlci5jYWxsKGRlcHRoMCwgZGVwdGgwLCBvcHRpb25zKSA6IGhlbHBlck1pc3NpbmcuY2FsbChkZXB0aDAsIFwiaXNfaW50ZXJuYWxfbGlua1wiLCBkZXB0aDAsIG9wdGlvbnMpKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIj5cIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvYT48L2xpPlxcbiAgICAgXHQgXHRcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgyPjxjb2RlPnNrb3M6Y2xvc2VNYXRjaDwvY29kZT48L2gyPlxcbiAgICAgICAgPHVsPlxcbiAgICAgIFx0XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuY2xvc2VNYXRjaCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMywgcHJvZ3JhbTIzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImNvbmNlcHQgXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmZvbGRlZENsYXNzKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmZvbGRlZENsYXNzKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gIDxoZWFkZXIgY2xhc3M9XFxcIlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5jb25jZXB0U2NoZW1lQ2xhc3MpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuY29uY2VwdFNjaGVtZUNsYXNzKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgPGEgY2xhc3M9XFxcImNsb3NlXFxcIiBocmVmPVxcXCIvXFxcIj5YPC9hPlxcbiAgICA8cCBjbGFzcz1cXFwiY29udGV4dFxcXCI+PGEgaHJlZj1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmNvbmNlcHRTY2hlbWUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuY29uY2VwdFNjaGVtZSk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgY2xhc3M9XFxcImxpbmtcXFwiPlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5jb25jZXB0U2NoZW1lKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmNvbmNlcHRTY2hlbWUpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2E+PC9wPlxcbiAgPC9oZWFkZXI+XFxuICA8ZGl2IGNsYXNzPVxcXCJib2R5XFxcIj5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmNvbmNlcHQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDxoZ3JvdXA+XFxuICAgICAgPGNvZGU+XCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLnR5cGUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudHlwZSk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvY29kZT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAucHJlZkxhYmVsKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxwPlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy51cmkpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudXJpKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcblxcbiAgICA8L2hncm91cD5cXG4gICAgPGRldGFpbD5cXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDBbJ3Nrb3M6ZGVmaW5pdGlvbiddKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5jb25jZXB0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5hbHRMYWJlbCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMSwgcHJvZ3JhbTExLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5oYXNUb3BDb25jZXB0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEzLCBwcm9ncmFtMTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLnBhcmVudHMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAubmFycm93ZXIpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTksIHByb2dyYW0xOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuZXhhY3RNYXRjaCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMiwgcHJvZ3JhbTIyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5jbG9zZU1hdGNoKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI1LCBwcm9ncmFtMjUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgIDwvZGV0YWlsPlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjx1bD5cXG5cdDxsaT48YSBocmVmPVxcXCJodHRwOi8vd3d3LnBoaWxoYXJtb25pZWRlcGFyaXMuZnJcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj48aW1nIHNyYz1cXFwiaW1hZ2VzL2xvZ29zL3BoaWxoYXJtb25pZS5wbmdcXFwiIGFsdD1cXFwiUGhpbGhhcm1vbmllIGRlIFBhcmlzXFxcIiAvPjwvYT48L2xpPlxcblx0PGxpPjxhIGhyZWY9XFxcImh0dHA6Ly93d3cuZWQuYWMudWtcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj48aW1nIHNyYz1cXFwiaW1hZ2VzL2xvZ29zL2VkaW5idXJnaC5wbmdcXFwiIGFsdD1cXFwiVGhlIFVuaXZlcnNpdHkgb2YgRWRpbmJ1cmdoXFxcIiAvPjwvYT48L2xpPlxcblx0PGxpPjxhIGhyZWY9XFxcImh0dHA6Ly93d3cuZ25tLmRlXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+PGltZyBzcmM9XFxcImltYWdlcy9sb2dvcy9nbm0ucG5nXFxcIiBhbHQ9XFxcIkdlcm1hbmlzY2hlcyBOYXRpb25hbCBNdXNldW1cXFwiIC8+PC9hPjwvbGk+XFxuXHQ8bGk+PGEgaHJlZj1cXFwiaHR0cDovL3d3dy5taW0uYmVcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj48aW1nIHNyYz1cXFwiaW1hZ2VzL2xvZ29zL21pbS5wbmdcXFwiIGFsdD1cXFwiTXVzaWsgSW5zdHJ1bWVudGVuIE11c2V1bVxcXCIgLz48L2E+PC9saT5cXG5cdDxsaT48YSBocmVmPVxcXCJodHRwOi8vbmV0d29yay5pY29tLm11c2V1bS9jaW1jaW0vXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+PGltZyBzcmM9XFxcImltYWdlcy9sb2dvcy9pY29tLnBuZ1xcXCIgYWx0PVxcXCJJbnRlcm5hdGlvbmFsIENvdW5jaWwgb2YgTXVzZXVtc1xcXCIgLz48L2E+PC9saT5cXG48L3VsPlwiO1xuICB9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8YSBocmVmPVxcXCIvXFxcIj48aW1nIHNyYz1cXFwiL2ltYWdlcy9sb2dvcy9taW1vLnBuZ1xcXCIgYWx0PVxcXCJNSU1PIC0gTXVzaWNhbCBJbnN0cnVtZW50cyBNdXNldW1zIE9ubGluZVxcXCIgLz48L2E+XCI7XG4gIH0pO1xuIiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKFwiaGJzZnkvcnVudGltZVwiKTtcbnZhciBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi9hcHBsaWNhdGlvblwiKTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbGFiZWxfd2l0aF9sYW5ndWFnZScsIGZ1bmN0aW9uKGxhYmVscywgbGFuZ3VhZ2UpIHtcblx0Ly9pZiBhIGxhbmd1YWdlIGlzIHNwZWNpZmllZCBcblxuXHRpZihsYW5ndWFnZSkge1xuXHRcdHZhciBmaWx0ZXJlZExhYmVscyA9IGxhYmVscy5maWx0ZXIoZnVuY3Rpb24oZWxlbWVudCl7XG5cdFx0XHRyZXR1cm4gZWxlbWVudFtcIkBsYW5ndWFnZVwiXSA9PT0gbGFuZ3VhZ2U7XG5cdFx0fSlcblx0XHRpZihmaWx0ZXJlZExhYmVsc1swXSkgcmV0dXJuIGZpbHRlcmVkTGFiZWxzWzBdW1wiQHZhbHVlXCJdO1xuXHR9XG5cdFxuXHQvL290aGVyd2lzZSBnZXQgXCJwaXZvdFwiIGVsZW1lbnQsIHRoZSBvbmx5IG9uZSB3aGljaCBpcyBhIHN0cmluZyBcblx0XG5cdHZhciBmaWx0ZXJlZExhYmVscyA9IGxhYmVscy5maWx0ZXIoZnVuY3Rpb24oZWxlbWVudCl7XG5cdFx0cmV0dXJuIHR5cGVvZiBlbGVtZW50ID09PSBcInN0cmluZ1wiO1xuXHR9KVxuXHRyZXR1cm4gZmlsdGVyZWRMYWJlbHNbMF07XG5cdFxuXHRyZXR1cm4gXCJcIjtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd0cmFuc2xhdGlvbl9sYW5ndWFnZScsIGZ1bmN0aW9uKGxhYmVsT2JqZWN0KSB7XG5cdGlmICghbGFiZWxPYmplY3QpIHJldHVybjtcblx0Ly9zcGVjaWZpYyB0byBNSU1PIHRoZXNhdXJ1cywgcGl2b3QgbGFuZ3VhZ2UgaGFzIG5vIGxhbmd1YWdlIGF0dHJpYnV0ZSBcblx0Ly8oaXQncyBhIGNvbnZlbnRpb24sIG5vdCBhIHJlYWwgbGFuZ3VhZ2UpXG5cdGlmICh0eXBlb2YgbGFiZWxPYmplY3QgID09PSBcInN0cmluZ1wiKSByZXR1cm4gXCJwaXZvdFwiO1xuXHRyZXR1cm4gbGFiZWxPYmplY3RbXCJAbGFuZ3VhZ2VcIl07XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigndHJhbnNsYXRpb25fbGFiZWwnLCBmdW5jdGlvbihsYWJlbE9iamVjdCkge1xuXHRpZiAoIWxhYmVsT2JqZWN0KSByZXR1cm47XG5cdC8vc3BlY2lmaWMgdG8gTUlNTyB0aGVzYXVydXMsIHBpdm90IGxhbmd1YWdlIGhhcyBubyBsYW5ndWFnZSBhdHRyaWJ1dGUgXG5cdC8vKGl0J3MgYSBjb252ZW50aW9uLCBub3QgYSByZWFsIGxhbmd1YWdlKVxuXHRpZiAodHlwZW9mIGxhYmVsT2JqZWN0ICA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIGxhYmVsT2JqZWN0O1xuXHRyZXR1cm4gbGFiZWxPYmplY3RbXCJAdmFsdWVcIl07XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigncHJvcGVydGllc19saXN0JywgZnVuY3Rpb24ocHJvcGVydHkpIHtcbiAgXHRpZihBcnJheS5pc0FycmF5KHByb3BlcnR5KSkgcmV0dXJuIHByb3BlcnR5O1xuICBcdHJldHVybiBbcHJvcGVydHldO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3Byb2Nlc3NfdXJpJywgZnVuY3Rpb24odXJpKSB7XG5cdGlmKCF1cmkpIHJldHVybjtcblx0cmV0dXJuIGFwcGxpY2F0aW9uLnByb2Nlc3NVcmkodXJpKTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdpc19pbnRlcm5hbF9saW5rJywgZnVuY3Rpb24odXJpKSB7XG5cdGlmKCF1cmkpIHJldHVybjtcbiAgXHRpZihhcHBsaWNhdGlvbi5jb2xsZWN0aW9uLm1hdGNoQW55VGhlc2F1cnVzKHVyaSkpe1xuICBcdFx0cmV0dXJuIFwiIGNsYXNzPSdsaW5rJ1wiO1xuICBcdH1lbHNle1xuICBcdFx0cmV0dXJuIFwiIHRhcmdldD0nX2JsYW5rJ1wiO1xuICBcdH1cbn0pOyIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJob21lXFxcIiBzdHlsZT1cXFwiYmFja2dyb3VuZDp1cmwoJ2ltYWdlcy9pbnRlcm5hdGlvbmFsMS5qcGcnKSBsZWZ0IHRvcCBuby1yZXBlYXQgZml4ZWQ7XFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImJveCBpbnRlcm5hdGlvbmFsXFxcIj5cXG5cdFx0PGEgaHJlZj1cXFwiaHR0cDovL3d3dy5taW1vLWludGVybmF0aW9uYWwuY29tL01JTU8vXFxcIiBzdHlsZT1cXFwiYmFja2dyb3VuZDogdXJsKCdpbWFnZXMvaW50ZXJuYXRpb25hbDEuanBnJykgbGVmdCB0b3Agbm8tcmVwZWF0IGZpeGVkOyBcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInRleHRcXFwiPlxcblx0XHRcdFx0PGgyPk1JTU8gSW50ZXJuYXRpb25hbDwvaDI+XFxuXHRcdFx0XHQ8cD48c3Bhbj5FeHBsb3JlIHRoZSB3b3JsZCBjb2xsZWN0aW9ucyBvZiBtdXNpY2FsIGluc3RydW1lbnRzLiBNb3JlIHRoYW4gNTUwMDAgaW5zdHJ1bWVudHMuLi48L3NwYW4+PC9wPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2E+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcImJveCB0aGVzYXVydXNcXFwiPlxcblx0XHQ8YSBocmVmPVxcXCJJbnN0cnVtZW50c0tleXdvcmRzL1xcXCIgc3R5bGU9XFxcImJhY2tncm91bmQ6dXJsKCdpbWFnZXMvdml6c2tvcy5wbmcnKSAgbGVmdCB0b3Agbm8tcmVwZWF0IGZpeGVkO1xcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwidGV4dFxcXCI+XFxuXHRcdFx0XHQ8aDI+VklaU0tPUzwvaDI+XFxuXHRcdFx0XHQ8cD48c3Bhbj5WaWV3IE1JTU8gdGhlc2F1cnVzIGFuZCBIb3JuYm9zdGVsICZhbXA7IFNhY2hzIGNsYXNzaWZmaWNhdGlvbiBpbiBTS09TPC9zcGFuPjwvcD5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9hPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJib3ggYWRtaW5cXFwiPlxcblx0XHQ8YSBocmVmPVxcXCJodHRwOi8vd3d3Lm1pbW8tZGIuZXUvbWltby9pbmZvZG9jL3BhZ2UtZGFjY3VlaWwtaW5mb2RvYy5hc3B4P19sZz1FTi1lblxcXCIgc3R5bGU9XFxcImJhY2tncm91bmQ6dXJsKCdpbWFnZXMvaW50ZXJuYXRpb25hbDMuanBnJykgbGVmdCB0b3Agbm8tcmVwZWF0IGZpeGVkOyBcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcInRleHRcXFwiPlxcblx0XHRcdFx0PGgyPk1JTU8gREI8L2gyPlxcblx0XHRcdFx0PHA+PHNwYW4+TUlNTyBhZG1pbjwvc3Bhbj48L3A+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvYT5cXG5cdDwvZGl2PlxcblxcbjwvZGl2PlwiO1xuICB9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8bWFpbiBjbGFzcz1cXFwibWFpblxcXCI+XFxuICA8aGVhZGVyPlxcbiAgXHQ8ZGl2IGNsYXNzPVxcXCJsb2dvXFxcIj48L2Rpdj5cXG4gIFx0PG5hdiBjbGFzcz1cXFwidG9vbHNcXFwiPjwvbmF2PlxcbiAgPC9oZWFkZXI+XFxuICBcXG4gIDxuYXYgY2xhc3M9XFxcIm5hdlxcXCI+XFxuICAgIFxcbiAgPC9uYXY+XFxuICA8YXJ0aWNsZT48L2FydGljbGU+XFxuPC9tYWluPlxcbjxmb290ZXI+PC9mb290ZXI+XCI7XG4gIH0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgaGVscGVyO1xuICBidWZmZXIgKz0gXCJcXG4gIFx0XHQ8b3B0aW9uIHZhbHVlPVxcXCJcIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubmFtZWRfaWQpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAubmFtZWRfaWQpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiID5cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubmFtZSkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5uYW1lKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvb3B0aW9uPlxcblx0XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIHNlbGVjdGVkPVxcXCJzZWxlY3RlZFxcXCIgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiXFxuICBcdFx0PG9wdGlvbiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmlkKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiA+XCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLm5hbWUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAubmFtZSk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L29wdGlvbj5cXG5cdFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGZvcm0+XFxuXHQ8c2VsZWN0IGlkPVxcXCJzZWxlY3RUaGVzYXVydXNcXFwiIG5hbWU9XFxcInNlbGVjdFRoZXNhdXJ1c1xcXCI+XFxuXHRcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC50aGVzYXVyaSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cdDwvc2VsZWN0PjxiciAvPlxcblx0PHNlbGVjdCBpZD1cXFwic2VsZWN0TmF2XFxcIiBuYW1lPVxcXCJzZWxlY3ROYXZcXFwiPlxcblx0XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAudmlld1R5cGVzKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblx0PC9zZWxlY3Q+XFxuXHQ8IS0tPGlucHV0IG5hbWU9XFxcInNlYXJjaFxcXCIgaWQ9XFxcInNlYXJjaFxcXCIgcGxhY2Vob2xkZXI9XFxcIlJlY2hlcmNoZXJcXFwiIC8+LS0+XFxuPC9mb3JtPlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KTtcbiIsInZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL3RlbXBsYXRlcy9oZWxwZXJzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiBpbml0aWFsaXplVmlldygpIHtcbiAgICBfLmJpbmRBbGwodGhpcywgJ3RlbXBsYXRlJywgJ2dldFJlbmRlckRhdGEnLCAncmVuZGVyJywgJ2FmdGVyUmVuZGVyJyk7XG4gICAgdGhpcy5hZnRlckluaXQoKTtcbiAgfSxcbiAgYWZ0ZXJJbml0OiBmdW5jdGlvbiBhZnRlckluaXRWaWV3KCkge30sXG4gIHRlbXBsYXRlOiBmdW5jdGlvbiB0ZW1wbGF0ZVZpZXcoKSB7fSxcbiAgZ2V0UmVuZGVyRGF0YTogZnVuY3Rpb24gZ2V0UmVuZGVyRGF0YVZpZXcoKSB7fSxcblxuICByZW5kZXI6IGZ1bmN0aW9uIHJlbmRlclZpZXcoKSB7XG4gICAgdGhpcy4kZWwuZW1wdHkoKTtcbiAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5nZXRSZW5kZXJEYXRhKCkpKTtcbiAgICBfLmRlZmVyKHRoaXMuYWZ0ZXJSZW5kZXIpOyAvL3NldFRpbWVPdXQoMClcbiAgfSxcblxuICBhZnRlclJlbmRlcjogZnVuY3Rpb24gYWZ0ZXJSZW5kZXJWaWV3KCkge31cbn0pOyIsbnVsbCwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInNmYXV1UFwiKSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuLypnbG9iYWxzIEhhbmRsZWJhcnM6IHRydWUgKi9cbnZhciBiYXNlID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9iYXNlXCIpO1xuXG4vLyBFYWNoIG9mIHRoZXNlIGF1Z21lbnQgdGhlIEhhbmRsZWJhcnMgb2JqZWN0LiBObyBuZWVkIHRvIHNldHVwIGhlcmUuXG4vLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL3V0aWxzXCIpO1xudmFyIHJ1bnRpbWUgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL3J1bnRpbWVcIik7XG5cbi8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxudmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaGIgPSBuZXcgYmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoaGIsIGJhc2UpO1xuICBoYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcbiAgaGIuRXhjZXB0aW9uID0gRXhjZXB0aW9uO1xuICBoYi5VdGlscyA9IFV0aWxzO1xuXG4gIGhiLlZNID0gcnVudGltZTtcbiAgaGIudGVtcGxhdGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgaGIpO1xuICB9O1xuXG4gIHJldHVybiBoYjtcbn07XG5cbnZhciBIYW5kbGViYXJzID0gY3JlYXRlKCk7XG5IYW5kbGViYXJzLmNyZWF0ZSA9IGNyZWF0ZTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBIYW5kbGViYXJzOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIFZFUlNJT04gPSBcIjEuMy4wXCI7XG5leHBvcnRzLlZFUlNJT04gPSBWRVJTSU9OO3ZhciBDT01QSUxFUl9SRVZJU0lPTiA9IDQ7XG5leHBvcnRzLkNPTVBJTEVSX1JFVklTSU9OID0gQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc+PSAxLjAuMCdcbn07XG5leHBvcnRzLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xudmFyIGlzQXJyYXkgPSBVdGlscy5pc0FycmF5LFxuICAgIGlzRnVuY3Rpb24gPSBVdGlscy5pc0Z1bmN0aW9uLFxuICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5mdW5jdGlvbiBIYW5kbGViYXJzRW52aXJvbm1lbnQoaGVscGVycywgcGFydGlhbHMpIHtcbiAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xuXG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59XG5cbmV4cG9ydHMuSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O0hhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXG5cbiAgbG9nZ2VyOiBsb2dnZXIsXG4gIGxvZzogbG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoaW52ZXJzZSB8fCBmbikgeyB0aHJvdyBuZXcgRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICAgIH1cbiAgfSxcblxuICByZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUsIHN0cikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gc3RyO1xuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0SGVscGVycyhpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZm4odGhpcyk7XG4gICAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICAgIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuICAgICAgICAgICAgZGF0YS5sYXN0ICA9IChpID09PSAoY29udGV4dC5sZW5ndGgtMSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGlmKGRhdGEpIHsgXG4gICAgICAgICAgICAgIGRhdGEua2V5ID0ga2V5OyBcbiAgICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoaSA9PT0gMCl7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoKCFvcHRpb25zLmhhc2guaW5jbHVkZVplcm8gJiYgIWNvbmRpdGlvbmFsKSB8fCBVdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNofSk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICAgIGluc3RhbmNlLmxvZyhsZXZlbCwgY29udGV4dCk7XG4gIH0pO1xufVxuXG52YXIgbG9nZ2VyID0ge1xuICBtZXRob2RNYXA6IHsgMDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcicgfSxcblxuICAvLyBTdGF0ZSBlbnVtXG4gIERFQlVHOiAwLFxuICBJTkZPOiAxLFxuICBXQVJOOiAyLFxuICBFUlJPUjogMyxcbiAgbGV2ZWw6IDMsXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKGxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IGxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5leHBvcnRzLmxvZ2dlciA9IGxvZ2dlcjtcbmZ1bmN0aW9uIGxvZyhsZXZlbCwgb2JqKSB7IGxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH1cblxuZXhwb3J0cy5sb2cgPSBsb2c7dmFyIGNyZWF0ZUZyYW1lID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gIHZhciBvYmogPSB7fTtcbiAgVXRpbHMuZXh0ZW5kKG9iaiwgb2JqZWN0KTtcbiAgcmV0dXJuIG9iajtcbn07XG5leHBvcnRzLmNyZWF0ZUZyYW1lID0gY3JlYXRlRnJhbWU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKG1lc3NhZ2UsIG5vZGUpIHtcbiAgdmFyIGxpbmU7XG4gIGlmIChub2RlICYmIG5vZGUuZmlyc3RMaW5lKSB7XG4gICAgbGluZSA9IG5vZGUuZmlyc3RMaW5lO1xuXG4gICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBub2RlLmZpcnN0Q29sdW1uO1xuICB9XG5cbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxuXG4gIGlmIChsaW5lKSB7XG4gICAgdGhpcy5saW5lTnVtYmVyID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IG5vZGUuZmlyc3RDb2x1bW47XG4gIH1cbn1cblxuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEV4Y2VwdGlvbjsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSByZXF1aXJlKFwiLi9iYXNlXCIpLkNPTVBJTEVSX1JFVklTSU9OO1xudmFyIFJFVklTSU9OX0NIQU5HRVMgPSByZXF1aXJlKFwiLi9iYXNlXCIpLlJFVklTSU9OX0NIQU5HRVM7XG5cbmZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvICYmIGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgY3VycmVudFJldmlzaW9uID0gQ09NUElMRVJfUkVWSVNJT047XG5cbiAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCIpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uOy8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXG5cbmZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk5vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZVwiKTtcbiAgfVxuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIHZhciBpbnZva2VQYXJ0aWFsV3JhcHBlciA9IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIHJlc3VsdCA9IGVudi5WTS5pbnZva2VQYXJ0aWFsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7IHJldHVybiByZXN1bHQ7IH1cblxuICAgIGlmIChlbnYuY29tcGlsZSkge1xuICAgICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB7IGRhdGE6IGRhdGEgIT09IHVuZGVmaW5lZCB9LCBlbnYpO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIGludm9rZVBhcnRpYWw6IGludm9rZVBhcnRpYWxXcmFwcGVyLFxuICAgIHByb2dyYW1zOiBbXSxcbiAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBwcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IHByb2dyYW0oaSwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICAgIHJldCA9IHt9O1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICBVdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgcHJvZ3JhbVdpdGhEZXB0aDogZW52LlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgbm9vcDogZW52LlZNLm5vb3AsXG4gICAgY29tcGlsZXJJbmZvOiBudWxsXG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgbmFtZXNwYWNlID0gb3B0aW9ucy5wYXJ0aWFsID8gb3B0aW9ucyA6IGVudixcbiAgICAgICAgaGVscGVycyxcbiAgICAgICAgcGFydGlhbHM7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgaGVscGVycyA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIHBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKFxuICAgICAgICAgIGNvbnRhaW5lcixcbiAgICAgICAgICBuYW1lc3BhY2UsIGNvbnRleHQsXG4gICAgICAgICAgaGVscGVycyxcbiAgICAgICAgICBwYXJ0aWFscyxcbiAgICAgICAgICBvcHRpb25zLmRhdGEpO1xuXG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGVudi5WTS5jaGVja1JldmlzaW9uKGNvbnRhaW5lci5jb21waWxlckluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbmV4cG9ydHMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtmdW5jdGlvbiBwcm9ncmFtV2l0aERlcHRoKGksIGZuLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgfTtcbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICByZXR1cm4gcHJvZztcbn1cblxuZXhwb3J0cy5wcm9ncmFtV2l0aERlcHRoID0gcHJvZ3JhbVdpdGhEZXB0aDtmdW5jdGlvbiBwcm9ncmFtKGksIGZuLCBkYXRhKSB7XG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhKTtcbiAgfTtcbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW0gPSBwcm9ncmFtO2Z1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgdmFyIG9wdGlvbnMgPSB7IHBhcnRpYWw6IHRydWUsIGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnRzLmludm9rZVBhcnRpYWwgPSBpbnZva2VQYXJ0aWFsO2Z1bmN0aW9uIG5vb3AoKSB7IHJldHVybiBcIlwiOyB9XG5cbmV4cG9ydHMubm9vcCA9IG5vb3A7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIlwiICsgdGhpcy5zdHJpbmc7XG59O1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IFNhZmVTdHJpbmc7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmpzaGludCAtVzAwNCAqL1xudmFyIFNhZmVTdHJpbmcgPSByZXF1aXJlKFwiLi9zYWZlLXN0cmluZ1wiKVtcImRlZmF1bHRcIl07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG5mdW5jdGlvbiBlc2NhcGVDaGFyKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqLCB2YWx1ZSkge1xuICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgIGlmKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwga2V5KSkge1xuICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmV4dGVuZCA9IGV4dGVuZDt2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuZXhwb3J0cy50b1N0cmluZyA9IHRvU3RyaW5nO1xuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuaWYgKGlzRnVuY3Rpb24oL3gvKSkge1xuICBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9O1xufVxudmFyIGlzRnVuY3Rpb247XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JykgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIFNhZmVTdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSBpZiAoIXN0cmluZyAmJiBzdHJpbmcgIT09IDApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gIHN0cmluZyA9IFwiXCIgKyBzdHJpbmc7XG5cbiAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmV4cG9ydHMuZXNjYXBlRXhwcmVzc2lvbiA9IGVzY2FwZUV4cHJlc3Npb247ZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSkge1xuICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydHMuaXNFbXB0eSA9IGlzRW1wdHk7IiwiLy8gQ3JlYXRlIGEgc2ltcGxlIHBhdGggYWxpYXMgdG8gYWxsb3cgYnJvd3NlcmlmeSB0byByZXNvbHZlXG4vLyB0aGUgcnVudGltZSBvbiBhIHN1cHBvcnRlZCBwYXRoLlxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZScpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpW1wiZGVmYXVsdFwiXTtcbiIsIi8vIElnbm9yZSBtb2R1bGUgZm9yIGJyb3dzZXJpZnkgKHNlZSBwYWNrYWdlLmpzb24pIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxfX2Rpcm5hbWUpe1xuLyoqXG4gKiBBIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIEpTT04tTEQgQVBJLlxuICpcbiAqIEBhdXRob3IgRGF2ZSBMb25nbGV5XG4gKlxuICogQlNEIDMtQ2xhdXNlIExpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxMS0yMDE0IERpZ2l0YWwgQmF6YWFyLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICogbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG4gKlxuICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlLFxuICogdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAqXG4gKiBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodFxuICogbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZVxuICogZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cbiAqXG4gKiBOZWl0aGVyIHRoZSBuYW1lIG9mIHRoZSBEaWdpdGFsIEJhemFhciwgSW5jLiBub3IgdGhlIG5hbWVzIG9mIGl0c1xuICogY29udHJpYnV0b3JzIG1heSBiZSB1c2VkIHRvIGVuZG9yc2Ugb3IgcHJvbW90ZSBwcm9kdWN0cyBkZXJpdmVkIGZyb21cbiAqIHRoaXMgc29mdHdhcmUgd2l0aG91dCBzcGVjaWZpYyBwcmlvciB3cml0dGVuIHBlcm1pc3Npb24uXG4gKlxuICogVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTXG4gKiBJU1wiIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEXG4gKiBUTywgVEhFIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEFcbiAqIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIENPUFlSSUdIVFxuICogSE9MREVSIE9SIENPTlRSSUJVVE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLFxuICogU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEXG4gKiBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUzsgTE9TUyBPRiBVU0UsIERBVEEsIE9SXG4gKiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORCBPTiBBTlkgVEhFT1JZIE9GXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlQgKElOQ0xVRElOR1xuICogTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRiBUSElTXG4gKiBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiAqL1xuKGZ1bmN0aW9uKCkge1xuXG4vLyBkZXRlcm1pbmUgaWYgaW4tYnJvd3NlciBvciB1c2luZyBub2RlLmpzXG52YXIgX25vZGVqcyA9IChcbiAgdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MudmVyc2lvbnMgJiYgcHJvY2Vzcy52ZXJzaW9ucy5ub2RlKTtcbnZhciBfYnJvd3NlciA9ICFfbm9kZWpzICYmXG4gICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcpO1xuaWYoX2Jyb3dzZXIpIHtcbiAgaWYodHlwZW9mIGdsb2JhbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZih0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZ2xvYmFsID0gd2luZG93O1xuICAgIH0gZWxzZSBpZih0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGdsb2JhbCA9IHNlbGY7XG4gICAgfSBlbHNlIGlmKHR5cGVvZiAkICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZ2xvYmFsID0gJDtcbiAgICB9XG4gIH1cbn1cblxuLy8gYXR0YWNoZXMganNvbmxkIEFQSSB0byB0aGUgZ2l2ZW4gb2JqZWN0XG52YXIgd3JhcHBlciA9IGZ1bmN0aW9uKGpzb25sZCkge1xuXG4vKiBDb3JlIEFQSSAqL1xuXG4vKipcbiAqIFBlcmZvcm1zIEpTT04tTEQgY29tcGFjdGlvbi5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgaW5wdXQgdG8gY29tcGFjdC5cbiAqIEBwYXJhbSBjdHggdGhlIGNvbnRleHQgdG8gY29tcGFjdCB3aXRoLlxuICogQHBhcmFtIFtvcHRpb25zXSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtiYXNlXSB0aGUgYmFzZSBJUkkgdG8gdXNlLlxuICogICAgICAgICAgW2NvbXBhY3RBcnJheXNdIHRydWUgdG8gY29tcGFjdCBhcnJheXMgdG8gc2luZ2xlIHZhbHVlcyB3aGVuXG4gKiAgICAgICAgICAgIGFwcHJvcHJpYXRlLCBmYWxzZSBub3QgdG8gKGRlZmF1bHQ6IHRydWUpLlxuICogICAgICAgICAgW2dyYXBoXSB0cnVlIHRvIGFsd2F5cyBvdXRwdXQgYSB0b3AtbGV2ZWwgZ3JhcGggKGRlZmF1bHQ6IGZhbHNlKS5cbiAqICAgICAgICAgIFtleHBhbmRDb250ZXh0XSBhIGNvbnRleHQgdG8gZXhwYW5kIHdpdGguXG4gKiAgICAgICAgICBbc2tpcEV4cGFuc2lvbl0gdHJ1ZSB0byBhc3N1bWUgdGhlIGlucHV0IGlzIGV4cGFuZGVkIGFuZCBza2lwXG4gKiAgICAgICAgICAgIGV4cGFuc2lvbiwgZmFsc2Ugbm90IHRvLCBkZWZhdWx0cyB0byBmYWxzZS5cbiAqICAgICAgICAgIFtkb2N1bWVudExvYWRlcih1cmwsIGNhbGxiYWNrKGVyciwgcmVtb3RlRG9jKSldIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBjb21wYWN0ZWQsIGN0eCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmpzb25sZC5jb21wYWN0ID0gZnVuY3Rpb24oaW5wdXQsIGN0eCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICByZXR1cm4ganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobmV3IFR5cGVFcnJvcignQ291bGQgbm90IGNvbXBhY3QsIHRvbyBmZXcgYXJndW1lbnRzLicpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGdldCBhcmd1bWVudHNcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGlmKGN0eCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBqc29ubGQubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdUaGUgY29tcGFjdGlvbiBjb250ZXh0IG11c3Qgbm90IGJlIG51bGwuJyxcbiAgICAgICAgJ2pzb25sZC5Db21wYWN0RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgbG9jYWwgY29udGV4dCd9KSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBub3RoaW5nIHRvIGNvbXBhY3RcbiAgaWYoaW5wdXQgPT09IG51bGwpIHtcbiAgICByZXR1cm4ganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobnVsbCwgbnVsbCk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ2Jhc2UnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5iYXNlID0gKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpID8gaW5wdXQgOiAnJztcbiAgfVxuICBpZighKCdjb21wYWN0QXJyYXlzJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuY29tcGFjdEFycmF5cyA9IHRydWU7XG4gIH1cbiAgaWYoISgnZ3JhcGgnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5ncmFwaCA9IGZhbHNlO1xuICB9XG4gIGlmKCEoJ3NraXBFeHBhbnNpb24nIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5za2lwRXhwYW5zaW9uID0gZmFsc2U7XG4gIH1cbiAgaWYoISgnZG9jdW1lbnRMb2FkZXInIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5kb2N1bWVudExvYWRlciA9IGpzb25sZC5sb2FkRG9jdW1lbnQ7XG4gIH1cbiAgaWYoISgnbGluaycgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmxpbmsgPSBmYWxzZTtcbiAgfVxuICBpZihvcHRpb25zLmxpbmspIHtcbiAgICAvLyBmb3JjZSBza2lwIGV4cGFuc2lvbiB3aGVuIGxpbmtpbmcsIFwibGlua1wiIGlzIG5vdCBwYXJ0IG9mIHRoZSBwdWJsaWNcbiAgICAvLyBBUEksIGl0IHNob3VsZCBvbmx5IGJlIGNhbGxlZCBmcm9tIGZyYW1pbmdcbiAgICBvcHRpb25zLnNraXBFeHBhbnNpb24gPSB0cnVlO1xuICB9XG5cbiAgdmFyIGV4cGFuZCA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGlmKG9wdGlvbnMuc2tpcEV4cGFuc2lvbikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgaW5wdXQpO1xuICAgICAgfVxuICAgICAganNvbmxkLmV4cGFuZChpbnB1dCwgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIGV4cGFuZCBpbnB1dCB0aGVuIGRvIGNvbXBhY3Rpb25cbiAgZXhwYW5kKGlucHV0LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIGV4cGFuZGVkKSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnQ291bGQgbm90IGV4cGFuZCBpbnB1dCBiZWZvcmUgY29tcGFjdGlvbi4nLFxuICAgICAgICAnanNvbmxkLkNvbXBhY3RFcnJvcicsIHtjYXVzZTogZXJyfSkpO1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3MgY29udGV4dFxuICAgIHZhciBhY3RpdmVDdHggPSBfZ2V0SW5pdGlhbENvbnRleHQob3B0aW9ucyk7XG4gICAganNvbmxkLnByb2Nlc3NDb250ZXh0KGFjdGl2ZUN0eCwgY3R4LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIGFjdGl2ZUN0eCkge1xuICAgICAgaWYoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0NvdWxkIG5vdCBwcm9jZXNzIGNvbnRleHQgYmVmb3JlIGNvbXBhY3Rpb24uJyxcbiAgICAgICAgICAnanNvbmxkLkNvbXBhY3RFcnJvcicsIHtjYXVzZTogZXJyfSkpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY29tcGFjdGVkO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gZG8gY29tcGFjdGlvblxuICAgICAgICBjb21wYWN0ZWQgPSBuZXcgUHJvY2Vzc29yKCkuY29tcGFjdChhY3RpdmVDdHgsIG51bGwsIGV4cGFuZGVkLCBvcHRpb25zKTtcbiAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGV4KTtcbiAgICAgIH1cblxuICAgICAgY2xlYW51cChudWxsLCBjb21wYWN0ZWQsIGFjdGl2ZUN0eCwgb3B0aW9ucyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIHBlcmZvcm1zIGNsZWFuIHVwIGFmdGVyIGNvbXBhY3Rpb25cbiAgZnVuY3Rpb24gY2xlYW51cChlcnIsIGNvbXBhY3RlZCwgYWN0aXZlQ3R4LCBvcHRpb25zKSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICB9XG5cbiAgICBpZihvcHRpb25zLmNvbXBhY3RBcnJheXMgJiYgIW9wdGlvbnMuZ3JhcGggJiYgX2lzQXJyYXkoY29tcGFjdGVkKSkge1xuICAgICAgaWYoY29tcGFjdGVkLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAvLyBzaW1wbGlmeSB0byBhIHNpbmdsZSBpdGVtXG4gICAgICAgIGNvbXBhY3RlZCA9IGNvbXBhY3RlZFswXTtcbiAgICAgIH0gZWxzZSBpZihjb21wYWN0ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIHNpbXBsaWZ5IHRvIGFuIGVtcHR5IG9iamVjdFxuICAgICAgICBjb21wYWN0ZWQgPSB7fTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYob3B0aW9ucy5ncmFwaCAmJiBfaXNPYmplY3QoY29tcGFjdGVkKSkge1xuICAgICAgLy8gYWx3YXlzIHVzZSBhcnJheSBpZiBncmFwaCBvcHRpb24gaXMgb25cbiAgICAgIGNvbXBhY3RlZCA9IFtjb21wYWN0ZWRdO1xuICAgIH1cblxuICAgIC8vIGZvbGxvdyBAY29udGV4dCBrZXlcbiAgICBpZihfaXNPYmplY3QoY3R4KSAmJiAnQGNvbnRleHQnIGluIGN0eCkge1xuICAgICAgY3R4ID0gY3R4WydAY29udGV4dCddO1xuICAgIH1cblxuICAgIC8vIGJ1aWxkIG91dHB1dCBjb250ZXh0XG4gICAgY3R4ID0gX2Nsb25lKGN0eCk7XG4gICAgaWYoIV9pc0FycmF5KGN0eCkpIHtcbiAgICAgIGN0eCA9IFtjdHhdO1xuICAgIH1cbiAgICAvLyByZW1vdmUgZW1wdHkgY29udGV4dHNcbiAgICB2YXIgdG1wID0gY3R4O1xuICAgIGN0eCA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0bXAubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmKCFfaXNPYmplY3QodG1wW2ldKSB8fCBPYmplY3Qua2V5cyh0bXBbaV0pLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY3R4LnB1c2godG1wW2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZW1vdmUgYXJyYXkgaWYgb25seSBvbmUgY29udGV4dFxuICAgIHZhciBoYXNDb250ZXh0ID0gKGN0eC5sZW5ndGggPiAwKTtcbiAgICBpZihjdHgubGVuZ3RoID09PSAxKSB7XG4gICAgICBjdHggPSBjdHhbMF07XG4gICAgfVxuXG4gICAgLy8gYWRkIGNvbnRleHQgYW5kL29yIEBncmFwaFxuICAgIGlmKF9pc0FycmF5KGNvbXBhY3RlZCkpIHtcbiAgICAgIC8vIHVzZSAnQGdyYXBoJyBrZXl3b3JkXG4gICAgICB2YXIga3dncmFwaCA9IF9jb21wYWN0SXJpKGFjdGl2ZUN0eCwgJ0BncmFwaCcpO1xuICAgICAgdmFyIGdyYXBoID0gY29tcGFjdGVkO1xuICAgICAgY29tcGFjdGVkID0ge307XG4gICAgICBpZihoYXNDb250ZXh0KSB7XG4gICAgICAgIGNvbXBhY3RlZFsnQGNvbnRleHQnXSA9IGN0eDtcbiAgICAgIH1cbiAgICAgIGNvbXBhY3RlZFtrd2dyYXBoXSA9IGdyYXBoO1xuICAgIH0gZWxzZSBpZihfaXNPYmplY3QoY29tcGFjdGVkKSAmJiBoYXNDb250ZXh0KSB7XG4gICAgICAvLyByZW9yZGVyIGtleXMgc28gQGNvbnRleHQgaXMgZmlyc3RcbiAgICAgIHZhciBncmFwaCA9IGNvbXBhY3RlZDtcbiAgICAgIGNvbXBhY3RlZCA9IHsnQGNvbnRleHQnOiBjdHh9O1xuICAgICAgZm9yKHZhciBrZXkgaW4gZ3JhcGgpIHtcbiAgICAgICAgY29tcGFjdGVkW2tleV0gPSBncmFwaFtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhbGxiYWNrKG51bGwsIGNvbXBhY3RlZCwgYWN0aXZlQ3R4KTtcbiAgfVxufTtcblxuLyoqXG4gKiBQZXJmb3JtcyBKU09OLUxEIGV4cGFuc2lvbi5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgaW5wdXQgdG8gZXhwYW5kLlxuICogQHBhcmFtIFtvcHRpb25zXSB0aGUgb3B0aW9ucyB0byB1c2U6XG4gKiAgICAgICAgICBbYmFzZV0gdGhlIGJhc2UgSVJJIHRvIHVzZS5cbiAqICAgICAgICAgIFtleHBhbmRDb250ZXh0XSBhIGNvbnRleHQgdG8gZXhwYW5kIHdpdGguXG4gKiAgICAgICAgICBba2VlcEZyZWVGbG9hdGluZ05vZGVzXSB0cnVlIHRvIGtlZXAgZnJlZS1mbG9hdGluZyBub2RlcyxcbiAqICAgICAgICAgICAgZmFsc2Ugbm90IHRvLCBkZWZhdWx0cyB0byBmYWxzZS5cbiAqICAgICAgICAgIFtkb2N1bWVudExvYWRlcih1cmwsIGNhbGxiYWNrKGVyciwgcmVtb3RlRG9jKSldIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBleHBhbmRlZCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmpzb25sZC5leHBhbmQgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDEpIHtcbiAgICByZXR1cm4ganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobmV3IFR5cGVFcnJvcignQ291bGQgbm90IGV4cGFuZCwgdG9vIGZldyBhcmd1bWVudHMuJykpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gZ2V0IGFyZ3VtZW50c1xuICBpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZighKCdkb2N1bWVudExvYWRlcicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmxvYWREb2N1bWVudDtcbiAgfVxuICBpZighKCdrZWVwRnJlZUZsb2F0aW5nTm9kZXMnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5rZWVwRnJlZUZsb2F0aW5nTm9kZXMgPSBmYWxzZTtcbiAgfVxuXG4gIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAvLyBpZiBpbnB1dCBpcyBhIHN0cmluZywgYXR0ZW1wdCB0byBkZXJlZmVyZW5jZSByZW1vdGUgZG9jdW1lbnRcbiAgICBpZih0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIgZG9uZSA9IGZ1bmN0aW9uKGVyciwgcmVtb3RlRG9jKSB7XG4gICAgICAgIGlmKGVycikge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYoIXJlbW90ZURvYy5kb2N1bWVudCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgICAnTm8gcmVtb3RlIGRvY3VtZW50IGZvdW5kIGF0IHRoZSBnaXZlbiBVUkwuJyxcbiAgICAgICAgICAgICAgJ2pzb25sZC5OdWxsUmVtb3RlRG9jdW1lbnQnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYodHlwZW9mIHJlbW90ZURvYy5kb2N1bWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJlbW90ZURvYy5kb2N1bWVudCA9IEpTT04ucGFyc2UocmVtb3RlRG9jLmRvY3VtZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgJ0NvdWxkIG5vdCByZXRyaWV2ZSBhIEpTT04tTEQgZG9jdW1lbnQgZnJvbSB0aGUgVVJMLiBVUkwgJyArXG4gICAgICAgICAgICAnZGVyZWZlcmVuY2luZyBub3QgaW1wbGVtZW50ZWQuJywgJ2pzb25sZC5Mb2FkRG9jdW1lbnRFcnJvcicsIHtcbiAgICAgICAgICAgICAgY29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJyxcbiAgICAgICAgICAgICAgY2F1c2U6IGV4LFxuICAgICAgICAgICAgICByZW1vdGVEb2M6IHJlbW90ZURvY1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICBleHBhbmQocmVtb3RlRG9jKTtcbiAgICAgIH07XG4gICAgICB2YXIgcHJvbWlzZSA9IG9wdGlvbnMuZG9jdW1lbnRMb2FkZXIoaW5wdXQsIGRvbmUpO1xuICAgICAgaWYocHJvbWlzZSAmJiAndGhlbicgaW4gcHJvbWlzZSkge1xuICAgICAgICBwcm9taXNlLnRoZW4oZG9uZS5iaW5kKG51bGwsIG51bGwpLCBkb25lKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gbm90aGluZyB0byBsb2FkXG4gICAgZXhwYW5kKHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogbnVsbCwgZG9jdW1lbnQ6IGlucHV0fSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGV4cGFuZChyZW1vdGVEb2MpIHtcbiAgICAvLyBzZXQgZGVmYXVsdCBiYXNlXG4gICAgaWYoISgnYmFzZScgaW4gb3B0aW9ucykpIHtcbiAgICAgIG9wdGlvbnMuYmFzZSA9IHJlbW90ZURvYy5kb2N1bWVudFVybCB8fCAnJztcbiAgICB9XG4gICAgLy8gYnVpbGQgbWV0YS1vYmplY3QgYW5kIHJldHJpZXZlIGFsbCBAY29udGV4dCBVUkxzXG4gICAgdmFyIGlucHV0ID0ge1xuICAgICAgZG9jdW1lbnQ6IF9jbG9uZShyZW1vdGVEb2MuZG9jdW1lbnQpLFxuICAgICAgcmVtb3RlQ29udGV4dDogeydAY29udGV4dCc6IHJlbW90ZURvYy5jb250ZXh0VXJsfVxuICAgIH07XG4gICAgaWYoJ2V4cGFuZENvbnRleHQnIGluIG9wdGlvbnMpIHtcbiAgICAgIHZhciBleHBhbmRDb250ZXh0ID0gX2Nsb25lKG9wdGlvbnMuZXhwYW5kQ29udGV4dCk7XG4gICAgICBpZih0eXBlb2YgZXhwYW5kQ29udGV4dCA9PT0gJ29iamVjdCcgJiYgJ0Bjb250ZXh0JyBpbiBleHBhbmRDb250ZXh0KSB7XG4gICAgICAgIGlucHV0LmV4cGFuZENvbnRleHQgPSBleHBhbmRDb250ZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQuZXhwYW5kQ29udGV4dCA9IHsnQGNvbnRleHQnOiBleHBhbmRDb250ZXh0fTtcbiAgICAgIH1cbiAgICB9XG4gICAgX3JldHJpZXZlQ29udGV4dFVybHMoaW5wdXQsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgaW5wdXQpIHtcbiAgICAgIGlmKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGV4cGFuZGVkO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHByb2Nlc3NvciA9IG5ldyBQcm9jZXNzb3IoKTtcbiAgICAgICAgdmFyIGFjdGl2ZUN0eCA9IF9nZXRJbml0aWFsQ29udGV4dChvcHRpb25zKTtcbiAgICAgICAgdmFyIGRvY3VtZW50ID0gaW5wdXQuZG9jdW1lbnQ7XG4gICAgICAgIHZhciByZW1vdGVDb250ZXh0ID0gaW5wdXQucmVtb3RlQ29udGV4dFsnQGNvbnRleHQnXTtcblxuICAgICAgICAvLyBwcm9jZXNzIG9wdGlvbmFsIGV4cGFuZENvbnRleHRcbiAgICAgICAgaWYoaW5wdXQuZXhwYW5kQ29udGV4dCkge1xuICAgICAgICAgIGFjdGl2ZUN0eCA9IHByb2Nlc3Nvci5wcm9jZXNzQ29udGV4dChcbiAgICAgICAgICAgIGFjdGl2ZUN0eCwgaW5wdXQuZXhwYW5kQ29udGV4dFsnQGNvbnRleHQnXSwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwcm9jZXNzIHJlbW90ZSBjb250ZXh0IGZyb20gSFRUUCBMaW5rIEhlYWRlclxuICAgICAgICBpZihyZW1vdGVDb250ZXh0KSB7XG4gICAgICAgICAgYWN0aXZlQ3R4ID0gcHJvY2Vzc29yLnByb2Nlc3NDb250ZXh0KFxuICAgICAgICAgICAgYWN0aXZlQ3R4LCByZW1vdGVDb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGV4cGFuZCBkb2N1bWVudFxuICAgICAgICBleHBhbmRlZCA9IHByb2Nlc3Nvci5leHBhbmQoXG4gICAgICAgICAgYWN0aXZlQ3R4LCBudWxsLCBkb2N1bWVudCwgb3B0aW9ucywgZmFsc2UpO1xuXG4gICAgICAgIC8vIG9wdGltaXplIGF3YXkgQGdyYXBoIHdpdGggbm8gb3RoZXIgcHJvcGVydGllc1xuICAgICAgICBpZihfaXNPYmplY3QoZXhwYW5kZWQpICYmICgnQGdyYXBoJyBpbiBleHBhbmRlZCkgJiZcbiAgICAgICAgICBPYmplY3Qua2V5cyhleHBhbmRlZCkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgZXhwYW5kZWQgPSBleHBhbmRlZFsnQGdyYXBoJ107XG4gICAgICAgIH0gZWxzZSBpZihleHBhbmRlZCA9PT0gbnVsbCkge1xuICAgICAgICAgIGV4cGFuZGVkID0gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBub3JtYWxpemUgdG8gYW4gYXJyYXlcbiAgICAgICAgaWYoIV9pc0FycmF5KGV4cGFuZGVkKSkge1xuICAgICAgICAgIGV4cGFuZGVkID0gW2V4cGFuZGVkXTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaChleCkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXgpO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2sobnVsbCwgZXhwYW5kZWQpO1xuICAgIH0pO1xuICB9XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIEpTT04tTEQgZmxhdHRlbmluZy5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgdG8gZmxhdHRlbi5cbiAqIEBwYXJhbSBjdHggdGhlIGNvbnRleHQgdG8gdXNlIHRvIGNvbXBhY3QgdGhlIGZsYXR0ZW5lZCBvdXRwdXQsIG9yIG51bGwuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtiYXNlXSB0aGUgYmFzZSBJUkkgdG8gdXNlLlxuICogICAgICAgICAgW2V4cGFuZENvbnRleHRdIGEgY29udGV4dCB0byBleHBhbmQgd2l0aC5cbiAqICAgICAgICAgIFtkb2N1bWVudExvYWRlcih1cmwsIGNhbGxiYWNrKGVyciwgcmVtb3RlRG9jKSldIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBmbGF0dGVuZWQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5qc29ubGQuZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBjdHgsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7XG4gICAgcmV0dXJuIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBmbGF0dGVuLCB0b28gZmV3IGFyZ3VtZW50cy4nKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBnZXQgYXJndW1lbnRzXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfSBlbHNlIGlmKHR5cGVvZiBjdHggPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IGN0eDtcbiAgICBjdHggPSBudWxsO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ2Jhc2UnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5iYXNlID0gKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpID8gaW5wdXQgOiAnJztcbiAgfVxuICBpZighKCdkb2N1bWVudExvYWRlcicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmxvYWREb2N1bWVudDtcbiAgfVxuXG4gIC8vIGV4cGFuZCBpbnB1dFxuICBqc29ubGQuZXhwYW5kKGlucHV0LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIF9pbnB1dCkge1xuICAgIGlmKGVycikge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0NvdWxkIG5vdCBleHBhbmQgaW5wdXQgYmVmb3JlIGZsYXR0ZW5pbmcuJyxcbiAgICAgICAgJ2pzb25sZC5GbGF0dGVuRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICB9XG5cbiAgICB2YXIgZmxhdHRlbmVkO1xuICAgIHRyeSB7XG4gICAgICAvLyBkbyBmbGF0dGVuaW5nXG4gICAgICBmbGF0dGVuZWQgPSBuZXcgUHJvY2Vzc29yKCkuZmxhdHRlbihfaW5wdXQpO1xuICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhleCk7XG4gICAgfVxuXG4gICAgaWYoY3R4ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZmxhdHRlbmVkKTtcbiAgICB9XG5cbiAgICAvLyBjb21wYWN0IHJlc3VsdCAoZm9yY2UgQGdyYXBoIG9wdGlvbiB0byB0cnVlLCBza2lwIGV4cGFuc2lvbilcbiAgICBvcHRpb25zLmdyYXBoID0gdHJ1ZTtcbiAgICBvcHRpb25zLnNraXBFeHBhbnNpb24gPSB0cnVlO1xuICAgIGpzb25sZC5jb21wYWN0KGZsYXR0ZW5lZCwgY3R4LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIGNvbXBhY3RlZCkge1xuICAgICAgaWYoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0NvdWxkIG5vdCBjb21wYWN0IGZsYXR0ZW5lZCBvdXRwdXQuJyxcbiAgICAgICAgICAnanNvbmxkLkZsYXR0ZW5FcnJvcicsIHtjYXVzZTogZXJyfSkpO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2sobnVsbCwgY29tcGFjdGVkKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIEpTT04tTEQgZnJhbWluZy5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgaW5wdXQgdG8gZnJhbWUuXG4gKiBAcGFyYW0gZnJhbWUgdGhlIEpTT04tTEQgZnJhbWUgdG8gdXNlLlxuICogQHBhcmFtIFtvcHRpb25zXSB0aGUgZnJhbWluZyBvcHRpb25zLlxuICogICAgICAgICAgW2Jhc2VdIHRoZSBiYXNlIElSSSB0byB1c2UuXG4gKiAgICAgICAgICBbZXhwYW5kQ29udGV4dF0gYSBjb250ZXh0IHRvIGV4cGFuZCB3aXRoLlxuICogICAgICAgICAgW2VtYmVkXSBkZWZhdWx0IEBlbWJlZCBmbGFnOiAnQGxhc3QnLCAnQGFsd2F5cycsICdAbmV2ZXInLCAnQGxpbmsnXG4gKiAgICAgICAgICAgIChkZWZhdWx0OiAnQGxhc3QnKS5cbiAqICAgICAgICAgIFtleHBsaWNpdF0gZGVmYXVsdCBAZXhwbGljaXQgZmxhZyAoZGVmYXVsdDogZmFsc2UpLlxuICogICAgICAgICAgW3JlcXVpcmVBbGxdIGRlZmF1bHQgQHJlcXVpcmVBbGwgZmxhZyAoZGVmYXVsdDogdHJ1ZSkuXG4gKiAgICAgICAgICBbb21pdERlZmF1bHRdIGRlZmF1bHQgQG9taXREZWZhdWx0IGZsYWcgKGRlZmF1bHQ6IGZhbHNlKS5cbiAqICAgICAgICAgIFtkb2N1bWVudExvYWRlcih1cmwsIGNhbGxiYWNrKGVyciwgcmVtb3RlRG9jKSldIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBmcmFtZWQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5qc29ubGQuZnJhbWUgPSBmdW5jdGlvbihpbnB1dCwgZnJhbWUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBmcmFtZSwgdG9vIGZldyBhcmd1bWVudHMuJykpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gZ2V0IGFyZ3VtZW50c1xuICBpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZighKCdiYXNlJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuYmFzZSA9ICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSA/IGlucHV0IDogJyc7XG4gIH1cbiAgaWYoISgnZG9jdW1lbnRMb2FkZXInIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5kb2N1bWVudExvYWRlciA9IGpzb25sZC5sb2FkRG9jdW1lbnQ7XG4gIH1cbiAgaWYoISgnZW1iZWQnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5lbWJlZCA9ICdAbGFzdCc7XG4gIH1cbiAgb3B0aW9ucy5leHBsaWNpdCA9IG9wdGlvbnMuZXhwbGljaXQgfHwgZmFsc2U7XG4gIGlmKCEoJ3JlcXVpcmVBbGwnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5yZXF1aXJlQWxsID0gdHJ1ZTtcbiAgfVxuICBvcHRpb25zLm9taXREZWZhdWx0ID0gb3B0aW9ucy5vbWl0RGVmYXVsdCB8fCBmYWxzZTtcblxuICBqc29ubGQubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgZnJhbWUgaXMgYSBzdHJpbmcsIGF0dGVtcHQgdG8gZGVyZWZlcmVuY2UgcmVtb3RlIGRvY3VtZW50XG4gICAgaWYodHlwZW9mIGZyYW1lID09PSAnc3RyaW5nJykge1xuICAgICAgdmFyIGRvbmUgPSBmdW5jdGlvbihlcnIsIHJlbW90ZURvYykge1xuICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmKCFyZW1vdGVEb2MuZG9jdW1lbnQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICAgJ05vIHJlbW90ZSBkb2N1bWVudCBmb3VuZCBhdCB0aGUgZ2l2ZW4gVVJMLicsXG4gICAgICAgICAgICAgICdqc29ubGQuTnVsbFJlbW90ZURvY3VtZW50Jyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKHR5cGVvZiByZW1vdGVEb2MuZG9jdW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZW1vdGVEb2MuZG9jdW1lbnQgPSBKU09OLnBhcnNlKHJlbW90ZURvYy5kb2N1bWVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGV4KSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICdDb3VsZCBub3QgcmV0cmlldmUgYSBKU09OLUxEIGRvY3VtZW50IGZyb20gdGhlIFVSTC4gVVJMICcgK1xuICAgICAgICAgICAgJ2RlcmVmZXJlbmNpbmcgbm90IGltcGxlbWVudGVkLicsICdqc29ubGQuTG9hZERvY3VtZW50RXJyb3InLCB7XG4gICAgICAgICAgICAgIGNvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCcsXG4gICAgICAgICAgICAgIGNhdXNlOiBleCxcbiAgICAgICAgICAgICAgcmVtb3RlRG9jOiByZW1vdGVEb2NcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgZG9GcmFtZShyZW1vdGVEb2MpO1xuICAgICAgfTtcbiAgICAgIHZhciBwcm9taXNlID0gb3B0aW9ucy5kb2N1bWVudExvYWRlcihmcmFtZSwgZG9uZSk7XG4gICAgICBpZihwcm9taXNlICYmICd0aGVuJyBpbiBwcm9taXNlKSB7XG4gICAgICAgIHByb21pc2UudGhlbihkb25lLmJpbmQobnVsbCwgbnVsbCksIGRvbmUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBub3RoaW5nIHRvIGxvYWRcbiAgICBkb0ZyYW1lKHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogbnVsbCwgZG9jdW1lbnQ6IGZyYW1lfSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGRvRnJhbWUocmVtb3RlRnJhbWUpIHtcbiAgICAvLyBwcmVzZXJ2ZSBmcmFtZSBjb250ZXh0IGFuZCBhZGQgYW55IExpbmsgaGVhZGVyIGNvbnRleHRcbiAgICB2YXIgZnJhbWUgPSByZW1vdGVGcmFtZS5kb2N1bWVudDtcbiAgICB2YXIgY3R4O1xuICAgIGlmKGZyYW1lKSB7XG4gICAgICBjdHggPSBmcmFtZVsnQGNvbnRleHQnXTtcbiAgICAgIGlmKHJlbW90ZUZyYW1lLmNvbnRleHRVcmwpIHtcbiAgICAgICAgaWYoIWN0eCkge1xuICAgICAgICAgIGN0eCA9IHJlbW90ZUZyYW1lLmNvbnRleHRVcmw7XG4gICAgICAgIH0gZWxzZSBpZihfaXNBcnJheShjdHgpKSB7XG4gICAgICAgICAgY3R4LnB1c2gocmVtb3RlRnJhbWUuY29udGV4dFVybCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY3R4ID0gW2N0eCwgcmVtb3RlRnJhbWUuY29udGV4dFVybF07XG4gICAgICAgIH1cbiAgICAgICAgZnJhbWVbJ0Bjb250ZXh0J10gPSBjdHg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHggPSBjdHggfHwge307XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0eCA9IHt9O1xuICAgIH1cblxuICAgIC8vIGV4cGFuZCBpbnB1dFxuICAgIGpzb25sZC5leHBhbmQoaW5wdXQsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgZXhwYW5kZWQpIHtcbiAgICAgIGlmKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdDb3VsZCBub3QgZXhwYW5kIGlucHV0IGJlZm9yZSBmcmFtaW5nLicsXG4gICAgICAgICAgJ2pzb25sZC5GcmFtZUVycm9yJywge2NhdXNlOiBlcnJ9KSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGV4cGFuZCBmcmFtZVxuICAgICAgdmFyIG9wdHMgPSBfY2xvbmUob3B0aW9ucyk7XG4gICAgICBvcHRzLmlzRnJhbWUgPSB0cnVlO1xuICAgICAgb3B0cy5rZWVwRnJlZUZsb2F0aW5nTm9kZXMgPSB0cnVlO1xuICAgICAganNvbmxkLmV4cGFuZChmcmFtZSwgb3B0cywgZnVuY3Rpb24oZXJyLCBleHBhbmRlZEZyYW1lKSB7XG4gICAgICAgIGlmKGVycikge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAnQ291bGQgbm90IGV4cGFuZCBmcmFtZSBiZWZvcmUgZnJhbWluZy4nLFxuICAgICAgICAgICAgJ2pzb25sZC5GcmFtZUVycm9yJywge2NhdXNlOiBlcnJ9KSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZnJhbWVkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIGRvIGZyYW1pbmdcbiAgICAgICAgICBmcmFtZWQgPSBuZXcgUHJvY2Vzc29yKCkuZnJhbWUoZXhwYW5kZWQsIGV4cGFuZGVkRnJhbWUsIG9wdHMpO1xuICAgICAgICB9IGNhdGNoKGV4KSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbXBhY3QgcmVzdWx0IChmb3JjZSBAZ3JhcGggb3B0aW9uIHRvIHRydWUsIHNraXAgZXhwYW5zaW9uLFxuICAgICAgICAvLyBjaGVjayBmb3IgbGlua2VkIGVtYmVkcylcbiAgICAgICAgb3B0cy5ncmFwaCA9IHRydWU7XG4gICAgICAgIG9wdHMuc2tpcEV4cGFuc2lvbiA9IHRydWU7XG4gICAgICAgIG9wdHMubGluayA9IHt9O1xuICAgICAgICBqc29ubGQuY29tcGFjdChmcmFtZWQsIGN0eCwgb3B0cywgZnVuY3Rpb24oZXJyLCBjb21wYWN0ZWQsIGN0eCkge1xuICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICAgJ0NvdWxkIG5vdCBjb21wYWN0IGZyYW1lZCBvdXRwdXQuJyxcbiAgICAgICAgICAgICAgJ2pzb25sZC5GcmFtZUVycm9yJywge2NhdXNlOiBlcnJ9KSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGdldCBncmFwaCBhbGlhc1xuICAgICAgICAgIHZhciBncmFwaCA9IF9jb21wYWN0SXJpKGN0eCwgJ0BncmFwaCcpO1xuICAgICAgICAgIC8vIHJlbW92ZSBAcHJlc2VydmUgZnJvbSByZXN1bHRzXG4gICAgICAgICAgb3B0cy5saW5rID0ge307XG4gICAgICAgICAgY29tcGFjdGVkW2dyYXBoXSA9IF9yZW1vdmVQcmVzZXJ2ZShjdHgsIGNvbXBhY3RlZFtncmFwaF0sIG9wdHMpO1xuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGNvbXBhY3RlZCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn07XG5cbi8qKlxuICogKipFeHBlcmltZW50YWwqKlxuICpcbiAqIExpbmtzIGEgSlNPTi1MRCBkb2N1bWVudCdzIG5vZGVzIGluIG1lbW9yeS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgZG9jdW1lbnQgdG8gbGluay5cbiAqIEBwYXJhbSBjdHggdGhlIEpTT04tTEQgY29udGV4dCB0byBhcHBseS5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2Jhc2VdIHRoZSBiYXNlIElSSSB0byB1c2UuXG4gKiAgICAgICAgICBbZXhwYW5kQ29udGV4dF0gYSBjb250ZXh0IHRvIGV4cGFuZCB3aXRoLlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIGxpbmtlZCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmpzb25sZC5saW5rID0gZnVuY3Rpb24oaW5wdXQsIGN0eCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgLy8gQVBJIG1hdGNoZXMgcnVubmluZyBmcmFtZSB3aXRoIGEgd2lsZGNhcmQgZnJhbWUgYW5kIGVtYmVkOiAnQGxpbmsnXG4gIC8vIGdldCBhcmd1bWVudHNcbiAgdmFyIGZyYW1lID0ge307XG4gIGlmKGN0eCkge1xuICAgIGZyYW1lWydAY29udGV4dCddID0gY3R4O1xuICB9XG4gIGZyYW1lWydAZW1iZWQnXSA9ICdAbGluayc7XG4gIGpzb25sZC5mcmFtZShpbnB1dCwgZnJhbWUsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogKipEZXByZWNhdGVkKipcbiAqXG4gKiBQZXJmb3JtcyBKU09OLUxEIG9iamVjdGlmaWNhdGlvbi5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgZG9jdW1lbnQgdG8gb2JqZWN0aWZ5LlxuICogQHBhcmFtIGN0eCB0aGUgSlNPTi1MRCBjb250ZXh0IHRvIGFwcGx5LlxuICogQHBhcmFtIFtvcHRpb25zXSB0aGUgb3B0aW9ucyB0byB1c2U6XG4gKiAgICAgICAgICBbYmFzZV0gdGhlIGJhc2UgSVJJIHRvIHVzZS5cbiAqICAgICAgICAgIFtleHBhbmRDb250ZXh0XSBhIGNvbnRleHQgdG8gZXhwYW5kIHdpdGguXG4gKiAgICAgICAgICBbZG9jdW1lbnRMb2FkZXIodXJsLCBjYWxsYmFjayhlcnIsIHJlbW90ZURvYykpXSB0aGUgZG9jdW1lbnQgbG9hZGVyLlxuICogQHBhcmFtIGNhbGxiYWNrKGVyciwgbGlua2VkKSBjYWxsZWQgb25jZSB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAqL1xuanNvbmxkLm9iamVjdGlmeSA9IGZ1bmN0aW9uKGlucHV0LCBjdHgsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ2Jhc2UnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5iYXNlID0gKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpID8gaW5wdXQgOiAnJztcbiAgfVxuICBpZighKCdkb2N1bWVudExvYWRlcicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmxvYWREb2N1bWVudDtcbiAgfVxuXG4gIC8vIGV4cGFuZCBpbnB1dFxuICBqc29ubGQuZXhwYW5kKGlucHV0LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIF9pbnB1dCkge1xuICAgIGlmKGVycikge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0NvdWxkIG5vdCBleHBhbmQgaW5wdXQgYmVmb3JlIGxpbmtpbmcuJyxcbiAgICAgICAgJ2pzb25sZC5MaW5rRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICB9XG5cbiAgICB2YXIgZmxhdHRlbmVkO1xuICAgIHRyeSB7XG4gICAgICAvLyBmbGF0dGVuIHRoZSBncmFwaFxuICAgICAgZmxhdHRlbmVkID0gbmV3IFByb2Nlc3NvcigpLmZsYXR0ZW4oX2lucHV0KTtcbiAgICB9IGNhdGNoKGV4KSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZXgpO1xuICAgIH1cblxuICAgIC8vIGNvbXBhY3QgcmVzdWx0IChmb3JjZSBAZ3JhcGggb3B0aW9uIHRvIHRydWUsIHNraXAgZXhwYW5zaW9uKVxuICAgIG9wdGlvbnMuZ3JhcGggPSB0cnVlO1xuICAgIG9wdGlvbnMuc2tpcEV4cGFuc2lvbiA9IHRydWU7XG4gICAganNvbmxkLmNvbXBhY3QoZmxhdHRlbmVkLCBjdHgsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgY29tcGFjdGVkLCBjdHgpIHtcbiAgICAgIGlmKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdDb3VsZCBub3QgY29tcGFjdCBmbGF0dGVuZWQgb3V0cHV0IGJlZm9yZSBsaW5raW5nLicsXG4gICAgICAgICAgJ2pzb25sZC5MaW5rRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICAgIH1cbiAgICAgIC8vIGdldCBncmFwaCBhbGlhc1xuICAgICAgdmFyIGdyYXBoID0gX2NvbXBhY3RJcmkoY3R4LCAnQGdyYXBoJyk7XG4gICAgICB2YXIgdG9wID0gY29tcGFjdGVkW2dyYXBoXVswXTtcblxuICAgICAgdmFyIHJlY3Vyc2UgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gICAgICAgIC8vIGNhbid0IHJlcGxhY2UganVzdCBhIHN0cmluZ1xuICAgICAgICBpZighX2lzT2JqZWN0KHN1YmplY3QpICYmICFfaXNBcnJheShzdWJqZWN0KSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGJvdHRvbSBvdXQgcmVjdXJzaW9uIG9uIHJlLXZpc2l0XG4gICAgICAgIGlmKF9pc09iamVjdChzdWJqZWN0KSkge1xuICAgICAgICAgIGlmKHJlY3Vyc2UudmlzaXRlZFtzdWJqZWN0WydAaWQnXV0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVjdXJzZS52aXNpdGVkW3N1YmplY3RbJ0BpZCddXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlYWNoIGFycmF5IGVsZW1lbnQgKm9yKiBvYmplY3Qga2V5XG4gICAgICAgIGZvcih2YXIgayBpbiBzdWJqZWN0KSB7XG4gICAgICAgICAgdmFyIG9iaiA9IHN1YmplY3Rba107XG4gICAgICAgICAgdmFyIGlzaWQgPSAoanNvbmxkLmdldENvbnRleHRWYWx1ZShjdHgsIGssICdAdHlwZScpID09PSAnQGlkJyk7XG5cbiAgICAgICAgICAvLyBjYW4ndCByZXBsYWNlIGEgbm9uLW9iamVjdCBvciBub24tYXJyYXkgdW5sZXNzIGl0J3MgYW4gQGlkXG4gICAgICAgICAgaWYoIV9pc0FycmF5KG9iaikgJiYgIV9pc09iamVjdChvYmopICYmICFpc2lkKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZihfaXNTdHJpbmcob2JqKSAmJiBpc2lkKSB7XG4gICAgICAgICAgICBzdWJqZWN0W2tdID0gb2JqID0gdG9wW29ial07XG4gICAgICAgICAgICByZWN1cnNlKG9iaik7XG4gICAgICAgICAgfSBlbHNlIGlmKF9pc0FycmF5KG9iaikpIHtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgaWYoX2lzU3RyaW5nKG9ialtpXSkgJiYgaXNpZCkge1xuICAgICAgICAgICAgICAgIG9ialtpXSA9IHRvcFtvYmpbaV1dO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYoX2lzT2JqZWN0KG9ialtpXSkgJiYgJ0BpZCcgaW4gb2JqW2ldKSB7XG4gICAgICAgICAgICAgICAgb2JqW2ldID0gdG9wW29ialtpXVsnQGlkJ11dO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlY3Vyc2Uob2JqW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYoX2lzT2JqZWN0KG9iaikpIHtcbiAgICAgICAgICAgIHZhciBzaWQgPSBvYmpbJ0BpZCddO1xuICAgICAgICAgICAgc3ViamVjdFtrXSA9IG9iaiA9IHRvcFtzaWRdO1xuICAgICAgICAgICAgcmVjdXJzZShvYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHJlY3Vyc2UudmlzaXRlZCA9IHt9O1xuICAgICAgcmVjdXJzZSh0b3ApO1xuXG4gICAgICBjb21wYWN0ZWQub2ZfdHlwZSA9IHt9O1xuICAgICAgZm9yKHZhciBzIGluIHRvcCkge1xuICAgICAgICBpZighKCdAdHlwZScgaW4gdG9wW3NdKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0eXBlcyA9IHRvcFtzXVsnQHR5cGUnXTtcbiAgICAgICAgaWYoIV9pc0FycmF5KHR5cGVzKSkge1xuICAgICAgICAgIHR5cGVzID0gW3R5cGVzXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IodmFyIHQgaW4gdHlwZXMpIHtcbiAgICAgICAgICBpZighKHR5cGVzW3RdIGluIGNvbXBhY3RlZC5vZl90eXBlKSkge1xuICAgICAgICAgICAgY29tcGFjdGVkLm9mX3R5cGVbdHlwZXNbdF1dID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbXBhY3RlZC5vZl90eXBlW3R5cGVzW3RdXS5wdXNoKHRvcFtzXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIGNvbXBhY3RlZCk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBQZXJmb3JtcyBSREYgZGF0YXNldCBub3JtYWxpemF0aW9uIG9uIHRoZSBnaXZlbiBKU09OLUxEIGlucHV0LiBUaGUgb3V0cHV0XG4gKiBpcyBhbiBSREYgZGF0YXNldCB1bmxlc3MgdGhlICdmb3JtYXQnIG9wdGlvbiBpcyB1c2VkLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBpbnB1dCB0byBub3JtYWxpemUuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtiYXNlXSB0aGUgYmFzZSBJUkkgdG8gdXNlLlxuICogICAgICAgICAgW2V4cGFuZENvbnRleHRdIGEgY29udGV4dCB0byBleHBhbmQgd2l0aC5cbiAqICAgICAgICAgIFtmb3JtYXRdIHRoZSBmb3JtYXQgaWYgb3V0cHV0IGlzIGEgc3RyaW5nOlxuICogICAgICAgICAgICAnYXBwbGljYXRpb24vbnF1YWRzJyBmb3IgTi1RdWFkcy5cbiAqICAgICAgICAgIFtkb2N1bWVudExvYWRlcih1cmwsIGNhbGxiYWNrKGVyciwgcmVtb3RlRG9jKSldIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBub3JtYWxpemVkKSBjYWxsZWQgb25jZSB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAqL1xuanNvbmxkLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMSkge1xuICAgIHJldHVybiBqc29ubGQubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayhuZXcgVHlwZUVycm9yKCdDb3VsZCBub3Qgbm9ybWFsaXplLCB0b28gZmV3IGFyZ3VtZW50cy4nKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBnZXQgYXJndW1lbnRzXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ2Jhc2UnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5iYXNlID0gKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpID8gaW5wdXQgOiAnJztcbiAgfVxuICBpZighKCdkb2N1bWVudExvYWRlcicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmxvYWREb2N1bWVudDtcbiAgfVxuXG4gIC8vIGNvbnZlcnQgdG8gUkRGIGRhdGFzZXQgdGhlbiBkbyBub3JtYWxpemF0aW9uXG4gIHZhciBvcHRzID0gX2Nsb25lKG9wdGlvbnMpO1xuICBkZWxldGUgb3B0cy5mb3JtYXQ7XG4gIG9wdHMucHJvZHVjZUdlbmVyYWxpemVkUmRmID0gZmFsc2U7XG4gIGpzb25sZC50b1JERihpbnB1dCwgb3B0cywgZnVuY3Rpb24oZXJyLCBkYXRhc2V0KSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnQ291bGQgbm90IGNvbnZlcnQgaW5wdXQgdG8gUkRGIGRhdGFzZXQgYmVmb3JlIG5vcm1hbGl6YXRpb24uJyxcbiAgICAgICAgJ2pzb25sZC5Ob3JtYWxpemVFcnJvcicsIHtjYXVzZTogZXJyfSkpO1xuICAgIH1cblxuICAgIC8vIGRvIG5vcm1hbGl6YXRpb25cbiAgICBuZXcgUHJvY2Vzc29yKCkubm9ybWFsaXplKGRhdGFzZXQsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGFuIFJERiBkYXRhc2V0IHRvIEpTT04tTEQuXG4gKlxuICogQHBhcmFtIGRhdGFzZXQgYSBzZXJpYWxpemVkIHN0cmluZyBvZiBSREYgaW4gYSBmb3JtYXQgc3BlY2lmaWVkIGJ5IHRoZVxuICogICAgICAgICAgZm9ybWF0IG9wdGlvbiBvciBhbiBSREYgZGF0YXNldCB0byBjb252ZXJ0LlxuICogQHBhcmFtIFtvcHRpb25zXSB0aGUgb3B0aW9ucyB0byB1c2U6XG4gKiAgICAgICAgICBbZm9ybWF0XSB0aGUgZm9ybWF0IGlmIGRhdGFzZXQgcGFyYW0gbXVzdCBmaXJzdCBiZSBwYXJzZWQ6XG4gKiAgICAgICAgICAgICdhcHBsaWNhdGlvbi9ucXVhZHMnIGZvciBOLVF1YWRzIChkZWZhdWx0KS5cbiAqICAgICAgICAgIFtyZGZQYXJzZXJdIGEgY3VzdG9tIFJERi1wYXJzZXIgdG8gdXNlIHRvIHBhcnNlIHRoZSBkYXRhc2V0LlxuICogICAgICAgICAgW3VzZVJkZlR5cGVdIHRydWUgdG8gdXNlIHJkZjp0eXBlLCBmYWxzZSB0byB1c2UgQHR5cGVcbiAqICAgICAgICAgICAgKGRlZmF1bHQ6IGZhbHNlKS5cbiAqICAgICAgICAgIFt1c2VOYXRpdmVUeXBlc10gdHJ1ZSB0byBjb252ZXJ0IFhTRCB0eXBlcyBpbnRvIG5hdGl2ZSB0eXBlc1xuICogICAgICAgICAgICAoYm9vbGVhbiwgaW50ZWdlciwgZG91YmxlKSwgZmFsc2Ugbm90IHRvIChkZWZhdWx0OiBmYWxzZSkuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBvdXRwdXQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5qc29ubGQuZnJvbVJERiA9IGZ1bmN0aW9uKGRhdGFzZXQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7XG4gICAgcmV0dXJuIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBjb252ZXJ0IGZyb20gUkRGLCB0b28gZmV3IGFyZ3VtZW50cy4nKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBnZXQgYXJndW1lbnRzXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ3VzZVJkZlR5cGUnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy51c2VSZGZUeXBlID0gZmFsc2U7XG4gIH1cbiAgaWYoISgndXNlTmF0aXZlVHlwZXMnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy51c2VOYXRpdmVUeXBlcyA9IGZhbHNlO1xuICB9XG5cbiAgaWYoISgnZm9ybWF0JyBpbiBvcHRpb25zKSAmJiBfaXNTdHJpbmcoZGF0YXNldCkpIHtcbiAgICAvLyBzZXQgZGVmYXVsdCBmb3JtYXQgdG8gbnF1YWRzXG4gICAgaWYoISgnZm9ybWF0JyBpbiBvcHRpb25zKSkge1xuICAgICAgb3B0aW9ucy5mb3JtYXQgPSAnYXBwbGljYXRpb24vbnF1YWRzJztcbiAgICB9XG4gIH1cblxuICBqc29ubGQubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgLy8gaGFuZGxlIHNwZWNpYWwgZm9ybWF0XG4gICAgdmFyIHJkZlBhcnNlcjtcbiAgICBpZihvcHRpb25zLmZvcm1hdCkge1xuICAgICAgLy8gY2hlY2sgc3VwcG9ydGVkIGZvcm1hdHNcbiAgICAgIHJkZlBhcnNlciA9IG9wdGlvbnMucmRmUGFyc2VyIHx8IF9yZGZQYXJzZXJzW29wdGlvbnMuZm9ybWF0XTtcbiAgICAgIGlmKCFyZGZQYXJzZXIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnVW5rbm93biBpbnB1dCBmb3JtYXQuJyxcbiAgICAgICAgICAnanNvbmxkLlVua25vd25Gb3JtYXQnLCB7Zm9ybWF0OiBvcHRpb25zLmZvcm1hdH0pKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbm8tb3AgcGFyc2VyLCBhc3N1bWUgZGF0YXNldCBhbHJlYWR5IHBhcnNlZFxuICAgICAgcmRmUGFyc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkYXRhc2V0O1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgY2FsbGJhY2tDYWxsZWQgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgLy8gcmRmIHBhcnNlciBtYXkgYmUgYXN5bmMgb3Igc3luYywgYWx3YXlzIHBhc3MgY2FsbGJhY2tcbiAgICAgIGRhdGFzZXQgPSByZGZQYXJzZXIoZGF0YXNldCwgZnVuY3Rpb24oZXJyLCBkYXRhc2V0KSB7XG4gICAgICAgIGNhbGxiYWNrQ2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgZnJvbVJERihkYXRhc2V0LCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIGlmKCFjYWxsYmFja0NhbGxlZCkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgICAvLyBoYW5kbGUgc3luY2hyb25vdXMgb3IgcHJvbWlzZS1iYXNlZCBwYXJzZXJcbiAgICBpZihkYXRhc2V0KSB7XG4gICAgICAvLyBpZiBkYXRhc2V0IGlzIGFjdHVhbGx5IGEgcHJvbWlzZVxuICAgICAgaWYoJ3RoZW4nIGluIGRhdGFzZXQpIHtcbiAgICAgICAgcmV0dXJuIGRhdGFzZXQudGhlbihmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgZnJvbVJERihkYXRhc2V0LCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIC8vIHBhcnNlciBpcyBzeW5jaHJvbm91c1xuICAgICAgZnJvbVJERihkYXRhc2V0LCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZnJvbVJERihkYXRhc2V0LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgLy8gY29udmVydCBmcm9tIFJERlxuICAgICAgbmV3IFByb2Nlc3NvcigpLmZyb21SREYoZGF0YXNldCwgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vKipcbiAqIE91dHB1dHMgdGhlIFJERiBkYXRhc2V0IGZvdW5kIGluIHRoZSBnaXZlbiBKU09OLUxEIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgaW5wdXQuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtiYXNlXSB0aGUgYmFzZSBJUkkgdG8gdXNlLlxuICogICAgICAgICAgW2V4cGFuZENvbnRleHRdIGEgY29udGV4dCB0byBleHBhbmQgd2l0aC5cbiAqICAgICAgICAgIFtmb3JtYXRdIHRoZSBmb3JtYXQgdG8gdXNlIHRvIG91dHB1dCBhIHN0cmluZzpcbiAqICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL25xdWFkcycgZm9yIE4tUXVhZHMuXG4gKiAgICAgICAgICBbcHJvZHVjZUdlbmVyYWxpemVkUmRmXSB0cnVlIHRvIG91dHB1dCBnZW5lcmFsaXplZCBSREYsIGZhbHNlXG4gKiAgICAgICAgICAgIHRvIHByb2R1Y2Ugb25seSBzdGFuZGFyZCBSREYgKGRlZmF1bHQ6IGZhbHNlKS5cbiAqICAgICAgICAgIFtkb2N1bWVudExvYWRlcih1cmwsIGNhbGxiYWNrKGVyciwgcmVtb3RlRG9jKSldIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBkYXRhc2V0KSBjYWxsZWQgb25jZSB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAqL1xuanNvbmxkLnRvUkRGID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7XG4gICAgcmV0dXJuIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBjb252ZXJ0IHRvIFJERiwgdG9vIGZldyBhcmd1bWVudHMuJykpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gZ2V0IGFyZ3VtZW50c1xuICBpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZighKCdiYXNlJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuYmFzZSA9ICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSA/IGlucHV0IDogJyc7XG4gIH1cbiAgaWYoISgnZG9jdW1lbnRMb2FkZXInIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5kb2N1bWVudExvYWRlciA9IGpzb25sZC5sb2FkRG9jdW1lbnQ7XG4gIH1cblxuICAvLyBleHBhbmQgaW5wdXRcbiAganNvbmxkLmV4cGFuZChpbnB1dCwgb3B0aW9ucywgZnVuY3Rpb24oZXJyLCBleHBhbmRlZCkge1xuICAgIGlmKGVycikge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0NvdWxkIG5vdCBleHBhbmQgaW5wdXQgYmVmb3JlIHNlcmlhbGl6YXRpb24gdG8gUkRGLicsXG4gICAgICAgICdqc29ubGQuUmRmRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICB9XG5cbiAgICB2YXIgZGF0YXNldDtcbiAgICB0cnkge1xuICAgICAgLy8gb3V0cHV0IFJERiBkYXRhc2V0XG4gICAgICBkYXRhc2V0ID0gUHJvY2Vzc29yLnByb3RvdHlwZS50b1JERihleHBhbmRlZCwgb3B0aW9ucyk7XG4gICAgICBpZihvcHRpb25zLmZvcm1hdCkge1xuICAgICAgICBpZihvcHRpb25zLmZvcm1hdCA9PT0gJ2FwcGxpY2F0aW9uL25xdWFkcycpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgX3RvTlF1YWRzKGRhdGFzZXQpKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ1Vua25vd24gb3V0cHV0IGZvcm1hdC4nLFxuICAgICAgICAgICdqc29ubGQuVW5rbm93bkZvcm1hdCcsIHtmb3JtYXQ6IG9wdGlvbnMuZm9ybWF0fSk7XG4gICAgICB9XG4gICAgfSBjYXRjaChleCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGV4KTtcbiAgICB9XG4gICAgY2FsbGJhY2sobnVsbCwgZGF0YXNldCk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiAqKkV4cGVyaW1lbnRhbCoqXG4gKlxuICogUmVjdXJzaXZlbHkgZmxhdHRlbnMgdGhlIG5vZGVzIGluIHRoZSBnaXZlbiBKU09OLUxEIGlucHV0IGludG8gYSBtYXAgb2ZcbiAqIG5vZGUgSUQgPT4gbm9kZS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgaW5wdXQuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtiYXNlXSB0aGUgYmFzZSBJUkkgdG8gdXNlLlxuICogICAgICAgICAgW2V4cGFuZENvbnRleHRdIGEgY29udGV4dCB0byBleHBhbmQgd2l0aC5cbiAqICAgICAgICAgIFtuYW1lcl0gYSBqc29ubGQuVW5pcXVlTmFtZXIgdG8gdXNlIHRvIGxhYmVsIGJsYW5rIG5vZGVzLlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIG5vZGVNYXApIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5qc29ubGQuY3JlYXRlTm9kZU1hcCA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMSkge1xuICAgIHJldHVybiBqc29ubGQubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayhuZXcgVHlwZUVycm9yKCdDb3VsZCBub3QgY3JlYXRlIG5vZGUgbWFwLCB0b28gZmV3IGFyZ3VtZW50cy4nKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBnZXQgYXJndW1lbnRzXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ2Jhc2UnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5iYXNlID0gKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpID8gaW5wdXQgOiAnJztcbiAgfVxuICBpZighKCdkb2N1bWVudExvYWRlcicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmxvYWREb2N1bWVudDtcbiAgfVxuXG4gIC8vIGV4cGFuZCBpbnB1dFxuICBqc29ubGQuZXhwYW5kKGlucHV0LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIF9pbnB1dCkge1xuICAgIGlmKGVycikge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0NvdWxkIG5vdCBleHBhbmQgaW5wdXQgYmVmb3JlIGNyZWF0aW5nIG5vZGUgbWFwLicsXG4gICAgICAgICdqc29ubGQuQ3JlYXRlTm9kZU1hcEVycm9yJywge2NhdXNlOiBlcnJ9KSk7XG4gICAgfVxuXG4gICAgdmFyIG5vZGVNYXA7XG4gICAgdHJ5IHtcbiAgICAgIG5vZGVNYXAgPSBuZXcgUHJvY2Vzc29yKCkuY3JlYXRlTm9kZU1hcChfaW5wdXQsIG9wdGlvbnMpO1xuICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhleCk7XG4gICAgfVxuXG4gICAgY2FsbGJhY2sobnVsbCwgbm9kZU1hcCk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiAqKkV4cGVyaW1lbnRhbCoqXG4gKlxuICogTWVyZ2VzIHR3byBvciBtb3JlIEpTT04tTEQgZG9jdW1lbnRzIGludG8gYSBzaW5nbGUgZmxhdHRlbmVkIGRvY3VtZW50LlxuICpcbiAqIEBwYXJhbSBkb2NzIHRoZSBKU09OLUxEIGRvY3VtZW50cyB0byBtZXJnZSB0b2dldGhlci5cbiAqIEBwYXJhbSBjdHggdGhlIGNvbnRleHQgdG8gdXNlIHRvIGNvbXBhY3QgdGhlIG1lcmdlZCByZXN1bHQsIG9yIG51bGwuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtiYXNlXSB0aGUgYmFzZSBJUkkgdG8gdXNlLlxuICogICAgICAgICAgW2V4cGFuZENvbnRleHRdIGEgY29udGV4dCB0byBleHBhbmQgd2l0aC5cbiAqICAgICAgICAgIFtuYW1lcl0gYSBqc29ubGQuVW5pcXVlTmFtZXIgdG8gdXNlIHRvIGxhYmVsIGJsYW5rIG5vZGVzLlxuICogICAgICAgICAgW21lcmdlTm9kZXNdIHRydWUgdG8gbWVyZ2UgcHJvcGVydGllcyBmb3Igbm9kZXMgd2l0aCB0aGUgc2FtZSBJRCxcbiAqICAgICAgICAgICAgZmFsc2UgdG8gaWdub3JlIG5ldyBwcm9wZXJ0aWVzIGZvciBub2RlcyB3aXRoIHRoZSBzYW1lIElEIG9uY2VcbiAqICAgICAgICAgICAgdGhlIElEIGhhcyBiZWVuIGRlZmluZWQ7IG5vdGUgdGhhdCB0aGlzIG1heSBub3QgcHJldmVudCBtZXJnaW5nXG4gKiAgICAgICAgICAgIG5ldyBwcm9wZXJ0aWVzIHdoZXJlIGEgbm9kZSBpcyBpbiB0aGUgYG9iamVjdGAgcG9zaXRpb25cbiAqICAgICAgICAgICAgKGRlZmF1bHQ6IHRydWUpLlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIG1lcmdlZCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmpzb25sZC5tZXJnZSA9IGZ1bmN0aW9uKGRvY3MsIGN0eCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDEpIHtcbiAgICByZXR1cm4ganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobmV3IFR5cGVFcnJvcignQ291bGQgbm90IG1lcmdlLCB0b28gZmV3IGFyZ3VtZW50cy4nKSk7XG4gICAgfSk7XG4gIH1cbiAgaWYoIV9pc0FycmF5KGRvY3MpKSB7XG4gICAgcmV0dXJuIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBtZXJnZSwgXCJkb2NzXCIgbXVzdCBiZSBhbiBhcnJheS4nKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBnZXQgYXJndW1lbnRzXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfSBlbHNlIGlmKHR5cGVvZiBjdHggPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IGN0eDtcbiAgICBjdHggPSBudWxsO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBleHBhbmQgYWxsIGRvY3VtZW50c1xuICB2YXIgZXhwYW5kZWQgPSBbXTtcbiAgdmFyIGVycm9yID0gbnVsbDtcbiAgdmFyIGNvdW50ID0gZG9jcy5sZW5ndGg7XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBkb2NzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIG9wdHMgPSB7fTtcbiAgICBmb3IodmFyIGtleSBpbiBvcHRpb25zKSB7XG4gICAgICBvcHRzW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgfVxuICAgIGpzb25sZC5leHBhbmQoZG9jc1tpXSwgb3B0cywgZXhwYW5kQ29tcGxldGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gZXhwYW5kQ29tcGxldGUoZXJyLCBfaW5wdXQpIHtcbiAgICBpZihlcnJvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZihlcnIpIHtcbiAgICAgIGVycm9yID0gZXJyO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0NvdWxkIG5vdCBleHBhbmQgaW5wdXQgYmVmb3JlIGZsYXR0ZW5pbmcuJyxcbiAgICAgICAgJ2pzb25sZC5GbGF0dGVuRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICB9XG4gICAgZXhwYW5kZWQucHVzaChfaW5wdXQpO1xuICAgIGlmKC0tY291bnQgPT09IDApIHtcbiAgICAgIG1lcmdlKGV4cGFuZGVkKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtZXJnZShleHBhbmRlZCkge1xuICAgIHZhciBtZXJnZU5vZGVzID0gdHJ1ZTtcbiAgICBpZignbWVyZ2VOb2RlcycgaW4gb3B0aW9ucykge1xuICAgICAgbWVyZ2VOb2RlcyA9IG9wdGlvbnMubWVyZ2VOb2RlcztcbiAgICB9XG5cbiAgICB2YXIgbmFtZXIgPSBvcHRpb25zLm5hbWVyIHx8IG5ldyBVbmlxdWVOYW1lcignXzpiJyk7XG4gICAgdmFyIGdyYXBocyA9IHsnQGRlZmF1bHQnOiB7fX07XG5cbiAgICB2YXIgZGVmYXVsdEdyYXBoO1xuICAgIHRyeSB7XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgZXhwYW5kZWQubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgLy8gdW5pcXVlbHkgcmVsYWJlbCBibGFuayBub2Rlc1xuICAgICAgICB2YXIgZG9jID0gZXhwYW5kZWRbaV07XG4gICAgICAgIGRvYyA9IGpzb25sZC5yZWxhYmVsQmxhbmtOb2Rlcyhkb2MsIHtcbiAgICAgICAgICBuYW1lcjogbmV3IFVuaXF1ZU5hbWVyKCdfOmInICsgaSArICctJylcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYWRkIG5vZGVzIHRvIHRoZSBzaGFyZWQgbm9kZSBtYXAgZ3JhcGhzIGlmIG1lcmdpbmcgbm9kZXMsIHRvIGFcbiAgICAgICAgLy8gc2VwYXJhdGUgZ3JhcGggc2V0IGlmIG5vdFxuICAgICAgICB2YXIgX2dyYXBocyA9IChtZXJnZU5vZGVzIHx8IGkgPT09IDApID8gZ3JhcGhzIDogeydAZGVmYXVsdCc6IHt9fTtcbiAgICAgICAgX2NyZWF0ZU5vZGVNYXAoZG9jLCBfZ3JhcGhzLCAnQGRlZmF1bHQnLCBuYW1lcik7XG5cbiAgICAgICAgaWYoX2dyYXBocyAhPT0gZ3JhcGhzKSB7XG4gICAgICAgICAgLy8gbWVyZ2UgZG9jdW1lbnQgZ3JhcGhzIGJ1dCBkb24ndCBtZXJnZSBleGlzdGluZyBub2Rlc1xuICAgICAgICAgIGZvcih2YXIgZ3JhcGhOYW1lIGluIF9ncmFwaHMpIHtcbiAgICAgICAgICAgIHZhciBfbm9kZU1hcCA9IF9ncmFwaHNbZ3JhcGhOYW1lXTtcbiAgICAgICAgICAgIGlmKCEoZ3JhcGhOYW1lIGluIGdyYXBocykpIHtcbiAgICAgICAgICAgICAgZ3JhcGhzW2dyYXBoTmFtZV0gPSBfbm9kZU1hcDtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbm9kZU1hcCA9IGdyYXBoc1tncmFwaE5hbWVdO1xuICAgICAgICAgICAgZm9yKHZhciBrZXkgaW4gX25vZGVNYXApIHtcbiAgICAgICAgICAgICAgaWYoIShrZXkgaW4gbm9kZU1hcCkpIHtcbiAgICAgICAgICAgICAgICBub2RlTWFwW2tleV0gPSBfbm9kZU1hcFtrZXldO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGFkZCBhbGwgbm9uLWRlZmF1bHQgZ3JhcGhzIHRvIGRlZmF1bHQgZ3JhcGhcbiAgICAgIGRlZmF1bHRHcmFwaCA9IF9tZXJnZU5vZGVNYXBzKGdyYXBocyk7XG4gICAgfSBjYXRjaChleCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGV4KTtcbiAgICB9XG5cbiAgICAvLyBwcm9kdWNlIGZsYXR0ZW5lZCBvdXRwdXRcbiAgICB2YXIgZmxhdHRlbmVkID0gW107XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkZWZhdWx0R3JhcGgpLnNvcnQoKTtcbiAgICBmb3IodmFyIGtpID0gMDsga2kgPCBrZXlzLmxlbmd0aDsgKytraSkge1xuICAgICAgdmFyIG5vZGUgPSBkZWZhdWx0R3JhcGhba2V5c1traV1dO1xuICAgICAgLy8gb25seSBhZGQgZnVsbCBzdWJqZWN0cyB0byB0b3AtbGV2ZWxcbiAgICAgIGlmKCFfaXNTdWJqZWN0UmVmZXJlbmNlKG5vZGUpKSB7XG4gICAgICAgIGZsYXR0ZW5lZC5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGN0eCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGZsYXR0ZW5lZCk7XG4gICAgfVxuXG4gICAgLy8gY29tcGFjdCByZXN1bHQgKGZvcmNlIEBncmFwaCBvcHRpb24gdG8gdHJ1ZSwgc2tpcCBleHBhbnNpb24pXG4gICAgb3B0aW9ucy5ncmFwaCA9IHRydWU7XG4gICAgb3B0aW9ucy5za2lwRXhwYW5zaW9uID0gdHJ1ZTtcbiAgICBqc29ubGQuY29tcGFjdChmbGF0dGVuZWQsIGN0eCwgb3B0aW9ucywgZnVuY3Rpb24oZXJyLCBjb21wYWN0ZWQpIHtcbiAgICAgIGlmKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdDb3VsZCBub3QgY29tcGFjdCBtZXJnZWQgb3V0cHV0LicsXG4gICAgICAgICAgJ2pzb25sZC5NZXJnZUVycm9yJywge2NhdXNlOiBlcnJ9KSk7XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhudWxsLCBjb21wYWN0ZWQpO1xuICAgIH0pO1xuICB9XG59O1xuXG4vKipcbiAqIFJlbGFiZWxzIGFsbCBibGFuayBub2RlcyBpbiB0aGUgZ2l2ZW4gSlNPTi1MRCBpbnB1dC5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgaW5wdXQuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtuYW1lcl0gYSBqc29ubGQuVW5pcXVlTmFtZXIgdG8gdXNlLlxuICovXG5qc29ubGQucmVsYWJlbEJsYW5rTm9kZXMgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIG5hbWVyID0gb3B0aW9ucy5uYW1lciB8fCBuZXcgVW5pcXVlTmFtZXIoJ186YicpO1xuICByZXR1cm4gX2xhYmVsQmxhbmtOb2RlcyhuYW1lciwgaW5wdXQpO1xufTtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBkb2N1bWVudCBsb2FkZXIgZm9yIGV4dGVybmFsIGRvY3VtZW50cy4gSWYgdGhlIGVudmlyb25tZW50XG4gKiBpcyBub2RlLmpzLCBhIGNhbGxiYWNrLWNvbnRpbnVhdGlvbi1zdHlsZSBkb2N1bWVudCBsb2FkZXIgaXMgdXNlZDsgb3RoZXJ3aXNlLFxuICogYSBwcm9taXNlcy1zdHlsZSBkb2N1bWVudCBsb2FkZXIgaXMgdXNlZC5cbiAqXG4gKiBAcGFyYW0gdXJsIHRoZSBVUkwgdG8gbG9hZC5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIHJlbW90ZURvYykgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMsXG4gKiAgICAgICAgICBpZiB1c2luZyBhIG5vbi1wcm9taXNlcyBBUEkuXG4gKlxuICogQHJldHVybiBhIHByb21pc2UsIGlmIHVzaW5nIGEgcHJvbWlzZXMgQVBJLlxuICovXG5qc29ubGQuZG9jdW1lbnRMb2FkZXIgPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKSB7XG4gIHZhciBlcnIgPSBuZXcgSnNvbkxkRXJyb3IoXG4gICAgJ0NvdWxkIG5vdCByZXRyaWV2ZSBhIEpTT04tTEQgZG9jdW1lbnQgZnJvbSB0aGUgVVJMLiBVUkwgJyArXG4gICAgJ2RlcmVmZXJlbmNpbmcgbm90IGltcGxlbWVudGVkLicsICdqc29ubGQuTG9hZERvY3VtZW50RXJyb3InLFxuICAgIHtjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnfSk7XG4gIGlmKF9ub2RlanMpIHtcbiAgICByZXR1cm4gY2FsbGJhY2soZXJyLCB7Y29udGV4dFVybDogbnVsbCwgZG9jdW1lbnRVcmw6IHVybCwgZG9jdW1lbnQ6IG51bGx9KTtcbiAgfVxuICByZXR1cm4ganNvbmxkLnByb21pc2lmeShmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrKGVycik7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBEZXByZWNhdGVkIGRlZmF1bHQgZG9jdW1lbnQgbG9hZGVyLiBVc2Ugb3Igb3ZlcnJpZGUganNvbmxkLmRvY3VtZW50TG9hZGVyXG4gKiBpbnN0ZWFkLlxuICovXG5qc29ubGQubG9hZERvY3VtZW50ID0gZnVuY3Rpb24odXJsLCBjYWxsYmFjaykge1xuICB2YXIgcHJvbWlzZSA9IGpzb25sZC5kb2N1bWVudExvYWRlcih1cmwsIGNhbGxiYWNrKTtcbiAgaWYocHJvbWlzZSAmJiAndGhlbicgaW4gcHJvbWlzZSkge1xuICAgIHByb21pc2UudGhlbihjYWxsYmFjay5iaW5kKG51bGwsIG51bGwpLCBjYWxsYmFjayk7XG4gIH1cbn07XG5cbi8qIFByb21pc2VzIEFQSSAqL1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcHJvbWlzZXMgQVBJIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFthcGldIGFuIG9iamVjdCB0byBhdHRhY2ggdGhlIEFQSSB0by5cbiAqICAgICAgICAgIFt2ZXJzaW9uXSAnanNvbi1sZC0xLjAnIHRvIG91dHB1dCBhIHN0YW5kYXJkIEpTT04tTEQgMS4wIHByb21pc2VzXG4gKiAgICAgICAgICAgIEFQSSwgJ2pzb25sZC5qcycgdG8gb3V0cHV0IHRoZSBzYW1lIHdpdGggYXVnbWVudGVkIHByb3ByaWV0YXJ5XG4gKiAgICAgICAgICAgIG1ldGhvZHMgKGRlZmF1bHQ6ICdqc29ubGQuanMnKVxuICpcbiAqIEByZXR1cm4gdGhlIHByb21pc2VzIEFQSSBvYmplY3QuXG4gKi9cbmpzb25sZC5wcm9taXNlcyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgdmFyIHByb21pc2lmeSA9IGpzb25sZC5wcm9taXNpZnk7XG5cbiAgLy8gaGFuZGxlICdhcGknIG9wdGlvbiBhcyB2ZXJzaW9uLCBzZXQgZGVmYXVsdHNcbiAgdmFyIGFwaSA9IG9wdGlvbnMuYXBpIHx8IHt9O1xuICB2YXIgdmVyc2lvbiA9IG9wdGlvbnMudmVyc2lvbiB8fCAnanNvbmxkLmpzJztcbiAgaWYodHlwZW9mIG9wdGlvbnMuYXBpID09PSAnc3RyaW5nJykge1xuICAgIGlmKCFvcHRpb25zLnZlcnNpb24pIHtcbiAgICAgIHZlcnNpb24gPSBvcHRpb25zLmFwaTtcbiAgICB9XG4gICAgYXBpID0ge307XG4gIH1cblxuICBhcGkuZXhwYW5kID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ291bGQgbm90IGV4cGFuZCwgdG9vIGZldyBhcmd1bWVudHMuJyk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkobnVsbCwgW2pzb25sZC5leHBhbmRdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgfTtcbiAgYXBpLmNvbXBhY3QgPSBmdW5jdGlvbihpbnB1dCwgY3R4KSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBjb21wYWN0LCB0b28gZmV3IGFyZ3VtZW50cy4nKTtcbiAgICB9XG4gICAgdmFyIGNvbXBhY3QgPSBmdW5jdGlvbihpbnB1dCwgY3R4LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgLy8gZW5zdXJlIG9ubHkgb25lIHZhbHVlIGlzIHJldHVybmVkIGluIGNhbGxiYWNrXG4gICAgICBqc29ubGQuY29tcGFjdChpbnB1dCwgY3R4LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIGNvbXBhY3RlZCkge1xuICAgICAgICBjYWxsYmFjayhlcnIsIGNvbXBhY3RlZCk7XG4gICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkobnVsbCwgW2NvbXBhY3RdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgfTtcbiAgYXBpLmZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCkge1xuICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb3VsZCBub3QgZmxhdHRlbiwgdG9vIGZldyBhcmd1bWVudHMuJyk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkoXG4gICAgICBudWxsLCBbanNvbmxkLmZsYXR0ZW5dLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgfTtcbiAgYXBpLmZyYW1lID0gZnVuY3Rpb24oaW5wdXQsIGZyYW1lKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBmcmFtZSwgdG9vIGZldyBhcmd1bWVudHMuJyk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkobnVsbCwgW2pzb25sZC5mcmFtZV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICB9O1xuICBhcGkuZnJvbVJERiA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ291bGQgbm90IGNvbnZlcnQgZnJvbSBSREYsIHRvbyBmZXcgYXJndW1lbnRzLicpO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzaWZ5LmFwcGx5KFxuICAgICAgbnVsbCwgW2pzb25sZC5mcm9tUkRGXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gIH07XG4gIGFwaS50b1JERiA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDEpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBjb252ZXJ0IHRvIFJERiwgdG9vIGZldyBhcmd1bWVudHMuJyk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkobnVsbCwgW2pzb25sZC50b1JERl0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICB9O1xuICBhcGkubm9ybWFsaXplID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ291bGQgbm90IG5vcm1hbGl6ZSwgdG9vIGZldyBhcmd1bWVudHMuJyk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkoXG4gICAgICBudWxsLCBbanNvbmxkLm5vcm1hbGl6ZV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICB9O1xuXG4gIGlmKHZlcnNpb24gPT09ICdqc29ubGQuanMnKSB7XG4gICAgYXBpLmxpbmsgPSBmdW5jdGlvbihpbnB1dCwgY3R4KSB7XG4gICAgICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb3VsZCBub3QgbGluaywgdG9vIGZldyBhcmd1bWVudHMuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvbWlzaWZ5LmFwcGx5KFxuICAgICAgICBudWxsLCBbanNvbmxkLmxpbmtdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICAgIGFwaS5vYmplY3RpZnkgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeS5hcHBseShcbiAgICAgICAgbnVsbCwgW2pzb25sZC5vYmplY3RpZnldLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICAgIGFwaS5jcmVhdGVOb2RlTWFwID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkoXG4gICAgICAgIG51bGwsIFtqc29ubGQuY3JlYXRlTm9kZU1hcF0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgIH07XG4gICAgYXBpLm1lcmdlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkoXG4gICAgICAgIG51bGwsIFtqc29ubGQubWVyZ2VdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBqc29ubGQuUHJvbWlzZSA9IGdsb2JhbC5Qcm9taXNlIHx8IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcbiAgfSBjYXRjaChlKSB7XG4gICAgdmFyIGYgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgYSBQcm9taXNlIGltcGxlbWVudGF0aW9uLicpO1xuICAgIH07XG4gICAgZm9yKHZhciBtZXRob2QgaW4gYXBpKSB7XG4gICAgICBhcGlbbWV0aG9kXSA9IGY7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGFwaTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBub2RlLmpzIGFzeW5jIG9wIGludG8gYSBwcm9taXNlIHcvYm94ZWQgcmVzb2x2ZWQgdmFsdWUocykuXG4gKlxuICogQHBhcmFtIG9wIHRoZSBvcGVyYXRpb24gdG8gY29udmVydC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBwcm9taXNlLlxuICovXG5qc29ubGQucHJvbWlzaWZ5ID0gZnVuY3Rpb24ob3ApIHtcbiAgaWYoIWpzb25sZC5Qcm9taXNlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGpzb25sZC5Qcm9taXNlID0gZ2xvYmFsLlByb21pc2UgfHwgcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBhIFByb21pc2UgaW1wbGVtZW50YXRpb24uJyk7XG4gICAgfVxuICB9XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgcmV0dXJuIG5ldyBqc29ubGQuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICBvcC5hcHBseShudWxsLCBhcmdzLmNvbmNhdChmdW5jdGlvbihlcnIsIHZhbHVlKSB7XG4gICAgICBpZighZXJyKSB7XG4gICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9XG4gICAgfSkpO1xuICB9KTtcbn07XG5cbi8vIGV4dGVuZCBqc29ubGQucHJvbWlzZXMgdy9qc29ubGQuanMgbWV0aG9kc1xuanNvbmxkLnByb21pc2VzKHthcGk6IGpzb25sZC5wcm9taXNlc30pO1xuXG4vKiBXZWJJREwgQVBJICovXG5cbmZ1bmN0aW9uIEpzb25MZFByb2Nlc3NvcigpIHt9XG5Kc29uTGRQcm9jZXNzb3IucHJvdG90eXBlID0ganNvbmxkLnByb21pc2VzKHt2ZXJzaW9uOiAnanNvbi1sZC0xLjAnfSk7XG5Kc29uTGRQcm9jZXNzb3IucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIGlmKHRoaXMgaW5zdGFuY2VvZiBKc29uTGRQcm9jZXNzb3IpIHtcbiAgICByZXR1cm4gJ1tvYmplY3QgSnNvbkxkUHJvY2Vzc29yXSc7XG4gIH1cbiAgcmV0dXJuICdbb2JqZWN0IEpzb25MZFByb2Nlc3NvclByb3RvdHlwZV0nO1xufTtcbmpzb25sZC5Kc29uTGRQcm9jZXNzb3IgPSBKc29uTGRQcm9jZXNzb3I7XG5cbi8vIElFOCBoYXMgT2JqZWN0LmRlZmluZVByb3BlcnR5IGJ1dCBpdCBvbmx5XG4vLyB3b3JrcyBvbiBET00gbm9kZXMgLS0gc28gZmVhdHVyZSBkZXRlY3Rpb25cbi8vIHJlcXVpcmVzIHRyeS9jYXRjaCA6LShcbnZhciBjYW5EZWZpbmVQcm9wZXJ0eSA9ICEhT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuaWYoY2FuRGVmaW5lUHJvcGVydHkpIHtcbiAgdHJ5IHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sICd4Jywge30pO1xuICB9IGNhdGNoKGUpIHtcbiAgICBjYW5EZWZpbmVQcm9wZXJ0eSA9IGZhbHNlO1xuICB9XG59XG5cbmlmKGNhbkRlZmluZVByb3BlcnR5KSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShKc29uTGRQcm9jZXNzb3IsICdwcm90b3R5cGUnLCB7XG4gICAgd3JpdGFibGU6IGZhbHNlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoSnNvbkxkUHJvY2Vzc29yLnByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywge1xuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB2YWx1ZTogSnNvbkxkUHJvY2Vzc29yXG4gIH0pO1xufVxuXG4vLyBzZXR1cCBicm93c2VyIGdsb2JhbCBKc29uTGRQcm9jZXNzb3JcbmlmKF9icm93c2VyICYmIHR5cGVvZiBnbG9iYWwuSnNvbkxkUHJvY2Vzc29yID09PSAndW5kZWZpbmVkJykge1xuICBpZihjYW5EZWZpbmVQcm9wZXJ0eSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShnbG9iYWwsICdKc29uTGRQcm9jZXNzb3InLCB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6IEpzb25MZFByb2Nlc3NvclxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGdsb2JhbC5Kc29uTGRQcm9jZXNzb3IgPSBKc29uTGRQcm9jZXNzb3I7XG4gIH1cbn1cblxuLyogVXRpbGl0eSBBUEkgKi9cblxuLy8gZGVmaW5lIHNldEltbWVkaWF0ZSBhbmQgbmV4dFRpY2tcbmlmKHR5cGVvZiBwcm9jZXNzID09PSAndW5kZWZpbmVkJyB8fCAhcHJvY2Vzcy5uZXh0VGljaykge1xuICBpZih0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAganNvbmxkLnNldEltbWVkaWF0ZSA9IGpzb25sZC5uZXh0VGljayA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gc2V0SW1tZWRpYXRlKGNhbGxiYWNrKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGpzb25sZC5zZXRJbW1lZGlhdGUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgc2V0VGltZW91dChjYWxsYmFjaywgMCk7XG4gICAgfTtcbiAgICBqc29ubGQubmV4dFRpY2sgPSBqc29ubGQuc2V0SW1tZWRpYXRlO1xuICB9XG59IGVsc2Uge1xuICBqc29ubGQubmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrO1xuICBpZih0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAganNvbmxkLnNldEltbWVkaWF0ZSA9IHNldEltbWVkaWF0ZTtcbiAgfSBlbHNlIHtcbiAgICBqc29ubGQuc2V0SW1tZWRpYXRlID0ganNvbmxkLm5leHRUaWNrO1xuICB9XG59XG5cbi8qKlxuICogUGFyc2VzIGEgbGluayBoZWFkZXIuIFRoZSByZXN1bHRzIHdpbGwgYmUga2V5J2QgYnkgdGhlIHZhbHVlIG9mIFwicmVsXCIuXG4gKlxuICogTGluazogPGh0dHA6Ly9qc29uLWxkLm9yZy9jb250ZXh0cy9wZXJzb24uanNvbmxkPjsgcmVsPVwiaHR0cDovL3d3dy53My5vcmcvbnMvanNvbi1sZCNjb250ZXh0XCI7IHR5cGU9XCJhcHBsaWNhdGlvbi9sZCtqc29uXCJcbiAqXG4gKiBQYXJzZXMgYXM6IHtcbiAqICAgJ2h0dHA6Ly93d3cudzMub3JnL25zL2pzb24tbGQjY29udGV4dCc6IHtcbiAqICAgICB0YXJnZXQ6IGh0dHA6Ly9qc29uLWxkLm9yZy9jb250ZXh0cy9wZXJzb24uanNvbmxkLFxuICogICAgIHR5cGU6ICdhcHBsaWNhdGlvbi9sZCtqc29uJ1xuICogICB9XG4gKiB9XG4gKlxuICogSWYgdGhlcmUgaXMgbW9yZSB0aGFuIG9uZSBcInJlbFwiIHdpdGggdGhlIHNhbWUgSVJJLCB0aGVuIGVudHJpZXMgaW4gdGhlXG4gKiByZXN1bHRpbmcgbWFwIGZvciB0aGF0IFwicmVsXCIgd2lsbCBiZSBhcnJheXMuXG4gKlxuICogQHBhcmFtIGhlYWRlciB0aGUgbGluayBoZWFkZXIgdG8gcGFyc2UuXG4gKi9cbmpzb25sZC5wYXJzZUxpbmtIZWFkZXIgPSBmdW5jdGlvbihoZWFkZXIpIHtcbiAgdmFyIHJ2YWwgPSB7fTtcbiAgLy8gc3BsaXQgb24gdW5icmFja2V0ZWQvdW5xdW90ZWQgY29tbWFzXG4gIHZhciBlbnRyaWVzID0gaGVhZGVyLm1hdGNoKC8oPzo8W14+XSo/PnxcIlteXCJdKj9cInxbXixdKSsvZyk7XG4gIHZhciByTGlua0hlYWRlciA9IC9cXHMqPChbXj5dKj8pPlxccyooPzo7XFxzKiguKikpPy87XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBlbnRyaWVzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIG1hdGNoID0gZW50cmllc1tpXS5tYXRjaChyTGlua0hlYWRlcik7XG4gICAgaWYoIW1hdGNoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IHt0YXJnZXQ6IG1hdGNoWzFdfTtcbiAgICB2YXIgcGFyYW1zID0gbWF0Y2hbMl07XG4gICAgdmFyIHJQYXJhbXMgPSAvKC4qPyk9KD86KD86XCIoW15cIl0qPylcIil8KFteXCJdKj8pKVxccyooPzooPzo7XFxzKil8JCkvZztcbiAgICB3aGlsZShtYXRjaCA9IHJQYXJhbXMuZXhlYyhwYXJhbXMpKSB7XG4gICAgICByZXN1bHRbbWF0Y2hbMV1dID0gKG1hdGNoWzJdID09PSB1bmRlZmluZWQpID8gbWF0Y2hbM10gOiBtYXRjaFsyXTtcbiAgICB9XG4gICAgdmFyIHJlbCA9IHJlc3VsdFsncmVsJ10gfHwgJyc7XG4gICAgaWYoX2lzQXJyYXkocnZhbFtyZWxdKSkge1xuICAgICAgcnZhbFtyZWxdLnB1c2gocmVzdWx0KTtcbiAgICB9IGVsc2UgaWYocmVsIGluIHJ2YWwpIHtcbiAgICAgIHJ2YWxbcmVsXSA9IFtydmFsW3JlbF0sIHJlc3VsdF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJ2YWxbcmVsXSA9IHJlc3VsdDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJ2YWw7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzaW1wbGUgZG9jdW1lbnQgY2FjaGUgdGhhdCByZXRhaW5zIGRvY3VtZW50cyBmb3IgYSBzaG9ydFxuICogcGVyaW9kIG9mIHRpbWUuXG4gKlxuICogRklYTUU6IEltcGxlbWVudCBzaW1wbGUgSFRUUCBjYWNoaW5nIGluc3RlYWQuXG4gKlxuICogQHBhcmFtIHNpemUgdGhlIG1heGltdW0gc2l6ZSBvZiB0aGUgY2FjaGUuXG4gKi9cbmpzb25sZC5Eb2N1bWVudENhY2hlID0gZnVuY3Rpb24oc2l6ZSkge1xuICB0aGlzLm9yZGVyID0gW107XG4gIHRoaXMuY2FjaGUgPSB7fTtcbiAgdGhpcy5zaXplID0gc2l6ZSB8fCA1MDtcbiAgdGhpcy5leHBpcmVzID0gMzAgKiAxMDAwO1xufTtcbmpzb25sZC5Eb2N1bWVudENhY2hlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbih1cmwpIHtcbiAgaWYodXJsIGluIHRoaXMuY2FjaGUpIHtcbiAgICB2YXIgZW50cnkgPSB0aGlzLmNhY2hlW3VybF07XG4gICAgaWYoZW50cnkuZXhwaXJlcyA+PSArbmV3IERhdGUoKSkge1xuICAgICAgcmV0dXJuIGVudHJ5LmN0eDtcbiAgICB9XG4gICAgZGVsZXRlIHRoaXMuY2FjaGVbdXJsXTtcbiAgICB0aGlzLm9yZGVyLnNwbGljZSh0aGlzLm9yZGVyLmluZGV4T2YodXJsKSwgMSk7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59O1xuanNvbmxkLkRvY3VtZW50Q2FjaGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHVybCwgY3R4KSB7XG4gIGlmKHRoaXMub3JkZXIubGVuZ3RoID09PSB0aGlzLnNpemUpIHtcbiAgICBkZWxldGUgdGhpcy5jYWNoZVt0aGlzLm9yZGVyLnNoaWZ0KCldO1xuICB9XG4gIHRoaXMub3JkZXIucHVzaCh1cmwpO1xuICB0aGlzLmNhY2hlW3VybF0gPSB7Y3R4OiBjdHgsIGV4cGlyZXM6ICgrbmV3IERhdGUoKSArIHRoaXMuZXhwaXJlcyl9O1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFjdGl2ZSBjb250ZXh0IGNhY2hlLlxuICpcbiAqIEBwYXJhbSBzaXplIHRoZSBtYXhpbXVtIHNpemUgb2YgdGhlIGNhY2hlLlxuICovXG5qc29ubGQuQWN0aXZlQ29udGV4dENhY2hlID0gZnVuY3Rpb24oc2l6ZSkge1xuICB0aGlzLm9yZGVyID0gW107XG4gIHRoaXMuY2FjaGUgPSB7fTtcbiAgdGhpcy5zaXplID0gc2l6ZSB8fCAxMDA7XG59O1xuanNvbmxkLkFjdGl2ZUNvbnRleHRDYWNoZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oYWN0aXZlQ3R4LCBsb2NhbEN0eCkge1xuICB2YXIga2V5MSA9IEpTT04uc3RyaW5naWZ5KGFjdGl2ZUN0eCk7XG4gIHZhciBrZXkyID0gSlNPTi5zdHJpbmdpZnkobG9jYWxDdHgpO1xuICB2YXIgbGV2ZWwxID0gdGhpcy5jYWNoZVtrZXkxXTtcbiAgaWYobGV2ZWwxICYmIGtleTIgaW4gbGV2ZWwxKSB7XG4gICAgcmV0dXJuIGxldmVsMVtrZXkyXTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5qc29ubGQuQWN0aXZlQ29udGV4dENhY2hlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihcbiAgYWN0aXZlQ3R4LCBsb2NhbEN0eCwgcmVzdWx0KSB7XG4gIGlmKHRoaXMub3JkZXIubGVuZ3RoID09PSB0aGlzLnNpemUpIHtcbiAgICB2YXIgZW50cnkgPSB0aGlzLm9yZGVyLnNoaWZ0KCk7XG4gICAgZGVsZXRlIHRoaXMuY2FjaGVbZW50cnkuYWN0aXZlQ3R4XVtlbnRyeS5sb2NhbEN0eF07XG4gIH1cbiAgdmFyIGtleTEgPSBKU09OLnN0cmluZ2lmeShhY3RpdmVDdHgpO1xuICB2YXIga2V5MiA9IEpTT04uc3RyaW5naWZ5KGxvY2FsQ3R4KTtcbiAgdGhpcy5vcmRlci5wdXNoKHthY3RpdmVDdHg6IGtleTEsIGxvY2FsQ3R4OiBrZXkyfSk7XG4gIGlmKCEoa2V5MSBpbiB0aGlzLmNhY2hlKSkge1xuICAgIHRoaXMuY2FjaGVba2V5MV0gPSB7fTtcbiAgfVxuICB0aGlzLmNhY2hlW2tleTFdW2tleTJdID0gX2Nsb25lKHJlc3VsdCk7XG59O1xuXG4vKipcbiAqIERlZmF1bHQgSlNPTi1MRCBjYWNoZS5cbiAqL1xuanNvbmxkLmNhY2hlID0ge1xuICBhY3RpdmVDdHg6IG5ldyBqc29ubGQuQWN0aXZlQ29udGV4dENhY2hlKClcbn07XG5cbi8qKlxuICogRG9jdW1lbnQgbG9hZGVycy5cbiAqL1xuanNvbmxkLmRvY3VtZW50TG9hZGVycyA9IHt9O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBidWlsdC1pbiBqcXVlcnkgZG9jdW1lbnQgbG9hZGVyLlxuICpcbiAqIEBwYXJhbSAkIHRoZSBqcXVlcnkgaW5zdGFuY2UgdG8gdXNlLlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgc2VjdXJlOiByZXF1aXJlIGFsbCBVUkxzIHRvIHVzZSBIVFRQUy5cbiAqICAgICAgICAgIHVzZVByb21pc2U6IHRydWUgdG8gdXNlIGEgcHJvbWlzZXMgQVBJLCBmYWxzZSBmb3IgYVxuICogICAgICAgICAgICBjYWxsYmFjay1jb250aW51YXRpb24tc3R5bGUgQVBJOyBkZWZhdWx0cyB0byB0cnVlIGlmIFByb21pc2VcbiAqICAgICAgICAgICAgaXMgZ2xvYmFsbHkgZGVmaW5lZCwgZmFsc2UgaWYgbm90LlxuICpcbiAqIEByZXR1cm4gdGhlIGpxdWVyeSBkb2N1bWVudCBsb2FkZXIuXG4gKi9cbmpzb25sZC5kb2N1bWVudExvYWRlcnMuanF1ZXJ5ID0gZnVuY3Rpb24oJCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIGxvYWRlciA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spIHtcbiAgICBpZih1cmwuaW5kZXhPZignaHR0cDonKSAhPT0gMCAmJiB1cmwuaW5kZXhPZignaHR0cHM6JykgIT09IDApIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZDsgb25seSBcImh0dHBcIiBhbmQgXCJodHRwc1wiIFVSTHMgYXJlICcgK1xuICAgICAgICAnc3VwcG9ydGVkLicsXG4gICAgICAgICdqc29ubGQuSW52YWxpZFVybCcsIHtjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnLCB1cmw6IHVybH0pLFxuICAgICAgICB7Y29udGV4dFVybDogbnVsbCwgZG9jdW1lbnRVcmw6IHVybCwgZG9jdW1lbnQ6IG51bGx9KTtcbiAgICB9XG4gICAgaWYob3B0aW9ucy5zZWN1cmUgJiYgdXJsLmluZGV4T2YoJ2h0dHBzJykgIT09IDApIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZDsgc2VjdXJlIG1vZGUgaXMgZW5hYmxlZCBhbmQgJyArXG4gICAgICAgICd0aGUgVVJMXFwncyBzY2hlbWUgaXMgbm90IFwiaHR0cHNcIi4nLFxuICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLCB7Y29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJywgdXJsOiB1cmx9KSxcbiAgICAgICAge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiB1cmwsIGRvY3VtZW50OiBudWxsfSk7XG4gICAgfVxuICAgICQuYWpheCh7XG4gICAgICB1cmw6IHVybCxcbiAgICAgIGFjY2VwdHM6IHtcbiAgICAgICAganNvbjogJ2FwcGxpY2F0aW9uL2xkK2pzb24sIGFwcGxpY2F0aW9uL2pzb24nXG4gICAgICB9LFxuICAgICAgLy8gZW5zdXJlIEFjY2VwdCBoZWFkZXIgaXMgdmVyeSBzcGVjaWZpYyBmb3IgSlNPTi1MRC9KU09OXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vbGQranNvbiwgYXBwbGljYXRpb24vanNvbidcbiAgICAgIH0sXG4gICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgY3Jvc3NEb21haW46IHRydWUsXG4gICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhLCB0ZXh0U3RhdHVzLCBqcVhIUikge1xuICAgICAgICB2YXIgZG9jID0ge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiB1cmwsIGRvY3VtZW50OiBkYXRhfTtcblxuICAgICAgICAvLyBoYW5kbGUgTGluayBIZWFkZXJcbiAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0ganFYSFIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICB2YXIgbGlua0hlYWRlciA9IGpxWEhSLmdldFJlc3BvbnNlSGVhZGVyKCdMaW5rJyk7XG4gICAgICAgIGlmKGxpbmtIZWFkZXIgJiYgY29udGVudFR5cGUgIT09ICdhcHBsaWNhdGlvbi9sZCtqc29uJykge1xuICAgICAgICAgIC8vIG9ubHkgMSByZWxhdGVkIGxpbmsgaGVhZGVyIHBlcm1pdHRlZFxuICAgICAgICAgIGxpbmtIZWFkZXIgPSBqc29ubGQucGFyc2VMaW5rSGVhZGVyKGxpbmtIZWFkZXIpW0xJTktfSEVBREVSX1JFTF07XG4gICAgICAgICAgaWYoX2lzQXJyYXkobGlua0hlYWRlcikpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZCwgaXQgaGFzIG1vcmUgdGhhbiBvbmUgJyArXG4gICAgICAgICAgICAgICdhc3NvY2lhdGVkIEhUVFAgTGluayBIZWFkZXIuJyxcbiAgICAgICAgICAgICAgJ2pzb25sZC5JbnZhbGlkVXJsJyxcbiAgICAgICAgICAgICAge2NvZGU6ICdtdWx0aXBsZSBjb250ZXh0IGxpbmsgaGVhZGVycycsIHVybDogdXJsfSksIGRvYyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKGxpbmtIZWFkZXIpIHtcbiAgICAgICAgICAgIGRvYy5jb250ZXh0VXJsID0gbGlua0hlYWRlci50YXJnZXQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2sobnVsbCwgZG9jKTtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogZnVuY3Rpb24oanFYSFIsIHRleHRTdGF0dXMsIGVycikge1xuICAgICAgICBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkLCBhbiBlcnJvciBvY2N1cnJlZC4nLFxuICAgICAgICAgICdqc29ubGQuTG9hZERvY3VtZW50RXJyb3InLFxuICAgICAgICAgIHtjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnLCB1cmw6IHVybCwgY2F1c2U6IGVycn0pLFxuICAgICAgICAgIHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogdXJsLCBkb2N1bWVudDogbnVsbH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIHZhciB1c2VQcm9taXNlID0gKHR5cGVvZiBQcm9taXNlICE9PSAndW5kZWZpbmVkJyk7XG4gIGlmKCd1c2VQcm9taXNlJyBpbiBvcHRpb25zKSB7XG4gICAgdXNlUHJvbWlzZSA9IG9wdGlvbnMudXNlUHJvbWlzZTtcbiAgfVxuICBpZih1c2VQcm9taXNlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHVybCkge1xuICAgICAgcmV0dXJuIGpzb25sZC5wcm9taXNpZnkobG9hZGVyLCB1cmwpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIGxvYWRlcjtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJ1aWx0LWluIG5vZGUgZG9jdW1lbnQgbG9hZGVyLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIHNlY3VyZTogcmVxdWlyZSBhbGwgVVJMcyB0byB1c2UgSFRUUFMuXG4gKiAgICAgICAgICBzdHJpY3RTU0w6IHRydWUgdG8gcmVxdWlyZSBTU0wgY2VydGlmaWNhdGVzIHRvIGJlIHZhbGlkLFxuICogICAgICAgICAgICBmYWxzZSBub3QgdG8gKGRlZmF1bHQ6IHRydWUpLlxuICogICAgICAgICAgbWF4UmVkaXJlY3RzOiB0aGUgbWF4aW11bSBudW1iZXIgb2YgcmVkaXJlY3RzIHRvIHBlcm1pdCwgbm9uZSBieVxuICogICAgICAgICAgICBkZWZhdWx0LlxuICogICAgICAgICAgdXNlUHJvbWlzZTogdHJ1ZSB0byB1c2UgYSBwcm9taXNlcyBBUEksIGZhbHNlIGZvciBhXG4gKiAgICAgICAgICAgIGNhbGxiYWNrLWNvbnRpbnVhdGlvbi1zdHlsZSBBUEk7IGZhbHNlIGJ5IGRlZmF1bHQuXG4gKlxuICogQHJldHVybiB0aGUgbm9kZSBkb2N1bWVudCBsb2FkZXIuXG4gKi9cbmpzb25sZC5kb2N1bWVudExvYWRlcnMubm9kZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBzdHJpY3RTU0wgPSAoJ3N0cmljdFNTTCcgaW4gb3B0aW9ucykgPyBvcHRpb25zLnN0cmljdFNTTCA6IHRydWU7XG4gIHZhciBtYXhSZWRpcmVjdHMgPSAoJ21heFJlZGlyZWN0cycgaW4gb3B0aW9ucykgPyBvcHRpb25zLm1heFJlZGlyZWN0cyA6IC0xO1xuICB2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ3JlcXVlc3QnKTtcbiAgdmFyIGh0dHAgPSByZXF1aXJlKCdodHRwJyk7XG4gIHZhciBjYWNoZSA9IG5ldyBqc29ubGQuRG9jdW1lbnRDYWNoZSgpO1xuICBmdW5jdGlvbiBsb2FkRG9jdW1lbnQodXJsLCByZWRpcmVjdHMsIGNhbGxiYWNrKSB7XG4gICAgaWYodXJsLmluZGV4T2YoJ2h0dHA6JykgIT09IDAgJiYgdXJsLmluZGV4T2YoJ2h0dHBzOicpICE9PSAwKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnVVJMIGNvdWxkIG5vdCBiZSBkZXJlZmVyZW5jZWQ7IG9ubHkgXCJodHRwXCIgYW5kIFwiaHR0cHNcIiBVUkxzIGFyZSAnICtcbiAgICAgICAgJ3N1cHBvcnRlZC4nLFxuICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLCB7Y29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJywgdXJsOiB1cmx9KSxcbiAgICAgICAge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiB1cmwsIGRvY3VtZW50OiBudWxsfSk7XG4gICAgfVxuICAgIGlmKG9wdGlvbnMuc2VjdXJlICYmIHVybC5pbmRleE9mKCdodHRwcycpICE9PSAwKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnVVJMIGNvdWxkIG5vdCBiZSBkZXJlZmVyZW5jZWQ7IHNlY3VyZSBtb2RlIGlzIGVuYWJsZWQgYW5kICcgK1xuICAgICAgICAndGhlIFVSTFxcJ3Mgc2NoZW1lIGlzIG5vdCBcImh0dHBzXCIuJyxcbiAgICAgICAgJ2pzb25sZC5JbnZhbGlkVXJsJywge2NvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCcsIHVybDogdXJsfSksXG4gICAgICAgIHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogdXJsLCBkb2N1bWVudDogbnVsbH0pO1xuICAgIH1cbiAgICB2YXIgZG9jID0gY2FjaGUuZ2V0KHVybCk7XG4gICAgaWYoZG9jICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZG9jKTtcbiAgICB9XG4gICAgcmVxdWVzdCh7XG4gICAgICB1cmw6IHVybCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9sZCtqc29uLCBhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgfSxcbiAgICAgIHN0cmljdFNTTDogc3RyaWN0U1NMLFxuICAgICAgZm9sbG93UmVkaXJlY3Q6IGZhbHNlXG4gICAgfSwgaGFuZGxlUmVzcG9uc2UpO1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlUmVzcG9uc2UoZXJyLCByZXMsIGJvZHkpIHtcbiAgICAgIGRvYyA9IHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogdXJsLCBkb2N1bWVudDogYm9keSB8fCBudWxsfTtcblxuICAgICAgLy8gaGFuZGxlIGVycm9yXG4gICAgICBpZihlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnVVJMIGNvdWxkIG5vdCBiZSBkZXJlZmVyZW5jZWQsIGFuIGVycm9yIG9jY3VycmVkLicsXG4gICAgICAgICAgJ2pzb25sZC5Mb2FkRG9jdW1lbnRFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCcsIHVybDogdXJsLCBjYXVzZTogZXJyfSksIGRvYyk7XG4gICAgICB9XG4gICAgICB2YXIgc3RhdHVzVGV4dCA9IGh0dHAuU1RBVFVTX0NPREVTW3Jlcy5zdGF0dXNDb2RlXTtcbiAgICAgIGlmKHJlcy5zdGF0dXNDb2RlID49IDQwMCkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZDogJyArIHN0YXR1c1RleHQsXG4gICAgICAgICAgJ2pzb25sZC5JbnZhbGlkVXJsJywge1xuICAgICAgICAgICAgY29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJyxcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgaHR0cFN0YXR1c0NvZGU6IHJlcy5zdGF0dXNDb2RlXG4gICAgICAgICAgfSksIGRvYyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGhhbmRsZSBMaW5rIEhlYWRlclxuICAgICAgaWYocmVzLmhlYWRlcnMubGluayAmJlxuICAgICAgICByZXMuaGVhZGVyc1snY29udGVudC10eXBlJ10gIT09ICdhcHBsaWNhdGlvbi9sZCtqc29uJykge1xuICAgICAgICAvLyBvbmx5IDEgcmVsYXRlZCBsaW5rIGhlYWRlciBwZXJtaXR0ZWRcbiAgICAgICAgdmFyIGxpbmtIZWFkZXIgPSBqc29ubGQucGFyc2VMaW5rSGVhZGVyKFxuICAgICAgICAgIHJlcy5oZWFkZXJzLmxpbmspW0xJTktfSEVBREVSX1JFTF07XG4gICAgICAgIGlmKF9pc0FycmF5KGxpbmtIZWFkZXIpKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZCwgaXQgaGFzIG1vcmUgdGhhbiBvbmUgYXNzb2NpYXRlZCAnICtcbiAgICAgICAgICAgICdIVFRQIExpbmsgSGVhZGVyLicsXG4gICAgICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLFxuICAgICAgICAgICAge2NvZGU6ICdtdWx0aXBsZSBjb250ZXh0IGxpbmsgaGVhZGVycycsIHVybDogdXJsfSksIGRvYyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYobGlua0hlYWRlcikge1xuICAgICAgICAgIGRvYy5jb250ZXh0VXJsID0gbGlua0hlYWRlci50YXJnZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gaGFuZGxlIHJlZGlyZWN0XG4gICAgICBpZihyZXMuc3RhdHVzQ29kZSA+PSAzMDAgJiYgcmVzLnN0YXR1c0NvZGUgPCA0MDAgJiZcbiAgICAgICAgcmVzLmhlYWRlcnMubG9jYXRpb24pIHtcbiAgICAgICAgaWYocmVkaXJlY3RzLmxlbmd0aCA9PT0gbWF4UmVkaXJlY3RzKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZDsgdGhlcmUgd2VyZSB0b28gbWFueSByZWRpcmVjdHMuJyxcbiAgICAgICAgICAgICdqc29ubGQuVG9vTWFueVJlZGlyZWN0cycsIHtcbiAgICAgICAgICAgICAgY29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJyxcbiAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgIGh0dHBTdGF0dXNDb2RlOiByZXMuc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgcmVkaXJlY3RzOiByZWRpcmVjdHNcbiAgICAgICAgICAgIH0pLCBkb2MpO1xuICAgICAgICB9XG4gICAgICAgIGlmKHJlZGlyZWN0cy5pbmRleE9mKHVybCkgIT09IC0xKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZDsgaW5maW5pdGUgcmVkaXJlY3Rpb24gd2FzIGRldGVjdGVkLicsXG4gICAgICAgICAgICAnanNvbmxkLkluZmluaXRlUmVkaXJlY3REZXRlY3RlZCcsIHtcbiAgICAgICAgICAgICAgY29kZTogJ3JlY3Vyc2l2ZSBjb250ZXh0IGluY2x1c2lvbicsXG4gICAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgICBodHRwU3RhdHVzQ29kZTogcmVzLnN0YXR1c0NvZGUsXG4gICAgICAgICAgICAgIHJlZGlyZWN0czogcmVkaXJlY3RzXG4gICAgICAgICAgICB9KSwgZG9jKTtcbiAgICAgICAgfVxuICAgICAgICByZWRpcmVjdHMucHVzaCh1cmwpO1xuICAgICAgICByZXR1cm4gbG9hZERvY3VtZW50KHJlcy5oZWFkZXJzLmxvY2F0aW9uLCByZWRpcmVjdHMsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIC8vIGNhY2hlIGZvciBlYWNoIHJlZGlyZWN0ZWQgVVJMXG4gICAgICByZWRpcmVjdHMucHVzaCh1cmwpO1xuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHJlZGlyZWN0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICBjYWNoZS5zZXQoXG4gICAgICAgICAgcmVkaXJlY3RzW2ldLFxuICAgICAgICAgIHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogcmVkaXJlY3RzW2ldLCBkb2N1bWVudDogYm9keX0pO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soZXJyLCBkb2MpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBsb2FkZXIgPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKSB7XG4gICAgbG9hZERvY3VtZW50KHVybCwgW10sIGNhbGxiYWNrKTtcbiAgfTtcbiAgaWYob3B0aW9ucy51c2VQcm9taXNlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHVybCkge1xuICAgICAgcmV0dXJuIGpzb25sZC5wcm9taXNpZnkobG9hZGVyLCB1cmwpO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIGxvYWRlcjtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJ1aWx0LWluIFhNTEh0dHBSZXF1ZXN0IGRvY3VtZW50IGxvYWRlci5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyB0aGUgb3B0aW9ucyB0byB1c2U6XG4gKiAgICAgICAgICBzZWN1cmU6IHJlcXVpcmUgYWxsIFVSTHMgdG8gdXNlIEhUVFBTLlxuICogICAgICAgICAgdXNlUHJvbWlzZTogdHJ1ZSB0byB1c2UgYSBwcm9taXNlcyBBUEksIGZhbHNlIGZvciBhXG4gKiAgICAgICAgICAgIGNhbGxiYWNrLWNvbnRpbnVhdGlvbi1zdHlsZSBBUEk7IGRlZmF1bHRzIHRvIHRydWUgaWYgUHJvbWlzZVxuICogICAgICAgICAgICBpcyBnbG9iYWxseSBkZWZpbmVkLCBmYWxzZSBpZiBub3QuXG4gKiAgICAgICAgICBbeGhyXTogdGhlIFhNTEh0dHBSZXF1ZXN0IEFQSSB0byB1c2UuXG4gKlxuICogQHJldHVybiB0aGUgWE1MSHR0cFJlcXVlc3QgZG9jdW1lbnQgbG9hZGVyLlxuICovXG5qc29ubGQuZG9jdW1lbnRMb2FkZXJzLnhociA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgdmFyIHJsaW5rID0gLyhefChcXHJcXG4pKWxpbms6L2k7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgbG9hZGVyID0gZnVuY3Rpb24odXJsLCBjYWxsYmFjaykge1xuICAgIGlmKHVybC5pbmRleE9mKCdodHRwOicpICE9PSAwICYmIHVybC5pbmRleE9mKCdodHRwczonKSAhPT0gMCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkOyBvbmx5IFwiaHR0cFwiIGFuZCBcImh0dHBzXCIgVVJMcyBhcmUgJyArXG4gICAgICAgICdzdXBwb3J0ZWQuJyxcbiAgICAgICAgJ2pzb25sZC5JbnZhbGlkVXJsJywge2NvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCcsIHVybDogdXJsfSksXG4gICAgICAgIHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogdXJsLCBkb2N1bWVudDogbnVsbH0pO1xuICAgIH1cbiAgICBpZihvcHRpb25zLnNlY3VyZSAmJiB1cmwuaW5kZXhPZignaHR0cHMnKSAhPT0gMCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkOyBzZWN1cmUgbW9kZSBpcyBlbmFibGVkIGFuZCAnICtcbiAgICAgICAgJ3RoZSBVUkxcXCdzIHNjaGVtZSBpcyBub3QgXCJodHRwc1wiLicsXG4gICAgICAgICdqc29ubGQuSW52YWxpZFVybCcsIHtjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnLCB1cmw6IHVybH0pLFxuICAgICAgICB7Y29udGV4dFVybDogbnVsbCwgZG9jdW1lbnRVcmw6IHVybCwgZG9jdW1lbnQ6IG51bGx9KTtcbiAgICB9XG4gICAgdmFyIHhociA9IG9wdGlvbnMueGhyIHx8IFhNTEh0dHBSZXF1ZXN0O1xuICAgIHZhciByZXEgPSBuZXcgeGhyKCk7XG4gICAgcmVxLm9ubG9hZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmKHJlcS5zdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkOiAnICsgcmVxLnN0YXR1c1RleHQsXG4gICAgICAgICAgJ2pzb25sZC5Mb2FkRG9jdW1lbnRFcnJvcicsIHtcbiAgICAgICAgICAgIGNvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCcsXG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIGh0dHBTdGF0dXNDb2RlOiByZXEuc3RhdHVzXG4gICAgICAgICAgfSksIHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogdXJsLCBkb2N1bWVudDogbnVsbH0pO1xuICAgICAgfVxuXG4gICAgICB2YXIgZG9jID0ge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiB1cmwsIGRvY3VtZW50OiByZXEucmVzcG9uc2V9O1xuXG4gICAgICAvLyBoYW5kbGUgTGluayBIZWFkZXIgKGF2b2lkIHVuc2FmZSBoZWFkZXIgd2FybmluZyBieSBleGlzdGVuY2UgdGVzdGluZylcbiAgICAgIHZhciBjb250ZW50VHlwZSA9IHJlcS5nZXRSZXNwb25zZUhlYWRlcignQ29udGVudC1UeXBlJyk7XG4gICAgICB2YXIgbGlua0hlYWRlcjtcbiAgICAgIGlmKHJsaW5rLnRlc3QocmVxLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSkge1xuICAgICAgICBsaW5rSGVhZGVyID0gcmVxLmdldFJlc3BvbnNlSGVhZGVyKCdMaW5rJyk7XG4gICAgICB9XG4gICAgICBpZihsaW5rSGVhZGVyICYmIGNvbnRlbnRUeXBlICE9PSAnYXBwbGljYXRpb24vbGQranNvbicpIHtcbiAgICAgICAgLy8gb25seSAxIHJlbGF0ZWQgbGluayBoZWFkZXIgcGVybWl0dGVkXG4gICAgICAgIGxpbmtIZWFkZXIgPSBqc29ubGQucGFyc2VMaW5rSGVhZGVyKGxpbmtIZWFkZXIpW0xJTktfSEVBREVSX1JFTF07XG4gICAgICAgIGlmKF9pc0FycmF5KGxpbmtIZWFkZXIpKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZCwgaXQgaGFzIG1vcmUgdGhhbiBvbmUgJyArXG4gICAgICAgICAgICAnYXNzb2NpYXRlZCBIVFRQIExpbmsgSGVhZGVyLicsXG4gICAgICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLFxuICAgICAgICAgICAge2NvZGU6ICdtdWx0aXBsZSBjb250ZXh0IGxpbmsgaGVhZGVycycsIHVybDogdXJsfSksIGRvYyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYobGlua0hlYWRlcikge1xuICAgICAgICAgIGRvYy5jb250ZXh0VXJsID0gbGlua0hlYWRlci50YXJnZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY2FsbGJhY2sobnVsbCwgZG9jKTtcbiAgICB9O1xuICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZCwgYW4gZXJyb3Igb2NjdXJyZWQuJyxcbiAgICAgICAgJ2pzb25sZC5Mb2FkRG9jdW1lbnRFcnJvcicsXG4gICAgICAgIHtjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnLCB1cmw6IHVybH0pLFxuICAgICAgICB7Y29udGV4dFVybDogbnVsbCwgZG9jdW1lbnRVcmw6IHVybCwgZG9jdW1lbnQ6IG51bGx9KTtcbiAgICB9O1xuICAgIHJlcS5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vbGQranNvbiwgYXBwbGljYXRpb24vanNvbicpO1xuICAgIHJlcS5zZW5kKCk7XG4gIH07XG5cbiAgdmFyIHVzZVByb21pc2UgPSAodHlwZW9mIFByb21pc2UgIT09ICd1bmRlZmluZWQnKTtcbiAgaWYoJ3VzZVByb21pc2UnIGluIG9wdGlvbnMpIHtcbiAgICB1c2VQcm9taXNlID0gb3B0aW9ucy51c2VQcm9taXNlO1xuICB9XG4gIGlmKHVzZVByb21pc2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24odXJsKSB7XG4gICAgICByZXR1cm4ganNvbmxkLnByb21pc2lmeShsb2FkZXIsIHVybCk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gbG9hZGVyO1xufTtcblxuLyoqXG4gKiBBc3NpZ25zIHRoZSBkZWZhdWx0IGRvY3VtZW50IGxvYWRlciBmb3IgZXh0ZXJuYWwgZG9jdW1lbnQgVVJMcyB0byBhIGJ1aWx0LWluXG4gKiBkZWZhdWx0LiBTdXBwb3J0ZWQgdHlwZXMgY3VycmVudGx5IGluY2x1ZGU6ICdqcXVlcnknIGFuZCAnbm9kZScuXG4gKlxuICogVG8gdXNlIHRoZSBqcXVlcnkgZG9jdW1lbnQgbG9hZGVyLCB0aGUgZmlyc3QgcGFyYW1ldGVyIG11c3QgYmUgYSByZWZlcmVuY2VcbiAqIHRvIHRoZSBtYWluIGpxdWVyeSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHR5cGUgdGhlIHR5cGUgdG8gc2V0LlxuICogQHBhcmFtIFtwYXJhbXNdIHRoZSBwYXJhbWV0ZXJzIHJlcXVpcmVkIHRvIHVzZSB0aGUgZG9jdW1lbnQgbG9hZGVyLlxuICovXG5qc29ubGQudXNlRG9jdW1lbnRMb2FkZXIgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmKCEodHlwZSBpbiBqc29ubGQuZG9jdW1lbnRMb2FkZXJzKSkge1xuICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICdVbmtub3duIGRvY3VtZW50IGxvYWRlciB0eXBlOiBcIicgKyB0eXBlICsgJ1wiJyxcbiAgICAgICdqc29ubGQuVW5rbm93bkRvY3VtZW50TG9hZGVyJyxcbiAgICAgIHt0eXBlOiB0eXBlfSk7XG4gIH1cblxuICAvLyBzZXQgZG9jdW1lbnQgbG9hZGVyXG4gIGpzb25sZC5kb2N1bWVudExvYWRlciA9IGpzb25sZC5kb2N1bWVudExvYWRlcnNbdHlwZV0uYXBwbHkoXG4gICAganNvbmxkLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbn07XG5cbi8qKlxuICogUHJvY2Vzc2VzIGEgbG9jYWwgY29udGV4dCwgcmVzb2x2aW5nIGFueSBVUkxzIGFzIG5lY2Vzc2FyeSwgYW5kIHJldHVybnMgYVxuICogbmV3IGFjdGl2ZSBjb250ZXh0IGluIGl0cyBjYWxsYmFjay5cbiAqXG4gKiBAcGFyYW0gYWN0aXZlQ3R4IHRoZSBjdXJyZW50IGFjdGl2ZSBjb250ZXh0LlxuICogQHBhcmFtIGxvY2FsQ3R4IHRoZSBsb2NhbCBjb250ZXh0IHRvIHByb2Nlc3MuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtkb2N1bWVudExvYWRlcih1cmwsIGNhbGxiYWNrKGVyciwgcmVtb3RlRG9jKSldIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBjdHgpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5qc29ubGQucHJvY2Vzc0NvbnRleHQgPSBmdW5jdGlvbihhY3RpdmVDdHgsIGxvY2FsQ3R4KSB7XG4gIC8vIGdldCBhcmd1bWVudHNcbiAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgdmFyIGNhbGxiYWNrQXJnID0gMjtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA+IDMpIHtcbiAgICBvcHRpb25zID0gYXJndW1lbnRzWzJdIHx8IHt9O1xuICAgIGNhbGxiYWNrQXJnICs9IDE7XG4gIH1cbiAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzW2NhbGxiYWNrQXJnXTtcblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ2Jhc2UnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5iYXNlID0gJyc7XG4gIH1cbiAgaWYoISgnZG9jdW1lbnRMb2FkZXInIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5kb2N1bWVudExvYWRlciA9IGpzb25sZC5sb2FkRG9jdW1lbnQ7XG4gIH1cblxuICAvLyByZXR1cm4gaW5pdGlhbCBjb250ZXh0IGVhcmx5IGZvciBudWxsIGNvbnRleHRcbiAgaWYobG9jYWxDdHggPT09IG51bGwpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgX2dldEluaXRpYWxDb250ZXh0KG9wdGlvbnMpKTtcbiAgfVxuXG4gIC8vIHJldHJpZXZlIFVSTHMgaW4gbG9jYWxDdHhcbiAgbG9jYWxDdHggPSBfY2xvbmUobG9jYWxDdHgpO1xuICBpZighKF9pc09iamVjdChsb2NhbEN0eCkgJiYgJ0Bjb250ZXh0JyBpbiBsb2NhbEN0eCkpIHtcbiAgICBsb2NhbEN0eCA9IHsnQGNvbnRleHQnOiBsb2NhbEN0eH07XG4gIH1cbiAgX3JldHJpZXZlQ29udGV4dFVybHMobG9jYWxDdHgsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgY3R4KSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIC8vIHByb2Nlc3MgY29udGV4dFxuICAgICAgY3R4ID0gbmV3IFByb2Nlc3NvcigpLnByb2Nlc3NDb250ZXh0KGFjdGl2ZUN0eCwgY3R4LCBvcHRpb25zKTtcbiAgICB9IGNhdGNoKGV4KSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZXgpO1xuICAgIH1cbiAgICBjYWxsYmFjayhudWxsLCBjdHgpO1xuICB9KTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBzdWJqZWN0IGhhcyB0aGUgZ2l2ZW4gcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHN1YmplY3QgdGhlIHN1YmplY3QgdG8gY2hlY2suXG4gKiBAcGFyYW0gcHJvcGVydHkgdGhlIHByb3BlcnR5IHRvIGxvb2sgZm9yLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgc3ViamVjdCBoYXMgdGhlIGdpdmVuIHByb3BlcnR5LCBmYWxzZSBpZiBub3QuXG4gKi9cbmpzb25sZC5oYXNQcm9wZXJ0eSA9IGZ1bmN0aW9uKHN1YmplY3QsIHByb3BlcnR5KSB7XG4gIHZhciBydmFsID0gZmFsc2U7XG4gIGlmKHByb3BlcnR5IGluIHN1YmplY3QpIHtcbiAgICB2YXIgdmFsdWUgPSBzdWJqZWN0W3Byb3BlcnR5XTtcbiAgICBydmFsID0gKCFfaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUubGVuZ3RoID4gMCk7XG4gIH1cbiAgcmV0dXJuIHJ2YWw7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGEgcHJvcGVydHkgb2YgdGhlIGdpdmVuIHN1YmplY3QuXG4gKlxuICogQHBhcmFtIHN1YmplY3QgdGhlIHN1YmplY3QgdG8gY2hlY2suXG4gKiBAcGFyYW0gcHJvcGVydHkgdGhlIHByb3BlcnR5IHRvIGNoZWNrLlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGV4aXN0cywgZmFsc2UgaWYgbm90LlxuICovXG5qc29ubGQuaGFzVmFsdWUgPSBmdW5jdGlvbihzdWJqZWN0LCBwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgdmFyIHJ2YWwgPSBmYWxzZTtcbiAgaWYoanNvbmxkLmhhc1Byb3BlcnR5KHN1YmplY3QsIHByb3BlcnR5KSkge1xuICAgIHZhciB2YWwgPSBzdWJqZWN0W3Byb3BlcnR5XTtcbiAgICB2YXIgaXNMaXN0ID0gX2lzTGlzdCh2YWwpO1xuICAgIGlmKF9pc0FycmF5KHZhbCkgfHwgaXNMaXN0KSB7XG4gICAgICBpZihpc0xpc3QpIHtcbiAgICAgICAgdmFsID0gdmFsWydAbGlzdCddO1xuICAgICAgfVxuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZhbC5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZihqc29ubGQuY29tcGFyZVZhbHVlcyh2YWx1ZSwgdmFsW2ldKSkge1xuICAgICAgICAgIHJ2YWwgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmKCFfaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIC8vIGF2b2lkIG1hdGNoaW5nIHRoZSBzZXQgb2YgdmFsdWVzIHdpdGggYW4gYXJyYXkgdmFsdWUgcGFyYW1ldGVyXG4gICAgICBydmFsID0ganNvbmxkLmNvbXBhcmVWYWx1ZXModmFsdWUsIHZhbCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBydmFsO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgdmFsdWUgdG8gYSBzdWJqZWN0LiBJZiB0aGUgdmFsdWUgaXMgYW4gYXJyYXksIGFsbCB2YWx1ZXMgaW4gdGhlXG4gKiBhcnJheSB3aWxsIGJlIGFkZGVkLlxuICpcbiAqIEBwYXJhbSBzdWJqZWN0IHRoZSBzdWJqZWN0IHRvIGFkZCB0aGUgdmFsdWUgdG8uXG4gKiBAcGFyYW0gcHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgcmVsYXRlcyB0aGUgdmFsdWUgdG8gdGhlIHN1YmplY3QuXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGFkZC5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgIFtwcm9wZXJ0eUlzQXJyYXldIHRydWUgaWYgdGhlIHByb3BlcnR5IGlzIGFsd2F5cyBhbiBhcnJheSwgZmFsc2VcbiAqICAgICAgICAgIGlmIG5vdCAoZGVmYXVsdDogZmFsc2UpLlxuICogICAgICAgIFthbGxvd0R1cGxpY2F0ZV0gdHJ1ZSB0byBhbGxvdyBkdXBsaWNhdGVzLCBmYWxzZSBub3QgdG8gKHVzZXMgYVxuICogICAgICAgICAgc2ltcGxlIHNoYWxsb3cgY29tcGFyaXNvbiBvZiBzdWJqZWN0IElEIG9yIHZhbHVlKSAoZGVmYXVsdDogdHJ1ZSkuXG4gKi9cbmpzb25sZC5hZGRWYWx1ZSA9IGZ1bmN0aW9uKHN1YmplY3QsIHByb3BlcnR5LCB2YWx1ZSwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYoISgncHJvcGVydHlJc0FycmF5JyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMucHJvcGVydHlJc0FycmF5ID0gZmFsc2U7XG4gIH1cbiAgaWYoISgnYWxsb3dEdXBsaWNhdGUnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5hbGxvd0R1cGxpY2F0ZSA9IHRydWU7XG4gIH1cblxuICBpZihfaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBpZih2YWx1ZS5sZW5ndGggPT09IDAgJiYgb3B0aW9ucy5wcm9wZXJ0eUlzQXJyYXkgJiZcbiAgICAgICEocHJvcGVydHkgaW4gc3ViamVjdCkpIHtcbiAgICAgIHN1YmplY3RbcHJvcGVydHldID0gW107XG4gICAgfVxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7ICsraSkge1xuICAgICAganNvbmxkLmFkZFZhbHVlKHN1YmplY3QsIHByb3BlcnR5LCB2YWx1ZVtpXSwgb3B0aW9ucyk7XG4gICAgfVxuICB9IGVsc2UgaWYocHJvcGVydHkgaW4gc3ViamVjdCkge1xuICAgIC8vIGNoZWNrIGlmIHN1YmplY3QgYWxyZWFkeSBoYXMgdmFsdWUgaWYgZHVwbGljYXRlcyBub3QgYWxsb3dlZFxuICAgIHZhciBoYXNWYWx1ZSA9ICghb3B0aW9ucy5hbGxvd0R1cGxpY2F0ZSAmJlxuICAgICAganNvbmxkLmhhc1ZhbHVlKHN1YmplY3QsIHByb3BlcnR5LCB2YWx1ZSkpO1xuXG4gICAgLy8gbWFrZSBwcm9wZXJ0eSBhbiBhcnJheSBpZiB2YWx1ZSBub3QgcHJlc2VudCBvciBhbHdheXMgYW4gYXJyYXlcbiAgICBpZighX2lzQXJyYXkoc3ViamVjdFtwcm9wZXJ0eV0pICYmXG4gICAgICAoIWhhc1ZhbHVlIHx8IG9wdGlvbnMucHJvcGVydHlJc0FycmF5KSkge1xuICAgICAgc3ViamVjdFtwcm9wZXJ0eV0gPSBbc3ViamVjdFtwcm9wZXJ0eV1dO1xuICAgIH1cblxuICAgIC8vIGFkZCBuZXcgdmFsdWVcbiAgICBpZighaGFzVmFsdWUpIHtcbiAgICAgIHN1YmplY3RbcHJvcGVydHldLnB1c2godmFsdWUpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBhZGQgbmV3IHZhbHVlIGFzIHNldCBvciBzaW5nbGUgdmFsdWVcbiAgICBzdWJqZWN0W3Byb3BlcnR5XSA9IG9wdGlvbnMucHJvcGVydHlJc0FycmF5ID8gW3ZhbHVlXSA6IHZhbHVlO1xuICB9XG59O1xuXG4vKipcbiAqIEdldHMgYWxsIG9mIHRoZSB2YWx1ZXMgZm9yIGEgc3ViamVjdCdzIHByb3BlcnR5IGFzIGFuIGFycmF5LlxuICpcbiAqIEBwYXJhbSBzdWJqZWN0IHRoZSBzdWJqZWN0LlxuICogQHBhcmFtIHByb3BlcnR5IHRoZSBwcm9wZXJ0eS5cbiAqXG4gKiBAcmV0dXJuIGFsbCBvZiB0aGUgdmFsdWVzIGZvciBhIHN1YmplY3QncyBwcm9wZXJ0eSBhcyBhbiBhcnJheS5cbiAqL1xuanNvbmxkLmdldFZhbHVlcyA9IGZ1bmN0aW9uKHN1YmplY3QsIHByb3BlcnR5KSB7XG4gIHZhciBydmFsID0gc3ViamVjdFtwcm9wZXJ0eV0gfHwgW107XG4gIGlmKCFfaXNBcnJheShydmFsKSkge1xuICAgIHJ2YWwgPSBbcnZhbF07XG4gIH1cbiAgcmV0dXJuIHJ2YWw7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBwcm9wZXJ0eSBmcm9tIGEgc3ViamVjdC5cbiAqXG4gKiBAcGFyYW0gc3ViamVjdCB0aGUgc3ViamVjdC5cbiAqIEBwYXJhbSBwcm9wZXJ0eSB0aGUgcHJvcGVydHkuXG4gKi9cbmpzb25sZC5yZW1vdmVQcm9wZXJ0eSA9IGZ1bmN0aW9uKHN1YmplY3QsIHByb3BlcnR5KSB7XG4gIGRlbGV0ZSBzdWJqZWN0W3Byb3BlcnR5XTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIHZhbHVlIGZyb20gYSBzdWJqZWN0LlxuICpcbiAqIEBwYXJhbSBzdWJqZWN0IHRoZSBzdWJqZWN0LlxuICogQHBhcmFtIHByb3BlcnR5IHRoZSBwcm9wZXJ0eSB0aGF0IHJlbGF0ZXMgdGhlIHZhbHVlIHRvIHRoZSBzdWJqZWN0LlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byByZW1vdmUuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtwcm9wZXJ0eUlzQXJyYXldIHRydWUgaWYgdGhlIHByb3BlcnR5IGlzIGFsd2F5cyBhbiBhcnJheSwgZmFsc2VcbiAqICAgICAgICAgICAgaWYgbm90IChkZWZhdWx0OiBmYWxzZSkuXG4gKi9cbmpzb25sZC5yZW1vdmVWYWx1ZSA9IGZ1bmN0aW9uKHN1YmplY3QsIHByb3BlcnR5LCB2YWx1ZSwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYoISgncHJvcGVydHlJc0FycmF5JyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMucHJvcGVydHlJc0FycmF5ID0gZmFsc2U7XG4gIH1cblxuICAvLyBmaWx0ZXIgb3V0IHZhbHVlXG4gIHZhciB2YWx1ZXMgPSBqc29ubGQuZ2V0VmFsdWVzKHN1YmplY3QsIHByb3BlcnR5KS5maWx0ZXIoZnVuY3Rpb24oZSkge1xuICAgIHJldHVybiAhanNvbmxkLmNvbXBhcmVWYWx1ZXMoZSwgdmFsdWUpO1xuICB9KTtcblxuICBpZih2YWx1ZXMubGVuZ3RoID09PSAwKSB7XG4gICAganNvbmxkLnJlbW92ZVByb3BlcnR5KHN1YmplY3QsIHByb3BlcnR5KTtcbiAgfSBlbHNlIGlmKHZhbHVlcy5sZW5ndGggPT09IDEgJiYgIW9wdGlvbnMucHJvcGVydHlJc0FycmF5KSB7XG4gICAgc3ViamVjdFtwcm9wZXJ0eV0gPSB2YWx1ZXNbMF07XG4gIH0gZWxzZSB7XG4gICAgc3ViamVjdFtwcm9wZXJ0eV0gPSB2YWx1ZXM7XG4gIH1cbn07XG5cbi8qKlxuICogQ29tcGFyZXMgdHdvIEpTT04tTEQgdmFsdWVzIGZvciBlcXVhbGl0eS4gVHdvIEpTT04tTEQgdmFsdWVzIHdpbGwgYmVcbiAqIGNvbnNpZGVyZWQgZXF1YWwgaWY6XG4gKlxuICogMS4gVGhleSBhcmUgYm90aCBwcmltaXRpdmVzIG9mIHRoZSBzYW1lIHR5cGUgYW5kIHZhbHVlLlxuICogMi4gVGhleSBhcmUgYm90aCBAdmFsdWVzIHdpdGggdGhlIHNhbWUgQHZhbHVlLCBAdHlwZSwgQGxhbmd1YWdlLFxuICogICBhbmQgQGluZGV4LCBPUlxuICogMy4gVGhleSBib3RoIGhhdmUgQGlkcyB0aGV5IGFyZSB0aGUgc2FtZS5cbiAqXG4gKiBAcGFyYW0gdjEgdGhlIGZpcnN0IHZhbHVlLlxuICogQHBhcmFtIHYyIHRoZSBzZWNvbmQgdmFsdWUuXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHYxIGFuZCB2MiBhcmUgY29uc2lkZXJlZCBlcXVhbCwgZmFsc2UgaWYgbm90LlxuICovXG5qc29ubGQuY29tcGFyZVZhbHVlcyA9IGZ1bmN0aW9uKHYxLCB2Mikge1xuICAvLyAxLiBlcXVhbCBwcmltaXRpdmVzXG4gIGlmKHYxID09PSB2Mikge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gMi4gZXF1YWwgQHZhbHVlc1xuICBpZihfaXNWYWx1ZSh2MSkgJiYgX2lzVmFsdWUodjIpICYmXG4gICAgdjFbJ0B2YWx1ZSddID09PSB2MlsnQHZhbHVlJ10gJiZcbiAgICB2MVsnQHR5cGUnXSA9PT0gdjJbJ0B0eXBlJ10gJiZcbiAgICB2MVsnQGxhbmd1YWdlJ10gPT09IHYyWydAbGFuZ3VhZ2UnXSAmJlxuICAgIHYxWydAaW5kZXgnXSA9PT0gdjJbJ0BpbmRleCddKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyAzLiBlcXVhbCBAaWRzXG4gIGlmKF9pc09iamVjdCh2MSkgJiYgKCdAaWQnIGluIHYxKSAmJiBfaXNPYmplY3QodjIpICYmICgnQGlkJyBpbiB2MikpIHtcbiAgICByZXR1cm4gdjFbJ0BpZCddID09PSB2MlsnQGlkJ107XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHZhbHVlIGZvciB0aGUgZ2l2ZW4gYWN0aXZlIGNvbnRleHQga2V5IGFuZCB0eXBlLCBudWxsIGlmIG5vbmUgaXNcbiAqIHNldC5cbiAqXG4gKiBAcGFyYW0gY3R4IHRoZSBhY3RpdmUgY29udGV4dC5cbiAqIEBwYXJhbSBrZXkgdGhlIGNvbnRleHQga2V5LlxuICogQHBhcmFtIFt0eXBlXSB0aGUgdHlwZSBvZiB2YWx1ZSB0byBnZXQgKGVnOiAnQGlkJywgJ0B0eXBlJyksIGlmIG5vdFxuICogICAgICAgICAgc3BlY2lmaWVkIGdldHMgdGhlIGVudGlyZSBlbnRyeSBmb3IgYSBrZXksIG51bGwgaWYgbm90IGZvdW5kLlxuICpcbiAqIEByZXR1cm4gdGhlIHZhbHVlLlxuICovXG5qc29ubGQuZ2V0Q29udGV4dFZhbHVlID0gZnVuY3Rpb24oY3R4LCBrZXksIHR5cGUpIHtcbiAgdmFyIHJ2YWwgPSBudWxsO1xuXG4gIC8vIHJldHVybiBudWxsIGZvciBpbnZhbGlkIGtleVxuICBpZihrZXkgPT09IG51bGwpIHtcbiAgICByZXR1cm4gcnZhbDtcbiAgfVxuXG4gIC8vIGdldCBkZWZhdWx0IGxhbmd1YWdlXG4gIGlmKHR5cGUgPT09ICdAbGFuZ3VhZ2UnICYmICh0eXBlIGluIGN0eCkpIHtcbiAgICBydmFsID0gY3R4W3R5cGVdO1xuICB9XG5cbiAgLy8gZ2V0IHNwZWNpZmljIGVudHJ5IGluZm9ybWF0aW9uXG4gIGlmKGN0eC5tYXBwaW5nc1trZXldKSB7XG4gICAgdmFyIGVudHJ5ID0gY3R4Lm1hcHBpbmdzW2tleV07XG5cbiAgICBpZihfaXNVbmRlZmluZWQodHlwZSkpIHtcbiAgICAgIC8vIHJldHVybiB3aG9sZSBlbnRyeVxuICAgICAgcnZhbCA9IGVudHJ5O1xuICAgIH0gZWxzZSBpZih0eXBlIGluIGVudHJ5KSB7XG4gICAgICAvLyByZXR1cm4gZW50cnkgdmFsdWUgZm9yIHR5cGVcbiAgICAgIHJ2YWwgPSBlbnRyeVt0eXBlXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcnZhbDtcbn07XG5cbi8qKiBSZWdpc3RlcmVkIFJERiBkYXRhc2V0IHBhcnNlcnMgaGFzaGVkIGJ5IGNvbnRlbnQtdHlwZS4gKi9cbnZhciBfcmRmUGFyc2VycyA9IHt9O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBSREYgZGF0YXNldCBwYXJzZXIgYnkgY29udGVudC10eXBlLCBmb3IgdXNlIHdpdGhcbiAqIGpzb25sZC5mcm9tUkRGLiBBbiBSREYgZGF0YXNldCBwYXJzZXIgd2lsbCBhbHdheXMgYmUgZ2l2ZW4gdHdvIHBhcmFtZXRlcnMsXG4gKiBhIHN0cmluZyBvZiBpbnB1dCBhbmQgYSBjYWxsYmFjay4gQW4gUkRGIGRhdGFzZXQgcGFyc2VyIGNhbiBiZSBzeW5jaHJvbm91c1xuICogb3IgYXN5bmNocm9ub3VzLlxuICpcbiAqIElmIHRoZSBwYXJzZXIgZnVuY3Rpb24gcmV0dXJucyB1bmRlZmluZWQgb3IgbnVsbCB0aGVuIGl0IHdpbGwgYmUgYXNzdW1lZCB0b1xuICogYmUgYXN5bmNocm9ub3VzIHcvYSBjb250aW51YXRpb24tcGFzc2luZyBzdHlsZSBhbmQgdGhlIGNhbGxiYWNrIHBhcmFtZXRlclxuICogZ2l2ZW4gdG8gdGhlIHBhcnNlciBNVVNUIGJlIGludm9rZWQuXG4gKlxuICogSWYgaXQgcmV0dXJucyBhIFByb21pc2UsIHRoZW4gaXQgd2lsbCBiZSBhc3N1bWVkIHRvIGJlIGFzeW5jaHJvbm91cywgYnV0IHRoZVxuICogY2FsbGJhY2sgcGFyYW1ldGVyIE1VU1QgTk9UIGJlIGludm9rZWQuIEl0IHNob3VsZCBpbnN0ZWFkIGJlIGlnbm9yZWQuXG4gKlxuICogSWYgaXQgcmV0dXJucyBhbiBSREYgZGF0YXNldCwgaXQgd2lsbCBiZSBhc3N1bWVkIHRvIGJlIHN5bmNocm9ub3VzIGFuZCB0aGVcbiAqIGNhbGxiYWNrIHBhcmFtZXRlciBNVVNUIE5PVCBiZSBpbnZva2VkLiBJdCBzaG91bGQgaW5zdGVhZCBiZSBpZ25vcmVkLlxuICpcbiAqIEBwYXJhbSBjb250ZW50VHlwZSB0aGUgY29udGVudC10eXBlIGZvciB0aGUgcGFyc2VyLlxuICogQHBhcmFtIHBhcnNlcihpbnB1dCwgY2FsbGJhY2soZXJyLCBkYXRhc2V0KSkgdGhlIHBhcnNlciBmdW5jdGlvbiAodGFrZXMgYVxuICogICAgICAgICAgc3RyaW5nIGFzIGEgcGFyYW1ldGVyIGFuZCBlaXRoZXIgcmV0dXJucyBudWxsL3VuZGVmaW5lZCBhbmQgdXNlc1xuICogICAgICAgICAgdGhlIGdpdmVuIGNhbGxiYWNrLCByZXR1cm5zIGEgUHJvbWlzZSwgb3IgcmV0dXJucyBhbiBSREYgZGF0YXNldCkuXG4gKi9cbmpzb25sZC5yZWdpc3RlclJERlBhcnNlciA9IGZ1bmN0aW9uKGNvbnRlbnRUeXBlLCBwYXJzZXIpIHtcbiAgX3JkZlBhcnNlcnNbY29udGVudFR5cGVdID0gcGFyc2VyO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVycyBhbiBSREYgZGF0YXNldCBwYXJzZXIgYnkgY29udGVudC10eXBlLlxuICpcbiAqIEBwYXJhbSBjb250ZW50VHlwZSB0aGUgY29udGVudC10eXBlIGZvciB0aGUgcGFyc2VyLlxuICovXG5qc29ubGQudW5yZWdpc3RlclJERlBhcnNlciA9IGZ1bmN0aW9uKGNvbnRlbnRUeXBlKSB7XG4gIGRlbGV0ZSBfcmRmUGFyc2Vyc1tjb250ZW50VHlwZV07XG59O1xuXG5pZihfbm9kZWpzKSB7XG4gIC8vIG5lZWRlZCBmb3Igc2VyaWFsaXphdGlvbiBvZiBYTUwgbGl0ZXJhbHNcbiAgaWYodHlwZW9mIFhNTFNlcmlhbGl6ZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIFhNTFNlcmlhbGl6ZXIgPSBudWxsO1xuICB9XG4gIGlmKHR5cGVvZiBOb2RlID09PSAndW5kZWZpbmVkJykge1xuICAgIHZhciBOb2RlID0ge1xuICAgICAgRUxFTUVOVF9OT0RFOiAxLFxuICAgICAgQVRUUklCVVRFX05PREU6IDIsXG4gICAgICBURVhUX05PREU6IDMsXG4gICAgICBDREFUQV9TRUNUSU9OX05PREU6IDQsXG4gICAgICBFTlRJVFlfUkVGRVJFTkNFX05PREU6IDUsXG4gICAgICBFTlRJVFlfTk9ERTogNixcbiAgICAgIFBST0NFU1NJTkdfSU5TVFJVQ1RJT05fTk9ERTogNyxcbiAgICAgIENPTU1FTlRfTk9ERTogOCxcbiAgICAgIERPQ1VNRU5UX05PREU6IDksXG4gICAgICBET0NVTUVOVF9UWVBFX05PREU6IDEwLFxuICAgICAgRE9DVU1FTlRfRlJBR01FTlRfTk9ERTogMTEsXG4gICAgICBOT1RBVElPTl9OT0RFOjEyXG4gICAgfTtcbiAgfVxufVxuXG4vLyBjb25zdGFudHNcbnZhciBYU0RfQk9PTEVBTiA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSNib29sZWFuJztcbnZhciBYU0RfRE9VQkxFID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hI2RvdWJsZSc7XG52YXIgWFNEX0lOVEVHRVIgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEjaW50ZWdlcic7XG52YXIgWFNEX1NUUklORyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSNzdHJpbmcnO1xuXG52YXIgUkRGID0gJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMnO1xudmFyIFJERl9MSVNUID0gUkRGICsgJ0xpc3QnO1xudmFyIFJERl9GSVJTVCA9IFJERiArICdmaXJzdCc7XG52YXIgUkRGX1JFU1QgPSBSREYgKyAncmVzdCc7XG52YXIgUkRGX05JTCA9IFJERiArICduaWwnO1xudmFyIFJERl9UWVBFID0gUkRGICsgJ3R5cGUnO1xudmFyIFJERl9QTEFJTl9MSVRFUkFMID0gUkRGICsgJ1BsYWluTGl0ZXJhbCc7XG52YXIgUkRGX1hNTF9MSVRFUkFMID0gUkRGICsgJ1hNTExpdGVyYWwnO1xudmFyIFJERl9PQkpFQ1QgPSBSREYgKyAnb2JqZWN0JztcbnZhciBSREZfTEFOR1NUUklORyA9IFJERiArICdsYW5nU3RyaW5nJztcblxudmFyIExJTktfSEVBREVSX1JFTCA9ICdodHRwOi8vd3d3LnczLm9yZy9ucy9qc29uLWxkI2NvbnRleHQnO1xudmFyIE1BWF9DT05URVhUX1VSTFMgPSAxMDtcblxuLyoqXG4gKiBBIEpTT04tTEQgRXJyb3IuXG4gKlxuICogQHBhcmFtIG1zZyB0aGUgZXJyb3IgbWVzc2FnZS5cbiAqIEBwYXJhbSB0eXBlIHRoZSBlcnJvciB0eXBlLlxuICogQHBhcmFtIGRldGFpbHMgdGhlIGVycm9yIGRldGFpbHMuXG4gKi9cbnZhciBKc29uTGRFcnJvciA9IGZ1bmN0aW9uKG1zZywgdHlwZSwgZGV0YWlscykge1xuICBpZihfbm9kZWpzKSB7XG4gICAgRXJyb3IuY2FsbCh0aGlzKTtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgfSBlbHNlIGlmKHR5cGVvZiBFcnJvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLnN0YWNrID0gKG5ldyBFcnJvcigpKS5zdGFjaztcbiAgfVxuICB0aGlzLm5hbWUgPSB0eXBlIHx8ICdqc29ubGQuRXJyb3InO1xuICB0aGlzLm1lc3NhZ2UgPSBtc2cgfHwgJ0FuIHVuc3BlY2lmaWVkIEpTT04tTEQgZXJyb3Igb2NjdXJyZWQuJztcbiAgdGhpcy5kZXRhaWxzID0gZGV0YWlscyB8fCB7fTtcbn07XG5pZihfbm9kZWpzKSB7XG4gIHJlcXVpcmUoJ3V0aWwnKS5pbmhlcml0cyhKc29uTGRFcnJvciwgRXJyb3IpO1xufSBlbHNlIGlmKHR5cGVvZiBFcnJvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgSnNvbkxkRXJyb3IucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG59XG5cbi8qKlxuICogQ29uc3RydWN0cyBhIG5ldyBKU09OLUxEIFByb2Nlc3Nvci5cbiAqL1xudmFyIFByb2Nlc3NvciA9IGZ1bmN0aW9uKCkge307XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgY29tcGFjdHMgYW4gZWxlbWVudCB1c2luZyB0aGUgZ2l2ZW4gYWN0aXZlIGNvbnRleHQuIEFsbCB2YWx1ZXNcbiAqIG11c3QgYmUgaW4gZXhwYW5kZWQgZm9ybSBiZWZvcmUgdGhpcyBtZXRob2QgaXMgY2FsbGVkLlxuICpcbiAqIEBwYXJhbSBhY3RpdmVDdHggdGhlIGFjdGl2ZSBjb250ZXh0IHRvIHVzZS5cbiAqIEBwYXJhbSBhY3RpdmVQcm9wZXJ0eSB0aGUgY29tcGFjdGVkIHByb3BlcnR5IGFzc29jaWF0ZWQgd2l0aCB0aGUgZWxlbWVudFxuICogICAgICAgICAgdG8gY29tcGFjdCwgbnVsbCBmb3Igbm9uZS5cbiAqIEBwYXJhbSBlbGVtZW50IHRoZSBlbGVtZW50IHRvIGNvbXBhY3QuXG4gKiBAcGFyYW0gb3B0aW9ucyB0aGUgY29tcGFjdGlvbiBvcHRpb25zLlxuICpcbiAqIEByZXR1cm4gdGhlIGNvbXBhY3RlZCB2YWx1ZS5cbiAqL1xuUHJvY2Vzc29yLnByb3RvdHlwZS5jb21wYWN0ID0gZnVuY3Rpb24oXG4gIGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksIGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgLy8gcmVjdXJzaXZlbHkgY29tcGFjdCBhcnJheVxuICBpZihfaXNBcnJheShlbGVtZW50KSkge1xuICAgIHZhciBydmFsID0gW107XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGVsZW1lbnQubGVuZ3RoOyArK2kpIHtcbiAgICAgIC8vIGNvbXBhY3QsIGRyb3BwaW5nIGFueSBudWxsIHZhbHVlc1xuICAgICAgdmFyIGNvbXBhY3RlZCA9IHRoaXMuY29tcGFjdChcbiAgICAgICAgYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgZWxlbWVudFtpXSwgb3B0aW9ucyk7XG4gICAgICBpZihjb21wYWN0ZWQgIT09IG51bGwpIHtcbiAgICAgICAgcnZhbC5wdXNoKGNvbXBhY3RlZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmKG9wdGlvbnMuY29tcGFjdEFycmF5cyAmJiBydmFsLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gdXNlIHNpbmdsZSBlbGVtZW50IGlmIG5vIGNvbnRhaW5lciBpcyBzcGVjaWZpZWRcbiAgICAgIHZhciBjb250YWluZXIgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKFxuICAgICAgICBhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCAnQGNvbnRhaW5lcicpO1xuICAgICAgaWYoY29udGFpbmVyID09PSBudWxsKSB7XG4gICAgICAgIHJ2YWwgPSBydmFsWzBdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcnZhbDtcbiAgfVxuXG4gIC8vIHJlY3Vyc2l2ZWx5IGNvbXBhY3Qgb2JqZWN0XG4gIGlmKF9pc09iamVjdChlbGVtZW50KSkge1xuICAgIGlmKG9wdGlvbnMubGluayAmJiAnQGlkJyBpbiBlbGVtZW50ICYmIGVsZW1lbnRbJ0BpZCddIGluIG9wdGlvbnMubGluaykge1xuICAgICAgLy8gY2hlY2sgZm9yIGEgbGlua2VkIGVsZW1lbnQgdG8gcmV1c2VcbiAgICAgIHZhciBsaW5rZWQgPSBvcHRpb25zLmxpbmtbZWxlbWVudFsnQGlkJ11dO1xuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGxpbmtlZC5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZihsaW5rZWRbaV0uZXhwYW5kZWQgPT09IGVsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gbGlua2VkW2ldLmNvbXBhY3RlZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRvIHZhbHVlIGNvbXBhY3Rpb24gb24gQHZhbHVlcyBhbmQgc3ViamVjdCByZWZlcmVuY2VzXG4gICAgaWYoX2lzVmFsdWUoZWxlbWVudCkgfHwgX2lzU3ViamVjdFJlZmVyZW5jZShlbGVtZW50KSkge1xuICAgICAgdmFyIHJ2YWwgPSBfY29tcGFjdFZhbHVlKGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksIGVsZW1lbnQpO1xuICAgICAgaWYob3B0aW9ucy5saW5rICYmIF9pc1N1YmplY3RSZWZlcmVuY2UoZWxlbWVudCkpIHtcbiAgICAgICAgLy8gc3RvcmUgbGlua2VkIGVsZW1lbnRcbiAgICAgICAgaWYoIShlbGVtZW50WydAaWQnXSBpbiBvcHRpb25zLmxpbmspKSB7XG4gICAgICAgICAgb3B0aW9ucy5saW5rW2VsZW1lbnRbJ0BpZCddXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMubGlua1tlbGVtZW50WydAaWQnXV0ucHVzaCh7ZXhwYW5kZWQ6IGVsZW1lbnQsIGNvbXBhY3RlZDogcnZhbH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJ2YWw7XG4gICAgfVxuXG4gICAgLy8gRklYTUU6IGF2b2lkIG1pc3VzZSBvZiBhY3RpdmUgcHJvcGVydHkgYXMgYW4gZXhwYW5kZWQgcHJvcGVydHk/XG4gICAgdmFyIGluc2lkZVJldmVyc2UgPSAoYWN0aXZlUHJvcGVydHkgPT09ICdAcmV2ZXJzZScpO1xuXG4gICAgdmFyIHJ2YWwgPSB7fTtcblxuICAgIGlmKG9wdGlvbnMubGluayAmJiAnQGlkJyBpbiBlbGVtZW50KSB7XG4gICAgICAvLyBzdG9yZSBsaW5rZWQgZWxlbWVudFxuICAgICAgaWYoIShlbGVtZW50WydAaWQnXSBpbiBvcHRpb25zLmxpbmspKSB7XG4gICAgICAgIG9wdGlvbnMubGlua1tlbGVtZW50WydAaWQnXV0gPSBbXTtcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMubGlua1tlbGVtZW50WydAaWQnXV0ucHVzaCh7ZXhwYW5kZWQ6IGVsZW1lbnQsIGNvbXBhY3RlZDogcnZhbH0pO1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3MgZWxlbWVudCBrZXlzIGluIG9yZGVyXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhlbGVtZW50KS5zb3J0KCk7XG4gICAgZm9yKHZhciBraSA9IDA7IGtpIDwga2V5cy5sZW5ndGg7ICsra2kpIHtcbiAgICAgIHZhciBleHBhbmRlZFByb3BlcnR5ID0ga2V5c1traV07XG4gICAgICB2YXIgZXhwYW5kZWRWYWx1ZSA9IGVsZW1lbnRbZXhwYW5kZWRQcm9wZXJ0eV07XG5cbiAgICAgIC8vIGNvbXBhY3QgQGlkIGFuZCBAdHlwZShzKVxuICAgICAgaWYoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BpZCcgfHwgZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0B0eXBlJykge1xuICAgICAgICB2YXIgY29tcGFjdGVkVmFsdWU7XG5cbiAgICAgICAgLy8gY29tcGFjdCBzaW5nbGUgQGlkXG4gICAgICAgIGlmKF9pc1N0cmluZyhleHBhbmRlZFZhbHVlKSkge1xuICAgICAgICAgIGNvbXBhY3RlZFZhbHVlID0gX2NvbXBhY3RJcmkoXG4gICAgICAgICAgICBhY3RpdmVDdHgsIGV4cGFuZGVkVmFsdWUsIG51bGwsXG4gICAgICAgICAgICB7dm9jYWI6IChleHBhbmRlZFByb3BlcnR5ID09PSAnQHR5cGUnKX0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGV4cGFuZGVkIHZhbHVlIG11c3QgYmUgYSBAdHlwZSBhcnJheVxuICAgICAgICAgIGNvbXBhY3RlZFZhbHVlID0gW107XG4gICAgICAgICAgZm9yKHZhciB2aSA9IDA7IHZpIDwgZXhwYW5kZWRWYWx1ZS5sZW5ndGg7ICsrdmkpIHtcbiAgICAgICAgICAgIGNvbXBhY3RlZFZhbHVlLnB1c2goX2NvbXBhY3RJcmkoXG4gICAgICAgICAgICAgIGFjdGl2ZUN0eCwgZXhwYW5kZWRWYWx1ZVt2aV0sIG51bGwsIHt2b2NhYjogdHJ1ZX0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB1c2Uga2V5d29yZCBhbGlhcyBhbmQgYWRkIHZhbHVlXG4gICAgICAgIHZhciBhbGlhcyA9IF9jb21wYWN0SXJpKGFjdGl2ZUN0eCwgZXhwYW5kZWRQcm9wZXJ0eSk7XG4gICAgICAgIHZhciBpc0FycmF5ID0gKF9pc0FycmF5KGNvbXBhY3RlZFZhbHVlKSAmJiBleHBhbmRlZFZhbHVlLmxlbmd0aCA9PT0gMCk7XG4gICAgICAgIGpzb25sZC5hZGRWYWx1ZShcbiAgICAgICAgICBydmFsLCBhbGlhcywgY29tcGFjdGVkVmFsdWUsIHtwcm9wZXJ0eUlzQXJyYXk6IGlzQXJyYXl9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIGhhbmRsZSBAcmV2ZXJzZVxuICAgICAgaWYoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0ByZXZlcnNlJykge1xuICAgICAgICAvLyByZWN1cnNpdmVseSBjb21wYWN0IGV4cGFuZGVkIHZhbHVlXG4gICAgICAgIHZhciBjb21wYWN0ZWRWYWx1ZSA9IHRoaXMuY29tcGFjdChcbiAgICAgICAgICBhY3RpdmVDdHgsICdAcmV2ZXJzZScsIGV4cGFuZGVkVmFsdWUsIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIGhhbmRsZSBkb3VibGUtcmV2ZXJzZWQgcHJvcGVydGllc1xuICAgICAgICBmb3IodmFyIGNvbXBhY3RlZFByb3BlcnR5IGluIGNvbXBhY3RlZFZhbHVlKSB7XG4gICAgICAgICAgaWYoYWN0aXZlQ3R4Lm1hcHBpbmdzW2NvbXBhY3RlZFByb3BlcnR5XSAmJlxuICAgICAgICAgICAgYWN0aXZlQ3R4Lm1hcHBpbmdzW2NvbXBhY3RlZFByb3BlcnR5XS5yZXZlcnNlKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBjb21wYWN0ZWRWYWx1ZVtjb21wYWN0ZWRQcm9wZXJ0eV07XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShcbiAgICAgICAgICAgICAgYWN0aXZlQ3R4LCBjb21wYWN0ZWRQcm9wZXJ0eSwgJ0Bjb250YWluZXInKTtcbiAgICAgICAgICAgIHZhciB1c2VBcnJheSA9IChjb250YWluZXIgPT09ICdAc2V0JyB8fCAhb3B0aW9ucy5jb21wYWN0QXJyYXlzKTtcbiAgICAgICAgICAgIGpzb25sZC5hZGRWYWx1ZShcbiAgICAgICAgICAgICAgcnZhbCwgY29tcGFjdGVkUHJvcGVydHksIHZhbHVlLCB7cHJvcGVydHlJc0FycmF5OiB1c2VBcnJheX0pO1xuICAgICAgICAgICAgZGVsZXRlIGNvbXBhY3RlZFZhbHVlW2NvbXBhY3RlZFByb3BlcnR5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZihPYmplY3Qua2V5cyhjb21wYWN0ZWRWYWx1ZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgIC8vIHVzZSBrZXl3b3JkIGFsaWFzIGFuZCBhZGQgdmFsdWVcbiAgICAgICAgICB2YXIgYWxpYXMgPSBfY29tcGFjdElyaShhY3RpdmVDdHgsIGV4cGFuZGVkUHJvcGVydHkpO1xuICAgICAgICAgIGpzb25sZC5hZGRWYWx1ZShydmFsLCBhbGlhcywgY29tcGFjdGVkVmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIGhhbmRsZSBAaW5kZXggcHJvcGVydHlcbiAgICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgPT09ICdAaW5kZXgnKSB7XG4gICAgICAgIC8vIGRyb3AgQGluZGV4IGlmIGluc2lkZSBhbiBAaW5kZXggY29udGFpbmVyXG4gICAgICAgIHZhciBjb250YWluZXIgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKFxuICAgICAgICAgIGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksICdAY29udGFpbmVyJyk7XG4gICAgICAgIGlmKGNvbnRhaW5lciA9PT0gJ0BpbmRleCcpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVzZSBrZXl3b3JkIGFsaWFzIGFuZCBhZGQgdmFsdWVcbiAgICAgICAgdmFyIGFsaWFzID0gX2NvbXBhY3RJcmkoYWN0aXZlQ3R4LCBleHBhbmRlZFByb3BlcnR5KTtcbiAgICAgICAganNvbmxkLmFkZFZhbHVlKHJ2YWwsIGFsaWFzLCBleHBhbmRlZFZhbHVlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIHNraXAgYXJyYXkgcHJvY2Vzc2luZyBmb3Iga2V5d29yZHMgdGhhdCBhcmVuJ3QgQGdyYXBoIG9yIEBsaXN0XG4gICAgICBpZihleHBhbmRlZFByb3BlcnR5ICE9PSAnQGdyYXBoJyAmJiBleHBhbmRlZFByb3BlcnR5ICE9PSAnQGxpc3QnICYmXG4gICAgICAgIF9pc0tleXdvcmQoZXhwYW5kZWRQcm9wZXJ0eSkpIHtcbiAgICAgICAgLy8gdXNlIGtleXdvcmQgYWxpYXMgYW5kIGFkZCB2YWx1ZSBhcyBpc1xuICAgICAgICB2YXIgYWxpYXMgPSBfY29tcGFjdElyaShhY3RpdmVDdHgsIGV4cGFuZGVkUHJvcGVydHkpO1xuICAgICAgICBqc29ubGQuYWRkVmFsdWUocnZhbCwgYWxpYXMsIGV4cGFuZGVkVmFsdWUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gTm90ZTogZXhwYW5kZWQgdmFsdWUgbXVzdCBiZSBhbiBhcnJheSBkdWUgdG8gZXhwYW5zaW9uIGFsZ29yaXRobS5cblxuICAgICAgLy8gcHJlc2VydmUgZW1wdHkgYXJyYXlzXG4gICAgICBpZihleHBhbmRlZFZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgaXRlbUFjdGl2ZVByb3BlcnR5ID0gX2NvbXBhY3RJcmkoXG4gICAgICAgICAgYWN0aXZlQ3R4LCBleHBhbmRlZFByb3BlcnR5LCBleHBhbmRlZFZhbHVlLCB7dm9jYWI6IHRydWV9LFxuICAgICAgICAgIGluc2lkZVJldmVyc2UpO1xuICAgICAgICBqc29ubGQuYWRkVmFsdWUoXG4gICAgICAgICAgcnZhbCwgaXRlbUFjdGl2ZVByb3BlcnR5LCBleHBhbmRlZFZhbHVlLCB7cHJvcGVydHlJc0FycmF5OiB0cnVlfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHJlY3VzaXZlbHkgcHJvY2VzcyBhcnJheSB2YWx1ZXNcbiAgICAgIGZvcih2YXIgdmkgPSAwOyB2aSA8IGV4cGFuZGVkVmFsdWUubGVuZ3RoOyArK3ZpKSB7XG4gICAgICAgIHZhciBleHBhbmRlZEl0ZW0gPSBleHBhbmRlZFZhbHVlW3ZpXTtcblxuICAgICAgICAvLyBjb21wYWN0IHByb3BlcnR5IGFuZCBnZXQgY29udGFpbmVyIHR5cGVcbiAgICAgICAgdmFyIGl0ZW1BY3RpdmVQcm9wZXJ0eSA9IF9jb21wYWN0SXJpKFxuICAgICAgICAgIGFjdGl2ZUN0eCwgZXhwYW5kZWRQcm9wZXJ0eSwgZXhwYW5kZWRJdGVtLCB7dm9jYWI6IHRydWV9LFxuICAgICAgICAgIGluc2lkZVJldmVyc2UpO1xuICAgICAgICB2YXIgY29udGFpbmVyID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShcbiAgICAgICAgICBhY3RpdmVDdHgsIGl0ZW1BY3RpdmVQcm9wZXJ0eSwgJ0Bjb250YWluZXInKTtcblxuICAgICAgICAvLyBnZXQgQGxpc3QgdmFsdWUgaWYgYXBwcm9wcmlhdGVcbiAgICAgICAgdmFyIGlzTGlzdCA9IF9pc0xpc3QoZXhwYW5kZWRJdGVtKTtcbiAgICAgICAgdmFyIGxpc3QgPSBudWxsO1xuICAgICAgICBpZihpc0xpc3QpIHtcbiAgICAgICAgICBsaXN0ID0gZXhwYW5kZWRJdGVtWydAbGlzdCddO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVjdXJzaXZlbHkgY29tcGFjdCBleHBhbmRlZCBpdGVtXG4gICAgICAgIHZhciBjb21wYWN0ZWRJdGVtID0gdGhpcy5jb21wYWN0KFxuICAgICAgICAgIGFjdGl2ZUN0eCwgaXRlbUFjdGl2ZVByb3BlcnR5LCBpc0xpc3QgPyBsaXN0IDogZXhwYW5kZWRJdGVtLCBvcHRpb25zKTtcblxuICAgICAgICAvLyBoYW5kbGUgQGxpc3RcbiAgICAgICAgaWYoaXNMaXN0KSB7XG4gICAgICAgICAgLy8gZW5zdXJlIEBsaXN0IHZhbHVlIGlzIGFuIGFycmF5XG4gICAgICAgICAgaWYoIV9pc0FycmF5KGNvbXBhY3RlZEl0ZW0pKSB7XG4gICAgICAgICAgICBjb21wYWN0ZWRJdGVtID0gW2NvbXBhY3RlZEl0ZW1dO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmKGNvbnRhaW5lciAhPT0gJ0BsaXN0Jykge1xuICAgICAgICAgICAgLy8gd3JhcCB1c2luZyBAbGlzdCBhbGlhc1xuICAgICAgICAgICAgdmFyIHdyYXBwZXIgPSB7fTtcbiAgICAgICAgICAgIHdyYXBwZXJbX2NvbXBhY3RJcmkoYWN0aXZlQ3R4LCAnQGxpc3QnKV0gPSBjb21wYWN0ZWRJdGVtO1xuICAgICAgICAgICAgY29tcGFjdGVkSXRlbSA9IHdyYXBwZXI7XG5cbiAgICAgICAgICAgIC8vIGluY2x1ZGUgQGluZGV4IGZyb20gZXhwYW5kZWQgQGxpc3QsIGlmIGFueVxuICAgICAgICAgICAgaWYoJ0BpbmRleCcgaW4gZXhwYW5kZWRJdGVtKSB7XG4gICAgICAgICAgICAgIGNvbXBhY3RlZEl0ZW1bX2NvbXBhY3RJcmkoYWN0aXZlQ3R4LCAnQGluZGV4JyldID1cbiAgICAgICAgICAgICAgICBleHBhbmRlZEl0ZW1bJ0BpbmRleCddO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZihpdGVtQWN0aXZlUHJvcGVydHkgaW4gcnZhbCkge1xuICAgICAgICAgICAgLy8gY2FuJ3QgdXNlIEBsaXN0IGNvbnRhaW5lciBmb3IgbW9yZSB0aGFuIDEgbGlzdFxuICAgICAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgICAnSlNPTi1MRCBjb21wYWN0IGVycm9yOyBwcm9wZXJ0eSBoYXMgYSBcIkBsaXN0XCIgQGNvbnRhaW5lciAnICtcbiAgICAgICAgICAgICAgJ3J1bGUgYnV0IHRoZXJlIGlzIG1vcmUgdGhhbiBhIHNpbmdsZSBAbGlzdCB0aGF0IG1hdGNoZXMgJyArXG4gICAgICAgICAgICAgICd0aGUgY29tcGFjdGVkIHRlcm0gaW4gdGhlIGRvY3VtZW50LiBDb21wYWN0aW9uIG1pZ2h0IG1peCAnICtcbiAgICAgICAgICAgICAgJ3Vud2FudGVkIGl0ZW1zIGludG8gdGhlIGxpc3QuJyxcbiAgICAgICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnY29tcGFjdGlvbiB0byBsaXN0IG9mIGxpc3RzJ30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGhhbmRsZSBsYW5ndWFnZSBhbmQgaW5kZXggbWFwc1xuICAgICAgICBpZihjb250YWluZXIgPT09ICdAbGFuZ3VhZ2UnIHx8IGNvbnRhaW5lciA9PT0gJ0BpbmRleCcpIHtcbiAgICAgICAgICAvLyBnZXQgb3IgY3JlYXRlIHRoZSBtYXAgb2JqZWN0XG4gICAgICAgICAgdmFyIG1hcE9iamVjdDtcbiAgICAgICAgICBpZihpdGVtQWN0aXZlUHJvcGVydHkgaW4gcnZhbCkge1xuICAgICAgICAgICAgbWFwT2JqZWN0ID0gcnZhbFtpdGVtQWN0aXZlUHJvcGVydHldO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydmFsW2l0ZW1BY3RpdmVQcm9wZXJ0eV0gPSBtYXBPYmplY3QgPSB7fTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpZiBjb250YWluZXIgaXMgYSBsYW5ndWFnZSBtYXAsIHNpbXBsaWZ5IGNvbXBhY3RlZCB2YWx1ZSB0b1xuICAgICAgICAgIC8vIGEgc2ltcGxlIHN0cmluZ1xuICAgICAgICAgIGlmKGNvbnRhaW5lciA9PT0gJ0BsYW5ndWFnZScgJiYgX2lzVmFsdWUoY29tcGFjdGVkSXRlbSkpIHtcbiAgICAgICAgICAgIGNvbXBhY3RlZEl0ZW0gPSBjb21wYWN0ZWRJdGVtWydAdmFsdWUnXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBhZGQgY29tcGFjdCB2YWx1ZSB0byBtYXAgb2JqZWN0IHVzaW5nIGtleSBmcm9tIGV4cGFuZGVkIHZhbHVlXG4gICAgICAgICAgLy8gYmFzZWQgb24gdGhlIGNvbnRhaW5lciB0eXBlXG4gICAgICAgICAganNvbmxkLmFkZFZhbHVlKG1hcE9iamVjdCwgZXhwYW5kZWRJdGVtW2NvbnRhaW5lcl0sIGNvbXBhY3RlZEl0ZW0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHVzZSBhbiBhcnJheSBpZjogY29tcGFjdEFycmF5cyBmbGFnIGlzIGZhbHNlLFxuICAgICAgICAgIC8vIEBjb250YWluZXIgaXMgQHNldCBvciBAbGlzdCAsIHZhbHVlIGlzIGFuIGVtcHR5XG4gICAgICAgICAgLy8gYXJyYXksIG9yIGtleSBpcyBAZ3JhcGhcbiAgICAgICAgICB2YXIgaXNBcnJheSA9ICghb3B0aW9ucy5jb21wYWN0QXJyYXlzIHx8IGNvbnRhaW5lciA9PT0gJ0BzZXQnIHx8XG4gICAgICAgICAgICBjb250YWluZXIgPT09ICdAbGlzdCcgfHxcbiAgICAgICAgICAgIChfaXNBcnJheShjb21wYWN0ZWRJdGVtKSAmJiBjb21wYWN0ZWRJdGVtLmxlbmd0aCA9PT0gMCkgfHxcbiAgICAgICAgICAgIGV4cGFuZGVkUHJvcGVydHkgPT09ICdAbGlzdCcgfHwgZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BncmFwaCcpO1xuXG4gICAgICAgICAgLy8gYWRkIGNvbXBhY3QgdmFsdWVcbiAgICAgICAgICBqc29ubGQuYWRkVmFsdWUoXG4gICAgICAgICAgICBydmFsLCBpdGVtQWN0aXZlUHJvcGVydHksIGNvbXBhY3RlZEl0ZW0sXG4gICAgICAgICAgICB7cHJvcGVydHlJc0FycmF5OiBpc0FycmF5fSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcnZhbDtcbiAgfVxuXG4gIC8vIG9ubHkgcHJpbWl0aXZlcyByZW1haW4gd2hpY2ggYXJlIGFscmVhZHkgY29tcGFjdFxuICByZXR1cm4gZWxlbWVudDtcbn07XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgZXhwYW5kcyBhbiBlbGVtZW50IHVzaW5nIHRoZSBnaXZlbiBjb250ZXh0LiBBbnkgY29udGV4dCBpblxuICogdGhlIGVsZW1lbnQgd2lsbCBiZSByZW1vdmVkLiBBbGwgY29udGV4dCBVUkxzIG11c3QgaGF2ZSBiZWVuIHJldHJpZXZlZFxuICogYmVmb3JlIGNhbGxpbmcgdGhpcyBtZXRob2QuXG4gKlxuICogQHBhcmFtIGFjdGl2ZUN0eCB0aGUgY29udGV4dCB0byB1c2UuXG4gKiBAcGFyYW0gYWN0aXZlUHJvcGVydHkgdGhlIHByb3BlcnR5IGZvciB0aGUgZWxlbWVudCwgbnVsbCBmb3Igbm9uZS5cbiAqIEBwYXJhbSBlbGVtZW50IHRoZSBlbGVtZW50IHRvIGV4cGFuZC5cbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBleHBhbnNpb24gb3B0aW9ucy5cbiAqIEBwYXJhbSBpbnNpZGVMaXN0IHRydWUgaWYgdGhlIGVsZW1lbnQgaXMgYSBsaXN0LCBmYWxzZSBpZiBub3QuXG4gKlxuICogQHJldHVybiB0aGUgZXhwYW5kZWQgdmFsdWUuXG4gKi9cblByb2Nlc3Nvci5wcm90b3R5cGUuZXhwYW5kID0gZnVuY3Rpb24oXG4gIGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksIGVsZW1lbnQsIG9wdGlvbnMsIGluc2lkZUxpc3QpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIG5vdGhpbmcgdG8gZXhwYW5kXG4gIGlmKGVsZW1lbnQgPT09IG51bGwgfHwgZWxlbWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZighX2lzQXJyYXkoZWxlbWVudCkgJiYgIV9pc09iamVjdChlbGVtZW50KSkge1xuICAgIC8vIGRyb3AgZnJlZS1mbG9hdGluZyBzY2FsYXJzIHRoYXQgYXJlIG5vdCBpbiBsaXN0c1xuICAgIGlmKCFpbnNpZGVMaXN0ICYmIChhY3RpdmVQcm9wZXJ0eSA9PT0gbnVsbCB8fFxuICAgICAgX2V4cGFuZElyaShhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCB7dm9jYWI6IHRydWV9KSA9PT0gJ0BncmFwaCcpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBleHBhbmQgZWxlbWVudCBhY2NvcmRpbmcgdG8gdmFsdWUgZXhwYW5zaW9uIHJ1bGVzXG4gICAgcmV0dXJuIF9leHBhbmRWYWx1ZShhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCBlbGVtZW50KTtcbiAgfVxuXG4gIC8vIHJlY3Vyc2l2ZWx5IGV4cGFuZCBhcnJheVxuICBpZihfaXNBcnJheShlbGVtZW50KSkge1xuICAgIHZhciBydmFsID0gW107XG4gICAgdmFyIGNvbnRhaW5lciA9IGpzb25sZC5nZXRDb250ZXh0VmFsdWUoXG4gICAgICBhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCAnQGNvbnRhaW5lcicpO1xuICAgIGluc2lkZUxpc3QgPSBpbnNpZGVMaXN0IHx8IGNvbnRhaW5lciA9PT0gJ0BsaXN0JztcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgZWxlbWVudC5sZW5ndGg7ICsraSkge1xuICAgICAgLy8gZXhwYW5kIGVsZW1lbnRcbiAgICAgIHZhciBlID0gc2VsZi5leHBhbmQoYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgZWxlbWVudFtpXSwgb3B0aW9ucyk7XG4gICAgICBpZihpbnNpZGVMaXN0ICYmIChfaXNBcnJheShlKSB8fCBfaXNMaXN0KGUpKSkge1xuICAgICAgICAvLyBsaXN0cyBvZiBsaXN0cyBhcmUgaWxsZWdhbFxuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGxpc3RzIG9mIGxpc3RzIGFyZSBub3QgcGVybWl0dGVkLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnbGlzdCBvZiBsaXN0cyd9KTtcbiAgICAgIH1cbiAgICAgIC8vIGRyb3AgbnVsbCB2YWx1ZXNcbiAgICAgIGlmKGUgIT09IG51bGwpIHtcbiAgICAgICAgaWYoX2lzQXJyYXkoZSkpIHtcbiAgICAgICAgICBydmFsID0gcnZhbC5jb25jYXQoZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcnZhbC5wdXNoKGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydmFsO1xuICB9XG5cbiAgLy8gcmVjdXJzaXZlbHkgZXhwYW5kIG9iamVjdDpcblxuICAvLyBpZiBlbGVtZW50IGhhcyBhIGNvbnRleHQsIHByb2Nlc3MgaXRcbiAgaWYoJ0Bjb250ZXh0JyBpbiBlbGVtZW50KSB7XG4gICAgYWN0aXZlQ3R4ID0gc2VsZi5wcm9jZXNzQ29udGV4dChhY3RpdmVDdHgsIGVsZW1lbnRbJ0Bjb250ZXh0J10sIG9wdGlvbnMpO1xuICB9XG5cbiAgLy8gZXhwYW5kIHRoZSBhY3RpdmUgcHJvcGVydHlcbiAgdmFyIGV4cGFuZGVkQWN0aXZlUHJvcGVydHkgPSBfZXhwYW5kSXJpKFxuICAgIGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksIHt2b2NhYjogdHJ1ZX0pO1xuXG4gIHZhciBydmFsID0ge307XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZWxlbWVudCkuc29ydCgpO1xuICBmb3IodmFyIGtpID0gMDsga2kgPCBrZXlzLmxlbmd0aDsgKytraSkge1xuICAgIHZhciBrZXkgPSBrZXlzW2tpXTtcbiAgICB2YXIgdmFsdWUgPSBlbGVtZW50W2tleV07XG4gICAgdmFyIGV4cGFuZGVkVmFsdWU7XG5cbiAgICAvLyBza2lwIEBjb250ZXh0XG4gICAgaWYoa2V5ID09PSAnQGNvbnRleHQnKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBleHBhbmQgcHJvcGVydHlcbiAgICB2YXIgZXhwYW5kZWRQcm9wZXJ0eSA9IF9leHBhbmRJcmkoYWN0aXZlQ3R4LCBrZXksIHt2b2NhYjogdHJ1ZX0pO1xuXG4gICAgLy8gZHJvcCBub24tYWJzb2x1dGUgSVJJIGtleXMgdGhhdCBhcmVuJ3Qga2V5d29yZHNcbiAgICBpZihleHBhbmRlZFByb3BlcnR5ID09PSBudWxsIHx8XG4gICAgICAhKF9pc0Fic29sdXRlSXJpKGV4cGFuZGVkUHJvcGVydHkpIHx8IF9pc0tleXdvcmQoZXhwYW5kZWRQcm9wZXJ0eSkpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZihfaXNLZXl3b3JkKGV4cGFuZGVkUHJvcGVydHkpKSB7XG4gICAgICBpZihleHBhbmRlZEFjdGl2ZVByb3BlcnR5ID09PSAnQHJldmVyc2UnKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgYSBrZXl3b3JkIGNhbm5vdCBiZSB1c2VkIGFzIGEgQHJldmVyc2UgJyArXG4gICAgICAgICAgJ3Byb3BlcnR5LicsICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCByZXZlcnNlIHByb3BlcnR5IG1hcCcsIHZhbHVlOiB2YWx1ZX0pO1xuICAgICAgfVxuICAgICAgaWYoZXhwYW5kZWRQcm9wZXJ0eSBpbiBydmFsKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgY29sbGlkaW5nIGtleXdvcmRzIGRldGVjdGVkLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdjb2xsaWRpbmcga2V5d29yZHMnLCBrZXl3b3JkOiBleHBhbmRlZFByb3BlcnR5fSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gc3ludGF4IGVycm9yIGlmIEBpZCBpcyBub3QgYSBzdHJpbmdcbiAgICBpZihleHBhbmRlZFByb3BlcnR5ID09PSAnQGlkJyAmJiAhX2lzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgaWYoIW9wdGlvbnMuaXNGcmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IFwiQGlkXCIgdmFsdWUgbXVzdCBhIHN0cmluZy4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgQGlkIHZhbHVlJywgdmFsdWU6IHZhbHVlfSk7XG4gICAgICB9XG4gICAgICBpZighX2lzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IFwiQGlkXCIgdmFsdWUgbXVzdCBiZSBhIHN0cmluZyBvciBhbiAnICtcbiAgICAgICAgICAnb2JqZWN0LicsICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCBAaWQgdmFsdWUnLCB2YWx1ZTogdmFsdWV9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihleHBhbmRlZFByb3BlcnR5ID09PSAnQHR5cGUnKSB7XG4gICAgICBfdmFsaWRhdGVUeXBlVmFsdWUodmFsdWUpO1xuICAgIH1cblxuICAgIC8vIEBncmFwaCBtdXN0IGJlIGFuIGFycmF5IG9yIGFuIG9iamVjdFxuICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgPT09ICdAZ3JhcGgnICYmXG4gICAgICAhKF9pc09iamVjdCh2YWx1ZSkgfHwgX2lzQXJyYXkodmFsdWUpKSkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAZ3JhcGhcIiB2YWx1ZSBtdXN0IG5vdCBiZSBhbiAnICtcbiAgICAgICAgJ29iamVjdCBvciBhbiBhcnJheS4nLFxuICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdpbnZhbGlkIEBncmFwaCB2YWx1ZScsIHZhbHVlOiB2YWx1ZX0pO1xuICAgIH1cblxuICAgIC8vIEB2YWx1ZSBtdXN0IG5vdCBiZSBhbiBvYmplY3Qgb3IgYW4gYXJyYXlcbiAgICBpZihleHBhbmRlZFByb3BlcnR5ID09PSAnQHZhbHVlJyAmJlxuICAgICAgKF9pc09iamVjdCh2YWx1ZSkgfHwgX2lzQXJyYXkodmFsdWUpKSkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAdmFsdWVcIiB2YWx1ZSBtdXN0IG5vdCBiZSBhbiAnICtcbiAgICAgICAgJ29iamVjdCBvciBhbiBhcnJheS4nLFxuICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAge2NvZGU6ICdpbnZhbGlkIHZhbHVlIG9iamVjdCB2YWx1ZScsIHZhbHVlOiB2YWx1ZX0pO1xuICAgIH1cblxuICAgIC8vIEBsYW5ndWFnZSBtdXN0IGJlIGEgc3RyaW5nXG4gICAgaWYoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BsYW5ndWFnZScpIHtcbiAgICAgIGlmKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgIC8vIGRyb3AgbnVsbCBAbGFuZ3VhZ2UgdmFsdWVzLCB0aGV5IGV4cGFuZCBhcyBpZiB0aGV5IGRpZG4ndCBleGlzdFxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmKCFfaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAbGFuZ3VhZ2VcIiB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdpbnZhbGlkIGxhbmd1YWdlLXRhZ2dlZCBzdHJpbmcnLCB2YWx1ZTogdmFsdWV9KTtcbiAgICAgIH1cbiAgICAgIC8vIGVuc3VyZSBsYW5ndWFnZSB2YWx1ZSBpcyBsb3dlcmNhc2VcbiAgICAgIHZhbHVlID0gdmFsdWUudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICAvLyBAaW5kZXggbXVzdCBiZSBhIHN0cmluZ1xuICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgPT09ICdAaW5kZXgnKSB7XG4gICAgICBpZighX2lzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IFwiQGluZGV4XCIgdmFsdWUgbXVzdCBiZSBhIHN0cmluZy4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCBAaW5kZXggdmFsdWUnLCB2YWx1ZTogdmFsdWV9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBAcmV2ZXJzZSBtdXN0IGJlIGFuIG9iamVjdFxuICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgPT09ICdAcmV2ZXJzZScpIHtcbiAgICAgIGlmKCFfaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAcmV2ZXJzZVwiIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0LicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCBAcmV2ZXJzZSB2YWx1ZScsIHZhbHVlOiB2YWx1ZX0pO1xuICAgICAgfVxuXG4gICAgICBleHBhbmRlZFZhbHVlID0gc2VsZi5leHBhbmQoYWN0aXZlQ3R4LCAnQHJldmVyc2UnLCB2YWx1ZSwgb3B0aW9ucyk7XG5cbiAgICAgIC8vIHByb3BlcnRpZXMgZG91YmxlLXJldmVyc2VkXG4gICAgICBpZignQHJldmVyc2UnIGluIGV4cGFuZGVkVmFsdWUpIHtcbiAgICAgICAgZm9yKHZhciBwcm9wZXJ0eSBpbiBleHBhbmRlZFZhbHVlWydAcmV2ZXJzZSddKSB7XG4gICAgICAgICAganNvbmxkLmFkZFZhbHVlKFxuICAgICAgICAgICAgcnZhbCwgcHJvcGVydHksIGV4cGFuZGVkVmFsdWVbJ0ByZXZlcnNlJ11bcHJvcGVydHldLFxuICAgICAgICAgICAge3Byb3BlcnR5SXNBcnJheTogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEZJWE1FOiBjYW4gdGhpcyBiZSBtZXJnZWQgd2l0aCBjb2RlIGJlbG93IHRvIHNpbXBsaWZ5P1xuICAgICAgLy8gbWVyZ2UgaW4gYWxsIHJldmVyc2VkIHByb3BlcnRpZXNcbiAgICAgIHZhciByZXZlcnNlTWFwID0gcnZhbFsnQHJldmVyc2UnXSB8fCBudWxsO1xuICAgICAgZm9yKHZhciBwcm9wZXJ0eSBpbiBleHBhbmRlZFZhbHVlKSB7XG4gICAgICAgIGlmKHByb3BlcnR5ID09PSAnQHJldmVyc2UnKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYocmV2ZXJzZU1hcCA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldmVyc2VNYXAgPSBydmFsWydAcmV2ZXJzZSddID0ge307XG4gICAgICAgIH1cbiAgICAgICAganNvbmxkLmFkZFZhbHVlKHJldmVyc2VNYXAsIHByb3BlcnR5LCBbXSwge3Byb3BlcnR5SXNBcnJheTogdHJ1ZX0pO1xuICAgICAgICB2YXIgaXRlbXMgPSBleHBhbmRlZFZhbHVlW3Byb3BlcnR5XTtcbiAgICAgICAgZm9yKHZhciBpaSA9IDA7IGlpIDwgaXRlbXMubGVuZ3RoOyArK2lpKSB7XG4gICAgICAgICAgdmFyIGl0ZW0gPSBpdGVtc1tpaV07XG4gICAgICAgICAgaWYoX2lzVmFsdWUoaXRlbSkgfHwgX2lzTGlzdChpdGVtKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAcmV2ZXJzZVwiIHZhbHVlIG11c3Qgbm90IGJlIGEgJyArXG4gICAgICAgICAgICAgICdAdmFsdWUgb3IgYW4gQGxpc3QuJywgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCByZXZlcnNlIHByb3BlcnR5IHZhbHVlJywgdmFsdWU6IGV4cGFuZGVkVmFsdWV9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAganNvbmxkLmFkZFZhbHVlKFxuICAgICAgICAgICAgcmV2ZXJzZU1hcCwgcHJvcGVydHksIGl0ZW0sIHtwcm9wZXJ0eUlzQXJyYXk6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB2YXIgY29udGFpbmVyID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShhY3RpdmVDdHgsIGtleSwgJ0Bjb250YWluZXInKTtcblxuICAgIGlmKGNvbnRhaW5lciA9PT0gJ0BsYW5ndWFnZScgJiYgX2lzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgLy8gaGFuZGxlIGxhbmd1YWdlIG1hcCBjb250YWluZXIgKHNraXAgaWYgdmFsdWUgaXMgbm90IGFuIG9iamVjdClcbiAgICAgIGV4cGFuZGVkVmFsdWUgPSBfZXhwYW5kTGFuZ3VhZ2VNYXAodmFsdWUpO1xuICAgIH0gZWxzZSBpZihjb250YWluZXIgPT09ICdAaW5kZXgnICYmIF9pc09iamVjdCh2YWx1ZSkpIHtcbiAgICAgIC8vIGhhbmRsZSBpbmRleCBjb250YWluZXIgKHNraXAgaWYgdmFsdWUgaXMgbm90IGFuIG9iamVjdClcbiAgICAgIGV4cGFuZGVkVmFsdWUgPSAoZnVuY3Rpb24gX2V4cGFuZEluZGV4TWFwKGFjdGl2ZVByb3BlcnR5KSB7XG4gICAgICAgIHZhciBydmFsID0gW107XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpLnNvcnQoKTtcbiAgICAgICAgZm9yKHZhciBraSA9IDA7IGtpIDwga2V5cy5sZW5ndGg7ICsra2kpIHtcbiAgICAgICAgICB2YXIga2V5ID0ga2V5c1traV07XG4gICAgICAgICAgdmFyIHZhbCA9IHZhbHVlW2tleV07XG4gICAgICAgICAgaWYoIV9pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgIHZhbCA9IFt2YWxdO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YWwgPSBzZWxmLmV4cGFuZChhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCB2YWwsIG9wdGlvbnMsIGZhbHNlKTtcbiAgICAgICAgICBmb3IodmFyIHZpID0gMDsgdmkgPCB2YWwubGVuZ3RoOyArK3ZpKSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IHZhbFt2aV07XG4gICAgICAgICAgICBpZighKCdAaW5kZXgnIGluIGl0ZW0pKSB7XG4gICAgICAgICAgICAgIGl0ZW1bJ0BpbmRleCddID0ga2V5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcnZhbC5wdXNoKGl0ZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnZhbDtcbiAgICAgIH0pKGtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHJlY3Vyc2UgaW50byBAbGlzdCBvciBAc2V0XG4gICAgICB2YXIgaXNMaXN0ID0gKGV4cGFuZGVkUHJvcGVydHkgPT09ICdAbGlzdCcpO1xuICAgICAgaWYoaXNMaXN0IHx8IGV4cGFuZGVkUHJvcGVydHkgPT09ICdAc2V0Jykge1xuICAgICAgICB2YXIgbmV4dEFjdGl2ZVByb3BlcnR5ID0gYWN0aXZlUHJvcGVydHk7XG4gICAgICAgIGlmKGlzTGlzdCAmJiBleHBhbmRlZEFjdGl2ZVByb3BlcnR5ID09PSAnQGdyYXBoJykge1xuICAgICAgICAgIG5leHRBY3RpdmVQcm9wZXJ0eSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZXhwYW5kZWRWYWx1ZSA9IHNlbGYuZXhwYW5kKFxuICAgICAgICAgIGFjdGl2ZUN0eCwgbmV4dEFjdGl2ZVByb3BlcnR5LCB2YWx1ZSwgb3B0aW9ucywgaXNMaXN0KTtcbiAgICAgICAgaWYoaXNMaXN0ICYmIF9pc0xpc3QoZXhwYW5kZWRWYWx1ZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgbGlzdHMgb2YgbGlzdHMgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2xpc3Qgb2YgbGlzdHMnfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJlY3Vyc2l2ZWx5IGV4cGFuZCB2YWx1ZSB3aXRoIGtleSBhcyBuZXcgYWN0aXZlIHByb3BlcnR5XG4gICAgICAgIGV4cGFuZGVkVmFsdWUgPSBzZWxmLmV4cGFuZChhY3RpdmVDdHgsIGtleSwgdmFsdWUsIG9wdGlvbnMsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkcm9wIG51bGwgdmFsdWVzIGlmIHByb3BlcnR5IGlzIG5vdCBAdmFsdWVcbiAgICBpZihleHBhbmRlZFZhbHVlID09PSBudWxsICYmIGV4cGFuZGVkUHJvcGVydHkgIT09ICdAdmFsdWUnKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0IGV4cGFuZGVkIHZhbHVlIHRvIEBsaXN0IGlmIGNvbnRhaW5lciBzcGVjaWZpZXMgaXRcbiAgICBpZihleHBhbmRlZFByb3BlcnR5ICE9PSAnQGxpc3QnICYmICFfaXNMaXN0KGV4cGFuZGVkVmFsdWUpICYmXG4gICAgICBjb250YWluZXIgPT09ICdAbGlzdCcpIHtcbiAgICAgIC8vIGVuc3VyZSBleHBhbmRlZCB2YWx1ZSBpcyBhbiBhcnJheVxuICAgICAgZXhwYW5kZWRWYWx1ZSA9IChfaXNBcnJheShleHBhbmRlZFZhbHVlKSA/XG4gICAgICAgIGV4cGFuZGVkVmFsdWUgOiBbZXhwYW5kZWRWYWx1ZV0pO1xuICAgICAgZXhwYW5kZWRWYWx1ZSA9IHsnQGxpc3QnOiBleHBhbmRlZFZhbHVlfTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRTogY2FuIHRoaXMgYmUgbWVyZ2VkIHdpdGggY29kZSBhYm92ZSB0byBzaW1wbGlmeT9cbiAgICAvLyBtZXJnZSBpbiByZXZlcnNlIHByb3BlcnRpZXNcbiAgICBpZihhY3RpdmVDdHgubWFwcGluZ3Nba2V5XSAmJiBhY3RpdmVDdHgubWFwcGluZ3Nba2V5XS5yZXZlcnNlKSB7XG4gICAgICB2YXIgcmV2ZXJzZU1hcCA9IHJ2YWxbJ0ByZXZlcnNlJ10gPSBydmFsWydAcmV2ZXJzZSddIHx8IHt9O1xuICAgICAgaWYoIV9pc0FycmF5KGV4cGFuZGVkVmFsdWUpKSB7XG4gICAgICAgIGV4cGFuZGVkVmFsdWUgPSBbZXhwYW5kZWRWYWx1ZV07XG4gICAgICB9XG4gICAgICBmb3IodmFyIGlpID0gMDsgaWkgPCBleHBhbmRlZFZhbHVlLmxlbmd0aDsgKytpaSkge1xuICAgICAgICB2YXIgaXRlbSA9IGV4cGFuZGVkVmFsdWVbaWldO1xuICAgICAgICBpZihfaXNWYWx1ZShpdGVtKSB8fCBfaXNMaXN0KGl0ZW0pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IFwiQHJldmVyc2VcIiB2YWx1ZSBtdXN0IG5vdCBiZSBhICcgK1xuICAgICAgICAgICAgJ0B2YWx1ZSBvciBhbiBAbGlzdC4nLCAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCByZXZlcnNlIHByb3BlcnR5IHZhbHVlJywgdmFsdWU6IGV4cGFuZGVkVmFsdWV9KTtcbiAgICAgICAgfVxuICAgICAgICBqc29ubGQuYWRkVmFsdWUoXG4gICAgICAgICAgcmV2ZXJzZU1hcCwgZXhwYW5kZWRQcm9wZXJ0eSwgaXRlbSwge3Byb3BlcnR5SXNBcnJheTogdHJ1ZX0pO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gYWRkIHZhbHVlIGZvciBwcm9wZXJ0eVxuICAgIC8vIHVzZSBhbiBhcnJheSBleGNlcHQgZm9yIGNlcnRhaW4ga2V5d29yZHNcbiAgICB2YXIgdXNlQXJyYXkgPVxuICAgICAgWydAaW5kZXgnLCAnQGlkJywgJ0B0eXBlJywgJ0B2YWx1ZScsICdAbGFuZ3VhZ2UnXS5pbmRleE9mKFxuICAgICAgICBleHBhbmRlZFByb3BlcnR5KSA9PT0gLTE7XG4gICAganNvbmxkLmFkZFZhbHVlKFxuICAgICAgcnZhbCwgZXhwYW5kZWRQcm9wZXJ0eSwgZXhwYW5kZWRWYWx1ZSwge3Byb3BlcnR5SXNBcnJheTogdXNlQXJyYXl9KTtcbiAgfVxuXG4gIC8vIGdldCBwcm9wZXJ0eSBjb3VudCBvbiBleHBhbmRlZCBvdXRwdXRcbiAga2V5cyA9IE9iamVjdC5rZXlzKHJ2YWwpO1xuICB2YXIgY291bnQgPSBrZXlzLmxlbmd0aDtcblxuICBpZignQHZhbHVlJyBpbiBydmFsKSB7XG4gICAgLy8gQHZhbHVlIG11c3Qgb25seSBoYXZlIEBsYW5ndWFnZSBvciBAdHlwZVxuICAgIGlmKCdAdHlwZScgaW4gcnZhbCAmJiAnQGxhbmd1YWdlJyBpbiBydmFsKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhbiBlbGVtZW50IGNvbnRhaW5pbmcgXCJAdmFsdWVcIiBtYXkgbm90ICcgK1xuICAgICAgICAnY29udGFpbiBib3RoIFwiQHR5cGVcIiBhbmQgXCJAbGFuZ3VhZ2VcIi4nLFxuICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdpbnZhbGlkIHZhbHVlIG9iamVjdCcsIGVsZW1lbnQ6IHJ2YWx9KTtcbiAgICB9XG4gICAgdmFyIHZhbGlkQ291bnQgPSBjb3VudCAtIDE7XG4gICAgaWYoJ0B0eXBlJyBpbiBydmFsKSB7XG4gICAgICB2YWxpZENvdW50IC09IDE7XG4gICAgfVxuICAgIGlmKCdAaW5kZXgnIGluIHJ2YWwpIHtcbiAgICAgIHZhbGlkQ291bnQgLT0gMTtcbiAgICB9XG4gICAgaWYoJ0BsYW5ndWFnZScgaW4gcnZhbCkge1xuICAgICAgdmFsaWRDb3VudCAtPSAxO1xuICAgIH1cbiAgICBpZih2YWxpZENvdW50ICE9PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhbiBlbGVtZW50IGNvbnRhaW5pbmcgXCJAdmFsdWVcIiBtYXkgb25seSAnICtcbiAgICAgICAgJ2hhdmUgYW4gXCJAaW5kZXhcIiBwcm9wZXJ0eSBhbmQgYXQgbW9zdCBvbmUgb3RoZXIgcHJvcGVydHkgJyArXG4gICAgICAgICd3aGljaCBjYW4gYmUgXCJAdHlwZVwiIG9yIFwiQGxhbmd1YWdlXCIuJyxcbiAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCB2YWx1ZSBvYmplY3QnLCBlbGVtZW50OiBydmFsfSk7XG4gICAgfVxuICAgIC8vIGRyb3AgbnVsbCBAdmFsdWVzXG4gICAgaWYocnZhbFsnQHZhbHVlJ10gPT09IG51bGwpIHtcbiAgICAgIHJ2YWwgPSBudWxsO1xuICAgIH0gZWxzZSBpZignQGxhbmd1YWdlJyBpbiBydmFsICYmICFfaXNTdHJpbmcocnZhbFsnQHZhbHVlJ10pKSB7XG4gICAgICAvLyBpZiBAbGFuZ3VhZ2UgaXMgcHJlc2VudCwgQHZhbHVlIG11c3QgYmUgYSBzdHJpbmdcbiAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IG9ubHkgc3RyaW5ncyBtYXkgYmUgbGFuZ3VhZ2UtdGFnZ2VkLicsXG4gICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICB7Y29kZTogJ2ludmFsaWQgbGFuZ3VhZ2UtdGFnZ2VkIHZhbHVlJywgZWxlbWVudDogcnZhbH0pO1xuICAgIH0gZWxzZSBpZignQHR5cGUnIGluIHJ2YWwgJiYgKCFfaXNBYnNvbHV0ZUlyaShydmFsWydAdHlwZSddKSB8fFxuICAgICAgcnZhbFsnQHR5cGUnXS5pbmRleE9mKCdfOicpID09PSAwKSkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgYW4gZWxlbWVudCBjb250YWluaW5nIFwiQHZhbHVlXCIgYW5kIFwiQHR5cGVcIiAnICtcbiAgICAgICAgJ211c3QgaGF2ZSBhbiBhYnNvbHV0ZSBJUkkgZm9yIHRoZSB2YWx1ZSBvZiBcIkB0eXBlXCIuJyxcbiAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCB0eXBlZCB2YWx1ZScsIGVsZW1lbnQ6IHJ2YWx9KTtcbiAgICB9XG4gIH0gZWxzZSBpZignQHR5cGUnIGluIHJ2YWwgJiYgIV9pc0FycmF5KHJ2YWxbJ0B0eXBlJ10pKSB7XG4gICAgLy8gY29udmVydCBAdHlwZSB0byBhbiBhcnJheVxuICAgIHJ2YWxbJ0B0eXBlJ10gPSBbcnZhbFsnQHR5cGUnXV07XG4gIH0gZWxzZSBpZignQHNldCcgaW4gcnZhbCB8fCAnQGxpc3QnIGluIHJ2YWwpIHtcbiAgICAvLyBoYW5kbGUgQHNldCBhbmQgQGxpc3RcbiAgICBpZihjb3VudCA+IDEgJiYgIShjb3VudCA9PT0gMiAmJiAnQGluZGV4JyBpbiBydmFsKSkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgaWYgYW4gZWxlbWVudCBoYXMgdGhlIHByb3BlcnR5IFwiQHNldFwiICcgK1xuICAgICAgICAnb3IgXCJAbGlzdFwiLCB0aGVuIGl0IGNhbiBoYXZlIGF0IG1vc3Qgb25lIG90aGVyIHByb3BlcnR5IHRoYXQgaXMgJyArXG4gICAgICAgICdcIkBpbmRleFwiLicsICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICB7Y29kZTogJ2ludmFsaWQgc2V0IG9yIGxpc3Qgb2JqZWN0JywgZWxlbWVudDogcnZhbH0pO1xuICAgIH1cbiAgICAvLyBvcHRpbWl6ZSBhd2F5IEBzZXRcbiAgICBpZignQHNldCcgaW4gcnZhbCkge1xuICAgICAgcnZhbCA9IHJ2YWxbJ0BzZXQnXTtcbiAgICAgIGtleXMgPSBPYmplY3Qua2V5cyhydmFsKTtcbiAgICAgIGNvdW50ID0ga2V5cy5sZW5ndGg7XG4gICAgfVxuICB9IGVsc2UgaWYoY291bnQgPT09IDEgJiYgJ0BsYW5ndWFnZScgaW4gcnZhbCkge1xuICAgIC8vIGRyb3Agb2JqZWN0cyB3aXRoIG9ubHkgQGxhbmd1YWdlXG4gICAgcnZhbCA9IG51bGw7XG4gIH1cblxuICAvLyBkcm9wIGNlcnRhaW4gdG9wLWxldmVsIG9iamVjdHMgdGhhdCBkbyBub3Qgb2NjdXIgaW4gbGlzdHNcbiAgaWYoX2lzT2JqZWN0KHJ2YWwpICYmXG4gICAgIW9wdGlvbnMua2VlcEZyZWVGbG9hdGluZ05vZGVzICYmICFpbnNpZGVMaXN0ICYmXG4gICAgKGFjdGl2ZVByb3BlcnR5ID09PSBudWxsIHx8IGV4cGFuZGVkQWN0aXZlUHJvcGVydHkgPT09ICdAZ3JhcGgnKSkge1xuICAgIC8vIGRyb3AgZW1wdHkgb2JqZWN0LCB0b3AtbGV2ZWwgQHZhbHVlL0BsaXN0LCBvciBvYmplY3Qgd2l0aCBvbmx5IEBpZFxuICAgIGlmKGNvdW50ID09PSAwIHx8ICdAdmFsdWUnIGluIHJ2YWwgfHwgJ0BsaXN0JyBpbiBydmFsIHx8XG4gICAgICAoY291bnQgPT09IDEgJiYgJ0BpZCcgaW4gcnZhbCkpIHtcbiAgICAgIHJ2YWwgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBydmFsO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgSlNPTi1MRCBub2RlIG1hcCAobm9kZSBJRCA9PiBub2RlKS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIGV4cGFuZGVkIEpTT04tTEQgdG8gY3JlYXRlIGEgbm9kZSBtYXAgb2YuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtuYW1lcl0gdGhlIFVuaXF1ZU5hbWVyIHRvIHVzZS5cbiAqXG4gKiBAcmV0dXJuIHRoZSBub2RlIG1hcC5cbiAqL1xuUHJvY2Vzc29yLnByb3RvdHlwZS5jcmVhdGVOb2RlTWFwID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gcHJvZHVjZSBhIG1hcCBvZiBhbGwgc3ViamVjdHMgYW5kIG5hbWUgZWFjaCBibm9kZVxuICB2YXIgbmFtZXIgPSBvcHRpb25zLm5hbWVyIHx8IG5ldyBVbmlxdWVOYW1lcignXzpiJyk7XG4gIHZhciBncmFwaHMgPSB7J0BkZWZhdWx0Jzoge319O1xuICBfY3JlYXRlTm9kZU1hcChpbnB1dCwgZ3JhcGhzLCAnQGRlZmF1bHQnLCBuYW1lcik7XG5cbiAgLy8gYWRkIGFsbCBub24tZGVmYXVsdCBncmFwaHMgdG8gZGVmYXVsdCBncmFwaFxuICByZXR1cm4gX21lcmdlTm9kZU1hcHMoZ3JhcGhzKTtcbn07XG5cbi8qKlxuICogUGVyZm9ybXMgSlNPTi1MRCBmbGF0dGVuaW5nLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgZXhwYW5kZWQgSlNPTi1MRCB0byBmbGF0dGVuLlxuICpcbiAqIEByZXR1cm4gdGhlIGZsYXR0ZW5lZCBvdXRwdXQuXG4gKi9cblByb2Nlc3Nvci5wcm90b3R5cGUuZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIHZhciBkZWZhdWx0R3JhcGggPSB0aGlzLmNyZWF0ZU5vZGVNYXAoaW5wdXQpO1xuXG4gIC8vIHByb2R1Y2UgZmxhdHRlbmVkIG91dHB1dFxuICB2YXIgZmxhdHRlbmVkID0gW107XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGVmYXVsdEdyYXBoKS5zb3J0KCk7XG4gIGZvcih2YXIga2kgPSAwOyBraSA8IGtleXMubGVuZ3RoOyArK2tpKSB7XG4gICAgdmFyIG5vZGUgPSBkZWZhdWx0R3JhcGhba2V5c1traV1dO1xuICAgIC8vIG9ubHkgYWRkIGZ1bGwgc3ViamVjdHMgdG8gdG9wLWxldmVsXG4gICAgaWYoIV9pc1N1YmplY3RSZWZlcmVuY2Uobm9kZSkpIHtcbiAgICAgIGZsYXR0ZW5lZC5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmxhdHRlbmVkO1xufTtcblxuLyoqXG4gKiBQZXJmb3JtcyBKU09OLUxEIGZyYW1pbmcuXG4gKlxuICogQHBhcmFtIGlucHV0IHRoZSBleHBhbmRlZCBKU09OLUxEIHRvIGZyYW1lLlxuICogQHBhcmFtIGZyYW1lIHRoZSBleHBhbmRlZCBKU09OLUxEIGZyYW1lIHRvIHVzZS5cbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBmcmFtaW5nIG9wdGlvbnMuXG4gKlxuICogQHJldHVybiB0aGUgZnJhbWVkIG91dHB1dC5cbiAqL1xuUHJvY2Vzc29yLnByb3RvdHlwZS5mcmFtZSA9IGZ1bmN0aW9uKGlucHV0LCBmcmFtZSwgb3B0aW9ucykge1xuICAvLyBjcmVhdGUgZnJhbWluZyBzdGF0ZVxuICB2YXIgc3RhdGUgPSB7XG4gICAgb3B0aW9uczogb3B0aW9ucyxcbiAgICBncmFwaHM6IHsnQGRlZmF1bHQnOiB7fSwgJ0BtZXJnZWQnOiB7fX0sXG4gICAgc3ViamVjdFN0YWNrOiBbXSxcbiAgICBsaW5rOiB7fVxuICB9O1xuXG4gIC8vIHByb2R1Y2UgYSBtYXAgb2YgYWxsIGdyYXBocyBhbmQgbmFtZSBlYWNoIGJub2RlXG4gIC8vIEZJWE1FOiBjdXJyZW50bHkgdXNlcyBzdWJqZWN0cyBmcm9tIEBtZXJnZWQgZ3JhcGggb25seVxuICB2YXIgbmFtZXIgPSBuZXcgVW5pcXVlTmFtZXIoJ186YicpO1xuICBfY3JlYXRlTm9kZU1hcChpbnB1dCwgc3RhdGUuZ3JhcGhzLCAnQG1lcmdlZCcsIG5hbWVyKTtcbiAgc3RhdGUuc3ViamVjdHMgPSBzdGF0ZS5ncmFwaHNbJ0BtZXJnZWQnXTtcblxuICAvLyBmcmFtZSB0aGUgc3ViamVjdHNcbiAgdmFyIGZyYW1lZCA9IFtdO1xuICBfZnJhbWUoc3RhdGUsIE9iamVjdC5rZXlzKHN0YXRlLnN1YmplY3RzKS5zb3J0KCksIGZyYW1lLCBmcmFtZWQsIG51bGwpO1xuICByZXR1cm4gZnJhbWVkO1xufTtcblxuLyoqXG4gKiBQZXJmb3JtcyBub3JtYWxpemF0aW9uIG9uIHRoZSBnaXZlbiBSREYgZGF0YXNldC5cbiAqXG4gKiBAcGFyYW0gZGF0YXNldCB0aGUgUkRGIGRhdGFzZXQgdG8gbm9ybWFsaXplLlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIG5vcm1hbGl6YXRpb24gb3B0aW9ucy5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIG5vcm1hbGl6ZWQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5Qcm9jZXNzb3IucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKGRhdGFzZXQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIC8vIGNyZWF0ZSBxdWFkcyBhbmQgbWFwIGJub2RlcyB0byB0aGVpciBhc3NvY2lhdGVkIHF1YWRzXG4gIHZhciBxdWFkcyA9IFtdO1xuICB2YXIgYm5vZGVzID0ge307XG4gIGZvcih2YXIgZ3JhcGhOYW1lIGluIGRhdGFzZXQpIHtcbiAgICB2YXIgdHJpcGxlcyA9IGRhdGFzZXRbZ3JhcGhOYW1lXTtcbiAgICBpZihncmFwaE5hbWUgPT09ICdAZGVmYXVsdCcpIHtcbiAgICAgIGdyYXBoTmFtZSA9IG51bGw7XG4gICAgfVxuICAgIGZvcih2YXIgdGkgPSAwOyB0aSA8IHRyaXBsZXMubGVuZ3RoOyArK3RpKSB7XG4gICAgICB2YXIgcXVhZCA9IHRyaXBsZXNbdGldO1xuICAgICAgaWYoZ3JhcGhOYW1lICE9PSBudWxsKSB7XG4gICAgICAgIGlmKGdyYXBoTmFtZS5pbmRleE9mKCdfOicpID09PSAwKSB7XG4gICAgICAgICAgcXVhZC5uYW1lID0ge3R5cGU6ICdibGFuayBub2RlJywgdmFsdWU6IGdyYXBoTmFtZX07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcXVhZC5uYW1lID0ge3R5cGU6ICdJUkknLCB2YWx1ZTogZ3JhcGhOYW1lfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcXVhZHMucHVzaChxdWFkKTtcblxuICAgICAgdmFyIGF0dHJzID0gWydzdWJqZWN0JywgJ29iamVjdCcsICduYW1lJ107XG4gICAgICBmb3IodmFyIGFpID0gMDsgYWkgPCBhdHRycy5sZW5ndGg7ICsrYWkpIHtcbiAgICAgICAgdmFyIGF0dHIgPSBhdHRyc1thaV07XG4gICAgICAgIGlmKHF1YWRbYXR0cl0gJiYgcXVhZFthdHRyXS50eXBlID09PSAnYmxhbmsgbm9kZScpIHtcbiAgICAgICAgICB2YXIgaWQgPSBxdWFkW2F0dHJdLnZhbHVlO1xuICAgICAgICAgIGlmKGlkIGluIGJub2Rlcykge1xuICAgICAgICAgICAgYm5vZGVzW2lkXS5xdWFkcy5wdXNoKHF1YWQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBibm9kZXNbaWRdID0ge3F1YWRzOiBbcXVhZF19O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIG1hcHBpbmcgY29tcGxldGUsIHN0YXJ0IGNhbm9uaWNhbCBuYW1pbmdcbiAgdmFyIG5hbWVyID0gbmV3IFVuaXF1ZU5hbWVyKCdfOmMxNG4nKTtcbiAgcmV0dXJuIGhhc2hCbGFua05vZGVzKE9iamVjdC5rZXlzKGJub2RlcykpO1xuXG4gIC8vIGdlbmVyYXRlcyB1bmlxdWUgYW5kIGR1cGxpY2F0ZSBoYXNoZXMgZm9yIGJub2Rlc1xuICBmdW5jdGlvbiBoYXNoQmxhbmtOb2Rlcyh1bm5hbWVkKSB7XG4gICAgdmFyIG5leHRVbm5hbWVkID0gW107XG4gICAgdmFyIGR1cGxpY2F0ZXMgPSB7fTtcbiAgICB2YXIgdW5pcXVlID0ge307XG5cbiAgICAvLyBoYXNoIHF1YWRzIGZvciBlYWNoIHVubmFtZWQgYm5vZGVcbiAgICBqc29ubGQuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge2hhc2hVbm5hbWVkKDApO30pO1xuICAgIGZ1bmN0aW9uIGhhc2hVbm5hbWVkKGkpIHtcbiAgICAgIGlmKGkgPT09IHVubmFtZWQubGVuZ3RoKSB7XG4gICAgICAgIC8vIGRvbmUsIG5hbWUgYmxhbmsgbm9kZXNcbiAgICAgICAgcmV0dXJuIG5hbWVCbGFua05vZGVzKHVuaXF1ZSwgZHVwbGljYXRlcywgbmV4dFVubmFtZWQpO1xuICAgICAgfVxuXG4gICAgICAvLyBoYXNoIHVubmFtZWQgYm5vZGVcbiAgICAgIHZhciBibm9kZSA9IHVubmFtZWRbaV07XG4gICAgICB2YXIgaGFzaCA9IF9oYXNoUXVhZHMoYm5vZGUsIGJub2Rlcyk7XG5cbiAgICAgIC8vIHN0b3JlIGhhc2ggYXMgdW5pcXVlIG9yIGEgZHVwbGljYXRlXG4gICAgICBpZihoYXNoIGluIGR1cGxpY2F0ZXMpIHtcbiAgICAgICAgZHVwbGljYXRlc1toYXNoXS5wdXNoKGJub2RlKTtcbiAgICAgICAgbmV4dFVubmFtZWQucHVzaChibm9kZSk7XG4gICAgICB9IGVsc2UgaWYoaGFzaCBpbiB1bmlxdWUpIHtcbiAgICAgICAgZHVwbGljYXRlc1toYXNoXSA9IFt1bmlxdWVbaGFzaF0sIGJub2RlXTtcbiAgICAgICAgbmV4dFVubmFtZWQucHVzaCh1bmlxdWVbaGFzaF0pO1xuICAgICAgICBuZXh0VW5uYW1lZC5wdXNoKGJub2RlKTtcbiAgICAgICAgZGVsZXRlIHVuaXF1ZVtoYXNoXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVuaXF1ZVtoYXNoXSA9IGJub2RlO1xuICAgICAgfVxuXG4gICAgICAvLyBoYXNoIG5leHQgdW5uYW1lZCBibm9kZVxuICAgICAganNvbmxkLnNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtoYXNoVW5uYW1lZChpICsgMSk7fSk7XG4gICAgfVxuICB9XG5cbiAgLy8gbmFtZXMgdW5pcXVlIGhhc2ggYm5vZGVzXG4gIGZ1bmN0aW9uIG5hbWVCbGFua05vZGVzKHVuaXF1ZSwgZHVwbGljYXRlcywgdW5uYW1lZCkge1xuICAgIC8vIG5hbWUgdW5pcXVlIGJub2RlcyBpbiBzb3J0ZWQgaGFzaCBvcmRlclxuICAgIHZhciBuYW1lZCA9IGZhbHNlO1xuICAgIHZhciBoYXNoZXMgPSBPYmplY3Qua2V5cyh1bmlxdWUpLnNvcnQoKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgaGFzaGVzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgYm5vZGUgPSB1bmlxdWVbaGFzaGVzW2ldXTtcbiAgICAgIG5hbWVyLmdldE5hbWUoYm5vZGUpO1xuICAgICAgbmFtZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmKG5hbWVkKSB7XG4gICAgICAvLyBjb250aW51ZSB0byBoYXNoIGJub2RlcyBpZiBhIGJub2RlIHdhcyBhc3NpZ25lZCBhIG5hbWVcbiAgICAgIGhhc2hCbGFua05vZGVzKHVubmFtZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBuYW1lIHRoZSBkdXBsaWNhdGUgaGFzaCBibm9kZXNcbiAgICAgIG5hbWVEdXBsaWNhdGVzKGR1cGxpY2F0ZXMpO1xuICAgIH1cbiAgfVxuXG4gIC8vIG5hbWVzIGR1cGxpY2F0ZSBoYXNoIGJub2Rlc1xuICBmdW5jdGlvbiBuYW1lRHVwbGljYXRlcyhkdXBsaWNhdGVzKSB7XG4gICAgLy8gZW51bWVyYXRlIGR1cGxpY2F0ZSBoYXNoIGdyb3VwcyBpbiBzb3J0ZWQgb3JkZXJcbiAgICB2YXIgaGFzaGVzID0gT2JqZWN0LmtleXMoZHVwbGljYXRlcykuc29ydCgpO1xuXG4gICAgLy8gcHJvY2VzcyBlYWNoIGdyb3VwXG4gICAgcHJvY2Vzc0dyb3VwKDApO1xuICAgIGZ1bmN0aW9uIHByb2Nlc3NHcm91cChpKSB7XG4gICAgICBpZihpID09PSBoYXNoZXMubGVuZ3RoKSB7XG4gICAgICAgIC8vIGRvbmUsIGNyZWF0ZSBKU09OLUxEIGFycmF5XG4gICAgICAgIHJldHVybiBjcmVhdGVBcnJheSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBuYW1lIGVhY2ggZ3JvdXAgbWVtYmVyXG4gICAgICB2YXIgZ3JvdXAgPSBkdXBsaWNhdGVzW2hhc2hlc1tpXV07XG4gICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgbmFtZUdyb3VwTWVtYmVyKGdyb3VwLCAwKTtcbiAgICAgIGZ1bmN0aW9uIG5hbWVHcm91cE1lbWJlcihncm91cCwgbikge1xuICAgICAgICBpZihuID09PSBncm91cC5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBuYW1lIGJub2RlcyBpbiBoYXNoIG9yZGVyXG4gICAgICAgICAgcmVzdWx0cy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIGEgPSBhLmhhc2g7XG4gICAgICAgICAgICBiID0gYi5oYXNoO1xuICAgICAgICAgICAgcmV0dXJuIChhIDwgYikgPyAtMSA6ICgoYSA+IGIpID8gMSA6IDApO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGZvcih2YXIgciBpbiByZXN1bHRzKSB7XG4gICAgICAgICAgICAvLyBuYW1lIGFsbCBibm9kZXMgaW4gcGF0aCBuYW1lciBpbiBrZXktZW50cnkgb3JkZXJcbiAgICAgICAgICAgIC8vIE5vdGU6IGtleS1vcmRlciBpcyBwcmVzZXJ2ZWQgaW4gamF2YXNjcmlwdFxuICAgICAgICAgICAgZm9yKHZhciBrZXkgaW4gcmVzdWx0c1tyXS5wYXRoTmFtZXIuZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgbmFtZXIuZ2V0TmFtZShrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcHJvY2Vzc0dyb3VwKGkgKyAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNraXAgYWxyZWFkeS1uYW1lZCBibm9kZXNcbiAgICAgICAgdmFyIGJub2RlID0gZ3JvdXBbbl07XG4gICAgICAgIGlmKG5hbWVyLmlzTmFtZWQoYm5vZGUpKSB7XG4gICAgICAgICAgcmV0dXJuIG5hbWVHcm91cE1lbWJlcihncm91cCwgbiArIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaGFzaCBibm9kZSBwYXRoc1xuICAgICAgICB2YXIgcGF0aE5hbWVyID0gbmV3IFVuaXF1ZU5hbWVyKCdfOmInKTtcbiAgICAgICAgcGF0aE5hbWVyLmdldE5hbWUoYm5vZGUpO1xuICAgICAgICBfaGFzaFBhdGhzKGJub2RlLCBibm9kZXMsIG5hbWVyLCBwYXRoTmFtZXIsXG4gICAgICAgICAgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICAgICAgbmFtZUdyb3VwTWVtYmVyKGdyb3VwLCBuICsgMSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gY3JlYXRlcyB0aGUgc29ydGVkIGFycmF5IG9mIFJERiBxdWFkc1xuICBmdW5jdGlvbiBjcmVhdGVBcnJheSgpIHtcbiAgICB2YXIgbm9ybWFsaXplZCA9IFtdO1xuXG4gICAgLyogTm90ZTogQXQgdGhpcyBwb2ludCBhbGwgYm5vZGVzIGluIHRoZSBzZXQgb2YgUkRGIHF1YWRzIGhhdmUgYmVlblxuICAgICBhc3NpZ25lZCBjYW5vbmljYWwgbmFtZXMsIHdoaWNoIGhhdmUgYmVlbiBzdG9yZWQgaW4gdGhlICduYW1lcicgb2JqZWN0LlxuICAgICBIZXJlIGVhY2ggcXVhZCBpcyB1cGRhdGVkIGJ5IGFzc2lnbmluZyBlYWNoIG9mIGl0cyBibm9kZXMgaXRzIG5ldyBuYW1lXG4gICAgIHZpYSB0aGUgJ25hbWVyJyBvYmplY3QuICovXG5cbiAgICAvLyB1cGRhdGUgYm5vZGUgbmFtZXMgaW4gZWFjaCBxdWFkIGFuZCBzZXJpYWxpemVcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcXVhZHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBxdWFkID0gcXVhZHNbaV07XG4gICAgICB2YXIgYXR0cnMgPSBbJ3N1YmplY3QnLCAnb2JqZWN0JywgJ25hbWUnXTtcbiAgICAgIGZvcih2YXIgYWkgPSAwOyBhaSA8IGF0dHJzLmxlbmd0aDsgKythaSkge1xuICAgICAgICB2YXIgYXR0ciA9IGF0dHJzW2FpXTtcbiAgICAgICAgaWYocXVhZFthdHRyXSAmJiBxdWFkW2F0dHJdLnR5cGUgPT09ICdibGFuayBub2RlJyAmJlxuICAgICAgICAgIHF1YWRbYXR0cl0udmFsdWUuaW5kZXhPZignXzpjMTRuJykgIT09IDApIHtcbiAgICAgICAgICBxdWFkW2F0dHJdLnZhbHVlID0gbmFtZXIuZ2V0TmFtZShxdWFkW2F0dHJdLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbm9ybWFsaXplZC5wdXNoKF90b05RdWFkKHF1YWQsIHF1YWQubmFtZSA/IHF1YWQubmFtZS52YWx1ZSA6IG51bGwpKTtcbiAgICB9XG5cbiAgICAvLyBzb3J0IG5vcm1hbGl6ZWQgb3V0cHV0XG4gICAgbm9ybWFsaXplZC5zb3J0KCk7XG5cbiAgICAvLyBoYW5kbGUgb3V0cHV0IGZvcm1hdFxuICAgIGlmKG9wdGlvbnMuZm9ybWF0KSB7XG4gICAgICBpZihvcHRpb25zLmZvcm1hdCA9PT0gJ2FwcGxpY2F0aW9uL25xdWFkcycpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIG5vcm1hbGl6ZWQuam9pbignJykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ1Vua25vd24gb3V0cHV0IGZvcm1hdC4nLFxuICAgICAgICAnanNvbmxkLlVua25vd25Gb3JtYXQnLCB7Zm9ybWF0OiBvcHRpb25zLmZvcm1hdH0pKTtcbiAgICB9XG5cbiAgICAvLyBvdXRwdXQgUkRGIGRhdGFzZXRcbiAgICBjYWxsYmFjayhudWxsLCBfcGFyc2VOUXVhZHMobm9ybWFsaXplZC5qb2luKCcnKSkpO1xuICB9XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGFuIFJERiBkYXRhc2V0IHRvIEpTT04tTEQuXG4gKlxuICogQHBhcmFtIGRhdGFzZXQgdGhlIFJERiBkYXRhc2V0LlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIFJERiBzZXJpYWxpemF0aW9uIG9wdGlvbnMuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBvdXRwdXQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5Qcm9jZXNzb3IucHJvdG90eXBlLmZyb21SREYgPSBmdW5jdGlvbihkYXRhc2V0LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICB2YXIgZGVmYXVsdEdyYXBoID0ge307XG4gIHZhciBncmFwaE1hcCA9IHsnQGRlZmF1bHQnOiBkZWZhdWx0R3JhcGh9O1xuICB2YXIgcmVmZXJlbmNlZE9uY2UgPSB7fTtcblxuICBmb3IodmFyIG5hbWUgaW4gZGF0YXNldCkge1xuICAgIHZhciBncmFwaCA9IGRhdGFzZXRbbmFtZV07XG4gICAgaWYoIShuYW1lIGluIGdyYXBoTWFwKSkge1xuICAgICAgZ3JhcGhNYXBbbmFtZV0gPSB7fTtcbiAgICB9XG4gICAgaWYobmFtZSAhPT0gJ0BkZWZhdWx0JyAmJiAhKG5hbWUgaW4gZGVmYXVsdEdyYXBoKSkge1xuICAgICAgZGVmYXVsdEdyYXBoW25hbWVdID0geydAaWQnOiBuYW1lfTtcbiAgICB9XG4gICAgdmFyIG5vZGVNYXAgPSBncmFwaE1hcFtuYW1lXTtcbiAgICBmb3IodmFyIHRpID0gMDsgdGkgPCBncmFwaC5sZW5ndGg7ICsrdGkpIHtcbiAgICAgIHZhciB0cmlwbGUgPSBncmFwaFt0aV07XG5cbiAgICAgIC8vIGdldCBzdWJqZWN0LCBwcmVkaWNhdGUsIG9iamVjdFxuICAgICAgdmFyIHMgPSB0cmlwbGUuc3ViamVjdC52YWx1ZTtcbiAgICAgIHZhciBwID0gdHJpcGxlLnByZWRpY2F0ZS52YWx1ZTtcbiAgICAgIHZhciBvID0gdHJpcGxlLm9iamVjdDtcblxuICAgICAgaWYoIShzIGluIG5vZGVNYXApKSB7XG4gICAgICAgIG5vZGVNYXBbc10gPSB7J0BpZCc6IHN9O1xuICAgICAgfVxuICAgICAgdmFyIG5vZGUgPSBub2RlTWFwW3NdO1xuXG4gICAgICB2YXIgb2JqZWN0SXNJZCA9IChvLnR5cGUgPT09ICdJUkknIHx8IG8udHlwZSA9PT0gJ2JsYW5rIG5vZGUnKTtcbiAgICAgIGlmKG9iamVjdElzSWQgJiYgIShvLnZhbHVlIGluIG5vZGVNYXApKSB7XG4gICAgICAgIG5vZGVNYXBbby52YWx1ZV0gPSB7J0BpZCc6IG8udmFsdWV9O1xuICAgICAgfVxuXG4gICAgICBpZihwID09PSBSREZfVFlQRSAmJiAhb3B0aW9ucy51c2VSZGZUeXBlICYmIG9iamVjdElzSWQpIHtcbiAgICAgICAganNvbmxkLmFkZFZhbHVlKG5vZGUsICdAdHlwZScsIG8udmFsdWUsIHtwcm9wZXJ0eUlzQXJyYXk6IHRydWV9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSA9IF9SREZUb09iamVjdChvLCBvcHRpb25zLnVzZU5hdGl2ZVR5cGVzKTtcbiAgICAgIGpzb25sZC5hZGRWYWx1ZShub2RlLCBwLCB2YWx1ZSwge3Byb3BlcnR5SXNBcnJheTogdHJ1ZX0pO1xuXG4gICAgICAvLyBvYmplY3QgbWF5IGJlIGFuIFJERiBsaXN0L3BhcnRpYWwgbGlzdCBub2RlIGJ1dCB3ZSBjYW4ndCBrbm93IGVhc2lseVxuICAgICAgLy8gdW50aWwgYWxsIHRyaXBsZXMgYXJlIHJlYWRcbiAgICAgIGlmKG9iamVjdElzSWQpIHtcbiAgICAgICAgaWYoby52YWx1ZSA9PT0gUkRGX05JTCkge1xuICAgICAgICAgIC8vIHRyYWNrIHJkZjpuaWwgdW5pcXVlbHkgcGVyIGdyYXBoXG4gICAgICAgICAgdmFyIG9iamVjdCA9IG5vZGVNYXBbby52YWx1ZV07XG4gICAgICAgICAgaWYoISgndXNhZ2VzJyBpbiBvYmplY3QpKSB7XG4gICAgICAgICAgICBvYmplY3QudXNhZ2VzID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIG9iamVjdC51c2FnZXMucHVzaCh7XG4gICAgICAgICAgICBub2RlOiBub2RlLFxuICAgICAgICAgICAgcHJvcGVydHk6IHAsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmKG8udmFsdWUgaW4gcmVmZXJlbmNlZE9uY2UpIHtcbiAgICAgICAgICAvLyBvYmplY3QgcmVmZXJlbmNlZCBtb3JlIHRoYW4gb25jZVxuICAgICAgICAgIHJlZmVyZW5jZWRPbmNlW28udmFsdWVdID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8ga2VlcCB0cmFjayBvZiBzaW5nbGUgcmVmZXJlbmNlXG4gICAgICAgICAgcmVmZXJlbmNlZE9uY2Vbby52YWx1ZV0gPSB7XG4gICAgICAgICAgICBub2RlOiBub2RlLFxuICAgICAgICAgICAgcHJvcGVydHk6IHAsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gY29udmVydCBsaW5rZWQgbGlzdHMgdG8gQGxpc3QgYXJyYXlzXG4gIGZvcih2YXIgbmFtZSBpbiBncmFwaE1hcCkge1xuICAgIHZhciBncmFwaE9iamVjdCA9IGdyYXBoTWFwW25hbWVdO1xuXG4gICAgLy8gbm8gQGxpc3RzIHRvIGJlIGNvbnZlcnRlZCwgY29udGludWVcbiAgICBpZighKFJERl9OSUwgaW4gZ3JhcGhPYmplY3QpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBpdGVyYXRlIGJhY2t3YXJkcyB0aHJvdWdoIGVhY2ggUkRGIGxpc3RcbiAgICB2YXIgbmlsID0gZ3JhcGhPYmplY3RbUkRGX05JTF07XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IG5pbC51c2FnZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciB1c2FnZSA9IG5pbC51c2FnZXNbaV07XG4gICAgICB2YXIgbm9kZSA9IHVzYWdlLm5vZGU7XG4gICAgICB2YXIgcHJvcGVydHkgPSB1c2FnZS5wcm9wZXJ0eTtcbiAgICAgIHZhciBoZWFkID0gdXNhZ2UudmFsdWU7XG4gICAgICB2YXIgbGlzdCA9IFtdO1xuICAgICAgdmFyIGxpc3ROb2RlcyA9IFtdO1xuXG4gICAgICAvLyBlbnN1cmUgbm9kZSBpcyBhIHdlbGwtZm9ybWVkIGxpc3Qgbm9kZTsgaXQgbXVzdDpcbiAgICAgIC8vIDEuIEJlIHJlZmVyZW5jZWQgb25seSBvbmNlLlxuICAgICAgLy8gMi4gSGF2ZSBhbiBhcnJheSBmb3IgcmRmOmZpcnN0IHRoYXQgaGFzIDEgaXRlbS5cbiAgICAgIC8vIDMuIEhhdmUgYW4gYXJyYXkgZm9yIHJkZjpyZXN0IHRoYXQgaGFzIDEgaXRlbS5cbiAgICAgIC8vIDQuIEhhdmUgbm8ga2V5cyBvdGhlciB0aGFuOiBAaWQsIHJkZjpmaXJzdCwgcmRmOnJlc3QsIGFuZCxcbiAgICAgIC8vICAgb3B0aW9uYWxseSwgQHR5cGUgd2hlcmUgdGhlIHZhbHVlIGlzIHJkZjpMaXN0LlxuICAgICAgdmFyIG5vZGVLZXlDb3VudCA9IE9iamVjdC5rZXlzKG5vZGUpLmxlbmd0aDtcbiAgICAgIHdoaWxlKHByb3BlcnR5ID09PSBSREZfUkVTVCAmJlxuICAgICAgICBfaXNPYmplY3QocmVmZXJlbmNlZE9uY2Vbbm9kZVsnQGlkJ11dKSAmJlxuICAgICAgICBfaXNBcnJheShub2RlW1JERl9GSVJTVF0pICYmIG5vZGVbUkRGX0ZJUlNUXS5sZW5ndGggPT09IDEgJiZcbiAgICAgICAgX2lzQXJyYXkobm9kZVtSREZfUkVTVF0pICYmIG5vZGVbUkRGX1JFU1RdLmxlbmd0aCA9PT0gMSAmJlxuICAgICAgICAobm9kZUtleUNvdW50ID09PSAzIHx8IChub2RlS2V5Q291bnQgPT09IDQgJiYgX2lzQXJyYXkobm9kZVsnQHR5cGUnXSkgJiZcbiAgICAgICAgICBub2RlWydAdHlwZSddLmxlbmd0aCA9PT0gMSAmJiBub2RlWydAdHlwZSddWzBdID09PSBSREZfTElTVCkpKSB7XG4gICAgICAgIGxpc3QucHVzaChub2RlW1JERl9GSVJTVF1bMF0pO1xuICAgICAgICBsaXN0Tm9kZXMucHVzaChub2RlWydAaWQnXSk7XG5cbiAgICAgICAgLy8gZ2V0IG5leHQgbm9kZSwgbW92aW5nIGJhY2t3YXJkcyB0aHJvdWdoIGxpc3RcbiAgICAgICAgdXNhZ2UgPSByZWZlcmVuY2VkT25jZVtub2RlWydAaWQnXV07XG4gICAgICAgIG5vZGUgPSB1c2FnZS5ub2RlO1xuICAgICAgICBwcm9wZXJ0eSA9IHVzYWdlLnByb3BlcnR5O1xuICAgICAgICBoZWFkID0gdXNhZ2UudmFsdWU7XG4gICAgICAgIG5vZGVLZXlDb3VudCA9IE9iamVjdC5rZXlzKG5vZGUpLmxlbmd0aDtcblxuICAgICAgICAvLyBpZiBub2RlIGlzIG5vdCBhIGJsYW5rIG5vZGUsIHRoZW4gbGlzdCBoZWFkIGZvdW5kXG4gICAgICAgIGlmKG5vZGVbJ0BpZCddLmluZGV4T2YoJ186JykgIT09IDApIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyB0aGUgbGlzdCBpcyBuZXN0ZWQgaW4gYW5vdGhlciBsaXN0XG4gICAgICBpZihwcm9wZXJ0eSA9PT0gUkRGX0ZJUlNUKSB7XG4gICAgICAgIC8vIGVtcHR5IGxpc3RcbiAgICAgICAgaWYobm9kZVsnQGlkJ10gPT09IFJERl9OSUwpIHtcbiAgICAgICAgICAvLyBjYW4ndCBjb252ZXJ0IHJkZjpuaWwgdG8gYSBAbGlzdCBvYmplY3QgYmVjYXVzZSBpdCB3b3VsZFxuICAgICAgICAgIC8vIHJlc3VsdCBpbiBhIGxpc3Qgb2YgbGlzdHMgd2hpY2ggaXNuJ3Qgc3VwcG9ydGVkXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwcmVzZXJ2ZSBsaXN0IGhlYWRcbiAgICAgICAgaGVhZCA9IGdyYXBoT2JqZWN0W2hlYWRbJ0BpZCddXVtSREZfUkVTVF1bMF07XG4gICAgICAgIGxpc3QucG9wKCk7XG4gICAgICAgIGxpc3ROb2Rlcy5wb3AoKTtcbiAgICAgIH1cblxuICAgICAgLy8gdHJhbnNmb3JtIGxpc3QgaW50byBAbGlzdCBvYmplY3RcbiAgICAgIGRlbGV0ZSBoZWFkWydAaWQnXTtcbiAgICAgIGhlYWRbJ0BsaXN0J10gPSBsaXN0LnJldmVyc2UoKTtcbiAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBsaXN0Tm9kZXMubGVuZ3RoOyArK2opIHtcbiAgICAgICAgZGVsZXRlIGdyYXBoT2JqZWN0W2xpc3ROb2Rlc1tqXV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZGVsZXRlIG5pbC51c2FnZXM7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gW107XG4gIHZhciBzdWJqZWN0cyA9IE9iamVjdC5rZXlzKGRlZmF1bHRHcmFwaCkuc29ydCgpO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgc3ViamVjdHMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgc3ViamVjdCA9IHN1YmplY3RzW2ldO1xuICAgIHZhciBub2RlID0gZGVmYXVsdEdyYXBoW3N1YmplY3RdO1xuICAgIGlmKHN1YmplY3QgaW4gZ3JhcGhNYXApIHtcbiAgICAgIHZhciBncmFwaCA9IG5vZGVbJ0BncmFwaCddID0gW107XG4gICAgICB2YXIgZ3JhcGhPYmplY3QgPSBncmFwaE1hcFtzdWJqZWN0XTtcbiAgICAgIHZhciBzdWJqZWN0c18gPSBPYmplY3Qua2V5cyhncmFwaE9iamVjdCkuc29ydCgpO1xuICAgICAgZm9yKHZhciBzaSA9IDA7IHNpIDwgc3ViamVjdHNfLmxlbmd0aDsgKytzaSkge1xuICAgICAgICB2YXIgbm9kZV8gPSBncmFwaE9iamVjdFtzdWJqZWN0c19bc2ldXTtcbiAgICAgICAgLy8gb25seSBhZGQgZnVsbCBzdWJqZWN0cyB0byB0b3AtbGV2ZWxcbiAgICAgICAgaWYoIV9pc1N1YmplY3RSZWZlcmVuY2Uobm9kZV8pKSB7XG4gICAgICAgICAgZ3JhcGgucHVzaChub2RlXyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gb25seSBhZGQgZnVsbCBzdWJqZWN0cyB0byB0b3AtbGV2ZWxcbiAgICBpZighX2lzU3ViamVjdFJlZmVyZW5jZShub2RlKSkge1xuICAgICAgcmVzdWx0LnB1c2gobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbn07XG5cbi8qKlxuICogT3V0cHV0cyBhbiBSREYgZGF0YXNldCBmb3IgdGhlIGV4cGFuZGVkIEpTT04tTEQgaW5wdXQuXG4gKlxuICogQHBhcmFtIGlucHV0IHRoZSBleHBhbmRlZCBKU09OLUxEIGlucHV0LlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIFJERiBzZXJpYWxpemF0aW9uIG9wdGlvbnMuXG4gKlxuICogQHJldHVybiB0aGUgUkRGIGRhdGFzZXQuXG4gKi9cblByb2Nlc3Nvci5wcm90b3R5cGUudG9SREYgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucykge1xuICAvLyBjcmVhdGUgbm9kZSBtYXAgZm9yIGRlZmF1bHQgZ3JhcGggKGFuZCBhbnkgbmFtZWQgZ3JhcGhzKVxuICB2YXIgbmFtZXIgPSBuZXcgVW5pcXVlTmFtZXIoJ186YicpO1xuICB2YXIgbm9kZU1hcCA9IHsnQGRlZmF1bHQnOiB7fX07XG4gIF9jcmVhdGVOb2RlTWFwKGlucHV0LCBub2RlTWFwLCAnQGRlZmF1bHQnLCBuYW1lcik7XG5cbiAgdmFyIGRhdGFzZXQgPSB7fTtcbiAgdmFyIGdyYXBoTmFtZXMgPSBPYmplY3Qua2V5cyhub2RlTWFwKS5zb3J0KCk7XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBncmFwaE5hbWVzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGdyYXBoTmFtZSA9IGdyYXBoTmFtZXNbaV07XG4gICAgLy8gc2tpcCByZWxhdGl2ZSBJUklzXG4gICAgaWYoZ3JhcGhOYW1lID09PSAnQGRlZmF1bHQnIHx8IF9pc0Fic29sdXRlSXJpKGdyYXBoTmFtZSkpIHtcbiAgICAgIGRhdGFzZXRbZ3JhcGhOYW1lXSA9IF9ncmFwaFRvUkRGKG5vZGVNYXBbZ3JhcGhOYW1lXSwgbmFtZXIsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGF0YXNldDtcbn07XG5cbi8qKlxuICogUHJvY2Vzc2VzIGEgbG9jYWwgY29udGV4dCBhbmQgcmV0dXJucyBhIG5ldyBhY3RpdmUgY29udGV4dC5cbiAqXG4gKiBAcGFyYW0gYWN0aXZlQ3R4IHRoZSBjdXJyZW50IGFjdGl2ZSBjb250ZXh0LlxuICogQHBhcmFtIGxvY2FsQ3R4IHRoZSBsb2NhbCBjb250ZXh0IHRvIHByb2Nlc3MuXG4gKiBAcGFyYW0gb3B0aW9ucyB0aGUgY29udGV4dCBwcm9jZXNzaW5nIG9wdGlvbnMuXG4gKlxuICogQHJldHVybiB0aGUgbmV3IGFjdGl2ZSBjb250ZXh0LlxuICovXG5Qcm9jZXNzb3IucHJvdG90eXBlLnByb2Nlc3NDb250ZXh0ID0gZnVuY3Rpb24oYWN0aXZlQ3R4LCBsb2NhbEN0eCwgb3B0aW9ucykge1xuICAvLyBub3JtYWxpemUgbG9jYWwgY29udGV4dCB0byBhbiBhcnJheSBvZiBAY29udGV4dCBvYmplY3RzXG4gIGlmKF9pc09iamVjdChsb2NhbEN0eCkgJiYgJ0Bjb250ZXh0JyBpbiBsb2NhbEN0eCAmJlxuICAgIF9pc0FycmF5KGxvY2FsQ3R4WydAY29udGV4dCddKSkge1xuICAgIGxvY2FsQ3R4ID0gbG9jYWxDdHhbJ0Bjb250ZXh0J107XG4gIH1cbiAgdmFyIGN0eHMgPSBfaXNBcnJheShsb2NhbEN0eCkgPyBsb2NhbEN0eCA6IFtsb2NhbEN0eF07XG5cbiAgLy8gbm8gY29udGV4dHMgaW4gYXJyYXksIGNsb25lIGV4aXN0aW5nIGNvbnRleHRcbiAgaWYoY3R4cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gYWN0aXZlQ3R4LmNsb25lKCk7XG4gIH1cblxuICAvLyBwcm9jZXNzIGVhY2ggY29udGV4dCBpbiBvcmRlciwgdXBkYXRlIGFjdGl2ZSBjb250ZXh0XG4gIC8vIG9uIGVhY2ggaXRlcmF0aW9uIHRvIGVuc3VyZSBwcm9wZXIgY2FjaGluZ1xuICB2YXIgcnZhbCA9IGFjdGl2ZUN0eDtcbiAgZm9yKHZhciBpID0gMDsgaSA8IGN0eHMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgY3R4ID0gY3R4c1tpXTtcblxuICAgIC8vIHJlc2V0IHRvIGluaXRpYWwgY29udGV4dFxuICAgIGlmKGN0eCA9PT0gbnVsbCkge1xuICAgICAgcnZhbCA9IGFjdGl2ZUN0eCA9IF9nZXRJbml0aWFsQ29udGV4dChvcHRpb25zKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGRlcmVmZXJlbmNlIEBjb250ZXh0IGtleSBpZiBwcmVzZW50XG4gICAgaWYoX2lzT2JqZWN0KGN0eCkgJiYgJ0Bjb250ZXh0JyBpbiBjdHgpIHtcbiAgICAgIGN0eCA9IGN0eFsnQGNvbnRleHQnXTtcbiAgICB9XG5cbiAgICAvLyBjb250ZXh0IG11c3QgYmUgYW4gb2JqZWN0IGJ5IG5vdywgYWxsIFVSTHMgcmV0cmlldmVkIGJlZm9yZSB0aGlzIGNhbGxcbiAgICBpZighX2lzT2JqZWN0KGN0eCkpIHtcbiAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IEBjb250ZXh0IG11c3QgYmUgYW4gb2JqZWN0LicsXG4gICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgbG9jYWwgY29udGV4dCcsIGNvbnRleHQ6IGN0eH0pO1xuICAgIH1cblxuICAgIC8vIGdldCBjb250ZXh0IGZyb20gY2FjaGUgaWYgYXZhaWxhYmxlXG4gICAgaWYoanNvbmxkLmNhY2hlLmFjdGl2ZUN0eCkge1xuICAgICAgdmFyIGNhY2hlZCA9IGpzb25sZC5jYWNoZS5hY3RpdmVDdHguZ2V0KGFjdGl2ZUN0eCwgY3R4KTtcbiAgICAgIGlmKGNhY2hlZCkge1xuICAgICAgICBydmFsID0gYWN0aXZlQ3R4ID0gY2FjaGVkO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB1cGRhdGUgYWN0aXZlIGNvbnRleHQgYW5kIGNsb25lIG5ldyBvbmUgYmVmb3JlIHVwZGF0aW5nXG4gICAgYWN0aXZlQ3R4ID0gcnZhbDtcbiAgICBydmFsID0gcnZhbC5jbG9uZSgpO1xuXG4gICAgLy8gZGVmaW5lIGNvbnRleHQgbWFwcGluZ3MgZm9yIGtleXMgaW4gbG9jYWwgY29udGV4dFxuICAgIHZhciBkZWZpbmVkID0ge307XG5cbiAgICAvLyBoYW5kbGUgQGJhc2VcbiAgICBpZignQGJhc2UnIGluIGN0eCkge1xuICAgICAgdmFyIGJhc2UgPSBjdHhbJ0BiYXNlJ107XG5cbiAgICAgIC8vIGNsZWFyIGJhc2VcbiAgICAgIGlmKGJhc2UgPT09IG51bGwpIHtcbiAgICAgICAgYmFzZSA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYoIV9pc1N0cmluZyhiYXNlKSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IHRoZSB2YWx1ZSBvZiBcIkBiYXNlXCIgaW4gYSAnICtcbiAgICAgICAgICAnQGNvbnRleHQgbXVzdCBiZSBhIHN0cmluZyBvciBudWxsLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCBiYXNlIElSSScsIGNvbnRleHQ6IGN0eH0pO1xuICAgICAgfSBlbHNlIGlmKGJhc2UgIT09ICcnICYmICFfaXNBYnNvbHV0ZUlyaShiYXNlKSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IHRoZSB2YWx1ZSBvZiBcIkBiYXNlXCIgaW4gYSAnICtcbiAgICAgICAgICAnQGNvbnRleHQgbXVzdCBiZSBhbiBhYnNvbHV0ZSBJUkkgb3IgdGhlIGVtcHR5IHN0cmluZy4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgYmFzZSBJUkknLCBjb250ZXh0OiBjdHh9KTtcbiAgICAgIH1cblxuICAgICAgaWYoYmFzZSAhPT0gbnVsbCkge1xuICAgICAgICBiYXNlID0ganNvbmxkLnVybC5wYXJzZShiYXNlIHx8ICcnKTtcbiAgICAgIH1cbiAgICAgIHJ2YWxbJ0BiYXNlJ10gPSBiYXNlO1xuICAgICAgZGVmaW5lZFsnQGJhc2UnXSA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIEB2b2NhYlxuICAgIGlmKCdAdm9jYWInIGluIGN0eCkge1xuICAgICAgdmFyIHZhbHVlID0gY3R4WydAdm9jYWInXTtcbiAgICAgIGlmKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgIGRlbGV0ZSBydmFsWydAdm9jYWInXTtcbiAgICAgIH0gZWxzZSBpZighX2lzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IHRoZSB2YWx1ZSBvZiBcIkB2b2NhYlwiIGluIGEgJyArXG4gICAgICAgICAgJ0Bjb250ZXh0IG11c3QgYmUgYSBzdHJpbmcgb3IgbnVsbC4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgdm9jYWIgbWFwcGluZycsIGNvbnRleHQ6IGN0eH0pO1xuICAgICAgfSBlbHNlIGlmKCFfaXNBYnNvbHV0ZUlyaSh2YWx1ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyB0aGUgdmFsdWUgb2YgXCJAdm9jYWJcIiBpbiBhICcgK1xuICAgICAgICAgICdAY29udGV4dCBtdXN0IGJlIGFuIGFic29sdXRlIElSSS4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgdm9jYWIgbWFwcGluZycsIGNvbnRleHQ6IGN0eH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcnZhbFsnQHZvY2FiJ10gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGRlZmluZWRbJ0B2b2NhYiddID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgQGxhbmd1YWdlXG4gICAgaWYoJ0BsYW5ndWFnZScgaW4gY3R4KSB7XG4gICAgICB2YXIgdmFsdWUgPSBjdHhbJ0BsYW5ndWFnZSddO1xuICAgICAgaWYodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgZGVsZXRlIHJ2YWxbJ0BsYW5ndWFnZSddO1xuICAgICAgfSBlbHNlIGlmKCFfaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgdGhlIHZhbHVlIG9mIFwiQGxhbmd1YWdlXCIgaW4gYSAnICtcbiAgICAgICAgICAnQGNvbnRleHQgbXVzdCBiZSBhIHN0cmluZyBvciBudWxsLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdpbnZhbGlkIGRlZmF1bHQgbGFuZ3VhZ2UnLCBjb250ZXh0OiBjdHh9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJ2YWxbJ0BsYW5ndWFnZSddID0gdmFsdWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cbiAgICAgIGRlZmluZWRbJ0BsYW5ndWFnZSddID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBwcm9jZXNzIGFsbCBvdGhlciBrZXlzXG4gICAgZm9yKHZhciBrZXkgaW4gY3R4KSB7XG4gICAgICBfY3JlYXRlVGVybURlZmluaXRpb24ocnZhbCwgY3R4LCBrZXksIGRlZmluZWQpO1xuICAgIH1cblxuICAgIC8vIGNhY2hlIHJlc3VsdFxuICAgIGlmKGpzb25sZC5jYWNoZS5hY3RpdmVDdHgpIHtcbiAgICAgIGpzb25sZC5jYWNoZS5hY3RpdmVDdHguc2V0KGFjdGl2ZUN0eCwgY3R4LCBydmFsKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcnZhbDtcbn07XG5cbi8qKlxuICogRXhwYW5kcyBhIGxhbmd1YWdlIG1hcC5cbiAqXG4gKiBAcGFyYW0gbGFuZ3VhZ2VNYXAgdGhlIGxhbmd1YWdlIG1hcCB0byBleHBhbmQuXG4gKlxuICogQHJldHVybiB0aGUgZXhwYW5kZWQgbGFuZ3VhZ2UgbWFwLlxuICovXG5mdW5jdGlvbiBfZXhwYW5kTGFuZ3VhZ2VNYXAobGFuZ3VhZ2VNYXApIHtcbiAgdmFyIHJ2YWwgPSBbXTtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhsYW5ndWFnZU1hcCkuc29ydCgpO1xuICBmb3IodmFyIGtpID0gMDsga2kgPCBrZXlzLmxlbmd0aDsgKytraSkge1xuICAgIHZhciBrZXkgPSBrZXlzW2tpXTtcbiAgICB2YXIgdmFsID0gbGFuZ3VhZ2VNYXBba2V5XTtcbiAgICBpZighX2lzQXJyYXkodmFsKSkge1xuICAgICAgdmFsID0gW3ZhbF07XG4gICAgfVxuICAgIGZvcih2YXIgdmkgPSAwOyB2aSA8IHZhbC5sZW5ndGg7ICsrdmkpIHtcbiAgICAgIHZhciBpdGVtID0gdmFsW3ZpXTtcbiAgICAgIGlmKCFfaXNTdHJpbmcoaXRlbSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBsYW5ndWFnZSBtYXAgdmFsdWVzIG11c3QgYmUgc3RyaW5ncy4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCBsYW5ndWFnZSBtYXAgdmFsdWUnLCBsYW5ndWFnZU1hcDogbGFuZ3VhZ2VNYXB9KTtcbiAgICAgIH1cbiAgICAgIHJ2YWwucHVzaCh7XG4gICAgICAgICdAdmFsdWUnOiBpdGVtLFxuICAgICAgICAnQGxhbmd1YWdlJzoga2V5LnRvTG93ZXJDYXNlKClcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcnZhbDtcbn1cblxuLyoqXG4gKiBMYWJlbHMgdGhlIGJsYW5rIG5vZGVzIGluIHRoZSBnaXZlbiB2YWx1ZSB1c2luZyB0aGUgZ2l2ZW4gVW5pcXVlTmFtZXIuXG4gKlxuICogQHBhcmFtIG5hbWVyIHRoZSBVbmlxdWVOYW1lciB0byB1c2UuXG4gKiBAcGFyYW0gZWxlbWVudCB0aGUgZWxlbWVudCB3aXRoIGJsYW5rIG5vZGVzIHRvIHJlbmFtZS5cbiAqXG4gKiBAcmV0dXJuIHRoZSBlbGVtZW50LlxuICovXG5mdW5jdGlvbiBfbGFiZWxCbGFua05vZGVzKG5hbWVyLCBlbGVtZW50KSB7XG4gIGlmKF9pc0FycmF5KGVsZW1lbnQpKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGVsZW1lbnQubGVuZ3RoOyArK2kpIHtcbiAgICAgIGVsZW1lbnRbaV0gPSBfbGFiZWxCbGFua05vZGVzKG5hbWVyLCBlbGVtZW50W2ldKTtcbiAgICB9XG4gIH0gZWxzZSBpZihfaXNMaXN0KGVsZW1lbnQpKSB7XG4gICAgZWxlbWVudFsnQGxpc3QnXSA9IF9sYWJlbEJsYW5rTm9kZXMobmFtZXIsIGVsZW1lbnRbJ0BsaXN0J10pO1xuICB9IGVsc2UgaWYoX2lzT2JqZWN0KGVsZW1lbnQpKSB7XG4gICAgLy8gcmVuYW1lIGJsYW5rIG5vZGVcbiAgICBpZihfaXNCbGFua05vZGUoZWxlbWVudCkpIHtcbiAgICAgIGVsZW1lbnRbJ0BpZCddID0gbmFtZXIuZ2V0TmFtZShlbGVtZW50WydAaWQnXSk7XG4gICAgfVxuXG4gICAgLy8gcmVjdXJzaXZlbHkgYXBwbHkgdG8gYWxsIGtleXNcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGVsZW1lbnQpLnNvcnQoKTtcbiAgICBmb3IodmFyIGtpID0gMDsga2kgPCBrZXlzLmxlbmd0aDsgKytraSkge1xuICAgICAgdmFyIGtleSA9IGtleXNba2ldO1xuICAgICAgaWYoa2V5ICE9PSAnQGlkJykge1xuICAgICAgICBlbGVtZW50W2tleV0gPSBfbGFiZWxCbGFua05vZGVzKG5hbWVyLCBlbGVtZW50W2tleV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBlbGVtZW50O1xufVxuXG4vKipcbiAqIEV4cGFuZHMgdGhlIGdpdmVuIHZhbHVlIGJ5IHVzaW5nIHRoZSBjb2VyY2lvbiBhbmQga2V5d29yZCBydWxlcyBpbiB0aGVcbiAqIGdpdmVuIGNvbnRleHQuXG4gKlxuICogQHBhcmFtIGFjdGl2ZUN0eCB0aGUgYWN0aXZlIGNvbnRleHQgdG8gdXNlLlxuICogQHBhcmFtIGFjdGl2ZVByb3BlcnR5IHRoZSBhY3RpdmUgcHJvcGVydHkgdGhlIHZhbHVlIGlzIGFzc29jaWF0ZWQgd2l0aC5cbiAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gZXhwYW5kLlxuICpcbiAqIEByZXR1cm4gdGhlIGV4cGFuZGVkIHZhbHVlLlxuICovXG5mdW5jdGlvbiBfZXhwYW5kVmFsdWUoYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgdmFsdWUpIHtcbiAgLy8gbm90aGluZyB0byBleHBhbmRcbiAgaWYodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gc3BlY2lhbC1jYXNlIGV4cGFuZCBAaWQgYW5kIEB0eXBlIChza2lwcyAnQGlkJyBleHBhbnNpb24pXG4gIHZhciBleHBhbmRlZFByb3BlcnR5ID0gX2V4cGFuZElyaShhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCB7dm9jYWI6IHRydWV9KTtcbiAgaWYoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BpZCcpIHtcbiAgICByZXR1cm4gX2V4cGFuZElyaShhY3RpdmVDdHgsIHZhbHVlLCB7YmFzZTogdHJ1ZX0pO1xuICB9IGVsc2UgaWYoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0B0eXBlJykge1xuICAgIHJldHVybiBfZXhwYW5kSXJpKGFjdGl2ZUN0eCwgdmFsdWUsIHt2b2NhYjogdHJ1ZSwgYmFzZTogdHJ1ZX0pO1xuICB9XG5cbiAgLy8gZ2V0IHR5cGUgZGVmaW5pdGlvbiBmcm9tIGNvbnRleHRcbiAgdmFyIHR5cGUgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksICdAdHlwZScpO1xuXG4gIC8vIGRvIEBpZCBleHBhbnNpb24gKGF1dG9tYXRpYyBmb3IgQGdyYXBoKVxuICBpZih0eXBlID09PSAnQGlkJyB8fCAoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BncmFwaCcgJiYgX2lzU3RyaW5nKHZhbHVlKSkpIHtcbiAgICByZXR1cm4geydAaWQnOiBfZXhwYW5kSXJpKGFjdGl2ZUN0eCwgdmFsdWUsIHtiYXNlOiB0cnVlfSl9O1xuICB9XG4gIC8vIGRvIEBpZCBleHBhbnNpb24gdy92b2NhYlxuICBpZih0eXBlID09PSAnQHZvY2FiJykge1xuICAgIHJldHVybiB7J0BpZCc6IF9leHBhbmRJcmkoYWN0aXZlQ3R4LCB2YWx1ZSwge3ZvY2FiOiB0cnVlLCBiYXNlOiB0cnVlfSl9O1xuICB9XG5cbiAgLy8gZG8gbm90IGV4cGFuZCBrZXl3b3JkIHZhbHVlc1xuICBpZihfaXNLZXl3b3JkKGV4cGFuZGVkUHJvcGVydHkpKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgdmFyIHJ2YWwgPSB7fTtcblxuICBpZih0eXBlICE9PSBudWxsKSB7XG4gICAgLy8gb3RoZXIgdHlwZVxuICAgIHJ2YWxbJ0B0eXBlJ10gPSB0eXBlO1xuICB9IGVsc2UgaWYoX2lzU3RyaW5nKHZhbHVlKSkge1xuICAgIC8vIGNoZWNrIGZvciBsYW5ndWFnZSB0YWdnaW5nIGZvciBzdHJpbmdzXG4gICAgdmFyIGxhbmd1YWdlID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShcbiAgICAgIGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksICdAbGFuZ3VhZ2UnKTtcbiAgICBpZihsYW5ndWFnZSAhPT0gbnVsbCkge1xuICAgICAgcnZhbFsnQGxhbmd1YWdlJ10gPSBsYW5ndWFnZTtcbiAgICB9XG4gIH1cbiAgLy8gZG8gY29udmVyc2lvbiBvZiB2YWx1ZXMgdGhhdCBhcmVuJ3QgYmFzaWMgSlNPTiB0eXBlcyB0byBzdHJpbmdzXG4gIGlmKFsnYm9vbGVhbicsICdudW1iZXInLCAnc3RyaW5nJ10uaW5kZXhPZih0eXBlb2YgdmFsdWUpID09PSAtMSkge1xuICAgIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuICBydmFsWydAdmFsdWUnXSA9IHZhbHVlO1xuXG4gIHJldHVybiBydmFsO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgUkRGIHRyaXBsZXMgZm9yIHRoZSBnaXZlbiBncmFwaC5cbiAqXG4gKiBAcGFyYW0gZ3JhcGggdGhlIGdyYXBoIHRvIGNyZWF0ZSBSREYgdHJpcGxlcyBmb3IuXG4gKiBAcGFyYW0gbmFtZXIgYSBVbmlxdWVOYW1lciBmb3IgYXNzaWduaW5nIGJsYW5rIG5vZGUgbmFtZXMuXG4gKiBAcGFyYW0gb3B0aW9ucyB0aGUgUkRGIHNlcmlhbGl6YXRpb24gb3B0aW9ucy5cbiAqXG4gKiBAcmV0dXJuIHRoZSBhcnJheSBvZiBSREYgdHJpcGxlcyBmb3IgdGhlIGdpdmVuIGdyYXBoLlxuICovXG5mdW5jdGlvbiBfZ3JhcGhUb1JERihncmFwaCwgbmFtZXIsIG9wdGlvbnMpIHtcbiAgdmFyIHJ2YWwgPSBbXTtcblxuICB2YXIgaWRzID0gT2JqZWN0LmtleXMoZ3JhcGgpLnNvcnQoKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IGlkcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBpZCA9IGlkc1tpXTtcbiAgICB2YXIgbm9kZSA9IGdyYXBoW2lkXTtcbiAgICB2YXIgcHJvcGVydGllcyA9IE9iamVjdC5rZXlzKG5vZGUpLnNvcnQoKTtcbiAgICBmb3IodmFyIHBpID0gMDsgcGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgKytwaSkge1xuICAgICAgdmFyIHByb3BlcnR5ID0gcHJvcGVydGllc1twaV07XG4gICAgICB2YXIgaXRlbXMgPSBub2RlW3Byb3BlcnR5XTtcbiAgICAgIGlmKHByb3BlcnR5ID09PSAnQHR5cGUnKSB7XG4gICAgICAgIHByb3BlcnR5ID0gUkRGX1RZUEU7XG4gICAgICB9IGVsc2UgaWYoX2lzS2V5d29yZChwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvcih2YXIgaWkgPSAwOyBpaSA8IGl0ZW1zLmxlbmd0aDsgKytpaSkge1xuICAgICAgICB2YXIgaXRlbSA9IGl0ZW1zW2lpXTtcblxuICAgICAgICAvLyBSREYgc3ViamVjdFxuICAgICAgICB2YXIgc3ViamVjdCA9IHt9O1xuICAgICAgICBzdWJqZWN0LnR5cGUgPSAoaWQuaW5kZXhPZignXzonKSA9PT0gMCkgPyAnYmxhbmsgbm9kZScgOiAnSVJJJztcbiAgICAgICAgc3ViamVjdC52YWx1ZSA9IGlkO1xuXG4gICAgICAgIC8vIHNraXAgcmVsYXRpdmUgSVJJIHN1YmplY3RzXG4gICAgICAgIGlmKCFfaXNBYnNvbHV0ZUlyaShpZCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJERiBwcmVkaWNhdGVcbiAgICAgICAgdmFyIHByZWRpY2F0ZSA9IHt9O1xuICAgICAgICBwcmVkaWNhdGUudHlwZSA9IChwcm9wZXJ0eS5pbmRleE9mKCdfOicpID09PSAwKSA/ICdibGFuayBub2RlJyA6ICdJUkknO1xuICAgICAgICBwcmVkaWNhdGUudmFsdWUgPSBwcm9wZXJ0eTtcblxuICAgICAgICAvLyBza2lwIHJlbGF0aXZlIElSSSBwcmVkaWNhdGVzXG4gICAgICAgIGlmKCFfaXNBYnNvbHV0ZUlyaShwcm9wZXJ0eSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNraXAgYmxhbmsgbm9kZSBwcmVkaWNhdGVzIHVubGVzcyBwcm9kdWNpbmcgZ2VuZXJhbGl6ZWQgUkRGXG4gICAgICAgIGlmKHByZWRpY2F0ZS50eXBlID09PSAnYmxhbmsgbm9kZScgJiYgIW9wdGlvbnMucHJvZHVjZUdlbmVyYWxpemVkUmRmKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb252ZXJ0IEBsaXN0IHRvIHRyaXBsZXNcbiAgICAgICAgaWYoX2lzTGlzdChpdGVtKSkge1xuICAgICAgICAgIF9saXN0VG9SREYoaXRlbVsnQGxpc3QnXSwgbmFtZXIsIHN1YmplY3QsIHByZWRpY2F0ZSwgcnZhbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gY29udmVydCB2YWx1ZSBvciBub2RlIG9iamVjdCB0byB0cmlwbGVcbiAgICAgICAgICB2YXIgb2JqZWN0ID0gX29iamVjdFRvUkRGKGl0ZW0pO1xuICAgICAgICAgIC8vIHNraXAgbnVsbCBvYmplY3RzICh0aGV5IGFyZSByZWxhdGl2ZSBJUklzKVxuICAgICAgICAgIGlmKG9iamVjdCkge1xuICAgICAgICAgICAgcnZhbC5wdXNoKHtzdWJqZWN0OiBzdWJqZWN0LCBwcmVkaWNhdGU6IHByZWRpY2F0ZSwgb2JqZWN0OiBvYmplY3R9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcnZhbDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIEBsaXN0IHZhbHVlIGludG8gbGlua2VkIGxpc3Qgb2YgYmxhbmsgbm9kZSBSREYgdHJpcGxlc1xuICogKGFuIFJERiBjb2xsZWN0aW9uKS5cbiAqXG4gKiBAcGFyYW0gbGlzdCB0aGUgQGxpc3QgdmFsdWUuXG4gKiBAcGFyYW0gbmFtZXIgYSBVbmlxdWVOYW1lciBmb3IgYXNzaWduaW5nIGJsYW5rIG5vZGUgbmFtZXMuXG4gKiBAcGFyYW0gc3ViamVjdCB0aGUgc3ViamVjdCBmb3IgdGhlIGhlYWQgb2YgdGhlIGxpc3QuXG4gKiBAcGFyYW0gcHJlZGljYXRlIHRoZSBwcmVkaWNhdGUgZm9yIHRoZSBoZWFkIG9mIHRoZSBsaXN0LlxuICogQHBhcmFtIHRyaXBsZXMgdGhlIGFycmF5IG9mIHRyaXBsZXMgdG8gYXBwZW5kIHRvLlxuICovXG5mdW5jdGlvbiBfbGlzdFRvUkRGKGxpc3QsIG5hbWVyLCBzdWJqZWN0LCBwcmVkaWNhdGUsIHRyaXBsZXMpIHtcbiAgdmFyIGZpcnN0ID0ge3R5cGU6ICdJUkknLCB2YWx1ZTogUkRGX0ZJUlNUfTtcbiAgdmFyIHJlc3QgPSB7dHlwZTogJ0lSSScsIHZhbHVlOiBSREZfUkVTVH07XG4gIHZhciBuaWwgPSB7dHlwZTogJ0lSSScsIHZhbHVlOiBSREZfTklMfTtcblxuICBmb3IodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXTtcblxuICAgIHZhciBibGFua05vZGUgPSB7dHlwZTogJ2JsYW5rIG5vZGUnLCB2YWx1ZTogbmFtZXIuZ2V0TmFtZSgpfTtcbiAgICB0cmlwbGVzLnB1c2goe3N1YmplY3Q6IHN1YmplY3QsIHByZWRpY2F0ZTogcHJlZGljYXRlLCBvYmplY3Q6IGJsYW5rTm9kZX0pO1xuXG4gICAgc3ViamVjdCA9IGJsYW5rTm9kZTtcbiAgICBwcmVkaWNhdGUgPSBmaXJzdDtcbiAgICB2YXIgb2JqZWN0ID0gX29iamVjdFRvUkRGKGl0ZW0pO1xuXG4gICAgLy8gc2tpcCBudWxsIG9iamVjdHMgKHRoZXkgYXJlIHJlbGF0aXZlIElSSXMpXG4gICAgaWYob2JqZWN0KSB7XG4gICAgICB0cmlwbGVzLnB1c2goe3N1YmplY3Q6IHN1YmplY3QsIHByZWRpY2F0ZTogcHJlZGljYXRlLCBvYmplY3Q6IG9iamVjdH0pO1xuICAgIH1cblxuICAgIHByZWRpY2F0ZSA9IHJlc3Q7XG4gIH1cblxuICB0cmlwbGVzLnB1c2goe3N1YmplY3Q6IHN1YmplY3QsIHByZWRpY2F0ZTogcHJlZGljYXRlLCBvYmplY3Q6IG5pbH0pO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgSlNPTi1MRCB2YWx1ZSBvYmplY3QgdG8gYW4gUkRGIGxpdGVyYWwgb3IgYSBKU09OLUxEIHN0cmluZyBvclxuICogbm9kZSBvYmplY3QgdG8gYW4gUkRGIHJlc291cmNlLlxuICpcbiAqIEBwYXJhbSBpdGVtIHRoZSBKU09OLUxEIHZhbHVlIG9yIG5vZGUgb2JqZWN0LlxuICpcbiAqIEByZXR1cm4gdGhlIFJERiBsaXRlcmFsIG9yIFJERiByZXNvdXJjZS5cbiAqL1xuZnVuY3Rpb24gX29iamVjdFRvUkRGKGl0ZW0pIHtcbiAgdmFyIG9iamVjdCA9IHt9O1xuXG4gIC8vIGNvbnZlcnQgdmFsdWUgb2JqZWN0IHRvIFJERlxuICBpZihfaXNWYWx1ZShpdGVtKSkge1xuICAgIG9iamVjdC50eXBlID0gJ2xpdGVyYWwnO1xuICAgIHZhciB2YWx1ZSA9IGl0ZW1bJ0B2YWx1ZSddO1xuICAgIHZhciBkYXRhdHlwZSA9IGl0ZW1bJ0B0eXBlJ10gfHwgbnVsbDtcblxuICAgIC8vIGNvbnZlcnQgdG8gWFNEIGRhdGF0eXBlcyBhcyBhcHByb3ByaWF0ZVxuICAgIGlmKF9pc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICBvYmplY3QudmFsdWUgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgb2JqZWN0LmRhdGF0eXBlID0gZGF0YXR5cGUgfHwgWFNEX0JPT0xFQU47XG4gICAgfSBlbHNlIGlmKF9pc0RvdWJsZSh2YWx1ZSkgfHwgZGF0YXR5cGUgPT09IFhTRF9ET1VCTEUpIHtcbiAgICAgIGlmKCFfaXNEb3VibGUodmFsdWUpKSB7XG4gICAgICAgIHZhbHVlID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gICAgICB9XG4gICAgICAvLyBjYW5vbmljYWwgZG91YmxlIHJlcHJlc2VudGF0aW9uXG4gICAgICBvYmplY3QudmFsdWUgPSB2YWx1ZS50b0V4cG9uZW50aWFsKDE1KS5yZXBsYWNlKC8oXFxkKTAqZVxcKz8vLCAnJDFFJyk7XG4gICAgICBvYmplY3QuZGF0YXR5cGUgPSBkYXRhdHlwZSB8fCBYU0RfRE9VQkxFO1xuICAgIH0gZWxzZSBpZihfaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICBvYmplY3QudmFsdWUgPSB2YWx1ZS50b0ZpeGVkKDApO1xuICAgICAgb2JqZWN0LmRhdGF0eXBlID0gZGF0YXR5cGUgfHwgWFNEX0lOVEVHRVI7XG4gICAgfSBlbHNlIGlmKCdAbGFuZ3VhZ2UnIGluIGl0ZW0pIHtcbiAgICAgIG9iamVjdC52YWx1ZSA9IHZhbHVlO1xuICAgICAgb2JqZWN0LmRhdGF0eXBlID0gZGF0YXR5cGUgfHwgUkRGX0xBTkdTVFJJTkc7XG4gICAgICBvYmplY3QubGFuZ3VhZ2UgPSBpdGVtWydAbGFuZ3VhZ2UnXTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0LnZhbHVlID0gdmFsdWU7XG4gICAgICBvYmplY3QuZGF0YXR5cGUgPSBkYXRhdHlwZSB8fCBYU0RfU1RSSU5HO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBjb252ZXJ0IHN0cmluZy9ub2RlIG9iamVjdCB0byBSREZcbiAgICB2YXIgaWQgPSBfaXNPYmplY3QoaXRlbSkgPyBpdGVtWydAaWQnXSA6IGl0ZW07XG4gICAgb2JqZWN0LnR5cGUgPSAoaWQuaW5kZXhPZignXzonKSA9PT0gMCkgPyAnYmxhbmsgbm9kZScgOiAnSVJJJztcbiAgICBvYmplY3QudmFsdWUgPSBpZDtcbiAgfVxuXG4gIC8vIHNraXAgcmVsYXRpdmUgSVJJc1xuICBpZihvYmplY3QudHlwZSA9PT0gJ0lSSScgJiYgIV9pc0Fic29sdXRlSXJpKG9iamVjdC52YWx1ZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBvYmplY3Q7XG59XG5cbi8qKlxuICogQ29udmVydHMgYW4gUkRGIHRyaXBsZSBvYmplY3QgdG8gYSBKU09OLUxEIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gbyB0aGUgUkRGIHRyaXBsZSBvYmplY3QgdG8gY29udmVydC5cbiAqIEBwYXJhbSB1c2VOYXRpdmVUeXBlcyB0cnVlIHRvIG91dHB1dCBuYXRpdmUgdHlwZXMsIGZhbHNlIG5vdCB0by5cbiAqXG4gKiBAcmV0dXJuIHRoZSBKU09OLUxEIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gX1JERlRvT2JqZWN0KG8sIHVzZU5hdGl2ZVR5cGVzKSB7XG4gIC8vIGNvbnZlcnQgSVJJL2JsYW5rIG5vZGUgb2JqZWN0IHRvIEpTT04tTERcbiAgaWYoby50eXBlID09PSAnSVJJJyB8fCBvLnR5cGUgPT09ICdibGFuayBub2RlJykge1xuICAgIHJldHVybiB7J0BpZCc6IG8udmFsdWV9O1xuICB9XG5cbiAgLy8gY29udmVydCBsaXRlcmFsIHRvIEpTT04tTERcbiAgdmFyIHJ2YWwgPSB7J0B2YWx1ZSc6IG8udmFsdWV9O1xuXG4gIC8vIGFkZCBsYW5ndWFnZVxuICBpZihvLmxhbmd1YWdlKSB7XG4gICAgcnZhbFsnQGxhbmd1YWdlJ10gPSBvLmxhbmd1YWdlO1xuICB9IGVsc2Uge1xuICAgIHZhciB0eXBlID0gby5kYXRhdHlwZTtcbiAgICBpZighdHlwZSkge1xuICAgICAgdHlwZSA9IFhTRF9TVFJJTkc7XG4gICAgfVxuICAgIC8vIHVzZSBuYXRpdmUgdHlwZXMgZm9yIGNlcnRhaW4geHNkIHR5cGVzXG4gICAgaWYodXNlTmF0aXZlVHlwZXMpIHtcbiAgICAgIGlmKHR5cGUgPT09IFhTRF9CT09MRUFOKSB7XG4gICAgICAgIGlmKHJ2YWxbJ0B2YWx1ZSddID09PSAndHJ1ZScpIHtcbiAgICAgICAgICBydmFsWydAdmFsdWUnXSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZihydmFsWydAdmFsdWUnXSA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgIHJ2YWxbJ0B2YWx1ZSddID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZihfaXNOdW1lcmljKHJ2YWxbJ0B2YWx1ZSddKSkge1xuICAgICAgICBpZih0eXBlID09PSBYU0RfSU5URUdFUikge1xuICAgICAgICAgIHZhciBpID0gcGFyc2VJbnQocnZhbFsnQHZhbHVlJ10sIDEwKTtcbiAgICAgICAgICBpZihpLnRvRml4ZWQoMCkgPT09IHJ2YWxbJ0B2YWx1ZSddKSB7XG4gICAgICAgICAgICBydmFsWydAdmFsdWUnXSA9IGk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYodHlwZSA9PT0gWFNEX0RPVUJMRSkge1xuICAgICAgICAgIHJ2YWxbJ0B2YWx1ZSddID0gcGFyc2VGbG9hdChydmFsWydAdmFsdWUnXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGRvIG5vdCBhZGQgbmF0aXZlIHR5cGVcbiAgICAgIGlmKFtYU0RfQk9PTEVBTiwgWFNEX0lOVEVHRVIsIFhTRF9ET1VCTEUsIFhTRF9TVFJJTkddXG4gICAgICAgIC5pbmRleE9mKHR5cGUpID09PSAtMSkge1xuICAgICAgICBydmFsWydAdHlwZSddID0gdHlwZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYodHlwZSAhPT0gWFNEX1NUUklORykge1xuICAgICAgcnZhbFsnQHR5cGUnXSA9IHR5cGU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJ2YWw7XG59XG5cbi8qKlxuICogQ29tcGFyZXMgdHdvIFJERiB0cmlwbGVzIGZvciBlcXVhbGl0eS5cbiAqXG4gKiBAcGFyYW0gdDEgdGhlIGZpcnN0IHRyaXBsZS5cbiAqIEBwYXJhbSB0MiB0aGUgc2Vjb25kIHRyaXBsZS5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHRyaXBsZXMgYXJlIHRoZSBzYW1lLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9jb21wYXJlUkRGVHJpcGxlcyh0MSwgdDIpIHtcbiAgdmFyIGF0dHJzID0gWydzdWJqZWN0JywgJ3ByZWRpY2F0ZScsICdvYmplY3QnXTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IGF0dHJzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGF0dHIgPSBhdHRyc1tpXTtcbiAgICBpZih0MVthdHRyXS50eXBlICE9PSB0MlthdHRyXS50eXBlIHx8IHQxW2F0dHJdLnZhbHVlICE9PSB0MlthdHRyXS52YWx1ZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBpZih0MS5vYmplY3QubGFuZ3VhZ2UgIT09IHQyLm9iamVjdC5sYW5ndWFnZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZih0MS5vYmplY3QuZGF0YXR5cGUgIT09IHQyLm9iamVjdC5kYXRhdHlwZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBIYXNoZXMgYWxsIG9mIHRoZSBxdWFkcyBhYm91dCBhIGJsYW5rIG5vZGUuXG4gKlxuICogQHBhcmFtIGlkIHRoZSBJRCBvZiB0aGUgYm5vZGUgdG8gaGFzaCBxdWFkcyBmb3IuXG4gKiBAcGFyYW0gYm5vZGVzIHRoZSBtYXBwaW5nIG9mIGJub2RlcyB0byBxdWFkcy5cbiAqXG4gKiBAcmV0dXJuIHRoZSBuZXcgaGFzaC5cbiAqL1xuZnVuY3Rpb24gX2hhc2hRdWFkcyhpZCwgYm5vZGVzKSB7XG4gIC8vIHJldHVybiBjYWNoZWQgaGFzaFxuICBpZignaGFzaCcgaW4gYm5vZGVzW2lkXSkge1xuICAgIHJldHVybiBibm9kZXNbaWRdLmhhc2g7XG4gIH1cblxuICAvLyBzZXJpYWxpemUgYWxsIG9mIGJub2RlJ3MgcXVhZHNcbiAgdmFyIHF1YWRzID0gYm5vZGVzW2lkXS5xdWFkcztcbiAgdmFyIG5xdWFkcyA9IFtdO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgcXVhZHMubGVuZ3RoOyArK2kpIHtcbiAgICBucXVhZHMucHVzaChfdG9OUXVhZChcbiAgICAgIHF1YWRzW2ldLCBxdWFkc1tpXS5uYW1lID8gcXVhZHNbaV0ubmFtZS52YWx1ZSA6IG51bGwsIGlkKSk7XG4gIH1cbiAgLy8gc29ydCBzZXJpYWxpemVkIHF1YWRzXG4gIG5xdWFkcy5zb3J0KCk7XG4gIC8vIHJldHVybiBoYXNoZWQgcXVhZHNcbiAgdmFyIGhhc2ggPSBibm9kZXNbaWRdLmhhc2ggPSBzaGExLmhhc2gobnF1YWRzKTtcbiAgcmV0dXJuIGhhc2g7XG59XG5cbi8qKlxuICogUHJvZHVjZXMgYSBoYXNoIGZvciB0aGUgcGF0aHMgb2YgYWRqYWNlbnQgYm5vZGVzIGZvciBhIGJub2RlLFxuICogaW5jb3Jwb3JhdGluZyBhbGwgaW5mb3JtYXRpb24gYWJvdXQgaXRzIHN1YmdyYXBoIG9mIGJub2Rlcy4gVGhpc1xuICogbWV0aG9kIHdpbGwgcmVjdXJzaXZlbHkgcGljayBhZGphY2VudCBibm9kZSBwZXJtdXRhdGlvbnMgdGhhdCBwcm9kdWNlIHRoZVxuICogbGV4aWNvZ3JhcGhpY2FsbHktbGVhc3QgJ3BhdGgnIHNlcmlhbGl6YXRpb25zLlxuICpcbiAqIEBwYXJhbSBpZCB0aGUgSUQgb2YgdGhlIGJub2RlIHRvIGhhc2ggcGF0aHMgZm9yLlxuICogQHBhcmFtIGJub2RlcyB0aGUgbWFwIG9mIGJub2RlIHF1YWRzLlxuICogQHBhcmFtIG5hbWVyIHRoZSBjYW5vbmljYWwgYm5vZGUgbmFtZXIuXG4gKiBAcGFyYW0gcGF0aE5hbWVyIHRoZSBuYW1lciB1c2VkIHRvIGFzc2lnbiBuYW1lcyB0byBhZGphY2VudCBibm9kZXMuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCByZXN1bHQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5mdW5jdGlvbiBfaGFzaFBhdGhzKGlkLCBibm9kZXMsIG5hbWVyLCBwYXRoTmFtZXIsIGNhbGxiYWNrKSB7XG4gIC8vIGNyZWF0ZSBTSEEtMSBkaWdlc3RcbiAgdmFyIG1kID0gc2hhMS5jcmVhdGUoKTtcblxuICAvLyBncm91cCBhZGphY2VudCBibm9kZXMgYnkgaGFzaCwga2VlcCBwcm9wZXJ0aWVzIGFuZCByZWZlcmVuY2VzIHNlcGFyYXRlXG4gIHZhciBncm91cHMgPSB7fTtcbiAgdmFyIGdyb3VwSGFzaGVzO1xuICB2YXIgcXVhZHMgPSBibm9kZXNbaWRdLnF1YWRzO1xuICBqc29ubGQuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge2dyb3VwTm9kZXMoMCk7fSk7XG4gIGZ1bmN0aW9uIGdyb3VwTm9kZXMoaSkge1xuICAgIGlmKGkgPT09IHF1YWRzLmxlbmd0aCkge1xuICAgICAgLy8gZG9uZSwgaGFzaCBncm91cHNcbiAgICAgIGdyb3VwSGFzaGVzID0gT2JqZWN0LmtleXMoZ3JvdXBzKS5zb3J0KCk7XG4gICAgICByZXR1cm4gaGFzaEdyb3VwKDApO1xuICAgIH1cblxuICAgIC8vIGdldCBhZGphY2VudCBibm9kZVxuICAgIHZhciBxdWFkID0gcXVhZHNbaV07XG4gICAgdmFyIGJub2RlID0gX2dldEFkamFjZW50QmxhbmtOb2RlTmFtZShxdWFkLnN1YmplY3QsIGlkKTtcbiAgICB2YXIgZGlyZWN0aW9uID0gbnVsbDtcbiAgICBpZihibm9kZSAhPT0gbnVsbCkge1xuICAgICAgLy8gbm9ybWFsIHByb3BlcnR5XG4gICAgICBkaXJlY3Rpb24gPSAncCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJub2RlID0gX2dldEFkamFjZW50QmxhbmtOb2RlTmFtZShxdWFkLm9iamVjdCwgaWQpO1xuICAgICAgaWYoYm5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgLy8gcmV2ZXJzZSBwcm9wZXJ0eVxuICAgICAgICBkaXJlY3Rpb24gPSAncic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoYm5vZGUgIT09IG51bGwpIHtcbiAgICAgIC8vIGdldCBibm9kZSBuYW1lICh0cnkgY2Fub25pY2FsLCBwYXRoLCB0aGVuIGhhc2gpXG4gICAgICB2YXIgbmFtZTtcbiAgICAgIGlmKG5hbWVyLmlzTmFtZWQoYm5vZGUpKSB7XG4gICAgICAgIG5hbWUgPSBuYW1lci5nZXROYW1lKGJub2RlKTtcbiAgICAgIH0gZWxzZSBpZihwYXRoTmFtZXIuaXNOYW1lZChibm9kZSkpIHtcbiAgICAgICAgbmFtZSA9IHBhdGhOYW1lci5nZXROYW1lKGJub2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWUgPSBfaGFzaFF1YWRzKGJub2RlLCBibm9kZXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBoYXNoIGRpcmVjdGlvbiwgcHJvcGVydHksIGFuZCBibm9kZSBuYW1lL2hhc2hcbiAgICAgIHZhciBtZCA9IHNoYTEuY3JlYXRlKCk7XG4gICAgICBtZC51cGRhdGUoZGlyZWN0aW9uKTtcbiAgICAgIG1kLnVwZGF0ZShxdWFkLnByZWRpY2F0ZS52YWx1ZSk7XG4gICAgICBtZC51cGRhdGUobmFtZSk7XG4gICAgICB2YXIgZ3JvdXBIYXNoID0gbWQuZGlnZXN0KCk7XG5cbiAgICAgIC8vIGFkZCBibm9kZSB0byBoYXNoIGdyb3VwXG4gICAgICBpZihncm91cEhhc2ggaW4gZ3JvdXBzKSB7XG4gICAgICAgIGdyb3Vwc1tncm91cEhhc2hdLnB1c2goYm5vZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZ3JvdXBzW2dyb3VwSGFzaF0gPSBbYm5vZGVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGpzb25sZC5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7Z3JvdXBOb2RlcyhpICsgMSk7fSk7XG4gIH1cblxuICAvLyBoYXNoZXMgYSBncm91cCBvZiBhZGphY2VudCBibm9kZXNcbiAgZnVuY3Rpb24gaGFzaEdyb3VwKGkpIHtcbiAgICBpZihpID09PSBncm91cEhhc2hlcy5sZW5ndGgpIHtcbiAgICAgIC8vIGRvbmUsIHJldHVybiBTSEEtMSBkaWdlc3QgYW5kIHBhdGggbmFtZXJcbiAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCB7aGFzaDogbWQuZGlnZXN0KCksIHBhdGhOYW1lcjogcGF0aE5hbWVyfSk7XG4gICAgfVxuXG4gICAgLy8gZGlnZXN0IGdyb3VwIGhhc2hcbiAgICB2YXIgZ3JvdXBIYXNoID0gZ3JvdXBIYXNoZXNbaV07XG4gICAgbWQudXBkYXRlKGdyb3VwSGFzaCk7XG5cbiAgICAvLyBjaG9vc2UgYSBwYXRoIGFuZCBuYW1lciBmcm9tIHRoZSBwZXJtdXRhdGlvbnNcbiAgICB2YXIgY2hvc2VuUGF0aCA9IG51bGw7XG4gICAgdmFyIGNob3Nlbk5hbWVyID0gbnVsbDtcbiAgICB2YXIgcGVybXV0YXRvciA9IG5ldyBQZXJtdXRhdG9yKGdyb3Vwc1tncm91cEhhc2hdKTtcbiAgICBqc29ubGQuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge3Blcm11dGF0ZSgpO30pO1xuICAgIGZ1bmN0aW9uIHBlcm11dGF0ZSgpIHtcbiAgICAgIHZhciBwZXJtdXRhdGlvbiA9IHBlcm11dGF0b3IubmV4dCgpO1xuICAgICAgdmFyIHBhdGhOYW1lckNvcHkgPSBwYXRoTmFtZXIuY2xvbmUoKTtcblxuICAgICAgLy8gYnVpbGQgYWRqYWNlbnQgcGF0aFxuICAgICAgdmFyIHBhdGggPSAnJztcbiAgICAgIHZhciByZWN1cnNlID0gW107XG4gICAgICBmb3IodmFyIG4gaW4gcGVybXV0YXRpb24pIHtcbiAgICAgICAgdmFyIGJub2RlID0gcGVybXV0YXRpb25bbl07XG5cbiAgICAgICAgLy8gdXNlIGNhbm9uaWNhbCBuYW1lIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZihuYW1lci5pc05hbWVkKGJub2RlKSkge1xuICAgICAgICAgIHBhdGggKz0gbmFtZXIuZ2V0TmFtZShibm9kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gcmVjdXJzZSBpZiBibm9kZSBpc24ndCBuYW1lZCBpbiB0aGUgcGF0aCB5ZXRcbiAgICAgICAgICBpZighcGF0aE5hbWVyQ29weS5pc05hbWVkKGJub2RlKSkge1xuICAgICAgICAgICAgcmVjdXJzZS5wdXNoKGJub2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGF0aCArPSBwYXRoTmFtZXJDb3B5LmdldE5hbWUoYm5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2tpcCBwZXJtdXRhdGlvbiBpZiBwYXRoIGlzIGFscmVhZHkgPj0gY2hvc2VuIHBhdGhcbiAgICAgICAgaWYoY2hvc2VuUGF0aCAhPT0gbnVsbCAmJiBwYXRoLmxlbmd0aCA+PSBjaG9zZW5QYXRoLmxlbmd0aCAmJlxuICAgICAgICAgIHBhdGggPiBjaG9zZW5QYXRoKSB7XG4gICAgICAgICAgcmV0dXJuIG5leHRQZXJtdXRhdGlvbih0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBkb2VzIHRoZSBuZXh0IHJlY3Vyc2lvblxuICAgICAgbmV4dFJlY3Vyc2lvbigwKTtcbiAgICAgIGZ1bmN0aW9uIG5leHRSZWN1cnNpb24obikge1xuICAgICAgICBpZihuID09PSByZWN1cnNlLmxlbmd0aCkge1xuICAgICAgICAgIC8vIGRvbmUsIGRvIG5leHQgcGVybXV0YXRpb25cbiAgICAgICAgICByZXR1cm4gbmV4dFBlcm11dGF0aW9uKGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRvIHJlY3Vyc2lvblxuICAgICAgICB2YXIgYm5vZGUgPSByZWN1cnNlW25dO1xuICAgICAgICBfaGFzaFBhdGhzKGJub2RlLCBibm9kZXMsIG5hbWVyLCBwYXRoTmFtZXJDb3B5LFxuICAgICAgICAgIGZ1bmN0aW9uKGVyciwgcmVzdWx0KSB7XG4gICAgICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXRoICs9IHBhdGhOYW1lckNvcHkuZ2V0TmFtZShibm9kZSkgKyAnPCcgKyByZXN1bHQuaGFzaCArICc+JztcbiAgICAgICAgICAgIHBhdGhOYW1lckNvcHkgPSByZXN1bHQucGF0aE5hbWVyO1xuXG4gICAgICAgICAgICAvLyBza2lwIHBlcm11dGF0aW9uIGlmIHBhdGggaXMgYWxyZWFkeSA+PSBjaG9zZW4gcGF0aFxuICAgICAgICAgICAgaWYoY2hvc2VuUGF0aCAhPT0gbnVsbCAmJiBwYXRoLmxlbmd0aCA+PSBjaG9zZW5QYXRoLmxlbmd0aCAmJlxuICAgICAgICAgICAgICBwYXRoID4gY2hvc2VuUGF0aCkge1xuICAgICAgICAgICAgICByZXR1cm4gbmV4dFBlcm11dGF0aW9uKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBkbyBuZXh0IHJlY3Vyc2lvblxuICAgICAgICAgICAgbmV4dFJlY3Vyc2lvbihuICsgMSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHN0b3JlcyB0aGUgcmVzdWx0cyBvZiB0aGlzIHBlcm11dGF0aW9uIGFuZCBydW5zIHRoZSBuZXh0XG4gICAgICBmdW5jdGlvbiBuZXh0UGVybXV0YXRpb24oc2tpcHBlZCkge1xuICAgICAgICBpZighc2tpcHBlZCAmJiAoY2hvc2VuUGF0aCA9PT0gbnVsbCB8fCBwYXRoIDwgY2hvc2VuUGF0aCkpIHtcbiAgICAgICAgICBjaG9zZW5QYXRoID0gcGF0aDtcbiAgICAgICAgICBjaG9zZW5OYW1lciA9IHBhdGhOYW1lckNvcHk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkbyBuZXh0IHBlcm11dGF0aW9uXG4gICAgICAgIGlmKHBlcm11dGF0b3IuaGFzTmV4dCgpKSB7XG4gICAgICAgICAganNvbmxkLnNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtwZXJtdXRhdGUoKTt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBkaWdlc3QgY2hvc2VuIHBhdGggYW5kIHVwZGF0ZSBuYW1lclxuICAgICAgICAgIG1kLnVwZGF0ZShjaG9zZW5QYXRoKTtcbiAgICAgICAgICBwYXRoTmFtZXIgPSBjaG9zZW5OYW1lcjtcblxuICAgICAgICAgIC8vIGhhc2ggdGhlIG5leHQgZ3JvdXBcbiAgICAgICAgICBoYXNoR3JvdXAoaSArIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBnZXRzIHRoZSBibGFuayBub2RlIG5hbWUgZnJvbSBhbiBSREYgcXVhZCBub2RlXG4gKiAoc3ViamVjdCBvciBvYmplY3QpLiBJZiB0aGUgbm9kZSBpcyBhIGJsYW5rIG5vZGUgYW5kIGl0cyB2YWx1ZVxuICogZG9lcyBub3QgbWF0Y2ggdGhlIGdpdmVuIGJsYW5rIG5vZGUgSUQsIGl0IHdpbGwgYmUgcmV0dXJuZWQuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIFJERiBxdWFkIG5vZGUuXG4gKiBAcGFyYW0gaWQgdGhlIElEIG9mIHRoZSBibGFuayBub2RlIHRvIGxvb2sgbmV4dCB0by5cbiAqXG4gKiBAcmV0dXJuIHRoZSBhZGphY2VudCBibGFuayBub2RlIG5hbWUgb3IgbnVsbCBpZiBub25lIHdhcyBmb3VuZC5cbiAqL1xuZnVuY3Rpb24gX2dldEFkamFjZW50QmxhbmtOb2RlTmFtZShub2RlLCBpZCkge1xuICByZXR1cm4gKG5vZGUudHlwZSA9PT0gJ2JsYW5rIG5vZGUnICYmIG5vZGUudmFsdWUgIT09IGlkID8gbm9kZS52YWx1ZSA6IG51bGwpO1xufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IGZsYXR0ZW5zIHRoZSBzdWJqZWN0cyBpbiB0aGUgZ2l2ZW4gSlNPTi1MRCBleHBhbmRlZCBpbnB1dFxuICogaW50byBhIG5vZGUgbWFwLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBleHBhbmRlZCBpbnB1dC5cbiAqIEBwYXJhbSBncmFwaHMgYSBtYXAgb2YgZ3JhcGggbmFtZSB0byBzdWJqZWN0IG1hcC5cbiAqIEBwYXJhbSBncmFwaCB0aGUgbmFtZSBvZiB0aGUgY3VycmVudCBncmFwaC5cbiAqIEBwYXJhbSBuYW1lciB0aGUgYmxhbmsgbm9kZSBuYW1lci5cbiAqIEBwYXJhbSBuYW1lIHRoZSBuYW1lIGFzc2lnbmVkIHRvIHRoZSBjdXJyZW50IGlucHV0IGlmIGl0IGlzIGEgYm5vZGUuXG4gKiBAcGFyYW0gbGlzdCB0aGUgbGlzdCB0byBhcHBlbmQgdG8sIG51bGwgZm9yIG5vbmUuXG4gKi9cbmZ1bmN0aW9uIF9jcmVhdGVOb2RlTWFwKGlucHV0LCBncmFwaHMsIGdyYXBoLCBuYW1lciwgbmFtZSwgbGlzdCkge1xuICAvLyByZWN1cnNlIHRocm91Z2ggYXJyYXlcbiAgaWYoX2lzQXJyYXkoaW5wdXQpKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBfY3JlYXRlTm9kZU1hcChpbnB1dFtpXSwgZ3JhcGhzLCBncmFwaCwgbmFtZXIsIHVuZGVmaW5lZCwgbGlzdCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGFkZCBub24tb2JqZWN0IHRvIGxpc3RcbiAgaWYoIV9pc09iamVjdChpbnB1dCkpIHtcbiAgICBpZihsaXN0KSB7XG4gICAgICBsaXN0LnB1c2goaW5wdXQpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBhZGQgdmFsdWVzIHRvIGxpc3RcbiAgaWYoX2lzVmFsdWUoaW5wdXQpKSB7XG4gICAgaWYoJ0B0eXBlJyBpbiBpbnB1dCkge1xuICAgICAgdmFyIHR5cGUgPSBpbnB1dFsnQHR5cGUnXTtcbiAgICAgIC8vIHJlbmFtZSBAdHlwZSBibGFuayBub2RlXG4gICAgICBpZih0eXBlLmluZGV4T2YoJ186JykgPT09IDApIHtcbiAgICAgICAgaW5wdXRbJ0B0eXBlJ10gPSB0eXBlID0gbmFtZXIuZ2V0TmFtZSh0eXBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYobGlzdCkge1xuICAgICAgbGlzdC5wdXNoKGlucHV0KTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTm90ZTogQXQgdGhpcyBwb2ludCwgaW5wdXQgbXVzdCBiZSBhIHN1YmplY3QuXG5cbiAgLy8gc3BlYyByZXF1aXJlcyBAdHlwZSB0byBiZSBuYW1lZCBmaXJzdCwgc28gYXNzaWduIG5hbWVzIGVhcmx5XG4gIGlmKCdAdHlwZScgaW4gaW5wdXQpIHtcbiAgICB2YXIgdHlwZXMgPSBpbnB1dFsnQHR5cGUnXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdHlwZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciB0eXBlID0gdHlwZXNbaV07XG4gICAgICBpZih0eXBlLmluZGV4T2YoJ186JykgPT09IDApIHtcbiAgICAgICAgbmFtZXIuZ2V0TmFtZSh0eXBlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBnZXQgbmFtZSBmb3Igc3ViamVjdFxuICBpZihfaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBuYW1lID0gX2lzQmxhbmtOb2RlKGlucHV0KSA/IG5hbWVyLmdldE5hbWUoaW5wdXRbJ0BpZCddKSA6IGlucHV0WydAaWQnXTtcbiAgfVxuXG4gIC8vIGFkZCBzdWJqZWN0IHJlZmVyZW5jZSB0byBsaXN0XG4gIGlmKGxpc3QpIHtcbiAgICBsaXN0LnB1c2goeydAaWQnOiBuYW1lfSk7XG4gIH1cblxuICAvLyBjcmVhdGUgbmV3IHN1YmplY3Qgb3IgbWVyZ2UgaW50byBleGlzdGluZyBvbmVcbiAgdmFyIHN1YmplY3RzID0gZ3JhcGhzW2dyYXBoXTtcbiAgdmFyIHN1YmplY3QgPSBzdWJqZWN0c1tuYW1lXSA9IHN1YmplY3RzW25hbWVdIHx8IHt9O1xuICBzdWJqZWN0WydAaWQnXSA9IG5hbWU7XG4gIHZhciBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMoaW5wdXQpLnNvcnQoKTtcbiAgZm9yKHZhciBwaSA9IDA7IHBpIDwgcHJvcGVydGllcy5sZW5ndGg7ICsrcGkpIHtcbiAgICB2YXIgcHJvcGVydHkgPSBwcm9wZXJ0aWVzW3BpXTtcblxuICAgIC8vIHNraXAgQGlkXG4gICAgaWYocHJvcGVydHkgPT09ICdAaWQnKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgcmV2ZXJzZSBwcm9wZXJ0aWVzXG4gICAgaWYocHJvcGVydHkgPT09ICdAcmV2ZXJzZScpIHtcbiAgICAgIHZhciByZWZlcmVuY2VkTm9kZSA9IHsnQGlkJzogbmFtZX07XG4gICAgICB2YXIgcmV2ZXJzZU1hcCA9IGlucHV0WydAcmV2ZXJzZSddO1xuICAgICAgZm9yKHZhciByZXZlcnNlUHJvcGVydHkgaW4gcmV2ZXJzZU1hcCkge1xuICAgICAgICB2YXIgaXRlbXMgPSByZXZlcnNlTWFwW3JldmVyc2VQcm9wZXJ0eV07XG4gICAgICAgIGZvcih2YXIgaWkgPSAwOyBpaSA8IGl0ZW1zLmxlbmd0aDsgKytpaSkge1xuICAgICAgICAgIHZhciBpdGVtID0gaXRlbXNbaWldO1xuICAgICAgICAgIHZhciBpdGVtTmFtZSA9IGl0ZW1bJ0BpZCddO1xuICAgICAgICAgIGlmKF9pc0JsYW5rTm9kZShpdGVtKSkge1xuICAgICAgICAgICAgaXRlbU5hbWUgPSBuYW1lci5nZXROYW1lKGl0ZW1OYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2NyZWF0ZU5vZGVNYXAoaXRlbSwgZ3JhcGhzLCBncmFwaCwgbmFtZXIsIGl0ZW1OYW1lKTtcbiAgICAgICAgICBqc29ubGQuYWRkVmFsdWUoXG4gICAgICAgICAgICBzdWJqZWN0c1tpdGVtTmFtZV0sIHJldmVyc2VQcm9wZXJ0eSwgcmVmZXJlbmNlZE5vZGUsXG4gICAgICAgICAgICB7cHJvcGVydHlJc0FycmF5OiB0cnVlLCBhbGxvd0R1cGxpY2F0ZTogZmFsc2V9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gcmVjdXJzZSBpbnRvIGdyYXBoXG4gICAgaWYocHJvcGVydHkgPT09ICdAZ3JhcGgnKSB7XG4gICAgICAvLyBhZGQgZ3JhcGggc3ViamVjdHMgbWFwIGVudHJ5XG4gICAgICBpZighKG5hbWUgaW4gZ3JhcGhzKSkge1xuICAgICAgICBncmFwaHNbbmFtZV0gPSB7fTtcbiAgICAgIH1cbiAgICAgIHZhciBnID0gKGdyYXBoID09PSAnQG1lcmdlZCcpID8gZ3JhcGggOiBuYW1lO1xuICAgICAgX2NyZWF0ZU5vZGVNYXAoaW5wdXRbcHJvcGVydHldLCBncmFwaHMsIGcsIG5hbWVyKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGNvcHkgbm9uLUB0eXBlIGtleXdvcmRzXG4gICAgaWYocHJvcGVydHkgIT09ICdAdHlwZScgJiYgX2lzS2V5d29yZChwcm9wZXJ0eSkpIHtcbiAgICAgIGlmKHByb3BlcnR5ID09PSAnQGluZGV4JyAmJiAnQGluZGV4JyBpbiBzdWJqZWN0KSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgY29uZmxpY3RpbmcgQGluZGV4IHByb3BlcnR5IGRldGVjdGVkLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdjb25mbGljdGluZyBpbmRleGVzJywgc3ViamVjdDogc3ViamVjdH0pO1xuICAgICAgfVxuICAgICAgc3ViamVjdFtwcm9wZXJ0eV0gPSBpbnB1dFtwcm9wZXJ0eV07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBpdGVyYXRlIG92ZXIgb2JqZWN0c1xuICAgIHZhciBvYmplY3RzID0gaW5wdXRbcHJvcGVydHldO1xuXG4gICAgLy8gaWYgcHJvcGVydHkgaXMgYSBibm9kZSwgYXNzaWduIGl0IGEgbmV3IGlkXG4gICAgaWYocHJvcGVydHkuaW5kZXhPZignXzonKSA9PT0gMCkge1xuICAgICAgcHJvcGVydHkgPSBuYW1lci5nZXROYW1lKHByb3BlcnR5KTtcbiAgICB9XG5cbiAgICAvLyBlbnN1cmUgcHJvcGVydHkgaXMgYWRkZWQgZm9yIGVtcHR5IGFycmF5c1xuICAgIGlmKG9iamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBqc29ubGQuYWRkVmFsdWUoc3ViamVjdCwgcHJvcGVydHksIFtdLCB7cHJvcGVydHlJc0FycmF5OiB0cnVlfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgZm9yKHZhciBvaSA9IDA7IG9pIDwgb2JqZWN0cy5sZW5ndGg7ICsrb2kpIHtcbiAgICAgIHZhciBvID0gb2JqZWN0c1tvaV07XG5cbiAgICAgIGlmKHByb3BlcnR5ID09PSAnQHR5cGUnKSB7XG4gICAgICAgIC8vIHJlbmFtZSBAdHlwZSBibGFuayBub2Rlc1xuICAgICAgICBvID0gKG8uaW5kZXhPZignXzonKSA9PT0gMCkgPyBuYW1lci5nZXROYW1lKG8pIDogbztcbiAgICAgIH1cblxuICAgICAgLy8gaGFuZGxlIGVtYmVkZGVkIHN1YmplY3Qgb3Igc3ViamVjdCByZWZlcmVuY2VcbiAgICAgIGlmKF9pc1N1YmplY3QobykgfHwgX2lzU3ViamVjdFJlZmVyZW5jZShvKSkge1xuICAgICAgICAvLyByZW5hbWUgYmxhbmsgbm9kZSBAaWRcbiAgICAgICAgdmFyIGlkID0gX2lzQmxhbmtOb2RlKG8pID8gbmFtZXIuZ2V0TmFtZShvWydAaWQnXSkgOiBvWydAaWQnXTtcblxuICAgICAgICAvLyBhZGQgcmVmZXJlbmNlIGFuZCByZWN1cnNlXG4gICAgICAgIGpzb25sZC5hZGRWYWx1ZShcbiAgICAgICAgICBzdWJqZWN0LCBwcm9wZXJ0eSwgeydAaWQnOiBpZH0sXG4gICAgICAgICAge3Byb3BlcnR5SXNBcnJheTogdHJ1ZSwgYWxsb3dEdXBsaWNhdGU6IGZhbHNlfSk7XG4gICAgICAgIF9jcmVhdGVOb2RlTWFwKG8sIGdyYXBocywgZ3JhcGgsIG5hbWVyLCBpZCk7XG4gICAgICB9IGVsc2UgaWYoX2lzTGlzdChvKSkge1xuICAgICAgICAvLyBoYW5kbGUgQGxpc3RcbiAgICAgICAgdmFyIF9saXN0ID0gW107XG4gICAgICAgIF9jcmVhdGVOb2RlTWFwKG9bJ0BsaXN0J10sIGdyYXBocywgZ3JhcGgsIG5hbWVyLCBuYW1lLCBfbGlzdCk7XG4gICAgICAgIG8gPSB7J0BsaXN0JzogX2xpc3R9O1xuICAgICAgICBqc29ubGQuYWRkVmFsdWUoXG4gICAgICAgICAgc3ViamVjdCwgcHJvcGVydHksIG8sXG4gICAgICAgICAge3Byb3BlcnR5SXNBcnJheTogdHJ1ZSwgYWxsb3dEdXBsaWNhdGU6IGZhbHNlfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBoYW5kbGUgQHZhbHVlXG4gICAgICAgIF9jcmVhdGVOb2RlTWFwKG8sIGdyYXBocywgZ3JhcGgsIG5hbWVyLCBuYW1lKTtcbiAgICAgICAganNvbmxkLmFkZFZhbHVlKFxuICAgICAgICAgIHN1YmplY3QsIHByb3BlcnR5LCBvLCB7cHJvcGVydHlJc0FycmF5OiB0cnVlLCBhbGxvd0R1cGxpY2F0ZTogZmFsc2V9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gX21lcmdlTm9kZU1hcHMoZ3JhcGhzKSB7XG4gIC8vIGFkZCBhbGwgbm9uLWRlZmF1bHQgZ3JhcGhzIHRvIGRlZmF1bHQgZ3JhcGhcbiAgdmFyIGRlZmF1bHRHcmFwaCA9IGdyYXBoc1snQGRlZmF1bHQnXTtcbiAgdmFyIGdyYXBoTmFtZXMgPSBPYmplY3Qua2V5cyhncmFwaHMpLnNvcnQoKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IGdyYXBoTmFtZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgZ3JhcGhOYW1lID0gZ3JhcGhOYW1lc1tpXTtcbiAgICBpZihncmFwaE5hbWUgPT09ICdAZGVmYXVsdCcpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB2YXIgbm9kZU1hcCA9IGdyYXBoc1tncmFwaE5hbWVdO1xuICAgIHZhciBzdWJqZWN0ID0gZGVmYXVsdEdyYXBoW2dyYXBoTmFtZV07XG4gICAgaWYoIXN1YmplY3QpIHtcbiAgICAgIGRlZmF1bHRHcmFwaFtncmFwaE5hbWVdID0gc3ViamVjdCA9IHtcbiAgICAgICAgJ0BpZCc6IGdyYXBoTmFtZSxcbiAgICAgICAgJ0BncmFwaCc6IFtdXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZighKCdAZ3JhcGgnIGluIHN1YmplY3QpKSB7XG4gICAgICBzdWJqZWN0WydAZ3JhcGgnXSA9IFtdO1xuICAgIH1cbiAgICB2YXIgZ3JhcGggPSBzdWJqZWN0WydAZ3JhcGgnXTtcbiAgICB2YXIgaWRzID0gT2JqZWN0LmtleXMobm9kZU1hcCkuc29ydCgpO1xuICAgIGZvcih2YXIgaWkgPSAwOyBpaSA8IGlkcy5sZW5ndGg7ICsraWkpIHtcbiAgICAgIHZhciBub2RlID0gbm9kZU1hcFtpZHNbaWldXTtcbiAgICAgIC8vIG9ubHkgYWRkIGZ1bGwgc3ViamVjdHNcbiAgICAgIGlmKCFfaXNTdWJqZWN0UmVmZXJlbmNlKG5vZGUpKSB7XG4gICAgICAgIGdyYXBoLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWZhdWx0R3JhcGg7XG59XG5cbi8qKlxuICogRnJhbWVzIHN1YmplY3RzIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gZnJhbWUuXG4gKlxuICogQHBhcmFtIHN0YXRlIHRoZSBjdXJyZW50IGZyYW1pbmcgc3RhdGUuXG4gKiBAcGFyYW0gc3ViamVjdHMgdGhlIHN1YmplY3RzIHRvIGZpbHRlci5cbiAqIEBwYXJhbSBmcmFtZSB0aGUgZnJhbWUuXG4gKiBAcGFyYW0gcGFyZW50IHRoZSBwYXJlbnQgc3ViamVjdCBvciB0b3AtbGV2ZWwgYXJyYXkuXG4gKiBAcGFyYW0gcHJvcGVydHkgdGhlIHBhcmVudCBwcm9wZXJ0eSwgaW5pdGlhbGl6ZWQgdG8gbnVsbC5cbiAqL1xuZnVuY3Rpb24gX2ZyYW1lKHN0YXRlLCBzdWJqZWN0cywgZnJhbWUsIHBhcmVudCwgcHJvcGVydHkpIHtcbiAgLy8gdmFsaWRhdGUgdGhlIGZyYW1lXG4gIF92YWxpZGF0ZUZyYW1lKGZyYW1lKTtcbiAgZnJhbWUgPSBmcmFtZVswXTtcblxuICAvLyBnZXQgZmxhZ3MgZm9yIGN1cnJlbnQgZnJhbWVcbiAgdmFyIG9wdGlvbnMgPSBzdGF0ZS5vcHRpb25zO1xuICB2YXIgZmxhZ3MgPSB7XG4gICAgZW1iZWQ6IF9nZXRGcmFtZUZsYWcoZnJhbWUsIG9wdGlvbnMsICdlbWJlZCcpLFxuICAgIGV4cGxpY2l0OiBfZ2V0RnJhbWVGbGFnKGZyYW1lLCBvcHRpb25zLCAnZXhwbGljaXQnKSxcbiAgICByZXF1aXJlQWxsOiBfZ2V0RnJhbWVGbGFnKGZyYW1lLCBvcHRpb25zLCAncmVxdWlyZUFsbCcpXG4gIH07XG5cbiAgLy8gZmlsdGVyIG91dCBzdWJqZWN0cyB0aGF0IG1hdGNoIHRoZSBmcmFtZVxuICB2YXIgbWF0Y2hlcyA9IF9maWx0ZXJTdWJqZWN0cyhzdGF0ZSwgc3ViamVjdHMsIGZyYW1lLCBmbGFncyk7XG5cbiAgLy8gYWRkIG1hdGNoZXMgdG8gb3V0cHV0XG4gIHZhciBpZHMgPSBPYmplY3Qua2V5cyhtYXRjaGVzKS5zb3J0KCk7XG4gIGZvcih2YXIgaWR4IGluIGlkcykge1xuICAgIHZhciBpZCA9IGlkc1tpZHhdO1xuICAgIHZhciBzdWJqZWN0ID0gbWF0Y2hlc1tpZF07XG5cbiAgICBpZihmbGFncy5lbWJlZCA9PT0gJ0BsaW5rJyAmJiBpZCBpbiBzdGF0ZS5saW5rKSB7XG4gICAgICAvLyBUT0RPOiBtYXkgd2FudCB0byBhbHNvIG1hdGNoIGFuIGV4aXN0aW5nIGxpbmtlZCBzdWJqZWN0IGFnYWluc3RcbiAgICAgIC8vIHRoZSBjdXJyZW50IGZyYW1lIC4uLiBzbyBkaWZmZXJlbnQgZnJhbWVzIGNvdWxkIHByb2R1Y2UgZGlmZmVyZW50XG4gICAgICAvLyBzdWJqZWN0cyB0aGF0IGFyZSBvbmx5IHNoYXJlZCBpbi1tZW1vcnkgd2hlbiB0aGUgZnJhbWVzIGFyZSB0aGUgc2FtZVxuXG4gICAgICAvLyBhZGQgZXhpc3RpbmcgbGlua2VkIHN1YmplY3RcbiAgICAgIF9hZGRGcmFtZU91dHB1dChwYXJlbnQsIHByb3BlcnR5LCBzdGF0ZS5saW5rW2lkXSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvKiBOb3RlOiBJbiBvcmRlciB0byB0cmVhdCBlYWNoIHRvcC1sZXZlbCBtYXRjaCBhcyBhIGNvbXBhcnRtZW50YWxpemVkXG4gICAgcmVzdWx0LCBjbGVhciB0aGUgdW5pcXVlIGVtYmVkZGVkIHN1YmplY3RzIG1hcCB3aGVuIHRoZSBwcm9wZXJ0eSBpcyBudWxsLFxuICAgIHdoaWNoIG9ubHkgb2NjdXJzIGF0IHRoZSB0b3AtbGV2ZWwuICovXG4gICAgaWYocHJvcGVydHkgPT09IG51bGwpIHtcbiAgICAgIHN0YXRlLnVuaXF1ZUVtYmVkcyA9IHt9O1xuICAgIH1cblxuICAgIC8vIHN0YXJ0IG91dHB1dCBmb3Igc3ViamVjdFxuICAgIHZhciBvdXRwdXQgPSB7fTtcbiAgICBvdXRwdXRbJ0BpZCddID0gaWQ7XG4gICAgc3RhdGUubGlua1tpZF0gPSBvdXRwdXQ7XG5cbiAgICAvLyBpZiBlbWJlZCBpcyBAbmV2ZXIgb3IgaWYgYSBjaXJjdWxhciByZWZlcmVuY2Ugd291bGQgYmUgY3JlYXRlZCBieSBhblxuICAgIC8vIGVtYmVkLCB0aGUgc3ViamVjdCBjYW5ub3QgYmUgZW1iZWRkZWQsIGp1c3QgYWRkIHRoZSByZWZlcmVuY2U7XG4gICAgLy8gbm90ZSB0aGF0IGEgY2lyY3VsYXIgcmVmZXJlbmNlIHdvbid0IG9jY3VyIHdoZW4gdGhlIGVtYmVkIGZsYWcgaXNcbiAgICAvLyBgQGxpbmtgIGFzIHRoZSBhYm92ZSBjaGVjayB3aWxsIHNob3J0LWNpcmN1aXQgYmVmb3JlIHJlYWNoaW5nIHRoaXMgcG9pbnRcbiAgICBpZihmbGFncy5lbWJlZCA9PT0gJ0BuZXZlcicgfHxcbiAgICAgIF9jcmVhdGVzQ2lyY3VsYXJSZWZlcmVuY2Uoc3ViamVjdCwgc3RhdGUuc3ViamVjdFN0YWNrKSkge1xuICAgICAgX2FkZEZyYW1lT3V0cHV0KHBhcmVudCwgcHJvcGVydHksIG91dHB1dCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBpZiBvbmx5IHRoZSBsYXN0IG1hdGNoIHNob3VsZCBiZSBlbWJlZGRlZFxuICAgIGlmKGZsYWdzLmVtYmVkID09PSAnQGxhc3QnKSB7XG4gICAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIGVtYmVkXG4gICAgICBpZihpZCBpbiBzdGF0ZS51bmlxdWVFbWJlZHMpIHtcbiAgICAgICAgX3JlbW92ZUVtYmVkKHN0YXRlLCBpZCk7XG4gICAgICB9XG4gICAgICBzdGF0ZS51bmlxdWVFbWJlZHNbaWRdID0ge3BhcmVudDogcGFyZW50LCBwcm9wZXJ0eTogcHJvcGVydHl9O1xuICAgIH1cblxuICAgIC8vIHB1c2ggbWF0Y2hpbmcgc3ViamVjdCBvbnRvIHN0YWNrIHRvIGVuYWJsZSBjaXJjdWxhciBlbWJlZCBjaGVja3NcbiAgICBzdGF0ZS5zdWJqZWN0U3RhY2sucHVzaChzdWJqZWN0KTtcblxuICAgIC8vIGl0ZXJhdGUgb3ZlciBzdWJqZWN0IHByb3BlcnRpZXNcbiAgICB2YXIgcHJvcHMgPSBPYmplY3Qua2V5cyhzdWJqZWN0KS5zb3J0KCk7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcHJvcCA9IHByb3BzW2ldO1xuXG4gICAgICAvLyBjb3B5IGtleXdvcmRzIHRvIG91dHB1dFxuICAgICAgaWYoX2lzS2V5d29yZChwcm9wKSkge1xuICAgICAgICBvdXRwdXRbcHJvcF0gPSBfY2xvbmUoc3ViamVjdFtwcm9wXSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBleHBsaWNpdCBpcyBvbiBhbmQgcHJvcGVydHkgaXNuJ3QgaW4gdGhlIGZyYW1lLCBza2lwIHByb2Nlc3NpbmdcbiAgICAgIGlmKGZsYWdzLmV4cGxpY2l0ICYmICEocHJvcCBpbiBmcmFtZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIGFkZCBvYmplY3RzXG4gICAgICB2YXIgb2JqZWN0cyA9IHN1YmplY3RbcHJvcF07XG4gICAgICBmb3IodmFyIG9pID0gMDsgb2kgPCBvYmplY3RzLmxlbmd0aDsgKytvaSkge1xuICAgICAgICB2YXIgbyA9IG9iamVjdHNbb2ldO1xuXG4gICAgICAgIC8vIHJlY3Vyc2UgaW50byBsaXN0XG4gICAgICAgIGlmKF9pc0xpc3QobykpIHtcbiAgICAgICAgICAvLyBhZGQgZW1wdHkgbGlzdFxuICAgICAgICAgIHZhciBsaXN0ID0geydAbGlzdCc6IFtdfTtcbiAgICAgICAgICBfYWRkRnJhbWVPdXRwdXQob3V0cHV0LCBwcm9wLCBsaXN0KTtcblxuICAgICAgICAgIC8vIGFkZCBsaXN0IG9iamVjdHNcbiAgICAgICAgICB2YXIgc3JjID0gb1snQGxpc3QnXTtcbiAgICAgICAgICBmb3IodmFyIG4gaW4gc3JjKSB7XG4gICAgICAgICAgICBvID0gc3JjW25dO1xuICAgICAgICAgICAgaWYoX2lzU3ViamVjdFJlZmVyZW5jZShvKSkge1xuICAgICAgICAgICAgICB2YXIgc3ViZnJhbWUgPSAocHJvcCBpbiBmcmFtZSA/XG4gICAgICAgICAgICAgICAgZnJhbWVbcHJvcF1bMF1bJ0BsaXN0J10gOiBfY3JlYXRlSW1wbGljaXRGcmFtZShmbGFncykpO1xuICAgICAgICAgICAgICAvLyByZWN1cnNlIGludG8gc3ViamVjdCByZWZlcmVuY2VcbiAgICAgICAgICAgICAgX2ZyYW1lKHN0YXRlLCBbb1snQGlkJ11dLCBzdWJmcmFtZSwgbGlzdCwgJ0BsaXN0Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBpbmNsdWRlIG90aGVyIHZhbHVlcyBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgICAgIF9hZGRGcmFtZU91dHB1dChsaXN0LCAnQGxpc3QnLCBfY2xvbmUobykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKF9pc1N1YmplY3RSZWZlcmVuY2UobykpIHtcbiAgICAgICAgICAvLyByZWN1cnNlIGludG8gc3ViamVjdCByZWZlcmVuY2VcbiAgICAgICAgICB2YXIgc3ViZnJhbWUgPSAocHJvcCBpbiBmcmFtZSA/XG4gICAgICAgICAgICBmcmFtZVtwcm9wXSA6IF9jcmVhdGVJbXBsaWNpdEZyYW1lKGZsYWdzKSk7XG4gICAgICAgICAgX2ZyYW1lKHN0YXRlLCBbb1snQGlkJ11dLCBzdWJmcmFtZSwgb3V0cHV0LCBwcm9wKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBpbmNsdWRlIG90aGVyIHZhbHVlcyBhdXRvbWF0aWNhbGx5XG4gICAgICAgICAgX2FkZEZyYW1lT3V0cHV0KG91dHB1dCwgcHJvcCwgX2Nsb25lKG8pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGhhbmRsZSBkZWZhdWx0c1xuICAgIHZhciBwcm9wcyA9IE9iamVjdC5rZXlzKGZyYW1lKS5zb3J0KCk7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgcHJvcCA9IHByb3BzW2ldO1xuXG4gICAgICAvLyBza2lwIGtleXdvcmRzXG4gICAgICBpZihfaXNLZXl3b3JkKHByb3ApKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiBvbWl0IGRlZmF1bHQgaXMgb2ZmLCB0aGVuIGluY2x1ZGUgZGVmYXVsdCB2YWx1ZXMgZm9yIHByb3BlcnRpZXNcbiAgICAgIC8vIHRoYXQgYXBwZWFyIGluIHRoZSBuZXh0IGZyYW1lIGJ1dCBhcmUgbm90IGluIHRoZSBtYXRjaGluZyBzdWJqZWN0XG4gICAgICB2YXIgbmV4dCA9IGZyYW1lW3Byb3BdWzBdO1xuICAgICAgdmFyIG9taXREZWZhdWx0T24gPSBfZ2V0RnJhbWVGbGFnKG5leHQsIG9wdGlvbnMsICdvbWl0RGVmYXVsdCcpO1xuICAgICAgaWYoIW9taXREZWZhdWx0T24gJiYgIShwcm9wIGluIG91dHB1dCkpIHtcbiAgICAgICAgdmFyIHByZXNlcnZlID0gJ0BudWxsJztcbiAgICAgICAgaWYoJ0BkZWZhdWx0JyBpbiBuZXh0KSB7XG4gICAgICAgICAgcHJlc2VydmUgPSBfY2xvbmUobmV4dFsnQGRlZmF1bHQnXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoIV9pc0FycmF5KHByZXNlcnZlKSkge1xuICAgICAgICAgIHByZXNlcnZlID0gW3ByZXNlcnZlXTtcbiAgICAgICAgfVxuICAgICAgICBvdXRwdXRbcHJvcF0gPSBbeydAcHJlc2VydmUnOiBwcmVzZXJ2ZX1dO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGFkZCBvdXRwdXQgdG8gcGFyZW50XG4gICAgX2FkZEZyYW1lT3V0cHV0KHBhcmVudCwgcHJvcGVydHksIG91dHB1dCk7XG5cbiAgICAvLyBwb3AgbWF0Y2hpbmcgc3ViamVjdCBmcm9tIGNpcmN1bGFyIHJlZi1jaGVja2luZyBzdGFja1xuICAgIHN0YXRlLnN1YmplY3RTdGFjay5wb3AoKTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gaW1wbGljaXQgZnJhbWUgd2hlbiByZWN1cnNpbmcgdGhyb3VnaCBzdWJqZWN0IG1hdGNoZXMuIElmXG4gKiBhIGZyYW1lIGRvZXNuJ3QgaGF2ZSBhbiBleHBsaWNpdCBmcmFtZSBmb3IgYSBwYXJ0aWN1bGFyIHByb3BlcnR5LCB0aGVuXG4gKiBhIHdpbGRjYXJkIGNoaWxkIGZyYW1lIHdpbGwgYmUgY3JlYXRlZCB0aGF0IHVzZXMgdGhlIHNhbWUgZmxhZ3MgdGhhdCB0aGVcbiAqIHBhcmVudCBmcmFtZSB1c2VkLlxuICpcbiAqIEBwYXJhbSBmbGFncyB0aGUgY3VycmVudCBmcmFtaW5nIGZsYWdzLlxuICpcbiAqIEByZXR1cm4gdGhlIGltcGxpY2l0IGZyYW1lLlxuICovXG5mdW5jdGlvbiBfY3JlYXRlSW1wbGljaXRGcmFtZShmbGFncykge1xuICB2YXIgZnJhbWUgPSB7fTtcbiAgZm9yKHZhciBrZXkgaW4gZmxhZ3MpIHtcbiAgICBpZihmbGFnc1trZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGZyYW1lWydAJyArIGtleV0gPSBbZmxhZ3Nba2V5XV07XG4gICAgfVxuICB9XG4gIHJldHVybiBbZnJhbWVdO1xufVxuXG4vKipcbiAqIENoZWNrcyB0aGUgY3VycmVudCBzdWJqZWN0IHN0YWNrIHRvIHNlZSBpZiBlbWJlZGRpbmcgdGhlIGdpdmVuIHN1YmplY3RcbiAqIHdvdWxkIGNhdXNlIGEgY2lyY3VsYXIgcmVmZXJlbmNlLlxuICpcbiAqIEBwYXJhbSBzdWJqZWN0VG9FbWJlZCB0aGUgc3ViamVjdCB0byBlbWJlZC5cbiAqIEBwYXJhbSBzdWJqZWN0U3RhY2sgdGhlIGN1cnJlbnQgc3RhY2sgb2Ygc3ViamVjdHMuXG4gKlxuICogQHJldHVybiB0cnVlIGlmIGEgY2lyY3VsYXIgcmVmZXJlbmNlIHdvdWxkIGJlIGNyZWF0ZWQsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2NyZWF0ZXNDaXJjdWxhclJlZmVyZW5jZShzdWJqZWN0VG9FbWJlZCwgc3ViamVjdFN0YWNrKSB7XG4gIGZvcih2YXIgaSA9IHN1YmplY3RTdGFjay5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgIGlmKHN1YmplY3RTdGFja1tpXVsnQGlkJ10gPT09IHN1YmplY3RUb0VtYmVkWydAaWQnXSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBmcmFtZSBmbGFnIHZhbHVlIGZvciB0aGUgZ2l2ZW4gZmxhZyBuYW1lLlxuICpcbiAqIEBwYXJhbSBmcmFtZSB0aGUgZnJhbWUuXG4gKiBAcGFyYW0gb3B0aW9ucyB0aGUgZnJhbWluZyBvcHRpb25zLlxuICogQHBhcmFtIG5hbWUgdGhlIGZsYWcgbmFtZS5cbiAqXG4gKiBAcmV0dXJuIHRoZSBmbGFnIHZhbHVlLlxuICovXG5mdW5jdGlvbiBfZ2V0RnJhbWVGbGFnKGZyYW1lLCBvcHRpb25zLCBuYW1lKSB7XG4gIHZhciBmbGFnID0gJ0AnICsgbmFtZTtcbiAgdmFyIHJ2YWwgPSAoZmxhZyBpbiBmcmFtZSA/IGZyYW1lW2ZsYWddWzBdIDogb3B0aW9uc1tuYW1lXSk7XG4gIGlmKG5hbWUgPT09ICdlbWJlZCcpIHtcbiAgICAvLyBkZWZhdWx0IGlzIFwiQGxhc3RcIlxuICAgIC8vIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IHN1cHBvcnQgZm9yIFwiZW1iZWRcIiBtYXBzOlxuICAgIC8vIHRydWUgPT4gXCJAbGFzdFwiXG4gICAgLy8gZmFsc2UgPT4gXCJAbmV2ZXJcIlxuICAgIGlmKHJ2YWwgPT09IHRydWUpIHtcbiAgICAgIHJ2YWwgPSAnQGxhc3QnO1xuICAgIH0gZWxzZSBpZihydmFsID09PSBmYWxzZSkge1xuICAgICAgcnZhbCA9ICdAbmV2ZXInO1xuICAgIH0gZWxzZSBpZihydmFsICE9PSAnQGFsd2F5cycgJiYgcnZhbCAhPT0gJ0BuZXZlcicgJiYgcnZhbCAhPT0gJ0BsaW5rJykge1xuICAgICAgcnZhbCA9ICdAbGFzdCc7XG4gICAgfVxuICB9XG4gIHJldHVybiBydmFsO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlcyBhIEpTT04tTEQgZnJhbWUsIHRocm93aW5nIGFuIGV4Y2VwdGlvbiBpZiB0aGUgZnJhbWUgaXMgaW52YWxpZC5cbiAqXG4gKiBAcGFyYW0gZnJhbWUgdGhlIGZyYW1lIHRvIHZhbGlkYXRlLlxuICovXG5mdW5jdGlvbiBfdmFsaWRhdGVGcmFtZShmcmFtZSkge1xuICBpZighX2lzQXJyYXkoZnJhbWUpIHx8IGZyYW1lLmxlbmd0aCAhPT0gMSB8fCAhX2lzT2JqZWN0KGZyYW1lWzBdKSkge1xuICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhIEpTT04tTEQgZnJhbWUgbXVzdCBiZSBhIHNpbmdsZSBvYmplY3QuJyxcbiAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7ZnJhbWU6IGZyYW1lfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbWFwIG9mIGFsbCBvZiB0aGUgc3ViamVjdHMgdGhhdCBtYXRjaCBhIHBhcnNlZCBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gc3RhdGUgdGhlIGN1cnJlbnQgZnJhbWluZyBzdGF0ZS5cbiAqIEBwYXJhbSBzdWJqZWN0cyB0aGUgc2V0IG9mIHN1YmplY3RzIHRvIGZpbHRlci5cbiAqIEBwYXJhbSBmcmFtZSB0aGUgcGFyc2VkIGZyYW1lLlxuICogQHBhcmFtIGZsYWdzIHRoZSBmcmFtZSBmbGFncy5cbiAqXG4gKiBAcmV0dXJuIGFsbCBvZiB0aGUgbWF0Y2hlZCBzdWJqZWN0cy5cbiAqL1xuZnVuY3Rpb24gX2ZpbHRlclN1YmplY3RzKHN0YXRlLCBzdWJqZWN0cywgZnJhbWUsIGZsYWdzKSB7XG4gIC8vIGZpbHRlciBzdWJqZWN0cyBpbiBAaWQgb3JkZXJcbiAgdmFyIHJ2YWwgPSB7fTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHN1YmplY3RzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGlkID0gc3ViamVjdHNbaV07XG4gICAgdmFyIHN1YmplY3QgPSBzdGF0ZS5zdWJqZWN0c1tpZF07XG4gICAgaWYoX2ZpbHRlclN1YmplY3Qoc3ViamVjdCwgZnJhbWUsIGZsYWdzKSkge1xuICAgICAgcnZhbFtpZF0gPSBzdWJqZWN0O1xuICAgIH1cbiAgfVxuICByZXR1cm4gcnZhbDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHN1YmplY3QgbWF0Y2hlcyB0aGUgZ2l2ZW4gZnJhbWUuXG4gKlxuICogQHBhcmFtIHN1YmplY3QgdGhlIHN1YmplY3QgdG8gY2hlY2suXG4gKiBAcGFyYW0gZnJhbWUgdGhlIGZyYW1lIHRvIGNoZWNrLlxuICogQHBhcmFtIGZsYWdzIHRoZSBmcmFtZSBmbGFncy5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHN1YmplY3QgbWF0Y2hlcywgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfZmlsdGVyU3ViamVjdChzdWJqZWN0LCBmcmFtZSwgZmxhZ3MpIHtcbiAgLy8gY2hlY2sgQHR5cGUgKG9iamVjdCB2YWx1ZSBtZWFucyAnYW55JyB0eXBlLCBmYWxsIHRocm91Z2ggdG8gZHVja3R5cGluZylcbiAgaWYoJ0B0eXBlJyBpbiBmcmFtZSAmJlxuICAgICEoZnJhbWVbJ0B0eXBlJ10ubGVuZ3RoID09PSAxICYmIF9pc09iamVjdChmcmFtZVsnQHR5cGUnXVswXSkpKSB7XG4gICAgdmFyIHR5cGVzID0gZnJhbWVbJ0B0eXBlJ107XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHR5cGVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAvLyBhbnkgbWF0Y2hpbmcgQHR5cGUgaXMgYSBtYXRjaFxuICAgICAgaWYoanNvbmxkLmhhc1ZhbHVlKHN1YmplY3QsICdAdHlwZScsIHR5cGVzW2ldKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gY2hlY2sgZHVja3R5cGVcbiAgdmFyIHdpbGRjYXJkID0gdHJ1ZTtcbiAgdmFyIG1hdGNoZXNTb21lID0gZmFsc2U7XG4gIGZvcih2YXIga2V5IGluIGZyYW1lKSB7XG4gICAgaWYoX2lzS2V5d29yZChrZXkpKSB7XG4gICAgICAvLyBza2lwIG5vbi1AaWQgYW5kIG5vbi1AdHlwZVxuICAgICAgaWYoa2V5ICE9PSAnQGlkJyAmJiBrZXkgIT09ICdAdHlwZScpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB3aWxkY2FyZCA9IGZhbHNlO1xuXG4gICAgICAvLyBjaGVjayBAaWQgZm9yIGEgc3BlY2lmaWMgQGlkIHZhbHVlXG4gICAgICBpZihrZXkgPT09ICdAaWQnICYmIF9pc1N0cmluZyhmcmFtZVtrZXldKSkge1xuICAgICAgICBpZihzdWJqZWN0W2tleV0gIT09IGZyYW1lW2tleV0pIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgbWF0Y2hlc1NvbWUgPSB0cnVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB3aWxkY2FyZCA9IGZhbHNlO1xuXG4gICAgaWYoa2V5IGluIHN1YmplY3QpIHtcbiAgICAgIC8vIGZyYW1lW2tleV0gPT09IFtdIG1lYW5zIGRvIG5vdCBtYXRjaCBpZiBwcm9wZXJ0eSBpcyBwcmVzZW50XG4gICAgICBpZihfaXNBcnJheShmcmFtZVtrZXldKSAmJiBmcmFtZVtrZXldLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICBzdWJqZWN0W2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBtYXRjaGVzU29tZSA9IHRydWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBhbGwgcHJvcGVydGllcyBtdXN0IG1hdGNoIHRvIGJlIGEgZHVjayB1bmxlc3MgYSBAZGVmYXVsdCBpcyBzcGVjaWZpZWRcbiAgICB2YXIgaGFzRGVmYXVsdCA9IChfaXNBcnJheShmcmFtZVtrZXldKSAmJiBfaXNPYmplY3QoZnJhbWVba2V5XVswXSkgJiZcbiAgICAgICdAZGVmYXVsdCcgaW4gZnJhbWVba2V5XVswXSk7XG4gICAgaWYoZmxhZ3MucmVxdWlyZUFsbCAmJiAhaGFzRGVmYXVsdCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJldHVybiB0cnVlIGlmIHdpbGRjYXJkIG9yIHN1YmplY3QgbWF0Y2hlcyBzb21lIHByb3BlcnRpZXNcbiAgcmV0dXJuIHdpbGRjYXJkIHx8IG1hdGNoZXNTb21lO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYW4gZXhpc3RpbmcgZW1iZWQuXG4gKlxuICogQHBhcmFtIHN0YXRlIHRoZSBjdXJyZW50IGZyYW1pbmcgc3RhdGUuXG4gKiBAcGFyYW0gaWQgdGhlIEBpZCBvZiB0aGUgZW1iZWQgdG8gcmVtb3ZlLlxuICovXG5mdW5jdGlvbiBfcmVtb3ZlRW1iZWQoc3RhdGUsIGlkKSB7XG4gIC8vIGdldCBleGlzdGluZyBlbWJlZFxuICB2YXIgZW1iZWRzID0gc3RhdGUudW5pcXVlRW1iZWRzO1xuICB2YXIgZW1iZWQgPSBlbWJlZHNbaWRdO1xuICB2YXIgcGFyZW50ID0gZW1iZWQucGFyZW50O1xuICB2YXIgcHJvcGVydHkgPSBlbWJlZC5wcm9wZXJ0eTtcblxuICAvLyBjcmVhdGUgcmVmZXJlbmNlIHRvIHJlcGxhY2UgZW1iZWRcbiAgdmFyIHN1YmplY3QgPSB7J0BpZCc6IGlkfTtcblxuICAvLyByZW1vdmUgZXhpc3RpbmcgZW1iZWRcbiAgaWYoX2lzQXJyYXkocGFyZW50KSkge1xuICAgIC8vIHJlcGxhY2Ugc3ViamVjdCB3aXRoIHJlZmVyZW5jZVxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBwYXJlbnQubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmKGpzb25sZC5jb21wYXJlVmFsdWVzKHBhcmVudFtpXSwgc3ViamVjdCkpIHtcbiAgICAgICAgcGFyZW50W2ldID0gc3ViamVjdDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIHJlcGxhY2Ugc3ViamVjdCB3aXRoIHJlZmVyZW5jZVxuICAgIHZhciB1c2VBcnJheSA9IF9pc0FycmF5KHBhcmVudFtwcm9wZXJ0eV0pO1xuICAgIGpzb25sZC5yZW1vdmVWYWx1ZShwYXJlbnQsIHByb3BlcnR5LCBzdWJqZWN0LCB7cHJvcGVydHlJc0FycmF5OiB1c2VBcnJheX0pO1xuICAgIGpzb25sZC5hZGRWYWx1ZShwYXJlbnQsIHByb3BlcnR5LCBzdWJqZWN0LCB7cHJvcGVydHlJc0FycmF5OiB1c2VBcnJheX0pO1xuICB9XG5cbiAgLy8gcmVjdXJzaXZlbHkgcmVtb3ZlIGRlcGVuZGVudCBkYW5nbGluZyBlbWJlZHNcbiAgdmFyIHJlbW92ZURlcGVuZGVudHMgPSBmdW5jdGlvbihpZCkge1xuICAgIC8vIGdldCBlbWJlZCBrZXlzIGFzIGEgc2VwYXJhdGUgYXJyYXkgdG8gZW5hYmxlIGRlbGV0aW5nIGtleXMgaW4gbWFwXG4gICAgdmFyIGlkcyA9IE9iamVjdC5rZXlzKGVtYmVkcyk7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGlkcy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIG5leHQgPSBpZHNbaV07XG4gICAgICBpZihuZXh0IGluIGVtYmVkcyAmJiBfaXNPYmplY3QoZW1iZWRzW25leHRdLnBhcmVudCkgJiZcbiAgICAgICAgZW1iZWRzW25leHRdLnBhcmVudFsnQGlkJ10gPT09IGlkKSB7XG4gICAgICAgIGRlbGV0ZSBlbWJlZHNbbmV4dF07XG4gICAgICAgIHJlbW92ZURlcGVuZGVudHMobmV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICByZW1vdmVEZXBlbmRlbnRzKGlkKTtcbn1cblxuLyoqXG4gKiBBZGRzIGZyYW1pbmcgb3V0cHV0IHRvIHRoZSBnaXZlbiBwYXJlbnQuXG4gKlxuICogQHBhcmFtIHBhcmVudCB0aGUgcGFyZW50IHRvIGFkZCB0by5cbiAqIEBwYXJhbSBwcm9wZXJ0eSB0aGUgcGFyZW50IHByb3BlcnR5LlxuICogQHBhcmFtIG91dHB1dCB0aGUgb3V0cHV0IHRvIGFkZC5cbiAqL1xuZnVuY3Rpb24gX2FkZEZyYW1lT3V0cHV0KHBhcmVudCwgcHJvcGVydHksIG91dHB1dCkge1xuICBpZihfaXNPYmplY3QocGFyZW50KSkge1xuICAgIGpzb25sZC5hZGRWYWx1ZShwYXJlbnQsIHByb3BlcnR5LCBvdXRwdXQsIHtwcm9wZXJ0eUlzQXJyYXk6IHRydWV9KTtcbiAgfSBlbHNlIHtcbiAgICBwYXJlbnQucHVzaChvdXRwdXQpO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgQHByZXNlcnZlIGtleXdvcmRzIGFzIHRoZSBsYXN0IHN0ZXAgb2YgdGhlIGZyYW1pbmcgYWxnb3JpdGhtLlxuICpcbiAqIEBwYXJhbSBjdHggdGhlIGFjdGl2ZSBjb250ZXh0IHVzZWQgdG8gY29tcGFjdCB0aGUgaW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgdGhlIGZyYW1lZCwgY29tcGFjdGVkIG91dHB1dC5cbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBjb21wYWN0aW9uIG9wdGlvbnMgdXNlZC5cbiAqXG4gKiBAcmV0dXJuIHRoZSByZXN1bHRpbmcgb3V0cHV0LlxuICovXG5mdW5jdGlvbiBfcmVtb3ZlUHJlc2VydmUoY3R4LCBpbnB1dCwgb3B0aW9ucykge1xuICAvLyByZWN1cnNlIHRocm91Z2ggYXJyYXlzXG4gIGlmKF9pc0FycmF5KGlucHV0KSkge1xuICAgIHZhciBvdXRwdXQgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciByZXN1bHQgPSBfcmVtb3ZlUHJlc2VydmUoY3R4LCBpbnB1dFtpXSwgb3B0aW9ucyk7XG4gICAgICAvLyBkcm9wIG51bGxzIGZyb20gYXJyYXlzXG4gICAgICBpZihyZXN1bHQgIT09IG51bGwpIHtcbiAgICAgICAgb3V0cHV0LnB1c2gocmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaW5wdXQgPSBvdXRwdXQ7XG4gIH0gZWxzZSBpZihfaXNPYmplY3QoaW5wdXQpKSB7XG4gICAgLy8gcmVtb3ZlIEBwcmVzZXJ2ZVxuICAgIGlmKCdAcHJlc2VydmUnIGluIGlucHV0KSB7XG4gICAgICBpZihpbnB1dFsnQHByZXNlcnZlJ10gPT09ICdAbnVsbCcpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gaW5wdXRbJ0BwcmVzZXJ2ZSddO1xuICAgIH1cblxuICAgIC8vIHNraXAgQHZhbHVlc1xuICAgIGlmKF9pc1ZhbHVlKGlucHV0KSkge1xuICAgICAgcmV0dXJuIGlucHV0O1xuICAgIH1cblxuICAgIC8vIHJlY3Vyc2UgdGhyb3VnaCBAbGlzdHNcbiAgICBpZihfaXNMaXN0KGlucHV0KSkge1xuICAgICAgaW5wdXRbJ0BsaXN0J10gPSBfcmVtb3ZlUHJlc2VydmUoY3R4LCBpbnB1dFsnQGxpc3QnXSwgb3B0aW9ucyk7XG4gICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGluLW1lbW9yeSBsaW5rZWQgbm9kZXNcbiAgICB2YXIgaWRBbGlhcyA9IF9jb21wYWN0SXJpKGN0eCwgJ0BpZCcpO1xuICAgIGlmKGlkQWxpYXMgaW4gaW5wdXQpIHtcbiAgICAgIHZhciBpZCA9IGlucHV0W2lkQWxpYXNdO1xuICAgICAgaWYoaWQgaW4gb3B0aW9ucy5saW5rKSB7XG4gICAgICAgIHZhciBpZHggPSBvcHRpb25zLmxpbmtbaWRdLmluZGV4T2YoaW5wdXQpO1xuICAgICAgICBpZihpZHggPT09IC0xKSB7XG4gICAgICAgICAgLy8gcHJldmVudCBjaXJjdWxhciB2aXNpdGF0aW9uXG4gICAgICAgICAgb3B0aW9ucy5saW5rW2lkXS5wdXNoKGlucHV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBhbHJlYWR5IHZpc2l0ZWRcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucy5saW5rW2lkXVtpZHhdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBwcmV2ZW50IGNpcmN1bGFyIHZpc2l0YXRpb25cbiAgICAgICAgb3B0aW9ucy5saW5rW2lkXSA9IFtpbnB1dF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmVjdXJzZSB0aHJvdWdoIHByb3BlcnRpZXNcbiAgICBmb3IodmFyIHByb3AgaW4gaW5wdXQpIHtcbiAgICAgIHZhciByZXN1bHQgPSBfcmVtb3ZlUHJlc2VydmUoY3R4LCBpbnB1dFtwcm9wXSwgb3B0aW9ucyk7XG4gICAgICB2YXIgY29udGFpbmVyID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShjdHgsIHByb3AsICdAY29udGFpbmVyJyk7XG4gICAgICBpZihvcHRpb25zLmNvbXBhY3RBcnJheXMgJiYgX2lzQXJyYXkocmVzdWx0KSAmJiByZXN1bHQubGVuZ3RoID09PSAxICYmXG4gICAgICAgIGNvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSByZXN1bHRbMF07XG4gICAgICB9XG4gICAgICBpbnB1dFtwcm9wXSA9IHJlc3VsdDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGlucHV0O1xufVxuXG4vKipcbiAqIENvbXBhcmVzIHR3byBzdHJpbmdzIGZpcnN0IGJhc2VkIG9uIGxlbmd0aCBhbmQgdGhlbiBsZXhpY29ncmFwaGljYWxseS5cbiAqXG4gKiBAcGFyYW0gYSB0aGUgZmlyc3Qgc3RyaW5nLlxuICogQHBhcmFtIGIgdGhlIHNlY29uZCBzdHJpbmcuXG4gKlxuICogQHJldHVybiAtMSBpZiBhIDwgYiwgMSBpZiBhID4gYiwgMCBpZiBhID09IGIuXG4gKi9cbmZ1bmN0aW9uIF9jb21wYXJlU2hvcnRlc3RMZWFzdChhLCBiKSB7XG4gIGlmKGEubGVuZ3RoIDwgYi5sZW5ndGgpIHtcbiAgICByZXR1cm4gLTE7XG4gIH1cbiAgaWYoYi5sZW5ndGggPCBhLmxlbmd0aCkge1xuICAgIHJldHVybiAxO1xuICB9XG4gIGlmKGEgPT09IGIpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxuICByZXR1cm4gKGEgPCBiKSA/IC0xIDogMTtcbn1cblxuLyoqXG4gKiBQaWNrcyB0aGUgcHJlZmVycmVkIGNvbXBhY3Rpb24gdGVybSBmcm9tIHRoZSBnaXZlbiBpbnZlcnNlIGNvbnRleHQgZW50cnkuXG4gKlxuICogQHBhcmFtIGFjdGl2ZUN0eCB0aGUgYWN0aXZlIGNvbnRleHQuXG4gKiBAcGFyYW0gaXJpIHRoZSBJUkkgdG8gcGljayB0aGUgdGVybSBmb3IuXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIHBpY2sgdGhlIHRlcm0gZm9yLlxuICogQHBhcmFtIGNvbnRhaW5lcnMgdGhlIHByZWZlcnJlZCBjb250YWluZXJzLlxuICogQHBhcmFtIHR5cGVPckxhbmd1YWdlIGVpdGhlciAnQHR5cGUnIG9yICdAbGFuZ3VhZ2UnLlxuICogQHBhcmFtIHR5cGVPckxhbmd1YWdlVmFsdWUgdGhlIHByZWZlcnJlZCB2YWx1ZSBmb3IgJ0B0eXBlJyBvciAnQGxhbmd1YWdlJy5cbiAqXG4gKiBAcmV0dXJuIHRoZSBwcmVmZXJyZWQgdGVybS5cbiAqL1xuZnVuY3Rpb24gX3NlbGVjdFRlcm0oXG4gIGFjdGl2ZUN0eCwgaXJpLCB2YWx1ZSwgY29udGFpbmVycywgdHlwZU9yTGFuZ3VhZ2UsIHR5cGVPckxhbmd1YWdlVmFsdWUpIHtcbiAgaWYodHlwZU9yTGFuZ3VhZ2VWYWx1ZSA9PT0gbnVsbCkge1xuICAgIHR5cGVPckxhbmd1YWdlVmFsdWUgPSAnQG51bGwnO1xuICB9XG5cbiAgLy8gcHJlZmVyZW5jZXMgZm9yIHRoZSB2YWx1ZSBvZiBAdHlwZSBvciBAbGFuZ3VhZ2VcbiAgdmFyIHByZWZzID0gW107XG5cbiAgLy8gZGV0ZXJtaW5lIHByZWZzIGZvciBAaWQgYmFzZWQgb24gd2hldGhlciBvciBub3QgdmFsdWUgY29tcGFjdHMgdG8gYSB0ZXJtXG4gIGlmKCh0eXBlT3JMYW5ndWFnZVZhbHVlID09PSAnQGlkJyB8fCB0eXBlT3JMYW5ndWFnZVZhbHVlID09PSAnQHJldmVyc2UnKSAmJlxuICAgIF9pc1N1YmplY3RSZWZlcmVuY2UodmFsdWUpKSB7XG4gICAgLy8gcHJlZmVyIEByZXZlcnNlIGZpcnN0XG4gICAgaWYodHlwZU9yTGFuZ3VhZ2VWYWx1ZSA9PT0gJ0ByZXZlcnNlJykge1xuICAgICAgcHJlZnMucHVzaCgnQHJldmVyc2UnKTtcbiAgICB9XG4gICAgLy8gdHJ5IHRvIGNvbXBhY3QgdmFsdWUgdG8gYSB0ZXJtXG4gICAgdmFyIHRlcm0gPSBfY29tcGFjdElyaShhY3RpdmVDdHgsIHZhbHVlWydAaWQnXSwgbnVsbCwge3ZvY2FiOiB0cnVlfSk7XG4gICAgaWYodGVybSBpbiBhY3RpdmVDdHgubWFwcGluZ3MgJiZcbiAgICAgIGFjdGl2ZUN0eC5tYXBwaW5nc1t0ZXJtXSAmJlxuICAgICAgYWN0aXZlQ3R4Lm1hcHBpbmdzW3Rlcm1dWydAaWQnXSA9PT0gdmFsdWVbJ0BpZCddKSB7XG4gICAgICAvLyBwcmVmZXIgQHZvY2FiXG4gICAgICBwcmVmcy5wdXNoLmFwcGx5KHByZWZzLCBbJ0B2b2NhYicsICdAaWQnXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHByZWZlciBAaWRcbiAgICAgIHByZWZzLnB1c2guYXBwbHkocHJlZnMsIFsnQGlkJywgJ0B2b2NhYiddKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcHJlZnMucHVzaCh0eXBlT3JMYW5ndWFnZVZhbHVlKTtcbiAgfVxuICBwcmVmcy5wdXNoKCdAbm9uZScpO1xuXG4gIHZhciBjb250YWluZXJNYXAgPSBhY3RpdmVDdHguaW52ZXJzZVtpcmldO1xuICBmb3IodmFyIGNpID0gMDsgY2kgPCBjb250YWluZXJzLmxlbmd0aDsgKytjaSkge1xuICAgIC8vIGlmIGNvbnRhaW5lciBub3QgYXZhaWxhYmxlIGluIHRoZSBtYXAsIGNvbnRpbnVlXG4gICAgdmFyIGNvbnRhaW5lciA9IGNvbnRhaW5lcnNbY2ldO1xuICAgIGlmKCEoY29udGFpbmVyIGluIGNvbnRhaW5lck1hcCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciB0eXBlT3JMYW5ndWFnZVZhbHVlTWFwID0gY29udGFpbmVyTWFwW2NvbnRhaW5lcl1bdHlwZU9yTGFuZ3VhZ2VdO1xuICAgIGZvcih2YXIgcGkgPSAwOyBwaSA8IHByZWZzLmxlbmd0aDsgKytwaSkge1xuICAgICAgLy8gaWYgdHlwZS9sYW5ndWFnZSBvcHRpb24gbm90IGF2YWlsYWJsZSBpbiB0aGUgbWFwLCBjb250aW51ZVxuICAgICAgdmFyIHByZWYgPSBwcmVmc1twaV07XG4gICAgICBpZighKHByZWYgaW4gdHlwZU9yTGFuZ3VhZ2VWYWx1ZU1hcCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIHNlbGVjdCB0ZXJtXG4gICAgICByZXR1cm4gdHlwZU9yTGFuZ3VhZ2VWYWx1ZU1hcFtwcmVmXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBDb21wYWN0cyBhbiBJUkkgb3Iga2V5d29yZCBpbnRvIGEgdGVybSBvciBwcmVmaXggaWYgaXQgY2FuIGJlLiBJZiB0aGVcbiAqIElSSSBoYXMgYW4gYXNzb2NpYXRlZCB2YWx1ZSBpdCBtYXkgYmUgcGFzc2VkLlxuICpcbiAqIEBwYXJhbSBhY3RpdmVDdHggdGhlIGFjdGl2ZSBjb250ZXh0IHRvIHVzZS5cbiAqIEBwYXJhbSBpcmkgdGhlIElSSSB0byBjb21wYWN0LlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBjaGVjayBvciBudWxsLlxuICogQHBhcmFtIHJlbGF0aXZlVG8gb3B0aW9ucyBmb3IgaG93IHRvIGNvbXBhY3QgSVJJczpcbiAqICAgICAgICAgIHZvY2FiOiB0cnVlIHRvIHNwbGl0IGFmdGVyIEB2b2NhYiwgZmFsc2Ugbm90IHRvLlxuICogQHBhcmFtIHJldmVyc2UgdHJ1ZSBpZiBhIHJldmVyc2UgcHJvcGVydHkgaXMgYmVpbmcgY29tcGFjdGVkLCBmYWxzZSBpZiBub3QuXG4gKlxuICogQHJldHVybiB0aGUgY29tcGFjdGVkIHRlcm0sIHByZWZpeCwga2V5d29yZCBhbGlhcywgb3IgdGhlIG9yaWdpbmFsIElSSS5cbiAqL1xuZnVuY3Rpb24gX2NvbXBhY3RJcmkoYWN0aXZlQ3R4LCBpcmksIHZhbHVlLCByZWxhdGl2ZVRvLCByZXZlcnNlKSB7XG4gIC8vIGNhbid0IGNvbXBhY3QgbnVsbFxuICBpZihpcmkgPT09IG51bGwpIHtcbiAgICByZXR1cm4gaXJpO1xuICB9XG5cbiAgLy8gZGVmYXVsdCB2YWx1ZSBhbmQgcGFyZW50IHRvIG51bGxcbiAgaWYoX2lzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgIHZhbHVlID0gbnVsbDtcbiAgfVxuICAvLyBkZWZhdWx0IHJldmVyc2UgdG8gZmFsc2VcbiAgaWYoX2lzVW5kZWZpbmVkKHJldmVyc2UpKSB7XG4gICAgcmV2ZXJzZSA9IGZhbHNlO1xuICB9XG4gIHJlbGF0aXZlVG8gPSByZWxhdGl2ZVRvIHx8IHt9O1xuXG4gIC8vIGlmIHRlcm0gaXMgYSBrZXl3b3JkLCBkZWZhdWx0IHZvY2FiIHRvIHRydWVcbiAgaWYoX2lzS2V5d29yZChpcmkpKSB7XG4gICAgcmVsYXRpdmVUby52b2NhYiA9IHRydWU7XG4gIH1cblxuICAvLyB1c2UgaW52ZXJzZSBjb250ZXh0IHRvIHBpY2sgYSB0ZXJtIGlmIGlyaSBpcyByZWxhdGl2ZSB0byB2b2NhYlxuICBpZihyZWxhdGl2ZVRvLnZvY2FiICYmIGlyaSBpbiBhY3RpdmVDdHguZ2V0SW52ZXJzZSgpKSB7XG4gICAgdmFyIGRlZmF1bHRMYW5ndWFnZSA9IGFjdGl2ZUN0eFsnQGxhbmd1YWdlJ10gfHwgJ0Bub25lJztcblxuICAgIC8vIHByZWZlciBAaW5kZXggaWYgYXZhaWxhYmxlIGluIHZhbHVlXG4gICAgdmFyIGNvbnRhaW5lcnMgPSBbXTtcbiAgICBpZihfaXNPYmplY3QodmFsdWUpICYmICdAaW5kZXgnIGluIHZhbHVlKSB7XG4gICAgICBjb250YWluZXJzLnB1c2goJ0BpbmRleCcpO1xuICAgIH1cblxuICAgIC8vIGRlZmF1bHRzIGZvciB0ZXJtIHNlbGVjdGlvbiBiYXNlZCBvbiB0eXBlL2xhbmd1YWdlXG4gICAgdmFyIHR5cGVPckxhbmd1YWdlID0gJ0BsYW5ndWFnZSc7XG4gICAgdmFyIHR5cGVPckxhbmd1YWdlVmFsdWUgPSAnQG51bGwnO1xuXG4gICAgaWYocmV2ZXJzZSkge1xuICAgICAgdHlwZU9yTGFuZ3VhZ2UgPSAnQHR5cGUnO1xuICAgICAgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSA9ICdAcmV2ZXJzZSc7XG4gICAgICBjb250YWluZXJzLnB1c2goJ0BzZXQnKTtcbiAgICB9IGVsc2UgaWYoX2lzTGlzdCh2YWx1ZSkpIHtcbiAgICAgIC8vIGNob29zZSB0aGUgbW9zdCBzcGVjaWZpYyB0ZXJtIHRoYXQgd29ya3MgZm9yIGFsbCBlbGVtZW50cyBpbiBAbGlzdFxuICAgICAgLy8gb25seSBzZWxlY3QgQGxpc3QgY29udGFpbmVycyBpZiBAaW5kZXggaXMgTk9UIGluIHZhbHVlXG4gICAgICBpZighKCdAaW5kZXgnIGluIHZhbHVlKSkge1xuICAgICAgICBjb250YWluZXJzLnB1c2goJ0BsaXN0Jyk7XG4gICAgICB9XG4gICAgICB2YXIgbGlzdCA9IHZhbHVlWydAbGlzdCddO1xuICAgICAgdmFyIGNvbW1vbkxhbmd1YWdlID0gKGxpc3QubGVuZ3RoID09PSAwKSA/IGRlZmF1bHRMYW5ndWFnZSA6IG51bGw7XG4gICAgICB2YXIgY29tbW9uVHlwZSA9IG51bGw7XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgIHZhciBpdGVtTGFuZ3VhZ2UgPSAnQG5vbmUnO1xuICAgICAgICB2YXIgaXRlbVR5cGUgPSAnQG5vbmUnO1xuICAgICAgICBpZihfaXNWYWx1ZShpdGVtKSkge1xuICAgICAgICAgIGlmKCdAbGFuZ3VhZ2UnIGluIGl0ZW0pIHtcbiAgICAgICAgICAgIGl0ZW1MYW5ndWFnZSA9IGl0ZW1bJ0BsYW5ndWFnZSddO1xuICAgICAgICAgIH0gZWxzZSBpZignQHR5cGUnIGluIGl0ZW0pIHtcbiAgICAgICAgICAgIGl0ZW1UeXBlID0gaXRlbVsnQHR5cGUnXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gcGxhaW4gbGl0ZXJhbFxuICAgICAgICAgICAgaXRlbUxhbmd1YWdlID0gJ0BudWxsJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVR5cGUgPSAnQGlkJztcbiAgICAgICAgfVxuICAgICAgICBpZihjb21tb25MYW5ndWFnZSA9PT0gbnVsbCkge1xuICAgICAgICAgIGNvbW1vbkxhbmd1YWdlID0gaXRlbUxhbmd1YWdlO1xuICAgICAgICB9IGVsc2UgaWYoaXRlbUxhbmd1YWdlICE9PSBjb21tb25MYW5ndWFnZSAmJiBfaXNWYWx1ZShpdGVtKSkge1xuICAgICAgICAgIGNvbW1vbkxhbmd1YWdlID0gJ0Bub25lJztcbiAgICAgICAgfVxuICAgICAgICBpZihjb21tb25UeXBlID09PSBudWxsKSB7XG4gICAgICAgICAgY29tbW9uVHlwZSA9IGl0ZW1UeXBlO1xuICAgICAgICB9IGVsc2UgaWYoaXRlbVR5cGUgIT09IGNvbW1vblR5cGUpIHtcbiAgICAgICAgICBjb21tb25UeXBlID0gJ0Bub25lJztcbiAgICAgICAgfVxuICAgICAgICAvLyB0aGVyZSBhcmUgZGlmZmVyZW50IGxhbmd1YWdlcyBhbmQgdHlwZXMgaW4gdGhlIGxpc3QsIHNvIGNob29zZVxuICAgICAgICAvLyB0aGUgbW9zdCBnZW5lcmljIHRlcm0sIG5vIG5lZWQgdG8ga2VlcCBpdGVyYXRpbmcgdGhlIGxpc3RcbiAgICAgICAgaWYoY29tbW9uTGFuZ3VhZ2UgPT09ICdAbm9uZScgJiYgY29tbW9uVHlwZSA9PT0gJ0Bub25lJykge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb21tb25MYW5ndWFnZSA9IGNvbW1vbkxhbmd1YWdlIHx8ICdAbm9uZSc7XG4gICAgICBjb21tb25UeXBlID0gY29tbW9uVHlwZSB8fCAnQG5vbmUnO1xuICAgICAgaWYoY29tbW9uVHlwZSAhPT0gJ0Bub25lJykge1xuICAgICAgICB0eXBlT3JMYW5ndWFnZSA9ICdAdHlwZSc7XG4gICAgICAgIHR5cGVPckxhbmd1YWdlVmFsdWUgPSBjb21tb25UeXBlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSA9IGNvbW1vbkxhbmd1YWdlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZihfaXNWYWx1ZSh2YWx1ZSkpIHtcbiAgICAgICAgaWYoJ0BsYW5ndWFnZScgaW4gdmFsdWUgJiYgISgnQGluZGV4JyBpbiB2YWx1ZSkpIHtcbiAgICAgICAgICBjb250YWluZXJzLnB1c2goJ0BsYW5ndWFnZScpO1xuICAgICAgICAgIHR5cGVPckxhbmd1YWdlVmFsdWUgPSB2YWx1ZVsnQGxhbmd1YWdlJ107XG4gICAgICAgIH0gZWxzZSBpZignQHR5cGUnIGluIHZhbHVlKSB7XG4gICAgICAgICAgdHlwZU9yTGFuZ3VhZ2UgPSAnQHR5cGUnO1xuICAgICAgICAgIHR5cGVPckxhbmd1YWdlVmFsdWUgPSB2YWx1ZVsnQHR5cGUnXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHlwZU9yTGFuZ3VhZ2UgPSAnQHR5cGUnO1xuICAgICAgICB0eXBlT3JMYW5ndWFnZVZhbHVlID0gJ0BpZCc7XG4gICAgICB9XG4gICAgICBjb250YWluZXJzLnB1c2goJ0BzZXQnKTtcbiAgICB9XG5cbiAgICAvLyBkbyB0ZXJtIHNlbGVjdGlvblxuICAgIGNvbnRhaW5lcnMucHVzaCgnQG5vbmUnKTtcbiAgICB2YXIgdGVybSA9IF9zZWxlY3RUZXJtKFxuICAgICAgYWN0aXZlQ3R4LCBpcmksIHZhbHVlLCBjb250YWluZXJzLCB0eXBlT3JMYW5ndWFnZSwgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSk7XG4gICAgaWYodGVybSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRlcm07XG4gICAgfVxuICB9XG5cbiAgLy8gbm8gdGVybSBtYXRjaCwgdXNlIEB2b2NhYiBpZiBhdmFpbGFibGVcbiAgaWYocmVsYXRpdmVUby52b2NhYikge1xuICAgIGlmKCdAdm9jYWInIGluIGFjdGl2ZUN0eCkge1xuICAgICAgLy8gZGV0ZXJtaW5lIGlmIHZvY2FiIGlzIGEgcHJlZml4IG9mIHRoZSBpcmlcbiAgICAgIHZhciB2b2NhYiA9IGFjdGl2ZUN0eFsnQHZvY2FiJ107XG4gICAgICBpZihpcmkuaW5kZXhPZih2b2NhYikgPT09IDAgJiYgaXJpICE9PSB2b2NhYikge1xuICAgICAgICAvLyB1c2Ugc3VmZml4IGFzIHJlbGF0aXZlIGlyaSBpZiBpdCBpcyBub3QgYSB0ZXJtIGluIHRoZSBhY3RpdmUgY29udGV4dFxuICAgICAgICB2YXIgc3VmZml4ID0gaXJpLnN1YnN0cih2b2NhYi5sZW5ndGgpO1xuICAgICAgICBpZighKHN1ZmZpeCBpbiBhY3RpdmVDdHgubWFwcGluZ3MpKSB7XG4gICAgICAgICAgcmV0dXJuIHN1ZmZpeDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIG5vIHRlcm0gb3IgQHZvY2FiIG1hdGNoLCBjaGVjayBmb3IgcG9zc2libGUgQ1VSSUVzXG4gIHZhciBjaG9pY2UgPSBudWxsO1xuICBmb3IodmFyIHRlcm0gaW4gYWN0aXZlQ3R4Lm1hcHBpbmdzKSB7XG4gICAgLy8gc2tpcCB0ZXJtcyB3aXRoIGNvbG9ucywgdGhleSBjYW4ndCBiZSBwcmVmaXhlc1xuICAgIGlmKHRlcm0uaW5kZXhPZignOicpICE9PSAtMSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIC8vIHNraXAgZW50cmllcyB3aXRoIEBpZHMgdGhhdCBhcmUgbm90IHBhcnRpYWwgbWF0Y2hlc1xuICAgIHZhciBkZWZpbml0aW9uID0gYWN0aXZlQ3R4Lm1hcHBpbmdzW3Rlcm1dO1xuICAgIGlmKCFkZWZpbml0aW9uIHx8XG4gICAgICBkZWZpbml0aW9uWydAaWQnXSA9PT0gaXJpIHx8IGlyaS5pbmRleE9mKGRlZmluaXRpb25bJ0BpZCddKSAhPT0gMCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gYSBDVVJJRSBpcyB1c2FibGUgaWY6XG4gICAgLy8gMS4gaXQgaGFzIG5vIG1hcHBpbmcsIE9SXG4gICAgLy8gMi4gdmFsdWUgaXMgbnVsbCwgd2hpY2ggbWVhbnMgd2UncmUgbm90IGNvbXBhY3RpbmcgYW4gQHZhbHVlLCBBTkRcbiAgICAvLyAgIHRoZSBtYXBwaW5nIG1hdGNoZXMgdGhlIElSSSlcbiAgICB2YXIgY3VyaWUgPSB0ZXJtICsgJzonICsgaXJpLnN1YnN0cihkZWZpbml0aW9uWydAaWQnXS5sZW5ndGgpO1xuICAgIHZhciBpc1VzYWJsZUN1cmllID0gKCEoY3VyaWUgaW4gYWN0aXZlQ3R4Lm1hcHBpbmdzKSB8fFxuICAgICAgKHZhbHVlID09PSBudWxsICYmIGFjdGl2ZUN0eC5tYXBwaW5nc1tjdXJpZV0gJiZcbiAgICAgIGFjdGl2ZUN0eC5tYXBwaW5nc1tjdXJpZV1bJ0BpZCddID09PSBpcmkpKTtcblxuICAgIC8vIHNlbGVjdCBjdXJpZSBpZiBpdCBpcyBzaG9ydGVyIG9yIHRoZSBzYW1lIGxlbmd0aCBidXQgbGV4aWNvZ3JhcGhpY2FsbHlcbiAgICAvLyBsZXNzIHRoYW4gdGhlIGN1cnJlbnQgY2hvaWNlXG4gICAgaWYoaXNVc2FibGVDdXJpZSAmJiAoY2hvaWNlID09PSBudWxsIHx8XG4gICAgICBfY29tcGFyZVNob3J0ZXN0TGVhc3QoY3VyaWUsIGNob2ljZSkgPCAwKSkge1xuICAgICAgY2hvaWNlID0gY3VyaWU7XG4gICAgfVxuICB9XG5cbiAgLy8gcmV0dXJuIGNob3NlbiBjdXJpZVxuICBpZihjaG9pY2UgIT09IG51bGwpIHtcbiAgICByZXR1cm4gY2hvaWNlO1xuICB9XG5cbiAgLy8gY29tcGFjdCBJUkkgcmVsYXRpdmUgdG8gYmFzZVxuICBpZighcmVsYXRpdmVUby52b2NhYikge1xuICAgIHJldHVybiBfcmVtb3ZlQmFzZShhY3RpdmVDdHhbJ0BiYXNlJ10sIGlyaSk7XG4gIH1cblxuICAvLyByZXR1cm4gSVJJIGFzIGlzXG4gIHJldHVybiBpcmk7XG59XG5cbi8qKlxuICogUGVyZm9ybXMgdmFsdWUgY29tcGFjdGlvbiBvbiBhbiBvYmplY3Qgd2l0aCAnQHZhbHVlJyBvciAnQGlkJyBhcyB0aGUgb25seVxuICogcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIGFjdGl2ZUN0eCB0aGUgYWN0aXZlIGNvbnRleHQuXG4gKiBAcGFyYW0gYWN0aXZlUHJvcGVydHkgdGhlIGFjdGl2ZSBwcm9wZXJ0eSB0aGF0IHBvaW50cyB0byB0aGUgdmFsdWUuXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGNvbXBhY3QuXG4gKlxuICogQHJldHVybiB0aGUgY29tcGFjdGlvbiByZXN1bHQuXG4gKi9cbmZ1bmN0aW9uIF9jb21wYWN0VmFsdWUoYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgdmFsdWUpIHtcbiAgLy8gdmFsdWUgaXMgYSBAdmFsdWVcbiAgaWYoX2lzVmFsdWUodmFsdWUpKSB7XG4gICAgLy8gZ2V0IGNvbnRleHQgcnVsZXNcbiAgICB2YXIgdHlwZSA9IGpzb25sZC5nZXRDb250ZXh0VmFsdWUoYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgJ0B0eXBlJyk7XG4gICAgdmFyIGxhbmd1YWdlID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShcbiAgICAgIGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksICdAbGFuZ3VhZ2UnKTtcbiAgICB2YXIgY29udGFpbmVyID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShcbiAgICAgIGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksICdAY29udGFpbmVyJyk7XG5cbiAgICAvLyB3aGV0aGVyIG9yIG5vdCB0aGUgdmFsdWUgaGFzIGFuIEBpbmRleCB0aGF0IG11c3QgYmUgcHJlc2VydmVkXG4gICAgdmFyIHByZXNlcnZlSW5kZXggPSAoKCdAaW5kZXgnIGluIHZhbHVlKSAmJlxuICAgICAgY29udGFpbmVyICE9PSAnQGluZGV4Jyk7XG5cbiAgICAvLyBpZiB0aGVyZSdzIG5vIEBpbmRleCB0byBwcmVzZXJ2ZSAuLi5cbiAgICBpZighcHJlc2VydmVJbmRleCkge1xuICAgICAgLy8gbWF0Y2hpbmcgQHR5cGUgb3IgQGxhbmd1YWdlIHNwZWNpZmllZCBpbiBjb250ZXh0LCBjb21wYWN0IHZhbHVlXG4gICAgICBpZih2YWx1ZVsnQHR5cGUnXSA9PT0gdHlwZSB8fCB2YWx1ZVsnQGxhbmd1YWdlJ10gPT09IGxhbmd1YWdlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVsnQHZhbHVlJ107XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmV0dXJuIGp1c3QgdGhlIHZhbHVlIG9mIEB2YWx1ZSBpZiBhbGwgYXJlIHRydWU6XG4gICAgLy8gMS4gQHZhbHVlIGlzIHRoZSBvbmx5IGtleSBvciBAaW5kZXggaXNuJ3QgYmVpbmcgcHJlc2VydmVkXG4gICAgLy8gMi4gdGhlcmUgaXMgbm8gZGVmYXVsdCBsYW5ndWFnZSBvciBAdmFsdWUgaXMgbm90IGEgc3RyaW5nIG9yXG4gICAgLy8gICB0aGUga2V5IGhhcyBhIG1hcHBpbmcgd2l0aCBhIG51bGwgQGxhbmd1YWdlXG4gICAgdmFyIGtleUNvdW50ID0gT2JqZWN0LmtleXModmFsdWUpLmxlbmd0aDtcbiAgICB2YXIgaXNWYWx1ZU9ubHlLZXkgPSAoa2V5Q291bnQgPT09IDEgfHxcbiAgICAgIChrZXlDb3VudCA9PT0gMiAmJiAoJ0BpbmRleCcgaW4gdmFsdWUpICYmICFwcmVzZXJ2ZUluZGV4KSk7XG4gICAgdmFyIGhhc0RlZmF1bHRMYW5ndWFnZSA9ICgnQGxhbmd1YWdlJyBpbiBhY3RpdmVDdHgpO1xuICAgIHZhciBpc1ZhbHVlU3RyaW5nID0gX2lzU3RyaW5nKHZhbHVlWydAdmFsdWUnXSk7XG4gICAgdmFyIGhhc051bGxNYXBwaW5nID0gKGFjdGl2ZUN0eC5tYXBwaW5nc1thY3RpdmVQcm9wZXJ0eV0gJiZcbiAgICAgIGFjdGl2ZUN0eC5tYXBwaW5nc1thY3RpdmVQcm9wZXJ0eV1bJ0BsYW5ndWFnZSddID09PSBudWxsKTtcbiAgICBpZihpc1ZhbHVlT25seUtleSAmJlxuICAgICAgKCFoYXNEZWZhdWx0TGFuZ3VhZ2UgfHwgIWlzVmFsdWVTdHJpbmcgfHwgaGFzTnVsbE1hcHBpbmcpKSB7XG4gICAgICByZXR1cm4gdmFsdWVbJ0B2YWx1ZSddO1xuICAgIH1cblxuICAgIHZhciBydmFsID0ge307XG5cbiAgICAvLyBwcmVzZXJ2ZSBAaW5kZXhcbiAgICBpZihwcmVzZXJ2ZUluZGV4KSB7XG4gICAgICBydmFsW19jb21wYWN0SXJpKGFjdGl2ZUN0eCwgJ0BpbmRleCcpXSA9IHZhbHVlWydAaW5kZXgnXTtcbiAgICB9XG5cbiAgICBpZignQHR5cGUnIGluIHZhbHVlKSB7XG4gICAgICAvLyBjb21wYWN0IEB0eXBlIElSSVxuICAgICAgcnZhbFtfY29tcGFjdElyaShhY3RpdmVDdHgsICdAdHlwZScpXSA9IF9jb21wYWN0SXJpKFxuICAgICAgICBhY3RpdmVDdHgsIHZhbHVlWydAdHlwZSddLCBudWxsLCB7dm9jYWI6IHRydWV9KTtcbiAgICB9IGVsc2UgaWYoJ0BsYW5ndWFnZScgaW4gdmFsdWUpIHtcbiAgICAgIC8vIGFsaWFzIEBsYW5ndWFnZVxuICAgICAgcnZhbFtfY29tcGFjdElyaShhY3RpdmVDdHgsICdAbGFuZ3VhZ2UnKV0gPSB2YWx1ZVsnQGxhbmd1YWdlJ107XG4gICAgfVxuXG4gICAgLy8gYWxpYXMgQHZhbHVlXG4gICAgcnZhbFtfY29tcGFjdElyaShhY3RpdmVDdHgsICdAdmFsdWUnKV0gPSB2YWx1ZVsnQHZhbHVlJ107XG5cbiAgICByZXR1cm4gcnZhbDtcbiAgfVxuXG4gIC8vIHZhbHVlIGlzIGEgc3ViamVjdCByZWZlcmVuY2VcbiAgdmFyIGV4cGFuZGVkUHJvcGVydHkgPSBfZXhwYW5kSXJpKGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksIHt2b2NhYjogdHJ1ZX0pO1xuICB2YXIgdHlwZSA9IGpzb25sZC5nZXRDb250ZXh0VmFsdWUoYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgJ0B0eXBlJyk7XG4gIHZhciBjb21wYWN0ZWQgPSBfY29tcGFjdElyaShcbiAgICBhY3RpdmVDdHgsIHZhbHVlWydAaWQnXSwgbnVsbCwge3ZvY2FiOiB0eXBlID09PSAnQHZvY2FiJ30pO1xuXG4gIC8vIGNvbXBhY3QgdG8gc2NhbGFyXG4gIGlmKHR5cGUgPT09ICdAaWQnIHx8IHR5cGUgPT09ICdAdm9jYWInIHx8IGV4cGFuZGVkUHJvcGVydHkgPT09ICdAZ3JhcGgnKSB7XG4gICAgcmV0dXJuIGNvbXBhY3RlZDtcbiAgfVxuXG4gIHZhciBydmFsID0ge307XG4gIHJ2YWxbX2NvbXBhY3RJcmkoYWN0aXZlQ3R4LCAnQGlkJyldID0gY29tcGFjdGVkO1xuICByZXR1cm4gcnZhbDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgdGVybSBkZWZpbml0aW9uIGR1cmluZyBjb250ZXh0IHByb2Nlc3NpbmcuXG4gKlxuICogQHBhcmFtIGFjdGl2ZUN0eCB0aGUgY3VycmVudCBhY3RpdmUgY29udGV4dC5cbiAqIEBwYXJhbSBsb2NhbEN0eCB0aGUgbG9jYWwgY29udGV4dCBiZWluZyBwcm9jZXNzZWQuXG4gKiBAcGFyYW0gdGVybSB0aGUgdGVybSBpbiB0aGUgbG9jYWwgY29udGV4dCB0byBkZWZpbmUgdGhlIG1hcHBpbmcgZm9yLlxuICogQHBhcmFtIGRlZmluZWQgYSBtYXAgb2YgZGVmaW5pbmcvZGVmaW5lZCBrZXlzIHRvIGRldGVjdCBjeWNsZXMgYW5kIHByZXZlbnRcbiAqICAgICAgICAgIGRvdWJsZSBkZWZpbml0aW9ucy5cbiAqL1xuZnVuY3Rpb24gX2NyZWF0ZVRlcm1EZWZpbml0aW9uKGFjdGl2ZUN0eCwgbG9jYWxDdHgsIHRlcm0sIGRlZmluZWQpIHtcbiAgaWYodGVybSBpbiBkZWZpbmVkKSB7XG4gICAgLy8gdGVybSBhbHJlYWR5IGRlZmluZWRcbiAgICBpZihkZWZpbmVkW3Rlcm1dKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIGN5Y2xlIGRldGVjdGVkXG4gICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgJ0N5Y2xpY2FsIGNvbnRleHQgZGVmaW5pdGlvbiBkZXRlY3RlZC4nLFxuICAgICAgJ2pzb25sZC5DeWNsaWNhbENvbnRleHQnLFxuICAgICAge2NvZGU6ICdjeWNsaWMgSVJJIG1hcHBpbmcnLCBjb250ZXh0OiBsb2NhbEN0eCwgdGVybTogdGVybX0pO1xuICB9XG5cbiAgLy8gbm93IGRlZmluaW5nIHRlcm1cbiAgZGVmaW5lZFt0ZXJtXSA9IGZhbHNlO1xuXG4gIGlmKF9pc0tleXdvcmQodGVybSkpIHtcbiAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsga2V5d29yZHMgY2Fubm90IGJlIG92ZXJyaWRkZW4uJyxcbiAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAge2NvZGU6ICdrZXl3b3JkIHJlZGVmaW5pdGlvbicsIGNvbnRleHQ6IGxvY2FsQ3R4LCB0ZXJtOiB0ZXJtfSk7XG4gIH1cblxuICBpZih0ZXJtID09PSAnJykge1xuICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhIHRlcm0gY2Fubm90IGJlIGFuIGVtcHR5IHN0cmluZy4nLFxuICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICB7Y29kZTogJ2ludmFsaWQgdGVybSBkZWZpbml0aW9uJywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgfVxuXG4gIC8vIHJlbW92ZSBvbGQgbWFwcGluZ1xuICBpZihhY3RpdmVDdHgubWFwcGluZ3NbdGVybV0pIHtcbiAgICBkZWxldGUgYWN0aXZlQ3R4Lm1hcHBpbmdzW3Rlcm1dO1xuICB9XG5cbiAgLy8gZ2V0IGNvbnRleHQgdGVybSB2YWx1ZVxuICB2YXIgdmFsdWUgPSBsb2NhbEN0eFt0ZXJtXTtcblxuICAvLyBjbGVhciBjb250ZXh0IGVudHJ5XG4gIGlmKHZhbHVlID09PSBudWxsIHx8IChfaXNPYmplY3QodmFsdWUpICYmIHZhbHVlWydAaWQnXSA9PT0gbnVsbCkpIHtcbiAgICBhY3RpdmVDdHgubWFwcGluZ3NbdGVybV0gPSBudWxsO1xuICAgIGRlZmluZWRbdGVybV0gPSB0cnVlO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGNvbnZlcnQgc2hvcnQtaGFuZCB2YWx1ZSB0byBvYmplY3Qgdy9AaWRcbiAgaWYoX2lzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhbHVlID0geydAaWQnOiB2YWx1ZX07XG4gIH1cblxuICBpZighX2lzT2JqZWN0KHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBAY29udGV4dCBwcm9wZXJ0eSB2YWx1ZXMgbXVzdCBiZSAnICtcbiAgICAgICdzdHJpbmdzIG9yIG9iamVjdHMuJyxcbiAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAge2NvZGU6ICdpbnZhbGlkIHRlcm0gZGVmaW5pdGlvbicsIGNvbnRleHQ6IGxvY2FsQ3R4fSk7XG4gIH1cblxuICAvLyBjcmVhdGUgbmV3IG1hcHBpbmdcbiAgdmFyIG1hcHBpbmcgPSBhY3RpdmVDdHgubWFwcGluZ3NbdGVybV0gPSB7fTtcbiAgbWFwcGluZy5yZXZlcnNlID0gZmFsc2U7XG5cbiAgaWYoJ0ByZXZlcnNlJyBpbiB2YWx1ZSkge1xuICAgIGlmKCdAaWQnIGluIHZhbHVlKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhIEByZXZlcnNlIHRlcm0gZGVmaW5pdGlvbiBtdXN0IG5vdCAnICtcbiAgICAgICAgJ2NvbnRhaW4gQGlkLicsICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICB7Y29kZTogJ2ludmFsaWQgcmV2ZXJzZSBwcm9wZXJ0eScsIGNvbnRleHQ6IGxvY2FsQ3R4fSk7XG4gICAgfVxuICAgIHZhciByZXZlcnNlID0gdmFsdWVbJ0ByZXZlcnNlJ107XG4gICAgaWYoIV9pc1N0cmluZyhyZXZlcnNlKSkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgYSBAY29udGV4dCBAcmV2ZXJzZSB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nLicsXG4gICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgSVJJIG1hcHBpbmcnLCBjb250ZXh0OiBsb2NhbEN0eH0pO1xuICAgIH1cblxuICAgIC8vIGV4cGFuZCBhbmQgYWRkIEBpZCBtYXBwaW5nXG4gICAgdmFyIGlkID0gX2V4cGFuZElyaShcbiAgICAgIGFjdGl2ZUN0eCwgcmV2ZXJzZSwge3ZvY2FiOiB0cnVlLCBiYXNlOiBmYWxzZX0sIGxvY2FsQ3R4LCBkZWZpbmVkKTtcbiAgICBpZighX2lzQWJzb2x1dGVJcmkoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhIEBjb250ZXh0IEByZXZlcnNlIHZhbHVlIG11c3QgYmUgYW4gJyArXG4gICAgICAgICdhYnNvbHV0ZSBJUkkgb3IgYSBibGFuayBub2RlIGlkZW50aWZpZXIuJyxcbiAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCBJUkkgbWFwcGluZycsIGNvbnRleHQ6IGxvY2FsQ3R4fSk7XG4gICAgfVxuICAgIG1hcHBpbmdbJ0BpZCddID0gaWQ7XG4gICAgbWFwcGluZy5yZXZlcnNlID0gdHJ1ZTtcbiAgfSBlbHNlIGlmKCdAaWQnIGluIHZhbHVlKSB7XG4gICAgdmFyIGlkID0gdmFsdWVbJ0BpZCddO1xuICAgIGlmKCFfaXNTdHJpbmcoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhIEBjb250ZXh0IEBpZCB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5ICcgK1xuICAgICAgICAnb2Ygc3RyaW5ncyBvciBhIHN0cmluZy4nLFxuICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdpbnZhbGlkIElSSSBtYXBwaW5nJywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgICB9XG4gICAgaWYoaWQgIT09IHRlcm0pIHtcbiAgICAgIC8vIGV4cGFuZCBhbmQgYWRkIEBpZCBtYXBwaW5nXG4gICAgICBpZCA9IF9leHBhbmRJcmkoXG4gICAgICAgIGFjdGl2ZUN0eCwgaWQsIHt2b2NhYjogdHJ1ZSwgYmFzZTogZmFsc2V9LCBsb2NhbEN0eCwgZGVmaW5lZCk7XG4gICAgICBpZighX2lzQWJzb2x1dGVJcmkoaWQpICYmICFfaXNLZXl3b3JkKGlkKSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGEgQGNvbnRleHQgQGlkIHZhbHVlIG11c3QgYmUgYW4gJyArXG4gICAgICAgICAgJ2Fic29sdXRlIElSSSwgYSBibGFuayBub2RlIGlkZW50aWZpZXIsIG9yIGEga2V5d29yZC4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCBJUkkgbWFwcGluZycsIGNvbnRleHQ6IGxvY2FsQ3R4fSk7XG4gICAgICB9XG4gICAgICBtYXBwaW5nWydAaWQnXSA9IGlkO1xuICAgIH1cbiAgfVxuXG4gIGlmKCEoJ0BpZCcgaW4gbWFwcGluZykpIHtcbiAgICAvLyBzZWUgaWYgdGhlIHRlcm0gaGFzIGEgcHJlZml4XG4gICAgdmFyIGNvbG9uID0gdGVybS5pbmRleE9mKCc6Jyk7XG4gICAgaWYoY29sb24gIT09IC0xKSB7XG4gICAgICB2YXIgcHJlZml4ID0gdGVybS5zdWJzdHIoMCwgY29sb24pO1xuICAgICAgaWYocHJlZml4IGluIGxvY2FsQ3R4KSB7XG4gICAgICAgIC8vIGRlZmluZSBwYXJlbnQgcHJlZml4XG4gICAgICAgIF9jcmVhdGVUZXJtRGVmaW5pdGlvbihhY3RpdmVDdHgsIGxvY2FsQ3R4LCBwcmVmaXgsIGRlZmluZWQpO1xuICAgICAgfVxuXG4gICAgICBpZihhY3RpdmVDdHgubWFwcGluZ3NbcHJlZml4XSkge1xuICAgICAgICAvLyBzZXQgQGlkIGJhc2VkIG9uIHByZWZpeCBwYXJlbnRcbiAgICAgICAgdmFyIHN1ZmZpeCA9IHRlcm0uc3Vic3RyKGNvbG9uICsgMSk7XG4gICAgICAgIG1hcHBpbmdbJ0BpZCddID0gYWN0aXZlQ3R4Lm1hcHBpbmdzW3ByZWZpeF1bJ0BpZCddICsgc3VmZml4O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdGVybSBpcyBhbiBhYnNvbHV0ZSBJUklcbiAgICAgICAgbWFwcGluZ1snQGlkJ10gPSB0ZXJtO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBub24tSVJJcyAqbXVzdCogZGVmaW5lIEBpZHMgaWYgQHZvY2FiIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgIGlmKCEoJ0B2b2NhYicgaW4gYWN0aXZlQ3R4KSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IEBjb250ZXh0IHRlcm1zIG11c3QgZGVmaW5lIGFuIEBpZC4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCBJUkkgbWFwcGluZycsIGNvbnRleHQ6IGxvY2FsQ3R4LCB0ZXJtOiB0ZXJtfSk7XG4gICAgICB9XG4gICAgICAvLyBwcmVwZW5kIHZvY2FiIHRvIHRlcm1cbiAgICAgIG1hcHBpbmdbJ0BpZCddID0gYWN0aXZlQ3R4WydAdm9jYWInXSArIHRlcm07XG4gICAgfVxuICB9XG5cbiAgLy8gSVJJIG1hcHBpbmcgbm93IGRlZmluZWRcbiAgZGVmaW5lZFt0ZXJtXSA9IHRydWU7XG5cbiAgaWYoJ0B0eXBlJyBpbiB2YWx1ZSkge1xuICAgIHZhciB0eXBlID0gdmFsdWVbJ0B0eXBlJ107XG4gICAgaWYoIV9pc1N0cmluZyh0eXBlKSkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgYW4gQGNvbnRleHQgQHR5cGUgdmFsdWVzIG11c3QgYmUgYSBzdHJpbmcuJyxcbiAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgIHtjb2RlOiAnaW52YWxpZCB0eXBlIG1hcHBpbmcnLCBjb250ZXh0OiBsb2NhbEN0eH0pO1xuICAgIH1cblxuICAgIGlmKHR5cGUgIT09ICdAaWQnICYmIHR5cGUgIT09ICdAdm9jYWInKSB7XG4gICAgICAvLyBleHBhbmQgQHR5cGUgdG8gZnVsbCBJUklcbiAgICAgIHR5cGUgPSBfZXhwYW5kSXJpKFxuICAgICAgICBhY3RpdmVDdHgsIHR5cGUsIHt2b2NhYjogdHJ1ZSwgYmFzZTogZmFsc2V9LCBsb2NhbEN0eCwgZGVmaW5lZCk7XG4gICAgICBpZighX2lzQWJzb2x1dGVJcmkodHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhbiBAY29udGV4dCBAdHlwZSB2YWx1ZSBtdXN0IGJlIGFuICcgK1xuICAgICAgICAgICdhYnNvbHV0ZSBJUkkuJyxcbiAgICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAgICB7Y29kZTogJ2ludmFsaWQgdHlwZSBtYXBwaW5nJywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGUuaW5kZXhPZignXzonKSA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGFuIEBjb250ZXh0IEB0eXBlIHZhbHVlcyBtdXN0IGJlIGFuIElSSSwgJyArXG4gICAgICAgICAgJ25vdCBhIGJsYW5rIG5vZGUgaWRlbnRpZmllci4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCB0eXBlIG1hcHBpbmcnLCBjb250ZXh0OiBsb2NhbEN0eH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGFkZCBAdHlwZSB0byBtYXBwaW5nXG4gICAgbWFwcGluZ1snQHR5cGUnXSA9IHR5cGU7XG4gIH1cblxuICBpZignQGNvbnRhaW5lcicgaW4gdmFsdWUpIHtcbiAgICB2YXIgY29udGFpbmVyID0gdmFsdWVbJ0Bjb250YWluZXInXTtcbiAgICBpZihjb250YWluZXIgIT09ICdAbGlzdCcgJiYgY29udGFpbmVyICE9PSAnQHNldCcgJiZcbiAgICAgIGNvbnRhaW5lciAhPT0gJ0BpbmRleCcgJiYgY29udGFpbmVyICE9PSAnQGxhbmd1YWdlJykge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgQGNvbnRleHQgQGNvbnRhaW5lciB2YWx1ZSBtdXN0IGJlICcgK1xuICAgICAgICAnb25lIG9mIHRoZSBmb2xsb3dpbmc6IEBsaXN0LCBAc2V0LCBAaW5kZXgsIG9yIEBsYW5ndWFnZS4nLFxuICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAge2NvZGU6ICdpbnZhbGlkIGNvbnRhaW5lciBtYXBwaW5nJywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgICB9XG4gICAgaWYobWFwcGluZy5yZXZlcnNlICYmIGNvbnRhaW5lciAhPT0gJ0BpbmRleCcgJiYgY29udGFpbmVyICE9PSAnQHNldCcgJiZcbiAgICAgIGNvbnRhaW5lciAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgQGNvbnRleHQgQGNvbnRhaW5lciB2YWx1ZSBmb3IgYSBAcmV2ZXJzZSAnICtcbiAgICAgICAgJ3R5cGUgZGVmaW5pdGlvbiBtdXN0IGJlIEBpbmRleCBvciBAc2V0LicsICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICB7Y29kZTogJ2ludmFsaWQgcmV2ZXJzZSBwcm9wZXJ0eScsIGNvbnRleHQ6IGxvY2FsQ3R4fSk7XG4gICAgfVxuXG4gICAgLy8gYWRkIEBjb250YWluZXIgdG8gbWFwcGluZ1xuICAgIG1hcHBpbmdbJ0Bjb250YWluZXInXSA9IGNvbnRhaW5lcjtcbiAgfVxuXG4gIGlmKCdAbGFuZ3VhZ2UnIGluIHZhbHVlICYmICEoJ0B0eXBlJyBpbiB2YWx1ZSkpIHtcbiAgICB2YXIgbGFuZ3VhZ2UgPSB2YWx1ZVsnQGxhbmd1YWdlJ107XG4gICAgaWYobGFuZ3VhZ2UgIT09IG51bGwgJiYgIV9pc1N0cmluZyhsYW5ndWFnZSkpIHtcbiAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IEBjb250ZXh0IEBsYW5ndWFnZSB2YWx1ZSBtdXN0IGJlICcgK1xuICAgICAgICAnYSBzdHJpbmcgb3IgbnVsbC4nLCAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAge2NvZGU6ICdpbnZhbGlkIGxhbmd1YWdlIG1hcHBpbmcnLCBjb250ZXh0OiBsb2NhbEN0eH0pO1xuICAgIH1cblxuICAgIC8vIGFkZCBAbGFuZ3VhZ2UgdG8gbWFwcGluZ1xuICAgIGlmKGxhbmd1YWdlICE9PSBudWxsKSB7XG4gICAgICBsYW5ndWFnZSA9IGxhbmd1YWdlLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIG1hcHBpbmdbJ0BsYW5ndWFnZSddID0gbGFuZ3VhZ2U7XG4gIH1cblxuICAvLyBkaXNhbGxvdyBhbGlhc2luZyBAY29udGV4dCBhbmQgQHByZXNlcnZlXG4gIHZhciBpZCA9IG1hcHBpbmdbJ0BpZCddO1xuICBpZihpZCA9PT0gJ0Bjb250ZXh0JyB8fCBpZCA9PT0gJ0BwcmVzZXJ2ZScpIHtcbiAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgQGNvbnRleHQgYW5kIEBwcmVzZXJ2ZSBjYW5ub3QgYmUgYWxpYXNlZC4nLFxuICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCBrZXl3b3JkIGFsaWFzJywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgfVxufVxuXG4vKipcbiAqIEV4cGFuZHMgYSBzdHJpbmcgdG8gYSBmdWxsIElSSS4gVGhlIHN0cmluZyBtYXkgYmUgYSB0ZXJtLCBhIHByZWZpeCwgYVxuICogcmVsYXRpdmUgSVJJLCBvciBhbiBhYnNvbHV0ZSBJUkkuIFRoZSBhc3NvY2lhdGVkIGFic29sdXRlIElSSSB3aWxsIGJlXG4gKiByZXR1cm5lZC5cbiAqXG4gKiBAcGFyYW0gYWN0aXZlQ3R4IHRoZSBjdXJyZW50IGFjdGl2ZSBjb250ZXh0LlxuICogQHBhcmFtIHZhbHVlIHRoZSBzdHJpbmcgdG8gZXhwYW5kLlxuICogQHBhcmFtIHJlbGF0aXZlVG8gb3B0aW9ucyBmb3IgaG93IHRvIHJlc29sdmUgcmVsYXRpdmUgSVJJczpcbiAqICAgICAgICAgIGJhc2U6IHRydWUgdG8gcmVzb2x2ZSBhZ2FpbnN0IHRoZSBiYXNlIElSSSwgZmFsc2Ugbm90IHRvLlxuICogICAgICAgICAgdm9jYWI6IHRydWUgdG8gY29uY2F0ZW5hdGUgYWZ0ZXIgQHZvY2FiLCBmYWxzZSBub3QgdG8uXG4gKiBAcGFyYW0gbG9jYWxDdHggdGhlIGxvY2FsIGNvbnRleHQgYmVpbmcgcHJvY2Vzc2VkIChvbmx5IGdpdmVuIGlmIGNhbGxlZFxuICogICAgICAgICAgZHVyaW5nIGNvbnRleHQgcHJvY2Vzc2luZykuXG4gKiBAcGFyYW0gZGVmaW5lZCBhIG1hcCBmb3IgdHJhY2tpbmcgY3ljbGVzIGluIGNvbnRleHQgZGVmaW5pdGlvbnMgKG9ubHkgZ2l2ZW5cbiAqICAgICAgICAgIGlmIGNhbGxlZCBkdXJpbmcgY29udGV4dCBwcm9jZXNzaW5nKS5cbiAqXG4gKiBAcmV0dXJuIHRoZSBleHBhbmRlZCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gX2V4cGFuZElyaShhY3RpdmVDdHgsIHZhbHVlLCByZWxhdGl2ZVRvLCBsb2NhbEN0eCwgZGVmaW5lZCkge1xuICAvLyBhbHJlYWR5IGV4cGFuZGVkXG4gIGlmKHZhbHVlID09PSBudWxsIHx8IF9pc0tleXdvcmQodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLy8gZGVmaW5lIHRlcm0gZGVwZW5kZW5jeSBpZiBub3QgZGVmaW5lZFxuICBpZihsb2NhbEN0eCAmJiB2YWx1ZSBpbiBsb2NhbEN0eCAmJiBkZWZpbmVkW3ZhbHVlXSAhPT0gdHJ1ZSkge1xuICAgIF9jcmVhdGVUZXJtRGVmaW5pdGlvbihhY3RpdmVDdHgsIGxvY2FsQ3R4LCB2YWx1ZSwgZGVmaW5lZCk7XG4gIH1cblxuICByZWxhdGl2ZVRvID0gcmVsYXRpdmVUbyB8fCB7fTtcbiAgaWYocmVsYXRpdmVUby52b2NhYikge1xuICAgIHZhciBtYXBwaW5nID0gYWN0aXZlQ3R4Lm1hcHBpbmdzW3ZhbHVlXTtcblxuICAgIC8vIHZhbHVlIGlzIGV4cGxpY2l0bHkgaWdub3JlZCB3aXRoIGEgbnVsbCBtYXBwaW5nXG4gICAgaWYobWFwcGluZyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYobWFwcGluZykge1xuICAgICAgLy8gdmFsdWUgaXMgYSB0ZXJtXG4gICAgICByZXR1cm4gbWFwcGluZ1snQGlkJ107XG4gICAgfVxuICB9XG5cbiAgLy8gc3BsaXQgdmFsdWUgaW50byBwcmVmaXg6c3VmZml4XG4gIHZhciBjb2xvbiA9IHZhbHVlLmluZGV4T2YoJzonKTtcbiAgaWYoY29sb24gIT09IC0xKSB7XG4gICAgdmFyIHByZWZpeCA9IHZhbHVlLnN1YnN0cigwLCBjb2xvbik7XG4gICAgdmFyIHN1ZmZpeCA9IHZhbHVlLnN1YnN0cihjb2xvbiArIDEpO1xuXG4gICAgLy8gZG8gbm90IGV4cGFuZCBibGFuayBub2RlcyAocHJlZml4IG9mICdfJykgb3IgYWxyZWFkeS1hYnNvbHV0ZVxuICAgIC8vIElSSXMgKHN1ZmZpeCBvZiAnLy8nKVxuICAgIGlmKHByZWZpeCA9PT0gJ18nIHx8IHN1ZmZpeC5pbmRleE9mKCcvLycpID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gcHJlZml4IGRlcGVuZGVuY3kgbm90IGRlZmluZWQsIGRlZmluZSBpdFxuICAgIGlmKGxvY2FsQ3R4ICYmIHByZWZpeCBpbiBsb2NhbEN0eCkge1xuICAgICAgX2NyZWF0ZVRlcm1EZWZpbml0aW9uKGFjdGl2ZUN0eCwgbG9jYWxDdHgsIHByZWZpeCwgZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgLy8gdXNlIG1hcHBpbmcgaWYgcHJlZml4IGlzIGRlZmluZWRcbiAgICB2YXIgbWFwcGluZyA9IGFjdGl2ZUN0eC5tYXBwaW5nc1twcmVmaXhdO1xuICAgIGlmKG1hcHBpbmcpIHtcbiAgICAgIHJldHVybiBtYXBwaW5nWydAaWQnXSArIHN1ZmZpeDtcbiAgICB9XG5cbiAgICAvLyBhbHJlYWR5IGFic29sdXRlIElSSVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIC8vIHByZXBlbmQgdm9jYWJcbiAgaWYocmVsYXRpdmVUby52b2NhYiAmJiAnQHZvY2FiJyBpbiBhY3RpdmVDdHgpIHtcbiAgICByZXR1cm4gYWN0aXZlQ3R4WydAdm9jYWInXSArIHZhbHVlO1xuICB9XG5cbiAgLy8gcHJlcGVuZCBiYXNlXG4gIHZhciBydmFsID0gdmFsdWU7XG4gIGlmKHJlbGF0aXZlVG8uYmFzZSkge1xuICAgIHJ2YWwgPSBfcHJlcGVuZEJhc2UoYWN0aXZlQ3R4WydAYmFzZSddLCBydmFsKTtcbiAgfVxuXG4gIHJldHVybiBydmFsO1xufVxuXG4vKipcbiAqIFByZXBlbmRzIGEgYmFzZSBJUkkgdG8gdGhlIGdpdmVuIHJlbGF0aXZlIElSSS5cbiAqXG4gKiBAcGFyYW0gYmFzZSB0aGUgYmFzZSBJUkkuXG4gKiBAcGFyYW0gaXJpIHRoZSByZWxhdGl2ZSBJUkkuXG4gKlxuICogQHJldHVybiB0aGUgYWJzb2x1dGUgSVJJLlxuICovXG5mdW5jdGlvbiBfcHJlcGVuZEJhc2UoYmFzZSwgaXJpKSB7XG4gIC8vIHNraXAgSVJJIHByb2Nlc3NpbmdcbiAgaWYoYmFzZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBpcmk7XG4gIH1cbiAgLy8gYWxyZWFkeSBhbiBhYnNvbHV0ZSBJUklcbiAgaWYoaXJpLmluZGV4T2YoJzonKSAhPT0gLTEpIHtcbiAgICByZXR1cm4gaXJpO1xuICB9XG5cbiAgLy8gcGFyc2UgYmFzZSBpZiBpdCBpcyBhIHN0cmluZ1xuICBpZihfaXNTdHJpbmcoYmFzZSkpIHtcbiAgICBiYXNlID0ganNvbmxkLnVybC5wYXJzZShiYXNlIHx8ICcnKTtcbiAgfVxuXG4gIC8vIHBhcnNlIGdpdmVuIElSSVxuICB2YXIgcmVsID0ganNvbmxkLnVybC5wYXJzZShpcmkpO1xuXG4gIC8vIHBlciBSRkMzOTg2IDUuMi4yXG4gIHZhciB0cmFuc2Zvcm0gPSB7XG4gICAgcHJvdG9jb2w6IGJhc2UucHJvdG9jb2wgfHwgJydcbiAgfTtcblxuICBpZihyZWwuYXV0aG9yaXR5ICE9PSBudWxsKSB7XG4gICAgdHJhbnNmb3JtLmF1dGhvcml0eSA9IHJlbC5hdXRob3JpdHk7XG4gICAgdHJhbnNmb3JtLnBhdGggPSByZWwucGF0aDtcbiAgICB0cmFuc2Zvcm0ucXVlcnkgPSByZWwucXVlcnk7XG4gIH0gZWxzZSB7XG4gICAgdHJhbnNmb3JtLmF1dGhvcml0eSA9IGJhc2UuYXV0aG9yaXR5O1xuXG4gICAgaWYocmVsLnBhdGggPT09ICcnKSB7XG4gICAgICB0cmFuc2Zvcm0ucGF0aCA9IGJhc2UucGF0aDtcbiAgICAgIGlmKHJlbC5xdWVyeSAhPT0gbnVsbCkge1xuICAgICAgICB0cmFuc2Zvcm0ucXVlcnkgPSByZWwucXVlcnk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cmFuc2Zvcm0ucXVlcnkgPSBiYXNlLnF1ZXJ5O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZihyZWwucGF0aC5pbmRleE9mKCcvJykgPT09IDApIHtcbiAgICAgICAgLy8gSVJJIHJlcHJlc2VudHMgYW4gYWJzb2x1dGUgcGF0aFxuICAgICAgICB0cmFuc2Zvcm0ucGF0aCA9IHJlbC5wYXRoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbWVyZ2UgcGF0aHNcbiAgICAgICAgdmFyIHBhdGggPSBiYXNlLnBhdGg7XG5cbiAgICAgICAgLy8gYXBwZW5kIHJlbGF0aXZlIHBhdGggdG8gdGhlIGVuZCBvZiB0aGUgbGFzdCBkaXJlY3RvcnkgZnJvbSBiYXNlXG4gICAgICAgIGlmKHJlbC5wYXRoICE9PSAnJykge1xuICAgICAgICAgIHBhdGggPSBwYXRoLnN1YnN0cigwLCBwYXRoLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcbiAgICAgICAgICBpZihwYXRoLmxlbmd0aCA+IDAgJiYgcGF0aC5zdWJzdHIoLTEpICE9PSAnLycpIHtcbiAgICAgICAgICAgIHBhdGggKz0gJy8nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwYXRoICs9IHJlbC5wYXRoO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJhbnNmb3JtLnBhdGggPSBwYXRoO1xuICAgICAgfVxuICAgICAgdHJhbnNmb3JtLnF1ZXJ5ID0gcmVsLnF1ZXJ5O1xuICAgIH1cbiAgfVxuXG4gIC8vIHJlbW92ZSBzbGFzaGVzIGFuZCBkb3RzIGluIHBhdGhcbiAgdHJhbnNmb3JtLnBhdGggPSBfcmVtb3ZlRG90U2VnbWVudHModHJhbnNmb3JtLnBhdGgsICEhdHJhbnNmb3JtLmF1dGhvcml0eSk7XG5cbiAgLy8gY29uc3RydWN0IFVSTFxuICB2YXIgcnZhbCA9IHRyYW5zZm9ybS5wcm90b2NvbDtcbiAgaWYodHJhbnNmb3JtLmF1dGhvcml0eSAhPT0gbnVsbCkge1xuICAgIHJ2YWwgKz0gJy8vJyArIHRyYW5zZm9ybS5hdXRob3JpdHk7XG4gIH1cbiAgcnZhbCArPSB0cmFuc2Zvcm0ucGF0aDtcbiAgaWYodHJhbnNmb3JtLnF1ZXJ5ICE9PSBudWxsKSB7XG4gICAgcnZhbCArPSAnPycgKyB0cmFuc2Zvcm0ucXVlcnk7XG4gIH1cbiAgaWYocmVsLmZyYWdtZW50ICE9PSBudWxsKSB7XG4gICAgcnZhbCArPSAnIycgKyByZWwuZnJhZ21lbnQ7XG4gIH1cblxuICAvLyBoYW5kbGUgZW1wdHkgYmFzZVxuICBpZihydmFsID09PSAnJykge1xuICAgIHJ2YWwgPSAnLi8nO1xuICB9XG5cbiAgcmV0dXJuIHJ2YWw7XG59XG5cbi8qKlxuICogUmVtb3ZlcyBhIGJhc2UgSVJJIGZyb20gdGhlIGdpdmVuIGFic29sdXRlIElSSS5cbiAqXG4gKiBAcGFyYW0gYmFzZSB0aGUgYmFzZSBJUkkuXG4gKiBAcGFyYW0gaXJpIHRoZSBhYnNvbHV0ZSBJUkkuXG4gKlxuICogQHJldHVybiB0aGUgcmVsYXRpdmUgSVJJIGlmIHJlbGF0aXZlIHRvIGJhc2UsIG90aGVyd2lzZSB0aGUgYWJzb2x1dGUgSVJJLlxuICovXG5mdW5jdGlvbiBfcmVtb3ZlQmFzZShiYXNlLCBpcmkpIHtcbiAgLy8gc2tpcCBJUkkgcHJvY2Vzc2luZ1xuICBpZihiYXNlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGlyaTtcbiAgfVxuXG4gIGlmKF9pc1N0cmluZyhiYXNlKSkge1xuICAgIGJhc2UgPSBqc29ubGQudXJsLnBhcnNlKGJhc2UgfHwgJycpO1xuICB9XG5cbiAgLy8gZXN0YWJsaXNoIGJhc2Ugcm9vdFxuICB2YXIgcm9vdCA9ICcnO1xuICBpZihiYXNlLmhyZWYgIT09ICcnKSB7XG4gICAgcm9vdCArPSAoYmFzZS5wcm90b2NvbCB8fCAnJykgKyAnLy8nICsgKGJhc2UuYXV0aG9yaXR5IHx8ICcnKTtcbiAgfSBlbHNlIGlmKGlyaS5pbmRleE9mKCcvLycpKSB7XG4gICAgLy8gc3VwcG9ydCBuZXR3b3JrLXBhdGggcmVmZXJlbmNlIHdpdGggZW1wdHkgYmFzZVxuICAgIHJvb3QgKz0gJy8vJztcbiAgfVxuXG4gIC8vIElSSSBub3QgcmVsYXRpdmUgdG8gYmFzZVxuICBpZihpcmkuaW5kZXhPZihyb290KSAhPT0gMCkge1xuICAgIHJldHVybiBpcmk7XG4gIH1cblxuICAvLyByZW1vdmUgcm9vdCBmcm9tIElSSSBhbmQgcGFyc2UgcmVtYWluZGVyXG4gIHZhciByZWwgPSBqc29ubGQudXJsLnBhcnNlKGlyaS5zdWJzdHIocm9vdC5sZW5ndGgpKTtcblxuICAvLyByZW1vdmUgcGF0aCBzZWdtZW50cyB0aGF0IG1hdGNoIChkbyBub3QgcmVtb3ZlIGxhc3Qgc2VnbWVudCB1bmxlc3MgdGhlcmVcbiAgLy8gaXMgYSBoYXNoIG9yIHF1ZXJ5KVxuICB2YXIgYmFzZVNlZ21lbnRzID0gYmFzZS5ub3JtYWxpemVkUGF0aC5zcGxpdCgnLycpO1xuICB2YXIgaXJpU2VnbWVudHMgPSByZWwubm9ybWFsaXplZFBhdGguc3BsaXQoJy8nKTtcbiAgdmFyIGxhc3QgPSAocmVsLmZyYWdtZW50IHx8IHJlbC5xdWVyeSkgPyAwIDogMTtcbiAgd2hpbGUoYmFzZVNlZ21lbnRzLmxlbmd0aCA+IDAgJiYgaXJpU2VnbWVudHMubGVuZ3RoID4gbGFzdCkge1xuICAgIGlmKGJhc2VTZWdtZW50c1swXSAhPT0gaXJpU2VnbWVudHNbMF0pIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBiYXNlU2VnbWVudHMuc2hpZnQoKTtcbiAgICBpcmlTZWdtZW50cy5zaGlmdCgpO1xuICB9XG5cbiAgLy8gdXNlICcuLi8nIGZvciBlYWNoIG5vbi1tYXRjaGluZyBiYXNlIHNlZ21lbnRcbiAgdmFyIHJ2YWwgPSAnJztcbiAgaWYoYmFzZVNlZ21lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBkb24ndCBjb3VudCB0aGUgbGFzdCBzZWdtZW50IChpZiBpdCBlbmRzIHdpdGggJy8nIGxhc3QgcGF0aCBkb2Vzbid0XG4gICAgLy8gY291bnQgYW5kIGlmIGl0IGRvZXNuJ3QgZW5kIHdpdGggJy8nIGl0IGlzbid0IGEgcGF0aClcbiAgICBiYXNlU2VnbWVudHMucG9wKCk7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGJhc2VTZWdtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgcnZhbCArPSAnLi4vJztcbiAgICB9XG4gIH1cblxuICAvLyBwcmVwZW5kIHJlbWFpbmluZyBzZWdtZW50c1xuICBydmFsICs9IGlyaVNlZ21lbnRzLmpvaW4oJy8nKTtcblxuICAvLyBhZGQgcXVlcnkgYW5kIGhhc2hcbiAgaWYocmVsLnF1ZXJ5ICE9PSBudWxsKSB7XG4gICAgcnZhbCArPSAnPycgKyByZWwucXVlcnk7XG4gIH1cbiAgaWYocmVsLmZyYWdtZW50ICE9PSBudWxsKSB7XG4gICAgcnZhbCArPSAnIycgKyByZWwuZnJhZ21lbnQ7XG4gIH1cblxuICAvLyBoYW5kbGUgZW1wdHkgYmFzZVxuICBpZihydmFsID09PSAnJykge1xuICAgIHJ2YWwgPSAnLi8nO1xuICB9XG5cbiAgcmV0dXJuIHJ2YWw7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgaW5pdGlhbCBjb250ZXh0LlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtiYXNlXSB0aGUgZG9jdW1lbnQgYmFzZSBJUkkuXG4gKlxuICogQHJldHVybiB0aGUgaW5pdGlhbCBjb250ZXh0LlxuICovXG5mdW5jdGlvbiBfZ2V0SW5pdGlhbENvbnRleHQob3B0aW9ucykge1xuICB2YXIgYmFzZSA9IGpzb25sZC51cmwucGFyc2Uob3B0aW9ucy5iYXNlIHx8ICcnKTtcbiAgcmV0dXJuIHtcbiAgICAnQGJhc2UnOiBiYXNlLFxuICAgIG1hcHBpbmdzOiB7fSxcbiAgICBpbnZlcnNlOiBudWxsLFxuICAgIGdldEludmVyc2U6IF9jcmVhdGVJbnZlcnNlQ29udGV4dCxcbiAgICBjbG9uZTogX2Nsb25lQWN0aXZlQ29udGV4dFxuICB9O1xuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYW4gaW52ZXJzZSBjb250ZXh0IGZvciB1c2UgaW4gdGhlIGNvbXBhY3Rpb24gYWxnb3JpdGhtLCBpZlxuICAgKiBub3QgYWxyZWFkeSBnZW5lcmF0ZWQgZm9yIHRoZSBnaXZlbiBhY3RpdmUgY29udGV4dC5cbiAgICpcbiAgICogQHJldHVybiB0aGUgaW52ZXJzZSBjb250ZXh0LlxuICAgKi9cbiAgZnVuY3Rpb24gX2NyZWF0ZUludmVyc2VDb250ZXh0KCkge1xuICAgIHZhciBhY3RpdmVDdHggPSB0aGlzO1xuXG4gICAgLy8gbGF6aWx5IGNyZWF0ZSBpbnZlcnNlXG4gICAgaWYoYWN0aXZlQ3R4LmludmVyc2UpIHtcbiAgICAgIHJldHVybiBhY3RpdmVDdHguaW52ZXJzZTtcbiAgICB9XG4gICAgdmFyIGludmVyc2UgPSBhY3RpdmVDdHguaW52ZXJzZSA9IHt9O1xuXG4gICAgLy8gaGFuZGxlIGRlZmF1bHQgbGFuZ3VhZ2VcbiAgICB2YXIgZGVmYXVsdExhbmd1YWdlID0gYWN0aXZlQ3R4WydAbGFuZ3VhZ2UnXSB8fCAnQG5vbmUnO1xuXG4gICAgLy8gY3JlYXRlIHRlcm0gc2VsZWN0aW9ucyBmb3IgZWFjaCBtYXBwaW5nIGluIHRoZSBjb250ZXh0LCBvcmRlcmVkIGJ5XG4gICAgLy8gc2hvcnRlc3QgYW5kIHRoZW4gbGV4aWNvZ3JhcGhpY2FsbHkgbGVhc3RcbiAgICB2YXIgbWFwcGluZ3MgPSBhY3RpdmVDdHgubWFwcGluZ3M7XG4gICAgdmFyIHRlcm1zID0gT2JqZWN0LmtleXMobWFwcGluZ3MpLnNvcnQoX2NvbXBhcmVTaG9ydGVzdExlYXN0KTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGVybXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciB0ZXJtID0gdGVybXNbaV07XG4gICAgICB2YXIgbWFwcGluZyA9IG1hcHBpbmdzW3Rlcm1dO1xuICAgICAgaWYobWFwcGluZyA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGNvbnRhaW5lciA9IG1hcHBpbmdbJ0Bjb250YWluZXInXSB8fCAnQG5vbmUnO1xuXG4gICAgICAvLyBpdGVyYXRlIG92ZXIgZXZlcnkgSVJJIGluIHRoZSBtYXBwaW5nXG4gICAgICB2YXIgaWRzID0gbWFwcGluZ1snQGlkJ107XG4gICAgICBpZighX2lzQXJyYXkoaWRzKSkge1xuICAgICAgICBpZHMgPSBbaWRzXTtcbiAgICAgIH1cbiAgICAgIGZvcih2YXIgaWkgPSAwOyBpaSA8IGlkcy5sZW5ndGg7ICsraWkpIHtcbiAgICAgICAgdmFyIGlyaSA9IGlkc1tpaV07XG4gICAgICAgIHZhciBlbnRyeSA9IGludmVyc2VbaXJpXTtcblxuICAgICAgICAvLyBpbml0aWFsaXplIGVudHJ5XG4gICAgICAgIGlmKCFlbnRyeSkge1xuICAgICAgICAgIGludmVyc2VbaXJpXSA9IGVudHJ5ID0ge307XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgbmV3IGVudHJ5XG4gICAgICAgIGlmKCFlbnRyeVtjb250YWluZXJdKSB7XG4gICAgICAgICAgZW50cnlbY29udGFpbmVyXSA9IHtcbiAgICAgICAgICAgICdAbGFuZ3VhZ2UnOiB7fSxcbiAgICAgICAgICAgICdAdHlwZSc6IHt9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbnRyeSA9IGVudHJ5W2NvbnRhaW5lcl07XG5cbiAgICAgICAgaWYobWFwcGluZy5yZXZlcnNlKSB7XG4gICAgICAgICAgLy8gdGVybSBpcyBwcmVmZXJyZWQgZm9yIHZhbHVlcyB1c2luZyBAcmV2ZXJzZVxuICAgICAgICAgIF9hZGRQcmVmZXJyZWRUZXJtKG1hcHBpbmcsIHRlcm0sIGVudHJ5WydAdHlwZSddLCAnQHJldmVyc2UnKTtcbiAgICAgICAgfSBlbHNlIGlmKCdAdHlwZScgaW4gbWFwcGluZykge1xuICAgICAgICAgIC8vIHRlcm0gaXMgcHJlZmVycmVkIGZvciB2YWx1ZXMgdXNpbmcgc3BlY2lmaWMgdHlwZVxuICAgICAgICAgIF9hZGRQcmVmZXJyZWRUZXJtKG1hcHBpbmcsIHRlcm0sIGVudHJ5WydAdHlwZSddLCBtYXBwaW5nWydAdHlwZSddKTtcbiAgICAgICAgfSBlbHNlIGlmKCdAbGFuZ3VhZ2UnIGluIG1hcHBpbmcpIHtcbiAgICAgICAgICAvLyB0ZXJtIGlzIHByZWZlcnJlZCBmb3IgdmFsdWVzIHVzaW5nIHNwZWNpZmljIGxhbmd1YWdlXG4gICAgICAgICAgdmFyIGxhbmd1YWdlID0gbWFwcGluZ1snQGxhbmd1YWdlJ10gfHwgJ0BudWxsJztcbiAgICAgICAgICBfYWRkUHJlZmVycmVkVGVybShtYXBwaW5nLCB0ZXJtLCBlbnRyeVsnQGxhbmd1YWdlJ10sIGxhbmd1YWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB0ZXJtIGlzIHByZWZlcnJlZCBmb3IgdmFsdWVzIHcvZGVmYXVsdCBsYW5ndWFnZSBvciBubyB0eXBlIGFuZFxuICAgICAgICAgIC8vIG5vIGxhbmd1YWdlXG4gICAgICAgICAgLy8gYWRkIGFuIGVudHJ5IGZvciB0aGUgZGVmYXVsdCBsYW5ndWFnZVxuICAgICAgICAgIF9hZGRQcmVmZXJyZWRUZXJtKG1hcHBpbmcsIHRlcm0sIGVudHJ5WydAbGFuZ3VhZ2UnXSwgZGVmYXVsdExhbmd1YWdlKTtcblxuICAgICAgICAgIC8vIGFkZCBlbnRyaWVzIGZvciBubyB0eXBlIGFuZCBubyBsYW5ndWFnZVxuICAgICAgICAgIF9hZGRQcmVmZXJyZWRUZXJtKG1hcHBpbmcsIHRlcm0sIGVudHJ5WydAdHlwZSddLCAnQG5vbmUnKTtcbiAgICAgICAgICBfYWRkUHJlZmVycmVkVGVybShtYXBwaW5nLCB0ZXJtLCBlbnRyeVsnQGxhbmd1YWdlJ10sICdAbm9uZScpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGludmVyc2U7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyB0aGUgdGVybSBmb3IgdGhlIGdpdmVuIGVudHJ5IGlmIG5vdCBhbHJlYWR5IGFkZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gbWFwcGluZyB0aGUgdGVybSBtYXBwaW5nLlxuICAgKiBAcGFyYW0gdGVybSB0aGUgdGVybSB0byBhZGQuXG4gICAqIEBwYXJhbSBlbnRyeSB0aGUgaW52ZXJzZSBjb250ZXh0IHR5cGVPckxhbmd1YWdlIGVudHJ5IHRvIGFkZCB0by5cbiAgICogQHBhcmFtIHR5cGVPckxhbmd1YWdlVmFsdWUgdGhlIGtleSBpbiB0aGUgZW50cnkgdG8gYWRkIHRvLlxuICAgKi9cbiAgZnVuY3Rpb24gX2FkZFByZWZlcnJlZFRlcm0obWFwcGluZywgdGVybSwgZW50cnksIHR5cGVPckxhbmd1YWdlVmFsdWUpIHtcbiAgICBpZighKHR5cGVPckxhbmd1YWdlVmFsdWUgaW4gZW50cnkpKSB7XG4gICAgICBlbnRyeVt0eXBlT3JMYW5ndWFnZVZhbHVlXSA9IHRlcm07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENsb25lcyBhbiBhY3RpdmUgY29udGV4dCwgY3JlYXRpbmcgYSBjaGlsZCBhY3RpdmUgY29udGV4dC5cbiAgICpcbiAgICogQHJldHVybiBhIGNsb25lIChjaGlsZCkgb2YgdGhlIGFjdGl2ZSBjb250ZXh0LlxuICAgKi9cbiAgZnVuY3Rpb24gX2Nsb25lQWN0aXZlQ29udGV4dCgpIHtcbiAgICB2YXIgY2hpbGQgPSB7fTtcbiAgICBjaGlsZFsnQGJhc2UnXSA9IHRoaXNbJ0BiYXNlJ107XG4gICAgY2hpbGQubWFwcGluZ3MgPSBfY2xvbmUodGhpcy5tYXBwaW5ncyk7XG4gICAgY2hpbGQuY2xvbmUgPSB0aGlzLmNsb25lO1xuICAgIGNoaWxkLmludmVyc2UgPSBudWxsO1xuICAgIGNoaWxkLmdldEludmVyc2UgPSB0aGlzLmdldEludmVyc2U7XG4gICAgaWYoJ0BsYW5ndWFnZScgaW4gdGhpcykge1xuICAgICAgY2hpbGRbJ0BsYW5ndWFnZSddID0gdGhpc1snQGxhbmd1YWdlJ107XG4gICAgfVxuICAgIGlmKCdAdm9jYWInIGluIHRoaXMpIHtcbiAgICAgIGNoaWxkWydAdm9jYWInXSA9IHRoaXNbJ0B2b2NhYiddO1xuICAgIH1cbiAgICByZXR1cm4gY2hpbGQ7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiB2YWx1ZSBpcyBhIGtleXdvcmQuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSBrZXl3b3JkLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc0tleXdvcmQodikge1xuICBpZighX2lzU3RyaW5nKHYpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHN3aXRjaCh2KSB7XG4gIGNhc2UgJ0BiYXNlJzpcbiAgY2FzZSAnQGNvbnRleHQnOlxuICBjYXNlICdAY29udGFpbmVyJzpcbiAgY2FzZSAnQGRlZmF1bHQnOlxuICBjYXNlICdAZW1iZWQnOlxuICBjYXNlICdAZXhwbGljaXQnOlxuICBjYXNlICdAZ3JhcGgnOlxuICBjYXNlICdAaWQnOlxuICBjYXNlICdAaW5kZXgnOlxuICBjYXNlICdAbGFuZ3VhZ2UnOlxuICBjYXNlICdAbGlzdCc6XG4gIGNhc2UgJ0BvbWl0RGVmYXVsdCc6XG4gIGNhc2UgJ0BwcmVzZXJ2ZSc6XG4gIGNhc2UgJ0ByZXF1aXJlQWxsJzpcbiAgY2FzZSAnQHJldmVyc2UnOlxuICBjYXNlICdAc2V0JzpcbiAgY2FzZSAnQHR5cGUnOlxuICBjYXNlICdAdmFsdWUnOlxuICBjYXNlICdAdm9jYWInOlxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGFuIE9iamVjdC5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhbiBPYmplY3QsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzT2JqZWN0KHYpIHtcbiAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodikgPT09ICdbb2JqZWN0IE9iamVjdF0nKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGFuIGVtcHR5IE9iamVjdC5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhbiBlbXB0eSBPYmplY3QsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzRW1wdHlPYmplY3Qodikge1xuICByZXR1cm4gX2lzT2JqZWN0KHYpICYmIE9iamVjdC5rZXlzKHYpLmxlbmd0aCA9PT0gMDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGFuIEFycmF5LlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGFuIEFycmF5LCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc0FycmF5KHYpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodik7XG59XG5cbi8qKlxuICogVGhyb3dzIGFuIGV4Y2VwdGlvbiBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgbm90IGEgdmFsaWQgQHR5cGUgdmFsdWUuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICovXG5mdW5jdGlvbiBfdmFsaWRhdGVUeXBlVmFsdWUodikge1xuICAvLyBjYW4gYmUgYSBzdHJpbmcgb3IgYW4gZW1wdHkgb2JqZWN0XG4gIGlmKF9pc1N0cmluZyh2KSB8fCBfaXNFbXB0eU9iamVjdCh2KSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gYXJyYXlcbiAgdmFyIGlzVmFsaWQgPSBmYWxzZTtcbiAgaWYoX2lzQXJyYXkodikpIHtcbiAgICAvLyBtdXN0IGNvbnRhaW4gb25seSBzdHJpbmdzXG4gICAgaXNWYWxpZCA9IHRydWU7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHYubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmKCEoX2lzU3RyaW5nKHZbaV0pKSkge1xuICAgICAgICBpc1ZhbGlkID0gZmFsc2U7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKCFpc1ZhbGlkKSB7XG4gICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IFwiQHR5cGVcIiB2YWx1ZSBtdXN0IGEgc3RyaW5nLCBhbiBhcnJheSBvZiAnICtcbiAgICAgICdzdHJpbmdzLCBvciBhbiBlbXB0eSBvYmplY3QuJywgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICB7Y29kZTogJ2ludmFsaWQgdHlwZSB2YWx1ZScsIHZhbHVlOiB2fSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGEgU3RyaW5nLlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgU3RyaW5nLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc1N0cmluZyh2KSB7XG4gIHJldHVybiAodHlwZW9mIHYgPT09ICdzdHJpbmcnIHx8XG4gICAgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHYpID09PSAnW29iamVjdCBTdHJpbmddJyk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBhIE51bWJlci5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIE51bWJlciwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNOdW1iZXIodikge1xuICByZXR1cm4gKHR5cGVvZiB2ID09PSAnbnVtYmVyJyB8fFxuICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2KSA9PT0gJ1tvYmplY3QgTnVtYmVyXScpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSBkb3VibGUuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSBkb3VibGUsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzRG91YmxlKHYpIHtcbiAgcmV0dXJuIF9pc051bWJlcih2KSAmJiBTdHJpbmcodikuaW5kZXhPZignLicpICE9PSAtMTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIG51bWVyaWMuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgbnVtZXJpYywgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNOdW1lcmljKHYpIHtcbiAgcmV0dXJuICFpc05hTihwYXJzZUZsb2F0KHYpKSAmJiBpc0Zpbml0ZSh2KTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGEgQm9vbGVhbi5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIEJvb2xlYW4sIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzQm9vbGVhbih2KSB7XG4gIHJldHVybiAodHlwZW9mIHYgPT09ICdib29sZWFuJyB8fFxuICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2KSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyB1bmRlZmluZWQsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzVW5kZWZpbmVkKHYpIHtcbiAgcmV0dXJuICh0eXBlb2YgdiA9PT0gJ3VuZGVmaW5lZCcpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSBzdWJqZWN0IHdpdGggcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHN1YmplY3Qgd2l0aCBwcm9wZXJ0aWVzLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc1N1YmplY3Qodikge1xuICAvLyBOb3RlOiBBIHZhbHVlIGlzIGEgc3ViamVjdCBpZiBhbGwgb2YgdGhlc2UgaG9sZCB0cnVlOlxuICAvLyAxLiBJdCBpcyBhbiBPYmplY3QuXG4gIC8vIDIuIEl0IGlzIG5vdCBhIEB2YWx1ZSwgQHNldCwgb3IgQGxpc3QuXG4gIC8vIDMuIEl0IGhhcyBtb3JlIHRoYW4gMSBrZXkgT1IgYW55IGV4aXN0aW5nIGtleSBpcyBub3QgQGlkLlxuICB2YXIgcnZhbCA9IGZhbHNlO1xuICBpZihfaXNPYmplY3QodikgJiZcbiAgICAhKCgnQHZhbHVlJyBpbiB2KSB8fCAoJ0BzZXQnIGluIHYpIHx8ICgnQGxpc3QnIGluIHYpKSkge1xuICAgIHZhciBrZXlDb3VudCA9IE9iamVjdC5rZXlzKHYpLmxlbmd0aDtcbiAgICBydmFsID0gKGtleUNvdW50ID4gMSB8fCAhKCdAaWQnIGluIHYpKTtcbiAgfVxuICByZXR1cm4gcnZhbDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGEgc3ViamVjdCByZWZlcmVuY2UuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSBzdWJqZWN0IHJlZmVyZW5jZSwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNTdWJqZWN0UmVmZXJlbmNlKHYpIHtcbiAgLy8gTm90ZTogQSB2YWx1ZSBpcyBhIHN1YmplY3QgcmVmZXJlbmNlIGlmIGFsbCBvZiB0aGVzZSBob2xkIHRydWU6XG4gIC8vIDEuIEl0IGlzIGFuIE9iamVjdC5cbiAgLy8gMi4gSXQgaGFzIGEgc2luZ2xlIGtleTogQGlkLlxuICByZXR1cm4gKF9pc09iamVjdCh2KSAmJiBPYmplY3Qua2V5cyh2KS5sZW5ndGggPT09IDEgJiYgKCdAaWQnIGluIHYpKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGEgQHZhbHVlLlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgQHZhbHVlLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc1ZhbHVlKHYpIHtcbiAgLy8gTm90ZTogQSB2YWx1ZSBpcyBhIEB2YWx1ZSBpZiBhbGwgb2YgdGhlc2UgaG9sZCB0cnVlOlxuICAvLyAxLiBJdCBpcyBhbiBPYmplY3QuXG4gIC8vIDIuIEl0IGhhcyB0aGUgQHZhbHVlIHByb3BlcnR5LlxuICByZXR1cm4gX2lzT2JqZWN0KHYpICYmICgnQHZhbHVlJyBpbiB2KTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGEgQGxpc3QuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSBAbGlzdCwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNMaXN0KHYpIHtcbiAgLy8gTm90ZTogQSB2YWx1ZSBpcyBhIEBsaXN0IGlmIGFsbCBvZiB0aGVzZSBob2xkIHRydWU6XG4gIC8vIDEuIEl0IGlzIGFuIE9iamVjdC5cbiAgLy8gMi4gSXQgaGFzIHRoZSBAbGlzdCBwcm9wZXJ0eS5cbiAgcmV0dXJuIF9pc09iamVjdCh2KSAmJiAoJ0BsaXN0JyBpbiB2KTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGEgYmxhbmsgbm9kZS5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIGJsYW5rIG5vZGUsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzQmxhbmtOb2RlKHYpIHtcbiAgLy8gTm90ZTogQSB2YWx1ZSBpcyBhIGJsYW5rIG5vZGUgaWYgYWxsIG9mIHRoZXNlIGhvbGQgdHJ1ZTpcbiAgLy8gMS4gSXQgaXMgYW4gT2JqZWN0LlxuICAvLyAyLiBJZiBpdCBoYXMgYW4gQGlkIGtleSBpdHMgdmFsdWUgYmVnaW5zIHdpdGggJ186Jy5cbiAgLy8gMy4gSXQgaGFzIG5vIGtleXMgT1IgaXMgbm90IGEgQHZhbHVlLCBAc2V0LCBvciBAbGlzdC5cbiAgdmFyIHJ2YWwgPSBmYWxzZTtcbiAgaWYoX2lzT2JqZWN0KHYpKSB7XG4gICAgaWYoJ0BpZCcgaW4gdikge1xuICAgICAgcnZhbCA9ICh2WydAaWQnXS5pbmRleE9mKCdfOicpID09PSAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcnZhbCA9IChPYmplY3Qua2V5cyh2KS5sZW5ndGggPT09IDAgfHxcbiAgICAgICAgISgoJ0B2YWx1ZScgaW4gdikgfHwgKCdAc2V0JyBpbiB2KSB8fCAoJ0BsaXN0JyBpbiB2KSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcnZhbDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGFuIGFic29sdXRlIElSSSwgZmFsc2UgaWYgbm90LlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGFuIGFic29sdXRlIElSSSwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNBYnNvbHV0ZUlyaSh2KSB7XG4gIHJldHVybiBfaXNTdHJpbmcodikgJiYgdi5pbmRleE9mKCc6JykgIT09IC0xO1xufVxuXG4vKipcbiAqIENsb25lcyBhbiBvYmplY3QsIGFycmF5LCBvciBzdHJpbmcvbnVtYmVyLiBJZiBhIHR5cGVkIEphdmFTY3JpcHQgb2JqZWN0XG4gKiBpcyBnaXZlbiwgc3VjaCBhcyBhIERhdGUsIGl0IHdpbGwgYmUgY29udmVydGVkIHRvIGEgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gY2xvbmUuXG4gKlxuICogQHJldHVybiB0aGUgY2xvbmVkIHZhbHVlLlxuICovXG5mdW5jdGlvbiBfY2xvbmUodmFsdWUpIHtcbiAgaWYodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgIHZhciBydmFsO1xuICAgIGlmKF9pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcnZhbCA9IFtdO1xuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHJ2YWxbaV0gPSBfY2xvbmUodmFsdWVbaV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZihfaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICBydmFsID0ge307XG4gICAgICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICBydmFsW2tleV0gPSBfY2xvbmUodmFsdWVba2V5XSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJ2YWwgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgIH1cbiAgICByZXR1cm4gcnZhbDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogRmluZHMgYWxsIEBjb250ZXh0IFVSTHMgaW4gdGhlIGdpdmVuIEpTT04tTEQgaW5wdXQuXG4gKlxuICogQHBhcmFtIGlucHV0IHRoZSBKU09OLUxEIGlucHV0LlxuICogQHBhcmFtIHVybHMgYSBtYXAgb2YgVVJMcyAodXJsID0+IGZhbHNlL0Bjb250ZXh0cykuXG4gKiBAcGFyYW0gcmVwbGFjZSB0cnVlIHRvIHJlcGxhY2UgdGhlIFVSTHMgaW4gdGhlIGdpdmVuIGlucHV0IHdpdGggdGhlXG4gKiAgICAgICAgICAgQGNvbnRleHRzIGZyb20gdGhlIHVybHMgbWFwLCBmYWxzZSBub3QgdG8uXG4gKiBAcGFyYW0gYmFzZSB0aGUgYmFzZSBJUkkgdG8gdXNlIHRvIHJlc29sdmUgcmVsYXRpdmUgSVJJcy5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgbmV3IFVSTHMgdG8gcmV0cmlldmUgd2VyZSBmb3VuZCwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfZmluZENvbnRleHRVcmxzKGlucHV0LCB1cmxzLCByZXBsYWNlLCBiYXNlKSB7XG4gIHZhciBjb3VudCA9IE9iamVjdC5rZXlzKHVybHMpLmxlbmd0aDtcbiAgaWYoX2lzQXJyYXkoaW5wdXQpKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBfZmluZENvbnRleHRVcmxzKGlucHV0W2ldLCB1cmxzLCByZXBsYWNlLCBiYXNlKTtcbiAgICB9XG4gICAgcmV0dXJuIChjb3VudCA8IE9iamVjdC5rZXlzKHVybHMpLmxlbmd0aCk7XG4gIH0gZWxzZSBpZihfaXNPYmplY3QoaW5wdXQpKSB7XG4gICAgZm9yKHZhciBrZXkgaW4gaW5wdXQpIHtcbiAgICAgIGlmKGtleSAhPT0gJ0Bjb250ZXh0Jykge1xuICAgICAgICBfZmluZENvbnRleHRVcmxzKGlucHV0W2tleV0sIHVybHMsIHJlcGxhY2UsIGJhc2UpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gZ2V0IEBjb250ZXh0XG4gICAgICB2YXIgY3R4ID0gaW5wdXRba2V5XTtcblxuICAgICAgLy8gYXJyYXkgQGNvbnRleHRcbiAgICAgIGlmKF9pc0FycmF5KGN0eCkpIHtcbiAgICAgICAgdmFyIGxlbmd0aCA9IGN0eC5sZW5ndGg7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgIHZhciBfY3R4ID0gY3R4W2ldO1xuICAgICAgICAgIGlmKF9pc1N0cmluZyhfY3R4KSkge1xuICAgICAgICAgICAgX2N0eCA9IF9wcmVwZW5kQmFzZShiYXNlLCBfY3R4KTtcbiAgICAgICAgICAgIC8vIHJlcGxhY2Ugdy9AY29udGV4dCBpZiByZXF1ZXN0ZWRcbiAgICAgICAgICAgIGlmKHJlcGxhY2UpIHtcbiAgICAgICAgICAgICAgX2N0eCA9IHVybHNbX2N0eF07XG4gICAgICAgICAgICAgIGlmKF9pc0FycmF5KF9jdHgpKSB7XG4gICAgICAgICAgICAgICAgLy8gYWRkIGZsYXR0ZW5lZCBjb250ZXh0XG4gICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShjdHgsIFtpLCAxXS5jb25jYXQoX2N0eCkpO1xuICAgICAgICAgICAgICAgIGkgKz0gX2N0eC5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIGxlbmd0aCA9IGN0eC5sZW5ndGg7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY3R4W2ldID0gX2N0eDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmKCEoX2N0eCBpbiB1cmxzKSkge1xuICAgICAgICAgICAgICAvLyBAY29udGV4dCBVUkwgZm91bmRcbiAgICAgICAgICAgICAgdXJsc1tfY3R4XSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmKF9pc1N0cmluZyhjdHgpKSB7XG4gICAgICAgIC8vIHN0cmluZyBAY29udGV4dFxuICAgICAgICBjdHggPSBfcHJlcGVuZEJhc2UoYmFzZSwgY3R4KTtcbiAgICAgICAgLy8gcmVwbGFjZSB3L0Bjb250ZXh0IGlmIHJlcXVlc3RlZFxuICAgICAgICBpZihyZXBsYWNlKSB7XG4gICAgICAgICAgaW5wdXRba2V5XSA9IHVybHNbY3R4XTtcbiAgICAgICAgfSBlbHNlIGlmKCEoY3R4IGluIHVybHMpKSB7XG4gICAgICAgICAgLy8gQGNvbnRleHQgVVJMIGZvdW5kXG4gICAgICAgICAgdXJsc1tjdHhdID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChjb3VudCA8IE9iamVjdC5rZXlzKHVybHMpLmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFJldHJpZXZlcyBleHRlcm5hbCBAY29udGV4dCBVUkxzIHVzaW5nIHRoZSBnaXZlbiBkb2N1bWVudCBsb2FkZXIuIEV2ZXJ5XG4gKiBpbnN0YW5jZSBvZiBAY29udGV4dCBpbiB0aGUgaW5wdXQgdGhhdCByZWZlcnMgdG8gYSBVUkwgd2lsbCBiZSByZXBsYWNlZFxuICogd2l0aCB0aGUgSlNPTiBAY29udGV4dCBmb3VuZCBhdCB0aGF0IFVSTC5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgaW5wdXQgd2l0aCBwb3NzaWJsZSBjb250ZXh0cy5cbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIGRvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKSB0aGUgZG9jdW1lbnQgbG9hZGVyLlxuICogQHBhcmFtIGNhbGxiYWNrKGVyciwgaW5wdXQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5mdW5jdGlvbiBfcmV0cmlldmVDb250ZXh0VXJscyhpbnB1dCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgLy8gaWYgYW55IGVycm9yIG9jY3VycyBkdXJpbmcgVVJMIHJlc29sdXRpb24sIHF1aXRcbiAgdmFyIGVycm9yID0gbnVsbDtcblxuICAvLyByZWN1cnNpdmUgZG9jdW1lbnQgbG9hZGVyXG4gIHZhciBkb2N1bWVudExvYWRlciA9IG9wdGlvbnMuZG9jdW1lbnRMb2FkZXI7XG4gIHZhciByZXRyaWV2ZSA9IGZ1bmN0aW9uKGlucHV0LCBjeWNsZXMsIGRvY3VtZW50TG9hZGVyLCBiYXNlLCBjYWxsYmFjaykge1xuICAgIGlmKE9iamVjdC5rZXlzKGN5Y2xlcykubGVuZ3RoID4gTUFYX0NPTlRFWFRfVVJMUykge1xuICAgICAgZXJyb3IgPSBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdNYXhpbXVtIG51bWJlciBvZiBAY29udGV4dCBVUkxzIGV4Y2VlZGVkLicsXG4gICAgICAgICdqc29ubGQuQ29udGV4dFVybEVycm9yJyxcbiAgICAgICAge2NvZGU6ICdsb2FkaW5nIHJlbW90ZSBjb250ZXh0IGZhaWxlZCcsIG1heDogTUFYX0NPTlRFWFRfVVJMU30pO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBmb3IgdHJhY2tpbmcgdGhlIFVSTHMgdG8gcmV0cmlldmVcbiAgICB2YXIgdXJscyA9IHt9O1xuXG4gICAgLy8gZmluaXNoZWQgd2lsbCBiZSBjYWxsZWQgb25jZSB0aGUgVVJMIHF1ZXVlIGlzIGVtcHR5XG4gICAgdmFyIGZpbmlzaGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyByZXBsYWNlIGFsbCBVUkxzIGluIHRoZSBpbnB1dFxuICAgICAgX2ZpbmRDb250ZXh0VXJscyhpbnB1dCwgdXJscywgdHJ1ZSwgYmFzZSk7XG4gICAgICBjYWxsYmFjayhudWxsLCBpbnB1dCk7XG4gICAgfTtcblxuICAgIC8vIGZpbmQgYWxsIFVSTHMgaW4gdGhlIGdpdmVuIGlucHV0XG4gICAgaWYoIV9maW5kQ29udGV4dFVybHMoaW5wdXQsIHVybHMsIGZhbHNlLCBiYXNlKSkge1xuICAgICAgLy8gbm8gbmV3IFVSTHMgaW4gaW5wdXRcbiAgICAgIGZpbmlzaGVkKCk7XG4gICAgfVxuXG4gICAgLy8gcXVldWUgYWxsIHVucmV0cmlldmVkIFVSTHNcbiAgICB2YXIgcXVldWUgPSBbXTtcbiAgICBmb3IodmFyIHVybCBpbiB1cmxzKSB7XG4gICAgICBpZih1cmxzW3VybF0gPT09IGZhbHNlKSB7XG4gICAgICAgIHF1ZXVlLnB1c2godXJsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZXRyaWV2ZSBVUkxzIGluIHF1ZXVlXG4gICAgdmFyIGNvdW50ID0gcXVldWUubGVuZ3RoO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7ICsraSkge1xuICAgICAgKGZ1bmN0aW9uKHVybCkge1xuICAgICAgICAvLyBjaGVjayBmb3IgY29udGV4dCBVUkwgY3ljbGVcbiAgICAgICAgaWYodXJsIGluIGN5Y2xlcykge1xuICAgICAgICAgIGVycm9yID0gbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgJ0N5Y2xpY2FsIEBjb250ZXh0IFVSTHMgZGV0ZWN0ZWQuJyxcbiAgICAgICAgICAgICdqc29ubGQuQ29udGV4dFVybEVycm9yJyxcbiAgICAgICAgICAgIHtjb2RlOiAncmVjdXJzaXZlIGNvbnRleHQgaW5jbHVzaW9uJywgdXJsOiB1cmx9KTtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBfY3ljbGVzID0gX2Nsb25lKGN5Y2xlcyk7XG4gICAgICAgIF9jeWNsZXNbdXJsXSA9IHRydWU7XG4gICAgICAgIHZhciBkb25lID0gZnVuY3Rpb24oZXJyLCByZW1vdGVEb2MpIHtcbiAgICAgICAgICAvLyBzaG9ydC1jaXJjdWl0IGlmIHRoZXJlIHdhcyBhbiBlcnJvciB3aXRoIGFub3RoZXIgVVJMXG4gICAgICAgICAgaWYoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgY3R4ID0gcmVtb3RlRG9jID8gcmVtb3RlRG9jLmRvY3VtZW50IDogbnVsbDtcblxuICAgICAgICAgIC8vIHBhcnNlIHN0cmluZyBjb250ZXh0IGFzIEpTT05cbiAgICAgICAgICBpZighZXJyICYmIF9pc1N0cmluZyhjdHgpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjdHggPSBKU09OLnBhcnNlKGN0eCk7XG4gICAgICAgICAgICB9IGNhdGNoKGV4KSB7XG4gICAgICAgICAgICAgIGVyciA9IGV4O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGVuc3VyZSBjdHggaXMgYW4gb2JqZWN0XG4gICAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICBlcnIgPSBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAgICdEZXJlZmVyZW5jaW5nIGEgVVJMIGRpZCBub3QgcmVzdWx0IGluIGEgdmFsaWQgSlNPTi1MRCBvYmplY3QuICcgK1xuICAgICAgICAgICAgICAnUG9zc2libGUgY2F1c2VzIGFyZSBhbiBpbmFjY2Vzc2libGUgVVJMIHBlcmhhcHMgZHVlIHRvICcgK1xuICAgICAgICAgICAgICAnYSBzYW1lLW9yaWdpbiBwb2xpY3kgKGVuc3VyZSB0aGUgc2VydmVyIHVzZXMgQ09SUyBpZiB5b3UgYXJlICcgK1xuICAgICAgICAgICAgICAndXNpbmcgY2xpZW50LXNpZGUgSmF2YVNjcmlwdCksIHRvbyBtYW55IHJlZGlyZWN0cywgYSAnICtcbiAgICAgICAgICAgICAgJ25vbi1KU09OIHJlc3BvbnNlLCBvciBtb3JlIHRoYW4gb25lIEhUVFAgTGluayBIZWFkZXIgd2FzICcgK1xuICAgICAgICAgICAgICAncHJvdmlkZWQgZm9yIGEgcmVtb3RlIGNvbnRleHQuJyxcbiAgICAgICAgICAgICAgJ2pzb25sZC5JbnZhbGlkVXJsJyxcbiAgICAgICAgICAgICAge2NvZGU6ICdsb2FkaW5nIHJlbW90ZSBjb250ZXh0IGZhaWxlZCcsIHVybDogdXJsLCBjYXVzZTogZXJyfSk7XG4gICAgICAgICAgfSBlbHNlIGlmKCFfaXNPYmplY3QoY3R4KSkge1xuICAgICAgICAgICAgZXJyID0gbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgICAnRGVyZWZlcmVuY2luZyBhIFVSTCBkaWQgbm90IHJlc3VsdCBpbiBhIEpTT04gb2JqZWN0LiBUaGUgJyArXG4gICAgICAgICAgICAgICdyZXNwb25zZSB3YXMgdmFsaWQgSlNPTiwgYnV0IGl0IHdhcyBub3QgYSBKU09OIG9iamVjdC4nLFxuICAgICAgICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLFxuICAgICAgICAgICAgICB7Y29kZTogJ2ludmFsaWQgcmVtb3RlIGNvbnRleHQnLCB1cmw6IHVybCwgY2F1c2U6IGVycn0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgIGVycm9yID0gZXJyO1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB1c2UgZW1wdHkgY29udGV4dCBpZiBubyBAY29udGV4dCBrZXkgaXMgcHJlc2VudFxuICAgICAgICAgIGlmKCEoJ0Bjb250ZXh0JyBpbiBjdHgpKSB7XG4gICAgICAgICAgICBjdHggPSB7J0Bjb250ZXh0Jzoge319O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdHggPSB7J0Bjb250ZXh0JzogY3R4WydAY29udGV4dCddfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBhcHBlbmQgY29udGV4dCBVUkwgdG8gY29udGV4dCBpZiBnaXZlblxuICAgICAgICAgIGlmKHJlbW90ZURvYy5jb250ZXh0VXJsKSB7XG4gICAgICAgICAgICBpZighX2lzQXJyYXkoY3R4WydAY29udGV4dCddKSkge1xuICAgICAgICAgICAgICBjdHhbJ0Bjb250ZXh0J10gPSBbY3R4WydAY29udGV4dCddXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN0eFsnQGNvbnRleHQnXS5wdXNoKHJlbW90ZURvYy5jb250ZXh0VXJsKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyByZWN1cnNlXG4gICAgICAgICAgcmV0cmlldmUoY3R4LCBfY3ljbGVzLCBkb2N1bWVudExvYWRlciwgdXJsLCBmdW5jdGlvbihlcnIsIGN0eCkge1xuICAgICAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXJsc1t1cmxdID0gY3R4WydAY29udGV4dCddO1xuICAgICAgICAgICAgY291bnQgLT0gMTtcbiAgICAgICAgICAgIGlmKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgIGZpbmlzaGVkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBwcm9taXNlID0gZG9jdW1lbnRMb2FkZXIodXJsLCBkb25lKTtcbiAgICAgICAgaWYocHJvbWlzZSAmJiAndGhlbicgaW4gcHJvbWlzZSkge1xuICAgICAgICAgIHByb21pc2UudGhlbihkb25lLmJpbmQobnVsbCwgbnVsbCksIGRvbmUpO1xuICAgICAgICB9XG4gICAgICB9KHF1ZXVlW2ldKSk7XG4gICAgfVxuICB9O1xuICByZXRyaWV2ZShpbnB1dCwge30sIGRvY3VtZW50TG9hZGVyLCBvcHRpb25zLmJhc2UsIGNhbGxiYWNrKTtcbn1cblxuLy8gZGVmaW5lIGpzIDEuOC41IE9iamVjdC5rZXlzIG1ldGhvZCBpZiBub3QgcHJlc2VudFxuaWYoIU9iamVjdC5rZXlzKSB7XG4gIE9iamVjdC5rZXlzID0gZnVuY3Rpb24obykge1xuICAgIGlmKG8gIT09IE9iamVjdChvKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmtleXMgY2FsbGVkIG9uIG5vbi1vYmplY3QnKTtcbiAgICB9XG4gICAgdmFyIHJ2YWwgPSBbXTtcbiAgICBmb3IodmFyIHAgaW4gbykge1xuICAgICAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSB7XG4gICAgICAgIHJ2YWwucHVzaChwKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2YWw7XG4gIH07XG59XG5cbi8qKlxuICogUGFyc2VzIFJERiBpbiB0aGUgZm9ybSBvZiBOLVF1YWRzLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgTi1RdWFkcyBpbnB1dCB0byBwYXJzZS5cbiAqXG4gKiBAcmV0dXJuIGFuIFJERiBkYXRhc2V0LlxuICovXG5mdW5jdGlvbiBfcGFyc2VOUXVhZHMoaW5wdXQpIHtcbiAgLy8gZGVmaW5lIHBhcnRpYWwgcmVnZXhlc1xuICB2YXIgaXJpID0gJyg/OjwoW146XSs6W14+XSopPiknO1xuICB2YXIgYm5vZGUgPSAnKF86KD86W0EtWmEtejAtOV0rKSknO1xuICB2YXIgcGxhaW4gPSAnXCIoW15cIlxcXFxcXFxcXSooPzpcXFxcXFxcXC5bXlwiXFxcXFxcXFxdKikqKVwiJztcbiAgdmFyIGRhdGF0eXBlID0gJyg/OlxcXFxeXFxcXF4nICsgaXJpICsgJyknO1xuICB2YXIgbGFuZ3VhZ2UgPSAnKD86QChbYS16XSsoPzotW2EtejAtOV0rKSopKSc7XG4gIHZhciBsaXRlcmFsID0gJyg/OicgKyBwbGFpbiArICcoPzonICsgZGF0YXR5cGUgKyAnfCcgKyBsYW5ndWFnZSArICcpPyknO1xuICB2YXIgd3MgPSAnWyBcXFxcdF0rJztcbiAgdmFyIHdzbyA9ICdbIFxcXFx0XSonO1xuICB2YXIgZW9sbiA9IC8oPzpcXHJcXG4pfCg/Olxcbil8KD86XFxyKS9nO1xuICB2YXIgZW1wdHkgPSBuZXcgUmVnRXhwKCdeJyArIHdzbyArICckJyk7XG5cbiAgLy8gZGVmaW5lIHF1YWQgcGFydCByZWdleGVzXG4gIHZhciBzdWJqZWN0ID0gJyg/OicgKyBpcmkgKyAnfCcgKyBibm9kZSArICcpJyArIHdzO1xuICB2YXIgcHJvcGVydHkgPSBpcmkgKyB3cztcbiAgdmFyIG9iamVjdCA9ICcoPzonICsgaXJpICsgJ3wnICsgYm5vZGUgKyAnfCcgKyBsaXRlcmFsICsgJyknICsgd3NvO1xuICB2YXIgZ3JhcGhOYW1lID0gJyg/OlxcXFwufCg/Oig/OicgKyBpcmkgKyAnfCcgKyBibm9kZSArICcpJyArIHdzbyArICdcXFxcLikpJztcblxuICAvLyBmdWxsIHF1YWQgcmVnZXhcbiAgdmFyIHF1YWQgPSBuZXcgUmVnRXhwKFxuICAgICdeJyArIHdzbyArIHN1YmplY3QgKyBwcm9wZXJ0eSArIG9iamVjdCArIGdyYXBoTmFtZSArIHdzbyArICckJyk7XG5cbiAgLy8gYnVpbGQgUkRGIGRhdGFzZXRcbiAgdmFyIGRhdGFzZXQgPSB7fTtcblxuICAvLyBzcGxpdCBOLVF1YWQgaW5wdXQgaW50byBsaW5lc1xuICB2YXIgbGluZXMgPSBpbnB1dC5zcGxpdChlb2xuKTtcbiAgdmFyIGxpbmVOdW1iZXIgPSAwO1xuICBmb3IodmFyIGxpID0gMDsgbGkgPCBsaW5lcy5sZW5ndGg7ICsrbGkpIHtcbiAgICB2YXIgbGluZSA9IGxpbmVzW2xpXTtcbiAgICBsaW5lTnVtYmVyKys7XG5cbiAgICAvLyBza2lwIGVtcHR5IGxpbmVzXG4gICAgaWYoZW1wdHkudGVzdChsaW5lKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gcGFyc2UgcXVhZFxuICAgIHZhciBtYXRjaCA9IGxpbmUubWF0Y2gocXVhZCk7XG4gICAgaWYobWF0Y2ggPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0Vycm9yIHdoaWxlIHBhcnNpbmcgTi1RdWFkczsgaW52YWxpZCBxdWFkLicsXG4gICAgICAgICdqc29ubGQuUGFyc2VFcnJvcicsIHtsaW5lOiBsaW5lTnVtYmVyfSk7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIFJERiB0cmlwbGVcbiAgICB2YXIgdHJpcGxlID0ge307XG5cbiAgICAvLyBnZXQgc3ViamVjdFxuICAgIGlmKCFfaXNVbmRlZmluZWQobWF0Y2hbMV0pKSB7XG4gICAgICB0cmlwbGUuc3ViamVjdCA9IHt0eXBlOiAnSVJJJywgdmFsdWU6IG1hdGNoWzFdfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHJpcGxlLnN1YmplY3QgPSB7dHlwZTogJ2JsYW5rIG5vZGUnLCB2YWx1ZTogbWF0Y2hbMl19O1xuICAgIH1cblxuICAgIC8vIGdldCBwcmVkaWNhdGVcbiAgICB0cmlwbGUucHJlZGljYXRlID0ge3R5cGU6ICdJUkknLCB2YWx1ZTogbWF0Y2hbM119O1xuXG4gICAgLy8gZ2V0IG9iamVjdFxuICAgIGlmKCFfaXNVbmRlZmluZWQobWF0Y2hbNF0pKSB7XG4gICAgICB0cmlwbGUub2JqZWN0ID0ge3R5cGU6ICdJUkknLCB2YWx1ZTogbWF0Y2hbNF19O1xuICAgIH0gZWxzZSBpZighX2lzVW5kZWZpbmVkKG1hdGNoWzVdKSkge1xuICAgICAgdHJpcGxlLm9iamVjdCA9IHt0eXBlOiAnYmxhbmsgbm9kZScsIHZhbHVlOiBtYXRjaFs1XX07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyaXBsZS5vYmplY3QgPSB7dHlwZTogJ2xpdGVyYWwnfTtcbiAgICAgIGlmKCFfaXNVbmRlZmluZWQobWF0Y2hbN10pKSB7XG4gICAgICAgIHRyaXBsZS5vYmplY3QuZGF0YXR5cGUgPSBtYXRjaFs3XTtcbiAgICAgIH0gZWxzZSBpZighX2lzVW5kZWZpbmVkKG1hdGNoWzhdKSkge1xuICAgICAgICB0cmlwbGUub2JqZWN0LmRhdGF0eXBlID0gUkRGX0xBTkdTVFJJTkc7XG4gICAgICAgIHRyaXBsZS5vYmplY3QubGFuZ3VhZ2UgPSBtYXRjaFs4XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyaXBsZS5vYmplY3QuZGF0YXR5cGUgPSBYU0RfU1RSSU5HO1xuICAgICAgfVxuICAgICAgdmFyIHVuZXNjYXBlZCA9IG1hdGNoWzZdXG4gICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgLnJlcGxhY2UoL1xcXFx0L2csICdcXHQnKVxuICAgICAgICAucmVwbGFjZSgvXFxcXG4vZywgJ1xcbicpXG4gICAgICAgIC5yZXBsYWNlKC9cXFxcci9nLCAnXFxyJylcbiAgICAgICAgLnJlcGxhY2UoL1xcXFxcXFxcL2csICdcXFxcJyk7XG4gICAgICB0cmlwbGUub2JqZWN0LnZhbHVlID0gdW5lc2NhcGVkO1xuICAgIH1cblxuICAgIC8vIGdldCBncmFwaCBuYW1lICgnQGRlZmF1bHQnIGlzIHVzZWQgZm9yIHRoZSBkZWZhdWx0IGdyYXBoKVxuICAgIHZhciBuYW1lID0gJ0BkZWZhdWx0JztcbiAgICBpZighX2lzVW5kZWZpbmVkKG1hdGNoWzldKSkge1xuICAgICAgbmFtZSA9IG1hdGNoWzldO1xuICAgIH0gZWxzZSBpZighX2lzVW5kZWZpbmVkKG1hdGNoWzEwXSkpIHtcbiAgICAgIG5hbWUgPSBtYXRjaFsxMF07XG4gICAgfVxuXG4gICAgLy8gaW5pdGlhbGl6ZSBncmFwaCBpbiBkYXRhc2V0XG4gICAgaWYoIShuYW1lIGluIGRhdGFzZXQpKSB7XG4gICAgICBkYXRhc2V0W25hbWVdID0gW3RyaXBsZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGFkZCB0cmlwbGUgaWYgdW5pcXVlIHRvIGl0cyBncmFwaFxuICAgICAgdmFyIHVuaXF1ZSA9IHRydWU7XG4gICAgICB2YXIgdHJpcGxlcyA9IGRhdGFzZXRbbmFtZV07XG4gICAgICBmb3IodmFyIHRpID0gMDsgdW5pcXVlICYmIHRpIDwgdHJpcGxlcy5sZW5ndGg7ICsrdGkpIHtcbiAgICAgICAgaWYoX2NvbXBhcmVSREZUcmlwbGVzKHRyaXBsZXNbdGldLCB0cmlwbGUpKSB7XG4gICAgICAgICAgdW5pcXVlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmKHVuaXF1ZSkge1xuICAgICAgICB0cmlwbGVzLnB1c2godHJpcGxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZGF0YXNldDtcbn1cblxuLy8gcmVnaXN0ZXIgdGhlIE4tUXVhZHMgUkRGIHBhcnNlclxuanNvbmxkLnJlZ2lzdGVyUkRGUGFyc2VyKCdhcHBsaWNhdGlvbi9ucXVhZHMnLCBfcGFyc2VOUXVhZHMpO1xuXG4vKipcbiAqIENvbnZlcnRzIGFuIFJERiBkYXRhc2V0IHRvIE4tUXVhZHMuXG4gKlxuICogQHBhcmFtIGRhdGFzZXQgdGhlIFJERiBkYXRhc2V0IHRvIGNvbnZlcnQuXG4gKlxuICogQHJldHVybiB0aGUgTi1RdWFkcyBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIF90b05RdWFkcyhkYXRhc2V0KSB7XG4gIHZhciBxdWFkcyA9IFtdO1xuICBmb3IodmFyIGdyYXBoTmFtZSBpbiBkYXRhc2V0KSB7XG4gICAgdmFyIHRyaXBsZXMgPSBkYXRhc2V0W2dyYXBoTmFtZV07XG4gICAgZm9yKHZhciB0aSA9IDA7IHRpIDwgdHJpcGxlcy5sZW5ndGg7ICsrdGkpIHtcbiAgICAgIHZhciB0cmlwbGUgPSB0cmlwbGVzW3RpXTtcbiAgICAgIGlmKGdyYXBoTmFtZSA9PT0gJ0BkZWZhdWx0Jykge1xuICAgICAgICBncmFwaE5hbWUgPSBudWxsO1xuICAgICAgfVxuICAgICAgcXVhZHMucHVzaChfdG9OUXVhZCh0cmlwbGUsIGdyYXBoTmFtZSkpO1xuICAgIH1cbiAgfVxuICBxdWFkcy5zb3J0KCk7XG4gIHJldHVybiBxdWFkcy5qb2luKCcnKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhbiBSREYgdHJpcGxlIGFuZCBncmFwaCBuYW1lIHRvIGFuIE4tUXVhZCBzdHJpbmcgKGEgc2luZ2xlIHF1YWQpLlxuICpcbiAqIEBwYXJhbSB0cmlwbGUgdGhlIFJERiB0cmlwbGUgdG8gY29udmVydC5cbiAqIEBwYXJhbSBncmFwaE5hbWUgdGhlIG5hbWUgb2YgdGhlIGdyYXBoIGNvbnRhaW5pbmcgdGhlIHRyaXBsZSwgbnVsbCBmb3JcbiAqICAgICAgICAgIHRoZSBkZWZhdWx0IGdyYXBoLlxuICogQHBhcmFtIGJub2RlIHRoZSBibm9kZSB0aGUgcXVhZCBpcyBtYXBwZWQgdG8gKG9wdGlvbmFsLCBmb3IgdXNlXG4gKiAgICAgICAgICBkdXJpbmcgbm9ybWFsaXphdGlvbiBvbmx5KS5cbiAqXG4gKiBAcmV0dXJuIHRoZSBOLVF1YWQgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBfdG9OUXVhZCh0cmlwbGUsIGdyYXBoTmFtZSwgYm5vZGUpIHtcbiAgdmFyIHMgPSB0cmlwbGUuc3ViamVjdDtcbiAgdmFyIHAgPSB0cmlwbGUucHJlZGljYXRlO1xuICB2YXIgbyA9IHRyaXBsZS5vYmplY3Q7XG4gIHZhciBnID0gZ3JhcGhOYW1lO1xuXG4gIHZhciBxdWFkID0gJyc7XG5cbiAgLy8gc3ViamVjdCBpcyBhbiBJUklcbiAgaWYocy50eXBlID09PSAnSVJJJykge1xuICAgIHF1YWQgKz0gJzwnICsgcy52YWx1ZSArICc+JztcbiAgfSBlbHNlIGlmKGJub2RlKSB7XG4gICAgLy8gYm5vZGUgbm9ybWFsaXphdGlvbiBtb2RlXG4gICAgcXVhZCArPSAocy52YWx1ZSA9PT0gYm5vZGUpID8gJ186YScgOiAnXzp6JztcbiAgfSBlbHNlIHtcbiAgICAvLyBibm9kZSBub3JtYWwgbW9kZVxuICAgIHF1YWQgKz0gcy52YWx1ZTtcbiAgfVxuICBxdWFkICs9ICcgJztcblxuICAvLyBwcmVkaWNhdGUgaXMgYW4gSVJJXG4gIGlmKHAudHlwZSA9PT0gJ0lSSScpIHtcbiAgICBxdWFkICs9ICc8JyArIHAudmFsdWUgKyAnPic7XG4gIH0gZWxzZSBpZihibm9kZSkge1xuICAgIC8vIEZJWE1FOiBUQkQgd2hhdCB0byBkbyB3aXRoIGJub2RlIHByZWRpY2F0ZXMgZHVyaW5nIG5vcm1hbGl6YXRpb25cbiAgICAvLyBibm9kZSBub3JtYWxpemF0aW9uIG1vZGVcbiAgICBxdWFkICs9ICdfOnAnO1xuICB9IGVsc2Uge1xuICAgIC8vIGJub2RlIG5vcm1hbCBtb2RlXG4gICAgcXVhZCArPSBwLnZhbHVlO1xuICB9XG4gIHF1YWQgKz0gJyAnO1xuXG4gIC8vIG9iamVjdCBpcyBJUkksIGJub2RlLCBvciBsaXRlcmFsXG4gIGlmKG8udHlwZSA9PT0gJ0lSSScpIHtcbiAgICBxdWFkICs9ICc8JyArIG8udmFsdWUgKyAnPic7XG4gIH0gZWxzZSBpZihvLnR5cGUgPT09ICdibGFuayBub2RlJykge1xuICAgIC8vIG5vcm1hbGl6YXRpb24gbW9kZVxuICAgIGlmKGJub2RlKSB7XG4gICAgICBxdWFkICs9IChvLnZhbHVlID09PSBibm9kZSkgPyAnXzphJyA6ICdfOnonO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBub3JtYWwgbW9kZVxuICAgICAgcXVhZCArPSBvLnZhbHVlO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgZXNjYXBlZCA9IG8udmFsdWVcbiAgICAgIC5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpXG4gICAgICAucmVwbGFjZSgvXFx0L2csICdcXFxcdCcpXG4gICAgICAucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXG4gICAgICAucmVwbGFjZSgvXFxyL2csICdcXFxccicpXG4gICAgICAucmVwbGFjZSgvXFxcIi9nLCAnXFxcXFwiJyk7XG4gICAgcXVhZCArPSAnXCInICsgZXNjYXBlZCArICdcIic7XG4gICAgaWYoby5kYXRhdHlwZSA9PT0gUkRGX0xBTkdTVFJJTkcpIHtcbiAgICAgIGlmKG8ubGFuZ3VhZ2UpIHtcbiAgICAgICAgcXVhZCArPSAnQCcgKyBvLmxhbmd1YWdlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZihvLmRhdGF0eXBlICE9PSBYU0RfU1RSSU5HKSB7XG4gICAgICBxdWFkICs9ICdeXjwnICsgby5kYXRhdHlwZSArICc+JztcbiAgICB9XG4gIH1cblxuICAvLyBncmFwaFxuICBpZihnICE9PSBudWxsKSB7XG4gICAgaWYoZy5pbmRleE9mKCdfOicpICE9PSAwKSB7XG4gICAgICBxdWFkICs9ICcgPCcgKyBnICsgJz4nO1xuICAgIH0gZWxzZSBpZihibm9kZSkge1xuICAgICAgcXVhZCArPSAnIF86Zyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHF1YWQgKz0gJyAnICsgZztcbiAgICB9XG4gIH1cblxuICBxdWFkICs9ICcgLlxcbic7XG4gIHJldHVybiBxdWFkO1xufVxuXG4vKipcbiAqIFBhcnNlcyB0aGUgUkRGIGRhdGFzZXQgZm91bmQgdmlhIHRoZSBkYXRhIG9iamVjdCBmcm9tIHRoZSBSREZhIEFQSS5cbiAqXG4gKiBAcGFyYW0gZGF0YSB0aGUgUkRGYSBBUEkgZGF0YSBvYmplY3QuXG4gKlxuICogQHJldHVybiB0aGUgUkRGIGRhdGFzZXQuXG4gKi9cbmZ1bmN0aW9uIF9wYXJzZVJkZmFBcGlEYXRhKGRhdGEpIHtcbiAgdmFyIGRhdGFzZXQgPSB7fTtcbiAgZGF0YXNldFsnQGRlZmF1bHQnXSA9IFtdO1xuXG4gIHZhciBzdWJqZWN0cyA9IGRhdGEuZ2V0U3ViamVjdHMoKTtcbiAgZm9yKHZhciBzaSA9IDA7IHNpIDwgc3ViamVjdHMubGVuZ3RoOyArK3NpKSB7XG4gICAgdmFyIHN1YmplY3QgPSBzdWJqZWN0c1tzaV07XG4gICAgaWYoc3ViamVjdCA9PT0gbnVsbCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gZ2V0IGFsbCByZWxhdGVkIHRyaXBsZXNcbiAgICB2YXIgdHJpcGxlcyA9IGRhdGEuZ2V0U3ViamVjdFRyaXBsZXMoc3ViamVjdCk7XG4gICAgaWYodHJpcGxlcyA9PT0gbnVsbCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHZhciBwcmVkaWNhdGVzID0gdHJpcGxlcy5wcmVkaWNhdGVzO1xuICAgIGZvcih2YXIgcHJlZGljYXRlIGluIHByZWRpY2F0ZXMpIHtcbiAgICAgIC8vIGl0ZXJhdGUgb3ZlciBvYmplY3RzXG4gICAgICB2YXIgb2JqZWN0cyA9IHByZWRpY2F0ZXNbcHJlZGljYXRlXS5vYmplY3RzO1xuICAgICAgZm9yKHZhciBvaSA9IDA7IG9pIDwgb2JqZWN0cy5sZW5ndGg7ICsrb2kpIHtcbiAgICAgICAgdmFyIG9iamVjdCA9IG9iamVjdHNbb2ldO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBSREYgdHJpcGxlXG4gICAgICAgIHZhciB0cmlwbGUgPSB7fTtcblxuICAgICAgICAvLyBhZGQgc3ViamVjdFxuICAgICAgICBpZihzdWJqZWN0LmluZGV4T2YoJ186JykgPT09IDApIHtcbiAgICAgICAgICB0cmlwbGUuc3ViamVjdCA9IHt0eXBlOiAnYmxhbmsgbm9kZScsIHZhbHVlOiBzdWJqZWN0fTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cmlwbGUuc3ViamVjdCA9IHt0eXBlOiAnSVJJJywgdmFsdWU6IHN1YmplY3R9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWRkIHByZWRpY2F0ZVxuICAgICAgICBpZihwcmVkaWNhdGUuaW5kZXhPZignXzonKSA9PT0gMCkge1xuICAgICAgICAgIHRyaXBsZS5wcmVkaWNhdGUgPSB7dHlwZTogJ2JsYW5rIG5vZGUnLCB2YWx1ZTogcHJlZGljYXRlfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cmlwbGUucHJlZGljYXRlID0ge3R5cGU6ICdJUkknLCB2YWx1ZTogcHJlZGljYXRlfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNlcmlhbGl6ZSBYTUwgbGl0ZXJhbFxuICAgICAgICB2YXIgdmFsdWUgPSBvYmplY3QudmFsdWU7XG4gICAgICAgIGlmKG9iamVjdC50eXBlID09PSBSREZfWE1MX0xJVEVSQUwpIHtcbiAgICAgICAgICAvLyBpbml0aWFsaXplIFhNTFNlcmlhbGl6ZXJcbiAgICAgICAgICBpZighWE1MU2VyaWFsaXplcikge1xuICAgICAgICAgICAgX2RlZmluZVhNTFNlcmlhbGl6ZXIoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHNlcmlhbGl6ZXIgPSBuZXcgWE1MU2VyaWFsaXplcigpO1xuICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgICAgZm9yKHZhciB4ID0gMDsgeCA8IG9iamVjdC52YWx1ZS5sZW5ndGg7IHgrKykge1xuICAgICAgICAgICAgaWYob2JqZWN0LnZhbHVlW3hdLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICB2YWx1ZSArPSBzZXJpYWxpemVyLnNlcmlhbGl6ZVRvU3RyaW5nKG9iamVjdC52YWx1ZVt4XSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYob2JqZWN0LnZhbHVlW3hdLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xuICAgICAgICAgICAgICB2YWx1ZSArPSBvYmplY3QudmFsdWVbeF0ubm9kZVZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFkZCBvYmplY3RcbiAgICAgICAgdHJpcGxlLm9iamVjdCA9IHt9O1xuXG4gICAgICAgIC8vIG9iamVjdCBpcyBhbiBJUklcbiAgICAgICAgaWYob2JqZWN0LnR5cGUgPT09IFJERl9PQkpFQ1QpIHtcbiAgICAgICAgICBpZihvYmplY3QudmFsdWUuaW5kZXhPZignXzonKSA9PT0gMCkge1xuICAgICAgICAgICAgdHJpcGxlLm9iamVjdC50eXBlID0gJ2JsYW5rIG5vZGUnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cmlwbGUub2JqZWN0LnR5cGUgPSAnSVJJJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gb2JqZWN0IGlzIGEgbGl0ZXJhbFxuICAgICAgICAgIHRyaXBsZS5vYmplY3QudHlwZSA9ICdsaXRlcmFsJztcbiAgICAgICAgICBpZihvYmplY3QudHlwZSA9PT0gUkRGX1BMQUlOX0xJVEVSQUwpIHtcbiAgICAgICAgICAgIGlmKG9iamVjdC5sYW5ndWFnZSkge1xuICAgICAgICAgICAgICB0cmlwbGUub2JqZWN0LmRhdGF0eXBlID0gUkRGX0xBTkdTVFJJTkc7XG4gICAgICAgICAgICAgIHRyaXBsZS5vYmplY3QubGFuZ3VhZ2UgPSBvYmplY3QubGFuZ3VhZ2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0cmlwbGUub2JqZWN0LmRhdGF0eXBlID0gWFNEX1NUUklORztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJpcGxlLm9iamVjdC5kYXRhdHlwZSA9IG9iamVjdC50eXBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0cmlwbGUub2JqZWN0LnZhbHVlID0gdmFsdWU7XG5cbiAgICAgICAgLy8gYWRkIHRyaXBsZSB0byBkYXRhc2V0IGluIGRlZmF1bHQgZ3JhcGhcbiAgICAgICAgZGF0YXNldFsnQGRlZmF1bHQnXS5wdXNoKHRyaXBsZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRhdGFzZXQ7XG59XG5cbi8vIHJlZ2lzdGVyIHRoZSBSREZhIEFQSSBSREYgcGFyc2VyXG5qc29ubGQucmVnaXN0ZXJSREZQYXJzZXIoJ3JkZmEtYXBpJywgX3BhcnNlUmRmYUFwaURhdGEpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgVW5pcXVlTmFtZXIuIEEgVW5pcXVlTmFtZXIgaXNzdWVzIHVuaXF1ZSBuYW1lcywga2VlcGluZ1xuICogdHJhY2sgb2YgYW55IHByZXZpb3VzbHkgaXNzdWVkIG5hbWVzLlxuICpcbiAqIEBwYXJhbSBwcmVmaXggdGhlIHByZWZpeCB0byB1c2UgKCc8cHJlZml4Pjxjb3VudGVyPicpLlxuICovXG5mdW5jdGlvbiBVbmlxdWVOYW1lcihwcmVmaXgpIHtcbiAgdGhpcy5wcmVmaXggPSBwcmVmaXg7XG4gIHRoaXMuY291bnRlciA9IDA7XG4gIHRoaXMuZXhpc3RpbmcgPSB7fTtcbn1cbmpzb25sZC5VbmlxdWVOYW1lciA9IFVuaXF1ZU5hbWVyO1xuXG4vKipcbiAqIENvcGllcyB0aGlzIFVuaXF1ZU5hbWVyLlxuICpcbiAqIEByZXR1cm4gYSBjb3B5IG9mIHRoaXMgVW5pcXVlTmFtZXIuXG4gKi9cblVuaXF1ZU5hbWVyLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY29weSA9IG5ldyBVbmlxdWVOYW1lcih0aGlzLnByZWZpeCk7XG4gIGNvcHkuY291bnRlciA9IHRoaXMuY291bnRlcjtcbiAgY29weS5leGlzdGluZyA9IF9jbG9uZSh0aGlzLmV4aXN0aW5nKTtcbiAgcmV0dXJuIGNvcHk7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIG5ldyBuYW1lIGZvciB0aGUgZ2l2ZW4gb2xkIG5hbWUsIHdoZXJlIGlmIG5vIG9sZCBuYW1lIGlzIGdpdmVuXG4gKiBhIG5ldyBuYW1lIHdpbGwgYmUgZ2VuZXJhdGVkLlxuICpcbiAqIEBwYXJhbSBbb2xkTmFtZV0gdGhlIG9sZCBuYW1lIHRvIGdldCB0aGUgbmV3IG5hbWUgZm9yLlxuICpcbiAqIEByZXR1cm4gdGhlIG5ldyBuYW1lLlxuICovXG5VbmlxdWVOYW1lci5wcm90b3R5cGUuZ2V0TmFtZSA9IGZ1bmN0aW9uKG9sZE5hbWUpIHtcbiAgLy8gcmV0dXJuIGV4aXN0aW5nIG9sZCBuYW1lXG4gIGlmKG9sZE5hbWUgJiYgb2xkTmFtZSBpbiB0aGlzLmV4aXN0aW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhpc3Rpbmdbb2xkTmFtZV07XG4gIH1cblxuICAvLyBnZXQgbmV4dCBuYW1lXG4gIHZhciBuYW1lID0gdGhpcy5wcmVmaXggKyB0aGlzLmNvdW50ZXI7XG4gIHRoaXMuY291bnRlciArPSAxO1xuXG4gIC8vIHNhdmUgbWFwcGluZ1xuICBpZihvbGROYW1lKSB7XG4gICAgdGhpcy5leGlzdGluZ1tvbGROYW1lXSA9IG5hbWU7XG4gIH1cblxuICByZXR1cm4gbmFtZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBvbGROYW1lIGhhcyBhbHJlYWR5IGJlZW4gYXNzaWduZWQgYSBuZXcgbmFtZS5cbiAqXG4gKiBAcGFyYW0gb2xkTmFtZSB0aGUgb2xkTmFtZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIG9sZE5hbWUgaGFzIGJlZW4gYXNzaWduZWQgYSBuZXcgbmFtZSwgZmFsc2UgaWYgbm90LlxuICovXG5VbmlxdWVOYW1lci5wcm90b3R5cGUuaXNOYW1lZCA9IGZ1bmN0aW9uKG9sZE5hbWUpIHtcbiAgcmV0dXJuIChvbGROYW1lIGluIHRoaXMuZXhpc3RpbmcpO1xufTtcblxuLyoqXG4gKiBBIFBlcm11dGF0b3IgaXRlcmF0ZXMgb3ZlciBhbGwgcG9zc2libGUgcGVybXV0YXRpb25zIG9mIHRoZSBnaXZlbiBhcnJheVxuICogb2YgZWxlbWVudHMuXG4gKlxuICogQHBhcmFtIGxpc3QgdGhlIGFycmF5IG9mIGVsZW1lbnRzIHRvIGl0ZXJhdGUgb3Zlci5cbiAqL1xudmFyIFBlcm11dGF0b3IgPSBmdW5jdGlvbihsaXN0KSB7XG4gIC8vIG9yaWdpbmFsIGFycmF5XG4gIHRoaXMubGlzdCA9IGxpc3Quc29ydCgpO1xuICAvLyBpbmRpY2F0ZXMgd2hldGhlciB0aGVyZSBhcmUgbW9yZSBwZXJtdXRhdGlvbnNcbiAgdGhpcy5kb25lID0gZmFsc2U7XG4gIC8vIGRpcmVjdGlvbmFsIGluZm8gZm9yIHBlcm11dGF0aW9uIGFsZ29yaXRobVxuICB0aGlzLmxlZnQgPSB7fTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB0aGlzLmxlZnRbbGlzdFtpXV0gPSB0cnVlO1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGVyZSBpcyBhbm90aGVyIHBlcm11dGF0aW9uLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGVyZSBpcyBhbm90aGVyIHBlcm11dGF0aW9uLCBmYWxzZSBpZiBub3QuXG4gKi9cblBlcm11dGF0b3IucHJvdG90eXBlLmhhc05leHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICF0aGlzLmRvbmU7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIG5leHQgcGVybXV0YXRpb24uIENhbGwgaGFzTmV4dCgpIHRvIGVuc3VyZSB0aGVyZSBpcyBhbm90aGVyIG9uZVxuICogZmlyc3QuXG4gKlxuICogQHJldHVybiB0aGUgbmV4dCBwZXJtdXRhdGlvbi5cbiAqL1xuUGVybXV0YXRvci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uKCkge1xuICAvLyBjb3B5IGN1cnJlbnQgcGVybXV0YXRpb25cbiAgdmFyIHJ2YWwgPSB0aGlzLmxpc3Quc2xpY2UoKTtcblxuICAvKiBDYWxjdWxhdGUgdGhlIG5leHQgcGVybXV0YXRpb24gdXNpbmcgdGhlIFN0ZWluaGF1cy1Kb2huc29uLVRyb3R0ZXJcbiAgIHBlcm11dGF0aW9uIGFsZ29yaXRobS4gKi9cblxuICAvLyBnZXQgbGFyZ2VzdCBtb2JpbGUgZWxlbWVudCBrXG4gIC8vIChtb2JpbGU6IGVsZW1lbnQgaXMgZ3JlYXRlciB0aGFuIHRoZSBvbmUgaXQgaXMgbG9va2luZyBhdClcbiAgdmFyIGsgPSBudWxsO1xuICB2YXIgcG9zID0gMDtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGlzdC5sZW5ndGg7XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5saXN0W2ldO1xuICAgIHZhciBsZWZ0ID0gdGhpcy5sZWZ0W2VsZW1lbnRdO1xuICAgIGlmKChrID09PSBudWxsIHx8IGVsZW1lbnQgPiBrKSAmJlxuICAgICAgKChsZWZ0ICYmIGkgPiAwICYmIGVsZW1lbnQgPiB0aGlzLmxpc3RbaSAtIDFdKSB8fFxuICAgICAgKCFsZWZ0ICYmIGkgPCAobGVuZ3RoIC0gMSkgJiYgZWxlbWVudCA+IHRoaXMubGlzdFtpICsgMV0pKSkge1xuICAgICAgayA9IGVsZW1lbnQ7XG4gICAgICBwb3MgPSBpO1xuICAgIH1cbiAgfVxuXG4gIC8vIG5vIG1vcmUgcGVybXV0YXRpb25zXG4gIGlmKGsgPT09IG51bGwpIHtcbiAgICB0aGlzLmRvbmUgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIC8vIHN3YXAgayBhbmQgdGhlIGVsZW1lbnQgaXQgaXMgbG9va2luZyBhdFxuICAgIHZhciBzd2FwID0gdGhpcy5sZWZ0W2tdID8gcG9zIC0gMSA6IHBvcyArIDE7XG4gICAgdGhpcy5saXN0W3Bvc10gPSB0aGlzLmxpc3Rbc3dhcF07XG4gICAgdGhpcy5saXN0W3N3YXBdID0gaztcblxuICAgIC8vIHJldmVyc2UgdGhlIGRpcmVjdGlvbiBvZiBhbGwgZWxlbWVudHMgbGFyZ2VyIHRoYW4ga1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgaWYodGhpcy5saXN0W2ldID4gaykge1xuICAgICAgICB0aGlzLmxlZnRbdGhpcy5saXN0W2ldXSA9ICF0aGlzLmxlZnRbdGhpcy5saXN0W2ldXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcnZhbDtcbn07XG5cbi8vIFNIQS0xIEFQSVxudmFyIHNoYTEgPSBqc29ubGQuc2hhMSA9IHt9O1xuXG5pZihfbm9kZWpzKSB7XG4gIHZhciBjcnlwdG8gPSByZXF1aXJlKCdjcnlwdG8nKTtcbiAgc2hhMS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbWQgPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMScpO1xuICAgIHJldHVybiB7XG4gICAgICB1cGRhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgbWQudXBkYXRlKGRhdGEsICd1dGY4Jyk7XG4gICAgICB9LFxuICAgICAgZGlnZXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1kLmRpZ2VzdCgnaGV4Jyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcbn0gZWxzZSB7XG4gIHNoYTEuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBzaGExLk1lc3NhZ2VEaWdlc3QoKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBIYXNoZXMgdGhlIGdpdmVuIGFycmF5IG9mIHF1YWRzIGFuZCByZXR1cm5zIGl0cyBoZXhhZGVjaW1hbCBTSEEtMSBtZXNzYWdlXG4gKiBkaWdlc3QuXG4gKlxuICogQHBhcmFtIG5xdWFkcyB0aGUgbGlzdCBvZiBzZXJpYWxpemVkIHF1YWRzIHRvIGhhc2guXG4gKlxuICogQHJldHVybiB0aGUgaGV4YWRlY2ltYWwgU0hBLTEgbWVzc2FnZSBkaWdlc3QuXG4gKi9cbnNoYTEuaGFzaCA9IGZ1bmN0aW9uKG5xdWFkcykge1xuICB2YXIgbWQgPSBzaGExLmNyZWF0ZSgpO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgbnF1YWRzLmxlbmd0aDsgKytpKSB7XG4gICAgbWQudXBkYXRlKG5xdWFkc1tpXSk7XG4gIH1cbiAgcmV0dXJuIG1kLmRpZ2VzdCgpO1xufTtcblxuLy8gb25seSBkZWZpbmUgc2hhMSBNZXNzYWdlRGlnZXN0IGZvciBub24tbm9kZWpzXG5pZighX25vZGVqcykge1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzaW1wbGUgYnl0ZSBidWZmZXIgZm9yIG1lc3NhZ2UgZGlnZXN0IG9wZXJhdGlvbnMuXG4gKi9cbnNoYTEuQnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZGF0YSA9ICcnO1xuICB0aGlzLnJlYWQgPSAwO1xufTtcblxuLyoqXG4gKiBQdXRzIGEgMzItYml0IGludGVnZXIgaW50byB0aGlzIGJ1ZmZlciBpbiBiaWctZW5kaWFuIG9yZGVyLlxuICpcbiAqIEBwYXJhbSBpIHRoZSAzMi1iaXQgaW50ZWdlci5cbiAqL1xuc2hhMS5CdWZmZXIucHJvdG90eXBlLnB1dEludDMyID0gZnVuY3Rpb24oaSkge1xuICB0aGlzLmRhdGEgKz0gKFxuICAgIFN0cmluZy5mcm9tQ2hhckNvZGUoaSA+PiAyNCAmIDB4RkYpICtcbiAgICBTdHJpbmcuZnJvbUNoYXJDb2RlKGkgPj4gMTYgJiAweEZGKSArXG4gICAgU3RyaW5nLmZyb21DaGFyQ29kZShpID4+IDggJiAweEZGKSArXG4gICAgU3RyaW5nLmZyb21DaGFyQ29kZShpICYgMHhGRikpO1xufTtcblxuLyoqXG4gKiBHZXRzIGEgMzItYml0IGludGVnZXIgZnJvbSB0aGlzIGJ1ZmZlciBpbiBiaWctZW5kaWFuIG9yZGVyIGFuZFxuICogYWR2YW5jZXMgdGhlIHJlYWQgcG9pbnRlciBieSA0LlxuICpcbiAqIEByZXR1cm4gdGhlIHdvcmQuXG4gKi9cbnNoYTEuQnVmZmVyLnByb3RvdHlwZS5nZXRJbnQzMiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcnZhbCA9IChcbiAgICB0aGlzLmRhdGEuY2hhckNvZGVBdCh0aGlzLnJlYWQpIDw8IDI0IF5cbiAgICB0aGlzLmRhdGEuY2hhckNvZGVBdCh0aGlzLnJlYWQgKyAxKSA8PCAxNiBeXG4gICAgdGhpcy5kYXRhLmNoYXJDb2RlQXQodGhpcy5yZWFkICsgMikgPDwgOCBeXG4gICAgdGhpcy5kYXRhLmNoYXJDb2RlQXQodGhpcy5yZWFkICsgMykpO1xuICB0aGlzLnJlYWQgKz0gNDtcbiAgcmV0dXJuIHJ2YWw7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIGJ5dGVzIGluIHRoaXMgYnVmZmVyLlxuICpcbiAqIEByZXR1cm4gYSBzdHJpbmcgZnVsbCBvZiBVVEYtOCBlbmNvZGVkIGNoYXJhY3RlcnMuXG4gKi9cbnNoYTEuQnVmZmVyLnByb3RvdHlwZS5ieXRlcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5kYXRhLnNsaWNlKHRoaXMucmVhZCk7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIG51bWJlciBvZiBieXRlcyBpbiB0aGlzIGJ1ZmZlci5cbiAqXG4gKiBAcmV0dXJuIHRoZSBudW1iZXIgb2YgYnl0ZXMgaW4gdGhpcyBidWZmZXIuXG4gKi9cbnNoYTEuQnVmZmVyLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZGF0YS5sZW5ndGggLSB0aGlzLnJlYWQ7XG59O1xuXG4vKipcbiAqIENvbXBhY3RzIHRoaXMgYnVmZmVyLlxuICovXG5zaGExLkJ1ZmZlci5wcm90b3R5cGUuY29tcGFjdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmRhdGEgPSB0aGlzLmRhdGEuc2xpY2UodGhpcy5yZWFkKTtcbiAgdGhpcy5yZWFkID0gMDtcbn07XG5cbi8qKlxuICogQ29udmVydHMgdGhpcyBidWZmZXIgdG8gYSBoZXhhZGVjaW1hbCBzdHJpbmcuXG4gKlxuICogQHJldHVybiBhIGhleGFkZWNpbWFsIHN0cmluZy5cbiAqL1xuc2hhMS5CdWZmZXIucHJvdG90eXBlLnRvSGV4ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBydmFsID0gJyc7XG4gIGZvcih2YXIgaSA9IHRoaXMucmVhZDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7ICsraSkge1xuICAgIHZhciBiID0gdGhpcy5kYXRhLmNoYXJDb2RlQXQoaSk7XG4gICAgaWYoYiA8IDE2KSB7XG4gICAgICBydmFsICs9ICcwJztcbiAgICB9XG4gICAgcnZhbCArPSBiLnRvU3RyaW5nKDE2KTtcbiAgfVxuICByZXR1cm4gcnZhbDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIFNIQS0xIG1lc3NhZ2UgZGlnZXN0IG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIGEgbWVzc2FnZSBkaWdlc3Qgb2JqZWN0LlxuICovXG5zaGExLk1lc3NhZ2VEaWdlc3QgPSBmdW5jdGlvbigpIHtcbiAgLy8gZG8gaW5pdGlhbGl6YXRpb24gYXMgbmVjZXNzYXJ5XG4gIGlmKCFfc2hhMS5pbml0aWFsaXplZCkge1xuICAgIF9zaGExLmluaXQoKTtcbiAgfVxuXG4gIHRoaXMuYmxvY2tMZW5ndGggPSA2NDtcbiAgdGhpcy5kaWdlc3RMZW5ndGggPSAyMDtcbiAgLy8gbGVuZ3RoIG9mIG1lc3NhZ2Ugc28gZmFyIChkb2VzIG5vdCBpbmNsdWRpbmcgcGFkZGluZylcbiAgdGhpcy5tZXNzYWdlTGVuZ3RoID0gMDtcblxuICAvLyBpbnB1dCBidWZmZXJcbiAgdGhpcy5pbnB1dCA9IG5ldyBzaGExLkJ1ZmZlcigpO1xuXG4gIC8vIGZvciBzdG9yaW5nIHdvcmRzIGluIHRoZSBTSEEtMSBhbGdvcml0aG1cbiAgdGhpcy53b3JkcyA9IG5ldyBBcnJheSg4MCk7XG5cbiAgLy8gU0hBLTEgc3RhdGUgY29udGFpbnMgZml2ZSAzMi1iaXQgaW50ZWdlcnNcbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBoMDogMHg2NzQ1MjMwMSxcbiAgICBoMTogMHhFRkNEQUI4OSxcbiAgICBoMjogMHg5OEJBRENGRSxcbiAgICBoMzogMHgxMDMyNTQ3NixcbiAgICBoNDogMHhDM0QyRTFGMFxuICB9O1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBkaWdlc3Qgd2l0aCB0aGUgZ2l2ZW4gc3RyaW5nIGlucHV0LlxuICpcbiAqIEBwYXJhbSBtc2cgdGhlIG1lc3NhZ2UgaW5wdXQgdG8gdXBkYXRlIHdpdGguXG4gKi9cbnNoYTEuTWVzc2FnZURpZ2VzdC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24obXNnKSB7XG4gIC8vIFVURi04IGVuY29kZSBtZXNzYWdlXG4gIG1zZyA9IHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChtc2cpKTtcblxuICAvLyB1cGRhdGUgbWVzc2FnZSBsZW5ndGggYW5kIGlucHV0IGJ1ZmZlclxuICB0aGlzLm1lc3NhZ2VMZW5ndGggKz0gbXNnLmxlbmd0aDtcbiAgdGhpcy5pbnB1dC5kYXRhICs9IG1zZztcblxuICAvLyBwcm9jZXNzIGlucHV0XG4gIF9zaGExLnVwZGF0ZSh0aGlzLnN0YXRlLCB0aGlzLndvcmRzLCB0aGlzLmlucHV0KTtcblxuICAvLyBjb21wYWN0IGlucHV0IGJ1ZmZlciBldmVyeSAySyBvciBpZiBlbXB0eVxuICBpZih0aGlzLmlucHV0LnJlYWQgPiAyMDQ4IHx8IHRoaXMuaW5wdXQubGVuZ3RoKCkgPT09IDApIHtcbiAgICB0aGlzLmlucHV0LmNvbXBhY3QoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBQcm9kdWNlcyB0aGUgZGlnZXN0LlxuICpcbiAqIEByZXR1cm4gdGhlIGRpZ2VzdCBhcyBhIGhleGFkZWNpbWFsIHN0cmluZy5cbiAqL1xuc2hhMS5NZXNzYWdlRGlnZXN0LnByb3RvdHlwZS5kaWdlc3QgPSBmdW5jdGlvbigpIHtcbiAgLyogRGV0ZXJtaW5lIHRoZSBudW1iZXIgb2YgYnl0ZXMgdGhhdCBtdXN0IGJlIGFkZGVkIHRvIHRoZSBtZXNzYWdlXG4gIHRvIGVuc3VyZSBpdHMgbGVuZ3RoIGlzIGNvbmdydWVudCB0byA0NDggbW9kIDUxMi4gSW4gb3RoZXIgd29yZHMsXG4gIGEgNjQtYml0IGludGVnZXIgdGhhdCBnaXZlcyB0aGUgbGVuZ3RoIG9mIHRoZSBtZXNzYWdlIHdpbGwgYmVcbiAgYXBwZW5kZWQgdG8gdGhlIG1lc3NhZ2UgYW5kIHdoYXRldmVyIHRoZSBsZW5ndGggb2YgdGhlIG1lc3NhZ2UgaXNcbiAgcGx1cyA2NCBiaXRzIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA1MTIuIFNvIHRoZSBsZW5ndGggb2YgdGhlXG4gIG1lc3NhZ2UgbXVzdCBiZSBjb25ncnVlbnQgdG8gNDQ4IG1vZCA1MTIgYmVjYXVzZSA1MTIgLSA2NCA9IDQ0OC5cblxuICBJbiBvcmRlciB0byBmaWxsIHVwIHRoZSBtZXNzYWdlIGxlbmd0aCBpdCBtdXN0IGJlIGZpbGxlZCB3aXRoXG4gIHBhZGRpbmcgdGhhdCBiZWdpbnMgd2l0aCAxIGJpdCBmb2xsb3dlZCBieSBhbGwgMCBiaXRzLiBQYWRkaW5nXG4gIG11c3QgKmFsd2F5cyogYmUgcHJlc2VudCwgc28gaWYgdGhlIG1lc3NhZ2UgbGVuZ3RoIGlzIGFscmVhZHlcbiAgY29uZ3J1ZW50IHRvIDQ0OCBtb2QgNTEyLCB0aGVuIDUxMiBwYWRkaW5nIGJpdHMgbXVzdCBiZSBhZGRlZC4gKi9cblxuICAvLyA1MTIgYml0cyA9PSA2NCBieXRlcywgNDQ4IGJpdHMgPT0gNTYgYnl0ZXMsIDY0IGJpdHMgPSA4IGJ5dGVzXG4gIC8vIF9wYWRkaW5nIHN0YXJ0cyB3aXRoIDEgYnl0ZSB3aXRoIGZpcnN0IGJpdCBpcyBzZXQgaW4gaXQgd2hpY2hcbiAgLy8gaXMgYnl0ZSB2YWx1ZSAxMjgsIHRoZW4gdGhlcmUgbWF5IGJlIHVwIHRvIDYzIG90aGVyIHBhZCBieXRlc1xuICB2YXIgbGVuID0gdGhpcy5tZXNzYWdlTGVuZ3RoO1xuICB2YXIgcGFkQnl0ZXMgPSBuZXcgc2hhMS5CdWZmZXIoKTtcbiAgcGFkQnl0ZXMuZGF0YSArPSB0aGlzLmlucHV0LmJ5dGVzKCk7XG4gIHBhZEJ5dGVzLmRhdGEgKz0gX3NoYTEucGFkZGluZy5zdWJzdHIoMCwgNjQgLSAoKGxlbiArIDgpICUgNjQpKTtcblxuICAvKiBOb3cgYXBwZW5kIGxlbmd0aCBvZiB0aGUgbWVzc2FnZS4gVGhlIGxlbmd0aCBpcyBhcHBlbmRlZCBpbiBiaXRzXG4gIGFzIGEgNjQtYml0IG51bWJlciBpbiBiaWctZW5kaWFuIG9yZGVyLiBTaW5jZSB3ZSBzdG9yZSB0aGUgbGVuZ3RoXG4gIGluIGJ5dGVzLCB3ZSBtdXN0IG11bHRpcGx5IGl0IGJ5IDggKG9yIGxlZnQgc2hpZnQgYnkgMykuIFNvIGhlcmVcbiAgc3RvcmUgdGhlIGhpZ2ggMyBiaXRzIGluIHRoZSBsb3cgZW5kIG9mIHRoZSBmaXJzdCAzMi1iaXRzIG9mIHRoZVxuICA2NC1iaXQgbnVtYmVyIGFuZCB0aGUgbG93ZXIgNSBiaXRzIGluIHRoZSBoaWdoIGVuZCBvZiB0aGUgc2Vjb25kXG4gIDMyLWJpdHMuICovXG4gIHBhZEJ5dGVzLnB1dEludDMyKChsZW4gPj4+IDI5KSAmIDB4RkYpO1xuICBwYWRCeXRlcy5wdXRJbnQzMigobGVuIDw8IDMpICYgMHhGRkZGRkZGRik7XG4gIF9zaGExLnVwZGF0ZSh0aGlzLnN0YXRlLCB0aGlzLndvcmRzLCBwYWRCeXRlcyk7XG4gIHZhciBydmFsID0gbmV3IHNoYTEuQnVmZmVyKCk7XG4gIHJ2YWwucHV0SW50MzIodGhpcy5zdGF0ZS5oMCk7XG4gIHJ2YWwucHV0SW50MzIodGhpcy5zdGF0ZS5oMSk7XG4gIHJ2YWwucHV0SW50MzIodGhpcy5zdGF0ZS5oMik7XG4gIHJ2YWwucHV0SW50MzIodGhpcy5zdGF0ZS5oMyk7XG4gIHJ2YWwucHV0SW50MzIodGhpcy5zdGF0ZS5oNCk7XG4gIHJldHVybiBydmFsLnRvSGV4KCk7XG59O1xuXG4vLyBwcml2YXRlIFNIQS0xIGRhdGFcbnZhciBfc2hhMSA9IHtcbiAgcGFkZGluZzogbnVsbCxcbiAgaW5pdGlhbGl6ZWQ6IGZhbHNlXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBjb25zdGFudCB0YWJsZXMuXG4gKi9cbl9zaGExLmluaXQgPSBmdW5jdGlvbigpIHtcbiAgLy8gY3JlYXRlIHBhZGRpbmdcbiAgX3NoYTEucGFkZGluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMTI4KTtcbiAgdmFyIGMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4MDApO1xuICB2YXIgbiA9IDY0O1xuICB3aGlsZShuID4gMCkge1xuICAgIGlmKG4gJiAxKSB7XG4gICAgICBfc2hhMS5wYWRkaW5nICs9IGM7XG4gICAgfVxuICAgIG4gPj4+PSAxO1xuICAgIGlmKG4gPiAwKSB7XG4gICAgICBjICs9IGM7XG4gICAgfVxuICB9XG5cbiAgLy8gbm93IGluaXRpYWxpemVkXG4gIF9zaGExLmluaXRpYWxpemVkID0gdHJ1ZTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyBhIFNIQS0xIHN0YXRlIHdpdGggdGhlIGdpdmVuIGJ5dGUgYnVmZmVyLlxuICpcbiAqIEBwYXJhbSBzIHRoZSBTSEEtMSBzdGF0ZSB0byB1cGRhdGUuXG4gKiBAcGFyYW0gdyB0aGUgYXJyYXkgdG8gdXNlIHRvIHN0b3JlIHdvcmRzLlxuICogQHBhcmFtIGlucHV0IHRoZSBpbnB1dCBieXRlIGJ1ZmZlci5cbiAqL1xuX3NoYTEudXBkYXRlID0gZnVuY3Rpb24ocywgdywgaW5wdXQpIHtcbiAgLy8gY29uc3VtZSA1MTIgYml0ICg2NCBieXRlKSBjaHVua3NcbiAgdmFyIHQsIGEsIGIsIGMsIGQsIGUsIGYsIGk7XG4gIHZhciBsZW4gPSBpbnB1dC5sZW5ndGgoKTtcbiAgd2hpbGUobGVuID49IDY0KSB7XG4gICAgLy8gdGhlIHcgYXJyYXkgd2lsbCBiZSBwb3B1bGF0ZWQgd2l0aCBzaXh0ZWVuIDMyLWJpdCBiaWctZW5kaWFuIHdvcmRzXG4gICAgLy8gYW5kIHRoZW4gZXh0ZW5kZWQgaW50byA4MCAzMi1iaXQgd29yZHMgYWNjb3JkaW5nIHRvIFNIQS0xIGFsZ29yaXRobVxuICAgIC8vIGFuZCBmb3IgMzItNzkgdXNpbmcgTWF4IExvY2t0eXVraGluJ3Mgb3B0aW1pemF0aW9uXG5cbiAgICAvLyBpbml0aWFsaXplIGhhc2ggdmFsdWUgZm9yIHRoaXMgY2h1bmtcbiAgICBhID0gcy5oMDtcbiAgICBiID0gcy5oMTtcbiAgICBjID0gcy5oMjtcbiAgICBkID0gcy5oMztcbiAgICBlID0gcy5oNDtcblxuICAgIC8vIHJvdW5kIDFcbiAgICBmb3IoaSA9IDA7IGkgPCAxNjsgKytpKSB7XG4gICAgICB0ID0gaW5wdXQuZ2V0SW50MzIoKTtcbiAgICAgIHdbaV0gPSB0O1xuICAgICAgZiA9IGQgXiAoYiAmIChjIF4gZCkpO1xuICAgICAgdCA9ICgoYSA8PCA1KSB8IChhID4+PiAyNykpICsgZiArIGUgKyAweDVBODI3OTk5ICsgdDtcbiAgICAgIGUgPSBkO1xuICAgICAgZCA9IGM7XG4gICAgICBjID0gKGIgPDwgMzApIHwgKGIgPj4+IDIpO1xuICAgICAgYiA9IGE7XG4gICAgICBhID0gdDtcbiAgICB9XG4gICAgZm9yKDsgaSA8IDIwOyArK2kpIHtcbiAgICAgIHQgPSAod1tpIC0gM10gXiB3W2kgLSA4XSBeIHdbaSAtIDE0XSBeIHdbaSAtIDE2XSk7XG4gICAgICB0ID0gKHQgPDwgMSkgfCAodCA+Pj4gMzEpO1xuICAgICAgd1tpXSA9IHQ7XG4gICAgICBmID0gZCBeIChiICYgKGMgXiBkKSk7XG4gICAgICB0ID0gKChhIDw8IDUpIHwgKGEgPj4+IDI3KSkgKyBmICsgZSArIDB4NUE4Mjc5OTkgKyB0O1xuICAgICAgZSA9IGQ7XG4gICAgICBkID0gYztcbiAgICAgIGMgPSAoYiA8PCAzMCkgfCAoYiA+Pj4gMik7XG4gICAgICBiID0gYTtcbiAgICAgIGEgPSB0O1xuICAgIH1cbiAgICAvLyByb3VuZCAyXG4gICAgZm9yKDsgaSA8IDMyOyArK2kpIHtcbiAgICAgIHQgPSAod1tpIC0gM10gXiB3W2kgLSA4XSBeIHdbaSAtIDE0XSBeIHdbaSAtIDE2XSk7XG4gICAgICB0ID0gKHQgPDwgMSkgfCAodCA+Pj4gMzEpO1xuICAgICAgd1tpXSA9IHQ7XG4gICAgICBmID0gYiBeIGMgXiBkO1xuICAgICAgdCA9ICgoYSA8PCA1KSB8IChhID4+PiAyNykpICsgZiArIGUgKyAweDZFRDlFQkExICsgdDtcbiAgICAgIGUgPSBkO1xuICAgICAgZCA9IGM7XG4gICAgICBjID0gKGIgPDwgMzApIHwgKGIgPj4+IDIpO1xuICAgICAgYiA9IGE7XG4gICAgICBhID0gdDtcbiAgICB9XG4gICAgZm9yKDsgaSA8IDQwOyArK2kpIHtcbiAgICAgIHQgPSAod1tpIC0gNl0gXiB3W2kgLSAxNl0gXiB3W2kgLSAyOF0gXiB3W2kgLSAzMl0pO1xuICAgICAgdCA9ICh0IDw8IDIpIHwgKHQgPj4+IDMwKTtcbiAgICAgIHdbaV0gPSB0O1xuICAgICAgZiA9IGIgXiBjIF4gZDtcbiAgICAgIHQgPSAoKGEgPDwgNSkgfCAoYSA+Pj4gMjcpKSArIGYgKyBlICsgMHg2RUQ5RUJBMSArIHQ7XG4gICAgICBlID0gZDtcbiAgICAgIGQgPSBjO1xuICAgICAgYyA9IChiIDw8IDMwKSB8IChiID4+PiAyKTtcbiAgICAgIGIgPSBhO1xuICAgICAgYSA9IHQ7XG4gICAgfVxuICAgIC8vIHJvdW5kIDNcbiAgICBmb3IoOyBpIDwgNjA7ICsraSkge1xuICAgICAgdCA9ICh3W2kgLSA2XSBeIHdbaSAtIDE2XSBeIHdbaSAtIDI4XSBeIHdbaSAtIDMyXSk7XG4gICAgICB0ID0gKHQgPDwgMikgfCAodCA+Pj4gMzApO1xuICAgICAgd1tpXSA9IHQ7XG4gICAgICBmID0gKGIgJiBjKSB8IChkICYgKGIgXiBjKSk7XG4gICAgICB0ID0gKChhIDw8IDUpIHwgKGEgPj4+IDI3KSkgKyBmICsgZSArIDB4OEYxQkJDREMgKyB0O1xuICAgICAgZSA9IGQ7XG4gICAgICBkID0gYztcbiAgICAgIGMgPSAoYiA8PCAzMCkgfCAoYiA+Pj4gMik7XG4gICAgICBiID0gYTtcbiAgICAgIGEgPSB0O1xuICAgIH1cbiAgICAvLyByb3VuZCA0XG4gICAgZm9yKDsgaSA8IDgwOyArK2kpIHtcbiAgICAgIHQgPSAod1tpIC0gNl0gXiB3W2kgLSAxNl0gXiB3W2kgLSAyOF0gXiB3W2kgLSAzMl0pO1xuICAgICAgdCA9ICh0IDw8IDIpIHwgKHQgPj4+IDMwKTtcbiAgICAgIHdbaV0gPSB0O1xuICAgICAgZiA9IGIgXiBjIF4gZDtcbiAgICAgIHQgPSAoKGEgPDwgNSkgfCAoYSA+Pj4gMjcpKSArIGYgKyBlICsgMHhDQTYyQzFENiArIHQ7XG4gICAgICBlID0gZDtcbiAgICAgIGQgPSBjO1xuICAgICAgYyA9IChiIDw8IDMwKSB8IChiID4+PiAyKTtcbiAgICAgIGIgPSBhO1xuICAgICAgYSA9IHQ7XG4gICAgfVxuXG4gICAgLy8gdXBkYXRlIGhhc2ggc3RhdGVcbiAgICBzLmgwICs9IGE7XG4gICAgcy5oMSArPSBiO1xuICAgIHMuaDIgKz0gYztcbiAgICBzLmgzICs9IGQ7XG4gICAgcy5oNCArPSBlO1xuXG4gICAgbGVuIC09IDY0O1xuICB9XG59O1xuXG59IC8vIGVuZCBub24tbm9kZWpzXG5cbmlmKCFYTUxTZXJpYWxpemVyKSB7XG5cbnZhciBfZGVmaW5lWE1MU2VyaWFsaXplciA9IGZ1bmN0aW9uKCkge1xuICBYTUxTZXJpYWxpemVyID0gcmVxdWlyZSgneG1sZG9tJykuWE1MU2VyaWFsaXplcjtcbn07XG5cbn0gLy8gZW5kIF9kZWZpbmVYTUxTZXJpYWxpemVyXG5cbi8vIGRlZmluZSBVUkwgcGFyc2VyXG4vLyBwYXJzZVVyaSAxLjIuMlxuLy8gKGMpIFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuLy8gTUlUIExpY2Vuc2Vcbi8vIHdpdGggbG9jYWwganNvbmxkLmpzIG1vZGlmaWNhdGlvbnNcbmpzb25sZC51cmwgPSB7fTtcbmpzb25sZC51cmwucGFyc2VycyA9IHtcbiAgc2ltcGxlOiB7XG4gICAgLy8gUkZDIDM5ODYgYmFzaWMgcGFydHNcbiAgICBrZXlzOiBbJ2hyZWYnLCdzY2hlbWUnLCdhdXRob3JpdHknLCdwYXRoJywncXVlcnknLCdmcmFnbWVudCddLFxuICAgIHJlZ2V4OiAvXig/OihbXjpcXC8/I10rKTopPyg/OlxcL1xcLyhbXlxcLz8jXSopKT8oW14/I10qKSg/OlxcPyhbXiNdKikpPyg/OiMoLiopKT8vXG4gIH0sXG4gIGZ1bGw6IHtcbiAgICBrZXlzOiBbJ2hyZWYnLCdwcm90b2NvbCcsJ3NjaGVtZScsJ2F1dGhvcml0eScsJ2F1dGgnLCd1c2VyJywncGFzc3dvcmQnLCdob3N0bmFtZScsJ3BvcnQnLCdwYXRoJywnZGlyZWN0b3J5JywnZmlsZScsJ3F1ZXJ5JywnZnJhZ21lbnQnXSxcbiAgICByZWdleDogL14oKFteOlxcLz8jXSspOik/KD86XFwvXFwvKCg/OigoW146QF0qKSg/OjooW146QF0qKSk/KT9AKT8oW146XFwvPyNdKikoPzo6KFxcZCopKT8pKT8oPzooKCg/OltePyNcXC9dKlxcLykqKShbXj8jXSopKSg/OlxcPyhbXiNdKikpPyg/OiMoLiopKT8pL1xuICB9XG59O1xuanNvbmxkLnVybC5wYXJzZSA9IGZ1bmN0aW9uKHN0ciwgcGFyc2VyKSB7XG4gIHZhciBwYXJzZWQgPSB7fTtcbiAgdmFyIG8gPSBqc29ubGQudXJsLnBhcnNlcnNbcGFyc2VyIHx8ICdmdWxsJ107XG4gIHZhciBtID0gby5yZWdleC5leGVjKHN0cik7XG4gIHZhciBpID0gby5rZXlzLmxlbmd0aDtcbiAgd2hpbGUoaS0tKSB7XG4gICAgcGFyc2VkW28ua2V5c1tpXV0gPSAobVtpXSA9PT0gdW5kZWZpbmVkKSA/IG51bGwgOiBtW2ldO1xuICB9XG4gIHBhcnNlZC5ub3JtYWxpemVkUGF0aCA9IF9yZW1vdmVEb3RTZWdtZW50cyhwYXJzZWQucGF0aCwgISFwYXJzZWQuYXV0aG9yaXR5KTtcbiAgcmV0dXJuIHBhcnNlZDtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBkb3Qgc2VnbWVudHMgZnJvbSBhIFVSTCBwYXRoLlxuICpcbiAqIEBwYXJhbSBwYXRoIHRoZSBwYXRoIHRvIHJlbW92ZSBkb3Qgc2VnbWVudHMgZnJvbS5cbiAqIEBwYXJhbSBoYXNBdXRob3JpdHkgdHJ1ZSBpZiB0aGUgVVJMIGhhcyBhbiBhdXRob3JpdHksIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX3JlbW92ZURvdFNlZ21lbnRzKHBhdGgsIGhhc0F1dGhvcml0eSkge1xuICB2YXIgcnZhbCA9ICcnO1xuXG4gIGlmKHBhdGguaW5kZXhPZignLycpID09PSAwKSB7XG4gICAgcnZhbCA9ICcvJztcbiAgfVxuXG4gIC8vIFJGQyAzOTg2IDUuMi40IChyZXdvcmtlZClcbiAgdmFyIGlucHV0ID0gcGF0aC5zcGxpdCgnLycpO1xuICB2YXIgb3V0cHV0ID0gW107XG4gIHdoaWxlKGlucHV0Lmxlbmd0aCA+IDApIHtcbiAgICBpZihpbnB1dFswXSA9PT0gJy4nIHx8IChpbnB1dFswXSA9PT0gJycgJiYgaW5wdXQubGVuZ3RoID4gMSkpIHtcbiAgICAgIGlucHV0LnNoaWZ0KCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYoaW5wdXRbMF0gPT09ICcuLicpIHtcbiAgICAgIGlucHV0LnNoaWZ0KCk7XG4gICAgICBpZihoYXNBdXRob3JpdHkgfHxcbiAgICAgICAgKG91dHB1dC5sZW5ndGggPiAwICYmIG91dHB1dFtvdXRwdXQubGVuZ3RoIC0gMV0gIT09ICcuLicpKSB7XG4gICAgICAgIG91dHB1dC5wb3AoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGxlYWRpbmcgcmVsYXRpdmUgVVJMICcuLidcbiAgICAgICAgb3V0cHV0LnB1c2goJy4uJyk7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgb3V0cHV0LnB1c2goaW5wdXQuc2hpZnQoKSk7XG4gIH1cblxuICByZXR1cm4gcnZhbCArIG91dHB1dC5qb2luKCcvJyk7XG59XG5cbmlmKF9ub2RlanMpIHtcbiAgLy8gdXNlIG5vZGUgZG9jdW1lbnQgbG9hZGVyIGJ5IGRlZmF1bHRcbiAganNvbmxkLnVzZURvY3VtZW50TG9hZGVyKCdub2RlJyk7XG59IGVsc2UgaWYodHlwZW9mIFhNTEh0dHBSZXF1ZXN0ICE9PSAndW5kZWZpbmVkJykge1xuICAvLyB1c2UgeGhyIGRvY3VtZW50IGxvYWRlciBieSBkZWZhdWx0XG4gIGpzb25sZC51c2VEb2N1bWVudExvYWRlcigneGhyJyk7XG59XG5cbmlmKF9ub2RlanMpIHtcbiAganNvbmxkLnVzZSA9IGZ1bmN0aW9uKGV4dGVuc2lvbikge1xuICAgIHN3aXRjaChleHRlbnNpb24pIHtcbiAgICAgIGNhc2UgJ3JlcXVlc3QnOlxuICAgICAgICAvLyB1c2Ugbm9kZSBKU09OLUxEIHJlcXVlc3QgZXh0ZW5zaW9uXG4gICAgICAgIGpzb25sZC5yZXF1ZXN0ID0gcmVxdWlyZSgnLi9yZXF1ZXN0Jyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdVbmtub3duIGV4dGVuc2lvbi4nLFxuICAgICAgICAgICdqc29ubGQuVW5rbm93bkV4dGVuc2lvbicsIHtleHRlbnNpb246IGV4dGVuc2lvbn0pO1xuICAgIH1cbiAgfTtcblxuICAvLyBleHBvc2UgdmVyc2lvblxuICB2YXIgX21vZHVsZSA9IHtleHBvcnRzOiB7fSwgZmlsZW5hbWU6IF9fZGlybmFtZX07XG4gIHJlcXVpcmUoJ3BrZ2luZm8nKShfbW9kdWxlLCAndmVyc2lvbicpO1xuICBqc29ubGQudmVyc2lvbiA9IF9tb2R1bGUuZXhwb3J0cy52ZXJzaW9uO1xufVxuXG4vLyBlbmQgb2YganNvbmxkIEFQSSBmYWN0b3J5XG5yZXR1cm4ganNvbmxkO1xufTtcblxuLy8gZXh0ZXJuYWwgQVBJczpcblxuLy8gdXNlZCB0byBnZW5lcmF0ZSBhIG5ldyBqc29ubGQgQVBJIGluc3RhbmNlXG52YXIgZmFjdG9yeSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gd3JhcHBlcihmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZmFjdG9yeSgpO1xuICB9KTtcbn07XG5cbmlmKCFfbm9kZWpzICYmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpKSB7XG4gIC8vIGV4cG9ydCBBTUQgQVBJXG4gIGRlZmluZShbXSwgZnVuY3Rpb24oKSB7XG4gICAgLy8gbm93IHRoYXQgbW9kdWxlIGlzIGRlZmluZWQsIHdyYXAgbWFpbiBqc29ubGQgQVBJIGluc3RhbmNlXG4gICAgd3JhcHBlcihmYWN0b3J5KTtcbiAgICByZXR1cm4gZmFjdG9yeTtcbiAgfSk7XG59IGVsc2Uge1xuICAvLyB3cmFwIHRoZSBtYWluIGpzb25sZCBBUEkgaW5zdGFuY2VcbiAgd3JhcHBlcihmYWN0b3J5KTtcblxuICBpZih0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gZXhwb3J0IENvbW1vbkpTL25vZGVqcyBBUElcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnk7XG4gIH1cblxuICBpZihfYnJvd3Nlcikge1xuICAgIC8vIGV4cG9ydCBzaW1wbGUgYnJvd3NlciBBUElcbiAgICBpZih0eXBlb2YganNvbmxkID09PSAndW5kZWZpbmVkJykge1xuICAgICAganNvbmxkID0ganNvbmxkanMgPSBmYWN0b3J5O1xuICAgIH0gZWxzZSB7XG4gICAgICBqc29ubGRqcyA9IGZhY3Rvcnk7XG4gICAgfVxuICB9XG59XG5cbnJldHVybiBmYWN0b3J5O1xuXG59KSgpO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInNmYXV1UFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30sXCIvLi4vbm9kZV9tb2R1bGVzL2pzb25sZC9qc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuLyohXG4gKiBAb3ZlcnZpZXcgZXM2LXByb21pc2UgLSBhIHRpbnkgaW1wbGVtZW50YXRpb24gb2YgUHJvbWlzZXMvQSsuXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCAoYykgMjAxNCBZZWh1ZGEgS2F0eiwgVG9tIERhbGUsIFN0ZWZhbiBQZW5uZXIgYW5kIGNvbnRyaWJ1dG9ycyAoQ29udmVyc2lvbiB0byBFUzYgQVBJIGJ5IEpha2UgQXJjaGliYWxkKVxuICogQGxpY2Vuc2UgICBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogICAgICAgICAgICBTZWUgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2pha2VhcmNoaWJhbGQvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgMi4wLjFcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyB8fCAodHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJGlzRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZSh4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGw7XG4gICAgfVxuXG4gICAgdmFyICQkdXRpbHMkJF9pc0FycmF5O1xuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KSB7XG4gICAgICAkJHV0aWxzJCRfaXNBcnJheSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAkJHV0aWxzJCRfaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG4gICAgfVxuXG4gICAgdmFyICQkdXRpbHMkJGlzQXJyYXkgPSAkJHV0aWxzJCRfaXNBcnJheTtcbiAgICB2YXIgJCR1dGlscyQkbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcbiAgICBmdW5jdGlvbiAkJHV0aWxzJCRGKCkgeyB9XG5cbiAgICB2YXIgJCR1dGlscyQkb19jcmVhdGUgPSAoT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAobykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2Vjb25kIGFyZ3VtZW50IG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgIH1cbiAgICAgICQkdXRpbHMkJEYucHJvdG90eXBlID0gbztcbiAgICAgIHJldHVybiBuZXcgJCR1dGlscyQkRigpO1xuICAgIH0pO1xuXG4gICAgdmFyICQkYXNhcCQkbGVuID0gMDtcblxuICAgIHZhciAkJGFzYXAkJGRlZmF1bHQgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgICAgICQkYXNhcCQkcXVldWVbJCRhc2FwJCRsZW5dID0gY2FsbGJhY2s7XG4gICAgICAkJGFzYXAkJHF1ZXVlWyQkYXNhcCQkbGVuICsgMV0gPSBhcmc7XG4gICAgICAkJGFzYXAkJGxlbiArPSAyO1xuICAgICAgaWYgKCQkYXNhcCQkbGVuID09PSAyKSB7XG4gICAgICAgIC8vIElmIGxlbiBpcyAxLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAgICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAgICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2goKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyICQkYXNhcCQkYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbiAgICB2YXIgJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9ICQkYXNhcCQkYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8ICQkYXNhcCQkYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuXG4gICAgLy8gdGVzdCBmb3Igd2ViIHdvcmtlciBidXQgbm90IGluIElFMTBcbiAgICB2YXIgJCRhc2FwJCRpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcblxuICAgIC8vIG5vZGVcbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU5leHRUaWNrKCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCQkYXNhcCQkZmx1c2gpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcigkJGFzYXAkJGZsdXNoKTtcbiAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7IGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgbm9kZS5kYXRhID0gKGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gd2ViIHdvcmtlclxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSAkJGFzYXAkJGZsdXNoO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VTZXRUaW1lb3V0KCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KCQkYXNhcCQkZmx1c2gsIDEpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgJCRhc2FwJCRxdWV1ZSA9IG5ldyBBcnJheSgxMDAwKTtcblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkZmx1c2goKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8ICQkYXNhcCQkbGVuOyBpKz0yKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9ICQkYXNhcCQkcXVldWVbaV07XG4gICAgICAgIHZhciBhcmcgPSAkJGFzYXAkJHF1ZXVlW2krMV07XG5cbiAgICAgICAgY2FsbGJhY2soYXJnKTtcblxuICAgICAgICAkJGFzYXAkJHF1ZXVlW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICAkJGFzYXAkJHF1ZXVlW2krMV0gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgICQkYXNhcCQkbGVuID0gMDtcbiAgICB9XG5cbiAgICB2YXIgJCRhc2FwJCRzY2hlZHVsZUZsdXNoO1xuXG4gICAgLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VOZXh0VGljaygpO1xuICAgIH0gZWxzZSBpZiAoJCRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG4gICAgfSBlbHNlIGlmICgkJGFzYXAkJGlzV29ya2VyKSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZU1lc3NhZ2VDaGFubmVsKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlU2V0VGltZW91dCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRub29wKCkge31cbiAgICB2YXIgJCQkaW50ZXJuYWwkJFBFTkRJTkcgICA9IHZvaWQgMDtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJEZVTEZJTExFRCA9IDE7XG4gICAgdmFyICQkJGludGVybmFsJCRSRUpFQ1RFRCAgPSAyO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IgPSBuZXcgJCQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS4nKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRnZXRUaGVuKHByb21pc2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwcm9taXNlLnRoZW47XG4gICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgICAgICByZXR1cm4gJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCR0cnlUaGVuKHRoZW4sIHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoZW4uY2FsbCh2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuKSB7XG4gICAgICAgJCRhc2FwJCRkZWZhdWx0KGZ1bmN0aW9uKHByb21pc2UpIHtcbiAgICAgICAgdmFyIHNlYWxlZCA9IGZhbHNlO1xuICAgICAgICB2YXIgZXJyb3IgPSAkJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB0aGVuYWJsZSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICAgICAgaWYgKHRoZW5hYmxlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG5cbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0sICdTZXR0bGU6ICcgKyAocHJvbWlzZS5fbGFiZWwgfHwgJyB1bmtub3duIHByb21pc2UnKSk7XG5cbiAgICAgICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9LCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUpIHtcbiAgICAgIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2UgaWYgKHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSkge1xuICAgICAgaWYgKG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IgPT09IHByb21pc2UuY29uc3RydWN0b3IpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRoZW4gPSAkJCRpbnRlcm5hbCQkZ2V0VGhlbihtYXliZVRoZW5hYmxlKTtcblxuICAgICAgICBpZiAodGhlbiA9PT0gJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9IGVsc2UgaWYgKCQkdXRpbHMkJGlzRnVuY3Rpb24odGhlbikpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRzZWxmRnVsbGZpbGxtZW50KCkpO1xuICAgICAgfSBlbHNlIGlmICgkJHV0aWxzJCRvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICAgICAgaWYgKHByb21pc2UuX29uZXJyb3IpIHtcbiAgICAgICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICAgICAgfVxuXG4gICAgICAkJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykgeyByZXR1cm47IH1cblxuICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gdmFsdWU7XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9ICQkJGludGVybmFsJCRGVUxGSUxMRUQ7XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaCwgcHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG4gICAgICBwcm9taXNlLl9zdGF0ZSA9ICQkJGludGVybmFsJCRSRUpFQ1RFRDtcbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHJlYXNvbjtcblxuICAgICAgJCRhc2FwJCRkZWZhdWx0KCQkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIGxlbmd0aCA9IHN1YnNjcmliZXJzLmxlbmd0aDtcblxuICAgICAgcGFyZW50Ll9vbmVycm9yID0gbnVsbDtcblxuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgJCQkaW50ZXJuYWwkJEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgJCQkaW50ZXJuYWwkJFJFSkVDVEVEXSAgPSBvblJlamVjdGlvbjtcblxuICAgICAgaWYgKGxlbmd0aCA9PT0gMCAmJiBwYXJlbnQuX3N0YXRlKSB7XG4gICAgICAgICQkYXNhcCQkZGVmYXVsdCgkJCRpbnRlcm5hbCQkcHVibGlzaCwgcGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycztcbiAgICAgIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHsgcmV0dXJuOyB9XG5cbiAgICAgIHZhciBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCA9IHByb21pc2UuX3Jlc3VsdDtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgICAgICBpZiAoY2hpbGQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKSB7XG4gICAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUiA9IG5ldyAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKTtcblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICAgICAgcmV0dXJuICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHZhciBoYXNDYWxsYmFjayA9ICQkdXRpbHMkJGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgICAgIHZhbHVlLCBlcnJvciwgc3VjY2VlZGVkLCBmYWlsZWQ7XG5cbiAgICAgIGlmIChoYXNDYWxsYmFjaykge1xuICAgICAgICB2YWx1ZSA9ICQkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKTtcblxuICAgICAgICBpZiAodmFsdWUgPT09ICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IpIHtcbiAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gZGV0YWlsO1xuICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIC8vIG5vb3BcbiAgICAgIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoZmFpbGVkKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZShwcm9taXNlLCByZXNvbHZlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpe1xuICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkZW51bWVyYXRvciQkbWFrZVNldHRsZWRSZXN1bHQoc3RhdGUsIHBvc2l0aW9uLCB2YWx1ZSkge1xuICAgICAgaWYgKHN0YXRlID09PSAkJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdGU6ICdmdWxmaWxsZWQnLFxuICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdGF0ZTogJ3JlamVjdGVkJyxcbiAgICAgICAgICByZWFzb246IHZhbHVlXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkZW51bWVyYXRvciQkRW51bWVyYXRvcihDb25zdHJ1Y3RvciwgaW5wdXQsIGFib3J0T25SZWplY3QsIGxhYmVsKSB7XG4gICAgICB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gICAgICB0aGlzLnByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgIHRoaXMuX2Fib3J0T25SZWplY3QgPSBhYm9ydE9uUmVqZWN0O1xuXG4gICAgICBpZiAodGhpcy5fdmFsaWRhdGVJbnB1dChpbnB1dCkpIHtcbiAgICAgICAgdGhpcy5faW5wdXQgICAgID0gaW5wdXQ7XG4gICAgICAgIHRoaXMubGVuZ3RoICAgICA9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nID0gaW5wdXQubGVuZ3RoO1xuXG4gICAgICAgIHRoaXMuX2luaXQoKTtcblxuICAgICAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAwO1xuICAgICAgICAgIHRoaXMuX2VudW1lcmF0ZSgpO1xuICAgICAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QodGhpcy5wcm9taXNlLCB0aGlzLl92YWxpZGF0aW9uRXJyb3IoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRlSW5wdXQgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuICQkdXRpbHMkJGlzQXJyYXkoaW5wdXQpO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fdmFsaWRhdGlvbkVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG4gICAgfTtcblxuICAgIHZhciAkJCRlbnVtZXJhdG9yJCRkZWZhdWx0ID0gJCQkZW51bWVyYXRvciQkRW51bWVyYXRvcjtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lbnVtZXJhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsZW5ndGggID0gdGhpcy5sZW5ndGg7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcbiAgICAgIHZhciBpbnB1dCAgID0gdGhpcy5faW5wdXQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbihlbnRyeSwgaSkge1xuICAgICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgICAgaWYgKCQkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZShlbnRyeSkpIHtcbiAgICAgICAgaWYgKGVudHJ5LmNvbnN0cnVjdG9yID09PSBjICYmIGVudHJ5Ll9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgICBlbnRyeS5fb25lcnJvciA9IG51bGw7XG4gICAgICAgICAgdGhpcy5fc2V0dGxlZEF0KGVudHJ5Ll9zdGF0ZSwgaSwgZW50cnkuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KGMucmVzb2x2ZShlbnRyeSksIGkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcbiAgICAgICAgdGhpcy5fcmVzdWx0W2ldID0gdGhpcy5fbWFrZVJlc3VsdCgkJCRpbnRlcm5hbCQkRlVMRklMTEVELCBpLCBlbnRyeSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbihzdGF0ZSwgaSwgdmFsdWUpIHtcbiAgICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICAgIGlmICh0aGlzLl9hYm9ydE9uUmVqZWN0ICYmIHN0YXRlID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB0aGlzLl9tYWtlUmVzdWx0KHN0YXRlLCBpLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fbWFrZVJlc3VsdCA9IGZ1bmN0aW9uKHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fd2lsbFNldHRsZUF0ID0gZnVuY3Rpb24ocHJvbWlzZSwgaSkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuXG4gICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHByb21pc2UsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KCQkJGludGVybmFsJCRGVUxGSUxMRUQsIGksIHZhbHVlKTtcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoJCQkaW50ZXJuYWwkJFJFSkVDVEVELCBpLCByZWFzb24pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkYWxsJCRkZWZhdWx0ID0gZnVuY3Rpb24gYWxsKGVudHJpZXMsIGxhYmVsKSB7XG4gICAgICByZXR1cm4gbmV3ICQkJGVudW1lcmF0b3IkJGRlZmF1bHQodGhpcywgZW50cmllcywgdHJ1ZSAvKiBhYm9ydCBvbiByZWplY3QgKi8sIGxhYmVsKS5wcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJhY2UkJGRlZmF1bHQgPSBmdW5jdGlvbiByYWNlKGVudHJpZXMsIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcblxuICAgICAgaWYgKCEkJHV0aWxzJCRpc0FycmF5KGVudHJpZXMpKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG5cbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcblxuICAgICAgZnVuY3Rpb24gb25GdWxmaWxsbWVudCh2YWx1ZSkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG9uUmVqZWN0aW9uKHJlYXNvbikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUoQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKSwgdW5kZWZpbmVkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQgPSBmdW5jdGlvbiByZXNvbHZlKG9iamVjdCwgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gICAgICBpZiAob2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdC5jb25zdHJ1Y3RvciA9PT0gQ29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgIH1cblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3AsIGxhYmVsKTtcbiAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQgPSBmdW5jdGlvbiByZWplY3QocmVhc29uLCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIgPSAwO1xuXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc1Jlc29sdmVyKCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNOZXcoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO1xuICAgIH1cblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2U7XG5cbiAgICAvKipcbiAgICAgIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgICAgIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsIHdoaWNoXG4gICAgICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZeKAmXMgZXZlbnR1YWwgdmFsdWUgb3IgdGhlIHJlYXNvblxuICAgICAgd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIFRlcm1pbm9sb2d5XG4gICAgICAtLS0tLS0tLS0tLVxuXG4gICAgICAtIGBwcm9taXNlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aCBhIGB0aGVuYCBtZXRob2Qgd2hvc2UgYmVoYXZpb3IgY29uZm9ybXMgdG8gdGhpcyBzcGVjaWZpY2F0aW9uLlxuICAgICAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAgICAgLSBgdmFsdWVgIGlzIGFueSBsZWdhbCBKYXZhU2NyaXB0IHZhbHVlIChpbmNsdWRpbmcgdW5kZWZpbmVkLCBhIHRoZW5hYmxlLCBvciBhIHByb21pc2UpLlxuICAgICAgLSBgZXhjZXB0aW9uYCBpcyBhIHZhbHVlIHRoYXQgaXMgdGhyb3duIHVzaW5nIHRoZSB0aHJvdyBzdGF0ZW1lbnQuXG4gICAgICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gICAgICAtIGBzZXR0bGVkYCB0aGUgZmluYWwgcmVzdGluZyBzdGF0ZSBvZiBhIHByb21pc2UsIGZ1bGZpbGxlZCBvciByZWplY3RlZC5cblxuICAgICAgQSBwcm9taXNlIGNhbiBiZSBpbiBvbmUgb2YgdGhyZWUgc3RhdGVzOiBwZW5kaW5nLCBmdWxmaWxsZWQsIG9yIHJlamVjdGVkLlxuXG4gICAgICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICAgICAgc3RhdGUuICBQcm9taXNlcyB0aGF0IGFyZSByZWplY3RlZCBoYXZlIGEgcmVqZWN0aW9uIHJlYXNvbiBhbmQgYXJlIGluIHRoZVxuICAgICAgcmVqZWN0ZWQgc3RhdGUuICBBIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5ldmVyIGEgdGhlbmFibGUuXG5cbiAgICAgIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICAgICAgcHJvbWlzZSwgdGhlbiB0aGUgb3JpZ2luYWwgcHJvbWlzZSdzIHNldHRsZWQgc3RhdGUgd2lsbCBtYXRjaCB0aGUgdmFsdWUnc1xuICAgICAgc2V0dGxlZCBzdGF0ZS4gIFNvIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgcmVqZWN0cyB3aWxsXG4gICAgICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gICAgICBpdHNlbGYgZnVsZmlsbC5cblxuXG4gICAgICBCYXNpYyBVc2FnZTpcbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBgYGBqc1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgLy8gb24gc3VjY2Vzc1xuICAgICAgICByZXNvbHZlKHZhbHVlKTtcblxuICAgICAgICAvLyBvbiBmYWlsdXJlXG4gICAgICAgIHJlamVjdChyZWFzb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS0tLS1cblxuICAgICAgUHJvbWlzZXMgc2hpbmUgd2hlbiBhYnN0cmFjdGluZyBhd2F5IGFzeW5jaHJvbm91cyBpbnRlcmFjdGlvbnMgc3VjaCBhc1xuICAgICAgYFhNTEh0dHBSZXF1ZXN0YHMuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBnZXRKU09OKHVybCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgICB4aHIub3BlbignR0VUJywgdXJsKTtcbiAgICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlcjtcbiAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgIHhoci5zZW5kKCk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gdGhpcy5ET05FKSB7XG4gICAgICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdnZXRKU09OOiBgJyArIHVybCArICdgIGZhaWxlZCB3aXRoIHN0YXR1czogWycgKyB0aGlzLnN0YXR1cyArICddJykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGdldEpTT04oJy9wb3N0cy5qc29uJykudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgLy8gb24gcmVqZWN0aW9uXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBVbmxpa2UgY2FsbGJhY2tzLCBwcm9taXNlcyBhcmUgZ3JlYXQgY29tcG9zYWJsZSBwcmltaXRpdmVzLlxuXG4gICAgICBgYGBqc1xuICAgICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBnZXRKU09OKCcvcG9zdHMnKSxcbiAgICAgICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgICAgIF0pLnRoZW4oZnVuY3Rpb24odmFsdWVzKXtcbiAgICAgICAgdmFsdWVzWzBdIC8vID0+IHBvc3RzSlNPTlxuICAgICAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBjbGFzcyBQcm9taXNlXG4gICAgICBAcGFyYW0ge2Z1bmN0aW9ufSByZXNvbHZlclxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQGNvbnN0cnVjdG9yXG4gICAgKi9cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgIHRoaXMuX2lkID0gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRjb3VudGVyKys7XG4gICAgICB0aGlzLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3N1YnNjcmliZXJzID0gW107XG5cbiAgICAgIGlmICgkJCRpbnRlcm5hbCQkbm9vcCAhPT0gcmVzb2x2ZXIpIHtcbiAgICAgICAgaWYgKCEkJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmVyKSkge1xuICAgICAgICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSkpIHtcbiAgICAgICAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCk7XG4gICAgICAgIH1cblxuICAgICAgICAkJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5hbGwgPSAkJHByb21pc2UkYWxsJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yYWNlID0gJCRwcm9taXNlJHJhY2UkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlc29sdmUgPSAkJHByb21pc2UkcmVzb2x2ZSQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVqZWN0ID0gJCRwcm9taXNlJHJlamVjdCQkZGVmYXVsdDtcblxuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5wcm90b3R5cGUgPSB7XG4gICAgICBjb25zdHJ1Y3RvcjogJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLFxuXG4gICAgLyoqXG4gICAgICBUaGUgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCxcbiAgICAgIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gICAgICByZWFzb24gd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgIC8vIHVzZXIgaXMgYXZhaWxhYmxlXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyB1c2VyIGlzIHVuYXZhaWxhYmxlLCBhbmQgeW91IGFyZSBnaXZlbiB0aGUgcmVhc29uIHdoeVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQ2hhaW5pbmdcbiAgICAgIC0tLS0tLS0tXG5cbiAgICAgIFRoZSByZXR1cm4gdmFsdWUgb2YgYHRoZW5gIGlzIGl0c2VsZiBhIHByb21pc2UuICBUaGlzIHNlY29uZCwgJ2Rvd25zdHJlYW0nXG4gICAgICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gICAgICBvciByZWplY3Rpb24gaGFuZGxlciwgb3IgcmVqZWN0ZWQgaWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gdXNlci5uYW1lO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICByZXR1cm4gJ2RlZmF1bHQgbmFtZSc7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh1c2VyTmFtZSkge1xuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgICAgIC8vIHdpbGwgYmUgYCdkZWZhdWx0IG5hbWUnYFxuICAgICAgfSk7XG5cbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jyk7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBpZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHJlYXNvbmAgd2lsbCBiZSAnRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknLlxuICAgICAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgICAgIH0pO1xuICAgICAgYGBgXG4gICAgICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgUGVkYWdvZ2ljYWxFeGNlcHRpb24oJ1Vwc3RyZWFtIGVycm9yJyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIFRoZSBgUGVkZ2Fnb2NpYWxFeGNlcHRpb25gIGlzIHByb3BhZ2F0ZWQgYWxsIHRoZSB3YXkgZG93biB0byBoZXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBc3NpbWlsYXRpb25cbiAgICAgIC0tLS0tLS0tLS0tLVxuXG4gICAgICBTb21ldGltZXMgdGhlIHZhbHVlIHlvdSB3YW50IHRvIHByb3BhZ2F0ZSB0byBhIGRvd25zdHJlYW0gcHJvbWlzZSBjYW4gb25seSBiZVxuICAgICAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICAgICAgZnVsZmlsbG1lbnQgb3IgcmVqZWN0aW9uIGhhbmRsZXIuIFRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCB0aGVuIGJlIHBlbmRpbmdcbiAgICAgIHVudGlsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlzIHNldHRsZWQuIFRoaXMgaXMgY2FsbGVkICphc3NpbWlsYXRpb24qLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIFRoZSB1c2VyJ3MgY29tbWVudHMgYXJlIG5vdyBhdmFpbGFibGVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCByZWplY3RzLCB3ZSdsbCBoYXZlIHRoZSByZWFzb24gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgU2ltcGxlIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kUmVzdWx0KGZ1bmN0aW9uKHJlc3VsdCwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZFJlc3VsdCgpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQWR2YW5jZWQgRXhhbXBsZVxuICAgICAgLS0tLS0tLS0tLS0tLS1cblxuICAgICAgU3luY2hyb25vdXMgRXhhbXBsZVxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgYXV0aG9yLCBib29rcztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXV0aG9yID0gZmluZEF1dGhvcigpO1xuICAgICAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9XG4gICAgICBgYGBcblxuICAgICAgRXJyYmFjayBFeGFtcGxlXG5cbiAgICAgIGBgYGpzXG5cbiAgICAgIGZ1bmN0aW9uIGZvdW5kQm9va3MoYm9va3MpIHtcblxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuXG4gICAgICB9XG5cbiAgICAgIGZpbmRBdXRob3IoZnVuY3Rpb24oYXV0aG9yLCBlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIC8vIGZhaWx1cmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZmluZEJvb29rc0J5QXV0aG9yKGF1dGhvciwgZnVuY3Rpb24oYm9va3MsIGVycikge1xuICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoKHJlYXNvbikge1xuICAgICAgICAgICAgICAgICAgZmFpbHVyZShyZWFzb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFByb21pc2UgRXhhbXBsZTtcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgZmluZEF1dGhvcigpLlxuICAgICAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICAgICAgdGhlbihmdW5jdGlvbihib29rcyl7XG4gICAgICAgICAgLy8gZm91bmQgYm9va3NcbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIHRoZW5cbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGVkXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAgICovXG4gICAgICB0aGVuOiBmdW5jdGlvbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICAgICAgdmFyIHN0YXRlID0gcGFyZW50Ll9zdGF0ZTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQgJiYgIW9uRnVsZmlsbG1lbnQgfHwgc3RhdGUgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCAmJiAhb25SZWplY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHBhcmVudC5fcmVzdWx0O1xuXG4gICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tzdGF0ZSAtIDFdO1xuICAgICAgICAgICQkYXNhcCQkZGVmYXVsdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHN0YXRlLCBjaGlsZCwgY2FsbGJhY2ssIHJlc3VsdCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICB9LFxuXG4gICAgLyoqXG4gICAgICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gICAgICBhcyB0aGUgY2F0Y2ggYmxvY2sgb2YgYSB0cnkvY2F0Y2ggc3RhdGVtZW50LlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZmluZEF1dGhvcigpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkbid0IGZpbmQgdGhhdCBhdXRob3InKTtcbiAgICAgIH1cblxuICAgICAgLy8gc3luY2hyb25vdXNcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbmRBdXRob3IoKTtcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9XG5cbiAgICAgIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgICAgIGZpbmRBdXRob3IoKS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCBjYXRjaFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3Rpb25cbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICAgKi9cbiAgICAgICdjYXRjaCc6IGZ1bmN0aW9uKG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgJCRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdCA9IGZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgICAgdmFyIGxvY2FsO1xuXG4gICAgICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbG9jYWwgPSBnbG9iYWw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5kb2N1bWVudCkge1xuICAgICAgICBsb2NhbCA9IHdpbmRvdztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvY2FsID0gc2VsZjtcbiAgICAgIH1cblxuICAgICAgdmFyIGVzNlByb21pc2VTdXBwb3J0ID1cbiAgICAgICAgXCJQcm9taXNlXCIgaW4gbG9jYWwgJiZcbiAgICAgICAgLy8gU29tZSBvZiB0aGVzZSBtZXRob2RzIGFyZSBtaXNzaW5nIGZyb21cbiAgICAgICAgLy8gRmlyZWZveC9DaHJvbWUgZXhwZXJpbWVudGFsIGltcGxlbWVudGF0aW9uc1xuICAgICAgICBcInJlc29sdmVcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmVqZWN0XCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcImFsbFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJyYWNlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICAvLyBPbGRlciB2ZXJzaW9uIG9mIHRoZSBzcGVjIGhhZCBhIHJlc29sdmVyIG9iamVjdFxuICAgICAgICAvLyBhcyB0aGUgYXJnIHJhdGhlciB0aGFuIGEgZnVuY3Rpb25cbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciByZXNvbHZlO1xuICAgICAgICAgIG5ldyBsb2NhbC5Qcm9taXNlKGZ1bmN0aW9uKHIpIHsgcmVzb2x2ZSA9IHI7IH0pO1xuICAgICAgICAgIHJldHVybiAkJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmUpO1xuICAgICAgICB9KCkpO1xuXG4gICAgICBpZiAoIWVzNlByb21pc2VTdXBwb3J0KSB7XG4gICAgICAgIGxvY2FsLlByb21pc2UgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQ7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2UgPSB7XG4gICAgICAnUHJvbWlzZSc6ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdCxcbiAgICAgICdwb2x5ZmlsbCc6ICQkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHRcbiAgICB9O1xuXG4gICAgLyogZ2xvYmFsIGRlZmluZTp0cnVlIG1vZHVsZTp0cnVlIHdpbmRvdzogdHJ1ZSAqL1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZVsnYW1kJ10pIHtcbiAgICAgIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTsgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGVbJ2V4cG9ydHMnXSkge1xuICAgICAgbW9kdWxlWydleHBvcnRzJ10gPSBlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXNbJ0VTNlByb21pc2UnXSA9IGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9XG59KS5jYWxsKHRoaXMpO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJzZmF1dVBcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoX19kaXJuYW1lKXtcbi8qXG4gKiBwa2dpbmZvLmpzOiBUb3AtbGV2ZWwgaW5jbHVkZSBmb3IgdGhlIHBrZ2luZm8gbW9kdWxlXG4gKlxuICogKEMpIDIwMTEsIENoYXJsaWUgUm9iYmluc1xuICpcbiAqL1xuIFxudmFyIGZzID0gcmVxdWlyZSgnZnMnKSxcbiAgICBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG4vL1xuLy8gIyMjIGZ1bmN0aW9uIHBrZ2luZm8gKFtvcHRpb25zLCAncHJvcGVydHknLCAncHJvcGVydHknIC4uXSlcbi8vICMjIyMgQHBtb2R1bGUge01vZHVsZX0gUGFyZW50IG1vZHVsZSB0byByZWFkIGZyb20uXG4vLyAjIyMjIEBvcHRpb25zIHtPYmplY3R8QXJyYXl8c3RyaW5nfSAqKk9wdGlvbmFsKiogT3B0aW9ucyB1c2VkIHdoZW4gZXhwb3NpbmcgcHJvcGVydGllcy5cbi8vICMjIyMgQGFyZ3VtZW50cyB7c3RyaW5nLi4ufSAqKk9wdGlvbmFsKiogU3BlY2lmaWVkIHByb3BlcnRpZXMgdG8gZXhwb3NlLlxuLy8gRXhwb3NlcyBwcm9wZXJ0aWVzIGZyb20gdGhlIHBhY2thZ2UuanNvbiBmaWxlIGZvciB0aGUgcGFyZW50IG1vZHVsZSBvbiBcbi8vIGl0J3MgZXhwb3J0cy4gVmFsaWQgdXNhZ2U6XG4vL1xuLy8gYHJlcXVpcmUoJ3BrZ2luZm8nKSgpYFxuLy9cbi8vIGByZXF1aXJlKCdwa2dpbmZvJykoJ3ZlcnNpb24nLCAnYXV0aG9yJyk7YFxuLy9cbi8vIGByZXF1aXJlKCdwa2dpbmZvJykoWyd2ZXJzaW9uJywgJ2F1dGhvciddKTtgXG4vL1xuLy8gYHJlcXVpcmUoJ3BrZ2luZm8nKSh7IGluY2x1ZGU6IFsndmVyc2lvbicsICdhdXRob3InXSB9KTtgXG4vL1xudmFyIHBrZ2luZm8gPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwbW9kdWxlLCBvcHRpb25zKSB7XG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpLmZpbHRlcihmdW5jdGlvbiAoYXJnKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xuICB9KTtcbiAgXG4gIC8vXG4gIC8vICoqUGFyc2UgdmFyaWFibGUgYXJndW1lbnRzKipcbiAgLy9cbiAgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucykpIHtcbiAgICAvL1xuICAgIC8vIElmIHRoZSBvcHRpb25zIHBhc3NlZCBpbiBpcyBhbiBBcnJheSBhc3N1bWUgdGhhdFxuICAgIC8vIGl0IGlzIHRoZSBBcnJheSBvZiBwcm9wZXJ0aWVzIHRvIGV4cG9zZSBmcm9tIHRoZVxuICAgIC8vIG9uIHRoZSBwYWNrYWdlLmpzb24gZmlsZSBvbiB0aGUgcGFyZW50IG1vZHVsZS5cbiAgICAvL1xuICAgIG9wdGlvbnMgPSB7IGluY2x1ZGU6IG9wdGlvbnMgfTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpIHtcbiAgICAvL1xuICAgIC8vIE90aGVyd2lzZSBpZiB0aGUgZmlyc3QgYXJndW1lbnQgaXMgYSBzdHJpbmcsIHRoZW5cbiAgICAvLyBhc3N1bWUgdGhhdCBpdCBpcyB0aGUgZmlyc3QgcHJvcGVydHkgdG8gZXhwb3NlIGZyb21cbiAgICAvLyB0aGUgcGFja2FnZS5qc29uIGZpbGUgb24gdGhlIHBhcmVudCBtb2R1bGUuXG4gICAgLy9cbiAgICBvcHRpb25zID0geyBpbmNsdWRlOiBbb3B0aW9uc10gfTtcbiAgfVxuICBcbiAgLy9cbiAgLy8gKipTZXR1cCBkZWZhdWx0IG9wdGlvbnMqKlxuICAvL1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgXG4gIC8vIGVuc3VyZSB0aGF0IGluY2x1ZGVzIGhhdmUgYmVlbiBkZWZpbmVkXG4gIG9wdGlvbnMuaW5jbHVkZSA9IG9wdGlvbnMuaW5jbHVkZSB8fCBbXTtcbiAgXG4gIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcbiAgICAvL1xuICAgIC8vIElmIGFkZGl0aW9uYWwgc3RyaW5nIGFyZ3VtZW50cyBoYXZlIGJlZW4gcGFzc2VkIGluXG4gICAgLy8gdGhlbiBhZGQgdGhlbSB0byB0aGUgcHJvcGVydGllcyB0byBleHBvc2Ugb24gdGhlIFxuICAgIC8vIHBhcmVudCBtb2R1bGUuIFxuICAgIC8vXG4gICAgb3B0aW9ucy5pbmNsdWRlID0gb3B0aW9ucy5pbmNsdWRlLmNvbmNhdChhcmdzKTtcbiAgfVxuICBcbiAgdmFyIHBrZyA9IHBrZ2luZm8ucmVhZChwbW9kdWxlLCBvcHRpb25zLmRpcikucGFja2FnZTtcbiAgT2JqZWN0LmtleXMocGtnKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAob3B0aW9ucy5pbmNsdWRlLmxlbmd0aCA+IDAgJiYgIX5vcHRpb25zLmluY2x1ZGUuaW5kZXhPZihrZXkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIGlmICghcG1vZHVsZS5leHBvcnRzW2tleV0pIHtcbiAgICAgIHBtb2R1bGUuZXhwb3J0c1trZXldID0gcGtnW2tleV07XG4gICAgfVxuICB9KTtcbiAgXG4gIHJldHVybiBwa2dpbmZvO1xufTtcblxuLy9cbi8vICMjIyBmdW5jdGlvbiBmaW5kIChkaXIpXG4vLyAjIyMjIEBwbW9kdWxlIHtNb2R1bGV9IFBhcmVudCBtb2R1bGUgdG8gcmVhZCBmcm9tLlxuLy8gIyMjIyBAZGlyIHtzdHJpbmd9ICoqT3B0aW9uYWwqKiBEaXJlY3RvcnkgdG8gc3RhcnQgc2VhcmNoIGZyb20uXG4vLyBTZWFyY2hlcyB1cCB0aGUgZGlyZWN0b3J5IHRyZWUgZnJvbSBgZGlyYCB1bnRpbCBpdCBmaW5kcyBhIGRpcmVjdG9yeVxuLy8gd2hpY2ggY29udGFpbnMgYSBgcGFja2FnZS5qc29uYCBmaWxlLiBcbi8vXG5wa2dpbmZvLmZpbmQgPSBmdW5jdGlvbiAocG1vZHVsZSwgZGlyKSB7XG4gIGlmICghIGRpcikge1xuICAgIGRpciA9IHBhdGguZGlybmFtZShwbW9kdWxlLmZpbGVuYW1lKTtcbiAgfVxuICBcbiAgdmFyIGZpbGVzID0gZnMucmVhZGRpclN5bmMoZGlyKTtcbiAgXG4gIGlmICh+ZmlsZXMuaW5kZXhPZigncGFja2FnZS5qc29uJykpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICB9XG4gIFxuICBpZiAoZGlyID09PSAnLycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBmaW5kIHBhY2thZ2UuanNvbiB1cCBmcm9tOiAnICsgZGlyKTtcbiAgfVxuICBlbHNlIGlmICghZGlyIHx8IGRpciA9PT0gJy4nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZmluZCBwYWNrYWdlLmpzb24gZnJvbSB1bnNwZWNpZmllZCBkaXJlY3RvcnknKTtcbiAgfVxuICBcbiAgcmV0dXJuIHBrZ2luZm8uZmluZChwbW9kdWxlLCBwYXRoLmRpcm5hbWUoZGlyKSk7XG59O1xuXG4vL1xuLy8gIyMjIGZ1bmN0aW9uIHJlYWQgKHBtb2R1bGUsIGRpcilcbi8vICMjIyMgQHBtb2R1bGUge01vZHVsZX0gUGFyZW50IG1vZHVsZSB0byByZWFkIGZyb20uXG4vLyAjIyMjIEBkaXIge3N0cmluZ30gKipPcHRpb25hbCoqIERpcmVjdG9yeSB0byBzdGFydCBzZWFyY2ggZnJvbS5cbi8vIFNlYXJjaGVzIHVwIHRoZSBkaXJlY3RvcnkgdHJlZSBmcm9tIGBkaXJgIHVudGlsIGl0IGZpbmRzIGEgZGlyZWN0b3J5XG4vLyB3aGljaCBjb250YWlucyBhIGBwYWNrYWdlLmpzb25gIGZpbGUgYW5kIHJldHVybnMgdGhlIHBhY2thZ2UgaW5mb3JtYXRpb24uXG4vL1xucGtnaW5mby5yZWFkID0gZnVuY3Rpb24gKHBtb2R1bGUsIGRpcikgeyBcbiAgZGlyID0gcGtnaW5mby5maW5kKHBtb2R1bGUsIGRpcik7XG4gIFxuICB2YXIgZGF0YSA9IGZzLnJlYWRGaWxlU3luYyhkaXIpLnRvU3RyaW5nKCk7XG4gICAgICBcbiAgcmV0dXJuIHtcbiAgICBkaXI6IGRpciwgXG4gICAgcGFja2FnZTogSlNPTi5wYXJzZShkYXRhKVxuICB9O1xufTtcblxuLy9cbi8vIENhbGwgYHBrZ2luZm9gIG9uIHRoaXMgbW9kdWxlIGFuZCBleHBvc2UgdmVyc2lvbi5cbi8vXG5wa2dpbmZvKG1vZHVsZSwge1xuICBkaXI6IF9fZGlybmFtZSxcbiAgaW5jbHVkZTogWyd2ZXJzaW9uJ10sXG4gIHRhcmdldDogcGtnaW5mb1xufSk7XG59KS5jYWxsKHRoaXMsXCIvLi4vbm9kZV9tb2R1bGVzL2pzb25sZC9ub2RlX21vZHVsZXMvcGtnaW5mby9saWJcIikiLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjguM1xuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZXhwb3J0c2Agb24gdGhlIHNlcnZlci5cbiAgdmFyIHJvb3QgPSB0aGlzO1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXJcbiAgICBwdXNoICAgICAgICAgICAgID0gQXJyYXlQcm90by5wdXNoLFxuICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kLFxuICAgIG5hdGl2ZUNyZWF0ZSAgICAgICA9IE9iamVjdC5jcmVhdGU7XG5cbiAgLy8gTmFrZWQgZnVuY3Rpb24gcmVmZXJlbmNlIGZvciBzdXJyb2dhdGUtcHJvdG90eXBlLXN3YXBwaW5nLlxuICB2YXIgQ3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuOC4zJztcblxuICAvLyBJbnRlcm5hbCBmdW5jdGlvbiB0aGF0IHJldHVybnMgYW4gZWZmaWNpZW50IChmb3IgY3VycmVudCBlbmdpbmVzKSB2ZXJzaW9uXG4gIC8vIG9mIHRoZSBwYXNzZWQtaW4gY2FsbGJhY2ssIHRvIGJlIHJlcGVhdGVkbHkgYXBwbGllZCBpbiBvdGhlciBVbmRlcnNjb3JlXG4gIC8vIGZ1bmN0aW9ucy5cbiAgdmFyIG9wdGltaXplQ2IgPSBmdW5jdGlvbihmdW5jLCBjb250ZXh0LCBhcmdDb3VudCkge1xuICAgIGlmIChjb250ZXh0ID09PSB2b2lkIDApIHJldHVybiBmdW5jO1xuICAgIHN3aXRjaCAoYXJnQ291bnQgPT0gbnVsbCA/IDMgOiBhcmdDb3VudCkge1xuICAgICAgY2FzZSAxOiByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSk7XG4gICAgICB9O1xuICAgICAgY2FzZSAyOiByZXR1cm4gZnVuY3Rpb24odmFsdWUsIG90aGVyKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgdmFsdWUsIG90aGVyKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfTtcbiAgICAgIGNhc2UgNDogcmV0dXJuIGZ1bmN0aW9uKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCBhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBBIG1vc3RseS1pbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBjYWxsYmFja3MgdGhhdCBjYW4gYmUgYXBwbGllZFxuICAvLyB0byBlYWNoIGVsZW1lbnQgaW4gYSBjb2xsZWN0aW9uLCByZXR1cm5pbmcgdGhlIGRlc2lyZWQgcmVzdWx0IOKAlCBlaXRoZXJcbiAgLy8gaWRlbnRpdHksIGFuIGFyYml0cmFyeSBjYWxsYmFjaywgYSBwcm9wZXJ0eSBtYXRjaGVyLCBvciBhIHByb3BlcnR5IGFjY2Vzc29yLlxuICB2YXIgY2IgPSBmdW5jdGlvbih2YWx1ZSwgY29udGV4dCwgYXJnQ291bnQpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIF8uaWRlbnRpdHk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHJldHVybiBvcHRpbWl6ZUNiKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCk7XG4gICAgaWYgKF8uaXNPYmplY3QodmFsdWUpKSByZXR1cm4gXy5tYXRjaGVyKHZhbHVlKTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG4gIF8uaXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBjYih2YWx1ZSwgY29udGV4dCwgSW5maW5pdHkpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhc3NpZ25lciBmdW5jdGlvbnMuXG4gIHZhciBjcmVhdGVBc3NpZ25lciA9IGZ1bmN0aW9uKGtleXNGdW5jLCB1bmRlZmluZWRPbmx5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoIDwgMiB8fCBvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF0sXG4gICAgICAgICAgICBrZXlzID0ga2V5c0Z1bmMoc291cmNlKSxcbiAgICAgICAgICAgIGwgPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICBpZiAoIXVuZGVmaW5lZE9ubHkgfHwgb2JqW2tleV0gPT09IHZvaWQgMCkgb2JqW2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhIG5ldyBvYmplY3QgdGhhdCBpbmhlcml0cyBmcm9tIGFub3RoZXIuXG4gIHZhciBiYXNlQ3JlYXRlID0gZnVuY3Rpb24ocHJvdG90eXBlKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KHByb3RvdHlwZSkpIHJldHVybiB7fTtcbiAgICBpZiAobmF0aXZlQ3JlYXRlKSByZXR1cm4gbmF0aXZlQ3JlYXRlKHByb3RvdHlwZSk7XG4gICAgQ3Rvci5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyBDdG9yO1xuICAgIEN0b3IucHJvdG90eXBlID0gbnVsbDtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHZhciBwcm9wZXJ0eSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogPT0gbnVsbCA/IHZvaWQgMCA6IG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gSGVscGVyIGZvciBjb2xsZWN0aW9uIG1ldGhvZHMgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSBjb2xsZWN0aW9uXG4gIC8vIHNob3VsZCBiZSBpdGVyYXRlZCBhcyBhbiBhcnJheSBvciBhcyBhbiBvYmplY3RcbiAgLy8gUmVsYXRlZDogaHR0cDovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtdG9sZW5ndGhcbiAgLy8gQXZvaWRzIGEgdmVyeSBuYXN0eSBpT1MgOCBKSVQgYnVnIG9uIEFSTS02NC4gIzIwOTRcbiAgdmFyIE1BWF9BUlJBWV9JTkRFWCA9IE1hdGgucG93KDIsIDUzKSAtIDE7XG4gIHZhciBnZXRMZW5ndGggPSBwcm9wZXJ0eSgnbGVuZ3RoJyk7XG4gIHZhciBpc0FycmF5TGlrZSA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgbGVuZ3RoID0gZ2V0TGVuZ3RoKGNvbGxlY3Rpb24pO1xuICAgIHJldHVybiB0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInICYmIGxlbmd0aCA+PSAwICYmIGxlbmd0aCA8PSBNQVhfQVJSQVlfSU5ERVg7XG4gIH07XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyByYXcgb2JqZWN0cyBpbiBhZGRpdGlvbiB0byBhcnJheS1saWtlcy4gVHJlYXRzIGFsbFxuICAvLyBzcGFyc2UgYXJyYXktbGlrZXMgYXMgaWYgdGhleSB3ZXJlIGRlbnNlLlxuICBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB2YXIgaSwgbGVuZ3RoO1xuICAgIGlmIChpc0FycmF5TGlrZShvYmopKSB7XG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaXRlcmF0ZWUob2JqW2ldLCBpLCBvYmopO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVyYXRlZShvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRlZSB0byBlYWNoIGVsZW1lbnQuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICByZXN1bHRzID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgcmVzdWx0c1tpbmRleF0gPSBpdGVyYXRlZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIHJlZHVjaW5nIGZ1bmN0aW9uIGl0ZXJhdGluZyBsZWZ0IG9yIHJpZ2h0LlxuICBmdW5jdGlvbiBjcmVhdGVSZWR1Y2UoZGlyKSB7XG4gICAgLy8gT3B0aW1pemVkIGl0ZXJhdG9yIGZ1bmN0aW9uIGFzIHVzaW5nIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAvLyBpbiB0aGUgbWFpbiBmdW5jdGlvbiB3aWxsIGRlb3B0aW1pemUgdGhlLCBzZWUgIzE5OTEuXG4gICAgZnVuY3Rpb24gaXRlcmF0b3Iob2JqLCBpdGVyYXRlZSwgbWVtbywga2V5cywgaW5kZXgsIGxlbmd0aCkge1xuICAgICAgZm9yICg7IGluZGV4ID49IDAgJiYgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IGRpcikge1xuICAgICAgICB2YXIgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgICBtZW1vID0gaXRlcmF0ZWUobWVtbywgb2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIG1lbW8sIGNvbnRleHQpIHtcbiAgICAgIGl0ZXJhdGVlID0gb3B0aW1pemVDYihpdGVyYXRlZSwgY29udGV4dCwgNCk7XG4gICAgICB2YXIga2V5cyA9ICFpc0FycmF5TGlrZShvYmopICYmIF8ua2V5cyhvYmopLFxuICAgICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICAgIGluZGV4ID0gZGlyID4gMCA/IDAgOiBsZW5ndGggLSAxO1xuICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBpbml0aWFsIHZhbHVlIGlmIG5vbmUgaXMgcHJvdmlkZWQuXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgbWVtbyA9IG9ialtrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleF07XG4gICAgICAgIGluZGV4ICs9IGRpcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRvcihvYmosIGl0ZXJhdGVlLCBtZW1vLCBrZXlzLCBpbmRleCwgbGVuZ3RoKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gKipSZWR1Y2UqKiBidWlsZHMgdXAgYSBzaW5nbGUgcmVzdWx0IGZyb20gYSBsaXN0IG9mIHZhbHVlcywgYWthIGBpbmplY3RgLFxuICAvLyBvciBgZm9sZGxgLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGNyZWF0ZVJlZHVjZSgxKTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBjcmVhdGVSZWR1Y2UoLTEpO1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciBrZXk7XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHtcbiAgICAgIGtleSA9IF8uZmluZEluZGV4KG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAga2V5ID0gXy5maW5kS2V5KG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGtleSAhPT0gdm9pZCAwICYmIGtleSAhPT0gLTEpIHJldHVybiBvYmpba2V5XTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlKHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGEgdHJ1dGggdGVzdCBmYWlscy5cbiAgXy5yZWplY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIF8ubmVnYXRlKGNiKHByZWRpY2F0ZSkpLCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciBhbGwgb2YgdGhlIGVsZW1lbnRzIG1hdGNoIGEgdHJ1dGggdGVzdC5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICBpZiAoIXByZWRpY2F0ZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaikpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIF8uc29tZSA9IF8uYW55ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICBpZiAocHJlZGljYXRlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKSkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhlIGFycmF5IG9yIG9iamVjdCBjb250YWlucyBhIGdpdmVuIGl0ZW0gKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZXNgIGFuZCBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGVzID0gXy5pbmNsdWRlID0gZnVuY3Rpb24ob2JqLCBpdGVtLCBmcm9tSW5kZXgsIGd1YXJkKSB7XG4gICAgaWYgKCFpc0FycmF5TGlrZShvYmopKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgIGlmICh0eXBlb2YgZnJvbUluZGV4ICE9ICdudW1iZXInIHx8IGd1YXJkKSBmcm9tSW5kZXggPSAwO1xuICAgIHJldHVybiBfLmluZGV4T2Yob2JqLCBpdGVtLCBmcm9tSW5kZXgpID49IDA7XG4gIH07XG5cbiAgLy8gSW52b2tlIGEgbWV0aG9kICh3aXRoIGFyZ3VtZW50cykgb24gZXZlcnkgaXRlbSBpbiBhIGNvbGxlY3Rpb24uXG4gIF8uaW52b2tlID0gZnVuY3Rpb24ob2JqLCBtZXRob2QpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgaXNGdW5jID0gXy5pc0Z1bmN0aW9uKG1ldGhvZCk7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBmdW5jID0gaXNGdW5jID8gbWV0aG9kIDogdmFsdWVbbWV0aG9kXTtcbiAgICAgIHJldHVybiBmdW5jID09IG51bGwgPyBmdW5jIDogZnVuYy5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgbWFwYDogZmV0Y2hpbmcgYSBwcm9wZXJ0eS5cbiAgXy5wbHVjayA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgXy5wcm9wZXJ0eShrZXkpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaWx0ZXJgOiBzZWxlY3Rpbmcgb25seSBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ud2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5tYXRjaGVyKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maW5kKG9iaiwgXy5tYXRjaGVyKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtYXhpbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0gLUluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSAtSW5maW5pdHksXG4gICAgICAgIHZhbHVlLCBjb21wdXRlZDtcbiAgICBpZiAoaXRlcmF0ZWUgPT0gbnVsbCAmJiBvYmogIT0gbnVsbCkge1xuICAgICAgb2JqID0gaXNBcnJheUxpa2Uob2JqKSA/IG9iaiA6IF8udmFsdWVzKG9iaik7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhbHVlID0gb2JqW2ldO1xuICAgICAgICBpZiAodmFsdWUgPiByZXN1bHQpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgICBjb21wdXRlZCA9IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICAgIGlmIChjb21wdXRlZCA+IGxhc3RDb21wdXRlZCB8fCBjb21wdXRlZCA9PT0gLUluZmluaXR5ICYmIHJlc3VsdCA9PT0gLUluZmluaXR5KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IEluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSBJbmZpbml0eSxcbiAgICAgICAgdmFsdWUsIGNvbXB1dGVkO1xuICAgIGlmIChpdGVyYXRlZSA9PSBudWxsICYmIG9iaiAhPSBudWxsKSB7XG4gICAgICBvYmogPSBpc0FycmF5TGlrZShvYmopID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBvYmpbaV07XG4gICAgICAgIGlmICh2YWx1ZSA8IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgICAgaWYgKGNvbXB1dGVkIDwgbGFzdENvbXB1dGVkIHx8IGNvbXB1dGVkID09PSBJbmZpbml0eSAmJiByZXN1bHQgPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFNodWZmbGUgYSBjb2xsZWN0aW9uLCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlXG4gIC8vIFtGaXNoZXItWWF0ZXMgc2h1ZmZsZV0oaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXLigJNZYXRlc19zaHVmZmxlKS5cbiAgXy5zaHVmZmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHNldCA9IGlzQXJyYXlMaWtlKG9iaikgPyBvYmogOiBfLnZhbHVlcyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBzZXQubGVuZ3RoO1xuICAgIHZhciBzaHVmZmxlZCA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwLCByYW5kOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgcmFuZCA9IF8ucmFuZG9tKDAsIGluZGV4KTtcbiAgICAgIGlmIChyYW5kICE9PSBpbmRleCkgc2h1ZmZsZWRbaW5kZXhdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHNldFtpbmRleF07XG4gICAgfVxuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudC5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgaWYgKCFpc0FycmF5TGlrZShvYmopKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgICAgcmV0dXJuIG9ialtfLnJhbmRvbShvYmoubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICByZXR1cm4gXy5zaHVmZmxlKG9iaikuc2xpY2UoMCwgTWF0aC5tYXgoMCwgbikpO1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiBwcm9kdWNlZCBieSBhbiBpdGVyYXRlZS5cbiAgXy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYTogaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KVxuICAgICAgfTtcbiAgICB9KS5zb3J0KGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWE7XG4gICAgICB2YXIgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgaWYgKGEgIT09IGIpIHtcbiAgICAgICAgaWYgKGEgPiBiIHx8IGEgPT09IHZvaWQgMCkgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhIDwgYiB8fCBiID09PSB2b2lkIDApIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsZWZ0LmluZGV4IC0gcmlnaHQuaW5kZXg7XG4gICAgfSksICd2YWx1ZScpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHVzZWQgZm9yIGFnZ3JlZ2F0ZSBcImdyb3VwIGJ5XCIgb3BlcmF0aW9ucy5cbiAgdmFyIGdyb3VwID0gZnVuY3Rpb24oYmVoYXZpb3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGtleSA9IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgb2JqKTtcbiAgICAgICAgYmVoYXZpb3IocmVzdWx0LCB2YWx1ZSwga2V5KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEdyb3VwcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLiBQYXNzIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGVcbiAgLy8gdG8gZ3JvdXAgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjcml0ZXJpb24uXG4gIF8uZ3JvdXBCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIGlmIChfLmhhcyhyZXN1bHQsIGtleSkpIHJlc3VsdFtrZXldLnB1c2godmFsdWUpOyBlbHNlIHJlc3VsdFtrZXldID0gW3ZhbHVlXTtcbiAgfSk7XG5cbiAgLy8gSW5kZXhlcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLCBzaW1pbGFyIHRvIGBncm91cEJ5YCwgYnV0IGZvclxuICAvLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUuXG4gIF8uaW5kZXhCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gIH0pO1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIHZhbHVlLCBrZXkpIHtcbiAgICBpZiAoXy5oYXMocmVzdWx0LCBrZXkpKSByZXN1bHRba2V5XSsrOyBlbHNlIHJlc3VsdFtrZXldID0gMTtcbiAgfSk7XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gaXNBcnJheUxpa2Uob2JqKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gU3BsaXQgYSBjb2xsZWN0aW9uIGludG8gdHdvIGFycmF5czogb25lIHdob3NlIGVsZW1lbnRzIGFsbCBzYXRpc2Z5IHRoZSBnaXZlblxuICAvLyBwcmVkaWNhdGUsIGFuZCBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIGRvIG5vdCBzYXRpc2Z5IHRoZSBwcmVkaWNhdGUuXG4gIF8ucGFydGl0aW9uID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBwYXNzID0gW10sIGZhaWwgPSBbXTtcbiAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmopIHtcbiAgICAgIChwcmVkaWNhdGUodmFsdWUsIGtleSwgb2JqKSA/IHBhc3MgOiBmYWlsKS5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW3Bhc3MsIGZhaWxdO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbMF07XG4gICAgcmV0dXJuIF8uaW5pdGlhbChhcnJheSwgYXJyYXkubGVuZ3RoIC0gbik7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEVzcGVjaWFsbHkgdXNlZnVsIG9uXG4gIC8vIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIGFsbCB0aGUgdmFsdWVzIGluXG4gIC8vIHRoZSBhcnJheSwgZXhjbHVkaW5nIHRoZSBsYXN0IE4uXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBNYXRoLm1heCgwLCBhcnJheS5sZW5ndGggLSAobiA9PSBudWxsIHx8IGd1YXJkID8gMSA6IG4pKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICBfLmxhc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIF8ucmVzdChhcnJheSwgTWF0aC5tYXgoMCwgYXJyYXkubGVuZ3RoIC0gbikpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgbiA9PSBudWxsIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgc3RyaWN0LCBzdGFydEluZGV4KSB7XG4gICAgdmFyIG91dHB1dCA9IFtdLCBpZHggPSAwO1xuICAgIGZvciAodmFyIGkgPSBzdGFydEluZGV4IHx8IDAsIGxlbmd0aCA9IGdldExlbmd0aChpbnB1dCk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gaW5wdXRbaV07XG4gICAgICBpZiAoaXNBcnJheUxpa2UodmFsdWUpICYmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSkge1xuICAgICAgICAvL2ZsYXR0ZW4gY3VycmVudCBsZXZlbCBvZiBhcnJheSBvciBhcmd1bWVudHMgb2JqZWN0XG4gICAgICAgIGlmICghc2hhbGxvdykgdmFsdWUgPSBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBzdHJpY3QpO1xuICAgICAgICB2YXIgaiA9IDAsIGxlbiA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgb3V0cHV0Lmxlbmd0aCArPSBsZW47XG4gICAgICAgIHdoaWxlIChqIDwgbGVuKSB7XG4gICAgICAgICAgb3V0cHV0W2lkeCsrXSA9IHZhbHVlW2orK107XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXN0cmljdCkge1xuICAgICAgICBvdXRwdXRbaWR4KytdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBmYWxzZSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIEFsaWFzZWQgYXMgYHVuaXF1ZWAuXG4gIF8udW5pcSA9IF8udW5pcXVlID0gZnVuY3Rpb24oYXJyYXksIGlzU29ydGVkLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGlmICghXy5pc0Jvb2xlYW4oaXNTb3J0ZWQpKSB7XG4gICAgICBjb250ZXh0ID0gaXRlcmF0ZWU7XG4gICAgICBpdGVyYXRlZSA9IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGl0ZXJhdGVlICE9IG51bGwpIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2ldLFxuICAgICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUgPyBpdGVyYXRlZSh2YWx1ZSwgaSwgYXJyYXkpIDogdmFsdWU7XG4gICAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgICAgaWYgKCFpIHx8IHNlZW4gIT09IGNvbXB1dGVkKSByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIHNlZW4gPSBjb21wdXRlZDtcbiAgICAgIH0gZWxzZSBpZiAoaXRlcmF0ZWUpIHtcbiAgICAgICAgaWYgKCFfLmNvbnRhaW5zKHNlZW4sIGNvbXB1dGVkKSkge1xuICAgICAgICAgIHNlZW4ucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFfLmNvbnRhaW5zKHJlc3VsdCwgdmFsdWUpKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy51bmlxKGZsYXR0ZW4oYXJndW1lbnRzLCB0cnVlLCB0cnVlKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBhcmdzTGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaXRlbSA9IGFycmF5W2ldO1xuICAgICAgaWYgKF8uY29udGFpbnMocmVzdWx0LCBpdGVtKSkgY29udGludWU7XG4gICAgICBmb3IgKHZhciBqID0gMTsgaiA8IGFyZ3NMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIV8uY29udGFpbnMoYXJndW1lbnRzW2pdLCBpdGVtKSkgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoaiA9PT0gYXJnc0xlbmd0aCkgcmVzdWx0LnB1c2goaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gZmxhdHRlbihhcmd1bWVudHMsIHRydWUsIHRydWUsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgZnVuY3Rpb24odmFsdWUpe1xuICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBaaXAgdG9nZXRoZXIgbXVsdGlwbGUgbGlzdHMgaW50byBhIHNpbmdsZSBhcnJheSAtLSBlbGVtZW50cyB0aGF0IHNoYXJlXG4gIC8vIGFuIGluZGV4IGdvIHRvZ2V0aGVyLlxuICBfLnppcCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuemlwKGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgLy8gQ29tcGxlbWVudCBvZiBfLnppcC4gVW56aXAgYWNjZXB0cyBhbiBhcnJheSBvZiBhcnJheXMgYW5kIGdyb3Vwc1xuICAvLyBlYWNoIGFycmF5J3MgZWxlbWVudHMgb24gc2hhcmVkIGluZGljZXNcbiAgXy51bnppcCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIGxlbmd0aCA9IGFycmF5ICYmIF8ubWF4KGFycmF5LCBnZXRMZW5ndGgpLmxlbmd0aCB8fCAwO1xuICAgIHZhciByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgcmVzdWx0W2luZGV4XSA9IF8ucGx1Y2soYXJyYXksIGluZGV4KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBnZXRMZW5ndGgobGlzdCk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIEdlbmVyYXRvciBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIGZpbmRJbmRleCBhbmQgZmluZExhc3RJbmRleCBmdW5jdGlvbnNcbiAgZnVuY3Rpb24gY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIoZGlyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFycmF5LCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgICB2YXIgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICAgIHZhciBpbmRleCA9IGRpciA+IDAgPyAwIDogbGVuZ3RoIC0gMTtcbiAgICAgIGZvciAoOyBpbmRleCA+PSAwICYmIGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSBkaXIpIHtcbiAgICAgICAgaWYgKHByZWRpY2F0ZShhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSkpIHJldHVybiBpbmRleDtcbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9O1xuICB9XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgaW5kZXggb24gYW4gYXJyYXktbGlrZSB0aGF0IHBhc3NlcyBhIHByZWRpY2F0ZSB0ZXN0XG4gIF8uZmluZEluZGV4ID0gY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIoMSk7XG4gIF8uZmluZExhc3RJbmRleCA9IGNyZWF0ZVByZWRpY2F0ZUluZGV4RmluZGVyKC0xKTtcblxuICAvLyBVc2UgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIHRvIGZpZ3VyZSBvdXQgdGhlIHNtYWxsZXN0IGluZGV4IGF0IHdoaWNoXG4gIC8vIGFuIG9iamVjdCBzaG91bGQgYmUgaW5zZXJ0ZWQgc28gYXMgdG8gbWFpbnRhaW4gb3JkZXIuIFVzZXMgYmluYXJ5IHNlYXJjaC5cbiAgXy5zb3J0ZWRJbmRleCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCwgMSk7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0ZWUob2JqKTtcbiAgICB2YXIgbG93ID0gMCwgaGlnaCA9IGdldExlbmd0aChhcnJheSk7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSBNYXRoLmZsb29yKChsb3cgKyBoaWdoKSAvIDIpO1xuICAgICAgaWYgKGl0ZXJhdGVlKGFycmF5W21pZF0pIDwgdmFsdWUpIGxvdyA9IG1pZCArIDE7IGVsc2UgaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBHZW5lcmF0b3IgZnVuY3Rpb24gdG8gY3JlYXRlIHRoZSBpbmRleE9mIGFuZCBsYXN0SW5kZXhPZiBmdW5jdGlvbnNcbiAgZnVuY3Rpb24gY3JlYXRlSW5kZXhGaW5kZXIoZGlyLCBwcmVkaWNhdGVGaW5kLCBzb3J0ZWRJbmRleCkge1xuICAgIHJldHVybiBmdW5jdGlvbihhcnJheSwgaXRlbSwgaWR4KSB7XG4gICAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChhcnJheSk7XG4gICAgICBpZiAodHlwZW9mIGlkeCA9PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAoZGlyID4gMCkge1xuICAgICAgICAgICAgaSA9IGlkeCA+PSAwID8gaWR4IDogTWF0aC5tYXgoaWR4ICsgbGVuZ3RoLCBpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxlbmd0aCA9IGlkeCA+PSAwID8gTWF0aC5taW4oaWR4ICsgMSwgbGVuZ3RoKSA6IGlkeCArIGxlbmd0aCArIDE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc29ydGVkSW5kZXggJiYgaWR4ICYmIGxlbmd0aCkge1xuICAgICAgICBpZHggPSBzb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpZHhdID09PSBpdGVtID8gaWR4IDogLTE7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbSAhPT0gaXRlbSkge1xuICAgICAgICBpZHggPSBwcmVkaWNhdGVGaW5kKHNsaWNlLmNhbGwoYXJyYXksIGksIGxlbmd0aCksIF8uaXNOYU4pO1xuICAgICAgICByZXR1cm4gaWR4ID49IDAgPyBpZHggKyBpIDogLTE7XG4gICAgICB9XG4gICAgICBmb3IgKGlkeCA9IGRpciA+IDAgPyBpIDogbGVuZ3RoIC0gMTsgaWR4ID49IDAgJiYgaWR4IDwgbGVuZ3RoOyBpZHggKz0gZGlyKSB7XG4gICAgICAgIGlmIChhcnJheVtpZHhdID09PSBpdGVtKSByZXR1cm4gaWR4O1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGFuIGl0ZW0gaW4gYW4gYXJyYXksXG4gIC8vIG9yIC0xIGlmIHRoZSBpdGVtIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGUgYXJyYXkuXG4gIC8vIElmIHRoZSBhcnJheSBpcyBsYXJnZSBhbmQgYWxyZWFkeSBpbiBzb3J0IG9yZGVyLCBwYXNzIGB0cnVlYFxuICAvLyBmb3IgKippc1NvcnRlZCoqIHRvIHVzZSBiaW5hcnkgc2VhcmNoLlxuICBfLmluZGV4T2YgPSBjcmVhdGVJbmRleEZpbmRlcigxLCBfLmZpbmRJbmRleCwgXy5zb3J0ZWRJbmRleCk7XG4gIF8ubGFzdEluZGV4T2YgPSBjcmVhdGVJbmRleEZpbmRlcigtMSwgXy5maW5kTGFzdEluZGV4KTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChzdG9wID09IG51bGwpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gc3RlcCB8fCAxO1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGgubWF4KE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApLCAwKTtcbiAgICB2YXIgcmFuZ2UgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgbGVuZ3RoOyBpZHgrKywgc3RhcnQgKz0gc3RlcCkge1xuICAgICAgcmFuZ2VbaWR4XSA9IHN0YXJ0O1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfTtcblxuICAvLyBGdW5jdGlvbiAoYWhlbSkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIERldGVybWluZXMgd2hldGhlciB0byBleGVjdXRlIGEgZnVuY3Rpb24gYXMgYSBjb25zdHJ1Y3RvclxuICAvLyBvciBhIG5vcm1hbCBmdW5jdGlvbiB3aXRoIHRoZSBwcm92aWRlZCBhcmd1bWVudHNcbiAgdmFyIGV4ZWN1dGVCb3VuZCA9IGZ1bmN0aW9uKHNvdXJjZUZ1bmMsIGJvdW5kRnVuYywgY29udGV4dCwgY2FsbGluZ0NvbnRleHQsIGFyZ3MpIHtcbiAgICBpZiAoIShjYWxsaW5nQ29udGV4dCBpbnN0YW5jZW9mIGJvdW5kRnVuYykpIHJldHVybiBzb3VyY2VGdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIHZhciBzZWxmID0gYmFzZUNyZWF0ZShzb3VyY2VGdW5jLnByb3RvdHlwZSk7XG4gICAgdmFyIHJlc3VsdCA9IHNvdXJjZUZ1bmMuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgaWYgKF8uaXNPYmplY3QocmVzdWx0KSkgcmV0dXJuIHJlc3VsdDtcbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQpIHtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JpbmQgbXVzdCBiZSBjYWxsZWQgb24gYSBmdW5jdGlvbicpO1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBib3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4ZWN1dGVCb3VuZChmdW5jLCBib3VuZCwgY29udGV4dCwgdGhpcywgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgfTtcbiAgICByZXR1cm4gYm91bmQ7XG4gIH07XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC4gXyBhY3RzXG4gIC8vIGFzIGEgcGxhY2Vob2xkZXIsIGFsbG93aW5nIGFueSBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgdG8gYmUgcHJlLWZpbGxlZC5cbiAgXy5wYXJ0aWFsID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBib3VuZEFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgdmFyIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSAwLCBsZW5ndGggPSBib3VuZEFyZ3MubGVuZ3RoO1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheShsZW5ndGgpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBhcmdzW2ldID0gYm91bmRBcmdzW2ldID09PSBfID8gYXJndW1lbnRzW3Bvc2l0aW9uKytdIDogYm91bmRBcmdzW2ldO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZXhlY3V0ZUJvdW5kKGZ1bmMsIGJvdW5kLCB0aGlzLCB0aGlzLCBhcmdzKTtcbiAgICB9O1xuICAgIHJldHVybiBib3VuZDtcbiAgfTtcblxuICAvLyBCaW5kIGEgbnVtYmVyIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFJlbWFpbmluZyBhcmd1bWVudHNcbiAgLy8gYXJlIHRoZSBtZXRob2QgbmFtZXMgdG8gYmUgYm91bmQuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhbGwgY2FsbGJhY2tzXG4gIC8vIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGksIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsIGtleTtcbiAgICBpZiAobGVuZ3RoIDw9IDEpIHRocm93IG5ldyBFcnJvcignYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lcycpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAga2V5ID0gYXJndW1lbnRzW2ldO1xuICAgICAgb2JqW2tleV0gPSBfLmJpbmQob2JqW2tleV0sIG9iaik7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gTWVtb2l6ZSBhbiBleHBlbnNpdmUgZnVuY3Rpb24gYnkgc3RvcmluZyBpdHMgcmVzdWx0cy5cbiAgXy5tZW1vaXplID0gZnVuY3Rpb24oZnVuYywgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW9pemUgPSBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBjYWNoZSA9IG1lbW9pemUuY2FjaGU7XG4gICAgICB2YXIgYWRkcmVzcyA9ICcnICsgKGhhc2hlciA/IGhhc2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDoga2V5KTtcbiAgICAgIGlmICghXy5oYXMoY2FjaGUsIGFkZHJlc3MpKSBjYWNoZVthZGRyZXNzXSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBjYWNoZVthZGRyZXNzXTtcbiAgICB9O1xuICAgIG1lbW9pemUuY2FjaGUgPSB7fTtcbiAgICByZXR1cm4gbWVtb2l6ZTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBfLnBhcnRpYWwoXy5kZWxheSwgXywgMSk7XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogXy5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcbiAgICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG5cbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsYXN0ID0gXy5ub3coKSAtIHRpbWVzdGFtcDtcblxuICAgICAgaWYgKGxhc3QgPCB3YWl0ICYmIGxhc3QgPj0gMCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCAtIGxhc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIGlmICghaW1tZWRpYXRlKSB7XG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICBpZiAoIXRpbWVvdXQpIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB0aW1lc3RhbXAgPSBfLm5vdygpO1xuICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICBpZiAoIXRpbWVvdXQpIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIGlmIChjYWxsTm93KSB7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGZ1bmN0aW9uIHBhc3NlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgc2Vjb25kLFxuICAvLyBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGFyZ3VtZW50cywgcnVuIGNvZGUgYmVmb3JlIGFuZCBhZnRlciwgYW5kXG4gIC8vIGNvbmRpdGlvbmFsbHkgZXhlY3V0ZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gIF8ud3JhcCA9IGZ1bmN0aW9uKGZ1bmMsIHdyYXBwZXIpIHtcbiAgICByZXR1cm4gXy5wYXJ0aWFsKHdyYXBwZXIsIGZ1bmMpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBuZWdhdGVkIHZlcnNpb24gb2YgdGhlIHBhc3NlZC1pbiBwcmVkaWNhdGUuXG4gIF8ubmVnYXRlID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICFwcmVkaWNhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGlzIHRoZSBjb21wb3NpdGlvbiBvZiBhIGxpc3Qgb2YgZnVuY3Rpb25zLCBlYWNoXG4gIC8vIGNvbnN1bWluZyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiB0aGF0IGZvbGxvd3MuXG4gIF8uY29tcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIHZhciBzdGFydCA9IGFyZ3MubGVuZ3RoIC0gMTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaSA9IHN0YXJ0O1xuICAgICAgdmFyIHJlc3VsdCA9IGFyZ3Nbc3RhcnRdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB3aGlsZSAoaS0tKSByZXN1bHQgPSBhcmdzW2ldLmNhbGwodGhpcywgcmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgb24gYW5kIGFmdGVyIHRoZSBOdGggY2FsbC5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgdXAgdG8gKGJ1dCBub3QgaW5jbHVkaW5nKSB0aGUgTnRoIGNhbGwuXG4gIF8uYmVmb3JlID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICB2YXIgbWVtbztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA+IDApIHtcbiAgICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aW1lcyA8PSAxKSBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IF8ucGFydGlhbChfLmJlZm9yZSwgMik7XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gS2V5cyBpbiBJRSA8IDkgdGhhdCB3b24ndCBiZSBpdGVyYXRlZCBieSBgZm9yIGtleSBpbiAuLi5gIGFuZCB0aHVzIG1pc3NlZC5cbiAgdmFyIGhhc0VudW1CdWcgPSAhe3RvU3RyaW5nOiBudWxsfS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKTtcbiAgdmFyIG5vbkVudW1lcmFibGVQcm9wcyA9IFsndmFsdWVPZicsICdpc1Byb3RvdHlwZU9mJywgJ3RvU3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAncHJvcGVydHlJc0VudW1lcmFibGUnLCAnaGFzT3duUHJvcGVydHknLCAndG9Mb2NhbGVTdHJpbmcnXTtcblxuICBmdW5jdGlvbiBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cykge1xuICAgIHZhciBub25FbnVtSWR4ID0gbm9uRW51bWVyYWJsZVByb3BzLmxlbmd0aDtcbiAgICB2YXIgY29uc3RydWN0b3IgPSBvYmouY29uc3RydWN0b3I7XG4gICAgdmFyIHByb3RvID0gKF8uaXNGdW5jdGlvbihjb25zdHJ1Y3RvcikgJiYgY29uc3RydWN0b3IucHJvdG90eXBlKSB8fCBPYmpQcm90bztcblxuICAgIC8vIENvbnN0cnVjdG9yIGlzIGEgc3BlY2lhbCBjYXNlLlxuICAgIHZhciBwcm9wID0gJ2NvbnN0cnVjdG9yJztcbiAgICBpZiAoXy5oYXMob2JqLCBwcm9wKSAmJiAhXy5jb250YWlucyhrZXlzLCBwcm9wKSkga2V5cy5wdXNoKHByb3ApO1xuXG4gICAgd2hpbGUgKG5vbkVudW1JZHgtLSkge1xuICAgICAgcHJvcCA9IG5vbkVudW1lcmFibGVQcm9wc1tub25FbnVtSWR4XTtcbiAgICAgIGlmIChwcm9wIGluIG9iaiAmJiBvYmpbcHJvcF0gIT09IHByb3RvW3Byb3BdICYmICFfLmNvbnRhaW5zKGtleXMsIHByb3ApKSB7XG4gICAgICAgIGtleXMucHVzaChwcm9wKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3Mgb3duIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBbXTtcbiAgICBpZiAobmF0aXZlS2V5cykgcmV0dXJuIG5hdGl2ZUtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIC8vIEFoZW0sIElFIDwgOS5cbiAgICBpZiAoaGFzRW51bUJ1ZykgY29sbGVjdE5vbkVudW1Qcm9wcyhvYmosIGtleXMpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIGFsbCB0aGUgcHJvcGVydHkgbmFtZXMgb2YgYW4gb2JqZWN0LlxuICBfLmFsbEtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikga2V5cy5wdXNoKGtleSk7XG4gICAgLy8gQWhlbSwgSUUgPCA5LlxuICAgIGlmIChoYXNFbnVtQnVnKSBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cyk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRlZSB0byBlYWNoIGVsZW1lbnQgb2YgdGhlIG9iamVjdFxuICAvLyBJbiBjb250cmFzdCB0byBfLm1hcCBpdCByZXR1cm5zIGFuIG9iamVjdFxuICBfLm1hcE9iamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB2YXIga2V5cyA9ICBfLmtleXMob2JqKSxcbiAgICAgICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aCxcbiAgICAgICAgICByZXN1bHRzID0ge30sXG4gICAgICAgICAgY3VycmVudEtleTtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgY3VycmVudEtleSA9IGtleXNbaW5kZXhdO1xuICAgICAgICByZXN1bHRzW2N1cnJlbnRLZXldID0gaXRlcmF0ZWUob2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhaXJzW2ldID0gW2tleXNbaV0sIG9ialtrZXlzW2ldXV07XG4gICAgfVxuICAgIHJldHVybiBwYWlycztcbiAgfTtcblxuICAvLyBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gIF8uaW52ZXJ0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdFtvYmpba2V5c1tpXV1dID0ga2V5c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBzb3J0ZWQgbGlzdCBvZiB0aGUgZnVuY3Rpb24gbmFtZXMgYXZhaWxhYmxlIG9uIHRoZSBvYmplY3QuXG4gIC8vIEFsaWFzZWQgYXMgYG1ldGhvZHNgXG4gIF8uZnVuY3Rpb25zID0gXy5tZXRob2RzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihvYmpba2V5XSkpIG5hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzLnNvcnQoKTtcbiAgfTtcblxuICAvLyBFeHRlbmQgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gcGFzc2VkLWluIG9iamVjdChzKS5cbiAgXy5leHRlbmQgPSBjcmVhdGVBc3NpZ25lcihfLmFsbEtleXMpO1xuXG4gIC8vIEFzc2lnbnMgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIG93biBwcm9wZXJ0aWVzIGluIHRoZSBwYXNzZWQtaW4gb2JqZWN0KHMpXG4gIC8vIChodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9PYmplY3QvYXNzaWduKVxuICBfLmV4dGVuZE93biA9IF8uYXNzaWduID0gY3JlYXRlQXNzaWduZXIoXy5rZXlzKTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBrZXkgb24gYW4gb2JqZWN0IHRoYXQgcGFzc2VzIGEgcHJlZGljYXRlIHRlc3RcbiAgXy5maW5kS2V5ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaiksIGtleTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUob2JqW2tleV0sIGtleSwgb2JqKSkgcmV0dXJuIGtleTtcbiAgICB9XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqZWN0LCBvaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0ge30sIG9iaiA9IG9iamVjdCwgaXRlcmF0ZWUsIGtleXM7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChfLmlzRnVuY3Rpb24ob2l0ZXJhdGVlKSkge1xuICAgICAga2V5cyA9IF8uYWxsS2V5cyhvYmopO1xuICAgICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKG9pdGVyYXRlZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtleXMgPSBmbGF0dGVuKGFyZ3VtZW50cywgZmFsc2UsIGZhbHNlLCAxKTtcbiAgICAgIGl0ZXJhdGVlID0gZnVuY3Rpb24odmFsdWUsIGtleSwgb2JqKSB7IHJldHVybiBrZXkgaW4gb2JqOyB9O1xuICAgICAgb2JqID0gT2JqZWN0KG9iaik7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgIHZhciB2YWx1ZSA9IG9ialtrZXldO1xuICAgICAgaWYgKGl0ZXJhdGVlKHZhbHVlLCBrZXksIG9iaikpIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpdGVyYXRlZSkpIHtcbiAgICAgIGl0ZXJhdGVlID0gXy5uZWdhdGUoaXRlcmF0ZWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ubWFwKGZsYXR0ZW4oYXJndW1lbnRzLCBmYWxzZSwgZmFsc2UsIDEpLCBTdHJpbmcpO1xuICAgICAgaXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHJldHVybiAhXy5jb250YWlucyhrZXlzLCBrZXkpO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIF8ucGljayhvYmosIGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gY3JlYXRlQXNzaWduZXIoXy5hbGxLZXlzLCB0cnVlKTtcblxuICAvLyBDcmVhdGVzIGFuIG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20gdGhlIGdpdmVuIHByb3RvdHlwZSBvYmplY3QuXG4gIC8vIElmIGFkZGl0aW9uYWwgcHJvcGVydGllcyBhcmUgcHJvdmlkZWQgdGhlbiB0aGV5IHdpbGwgYmUgYWRkZWQgdG8gdGhlXG4gIC8vIGNyZWF0ZWQgb2JqZWN0LlxuICBfLmNyZWF0ZSA9IGZ1bmN0aW9uKHByb3RvdHlwZSwgcHJvcHMpIHtcbiAgICB2YXIgcmVzdWx0ID0gYmFzZUNyZWF0ZShwcm90b3R5cGUpO1xuICAgIGlmIChwcm9wcykgXy5leHRlbmRPd24ocmVzdWx0LCBwcm9wcyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJucyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uaXNNYXRjaCA9IGZ1bmN0aW9uKG9iamVjdCwgYXR0cnMpIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhhdHRycyksIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuICFsZW5ndGg7XG4gICAgdmFyIG9iaiA9IE9iamVjdChvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYgKGF0dHJzW2tleV0gIT09IG9ialtrZXldIHx8ICEoa2V5IGluIG9iaikpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cblxuICAvLyBJbnRlcm5hbCByZWN1cnNpdmUgY29tcGFyaXNvbiBmdW5jdGlvbiBmb3IgYGlzRXF1YWxgLlxuICB2YXIgZXEgPSBmdW5jdGlvbihhLCBiLCBhU3RhY2ssIGJTdGFjaykge1xuICAgIC8vIElkZW50aWNhbCBvYmplY3RzIGFyZSBlcXVhbC4gYDAgPT09IC0wYCwgYnV0IHRoZXkgYXJlbid0IGlkZW50aWNhbC5cbiAgICAvLyBTZWUgdGhlIFtIYXJtb255IGBlZ2FsYCBwcm9wb3NhbF0oaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTplZ2FsKS5cbiAgICBpZiAoYSA9PT0gYikgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCByZWd1bGFyIGV4cHJlc3Npb25zLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgUmVnRXhwXSc6XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb2VyY2VkIHRvIHN0cmluZ3MgZm9yIGNvbXBhcmlzb24gKE5vdGU6ICcnICsgL2EvaSA9PT0gJy9hL2knKVxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gJycgKyBhID09PSAnJyArIGI7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLlxuICAgICAgICAvLyBPYmplY3QoTmFOKSBpcyBlcXVpdmFsZW50IHRvIE5hTlxuICAgICAgICBpZiAoK2EgIT09ICthKSByZXR1cm4gK2IgIT09ICtiO1xuICAgICAgICAvLyBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gK2EgPT09IDAgPyAxIC8gK2EgPT09IDEgLyBiIDogK2EgPT09ICtiO1xuICAgICAgY2FzZSAnW29iamVjdCBEYXRlXSc6XG4gICAgICBjYXNlICdbb2JqZWN0IEJvb2xlYW5dJzpcbiAgICAgICAgLy8gQ29lcmNlIGRhdGVzIGFuZCBib29sZWFucyB0byBudW1lcmljIHByaW1pdGl2ZSB2YWx1ZXMuIERhdGVzIGFyZSBjb21wYXJlZCBieSB0aGVpclxuICAgICAgICAvLyBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnMuIE5vdGUgdGhhdCBpbnZhbGlkIGRhdGVzIHdpdGggbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIC8vIG9mIGBOYU5gIGFyZSBub3QgZXF1aXZhbGVudC5cbiAgICAgICAgcmV0dXJuICthID09PSArYjtcbiAgICB9XG5cbiAgICB2YXIgYXJlQXJyYXlzID0gY2xhc3NOYW1lID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIGlmICghYXJlQXJyYXlzKSB7XG4gICAgICBpZiAodHlwZW9mIGEgIT0gJ29iamVjdCcgfHwgdHlwZW9mIGIgIT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblxuICAgICAgLy8gT2JqZWN0cyB3aXRoIGRpZmZlcmVudCBjb25zdHJ1Y3RvcnMgYXJlIG5vdCBlcXVpdmFsZW50LCBidXQgYE9iamVjdGBzIG9yIGBBcnJheWBzXG4gICAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGFDdG9yICE9PSBiQ3RvciAmJiAhKF8uaXNGdW5jdGlvbihhQ3RvcikgJiYgYUN0b3IgaW5zdGFuY2VvZiBhQ3RvciAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbihiQ3RvcikgJiYgYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgKCdjb25zdHJ1Y3RvcicgaW4gYSAmJiAnY29uc3RydWN0b3InIGluIGIpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuXG4gICAgLy8gSW5pdGlhbGl6aW5nIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIC8vIEl0J3MgZG9uZSBoZXJlIHNpbmNlIHdlIG9ubHkgbmVlZCB0aGVtIGZvciBvYmplY3RzIGFuZCBhcnJheXMgY29tcGFyaXNvbi5cbiAgICBhU3RhY2sgPSBhU3RhY2sgfHwgW107XG4gICAgYlN0YWNrID0gYlN0YWNrIHx8IFtdO1xuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT09IGEpIHJldHVybiBiU3RhY2tbbGVuZ3RoXSA9PT0gYjtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIGZpcnN0IG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnB1c2goYSk7XG4gICAgYlN0YWNrLnB1c2goYik7XG5cbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoYXJlQXJyYXlzKSB7XG4gICAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICAgIGxlbmd0aCA9IGEubGVuZ3RoO1xuICAgICAgaWYgKGxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgaWYgKCFlcShhW2xlbmd0aF0sIGJbbGVuZ3RoXSwgYVN0YWNrLCBiU3RhY2spKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgdmFyIGtleXMgPSBfLmtleXMoYSksIGtleTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMgYmVmb3JlIGNvbXBhcmluZyBkZWVwIGVxdWFsaXR5LlxuICAgICAgaWYgKF8ua2V5cyhiKS5sZW5ndGggIT09IGxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlclxuICAgICAgICBrZXkgPSBrZXlzW2xlbmd0aF07XG4gICAgICAgIGlmICghKF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBvYmplY3QgZnJvbSB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnBvcCgpO1xuICAgIGJTdGFjay5wb3AoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSAmJiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopIHx8IF8uaXNBcmd1bWVudHMob2JqKSkpIHJldHVybiBvYmoubGVuZ3RoID09PSAwO1xuICAgIHJldHVybiBfLmtleXMob2JqKS5sZW5ndGggPT09IDA7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSBhbiBvYmplY3Q/XG4gIF8uaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgcmV0dXJuIHR5cGUgPT09ICdmdW5jdGlvbicgfHwgdHlwZSA9PT0gJ29iamVjdCcgJiYgISFvYmo7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAsIGlzRXJyb3IuXG4gIF8uZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJywgJ0Vycm9yJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSA8IDkpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBfLmhhcyhvYmosICdjYWxsZWUnKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gT3B0aW1pemUgYGlzRnVuY3Rpb25gIGlmIGFwcHJvcHJpYXRlLiBXb3JrIGFyb3VuZCBzb21lIHR5cGVvZiBidWdzIGluIG9sZCB2OCxcbiAgLy8gSUUgMTEgKCMxNjIxKSwgYW5kIGluIFNhZmFyaSA4ICgjMTkyOSkuXG4gIGlmICh0eXBlb2YgLy4vICE9ICdmdW5jdGlvbicgJiYgdHlwZW9mIEludDhBcnJheSAhPSAnb2JqZWN0Jykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT0gJ2Z1bmN0aW9uJyB8fCBmYWxzZTtcbiAgICB9O1xuICB9XG5cbiAgLy8gSXMgYSBnaXZlbiBvYmplY3QgYSBmaW5pdGUgbnVtYmVyP1xuICBfLmlzRmluaXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIGlzRmluaXRlKG9iaikgJiYgIWlzTmFOKHBhcnNlRmxvYXQob2JqKSk7XG4gIH07XG5cbiAgLy8gSXMgdGhlIGdpdmVuIHZhbHVlIGBOYU5gPyAoTmFOIGlzIHRoZSBvbmx5IG51bWJlciB3aGljaCBkb2VzIG5vdCBlcXVhbCBpdHNlbGYpLlxuICBfLmlzTmFOID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8uaXNOdW1iZXIob2JqKSAmJiBvYmogIT09ICtvYmo7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBvYmogIT0gbnVsbCAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdGVlcy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIC8vIFByZWRpY2F0ZS1nZW5lcmF0aW5nIGZ1bmN0aW9ucy4gT2Z0ZW4gdXNlZnVsIG91dHNpZGUgb2YgVW5kZXJzY29yZS5cbiAgXy5jb25zdGFudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gIH07XG5cbiAgXy5ub29wID0gZnVuY3Rpb24oKXt9O1xuXG4gIF8ucHJvcGVydHkgPSBwcm9wZXJ0eTtcblxuICAvLyBHZW5lcmF0ZXMgYSBmdW5jdGlvbiBmb3IgYSBnaXZlbiBvYmplY3QgdGhhdCByZXR1cm5zIGEgZ2l2ZW4gcHJvcGVydHkuXG4gIF8ucHJvcGVydHlPZiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT0gbnVsbCA/IGZ1bmN0aW9uKCl7fSA6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIHByZWRpY2F0ZSBmb3IgY2hlY2tpbmcgd2hldGhlciBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gc2V0IG9mXG4gIC8vIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLm1hdGNoZXIgPSBfLm1hdGNoZXMgPSBmdW5jdGlvbihhdHRycykge1xuICAgIGF0dHJzID0gXy5leHRlbmRPd24oe30sIGF0dHJzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gXy5pc01hdGNoKG9iaiwgYXR0cnMpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUnVuIGEgZnVuY3Rpb24gKipuKiogdGltZXMuXG4gIF8udGltZXMgPSBmdW5jdGlvbihuLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciBhY2N1bSA9IEFycmF5KE1hdGgubWF4KDAsIG4pKTtcbiAgICBpdGVyYXRlZSA9IG9wdGltaXplQ2IoaXRlcmF0ZWUsIGNvbnRleHQsIDEpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdGVlKGkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IChpbmNsdXNpdmUpLlxuICBfLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgaWYgKG1heCA9PSBudWxsKSB7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgfTtcblxuICAvLyBBIChwb3NzaWJseSBmYXN0ZXIpIHdheSB0byBnZXQgdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGFuIGludGVnZXIuXG4gIF8ubm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9O1xuXG4gICAvLyBMaXN0IG9mIEhUTUwgZW50aXRpZXMgZm9yIGVzY2FwaW5nLlxuICB2YXIgZXNjYXBlTWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjeDI3OycsXG4gICAgJ2AnOiAnJiN4NjA7J1xuICB9O1xuICB2YXIgdW5lc2NhcGVNYXAgPSBfLmludmVydChlc2NhcGVNYXApO1xuXG4gIC8vIEZ1bmN0aW9ucyBmb3IgZXNjYXBpbmcgYW5kIHVuZXNjYXBpbmcgc3RyaW5ncyB0by9mcm9tIEhUTUwgaW50ZXJwb2xhdGlvbi5cbiAgdmFyIGNyZWF0ZUVzY2FwZXIgPSBmdW5jdGlvbihtYXApIHtcbiAgICB2YXIgZXNjYXBlciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuICAgIC8vIFJlZ2V4ZXMgZm9yIGlkZW50aWZ5aW5nIGEga2V5IHRoYXQgbmVlZHMgdG8gYmUgZXNjYXBlZFxuICAgIHZhciBzb3VyY2UgPSAnKD86JyArIF8ua2V5cyhtYXApLmpvaW4oJ3wnKSArICcpJztcbiAgICB2YXIgdGVzdFJlZ2V4cCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIHZhciByZXBsYWNlUmVnZXhwID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBzdHJpbmcgPSBzdHJpbmcgPT0gbnVsbCA/ICcnIDogJycgKyBzdHJpbmc7XG4gICAgICByZXR1cm4gdGVzdFJlZ2V4cC50ZXN0KHN0cmluZykgPyBzdHJpbmcucmVwbGFjZShyZXBsYWNlUmVnZXhwLCBlc2NhcGVyKSA6IHN0cmluZztcbiAgICB9O1xuICB9O1xuICBfLmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIoZXNjYXBlTWFwKTtcbiAgXy51bmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIodW5lc2NhcGVNYXApO1xuXG4gIC8vIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgYHByb3BlcnR5YCBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0IHdpdGggdGhlXG4gIC8vIGBvYmplY3RgIGFzIGNvbnRleHQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHksIGZhbGxiYWNrKSB7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0ID09IG51bGwgPyB2b2lkIDAgOiBvYmplY3RbcHJvcGVydHldO1xuICAgIGlmICh2YWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICB2YWx1ZSA9IGZhbGxiYWNrO1xuICAgIH1cbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlLmNhbGwob2JqZWN0KSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx1MjAyOHxcXHUyMDI5L2c7XG5cbiAgdmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihtYXRjaCkge1xuICAgIHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTtcbiAgfTtcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICAvLyBOQjogYG9sZFNldHRpbmdzYCBvbmx5IGV4aXN0cyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBzZXR0aW5ncywgb2xkU2V0dGluZ3MpIHtcbiAgICBpZiAoIXNldHRpbmdzICYmIG9sZFNldHRpbmdzKSBzZXR0aW5ncyA9IG9sZFNldHRpbmdzO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldCkucmVwbGFjZShlc2NhcGVyLCBlc2NhcGVDaGFyKTtcbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9IGVsc2UgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfSBlbHNlIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuXG4gICAgICAvLyBBZG9iZSBWTXMgbmVlZCB0aGUgbWF0Y2ggcmV0dXJuZWQgdG8gcHJvZHVjZSB0aGUgY29ycmVjdCBvZmZlc3QuXG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyAncmV0dXJuIF9fcDtcXG4nO1xuXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdmFyIGFyZ3VtZW50ID0gc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaic7XG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyBhcmd1bWVudCArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLiBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgaW5zdGFuY2UgPSBfKG9iaik7XG4gICAgaW5zdGFuY2UuX2NoYWluID0gdHJ1ZTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKGluc3RhbmNlLCBvYmopIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgXy5lYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXN1bHQodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBfLmVhY2goWydwb3AnLCAncHVzaCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy5fd3JhcHBlZDtcbiAgICAgIG1ldGhvZC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoKG5hbWUgPT09ICdzaGlmdCcgfHwgbmFtZSA9PT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0KHRoaXMsIG9iaik7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWRkIGFsbCBhY2Nlc3NvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIF8uZWFjaChbJ2NvbmNhdCcsICdqb2luJywgJ3NsaWNlJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gIF8ucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gIH07XG5cbiAgLy8gUHJvdmlkZSB1bndyYXBwaW5nIHByb3h5IGZvciBzb21lIG1ldGhvZHMgdXNlZCBpbiBlbmdpbmUgb3BlcmF0aW9uc1xuICAvLyBzdWNoIGFzIGFyaXRobWV0aWMgYW5kIEpTT04gc3RyaW5naWZpY2F0aW9uLlxuICBfLnByb3RvdHlwZS52YWx1ZU9mID0gXy5wcm90b3R5cGUudG9KU09OID0gXy5wcm90b3R5cGUudmFsdWU7XG5cbiAgXy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJycgKyB0aGlzLl93cmFwcGVkO1xuICB9O1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUnLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxufS5jYWxsKHRoaXMpKTtcbiJdfQ==
