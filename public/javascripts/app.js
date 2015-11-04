(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var application = require('./js/application');

$(function() {

  	application.initialize();
  	Backbone.history.start({ pushState: true });
  	
});
},{"./js/application":2}],2:[function(require,module,exports){
var Application = {
  domainPattern : /http:\/\/[\w\.]*\//g,
  initialize: function initializeApplication() {
   
  	var AppView = require('./views/app');
  	var Router = require('./routers/router');
  	var Thesaurus = require('./models/thesaurus');
    
      this.collection = new Thesaurus();
      this.appView = new AppView({collection : this.collection, attributes : { application: this }}).render();
      this.router = new Router({collection : this.collection, attributes : { application: this }});
  
  },
  processUri : function processUriApplication(uri){
    //if the beginning of the uri is the same as the location    
    if(uri.search(location.origin) !== -1){
      return uri.replace(location.origin, "");
    }else if(uri.search("uri=http") === -1){
      return uri.replace("http", "uri=http");
    }else{
      return uri;
    }
  	/*if(uri.search(this.domainPattern) != -1){
  		return uri.replace(this.domainPattern, '');
  	}else{
  		return uri;
  	}*/
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
    //console.log("bonjour", this.attributes);
  	this.set('uri', this.attributes["@id"]);
  	var urlParts = this.attributes["@id"].split("/").join("");
    this.set('id', urlParts.substring((urlParts.length -10), urlParts.length));
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
},{}],4:[function(require,module,exports){
var jsonld = require('jsonld');
var concept = require('./concept');
var application = require('../application');
module.exports = Backbone.Collection.extend({
  
  model: concept,
  loaded: false,
  activeURI : null,
  activeThesaurus : null,
  thesaurusNames : {'InstrumentsKeywords' : 'MIMO Thesaurus', 'hs': 'Sachs & Hornbostel classification'},
  url: 'http://localhost:9091/',
  thesauri : [
    {'id' : 'http://www.mimo-db.eu/InstrumentsKeywords', 'pattern' : 'http://www.mimo-db.eu/InstrumentsKeywords', 'endpoint' : 'http://data.mimo-db.eu:9091/sparql/describe?uri=', 'data': 'http://www.mimo-db.eu/data/InstrumentsKeywords.json', 'base': 'http://www.mimo-db.eu/', 'name' : 'MIMO Thesaurus'},
    {'id' : 'http://www.mimo-db.eu/HornbostelAndSachs', 'pattern' : 'http://www.mimo-db.eu/HornbostelAndSachs', 'endpoint' : 'http://data.mimo-db.eu:9091/sparql/describe?uri=', 'data': 'http://www.mimo-db.eu/data/HornbostelAndSachs.json', 'base': 'http://www.mimo-db.eu/', 'name': 'Sachs & Hornbostel classification'}
  ],
  viewTypes : [{ 'id' : 1, 'name' : 'circular tree'},{ 'id' : 2, 'name' : 'tree'}],
  //viewType :  1,
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

    if(!this.loaded && this.activeThesaurus){
      //this.loadData();
    }
 
  },

  getActiveConcept : function getActiveConceptThesaurus(){
    
    var theconcept = this.models.filter(function(element){
      return element.attributes.uri === this.activeURI;
    }.bind(this));

    //console.log("oh ?", this.activeURI, theconcept[0]);
    return theconcept[0] || null;
  },
  getActiveThesaurus : function getActiveThesaurus(){
    var theconcept = _.findWhere(this.models, {'@type' : 'ConceptScheme'});
    if(theconcept === undefined){
      theconcept = {
        "conceptScheme" : this.activeThesaurus.id,
        "type" : "skos:ConceptScheme",
        "prefLabel" : [this.activeThesaurus.name]
      }
    }
    return theconcept;
  },
  getViewTypes : function getViewTypesThesaurus(){
    var viewType = this.getViewType();
    this.viewTypes.forEach(function (element, index) {
      if(element.id === viewType) {
        this.selected = true;
      }else{
        this.selected = false;
      }
    });
    return this.viewTypes;
  },
  setViewType : function setViewTypeThesaurus(type){
    sessionStorage.setItem("viewType", type);
    this.trigger("viewTypeChanged", this);
  },
  getViewType : function getViewTypeThesaurus(){
    var viewType = Number(sessionStorage.getItem("viewType")) || 1;
    return viewType;

  },

  getThesaurusName : function getThesaurusName(thesaurusUri, conceptUri){
    return this.activeThesaurus.name;
  },
  matchAnyThesaurus : function matchAnyThesaurus(uri){
    for(var i = 0; i< this.thesauri.length; i++){
      var thesaurus = this.thesauri[i];
      if(this.matchPatternThesaurus(thesaurus.pattern, uri)) return true;
    }
    return false;
  },
  matchPatternThesaurus : function matchPatternThesaurus(pattern, uri){
     var myRegExp = new RegExp("^" + pattern + "([\\w\\/\\.]*)", "g");
     return (uri.match(myRegExp) !== null)? true: false;
  },
  setActiveURI : function setActiveURIThesaurus(uri){
    
    if(uri.search("http") === -1) uri = location.origin + "/" + uri;
    
    var isFullThesaurus;
    var whichThesaurus = this.thesauri.filter(function(element){
      var myRegExp = new RegExp("^" + element.pattern + "([\\w\\/\\.]*)", "g");
      if (element.id === uri) {
        isFullThesaurus = true;
        return element;
      }else if(this.matchPatternThesaurus(element.pattern, uri)){
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
        //console.log("??", whichThesaurus.endpoint + uri);
        //else : if URI uses same pattern as one thesaurus => look for it in the associated SPARQL endpoints       
        this.loadURI(uri, whichThesaurus[0]);
      }
    }else{
      this.activeThesaurus = this.thesauri[0];
      this.loadThesaurus(this.thesauri[0]);
    }
    //else : search all SPARQL endpoints ?
    
  },
  loadURI : function loadURIThesaurus(uri, thesaurus){
    //if(){
    //console.log("on y go", uri, thesaurus);
    if(uri != this.activeURI){
      this.activeURI = uri;
      this.trigger("conceptChanged", this);

      if(this.activeThesaurus === null || this.activeThesaurus.id !== thesaurus.id){
        //this.reset();
        this.activeThesaurus = thesaurus;
        $.ajax({
          'url': thesaurus.endpoint + uri,
          'headers': {'Accept' : 'application/ld+json'},
          'dataType': 'json',
          'context': this
        }).done(function(collection){
          collection = _.where(collection, {'@id': uri});
          //console.log("collection filtrée ", collection);
          jsonld.compact(collection, this.context, function(err, compacted) {
       
            this.prepareData([compacted]);
            this.trigger("conceptChanged", this);
            this.loadThesaurus(thesaurus);
          }.bind(this));
        }).fail(function(error){
          this.loadThesaurus(thesaurus);
        });
      }
    }
  },
  loadThesaurus : function loadThesaurus(thesaurus){

    var loadingCompleted  = function (collection){
      //console.log("collection", collection);
      jsonld.compact(collection, this.context, function(err, compacted) { 
        //reset the collection
        //console.log("compacted",compacted);
        this.prepareData(compacted["@graph"]);
        this.loaded = true;
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
        console.log(error);
      })
    });
    
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
},{"../application":2,"./concept":3,"jsonld":29}],5:[function(require,module,exports){
var application = require('../application');
module.exports = Backbone.Router.extend({
    routes:{
      "about" : "showAbout",
      "*other"    : "defaultRoute"
    },
    
    showAbout: function showAbout( ) {
      // Set the current filter to be used
      //console.log("On aimerait afficher les infos ");
    },

    defaultRoute: function(other){
      //console.log('You attempted to reach:' + other);
      if(!other) other = "";
      other = other.replace("uri=", "");
      application.collection.setActiveURI(other);
      Backbone.history.checkUrl();
    }

});
},{"../application":2}],6:[function(require,module,exports){
var View = require('./view');
var ConceptView = require('./concept');
var NavView = require('./nav');
var SelectNavView = require('./selectNav');

var _ = require('underscore');

module.exports = View.extend({
    
    el: '#vizskos',
    template : require('./templates/main.hbs'),

    afterRender: function afterRenderApp() {
     
      this.conceptView = new ConceptView({collection : this.collection, el: this.$('article')});
      this.navView = new NavView({collection : this.collection, el: this.$('nav.nav')});
      this.selectNavView = new SelectNavView({collection : this.collection, el: this.$('.tools') });


    }
});
},{"./concept":7,"./nav":8,"./selectNav":11,"./templates/main.hbs":14,"./view":16,"underscore":32}],7:[function(require,module,exports){
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
    
    // The ConceptView listens for changes to its model, re-rendering. 
    // Since there's only one **Concept** displayed in detail 

    afterInit: function afterInitConcept(){
      this.listenTo(this.collection, 'conceptChanged', this.render);
      this.listenTo(this.collection, 'conceptToggled', this.conceptToggled);
    },
    getRenderData: function getConceptRenderData(){
      this.model = this.collection.getActiveConcept();
      //console.log("le modele",themodel.attributes);
      return this.model ? $.extend({ language :'en' }, this.model.attributes) : this.collection.getActiveThesaurus();
    },
    // Close the concept section
    close: function closeConcept(element) {
      this.collection.toggleConcept();
      element.preventDefault();
    },
    next: function nextConcept(element) {
      var newmodel = this.model.getRelative(1);
      application.router.navigate(application.processUri(newmodel.attributes["@id"]), {trigger : true});
      element.preventDefault();
    },
    prev: function prevConcept(element) {
      var newmodel = this.model.getRelative(-1);
      application.router.navigate(application.processUri(newmodel.attributes["@id"]), {trigger : true});
      element.preventDefault();
    },
    conceptToggled: function conceptToggledConcept(element) {
      if(this.collection.conceptClosed && this.collection.activeURI){
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
},{"../application":2,"./templates/concept.hbs":12,"./templates/helpers.js":13,"./view":16}],8:[function(require,module,exports){
var View = require('./view');
var NavCircle = require('./navCircle');
var NavTree = require('./navTree');
module.exports = View.extend({


    // The NavView listens for changes to its model, re-rendering.
    afterInit: function afterInitNav(){
     
      this.listenTo(this.collection, 'viewTypeChanged', this.render);
      this.listenTo(this.collection, 'dataChanged', this.render);

    },
    
    // Re-renders the titles of the todo item.
    render: function renderNav() {
      this.$el.empty();
      
      if(this.collection.getViewType() === 1){
        this.navView = new NavCircle({collection : this.collection}).preRender();
      }else if(this.collection.getViewType() === 2){
        this.navView = new NavTree({collection : this.collection}).preRender();
      }

    }

});

},{"./navCircle":9,"./navTree":10,"./view":16}],9:[function(require,module,exports){
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
    resize: function resizeNav() {
      this.initSize();
      
      this.cluster
        .size([360, this.yRadius - this.whiteRadius]);

      this.svg
        .style("width", this.width + "px")
        .style("height", this.height + "px");

      this.vis
        .attr("width", this.width)
        .attr("height", this.height);

      this.render();
    },

    // The NavView listens for changes to its model, re-rendering.
    afterInit: function afterInitNav(){
     
      $(window).on("resize", this.resize.bind(this));

      this.listenTo(this.collection, 'conceptChanged', this.showSelectedNode);
      this.listenTo(this.collection, 'navChanged', this.preRender);

    },
    
    // Re-renders the titles of the todo item.
    preRender: function preRenderNav() {
      
      if(this.collection.loaded){
        
        this.initSize();
     
      this.cluster = d3.layout.tree()
        .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
 
      //
      this.diagonal = d3.svg.diagonal.radial()
        .projection( function(d) { return [d.y, d.x / 180 * Math.PI]; } );
      //
      
      this.svg = d3.select("#vizskos .nav");
      this.vis =  d3.select("#vizskos .nav svg");
      if(this.vis) this.vis.remove();

      this.vis = this.svg.append("svg:svg");
      //
      this.main = this.vis
        .append("svg:g")
          .attr("class", "main " + this.collection.activeThesaurus);
      //partition view
      this.partition = d3.layout.partition()
        .value(function(d) { return d.size; });

      this.zoom = d3.behavior.zoom()
        .on("zoom", this.changeScale.bind(this));


        this.root = this.collection.conceptTree;
        this.root.x0 = this.height / 2;
        this.root.y0 = 0;
          
        this.arc = this.main.append("svg:path")
          .attr("class", "arc");
        
        //console.log(this.conceptTree);
        this.render(this.root);
        this.resize();
        this.showSelectedNode();
      }
 
    },
    render : function renderNav(source) {
      if(this.collection.loaded){
        var nodes = this.cluster.nodes(this.collection.conceptTree);
        var links = this.cluster.links(nodes);
        var whiteRadius = this.whiteRadius;

        this.main
            .attr("transform", "translate(" + (100 + this.xRadius ) + "," + (25 + this.yRadius) + ")");

        this.main.call(this.zoom);

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
            .attr("transform", function(d,i) {return  "rotate(" + (source.x - 90) + ")translate(" + (source.y ) + ")"; });
          
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
      }
    },
    toggleNode: function toggleNodeNav(d, i) {
      
      if (d.children) {
        d._children = d.children;
        d.children = null;              
      } else {
        d.children = d._children;
        d._children = null;
      }
      this.render(d);
      //console.log(d);
    },
    showSelectedNode: function showSelectedNodeNav(uri) {
      //if(this.collection.loaded){
        d3.select(".node.selected").classed("selected", false);
        var themodel = this.collection.getActiveConcept();
        if(themodel) d3.select(".node_"+ themodel.attributes.id).classed("selected", true);
      //}
    },
    selectNode: function selectNodeNav(d, i) {
      //console.log("on va voir", application.processUri(d.id));
      application.router.navigate(application.processUri(d.uri), {trigger : true});
      //backbone being smart enough not to trigger the route if concept already selected
      //we need to make sure the pop-up is open
      if(this.collection.activeConceptId == d.uri) {
        this.collection.toggleConcept(true);
      }
      d3.event.stopPropagation();
    }

});

},{"../application":2,"./view":16}],10:[function(require,module,exports){
var View = require('./view');
var application = require('../application');
module.exports = View.extend({

    initSize: function initSizeNav() {
      this.height = $(window).height();
      this.width = $(window).width() ;
      this.i = 0;
      this.duration = 750;
    },

    resize: function resizeNav() {
      this.initSize();
 
      this.svg
        .style("width", this.width + "px")
        .style("height", this.height + "px");

      this.vis
        .attr("width", this.width)
        .attr("height", this.height);

      this.render();
    },

    // The NavView listens for changes to its model, re-rendering.
    afterInit: function afterInitNav(){

      $(window).on("resize", this.resize.bind(this));
      this.listenTo(this.collection, 'conceptChanged', this.showSelectedNode);
      this.listenTo(this.collection, 'navChanged', this.preRender);

    },
    
    // Re-renders the titles of the todo item.
    preRender: function preRenderNav() {
  
      if(this.collection.loaded){

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

        this.root = this.collection.conceptTree;
        this.root.x0 = this.height / 2;
        this.root.y0 = 0;
        this.render(this.root);

        this.resize();
        this.showSelectedNode();
      }
 
    },
    render : function renderNav(source) {

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
      //}
    },
    toggleNode: function toggleNodeNav(d, i) {
      //console.log("update",d);
      if (d.children) {
        d._children = d.children;
        d.children = null;              
      } else {
        d.children = d._children;
        d._children = null;
      }
      this.render(d);
      //console.log(d);
    },
    showSelectedNode: function showSelectedNodeNav(uri) {
      //if(this.collection.loaded){
        d3.select(".node.selected").classed("selected", false);
        var themodel = this.collection.getActiveConcept();
        if(themodel) d3.select(".node_"+ themodel.attributes.id).classed("selected", true);
      //}
    },
    selectNode: function selectNodeNav(d, i) {
      //
      application.router.navigate(application.processUri(d.uri), {trigger : true});
      //backbone being smart enough not to trigger the route if concept already selected
      //we need to make sure the pop-up is open
      if(this.collection.activeConceptId == d.uri) {
        this.collection.toggleConcept(true);
      }
      d3.event.stopPropagation();
    }

});

},{"../application":2,"./view":16}],11:[function(require,module,exports){
var View = require('./view');

module.exports = View.extend({
    
    template : require('./templates/selectNav.hbs'),
    // The DOM events specific to a concept.
    events: {
      'change #selectNav': 'selectNav',
    },
    //
    afterInit: function afterInitSelectNav(){
      this.listenTo(this.collection, 'dataChanged', this.render);
    },
    //
    getRenderData: function getRenderDataSelectNav(){
      return{
        viewTypes : this.collection.getViewTypes()
      };
    },
    //  
    selectNav: function selectNav(event) {
      //console.log("SALUT", Number($(event.target).val()));
      
      this.collection.setViewType(Number($(event.target).val()));
    }

});
},{"./templates/selectNav.hbs":15,"./view":16}],12:[function(require,module,exports){
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

},{"hbsfy/runtime":27}],13:[function(require,module,exports){
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
},{"../../application":2,"hbsfy/runtime":27}],14:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "\n<main class=\"main\">\n  <header><a href=\"/InstrumentsKeywords/\"><img src=\"/images/logos/mimo.png\" alt=\"MIMO - Musical Instruments Museums Online\" /></a>\n  	<nav class=\"tools\"></nav>\n  </header>\n  <nav class=\"nav\">\n    \n  </nav>\n  <article></article>\n</main>\n<footer></footer>\n";
  });

},{"hbsfy/runtime":27}],15:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
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
function program2(depth0,data) {
  
  
  return " selected=\"selected\" ";
  }

  buffer += "<!--<ul class=\"schemes\">\n	";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.thesaurusNames), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</ul>-->\n<form>\n	<select id=\"selectNav\" name=\"selectNav\">\n	";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.viewTypes), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n	</select>\n	<!--<input name=\"search\" id=\"search\" placeholder=\"Rechercher\" />-->\n</form>";
  return buffer;
  });

},{"hbsfy/runtime":27}],16:[function(require,module,exports){
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
},{"./templates/helpers":13,"underscore":32}],17:[function(require,module,exports){

},{}],18:[function(require,module,exports){
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
},{"sfauuP":19}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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
},{"./handlebars/base":21,"./handlebars/exception":22,"./handlebars/runtime":23,"./handlebars/safe-string":24,"./handlebars/utils":25}],21:[function(require,module,exports){
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
},{"./exception":22,"./utils":25}],22:[function(require,module,exports){
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
},{}],23:[function(require,module,exports){
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
},{"./base":21,"./exception":22,"./utils":25}],24:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],25:[function(require,module,exports){
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
},{"./safe-string":24}],26:[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime');

},{"./dist/cjs/handlebars.runtime":20}],27:[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":26}],28:[function(require,module,exports){
// Ignore module for browserify (see package.json)
},{}],29:[function(require,module,exports){
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
},{"./request":28,"crypto":28,"es6-promise":30,"http":28,"pkginfo":31,"request":28,"sfauuP":19,"util":28,"xmldom":28}],30:[function(require,module,exports){
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
},{"sfauuP":19}],31:[function(require,module,exports){
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
},{"fs":17,"path":18}],32:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS1icnVuY2gvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2luaXRpYWxpemUuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL2FwcGxpY2F0aW9uLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy9tb2RlbHMvY29uY2VwdC5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvbW9kZWxzL3RoZXNhdXJ1cy5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvcm91dGVycy9yb3V0ZXIuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL3ZpZXdzL2FwcC5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3MvY29uY2VwdC5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3MvbmF2LmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy92aWV3cy9uYXZDaXJjbGUuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL3ZpZXdzL25hdlRyZWUuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3MvYXBwL2pzL3ZpZXdzL3NlbGVjdE5hdi5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3MvdGVtcGxhdGVzL2NvbmNlcHQuaGJzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy92aWV3cy90ZW1wbGF0ZXMvaGVscGVycy5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3MvdGVtcGxhdGVzL21haW4uaGJzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL2FwcC9qcy92aWV3cy90ZW1wbGF0ZXMvc2VsZWN0TmF2LmhicyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9hcHAvanMvdmlld3Mvdmlldy5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS1icnVuY2gvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnktYnJ1bmNoL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcGF0aC1icm93c2VyaWZ5L2luZGV4LmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5LWJydW5jaC9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzLnJ1bnRpbWUuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvZXhjZXB0aW9uLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvdXRpbHMuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvaGJzZnkvcnVudGltZS5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvanNvbmxkL2Jyb3dzZXIvaWdub3JlLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9qc29ubGQvanMvanNvbmxkLmpzIiwiL1VzZXJzL21kZXN0YW5kYXUvRG9jdW1lbnRzL0RvcmVtdXMvdml6c2tvcy92aXpza29zL25vZGVfbW9kdWxlcy9qc29ubGQvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvZXM2LXByb21pc2UuanMiLCIvVXNlcnMvbWRlc3RhbmRhdS9Eb2N1bWVudHMvRG9yZW11cy92aXpza29zL3ZpenNrb3Mvbm9kZV9tb2R1bGVzL2pzb25sZC9ub2RlX21vZHVsZXMvcGtnaW5mby9saWIvcGtnaW5mby5qcyIsIi9Vc2Vycy9tZGVzdGFuZGF1L0RvY3VtZW50cy9Eb3JlbXVzL3ZpenNrb3Mvdml6c2tvcy9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBOztBQ0RBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzduT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqOEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGFwcGxpY2F0aW9uID0gcmVxdWlyZSgnLi9qcy9hcHBsaWNhdGlvbicpO1xuXG4kKGZ1bmN0aW9uKCkge1xuXG4gIFx0YXBwbGljYXRpb24uaW5pdGlhbGl6ZSgpO1xuICBcdEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoeyBwdXNoU3RhdGU6IHRydWUgfSk7XG4gIFx0XG59KTsiLCJ2YXIgQXBwbGljYXRpb24gPSB7XG4gIGRvbWFpblBhdHRlcm4gOiAvaHR0cDpcXC9cXC9bXFx3XFwuXSpcXC8vZyxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gaW5pdGlhbGl6ZUFwcGxpY2F0aW9uKCkge1xuICAgXG4gIFx0dmFyIEFwcFZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL2FwcCcpO1xuICBcdHZhciBSb3V0ZXIgPSByZXF1aXJlKCcuL3JvdXRlcnMvcm91dGVyJyk7XG4gIFx0dmFyIFRoZXNhdXJ1cyA9IHJlcXVpcmUoJy4vbW9kZWxzL3RoZXNhdXJ1cycpO1xuICAgIFxuICAgICAgdGhpcy5jb2xsZWN0aW9uID0gbmV3IFRoZXNhdXJ1cygpO1xuICAgICAgdGhpcy5hcHBWaWV3ID0gbmV3IEFwcFZpZXcoe2NvbGxlY3Rpb24gOiB0aGlzLmNvbGxlY3Rpb24sIGF0dHJpYnV0ZXMgOiB7IGFwcGxpY2F0aW9uOiB0aGlzIH19KS5yZW5kZXIoKTtcbiAgICAgIHRoaXMucm91dGVyID0gbmV3IFJvdXRlcih7Y29sbGVjdGlvbiA6IHRoaXMuY29sbGVjdGlvbiwgYXR0cmlidXRlcyA6IHsgYXBwbGljYXRpb246IHRoaXMgfX0pO1xuICBcbiAgfSxcbiAgcHJvY2Vzc1VyaSA6IGZ1bmN0aW9uIHByb2Nlc3NVcmlBcHBsaWNhdGlvbih1cmkpe1xuICAgIC8vaWYgdGhlIGJlZ2lubmluZyBvZiB0aGUgdXJpIGlzIHRoZSBzYW1lIGFzIHRoZSBsb2NhdGlvbiAgICBcbiAgICBpZih1cmkuc2VhcmNoKGxvY2F0aW9uLm9yaWdpbikgIT09IC0xKXtcbiAgICAgIHJldHVybiB1cmkucmVwbGFjZShsb2NhdGlvbi5vcmlnaW4sIFwiXCIpO1xuICAgIH1lbHNlIGlmKHVyaS5zZWFyY2goXCJ1cmk9aHR0cFwiKSA9PT0gLTEpe1xuICAgICAgcmV0dXJuIHVyaS5yZXBsYWNlKFwiaHR0cFwiLCBcInVyaT1odHRwXCIpO1xuICAgIH1lbHNle1xuICAgICAgcmV0dXJuIHVyaTtcbiAgICB9XG4gIFx0LyppZih1cmkuc2VhcmNoKHRoaXMuZG9tYWluUGF0dGVybikgIT0gLTEpe1xuICBcdFx0cmV0dXJuIHVyaS5yZXBsYWNlKHRoaXMuZG9tYWluUGF0dGVybiwgJycpO1xuICBcdH1lbHNle1xuICBcdFx0cmV0dXJuIHVyaTtcbiAgXHR9Ki9cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvbjsiLCJtb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cbiAgLy8gRGVmYXVsdFxuICBkZWZhdWx0czoge1xuICAgIGNvbmNlcHQgOiB0cnVlXG4gIH0sXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIGluaXRpYWxpemVDb25jZXB0KCl7XG4gICAgLy9jb25zb2xlLmxvZyhcImJvbmpvdXJcIiwgdGhpcy5hdHRyaWJ1dGVzKTtcbiAgXHR0aGlzLnNldCgndXJpJywgdGhpcy5hdHRyaWJ1dGVzW1wiQGlkXCJdKTtcbiAgXHR2YXIgdXJsUGFydHMgPSB0aGlzLmF0dHJpYnV0ZXNbXCJAaWRcIl0uc3BsaXQoXCIvXCIpLmpvaW4oXCJcIik7XG4gICAgdGhpcy5zZXQoJ2lkJywgdXJsUGFydHMuc3Vic3RyaW5nKCh1cmxQYXJ0cy5sZW5ndGggLTEwKSwgdXJsUGFydHMubGVuZ3RoKSk7XG4gICAgdGhpcy5zZXQoJ3R5cGUnLCB0aGlzLmF0dHJpYnV0ZXNbXCJAdHlwZVwiXSk7XG5cbiAgICBpZih0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmluU2NoZW1lXCJdKXtcbiAgICAgIHRoaXMuc2V0KCdjb25jZXB0U2NoZW1lJywgdGhpcy5hdHRyaWJ1dGVzW1wic2tvczppblNjaGVtZVwiXSk7XG4gICAgfWVsc2UgaWYodGhpcy5hdHRyaWJ1dGVzW1wic2tvczp0b3BDb25jZXB0T2ZcIl0pe1xuICAgICAgdGhpcy5zZXQoJ2NvbmNlcHRTY2hlbWUnLCB0aGlzLmF0dHJpYnV0ZXNbXCJza29zOnRvcENvbmNlcHRPZlwiXSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBzY2hlbWUgPSB0aGlzLmNvbGxlY3Rpb24uZ2V0VGhlc2F1cnVzTmFtZSh0aGlzLmdldCgnY29uY2VwdFNjaGVtZScpLCB0aGlzLmF0dHJpYnV0ZXNbXCJAaWRcIl0pO1xuICAgIHRoaXMuc2V0KCdjb25jZXB0U2NoZW1lTmFtZScsIHNjaGVtZS5uYW1lKTtcbiAgICB0aGlzLnNldCgnY29uY2VwdFNjaGVtZUNsYXNzJywgc2NoZW1lLmNsYXNzKTtcbiAgICBcbiAgICBpZih0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmFsdExhYmVsXCJdKXtcbiAgICAgIHRoaXMuc2V0KCdhbHRMYWJlbCcsIEFycmF5LmlzQXJyYXkodGhpcy5hdHRyaWJ1dGVzW1wic2tvczphbHRMYWJlbFwiXSkgPyBfLnNvcnRCeSh0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmFsdExhYmVsXCJdLCB0aGlzLnNvcnRCeUxhbmd1YWdlKSA6IFt0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmFsdExhYmVsXCJdXSApO1xuICAgIH1cbiAgICBpZih0aGlzLmF0dHJpYnV0ZXNbXCJza29zOnByZWZMYWJlbFwiXSl7XG4gICAgICB0aGlzLnNldCgncHJlZkxhYmVsJywgQXJyYXkuaXNBcnJheSh0aGlzLmF0dHJpYnV0ZXNbXCJza29zOnByZWZMYWJlbFwiXSk/IF8uc29ydEJ5KHRoaXMuYXR0cmlidXRlc1tcInNrb3M6cHJlZkxhYmVsXCJdLCB0aGlzLnNvcnRCeUxhbmd1YWdlKSA6IFt0aGlzLmF0dHJpYnV0ZXNbXCJza29zOnByZWZMYWJlbFwiXV0gKTtcbiAgICB9XG4gICAgaWYodGhpcy5hdHRyaWJ1dGVzW1wic2tvczpoYXNUb3BDb25jZXB0XCJdKXtcbiAgICAgIGlmKEFycmF5LmlzQXJyYXkodGhpcy5hdHRyaWJ1dGVzW1wic2tvczpoYXNUb3BDb25jZXB0XCJdKSl7XG4gICAgICAgIHRoaXMuc2V0KCdoYXNUb3BDb25jZXB0JywgdGhpcy5hdHRyaWJ1dGVzW1wic2tvczpoYXNUb3BDb25jZXB0XCJdLm1hcChmdW5jdGlvbihlbHQpeyByZXR1cm4gZWx0W1wiQGlkXCJdO30pKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLnNldCgnaGFzVG9wQ29uY2VwdCcsIHRoaXMuYXR0cmlidXRlc1tcInNrb3M6aGFzVG9wQ29uY2VwdFwiXVtcIkBpZFwiXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmKHRoaXMuYXR0cmlidXRlc1tcInNrb3M6bmFycm93ZXJcIl0pe1xuICAgICAgdGhpcy5zZXQoJ25hcnJvd2VyJywgQXJyYXkuaXNBcnJheSh0aGlzLmF0dHJpYnV0ZXNbXCJza29zOm5hcnJvd2VyXCJdKT8gdGhpcy5hdHRyaWJ1dGVzW1wic2tvczpuYXJyb3dlclwiXSA6IFt0aGlzLmF0dHJpYnV0ZXNbXCJza29zOm5hcnJvd2VyXCJdXSk7XG4gICAgfVxuICAgIGlmKHRoaXMuYXR0cmlidXRlc1tcInNrb3M6ZXhhY3RNYXRjaFwiXSl7XG4gICAgICB0aGlzLnNldCgnZXhhY3RNYXRjaCcsIEFycmF5LmlzQXJyYXkodGhpcy5hdHRyaWJ1dGVzW1wic2tvczpleGFjdE1hdGNoXCJdKSA/IHRoaXMuYXR0cmlidXRlc1tcInNrb3M6ZXhhY3RNYXRjaFwiXSA6IFt0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmV4YWN0TWF0Y2hcIl1dKTtcbiAgICB9XG4gICAgaWYodGhpcy5hdHRyaWJ1dGVzW1wic2tvczpjbG9zZU1hdGNoXCJdICl7XG4gICAgICB0aGlzLnNldCgnY2xvc2VNYXRjaCcsIEFycmF5LmlzQXJyYXkodGhpcy5hdHRyaWJ1dGVzW1wic2tvczpjbG9zZU1hdGNoXCJdKSA/IHRoaXMuYXR0cmlidXRlc1tcInNrb3M6Y2xvc2VNYXRjaFwiXSA6IFt0aGlzLmF0dHJpYnV0ZXNbXCJza29zOmNsb3NlTWF0Y2hcIl1dKTtcbiAgICB9XG4gICAgLy90aGlzLnNldFByZWZMYWJlbHMoKTtcbiAgICAvL2NvbnNvbGUubG9nKFwib24gdGVzdGVcIiwgdGhpcy5nZXROYW1lZFJlbGF0ZWRDb25jZXB0cyh0aGlzLmF0dHJpYnV0ZXNbXCJza29zOm5hcnJvd2VyXCJdKSk7XG4gIH0sXG4gIGdldE5hbWVkUmVsYXRlZENvbmNlcHRzOiBmdW5jdGlvbiBnZXROYW1lZFJlbGF0ZWRDb25jZXB0cyhjb25jZXB0KSB7XG4gICAgaWYoIUFycmF5LmlzQXJyYXkoY29uY2VwdCkpIGNvbmNlcHQgPSBbY29uY2VwdF07XG4gICAgcmV0dXJuIGNvbmNlcHQubWFwKGZ1bmN0aW9uKGVsdCl7XG4gICAgICB2YXIgY29uY2VwdGluZm9zID0gXy5maW5kV2hlcmUodGhpcy5jb2xsZWN0aW9uLCB7J0BpZCcgOiBlbHR9KTtcbiAgICAgIC8vcmV0dXJuIGNvbmNlcHRpbmZvcy5wcmVmTGFiZWxbXCJwaXZvdFwiXTtcbiAgICB9KVxuICB9LFxuICBmb3JtYXRMYWJlbDogZnVuY3Rpb24gZm9ybWF0TGFiZWxDb25jZXB0KGVsdCl7XG4gICAgaWYodHlwZW9mIGVsdCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgcmV0dXJuIHtcIkBsYW5ndWFnZVwiIDogcGl2b3QsIFwiQHZhbHVlXCIgOiBlbHR9O1xuICAgIH1lbHNle1xuICAgICAgcmV0dXJuIGVsdDtcbiAgICB9XG4gIH0sXG4gIHNldFByZWZMYWJlbHM6IGZ1bmN0aW9uIHNldFByZWZMYWJlbHNDb25jZXB0KCkge1xuICAgIHZhciBwcmVmTGFiZWwgPSB7fTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIGxhYmVscyA9IFtdO1xuICAgIGlmKEFycmF5LmlzQXJyYXkodGhpcy5hdHRyaWJ1dGVzW1wic2tvczpwcmVmTGFiZWxcIl0pKXtcbiAgICAgIGxhYmVscyA9IHRoaXMuYXR0cmlidXRlc1tcInNrb3M6cHJlZkxhYmVsXCJdIDtcbiAgICB9ZWxzZXtcbiAgICAgIGxhYmVscy5wdXNoKHRoaXMuYXR0cmlidXRlc1tcInNrb3M6cHJlZkxhYmVsXCJdKTtcbiAgICB9XG4gICAgaWYobGFiZWxzKXtcbiAgICAgIGxhYmVscy5mb3JFYWNoKGZ1bmN0aW9uKGVsdCwgaW5kZXgpe1xuICAgICAgICB2YXIgbGFiZWwgPSB0aGF0LmZvcm1hdExhYmVsKGVsdCk7XG4gICAgICAgIHByZWZMYWJlbFtsYWJlbFtcIkBsYW5ndWFnZVwiXV0gPSBsYWJlbFtcIkB2YWx1ZVwiXTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5zZXQoJ3ByZWZMYWJlbHMnLCBwcmVmTGFiZWwpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcInllc1wiLCB0aGlzLCBwcmVmTGFiZWwpO1xuICB9LFxuICBnZXRSZWxhdGl2ZTogZnVuY3Rpb24gZ2V0UmVsYXRpdmVDb25jZXB0KGRpcmVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24uYXQodGhpcy5jb2xsZWN0aW9uLmluZGV4T2YodGhpcykgKyBkaXJlY3Rpb24pO1xuICB9LFxuICBzb3J0QnlMYW5ndWFnZSA6IGZ1bmN0aW9uIHNvcnRCeUxhbmd1YWdlQ29uY2VwdChlbHQpe1xuICAgIGlmKGVsdFtcIkBsYW5ndWFnZVwiXSl7XG4gICAgICBzd2l0Y2goZWx0W1wiQGxhbmd1YWdlXCJdKXtcbiAgICAgICAgY2FzZSBcImNhXCIgOlxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICBjYXNlIFwiZGVcIiA6XG4gICAgICAgICAgcmV0dXJuIDI7XG4gICAgICAgIGNhc2UgXCJlblwiIDpcbiAgICAgICAgICByZXR1cm4gMztcbiAgICAgICAgY2FzZSBcImZyXCIgOlxuICAgICAgICAgIHJldHVybiA0O1xuICAgICAgICBjYXNlIFwiaXRcIiA6XG4gICAgICAgICAgcmV0dXJuIDU7XG4gICAgICAgIGNhc2UgXCJubFwiIDpcbiAgICAgICAgICByZXR1cm4gNjtcbiAgICAgICAgY2FzZSBcInN2XCIgOlxuICAgICAgICAgIHJldHVybiA3O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxufSk7IiwidmFyIGpzb25sZCA9IHJlcXVpcmUoJ2pzb25sZCcpO1xudmFyIGNvbmNlcHQgPSByZXF1aXJlKCcuL2NvbmNlcHQnKTtcbnZhciBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4uL2FwcGxpY2F0aW9uJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgXG4gIG1vZGVsOiBjb25jZXB0LFxuICBsb2FkZWQ6IGZhbHNlLFxuICBhY3RpdmVVUkkgOiBudWxsLFxuICBhY3RpdmVUaGVzYXVydXMgOiBudWxsLFxuICB0aGVzYXVydXNOYW1lcyA6IHsnSW5zdHJ1bWVudHNLZXl3b3JkcycgOiAnTUlNTyBUaGVzYXVydXMnLCAnaHMnOiAnU2FjaHMgJiBIb3JuYm9zdGVsIGNsYXNzaWZpY2F0aW9uJ30sXG4gIHVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6OTA5MS8nLFxuICB0aGVzYXVyaSA6IFtcbiAgICB7J2lkJyA6ICdodHRwOi8vd3d3Lm1pbW8tZGIuZXUvSW5zdHJ1bWVudHNLZXl3b3JkcycsICdwYXR0ZXJuJyA6ICdodHRwOi8vd3d3Lm1pbW8tZGIuZXUvSW5zdHJ1bWVudHNLZXl3b3JkcycsICdlbmRwb2ludCcgOiAnaHR0cDovL2RhdGEubWltby1kYi5ldTo5MDkxL3NwYXJxbC9kZXNjcmliZT91cmk9JywgJ2RhdGEnOiAnaHR0cDovL3d3dy5taW1vLWRiLmV1L2RhdGEvSW5zdHJ1bWVudHNLZXl3b3Jkcy5qc29uJywgJ2Jhc2UnOiAnaHR0cDovL3d3dy5taW1vLWRiLmV1LycsICduYW1lJyA6ICdNSU1PIFRoZXNhdXJ1cyd9LFxuICAgIHsnaWQnIDogJ2h0dHA6Ly93d3cubWltby1kYi5ldS9Ib3JuYm9zdGVsQW5kU2FjaHMnLCAncGF0dGVybicgOiAnaHR0cDovL3d3dy5taW1vLWRiLmV1L0hvcm5ib3N0ZWxBbmRTYWNocycsICdlbmRwb2ludCcgOiAnaHR0cDovL2RhdGEubWltby1kYi5ldTo5MDkxL3NwYXJxbC9kZXNjcmliZT91cmk9JywgJ2RhdGEnOiAnaHR0cDovL3d3dy5taW1vLWRiLmV1L2RhdGEvSG9ybmJvc3RlbEFuZFNhY2hzLmpzb24nLCAnYmFzZSc6ICdodHRwOi8vd3d3Lm1pbW8tZGIuZXUvJywgJ25hbWUnOiAnU2FjaHMgJiBIb3JuYm9zdGVsIGNsYXNzaWZpY2F0aW9uJ31cbiAgXSxcbiAgdmlld1R5cGVzIDogW3sgJ2lkJyA6IDEsICduYW1lJyA6ICdjaXJjdWxhciB0cmVlJ30seyAnaWQnIDogMiwgJ25hbWUnIDogJ3RyZWUnfV0sXG4gIC8vdmlld1R5cGUgOiAgMSxcbiAgY29uY2VwdENsb3NlZCA6IGZhbHNlLFxuICBjb250ZXh0IDoge1xuICAgIFwic2tvc1wiOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDQvMDIvc2tvcy9jb3JlI1wiLFxuICAgIFwic2tvczpDb25jZXB0XCI6IHtcIkB0eXBlXCI6IFwiQGlkXCJ9LFxuICAgIFwic2tvczppblNjaGVtZVwiOiB7XCJAdHlwZVwiOiBcIkBpZFwifSxcbiAgICBcInNrb3M6bmFycm93ZXJcIjoge1wiQHR5cGVcIjogXCJAaWRcIn0sXG4gICAgXCJza29zOmV4YWN0TWF0Y2hcIjoge1wiQHR5cGVcIjogXCJAaWRcIn0sXG4gICAgXCJza29zOmJyb2FkZXJcIjoge1wiQHR5cGVcIjogXCJAaWRcIn0sXG4gICAgXCJza29zOmNsb3NlTWF0Y2hcIjoge1wiQHR5cGVcIjogXCJAaWRcIn0sXG4gICAgXCJza29zOnRvcENvbmNlcHRPZlwiOiB7XCJAdHlwZVwiOiBcIkBpZFwifVxuICB9LFxuXG4gIGluaXRpYWxpemUgOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpe1xuXG4gICAgaWYoIXRoaXMubG9hZGVkICYmIHRoaXMuYWN0aXZlVGhlc2F1cnVzKXtcbiAgICAgIC8vdGhpcy5sb2FkRGF0YSgpO1xuICAgIH1cbiBcbiAgfSxcblxuICBnZXRBY3RpdmVDb25jZXB0IDogZnVuY3Rpb24gZ2V0QWN0aXZlQ29uY2VwdFRoZXNhdXJ1cygpe1xuICAgIFxuICAgIHZhciB0aGVjb25jZXB0ID0gdGhpcy5tb2RlbHMuZmlsdGVyKGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgcmV0dXJuIGVsZW1lbnQuYXR0cmlidXRlcy51cmkgPT09IHRoaXMuYWN0aXZlVVJJO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAvL2NvbnNvbGUubG9nKFwib2ggP1wiLCB0aGlzLmFjdGl2ZVVSSSwgdGhlY29uY2VwdFswXSk7XG4gICAgcmV0dXJuIHRoZWNvbmNlcHRbMF0gfHwgbnVsbDtcbiAgfSxcbiAgZ2V0QWN0aXZlVGhlc2F1cnVzIDogZnVuY3Rpb24gZ2V0QWN0aXZlVGhlc2F1cnVzKCl7XG4gICAgdmFyIHRoZWNvbmNlcHQgPSBfLmZpbmRXaGVyZSh0aGlzLm1vZGVscywgeydAdHlwZScgOiAnQ29uY2VwdFNjaGVtZSd9KTtcbiAgICBpZih0aGVjb25jZXB0ID09PSB1bmRlZmluZWQpe1xuICAgICAgdGhlY29uY2VwdCA9IHtcbiAgICAgICAgXCJjb25jZXB0U2NoZW1lXCIgOiB0aGlzLmFjdGl2ZVRoZXNhdXJ1cy5pZCxcbiAgICAgICAgXCJ0eXBlXCIgOiBcInNrb3M6Q29uY2VwdFNjaGVtZVwiLFxuICAgICAgICBcInByZWZMYWJlbFwiIDogW3RoaXMuYWN0aXZlVGhlc2F1cnVzLm5hbWVdXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGVjb25jZXB0O1xuICB9LFxuICBnZXRWaWV3VHlwZXMgOiBmdW5jdGlvbiBnZXRWaWV3VHlwZXNUaGVzYXVydXMoKXtcbiAgICB2YXIgdmlld1R5cGUgPSB0aGlzLmdldFZpZXdUeXBlKCk7XG4gICAgdGhpcy52aWV3VHlwZXMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCwgaW5kZXgpIHtcbiAgICAgIGlmKGVsZW1lbnQuaWQgPT09IHZpZXdUeXBlKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy52aWV3VHlwZXM7XG4gIH0sXG4gIHNldFZpZXdUeXBlIDogZnVuY3Rpb24gc2V0Vmlld1R5cGVUaGVzYXVydXModHlwZSl7XG4gICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShcInZpZXdUeXBlXCIsIHR5cGUpO1xuICAgIHRoaXMudHJpZ2dlcihcInZpZXdUeXBlQ2hhbmdlZFwiLCB0aGlzKTtcbiAgfSxcbiAgZ2V0Vmlld1R5cGUgOiBmdW5jdGlvbiBnZXRWaWV3VHlwZVRoZXNhdXJ1cygpe1xuICAgIHZhciB2aWV3VHlwZSA9IE51bWJlcihzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKFwidmlld1R5cGVcIikpIHx8IDE7XG4gICAgcmV0dXJuIHZpZXdUeXBlO1xuXG4gIH0sXG5cbiAgZ2V0VGhlc2F1cnVzTmFtZSA6IGZ1bmN0aW9uIGdldFRoZXNhdXJ1c05hbWUodGhlc2F1cnVzVXJpLCBjb25jZXB0VXJpKXtcbiAgICByZXR1cm4gdGhpcy5hY3RpdmVUaGVzYXVydXMubmFtZTtcbiAgfSxcbiAgbWF0Y2hBbnlUaGVzYXVydXMgOiBmdW5jdGlvbiBtYXRjaEFueVRoZXNhdXJ1cyh1cmkpe1xuICAgIGZvcih2YXIgaSA9IDA7IGk8IHRoaXMudGhlc2F1cmkubGVuZ3RoOyBpKyspe1xuICAgICAgdmFyIHRoZXNhdXJ1cyA9IHRoaXMudGhlc2F1cmlbaV07XG4gICAgICBpZih0aGlzLm1hdGNoUGF0dGVyblRoZXNhdXJ1cyh0aGVzYXVydXMucGF0dGVybiwgdXJpKSkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgbWF0Y2hQYXR0ZXJuVGhlc2F1cnVzIDogZnVuY3Rpb24gbWF0Y2hQYXR0ZXJuVGhlc2F1cnVzKHBhdHRlcm4sIHVyaSl7XG4gICAgIHZhciBteVJlZ0V4cCA9IG5ldyBSZWdFeHAoXCJeXCIgKyBwYXR0ZXJuICsgXCIoW1xcXFx3XFxcXC9cXFxcLl0qKVwiLCBcImdcIik7XG4gICAgIHJldHVybiAodXJpLm1hdGNoKG15UmVnRXhwKSAhPT0gbnVsbCk/IHRydWU6IGZhbHNlO1xuICB9LFxuICBzZXRBY3RpdmVVUkkgOiBmdW5jdGlvbiBzZXRBY3RpdmVVUklUaGVzYXVydXModXJpKXtcbiAgICBcbiAgICBpZih1cmkuc2VhcmNoKFwiaHR0cFwiKSA9PT0gLTEpIHVyaSA9IGxvY2F0aW9uLm9yaWdpbiArIFwiL1wiICsgdXJpO1xuICAgIFxuICAgIHZhciBpc0Z1bGxUaGVzYXVydXM7XG4gICAgdmFyIHdoaWNoVGhlc2F1cnVzID0gdGhpcy50aGVzYXVyaS5maWx0ZXIoZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICB2YXIgbXlSZWdFeHAgPSBuZXcgUmVnRXhwKFwiXlwiICsgZWxlbWVudC5wYXR0ZXJuICsgXCIoW1xcXFx3XFxcXC9cXFxcLl0qKVwiLCBcImdcIik7XG4gICAgICBpZiAoZWxlbWVudC5pZCA9PT0gdXJpKSB7XG4gICAgICAgIGlzRnVsbFRoZXNhdXJ1cyA9IHRydWU7XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgICAgfWVsc2UgaWYodGhpcy5tYXRjaFBhdHRlcm5UaGVzYXVydXMoZWxlbWVudC5wYXR0ZXJuLCB1cmkpKXtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgICBpZih3aGljaFRoZXNhdXJ1cy5sZW5ndGg+MCl7XG4gICAgICBpZihpc0Z1bGxUaGVzYXVydXMpe1xuICAgICAgICAvL2lzIHVyaSBvbmUgb2YgdGhlIHRoZXNhdXJpID8gbG9hZCBpdCAhXG4gICAgICAgIHRoaXMuYWN0aXZlVVJJID0gdXJpO1xuICAgICAgICBpZih0aGlzLmFjdGl2ZVRoZXNhdXJ1cyA9PT0gbnVsbCB8fCB0aGlzLmFjdGl2ZVRoZXNhdXJ1cy5pZCAhPT0gd2hpY2hUaGVzYXVydXNbMF0uaWQpe1xuICAgICAgICAgIHRoaXMuYWN0aXZlVGhlc2F1cnVzID0gd2hpY2hUaGVzYXVydXNbMF07XG4gICAgICAgICAgdGhpcy5sb2FkVGhlc2F1cnVzKHdoaWNoVGhlc2F1cnVzWzBdKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgdGhpcy50cmlnZ2VyKFwiY29uY2VwdENoYW5nZWRcIiwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH1lbHNle1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiPz9cIiwgd2hpY2hUaGVzYXVydXMuZW5kcG9pbnQgKyB1cmkpO1xuICAgICAgICAvL2Vsc2UgOiBpZiBVUkkgdXNlcyBzYW1lIHBhdHRlcm4gYXMgb25lIHRoZXNhdXJ1cyA9PiBsb29rIGZvciBpdCBpbiB0aGUgYXNzb2NpYXRlZCBTUEFSUUwgZW5kcG9pbnRzICAgICAgIFxuICAgICAgICB0aGlzLmxvYWRVUkkodXJpLCB3aGljaFRoZXNhdXJ1c1swXSk7XG4gICAgICB9XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLmFjdGl2ZVRoZXNhdXJ1cyA9IHRoaXMudGhlc2F1cmlbMF07XG4gICAgICB0aGlzLmxvYWRUaGVzYXVydXModGhpcy50aGVzYXVyaVswXSk7XG4gICAgfVxuICAgIC8vZWxzZSA6IHNlYXJjaCBhbGwgU1BBUlFMIGVuZHBvaW50cyA/XG4gICAgXG4gIH0sXG4gIGxvYWRVUkkgOiBmdW5jdGlvbiBsb2FkVVJJVGhlc2F1cnVzKHVyaSwgdGhlc2F1cnVzKXtcbiAgICAvL2lmKCl7XG4gICAgLy9jb25zb2xlLmxvZyhcIm9uIHkgZ29cIiwgdXJpLCB0aGVzYXVydXMpO1xuICAgIGlmKHVyaSAhPSB0aGlzLmFjdGl2ZVVSSSl7XG4gICAgICB0aGlzLmFjdGl2ZVVSSSA9IHVyaTtcbiAgICAgIHRoaXMudHJpZ2dlcihcImNvbmNlcHRDaGFuZ2VkXCIsIHRoaXMpO1xuXG4gICAgICBpZih0aGlzLmFjdGl2ZVRoZXNhdXJ1cyA9PT0gbnVsbCB8fCB0aGlzLmFjdGl2ZVRoZXNhdXJ1cy5pZCAhPT0gdGhlc2F1cnVzLmlkKXtcbiAgICAgICAgLy90aGlzLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuYWN0aXZlVGhlc2F1cnVzID0gdGhlc2F1cnVzO1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICd1cmwnOiB0aGVzYXVydXMuZW5kcG9pbnQgKyB1cmksXG4gICAgICAgICAgJ2hlYWRlcnMnOiB7J0FjY2VwdCcgOiAnYXBwbGljYXRpb24vbGQranNvbid9LFxuICAgICAgICAgICdkYXRhVHlwZSc6ICdqc29uJyxcbiAgICAgICAgICAnY29udGV4dCc6IHRoaXNcbiAgICAgICAgfSkuZG9uZShmdW5jdGlvbihjb2xsZWN0aW9uKXtcbiAgICAgICAgICBjb2xsZWN0aW9uID0gXy53aGVyZShjb2xsZWN0aW9uLCB7J0BpZCc6IHVyaX0pO1xuICAgICAgICAgIC8vY29uc29sZS5sb2coXCJjb2xsZWN0aW9uIGZpbHRyw6llIFwiLCBjb2xsZWN0aW9uKTtcbiAgICAgICAgICBqc29ubGQuY29tcGFjdChjb2xsZWN0aW9uLCB0aGlzLmNvbnRleHQsIGZ1bmN0aW9uKGVyciwgY29tcGFjdGVkKSB7XG4gICAgICAgXG4gICAgICAgICAgICB0aGlzLnByZXBhcmVEYXRhKFtjb21wYWN0ZWRdKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImNvbmNlcHRDaGFuZ2VkXCIsIHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5sb2FkVGhlc2F1cnVzKHRoZXNhdXJ1cyk7XG4gICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSkuZmFpbChmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgdGhpcy5sb2FkVGhlc2F1cnVzKHRoZXNhdXJ1cyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgbG9hZFRoZXNhdXJ1cyA6IGZ1bmN0aW9uIGxvYWRUaGVzYXVydXModGhlc2F1cnVzKXtcblxuICAgIHZhciBsb2FkaW5nQ29tcGxldGVkICA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uKXtcbiAgICAgIC8vY29uc29sZS5sb2coXCJjb2xsZWN0aW9uXCIsIGNvbGxlY3Rpb24pO1xuICAgICAganNvbmxkLmNvbXBhY3QoY29sbGVjdGlvbiwgdGhpcy5jb250ZXh0LCBmdW5jdGlvbihlcnIsIGNvbXBhY3RlZCkgeyBcbiAgICAgICAgLy9yZXNldCB0aGUgY29sbGVjdGlvblxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY29tcGFjdGVkXCIsY29tcGFjdGVkKTtcbiAgICAgICAgdGhpcy5wcmVwYXJlRGF0YShjb21wYWN0ZWRbXCJAZ3JhcGhcIl0pO1xuICAgICAgICB0aGlzLmxvYWRlZCA9IHRydWU7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcIm5hdkNoYW5nZWRcIiwgdGhpcyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNvbmNlcHRDaGFuZ2VkXCIsIHRoaXMpO1xuICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIH1cbiAgICB0aGlzLmxvYWRlZCA9IGZhbHNlO1xuICAgICQuYWpheCh7ICBcbiAgICAgICd1cmwnOiB0aGVzYXVydXMuZW5kcG9pbnQgKyB0aGVzYXVydXMuaWQgLFxuICAgICAgJ2hlYWRlcnMnOiB7J0FjY2VwdCcgOiAnYXBwbGljYXRpb24vbGQranNvbid9LFxuICAgICAgJ2NvbnRleHQnOiB0aGlzLFxuICAgICAgJ2RhdGFUeXBlJzogJ2pzb24nLFxuICAgICAgJ2Nyb3NzRG9tYWluJyA6IHRydWVcbiAgICB9KVxuICAgIC5kb25lKGxvYWRpbmdDb21wbGV0ZWQpXG4gICAgLmZhaWwoZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgLy9jb25zb2xlLmxvZyhcImVzc2FpIG7CsDNcIiwgdGhlc2F1cnVzLmRhdGEpXG4gICAgICAkLmFqYXgoe1xuICAgICAgICAndXJsJzogdGhlc2F1cnVzLmRhdGEgLFxuICAgICAgICAnY29udGV4dCc6IHRoaXMsXG4gICAgICAgICdkYXRhVHlwZSc6ICdqc29uJyxcbiAgICAgICAgJ2Nyb3NzRG9tYWluJyA6IHRydWVcbiAgICAgIH0pLmRvbmUobG9hZGluZ0NvbXBsZXRlZClcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgfSlcbiAgICB9KTtcbiAgICBcbiAgfSxcbiAgXG4gIFxuICBnZXROYW1lIDogZnVuY3Rpb24gZ2V0TmFtZSAocHJlZkxhYmVscyl7XG4gICAgXG4gICAgaWYoIXByZWZMYWJlbHMpIHJldHVybiBcIlwiO1xuICAgIGlmKEFycmF5LmlzQXJyYXkocHJlZkxhYmVscykpe1xuICAgICAgdmFyIG5hbWUgPSBwcmVmTGFiZWxzLmZpbHRlcihmdW5jdGlvbihwcmVmTGFiZWwpe1xuICAgICAgICByZXR1cm4gdHlwZW9mIHByZWZMYWJlbCA9PT0gXCJzdHJpbmdcIjtcbiAgICAgIH0pO1xuICAgICAgaWYoQXJyYXkuaXNBcnJheShuYW1lKSl7XG4gICAgICAgIG5hbWUgPSBuYW1lWzBdO1xuICAgICAgfWVsc2V7XG4gICAgICAgIG5hbWUgPSBwcmVmTGFiZWxzWzBdW1wiQHZhbHVlXCJdO1xuICAgICAgfVxuICAgIH1lbHNlIGlmKHByZWZMYWJlbHNbXCJAdmFsdWVcIl0pe1xuICAgICAgdmFyIG5hbWUgPSBwcmVmTGFiZWxzW1wiQHZhbHVlXCJdO1xuICAgIH1lbHNle1xuICAgICAgdmFyIG5hbWUgPSBwcmVmTGFiZWxzO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZTtcblxuICB9LFxuICBnZXRDaGlsZHJlbiA6IGZ1bmN0aW9uIGdldENoaWxkcmVuKG5vZGUpe1xuICAgIFxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy5tb2RlbHMuZmlsdGVyKGZ1bmN0aW9uIChlbGVtZW50KXtcbiAgICAgIHJldHVybiBlbGVtZW50LmF0dHJpYnV0ZXNbXCJza29zOmJyb2FkZXJcIl0gPT09IG5vZGVbXCJAaWRcIl07XG5cbiAgICB9KS5tYXAoZnVuY3Rpb24gKGNoaWxkRWxlbWVudCl7XG4gICAgICB2YXIgbmFtZSA9IHRoYXQuZ2V0TmFtZShjaGlsZEVsZW1lbnQuYXR0cmlidXRlc1tcInNrb3M6cHJlZkxhYmVsXCJdKTtcbiAgICAgIHZhciBjaGlsZHJlbiA9IHRoYXQuZ2V0Q2hpbGRyZW4oY2hpbGRFbGVtZW50LmF0dHJpYnV0ZXMpO1xuICAgICAgdmFyIHJlc3VsdCA9IHtcIm5hbWVcIiA6IG5hbWUsIHVyaSA6IGNoaWxkRWxlbWVudC5hdHRyaWJ1dGVzW1wiQGlkXCJdLCBpZCA6IGNoaWxkRWxlbWVudC5hdHRyaWJ1dGVzW1wiaWRcIl19O1xuICAgICAgaWYoY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICAgICAgcmVzdWx0LnNpemUgPSBjaGlsZHJlbi5sZW5ndGg7XG4gICAgICB9ZWxzZXsgXG4gICAgICAgIHJlc3VsdC5zaXplID0gMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG5cbiAgfSxcbiAgZ2V0UGFyZW50IDogZnVuY3Rpb24gZ2V0UGFyZW50VGhlc2F1cnVzKG5vZGVJZCwgZGF0YSl7XG4gICAgXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgdmFyIGVsZW1lbnQgPSBkYXRhLmZpbHRlcihmdW5jdGlvbiAoZWxlbWVudCl7XG4gICAgICByZXR1cm4gZWxlbWVudFtcIkBpZFwiXSA9PT0gbm9kZUlkO1xuICAgIH0pO1xuICAgIHZhciBwYXJlbnQgPSBuZXcgQXJyYXkoKTtcblxuICAgIGlmKGVsZW1lbnQucGFyZW50cyl7XG4gICAgICByZXR1cm4gZWxlbWVudC5wYXJlbnRzO1xuICAgIH1lbHNlIGlmKGVsZW1lbnRbXCJza29zOmJyb2FkZXJcIl0pIHtcbiAgICAgIHZhciBncmFuZFBhcmVudCA9ICB0aGF0LmdldFBhcmVudChlbGVtZW50W1wic2tvczpicm9hZGVyXCJdLCBkYXRhKTtcblxuICAgICAgaWYoZ3JhbmRQYXJlbnQubGVuZ3RoPjApe1xuICAgICAgICBwYXJlbnQgPSBncmFuZFBhcmVudDtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcGFyZW50ID0gcGFyZW50LmNvbmNhdChbZWxlbWVudFtcInNrb3M6YnJvYWRlclwiXV0pO1xuICAgIH1cbiAgICByZXR1cm4gcGFyZW50OyAgICAgIFxuICAgIFxuICB9LFxuICB0b2dnbGVDb25jZXB0IDogZnVuY3Rpb24gdG9nZ2xlQ29uY2VwdFRoZXNhdXJ1cyh2aXNpYmxlKXtcbiAgICBpZih2aXNpYmxlKXtcbiAgICAgIGlmKHZpc2libGUgPT09IHRydWUpe1xuICAgICAgICB0aGlzLmNvbmNlcHRDbG9zZWQgPSBmYWxzZTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLmNvbmNlcHRDbG9zZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgdGhpcy5jb25jZXB0Q2xvc2VkID0gIXRoaXMuY29uY2VwdENsb3NlZDtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyKFwiY29uY2VwdFRvZ2dsZWRcIik7XG5cbiAgfSxcbiAgZmluZFJhbmsgOiBmdW5jdGlvbiBmaW5kUmFua1RoZXNhdXJ1cyAoZGF0YU9iail7XG4gICAgXG4gICAgaWYoIWRhdGFPYmopIHJldHVybiBmYWxzZTtcbiAgICBmb3IodmFyIGVsZW1lbnQgaW4gZGF0YU9iaikge1xuICAgICAgdmFyIHRoZW1vZGVsID0gXy5maW5kV2hlcmUodGhpcy5tb2RlbHMsIGZ1bmN0aW9uKGVsdCl7XG4gICAgICAgIGVsdC5hdHRyaWJ1dGVzW1wiQGlkXCJdID09IGVsZW1lbnRbXCJAaWRcIl07XG4gICAgICB9KTtcbiAgICAgIHRoZW1vZGVsLnNldChcInJhbmtcIiwgdGhpcy5jb3VudGVyKTtcbiAgICAgIHRoaXMuY291bnRlciArKztcbiAgICAgIGlmIChlbGVtZW50LmNoaWxkcmVuKSB0aGlzLmZpbmRSYW5rKGVsZW1lbnQuY2hpbGRyZW4pO1xuICAgIH07XG5cbiAgfSxcbiAgY29tcGFyYXRvciA6IGZ1bmN0aW9uIGNvbXBhcmF0b3JUaGVzYXVydXMgKG1vZGVsKSB7XG4gICAgcmV0dXJuIG1vZGVsLmdldCgncmFuaycpO1xuICB9LFxuICBwcmVwYXJlRGF0YTogZnVuY3Rpb24gcHJlcGFyZURhdGFUaGVzYXVydXMoZGF0YSl7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy9hZGQgcGFyZW50IGhpZXJhcmNoeVxuICAgIHZhciBkYXRhID0gZGF0YS5tYXAoZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgICB2YXIgcGFyZW50ID0gdGhhdC5nZXRQYXJlbnQoZWxlbWVudFtcIkBpZFwiXSwgZGF0YSk7XG4gICAgICBpZihwYXJlbnQubGVuZ3RoPjApe1xuICAgICAgICBlbGVtZW50LnBhcmVudHMgPSBwYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9KTtcblxuICAgIGlmKHRoaXMubW9kZWxzLmxlbmd0aD4xKXtcbiAgICAgIHRoaXMucmVzZXQoZGF0YSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLmFkZChkYXRhKTtcbiAgICB9XG4gICAgXG4gICAgLy9jcmVhdGVzIGhpZXJhcmNoaWNhbCB0cmVlIGZvciBuYXZcbiAgICB2YXIgZmlsdGVyZWRUcmVlID0gdGhpcy5tb2RlbHMuZmlsdGVyKGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgcmV0dXJuIGVsZW1lbnQuYXR0cmlidXRlc1tcInNrb3M6dG9wQ29uY2VwdE9mXCJdICE9PSB1bmRlZmluZWQ7XG4gICAgfSkubWFwKGZ1bmN0aW9uIChlbGVtZW50KXtcbiAgICAgIHZhciBjaGlsZHJlbiA9IHRoYXQuZ2V0Q2hpbGRyZW4oZWxlbWVudC5hdHRyaWJ1dGVzKTtcbiAgICAgIHZhciByZXN1bHQgPSB7IFwibmFtZVwiIDogdGhhdC5nZXROYW1lKGVsZW1lbnQuYXR0cmlidXRlc1tcInNrb3M6cHJlZkxhYmVsXCJdKSwgdXJpIDogZWxlbWVudC5hdHRyaWJ1dGVzW1wiQGlkXCJdLCBpZCA6IGVsZW1lbnQuYXR0cmlidXRlc1tcImlkXCJdfTtcbiAgICAgIGlmKGNoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVzdWx0LmNoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgICAgIHJlc3VsdC5zaXplID0gY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHJlc3VsdC5zaXplID0gMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG5cbiAgICB2YXIgZGF0YVRyZWUgPSB7XCJuYW1lXCIgOiB0aGlzLmFjdGl2ZVRoZXNhdXJ1cy5uYW1lIH07XG4gICAgZGF0YVRyZWUuY2hpbGRyZW4gPSBmaWx0ZXJlZFRyZWU7XG4gICAgXG4gICAgdGhpcy5jb3VudGVyID0gMTtcbiAgICBcbiAgICAvL29yZGVycyB0aGUgY29sbGVjdGlvbiBhY2NvcmRpbmcgdG8gdGhlIHRyZWVcbiAgICB0aGlzLmZpbmRSYW5rKGRhdGFUcmVlKTtcbiAgICB0aGlzLnNvcnQoKTtcbiAgICAvL2NvbnNvbGUubG9nKGRhdGFUcmVlKTtcbiAgICB0aGlzLmNvbmNlcHRUcmVlID0gZGF0YVRyZWU7XG4gICAgdGhpcy50cmlnZ2VyKFwiZGF0YUNoYW5nZWRcIik7XG5cbiAgfVxuXG59KTsiLCJ2YXIgYXBwbGljYXRpb24gPSByZXF1aXJlKCcuLi9hcHBsaWNhdGlvbicpO1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Sb3V0ZXIuZXh0ZW5kKHtcbiAgICByb3V0ZXM6e1xuICAgICAgXCJhYm91dFwiIDogXCJzaG93QWJvdXRcIixcbiAgICAgIFwiKm90aGVyXCIgICAgOiBcImRlZmF1bHRSb3V0ZVwiXG4gICAgfSxcbiAgICBcbiAgICBzaG93QWJvdXQ6IGZ1bmN0aW9uIHNob3dBYm91dCggKSB7XG4gICAgICAvLyBTZXQgdGhlIGN1cnJlbnQgZmlsdGVyIHRvIGJlIHVzZWRcbiAgICAgIC8vY29uc29sZS5sb2coXCJPbiBhaW1lcmFpdCBhZmZpY2hlciBsZXMgaW5mb3MgXCIpO1xuICAgIH0sXG5cbiAgICBkZWZhdWx0Um91dGU6IGZ1bmN0aW9uKG90aGVyKXtcbiAgICAgIC8vY29uc29sZS5sb2coJ1lvdSBhdHRlbXB0ZWQgdG8gcmVhY2g6JyArIG90aGVyKTtcbiAgICAgIGlmKCFvdGhlcikgb3RoZXIgPSBcIlwiO1xuICAgICAgb3RoZXIgPSBvdGhlci5yZXBsYWNlKFwidXJpPVwiLCBcIlwiKTtcbiAgICAgIGFwcGxpY2F0aW9uLmNvbGxlY3Rpb24uc2V0QWN0aXZlVVJJKG90aGVyKTtcbiAgICAgIEJhY2tib25lLmhpc3RvcnkuY2hlY2tVcmwoKTtcbiAgICB9XG5cbn0pOyIsInZhciBWaWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG52YXIgQ29uY2VwdFZpZXcgPSByZXF1aXJlKCcuL2NvbmNlcHQnKTtcbnZhciBOYXZWaWV3ID0gcmVxdWlyZSgnLi9uYXYnKTtcbnZhciBTZWxlY3ROYXZWaWV3ID0gcmVxdWlyZSgnLi9zZWxlY3ROYXYnKTtcblxudmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGVsOiAnI3ZpenNrb3MnLFxuICAgIHRlbXBsYXRlIDogcmVxdWlyZSgnLi90ZW1wbGF0ZXMvbWFpbi5oYnMnKSxcblxuICAgIGFmdGVyUmVuZGVyOiBmdW5jdGlvbiBhZnRlclJlbmRlckFwcCgpIHtcbiAgICAgXG4gICAgICB0aGlzLmNvbmNlcHRWaWV3ID0gbmV3IENvbmNlcHRWaWV3KHtjb2xsZWN0aW9uIDogdGhpcy5jb2xsZWN0aW9uLCBlbDogdGhpcy4kKCdhcnRpY2xlJyl9KTtcbiAgICAgIHRoaXMubmF2VmlldyA9IG5ldyBOYXZWaWV3KHtjb2xsZWN0aW9uIDogdGhpcy5jb2xsZWN0aW9uLCBlbDogdGhpcy4kKCduYXYubmF2Jyl9KTtcbiAgICAgIHRoaXMuc2VsZWN0TmF2VmlldyA9IG5ldyBTZWxlY3ROYXZWaWV3KHtjb2xsZWN0aW9uIDogdGhpcy5jb2xsZWN0aW9uLCBlbDogdGhpcy4kKCcudG9vbHMnKSB9KTtcblxuXG4gICAgfVxufSk7IiwidmFyIFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4uL2FwcGxpY2F0aW9uJyk7XG5yZXF1aXJlKCcuL3RlbXBsYXRlcy9oZWxwZXJzLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldy5leHRlbmQoe1xuXG4gICAgZXZlbnRzOiB7XG4gICAgICAnY2xpY2sgLmNsb3NlJzogJ2Nsb3NlJyxcbiAgICAgICdjbGljayAubGluayc6ICdhY3RpdmF0ZUxpbmsnLFxuICAgICAgJ2NsaWNrIC5uZXh0JzogJ25leHQnLFxuICAgICAgJ2NsaWNrIC5wcmV2JzogJ3ByZXYnXG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZSA6IHJlcXVpcmUoJy4vdGVtcGxhdGVzL2NvbmNlcHQuaGJzJyksXG4gICAgXG4gICAgLy8gVGhlIENvbmNlcHRWaWV3IGxpc3RlbnMgZm9yIGNoYW5nZXMgdG8gaXRzIG1vZGVsLCByZS1yZW5kZXJpbmcuIFxuICAgIC8vIFNpbmNlIHRoZXJlJ3Mgb25seSBvbmUgKipDb25jZXB0KiogZGlzcGxheWVkIGluIGRldGFpbCBcblxuICAgIGFmdGVySW5pdDogZnVuY3Rpb24gYWZ0ZXJJbml0Q29uY2VwdCgpe1xuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdjb25jZXB0Q2hhbmdlZCcsIHRoaXMucmVuZGVyKTtcbiAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCAnY29uY2VwdFRvZ2dsZWQnLCB0aGlzLmNvbmNlcHRUb2dnbGVkKTtcbiAgICB9LFxuICAgIGdldFJlbmRlckRhdGE6IGZ1bmN0aW9uIGdldENvbmNlcHRSZW5kZXJEYXRhKCl7XG4gICAgICB0aGlzLm1vZGVsID0gdGhpcy5jb2xsZWN0aW9uLmdldEFjdGl2ZUNvbmNlcHQoKTtcbiAgICAgIC8vY29uc29sZS5sb2coXCJsZSBtb2RlbGVcIix0aGVtb2RlbC5hdHRyaWJ1dGVzKTtcbiAgICAgIHJldHVybiB0aGlzLm1vZGVsID8gJC5leHRlbmQoeyBsYW5ndWFnZSA6J2VuJyB9LCB0aGlzLm1vZGVsLmF0dHJpYnV0ZXMpIDogdGhpcy5jb2xsZWN0aW9uLmdldEFjdGl2ZVRoZXNhdXJ1cygpO1xuICAgIH0sXG4gICAgLy8gQ2xvc2UgdGhlIGNvbmNlcHQgc2VjdGlvblxuICAgIGNsb3NlOiBmdW5jdGlvbiBjbG9zZUNvbmNlcHQoZWxlbWVudCkge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uLnRvZ2dsZUNvbmNlcHQoKTtcbiAgICAgIGVsZW1lbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuICAgIG5leHQ6IGZ1bmN0aW9uIG5leHRDb25jZXB0KGVsZW1lbnQpIHtcbiAgICAgIHZhciBuZXdtb2RlbCA9IHRoaXMubW9kZWwuZ2V0UmVsYXRpdmUoMSk7XG4gICAgICBhcHBsaWNhdGlvbi5yb3V0ZXIubmF2aWdhdGUoYXBwbGljYXRpb24ucHJvY2Vzc1VyaShuZXdtb2RlbC5hdHRyaWJ1dGVzW1wiQGlkXCJdKSwge3RyaWdnZXIgOiB0cnVlfSk7XG4gICAgICBlbGVtZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcbiAgICBwcmV2OiBmdW5jdGlvbiBwcmV2Q29uY2VwdChlbGVtZW50KSB7XG4gICAgICB2YXIgbmV3bW9kZWwgPSB0aGlzLm1vZGVsLmdldFJlbGF0aXZlKC0xKTtcbiAgICAgIGFwcGxpY2F0aW9uLnJvdXRlci5uYXZpZ2F0ZShhcHBsaWNhdGlvbi5wcm9jZXNzVXJpKG5ld21vZGVsLmF0dHJpYnV0ZXNbXCJAaWRcIl0pLCB7dHJpZ2dlciA6IHRydWV9KTtcbiAgICAgIGVsZW1lbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuICAgIGNvbmNlcHRUb2dnbGVkOiBmdW5jdGlvbiBjb25jZXB0VG9nZ2xlZENvbmNlcHQoZWxlbWVudCkge1xuICAgICAgaWYodGhpcy5jb2xsZWN0aW9uLmNvbmNlcHRDbG9zZWQgJiYgdGhpcy5jb2xsZWN0aW9uLmFjdGl2ZVVSSSl7XG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKFwiY2xvc2VkXCIpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKFwiY2xvc2VkXCIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgLy8gT3BlbiAvIHJlZHVjZSB0aGUgY29uY2VwdCBzZWN0aW9uXG4gICAgYWN0aXZhdGVMaW5rOiBmdW5jdGlvbiBhY3RpdmF0ZUxpbmtDb25jZXB0KGVsZW1lbnQpIHtcbiAgICAgIGFwcGxpY2F0aW9uLnJvdXRlci5uYXZpZ2F0ZShhcHBsaWNhdGlvbi5wcm9jZXNzVXJpKCQoZWxlbWVudC5jdXJyZW50VGFyZ2V0KS5hdHRyKFwiaHJlZlwiKSksIHt0cmlnZ2VyIDogdHJ1ZX0pO1xuICAgICAgZWxlbWVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbn0pOyIsInZhciBWaWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG52YXIgTmF2Q2lyY2xlID0gcmVxdWlyZSgnLi9uYXZDaXJjbGUnKTtcbnZhciBOYXZUcmVlID0gcmVxdWlyZSgnLi9uYXZUcmVlJyk7XG5tb2R1bGUuZXhwb3J0cyA9IFZpZXcuZXh0ZW5kKHtcblxuXG4gICAgLy8gVGhlIE5hdlZpZXcgbGlzdGVucyBmb3IgY2hhbmdlcyB0byBpdHMgbW9kZWwsIHJlLXJlbmRlcmluZy5cbiAgICBhZnRlckluaXQ6IGZ1bmN0aW9uIGFmdGVySW5pdE5hdigpe1xuICAgICBcbiAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCAndmlld1R5cGVDaGFuZ2VkJywgdGhpcy5yZW5kZXIpO1xuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdkYXRhQ2hhbmdlZCcsIHRoaXMucmVuZGVyKTtcblxuICAgIH0sXG4gICAgXG4gICAgLy8gUmUtcmVuZGVycyB0aGUgdGl0bGVzIG9mIHRoZSB0b2RvIGl0ZW0uXG4gICAgcmVuZGVyOiBmdW5jdGlvbiByZW5kZXJOYXYoKSB7XG4gICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgXG4gICAgICBpZih0aGlzLmNvbGxlY3Rpb24uZ2V0Vmlld1R5cGUoKSA9PT0gMSl7XG4gICAgICAgIHRoaXMubmF2VmlldyA9IG5ldyBOYXZDaXJjbGUoe2NvbGxlY3Rpb24gOiB0aGlzLmNvbGxlY3Rpb259KS5wcmVSZW5kZXIoKTtcbiAgICAgIH1lbHNlIGlmKHRoaXMuY29sbGVjdGlvbi5nZXRWaWV3VHlwZSgpID09PSAyKXtcbiAgICAgICAgdGhpcy5uYXZWaWV3ID0gbmV3IE5hdlRyZWUoe2NvbGxlY3Rpb24gOiB0aGlzLmNvbGxlY3Rpb259KS5wcmVSZW5kZXIoKTtcbiAgICAgIH1cblxuICAgIH1cblxufSk7XG4iLCJ2YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIGFwcGxpY2F0aW9uID0gcmVxdWlyZSgnLi4vYXBwbGljYXRpb24nKTtcbm1vZHVsZS5leHBvcnRzID0gVmlldy5leHRlbmQoe1xuICAgIGV2ZW50czoge1xuICAgICAgJ3Njcm9sbCc6ICd6b29tJyxcbiAgICB9LFxuICAgIGNoYW5nZVNjYWxlOiBmdW5jdGlvbiB6b29tTmF2KCkge1xuICAgICAgLy90aGlzLm1haW4uYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGQzLmV2ZW50LnRyYW5zbGF0ZSArIFwiKXNjYWxlKFwiICsgZDMuZXZlbnQuc2NhbGUgKyBcIilcIik7XG4gICAgfSxcbiAgICBpbml0U2l6ZTogZnVuY3Rpb24gaW5pdFNpemVOYXYoKSB7XG4gICAgICB0aGlzLmhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKSA7XG4gICAgICB0aGlzLndpZHRoID0gJCh3aW5kb3cpLndpZHRoKCkgO1xuICAgICAgdGhpcy53aGl0ZVJhZGl1cyA9IDEyMDtcbiAgICAgIHRoaXMueVJhZGl1cyA9ICh0aGlzLmhlaWdodCAtIDQwKSAvIDI7XG4gICAgICB0aGlzLnhSYWRpdXMgPSB0aGlzLnlSYWRpdXM7XG4gICAgICB0aGlzLnJvdGF0ZSA9IDA7XG4gICAgICB0aGlzLnggPSBkMy5zY2FsZS5saW5lYXIoKS5yYW5nZShbMCwgdGhpcy53aWR0aF0pLFxuICAgICAgdGhpcy55ID0gZDMuc2NhbGUubGluZWFyKCkucmFuZ2UoWzAsIHRoaXMuaGVpZ2h0XSk7XG4gICAgICB0aGlzLmR1cmF0aW9uID0gNzUwO1xuICAgIH0sXG4gICAgcmVzaXplOiBmdW5jdGlvbiByZXNpemVOYXYoKSB7XG4gICAgICB0aGlzLmluaXRTaXplKCk7XG4gICAgICBcbiAgICAgIHRoaXMuY2x1c3RlclxuICAgICAgICAuc2l6ZShbMzYwLCB0aGlzLnlSYWRpdXMgLSB0aGlzLndoaXRlUmFkaXVzXSk7XG5cbiAgICAgIHRoaXMuc3ZnXG4gICAgICAgIC5zdHlsZShcIndpZHRoXCIsIHRoaXMud2lkdGggKyBcInB4XCIpXG4gICAgICAgIC5zdHlsZShcImhlaWdodFwiLCB0aGlzLmhlaWdodCArIFwicHhcIik7XG5cbiAgICAgIHRoaXMudmlzXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgdGhpcy53aWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgdGhpcy5oZWlnaHQpO1xuXG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0sXG5cbiAgICAvLyBUaGUgTmF2VmlldyBsaXN0ZW5zIGZvciBjaGFuZ2VzIHRvIGl0cyBtb2RlbCwgcmUtcmVuZGVyaW5nLlxuICAgIGFmdGVySW5pdDogZnVuY3Rpb24gYWZ0ZXJJbml0TmF2KCl7XG4gICAgIFxuICAgICAgJCh3aW5kb3cpLm9uKFwicmVzaXplXCIsIHRoaXMucmVzaXplLmJpbmQodGhpcykpO1xuXG4gICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgJ2NvbmNlcHRDaGFuZ2VkJywgdGhpcy5zaG93U2VsZWN0ZWROb2RlKTtcbiAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCAnbmF2Q2hhbmdlZCcsIHRoaXMucHJlUmVuZGVyKTtcblxuICAgIH0sXG4gICAgXG4gICAgLy8gUmUtcmVuZGVycyB0aGUgdGl0bGVzIG9mIHRoZSB0b2RvIGl0ZW0uXG4gICAgcHJlUmVuZGVyOiBmdW5jdGlvbiBwcmVSZW5kZXJOYXYoKSB7XG4gICAgICBcbiAgICAgIGlmKHRoaXMuY29sbGVjdGlvbi5sb2FkZWQpe1xuICAgICAgICBcbiAgICAgICAgdGhpcy5pbml0U2l6ZSgpO1xuICAgICBcbiAgICAgIHRoaXMuY2x1c3RlciA9IGQzLmxheW91dC50cmVlKClcbiAgICAgICAgLnNlcGFyYXRpb24oZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gKGEucGFyZW50ID09IGIucGFyZW50ID8gMSA6IDIpIC8gYS5kZXB0aDsgfSk7XG4gXG4gICAgICAvL1xuICAgICAgdGhpcy5kaWFnb25hbCA9IGQzLnN2Zy5kaWFnb25hbC5yYWRpYWwoKVxuICAgICAgICAucHJvamVjdGlvbiggZnVuY3Rpb24oZCkgeyByZXR1cm4gW2QueSwgZC54IC8gMTgwICogTWF0aC5QSV07IH0gKTtcbiAgICAgIC8vXG4gICAgICBcbiAgICAgIHRoaXMuc3ZnID0gZDMuc2VsZWN0KFwiI3ZpenNrb3MgLm5hdlwiKTtcbiAgICAgIHRoaXMudmlzID0gIGQzLnNlbGVjdChcIiN2aXpza29zIC5uYXYgc3ZnXCIpO1xuICAgICAgaWYodGhpcy52aXMpIHRoaXMudmlzLnJlbW92ZSgpO1xuXG4gICAgICB0aGlzLnZpcyA9IHRoaXMuc3ZnLmFwcGVuZChcInN2ZzpzdmdcIik7XG4gICAgICAvL1xuICAgICAgdGhpcy5tYWluID0gdGhpcy52aXNcbiAgICAgICAgLmFwcGVuZChcInN2ZzpnXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm1haW4gXCIgKyB0aGlzLmNvbGxlY3Rpb24uYWN0aXZlVGhlc2F1cnVzKTtcbiAgICAgIC8vcGFydGl0aW9uIHZpZXdcbiAgICAgIHRoaXMucGFydGl0aW9uID0gZDMubGF5b3V0LnBhcnRpdGlvbigpXG4gICAgICAgIC52YWx1ZShmdW5jdGlvbihkKSB7IHJldHVybiBkLnNpemU7IH0pO1xuXG4gICAgICB0aGlzLnpvb20gPSBkMy5iZWhhdmlvci56b29tKClcbiAgICAgICAgLm9uKFwiem9vbVwiLCB0aGlzLmNoYW5nZVNjYWxlLmJpbmQodGhpcykpO1xuXG5cbiAgICAgICAgdGhpcy5yb290ID0gdGhpcy5jb2xsZWN0aW9uLmNvbmNlcHRUcmVlO1xuICAgICAgICB0aGlzLnJvb3QueDAgPSB0aGlzLmhlaWdodCAvIDI7XG4gICAgICAgIHRoaXMucm9vdC55MCA9IDA7XG4gICAgICAgICAgXG4gICAgICAgIHRoaXMuYXJjID0gdGhpcy5tYWluLmFwcGVuZChcInN2ZzpwYXRoXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImFyY1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vY29uc29sZS5sb2codGhpcy5jb25jZXB0VHJlZSk7XG4gICAgICAgIHRoaXMucmVuZGVyKHRoaXMucm9vdCk7XG4gICAgICAgIHRoaXMucmVzaXplKCk7XG4gICAgICAgIHRoaXMuc2hvd1NlbGVjdGVkTm9kZSgpO1xuICAgICAgfVxuIFxuICAgIH0sXG4gICAgcmVuZGVyIDogZnVuY3Rpb24gcmVuZGVyTmF2KHNvdXJjZSkge1xuICAgICAgaWYodGhpcy5jb2xsZWN0aW9uLmxvYWRlZCl7XG4gICAgICAgIHZhciBub2RlcyA9IHRoaXMuY2x1c3Rlci5ub2Rlcyh0aGlzLmNvbGxlY3Rpb24uY29uY2VwdFRyZWUpO1xuICAgICAgICB2YXIgbGlua3MgPSB0aGlzLmNsdXN0ZXIubGlua3Mobm9kZXMpO1xuICAgICAgICB2YXIgd2hpdGVSYWRpdXMgPSB0aGlzLndoaXRlUmFkaXVzO1xuXG4gICAgICAgIHRoaXMubWFpblxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoMTAwICsgdGhpcy54UmFkaXVzICkgKyBcIixcIiArICgyNSArIHRoaXMueVJhZGl1cykgKyBcIilcIik7XG5cbiAgICAgICAgdGhpcy5tYWluLmNhbGwodGhpcy56b29tKTtcblxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMubWFpbi5zZWxlY3RBbGwoXCJnLm5vZGVcIikuZGF0YShub2Rlcyk7XG4gICAgICAgIHZhciBsaW5rID0gdGhpcy5tYWluLnNlbGVjdEFsbChcInBhdGgubGlua1wiKS5kYXRhKGxpbmtzKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYXJjLmF0dHIoXCJkXCIsIGQzLnN2Zy5hcmMoKS5pbm5lclJhZGl1cyh0aGlzLnlSYWRpdXMgLSB0aGlzLndoaXRlUmFkaXVzKS5vdXRlclJhZGl1cyh0aGlzLnlSYWRpdXMpLnN0YXJ0QW5nbGUoMCkuZW5kQW5nbGUoMiAqIE1hdGguUEkpKTtcblxuICAgICAgICAgdmFyIGxpbmtVcGRhdGUgPSBsaW5rLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5kdXJhdGlvbih0aGlzLmR1cmF0aW9uKVxuICAgICAgICAgIC5hdHRyKFwiZFwiLCB0aGlzLmRpYWdvbmFsKTtcblxuICAgICAgICB2YXIgbGlua0VudGVyID0gbGluay5lbnRlcigpXG4gICAgICAgICAgLmFwcGVuZChcInN2ZzpwYXRoXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibGlua1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJkXCIsIHRoaXMuZGlhZ29uYWwpO1xuXG4gICAgICAgIHZhciBsaW5rRXhpdCA9IGxpbmsuZXhpdCgpLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5kdXJhdGlvbih0aGlzLmR1cmF0aW9uKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQsaSkge3JldHVybiBcInJvdGF0ZShcIiArIChzb3VyY2UueCAtIDkwKSArIFwiKXRyYW5zbGF0ZShcIiArIChzb3VyY2UueSApICsgXCIpXCI7IH0pXG4gICAgICAgICAgLnJlbW92ZSgpO1xuXG4gICAgICAgIHZhciBub2RlRW50ZXIgPSBub2RlLmVudGVyKClcbiAgICAgICAgICAuYXBwZW5kKFwic3ZnOmdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jaGlsZHJlbiA/IFwibm9kZSBwYXJlbnQgbm9kZV9cIiArIGQuaWQgOiBcIm5vZGUgY2hpbGQgbm9kZV9cIiArIGQuaWQ7IH0pXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkLGkpIHtyZXR1cm4gIFwicm90YXRlKFwiICsgKHNvdXJjZS54IC0gOTApICsgXCIpdHJhbnNsYXRlKFwiICsgKHNvdXJjZS55ICkgKyBcIilcIjsgfSk7XG4gICAgICAgICAgXG4gICAgICAgIHZhciBub2RlRW50ZXJDaXJjbGUgPSBub2RlRW50ZXIuYXBwZW5kKFwic3ZnOmNpcmNsZVwiKVxuICAgICAgICAgIC5hdHRyKFwiclwiLCA0LDUpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLl9jaGlsZHJlbiA/IFwiY2hpbGRyZW5cIiA6IFwiXCI7IH0pXG4gICAgICAgICAgLm9uKFwibW91c2Vkb3duXCIsIHRoaXMudG9nZ2xlTm9kZS5iaW5kKHRoaXMpICk7XG5cbiAgICAgICAgdmFyIG5vZGVFbnRlckxhYmVsID0gbm9kZUVudGVyLmFwcGVuZChcInN2Zzp0ZXh0XCIpXG4gICAgICAgICAgLmF0dHIoXCJkeFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnggPCAxODAgPyA4IDogLTg7IH0pXG4gICAgICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zMWVtXCIpXG4gICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnggPCAxODAgPyBcInN0YXJ0XCIgOiBcImVuZFwiOyB9KVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueCA8IDE4MCA/IG51bGwgOiBcInJvdGF0ZSgxODApXCI7IH0pXG4gICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lOyB9KVxuICAgICAgICAgIC5vbihcIm1vdXNlZG93blwiLCB0aGlzLnNlbGVjdE5vZGUuYmluZCh0aGlzKSApO1xuXG4gICAgICAgIHZhciBub2RlVXBkYXRlID0gbm9kZS50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24odGhpcy5kdXJhdGlvbilcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcInJvdGF0ZShcIiArIChkLnggLSA5MCkgKyBcIil0cmFuc2xhdGUoXCIgKyAoZC55ICkgKyBcIilcIjsgfSk7XG5cbiAgICAgICAgbm9kZVVwZGF0ZS5zZWxlY3QoXCJjaXJjbGVcIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuX2NoaWxkcmVuID8gXCJjaGlsZHJlblwiIDogXCJcIjsgfSk7XG4gICAgICAgIFxuXG4gICAgICAgIHZhciBub2RlRXhpdCA9IG5vZGUuZXhpdCgpXG4gICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKHRoaXMuZHVyYXRpb24pXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcInJvdGF0ZShcIiArIChzb3VyY2UueCAtIDkwKSArIFwiKXRyYW5zbGF0ZShcIiArIChzb3VyY2UueSApICsgXCIpXCI7IH0pXG4gICAgICAgICAgICAucmVtb3ZlKCk7XG5cbiAgICAgICAgbm9kZUV4aXQuc2VsZWN0KFwiY2lyY2xlXCIpXG4gICAgICAgICAgLmF0dHIoXCJyXCIsIDFlLTYpO1xuXG4gICAgICAgIG5vZGVFeGl0LnNlbGVjdChcInRleHRcIilcbiAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMWUtNik7XG5cbiAgICAgICAgLy8gU3Rhc2ggdGhlIG9sZCBwb3NpdGlvbnMgZm9yIHRyYW5zaXRpb24uXG4gICAgICAgIG5vZGUuZm9yRWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgZC54MCA9IGQueDtcbiAgICAgICAgICBkLnkwID0gZC55O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHRvZ2dsZU5vZGU6IGZ1bmN0aW9uIHRvZ2dsZU5vZGVOYXYoZCwgaSkge1xuICAgICAgXG4gICAgICBpZiAoZC5jaGlsZHJlbikge1xuICAgICAgICBkLl9jaGlsZHJlbiA9IGQuY2hpbGRyZW47XG4gICAgICAgIGQuY2hpbGRyZW4gPSBudWxsOyAgICAgICAgICAgICAgXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkLmNoaWxkcmVuID0gZC5fY2hpbGRyZW47XG4gICAgICAgIGQuX2NoaWxkcmVuID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVuZGVyKGQpO1xuICAgICAgLy9jb25zb2xlLmxvZyhkKTtcbiAgICB9LFxuICAgIHNob3dTZWxlY3RlZE5vZGU6IGZ1bmN0aW9uIHNob3dTZWxlY3RlZE5vZGVOYXYodXJpKSB7XG4gICAgICAvL2lmKHRoaXMuY29sbGVjdGlvbi5sb2FkZWQpe1xuICAgICAgICBkMy5zZWxlY3QoXCIubm9kZS5zZWxlY3RlZFwiKS5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgZmFsc2UpO1xuICAgICAgICB2YXIgdGhlbW9kZWwgPSB0aGlzLmNvbGxlY3Rpb24uZ2V0QWN0aXZlQ29uY2VwdCgpO1xuICAgICAgICBpZih0aGVtb2RlbCkgZDMuc2VsZWN0KFwiLm5vZGVfXCIrIHRoZW1vZGVsLmF0dHJpYnV0ZXMuaWQpLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCB0cnVlKTtcbiAgICAgIC8vfVxuICAgIH0sXG4gICAgc2VsZWN0Tm9kZTogZnVuY3Rpb24gc2VsZWN0Tm9kZU5hdihkLCBpKSB7XG4gICAgICAvL2NvbnNvbGUubG9nKFwib24gdmEgdm9pclwiLCBhcHBsaWNhdGlvbi5wcm9jZXNzVXJpKGQuaWQpKTtcbiAgICAgIGFwcGxpY2F0aW9uLnJvdXRlci5uYXZpZ2F0ZShhcHBsaWNhdGlvbi5wcm9jZXNzVXJpKGQudXJpKSwge3RyaWdnZXIgOiB0cnVlfSk7XG4gICAgICAvL2JhY2tib25lIGJlaW5nIHNtYXJ0IGVub3VnaCBub3QgdG8gdHJpZ2dlciB0aGUgcm91dGUgaWYgY29uY2VwdCBhbHJlYWR5IHNlbGVjdGVkXG4gICAgICAvL3dlIG5lZWQgdG8gbWFrZSBzdXJlIHRoZSBwb3AtdXAgaXMgb3BlblxuICAgICAgaWYodGhpcy5jb2xsZWN0aW9uLmFjdGl2ZUNvbmNlcHRJZCA9PSBkLnVyaSkge1xuICAgICAgICB0aGlzLmNvbGxlY3Rpb24udG9nZ2xlQ29uY2VwdCh0cnVlKTtcbiAgICAgIH1cbiAgICAgIGQzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH1cblxufSk7XG4iLCJ2YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIGFwcGxpY2F0aW9uID0gcmVxdWlyZSgnLi4vYXBwbGljYXRpb24nKTtcbm1vZHVsZS5leHBvcnRzID0gVmlldy5leHRlbmQoe1xuXG4gICAgaW5pdFNpemU6IGZ1bmN0aW9uIGluaXRTaXplTmF2KCkge1xuICAgICAgdGhpcy5oZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG4gICAgICB0aGlzLndpZHRoID0gJCh3aW5kb3cpLndpZHRoKCkgO1xuICAgICAgdGhpcy5pID0gMDtcbiAgICAgIHRoaXMuZHVyYXRpb24gPSA3NTA7XG4gICAgfSxcblxuICAgIHJlc2l6ZTogZnVuY3Rpb24gcmVzaXplTmF2KCkge1xuICAgICAgdGhpcy5pbml0U2l6ZSgpO1xuIFxuICAgICAgdGhpcy5zdmdcbiAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgdGhpcy53aWR0aCArIFwicHhcIilcbiAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsIHRoaXMuaGVpZ2h0ICsgXCJweFwiKTtcblxuICAgICAgdGhpcy52aXNcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB0aGlzLndpZHRoKVxuICAgICAgICAuYXR0cihcImhlaWdodFwiLCB0aGlzLmhlaWdodCk7XG5cbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSxcblxuICAgIC8vIFRoZSBOYXZWaWV3IGxpc3RlbnMgZm9yIGNoYW5nZXMgdG8gaXRzIG1vZGVsLCByZS1yZW5kZXJpbmcuXG4gICAgYWZ0ZXJJbml0OiBmdW5jdGlvbiBhZnRlckluaXROYXYoKXtcblxuICAgICAgJCh3aW5kb3cpLm9uKFwicmVzaXplXCIsIHRoaXMucmVzaXplLmJpbmQodGhpcykpO1xuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdjb25jZXB0Q2hhbmdlZCcsIHRoaXMuc2hvd1NlbGVjdGVkTm9kZSk7XG4gICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgJ25hdkNoYW5nZWQnLCB0aGlzLnByZVJlbmRlcik7XG5cbiAgICB9LFxuICAgIFxuICAgIC8vIFJlLXJlbmRlcnMgdGhlIHRpdGxlcyBvZiB0aGUgdG9kbyBpdGVtLlxuICAgIHByZVJlbmRlcjogZnVuY3Rpb24gcHJlUmVuZGVyTmF2KCkge1xuICBcbiAgICAgIGlmKHRoaXMuY29sbGVjdGlvbi5sb2FkZWQpe1xuXG4gICAgICAgIHRoaXMuaW5pdFNpemUoKTtcbiAgICAgICBcbiAgICAgICAgdGhpcy50cmVlID0gZDMubGF5b3V0LnRyZWUoKVxuICAgICAgICAgIC5zaXplKFt0aGlzLmhlaWdodCwgdGhpcy53aWR0aF0pO1xuICAgICAgICAvL1xuICAgICAgICB0aGlzLmRpYWdvbmFsID0gZDMuc3ZnLmRpYWdvbmFsKClcbiAgICAgICAgICAucHJvamVjdGlvbiggZnVuY3Rpb24oZCkgeyByZXR1cm4gW2QueSwgZC54XTsgfSApO1xuICAgICAgICAvL1xuICAgICAgICB0aGlzLnN2ZyA9IGQzLnNlbGVjdChcIm5hdi5uYXZcIik7XG4gICAgICAgIC8vXG4gICAgICAgIHRoaXMudmlzID0gdGhpcy5zdmcuYXBwZW5kKFwic3ZnOnN2Z1wiKTtcbiAgICAgICAgLy9cbiAgICAgICAgdGhpcy5tYWluID0gdGhpcy52aXNcbiAgICAgICAgICAuYXBwZW5kKFwic3ZnOmdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJtYWluIFwiICsgdGhpcy5jb2xsZWN0aW9uLmFjdGl2ZVRoZXNhdXJ1cyk7ICBcblxuICAgICAgICB0aGlzLnJvb3QgPSB0aGlzLmNvbGxlY3Rpb24uY29uY2VwdFRyZWU7XG4gICAgICAgIHRoaXMucm9vdC54MCA9IHRoaXMuaGVpZ2h0IC8gMjtcbiAgICAgICAgdGhpcy5yb290LnkwID0gMDtcbiAgICAgICAgdGhpcy5yZW5kZXIodGhpcy5yb290KTtcblxuICAgICAgICB0aGlzLnJlc2l6ZSgpO1xuICAgICAgICB0aGlzLnNob3dTZWxlY3RlZE5vZGUoKTtcbiAgICAgIH1cbiBcbiAgICB9LFxuICAgIHJlbmRlciA6IGZ1bmN0aW9uIHJlbmRlck5hdihzb3VyY2UpIHtcblxuICAgICAgLy9pZih0aGlzLmNvbGxlY3Rpb24ubG9hZGVkKXtcbiAgICAgIC8vIENvbXB1dGUgdGhlIG5ldyB0cmVlIGxheW91dC5cbiAgICAgIHZhciBub2RlcyA9IHRoaXMudHJlZS5ub2Rlcyh0aGlzLnJvb3QpLnJldmVyc2UoKSxcbiAgICAgICAgICBsaW5rcyA9IHRoaXMudHJlZS5saW5rcyhub2Rlcyk7XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSBmb3IgZml4ZWQtZGVwdGguXG4gICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgZC55ID0gZC5kZXB0aCAqIDE4MDsgfSk7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgbm9kZXPigKZcbiAgICAgIHZhciBub2RlID0gdGhpcy5tYWluLnNlbGVjdEFsbChcImcubm9kZVwiKVxuICAgICAgICAgIC5kYXRhKG5vZGVzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmlkIHx8IChkLmlkID0gKyt0aGlzLmkpOyB9KTtcblxuICAgICAgLy8gRW50ZXIgYW55IG5ldyBub2RlcyBhdCB0aGUgcGFyZW50J3MgcHJldmlvdXMgcG9zaXRpb24uXG4gICAgICB2YXIgbm9kZUVudGVyID0gbm9kZS5lbnRlcigpLmFwcGVuZChcImdcIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpeyByZXR1cm4gXCJub2RlIG5vZGVfXCIrZC5pZDsgfSlcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcInRyYW5zbGF0ZShcIiArIHNvdXJjZS55MCArIFwiLFwiICsgc291cmNlLngwICsgXCIpXCI7IH0pO1xuXG4gICAgICBub2RlRW50ZXIuYXBwZW5kKFwiY2lyY2xlXCIpXG4gICAgICAgICAgLmF0dHIoXCJyXCIsIDFlLTYpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLl9jaGlsZHJlbiA/IFwiY2hpbGRyZW5cIiA6IFwiXCI7IH0pXG4gICAgICAgICAgLm9uKFwiY2xpY2tcIiwgdGhpcy50b2dnbGVOb2RlLmJpbmQodGhpcykpO1xuXG4gICAgICBub2RlRW50ZXIuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNoaWxkcmVuIHx8IGQuX2NoaWxkcmVuID8gLTEwIDogMTA7IH0pXG4gICAgICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNoaWxkcmVuIHx8IGQuX2NoaWxkcmVuID8gXCJlbmRcIiA6IFwic3RhcnRcIjsgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWU7IH0pXG4gICAgICAgICAgLnN0eWxlKFwiZmlsbC1vcGFjaXR5XCIsIDFlLTYpXG4gICAgICAgICAgLm9uKFwiY2xpY2tcIiwgdGhpcy5zZWxlY3ROb2RlLmJpbmQodGhpcykpO1xuXG4gICAgICAvLyBUcmFuc2l0aW9uIG5vZGVzIHRvIHRoZWlyIG5ldyBwb3NpdGlvbi5cbiAgICAgIHZhciBub2RlVXBkYXRlID0gbm9kZS50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24odGhpcy5kdXJhdGlvbilcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcInRyYW5zbGF0ZShcIiArIGQueSArIFwiLFwiICsgZC54ICsgXCIpXCI7IH0pO1xuXG4gICAgICBub2RlVXBkYXRlLnNlbGVjdChcImNpcmNsZVwiKVxuICAgICAgICAgIC5hdHRyKFwiclwiLCA0LjUpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLl9jaGlsZHJlbiA/IFwiY2hpbGRyZW5cIiA6IFwiXCI7IH0pO1xuXG4gICAgICBub2RlVXBkYXRlLnNlbGVjdChcInRleHRcIilcbiAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMSk7XG5cbiAgICAgIC8vIFRyYW5zaXRpb24gZXhpdGluZyBub2RlcyB0byB0aGUgcGFyZW50J3MgbmV3IHBvc2l0aW9uLlxuICAgICAgdmFyIG5vZGVFeGl0ID0gbm9kZS5leGl0KCkudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmR1cmF0aW9uKHRoaXMuZHVyYXRpb24pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBzb3VyY2UueSArIFwiLFwiICsgc291cmNlLnggKyBcIilcIjsgfSlcbiAgICAgICAgICAucmVtb3ZlKCk7XG5cbiAgICAgIG5vZGVFeGl0LnNlbGVjdChcImNpcmNsZVwiKVxuICAgICAgICAgIC5hdHRyKFwiclwiLCAxZS02KTtcblxuICAgICAgbm9kZUV4aXQuc2VsZWN0KFwidGV4dFwiKVxuICAgICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxZS02KTtcblxuICAgICAgLy8gVXBkYXRlIHRoZSBsaW5rc+KAplxuICAgICAgdmFyIGxpbmsgPSB0aGlzLm1haW4uc2VsZWN0QWxsKFwicGF0aC5saW5rXCIpXG4gICAgICAgICAgLmRhdGEobGlua3MsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0LmlkOyB9KTtcblxuICAgICAgdmFyIGRpYWdvbmFsID0gdGhpcy5kaWFnb25hbDtcbiAgICAgIC8vIEVudGVyIGFueSBuZXcgbGlua3MgYXQgdGhlIHBhcmVudCdzIHByZXZpb3VzIHBvc2l0aW9uLlxuICAgICAgbGluay5lbnRlcigpLmluc2VydChcInBhdGhcIiwgXCJnXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmtcIilcbiAgICAgICAgICAuYXR0cihcImRcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgdmFyIG8gPSB7eDogc291cmNlLngwLCB5OiBzb3VyY2UueTB9O1xuICAgICAgICAgICAgcmV0dXJuIGRpYWdvbmFsKHtzb3VyY2U6IG8sIHRhcmdldDogb30pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAvLyBUcmFuc2l0aW9uIGxpbmtzIHRvIHRoZWlyIG5ldyBwb3NpdGlvbi5cbiAgICAgIGxpbmsudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmR1cmF0aW9uKHRoaXMuZHVyYXRpb24pXG4gICAgICAgICAgLmF0dHIoXCJkXCIsIGRpYWdvbmFsKTtcblxuICAgICAgLy8gVHJhbnNpdGlvbiBleGl0aW5nIG5vZGVzIHRvIHRoZSBwYXJlbnQncyBuZXcgcG9zaXRpb24uXG4gICAgICBsaW5rLmV4aXQoKS50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24odGhpcy5kdXJhdGlvbilcbiAgICAgICAgICAuYXR0cihcImRcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgdmFyIG8gPSB7eDogc291cmNlLngsIHk6IHNvdXJjZS55fTtcbiAgICAgICAgICAgIHJldHVybiBkaWFnb25hbCh7c291cmNlOiBvLCB0YXJnZXQ6IG99KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5yZW1vdmUoKTtcblxuICAgICAgLy8gU3Rhc2ggdGhlIG9sZCBwb3NpdGlvbnMgZm9yIHRyYW5zaXRpb24uXG4gICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgZC54MCA9IGQueDtcbiAgICAgICAgZC55MCA9IGQueTtcbiAgICAgIH0pO1xuICAgICAgLy99XG4gICAgfSxcbiAgICB0b2dnbGVOb2RlOiBmdW5jdGlvbiB0b2dnbGVOb2RlTmF2KGQsIGkpIHtcbiAgICAgIC8vY29uc29sZS5sb2coXCJ1cGRhdGVcIixkKTtcbiAgICAgIGlmIChkLmNoaWxkcmVuKSB7XG4gICAgICAgIGQuX2NoaWxkcmVuID0gZC5jaGlsZHJlbjtcbiAgICAgICAgZC5jaGlsZHJlbiA9IG51bGw7ICAgICAgICAgICAgICBcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGQuY2hpbGRyZW4gPSBkLl9jaGlsZHJlbjtcbiAgICAgICAgZC5fY2hpbGRyZW4gPSBudWxsO1xuICAgICAgfVxuICAgICAgdGhpcy5yZW5kZXIoZCk7XG4gICAgICAvL2NvbnNvbGUubG9nKGQpO1xuICAgIH0sXG4gICAgc2hvd1NlbGVjdGVkTm9kZTogZnVuY3Rpb24gc2hvd1NlbGVjdGVkTm9kZU5hdih1cmkpIHtcbiAgICAgIC8vaWYodGhpcy5jb2xsZWN0aW9uLmxvYWRlZCl7XG4gICAgICAgIGQzLnNlbGVjdChcIi5ub2RlLnNlbGVjdGVkXCIpLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmYWxzZSk7XG4gICAgICAgIHZhciB0aGVtb2RlbCA9IHRoaXMuY29sbGVjdGlvbi5nZXRBY3RpdmVDb25jZXB0KCk7XG4gICAgICAgIGlmKHRoZW1vZGVsKSBkMy5zZWxlY3QoXCIubm9kZV9cIisgdGhlbW9kZWwuYXR0cmlidXRlcy5pZCkuY2xhc3NlZChcInNlbGVjdGVkXCIsIHRydWUpO1xuICAgICAgLy99XG4gICAgfSxcbiAgICBzZWxlY3ROb2RlOiBmdW5jdGlvbiBzZWxlY3ROb2RlTmF2KGQsIGkpIHtcbiAgICAgIC8vXG4gICAgICBhcHBsaWNhdGlvbi5yb3V0ZXIubmF2aWdhdGUoYXBwbGljYXRpb24ucHJvY2Vzc1VyaShkLnVyaSksIHt0cmlnZ2VyIDogdHJ1ZX0pO1xuICAgICAgLy9iYWNrYm9uZSBiZWluZyBzbWFydCBlbm91Z2ggbm90IHRvIHRyaWdnZXIgdGhlIHJvdXRlIGlmIGNvbmNlcHQgYWxyZWFkeSBzZWxlY3RlZFxuICAgICAgLy93ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGUgcG9wLXVwIGlzIG9wZW5cbiAgICAgIGlmKHRoaXMuY29sbGVjdGlvbi5hY3RpdmVDb25jZXB0SWQgPT0gZC51cmkpIHtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLnRvZ2dsZUNvbmNlcHQodHJ1ZSk7XG4gICAgICB9XG4gICAgICBkMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9XG5cbn0pO1xuIiwidmFyIFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgdGVtcGxhdGUgOiByZXF1aXJlKCcuL3RlbXBsYXRlcy9zZWxlY3ROYXYuaGJzJyksXG4gICAgLy8gVGhlIERPTSBldmVudHMgc3BlY2lmaWMgdG8gYSBjb25jZXB0LlxuICAgIGV2ZW50czoge1xuICAgICAgJ2NoYW5nZSAjc2VsZWN0TmF2JzogJ3NlbGVjdE5hdicsXG4gICAgfSxcbiAgICAvL1xuICAgIGFmdGVySW5pdDogZnVuY3Rpb24gYWZ0ZXJJbml0U2VsZWN0TmF2KCl7XG4gICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgJ2RhdGFDaGFuZ2VkJywgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgLy9cbiAgICBnZXRSZW5kZXJEYXRhOiBmdW5jdGlvbiBnZXRSZW5kZXJEYXRhU2VsZWN0TmF2KCl7XG4gICAgICByZXR1cm57XG4gICAgICAgIHZpZXdUeXBlcyA6IHRoaXMuY29sbGVjdGlvbi5nZXRWaWV3VHlwZXMoKVxuICAgICAgfTtcbiAgICB9LFxuICAgIC8vICBcbiAgICBzZWxlY3ROYXY6IGZ1bmN0aW9uIHNlbGVjdE5hdihldmVudCkge1xuICAgICAgLy9jb25zb2xlLmxvZyhcIlNBTFVUXCIsIE51bWJlcigkKGV2ZW50LnRhcmdldCkudmFsKCkpKTtcbiAgICAgIFxuICAgICAgdGhpcy5jb2xsZWN0aW9uLnNldFZpZXdUeXBlKE51bWJlcigkKGV2ZW50LnRhcmdldCkudmFsKCkpKTtcbiAgICB9XG5cbn0pOyIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgaGVscGVyLCBoZWxwZXJNaXNzaW5nPWhlbHBlcnMuaGVscGVyTWlzc2luZywgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJcXG4gICAgPG5hdj5cXG4gICAgICA8YSBjbGFzcz1cXFwicHJldlxcXCIgaHJlZj1cXFwiL1xcXCI+PDwvYT5cXG4gICAgICA8YSBjbGFzcz1cXFwibmV4dFxcXCIgaHJlZj1cXFwiL1xcXCI+PjwvYT4gICAgICBcXG4gICAgPC9uYXY+XFxuICAgIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXIsIG9wdGlvbnM7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgxPlwiO1xuICBzdGFjazEgPSAoaGVscGVyID0gaGVscGVycy5sYWJlbF93aXRoX2xhbmd1YWdlIHx8IChkZXB0aDAgJiYgZGVwdGgwLmxhYmVsX3dpdGhfbGFuZ3VhZ2UpLG9wdGlvbnM9e2hhc2g6e30sZGF0YTpkYXRhfSxoZWxwZXIgPyBoZWxwZXIuY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLnByZWZMYWJlbCksIChkZXB0aDAgJiYgZGVwdGgwLmxhbmd1YWdlKSwgb3B0aW9ucykgOiBoZWxwZXJNaXNzaW5nLmNhbGwoZGVwdGgwLCBcImxhYmVsX3dpdGhfbGFuZ3VhZ2VcIiwgKGRlcHRoMCAmJiBkZXB0aDAucHJlZkxhYmVsKSwgKGRlcHRoMCAmJiBkZXB0aDAubGFuZ3VhZ2UpLCBvcHRpb25zKSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gxPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXIsIG9wdGlvbnM7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgyPjxjb2RlPnNrb3M6ZGVmaW5pdGlvbjwvY29kZT48L2gyPlxcbiAgICAgICAgPHAgY2xhc3M9XFxcImRlZmluaXRpb25cXFwiPlwiO1xuICBzdGFjazEgPSAoaGVscGVyID0gaGVscGVycy50cmFuc2xhdGlvbl9sYWJlbCB8fCAoZGVwdGgwICYmIGRlcHRoMC50cmFuc2xhdGlvbl9sYWJlbCksb3B0aW9ucz17aGFzaDp7fSxkYXRhOmRhdGF9LGhlbHBlciA/IGhlbHBlci5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDBbJ3Nrb3M6ZGVmaW5pdGlvbiddKSwgb3B0aW9ucykgOiBoZWxwZXJNaXNzaW5nLmNhbGwoZGVwdGgwLCBcInRyYW5zbGF0aW9uX2xhYmVsXCIsIChkZXB0aDAgJiYgZGVwdGgwWydza29zOmRlZmluaXRpb24nXSksIG9wdGlvbnMpKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIFwicHJlZkxhYmVsICYmIGNvbmNlcHRcIiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDgsIHByb2dyYW04LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8aDI+PGNvZGU+c2tvczpwcmVmTGFiZWw8L2NvZGU+PC9oMj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLnByZWZMYWJlbCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXIsIG9wdGlvbnM7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8bGk+XCI7XG4gIHN0YWNrMSA9IChoZWxwZXIgPSBoZWxwZXJzLnRyYW5zbGF0aW9uX2xhYmVsIHx8IChkZXB0aDAgJiYgZGVwdGgwLnRyYW5zbGF0aW9uX2xhYmVsKSxvcHRpb25zPXtoYXNoOnt9LGRhdGE6ZGF0YX0saGVscGVyID8gaGVscGVyLmNhbGwoZGVwdGgwLCBkZXB0aDAsIG9wdGlvbnMpIDogaGVscGVyTWlzc2luZy5jYWxsKGRlcHRoMCwgXCJ0cmFuc2xhdGlvbl9sYWJlbFwiLCBkZXB0aDAsIG9wdGlvbnMpKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAoXCI7XG4gIHN0YWNrMSA9IChoZWxwZXIgPSBoZWxwZXJzLnRyYW5zbGF0aW9uX2xhbmd1YWdlIHx8IChkZXB0aDAgJiYgZGVwdGgwLnRyYW5zbGF0aW9uX2xhbmd1YWdlKSxvcHRpb25zPXtoYXNoOnt9LGRhdGE6ZGF0YX0saGVscGVyID8gaGVscGVyLmNhbGwoZGVwdGgwLCBkZXB0aDAsIG9wdGlvbnMpIDogaGVscGVyTWlzc2luZy5jYWxsKGRlcHRoMCwgXCJ0cmFuc2xhdGlvbl9sYW5ndWFnZVwiLCBkZXB0aDAsIG9wdGlvbnMpKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIik8L2xpPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTExKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxoMj48Y29kZT5za29zOmFsdExhYmVsPC9jb2RlPjwvaDI+XFxuICAgICAgICA8dWw+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5hbHRMYWJlbCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEzKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxoMj48Y29kZT5za29zOmhhc1RvcENvbmNlcHQ8L2NvZGU+PC9oMj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuaGFzVG9wQ29uY2VwdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNCwgcHJvZ3JhbTE0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgICA8bGk+PGEgaHJlZj1cXFwiXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiIGNsYXNzPVxcXCJsaW5rXFxcIj5cIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvYT48L2xpPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgyPjxjb2RlPnNrb3M6YnJvYWRlcjwvY29kZT48L2gyPlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5wYXJlbnRzKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE3LCBwcm9ncmFtMTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICAgIDxsaSBjbGFzcz1cXFwicGFyZW50X1wiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKGRhdGEgPT0gbnVsbCB8fCBkYXRhID09PSBmYWxzZSA/IGRhdGEgOiBkYXRhLmluZGV4KSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxhIGhyZWY9XFxcIlwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBjbGFzcz1cXFwibGlua1xcXCI+XCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2E+PC9saT5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE5KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxoMj5DaGlsZHJlbiA8Y29kZT5za29zOm5hcnJvd2VyPC9jb2RlPjwvaDI+XFxuICAgICAgICA8dWw+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5uYXJyb3dlciksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMCwgcHJvZ3JhbTIwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgPGxpPjxhIGhyZWY9XFxcIlwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBjbGFzcz1cXFwibGlua1xcXCI+XCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2E+PC9saT5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8aDI+PGNvZGU+c2tvczpleGFjdE1hdGNoPC9jb2RlPjwvaDI+XFxuICAgICAgICA8dWw+XFxuICAgICAgXHRcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5leGFjdE1hdGNoKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIzLCBwcm9ncmFtMjMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMjMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgb3B0aW9ucztcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcdDxsaT48YSBocmVmPVxcXCJcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgXCI7XG4gIHN0YWNrMSA9IChoZWxwZXIgPSBoZWxwZXJzLmlzX2ludGVybmFsX2xpbmsgfHwgKGRlcHRoMCAmJiBkZXB0aDAuaXNfaW50ZXJuYWxfbGluayksb3B0aW9ucz17aGFzaDp7fSxkYXRhOmRhdGF9LGhlbHBlciA/IGhlbHBlci5jYWxsKGRlcHRoMCwgZGVwdGgwLCBvcHRpb25zKSA6IGhlbHBlck1pc3NpbmcuY2FsbChkZXB0aDAsIFwiaXNfaW50ZXJuYWxfbGlua1wiLCBkZXB0aDAsIG9wdGlvbnMpKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIj5cIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvYT48L2xpPlxcbiAgICAgXHQgXHRcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgyPjxjb2RlPnNrb3M6Y2xvc2VNYXRjaDwvY29kZT48L2gyPlxcbiAgICAgICAgPHVsPlxcbiAgICAgIFx0XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuY2xvc2VNYXRjaCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMywgcHJvZ3JhbTIzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImNvbmNlcHQgXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmZvbGRlZENsYXNzKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmZvbGRlZENsYXNzKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gIDxoZWFkZXIgY2xhc3M9XFxcIlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5jb25jZXB0U2NoZW1lQ2xhc3MpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuY29uY2VwdFNjaGVtZUNsYXNzKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgPGEgY2xhc3M9XFxcImNsb3NlXFxcIiBocmVmPVxcXCIvXFxcIj5YPC9hPlxcbiAgICA8cCBjbGFzcz1cXFwiY29udGV4dFxcXCI+PGEgaHJlZj1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmNvbmNlcHRTY2hlbWUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuY29uY2VwdFNjaGVtZSk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgY2xhc3M9XFxcImxpbmtcXFwiPlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5jb25jZXB0U2NoZW1lKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmNvbmNlcHRTY2hlbWUpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2E+PC9wPlxcbiAgPC9oZWFkZXI+XFxuICA8ZGl2IGNsYXNzPVxcXCJib2R5XFxcIj5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmNvbmNlcHQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDxoZ3JvdXA+XFxuICAgICAgPGNvZGU+XCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLnR5cGUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudHlwZSk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvY29kZT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAucHJlZkxhYmVsKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxwPlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy51cmkpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudXJpKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcblxcbiAgICA8L2hncm91cD5cXG4gICAgPGRldGFpbD5cXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDBbJ3Nrb3M6ZGVmaW5pdGlvbiddKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5jb25jZXB0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5hbHRMYWJlbCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMSwgcHJvZ3JhbTExLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5oYXNUb3BDb25jZXB0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEzLCBwcm9ncmFtMTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLnBhcmVudHMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAubmFycm93ZXIpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTksIHByb2dyYW0xOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuZXhhY3RNYXRjaCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMiwgcHJvZ3JhbTIyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5jbG9zZU1hdGNoKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI1LCBwcm9ncmFtMjUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgIDwvZGV0YWlsPlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwidmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKFwiaGJzZnkvcnVudGltZVwiKTtcbnZhciBhcHBsaWNhdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi9hcHBsaWNhdGlvblwiKTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbGFiZWxfd2l0aF9sYW5ndWFnZScsIGZ1bmN0aW9uKGxhYmVscywgbGFuZ3VhZ2UpIHtcblx0Ly9pZiBhIGxhbmd1YWdlIGlzIHNwZWNpZmllZCBcblxuXHRpZihsYW5ndWFnZSkge1xuXHRcdHZhciBmaWx0ZXJlZExhYmVscyA9IGxhYmVscy5maWx0ZXIoZnVuY3Rpb24oZWxlbWVudCl7XG5cdFx0XHRyZXR1cm4gZWxlbWVudFtcIkBsYW5ndWFnZVwiXSA9PT0gbGFuZ3VhZ2U7XG5cdFx0fSlcblx0XHRpZihmaWx0ZXJlZExhYmVsc1swXSkgcmV0dXJuIGZpbHRlcmVkTGFiZWxzWzBdW1wiQHZhbHVlXCJdO1xuXHR9XG5cdFxuXHQvL290aGVyd2lzZSBnZXQgXCJwaXZvdFwiIGVsZW1lbnQsIHRoZSBvbmx5IG9uZSB3aGljaCBpcyBhIHN0cmluZyBcblx0XG5cdHZhciBmaWx0ZXJlZExhYmVscyA9IGxhYmVscy5maWx0ZXIoZnVuY3Rpb24oZWxlbWVudCl7XG5cdFx0cmV0dXJuIHR5cGVvZiBlbGVtZW50ID09PSBcInN0cmluZ1wiO1xuXHR9KVxuXHRyZXR1cm4gZmlsdGVyZWRMYWJlbHNbMF07XG5cdFxuXHRyZXR1cm4gXCJcIjtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd0cmFuc2xhdGlvbl9sYW5ndWFnZScsIGZ1bmN0aW9uKGxhYmVsT2JqZWN0KSB7XG5cdGlmICghbGFiZWxPYmplY3QpIHJldHVybjsgXG5cdGlmICh0eXBlb2YgbGFiZWxPYmplY3QgID09PSBcInN0cmluZ1wiKSByZXR1cm4gXCJwaXZvdFwiO1xuXHRyZXR1cm4gbGFiZWxPYmplY3RbXCJAbGFuZ3VhZ2VcIl07XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigndHJhbnNsYXRpb25fbGFiZWwnLCBmdW5jdGlvbihsYWJlbE9iamVjdCkge1xuXHRpZiAoIWxhYmVsT2JqZWN0KSByZXR1cm47IFxuXHRpZiAodHlwZW9mIGxhYmVsT2JqZWN0ICA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIGxhYmVsT2JqZWN0O1xuXHRyZXR1cm4gbGFiZWxPYmplY3RbXCJAdmFsdWVcIl07XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigncHJvcGVydGllc19saXN0JywgZnVuY3Rpb24ocHJvcGVydHkpIHtcbiAgXHRpZihBcnJheS5pc0FycmF5KHByb3BlcnR5KSkgcmV0dXJuIHByb3BlcnR5O1xuICBcdHJldHVybiBbcHJvcGVydHldO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3Byb2Nlc3NfdXJpJywgZnVuY3Rpb24odXJpKSB7XG5cdGlmKCF1cmkpIHJldHVybjtcblx0cmV0dXJuIGFwcGxpY2F0aW9uLnByb2Nlc3NVcmkodXJpKTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdpc19pbnRlcm5hbF9saW5rJywgZnVuY3Rpb24odXJpKSB7XG5cdGlmKCF1cmkpIHJldHVybjtcbiAgXHRpZihhcHBsaWNhdGlvbi5jb2xsZWN0aW9uLm1hdGNoQW55VGhlc2F1cnVzKHVyaSkpe1xuICBcdFx0cmV0dXJuIFwiIGNsYXNzPSdsaW5rJ1wiO1xuICBcdH1lbHNle1xuICBcdFx0cmV0dXJuIFwiIHRhcmdldD0nX2JsYW5rJ1wiO1xuICBcdH1cbn0pOyIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCJcXG48bWFpbiBjbGFzcz1cXFwibWFpblxcXCI+XFxuICA8aGVhZGVyPjxhIGhyZWY9XFxcIi9JbnN0cnVtZW50c0tleXdvcmRzL1xcXCI+PGltZyBzcmM9XFxcIi9pbWFnZXMvbG9nb3MvbWltby5wbmdcXFwiIGFsdD1cXFwiTUlNTyAtIE11c2ljYWwgSW5zdHJ1bWVudHMgTXVzZXVtcyBPbmxpbmVcXFwiIC8+PC9hPlxcbiAgXHQ8bmF2IGNsYXNzPVxcXCJ0b29sc1xcXCI+PC9uYXY+XFxuICA8L2hlYWRlcj5cXG4gIDxuYXYgY2xhc3M9XFxcIm5hdlxcXCI+XFxuICAgIFxcbiAgPC9uYXY+XFxuICA8YXJ0aWNsZT48L2FydGljbGU+XFxuPC9tYWluPlxcbjxmb290ZXI+PC9mb290ZXI+XFxuXCI7XG4gIH0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgaGVscGVyO1xuICBidWZmZXIgKz0gXCJcXG4gIFx0XHQ8b3B0aW9uIHZhbHVlPVxcXCJcIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuaWQpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiID5cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubmFtZSkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5uYW1lKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvb3B0aW9uPlxcblx0XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIHNlbGVjdGVkPVxcXCJzZWxlY3RlZFxcXCIgXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tPHVsIGNsYXNzPVxcXCJzY2hlbWVzXFxcIj5cXG5cdFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLnRoZXNhdXJ1c05hbWVzKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbjwvdWw+LS0+XFxuPGZvcm0+XFxuXHQ8c2VsZWN0IGlkPVxcXCJzZWxlY3ROYXZcXFwiIG5hbWU9XFxcInNlbGVjdE5hdlxcXCI+XFxuXHRcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC52aWV3VHlwZXMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXHQ8L3NlbGVjdD5cXG5cdDwhLS08aW5wdXQgbmFtZT1cXFwic2VhcmNoXFxcIiBpZD1cXFwic2VhcmNoXFxcIiBwbGFjZWhvbGRlcj1cXFwiUmVjaGVyY2hlclxcXCIgLz4tLT5cXG48L2Zvcm0+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwidmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG52YXIgaGVscGVycyA9IHJlcXVpcmUoJy4vdGVtcGxhdGVzL2hlbHBlcnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIGluaXRpYWxpemVWaWV3KCkge1xuICAgIF8uYmluZEFsbCh0aGlzLCAndGVtcGxhdGUnLCAnZ2V0UmVuZGVyRGF0YScsICdyZW5kZXInLCAnYWZ0ZXJSZW5kZXInKTtcbiAgICB0aGlzLmFmdGVySW5pdCgpO1xuICB9LFxuICBhZnRlckluaXQ6IGZ1bmN0aW9uIGFmdGVySW5pdFZpZXcoKSB7fSxcbiAgdGVtcGxhdGU6IGZ1bmN0aW9uIHRlbXBsYXRlVmlldygpIHt9LFxuICBnZXRSZW5kZXJEYXRhOiBmdW5jdGlvbiBnZXRSZW5kZXJEYXRhVmlldygpIHt9LFxuXG4gIHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyVmlldygpIHtcbiAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSh0aGlzLmdldFJlbmRlckRhdGEoKSkpO1xuICAgIF8uZGVmZXIodGhpcy5hZnRlclJlbmRlcik7IC8vc2V0VGltZU91dCgwKVxuICB9LFxuXG4gIGFmdGVyUmVuZGVyOiBmdW5jdGlvbiBhZnRlclJlbmRlclZpZXcoKSB7fVxufSk7IixudWxsLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYXN0ID0gcGFydHNbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBwYXJ0cy51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuLy8gU3BsaXQgYSBmaWxlbmFtZSBpbnRvIFtyb290LCBkaXIsIGJhc2VuYW1lLCBleHRdLCB1bml4IHZlcnNpb25cbi8vICdyb290JyBpcyBqdXN0IGEgc2xhc2gsIG9yIG5vdGhpbmcuXG52YXIgc3BsaXRQYXRoUmUgPVxuICAgIC9eKFxcLz98KShbXFxzXFxTXSo/KSgoPzpcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpKD86W1xcL10qKSQvO1xudmFyIHNwbGl0UGF0aCA9IGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gIHJldHVybiBzcGxpdFBhdGhSZS5leGVjKGZpbGVuYW1lKS5zbGljZSgxKTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICB2YXIgcGF0aCA9IChpID49IDApID8gYXJndW1lbnRzW2ldIDogcHJvY2Vzcy5jd2QoKTtcblxuICAgIC8vIFNraXAgZW1wdHkgYW5kIGludmFsaWQgZW50cmllc1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLnJlc29sdmUgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfSBlbHNlIGlmICghcGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICByZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgLy8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBleHBvcnRzLmlzQWJzb2x1dGUocGF0aCksXG4gICAgICB0cmFpbGluZ1NsYXNoID0gc3Vic3RyKHBhdGgsIC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIChpc0Fic29sdXRlID8gJy8nIDogJycpICsgcGF0aDtcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5qb2luIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfSkuam9pbignLycpKTtcbn07XG5cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVsYXRpdmUgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICBmcm9tID0gZXhwb3J0cy5yZXNvbHZlKGZyb20pLnN1YnN0cigxKTtcbiAgdG8gPSBleHBvcnRzLnJlc29sdmUodG8pLnN1YnN0cigxKTtcblxuICBmdW5jdGlvbiB0cmltKGFycikge1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yICg7IHN0YXJ0IDwgYXJyLmxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKGFycltzdGFydF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICB2YXIgZW5kID0gYXJyLmxlbmd0aCAtIDE7XG4gICAgZm9yICg7IGVuZCA+PSAwOyBlbmQtLSkge1xuICAgICAgaWYgKGFycltlbmRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5zbGljZShzdGFydCwgZW5kIC0gc3RhcnQgKyAxKTtcbiAgfVxuXG4gIHZhciBmcm9tUGFydHMgPSB0cmltKGZyb20uc3BsaXQoJy8nKSk7XG4gIHZhciB0b1BhcnRzID0gdHJpbSh0by5zcGxpdCgnLycpKTtcblxuICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oZnJvbVBhcnRzLmxlbmd0aCwgdG9QYXJ0cy5sZW5ndGgpO1xuICB2YXIgc2FtZVBhcnRzTGVuZ3RoID0gbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZyb21QYXJ0c1tpXSAhPT0gdG9QYXJ0c1tpXSkge1xuICAgICAgc2FtZVBhcnRzTGVuZ3RoID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBvdXRwdXRQYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gc2FtZVBhcnRzTGVuZ3RoOyBpIDwgZnJvbVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0UGFydHMucHVzaCgnLi4nKTtcbiAgfVxuXG4gIG91dHB1dFBhcnRzID0gb3V0cHV0UGFydHMuY29uY2F0KHRvUGFydHMuc2xpY2Uoc2FtZVBhcnRzTGVuZ3RoKSk7XG5cbiAgcmV0dXJuIG91dHB1dFBhcnRzLmpvaW4oJy8nKTtcbn07XG5cbmV4cG9ydHMuc2VwID0gJy8nO1xuZXhwb3J0cy5kZWxpbWl0ZXIgPSAnOic7XG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IHNwbGl0UGF0aChwYXRoKSxcbiAgICAgIHJvb3QgPSByZXN1bHRbMF0sXG4gICAgICBkaXIgPSByZXN1bHRbMV07XG5cbiAgaWYgKCFyb290ICYmICFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lIHdoYXRzb2V2ZXJcbiAgICByZXR1cm4gJy4nO1xuICB9XG5cbiAgaWYgKGRpcikge1xuICAgIC8vIEl0IGhhcyBhIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgZGlyID0gZGlyLnN1YnN0cigwLCBkaXIubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gcm9vdCArIGRpcjtcbn07XG5cblxuZXhwb3J0cy5iYXNlbmFtZSA9IGZ1bmN0aW9uKHBhdGgsIGV4dCkge1xuICB2YXIgZiA9IHNwbGl0UGF0aChwYXRoKVsyXTtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIGNvbXBhcmlzb24gY2FzZS1pbnNlbnNpdGl2ZSBvbiB3aW5kb3dzP1xuICBpZiAoZXh0ICYmIGYuc3Vic3RyKC0xICogZXh0Lmxlbmd0aCkgPT09IGV4dCkge1xuICAgIGYgPSBmLnN1YnN0cigwLCBmLmxlbmd0aCAtIGV4dC5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBmO1xufTtcblxuXG5leHBvcnRzLmV4dG5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBzcGxpdFBhdGgocGF0aClbM107XG59O1xuXG5mdW5jdGlvbiBmaWx0ZXIgKHhzLCBmKSB7XG4gICAgaWYgKHhzLmZpbHRlcikgcmV0dXJuIHhzLmZpbHRlcihmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUuc3Vic3RyIC0gbmVnYXRpdmUgaW5kZXggZG9uJ3Qgd29yayBpbiBJRThcbnZhciBzdWJzdHIgPSAnYWInLnN1YnN0cigtMSkgPT09ICdiJ1xuICAgID8gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikgeyByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKSB9XG4gICAgOiBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7XG4gICAgICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gc3RyLmxlbmd0aCArIHN0YXJ0O1xuICAgICAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKTtcbiAgICB9XG47XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwic2ZhdXVQXCIpKSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmdsb2JhbHMgSGFuZGxlYmFyczogdHJ1ZSAqL1xudmFyIGJhc2UgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL2Jhc2VcIik7XG5cbi8vIEVhY2ggb2YgdGhlc2UgYXVnbWVudCB0aGUgSGFuZGxlYmFycyBvYmplY3QuIE5vIG5lZWQgdG8gc2V0dXAgaGVyZS5cbi8vIChUaGlzIGlzIGRvbmUgdG8gZWFzaWx5IHNoYXJlIGNvZGUgYmV0d2VlbiBjb21tb25qcyBhbmQgYnJvd3NlIGVudnMpXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmdcIilbXCJkZWZhdWx0XCJdO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvdXRpbHNcIik7XG52YXIgcnVudGltZSA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvcnVudGltZVwiKTtcblxuLy8gRm9yIGNvbXBhdGliaWxpdHkgYW5kIHVzYWdlIG91dHNpZGUgb2YgbW9kdWxlIHN5c3RlbXMsIG1ha2UgdGhlIEhhbmRsZWJhcnMgb2JqZWN0IGEgbmFtZXNwYWNlXG52YXIgY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChoYiwgYmFzZSk7XG4gIGhiLlNhZmVTdHJpbmcgPSBTYWZlU3RyaW5nO1xuICBoYi5FeGNlcHRpb24gPSBFeGNlcHRpb247XG4gIGhiLlV0aWxzID0gVXRpbHM7XG5cbiAgaGIuVk0gPSBydW50aW1lO1xuICBoYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICByZXR1cm4gcnVudGltZS50ZW1wbGF0ZShzcGVjLCBoYik7XG4gIH07XG5cbiAgcmV0dXJuIGhiO1xufTtcblxudmFyIEhhbmRsZWJhcnMgPSBjcmVhdGUoKTtcbkhhbmRsZWJhcnMuY3JlYXRlID0gY3JlYXRlO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEhhbmRsZWJhcnM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgVkVSU0lPTiA9IFwiMS4zLjBcIjtcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047dmFyIENPTVBJTEVSX1JFVklTSU9OID0gNDtcbmV4cG9ydHMuQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuZXhwb3J0cy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7SGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IChjb250ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYoZGF0YSkgeyBcbiAgICAgICAgICAgICAgZGF0YS5rZXkgPSBrZXk7IFxuICAgICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSAwKXtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBjb250ZXh0KTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMyxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xuZnVuY3Rpb24gbG9nKGxldmVsLCBvYmopIHsgbG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfVxuXG5leHBvcnRzLmxvZyA9IGxvZzt2YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBVdGlscy5leHRlbmQob2JqLCBvYmplY3QpO1xuICByZXR1cm4gb2JqO1xufTtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xuICB2YXIgbGluZTtcbiAgaWYgKG5vZGUgJiYgbm9kZS5maXJzdExpbmUpIHtcbiAgICBsaW5lID0gbm9kZS5maXJzdExpbmU7XG5cbiAgICBtZXNzYWdlICs9ICcgLSAnICsgbGluZSArICc6JyArIG5vZGUuZmlyc3RDb2x1bW47XG4gIH1cblxuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgaWYgKGxpbmUpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gbm9kZS5maXJzdENvbHVtbjtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gRXhjZXB0aW9uOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIik7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247Ly8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlXCIpO1xuICB9XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgdmFyIGludm9rZVBhcnRpYWxXcmFwcGVyID0gZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHsgcmV0dXJuIHJlc3VsdDsgfVxuXG4gICAgaWYgKGVudi5jb21waWxlKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHsgZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkIH0sIGVudik7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH1cbiAgfTtcblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgaWYoZGF0YSkge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gcHJvZ3JhbShpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiAocGFyYW0gIT09IGNvbW1vbikpIHtcbiAgICAgICAgcmV0ID0ge307XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBlbnYuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IG51bGxcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52LFxuICAgICAgICBoZWxwZXJzLFxuICAgICAgICBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgcGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICAgICAgY29udGFpbmVyLFxuICAgICAgICAgIG5hbWVzcGFjZSwgY29udGV4dCxcbiAgICAgICAgICBoZWxwZXJzLFxuICAgICAgICAgIHBhcnRpYWxzLFxuICAgICAgICAgIG9wdGlvbnMuZGF0YSk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbmVyLmNvbXBpbGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO2Z1bmN0aW9uIHByb2dyYW1XaXRoRGVwdGgoaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW1XaXRoRGVwdGggPSBwcm9ncmFtV2l0aERlcHRoO2Z1bmN0aW9uIHByb2dyYW0oaSwgZm4sIGRhdGEpIHtcbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbSA9IHByb2dyYW07ZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICB2YXIgb3B0aW9ucyA9IHsgcGFydGlhbDogdHJ1ZSwgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7ZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIFwiXCI7IH1cblxuZXhwb3J0cy5ub29wID0gbm9vcDsiLCJcInVzZSBzdHJpY3RcIjtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gU2FmZVN0cmluZzsiLCJcInVzZSBzdHJpY3RcIjtcbi8qanNoaW50IC1XMDA0ICovXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmosIHZhbHVlKSB7XG4gIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBrZXkpKSB7XG4gICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO3ZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgfSBlbHNlIGlmICghc3RyaW5nICYmIHN0cmluZyAhPT0gMCkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTsiLCIvLyBDcmVhdGUgYSBzaW1wbGUgcGF0aCBhbGlhcyB0byBhbGxvdyBicm93c2VyaWZ5IHRvIHJlc29sdmVcbi8vIHRoZSBydW50aW1lIG9uIGEgc3VwcG9ydGVkIHBhdGguXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIilbXCJkZWZhdWx0XCJdO1xuIiwiLy8gSWdub3JlIG1vZHVsZSBmb3IgYnJvd3NlcmlmeSAoc2VlIHBhY2thZ2UuanNvbikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLF9fZGlybmFtZSl7XG4vKipcbiAqIEEgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgSlNPTi1MRCBBUEkuXG4gKlxuICogQGF1dGhvciBEYXZlIExvbmdsZXlcbiAqXG4gKiBCU0QgMy1DbGF1c2UgTGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDExLTIwMTQgRGlnaXRhbCBCYXphYXIsIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0XG4gKiBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcbiAqXG4gKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UsXG4gKiB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICpcbiAqIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gKiBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gKiBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuICpcbiAqIE5laXRoZXIgdGhlIG5hbWUgb2YgdGhlIERpZ2l0YWwgQmF6YWFyLCBJbmMuIG5vciB0aGUgbmFtZXMgb2YgaXRzXG4gKiBjb250cmlidXRvcnMgbWF5IGJlIHVzZWQgdG8gZW5kb3JzZSBvciBwcm9tb3RlIHByb2R1Y3RzIGRlcml2ZWQgZnJvbVxuICogdGhpcyBzb2Z0d2FyZSB3aXRob3V0IHNwZWNpZmljIHByaW9yIHdyaXR0ZW4gcGVybWlzc2lvbi5cbiAqXG4gKiBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIFRIRSBDT1BZUklHSFQgSE9MREVSUyBBTkQgQ09OVFJJQlVUT1JTIFwiQVNcbiAqIElTXCIgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURURcbiAqIFRPLCBUSEUgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQVxuICogUEFSVElDVUxBUiBQVVJQT1NFIEFSRSBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQ09QWVJJR0hUXG4gKiBIT0xERVIgT1IgQ09OVFJJQlVUT1JTIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsXG4gKiBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURURcbiAqIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTOyBMT1NTIE9GIFVTRSwgREFUQSwgT1JcbiAqIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EIE9OIEFOWSBUSEVPUlkgT0ZcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVCAoSU5DTFVESU5HXG4gKiBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GIFRISVNcbiAqIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuICovXG4oZnVuY3Rpb24oKSB7XG5cbi8vIGRldGVybWluZSBpZiBpbi1icm93c2VyIG9yIHVzaW5nIG5vZGUuanNcbnZhciBfbm9kZWpzID0gKFxuICB0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy52ZXJzaW9ucyAmJiBwcm9jZXNzLnZlcnNpb25zLm5vZGUpO1xudmFyIF9icm93c2VyID0gIV9ub2RlanMgJiZcbiAgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyk7XG5pZihfYnJvd3Nlcikge1xuICBpZih0eXBlb2YgZ2xvYmFsID09PSAndW5kZWZpbmVkJykge1xuICAgIGlmKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBnbG9iYWwgPSB3aW5kb3c7XG4gICAgfSBlbHNlIGlmKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZ2xvYmFsID0gc2VsZjtcbiAgICB9IGVsc2UgaWYodHlwZW9mICQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBnbG9iYWwgPSAkO1xuICAgIH1cbiAgfVxufVxuXG4vLyBhdHRhY2hlcyBqc29ubGQgQVBJIHRvIHRoZSBnaXZlbiBvYmplY3RcbnZhciB3cmFwcGVyID0gZnVuY3Rpb24oanNvbmxkKSB7XG5cbi8qIENvcmUgQVBJICovXG5cbi8qKlxuICogUGVyZm9ybXMgSlNPTi1MRCBjb21wYWN0aW9uLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBpbnB1dCB0byBjb21wYWN0LlxuICogQHBhcmFtIGN0eCB0aGUgY29udGV4dCB0byBjb21wYWN0IHdpdGguXG4gKiBAcGFyYW0gW29wdGlvbnNdIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2Jhc2VdIHRoZSBiYXNlIElSSSB0byB1c2UuXG4gKiAgICAgICAgICBbY29tcGFjdEFycmF5c10gdHJ1ZSB0byBjb21wYWN0IGFycmF5cyB0byBzaW5nbGUgdmFsdWVzIHdoZW5cbiAqICAgICAgICAgICAgYXBwcm9wcmlhdGUsIGZhbHNlIG5vdCB0byAoZGVmYXVsdDogdHJ1ZSkuXG4gKiAgICAgICAgICBbZ3JhcGhdIHRydWUgdG8gYWx3YXlzIG91dHB1dCBhIHRvcC1sZXZlbCBncmFwaCAoZGVmYXVsdDogZmFsc2UpLlxuICogICAgICAgICAgW2V4cGFuZENvbnRleHRdIGEgY29udGV4dCB0byBleHBhbmQgd2l0aC5cbiAqICAgICAgICAgIFtza2lwRXhwYW5zaW9uXSB0cnVlIHRvIGFzc3VtZSB0aGUgaW5wdXQgaXMgZXhwYW5kZWQgYW5kIHNraXBcbiAqICAgICAgICAgICAgZXhwYW5zaW9uLCBmYWxzZSBub3QgdG8sIGRlZmF1bHRzIHRvIGZhbHNlLlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIGNvbXBhY3RlZCwgY3R4KSBjYWxsZWQgb25jZSB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAqL1xuanNvbmxkLmNvbXBhY3QgPSBmdW5jdGlvbihpbnB1dCwgY3R4LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiBqc29ubGQubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayhuZXcgVHlwZUVycm9yKCdDb3VsZCBub3QgY29tcGFjdCwgdG9vIGZldyBhcmd1bWVudHMuJykpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gZ2V0IGFyZ3VtZW50c1xuICBpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgaWYoY3R4ID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ1RoZSBjb21wYWN0aW9uIGNvbnRleHQgbXVzdCBub3QgYmUgbnVsbC4nLFxuICAgICAgICAnanNvbmxkLkNvbXBhY3RFcnJvcicsIHtjb2RlOiAnaW52YWxpZCBsb2NhbCBjb250ZXh0J30pKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIG5vdGhpbmcgdG8gY29tcGFjdFxuICBpZihpbnB1dCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBqc29ubGQubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBudWxsKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYoISgnYmFzZScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmJhc2UgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykgPyBpbnB1dCA6ICcnO1xuICB9XG4gIGlmKCEoJ2NvbXBhY3RBcnJheXMnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5jb21wYWN0QXJyYXlzID0gdHJ1ZTtcbiAgfVxuICBpZighKCdncmFwaCcgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmdyYXBoID0gZmFsc2U7XG4gIH1cbiAgaWYoISgnc2tpcEV4cGFuc2lvbicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLnNraXBFeHBhbnNpb24gPSBmYWxzZTtcbiAgfVxuICBpZighKCdkb2N1bWVudExvYWRlcicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmxvYWREb2N1bWVudDtcbiAgfVxuICBpZighKCdsaW5rJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMubGluayA9IGZhbHNlO1xuICB9XG4gIGlmKG9wdGlvbnMubGluaykge1xuICAgIC8vIGZvcmNlIHNraXAgZXhwYW5zaW9uIHdoZW4gbGlua2luZywgXCJsaW5rXCIgaXMgbm90IHBhcnQgb2YgdGhlIHB1YmxpY1xuICAgIC8vIEFQSSwgaXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGZyb20gZnJhbWluZ1xuICAgIG9wdGlvbnMuc2tpcEV4cGFuc2lvbiA9IHRydWU7XG4gIH1cblxuICB2YXIgZXhwYW5kID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgaWYob3B0aW9ucy5za2lwRXhwYW5zaW9uKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBpbnB1dCk7XG4gICAgICB9XG4gICAgICBqc29ubGQuZXhwYW5kKGlucHV0LCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gZXhwYW5kIGlucHV0IHRoZW4gZG8gY29tcGFjdGlvblxuICBleHBhbmQoaW5wdXQsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgZXhwYW5kZWQpIHtcbiAgICBpZihlcnIpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdDb3VsZCBub3QgZXhwYW5kIGlucHV0IGJlZm9yZSBjb21wYWN0aW9uLicsXG4gICAgICAgICdqc29ubGQuQ29tcGFjdEVycm9yJywge2NhdXNlOiBlcnJ9KSk7XG4gICAgfVxuXG4gICAgLy8gcHJvY2VzcyBjb250ZXh0XG4gICAgdmFyIGFjdGl2ZUN0eCA9IF9nZXRJbml0aWFsQ29udGV4dChvcHRpb25zKTtcbiAgICBqc29ubGQucHJvY2Vzc0NvbnRleHQoYWN0aXZlQ3R4LCBjdHgsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgYWN0aXZlQ3R4KSB7XG4gICAgICBpZihlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnQ291bGQgbm90IHByb2Nlc3MgY29udGV4dCBiZWZvcmUgY29tcGFjdGlvbi4nLFxuICAgICAgICAgICdqc29ubGQuQ29tcGFjdEVycm9yJywge2NhdXNlOiBlcnJ9KSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjb21wYWN0ZWQ7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBkbyBjb21wYWN0aW9uXG4gICAgICAgIGNvbXBhY3RlZCA9IG5ldyBQcm9jZXNzb3IoKS5jb21wYWN0KGFjdGl2ZUN0eCwgbnVsbCwgZXhwYW5kZWQsIG9wdGlvbnMpO1xuICAgICAgfSBjYXRjaChleCkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXgpO1xuICAgICAgfVxuXG4gICAgICBjbGVhbnVwKG51bGwsIGNvbXBhY3RlZCwgYWN0aXZlQ3R4LCBvcHRpb25zKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcGVyZm9ybXMgY2xlYW4gdXAgYWZ0ZXIgY29tcGFjdGlvblxuICBmdW5jdGlvbiBjbGVhbnVwKGVyciwgY29tcGFjdGVkLCBhY3RpdmVDdHgsIG9wdGlvbnMpIHtcbiAgICBpZihlcnIpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgIH1cblxuICAgIGlmKG9wdGlvbnMuY29tcGFjdEFycmF5cyAmJiAhb3B0aW9ucy5ncmFwaCAmJiBfaXNBcnJheShjb21wYWN0ZWQpKSB7XG4gICAgICBpZihjb21wYWN0ZWQubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIHNpbXBsaWZ5IHRvIGEgc2luZ2xlIGl0ZW1cbiAgICAgICAgY29tcGFjdGVkID0gY29tcGFjdGVkWzBdO1xuICAgICAgfSBlbHNlIGlmKGNvbXBhY3RlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gc2ltcGxpZnkgdG8gYW4gZW1wdHkgb2JqZWN0XG4gICAgICAgIGNvbXBhY3RlZCA9IHt9O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZihvcHRpb25zLmdyYXBoICYmIF9pc09iamVjdChjb21wYWN0ZWQpKSB7XG4gICAgICAvLyBhbHdheXMgdXNlIGFycmF5IGlmIGdyYXBoIG9wdGlvbiBpcyBvblxuICAgICAgY29tcGFjdGVkID0gW2NvbXBhY3RlZF07XG4gICAgfVxuXG4gICAgLy8gZm9sbG93IEBjb250ZXh0IGtleVxuICAgIGlmKF9pc09iamVjdChjdHgpICYmICdAY29udGV4dCcgaW4gY3R4KSB7XG4gICAgICBjdHggPSBjdHhbJ0Bjb250ZXh0J107XG4gICAgfVxuXG4gICAgLy8gYnVpbGQgb3V0cHV0IGNvbnRleHRcbiAgICBjdHggPSBfY2xvbmUoY3R4KTtcbiAgICBpZighX2lzQXJyYXkoY3R4KSkge1xuICAgICAgY3R4ID0gW2N0eF07XG4gICAgfVxuICAgIC8vIHJlbW92ZSBlbXB0eSBjb250ZXh0c1xuICAgIHZhciB0bXAgPSBjdHg7XG4gICAgY3R4ID0gW107XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHRtcC5sZW5ndGg7ICsraSkge1xuICAgICAgaWYoIV9pc09iamVjdCh0bXBbaV0pIHx8IE9iamVjdC5rZXlzKHRtcFtpXSkubGVuZ3RoID4gMCkge1xuICAgICAgICBjdHgucHVzaCh0bXBbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJlbW92ZSBhcnJheSBpZiBvbmx5IG9uZSBjb250ZXh0XG4gICAgdmFyIGhhc0NvbnRleHQgPSAoY3R4Lmxlbmd0aCA+IDApO1xuICAgIGlmKGN0eC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGN0eCA9IGN0eFswXTtcbiAgICB9XG5cbiAgICAvLyBhZGQgY29udGV4dCBhbmQvb3IgQGdyYXBoXG4gICAgaWYoX2lzQXJyYXkoY29tcGFjdGVkKSkge1xuICAgICAgLy8gdXNlICdAZ3JhcGgnIGtleXdvcmRcbiAgICAgIHZhciBrd2dyYXBoID0gX2NvbXBhY3RJcmkoYWN0aXZlQ3R4LCAnQGdyYXBoJyk7XG4gICAgICB2YXIgZ3JhcGggPSBjb21wYWN0ZWQ7XG4gICAgICBjb21wYWN0ZWQgPSB7fTtcbiAgICAgIGlmKGhhc0NvbnRleHQpIHtcbiAgICAgICAgY29tcGFjdGVkWydAY29udGV4dCddID0gY3R4O1xuICAgICAgfVxuICAgICAgY29tcGFjdGVkW2t3Z3JhcGhdID0gZ3JhcGg7XG4gICAgfSBlbHNlIGlmKF9pc09iamVjdChjb21wYWN0ZWQpICYmIGhhc0NvbnRleHQpIHtcbiAgICAgIC8vIHJlb3JkZXIga2V5cyBzbyBAY29udGV4dCBpcyBmaXJzdFxuICAgICAgdmFyIGdyYXBoID0gY29tcGFjdGVkO1xuICAgICAgY29tcGFjdGVkID0geydAY29udGV4dCc6IGN0eH07XG4gICAgICBmb3IodmFyIGtleSBpbiBncmFwaCkge1xuICAgICAgICBjb21wYWN0ZWRba2V5XSA9IGdyYXBoW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FsbGJhY2sobnVsbCwgY29tcGFjdGVkLCBhY3RpdmVDdHgpO1xuICB9XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIEpTT04tTEQgZXhwYW5zaW9uLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBpbnB1dCB0byBleHBhbmQuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtiYXNlXSB0aGUgYmFzZSBJUkkgdG8gdXNlLlxuICogICAgICAgICAgW2V4cGFuZENvbnRleHRdIGEgY29udGV4dCB0byBleHBhbmQgd2l0aC5cbiAqICAgICAgICAgIFtrZWVwRnJlZUZsb2F0aW5nTm9kZXNdIHRydWUgdG8ga2VlcCBmcmVlLWZsb2F0aW5nIG5vZGVzLFxuICogICAgICAgICAgICBmYWxzZSBub3QgdG8sIGRlZmF1bHRzIHRvIGZhbHNlLlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIGV4cGFuZGVkKSBjYWxsZWQgb25jZSB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAqL1xuanNvbmxkLmV4cGFuZCA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMSkge1xuICAgIHJldHVybiBqc29ubGQubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayhuZXcgVHlwZUVycm9yKCdDb3VsZCBub3QgZXhwYW5kLCB0b28gZmV3IGFyZ3VtZW50cy4nKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBnZXQgYXJndW1lbnRzXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ2RvY3VtZW50TG9hZGVyJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZG9jdW1lbnRMb2FkZXIgPSBqc29ubGQubG9hZERvY3VtZW50O1xuICB9XG4gIGlmKCEoJ2tlZXBGcmVlRmxvYXRpbmdOb2RlcycgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmtlZXBGcmVlRmxvYXRpbmdOb2RlcyA9IGZhbHNlO1xuICB9XG5cbiAganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgIC8vIGlmIGlucHV0IGlzIGEgc3RyaW5nLCBhdHRlbXB0IHRvIGRlcmVmZXJlbmNlIHJlbW90ZSBkb2N1bWVudFxuICAgIGlmKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBkb25lID0gZnVuY3Rpb24oZXJyLCByZW1vdGVEb2MpIHtcbiAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpZighcmVtb3RlRG9jLmRvY3VtZW50KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAgICdObyByZW1vdGUgZG9jdW1lbnQgZm91bmQgYXQgdGhlIGdpdmVuIFVSTC4nLFxuICAgICAgICAgICAgICAnanNvbmxkLk51bGxSZW1vdGVEb2N1bWVudCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZih0eXBlb2YgcmVtb3RlRG9jLmRvY3VtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmVtb3RlRG9jLmRvY3VtZW50ID0gSlNPTi5wYXJzZShyZW1vdGVEb2MuZG9jdW1lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaChleCkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAnQ291bGQgbm90IHJldHJpZXZlIGEgSlNPTi1MRCBkb2N1bWVudCBmcm9tIHRoZSBVUkwuIFVSTCAnICtcbiAgICAgICAgICAgICdkZXJlZmVyZW5jaW5nIG5vdCBpbXBsZW1lbnRlZC4nLCAnanNvbmxkLkxvYWREb2N1bWVudEVycm9yJywge1xuICAgICAgICAgICAgICBjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnLFxuICAgICAgICAgICAgICBjYXVzZTogZXgsXG4gICAgICAgICAgICAgIHJlbW90ZURvYzogcmVtb3RlRG9jXG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIGV4cGFuZChyZW1vdGVEb2MpO1xuICAgICAgfTtcbiAgICAgIHZhciBwcm9taXNlID0gb3B0aW9ucy5kb2N1bWVudExvYWRlcihpbnB1dCwgZG9uZSk7XG4gICAgICBpZihwcm9taXNlICYmICd0aGVuJyBpbiBwcm9taXNlKSB7XG4gICAgICAgIHByb21pc2UudGhlbihkb25lLmJpbmQobnVsbCwgbnVsbCksIGRvbmUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBub3RoaW5nIHRvIGxvYWRcbiAgICBleHBhbmQoe2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiBudWxsLCBkb2N1bWVudDogaW5wdXR9KTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gZXhwYW5kKHJlbW90ZURvYykge1xuICAgIC8vIHNldCBkZWZhdWx0IGJhc2VcbiAgICBpZighKCdiYXNlJyBpbiBvcHRpb25zKSkge1xuICAgICAgb3B0aW9ucy5iYXNlID0gcmVtb3RlRG9jLmRvY3VtZW50VXJsIHx8ICcnO1xuICAgIH1cbiAgICAvLyBidWlsZCBtZXRhLW9iamVjdCBhbmQgcmV0cmlldmUgYWxsIEBjb250ZXh0IFVSTHNcbiAgICB2YXIgaW5wdXQgPSB7XG4gICAgICBkb2N1bWVudDogX2Nsb25lKHJlbW90ZURvYy5kb2N1bWVudCksXG4gICAgICByZW1vdGVDb250ZXh0OiB7J0Bjb250ZXh0JzogcmVtb3RlRG9jLmNvbnRleHRVcmx9XG4gICAgfTtcbiAgICBpZignZXhwYW5kQ29udGV4dCcgaW4gb3B0aW9ucykge1xuICAgICAgdmFyIGV4cGFuZENvbnRleHQgPSBfY2xvbmUob3B0aW9ucy5leHBhbmRDb250ZXh0KTtcbiAgICAgIGlmKHR5cGVvZiBleHBhbmRDb250ZXh0ID09PSAnb2JqZWN0JyAmJiAnQGNvbnRleHQnIGluIGV4cGFuZENvbnRleHQpIHtcbiAgICAgICAgaW5wdXQuZXhwYW5kQ29udGV4dCA9IGV4cGFuZENvbnRleHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dC5leHBhbmRDb250ZXh0ID0geydAY29udGV4dCc6IGV4cGFuZENvbnRleHR9O1xuICAgICAgfVxuICAgIH1cbiAgICBfcmV0cmlldmVDb250ZXh0VXJscyhpbnB1dCwgb3B0aW9ucywgZnVuY3Rpb24oZXJyLCBpbnB1dCkge1xuICAgICAgaWYoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfVxuXG4gICAgICB2YXIgZXhwYW5kZWQ7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgcHJvY2Vzc29yID0gbmV3IFByb2Nlc3NvcigpO1xuICAgICAgICB2YXIgYWN0aXZlQ3R4ID0gX2dldEluaXRpYWxDb250ZXh0KG9wdGlvbnMpO1xuICAgICAgICB2YXIgZG9jdW1lbnQgPSBpbnB1dC5kb2N1bWVudDtcbiAgICAgICAgdmFyIHJlbW90ZUNvbnRleHQgPSBpbnB1dC5yZW1vdGVDb250ZXh0WydAY29udGV4dCddO1xuXG4gICAgICAgIC8vIHByb2Nlc3Mgb3B0aW9uYWwgZXhwYW5kQ29udGV4dFxuICAgICAgICBpZihpbnB1dC5leHBhbmRDb250ZXh0KSB7XG4gICAgICAgICAgYWN0aXZlQ3R4ID0gcHJvY2Vzc29yLnByb2Nlc3NDb250ZXh0KFxuICAgICAgICAgICAgYWN0aXZlQ3R4LCBpbnB1dC5leHBhbmRDb250ZXh0WydAY29udGV4dCddLCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHByb2Nlc3MgcmVtb3RlIGNvbnRleHQgZnJvbSBIVFRQIExpbmsgSGVhZGVyXG4gICAgICAgIGlmKHJlbW90ZUNvbnRleHQpIHtcbiAgICAgICAgICBhY3RpdmVDdHggPSBwcm9jZXNzb3IucHJvY2Vzc0NvbnRleHQoXG4gICAgICAgICAgICBhY3RpdmVDdHgsIHJlbW90ZUNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZXhwYW5kIGRvY3VtZW50XG4gICAgICAgIGV4cGFuZGVkID0gcHJvY2Vzc29yLmV4cGFuZChcbiAgICAgICAgICBhY3RpdmVDdHgsIG51bGwsIGRvY3VtZW50LCBvcHRpb25zLCBmYWxzZSk7XG5cbiAgICAgICAgLy8gb3B0aW1pemUgYXdheSBAZ3JhcGggd2l0aCBubyBvdGhlciBwcm9wZXJ0aWVzXG4gICAgICAgIGlmKF9pc09iamVjdChleHBhbmRlZCkgJiYgKCdAZ3JhcGgnIGluIGV4cGFuZGVkKSAmJlxuICAgICAgICAgIE9iamVjdC5rZXlzKGV4cGFuZGVkKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBleHBhbmRlZCA9IGV4cGFuZGVkWydAZ3JhcGgnXTtcbiAgICAgICAgfSBlbHNlIGlmKGV4cGFuZGVkID09PSBudWxsKSB7XG4gICAgICAgICAgZXhwYW5kZWQgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5vcm1hbGl6ZSB0byBhbiBhcnJheVxuICAgICAgICBpZighX2lzQXJyYXkoZXhwYW5kZWQpKSB7XG4gICAgICAgICAgZXhwYW5kZWQgPSBbZXhwYW5kZWRdO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoKGV4KSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhleCk7XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhudWxsLCBleHBhbmRlZCk7XG4gICAgfSk7XG4gIH1cbn07XG5cbi8qKlxuICogUGVyZm9ybXMgSlNPTi1MRCBmbGF0dGVuaW5nLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCB0byBmbGF0dGVuLlxuICogQHBhcmFtIGN0eCB0aGUgY29udGV4dCB0byB1c2UgdG8gY29tcGFjdCB0aGUgZmxhdHRlbmVkIG91dHB1dCwgb3IgbnVsbC5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2Jhc2VdIHRoZSBiYXNlIElSSSB0byB1c2UuXG4gKiAgICAgICAgICBbZXhwYW5kQ29udGV4dF0gYSBjb250ZXh0IHRvIGV4cGFuZCB3aXRoLlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIGZsYXR0ZW5lZCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmpzb25sZC5mbGF0dGVuID0gZnVuY3Rpb24oaW5wdXQsIGN0eCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDEpIHtcbiAgICByZXR1cm4ganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobmV3IFR5cGVFcnJvcignQ291bGQgbm90IGZsYXR0ZW4sIHRvbyBmZXcgYXJndW1lbnRzLicpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGdldCBhcmd1bWVudHNcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9IGVsc2UgaWYodHlwZW9mIGN0eCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gY3R4O1xuICAgIGN0eCA9IG51bGw7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYoISgnYmFzZScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmJhc2UgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykgPyBpbnB1dCA6ICcnO1xuICB9XG4gIGlmKCEoJ2RvY3VtZW50TG9hZGVyJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZG9jdW1lbnRMb2FkZXIgPSBqc29ubGQubG9hZERvY3VtZW50O1xuICB9XG5cbiAgLy8gZXhwYW5kIGlucHV0XG4gIGpzb25sZC5leHBhbmQoaW5wdXQsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgX2lucHV0KSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnQ291bGQgbm90IGV4cGFuZCBpbnB1dCBiZWZvcmUgZmxhdHRlbmluZy4nLFxuICAgICAgICAnanNvbmxkLkZsYXR0ZW5FcnJvcicsIHtjYXVzZTogZXJyfSkpO1xuICAgIH1cblxuICAgIHZhciBmbGF0dGVuZWQ7XG4gICAgdHJ5IHtcbiAgICAgIC8vIGRvIGZsYXR0ZW5pbmdcbiAgICAgIGZsYXR0ZW5lZCA9IG5ldyBQcm9jZXNzb3IoKS5mbGF0dGVuKF9pbnB1dCk7XG4gICAgfSBjYXRjaChleCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGV4KTtcbiAgICB9XG5cbiAgICBpZihjdHggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBmbGF0dGVuZWQpO1xuICAgIH1cblxuICAgIC8vIGNvbXBhY3QgcmVzdWx0IChmb3JjZSBAZ3JhcGggb3B0aW9uIHRvIHRydWUsIHNraXAgZXhwYW5zaW9uKVxuICAgIG9wdGlvbnMuZ3JhcGggPSB0cnVlO1xuICAgIG9wdGlvbnMuc2tpcEV4cGFuc2lvbiA9IHRydWU7XG4gICAganNvbmxkLmNvbXBhY3QoZmxhdHRlbmVkLCBjdHgsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgY29tcGFjdGVkKSB7XG4gICAgICBpZihlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnQ291bGQgbm90IGNvbXBhY3QgZmxhdHRlbmVkIG91dHB1dC4nLFxuICAgICAgICAgICdqc29ubGQuRmxhdHRlbkVycm9yJywge2NhdXNlOiBlcnJ9KSk7XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhudWxsLCBjb21wYWN0ZWQpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbi8qKlxuICogUGVyZm9ybXMgSlNPTi1MRCBmcmFtaW5nLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBpbnB1dCB0byBmcmFtZS5cbiAqIEBwYXJhbSBmcmFtZSB0aGUgSlNPTi1MRCBmcmFtZSB0byB1c2UuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBmcmFtaW5nIG9wdGlvbnMuXG4gKiAgICAgICAgICBbYmFzZV0gdGhlIGJhc2UgSVJJIHRvIHVzZS5cbiAqICAgICAgICAgIFtleHBhbmRDb250ZXh0XSBhIGNvbnRleHQgdG8gZXhwYW5kIHdpdGguXG4gKiAgICAgICAgICBbZW1iZWRdIGRlZmF1bHQgQGVtYmVkIGZsYWc6ICdAbGFzdCcsICdAYWx3YXlzJywgJ0BuZXZlcicsICdAbGluaydcbiAqICAgICAgICAgICAgKGRlZmF1bHQ6ICdAbGFzdCcpLlxuICogICAgICAgICAgW2V4cGxpY2l0XSBkZWZhdWx0IEBleHBsaWNpdCBmbGFnIChkZWZhdWx0OiBmYWxzZSkuXG4gKiAgICAgICAgICBbcmVxdWlyZUFsbF0gZGVmYXVsdCBAcmVxdWlyZUFsbCBmbGFnIChkZWZhdWx0OiB0cnVlKS5cbiAqICAgICAgICAgIFtvbWl0RGVmYXVsdF0gZGVmYXVsdCBAb21pdERlZmF1bHQgZmxhZyAoZGVmYXVsdDogZmFsc2UpLlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIGZyYW1lZCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmpzb25sZC5mcmFtZSA9IGZ1bmN0aW9uKGlucHV0LCBmcmFtZSwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICByZXR1cm4ganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobmV3IFR5cGVFcnJvcignQ291bGQgbm90IGZyYW1lLCB0b28gZmV3IGFyZ3VtZW50cy4nKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBnZXQgYXJndW1lbnRzXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ2Jhc2UnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5iYXNlID0gKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpID8gaW5wdXQgOiAnJztcbiAgfVxuICBpZighKCdkb2N1bWVudExvYWRlcicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmxvYWREb2N1bWVudDtcbiAgfVxuICBpZighKCdlbWJlZCcgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmVtYmVkID0gJ0BsYXN0JztcbiAgfVxuICBvcHRpb25zLmV4cGxpY2l0ID0gb3B0aW9ucy5leHBsaWNpdCB8fCBmYWxzZTtcbiAgaWYoISgncmVxdWlyZUFsbCcgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLnJlcXVpcmVBbGwgPSB0cnVlO1xuICB9XG4gIG9wdGlvbnMub21pdERlZmF1bHQgPSBvcHRpb25zLm9taXREZWZhdWx0IHx8IGZhbHNlO1xuXG4gIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAvLyBpZiBmcmFtZSBpcyBhIHN0cmluZywgYXR0ZW1wdCB0byBkZXJlZmVyZW5jZSByZW1vdGUgZG9jdW1lbnRcbiAgICBpZih0eXBlb2YgZnJhbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIgZG9uZSA9IGZ1bmN0aW9uKGVyciwgcmVtb3RlRG9jKSB7XG4gICAgICAgIGlmKGVycikge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYoIXJlbW90ZURvYy5kb2N1bWVudCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgICAnTm8gcmVtb3RlIGRvY3VtZW50IGZvdW5kIGF0IHRoZSBnaXZlbiBVUkwuJyxcbiAgICAgICAgICAgICAgJ2pzb25sZC5OdWxsUmVtb3RlRG9jdW1lbnQnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYodHlwZW9mIHJlbW90ZURvYy5kb2N1bWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJlbW90ZURvYy5kb2N1bWVudCA9IEpTT04ucGFyc2UocmVtb3RlRG9jLmRvY3VtZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgJ0NvdWxkIG5vdCByZXRyaWV2ZSBhIEpTT04tTEQgZG9jdW1lbnQgZnJvbSB0aGUgVVJMLiBVUkwgJyArXG4gICAgICAgICAgICAnZGVyZWZlcmVuY2luZyBub3QgaW1wbGVtZW50ZWQuJywgJ2pzb25sZC5Mb2FkRG9jdW1lbnRFcnJvcicsIHtcbiAgICAgICAgICAgICAgY29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJyxcbiAgICAgICAgICAgICAgY2F1c2U6IGV4LFxuICAgICAgICAgICAgICByZW1vdGVEb2M6IHJlbW90ZURvY1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICBkb0ZyYW1lKHJlbW90ZURvYyk7XG4gICAgICB9O1xuICAgICAgdmFyIHByb21pc2UgPSBvcHRpb25zLmRvY3VtZW50TG9hZGVyKGZyYW1lLCBkb25lKTtcbiAgICAgIGlmKHByb21pc2UgJiYgJ3RoZW4nIGluIHByb21pc2UpIHtcbiAgICAgICAgcHJvbWlzZS50aGVuKGRvbmUuYmluZChudWxsLCBudWxsKSwgZG9uZSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIG5vdGhpbmcgdG8gbG9hZFxuICAgIGRvRnJhbWUoe2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiBudWxsLCBkb2N1bWVudDogZnJhbWV9KTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gZG9GcmFtZShyZW1vdGVGcmFtZSkge1xuICAgIC8vIHByZXNlcnZlIGZyYW1lIGNvbnRleHQgYW5kIGFkZCBhbnkgTGluayBoZWFkZXIgY29udGV4dFxuICAgIHZhciBmcmFtZSA9IHJlbW90ZUZyYW1lLmRvY3VtZW50O1xuICAgIHZhciBjdHg7XG4gICAgaWYoZnJhbWUpIHtcbiAgICAgIGN0eCA9IGZyYW1lWydAY29udGV4dCddO1xuICAgICAgaWYocmVtb3RlRnJhbWUuY29udGV4dFVybCkge1xuICAgICAgICBpZighY3R4KSB7XG4gICAgICAgICAgY3R4ID0gcmVtb3RlRnJhbWUuY29udGV4dFVybDtcbiAgICAgICAgfSBlbHNlIGlmKF9pc0FycmF5KGN0eCkpIHtcbiAgICAgICAgICBjdHgucHVzaChyZW1vdGVGcmFtZS5jb250ZXh0VXJsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjdHggPSBbY3R4LCByZW1vdGVGcmFtZS5jb250ZXh0VXJsXTtcbiAgICAgICAgfVxuICAgICAgICBmcmFtZVsnQGNvbnRleHQnXSA9IGN0eDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN0eCA9IGN0eCB8fCB7fTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY3R4ID0ge307XG4gICAgfVxuXG4gICAgLy8gZXhwYW5kIGlucHV0XG4gICAganNvbmxkLmV4cGFuZChpbnB1dCwgb3B0aW9ucywgZnVuY3Rpb24oZXJyLCBleHBhbmRlZCkge1xuICAgICAgaWYoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0NvdWxkIG5vdCBleHBhbmQgaW5wdXQgYmVmb3JlIGZyYW1pbmcuJyxcbiAgICAgICAgICAnanNvbmxkLkZyYW1lRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICAgIH1cblxuICAgICAgLy8gZXhwYW5kIGZyYW1lXG4gICAgICB2YXIgb3B0cyA9IF9jbG9uZShvcHRpb25zKTtcbiAgICAgIG9wdHMuaXNGcmFtZSA9IHRydWU7XG4gICAgICBvcHRzLmtlZXBGcmVlRmxvYXRpbmdOb2RlcyA9IHRydWU7XG4gICAgICBqc29ubGQuZXhwYW5kKGZyYW1lLCBvcHRzLCBmdW5jdGlvbihlcnIsIGV4cGFuZGVkRnJhbWUpIHtcbiAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICdDb3VsZCBub3QgZXhwYW5kIGZyYW1lIGJlZm9yZSBmcmFtaW5nLicsXG4gICAgICAgICAgICAnanNvbmxkLkZyYW1lRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmcmFtZWQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gZG8gZnJhbWluZ1xuICAgICAgICAgIGZyYW1lZCA9IG5ldyBQcm9jZXNzb3IoKS5mcmFtZShleHBhbmRlZCwgZXhwYW5kZWRGcmFtZSwgb3B0cyk7XG4gICAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY29tcGFjdCByZXN1bHQgKGZvcmNlIEBncmFwaCBvcHRpb24gdG8gdHJ1ZSwgc2tpcCBleHBhbnNpb24sXG4gICAgICAgIC8vIGNoZWNrIGZvciBsaW5rZWQgZW1iZWRzKVxuICAgICAgICBvcHRzLmdyYXBoID0gdHJ1ZTtcbiAgICAgICAgb3B0cy5za2lwRXhwYW5zaW9uID0gdHJ1ZTtcbiAgICAgICAgb3B0cy5saW5rID0ge307XG4gICAgICAgIGpzb25sZC5jb21wYWN0KGZyYW1lZCwgY3R4LCBvcHRzLCBmdW5jdGlvbihlcnIsIGNvbXBhY3RlZCwgY3R4KSB7XG4gICAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgICAnQ291bGQgbm90IGNvbXBhY3QgZnJhbWVkIG91dHB1dC4nLFxuICAgICAgICAgICAgICAnanNvbmxkLkZyYW1lRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gZ2V0IGdyYXBoIGFsaWFzXG4gICAgICAgICAgdmFyIGdyYXBoID0gX2NvbXBhY3RJcmkoY3R4LCAnQGdyYXBoJyk7XG4gICAgICAgICAgLy8gcmVtb3ZlIEBwcmVzZXJ2ZSBmcm9tIHJlc3VsdHNcbiAgICAgICAgICBvcHRzLmxpbmsgPSB7fTtcbiAgICAgICAgICBjb21wYWN0ZWRbZ3JhcGhdID0gX3JlbW92ZVByZXNlcnZlKGN0eCwgY29tcGFjdGVkW2dyYXBoXSwgb3B0cyk7XG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgY29tcGFjdGVkKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufTtcblxuLyoqXG4gKiAqKkV4cGVyaW1lbnRhbCoqXG4gKlxuICogTGlua3MgYSBKU09OLUxEIGRvY3VtZW50J3Mgbm9kZXMgaW4gbWVtb3J5LlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBkb2N1bWVudCB0byBsaW5rLlxuICogQHBhcmFtIGN0eCB0aGUgSlNPTi1MRCBjb250ZXh0IHRvIGFwcGx5LlxuICogQHBhcmFtIFtvcHRpb25zXSB0aGUgb3B0aW9ucyB0byB1c2U6XG4gKiAgICAgICAgICBbYmFzZV0gdGhlIGJhc2UgSVJJIHRvIHVzZS5cbiAqICAgICAgICAgIFtleHBhbmRDb250ZXh0XSBhIGNvbnRleHQgdG8gZXhwYW5kIHdpdGguXG4gKiAgICAgICAgICBbZG9jdW1lbnRMb2FkZXIodXJsLCBjYWxsYmFjayhlcnIsIHJlbW90ZURvYykpXSB0aGUgZG9jdW1lbnQgbG9hZGVyLlxuICogQHBhcmFtIGNhbGxiYWNrKGVyciwgbGlua2VkKSBjYWxsZWQgb25jZSB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAqL1xuanNvbmxkLmxpbmsgPSBmdW5jdGlvbihpbnB1dCwgY3R4LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAvLyBBUEkgbWF0Y2hlcyBydW5uaW5nIGZyYW1lIHdpdGggYSB3aWxkY2FyZCBmcmFtZSBhbmQgZW1iZWQ6ICdAbGluaydcbiAgLy8gZ2V0IGFyZ3VtZW50c1xuICB2YXIgZnJhbWUgPSB7fTtcbiAgaWYoY3R4KSB7XG4gICAgZnJhbWVbJ0Bjb250ZXh0J10gPSBjdHg7XG4gIH1cbiAgZnJhbWVbJ0BlbWJlZCddID0gJ0BsaW5rJztcbiAganNvbmxkLmZyYW1lKGlucHV0LCBmcmFtZSwgb3B0aW9ucywgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiAqKkRlcHJlY2F0ZWQqKlxuICpcbiAqIFBlcmZvcm1zIEpTT04tTEQgb2JqZWN0aWZpY2F0aW9uLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBkb2N1bWVudCB0byBvYmplY3RpZnkuXG4gKiBAcGFyYW0gY3R4IHRoZSBKU09OLUxEIGNvbnRleHQgdG8gYXBwbHkuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtiYXNlXSB0aGUgYmFzZSBJUkkgdG8gdXNlLlxuICogICAgICAgICAgW2V4cGFuZENvbnRleHRdIGEgY29udGV4dCB0byBleHBhbmQgd2l0aC5cbiAqICAgICAgICAgIFtkb2N1bWVudExvYWRlcih1cmwsIGNhbGxiYWNrKGVyciwgcmVtb3RlRG9jKSldIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBsaW5rZWQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5qc29ubGQub2JqZWN0aWZ5ID0gZnVuY3Rpb24oaW5wdXQsIGN0eCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYoISgnYmFzZScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmJhc2UgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykgPyBpbnB1dCA6ICcnO1xuICB9XG4gIGlmKCEoJ2RvY3VtZW50TG9hZGVyJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZG9jdW1lbnRMb2FkZXIgPSBqc29ubGQubG9hZERvY3VtZW50O1xuICB9XG5cbiAgLy8gZXhwYW5kIGlucHV0XG4gIGpzb25sZC5leHBhbmQoaW5wdXQsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgX2lucHV0KSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnQ291bGQgbm90IGV4cGFuZCBpbnB1dCBiZWZvcmUgbGlua2luZy4nLFxuICAgICAgICAnanNvbmxkLkxpbmtFcnJvcicsIHtjYXVzZTogZXJyfSkpO1xuICAgIH1cblxuICAgIHZhciBmbGF0dGVuZWQ7XG4gICAgdHJ5IHtcbiAgICAgIC8vIGZsYXR0ZW4gdGhlIGdyYXBoXG4gICAgICBmbGF0dGVuZWQgPSBuZXcgUHJvY2Vzc29yKCkuZmxhdHRlbihfaW5wdXQpO1xuICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhleCk7XG4gICAgfVxuXG4gICAgLy8gY29tcGFjdCByZXN1bHQgKGZvcmNlIEBncmFwaCBvcHRpb24gdG8gdHJ1ZSwgc2tpcCBleHBhbnNpb24pXG4gICAgb3B0aW9ucy5ncmFwaCA9IHRydWU7XG4gICAgb3B0aW9ucy5za2lwRXhwYW5zaW9uID0gdHJ1ZTtcbiAgICBqc29ubGQuY29tcGFjdChmbGF0dGVuZWQsIGN0eCwgb3B0aW9ucywgZnVuY3Rpb24oZXJyLCBjb21wYWN0ZWQsIGN0eCkge1xuICAgICAgaWYoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0NvdWxkIG5vdCBjb21wYWN0IGZsYXR0ZW5lZCBvdXRwdXQgYmVmb3JlIGxpbmtpbmcuJyxcbiAgICAgICAgICAnanNvbmxkLkxpbmtFcnJvcicsIHtjYXVzZTogZXJyfSkpO1xuICAgICAgfVxuICAgICAgLy8gZ2V0IGdyYXBoIGFsaWFzXG4gICAgICB2YXIgZ3JhcGggPSBfY29tcGFjdElyaShjdHgsICdAZ3JhcGgnKTtcbiAgICAgIHZhciB0b3AgPSBjb21wYWN0ZWRbZ3JhcGhdWzBdO1xuXG4gICAgICB2YXIgcmVjdXJzZSA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgICAgICAgLy8gY2FuJ3QgcmVwbGFjZSBqdXN0IGEgc3RyaW5nXG4gICAgICAgIGlmKCFfaXNPYmplY3Qoc3ViamVjdCkgJiYgIV9pc0FycmF5KHN1YmplY3QpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYm90dG9tIG91dCByZWN1cnNpb24gb24gcmUtdmlzaXRcbiAgICAgICAgaWYoX2lzT2JqZWN0KHN1YmplY3QpKSB7XG4gICAgICAgICAgaWYocmVjdXJzZS52aXNpdGVkW3N1YmplY3RbJ0BpZCddXSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWN1cnNlLnZpc2l0ZWRbc3ViamVjdFsnQGlkJ11dID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVhY2ggYXJyYXkgZWxlbWVudCAqb3IqIG9iamVjdCBrZXlcbiAgICAgICAgZm9yKHZhciBrIGluIHN1YmplY3QpIHtcbiAgICAgICAgICB2YXIgb2JqID0gc3ViamVjdFtrXTtcbiAgICAgICAgICB2YXIgaXNpZCA9IChqc29ubGQuZ2V0Q29udGV4dFZhbHVlKGN0eCwgaywgJ0B0eXBlJykgPT09ICdAaWQnKTtcblxuICAgICAgICAgIC8vIGNhbid0IHJlcGxhY2UgYSBub24tb2JqZWN0IG9yIG5vbi1hcnJheSB1bmxlc3MgaXQncyBhbiBAaWRcbiAgICAgICAgICBpZighX2lzQXJyYXkob2JqKSAmJiAhX2lzT2JqZWN0KG9iaikgJiYgIWlzaWQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmKF9pc1N0cmluZyhvYmopICYmIGlzaWQpIHtcbiAgICAgICAgICAgIHN1YmplY3Rba10gPSBvYmogPSB0b3Bbb2JqXTtcbiAgICAgICAgICAgIHJlY3Vyc2Uob2JqKTtcbiAgICAgICAgICB9IGVsc2UgaWYoX2lzQXJyYXkob2JqKSkge1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICBpZihfaXNTdHJpbmcob2JqW2ldKSAmJiBpc2lkKSB7XG4gICAgICAgICAgICAgICAgb2JqW2ldID0gdG9wW29ialtpXV07XG4gICAgICAgICAgICAgIH0gZWxzZSBpZihfaXNPYmplY3Qob2JqW2ldKSAmJiAnQGlkJyBpbiBvYmpbaV0pIHtcbiAgICAgICAgICAgICAgICBvYmpbaV0gPSB0b3Bbb2JqW2ldWydAaWQnXV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVjdXJzZShvYmpbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZihfaXNPYmplY3Qob2JqKSkge1xuICAgICAgICAgICAgdmFyIHNpZCA9IG9ialsnQGlkJ107XG4gICAgICAgICAgICBzdWJqZWN0W2tdID0gb2JqID0gdG9wW3NpZF07XG4gICAgICAgICAgICByZWN1cnNlKG9iaik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcmVjdXJzZS52aXNpdGVkID0ge307XG4gICAgICByZWN1cnNlKHRvcCk7XG5cbiAgICAgIGNvbXBhY3RlZC5vZl90eXBlID0ge307XG4gICAgICBmb3IodmFyIHMgaW4gdG9wKSB7XG4gICAgICAgIGlmKCEoJ0B0eXBlJyBpbiB0b3Bbc10pKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHR5cGVzID0gdG9wW3NdWydAdHlwZSddO1xuICAgICAgICBpZighX2lzQXJyYXkodHlwZXMpKSB7XG4gICAgICAgICAgdHlwZXMgPSBbdHlwZXNdO1xuICAgICAgICB9XG4gICAgICAgIGZvcih2YXIgdCBpbiB0eXBlcykge1xuICAgICAgICAgIGlmKCEodHlwZXNbdF0gaW4gY29tcGFjdGVkLm9mX3R5cGUpKSB7XG4gICAgICAgICAgICBjb21wYWN0ZWQub2ZfdHlwZVt0eXBlc1t0XV0gPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29tcGFjdGVkLm9mX3R5cGVbdHlwZXNbdF1dLnB1c2godG9wW3NdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2FsbGJhY2sobnVsbCwgY29tcGFjdGVkKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIFJERiBkYXRhc2V0IG5vcm1hbGl6YXRpb24gb24gdGhlIGdpdmVuIEpTT04tTEQgaW5wdXQuIFRoZSBvdXRwdXRcbiAqIGlzIGFuIFJERiBkYXRhc2V0IHVubGVzcyB0aGUgJ2Zvcm1hdCcgb3B0aW9uIGlzIHVzZWQuXG4gKlxuICogQHBhcmFtIGlucHV0IHRoZSBKU09OLUxEIGlucHV0IHRvIG5vcm1hbGl6ZS5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2Jhc2VdIHRoZSBiYXNlIElSSSB0byB1c2UuXG4gKiAgICAgICAgICBbZXhwYW5kQ29udGV4dF0gYSBjb250ZXh0IHRvIGV4cGFuZCB3aXRoLlxuICogICAgICAgICAgW2Zvcm1hdF0gdGhlIGZvcm1hdCBpZiBvdXRwdXQgaXMgYSBzdHJpbmc6XG4gKiAgICAgICAgICAgICdhcHBsaWNhdGlvbi9ucXVhZHMnIGZvciBOLVF1YWRzLlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIG5vcm1hbGl6ZWQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5qc29ubGQubm9ybWFsaXplID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7XG4gICAgcmV0dXJuIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBub3JtYWxpemUsIHRvbyBmZXcgYXJndW1lbnRzLicpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGdldCBhcmd1bWVudHNcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYoISgnYmFzZScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmJhc2UgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykgPyBpbnB1dCA6ICcnO1xuICB9XG4gIGlmKCEoJ2RvY3VtZW50TG9hZGVyJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZG9jdW1lbnRMb2FkZXIgPSBqc29ubGQubG9hZERvY3VtZW50O1xuICB9XG5cbiAgLy8gY29udmVydCB0byBSREYgZGF0YXNldCB0aGVuIGRvIG5vcm1hbGl6YXRpb25cbiAgdmFyIG9wdHMgPSBfY2xvbmUob3B0aW9ucyk7XG4gIGRlbGV0ZSBvcHRzLmZvcm1hdDtcbiAgb3B0cy5wcm9kdWNlR2VuZXJhbGl6ZWRSZGYgPSBmYWxzZTtcbiAganNvbmxkLnRvUkRGKGlucHV0LCBvcHRzLCBmdW5jdGlvbihlcnIsIGRhdGFzZXQpIHtcbiAgICBpZihlcnIpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdDb3VsZCBub3QgY29udmVydCBpbnB1dCB0byBSREYgZGF0YXNldCBiZWZvcmUgbm9ybWFsaXphdGlvbi4nLFxuICAgICAgICAnanNvbmxkLk5vcm1hbGl6ZUVycm9yJywge2NhdXNlOiBlcnJ9KSk7XG4gICAgfVxuXG4gICAgLy8gZG8gbm9ybWFsaXphdGlvblxuICAgIG5ldyBQcm9jZXNzb3IoKS5ub3JtYWxpemUoZGF0YXNldCwgb3B0aW9ucywgY2FsbGJhY2spO1xuICB9KTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYW4gUkRGIGRhdGFzZXQgdG8gSlNPTi1MRC5cbiAqXG4gKiBAcGFyYW0gZGF0YXNldCBhIHNlcmlhbGl6ZWQgc3RyaW5nIG9mIFJERiBpbiBhIGZvcm1hdCBzcGVjaWZpZWQgYnkgdGhlXG4gKiAgICAgICAgICBmb3JtYXQgb3B0aW9uIG9yIGFuIFJERiBkYXRhc2V0IHRvIGNvbnZlcnQuXG4gKiBAcGFyYW0gW29wdGlvbnNdIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIFtmb3JtYXRdIHRoZSBmb3JtYXQgaWYgZGF0YXNldCBwYXJhbSBtdXN0IGZpcnN0IGJlIHBhcnNlZDpcbiAqICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL25xdWFkcycgZm9yIE4tUXVhZHMgKGRlZmF1bHQpLlxuICogICAgICAgICAgW3JkZlBhcnNlcl0gYSBjdXN0b20gUkRGLXBhcnNlciB0byB1c2UgdG8gcGFyc2UgdGhlIGRhdGFzZXQuXG4gKiAgICAgICAgICBbdXNlUmRmVHlwZV0gdHJ1ZSB0byB1c2UgcmRmOnR5cGUsIGZhbHNlIHRvIHVzZSBAdHlwZVxuICogICAgICAgICAgICAoZGVmYXVsdDogZmFsc2UpLlxuICogICAgICAgICAgW3VzZU5hdGl2ZVR5cGVzXSB0cnVlIHRvIGNvbnZlcnQgWFNEIHR5cGVzIGludG8gbmF0aXZlIHR5cGVzXG4gKiAgICAgICAgICAgIChib29sZWFuLCBpbnRlZ2VyLCBkb3VibGUpLCBmYWxzZSBub3QgdG8gKGRlZmF1bHQ6IGZhbHNlKS5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIG91dHB1dCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmpzb25sZC5mcm9tUkRGID0gZnVuY3Rpb24oZGF0YXNldCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDEpIHtcbiAgICByZXR1cm4ganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobmV3IFR5cGVFcnJvcignQ291bGQgbm90IGNvbnZlcnQgZnJvbSBSREYsIHRvbyBmZXcgYXJndW1lbnRzLicpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGdldCBhcmd1bWVudHNcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYoISgndXNlUmRmVHlwZScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLnVzZVJkZlR5cGUgPSBmYWxzZTtcbiAgfVxuICBpZighKCd1c2VOYXRpdmVUeXBlcycgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLnVzZU5hdGl2ZVR5cGVzID0gZmFsc2U7XG4gIH1cblxuICBpZighKCdmb3JtYXQnIGluIG9wdGlvbnMpICYmIF9pc1N0cmluZyhkYXRhc2V0KSkge1xuICAgIC8vIHNldCBkZWZhdWx0IGZvcm1hdCB0byBucXVhZHNcbiAgICBpZighKCdmb3JtYXQnIGluIG9wdGlvbnMpKSB7XG4gICAgICBvcHRpb25zLmZvcm1hdCA9ICdhcHBsaWNhdGlvbi9ucXVhZHMnO1xuICAgIH1cbiAgfVxuXG4gIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAvLyBoYW5kbGUgc3BlY2lhbCBmb3JtYXRcbiAgICB2YXIgcmRmUGFyc2VyO1xuICAgIGlmKG9wdGlvbnMuZm9ybWF0KSB7XG4gICAgICAvLyBjaGVjayBzdXBwb3J0ZWQgZm9ybWF0c1xuICAgICAgcmRmUGFyc2VyID0gb3B0aW9ucy5yZGZQYXJzZXIgfHwgX3JkZlBhcnNlcnNbb3B0aW9ucy5mb3JtYXRdO1xuICAgICAgaWYoIXJkZlBhcnNlcikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdVbmtub3duIGlucHV0IGZvcm1hdC4nLFxuICAgICAgICAgICdqc29ubGQuVW5rbm93bkZvcm1hdCcsIHtmb3JtYXQ6IG9wdGlvbnMuZm9ybWF0fSkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBuby1vcCBwYXJzZXIsIGFzc3VtZSBkYXRhc2V0IGFscmVhZHkgcGFyc2VkXG4gICAgICByZGZQYXJzZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRhdGFzZXQ7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHZhciBjYWxsYmFja0NhbGxlZCA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICAvLyByZGYgcGFyc2VyIG1heSBiZSBhc3luYyBvciBzeW5jLCBhbHdheXMgcGFzcyBjYWxsYmFja1xuICAgICAgZGF0YXNldCA9IHJkZlBhcnNlcihkYXRhc2V0LCBmdW5jdGlvbihlcnIsIGRhdGFzZXQpIHtcbiAgICAgICAgY2FsbGJhY2tDYWxsZWQgPSB0cnVlO1xuICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBmcm9tUkRGKGRhdGFzZXQsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgaWYoIWNhbGxiYWNrQ2FsbGVkKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICAgIC8vIGhhbmRsZSBzeW5jaHJvbm91cyBvciBwcm9taXNlLWJhc2VkIHBhcnNlclxuICAgIGlmKGRhdGFzZXQpIHtcbiAgICAgIC8vIGlmIGRhdGFzZXQgaXMgYWN0dWFsbHkgYSBwcm9taXNlXG4gICAgICBpZigndGhlbicgaW4gZGF0YXNldCkge1xuICAgICAgICByZXR1cm4gZGF0YXNldC50aGVuKGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICBmcm9tUkRGKGRhdGFzZXQsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgLy8gcGFyc2VyIGlzIHN5bmNocm9ub3VzXG4gICAgICBmcm9tUkRGKGRhdGFzZXQsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmcm9tUkRGKGRhdGFzZXQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAvLyBjb252ZXJ0IGZyb20gUkRGXG4gICAgICBuZXcgUHJvY2Vzc29yKCkuZnJvbVJERihkYXRhc2V0LCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8qKlxuICogT3V0cHV0cyB0aGUgUkRGIGRhdGFzZXQgZm91bmQgaW4gdGhlIGdpdmVuIEpTT04tTEQgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBpbnB1dC5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2Jhc2VdIHRoZSBiYXNlIElSSSB0byB1c2UuXG4gKiAgICAgICAgICBbZXhwYW5kQ29udGV4dF0gYSBjb250ZXh0IHRvIGV4cGFuZCB3aXRoLlxuICogICAgICAgICAgW2Zvcm1hdF0gdGhlIGZvcm1hdCB0byB1c2UgdG8gb3V0cHV0IGEgc3RyaW5nOlxuICogICAgICAgICAgICAnYXBwbGljYXRpb24vbnF1YWRzJyBmb3IgTi1RdWFkcy5cbiAqICAgICAgICAgIFtwcm9kdWNlR2VuZXJhbGl6ZWRSZGZdIHRydWUgdG8gb3V0cHV0IGdlbmVyYWxpemVkIFJERiwgZmFsc2VcbiAqICAgICAgICAgICAgdG8gcHJvZHVjZSBvbmx5IHN0YW5kYXJkIFJERiAoZGVmYXVsdDogZmFsc2UpLlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIGRhdGFzZXQpIGNhbGxlZCBvbmNlIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICovXG5qc29ubGQudG9SREYgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDEpIHtcbiAgICByZXR1cm4ganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobmV3IFR5cGVFcnJvcignQ291bGQgbm90IGNvbnZlcnQgdG8gUkRGLCB0b28gZmV3IGFyZ3VtZW50cy4nKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBnZXQgYXJndW1lbnRzXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmKCEoJ2Jhc2UnIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5iYXNlID0gKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpID8gaW5wdXQgOiAnJztcbiAgfVxuICBpZighKCdkb2N1bWVudExvYWRlcicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmxvYWREb2N1bWVudDtcbiAgfVxuXG4gIC8vIGV4cGFuZCBpbnB1dFxuICBqc29ubGQuZXhwYW5kKGlucHV0LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIGV4cGFuZGVkKSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnQ291bGQgbm90IGV4cGFuZCBpbnB1dCBiZWZvcmUgc2VyaWFsaXphdGlvbiB0byBSREYuJyxcbiAgICAgICAgJ2pzb25sZC5SZGZFcnJvcicsIHtjYXVzZTogZXJyfSkpO1xuICAgIH1cblxuICAgIHZhciBkYXRhc2V0O1xuICAgIHRyeSB7XG4gICAgICAvLyBvdXRwdXQgUkRGIGRhdGFzZXRcbiAgICAgIGRhdGFzZXQgPSBQcm9jZXNzb3IucHJvdG90eXBlLnRvUkRGKGV4cGFuZGVkLCBvcHRpb25zKTtcbiAgICAgIGlmKG9wdGlvbnMuZm9ybWF0KSB7XG4gICAgICAgIGlmKG9wdGlvbnMuZm9ybWF0ID09PSAnYXBwbGljYXRpb24vbnF1YWRzJykge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBfdG9OUXVhZHMoZGF0YXNldCkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnVW5rbm93biBvdXRwdXQgZm9ybWF0LicsXG4gICAgICAgICAgJ2pzb25sZC5Vbmtub3duRm9ybWF0Jywge2Zvcm1hdDogb3B0aW9ucy5mb3JtYXR9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoKGV4KSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZXgpO1xuICAgIH1cbiAgICBjYWxsYmFjayhudWxsLCBkYXRhc2V0KTtcbiAgfSk7XG59O1xuXG4vKipcbiAqICoqRXhwZXJpbWVudGFsKipcbiAqXG4gKiBSZWN1cnNpdmVseSBmbGF0dGVucyB0aGUgbm9kZXMgaW4gdGhlIGdpdmVuIEpTT04tTEQgaW5wdXQgaW50byBhIG1hcCBvZlxuICogbm9kZSBJRCA9PiBub2RlLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBpbnB1dC5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2Jhc2VdIHRoZSBiYXNlIElSSSB0byB1c2UuXG4gKiAgICAgICAgICBbZXhwYW5kQ29udGV4dF0gYSBjb250ZXh0IHRvIGV4cGFuZCB3aXRoLlxuICogICAgICAgICAgW25hbWVyXSBhIGpzb25sZC5VbmlxdWVOYW1lciB0byB1c2UgdG8gbGFiZWwgYmxhbmsgbm9kZXMuXG4gKiAgICAgICAgICBbZG9jdW1lbnRMb2FkZXIodXJsLCBjYWxsYmFjayhlcnIsIHJlbW90ZURvYykpXSB0aGUgZG9jdW1lbnQgbG9hZGVyLlxuICogQHBhcmFtIGNhbGxiYWNrKGVyciwgbm9kZU1hcCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmpzb25sZC5jcmVhdGVOb2RlTWFwID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7XG4gICAgcmV0dXJuIGpzb25sZC5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBjcmVhdGUgbm9kZSBtYXAsIHRvbyBmZXcgYXJndW1lbnRzLicpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGdldCBhcmd1bWVudHNcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYoISgnYmFzZScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmJhc2UgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykgPyBpbnB1dCA6ICcnO1xuICB9XG4gIGlmKCEoJ2RvY3VtZW50TG9hZGVyJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZG9jdW1lbnRMb2FkZXIgPSBqc29ubGQubG9hZERvY3VtZW50O1xuICB9XG5cbiAgLy8gZXhwYW5kIGlucHV0XG4gIGpzb25sZC5leHBhbmQoaW5wdXQsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgX2lucHV0KSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnQ291bGQgbm90IGV4cGFuZCBpbnB1dCBiZWZvcmUgY3JlYXRpbmcgbm9kZSBtYXAuJyxcbiAgICAgICAgJ2pzb25sZC5DcmVhdGVOb2RlTWFwRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICB9XG5cbiAgICB2YXIgbm9kZU1hcDtcbiAgICB0cnkge1xuICAgICAgbm9kZU1hcCA9IG5ldyBQcm9jZXNzb3IoKS5jcmVhdGVOb2RlTWFwKF9pbnB1dCwgb3B0aW9ucyk7XG4gICAgfSBjYXRjaChleCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGV4KTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhudWxsLCBub2RlTWFwKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqICoqRXhwZXJpbWVudGFsKipcbiAqXG4gKiBNZXJnZXMgdHdvIG9yIG1vcmUgSlNPTi1MRCBkb2N1bWVudHMgaW50byBhIHNpbmdsZSBmbGF0dGVuZWQgZG9jdW1lbnQuXG4gKlxuICogQHBhcmFtIGRvY3MgdGhlIEpTT04tTEQgZG9jdW1lbnRzIHRvIG1lcmdlIHRvZ2V0aGVyLlxuICogQHBhcmFtIGN0eCB0aGUgY29udGV4dCB0byB1c2UgdG8gY29tcGFjdCB0aGUgbWVyZ2VkIHJlc3VsdCwgb3IgbnVsbC5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2Jhc2VdIHRoZSBiYXNlIElSSSB0byB1c2UuXG4gKiAgICAgICAgICBbZXhwYW5kQ29udGV4dF0gYSBjb250ZXh0IHRvIGV4cGFuZCB3aXRoLlxuICogICAgICAgICAgW25hbWVyXSBhIGpzb25sZC5VbmlxdWVOYW1lciB0byB1c2UgdG8gbGFiZWwgYmxhbmsgbm9kZXMuXG4gKiAgICAgICAgICBbbWVyZ2VOb2Rlc10gdHJ1ZSB0byBtZXJnZSBwcm9wZXJ0aWVzIGZvciBub2RlcyB3aXRoIHRoZSBzYW1lIElELFxuICogICAgICAgICAgICBmYWxzZSB0byBpZ25vcmUgbmV3IHByb3BlcnRpZXMgZm9yIG5vZGVzIHdpdGggdGhlIHNhbWUgSUQgb25jZVxuICogICAgICAgICAgICB0aGUgSUQgaGFzIGJlZW4gZGVmaW5lZDsgbm90ZSB0aGF0IHRoaXMgbWF5IG5vdCBwcmV2ZW50IG1lcmdpbmdcbiAqICAgICAgICAgICAgbmV3IHByb3BlcnRpZXMgd2hlcmUgYSBub2RlIGlzIGluIHRoZSBgb2JqZWN0YCBwb3NpdGlvblxuICogICAgICAgICAgICAoZGVmYXVsdDogdHJ1ZSkuXG4gKiAgICAgICAgICBbZG9jdW1lbnRMb2FkZXIodXJsLCBjYWxsYmFjayhlcnIsIHJlbW90ZURvYykpXSB0aGUgZG9jdW1lbnQgbG9hZGVyLlxuICogQHBhcmFtIGNhbGxiYWNrKGVyciwgbWVyZ2VkKSBjYWxsZWQgb25jZSB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAqL1xuanNvbmxkLm1lcmdlID0gZnVuY3Rpb24oZG9jcywgY3R4LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMSkge1xuICAgIHJldHVybiBqc29ubGQubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayhuZXcgVHlwZUVycm9yKCdDb3VsZCBub3QgbWVyZ2UsIHRvbyBmZXcgYXJndW1lbnRzLicpKTtcbiAgICB9KTtcbiAgfVxuICBpZighX2lzQXJyYXkoZG9jcykpIHtcbiAgICByZXR1cm4ganNvbmxkLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobmV3IFR5cGVFcnJvcignQ291bGQgbm90IG1lcmdlLCBcImRvY3NcIiBtdXN0IGJlIGFuIGFycmF5LicpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGdldCBhcmd1bWVudHNcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9IGVsc2UgaWYodHlwZW9mIGN0eCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gY3R4O1xuICAgIGN0eCA9IG51bGw7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIGV4cGFuZCBhbGwgZG9jdW1lbnRzXG4gIHZhciBleHBhbmRlZCA9IFtdO1xuICB2YXIgZXJyb3IgPSBudWxsO1xuICB2YXIgY291bnQgPSBkb2NzLmxlbmd0aDtcbiAgZm9yKHZhciBpID0gMDsgaSA8IGRvY3MubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgb3B0cyA9IHt9O1xuICAgIGZvcih2YXIga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgIG9wdHNba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgICB9XG4gICAganNvbmxkLmV4cGFuZChkb2NzW2ldLCBvcHRzLCBleHBhbmRDb21wbGV0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBleHBhbmRDb21wbGV0ZShlcnIsIF9pbnB1dCkge1xuICAgIGlmKGVycm9yKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKGVycikge1xuICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnQ291bGQgbm90IGV4cGFuZCBpbnB1dCBiZWZvcmUgZmxhdHRlbmluZy4nLFxuICAgICAgICAnanNvbmxkLkZsYXR0ZW5FcnJvcicsIHtjYXVzZTogZXJyfSkpO1xuICAgIH1cbiAgICBleHBhbmRlZC5wdXNoKF9pbnB1dCk7XG4gICAgaWYoLS1jb3VudCA9PT0gMCkge1xuICAgICAgbWVyZ2UoZXhwYW5kZWQpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1lcmdlKGV4cGFuZGVkKSB7XG4gICAgdmFyIG1lcmdlTm9kZXMgPSB0cnVlO1xuICAgIGlmKCdtZXJnZU5vZGVzJyBpbiBvcHRpb25zKSB7XG4gICAgICBtZXJnZU5vZGVzID0gb3B0aW9ucy5tZXJnZU5vZGVzO1xuICAgIH1cblxuICAgIHZhciBuYW1lciA9IG9wdGlvbnMubmFtZXIgfHwgbmV3IFVuaXF1ZU5hbWVyKCdfOmInKTtcbiAgICB2YXIgZ3JhcGhzID0geydAZGVmYXVsdCc6IHt9fTtcblxuICAgIHZhciBkZWZhdWx0R3JhcGg7XG4gICAgdHJ5IHtcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBleHBhbmRlZC5sZW5ndGg7ICsraSkge1xuICAgICAgICAvLyB1bmlxdWVseSByZWxhYmVsIGJsYW5rIG5vZGVzXG4gICAgICAgIHZhciBkb2MgPSBleHBhbmRlZFtpXTtcbiAgICAgICAgZG9jID0ganNvbmxkLnJlbGFiZWxCbGFua05vZGVzKGRvYywge1xuICAgICAgICAgIG5hbWVyOiBuZXcgVW5pcXVlTmFtZXIoJ186YicgKyBpICsgJy0nKVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBhZGQgbm9kZXMgdG8gdGhlIHNoYXJlZCBub2RlIG1hcCBncmFwaHMgaWYgbWVyZ2luZyBub2RlcywgdG8gYVxuICAgICAgICAvLyBzZXBhcmF0ZSBncmFwaCBzZXQgaWYgbm90XG4gICAgICAgIHZhciBfZ3JhcGhzID0gKG1lcmdlTm9kZXMgfHwgaSA9PT0gMCkgPyBncmFwaHMgOiB7J0BkZWZhdWx0Jzoge319O1xuICAgICAgICBfY3JlYXRlTm9kZU1hcChkb2MsIF9ncmFwaHMsICdAZGVmYXVsdCcsIG5hbWVyKTtcblxuICAgICAgICBpZihfZ3JhcGhzICE9PSBncmFwaHMpIHtcbiAgICAgICAgICAvLyBtZXJnZSBkb2N1bWVudCBncmFwaHMgYnV0IGRvbid0IG1lcmdlIGV4aXN0aW5nIG5vZGVzXG4gICAgICAgICAgZm9yKHZhciBncmFwaE5hbWUgaW4gX2dyYXBocykge1xuICAgICAgICAgICAgdmFyIF9ub2RlTWFwID0gX2dyYXBoc1tncmFwaE5hbWVdO1xuICAgICAgICAgICAgaWYoIShncmFwaE5hbWUgaW4gZ3JhcGhzKSkge1xuICAgICAgICAgICAgICBncmFwaHNbZ3JhcGhOYW1lXSA9IF9ub2RlTWFwO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBub2RlTWFwID0gZ3JhcGhzW2dyYXBoTmFtZV07XG4gICAgICAgICAgICBmb3IodmFyIGtleSBpbiBfbm9kZU1hcCkge1xuICAgICAgICAgICAgICBpZighKGtleSBpbiBub2RlTWFwKSkge1xuICAgICAgICAgICAgICAgIG5vZGVNYXBba2V5XSA9IF9ub2RlTWFwW2tleV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gYWRkIGFsbCBub24tZGVmYXVsdCBncmFwaHMgdG8gZGVmYXVsdCBncmFwaFxuICAgICAgZGVmYXVsdEdyYXBoID0gX21lcmdlTm9kZU1hcHMoZ3JhcGhzKTtcbiAgICB9IGNhdGNoKGV4KSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZXgpO1xuICAgIH1cblxuICAgIC8vIHByb2R1Y2UgZmxhdHRlbmVkIG91dHB1dFxuICAgIHZhciBmbGF0dGVuZWQgPSBbXTtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRlZmF1bHRHcmFwaCkuc29ydCgpO1xuICAgIGZvcih2YXIga2kgPSAwOyBraSA8IGtleXMubGVuZ3RoOyArK2tpKSB7XG4gICAgICB2YXIgbm9kZSA9IGRlZmF1bHRHcmFwaFtrZXlzW2tpXV07XG4gICAgICAvLyBvbmx5IGFkZCBmdWxsIHN1YmplY3RzIHRvIHRvcC1sZXZlbFxuICAgICAgaWYoIV9pc1N1YmplY3RSZWZlcmVuY2Uobm9kZSkpIHtcbiAgICAgICAgZmxhdHRlbmVkLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoY3R4ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZmxhdHRlbmVkKTtcbiAgICB9XG5cbiAgICAvLyBjb21wYWN0IHJlc3VsdCAoZm9yY2UgQGdyYXBoIG9wdGlvbiB0byB0cnVlLCBza2lwIGV4cGFuc2lvbilcbiAgICBvcHRpb25zLmdyYXBoID0gdHJ1ZTtcbiAgICBvcHRpb25zLnNraXBFeHBhbnNpb24gPSB0cnVlO1xuICAgIGpzb25sZC5jb21wYWN0KGZsYXR0ZW5lZCwgY3R4LCBvcHRpb25zLCBmdW5jdGlvbihlcnIsIGNvbXBhY3RlZCkge1xuICAgICAgaWYoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0NvdWxkIG5vdCBjb21wYWN0IG1lcmdlZCBvdXRwdXQuJyxcbiAgICAgICAgICAnanNvbmxkLk1lcmdlRXJyb3InLCB7Y2F1c2U6IGVycn0pKTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIGNvbXBhY3RlZCk7XG4gICAgfSk7XG4gIH1cbn07XG5cbi8qKlxuICogUmVsYWJlbHMgYWxsIGJsYW5rIG5vZGVzIGluIHRoZSBnaXZlbiBKU09OLUxEIGlucHV0LlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBpbnB1dC5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW25hbWVyXSBhIGpzb25sZC5VbmlxdWVOYW1lciB0byB1c2UuXG4gKi9cbmpzb25sZC5yZWxhYmVsQmxhbmtOb2RlcyA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgbmFtZXIgPSBvcHRpb25zLm5hbWVyIHx8IG5ldyBVbmlxdWVOYW1lcignXzpiJyk7XG4gIHJldHVybiBfbGFiZWxCbGFua05vZGVzKG5hbWVyLCBpbnB1dCk7XG59O1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGRvY3VtZW50IGxvYWRlciBmb3IgZXh0ZXJuYWwgZG9jdW1lbnRzLiBJZiB0aGUgZW52aXJvbm1lbnRcbiAqIGlzIG5vZGUuanMsIGEgY2FsbGJhY2stY29udGludWF0aW9uLXN0eWxlIGRvY3VtZW50IGxvYWRlciBpcyB1c2VkOyBvdGhlcndpc2UsXG4gKiBhIHByb21pc2VzLXN0eWxlIGRvY3VtZW50IGxvYWRlciBpcyB1c2VkLlxuICpcbiAqIEBwYXJhbSB1cmwgdGhlIFVSTCB0byBsb2FkLlxuICogQHBhcmFtIGNhbGxiYWNrKGVyciwgcmVtb3RlRG9jKSBjYWxsZWQgb25jZSB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcyxcbiAqICAgICAgICAgIGlmIHVzaW5nIGEgbm9uLXByb21pc2VzIEFQSS5cbiAqXG4gKiBAcmV0dXJuIGEgcHJvbWlzZSwgaWYgdXNpbmcgYSBwcm9taXNlcyBBUEkuXG4gKi9cbmpzb25sZC5kb2N1bWVudExvYWRlciA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spIHtcbiAgdmFyIGVyciA9IG5ldyBKc29uTGRFcnJvcihcbiAgICAnQ291bGQgbm90IHJldHJpZXZlIGEgSlNPTi1MRCBkb2N1bWVudCBmcm9tIHRoZSBVUkwuIFVSTCAnICtcbiAgICAnZGVyZWZlcmVuY2luZyBub3QgaW1wbGVtZW50ZWQuJywgJ2pzb25sZC5Mb2FkRG9jdW1lbnRFcnJvcicsXG4gICAge2NvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCd9KTtcbiAgaWYoX25vZGVqcykge1xuICAgIHJldHVybiBjYWxsYmFjayhlcnIsIHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogdXJsLCBkb2N1bWVudDogbnVsbH0pO1xuICB9XG4gIHJldHVybiBqc29ubGQucHJvbWlzaWZ5KGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2soZXJyKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIERlcHJlY2F0ZWQgZGVmYXVsdCBkb2N1bWVudCBsb2FkZXIuIFVzZSBvciBvdmVycmlkZSBqc29ubGQuZG9jdW1lbnRMb2FkZXJcbiAqIGluc3RlYWQuXG4gKi9cbmpzb25sZC5sb2FkRG9jdW1lbnQgPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKSB7XG4gIHZhciBwcm9taXNlID0ganNvbmxkLmRvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2spO1xuICBpZihwcm9taXNlICYmICd0aGVuJyBpbiBwcm9taXNlKSB7XG4gICAgcHJvbWlzZS50aGVuKGNhbGxiYWNrLmJpbmQobnVsbCwgbnVsbCksIGNhbGxiYWNrKTtcbiAgfVxufTtcblxuLyogUHJvbWlzZXMgQVBJICovXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBwcm9taXNlcyBBUEkgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2FwaV0gYW4gb2JqZWN0IHRvIGF0dGFjaCB0aGUgQVBJIHRvLlxuICogICAgICAgICAgW3ZlcnNpb25dICdqc29uLWxkLTEuMCcgdG8gb3V0cHV0IGEgc3RhbmRhcmQgSlNPTi1MRCAxLjAgcHJvbWlzZXNcbiAqICAgICAgICAgICAgQVBJLCAnanNvbmxkLmpzJyB0byBvdXRwdXQgdGhlIHNhbWUgd2l0aCBhdWdtZW50ZWQgcHJvcHJpZXRhcnlcbiAqICAgICAgICAgICAgbWV0aG9kcyAoZGVmYXVsdDogJ2pzb25sZC5qcycpXG4gKlxuICogQHJldHVybiB0aGUgcHJvbWlzZXMgQVBJIG9iamVjdC5cbiAqL1xuanNvbmxkLnByb21pc2VzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICB2YXIgcHJvbWlzaWZ5ID0ganNvbmxkLnByb21pc2lmeTtcblxuICAvLyBoYW5kbGUgJ2FwaScgb3B0aW9uIGFzIHZlcnNpb24sIHNldCBkZWZhdWx0c1xuICB2YXIgYXBpID0gb3B0aW9ucy5hcGkgfHwge307XG4gIHZhciB2ZXJzaW9uID0gb3B0aW9ucy52ZXJzaW9uIHx8ICdqc29ubGQuanMnO1xuICBpZih0eXBlb2Ygb3B0aW9ucy5hcGkgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYoIW9wdGlvbnMudmVyc2lvbikge1xuICAgICAgdmVyc2lvbiA9IG9wdGlvbnMuYXBpO1xuICAgIH1cbiAgICBhcGkgPSB7fTtcbiAgfVxuXG4gIGFwaS5leHBhbmQgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb3VsZCBub3QgZXhwYW5kLCB0b28gZmV3IGFyZ3VtZW50cy4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2lmeS5hcHBseShudWxsLCBbanNvbmxkLmV4cGFuZF0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICB9O1xuICBhcGkuY29tcGFjdCA9IGZ1bmN0aW9uKGlucHV0LCBjdHgpIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ291bGQgbm90IGNvbXBhY3QsIHRvbyBmZXcgYXJndW1lbnRzLicpO1xuICAgIH1cbiAgICB2YXIgY29tcGFjdCA9IGZ1bmN0aW9uKGlucHV0LCBjdHgsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAvLyBlbnN1cmUgb25seSBvbmUgdmFsdWUgaXMgcmV0dXJuZWQgaW4gY2FsbGJhY2tcbiAgICAgIGpzb25sZC5jb21wYWN0KGlucHV0LCBjdHgsIG9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgY29tcGFjdGVkKSB7XG4gICAgICAgIGNhbGxiYWNrKGVyciwgY29tcGFjdGVkKTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIHByb21pc2lmeS5hcHBseShudWxsLCBbY29tcGFjdF0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICB9O1xuICBhcGkuZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDEpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBmbGF0dGVuLCB0b28gZmV3IGFyZ3VtZW50cy4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2lmeS5hcHBseShcbiAgICAgIG51bGwsIFtqc29ubGQuZmxhdHRlbl0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICB9O1xuICBhcGkuZnJhbWUgPSBmdW5jdGlvbihpbnB1dCwgZnJhbWUpIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ291bGQgbm90IGZyYW1lLCB0b28gZmV3IGFyZ3VtZW50cy4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2lmeS5hcHBseShudWxsLCBbanNvbmxkLmZyYW1lXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gIH07XG4gIGFwaS5mcm9tUkRGID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb3VsZCBub3QgY29udmVydCBmcm9tIFJERiwgdG9vIGZldyBhcmd1bWVudHMuJyk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkoXG4gICAgICBudWxsLCBbanNvbmxkLmZyb21SREZdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgfTtcbiAgYXBpLnRvUkRGID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ291bGQgbm90IGNvbnZlcnQgdG8gUkRGLCB0b28gZmV3IGFyZ3VtZW50cy4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2lmeS5hcHBseShudWxsLCBbanNvbmxkLnRvUkRGXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gIH07XG4gIGFwaS5ub3JtYWxpemUgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb3VsZCBub3Qgbm9ybWFsaXplLCB0b28gZmV3IGFyZ3VtZW50cy4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2lmeS5hcHBseShcbiAgICAgIG51bGwsIFtqc29ubGQubm9ybWFsaXplXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gIH07XG5cbiAgaWYodmVyc2lvbiA9PT0gJ2pzb25sZC5qcycpIHtcbiAgICBhcGkubGluayA9IGZ1bmN0aW9uKGlucHV0LCBjdHgpIHtcbiAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvdWxkIG5vdCBsaW5rLCB0b28gZmV3IGFyZ3VtZW50cy4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9taXNpZnkuYXBwbHkoXG4gICAgICAgIG51bGwsIFtqc29ubGQubGlua10uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgIH07XG4gICAgYXBpLm9iamVjdGlmeSA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICByZXR1cm4gcHJvbWlzaWZ5LmFwcGx5KFxuICAgICAgICBudWxsLCBbanNvbmxkLm9iamVjdGlmeV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgIH07XG4gICAgYXBpLmNyZWF0ZU5vZGVNYXAgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeS5hcHBseShcbiAgICAgICAgbnVsbCwgW2pzb25sZC5jcmVhdGVOb2RlTWFwXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgfTtcbiAgICBhcGkubWVyZ2UgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeS5hcHBseShcbiAgICAgICAgbnVsbCwgW2pzb25sZC5tZXJnZV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgIH07XG4gIH1cblxuICB0cnkge1xuICAgIGpzb25sZC5Qcm9taXNlID0gZ2xvYmFsLlByb21pc2UgfHwgcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xuICB9IGNhdGNoKGUpIHtcbiAgICB2YXIgZiA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZmluZCBhIFByb21pc2UgaW1wbGVtZW50YXRpb24uJyk7XG4gICAgfTtcbiAgICBmb3IodmFyIG1ldGhvZCBpbiBhcGkpIHtcbiAgICAgIGFwaVttZXRob2RdID0gZjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYXBpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIG5vZGUuanMgYXN5bmMgb3AgaW50byBhIHByb21pc2Ugdy9ib3hlZCByZXNvbHZlZCB2YWx1ZShzKS5cbiAqXG4gKiBAcGFyYW0gb3AgdGhlIG9wZXJhdGlvbiB0byBjb252ZXJ0LlxuICpcbiAqIEByZXR1cm4gdGhlIHByb21pc2UuXG4gKi9cbmpzb25sZC5wcm9taXNpZnkgPSBmdW5jdGlvbihvcCkge1xuICBpZighanNvbmxkLlByb21pc2UpIHtcbiAgICB0cnkge1xuICAgICAganNvbmxkLlByb21pc2UgPSBnbG9iYWwuUHJvbWlzZSB8fCByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIGEgUHJvbWlzZSBpbXBsZW1lbnRhdGlvbi4nKTtcbiAgICB9XG4gIH1cbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICByZXR1cm4gbmV3IGpzb25sZC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIG9wLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KGZ1bmN0aW9uKGVyciwgdmFsdWUpIHtcbiAgICAgIGlmKCFlcnIpIHtcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH0pO1xufTtcblxuLy8gZXh0ZW5kIGpzb25sZC5wcm9taXNlcyB3L2pzb25sZC5qcyBtZXRob2RzXG5qc29ubGQucHJvbWlzZXMoe2FwaToganNvbmxkLnByb21pc2VzfSk7XG5cbi8qIFdlYklETCBBUEkgKi9cblxuZnVuY3Rpb24gSnNvbkxkUHJvY2Vzc29yKCkge31cbkpzb25MZFByb2Nlc3Nvci5wcm90b3R5cGUgPSBqc29ubGQucHJvbWlzZXMoe3ZlcnNpb246ICdqc29uLWxkLTEuMCd9KTtcbkpzb25MZFByb2Nlc3Nvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgaWYodGhpcyBpbnN0YW5jZW9mIEpzb25MZFByb2Nlc3Nvcikge1xuICAgIHJldHVybiAnW29iamVjdCBKc29uTGRQcm9jZXNzb3JdJztcbiAgfVxuICByZXR1cm4gJ1tvYmplY3QgSnNvbkxkUHJvY2Vzc29yUHJvdG90eXBlXSc7XG59O1xuanNvbmxkLkpzb25MZFByb2Nlc3NvciA9IEpzb25MZFByb2Nlc3NvcjtcblxuLy8gSUU4IGhhcyBPYmplY3QuZGVmaW5lUHJvcGVydHkgYnV0IGl0IG9ubHlcbi8vIHdvcmtzIG9uIERPTSBub2RlcyAtLSBzbyBmZWF0dXJlIGRldGVjdGlvblxuLy8gcmVxdWlyZXMgdHJ5L2NhdGNoIDotKFxudmFyIGNhbkRlZmluZVByb3BlcnR5ID0gISFPYmplY3QuZGVmaW5lUHJvcGVydHk7XG5pZihjYW5EZWZpbmVQcm9wZXJ0eSkge1xuICB0cnkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgJ3gnLCB7fSk7XG4gIH0gY2F0Y2goZSkge1xuICAgIGNhbkRlZmluZVByb3BlcnR5ID0gZmFsc2U7XG4gIH1cbn1cblxuaWYoY2FuRGVmaW5lUHJvcGVydHkpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEpzb25MZFByb2Nlc3NvciwgJ3Byb3RvdHlwZScsIHtcbiAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShKc29uTGRQcm9jZXNzb3IucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCB7XG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBKc29uTGRQcm9jZXNzb3JcbiAgfSk7XG59XG5cbi8vIHNldHVwIGJyb3dzZXIgZ2xvYmFsIEpzb25MZFByb2Nlc3NvclxuaWYoX2Jyb3dzZXIgJiYgdHlwZW9mIGdsb2JhbC5Kc29uTGRQcm9jZXNzb3IgPT09ICd1bmRlZmluZWQnKSB7XG4gIGlmKGNhbkRlZmluZVByb3BlcnR5KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbCwgJ0pzb25MZFByb2Nlc3NvcicsIHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB2YWx1ZTogSnNvbkxkUHJvY2Vzc29yXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgZ2xvYmFsLkpzb25MZFByb2Nlc3NvciA9IEpzb25MZFByb2Nlc3NvcjtcbiAgfVxufVxuXG4vKiBVdGlsaXR5IEFQSSAqL1xuXG4vLyBkZWZpbmUgc2V0SW1tZWRpYXRlIGFuZCBuZXh0VGlja1xuaWYodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8ICFwcm9jZXNzLm5leHRUaWNrKSB7XG4gIGlmKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICBqc29ubGQuc2V0SW1tZWRpYXRlID0ganNvbmxkLm5leHRUaWNrID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIHJldHVybiBzZXRJbW1lZGlhdGUoY2FsbGJhY2spO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAganNvbmxkLnNldEltbWVkaWF0ZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAwKTtcbiAgICB9O1xuICAgIGpzb25sZC5uZXh0VGljayA9IGpzb25sZC5zZXRJbW1lZGlhdGU7XG4gIH1cbn0gZWxzZSB7XG4gIGpzb25sZC5uZXh0VGljayA9IHByb2Nlc3MubmV4dFRpY2s7XG4gIGlmKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICBqc29ubGQuc2V0SW1tZWRpYXRlID0gc2V0SW1tZWRpYXRlO1xuICB9IGVsc2Uge1xuICAgIGpzb25sZC5zZXRJbW1lZGlhdGUgPSBqc29ubGQubmV4dFRpY2s7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZXMgYSBsaW5rIGhlYWRlci4gVGhlIHJlc3VsdHMgd2lsbCBiZSBrZXknZCBieSB0aGUgdmFsdWUgb2YgXCJyZWxcIi5cbiAqXG4gKiBMaW5rOiA8aHR0cDovL2pzb24tbGQub3JnL2NvbnRleHRzL3BlcnNvbi5qc29ubGQ+OyByZWw9XCJodHRwOi8vd3d3LnczLm9yZy9ucy9qc29uLWxkI2NvbnRleHRcIjsgdHlwZT1cImFwcGxpY2F0aW9uL2xkK2pzb25cIlxuICpcbiAqIFBhcnNlcyBhczoge1xuICogICAnaHR0cDovL3d3dy53My5vcmcvbnMvanNvbi1sZCNjb250ZXh0Jzoge1xuICogICAgIHRhcmdldDogaHR0cDovL2pzb24tbGQub3JnL2NvbnRleHRzL3BlcnNvbi5qc29ubGQsXG4gKiAgICAgdHlwZTogJ2FwcGxpY2F0aW9uL2xkK2pzb24nXG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIFwicmVsXCIgd2l0aCB0aGUgc2FtZSBJUkksIHRoZW4gZW50cmllcyBpbiB0aGVcbiAqIHJlc3VsdGluZyBtYXAgZm9yIHRoYXQgXCJyZWxcIiB3aWxsIGJlIGFycmF5cy5cbiAqXG4gKiBAcGFyYW0gaGVhZGVyIHRoZSBsaW5rIGhlYWRlciB0byBwYXJzZS5cbiAqL1xuanNvbmxkLnBhcnNlTGlua0hlYWRlciA9IGZ1bmN0aW9uKGhlYWRlcikge1xuICB2YXIgcnZhbCA9IHt9O1xuICAvLyBzcGxpdCBvbiB1bmJyYWNrZXRlZC91bnF1b3RlZCBjb21tYXNcbiAgdmFyIGVudHJpZXMgPSBoZWFkZXIubWF0Y2goLyg/OjxbXj5dKj8+fFwiW15cIl0qP1wifFteLF0pKy9nKTtcbiAgdmFyIHJMaW5rSGVhZGVyID0gL1xccyo8KFtePl0qPyk+XFxzKig/OjtcXHMqKC4qKSk/LztcbiAgZm9yKHZhciBpID0gMDsgaSA8IGVudHJpZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgbWF0Y2ggPSBlbnRyaWVzW2ldLm1hdGNoKHJMaW5rSGVhZGVyKTtcbiAgICBpZighbWF0Y2gpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0ge3RhcmdldDogbWF0Y2hbMV19O1xuICAgIHZhciBwYXJhbXMgPSBtYXRjaFsyXTtcbiAgICB2YXIgclBhcmFtcyA9IC8oLio/KT0oPzooPzpcIihbXlwiXSo/KVwiKXwoW15cIl0qPykpXFxzKig/Oig/OjtcXHMqKXwkKS9nO1xuICAgIHdoaWxlKG1hdGNoID0gclBhcmFtcy5leGVjKHBhcmFtcykpIHtcbiAgICAgIHJlc3VsdFttYXRjaFsxXV0gPSAobWF0Y2hbMl0gPT09IHVuZGVmaW5lZCkgPyBtYXRjaFszXSA6IG1hdGNoWzJdO1xuICAgIH1cbiAgICB2YXIgcmVsID0gcmVzdWx0WydyZWwnXSB8fCAnJztcbiAgICBpZihfaXNBcnJheShydmFsW3JlbF0pKSB7XG4gICAgICBydmFsW3JlbF0ucHVzaChyZXN1bHQpO1xuICAgIH0gZWxzZSBpZihyZWwgaW4gcnZhbCkge1xuICAgICAgcnZhbFtyZWxdID0gW3J2YWxbcmVsXSwgcmVzdWx0XTtcbiAgICB9IGVsc2Uge1xuICAgICAgcnZhbFtyZWxdID0gcmVzdWx0O1xuICAgIH1cbiAgfVxuICByZXR1cm4gcnZhbDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHNpbXBsZSBkb2N1bWVudCBjYWNoZSB0aGF0IHJldGFpbnMgZG9jdW1lbnRzIGZvciBhIHNob3J0XG4gKiBwZXJpb2Qgb2YgdGltZS5cbiAqXG4gKiBGSVhNRTogSW1wbGVtZW50IHNpbXBsZSBIVFRQIGNhY2hpbmcgaW5zdGVhZC5cbiAqXG4gKiBAcGFyYW0gc2l6ZSB0aGUgbWF4aW11bSBzaXplIG9mIHRoZSBjYWNoZS5cbiAqL1xuanNvbmxkLkRvY3VtZW50Q2FjaGUgPSBmdW5jdGlvbihzaXplKSB7XG4gIHRoaXMub3JkZXIgPSBbXTtcbiAgdGhpcy5jYWNoZSA9IHt9O1xuICB0aGlzLnNpemUgPSBzaXplIHx8IDUwO1xuICB0aGlzLmV4cGlyZXMgPSAzMCAqIDEwMDA7XG59O1xuanNvbmxkLkRvY3VtZW50Q2FjaGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHVybCkge1xuICBpZih1cmwgaW4gdGhpcy5jYWNoZSkge1xuICAgIHZhciBlbnRyeSA9IHRoaXMuY2FjaGVbdXJsXTtcbiAgICBpZihlbnRyeS5leHBpcmVzID49ICtuZXcgRGF0ZSgpKSB7XG4gICAgICByZXR1cm4gZW50cnkuY3R4O1xuICAgIH1cbiAgICBkZWxldGUgdGhpcy5jYWNoZVt1cmxdO1xuICAgIHRoaXMub3JkZXIuc3BsaWNlKHRoaXMub3JkZXIuaW5kZXhPZih1cmwpLCAxKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5qc29ubGQuRG9jdW1lbnRDYWNoZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24odXJsLCBjdHgpIHtcbiAgaWYodGhpcy5vcmRlci5sZW5ndGggPT09IHRoaXMuc2l6ZSkge1xuICAgIGRlbGV0ZSB0aGlzLmNhY2hlW3RoaXMub3JkZXIuc2hpZnQoKV07XG4gIH1cbiAgdGhpcy5vcmRlci5wdXNoKHVybCk7XG4gIHRoaXMuY2FjaGVbdXJsXSA9IHtjdHg6IGN0eCwgZXhwaXJlczogKCtuZXcgRGF0ZSgpICsgdGhpcy5leHBpcmVzKX07XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gYWN0aXZlIGNvbnRleHQgY2FjaGUuXG4gKlxuICogQHBhcmFtIHNpemUgdGhlIG1heGltdW0gc2l6ZSBvZiB0aGUgY2FjaGUuXG4gKi9cbmpzb25sZC5BY3RpdmVDb250ZXh0Q2FjaGUgPSBmdW5jdGlvbihzaXplKSB7XG4gIHRoaXMub3JkZXIgPSBbXTtcbiAgdGhpcy5jYWNoZSA9IHt9O1xuICB0aGlzLnNpemUgPSBzaXplIHx8IDEwMDtcbn07XG5qc29ubGQuQWN0aXZlQ29udGV4dENhY2hlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihhY3RpdmVDdHgsIGxvY2FsQ3R4KSB7XG4gIHZhciBrZXkxID0gSlNPTi5zdHJpbmdpZnkoYWN0aXZlQ3R4KTtcbiAgdmFyIGtleTIgPSBKU09OLnN0cmluZ2lmeShsb2NhbEN0eCk7XG4gIHZhciBsZXZlbDEgPSB0aGlzLmNhY2hlW2tleTFdO1xuICBpZihsZXZlbDEgJiYga2V5MiBpbiBsZXZlbDEpIHtcbiAgICByZXR1cm4gbGV2ZWwxW2tleTJdO1xuICB9XG4gIHJldHVybiBudWxsO1xufTtcbmpzb25sZC5BY3RpdmVDb250ZXh0Q2FjaGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKFxuICBhY3RpdmVDdHgsIGxvY2FsQ3R4LCByZXN1bHQpIHtcbiAgaWYodGhpcy5vcmRlci5sZW5ndGggPT09IHRoaXMuc2l6ZSkge1xuICAgIHZhciBlbnRyeSA9IHRoaXMub3JkZXIuc2hpZnQoKTtcbiAgICBkZWxldGUgdGhpcy5jYWNoZVtlbnRyeS5hY3RpdmVDdHhdW2VudHJ5LmxvY2FsQ3R4XTtcbiAgfVxuICB2YXIga2V5MSA9IEpTT04uc3RyaW5naWZ5KGFjdGl2ZUN0eCk7XG4gIHZhciBrZXkyID0gSlNPTi5zdHJpbmdpZnkobG9jYWxDdHgpO1xuICB0aGlzLm9yZGVyLnB1c2goe2FjdGl2ZUN0eDoga2V5MSwgbG9jYWxDdHg6IGtleTJ9KTtcbiAgaWYoIShrZXkxIGluIHRoaXMuY2FjaGUpKSB7XG4gICAgdGhpcy5jYWNoZVtrZXkxXSA9IHt9O1xuICB9XG4gIHRoaXMuY2FjaGVba2V5MV1ba2V5Ml0gPSBfY2xvbmUocmVzdWx0KTtcbn07XG5cbi8qKlxuICogRGVmYXVsdCBKU09OLUxEIGNhY2hlLlxuICovXG5qc29ubGQuY2FjaGUgPSB7XG4gIGFjdGl2ZUN0eDogbmV3IGpzb25sZC5BY3RpdmVDb250ZXh0Q2FjaGUoKVxufTtcblxuLyoqXG4gKiBEb2N1bWVudCBsb2FkZXJzLlxuICovXG5qc29ubGQuZG9jdW1lbnRMb2FkZXJzID0ge307XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJ1aWx0LWluIGpxdWVyeSBkb2N1bWVudCBsb2FkZXIuXG4gKlxuICogQHBhcmFtICQgdGhlIGpxdWVyeSBpbnN0YW5jZSB0byB1c2UuXG4gKiBAcGFyYW0gb3B0aW9ucyB0aGUgb3B0aW9ucyB0byB1c2U6XG4gKiAgICAgICAgICBzZWN1cmU6IHJlcXVpcmUgYWxsIFVSTHMgdG8gdXNlIEhUVFBTLlxuICogICAgICAgICAgdXNlUHJvbWlzZTogdHJ1ZSB0byB1c2UgYSBwcm9taXNlcyBBUEksIGZhbHNlIGZvciBhXG4gKiAgICAgICAgICAgIGNhbGxiYWNrLWNvbnRpbnVhdGlvbi1zdHlsZSBBUEk7IGRlZmF1bHRzIHRvIHRydWUgaWYgUHJvbWlzZVxuICogICAgICAgICAgICBpcyBnbG9iYWxseSBkZWZpbmVkLCBmYWxzZSBpZiBub3QuXG4gKlxuICogQHJldHVybiB0aGUganF1ZXJ5IGRvY3VtZW50IGxvYWRlci5cbiAqL1xuanNvbmxkLmRvY3VtZW50TG9hZGVycy5qcXVlcnkgPSBmdW5jdGlvbigkLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgbG9hZGVyID0gZnVuY3Rpb24odXJsLCBjYWxsYmFjaykge1xuICAgIGlmKHVybC5pbmRleE9mKCdodHRwOicpICE9PSAwICYmIHVybC5pbmRleE9mKCdodHRwczonKSAhPT0gMCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkOyBvbmx5IFwiaHR0cFwiIGFuZCBcImh0dHBzXCIgVVJMcyBhcmUgJyArXG4gICAgICAgICdzdXBwb3J0ZWQuJyxcbiAgICAgICAgJ2pzb25sZC5JbnZhbGlkVXJsJywge2NvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCcsIHVybDogdXJsfSksXG4gICAgICAgIHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogdXJsLCBkb2N1bWVudDogbnVsbH0pO1xuICAgIH1cbiAgICBpZihvcHRpb25zLnNlY3VyZSAmJiB1cmwuaW5kZXhPZignaHR0cHMnKSAhPT0gMCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkOyBzZWN1cmUgbW9kZSBpcyBlbmFibGVkIGFuZCAnICtcbiAgICAgICAgJ3RoZSBVUkxcXCdzIHNjaGVtZSBpcyBub3QgXCJodHRwc1wiLicsXG4gICAgICAgICdqc29ubGQuSW52YWxpZFVybCcsIHtjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnLCB1cmw6IHVybH0pLFxuICAgICAgICB7Y29udGV4dFVybDogbnVsbCwgZG9jdW1lbnRVcmw6IHVybCwgZG9jdW1lbnQ6IG51bGx9KTtcbiAgICB9XG4gICAgJC5hamF4KHtcbiAgICAgIHVybDogdXJsLFxuICAgICAgYWNjZXB0czoge1xuICAgICAgICBqc29uOiAnYXBwbGljYXRpb24vbGQranNvbiwgYXBwbGljYXRpb24vanNvbidcbiAgICAgIH0sXG4gICAgICAvLyBlbnN1cmUgQWNjZXB0IGhlYWRlciBpcyB2ZXJ5IHNwZWNpZmljIGZvciBKU09OLUxEL0pTT05cbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9sZCtqc29uLCBhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgfSxcbiAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICBjcm9zc0RvbWFpbjogdHJ1ZSxcbiAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEsIHRleHRTdGF0dXMsIGpxWEhSKSB7XG4gICAgICAgIHZhciBkb2MgPSB7Y29udGV4dFVybDogbnVsbCwgZG9jdW1lbnRVcmw6IHVybCwgZG9jdW1lbnQ6IGRhdGF9O1xuXG4gICAgICAgIC8vIGhhbmRsZSBMaW5rIEhlYWRlclxuICAgICAgICB2YXIgY29udGVudFR5cGUgPSBqcVhIUi5nZXRSZXNwb25zZUhlYWRlcignQ29udGVudC1UeXBlJyk7XG4gICAgICAgIHZhciBsaW5rSGVhZGVyID0ganFYSFIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0xpbmsnKTtcbiAgICAgICAgaWYobGlua0hlYWRlciAmJiBjb250ZW50VHlwZSAhPT0gJ2FwcGxpY2F0aW9uL2xkK2pzb24nKSB7XG4gICAgICAgICAgLy8gb25seSAxIHJlbGF0ZWQgbGluayBoZWFkZXIgcGVybWl0dGVkXG4gICAgICAgICAgbGlua0hlYWRlciA9IGpzb25sZC5wYXJzZUxpbmtIZWFkZXIobGlua0hlYWRlcilbTElOS19IRUFERVJfUkVMXTtcbiAgICAgICAgICBpZihfaXNBcnJheShsaW5rSGVhZGVyKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkLCBpdCBoYXMgbW9yZSB0aGFuIG9uZSAnICtcbiAgICAgICAgICAgICAgJ2Fzc29jaWF0ZWQgSFRUUCBMaW5rIEhlYWRlci4nLFxuICAgICAgICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLFxuICAgICAgICAgICAgICB7Y29kZTogJ211bHRpcGxlIGNvbnRleHQgbGluayBoZWFkZXJzJywgdXJsOiB1cmx9KSwgZG9jKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYobGlua0hlYWRlcikge1xuICAgICAgICAgICAgZG9jLmNvbnRleHRVcmwgPSBsaW5rSGVhZGVyLnRhcmdldDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsYmFjayhudWxsLCBkb2MpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiBmdW5jdGlvbihqcVhIUiwgdGV4dFN0YXR1cywgZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnVVJMIGNvdWxkIG5vdCBiZSBkZXJlZmVyZW5jZWQsIGFuIGVycm9yIG9jY3VycmVkLicsXG4gICAgICAgICAgJ2pzb25sZC5Mb2FkRG9jdW1lbnRFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCcsIHVybDogdXJsLCBjYXVzZTogZXJyfSksXG4gICAgICAgICAge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiB1cmwsIGRvY3VtZW50OiBudWxsfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIHVzZVByb21pc2UgPSAodHlwZW9mIFByb21pc2UgIT09ICd1bmRlZmluZWQnKTtcbiAgaWYoJ3VzZVByb21pc2UnIGluIG9wdGlvbnMpIHtcbiAgICB1c2VQcm9taXNlID0gb3B0aW9ucy51c2VQcm9taXNlO1xuICB9XG4gIGlmKHVzZVByb21pc2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24odXJsKSB7XG4gICAgICByZXR1cm4ganNvbmxkLnByb21pc2lmeShsb2FkZXIsIHVybCk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gbG9hZGVyO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYnVpbHQtaW4gbm9kZSBkb2N1bWVudCBsb2FkZXIuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgc2VjdXJlOiByZXF1aXJlIGFsbCBVUkxzIHRvIHVzZSBIVFRQUy5cbiAqICAgICAgICAgIHN0cmljdFNTTDogdHJ1ZSB0byByZXF1aXJlIFNTTCBjZXJ0aWZpY2F0ZXMgdG8gYmUgdmFsaWQsXG4gKiAgICAgICAgICAgIGZhbHNlIG5vdCB0byAoZGVmYXVsdDogdHJ1ZSkuXG4gKiAgICAgICAgICBtYXhSZWRpcmVjdHM6IHRoZSBtYXhpbXVtIG51bWJlciBvZiByZWRpcmVjdHMgdG8gcGVybWl0LCBub25lIGJ5XG4gKiAgICAgICAgICAgIGRlZmF1bHQuXG4gKiAgICAgICAgICB1c2VQcm9taXNlOiB0cnVlIHRvIHVzZSBhIHByb21pc2VzIEFQSSwgZmFsc2UgZm9yIGFcbiAqICAgICAgICAgICAgY2FsbGJhY2stY29udGludWF0aW9uLXN0eWxlIEFQSTsgZmFsc2UgYnkgZGVmYXVsdC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBub2RlIGRvY3VtZW50IGxvYWRlci5cbiAqL1xuanNvbmxkLmRvY3VtZW50TG9hZGVycy5ub2RlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHN0cmljdFNTTCA9ICgnc3RyaWN0U1NMJyBpbiBvcHRpb25zKSA/IG9wdGlvbnMuc3RyaWN0U1NMIDogdHJ1ZTtcbiAgdmFyIG1heFJlZGlyZWN0cyA9ICgnbWF4UmVkaXJlY3RzJyBpbiBvcHRpb25zKSA/IG9wdGlvbnMubWF4UmVkaXJlY3RzIDogLTE7XG4gIHZhciByZXF1ZXN0ID0gcmVxdWlyZSgncmVxdWVzdCcpO1xuICB2YXIgaHR0cCA9IHJlcXVpcmUoJ2h0dHAnKTtcbiAgdmFyIGNhY2hlID0gbmV3IGpzb25sZC5Eb2N1bWVudENhY2hlKCk7XG4gIGZ1bmN0aW9uIGxvYWREb2N1bWVudCh1cmwsIHJlZGlyZWN0cywgY2FsbGJhY2spIHtcbiAgICBpZih1cmwuaW5kZXhPZignaHR0cDonKSAhPT0gMCAmJiB1cmwuaW5kZXhPZignaHR0cHM6JykgIT09IDApIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZDsgb25seSBcImh0dHBcIiBhbmQgXCJodHRwc1wiIFVSTHMgYXJlICcgK1xuICAgICAgICAnc3VwcG9ydGVkLicsXG4gICAgICAgICdqc29ubGQuSW52YWxpZFVybCcsIHtjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnLCB1cmw6IHVybH0pLFxuICAgICAgICB7Y29udGV4dFVybDogbnVsbCwgZG9jdW1lbnRVcmw6IHVybCwgZG9jdW1lbnQ6IG51bGx9KTtcbiAgICB9XG4gICAgaWYob3B0aW9ucy5zZWN1cmUgJiYgdXJsLmluZGV4T2YoJ2h0dHBzJykgIT09IDApIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZDsgc2VjdXJlIG1vZGUgaXMgZW5hYmxlZCBhbmQgJyArXG4gICAgICAgICd0aGUgVVJMXFwncyBzY2hlbWUgaXMgbm90IFwiaHR0cHNcIi4nLFxuICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLCB7Y29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJywgdXJsOiB1cmx9KSxcbiAgICAgICAge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiB1cmwsIGRvY3VtZW50OiBudWxsfSk7XG4gICAgfVxuICAgIHZhciBkb2MgPSBjYWNoZS5nZXQodXJsKTtcbiAgICBpZihkb2MgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBkb2MpO1xuICAgIH1cbiAgICByZXF1ZXN0KHtcbiAgICAgIHVybDogdXJsLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2xkK2pzb24sIGFwcGxpY2F0aW9uL2pzb24nXG4gICAgICB9LFxuICAgICAgc3RyaWN0U1NMOiBzdHJpY3RTU0wsXG4gICAgICBmb2xsb3dSZWRpcmVjdDogZmFsc2VcbiAgICB9LCBoYW5kbGVSZXNwb25zZSk7XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVSZXNwb25zZShlcnIsIHJlcywgYm9keSkge1xuICAgICAgZG9jID0ge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiB1cmwsIGRvY3VtZW50OiBib2R5IHx8IG51bGx9O1xuXG4gICAgICAvLyBoYW5kbGUgZXJyb3JcbiAgICAgIGlmKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdVUkwgY291bGQgbm90IGJlIGRlcmVmZXJlbmNlZCwgYW4gZXJyb3Igb2NjdXJyZWQuJyxcbiAgICAgICAgICAnanNvbmxkLkxvYWREb2N1bWVudEVycm9yJyxcbiAgICAgICAgICB7Y29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJywgdXJsOiB1cmwsIGNhdXNlOiBlcnJ9KSwgZG9jKTtcbiAgICAgIH1cbiAgICAgIHZhciBzdGF0dXNUZXh0ID0gaHR0cC5TVEFUVVNfQ09ERVNbcmVzLnN0YXR1c0NvZGVdO1xuICAgICAgaWYocmVzLnN0YXR1c0NvZGUgPj0gNDAwKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkOiAnICsgc3RhdHVzVGV4dCxcbiAgICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLCB7XG4gICAgICAgICAgICBjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnLFxuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBodHRwU3RhdHVzQ29kZTogcmVzLnN0YXR1c0NvZGVcbiAgICAgICAgICB9KSwgZG9jKTtcbiAgICAgIH1cblxuICAgICAgLy8gaGFuZGxlIExpbmsgSGVhZGVyXG4gICAgICBpZihyZXMuaGVhZGVycy5saW5rICYmXG4gICAgICAgIHJlcy5oZWFkZXJzWydjb250ZW50LXR5cGUnXSAhPT0gJ2FwcGxpY2F0aW9uL2xkK2pzb24nKSB7XG4gICAgICAgIC8vIG9ubHkgMSByZWxhdGVkIGxpbmsgaGVhZGVyIHBlcm1pdHRlZFxuICAgICAgICB2YXIgbGlua0hlYWRlciA9IGpzb25sZC5wYXJzZUxpbmtIZWFkZXIoXG4gICAgICAgICAgcmVzLmhlYWRlcnMubGluaylbTElOS19IRUFERVJfUkVMXTtcbiAgICAgICAgaWYoX2lzQXJyYXkobGlua0hlYWRlcikpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkLCBpdCBoYXMgbW9yZSB0aGFuIG9uZSBhc3NvY2lhdGVkICcgK1xuICAgICAgICAgICAgJ0hUVFAgTGluayBIZWFkZXIuJyxcbiAgICAgICAgICAgICdqc29ubGQuSW52YWxpZFVybCcsXG4gICAgICAgICAgICB7Y29kZTogJ211bHRpcGxlIGNvbnRleHQgbGluayBoZWFkZXJzJywgdXJsOiB1cmx9KSwgZG9jKTtcbiAgICAgICAgfVxuICAgICAgICBpZihsaW5rSGVhZGVyKSB7XG4gICAgICAgICAgZG9jLmNvbnRleHRVcmwgPSBsaW5rSGVhZGVyLnRhcmdldDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBoYW5kbGUgcmVkaXJlY3RcbiAgICAgIGlmKHJlcy5zdGF0dXNDb2RlID49IDMwMCAmJiByZXMuc3RhdHVzQ29kZSA8IDQwMCAmJlxuICAgICAgICByZXMuaGVhZGVycy5sb2NhdGlvbikge1xuICAgICAgICBpZihyZWRpcmVjdHMubGVuZ3RoID09PSBtYXhSZWRpcmVjdHMpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkOyB0aGVyZSB3ZXJlIHRvbyBtYW55IHJlZGlyZWN0cy4nLFxuICAgICAgICAgICAgJ2pzb25sZC5Ub29NYW55UmVkaXJlY3RzJywge1xuICAgICAgICAgICAgICBjb2RlOiAnbG9hZGluZyBkb2N1bWVudCBmYWlsZWQnLFxuICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgaHR0cFN0YXR1c0NvZGU6IHJlcy5zdGF0dXNDb2RlLFxuICAgICAgICAgICAgICByZWRpcmVjdHM6IHJlZGlyZWN0c1xuICAgICAgICAgICAgfSksIGRvYyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYocmVkaXJlY3RzLmluZGV4T2YodXJsKSAhPT0gLTEpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkOyBpbmZpbml0ZSByZWRpcmVjdGlvbiB3YXMgZGV0ZWN0ZWQuJyxcbiAgICAgICAgICAgICdqc29ubGQuSW5maW5pdGVSZWRpcmVjdERldGVjdGVkJywge1xuICAgICAgICAgICAgICBjb2RlOiAncmVjdXJzaXZlIGNvbnRleHQgaW5jbHVzaW9uJyxcbiAgICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICAgIGh0dHBTdGF0dXNDb2RlOiByZXMuc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgcmVkaXJlY3RzOiByZWRpcmVjdHNcbiAgICAgICAgICAgIH0pLCBkb2MpO1xuICAgICAgICB9XG4gICAgICAgIHJlZGlyZWN0cy5wdXNoKHVybCk7XG4gICAgICAgIHJldHVybiBsb2FkRG9jdW1lbnQocmVzLmhlYWRlcnMubG9jYXRpb24sIHJlZGlyZWN0cywgY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgLy8gY2FjaGUgZm9yIGVhY2ggcmVkaXJlY3RlZCBVUkxcbiAgICAgIHJlZGlyZWN0cy5wdXNoKHVybCk7XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcmVkaXJlY3RzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGNhY2hlLnNldChcbiAgICAgICAgICByZWRpcmVjdHNbaV0sXG4gICAgICAgICAge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiByZWRpcmVjdHNbaV0sIGRvY3VtZW50OiBib2R5fSk7XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhlcnIsIGRvYyk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGxvYWRlciA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spIHtcbiAgICBsb2FkRG9jdW1lbnQodXJsLCBbXSwgY2FsbGJhY2spO1xuICB9O1xuICBpZihvcHRpb25zLnVzZVByb21pc2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24odXJsKSB7XG4gICAgICByZXR1cm4ganNvbmxkLnByb21pc2lmeShsb2FkZXIsIHVybCk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gbG9hZGVyO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYnVpbHQtaW4gWE1MSHR0cFJlcXVlc3QgZG9jdW1lbnQgbG9hZGVyLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBvcHRpb25zIHRvIHVzZTpcbiAqICAgICAgICAgIHNlY3VyZTogcmVxdWlyZSBhbGwgVVJMcyB0byB1c2UgSFRUUFMuXG4gKiAgICAgICAgICB1c2VQcm9taXNlOiB0cnVlIHRvIHVzZSBhIHByb21pc2VzIEFQSSwgZmFsc2UgZm9yIGFcbiAqICAgICAgICAgICAgY2FsbGJhY2stY29udGludWF0aW9uLXN0eWxlIEFQSTsgZGVmYXVsdHMgdG8gdHJ1ZSBpZiBQcm9taXNlXG4gKiAgICAgICAgICAgIGlzIGdsb2JhbGx5IGRlZmluZWQsIGZhbHNlIGlmIG5vdC5cbiAqICAgICAgICAgIFt4aHJdOiB0aGUgWE1MSHR0cFJlcXVlc3QgQVBJIHRvIHVzZS5cbiAqXG4gKiBAcmV0dXJuIHRoZSBYTUxIdHRwUmVxdWVzdCBkb2N1bWVudCBsb2FkZXIuXG4gKi9cbmpzb25sZC5kb2N1bWVudExvYWRlcnMueGhyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICB2YXIgcmxpbmsgPSAvKF58KFxcclxcbikpbGluazovaTtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBsb2FkZXIgPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKSB7XG4gICAgaWYodXJsLmluZGV4T2YoJ2h0dHA6JykgIT09IDAgJiYgdXJsLmluZGV4T2YoJ2h0dHBzOicpICE9PSAwKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnVVJMIGNvdWxkIG5vdCBiZSBkZXJlZmVyZW5jZWQ7IG9ubHkgXCJodHRwXCIgYW5kIFwiaHR0cHNcIiBVUkxzIGFyZSAnICtcbiAgICAgICAgJ3N1cHBvcnRlZC4nLFxuICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLCB7Y29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJywgdXJsOiB1cmx9KSxcbiAgICAgICAge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiB1cmwsIGRvY3VtZW50OiBudWxsfSk7XG4gICAgfVxuICAgIGlmKG9wdGlvbnMuc2VjdXJlICYmIHVybC5pbmRleE9mKCdodHRwcycpICE9PSAwKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnVVJMIGNvdWxkIG5vdCBiZSBkZXJlZmVyZW5jZWQ7IHNlY3VyZSBtb2RlIGlzIGVuYWJsZWQgYW5kICcgK1xuICAgICAgICAndGhlIFVSTFxcJ3Mgc2NoZW1lIGlzIG5vdCBcImh0dHBzXCIuJyxcbiAgICAgICAgJ2pzb25sZC5JbnZhbGlkVXJsJywge2NvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCcsIHVybDogdXJsfSksXG4gICAgICAgIHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogdXJsLCBkb2N1bWVudDogbnVsbH0pO1xuICAgIH1cbiAgICB2YXIgeGhyID0gb3B0aW9ucy54aHIgfHwgWE1MSHR0cFJlcXVlc3Q7XG4gICAgdmFyIHJlcSA9IG5ldyB4aHIoKTtcbiAgICByZXEub25sb2FkID0gZnVuY3Rpb24oZSkge1xuICAgICAgaWYocmVxLnN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnVVJMIGNvdWxkIG5vdCBiZSBkZXJlZmVyZW5jZWQ6ICcgKyByZXEuc3RhdHVzVGV4dCxcbiAgICAgICAgICAnanNvbmxkLkxvYWREb2N1bWVudEVycm9yJywge1xuICAgICAgICAgICAgY29kZTogJ2xvYWRpbmcgZG9jdW1lbnQgZmFpbGVkJyxcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgaHR0cFN0YXR1c0NvZGU6IHJlcS5zdGF0dXNcbiAgICAgICAgICB9KSwge2NvbnRleHRVcmw6IG51bGwsIGRvY3VtZW50VXJsOiB1cmwsIGRvY3VtZW50OiBudWxsfSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBkb2MgPSB7Y29udGV4dFVybDogbnVsbCwgZG9jdW1lbnRVcmw6IHVybCwgZG9jdW1lbnQ6IHJlcS5yZXNwb25zZX07XG5cbiAgICAgIC8vIGhhbmRsZSBMaW5rIEhlYWRlciAoYXZvaWQgdW5zYWZlIGhlYWRlciB3YXJuaW5nIGJ5IGV4aXN0ZW5jZSB0ZXN0aW5nKVxuICAgICAgdmFyIGNvbnRlbnRUeXBlID0gcmVxLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LVR5cGUnKTtcbiAgICAgIHZhciBsaW5rSGVhZGVyO1xuICAgICAgaWYocmxpbmsudGVzdChyZXEuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpKSB7XG4gICAgICAgIGxpbmtIZWFkZXIgPSByZXEuZ2V0UmVzcG9uc2VIZWFkZXIoJ0xpbmsnKTtcbiAgICAgIH1cbiAgICAgIGlmKGxpbmtIZWFkZXIgJiYgY29udGVudFR5cGUgIT09ICdhcHBsaWNhdGlvbi9sZCtqc29uJykge1xuICAgICAgICAvLyBvbmx5IDEgcmVsYXRlZCBsaW5rIGhlYWRlciBwZXJtaXR0ZWRcbiAgICAgICAgbGlua0hlYWRlciA9IGpzb25sZC5wYXJzZUxpbmtIZWFkZXIobGlua0hlYWRlcilbTElOS19IRUFERVJfUkVMXTtcbiAgICAgICAgaWYoX2lzQXJyYXkobGlua0hlYWRlcikpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkLCBpdCBoYXMgbW9yZSB0aGFuIG9uZSAnICtcbiAgICAgICAgICAgICdhc3NvY2lhdGVkIEhUVFAgTGluayBIZWFkZXIuJyxcbiAgICAgICAgICAgICdqc29ubGQuSW52YWxpZFVybCcsXG4gICAgICAgICAgICB7Y29kZTogJ211bHRpcGxlIGNvbnRleHQgbGluayBoZWFkZXJzJywgdXJsOiB1cmx9KSwgZG9jKTtcbiAgICAgICAgfVxuICAgICAgICBpZihsaW5rSGVhZGVyKSB7XG4gICAgICAgICAgZG9jLmNvbnRleHRVcmwgPSBsaW5rSGVhZGVyLnRhcmdldDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjYWxsYmFjayhudWxsLCBkb2MpO1xuICAgIH07XG4gICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ1VSTCBjb3VsZCBub3QgYmUgZGVyZWZlcmVuY2VkLCBhbiBlcnJvciBvY2N1cnJlZC4nLFxuICAgICAgICAnanNvbmxkLkxvYWREb2N1bWVudEVycm9yJyxcbiAgICAgICAge2NvZGU6ICdsb2FkaW5nIGRvY3VtZW50IGZhaWxlZCcsIHVybDogdXJsfSksXG4gICAgICAgIHtjb250ZXh0VXJsOiBudWxsLCBkb2N1bWVudFVybDogdXJsLCBkb2N1bWVudDogbnVsbH0pO1xuICAgIH07XG4gICAgcmVxLm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9sZCtqc29uLCBhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgcmVxLnNlbmQoKTtcbiAgfTtcblxuICB2YXIgdXNlUHJvbWlzZSA9ICh0eXBlb2YgUHJvbWlzZSAhPT0gJ3VuZGVmaW5lZCcpO1xuICBpZigndXNlUHJvbWlzZScgaW4gb3B0aW9ucykge1xuICAgIHVzZVByb21pc2UgPSBvcHRpb25zLnVzZVByb21pc2U7XG4gIH1cbiAgaWYodXNlUHJvbWlzZSkge1xuICAgIHJldHVybiBmdW5jdGlvbih1cmwpIHtcbiAgICAgIHJldHVybiBqc29ubGQucHJvbWlzaWZ5KGxvYWRlciwgdXJsKTtcbiAgICB9O1xuICB9XG4gIHJldHVybiBsb2FkZXI7XG59O1xuXG4vKipcbiAqIEFzc2lnbnMgdGhlIGRlZmF1bHQgZG9jdW1lbnQgbG9hZGVyIGZvciBleHRlcm5hbCBkb2N1bWVudCBVUkxzIHRvIGEgYnVpbHQtaW5cbiAqIGRlZmF1bHQuIFN1cHBvcnRlZCB0eXBlcyBjdXJyZW50bHkgaW5jbHVkZTogJ2pxdWVyeScgYW5kICdub2RlJy5cbiAqXG4gKiBUbyB1c2UgdGhlIGpxdWVyeSBkb2N1bWVudCBsb2FkZXIsIHRoZSBmaXJzdCBwYXJhbWV0ZXIgbXVzdCBiZSBhIHJlZmVyZW5jZVxuICogdG8gdGhlIG1haW4ganF1ZXJ5IG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gdHlwZSB0aGUgdHlwZSB0byBzZXQuXG4gKiBAcGFyYW0gW3BhcmFtc10gdGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgdG8gdXNlIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKi9cbmpzb25sZC51c2VEb2N1bWVudExvYWRlciA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYoISh0eXBlIGluIGpzb25sZC5kb2N1bWVudExvYWRlcnMpKSB7XG4gICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgJ1Vua25vd24gZG9jdW1lbnQgbG9hZGVyIHR5cGU6IFwiJyArIHR5cGUgKyAnXCInLFxuICAgICAgJ2pzb25sZC5Vbmtub3duRG9jdW1lbnRMb2FkZXInLFxuICAgICAge3R5cGU6IHR5cGV9KTtcbiAgfVxuXG4gIC8vIHNldCBkb2N1bWVudCBsb2FkZXJcbiAganNvbmxkLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmRvY3VtZW50TG9hZGVyc1t0eXBlXS5hcHBseShcbiAgICBqc29ubGQsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xufTtcblxuLyoqXG4gKiBQcm9jZXNzZXMgYSBsb2NhbCBjb250ZXh0LCByZXNvbHZpbmcgYW55IFVSTHMgYXMgbmVjZXNzYXJ5LCBhbmQgcmV0dXJucyBhXG4gKiBuZXcgYWN0aXZlIGNvbnRleHQgaW4gaXRzIGNhbGxiYWNrLlxuICpcbiAqIEBwYXJhbSBhY3RpdmVDdHggdGhlIGN1cnJlbnQgYWN0aXZlIGNvbnRleHQuXG4gKiBAcGFyYW0gbG9jYWxDdHggdGhlIGxvY2FsIGNvbnRleHQgdG8gcHJvY2Vzcy5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2RvY3VtZW50TG9hZGVyKHVybCwgY2FsbGJhY2soZXJyLCByZW1vdGVEb2MpKV0gdGhlIGRvY3VtZW50IGxvYWRlci5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIGN0eCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmpzb25sZC5wcm9jZXNzQ29udGV4dCA9IGZ1bmN0aW9uKGFjdGl2ZUN0eCwgbG9jYWxDdHgpIHtcbiAgLy8gZ2V0IGFyZ3VtZW50c1xuICB2YXIgb3B0aW9ucyA9IHt9O1xuICB2YXIgY2FsbGJhY2tBcmcgPSAyO1xuICBpZihhcmd1bWVudHMubGVuZ3RoID4gMykge1xuICAgIG9wdGlvbnMgPSBhcmd1bWVudHNbMl0gfHwge307XG4gICAgY2FsbGJhY2tBcmcgKz0gMTtcbiAgfVxuICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbY2FsbGJhY2tBcmddO1xuXG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYoISgnYmFzZScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmJhc2UgPSAnJztcbiAgfVxuICBpZighKCdkb2N1bWVudExvYWRlcicgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmRvY3VtZW50TG9hZGVyID0ganNvbmxkLmxvYWREb2N1bWVudDtcbiAgfVxuXG4gIC8vIHJldHVybiBpbml0aWFsIGNvbnRleHQgZWFybHkgZm9yIG51bGwgY29udGV4dFxuICBpZihsb2NhbEN0eCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBfZ2V0SW5pdGlhbENvbnRleHQob3B0aW9ucykpO1xuICB9XG5cbiAgLy8gcmV0cmlldmUgVVJMcyBpbiBsb2NhbEN0eFxuICBsb2NhbEN0eCA9IF9jbG9uZShsb2NhbEN0eCk7XG4gIGlmKCEoX2lzT2JqZWN0KGxvY2FsQ3R4KSAmJiAnQGNvbnRleHQnIGluIGxvY2FsQ3R4KSkge1xuICAgIGxvY2FsQ3R4ID0geydAY29udGV4dCc6IGxvY2FsQ3R4fTtcbiAgfVxuICBfcmV0cmlldmVDb250ZXh0VXJscyhsb2NhbEN0eCwgb3B0aW9ucywgZnVuY3Rpb24oZXJyLCBjdHgpIHtcbiAgICBpZihlcnIpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgLy8gcHJvY2VzcyBjb250ZXh0XG4gICAgICBjdHggPSBuZXcgUHJvY2Vzc29yKCkucHJvY2Vzc0NvbnRleHQoYWN0aXZlQ3R4LCBjdHgsIG9wdGlvbnMpO1xuICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhleCk7XG4gICAgfVxuICAgIGNhbGxiYWNrKG51bGwsIGN0eCk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHN1YmplY3QgaGFzIHRoZSBnaXZlbiBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0gc3ViamVjdCB0aGUgc3ViamVjdCB0byBjaGVjay5cbiAqIEBwYXJhbSBwcm9wZXJ0eSB0aGUgcHJvcGVydHkgdG8gbG9vayBmb3IuXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSBzdWJqZWN0IGhhcyB0aGUgZ2l2ZW4gcHJvcGVydHksIGZhbHNlIGlmIG5vdC5cbiAqL1xuanNvbmxkLmhhc1Byb3BlcnR5ID0gZnVuY3Rpb24oc3ViamVjdCwgcHJvcGVydHkpIHtcbiAgdmFyIHJ2YWwgPSBmYWxzZTtcbiAgaWYocHJvcGVydHkgaW4gc3ViamVjdCkge1xuICAgIHZhciB2YWx1ZSA9IHN1YmplY3RbcHJvcGVydHldO1xuICAgIHJ2YWwgPSAoIV9pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZS5sZW5ndGggPiAwKTtcbiAgfVxuICByZXR1cm4gcnZhbDtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSBwcm9wZXJ0eSBvZiB0aGUgZ2l2ZW4gc3ViamVjdC5cbiAqXG4gKiBAcGFyYW0gc3ViamVjdCB0aGUgc3ViamVjdCB0byBjaGVjay5cbiAqIEBwYXJhbSBwcm9wZXJ0eSB0aGUgcHJvcGVydHkgdG8gY2hlY2suXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgZXhpc3RzLCBmYWxzZSBpZiBub3QuXG4gKi9cbmpzb25sZC5oYXNWYWx1ZSA9IGZ1bmN0aW9uKHN1YmplY3QsIHByb3BlcnR5LCB2YWx1ZSkge1xuICB2YXIgcnZhbCA9IGZhbHNlO1xuICBpZihqc29ubGQuaGFzUHJvcGVydHkoc3ViamVjdCwgcHJvcGVydHkpKSB7XG4gICAgdmFyIHZhbCA9IHN1YmplY3RbcHJvcGVydHldO1xuICAgIHZhciBpc0xpc3QgPSBfaXNMaXN0KHZhbCk7XG4gICAgaWYoX2lzQXJyYXkodmFsKSB8fCBpc0xpc3QpIHtcbiAgICAgIGlmKGlzTGlzdCkge1xuICAgICAgICB2YWwgPSB2YWxbJ0BsaXN0J107XG4gICAgICB9XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdmFsLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmKGpzb25sZC5jb21wYXJlVmFsdWVzKHZhbHVlLCB2YWxbaV0pKSB7XG4gICAgICAgICAgcnZhbCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYoIV9pc0FycmF5KHZhbHVlKSkge1xuICAgICAgLy8gYXZvaWQgbWF0Y2hpbmcgdGhlIHNldCBvZiB2YWx1ZXMgd2l0aCBhbiBhcnJheSB2YWx1ZSBwYXJhbWV0ZXJcbiAgICAgIHJ2YWwgPSBqc29ubGQuY29tcGFyZVZhbHVlcyh2YWx1ZSwgdmFsKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJ2YWw7XG59O1xuXG4vKipcbiAqIEFkZHMgYSB2YWx1ZSB0byBhIHN1YmplY3QuIElmIHRoZSB2YWx1ZSBpcyBhbiBhcnJheSwgYWxsIHZhbHVlcyBpbiB0aGVcbiAqIGFycmF5IHdpbGwgYmUgYWRkZWQuXG4gKlxuICogQHBhcmFtIHN1YmplY3QgdGhlIHN1YmplY3QgdG8gYWRkIHRoZSB2YWx1ZSB0by5cbiAqIEBwYXJhbSBwcm9wZXJ0eSB0aGUgcHJvcGVydHkgdGhhdCByZWxhdGVzIHRoZSB2YWx1ZSB0byB0aGUgc3ViamVjdC5cbiAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gYWRkLlxuICogQHBhcmFtIFtvcHRpb25zXSB0aGUgb3B0aW9ucyB0byB1c2U6XG4gKiAgICAgICAgW3Byb3BlcnR5SXNBcnJheV0gdHJ1ZSBpZiB0aGUgcHJvcGVydHkgaXMgYWx3YXlzIGFuIGFycmF5LCBmYWxzZVxuICogICAgICAgICAgaWYgbm90IChkZWZhdWx0OiBmYWxzZSkuXG4gKiAgICAgICAgW2FsbG93RHVwbGljYXRlXSB0cnVlIHRvIGFsbG93IGR1cGxpY2F0ZXMsIGZhbHNlIG5vdCB0byAodXNlcyBhXG4gKiAgICAgICAgICBzaW1wbGUgc2hhbGxvdyBjb21wYXJpc29uIG9mIHN1YmplY3QgSUQgb3IgdmFsdWUpIChkZWZhdWx0OiB0cnVlKS5cbiAqL1xuanNvbmxkLmFkZFZhbHVlID0gZnVuY3Rpb24oc3ViamVjdCwgcHJvcGVydHksIHZhbHVlLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZighKCdwcm9wZXJ0eUlzQXJyYXknIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5wcm9wZXJ0eUlzQXJyYXkgPSBmYWxzZTtcbiAgfVxuICBpZighKCdhbGxvd0R1cGxpY2F0ZScgaW4gb3B0aW9ucykpIHtcbiAgICBvcHRpb25zLmFsbG93RHVwbGljYXRlID0gdHJ1ZTtcbiAgfVxuXG4gIGlmKF9pc0FycmF5KHZhbHVlKSkge1xuICAgIGlmKHZhbHVlLmxlbmd0aCA9PT0gMCAmJiBvcHRpb25zLnByb3BlcnR5SXNBcnJheSAmJlxuICAgICAgIShwcm9wZXJ0eSBpbiBzdWJqZWN0KSkge1xuICAgICAgc3ViamVjdFtwcm9wZXJ0eV0gPSBbXTtcbiAgICB9XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgKytpKSB7XG4gICAgICBqc29ubGQuYWRkVmFsdWUoc3ViamVjdCwgcHJvcGVydHksIHZhbHVlW2ldLCBvcHRpb25zKTtcbiAgICB9XG4gIH0gZWxzZSBpZihwcm9wZXJ0eSBpbiBzdWJqZWN0KSB7XG4gICAgLy8gY2hlY2sgaWYgc3ViamVjdCBhbHJlYWR5IGhhcyB2YWx1ZSBpZiBkdXBsaWNhdGVzIG5vdCBhbGxvd2VkXG4gICAgdmFyIGhhc1ZhbHVlID0gKCFvcHRpb25zLmFsbG93RHVwbGljYXRlICYmXG4gICAgICBqc29ubGQuaGFzVmFsdWUoc3ViamVjdCwgcHJvcGVydHksIHZhbHVlKSk7XG5cbiAgICAvLyBtYWtlIHByb3BlcnR5IGFuIGFycmF5IGlmIHZhbHVlIG5vdCBwcmVzZW50IG9yIGFsd2F5cyBhbiBhcnJheVxuICAgIGlmKCFfaXNBcnJheShzdWJqZWN0W3Byb3BlcnR5XSkgJiZcbiAgICAgICghaGFzVmFsdWUgfHwgb3B0aW9ucy5wcm9wZXJ0eUlzQXJyYXkpKSB7XG4gICAgICBzdWJqZWN0W3Byb3BlcnR5XSA9IFtzdWJqZWN0W3Byb3BlcnR5XV07XG4gICAgfVxuXG4gICAgLy8gYWRkIG5ldyB2YWx1ZVxuICAgIGlmKCFoYXNWYWx1ZSkge1xuICAgICAgc3ViamVjdFtwcm9wZXJ0eV0ucHVzaCh2YWx1ZSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGFkZCBuZXcgdmFsdWUgYXMgc2V0IG9yIHNpbmdsZSB2YWx1ZVxuICAgIHN1YmplY3RbcHJvcGVydHldID0gb3B0aW9ucy5wcm9wZXJ0eUlzQXJyYXkgPyBbdmFsdWVdIDogdmFsdWU7XG4gIH1cbn07XG5cbi8qKlxuICogR2V0cyBhbGwgb2YgdGhlIHZhbHVlcyBmb3IgYSBzdWJqZWN0J3MgcHJvcGVydHkgYXMgYW4gYXJyYXkuXG4gKlxuICogQHBhcmFtIHN1YmplY3QgdGhlIHN1YmplY3QuXG4gKiBAcGFyYW0gcHJvcGVydHkgdGhlIHByb3BlcnR5LlxuICpcbiAqIEByZXR1cm4gYWxsIG9mIHRoZSB2YWx1ZXMgZm9yIGEgc3ViamVjdCdzIHByb3BlcnR5IGFzIGFuIGFycmF5LlxuICovXG5qc29ubGQuZ2V0VmFsdWVzID0gZnVuY3Rpb24oc3ViamVjdCwgcHJvcGVydHkpIHtcbiAgdmFyIHJ2YWwgPSBzdWJqZWN0W3Byb3BlcnR5XSB8fCBbXTtcbiAgaWYoIV9pc0FycmF5KHJ2YWwpKSB7XG4gICAgcnZhbCA9IFtydmFsXTtcbiAgfVxuICByZXR1cm4gcnZhbDtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIHByb3BlcnR5IGZyb20gYSBzdWJqZWN0LlxuICpcbiAqIEBwYXJhbSBzdWJqZWN0IHRoZSBzdWJqZWN0LlxuICogQHBhcmFtIHByb3BlcnR5IHRoZSBwcm9wZXJ0eS5cbiAqL1xuanNvbmxkLnJlbW92ZVByb3BlcnR5ID0gZnVuY3Rpb24oc3ViamVjdCwgcHJvcGVydHkpIHtcbiAgZGVsZXRlIHN1YmplY3RbcHJvcGVydHldO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgdmFsdWUgZnJvbSBhIHN1YmplY3QuXG4gKlxuICogQHBhcmFtIHN1YmplY3QgdGhlIHN1YmplY3QuXG4gKiBAcGFyYW0gcHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgcmVsYXRlcyB0aGUgdmFsdWUgdG8gdGhlIHN1YmplY3QuXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIHJlbW92ZS5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW3Byb3BlcnR5SXNBcnJheV0gdHJ1ZSBpZiB0aGUgcHJvcGVydHkgaXMgYWx3YXlzIGFuIGFycmF5LCBmYWxzZVxuICogICAgICAgICAgICBpZiBub3QgKGRlZmF1bHQ6IGZhbHNlKS5cbiAqL1xuanNvbmxkLnJlbW92ZVZhbHVlID0gZnVuY3Rpb24oc3ViamVjdCwgcHJvcGVydHksIHZhbHVlLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZighKCdwcm9wZXJ0eUlzQXJyYXknIGluIG9wdGlvbnMpKSB7XG4gICAgb3B0aW9ucy5wcm9wZXJ0eUlzQXJyYXkgPSBmYWxzZTtcbiAgfVxuXG4gIC8vIGZpbHRlciBvdXQgdmFsdWVcbiAgdmFyIHZhbHVlcyA9IGpzb25sZC5nZXRWYWx1ZXMoc3ViamVjdCwgcHJvcGVydHkpLmZpbHRlcihmdW5jdGlvbihlKSB7XG4gICAgcmV0dXJuICFqc29ubGQuY29tcGFyZVZhbHVlcyhlLCB2YWx1ZSk7XG4gIH0pO1xuXG4gIGlmKHZhbHVlcy5sZW5ndGggPT09IDApIHtcbiAgICBqc29ubGQucmVtb3ZlUHJvcGVydHkoc3ViamVjdCwgcHJvcGVydHkpO1xuICB9IGVsc2UgaWYodmFsdWVzLmxlbmd0aCA9PT0gMSAmJiAhb3B0aW9ucy5wcm9wZXJ0eUlzQXJyYXkpIHtcbiAgICBzdWJqZWN0W3Byb3BlcnR5XSA9IHZhbHVlc1swXTtcbiAgfSBlbHNlIHtcbiAgICBzdWJqZWN0W3Byb3BlcnR5XSA9IHZhbHVlcztcbiAgfVxufTtcblxuLyoqXG4gKiBDb21wYXJlcyB0d28gSlNPTi1MRCB2YWx1ZXMgZm9yIGVxdWFsaXR5LiBUd28gSlNPTi1MRCB2YWx1ZXMgd2lsbCBiZVxuICogY29uc2lkZXJlZCBlcXVhbCBpZjpcbiAqXG4gKiAxLiBUaGV5IGFyZSBib3RoIHByaW1pdGl2ZXMgb2YgdGhlIHNhbWUgdHlwZSBhbmQgdmFsdWUuXG4gKiAyLiBUaGV5IGFyZSBib3RoIEB2YWx1ZXMgd2l0aCB0aGUgc2FtZSBAdmFsdWUsIEB0eXBlLCBAbGFuZ3VhZ2UsXG4gKiAgIGFuZCBAaW5kZXgsIE9SXG4gKiAzLiBUaGV5IGJvdGggaGF2ZSBAaWRzIHRoZXkgYXJlIHRoZSBzYW1lLlxuICpcbiAqIEBwYXJhbSB2MSB0aGUgZmlyc3QgdmFsdWUuXG4gKiBAcGFyYW0gdjIgdGhlIHNlY29uZCB2YWx1ZS5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdjEgYW5kIHYyIGFyZSBjb25zaWRlcmVkIGVxdWFsLCBmYWxzZSBpZiBub3QuXG4gKi9cbmpzb25sZC5jb21wYXJlVmFsdWVzID0gZnVuY3Rpb24odjEsIHYyKSB7XG4gIC8vIDEuIGVxdWFsIHByaW1pdGl2ZXNcbiAgaWYodjEgPT09IHYyKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyAyLiBlcXVhbCBAdmFsdWVzXG4gIGlmKF9pc1ZhbHVlKHYxKSAmJiBfaXNWYWx1ZSh2MikgJiZcbiAgICB2MVsnQHZhbHVlJ10gPT09IHYyWydAdmFsdWUnXSAmJlxuICAgIHYxWydAdHlwZSddID09PSB2MlsnQHR5cGUnXSAmJlxuICAgIHYxWydAbGFuZ3VhZ2UnXSA9PT0gdjJbJ0BsYW5ndWFnZSddICYmXG4gICAgdjFbJ0BpbmRleCddID09PSB2MlsnQGluZGV4J10pIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIDMuIGVxdWFsIEBpZHNcbiAgaWYoX2lzT2JqZWN0KHYxKSAmJiAoJ0BpZCcgaW4gdjEpICYmIF9pc09iamVjdCh2MikgJiYgKCdAaWQnIGluIHYyKSkge1xuICAgIHJldHVybiB2MVsnQGlkJ10gPT09IHYyWydAaWQnXTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgdmFsdWUgZm9yIHRoZSBnaXZlbiBhY3RpdmUgY29udGV4dCBrZXkgYW5kIHR5cGUsIG51bGwgaWYgbm9uZSBpc1xuICogc2V0LlxuICpcbiAqIEBwYXJhbSBjdHggdGhlIGFjdGl2ZSBjb250ZXh0LlxuICogQHBhcmFtIGtleSB0aGUgY29udGV4dCBrZXkuXG4gKiBAcGFyYW0gW3R5cGVdIHRoZSB0eXBlIG9mIHZhbHVlIHRvIGdldCAoZWc6ICdAaWQnLCAnQHR5cGUnKSwgaWYgbm90XG4gKiAgICAgICAgICBzcGVjaWZpZWQgZ2V0cyB0aGUgZW50aXJlIGVudHJ5IGZvciBhIGtleSwgbnVsbCBpZiBub3QgZm91bmQuXG4gKlxuICogQHJldHVybiB0aGUgdmFsdWUuXG4gKi9cbmpzb25sZC5nZXRDb250ZXh0VmFsdWUgPSBmdW5jdGlvbihjdHgsIGtleSwgdHlwZSkge1xuICB2YXIgcnZhbCA9IG51bGw7XG5cbiAgLy8gcmV0dXJuIG51bGwgZm9yIGludmFsaWQga2V5XG4gIGlmKGtleSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBydmFsO1xuICB9XG5cbiAgLy8gZ2V0IGRlZmF1bHQgbGFuZ3VhZ2VcbiAgaWYodHlwZSA9PT0gJ0BsYW5ndWFnZScgJiYgKHR5cGUgaW4gY3R4KSkge1xuICAgIHJ2YWwgPSBjdHhbdHlwZV07XG4gIH1cblxuICAvLyBnZXQgc3BlY2lmaWMgZW50cnkgaW5mb3JtYXRpb25cbiAgaWYoY3R4Lm1hcHBpbmdzW2tleV0pIHtcbiAgICB2YXIgZW50cnkgPSBjdHgubWFwcGluZ3Nba2V5XTtcblxuICAgIGlmKF9pc1VuZGVmaW5lZCh0eXBlKSkge1xuICAgICAgLy8gcmV0dXJuIHdob2xlIGVudHJ5XG4gICAgICBydmFsID0gZW50cnk7XG4gICAgfSBlbHNlIGlmKHR5cGUgaW4gZW50cnkpIHtcbiAgICAgIC8vIHJldHVybiBlbnRyeSB2YWx1ZSBmb3IgdHlwZVxuICAgICAgcnZhbCA9IGVudHJ5W3R5cGVdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBydmFsO1xufTtcblxuLyoqIFJlZ2lzdGVyZWQgUkRGIGRhdGFzZXQgcGFyc2VycyBoYXNoZWQgYnkgY29udGVudC10eXBlLiAqL1xudmFyIF9yZGZQYXJzZXJzID0ge307XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIFJERiBkYXRhc2V0IHBhcnNlciBieSBjb250ZW50LXR5cGUsIGZvciB1c2Ugd2l0aFxuICoganNvbmxkLmZyb21SREYuIEFuIFJERiBkYXRhc2V0IHBhcnNlciB3aWxsIGFsd2F5cyBiZSBnaXZlbiB0d28gcGFyYW1ldGVycyxcbiAqIGEgc3RyaW5nIG9mIGlucHV0IGFuZCBhIGNhbGxiYWNrLiBBbiBSREYgZGF0YXNldCBwYXJzZXIgY2FuIGJlIHN5bmNocm9ub3VzXG4gKiBvciBhc3luY2hyb25vdXMuXG4gKlxuICogSWYgdGhlIHBhcnNlciBmdW5jdGlvbiByZXR1cm5zIHVuZGVmaW5lZCBvciBudWxsIHRoZW4gaXQgd2lsbCBiZSBhc3N1bWVkIHRvXG4gKiBiZSBhc3luY2hyb25vdXMgdy9hIGNvbnRpbnVhdGlvbi1wYXNzaW5nIHN0eWxlIGFuZCB0aGUgY2FsbGJhY2sgcGFyYW1ldGVyXG4gKiBnaXZlbiB0byB0aGUgcGFyc2VyIE1VU1QgYmUgaW52b2tlZC5cbiAqXG4gKiBJZiBpdCByZXR1cm5zIGEgUHJvbWlzZSwgdGhlbiBpdCB3aWxsIGJlIGFzc3VtZWQgdG8gYmUgYXN5bmNocm9ub3VzLCBidXQgdGhlXG4gKiBjYWxsYmFjayBwYXJhbWV0ZXIgTVVTVCBOT1QgYmUgaW52b2tlZC4gSXQgc2hvdWxkIGluc3RlYWQgYmUgaWdub3JlZC5cbiAqXG4gKiBJZiBpdCByZXR1cm5zIGFuIFJERiBkYXRhc2V0LCBpdCB3aWxsIGJlIGFzc3VtZWQgdG8gYmUgc3luY2hyb25vdXMgYW5kIHRoZVxuICogY2FsbGJhY2sgcGFyYW1ldGVyIE1VU1QgTk9UIGJlIGludm9rZWQuIEl0IHNob3VsZCBpbnN0ZWFkIGJlIGlnbm9yZWQuXG4gKlxuICogQHBhcmFtIGNvbnRlbnRUeXBlIHRoZSBjb250ZW50LXR5cGUgZm9yIHRoZSBwYXJzZXIuXG4gKiBAcGFyYW0gcGFyc2VyKGlucHV0LCBjYWxsYmFjayhlcnIsIGRhdGFzZXQpKSB0aGUgcGFyc2VyIGZ1bmN0aW9uICh0YWtlcyBhXG4gKiAgICAgICAgICBzdHJpbmcgYXMgYSBwYXJhbWV0ZXIgYW5kIGVpdGhlciByZXR1cm5zIG51bGwvdW5kZWZpbmVkIGFuZCB1c2VzXG4gKiAgICAgICAgICB0aGUgZ2l2ZW4gY2FsbGJhY2ssIHJldHVybnMgYSBQcm9taXNlLCBvciByZXR1cm5zIGFuIFJERiBkYXRhc2V0KS5cbiAqL1xuanNvbmxkLnJlZ2lzdGVyUkRGUGFyc2VyID0gZnVuY3Rpb24oY29udGVudFR5cGUsIHBhcnNlcikge1xuICBfcmRmUGFyc2Vyc1tjb250ZW50VHlwZV0gPSBwYXJzZXI7XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXJzIGFuIFJERiBkYXRhc2V0IHBhcnNlciBieSBjb250ZW50LXR5cGUuXG4gKlxuICogQHBhcmFtIGNvbnRlbnRUeXBlIHRoZSBjb250ZW50LXR5cGUgZm9yIHRoZSBwYXJzZXIuXG4gKi9cbmpzb25sZC51bnJlZ2lzdGVyUkRGUGFyc2VyID0gZnVuY3Rpb24oY29udGVudFR5cGUpIHtcbiAgZGVsZXRlIF9yZGZQYXJzZXJzW2NvbnRlbnRUeXBlXTtcbn07XG5cbmlmKF9ub2RlanMpIHtcbiAgLy8gbmVlZGVkIGZvciBzZXJpYWxpemF0aW9uIG9mIFhNTCBsaXRlcmFsc1xuICBpZih0eXBlb2YgWE1MU2VyaWFsaXplciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2YXIgWE1MU2VyaWFsaXplciA9IG51bGw7XG4gIH1cbiAgaWYodHlwZW9mIE5vZGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIE5vZGUgPSB7XG4gICAgICBFTEVNRU5UX05PREU6IDEsXG4gICAgICBBVFRSSUJVVEVfTk9ERTogMixcbiAgICAgIFRFWFRfTk9ERTogMyxcbiAgICAgIENEQVRBX1NFQ1RJT05fTk9ERTogNCxcbiAgICAgIEVOVElUWV9SRUZFUkVOQ0VfTk9ERTogNSxcbiAgICAgIEVOVElUWV9OT0RFOiA2LFxuICAgICAgUFJPQ0VTU0lOR19JTlNUUlVDVElPTl9OT0RFOiA3LFxuICAgICAgQ09NTUVOVF9OT0RFOiA4LFxuICAgICAgRE9DVU1FTlRfTk9ERTogOSxcbiAgICAgIERPQ1VNRU5UX1RZUEVfTk9ERTogMTAsXG4gICAgICBET0NVTUVOVF9GUkFHTUVOVF9OT0RFOiAxMSxcbiAgICAgIE5PVEFUSU9OX05PREU6MTJcbiAgICB9O1xuICB9XG59XG5cbi8vIGNvbnN0YW50c1xudmFyIFhTRF9CT09MRUFOID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hI2Jvb2xlYW4nO1xudmFyIFhTRF9ET1VCTEUgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEjZG91YmxlJztcbnZhciBYU0RfSU5URUdFUiA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSNpbnRlZ2VyJztcbnZhciBYU0RfU1RSSU5HID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hI3N0cmluZyc7XG5cbnZhciBSREYgPSAnaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc7XG52YXIgUkRGX0xJU1QgPSBSREYgKyAnTGlzdCc7XG52YXIgUkRGX0ZJUlNUID0gUkRGICsgJ2ZpcnN0JztcbnZhciBSREZfUkVTVCA9IFJERiArICdyZXN0JztcbnZhciBSREZfTklMID0gUkRGICsgJ25pbCc7XG52YXIgUkRGX1RZUEUgPSBSREYgKyAndHlwZSc7XG52YXIgUkRGX1BMQUlOX0xJVEVSQUwgPSBSREYgKyAnUGxhaW5MaXRlcmFsJztcbnZhciBSREZfWE1MX0xJVEVSQUwgPSBSREYgKyAnWE1MTGl0ZXJhbCc7XG52YXIgUkRGX09CSkVDVCA9IFJERiArICdvYmplY3QnO1xudmFyIFJERl9MQU5HU1RSSU5HID0gUkRGICsgJ2xhbmdTdHJpbmcnO1xuXG52YXIgTElOS19IRUFERVJfUkVMID0gJ2h0dHA6Ly93d3cudzMub3JnL25zL2pzb24tbGQjY29udGV4dCc7XG52YXIgTUFYX0NPTlRFWFRfVVJMUyA9IDEwO1xuXG4vKipcbiAqIEEgSlNPTi1MRCBFcnJvci5cbiAqXG4gKiBAcGFyYW0gbXNnIHRoZSBlcnJvciBtZXNzYWdlLlxuICogQHBhcmFtIHR5cGUgdGhlIGVycm9yIHR5cGUuXG4gKiBAcGFyYW0gZGV0YWlscyB0aGUgZXJyb3IgZGV0YWlscy5cbiAqL1xudmFyIEpzb25MZEVycm9yID0gZnVuY3Rpb24obXNnLCB0eXBlLCBkZXRhaWxzKSB7XG4gIGlmKF9ub2RlanMpIHtcbiAgICBFcnJvci5jYWxsKHRoaXMpO1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuICB9IGVsc2UgaWYodHlwZW9mIEVycm9yICE9PSAndW5kZWZpbmVkJykge1xuICAgIHRoaXMuc3RhY2sgPSAobmV3IEVycm9yKCkpLnN0YWNrO1xuICB9XG4gIHRoaXMubmFtZSA9IHR5cGUgfHwgJ2pzb25sZC5FcnJvcic7XG4gIHRoaXMubWVzc2FnZSA9IG1zZyB8fCAnQW4gdW5zcGVjaWZpZWQgSlNPTi1MRCBlcnJvciBvY2N1cnJlZC4nO1xuICB0aGlzLmRldGFpbHMgPSBkZXRhaWxzIHx8IHt9O1xufTtcbmlmKF9ub2RlanMpIHtcbiAgcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzKEpzb25MZEVycm9yLCBFcnJvcik7XG59IGVsc2UgaWYodHlwZW9mIEVycm9yICE9PSAndW5kZWZpbmVkJykge1xuICBKc29uTGRFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IEpTT04tTEQgUHJvY2Vzc29yLlxuICovXG52YXIgUHJvY2Vzc29yID0gZnVuY3Rpb24oKSB7fTtcblxuLyoqXG4gKiBSZWN1cnNpdmVseSBjb21wYWN0cyBhbiBlbGVtZW50IHVzaW5nIHRoZSBnaXZlbiBhY3RpdmUgY29udGV4dC4gQWxsIHZhbHVlc1xuICogbXVzdCBiZSBpbiBleHBhbmRlZCBmb3JtIGJlZm9yZSB0aGlzIG1ldGhvZCBpcyBjYWxsZWQuXG4gKlxuICogQHBhcmFtIGFjdGl2ZUN0eCB0aGUgYWN0aXZlIGNvbnRleHQgdG8gdXNlLlxuICogQHBhcmFtIGFjdGl2ZVByb3BlcnR5IHRoZSBjb21wYWN0ZWQgcHJvcGVydHkgYXNzb2NpYXRlZCB3aXRoIHRoZSBlbGVtZW50XG4gKiAgICAgICAgICB0byBjb21wYWN0LCBudWxsIGZvciBub25lLlxuICogQHBhcmFtIGVsZW1lbnQgdGhlIGVsZW1lbnQgdG8gY29tcGFjdC5cbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBjb21wYWN0aW9uIG9wdGlvbnMuXG4gKlxuICogQHJldHVybiB0aGUgY29tcGFjdGVkIHZhbHVlLlxuICovXG5Qcm9jZXNzb3IucHJvdG90eXBlLmNvbXBhY3QgPSBmdW5jdGlvbihcbiAgYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgZWxlbWVudCwgb3B0aW9ucykge1xuICAvLyByZWN1cnNpdmVseSBjb21wYWN0IGFycmF5XG4gIGlmKF9pc0FycmF5KGVsZW1lbnQpKSB7XG4gICAgdmFyIHJ2YWwgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgZWxlbWVudC5sZW5ndGg7ICsraSkge1xuICAgICAgLy8gY29tcGFjdCwgZHJvcHBpbmcgYW55IG51bGwgdmFsdWVzXG4gICAgICB2YXIgY29tcGFjdGVkID0gdGhpcy5jb21wYWN0KFxuICAgICAgICBhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCBlbGVtZW50W2ldLCBvcHRpb25zKTtcbiAgICAgIGlmKGNvbXBhY3RlZCAhPT0gbnVsbCkge1xuICAgICAgICBydmFsLnB1c2goY29tcGFjdGVkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYob3B0aW9ucy5jb21wYWN0QXJyYXlzICYmIHJ2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyB1c2Ugc2luZ2xlIGVsZW1lbnQgaWYgbm8gY29udGFpbmVyIGlzIHNwZWNpZmllZFxuICAgICAgdmFyIGNvbnRhaW5lciA9IGpzb25sZC5nZXRDb250ZXh0VmFsdWUoXG4gICAgICAgIGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksICdAY29udGFpbmVyJyk7XG4gICAgICBpZihjb250YWluZXIgPT09IG51bGwpIHtcbiAgICAgICAgcnZhbCA9IHJ2YWxbMF07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydmFsO1xuICB9XG5cbiAgLy8gcmVjdXJzaXZlbHkgY29tcGFjdCBvYmplY3RcbiAgaWYoX2lzT2JqZWN0KGVsZW1lbnQpKSB7XG4gICAgaWYob3B0aW9ucy5saW5rICYmICdAaWQnIGluIGVsZW1lbnQgJiYgZWxlbWVudFsnQGlkJ10gaW4gb3B0aW9ucy5saW5rKSB7XG4gICAgICAvLyBjaGVjayBmb3IgYSBsaW5rZWQgZWxlbWVudCB0byByZXVzZVxuICAgICAgdmFyIGxpbmtlZCA9IG9wdGlvbnMubGlua1tlbGVtZW50WydAaWQnXV07XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGlua2VkLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmKGxpbmtlZFtpXS5leHBhbmRlZCA9PT0gZWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBsaW5rZWRbaV0uY29tcGFjdGVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZG8gdmFsdWUgY29tcGFjdGlvbiBvbiBAdmFsdWVzIGFuZCBzdWJqZWN0IHJlZmVyZW5jZXNcbiAgICBpZihfaXNWYWx1ZShlbGVtZW50KSB8fCBfaXNTdWJqZWN0UmVmZXJlbmNlKGVsZW1lbnQpKSB7XG4gICAgICB2YXIgcnZhbCA9IF9jb21wYWN0VmFsdWUoYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgZWxlbWVudCk7XG4gICAgICBpZihvcHRpb25zLmxpbmsgJiYgX2lzU3ViamVjdFJlZmVyZW5jZShlbGVtZW50KSkge1xuICAgICAgICAvLyBzdG9yZSBsaW5rZWQgZWxlbWVudFxuICAgICAgICBpZighKGVsZW1lbnRbJ0BpZCddIGluIG9wdGlvbnMubGluaykpIHtcbiAgICAgICAgICBvcHRpb25zLmxpbmtbZWxlbWVudFsnQGlkJ11dID0gW107XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy5saW5rW2VsZW1lbnRbJ0BpZCddXS5wdXNoKHtleHBhbmRlZDogZWxlbWVudCwgY29tcGFjdGVkOiBydmFsfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcnZhbDtcbiAgICB9XG5cbiAgICAvLyBGSVhNRTogYXZvaWQgbWlzdXNlIG9mIGFjdGl2ZSBwcm9wZXJ0eSBhcyBhbiBleHBhbmRlZCBwcm9wZXJ0eT9cbiAgICB2YXIgaW5zaWRlUmV2ZXJzZSA9IChhY3RpdmVQcm9wZXJ0eSA9PT0gJ0ByZXZlcnNlJyk7XG5cbiAgICB2YXIgcnZhbCA9IHt9O1xuXG4gICAgaWYob3B0aW9ucy5saW5rICYmICdAaWQnIGluIGVsZW1lbnQpIHtcbiAgICAgIC8vIHN0b3JlIGxpbmtlZCBlbGVtZW50XG4gICAgICBpZighKGVsZW1lbnRbJ0BpZCddIGluIG9wdGlvbnMubGluaykpIHtcbiAgICAgICAgb3B0aW9ucy5saW5rW2VsZW1lbnRbJ0BpZCddXSA9IFtdO1xuICAgICAgfVxuICAgICAgb3B0aW9ucy5saW5rW2VsZW1lbnRbJ0BpZCddXS5wdXNoKHtleHBhbmRlZDogZWxlbWVudCwgY29tcGFjdGVkOiBydmFsfSk7XG4gICAgfVxuXG4gICAgLy8gcHJvY2VzcyBlbGVtZW50IGtleXMgaW4gb3JkZXJcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGVsZW1lbnQpLnNvcnQoKTtcbiAgICBmb3IodmFyIGtpID0gMDsga2kgPCBrZXlzLmxlbmd0aDsgKytraSkge1xuICAgICAgdmFyIGV4cGFuZGVkUHJvcGVydHkgPSBrZXlzW2tpXTtcbiAgICAgIHZhciBleHBhbmRlZFZhbHVlID0gZWxlbWVudFtleHBhbmRlZFByb3BlcnR5XTtcblxuICAgICAgLy8gY29tcGFjdCBAaWQgYW5kIEB0eXBlKHMpXG4gICAgICBpZihleHBhbmRlZFByb3BlcnR5ID09PSAnQGlkJyB8fCBleHBhbmRlZFByb3BlcnR5ID09PSAnQHR5cGUnKSB7XG4gICAgICAgIHZhciBjb21wYWN0ZWRWYWx1ZTtcblxuICAgICAgICAvLyBjb21wYWN0IHNpbmdsZSBAaWRcbiAgICAgICAgaWYoX2lzU3RyaW5nKGV4cGFuZGVkVmFsdWUpKSB7XG4gICAgICAgICAgY29tcGFjdGVkVmFsdWUgPSBfY29tcGFjdElyaShcbiAgICAgICAgICAgIGFjdGl2ZUN0eCwgZXhwYW5kZWRWYWx1ZSwgbnVsbCxcbiAgICAgICAgICAgIHt2b2NhYjogKGV4cGFuZGVkUHJvcGVydHkgPT09ICdAdHlwZScpfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZXhwYW5kZWQgdmFsdWUgbXVzdCBiZSBhIEB0eXBlIGFycmF5XG4gICAgICAgICAgY29tcGFjdGVkVmFsdWUgPSBbXTtcbiAgICAgICAgICBmb3IodmFyIHZpID0gMDsgdmkgPCBleHBhbmRlZFZhbHVlLmxlbmd0aDsgKyt2aSkge1xuICAgICAgICAgICAgY29tcGFjdGVkVmFsdWUucHVzaChfY29tcGFjdElyaShcbiAgICAgICAgICAgICAgYWN0aXZlQ3R4LCBleHBhbmRlZFZhbHVlW3ZpXSwgbnVsbCwge3ZvY2FiOiB0cnVlfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVzZSBrZXl3b3JkIGFsaWFzIGFuZCBhZGQgdmFsdWVcbiAgICAgICAgdmFyIGFsaWFzID0gX2NvbXBhY3RJcmkoYWN0aXZlQ3R4LCBleHBhbmRlZFByb3BlcnR5KTtcbiAgICAgICAgdmFyIGlzQXJyYXkgPSAoX2lzQXJyYXkoY29tcGFjdGVkVmFsdWUpICYmIGV4cGFuZGVkVmFsdWUubGVuZ3RoID09PSAwKTtcbiAgICAgICAganNvbmxkLmFkZFZhbHVlKFxuICAgICAgICAgIHJ2YWwsIGFsaWFzLCBjb21wYWN0ZWRWYWx1ZSwge3Byb3BlcnR5SXNBcnJheTogaXNBcnJheX0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gaGFuZGxlIEByZXZlcnNlXG4gICAgICBpZihleHBhbmRlZFByb3BlcnR5ID09PSAnQHJldmVyc2UnKSB7XG4gICAgICAgIC8vIHJlY3Vyc2l2ZWx5IGNvbXBhY3QgZXhwYW5kZWQgdmFsdWVcbiAgICAgICAgdmFyIGNvbXBhY3RlZFZhbHVlID0gdGhpcy5jb21wYWN0KFxuICAgICAgICAgIGFjdGl2ZUN0eCwgJ0ByZXZlcnNlJywgZXhwYW5kZWRWYWx1ZSwgb3B0aW9ucyk7XG5cbiAgICAgICAgLy8gaGFuZGxlIGRvdWJsZS1yZXZlcnNlZCBwcm9wZXJ0aWVzXG4gICAgICAgIGZvcih2YXIgY29tcGFjdGVkUHJvcGVydHkgaW4gY29tcGFjdGVkVmFsdWUpIHtcbiAgICAgICAgICBpZihhY3RpdmVDdHgubWFwcGluZ3NbY29tcGFjdGVkUHJvcGVydHldICYmXG4gICAgICAgICAgICBhY3RpdmVDdHgubWFwcGluZ3NbY29tcGFjdGVkUHJvcGVydHldLnJldmVyc2UpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGNvbXBhY3RlZFZhbHVlW2NvbXBhY3RlZFByb3BlcnR5XTtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKFxuICAgICAgICAgICAgICBhY3RpdmVDdHgsIGNvbXBhY3RlZFByb3BlcnR5LCAnQGNvbnRhaW5lcicpO1xuICAgICAgICAgICAgdmFyIHVzZUFycmF5ID0gKGNvbnRhaW5lciA9PT0gJ0BzZXQnIHx8ICFvcHRpb25zLmNvbXBhY3RBcnJheXMpO1xuICAgICAgICAgICAganNvbmxkLmFkZFZhbHVlKFxuICAgICAgICAgICAgICBydmFsLCBjb21wYWN0ZWRQcm9wZXJ0eSwgdmFsdWUsIHtwcm9wZXJ0eUlzQXJyYXk6IHVzZUFycmF5fSk7XG4gICAgICAgICAgICBkZWxldGUgY29tcGFjdGVkVmFsdWVbY29tcGFjdGVkUHJvcGVydHldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmKE9iamVjdC5rZXlzKGNvbXBhY3RlZFZhbHVlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgLy8gdXNlIGtleXdvcmQgYWxpYXMgYW5kIGFkZCB2YWx1ZVxuICAgICAgICAgIHZhciBhbGlhcyA9IF9jb21wYWN0SXJpKGFjdGl2ZUN0eCwgZXhwYW5kZWRQcm9wZXJ0eSk7XG4gICAgICAgICAganNvbmxkLmFkZFZhbHVlKHJ2YWwsIGFsaWFzLCBjb21wYWN0ZWRWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gaGFuZGxlIEBpbmRleCBwcm9wZXJ0eVxuICAgICAgaWYoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BpbmRleCcpIHtcbiAgICAgICAgLy8gZHJvcCBAaW5kZXggaWYgaW5zaWRlIGFuIEBpbmRleCBjb250YWluZXJcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IGpzb25sZC5nZXRDb250ZXh0VmFsdWUoXG4gICAgICAgICAgYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgJ0Bjb250YWluZXInKTtcbiAgICAgICAgaWYoY29udGFpbmVyID09PSAnQGluZGV4Jykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdXNlIGtleXdvcmQgYWxpYXMgYW5kIGFkZCB2YWx1ZVxuICAgICAgICB2YXIgYWxpYXMgPSBfY29tcGFjdElyaShhY3RpdmVDdHgsIGV4cGFuZGVkUHJvcGVydHkpO1xuICAgICAgICBqc29ubGQuYWRkVmFsdWUocnZhbCwgYWxpYXMsIGV4cGFuZGVkVmFsdWUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gc2tpcCBhcnJheSBwcm9jZXNzaW5nIGZvciBrZXl3b3JkcyB0aGF0IGFyZW4ndCBAZ3JhcGggb3IgQGxpc3RcbiAgICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgIT09ICdAZ3JhcGgnICYmIGV4cGFuZGVkUHJvcGVydHkgIT09ICdAbGlzdCcgJiZcbiAgICAgICAgX2lzS2V5d29yZChleHBhbmRlZFByb3BlcnR5KSkge1xuICAgICAgICAvLyB1c2Uga2V5d29yZCBhbGlhcyBhbmQgYWRkIHZhbHVlIGFzIGlzXG4gICAgICAgIHZhciBhbGlhcyA9IF9jb21wYWN0SXJpKGFjdGl2ZUN0eCwgZXhwYW5kZWRQcm9wZXJ0eSk7XG4gICAgICAgIGpzb25sZC5hZGRWYWx1ZShydmFsLCBhbGlhcywgZXhwYW5kZWRWYWx1ZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBOb3RlOiBleHBhbmRlZCB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5IGR1ZSB0byBleHBhbnNpb24gYWxnb3JpdGhtLlxuXG4gICAgICAvLyBwcmVzZXJ2ZSBlbXB0eSBhcnJheXNcbiAgICAgIGlmKGV4cGFuZGVkVmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBpdGVtQWN0aXZlUHJvcGVydHkgPSBfY29tcGFjdElyaShcbiAgICAgICAgICBhY3RpdmVDdHgsIGV4cGFuZGVkUHJvcGVydHksIGV4cGFuZGVkVmFsdWUsIHt2b2NhYjogdHJ1ZX0sXG4gICAgICAgICAgaW5zaWRlUmV2ZXJzZSk7XG4gICAgICAgIGpzb25sZC5hZGRWYWx1ZShcbiAgICAgICAgICBydmFsLCBpdGVtQWN0aXZlUHJvcGVydHksIGV4cGFuZGVkVmFsdWUsIHtwcm9wZXJ0eUlzQXJyYXk6IHRydWV9KTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVjdXNpdmVseSBwcm9jZXNzIGFycmF5IHZhbHVlc1xuICAgICAgZm9yKHZhciB2aSA9IDA7IHZpIDwgZXhwYW5kZWRWYWx1ZS5sZW5ndGg7ICsrdmkpIHtcbiAgICAgICAgdmFyIGV4cGFuZGVkSXRlbSA9IGV4cGFuZGVkVmFsdWVbdmldO1xuXG4gICAgICAgIC8vIGNvbXBhY3QgcHJvcGVydHkgYW5kIGdldCBjb250YWluZXIgdHlwZVxuICAgICAgICB2YXIgaXRlbUFjdGl2ZVByb3BlcnR5ID0gX2NvbXBhY3RJcmkoXG4gICAgICAgICAgYWN0aXZlQ3R4LCBleHBhbmRlZFByb3BlcnR5LCBleHBhbmRlZEl0ZW0sIHt2b2NhYjogdHJ1ZX0sXG4gICAgICAgICAgaW5zaWRlUmV2ZXJzZSk7XG4gICAgICAgIHZhciBjb250YWluZXIgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKFxuICAgICAgICAgIGFjdGl2ZUN0eCwgaXRlbUFjdGl2ZVByb3BlcnR5LCAnQGNvbnRhaW5lcicpO1xuXG4gICAgICAgIC8vIGdldCBAbGlzdCB2YWx1ZSBpZiBhcHByb3ByaWF0ZVxuICAgICAgICB2YXIgaXNMaXN0ID0gX2lzTGlzdChleHBhbmRlZEl0ZW0pO1xuICAgICAgICB2YXIgbGlzdCA9IG51bGw7XG4gICAgICAgIGlmKGlzTGlzdCkge1xuICAgICAgICAgIGxpc3QgPSBleHBhbmRlZEl0ZW1bJ0BsaXN0J107XG4gICAgICAgIH1cblxuICAgICAgICAvLyByZWN1cnNpdmVseSBjb21wYWN0IGV4cGFuZGVkIGl0ZW1cbiAgICAgICAgdmFyIGNvbXBhY3RlZEl0ZW0gPSB0aGlzLmNvbXBhY3QoXG4gICAgICAgICAgYWN0aXZlQ3R4LCBpdGVtQWN0aXZlUHJvcGVydHksIGlzTGlzdCA/IGxpc3QgOiBleHBhbmRlZEl0ZW0sIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIGhhbmRsZSBAbGlzdFxuICAgICAgICBpZihpc0xpc3QpIHtcbiAgICAgICAgICAvLyBlbnN1cmUgQGxpc3QgdmFsdWUgaXMgYW4gYXJyYXlcbiAgICAgICAgICBpZighX2lzQXJyYXkoY29tcGFjdGVkSXRlbSkpIHtcbiAgICAgICAgICAgIGNvbXBhY3RlZEl0ZW0gPSBbY29tcGFjdGVkSXRlbV07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYoY29udGFpbmVyICE9PSAnQGxpc3QnKSB7XG4gICAgICAgICAgICAvLyB3cmFwIHVzaW5nIEBsaXN0IGFsaWFzXG4gICAgICAgICAgICB2YXIgd3JhcHBlciA9IHt9O1xuICAgICAgICAgICAgd3JhcHBlcltfY29tcGFjdElyaShhY3RpdmVDdHgsICdAbGlzdCcpXSA9IGNvbXBhY3RlZEl0ZW07XG4gICAgICAgICAgICBjb21wYWN0ZWRJdGVtID0gd3JhcHBlcjtcblxuICAgICAgICAgICAgLy8gaW5jbHVkZSBAaW5kZXggZnJvbSBleHBhbmRlZCBAbGlzdCwgaWYgYW55XG4gICAgICAgICAgICBpZignQGluZGV4JyBpbiBleHBhbmRlZEl0ZW0pIHtcbiAgICAgICAgICAgICAgY29tcGFjdGVkSXRlbVtfY29tcGFjdElyaShhY3RpdmVDdHgsICdAaW5kZXgnKV0gPVxuICAgICAgICAgICAgICAgIGV4cGFuZGVkSXRlbVsnQGluZGV4J107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmKGl0ZW1BY3RpdmVQcm9wZXJ0eSBpbiBydmFsKSB7XG4gICAgICAgICAgICAvLyBjYW4ndCB1c2UgQGxpc3QgY29udGFpbmVyIGZvciBtb3JlIHRoYW4gMSBsaXN0XG4gICAgICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAgICdKU09OLUxEIGNvbXBhY3QgZXJyb3I7IHByb3BlcnR5IGhhcyBhIFwiQGxpc3RcIiBAY29udGFpbmVyICcgK1xuICAgICAgICAgICAgICAncnVsZSBidXQgdGhlcmUgaXMgbW9yZSB0aGFuIGEgc2luZ2xlIEBsaXN0IHRoYXQgbWF0Y2hlcyAnICtcbiAgICAgICAgICAgICAgJ3RoZSBjb21wYWN0ZWQgdGVybSBpbiB0aGUgZG9jdW1lbnQuIENvbXBhY3Rpb24gbWlnaHQgbWl4ICcgK1xuICAgICAgICAgICAgICAndW53YW50ZWQgaXRlbXMgaW50byB0aGUgbGlzdC4nLFxuICAgICAgICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdjb21wYWN0aW9uIHRvIGxpc3Qgb2YgbGlzdHMnfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaGFuZGxlIGxhbmd1YWdlIGFuZCBpbmRleCBtYXBzXG4gICAgICAgIGlmKGNvbnRhaW5lciA9PT0gJ0BsYW5ndWFnZScgfHwgY29udGFpbmVyID09PSAnQGluZGV4Jykge1xuICAgICAgICAgIC8vIGdldCBvciBjcmVhdGUgdGhlIG1hcCBvYmplY3RcbiAgICAgICAgICB2YXIgbWFwT2JqZWN0O1xuICAgICAgICAgIGlmKGl0ZW1BY3RpdmVQcm9wZXJ0eSBpbiBydmFsKSB7XG4gICAgICAgICAgICBtYXBPYmplY3QgPSBydmFsW2l0ZW1BY3RpdmVQcm9wZXJ0eV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJ2YWxbaXRlbUFjdGl2ZVByb3BlcnR5XSA9IG1hcE9iamVjdCA9IHt9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGlmIGNvbnRhaW5lciBpcyBhIGxhbmd1YWdlIG1hcCwgc2ltcGxpZnkgY29tcGFjdGVkIHZhbHVlIHRvXG4gICAgICAgICAgLy8gYSBzaW1wbGUgc3RyaW5nXG4gICAgICAgICAgaWYoY29udGFpbmVyID09PSAnQGxhbmd1YWdlJyAmJiBfaXNWYWx1ZShjb21wYWN0ZWRJdGVtKSkge1xuICAgICAgICAgICAgY29tcGFjdGVkSXRlbSA9IGNvbXBhY3RlZEl0ZW1bJ0B2YWx1ZSddO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGFkZCBjb21wYWN0IHZhbHVlIHRvIG1hcCBvYmplY3QgdXNpbmcga2V5IGZyb20gZXhwYW5kZWQgdmFsdWVcbiAgICAgICAgICAvLyBiYXNlZCBvbiB0aGUgY29udGFpbmVyIHR5cGVcbiAgICAgICAgICBqc29ubGQuYWRkVmFsdWUobWFwT2JqZWN0LCBleHBhbmRlZEl0ZW1bY29udGFpbmVyXSwgY29tcGFjdGVkSXRlbSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdXNlIGFuIGFycmF5IGlmOiBjb21wYWN0QXJyYXlzIGZsYWcgaXMgZmFsc2UsXG4gICAgICAgICAgLy8gQGNvbnRhaW5lciBpcyBAc2V0IG9yIEBsaXN0ICwgdmFsdWUgaXMgYW4gZW1wdHlcbiAgICAgICAgICAvLyBhcnJheSwgb3Iga2V5IGlzIEBncmFwaFxuICAgICAgICAgIHZhciBpc0FycmF5ID0gKCFvcHRpb25zLmNvbXBhY3RBcnJheXMgfHwgY29udGFpbmVyID09PSAnQHNldCcgfHxcbiAgICAgICAgICAgIGNvbnRhaW5lciA9PT0gJ0BsaXN0JyB8fFxuICAgICAgICAgICAgKF9pc0FycmF5KGNvbXBhY3RlZEl0ZW0pICYmIGNvbXBhY3RlZEl0ZW0ubGVuZ3RoID09PSAwKSB8fFxuICAgICAgICAgICAgZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BsaXN0JyB8fCBleHBhbmRlZFByb3BlcnR5ID09PSAnQGdyYXBoJyk7XG5cbiAgICAgICAgICAvLyBhZGQgY29tcGFjdCB2YWx1ZVxuICAgICAgICAgIGpzb25sZC5hZGRWYWx1ZShcbiAgICAgICAgICAgIHJ2YWwsIGl0ZW1BY3RpdmVQcm9wZXJ0eSwgY29tcGFjdGVkSXRlbSxcbiAgICAgICAgICAgIHtwcm9wZXJ0eUlzQXJyYXk6IGlzQXJyYXl9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBydmFsO1xuICB9XG5cbiAgLy8gb25seSBwcmltaXRpdmVzIHJlbWFpbiB3aGljaCBhcmUgYWxyZWFkeSBjb21wYWN0XG4gIHJldHVybiBlbGVtZW50O1xufTtcblxuLyoqXG4gKiBSZWN1cnNpdmVseSBleHBhbmRzIGFuIGVsZW1lbnQgdXNpbmcgdGhlIGdpdmVuIGNvbnRleHQuIEFueSBjb250ZXh0IGluXG4gKiB0aGUgZWxlbWVudCB3aWxsIGJlIHJlbW92ZWQuIEFsbCBjb250ZXh0IFVSTHMgbXVzdCBoYXZlIGJlZW4gcmV0cmlldmVkXG4gKiBiZWZvcmUgY2FsbGluZyB0aGlzIG1ldGhvZC5cbiAqXG4gKiBAcGFyYW0gYWN0aXZlQ3R4IHRoZSBjb250ZXh0IHRvIHVzZS5cbiAqIEBwYXJhbSBhY3RpdmVQcm9wZXJ0eSB0aGUgcHJvcGVydHkgZm9yIHRoZSBlbGVtZW50LCBudWxsIGZvciBub25lLlxuICogQHBhcmFtIGVsZW1lbnQgdGhlIGVsZW1lbnQgdG8gZXhwYW5kLlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIGV4cGFuc2lvbiBvcHRpb25zLlxuICogQHBhcmFtIGluc2lkZUxpc3QgdHJ1ZSBpZiB0aGUgZWxlbWVudCBpcyBhIGxpc3QsIGZhbHNlIGlmIG5vdC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBleHBhbmRlZCB2YWx1ZS5cbiAqL1xuUHJvY2Vzc29yLnByb3RvdHlwZS5leHBhbmQgPSBmdW5jdGlvbihcbiAgYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgZWxlbWVudCwgb3B0aW9ucywgaW5zaWRlTGlzdCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gbm90aGluZyB0byBleHBhbmRcbiAgaWYoZWxlbWVudCA9PT0gbnVsbCB8fCBlbGVtZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmKCFfaXNBcnJheShlbGVtZW50KSAmJiAhX2lzT2JqZWN0KGVsZW1lbnQpKSB7XG4gICAgLy8gZHJvcCBmcmVlLWZsb2F0aW5nIHNjYWxhcnMgdGhhdCBhcmUgbm90IGluIGxpc3RzXG4gICAgaWYoIWluc2lkZUxpc3QgJiYgKGFjdGl2ZVByb3BlcnR5ID09PSBudWxsIHx8XG4gICAgICBfZXhwYW5kSXJpKGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksIHt2b2NhYjogdHJ1ZX0pID09PSAnQGdyYXBoJykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIGV4cGFuZCBlbGVtZW50IGFjY29yZGluZyB0byB2YWx1ZSBleHBhbnNpb24gcnVsZXNcbiAgICByZXR1cm4gX2V4cGFuZFZhbHVlKGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksIGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gcmVjdXJzaXZlbHkgZXhwYW5kIGFycmF5XG4gIGlmKF9pc0FycmF5KGVsZW1lbnQpKSB7XG4gICAgdmFyIHJ2YWwgPSBbXTtcbiAgICB2YXIgY29udGFpbmVyID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShcbiAgICAgIGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksICdAY29udGFpbmVyJyk7XG4gICAgaW5zaWRlTGlzdCA9IGluc2lkZUxpc3QgfHwgY29udGFpbmVyID09PSAnQGxpc3QnO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBlbGVtZW50Lmxlbmd0aDsgKytpKSB7XG4gICAgICAvLyBleHBhbmQgZWxlbWVudFxuICAgICAgdmFyIGUgPSBzZWxmLmV4cGFuZChhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCBlbGVtZW50W2ldLCBvcHRpb25zKTtcbiAgICAgIGlmKGluc2lkZUxpc3QgJiYgKF9pc0FycmF5KGUpIHx8IF9pc0xpc3QoZSkpKSB7XG4gICAgICAgIC8vIGxpc3RzIG9mIGxpc3RzIGFyZSBpbGxlZ2FsXG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgbGlzdHMgb2YgbGlzdHMgYXJlIG5vdCBwZXJtaXR0ZWQuJyxcbiAgICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdsaXN0IG9mIGxpc3RzJ30pO1xuICAgICAgfVxuICAgICAgLy8gZHJvcCBudWxsIHZhbHVlc1xuICAgICAgaWYoZSAhPT0gbnVsbCkge1xuICAgICAgICBpZihfaXNBcnJheShlKSkge1xuICAgICAgICAgIHJ2YWwgPSBydmFsLmNvbmNhdChlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBydmFsLnB1c2goZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2YWw7XG4gIH1cblxuICAvLyByZWN1cnNpdmVseSBleHBhbmQgb2JqZWN0OlxuXG4gIC8vIGlmIGVsZW1lbnQgaGFzIGEgY29udGV4dCwgcHJvY2VzcyBpdFxuICBpZignQGNvbnRleHQnIGluIGVsZW1lbnQpIHtcbiAgICBhY3RpdmVDdHggPSBzZWxmLnByb2Nlc3NDb250ZXh0KGFjdGl2ZUN0eCwgZWxlbWVudFsnQGNvbnRleHQnXSwgb3B0aW9ucyk7XG4gIH1cblxuICAvLyBleHBhbmQgdGhlIGFjdGl2ZSBwcm9wZXJ0eVxuICB2YXIgZXhwYW5kZWRBY3RpdmVQcm9wZXJ0eSA9IF9leHBhbmRJcmkoXG4gICAgYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwge3ZvY2FiOiB0cnVlfSk7XG5cbiAgdmFyIHJ2YWwgPSB7fTtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhlbGVtZW50KS5zb3J0KCk7XG4gIGZvcih2YXIga2kgPSAwOyBraSA8IGtleXMubGVuZ3RoOyArK2tpKSB7XG4gICAgdmFyIGtleSA9IGtleXNba2ldO1xuICAgIHZhciB2YWx1ZSA9IGVsZW1lbnRba2V5XTtcbiAgICB2YXIgZXhwYW5kZWRWYWx1ZTtcblxuICAgIC8vIHNraXAgQGNvbnRleHRcbiAgICBpZihrZXkgPT09ICdAY29udGV4dCcpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGV4cGFuZCBwcm9wZXJ0eVxuICAgIHZhciBleHBhbmRlZFByb3BlcnR5ID0gX2V4cGFuZElyaShhY3RpdmVDdHgsIGtleSwge3ZvY2FiOiB0cnVlfSk7XG5cbiAgICAvLyBkcm9wIG5vbi1hYnNvbHV0ZSBJUkkga2V5cyB0aGF0IGFyZW4ndCBrZXl3b3Jkc1xuICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgPT09IG51bGwgfHxcbiAgICAgICEoX2lzQWJzb2x1dGVJcmkoZXhwYW5kZWRQcm9wZXJ0eSkgfHwgX2lzS2V5d29yZChleHBhbmRlZFByb3BlcnR5KSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmKF9pc0tleXdvcmQoZXhwYW5kZWRQcm9wZXJ0eSkpIHtcbiAgICAgIGlmKGV4cGFuZGVkQWN0aXZlUHJvcGVydHkgPT09ICdAcmV2ZXJzZScpIHtcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhIGtleXdvcmQgY2Fubm90IGJlIHVzZWQgYXMgYSBAcmV2ZXJzZSAnICtcbiAgICAgICAgICAncHJvcGVydHkuJywgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdpbnZhbGlkIHJldmVyc2UgcHJvcGVydHkgbWFwJywgdmFsdWU6IHZhbHVlfSk7XG4gICAgICB9XG4gICAgICBpZihleHBhbmRlZFByb3BlcnR5IGluIHJ2YWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBjb2xsaWRpbmcga2V5d29yZHMgZGV0ZWN0ZWQuJyxcbiAgICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAgICB7Y29kZTogJ2NvbGxpZGluZyBrZXl3b3JkcycsIGtleXdvcmQ6IGV4cGFuZGVkUHJvcGVydHl9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzeW50YXggZXJyb3IgaWYgQGlkIGlzIG5vdCBhIHN0cmluZ1xuICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgPT09ICdAaWQnICYmICFfaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICBpZighb3B0aW9ucy5pc0ZyYW1lKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAaWRcIiB2YWx1ZSBtdXN0IGEgc3RyaW5nLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCBAaWQgdmFsdWUnLCB2YWx1ZTogdmFsdWV9KTtcbiAgICAgIH1cbiAgICAgIGlmKCFfaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAaWRcIiB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nIG9yIGFuICcgK1xuICAgICAgICAgICdvYmplY3QuJywgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdpbnZhbGlkIEBpZCB2YWx1ZScsIHZhbHVlOiB2YWx1ZX0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgPT09ICdAdHlwZScpIHtcbiAgICAgIF92YWxpZGF0ZVR5cGVWYWx1ZSh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLy8gQGdyYXBoIG11c3QgYmUgYW4gYXJyYXkgb3IgYW4gb2JqZWN0XG4gICAgaWYoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BncmFwaCcgJiZcbiAgICAgICEoX2lzT2JqZWN0KHZhbHVlKSB8fCBfaXNBcnJheSh2YWx1ZSkpKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBcIkBncmFwaFwiIHZhbHVlIG11c3Qgbm90IGJlIGFuICcgK1xuICAgICAgICAnb2JqZWN0IG9yIGFuIGFycmF5LicsXG4gICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgQGdyYXBoIHZhbHVlJywgdmFsdWU6IHZhbHVlfSk7XG4gICAgfVxuXG4gICAgLy8gQHZhbHVlIG11c3Qgbm90IGJlIGFuIG9iamVjdCBvciBhbiBhcnJheVxuICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgPT09ICdAdmFsdWUnICYmXG4gICAgICAoX2lzT2JqZWN0KHZhbHVlKSB8fCBfaXNBcnJheSh2YWx1ZSkpKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBcIkB2YWx1ZVwiIHZhbHVlIG11c3Qgbm90IGJlIGFuICcgK1xuICAgICAgICAnb2JqZWN0IG9yIGFuIGFycmF5LicsXG4gICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICB7Y29kZTogJ2ludmFsaWQgdmFsdWUgb2JqZWN0IHZhbHVlJywgdmFsdWU6IHZhbHVlfSk7XG4gICAgfVxuXG4gICAgLy8gQGxhbmd1YWdlIG11c3QgYmUgYSBzdHJpbmdcbiAgICBpZihleHBhbmRlZFByb3BlcnR5ID09PSAnQGxhbmd1YWdlJykge1xuICAgICAgaWYodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgLy8gZHJvcCBudWxsIEBsYW5ndWFnZSB2YWx1ZXMsIHRoZXkgZXhwYW5kIGFzIGlmIHRoZXkgZGlkbid0IGV4aXN0XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYoIV9pc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBcIkBsYW5ndWFnZVwiIHZhbHVlIG11c3QgYmUgYSBzdHJpbmcuJyxcbiAgICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAgICB7Y29kZTogJ2ludmFsaWQgbGFuZ3VhZ2UtdGFnZ2VkIHN0cmluZycsIHZhbHVlOiB2YWx1ZX0pO1xuICAgICAgfVxuICAgICAgLy8gZW5zdXJlIGxhbmd1YWdlIHZhbHVlIGlzIGxvd2VyY2FzZVxuICAgICAgdmFsdWUgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxuICAgIC8vIEBpbmRleCBtdXN0IGJlIGEgc3RyaW5nXG4gICAgaWYoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BpbmRleCcpIHtcbiAgICAgIGlmKCFfaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAaW5kZXhcIiB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdpbnZhbGlkIEBpbmRleCB2YWx1ZScsIHZhbHVlOiB2YWx1ZX0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEByZXZlcnNlIG11c3QgYmUgYW4gb2JqZWN0XG4gICAgaWYoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0ByZXZlcnNlJykge1xuICAgICAgaWYoIV9pc09iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBcIkByZXZlcnNlXCIgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3QuJyxcbiAgICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdpbnZhbGlkIEByZXZlcnNlIHZhbHVlJywgdmFsdWU6IHZhbHVlfSk7XG4gICAgICB9XG5cbiAgICAgIGV4cGFuZGVkVmFsdWUgPSBzZWxmLmV4cGFuZChhY3RpdmVDdHgsICdAcmV2ZXJzZScsIHZhbHVlLCBvcHRpb25zKTtcblxuICAgICAgLy8gcHJvcGVydGllcyBkb3VibGUtcmV2ZXJzZWRcbiAgICAgIGlmKCdAcmV2ZXJzZScgaW4gZXhwYW5kZWRWYWx1ZSkge1xuICAgICAgICBmb3IodmFyIHByb3BlcnR5IGluIGV4cGFuZGVkVmFsdWVbJ0ByZXZlcnNlJ10pIHtcbiAgICAgICAgICBqc29ubGQuYWRkVmFsdWUoXG4gICAgICAgICAgICBydmFsLCBwcm9wZXJ0eSwgZXhwYW5kZWRWYWx1ZVsnQHJldmVyc2UnXVtwcm9wZXJ0eV0sXG4gICAgICAgICAgICB7cHJvcGVydHlJc0FycmF5OiB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRklYTUU6IGNhbiB0aGlzIGJlIG1lcmdlZCB3aXRoIGNvZGUgYmVsb3cgdG8gc2ltcGxpZnk/XG4gICAgICAvLyBtZXJnZSBpbiBhbGwgcmV2ZXJzZWQgcHJvcGVydGllc1xuICAgICAgdmFyIHJldmVyc2VNYXAgPSBydmFsWydAcmV2ZXJzZSddIHx8IG51bGw7XG4gICAgICBmb3IodmFyIHByb3BlcnR5IGluIGV4cGFuZGVkVmFsdWUpIHtcbiAgICAgICAgaWYocHJvcGVydHkgPT09ICdAcmV2ZXJzZScpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZihyZXZlcnNlTWFwID09PSBudWxsKSB7XG4gICAgICAgICAgcmV2ZXJzZU1hcCA9IHJ2YWxbJ0ByZXZlcnNlJ10gPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBqc29ubGQuYWRkVmFsdWUocmV2ZXJzZU1hcCwgcHJvcGVydHksIFtdLCB7cHJvcGVydHlJc0FycmF5OiB0cnVlfSk7XG4gICAgICAgIHZhciBpdGVtcyA9IGV4cGFuZGVkVmFsdWVbcHJvcGVydHldO1xuICAgICAgICBmb3IodmFyIGlpID0gMDsgaWkgPCBpdGVtcy5sZW5ndGg7ICsraWkpIHtcbiAgICAgICAgICB2YXIgaXRlbSA9IGl0ZW1zW2lpXTtcbiAgICAgICAgICBpZihfaXNWYWx1ZShpdGVtKSB8fCBfaXNMaXN0KGl0ZW0pKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBcIkByZXZlcnNlXCIgdmFsdWUgbXVzdCBub3QgYmUgYSAnICtcbiAgICAgICAgICAgICAgJ0B2YWx1ZSBvciBhbiBAbGlzdC4nLCAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAgICAgICAge2NvZGU6ICdpbnZhbGlkIHJldmVyc2UgcHJvcGVydHkgdmFsdWUnLCB2YWx1ZTogZXhwYW5kZWRWYWx1ZX0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBqc29ubGQuYWRkVmFsdWUoXG4gICAgICAgICAgICByZXZlcnNlTWFwLCBwcm9wZXJ0eSwgaXRlbSwge3Byb3BlcnR5SXNBcnJheTogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHZhciBjb250YWluZXIgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKGFjdGl2ZUN0eCwga2V5LCAnQGNvbnRhaW5lcicpO1xuXG4gICAgaWYoY29udGFpbmVyID09PSAnQGxhbmd1YWdlJyAmJiBfaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAvLyBoYW5kbGUgbGFuZ3VhZ2UgbWFwIGNvbnRhaW5lciAoc2tpcCBpZiB2YWx1ZSBpcyBub3QgYW4gb2JqZWN0KVxuICAgICAgZXhwYW5kZWRWYWx1ZSA9IF9leHBhbmRMYW5ndWFnZU1hcCh2YWx1ZSk7XG4gICAgfSBlbHNlIGlmKGNvbnRhaW5lciA9PT0gJ0BpbmRleCcgJiYgX2lzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgLy8gaGFuZGxlIGluZGV4IGNvbnRhaW5lciAoc2tpcCBpZiB2YWx1ZSBpcyBub3QgYW4gb2JqZWN0KVxuICAgICAgZXhwYW5kZWRWYWx1ZSA9IChmdW5jdGlvbiBfZXhwYW5kSW5kZXhNYXAoYWN0aXZlUHJvcGVydHkpIHtcbiAgICAgICAgdmFyIHJ2YWwgPSBbXTtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSkuc29ydCgpO1xuICAgICAgICBmb3IodmFyIGtpID0gMDsga2kgPCBrZXlzLmxlbmd0aDsgKytraSkge1xuICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2tpXTtcbiAgICAgICAgICB2YXIgdmFsID0gdmFsdWVba2V5XTtcbiAgICAgICAgICBpZighX2lzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgdmFsID0gW3ZhbF07XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhbCA9IHNlbGYuZXhwYW5kKGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksIHZhbCwgb3B0aW9ucywgZmFsc2UpO1xuICAgICAgICAgIGZvcih2YXIgdmkgPSAwOyB2aSA8IHZhbC5sZW5ndGg7ICsrdmkpIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gdmFsW3ZpXTtcbiAgICAgICAgICAgIGlmKCEoJ0BpbmRleCcgaW4gaXRlbSkpIHtcbiAgICAgICAgICAgICAgaXRlbVsnQGluZGV4J10gPSBrZXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBydmFsLnB1c2goaXRlbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBydmFsO1xuICAgICAgfSkoa2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gcmVjdXJzZSBpbnRvIEBsaXN0IG9yIEBzZXRcbiAgICAgIHZhciBpc0xpc3QgPSAoZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BsaXN0Jyk7XG4gICAgICBpZihpc0xpc3QgfHwgZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BzZXQnKSB7XG4gICAgICAgIHZhciBuZXh0QWN0aXZlUHJvcGVydHkgPSBhY3RpdmVQcm9wZXJ0eTtcbiAgICAgICAgaWYoaXNMaXN0ICYmIGV4cGFuZGVkQWN0aXZlUHJvcGVydHkgPT09ICdAZ3JhcGgnKSB7XG4gICAgICAgICAgbmV4dEFjdGl2ZVByb3BlcnR5ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBleHBhbmRlZFZhbHVlID0gc2VsZi5leHBhbmQoXG4gICAgICAgICAgYWN0aXZlQ3R4LCBuZXh0QWN0aXZlUHJvcGVydHksIHZhbHVlLCBvcHRpb25zLCBpc0xpc3QpO1xuICAgICAgICBpZihpc0xpc3QgJiYgX2lzTGlzdChleHBhbmRlZFZhbHVlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBsaXN0cyBvZiBsaXN0cyBhcmUgbm90IHBlcm1pdHRlZC4nLFxuICAgICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnbGlzdCBvZiBsaXN0cyd9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcmVjdXJzaXZlbHkgZXhwYW5kIHZhbHVlIHdpdGgga2V5IGFzIG5ldyBhY3RpdmUgcHJvcGVydHlcbiAgICAgICAgZXhwYW5kZWRWYWx1ZSA9IHNlbGYuZXhwYW5kKGFjdGl2ZUN0eCwga2V5LCB2YWx1ZSwgb3B0aW9ucywgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRyb3AgbnVsbCB2YWx1ZXMgaWYgcHJvcGVydHkgaXMgbm90IEB2YWx1ZVxuICAgIGlmKGV4cGFuZGVkVmFsdWUgPT09IG51bGwgJiYgZXhwYW5kZWRQcm9wZXJ0eSAhPT0gJ0B2YWx1ZScpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGNvbnZlcnQgZXhwYW5kZWQgdmFsdWUgdG8gQGxpc3QgaWYgY29udGFpbmVyIHNwZWNpZmllcyBpdFxuICAgIGlmKGV4cGFuZGVkUHJvcGVydHkgIT09ICdAbGlzdCcgJiYgIV9pc0xpc3QoZXhwYW5kZWRWYWx1ZSkgJiZcbiAgICAgIGNvbnRhaW5lciA9PT0gJ0BsaXN0Jykge1xuICAgICAgLy8gZW5zdXJlIGV4cGFuZGVkIHZhbHVlIGlzIGFuIGFycmF5XG4gICAgICBleHBhbmRlZFZhbHVlID0gKF9pc0FycmF5KGV4cGFuZGVkVmFsdWUpID9cbiAgICAgICAgZXhwYW5kZWRWYWx1ZSA6IFtleHBhbmRlZFZhbHVlXSk7XG4gICAgICBleHBhbmRlZFZhbHVlID0geydAbGlzdCc6IGV4cGFuZGVkVmFsdWV9O1xuICAgIH1cblxuICAgIC8vIEZJWE1FOiBjYW4gdGhpcyBiZSBtZXJnZWQgd2l0aCBjb2RlIGFib3ZlIHRvIHNpbXBsaWZ5P1xuICAgIC8vIG1lcmdlIGluIHJldmVyc2UgcHJvcGVydGllc1xuICAgIGlmKGFjdGl2ZUN0eC5tYXBwaW5nc1trZXldICYmIGFjdGl2ZUN0eC5tYXBwaW5nc1trZXldLnJldmVyc2UpIHtcbiAgICAgIHZhciByZXZlcnNlTWFwID0gcnZhbFsnQHJldmVyc2UnXSA9IHJ2YWxbJ0ByZXZlcnNlJ10gfHwge307XG4gICAgICBpZighX2lzQXJyYXkoZXhwYW5kZWRWYWx1ZSkpIHtcbiAgICAgICAgZXhwYW5kZWRWYWx1ZSA9IFtleHBhbmRlZFZhbHVlXTtcbiAgICAgIH1cbiAgICAgIGZvcih2YXIgaWkgPSAwOyBpaSA8IGV4cGFuZGVkVmFsdWUubGVuZ3RoOyArK2lpKSB7XG4gICAgICAgIHZhciBpdGVtID0gZXhwYW5kZWRWYWx1ZVtpaV07XG4gICAgICAgIGlmKF9pc1ZhbHVlKGl0ZW0pIHx8IF9pc0xpc3QoaXRlbSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAcmV2ZXJzZVwiIHZhbHVlIG11c3Qgbm90IGJlIGEgJyArXG4gICAgICAgICAgICAnQHZhbHVlIG9yIGFuIEBsaXN0LicsICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICAgICAge2NvZGU6ICdpbnZhbGlkIHJldmVyc2UgcHJvcGVydHkgdmFsdWUnLCB2YWx1ZTogZXhwYW5kZWRWYWx1ZX0pO1xuICAgICAgICB9XG4gICAgICAgIGpzb25sZC5hZGRWYWx1ZShcbiAgICAgICAgICByZXZlcnNlTWFwLCBleHBhbmRlZFByb3BlcnR5LCBpdGVtLCB7cHJvcGVydHlJc0FycmF5OiB0cnVlfSk7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdmFsdWUgZm9yIHByb3BlcnR5XG4gICAgLy8gdXNlIGFuIGFycmF5IGV4Y2VwdCBmb3IgY2VydGFpbiBrZXl3b3Jkc1xuICAgIHZhciB1c2VBcnJheSA9XG4gICAgICBbJ0BpbmRleCcsICdAaWQnLCAnQHR5cGUnLCAnQHZhbHVlJywgJ0BsYW5ndWFnZSddLmluZGV4T2YoXG4gICAgICAgIGV4cGFuZGVkUHJvcGVydHkpID09PSAtMTtcbiAgICBqc29ubGQuYWRkVmFsdWUoXG4gICAgICBydmFsLCBleHBhbmRlZFByb3BlcnR5LCBleHBhbmRlZFZhbHVlLCB7cHJvcGVydHlJc0FycmF5OiB1c2VBcnJheX0pO1xuICB9XG5cbiAgLy8gZ2V0IHByb3BlcnR5IGNvdW50IG9uIGV4cGFuZGVkIG91dHB1dFxuICBrZXlzID0gT2JqZWN0LmtleXMocnZhbCk7XG4gIHZhciBjb3VudCA9IGtleXMubGVuZ3RoO1xuXG4gIGlmKCdAdmFsdWUnIGluIHJ2YWwpIHtcbiAgICAvLyBAdmFsdWUgbXVzdCBvbmx5IGhhdmUgQGxhbmd1YWdlIG9yIEB0eXBlXG4gICAgaWYoJ0B0eXBlJyBpbiBydmFsICYmICdAbGFuZ3VhZ2UnIGluIHJ2YWwpIHtcbiAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGFuIGVsZW1lbnQgY29udGFpbmluZyBcIkB2YWx1ZVwiIG1heSBub3QgJyArXG4gICAgICAgICdjb250YWluIGJvdGggXCJAdHlwZVwiIGFuZCBcIkBsYW5ndWFnZVwiLicsXG4gICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgdmFsdWUgb2JqZWN0JywgZWxlbWVudDogcnZhbH0pO1xuICAgIH1cbiAgICB2YXIgdmFsaWRDb3VudCA9IGNvdW50IC0gMTtcbiAgICBpZignQHR5cGUnIGluIHJ2YWwpIHtcbiAgICAgIHZhbGlkQ291bnQgLT0gMTtcbiAgICB9XG4gICAgaWYoJ0BpbmRleCcgaW4gcnZhbCkge1xuICAgICAgdmFsaWRDb3VudCAtPSAxO1xuICAgIH1cbiAgICBpZignQGxhbmd1YWdlJyBpbiBydmFsKSB7XG4gICAgICB2YWxpZENvdW50IC09IDE7XG4gICAgfVxuICAgIGlmKHZhbGlkQ291bnQgIT09IDApIHtcbiAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGFuIGVsZW1lbnQgY29udGFpbmluZyBcIkB2YWx1ZVwiIG1heSBvbmx5ICcgK1xuICAgICAgICAnaGF2ZSBhbiBcIkBpbmRleFwiIHByb3BlcnR5IGFuZCBhdCBtb3N0IG9uZSBvdGhlciBwcm9wZXJ0eSAnICtcbiAgICAgICAgJ3doaWNoIGNhbiBiZSBcIkB0eXBlXCIgb3IgXCJAbGFuZ3VhZ2VcIi4nLFxuICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdpbnZhbGlkIHZhbHVlIG9iamVjdCcsIGVsZW1lbnQ6IHJ2YWx9KTtcbiAgICB9XG4gICAgLy8gZHJvcCBudWxsIEB2YWx1ZXNcbiAgICBpZihydmFsWydAdmFsdWUnXSA9PT0gbnVsbCkge1xuICAgICAgcnZhbCA9IG51bGw7XG4gICAgfSBlbHNlIGlmKCdAbGFuZ3VhZ2UnIGluIHJ2YWwgJiYgIV9pc1N0cmluZyhydmFsWydAdmFsdWUnXSkpIHtcbiAgICAgIC8vIGlmIEBsYW5ndWFnZSBpcyBwcmVzZW50LCBAdmFsdWUgbXVzdCBiZSBhIHN0cmluZ1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgb25seSBzdHJpbmdzIG1heSBiZSBsYW5ndWFnZS10YWdnZWQuJyxcbiAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgIHtjb2RlOiAnaW52YWxpZCBsYW5ndWFnZS10YWdnZWQgdmFsdWUnLCBlbGVtZW50OiBydmFsfSk7XG4gICAgfSBlbHNlIGlmKCdAdHlwZScgaW4gcnZhbCAmJiAoIV9pc0Fic29sdXRlSXJpKHJ2YWxbJ0B0eXBlJ10pIHx8XG4gICAgICBydmFsWydAdHlwZSddLmluZGV4T2YoJ186JykgPT09IDApKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhbiBlbGVtZW50IGNvbnRhaW5pbmcgXCJAdmFsdWVcIiBhbmQgXCJAdHlwZVwiICcgK1xuICAgICAgICAnbXVzdCBoYXZlIGFuIGFic29sdXRlIElSSSBmb3IgdGhlIHZhbHVlIG9mIFwiQHR5cGVcIi4nLFxuICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdpbnZhbGlkIHR5cGVkIHZhbHVlJywgZWxlbWVudDogcnZhbH0pO1xuICAgIH1cbiAgfSBlbHNlIGlmKCdAdHlwZScgaW4gcnZhbCAmJiAhX2lzQXJyYXkocnZhbFsnQHR5cGUnXSkpIHtcbiAgICAvLyBjb252ZXJ0IEB0eXBlIHRvIGFuIGFycmF5XG4gICAgcnZhbFsnQHR5cGUnXSA9IFtydmFsWydAdHlwZSddXTtcbiAgfSBlbHNlIGlmKCdAc2V0JyBpbiBydmFsIHx8ICdAbGlzdCcgaW4gcnZhbCkge1xuICAgIC8vIGhhbmRsZSBAc2V0IGFuZCBAbGlzdFxuICAgIGlmKGNvdW50ID4gMSAmJiAhKGNvdW50ID09PSAyICYmICdAaW5kZXgnIGluIHJ2YWwpKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBpZiBhbiBlbGVtZW50IGhhcyB0aGUgcHJvcGVydHkgXCJAc2V0XCIgJyArXG4gICAgICAgICdvciBcIkBsaXN0XCIsIHRoZW4gaXQgY2FuIGhhdmUgYXQgbW9zdCBvbmUgb3RoZXIgcHJvcGVydHkgdGhhdCBpcyAnICtcbiAgICAgICAgJ1wiQGluZGV4XCIuJywgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgIHtjb2RlOiAnaW52YWxpZCBzZXQgb3IgbGlzdCBvYmplY3QnLCBlbGVtZW50OiBydmFsfSk7XG4gICAgfVxuICAgIC8vIG9wdGltaXplIGF3YXkgQHNldFxuICAgIGlmKCdAc2V0JyBpbiBydmFsKSB7XG4gICAgICBydmFsID0gcnZhbFsnQHNldCddO1xuICAgICAga2V5cyA9IE9iamVjdC5rZXlzKHJ2YWwpO1xuICAgICAgY291bnQgPSBrZXlzLmxlbmd0aDtcbiAgICB9XG4gIH0gZWxzZSBpZihjb3VudCA9PT0gMSAmJiAnQGxhbmd1YWdlJyBpbiBydmFsKSB7XG4gICAgLy8gZHJvcCBvYmplY3RzIHdpdGggb25seSBAbGFuZ3VhZ2VcbiAgICBydmFsID0gbnVsbDtcbiAgfVxuXG4gIC8vIGRyb3AgY2VydGFpbiB0b3AtbGV2ZWwgb2JqZWN0cyB0aGF0IGRvIG5vdCBvY2N1ciBpbiBsaXN0c1xuICBpZihfaXNPYmplY3QocnZhbCkgJiZcbiAgICAhb3B0aW9ucy5rZWVwRnJlZUZsb2F0aW5nTm9kZXMgJiYgIWluc2lkZUxpc3QgJiZcbiAgICAoYWN0aXZlUHJvcGVydHkgPT09IG51bGwgfHwgZXhwYW5kZWRBY3RpdmVQcm9wZXJ0eSA9PT0gJ0BncmFwaCcpKSB7XG4gICAgLy8gZHJvcCBlbXB0eSBvYmplY3QsIHRvcC1sZXZlbCBAdmFsdWUvQGxpc3QsIG9yIG9iamVjdCB3aXRoIG9ubHkgQGlkXG4gICAgaWYoY291bnQgPT09IDAgfHwgJ0B2YWx1ZScgaW4gcnZhbCB8fCAnQGxpc3QnIGluIHJ2YWwgfHxcbiAgICAgIChjb3VudCA9PT0gMSAmJiAnQGlkJyBpbiBydmFsKSkge1xuICAgICAgcnZhbCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJ2YWw7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBKU09OLUxEIG5vZGUgbWFwIChub2RlIElEID0+IG5vZGUpLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgZXhwYW5kZWQgSlNPTi1MRCB0byBjcmVhdGUgYSBub2RlIG1hcCBvZi5cbiAqIEBwYXJhbSBbb3B0aW9uc10gdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW25hbWVyXSB0aGUgVW5pcXVlTmFtZXIgdG8gdXNlLlxuICpcbiAqIEByZXR1cm4gdGhlIG5vZGUgbWFwLlxuICovXG5Qcm9jZXNzb3IucHJvdG90eXBlLmNyZWF0ZU5vZGVNYXAgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBwcm9kdWNlIGEgbWFwIG9mIGFsbCBzdWJqZWN0cyBhbmQgbmFtZSBlYWNoIGJub2RlXG4gIHZhciBuYW1lciA9IG9wdGlvbnMubmFtZXIgfHwgbmV3IFVuaXF1ZU5hbWVyKCdfOmInKTtcbiAgdmFyIGdyYXBocyA9IHsnQGRlZmF1bHQnOiB7fX07XG4gIF9jcmVhdGVOb2RlTWFwKGlucHV0LCBncmFwaHMsICdAZGVmYXVsdCcsIG5hbWVyKTtcblxuICAvLyBhZGQgYWxsIG5vbi1kZWZhdWx0IGdyYXBocyB0byBkZWZhdWx0IGdyYXBoXG4gIHJldHVybiBfbWVyZ2VOb2RlTWFwcyhncmFwaHMpO1xufTtcblxuLyoqXG4gKiBQZXJmb3JtcyBKU09OLUxEIGZsYXR0ZW5pbmcuXG4gKlxuICogQHBhcmFtIGlucHV0IHRoZSBleHBhbmRlZCBKU09OLUxEIHRvIGZsYXR0ZW4uXG4gKlxuICogQHJldHVybiB0aGUgZmxhdHRlbmVkIG91dHB1dC5cbiAqL1xuUHJvY2Vzc29yLnByb3RvdHlwZS5mbGF0dGVuID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIGRlZmF1bHRHcmFwaCA9IHRoaXMuY3JlYXRlTm9kZU1hcChpbnB1dCk7XG5cbiAgLy8gcHJvZHVjZSBmbGF0dGVuZWQgb3V0cHV0XG4gIHZhciBmbGF0dGVuZWQgPSBbXTtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkZWZhdWx0R3JhcGgpLnNvcnQoKTtcbiAgZm9yKHZhciBraSA9IDA7IGtpIDwga2V5cy5sZW5ndGg7ICsra2kpIHtcbiAgICB2YXIgbm9kZSA9IGRlZmF1bHRHcmFwaFtrZXlzW2tpXV07XG4gICAgLy8gb25seSBhZGQgZnVsbCBzdWJqZWN0cyB0byB0b3AtbGV2ZWxcbiAgICBpZighX2lzU3ViamVjdFJlZmVyZW5jZShub2RlKSkge1xuICAgICAgZmxhdHRlbmVkLnB1c2gobm9kZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBmbGF0dGVuZWQ7XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIEpTT04tTEQgZnJhbWluZy5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIGV4cGFuZGVkIEpTT04tTEQgdG8gZnJhbWUuXG4gKiBAcGFyYW0gZnJhbWUgdGhlIGV4cGFuZGVkIEpTT04tTEQgZnJhbWUgdG8gdXNlLlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIGZyYW1pbmcgb3B0aW9ucy5cbiAqXG4gKiBAcmV0dXJuIHRoZSBmcmFtZWQgb3V0cHV0LlxuICovXG5Qcm9jZXNzb3IucHJvdG90eXBlLmZyYW1lID0gZnVuY3Rpb24oaW5wdXQsIGZyYW1lLCBvcHRpb25zKSB7XG4gIC8vIGNyZWF0ZSBmcmFtaW5nIHN0YXRlXG4gIHZhciBzdGF0ZSA9IHtcbiAgICBvcHRpb25zOiBvcHRpb25zLFxuICAgIGdyYXBoczogeydAZGVmYXVsdCc6IHt9LCAnQG1lcmdlZCc6IHt9fSxcbiAgICBzdWJqZWN0U3RhY2s6IFtdLFxuICAgIGxpbms6IHt9XG4gIH07XG5cbiAgLy8gcHJvZHVjZSBhIG1hcCBvZiBhbGwgZ3JhcGhzIGFuZCBuYW1lIGVhY2ggYm5vZGVcbiAgLy8gRklYTUU6IGN1cnJlbnRseSB1c2VzIHN1YmplY3RzIGZyb20gQG1lcmdlZCBncmFwaCBvbmx5XG4gIHZhciBuYW1lciA9IG5ldyBVbmlxdWVOYW1lcignXzpiJyk7XG4gIF9jcmVhdGVOb2RlTWFwKGlucHV0LCBzdGF0ZS5ncmFwaHMsICdAbWVyZ2VkJywgbmFtZXIpO1xuICBzdGF0ZS5zdWJqZWN0cyA9IHN0YXRlLmdyYXBoc1snQG1lcmdlZCddO1xuXG4gIC8vIGZyYW1lIHRoZSBzdWJqZWN0c1xuICB2YXIgZnJhbWVkID0gW107XG4gIF9mcmFtZShzdGF0ZSwgT2JqZWN0LmtleXMoc3RhdGUuc3ViamVjdHMpLnNvcnQoKSwgZnJhbWUsIGZyYW1lZCwgbnVsbCk7XG4gIHJldHVybiBmcmFtZWQ7XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIG5vcm1hbGl6YXRpb24gb24gdGhlIGdpdmVuIFJERiBkYXRhc2V0LlxuICpcbiAqIEBwYXJhbSBkYXRhc2V0IHRoZSBSREYgZGF0YXNldCB0byBub3JtYWxpemUuXG4gKiBAcGFyYW0gb3B0aW9ucyB0aGUgbm9ybWFsaXphdGlvbiBvcHRpb25zLlxuICogQHBhcmFtIGNhbGxiYWNrKGVyciwgbm9ybWFsaXplZCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cblByb2Nlc3Nvci5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24oZGF0YXNldCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgLy8gY3JlYXRlIHF1YWRzIGFuZCBtYXAgYm5vZGVzIHRvIHRoZWlyIGFzc29jaWF0ZWQgcXVhZHNcbiAgdmFyIHF1YWRzID0gW107XG4gIHZhciBibm9kZXMgPSB7fTtcbiAgZm9yKHZhciBncmFwaE5hbWUgaW4gZGF0YXNldCkge1xuICAgIHZhciB0cmlwbGVzID0gZGF0YXNldFtncmFwaE5hbWVdO1xuICAgIGlmKGdyYXBoTmFtZSA9PT0gJ0BkZWZhdWx0Jykge1xuICAgICAgZ3JhcGhOYW1lID0gbnVsbDtcbiAgICB9XG4gICAgZm9yKHZhciB0aSA9IDA7IHRpIDwgdHJpcGxlcy5sZW5ndGg7ICsrdGkpIHtcbiAgICAgIHZhciBxdWFkID0gdHJpcGxlc1t0aV07XG4gICAgICBpZihncmFwaE5hbWUgIT09IG51bGwpIHtcbiAgICAgICAgaWYoZ3JhcGhOYW1lLmluZGV4T2YoJ186JykgPT09IDApIHtcbiAgICAgICAgICBxdWFkLm5hbWUgPSB7dHlwZTogJ2JsYW5rIG5vZGUnLCB2YWx1ZTogZ3JhcGhOYW1lfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxdWFkLm5hbWUgPSB7dHlwZTogJ0lSSScsIHZhbHVlOiBncmFwaE5hbWV9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBxdWFkcy5wdXNoKHF1YWQpO1xuXG4gICAgICB2YXIgYXR0cnMgPSBbJ3N1YmplY3QnLCAnb2JqZWN0JywgJ25hbWUnXTtcbiAgICAgIGZvcih2YXIgYWkgPSAwOyBhaSA8IGF0dHJzLmxlbmd0aDsgKythaSkge1xuICAgICAgICB2YXIgYXR0ciA9IGF0dHJzW2FpXTtcbiAgICAgICAgaWYocXVhZFthdHRyXSAmJiBxdWFkW2F0dHJdLnR5cGUgPT09ICdibGFuayBub2RlJykge1xuICAgICAgICAgIHZhciBpZCA9IHF1YWRbYXR0cl0udmFsdWU7XG4gICAgICAgICAgaWYoaWQgaW4gYm5vZGVzKSB7XG4gICAgICAgICAgICBibm9kZXNbaWRdLnF1YWRzLnB1c2gocXVhZCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJub2Rlc1tpZF0gPSB7cXVhZHM6IFtxdWFkXX07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gbWFwcGluZyBjb21wbGV0ZSwgc3RhcnQgY2Fub25pY2FsIG5hbWluZ1xuICB2YXIgbmFtZXIgPSBuZXcgVW5pcXVlTmFtZXIoJ186YzE0bicpO1xuICByZXR1cm4gaGFzaEJsYW5rTm9kZXMoT2JqZWN0LmtleXMoYm5vZGVzKSk7XG5cbiAgLy8gZ2VuZXJhdGVzIHVuaXF1ZSBhbmQgZHVwbGljYXRlIGhhc2hlcyBmb3IgYm5vZGVzXG4gIGZ1bmN0aW9uIGhhc2hCbGFua05vZGVzKHVubmFtZWQpIHtcbiAgICB2YXIgbmV4dFVubmFtZWQgPSBbXTtcbiAgICB2YXIgZHVwbGljYXRlcyA9IHt9O1xuICAgIHZhciB1bmlxdWUgPSB7fTtcblxuICAgIC8vIGhhc2ggcXVhZHMgZm9yIGVhY2ggdW5uYW1lZCBibm9kZVxuICAgIGpzb25sZC5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7aGFzaFVubmFtZWQoMCk7fSk7XG4gICAgZnVuY3Rpb24gaGFzaFVubmFtZWQoaSkge1xuICAgICAgaWYoaSA9PT0gdW5uYW1lZC5sZW5ndGgpIHtcbiAgICAgICAgLy8gZG9uZSwgbmFtZSBibGFuayBub2Rlc1xuICAgICAgICByZXR1cm4gbmFtZUJsYW5rTm9kZXModW5pcXVlLCBkdXBsaWNhdGVzLCBuZXh0VW5uYW1lZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGhhc2ggdW5uYW1lZCBibm9kZVxuICAgICAgdmFyIGJub2RlID0gdW5uYW1lZFtpXTtcbiAgICAgIHZhciBoYXNoID0gX2hhc2hRdWFkcyhibm9kZSwgYm5vZGVzKTtcblxuICAgICAgLy8gc3RvcmUgaGFzaCBhcyB1bmlxdWUgb3IgYSBkdXBsaWNhdGVcbiAgICAgIGlmKGhhc2ggaW4gZHVwbGljYXRlcykge1xuICAgICAgICBkdXBsaWNhdGVzW2hhc2hdLnB1c2goYm5vZGUpO1xuICAgICAgICBuZXh0VW5uYW1lZC5wdXNoKGJub2RlKTtcbiAgICAgIH0gZWxzZSBpZihoYXNoIGluIHVuaXF1ZSkge1xuICAgICAgICBkdXBsaWNhdGVzW2hhc2hdID0gW3VuaXF1ZVtoYXNoXSwgYm5vZGVdO1xuICAgICAgICBuZXh0VW5uYW1lZC5wdXNoKHVuaXF1ZVtoYXNoXSk7XG4gICAgICAgIG5leHRVbm5hbWVkLnB1c2goYm5vZGUpO1xuICAgICAgICBkZWxldGUgdW5pcXVlW2hhc2hdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdW5pcXVlW2hhc2hdID0gYm5vZGU7XG4gICAgICB9XG5cbiAgICAgIC8vIGhhc2ggbmV4dCB1bm5hbWVkIGJub2RlXG4gICAgICBqc29ubGQuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge2hhc2hVbm5hbWVkKGkgKyAxKTt9KTtcbiAgICB9XG4gIH1cblxuICAvLyBuYW1lcyB1bmlxdWUgaGFzaCBibm9kZXNcbiAgZnVuY3Rpb24gbmFtZUJsYW5rTm9kZXModW5pcXVlLCBkdXBsaWNhdGVzLCB1bm5hbWVkKSB7XG4gICAgLy8gbmFtZSB1bmlxdWUgYm5vZGVzIGluIHNvcnRlZCBoYXNoIG9yZGVyXG4gICAgdmFyIG5hbWVkID0gZmFsc2U7XG4gICAgdmFyIGhhc2hlcyA9IE9iamVjdC5rZXlzKHVuaXF1ZSkuc29ydCgpO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBoYXNoZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBibm9kZSA9IHVuaXF1ZVtoYXNoZXNbaV1dO1xuICAgICAgbmFtZXIuZ2V0TmFtZShibm9kZSk7XG4gICAgICBuYW1lZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYobmFtZWQpIHtcbiAgICAgIC8vIGNvbnRpbnVlIHRvIGhhc2ggYm5vZGVzIGlmIGEgYm5vZGUgd2FzIGFzc2lnbmVkIGEgbmFtZVxuICAgICAgaGFzaEJsYW5rTm9kZXModW5uYW1lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5hbWUgdGhlIGR1cGxpY2F0ZSBoYXNoIGJub2Rlc1xuICAgICAgbmFtZUR1cGxpY2F0ZXMoZHVwbGljYXRlcyk7XG4gICAgfVxuICB9XG5cbiAgLy8gbmFtZXMgZHVwbGljYXRlIGhhc2ggYm5vZGVzXG4gIGZ1bmN0aW9uIG5hbWVEdXBsaWNhdGVzKGR1cGxpY2F0ZXMpIHtcbiAgICAvLyBlbnVtZXJhdGUgZHVwbGljYXRlIGhhc2ggZ3JvdXBzIGluIHNvcnRlZCBvcmRlclxuICAgIHZhciBoYXNoZXMgPSBPYmplY3Qua2V5cyhkdXBsaWNhdGVzKS5zb3J0KCk7XG5cbiAgICAvLyBwcm9jZXNzIGVhY2ggZ3JvdXBcbiAgICBwcm9jZXNzR3JvdXAoMCk7XG4gICAgZnVuY3Rpb24gcHJvY2Vzc0dyb3VwKGkpIHtcbiAgICAgIGlmKGkgPT09IGhhc2hlcy5sZW5ndGgpIHtcbiAgICAgICAgLy8gZG9uZSwgY3JlYXRlIEpTT04tTEQgYXJyYXlcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUFycmF5KCk7XG4gICAgICB9XG5cbiAgICAgIC8vIG5hbWUgZWFjaCBncm91cCBtZW1iZXJcbiAgICAgIHZhciBncm91cCA9IGR1cGxpY2F0ZXNbaGFzaGVzW2ldXTtcbiAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICBuYW1lR3JvdXBNZW1iZXIoZ3JvdXAsIDApO1xuICAgICAgZnVuY3Rpb24gbmFtZUdyb3VwTWVtYmVyKGdyb3VwLCBuKSB7XG4gICAgICAgIGlmKG4gPT09IGdyb3VwLmxlbmd0aCkge1xuICAgICAgICAgIC8vIG5hbWUgYm5vZGVzIGluIGhhc2ggb3JkZXJcbiAgICAgICAgICByZXN1bHRzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgYSA9IGEuaGFzaDtcbiAgICAgICAgICAgIGIgPSBiLmhhc2g7XG4gICAgICAgICAgICByZXR1cm4gKGEgPCBiKSA/IC0xIDogKChhID4gYikgPyAxIDogMCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZm9yKHZhciByIGluIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIC8vIG5hbWUgYWxsIGJub2RlcyBpbiBwYXRoIG5hbWVyIGluIGtleS1lbnRyeSBvcmRlclxuICAgICAgICAgICAgLy8gTm90ZToga2V5LW9yZGVyIGlzIHByZXNlcnZlZCBpbiBqYXZhc2NyaXB0XG4gICAgICAgICAgICBmb3IodmFyIGtleSBpbiByZXN1bHRzW3JdLnBhdGhOYW1lci5leGlzdGluZykge1xuICAgICAgICAgICAgICBuYW1lci5nZXROYW1lKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBwcm9jZXNzR3JvdXAoaSArIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2tpcCBhbHJlYWR5LW5hbWVkIGJub2Rlc1xuICAgICAgICB2YXIgYm5vZGUgPSBncm91cFtuXTtcbiAgICAgICAgaWYobmFtZXIuaXNOYW1lZChibm9kZSkpIHtcbiAgICAgICAgICByZXR1cm4gbmFtZUdyb3VwTWVtYmVyKGdyb3VwLCBuICsgMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBoYXNoIGJub2RlIHBhdGhzXG4gICAgICAgIHZhciBwYXRoTmFtZXIgPSBuZXcgVW5pcXVlTmFtZXIoJ186YicpO1xuICAgICAgICBwYXRoTmFtZXIuZ2V0TmFtZShibm9kZSk7XG4gICAgICAgIF9oYXNoUGF0aHMoYm5vZGUsIGJub2RlcywgbmFtZXIsIHBhdGhOYW1lcixcbiAgICAgICAgICBmdW5jdGlvbihlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICBuYW1lR3JvdXBNZW1iZXIoZ3JvdXAsIG4gKyAxKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBjcmVhdGVzIHRoZSBzb3J0ZWQgYXJyYXkgb2YgUkRGIHF1YWRzXG4gIGZ1bmN0aW9uIGNyZWF0ZUFycmF5KCkge1xuICAgIHZhciBub3JtYWxpemVkID0gW107XG5cbiAgICAvKiBOb3RlOiBBdCB0aGlzIHBvaW50IGFsbCBibm9kZXMgaW4gdGhlIHNldCBvZiBSREYgcXVhZHMgaGF2ZSBiZWVuXG4gICAgIGFzc2lnbmVkIGNhbm9uaWNhbCBuYW1lcywgd2hpY2ggaGF2ZSBiZWVuIHN0b3JlZCBpbiB0aGUgJ25hbWVyJyBvYmplY3QuXG4gICAgIEhlcmUgZWFjaCBxdWFkIGlzIHVwZGF0ZWQgYnkgYXNzaWduaW5nIGVhY2ggb2YgaXRzIGJub2RlcyBpdHMgbmV3IG5hbWVcbiAgICAgdmlhIHRoZSAnbmFtZXInIG9iamVjdC4gKi9cblxuICAgIC8vIHVwZGF0ZSBibm9kZSBuYW1lcyBpbiBlYWNoIHF1YWQgYW5kIHNlcmlhbGl6ZVxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWFkcy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIHF1YWQgPSBxdWFkc1tpXTtcbiAgICAgIHZhciBhdHRycyA9IFsnc3ViamVjdCcsICdvYmplY3QnLCAnbmFtZSddO1xuICAgICAgZm9yKHZhciBhaSA9IDA7IGFpIDwgYXR0cnMubGVuZ3RoOyArK2FpKSB7XG4gICAgICAgIHZhciBhdHRyID0gYXR0cnNbYWldO1xuICAgICAgICBpZihxdWFkW2F0dHJdICYmIHF1YWRbYXR0cl0udHlwZSA9PT0gJ2JsYW5rIG5vZGUnICYmXG4gICAgICAgICAgcXVhZFthdHRyXS52YWx1ZS5pbmRleE9mKCdfOmMxNG4nKSAhPT0gMCkge1xuICAgICAgICAgIHF1YWRbYXR0cl0udmFsdWUgPSBuYW1lci5nZXROYW1lKHF1YWRbYXR0cl0udmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBub3JtYWxpemVkLnB1c2goX3RvTlF1YWQocXVhZCwgcXVhZC5uYW1lID8gcXVhZC5uYW1lLnZhbHVlIDogbnVsbCkpO1xuICAgIH1cblxuICAgIC8vIHNvcnQgbm9ybWFsaXplZCBvdXRwdXRcbiAgICBub3JtYWxpemVkLnNvcnQoKTtcblxuICAgIC8vIGhhbmRsZSBvdXRwdXQgZm9ybWF0XG4gICAgaWYob3B0aW9ucy5mb3JtYXQpIHtcbiAgICAgIGlmKG9wdGlvbnMuZm9ybWF0ID09PSAnYXBwbGljYXRpb24vbnF1YWRzJykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgbm9ybWFsaXplZC5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnVW5rbm93biBvdXRwdXQgZm9ybWF0LicsXG4gICAgICAgICdqc29ubGQuVW5rbm93bkZvcm1hdCcsIHtmb3JtYXQ6IG9wdGlvbnMuZm9ybWF0fSkpO1xuICAgIH1cblxuICAgIC8vIG91dHB1dCBSREYgZGF0YXNldFxuICAgIGNhbGxiYWNrKG51bGwsIF9wYXJzZU5RdWFkcyhub3JtYWxpemVkLmpvaW4oJycpKSk7XG4gIH1cbn07XG5cbi8qKlxuICogQ29udmVydHMgYW4gUkRGIGRhdGFzZXQgdG8gSlNPTi1MRC5cbiAqXG4gKiBAcGFyYW0gZGF0YXNldCB0aGUgUkRGIGRhdGFzZXQuXG4gKiBAcGFyYW0gb3B0aW9ucyB0aGUgUkRGIHNlcmlhbGl6YXRpb24gb3B0aW9ucy5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIG91dHB1dCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cblByb2Nlc3Nvci5wcm90b3R5cGUuZnJvbVJERiA9IGZ1bmN0aW9uKGRhdGFzZXQsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIHZhciBkZWZhdWx0R3JhcGggPSB7fTtcbiAgdmFyIGdyYXBoTWFwID0geydAZGVmYXVsdCc6IGRlZmF1bHRHcmFwaH07XG4gIHZhciByZWZlcmVuY2VkT25jZSA9IHt9O1xuXG4gIGZvcih2YXIgbmFtZSBpbiBkYXRhc2V0KSB7XG4gICAgdmFyIGdyYXBoID0gZGF0YXNldFtuYW1lXTtcbiAgICBpZighKG5hbWUgaW4gZ3JhcGhNYXApKSB7XG4gICAgICBncmFwaE1hcFtuYW1lXSA9IHt9O1xuICAgIH1cbiAgICBpZihuYW1lICE9PSAnQGRlZmF1bHQnICYmICEobmFtZSBpbiBkZWZhdWx0R3JhcGgpKSB7XG4gICAgICBkZWZhdWx0R3JhcGhbbmFtZV0gPSB7J0BpZCc6IG5hbWV9O1xuICAgIH1cbiAgICB2YXIgbm9kZU1hcCA9IGdyYXBoTWFwW25hbWVdO1xuICAgIGZvcih2YXIgdGkgPSAwOyB0aSA8IGdyYXBoLmxlbmd0aDsgKyt0aSkge1xuICAgICAgdmFyIHRyaXBsZSA9IGdyYXBoW3RpXTtcblxuICAgICAgLy8gZ2V0IHN1YmplY3QsIHByZWRpY2F0ZSwgb2JqZWN0XG4gICAgICB2YXIgcyA9IHRyaXBsZS5zdWJqZWN0LnZhbHVlO1xuICAgICAgdmFyIHAgPSB0cmlwbGUucHJlZGljYXRlLnZhbHVlO1xuICAgICAgdmFyIG8gPSB0cmlwbGUub2JqZWN0O1xuXG4gICAgICBpZighKHMgaW4gbm9kZU1hcCkpIHtcbiAgICAgICAgbm9kZU1hcFtzXSA9IHsnQGlkJzogc307XG4gICAgICB9XG4gICAgICB2YXIgbm9kZSA9IG5vZGVNYXBbc107XG5cbiAgICAgIHZhciBvYmplY3RJc0lkID0gKG8udHlwZSA9PT0gJ0lSSScgfHwgby50eXBlID09PSAnYmxhbmsgbm9kZScpO1xuICAgICAgaWYob2JqZWN0SXNJZCAmJiAhKG8udmFsdWUgaW4gbm9kZU1hcCkpIHtcbiAgICAgICAgbm9kZU1hcFtvLnZhbHVlXSA9IHsnQGlkJzogby52YWx1ZX07XG4gICAgICB9XG5cbiAgICAgIGlmKHAgPT09IFJERl9UWVBFICYmICFvcHRpb25zLnVzZVJkZlR5cGUgJiYgb2JqZWN0SXNJZCkge1xuICAgICAgICBqc29ubGQuYWRkVmFsdWUobm9kZSwgJ0B0eXBlJywgby52YWx1ZSwge3Byb3BlcnR5SXNBcnJheTogdHJ1ZX0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIHZhbHVlID0gX1JERlRvT2JqZWN0KG8sIG9wdGlvbnMudXNlTmF0aXZlVHlwZXMpO1xuICAgICAganNvbmxkLmFkZFZhbHVlKG5vZGUsIHAsIHZhbHVlLCB7cHJvcGVydHlJc0FycmF5OiB0cnVlfSk7XG5cbiAgICAgIC8vIG9iamVjdCBtYXkgYmUgYW4gUkRGIGxpc3QvcGFydGlhbCBsaXN0IG5vZGUgYnV0IHdlIGNhbid0IGtub3cgZWFzaWx5XG4gICAgICAvLyB1bnRpbCBhbGwgdHJpcGxlcyBhcmUgcmVhZFxuICAgICAgaWYob2JqZWN0SXNJZCkge1xuICAgICAgICBpZihvLnZhbHVlID09PSBSREZfTklMKSB7XG4gICAgICAgICAgLy8gdHJhY2sgcmRmOm5pbCB1bmlxdWVseSBwZXIgZ3JhcGhcbiAgICAgICAgICB2YXIgb2JqZWN0ID0gbm9kZU1hcFtvLnZhbHVlXTtcbiAgICAgICAgICBpZighKCd1c2FnZXMnIGluIG9iamVjdCkpIHtcbiAgICAgICAgICAgIG9iamVjdC51c2FnZXMgPSBbXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb2JqZWN0LnVzYWdlcy5wdXNoKHtcbiAgICAgICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgICAgICBwcm9wZXJ0eTogcCxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYoby52YWx1ZSBpbiByZWZlcmVuY2VkT25jZSkge1xuICAgICAgICAgIC8vIG9iamVjdCByZWZlcmVuY2VkIG1vcmUgdGhhbiBvbmNlXG4gICAgICAgICAgcmVmZXJlbmNlZE9uY2Vbby52YWx1ZV0gPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIHNpbmdsZSByZWZlcmVuY2VcbiAgICAgICAgICByZWZlcmVuY2VkT25jZVtvLnZhbHVlXSA9IHtcbiAgICAgICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgICAgICBwcm9wZXJ0eTogcCxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBjb252ZXJ0IGxpbmtlZCBsaXN0cyB0byBAbGlzdCBhcnJheXNcbiAgZm9yKHZhciBuYW1lIGluIGdyYXBoTWFwKSB7XG4gICAgdmFyIGdyYXBoT2JqZWN0ID0gZ3JhcGhNYXBbbmFtZV07XG5cbiAgICAvLyBubyBAbGlzdHMgdG8gYmUgY29udmVydGVkLCBjb250aW51ZVxuICAgIGlmKCEoUkRGX05JTCBpbiBncmFwaE9iamVjdCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGl0ZXJhdGUgYmFja3dhcmRzIHRocm91Z2ggZWFjaCBSREYgbGlzdFxuICAgIHZhciBuaWwgPSBncmFwaE9iamVjdFtSREZfTklMXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbmlsLnVzYWdlcy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIHVzYWdlID0gbmlsLnVzYWdlc1tpXTtcbiAgICAgIHZhciBub2RlID0gdXNhZ2Uubm9kZTtcbiAgICAgIHZhciBwcm9wZXJ0eSA9IHVzYWdlLnByb3BlcnR5O1xuICAgICAgdmFyIGhlYWQgPSB1c2FnZS52YWx1ZTtcbiAgICAgIHZhciBsaXN0ID0gW107XG4gICAgICB2YXIgbGlzdE5vZGVzID0gW107XG5cbiAgICAgIC8vIGVuc3VyZSBub2RlIGlzIGEgd2VsbC1mb3JtZWQgbGlzdCBub2RlOyBpdCBtdXN0OlxuICAgICAgLy8gMS4gQmUgcmVmZXJlbmNlZCBvbmx5IG9uY2UuXG4gICAgICAvLyAyLiBIYXZlIGFuIGFycmF5IGZvciByZGY6Zmlyc3QgdGhhdCBoYXMgMSBpdGVtLlxuICAgICAgLy8gMy4gSGF2ZSBhbiBhcnJheSBmb3IgcmRmOnJlc3QgdGhhdCBoYXMgMSBpdGVtLlxuICAgICAgLy8gNC4gSGF2ZSBubyBrZXlzIG90aGVyIHRoYW46IEBpZCwgcmRmOmZpcnN0LCByZGY6cmVzdCwgYW5kLFxuICAgICAgLy8gICBvcHRpb25hbGx5LCBAdHlwZSB3aGVyZSB0aGUgdmFsdWUgaXMgcmRmOkxpc3QuXG4gICAgICB2YXIgbm9kZUtleUNvdW50ID0gT2JqZWN0LmtleXMobm9kZSkubGVuZ3RoO1xuICAgICAgd2hpbGUocHJvcGVydHkgPT09IFJERl9SRVNUICYmXG4gICAgICAgIF9pc09iamVjdChyZWZlcmVuY2VkT25jZVtub2RlWydAaWQnXV0pICYmXG4gICAgICAgIF9pc0FycmF5KG5vZGVbUkRGX0ZJUlNUXSkgJiYgbm9kZVtSREZfRklSU1RdLmxlbmd0aCA9PT0gMSAmJlxuICAgICAgICBfaXNBcnJheShub2RlW1JERl9SRVNUXSkgJiYgbm9kZVtSREZfUkVTVF0ubGVuZ3RoID09PSAxICYmXG4gICAgICAgIChub2RlS2V5Q291bnQgPT09IDMgfHwgKG5vZGVLZXlDb3VudCA9PT0gNCAmJiBfaXNBcnJheShub2RlWydAdHlwZSddKSAmJlxuICAgICAgICAgIG5vZGVbJ0B0eXBlJ10ubGVuZ3RoID09PSAxICYmIG5vZGVbJ0B0eXBlJ11bMF0gPT09IFJERl9MSVNUKSkpIHtcbiAgICAgICAgbGlzdC5wdXNoKG5vZGVbUkRGX0ZJUlNUXVswXSk7XG4gICAgICAgIGxpc3ROb2Rlcy5wdXNoKG5vZGVbJ0BpZCddKTtcblxuICAgICAgICAvLyBnZXQgbmV4dCBub2RlLCBtb3ZpbmcgYmFja3dhcmRzIHRocm91Z2ggbGlzdFxuICAgICAgICB1c2FnZSA9IHJlZmVyZW5jZWRPbmNlW25vZGVbJ0BpZCddXTtcbiAgICAgICAgbm9kZSA9IHVzYWdlLm5vZGU7XG4gICAgICAgIHByb3BlcnR5ID0gdXNhZ2UucHJvcGVydHk7XG4gICAgICAgIGhlYWQgPSB1c2FnZS52YWx1ZTtcbiAgICAgICAgbm9kZUtleUNvdW50ID0gT2JqZWN0LmtleXMobm9kZSkubGVuZ3RoO1xuXG4gICAgICAgIC8vIGlmIG5vZGUgaXMgbm90IGEgYmxhbmsgbm9kZSwgdGhlbiBsaXN0IGhlYWQgZm91bmRcbiAgICAgICAgaWYobm9kZVsnQGlkJ10uaW5kZXhPZignXzonKSAhPT0gMCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHRoZSBsaXN0IGlzIG5lc3RlZCBpbiBhbm90aGVyIGxpc3RcbiAgICAgIGlmKHByb3BlcnR5ID09PSBSREZfRklSU1QpIHtcbiAgICAgICAgLy8gZW1wdHkgbGlzdFxuICAgICAgICBpZihub2RlWydAaWQnXSA9PT0gUkRGX05JTCkge1xuICAgICAgICAgIC8vIGNhbid0IGNvbnZlcnQgcmRmOm5pbCB0byBhIEBsaXN0IG9iamVjdCBiZWNhdXNlIGl0IHdvdWxkXG4gICAgICAgICAgLy8gcmVzdWx0IGluIGEgbGlzdCBvZiBsaXN0cyB3aGljaCBpc24ndCBzdXBwb3J0ZWRcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHByZXNlcnZlIGxpc3QgaGVhZFxuICAgICAgICBoZWFkID0gZ3JhcGhPYmplY3RbaGVhZFsnQGlkJ11dW1JERl9SRVNUXVswXTtcbiAgICAgICAgbGlzdC5wb3AoKTtcbiAgICAgICAgbGlzdE5vZGVzLnBvcCgpO1xuICAgICAgfVxuXG4gICAgICAvLyB0cmFuc2Zvcm0gbGlzdCBpbnRvIEBsaXN0IG9iamVjdFxuICAgICAgZGVsZXRlIGhlYWRbJ0BpZCddO1xuICAgICAgaGVhZFsnQGxpc3QnXSA9IGxpc3QucmV2ZXJzZSgpO1xuICAgICAgZm9yKHZhciBqID0gMDsgaiA8IGxpc3ROb2Rlcy5sZW5ndGg7ICsraikge1xuICAgICAgICBkZWxldGUgZ3JhcGhPYmplY3RbbGlzdE5vZGVzW2pdXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBkZWxldGUgbmlsLnVzYWdlcztcbiAgfVxuXG4gIHZhciByZXN1bHQgPSBbXTtcbiAgdmFyIHN1YmplY3RzID0gT2JqZWN0LmtleXMoZGVmYXVsdEdyYXBoKS5zb3J0KCk7XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBzdWJqZWN0cy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBzdWJqZWN0ID0gc3ViamVjdHNbaV07XG4gICAgdmFyIG5vZGUgPSBkZWZhdWx0R3JhcGhbc3ViamVjdF07XG4gICAgaWYoc3ViamVjdCBpbiBncmFwaE1hcCkge1xuICAgICAgdmFyIGdyYXBoID0gbm9kZVsnQGdyYXBoJ10gPSBbXTtcbiAgICAgIHZhciBncmFwaE9iamVjdCA9IGdyYXBoTWFwW3N1YmplY3RdO1xuICAgICAgdmFyIHN1YmplY3RzXyA9IE9iamVjdC5rZXlzKGdyYXBoT2JqZWN0KS5zb3J0KCk7XG4gICAgICBmb3IodmFyIHNpID0gMDsgc2kgPCBzdWJqZWN0c18ubGVuZ3RoOyArK3NpKSB7XG4gICAgICAgIHZhciBub2RlXyA9IGdyYXBoT2JqZWN0W3N1YmplY3RzX1tzaV1dO1xuICAgICAgICAvLyBvbmx5IGFkZCBmdWxsIHN1YmplY3RzIHRvIHRvcC1sZXZlbFxuICAgICAgICBpZighX2lzU3ViamVjdFJlZmVyZW5jZShub2RlXykpIHtcbiAgICAgICAgICBncmFwaC5wdXNoKG5vZGVfKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBvbmx5IGFkZCBmdWxsIHN1YmplY3RzIHRvIHRvcC1sZXZlbFxuICAgIGlmKCFfaXNTdWJqZWN0UmVmZXJlbmNlKG5vZGUpKSB7XG4gICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICB9XG4gIH1cblxuICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xufTtcblxuLyoqXG4gKiBPdXRwdXRzIGFuIFJERiBkYXRhc2V0IGZvciB0aGUgZXhwYW5kZWQgSlNPTi1MRCBpbnB1dC5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIGV4cGFuZGVkIEpTT04tTEQgaW5wdXQuXG4gKiBAcGFyYW0gb3B0aW9ucyB0aGUgUkRGIHNlcmlhbGl6YXRpb24gb3B0aW9ucy5cbiAqXG4gKiBAcmV0dXJuIHRoZSBSREYgZGF0YXNldC5cbiAqL1xuUHJvY2Vzc29yLnByb3RvdHlwZS50b1JERiA9IGZ1bmN0aW9uKGlucHV0LCBvcHRpb25zKSB7XG4gIC8vIGNyZWF0ZSBub2RlIG1hcCBmb3IgZGVmYXVsdCBncmFwaCAoYW5kIGFueSBuYW1lZCBncmFwaHMpXG4gIHZhciBuYW1lciA9IG5ldyBVbmlxdWVOYW1lcignXzpiJyk7XG4gIHZhciBub2RlTWFwID0geydAZGVmYXVsdCc6IHt9fTtcbiAgX2NyZWF0ZU5vZGVNYXAoaW5wdXQsIG5vZGVNYXAsICdAZGVmYXVsdCcsIG5hbWVyKTtcblxuICB2YXIgZGF0YXNldCA9IHt9O1xuICB2YXIgZ3JhcGhOYW1lcyA9IE9iamVjdC5rZXlzKG5vZGVNYXApLnNvcnQoKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IGdyYXBoTmFtZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgZ3JhcGhOYW1lID0gZ3JhcGhOYW1lc1tpXTtcbiAgICAvLyBza2lwIHJlbGF0aXZlIElSSXNcbiAgICBpZihncmFwaE5hbWUgPT09ICdAZGVmYXVsdCcgfHwgX2lzQWJzb2x1dGVJcmkoZ3JhcGhOYW1lKSkge1xuICAgICAgZGF0YXNldFtncmFwaE5hbWVdID0gX2dyYXBoVG9SREYobm9kZU1hcFtncmFwaE5hbWVdLCBuYW1lciwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkYXRhc2V0O1xufTtcblxuLyoqXG4gKiBQcm9jZXNzZXMgYSBsb2NhbCBjb250ZXh0IGFuZCByZXR1cm5zIGEgbmV3IGFjdGl2ZSBjb250ZXh0LlxuICpcbiAqIEBwYXJhbSBhY3RpdmVDdHggdGhlIGN1cnJlbnQgYWN0aXZlIGNvbnRleHQuXG4gKiBAcGFyYW0gbG9jYWxDdHggdGhlIGxvY2FsIGNvbnRleHQgdG8gcHJvY2Vzcy5cbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBjb250ZXh0IHByb2Nlc3Npbmcgb3B0aW9ucy5cbiAqXG4gKiBAcmV0dXJuIHRoZSBuZXcgYWN0aXZlIGNvbnRleHQuXG4gKi9cblByb2Nlc3Nvci5wcm90b3R5cGUucHJvY2Vzc0NvbnRleHQgPSBmdW5jdGlvbihhY3RpdmVDdHgsIGxvY2FsQ3R4LCBvcHRpb25zKSB7XG4gIC8vIG5vcm1hbGl6ZSBsb2NhbCBjb250ZXh0IHRvIGFuIGFycmF5IG9mIEBjb250ZXh0IG9iamVjdHNcbiAgaWYoX2lzT2JqZWN0KGxvY2FsQ3R4KSAmJiAnQGNvbnRleHQnIGluIGxvY2FsQ3R4ICYmXG4gICAgX2lzQXJyYXkobG9jYWxDdHhbJ0Bjb250ZXh0J10pKSB7XG4gICAgbG9jYWxDdHggPSBsb2NhbEN0eFsnQGNvbnRleHQnXTtcbiAgfVxuICB2YXIgY3R4cyA9IF9pc0FycmF5KGxvY2FsQ3R4KSA/IGxvY2FsQ3R4IDogW2xvY2FsQ3R4XTtcblxuICAvLyBubyBjb250ZXh0cyBpbiBhcnJheSwgY2xvbmUgZXhpc3RpbmcgY29udGV4dFxuICBpZihjdHhzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBhY3RpdmVDdHguY2xvbmUoKTtcbiAgfVxuXG4gIC8vIHByb2Nlc3MgZWFjaCBjb250ZXh0IGluIG9yZGVyLCB1cGRhdGUgYWN0aXZlIGNvbnRleHRcbiAgLy8gb24gZWFjaCBpdGVyYXRpb24gdG8gZW5zdXJlIHByb3BlciBjYWNoaW5nXG4gIHZhciBydmFsID0gYWN0aXZlQ3R4O1xuICBmb3IodmFyIGkgPSAwOyBpIDwgY3R4cy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBjdHggPSBjdHhzW2ldO1xuXG4gICAgLy8gcmVzZXQgdG8gaW5pdGlhbCBjb250ZXh0XG4gICAgaWYoY3R4ID09PSBudWxsKSB7XG4gICAgICBydmFsID0gYWN0aXZlQ3R4ID0gX2dldEluaXRpYWxDb250ZXh0KG9wdGlvbnMpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gZGVyZWZlcmVuY2UgQGNvbnRleHQga2V5IGlmIHByZXNlbnRcbiAgICBpZihfaXNPYmplY3QoY3R4KSAmJiAnQGNvbnRleHQnIGluIGN0eCkge1xuICAgICAgY3R4ID0gY3R4WydAY29udGV4dCddO1xuICAgIH1cblxuICAgIC8vIGNvbnRleHQgbXVzdCBiZSBhbiBvYmplY3QgYnkgbm93LCBhbGwgVVJMcyByZXRyaWV2ZWQgYmVmb3JlIHRoaXMgY2FsbFxuICAgIGlmKCFfaXNPYmplY3QoY3R4KSkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgQGNvbnRleHQgbXVzdCBiZSBhbiBvYmplY3QuJyxcbiAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCBsb2NhbCBjb250ZXh0JywgY29udGV4dDogY3R4fSk7XG4gICAgfVxuXG4gICAgLy8gZ2V0IGNvbnRleHQgZnJvbSBjYWNoZSBpZiBhdmFpbGFibGVcbiAgICBpZihqc29ubGQuY2FjaGUuYWN0aXZlQ3R4KSB7XG4gICAgICB2YXIgY2FjaGVkID0ganNvbmxkLmNhY2hlLmFjdGl2ZUN0eC5nZXQoYWN0aXZlQ3R4LCBjdHgpO1xuICAgICAgaWYoY2FjaGVkKSB7XG4gICAgICAgIHJ2YWwgPSBhY3RpdmVDdHggPSBjYWNoZWQ7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHVwZGF0ZSBhY3RpdmUgY29udGV4dCBhbmQgY2xvbmUgbmV3IG9uZSBiZWZvcmUgdXBkYXRpbmdcbiAgICBhY3RpdmVDdHggPSBydmFsO1xuICAgIHJ2YWwgPSBydmFsLmNsb25lKCk7XG5cbiAgICAvLyBkZWZpbmUgY29udGV4dCBtYXBwaW5ncyBmb3Iga2V5cyBpbiBsb2NhbCBjb250ZXh0XG4gICAgdmFyIGRlZmluZWQgPSB7fTtcblxuICAgIC8vIGhhbmRsZSBAYmFzZVxuICAgIGlmKCdAYmFzZScgaW4gY3R4KSB7XG4gICAgICB2YXIgYmFzZSA9IGN0eFsnQGJhc2UnXTtcblxuICAgICAgLy8gY2xlYXIgYmFzZVxuICAgICAgaWYoYmFzZSA9PT0gbnVsbCkge1xuICAgICAgICBiYXNlID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZighX2lzU3RyaW5nKGJhc2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgdGhlIHZhbHVlIG9mIFwiQGJhc2VcIiBpbiBhICcgK1xuICAgICAgICAgICdAY29udGV4dCBtdXN0IGJlIGEgc3RyaW5nIG9yIG51bGwuJyxcbiAgICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdpbnZhbGlkIGJhc2UgSVJJJywgY29udGV4dDogY3R4fSk7XG4gICAgICB9IGVsc2UgaWYoYmFzZSAhPT0gJycgJiYgIV9pc0Fic29sdXRlSXJpKGJhc2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgdGhlIHZhbHVlIG9mIFwiQGJhc2VcIiBpbiBhICcgK1xuICAgICAgICAgICdAY29udGV4dCBtdXN0IGJlIGFuIGFic29sdXRlIElSSSBvciB0aGUgZW1wdHkgc3RyaW5nLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCBiYXNlIElSSScsIGNvbnRleHQ6IGN0eH0pO1xuICAgICAgfVxuXG4gICAgICBpZihiYXNlICE9PSBudWxsKSB7XG4gICAgICAgIGJhc2UgPSBqc29ubGQudXJsLnBhcnNlKGJhc2UgfHwgJycpO1xuICAgICAgfVxuICAgICAgcnZhbFsnQGJhc2UnXSA9IGJhc2U7XG4gICAgICBkZWZpbmVkWydAYmFzZSddID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgQHZvY2FiXG4gICAgaWYoJ0B2b2NhYicgaW4gY3R4KSB7XG4gICAgICB2YXIgdmFsdWUgPSBjdHhbJ0B2b2NhYiddO1xuICAgICAgaWYodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgZGVsZXRlIHJ2YWxbJ0B2b2NhYiddO1xuICAgICAgfSBlbHNlIGlmKCFfaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgdGhlIHZhbHVlIG9mIFwiQHZvY2FiXCIgaW4gYSAnICtcbiAgICAgICAgICAnQGNvbnRleHQgbXVzdCBiZSBhIHN0cmluZyBvciBudWxsLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCB2b2NhYiBtYXBwaW5nJywgY29udGV4dDogY3R4fSk7XG4gICAgICB9IGVsc2UgaWYoIV9pc0Fic29sdXRlSXJpKHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IHRoZSB2YWx1ZSBvZiBcIkB2b2NhYlwiIGluIGEgJyArXG4gICAgICAgICAgJ0Bjb250ZXh0IG11c3QgYmUgYW4gYWJzb2x1dGUgSVJJLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCB2b2NhYiBtYXBwaW5nJywgY29udGV4dDogY3R4fSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBydmFsWydAdm9jYWInXSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgZGVmaW5lZFsnQHZvY2FiJ10gPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSBAbGFuZ3VhZ2VcbiAgICBpZignQGxhbmd1YWdlJyBpbiBjdHgpIHtcbiAgICAgIHZhciB2YWx1ZSA9IGN0eFsnQGxhbmd1YWdlJ107XG4gICAgICBpZih2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICBkZWxldGUgcnZhbFsnQGxhbmd1YWdlJ107XG4gICAgICB9IGVsc2UgaWYoIV9pc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyB0aGUgdmFsdWUgb2YgXCJAbGFuZ3VhZ2VcIiBpbiBhICcgK1xuICAgICAgICAgICdAY29udGV4dCBtdXN0IGJlIGEgc3RyaW5nIG9yIG51bGwuJyxcbiAgICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAgICB7Y29kZTogJ2ludmFsaWQgZGVmYXVsdCBsYW5ndWFnZScsIGNvbnRleHQ6IGN0eH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcnZhbFsnQGxhbmd1YWdlJ10gPSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgfVxuICAgICAgZGVmaW5lZFsnQGxhbmd1YWdlJ10gPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3MgYWxsIG90aGVyIGtleXNcbiAgICBmb3IodmFyIGtleSBpbiBjdHgpIHtcbiAgICAgIF9jcmVhdGVUZXJtRGVmaW5pdGlvbihydmFsLCBjdHgsIGtleSwgZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgLy8gY2FjaGUgcmVzdWx0XG4gICAgaWYoanNvbmxkLmNhY2hlLmFjdGl2ZUN0eCkge1xuICAgICAganNvbmxkLmNhY2hlLmFjdGl2ZUN0eC5zZXQoYWN0aXZlQ3R4LCBjdHgsIHJ2YWwpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBydmFsO1xufTtcblxuLyoqXG4gKiBFeHBhbmRzIGEgbGFuZ3VhZ2UgbWFwLlxuICpcbiAqIEBwYXJhbSBsYW5ndWFnZU1hcCB0aGUgbGFuZ3VhZ2UgbWFwIHRvIGV4cGFuZC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBleHBhbmRlZCBsYW5ndWFnZSBtYXAuXG4gKi9cbmZ1bmN0aW9uIF9leHBhbmRMYW5ndWFnZU1hcChsYW5ndWFnZU1hcCkge1xuICB2YXIgcnZhbCA9IFtdO1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGxhbmd1YWdlTWFwKS5zb3J0KCk7XG4gIGZvcih2YXIga2kgPSAwOyBraSA8IGtleXMubGVuZ3RoOyArK2tpKSB7XG4gICAgdmFyIGtleSA9IGtleXNba2ldO1xuICAgIHZhciB2YWwgPSBsYW5ndWFnZU1hcFtrZXldO1xuICAgIGlmKCFfaXNBcnJheSh2YWwpKSB7XG4gICAgICB2YWwgPSBbdmFsXTtcbiAgICB9XG4gICAgZm9yKHZhciB2aSA9IDA7IHZpIDwgdmFsLmxlbmd0aDsgKyt2aSkge1xuICAgICAgdmFyIGl0ZW0gPSB2YWxbdmldO1xuICAgICAgaWYoIV9pc1N0cmluZyhpdGVtKSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGxhbmd1YWdlIG1hcCB2YWx1ZXMgbXVzdCBiZSBzdHJpbmdzLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdpbnZhbGlkIGxhbmd1YWdlIG1hcCB2YWx1ZScsIGxhbmd1YWdlTWFwOiBsYW5ndWFnZU1hcH0pO1xuICAgICAgfVxuICAgICAgcnZhbC5wdXNoKHtcbiAgICAgICAgJ0B2YWx1ZSc6IGl0ZW0sXG4gICAgICAgICdAbGFuZ3VhZ2UnOiBrZXkudG9Mb3dlckNhc2UoKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBydmFsO1xufVxuXG4vKipcbiAqIExhYmVscyB0aGUgYmxhbmsgbm9kZXMgaW4gdGhlIGdpdmVuIHZhbHVlIHVzaW5nIHRoZSBnaXZlbiBVbmlxdWVOYW1lci5cbiAqXG4gKiBAcGFyYW0gbmFtZXIgdGhlIFVuaXF1ZU5hbWVyIHRvIHVzZS5cbiAqIEBwYXJhbSBlbGVtZW50IHRoZSBlbGVtZW50IHdpdGggYmxhbmsgbm9kZXMgdG8gcmVuYW1lLlxuICpcbiAqIEByZXR1cm4gdGhlIGVsZW1lbnQuXG4gKi9cbmZ1bmN0aW9uIF9sYWJlbEJsYW5rTm9kZXMobmFtZXIsIGVsZW1lbnQpIHtcbiAgaWYoX2lzQXJyYXkoZWxlbWVudCkpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgZWxlbWVudC5sZW5ndGg7ICsraSkge1xuICAgICAgZWxlbWVudFtpXSA9IF9sYWJlbEJsYW5rTm9kZXMobmFtZXIsIGVsZW1lbnRbaV0pO1xuICAgIH1cbiAgfSBlbHNlIGlmKF9pc0xpc3QoZWxlbWVudCkpIHtcbiAgICBlbGVtZW50WydAbGlzdCddID0gX2xhYmVsQmxhbmtOb2RlcyhuYW1lciwgZWxlbWVudFsnQGxpc3QnXSk7XG4gIH0gZWxzZSBpZihfaXNPYmplY3QoZWxlbWVudCkpIHtcbiAgICAvLyByZW5hbWUgYmxhbmsgbm9kZVxuICAgIGlmKF9pc0JsYW5rTm9kZShlbGVtZW50KSkge1xuICAgICAgZWxlbWVudFsnQGlkJ10gPSBuYW1lci5nZXROYW1lKGVsZW1lbnRbJ0BpZCddKTtcbiAgICB9XG5cbiAgICAvLyByZWN1cnNpdmVseSBhcHBseSB0byBhbGwga2V5c1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZWxlbWVudCkuc29ydCgpO1xuICAgIGZvcih2YXIga2kgPSAwOyBraSA8IGtleXMubGVuZ3RoOyArK2tpKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1traV07XG4gICAgICBpZihrZXkgIT09ICdAaWQnKSB7XG4gICAgICAgIGVsZW1lbnRba2V5XSA9IF9sYWJlbEJsYW5rTm9kZXMobmFtZXIsIGVsZW1lbnRba2V5XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbi8qKlxuICogRXhwYW5kcyB0aGUgZ2l2ZW4gdmFsdWUgYnkgdXNpbmcgdGhlIGNvZXJjaW9uIGFuZCBrZXl3b3JkIHJ1bGVzIGluIHRoZVxuICogZ2l2ZW4gY29udGV4dC5cbiAqXG4gKiBAcGFyYW0gYWN0aXZlQ3R4IHRoZSBhY3RpdmUgY29udGV4dCB0byB1c2UuXG4gKiBAcGFyYW0gYWN0aXZlUHJvcGVydHkgdGhlIGFjdGl2ZSBwcm9wZXJ0eSB0aGUgdmFsdWUgaXMgYXNzb2NpYXRlZCB3aXRoLlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBleHBhbmQuXG4gKlxuICogQHJldHVybiB0aGUgZXhwYW5kZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIF9leHBhbmRWYWx1ZShhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCB2YWx1ZSkge1xuICAvLyBub3RoaW5nIHRvIGV4cGFuZFxuICBpZih2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBzcGVjaWFsLWNhc2UgZXhwYW5kIEBpZCBhbmQgQHR5cGUgKHNraXBzICdAaWQnIGV4cGFuc2lvbilcbiAgdmFyIGV4cGFuZGVkUHJvcGVydHkgPSBfZXhwYW5kSXJpKGFjdGl2ZUN0eCwgYWN0aXZlUHJvcGVydHksIHt2b2NhYjogdHJ1ZX0pO1xuICBpZihleHBhbmRlZFByb3BlcnR5ID09PSAnQGlkJykge1xuICAgIHJldHVybiBfZXhwYW5kSXJpKGFjdGl2ZUN0eCwgdmFsdWUsIHtiYXNlOiB0cnVlfSk7XG4gIH0gZWxzZSBpZihleHBhbmRlZFByb3BlcnR5ID09PSAnQHR5cGUnKSB7XG4gICAgcmV0dXJuIF9leHBhbmRJcmkoYWN0aXZlQ3R4LCB2YWx1ZSwge3ZvY2FiOiB0cnVlLCBiYXNlOiB0cnVlfSk7XG4gIH1cblxuICAvLyBnZXQgdHlwZSBkZWZpbml0aW9uIGZyb20gY29udGV4dFxuICB2YXIgdHlwZSA9IGpzb25sZC5nZXRDb250ZXh0VmFsdWUoYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgJ0B0eXBlJyk7XG5cbiAgLy8gZG8gQGlkIGV4cGFuc2lvbiAoYXV0b21hdGljIGZvciBAZ3JhcGgpXG4gIGlmKHR5cGUgPT09ICdAaWQnIHx8IChleHBhbmRlZFByb3BlcnR5ID09PSAnQGdyYXBoJyAmJiBfaXNTdHJpbmcodmFsdWUpKSkge1xuICAgIHJldHVybiB7J0BpZCc6IF9leHBhbmRJcmkoYWN0aXZlQ3R4LCB2YWx1ZSwge2Jhc2U6IHRydWV9KX07XG4gIH1cbiAgLy8gZG8gQGlkIGV4cGFuc2lvbiB3L3ZvY2FiXG4gIGlmKHR5cGUgPT09ICdAdm9jYWInKSB7XG4gICAgcmV0dXJuIHsnQGlkJzogX2V4cGFuZElyaShhY3RpdmVDdHgsIHZhbHVlLCB7dm9jYWI6IHRydWUsIGJhc2U6IHRydWV9KX07XG4gIH1cblxuICAvLyBkbyBub3QgZXhwYW5kIGtleXdvcmQgdmFsdWVzXG4gIGlmKF9pc0tleXdvcmQoZXhwYW5kZWRQcm9wZXJ0eSkpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB2YXIgcnZhbCA9IHt9O1xuXG4gIGlmKHR5cGUgIT09IG51bGwpIHtcbiAgICAvLyBvdGhlciB0eXBlXG4gICAgcnZhbFsnQHR5cGUnXSA9IHR5cGU7XG4gIH0gZWxzZSBpZihfaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgLy8gY2hlY2sgZm9yIGxhbmd1YWdlIHRhZ2dpbmcgZm9yIHN0cmluZ3NcbiAgICB2YXIgbGFuZ3VhZ2UgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKFxuICAgICAgYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgJ0BsYW5ndWFnZScpO1xuICAgIGlmKGxhbmd1YWdlICE9PSBudWxsKSB7XG4gICAgICBydmFsWydAbGFuZ3VhZ2UnXSA9IGxhbmd1YWdlO1xuICAgIH1cbiAgfVxuICAvLyBkbyBjb252ZXJzaW9uIG9mIHZhbHVlcyB0aGF0IGFyZW4ndCBiYXNpYyBKU09OIHR5cGVzIHRvIHN0cmluZ3NcbiAgaWYoWydib29sZWFuJywgJ251bWJlcicsICdzdHJpbmcnXS5pbmRleE9mKHR5cGVvZiB2YWx1ZSkgPT09IC0xKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpO1xuICB9XG4gIHJ2YWxbJ0B2YWx1ZSddID0gdmFsdWU7XG5cbiAgcmV0dXJuIHJ2YWw7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJheSBvZiBSREYgdHJpcGxlcyBmb3IgdGhlIGdpdmVuIGdyYXBoLlxuICpcbiAqIEBwYXJhbSBncmFwaCB0aGUgZ3JhcGggdG8gY3JlYXRlIFJERiB0cmlwbGVzIGZvci5cbiAqIEBwYXJhbSBuYW1lciBhIFVuaXF1ZU5hbWVyIGZvciBhc3NpZ25pbmcgYmxhbmsgbm9kZSBuYW1lcy5cbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBSREYgc2VyaWFsaXphdGlvbiBvcHRpb25zLlxuICpcbiAqIEByZXR1cm4gdGhlIGFycmF5IG9mIFJERiB0cmlwbGVzIGZvciB0aGUgZ2l2ZW4gZ3JhcGguXG4gKi9cbmZ1bmN0aW9uIF9ncmFwaFRvUkRGKGdyYXBoLCBuYW1lciwgb3B0aW9ucykge1xuICB2YXIgcnZhbCA9IFtdO1xuXG4gIHZhciBpZHMgPSBPYmplY3Qua2V5cyhncmFwaCkuc29ydCgpO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgaWRzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGlkID0gaWRzW2ldO1xuICAgIHZhciBub2RlID0gZ3JhcGhbaWRdO1xuICAgIHZhciBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMobm9kZSkuc29ydCgpO1xuICAgIGZvcih2YXIgcGkgPSAwOyBwaSA8IHByb3BlcnRpZXMubGVuZ3RoOyArK3BpKSB7XG4gICAgICB2YXIgcHJvcGVydHkgPSBwcm9wZXJ0aWVzW3BpXTtcbiAgICAgIHZhciBpdGVtcyA9IG5vZGVbcHJvcGVydHldO1xuICAgICAgaWYocHJvcGVydHkgPT09ICdAdHlwZScpIHtcbiAgICAgICAgcHJvcGVydHkgPSBSREZfVFlQRTtcbiAgICAgIH0gZWxzZSBpZihfaXNLZXl3b3JkKHByb3BlcnR5KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yKHZhciBpaSA9IDA7IGlpIDwgaXRlbXMubGVuZ3RoOyArK2lpKSB7XG4gICAgICAgIHZhciBpdGVtID0gaXRlbXNbaWldO1xuXG4gICAgICAgIC8vIFJERiBzdWJqZWN0XG4gICAgICAgIHZhciBzdWJqZWN0ID0ge307XG4gICAgICAgIHN1YmplY3QudHlwZSA9IChpZC5pbmRleE9mKCdfOicpID09PSAwKSA/ICdibGFuayBub2RlJyA6ICdJUkknO1xuICAgICAgICBzdWJqZWN0LnZhbHVlID0gaWQ7XG5cbiAgICAgICAgLy8gc2tpcCByZWxhdGl2ZSBJUkkgc3ViamVjdHNcbiAgICAgICAgaWYoIV9pc0Fic29sdXRlSXJpKGlkKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUkRGIHByZWRpY2F0ZVxuICAgICAgICB2YXIgcHJlZGljYXRlID0ge307XG4gICAgICAgIHByZWRpY2F0ZS50eXBlID0gKHByb3BlcnR5LmluZGV4T2YoJ186JykgPT09IDApID8gJ2JsYW5rIG5vZGUnIDogJ0lSSSc7XG4gICAgICAgIHByZWRpY2F0ZS52YWx1ZSA9IHByb3BlcnR5O1xuXG4gICAgICAgIC8vIHNraXAgcmVsYXRpdmUgSVJJIHByZWRpY2F0ZXNcbiAgICAgICAgaWYoIV9pc0Fic29sdXRlSXJpKHByb3BlcnR5KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2tpcCBibGFuayBub2RlIHByZWRpY2F0ZXMgdW5sZXNzIHByb2R1Y2luZyBnZW5lcmFsaXplZCBSREZcbiAgICAgICAgaWYocHJlZGljYXRlLnR5cGUgPT09ICdibGFuayBub2RlJyAmJiAhb3B0aW9ucy5wcm9kdWNlR2VuZXJhbGl6ZWRSZGYpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbnZlcnQgQGxpc3QgdG8gdHJpcGxlc1xuICAgICAgICBpZihfaXNMaXN0KGl0ZW0pKSB7XG4gICAgICAgICAgX2xpc3RUb1JERihpdGVtWydAbGlzdCddLCBuYW1lciwgc3ViamVjdCwgcHJlZGljYXRlLCBydmFsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBjb252ZXJ0IHZhbHVlIG9yIG5vZGUgb2JqZWN0IHRvIHRyaXBsZVxuICAgICAgICAgIHZhciBvYmplY3QgPSBfb2JqZWN0VG9SREYoaXRlbSk7XG4gICAgICAgICAgLy8gc2tpcCBudWxsIG9iamVjdHMgKHRoZXkgYXJlIHJlbGF0aXZlIElSSXMpXG4gICAgICAgICAgaWYob2JqZWN0KSB7XG4gICAgICAgICAgICBydmFsLnB1c2goe3N1YmplY3Q6IHN1YmplY3QsIHByZWRpY2F0ZTogcHJlZGljYXRlLCBvYmplY3Q6IG9iamVjdH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBydmFsO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgQGxpc3QgdmFsdWUgaW50byBsaW5rZWQgbGlzdCBvZiBibGFuayBub2RlIFJERiB0cmlwbGVzXG4gKiAoYW4gUkRGIGNvbGxlY3Rpb24pLlxuICpcbiAqIEBwYXJhbSBsaXN0IHRoZSBAbGlzdCB2YWx1ZS5cbiAqIEBwYXJhbSBuYW1lciBhIFVuaXF1ZU5hbWVyIGZvciBhc3NpZ25pbmcgYmxhbmsgbm9kZSBuYW1lcy5cbiAqIEBwYXJhbSBzdWJqZWN0IHRoZSBzdWJqZWN0IGZvciB0aGUgaGVhZCBvZiB0aGUgbGlzdC5cbiAqIEBwYXJhbSBwcmVkaWNhdGUgdGhlIHByZWRpY2F0ZSBmb3IgdGhlIGhlYWQgb2YgdGhlIGxpc3QuXG4gKiBAcGFyYW0gdHJpcGxlcyB0aGUgYXJyYXkgb2YgdHJpcGxlcyB0byBhcHBlbmQgdG8uXG4gKi9cbmZ1bmN0aW9uIF9saXN0VG9SREYobGlzdCwgbmFtZXIsIHN1YmplY3QsIHByZWRpY2F0ZSwgdHJpcGxlcykge1xuICB2YXIgZmlyc3QgPSB7dHlwZTogJ0lSSScsIHZhbHVlOiBSREZfRklSU1R9O1xuICB2YXIgcmVzdCA9IHt0eXBlOiAnSVJJJywgdmFsdWU6IFJERl9SRVNUfTtcbiAgdmFyIG5pbCA9IHt0eXBlOiAnSVJJJywgdmFsdWU6IFJERl9OSUx9O1xuXG4gIGZvcih2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldO1xuXG4gICAgdmFyIGJsYW5rTm9kZSA9IHt0eXBlOiAnYmxhbmsgbm9kZScsIHZhbHVlOiBuYW1lci5nZXROYW1lKCl9O1xuICAgIHRyaXBsZXMucHVzaCh7c3ViamVjdDogc3ViamVjdCwgcHJlZGljYXRlOiBwcmVkaWNhdGUsIG9iamVjdDogYmxhbmtOb2RlfSk7XG5cbiAgICBzdWJqZWN0ID0gYmxhbmtOb2RlO1xuICAgIHByZWRpY2F0ZSA9IGZpcnN0O1xuICAgIHZhciBvYmplY3QgPSBfb2JqZWN0VG9SREYoaXRlbSk7XG5cbiAgICAvLyBza2lwIG51bGwgb2JqZWN0cyAodGhleSBhcmUgcmVsYXRpdmUgSVJJcylcbiAgICBpZihvYmplY3QpIHtcbiAgICAgIHRyaXBsZXMucHVzaCh7c3ViamVjdDogc3ViamVjdCwgcHJlZGljYXRlOiBwcmVkaWNhdGUsIG9iamVjdDogb2JqZWN0fSk7XG4gICAgfVxuXG4gICAgcHJlZGljYXRlID0gcmVzdDtcbiAgfVxuXG4gIHRyaXBsZXMucHVzaCh7c3ViamVjdDogc3ViamVjdCwgcHJlZGljYXRlOiBwcmVkaWNhdGUsIG9iamVjdDogbmlsfSk7XG59XG5cbi8qKlxuICogQ29udmVydHMgYSBKU09OLUxEIHZhbHVlIG9iamVjdCB0byBhbiBSREYgbGl0ZXJhbCBvciBhIEpTT04tTEQgc3RyaW5nIG9yXG4gKiBub2RlIG9iamVjdCB0byBhbiBSREYgcmVzb3VyY2UuXG4gKlxuICogQHBhcmFtIGl0ZW0gdGhlIEpTT04tTEQgdmFsdWUgb3Igbm9kZSBvYmplY3QuXG4gKlxuICogQHJldHVybiB0aGUgUkRGIGxpdGVyYWwgb3IgUkRGIHJlc291cmNlLlxuICovXG5mdW5jdGlvbiBfb2JqZWN0VG9SREYoaXRlbSkge1xuICB2YXIgb2JqZWN0ID0ge307XG5cbiAgLy8gY29udmVydCB2YWx1ZSBvYmplY3QgdG8gUkRGXG4gIGlmKF9pc1ZhbHVlKGl0ZW0pKSB7XG4gICAgb2JqZWN0LnR5cGUgPSAnbGl0ZXJhbCc7XG4gICAgdmFyIHZhbHVlID0gaXRlbVsnQHZhbHVlJ107XG4gICAgdmFyIGRhdGF0eXBlID0gaXRlbVsnQHR5cGUnXSB8fCBudWxsO1xuXG4gICAgLy8gY29udmVydCB0byBYU0QgZGF0YXR5cGVzIGFzIGFwcHJvcHJpYXRlXG4gICAgaWYoX2lzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICAgIG9iamVjdC52YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICBvYmplY3QuZGF0YXR5cGUgPSBkYXRhdHlwZSB8fCBYU0RfQk9PTEVBTjtcbiAgICB9IGVsc2UgaWYoX2lzRG91YmxlKHZhbHVlKSB8fCBkYXRhdHlwZSA9PT0gWFNEX0RPVUJMRSkge1xuICAgICAgaWYoIV9pc0RvdWJsZSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUgPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIC8vIGNhbm9uaWNhbCBkb3VibGUgcmVwcmVzZW50YXRpb25cbiAgICAgIG9iamVjdC52YWx1ZSA9IHZhbHVlLnRvRXhwb25lbnRpYWwoMTUpLnJlcGxhY2UoLyhcXGQpMCplXFwrPy8sICckMUUnKTtcbiAgICAgIG9iamVjdC5kYXRhdHlwZSA9IGRhdGF0eXBlIHx8IFhTRF9ET1VCTEU7XG4gICAgfSBlbHNlIGlmKF9pc051bWJlcih2YWx1ZSkpIHtcbiAgICAgIG9iamVjdC52YWx1ZSA9IHZhbHVlLnRvRml4ZWQoMCk7XG4gICAgICBvYmplY3QuZGF0YXR5cGUgPSBkYXRhdHlwZSB8fCBYU0RfSU5URUdFUjtcbiAgICB9IGVsc2UgaWYoJ0BsYW5ndWFnZScgaW4gaXRlbSkge1xuICAgICAgb2JqZWN0LnZhbHVlID0gdmFsdWU7XG4gICAgICBvYmplY3QuZGF0YXR5cGUgPSBkYXRhdHlwZSB8fCBSREZfTEFOR1NUUklORztcbiAgICAgIG9iamVjdC5sYW5ndWFnZSA9IGl0ZW1bJ0BsYW5ndWFnZSddO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmplY3QudmFsdWUgPSB2YWx1ZTtcbiAgICAgIG9iamVjdC5kYXRhdHlwZSA9IGRhdGF0eXBlIHx8IFhTRF9TVFJJTkc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGNvbnZlcnQgc3RyaW5nL25vZGUgb2JqZWN0IHRvIFJERlxuICAgIHZhciBpZCA9IF9pc09iamVjdChpdGVtKSA/IGl0ZW1bJ0BpZCddIDogaXRlbTtcbiAgICBvYmplY3QudHlwZSA9IChpZC5pbmRleE9mKCdfOicpID09PSAwKSA/ICdibGFuayBub2RlJyA6ICdJUkknO1xuICAgIG9iamVjdC52YWx1ZSA9IGlkO1xuICB9XG5cbiAgLy8gc2tpcCByZWxhdGl2ZSBJUklzXG4gIGlmKG9iamVjdC50eXBlID09PSAnSVJJJyAmJiAhX2lzQWJzb2x1dGVJcmkob2JqZWN0LnZhbHVlKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG9iamVjdDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhbiBSREYgdHJpcGxlIG9iamVjdCB0byBhIEpTT04tTEQgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBvIHRoZSBSREYgdHJpcGxlIG9iamVjdCB0byBjb252ZXJ0LlxuICogQHBhcmFtIHVzZU5hdGl2ZVR5cGVzIHRydWUgdG8gb3V0cHV0IG5hdGl2ZSB0eXBlcywgZmFsc2Ugbm90IHRvLlxuICpcbiAqIEByZXR1cm4gdGhlIEpTT04tTEQgb2JqZWN0LlxuICovXG5mdW5jdGlvbiBfUkRGVG9PYmplY3QobywgdXNlTmF0aXZlVHlwZXMpIHtcbiAgLy8gY29udmVydCBJUkkvYmxhbmsgbm9kZSBvYmplY3QgdG8gSlNPTi1MRFxuICBpZihvLnR5cGUgPT09ICdJUkknIHx8IG8udHlwZSA9PT0gJ2JsYW5rIG5vZGUnKSB7XG4gICAgcmV0dXJuIHsnQGlkJzogby52YWx1ZX07XG4gIH1cblxuICAvLyBjb252ZXJ0IGxpdGVyYWwgdG8gSlNPTi1MRFxuICB2YXIgcnZhbCA9IHsnQHZhbHVlJzogby52YWx1ZX07XG5cbiAgLy8gYWRkIGxhbmd1YWdlXG4gIGlmKG8ubGFuZ3VhZ2UpIHtcbiAgICBydmFsWydAbGFuZ3VhZ2UnXSA9IG8ubGFuZ3VhZ2U7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHR5cGUgPSBvLmRhdGF0eXBlO1xuICAgIGlmKCF0eXBlKSB7XG4gICAgICB0eXBlID0gWFNEX1NUUklORztcbiAgICB9XG4gICAgLy8gdXNlIG5hdGl2ZSB0eXBlcyBmb3IgY2VydGFpbiB4c2QgdHlwZXNcbiAgICBpZih1c2VOYXRpdmVUeXBlcykge1xuICAgICAgaWYodHlwZSA9PT0gWFNEX0JPT0xFQU4pIHtcbiAgICAgICAgaWYocnZhbFsnQHZhbHVlJ10gPT09ICd0cnVlJykge1xuICAgICAgICAgIHJ2YWxbJ0B2YWx1ZSddID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmKHJ2YWxbJ0B2YWx1ZSddID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgcnZhbFsnQHZhbHVlJ10gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmKF9pc051bWVyaWMocnZhbFsnQHZhbHVlJ10pKSB7XG4gICAgICAgIGlmKHR5cGUgPT09IFhTRF9JTlRFR0VSKSB7XG4gICAgICAgICAgdmFyIGkgPSBwYXJzZUludChydmFsWydAdmFsdWUnXSwgMTApO1xuICAgICAgICAgIGlmKGkudG9GaXhlZCgwKSA9PT0gcnZhbFsnQHZhbHVlJ10pIHtcbiAgICAgICAgICAgIHJ2YWxbJ0B2YWx1ZSddID0gaTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZih0eXBlID09PSBYU0RfRE9VQkxFKSB7XG4gICAgICAgICAgcnZhbFsnQHZhbHVlJ10gPSBwYXJzZUZsb2F0KHJ2YWxbJ0B2YWx1ZSddKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gZG8gbm90IGFkZCBuYXRpdmUgdHlwZVxuICAgICAgaWYoW1hTRF9CT09MRUFOLCBYU0RfSU5URUdFUiwgWFNEX0RPVUJMRSwgWFNEX1NUUklOR11cbiAgICAgICAgLmluZGV4T2YodHlwZSkgPT09IC0xKSB7XG4gICAgICAgIHJ2YWxbJ0B0eXBlJ10gPSB0eXBlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZih0eXBlICE9PSBYU0RfU1RSSU5HKSB7XG4gICAgICBydmFsWydAdHlwZSddID0gdHlwZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcnZhbDtcbn1cblxuLyoqXG4gKiBDb21wYXJlcyB0d28gUkRGIHRyaXBsZXMgZm9yIGVxdWFsaXR5LlxuICpcbiAqIEBwYXJhbSB0MSB0aGUgZmlyc3QgdHJpcGxlLlxuICogQHBhcmFtIHQyIHRoZSBzZWNvbmQgdHJpcGxlLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdHJpcGxlcyBhcmUgdGhlIHNhbWUsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2NvbXBhcmVSREZUcmlwbGVzKHQxLCB0Mikge1xuICB2YXIgYXR0cnMgPSBbJ3N1YmplY3QnLCAncHJlZGljYXRlJywgJ29iamVjdCddO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgYXR0cnMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYXR0ciA9IGF0dHJzW2ldO1xuICAgIGlmKHQxW2F0dHJdLnR5cGUgIT09IHQyW2F0dHJdLnR5cGUgfHwgdDFbYXR0cl0udmFsdWUgIT09IHQyW2F0dHJdLnZhbHVlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIGlmKHQxLm9iamVjdC5sYW5ndWFnZSAhPT0gdDIub2JqZWN0Lmxhbmd1YWdlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmKHQxLm9iamVjdC5kYXRhdHlwZSAhPT0gdDIub2JqZWN0LmRhdGF0eXBlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEhhc2hlcyBhbGwgb2YgdGhlIHF1YWRzIGFib3V0IGEgYmxhbmsgbm9kZS5cbiAqXG4gKiBAcGFyYW0gaWQgdGhlIElEIG9mIHRoZSBibm9kZSB0byBoYXNoIHF1YWRzIGZvci5cbiAqIEBwYXJhbSBibm9kZXMgdGhlIG1hcHBpbmcgb2YgYm5vZGVzIHRvIHF1YWRzLlxuICpcbiAqIEByZXR1cm4gdGhlIG5ldyBoYXNoLlxuICovXG5mdW5jdGlvbiBfaGFzaFF1YWRzKGlkLCBibm9kZXMpIHtcbiAgLy8gcmV0dXJuIGNhY2hlZCBoYXNoXG4gIGlmKCdoYXNoJyBpbiBibm9kZXNbaWRdKSB7XG4gICAgcmV0dXJuIGJub2Rlc1tpZF0uaGFzaDtcbiAgfVxuXG4gIC8vIHNlcmlhbGl6ZSBhbGwgb2YgYm5vZGUncyBxdWFkc1xuICB2YXIgcXVhZHMgPSBibm9kZXNbaWRdLnF1YWRzO1xuICB2YXIgbnF1YWRzID0gW107XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBxdWFkcy5sZW5ndGg7ICsraSkge1xuICAgIG5xdWFkcy5wdXNoKF90b05RdWFkKFxuICAgICAgcXVhZHNbaV0sIHF1YWRzW2ldLm5hbWUgPyBxdWFkc1tpXS5uYW1lLnZhbHVlIDogbnVsbCwgaWQpKTtcbiAgfVxuICAvLyBzb3J0IHNlcmlhbGl6ZWQgcXVhZHNcbiAgbnF1YWRzLnNvcnQoKTtcbiAgLy8gcmV0dXJuIGhhc2hlZCBxdWFkc1xuICB2YXIgaGFzaCA9IGJub2Rlc1tpZF0uaGFzaCA9IHNoYTEuaGFzaChucXVhZHMpO1xuICByZXR1cm4gaGFzaDtcbn1cblxuLyoqXG4gKiBQcm9kdWNlcyBhIGhhc2ggZm9yIHRoZSBwYXRocyBvZiBhZGphY2VudCBibm9kZXMgZm9yIGEgYm5vZGUsXG4gKiBpbmNvcnBvcmF0aW5nIGFsbCBpbmZvcm1hdGlvbiBhYm91dCBpdHMgc3ViZ3JhcGggb2YgYm5vZGVzLiBUaGlzXG4gKiBtZXRob2Qgd2lsbCByZWN1cnNpdmVseSBwaWNrIGFkamFjZW50IGJub2RlIHBlcm11dGF0aW9ucyB0aGF0IHByb2R1Y2UgdGhlXG4gKiBsZXhpY29ncmFwaGljYWxseS1sZWFzdCAncGF0aCcgc2VyaWFsaXphdGlvbnMuXG4gKlxuICogQHBhcmFtIGlkIHRoZSBJRCBvZiB0aGUgYm5vZGUgdG8gaGFzaCBwYXRocyBmb3IuXG4gKiBAcGFyYW0gYm5vZGVzIHRoZSBtYXAgb2YgYm5vZGUgcXVhZHMuXG4gKiBAcGFyYW0gbmFtZXIgdGhlIGNhbm9uaWNhbCBibm9kZSBuYW1lci5cbiAqIEBwYXJhbSBwYXRoTmFtZXIgdGhlIG5hbWVyIHVzZWQgdG8gYXNzaWduIG5hbWVzIHRvIGFkamFjZW50IGJub2Rlcy5cbiAqIEBwYXJhbSBjYWxsYmFjayhlcnIsIHJlc3VsdCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmZ1bmN0aW9uIF9oYXNoUGF0aHMoaWQsIGJub2RlcywgbmFtZXIsIHBhdGhOYW1lciwgY2FsbGJhY2spIHtcbiAgLy8gY3JlYXRlIFNIQS0xIGRpZ2VzdFxuICB2YXIgbWQgPSBzaGExLmNyZWF0ZSgpO1xuXG4gIC8vIGdyb3VwIGFkamFjZW50IGJub2RlcyBieSBoYXNoLCBrZWVwIHByb3BlcnRpZXMgYW5kIHJlZmVyZW5jZXMgc2VwYXJhdGVcbiAgdmFyIGdyb3VwcyA9IHt9O1xuICB2YXIgZ3JvdXBIYXNoZXM7XG4gIHZhciBxdWFkcyA9IGJub2Rlc1tpZF0ucXVhZHM7XG4gIGpzb25sZC5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7Z3JvdXBOb2RlcygwKTt9KTtcbiAgZnVuY3Rpb24gZ3JvdXBOb2RlcyhpKSB7XG4gICAgaWYoaSA9PT0gcXVhZHMubGVuZ3RoKSB7XG4gICAgICAvLyBkb25lLCBoYXNoIGdyb3Vwc1xuICAgICAgZ3JvdXBIYXNoZXMgPSBPYmplY3Qua2V5cyhncm91cHMpLnNvcnQoKTtcbiAgICAgIHJldHVybiBoYXNoR3JvdXAoMCk7XG4gICAgfVxuXG4gICAgLy8gZ2V0IGFkamFjZW50IGJub2RlXG4gICAgdmFyIHF1YWQgPSBxdWFkc1tpXTtcbiAgICB2YXIgYm5vZGUgPSBfZ2V0QWRqYWNlbnRCbGFua05vZGVOYW1lKHF1YWQuc3ViamVjdCwgaWQpO1xuICAgIHZhciBkaXJlY3Rpb24gPSBudWxsO1xuICAgIGlmKGJub2RlICE9PSBudWxsKSB7XG4gICAgICAvLyBub3JtYWwgcHJvcGVydHlcbiAgICAgIGRpcmVjdGlvbiA9ICdwJztcbiAgICB9IGVsc2Uge1xuICAgICAgYm5vZGUgPSBfZ2V0QWRqYWNlbnRCbGFua05vZGVOYW1lKHF1YWQub2JqZWN0LCBpZCk7XG4gICAgICBpZihibm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAvLyByZXZlcnNlIHByb3BlcnR5XG4gICAgICAgIGRpcmVjdGlvbiA9ICdyJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihibm9kZSAhPT0gbnVsbCkge1xuICAgICAgLy8gZ2V0IGJub2RlIG5hbWUgKHRyeSBjYW5vbmljYWwsIHBhdGgsIHRoZW4gaGFzaClcbiAgICAgIHZhciBuYW1lO1xuICAgICAgaWYobmFtZXIuaXNOYW1lZChibm9kZSkpIHtcbiAgICAgICAgbmFtZSA9IG5hbWVyLmdldE5hbWUoYm5vZGUpO1xuICAgICAgfSBlbHNlIGlmKHBhdGhOYW1lci5pc05hbWVkKGJub2RlKSkge1xuICAgICAgICBuYW1lID0gcGF0aE5hbWVyLmdldE5hbWUoYm5vZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmFtZSA9IF9oYXNoUXVhZHMoYm5vZGUsIGJub2Rlcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGhhc2ggZGlyZWN0aW9uLCBwcm9wZXJ0eSwgYW5kIGJub2RlIG5hbWUvaGFzaFxuICAgICAgdmFyIG1kID0gc2hhMS5jcmVhdGUoKTtcbiAgICAgIG1kLnVwZGF0ZShkaXJlY3Rpb24pO1xuICAgICAgbWQudXBkYXRlKHF1YWQucHJlZGljYXRlLnZhbHVlKTtcbiAgICAgIG1kLnVwZGF0ZShuYW1lKTtcbiAgICAgIHZhciBncm91cEhhc2ggPSBtZC5kaWdlc3QoKTtcblxuICAgICAgLy8gYWRkIGJub2RlIHRvIGhhc2ggZ3JvdXBcbiAgICAgIGlmKGdyb3VwSGFzaCBpbiBncm91cHMpIHtcbiAgICAgICAgZ3JvdXBzW2dyb3VwSGFzaF0ucHVzaChibm9kZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBncm91cHNbZ3JvdXBIYXNoXSA9IFtibm9kZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAganNvbmxkLnNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtncm91cE5vZGVzKGkgKyAxKTt9KTtcbiAgfVxuXG4gIC8vIGhhc2hlcyBhIGdyb3VwIG9mIGFkamFjZW50IGJub2Rlc1xuICBmdW5jdGlvbiBoYXNoR3JvdXAoaSkge1xuICAgIGlmKGkgPT09IGdyb3VwSGFzaGVzLmxlbmd0aCkge1xuICAgICAgLy8gZG9uZSwgcmV0dXJuIFNIQS0xIGRpZ2VzdCBhbmQgcGF0aCBuYW1lclxuICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHtoYXNoOiBtZC5kaWdlc3QoKSwgcGF0aE5hbWVyOiBwYXRoTmFtZXJ9KTtcbiAgICB9XG5cbiAgICAvLyBkaWdlc3QgZ3JvdXAgaGFzaFxuICAgIHZhciBncm91cEhhc2ggPSBncm91cEhhc2hlc1tpXTtcbiAgICBtZC51cGRhdGUoZ3JvdXBIYXNoKTtcblxuICAgIC8vIGNob29zZSBhIHBhdGggYW5kIG5hbWVyIGZyb20gdGhlIHBlcm11dGF0aW9uc1xuICAgIHZhciBjaG9zZW5QYXRoID0gbnVsbDtcbiAgICB2YXIgY2hvc2VuTmFtZXIgPSBudWxsO1xuICAgIHZhciBwZXJtdXRhdG9yID0gbmV3IFBlcm11dGF0b3IoZ3JvdXBzW2dyb3VwSGFzaF0pO1xuICAgIGpzb25sZC5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7cGVybXV0YXRlKCk7fSk7XG4gICAgZnVuY3Rpb24gcGVybXV0YXRlKCkge1xuICAgICAgdmFyIHBlcm11dGF0aW9uID0gcGVybXV0YXRvci5uZXh0KCk7XG4gICAgICB2YXIgcGF0aE5hbWVyQ29weSA9IHBhdGhOYW1lci5jbG9uZSgpO1xuXG4gICAgICAvLyBidWlsZCBhZGphY2VudCBwYXRoXG4gICAgICB2YXIgcGF0aCA9ICcnO1xuICAgICAgdmFyIHJlY3Vyc2UgPSBbXTtcbiAgICAgIGZvcih2YXIgbiBpbiBwZXJtdXRhdGlvbikge1xuICAgICAgICB2YXIgYm5vZGUgPSBwZXJtdXRhdGlvbltuXTtcblxuICAgICAgICAvLyB1c2UgY2Fub25pY2FsIG5hbWUgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmKG5hbWVyLmlzTmFtZWQoYm5vZGUpKSB7XG4gICAgICAgICAgcGF0aCArPSBuYW1lci5nZXROYW1lKGJub2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyByZWN1cnNlIGlmIGJub2RlIGlzbid0IG5hbWVkIGluIHRoZSBwYXRoIHlldFxuICAgICAgICAgIGlmKCFwYXRoTmFtZXJDb3B5LmlzTmFtZWQoYm5vZGUpKSB7XG4gICAgICAgICAgICByZWN1cnNlLnB1c2goYm5vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwYXRoICs9IHBhdGhOYW1lckNvcHkuZ2V0TmFtZShibm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBza2lwIHBlcm11dGF0aW9uIGlmIHBhdGggaXMgYWxyZWFkeSA+PSBjaG9zZW4gcGF0aFxuICAgICAgICBpZihjaG9zZW5QYXRoICE9PSBudWxsICYmIHBhdGgubGVuZ3RoID49IGNob3NlblBhdGgubGVuZ3RoICYmXG4gICAgICAgICAgcGF0aCA+IGNob3NlblBhdGgpIHtcbiAgICAgICAgICByZXR1cm4gbmV4dFBlcm11dGF0aW9uKHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGRvZXMgdGhlIG5leHQgcmVjdXJzaW9uXG4gICAgICBuZXh0UmVjdXJzaW9uKDApO1xuICAgICAgZnVuY3Rpb24gbmV4dFJlY3Vyc2lvbihuKSB7XG4gICAgICAgIGlmKG4gPT09IHJlY3Vyc2UubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gZG9uZSwgZG8gbmV4dCBwZXJtdXRhdGlvblxuICAgICAgICAgIHJldHVybiBuZXh0UGVybXV0YXRpb24oZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZG8gcmVjdXJzaW9uXG4gICAgICAgIHZhciBibm9kZSA9IHJlY3Vyc2Vbbl07XG4gICAgICAgIF9oYXNoUGF0aHMoYm5vZGUsIGJub2RlcywgbmFtZXIsIHBhdGhOYW1lckNvcHksXG4gICAgICAgICAgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhdGggKz0gcGF0aE5hbWVyQ29weS5nZXROYW1lKGJub2RlKSArICc8JyArIHJlc3VsdC5oYXNoICsgJz4nO1xuICAgICAgICAgICAgcGF0aE5hbWVyQ29weSA9IHJlc3VsdC5wYXRoTmFtZXI7XG5cbiAgICAgICAgICAgIC8vIHNraXAgcGVybXV0YXRpb24gaWYgcGF0aCBpcyBhbHJlYWR5ID49IGNob3NlbiBwYXRoXG4gICAgICAgICAgICBpZihjaG9zZW5QYXRoICE9PSBudWxsICYmIHBhdGgubGVuZ3RoID49IGNob3NlblBhdGgubGVuZ3RoICYmXG4gICAgICAgICAgICAgIHBhdGggPiBjaG9zZW5QYXRoKSB7XG4gICAgICAgICAgICAgIHJldHVybiBuZXh0UGVybXV0YXRpb24odHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGRvIG5leHQgcmVjdXJzaW9uXG4gICAgICAgICAgICBuZXh0UmVjdXJzaW9uKG4gKyAxKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gc3RvcmVzIHRoZSByZXN1bHRzIG9mIHRoaXMgcGVybXV0YXRpb24gYW5kIHJ1bnMgdGhlIG5leHRcbiAgICAgIGZ1bmN0aW9uIG5leHRQZXJtdXRhdGlvbihza2lwcGVkKSB7XG4gICAgICAgIGlmKCFza2lwcGVkICYmIChjaG9zZW5QYXRoID09PSBudWxsIHx8IHBhdGggPCBjaG9zZW5QYXRoKSkge1xuICAgICAgICAgIGNob3NlblBhdGggPSBwYXRoO1xuICAgICAgICAgIGNob3Nlbk5hbWVyID0gcGF0aE5hbWVyQ29weTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRvIG5leHQgcGVybXV0YXRpb25cbiAgICAgICAgaWYocGVybXV0YXRvci5oYXNOZXh0KCkpIHtcbiAgICAgICAgICBqc29ubGQuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge3Blcm11dGF0ZSgpO30pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGRpZ2VzdCBjaG9zZW4gcGF0aCBhbmQgdXBkYXRlIG5hbWVyXG4gICAgICAgICAgbWQudXBkYXRlKGNob3NlblBhdGgpO1xuICAgICAgICAgIHBhdGhOYW1lciA9IGNob3Nlbk5hbWVyO1xuXG4gICAgICAgICAgLy8gaGFzaCB0aGUgbmV4dCBncm91cFxuICAgICAgICAgIGhhc2hHcm91cChpICsgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBIGhlbHBlciBmdW5jdGlvbiB0aGF0IGdldHMgdGhlIGJsYW5rIG5vZGUgbmFtZSBmcm9tIGFuIFJERiBxdWFkIG5vZGVcbiAqIChzdWJqZWN0IG9yIG9iamVjdCkuIElmIHRoZSBub2RlIGlzIGEgYmxhbmsgbm9kZSBhbmQgaXRzIHZhbHVlXG4gKiBkb2VzIG5vdCBtYXRjaCB0aGUgZ2l2ZW4gYmxhbmsgbm9kZSBJRCwgaXQgd2lsbCBiZSByZXR1cm5lZC5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgUkRGIHF1YWQgbm9kZS5cbiAqIEBwYXJhbSBpZCB0aGUgSUQgb2YgdGhlIGJsYW5rIG5vZGUgdG8gbG9vayBuZXh0IHRvLlxuICpcbiAqIEByZXR1cm4gdGhlIGFkamFjZW50IGJsYW5rIG5vZGUgbmFtZSBvciBudWxsIGlmIG5vbmUgd2FzIGZvdW5kLlxuICovXG5mdW5jdGlvbiBfZ2V0QWRqYWNlbnRCbGFua05vZGVOYW1lKG5vZGUsIGlkKSB7XG4gIHJldHVybiAobm9kZS50eXBlID09PSAnYmxhbmsgbm9kZScgJiYgbm9kZS52YWx1ZSAhPT0gaWQgPyBub2RlLnZhbHVlIDogbnVsbCk7XG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgZmxhdHRlbnMgdGhlIHN1YmplY3RzIGluIHRoZSBnaXZlbiBKU09OLUxEIGV4cGFuZGVkIGlucHV0XG4gKiBpbnRvIGEgbm9kZSBtYXAuXG4gKlxuICogQHBhcmFtIGlucHV0IHRoZSBKU09OLUxEIGV4cGFuZGVkIGlucHV0LlxuICogQHBhcmFtIGdyYXBocyBhIG1hcCBvZiBncmFwaCBuYW1lIHRvIHN1YmplY3QgbWFwLlxuICogQHBhcmFtIGdyYXBoIHRoZSBuYW1lIG9mIHRoZSBjdXJyZW50IGdyYXBoLlxuICogQHBhcmFtIG5hbWVyIHRoZSBibGFuayBub2RlIG5hbWVyLlxuICogQHBhcmFtIG5hbWUgdGhlIG5hbWUgYXNzaWduZWQgdG8gdGhlIGN1cnJlbnQgaW5wdXQgaWYgaXQgaXMgYSBibm9kZS5cbiAqIEBwYXJhbSBsaXN0IHRoZSBsaXN0IHRvIGFwcGVuZCB0bywgbnVsbCBmb3Igbm9uZS5cbiAqL1xuZnVuY3Rpb24gX2NyZWF0ZU5vZGVNYXAoaW5wdXQsIGdyYXBocywgZ3JhcGgsIG5hbWVyLCBuYW1lLCBsaXN0KSB7XG4gIC8vIHJlY3Vyc2UgdGhyb3VnaCBhcnJheVxuICBpZihfaXNBcnJheShpbnB1dCkpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyArK2kpIHtcbiAgICAgIF9jcmVhdGVOb2RlTWFwKGlucHV0W2ldLCBncmFwaHMsIGdyYXBoLCBuYW1lciwgdW5kZWZpbmVkLCBsaXN0KTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gYWRkIG5vbi1vYmplY3QgdG8gbGlzdFxuICBpZighX2lzT2JqZWN0KGlucHV0KSkge1xuICAgIGlmKGxpc3QpIHtcbiAgICAgIGxpc3QucHVzaChpbnB1dCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGFkZCB2YWx1ZXMgdG8gbGlzdFxuICBpZihfaXNWYWx1ZShpbnB1dCkpIHtcbiAgICBpZignQHR5cGUnIGluIGlucHV0KSB7XG4gICAgICB2YXIgdHlwZSA9IGlucHV0WydAdHlwZSddO1xuICAgICAgLy8gcmVuYW1lIEB0eXBlIGJsYW5rIG5vZGVcbiAgICAgIGlmKHR5cGUuaW5kZXhPZignXzonKSA9PT0gMCkge1xuICAgICAgICBpbnB1dFsnQHR5cGUnXSA9IHR5cGUgPSBuYW1lci5nZXROYW1lKHR5cGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZihsaXN0KSB7XG4gICAgICBsaXN0LnB1c2goaW5wdXQpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBOb3RlOiBBdCB0aGlzIHBvaW50LCBpbnB1dCBtdXN0IGJlIGEgc3ViamVjdC5cblxuICAvLyBzcGVjIHJlcXVpcmVzIEB0eXBlIHRvIGJlIG5hbWVkIGZpcnN0LCBzbyBhc3NpZ24gbmFtZXMgZWFybHlcbiAgaWYoJ0B0eXBlJyBpbiBpbnB1dCkge1xuICAgIHZhciB0eXBlcyA9IGlucHV0WydAdHlwZSddO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0eXBlcy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIHR5cGUgPSB0eXBlc1tpXTtcbiAgICAgIGlmKHR5cGUuaW5kZXhPZignXzonKSA9PT0gMCkge1xuICAgICAgICBuYW1lci5nZXROYW1lKHR5cGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGdldCBuYW1lIGZvciBzdWJqZWN0XG4gIGlmKF9pc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIG5hbWUgPSBfaXNCbGFua05vZGUoaW5wdXQpID8gbmFtZXIuZ2V0TmFtZShpbnB1dFsnQGlkJ10pIDogaW5wdXRbJ0BpZCddO1xuICB9XG5cbiAgLy8gYWRkIHN1YmplY3QgcmVmZXJlbmNlIHRvIGxpc3RcbiAgaWYobGlzdCkge1xuICAgIGxpc3QucHVzaCh7J0BpZCc6IG5hbWV9KTtcbiAgfVxuXG4gIC8vIGNyZWF0ZSBuZXcgc3ViamVjdCBvciBtZXJnZSBpbnRvIGV4aXN0aW5nIG9uZVxuICB2YXIgc3ViamVjdHMgPSBncmFwaHNbZ3JhcGhdO1xuICB2YXIgc3ViamVjdCA9IHN1YmplY3RzW25hbWVdID0gc3ViamVjdHNbbmFtZV0gfHwge307XG4gIHN1YmplY3RbJ0BpZCddID0gbmFtZTtcbiAgdmFyIHByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhpbnB1dCkuc29ydCgpO1xuICBmb3IodmFyIHBpID0gMDsgcGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgKytwaSkge1xuICAgIHZhciBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbcGldO1xuXG4gICAgLy8gc2tpcCBAaWRcbiAgICBpZihwcm9wZXJ0eSA9PT0gJ0BpZCcpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSByZXZlcnNlIHByb3BlcnRpZXNcbiAgICBpZihwcm9wZXJ0eSA9PT0gJ0ByZXZlcnNlJykge1xuICAgICAgdmFyIHJlZmVyZW5jZWROb2RlID0geydAaWQnOiBuYW1lfTtcbiAgICAgIHZhciByZXZlcnNlTWFwID0gaW5wdXRbJ0ByZXZlcnNlJ107XG4gICAgICBmb3IodmFyIHJldmVyc2VQcm9wZXJ0eSBpbiByZXZlcnNlTWFwKSB7XG4gICAgICAgIHZhciBpdGVtcyA9IHJldmVyc2VNYXBbcmV2ZXJzZVByb3BlcnR5XTtcbiAgICAgICAgZm9yKHZhciBpaSA9IDA7IGlpIDwgaXRlbXMubGVuZ3RoOyArK2lpKSB7XG4gICAgICAgICAgdmFyIGl0ZW0gPSBpdGVtc1tpaV07XG4gICAgICAgICAgdmFyIGl0ZW1OYW1lID0gaXRlbVsnQGlkJ107XG4gICAgICAgICAgaWYoX2lzQmxhbmtOb2RlKGl0ZW0pKSB7XG4gICAgICAgICAgICBpdGVtTmFtZSA9IG5hbWVyLmdldE5hbWUoaXRlbU5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfY3JlYXRlTm9kZU1hcChpdGVtLCBncmFwaHMsIGdyYXBoLCBuYW1lciwgaXRlbU5hbWUpO1xuICAgICAgICAgIGpzb25sZC5hZGRWYWx1ZShcbiAgICAgICAgICAgIHN1YmplY3RzW2l0ZW1OYW1lXSwgcmV2ZXJzZVByb3BlcnR5LCByZWZlcmVuY2VkTm9kZSxcbiAgICAgICAgICAgIHtwcm9wZXJ0eUlzQXJyYXk6IHRydWUsIGFsbG93RHVwbGljYXRlOiBmYWxzZX0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyByZWN1cnNlIGludG8gZ3JhcGhcbiAgICBpZihwcm9wZXJ0eSA9PT0gJ0BncmFwaCcpIHtcbiAgICAgIC8vIGFkZCBncmFwaCBzdWJqZWN0cyBtYXAgZW50cnlcbiAgICAgIGlmKCEobmFtZSBpbiBncmFwaHMpKSB7XG4gICAgICAgIGdyYXBoc1tuYW1lXSA9IHt9O1xuICAgICAgfVxuICAgICAgdmFyIGcgPSAoZ3JhcGggPT09ICdAbWVyZ2VkJykgPyBncmFwaCA6IG5hbWU7XG4gICAgICBfY3JlYXRlTm9kZU1hcChpbnB1dFtwcm9wZXJ0eV0sIGdyYXBocywgZywgbmFtZXIpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gY29weSBub24tQHR5cGUga2V5d29yZHNcbiAgICBpZihwcm9wZXJ0eSAhPT0gJ0B0eXBlJyAmJiBfaXNLZXl3b3JkKHByb3BlcnR5KSkge1xuICAgICAgaWYocHJvcGVydHkgPT09ICdAaW5kZXgnICYmICdAaW5kZXgnIGluIHN1YmplY3QpIHtcbiAgICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBjb25mbGljdGluZyBAaW5kZXggcHJvcGVydHkgZGV0ZWN0ZWQuJyxcbiAgICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAgICB7Y29kZTogJ2NvbmZsaWN0aW5nIGluZGV4ZXMnLCBzdWJqZWN0OiBzdWJqZWN0fSk7XG4gICAgICB9XG4gICAgICBzdWJqZWN0W3Byb3BlcnR5XSA9IGlucHV0W3Byb3BlcnR5XTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGl0ZXJhdGUgb3ZlciBvYmplY3RzXG4gICAgdmFyIG9iamVjdHMgPSBpbnB1dFtwcm9wZXJ0eV07XG5cbiAgICAvLyBpZiBwcm9wZXJ0eSBpcyBhIGJub2RlLCBhc3NpZ24gaXQgYSBuZXcgaWRcbiAgICBpZihwcm9wZXJ0eS5pbmRleE9mKCdfOicpID09PSAwKSB7XG4gICAgICBwcm9wZXJ0eSA9IG5hbWVyLmdldE5hbWUocHJvcGVydHkpO1xuICAgIH1cblxuICAgIC8vIGVuc3VyZSBwcm9wZXJ0eSBpcyBhZGRlZCBmb3IgZW1wdHkgYXJyYXlzXG4gICAgaWYob2JqZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGpzb25sZC5hZGRWYWx1ZShzdWJqZWN0LCBwcm9wZXJ0eSwgW10sIHtwcm9wZXJ0eUlzQXJyYXk6IHRydWV9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBmb3IodmFyIG9pID0gMDsgb2kgPCBvYmplY3RzLmxlbmd0aDsgKytvaSkge1xuICAgICAgdmFyIG8gPSBvYmplY3RzW29pXTtcblxuICAgICAgaWYocHJvcGVydHkgPT09ICdAdHlwZScpIHtcbiAgICAgICAgLy8gcmVuYW1lIEB0eXBlIGJsYW5rIG5vZGVzXG4gICAgICAgIG8gPSAoby5pbmRleE9mKCdfOicpID09PSAwKSA/IG5hbWVyLmdldE5hbWUobykgOiBvO1xuICAgICAgfVxuXG4gICAgICAvLyBoYW5kbGUgZW1iZWRkZWQgc3ViamVjdCBvciBzdWJqZWN0IHJlZmVyZW5jZVxuICAgICAgaWYoX2lzU3ViamVjdChvKSB8fCBfaXNTdWJqZWN0UmVmZXJlbmNlKG8pKSB7XG4gICAgICAgIC8vIHJlbmFtZSBibGFuayBub2RlIEBpZFxuICAgICAgICB2YXIgaWQgPSBfaXNCbGFua05vZGUobykgPyBuYW1lci5nZXROYW1lKG9bJ0BpZCddKSA6IG9bJ0BpZCddO1xuXG4gICAgICAgIC8vIGFkZCByZWZlcmVuY2UgYW5kIHJlY3Vyc2VcbiAgICAgICAganNvbmxkLmFkZFZhbHVlKFxuICAgICAgICAgIHN1YmplY3QsIHByb3BlcnR5LCB7J0BpZCc6IGlkfSxcbiAgICAgICAgICB7cHJvcGVydHlJc0FycmF5OiB0cnVlLCBhbGxvd0R1cGxpY2F0ZTogZmFsc2V9KTtcbiAgICAgICAgX2NyZWF0ZU5vZGVNYXAobywgZ3JhcGhzLCBncmFwaCwgbmFtZXIsIGlkKTtcbiAgICAgIH0gZWxzZSBpZihfaXNMaXN0KG8pKSB7XG4gICAgICAgIC8vIGhhbmRsZSBAbGlzdFxuICAgICAgICB2YXIgX2xpc3QgPSBbXTtcbiAgICAgICAgX2NyZWF0ZU5vZGVNYXAob1snQGxpc3QnXSwgZ3JhcGhzLCBncmFwaCwgbmFtZXIsIG5hbWUsIF9saXN0KTtcbiAgICAgICAgbyA9IHsnQGxpc3QnOiBfbGlzdH07XG4gICAgICAgIGpzb25sZC5hZGRWYWx1ZShcbiAgICAgICAgICBzdWJqZWN0LCBwcm9wZXJ0eSwgbyxcbiAgICAgICAgICB7cHJvcGVydHlJc0FycmF5OiB0cnVlLCBhbGxvd0R1cGxpY2F0ZTogZmFsc2V9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGhhbmRsZSBAdmFsdWVcbiAgICAgICAgX2NyZWF0ZU5vZGVNYXAobywgZ3JhcGhzLCBncmFwaCwgbmFtZXIsIG5hbWUpO1xuICAgICAgICBqc29ubGQuYWRkVmFsdWUoXG4gICAgICAgICAgc3ViamVjdCwgcHJvcGVydHksIG8sIHtwcm9wZXJ0eUlzQXJyYXk6IHRydWUsIGFsbG93RHVwbGljYXRlOiBmYWxzZX0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBfbWVyZ2VOb2RlTWFwcyhncmFwaHMpIHtcbiAgLy8gYWRkIGFsbCBub24tZGVmYXVsdCBncmFwaHMgdG8gZGVmYXVsdCBncmFwaFxuICB2YXIgZGVmYXVsdEdyYXBoID0gZ3JhcGhzWydAZGVmYXVsdCddO1xuICB2YXIgZ3JhcGhOYW1lcyA9IE9iamVjdC5rZXlzKGdyYXBocykuc29ydCgpO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgZ3JhcGhOYW1lcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBncmFwaE5hbWUgPSBncmFwaE5hbWVzW2ldO1xuICAgIGlmKGdyYXBoTmFtZSA9PT0gJ0BkZWZhdWx0Jykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHZhciBub2RlTWFwID0gZ3JhcGhzW2dyYXBoTmFtZV07XG4gICAgdmFyIHN1YmplY3QgPSBkZWZhdWx0R3JhcGhbZ3JhcGhOYW1lXTtcbiAgICBpZighc3ViamVjdCkge1xuICAgICAgZGVmYXVsdEdyYXBoW2dyYXBoTmFtZV0gPSBzdWJqZWN0ID0ge1xuICAgICAgICAnQGlkJzogZ3JhcGhOYW1lLFxuICAgICAgICAnQGdyYXBoJzogW11cbiAgICAgIH07XG4gICAgfSBlbHNlIGlmKCEoJ0BncmFwaCcgaW4gc3ViamVjdCkpIHtcbiAgICAgIHN1YmplY3RbJ0BncmFwaCddID0gW107XG4gICAgfVxuICAgIHZhciBncmFwaCA9IHN1YmplY3RbJ0BncmFwaCddO1xuICAgIHZhciBpZHMgPSBPYmplY3Qua2V5cyhub2RlTWFwKS5zb3J0KCk7XG4gICAgZm9yKHZhciBpaSA9IDA7IGlpIDwgaWRzLmxlbmd0aDsgKytpaSkge1xuICAgICAgdmFyIG5vZGUgPSBub2RlTWFwW2lkc1tpaV1dO1xuICAgICAgLy8gb25seSBhZGQgZnVsbCBzdWJqZWN0c1xuICAgICAgaWYoIV9pc1N1YmplY3RSZWZlcmVuY2Uobm9kZSkpIHtcbiAgICAgICAgZ3JhcGgucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRHcmFwaDtcbn1cblxuLyoqXG4gKiBGcmFtZXMgc3ViamVjdHMgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gc3RhdGUgdGhlIGN1cnJlbnQgZnJhbWluZyBzdGF0ZS5cbiAqIEBwYXJhbSBzdWJqZWN0cyB0aGUgc3ViamVjdHMgdG8gZmlsdGVyLlxuICogQHBhcmFtIGZyYW1lIHRoZSBmcmFtZS5cbiAqIEBwYXJhbSBwYXJlbnQgdGhlIHBhcmVudCBzdWJqZWN0IG9yIHRvcC1sZXZlbCBhcnJheS5cbiAqIEBwYXJhbSBwcm9wZXJ0eSB0aGUgcGFyZW50IHByb3BlcnR5LCBpbml0aWFsaXplZCB0byBudWxsLlxuICovXG5mdW5jdGlvbiBfZnJhbWUoc3RhdGUsIHN1YmplY3RzLCBmcmFtZSwgcGFyZW50LCBwcm9wZXJ0eSkge1xuICAvLyB2YWxpZGF0ZSB0aGUgZnJhbWVcbiAgX3ZhbGlkYXRlRnJhbWUoZnJhbWUpO1xuICBmcmFtZSA9IGZyYW1lWzBdO1xuXG4gIC8vIGdldCBmbGFncyBmb3IgY3VycmVudCBmcmFtZVxuICB2YXIgb3B0aW9ucyA9IHN0YXRlLm9wdGlvbnM7XG4gIHZhciBmbGFncyA9IHtcbiAgICBlbWJlZDogX2dldEZyYW1lRmxhZyhmcmFtZSwgb3B0aW9ucywgJ2VtYmVkJyksXG4gICAgZXhwbGljaXQ6IF9nZXRGcmFtZUZsYWcoZnJhbWUsIG9wdGlvbnMsICdleHBsaWNpdCcpLFxuICAgIHJlcXVpcmVBbGw6IF9nZXRGcmFtZUZsYWcoZnJhbWUsIG9wdGlvbnMsICdyZXF1aXJlQWxsJylcbiAgfTtcblxuICAvLyBmaWx0ZXIgb3V0IHN1YmplY3RzIHRoYXQgbWF0Y2ggdGhlIGZyYW1lXG4gIHZhciBtYXRjaGVzID0gX2ZpbHRlclN1YmplY3RzKHN0YXRlLCBzdWJqZWN0cywgZnJhbWUsIGZsYWdzKTtcblxuICAvLyBhZGQgbWF0Y2hlcyB0byBvdXRwdXRcbiAgdmFyIGlkcyA9IE9iamVjdC5rZXlzKG1hdGNoZXMpLnNvcnQoKTtcbiAgZm9yKHZhciBpZHggaW4gaWRzKSB7XG4gICAgdmFyIGlkID0gaWRzW2lkeF07XG4gICAgdmFyIHN1YmplY3QgPSBtYXRjaGVzW2lkXTtcblxuICAgIGlmKGZsYWdzLmVtYmVkID09PSAnQGxpbmsnICYmIGlkIGluIHN0YXRlLmxpbmspIHtcbiAgICAgIC8vIFRPRE86IG1heSB3YW50IHRvIGFsc28gbWF0Y2ggYW4gZXhpc3RpbmcgbGlua2VkIHN1YmplY3QgYWdhaW5zdFxuICAgICAgLy8gdGhlIGN1cnJlbnQgZnJhbWUgLi4uIHNvIGRpZmZlcmVudCBmcmFtZXMgY291bGQgcHJvZHVjZSBkaWZmZXJlbnRcbiAgICAgIC8vIHN1YmplY3RzIHRoYXQgYXJlIG9ubHkgc2hhcmVkIGluLW1lbW9yeSB3aGVuIHRoZSBmcmFtZXMgYXJlIHRoZSBzYW1lXG5cbiAgICAgIC8vIGFkZCBleGlzdGluZyBsaW5rZWQgc3ViamVjdFxuICAgICAgX2FkZEZyYW1lT3V0cHV0KHBhcmVudCwgcHJvcGVydHksIHN0YXRlLmxpbmtbaWRdKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8qIE5vdGU6IEluIG9yZGVyIHRvIHRyZWF0IGVhY2ggdG9wLWxldmVsIG1hdGNoIGFzIGEgY29tcGFydG1lbnRhbGl6ZWRcbiAgICByZXN1bHQsIGNsZWFyIHRoZSB1bmlxdWUgZW1iZWRkZWQgc3ViamVjdHMgbWFwIHdoZW4gdGhlIHByb3BlcnR5IGlzIG51bGwsXG4gICAgd2hpY2ggb25seSBvY2N1cnMgYXQgdGhlIHRvcC1sZXZlbC4gKi9cbiAgICBpZihwcm9wZXJ0eSA9PT0gbnVsbCkge1xuICAgICAgc3RhdGUudW5pcXVlRW1iZWRzID0ge307XG4gICAgfVxuXG4gICAgLy8gc3RhcnQgb3V0cHV0IGZvciBzdWJqZWN0XG4gICAgdmFyIG91dHB1dCA9IHt9O1xuICAgIG91dHB1dFsnQGlkJ10gPSBpZDtcbiAgICBzdGF0ZS5saW5rW2lkXSA9IG91dHB1dDtcblxuICAgIC8vIGlmIGVtYmVkIGlzIEBuZXZlciBvciBpZiBhIGNpcmN1bGFyIHJlZmVyZW5jZSB3b3VsZCBiZSBjcmVhdGVkIGJ5IGFuXG4gICAgLy8gZW1iZWQsIHRoZSBzdWJqZWN0IGNhbm5vdCBiZSBlbWJlZGRlZCwganVzdCBhZGQgdGhlIHJlZmVyZW5jZTtcbiAgICAvLyBub3RlIHRoYXQgYSBjaXJjdWxhciByZWZlcmVuY2Ugd29uJ3Qgb2NjdXIgd2hlbiB0aGUgZW1iZWQgZmxhZyBpc1xuICAgIC8vIGBAbGlua2AgYXMgdGhlIGFib3ZlIGNoZWNrIHdpbGwgc2hvcnQtY2lyY3VpdCBiZWZvcmUgcmVhY2hpbmcgdGhpcyBwb2ludFxuICAgIGlmKGZsYWdzLmVtYmVkID09PSAnQG5ldmVyJyB8fFxuICAgICAgX2NyZWF0ZXNDaXJjdWxhclJlZmVyZW5jZShzdWJqZWN0LCBzdGF0ZS5zdWJqZWN0U3RhY2spKSB7XG4gICAgICBfYWRkRnJhbWVPdXRwdXQocGFyZW50LCBwcm9wZXJ0eSwgb3V0cHV0KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGlmIG9ubHkgdGhlIGxhc3QgbWF0Y2ggc2hvdWxkIGJlIGVtYmVkZGVkXG4gICAgaWYoZmxhZ3MuZW1iZWQgPT09ICdAbGFzdCcpIHtcbiAgICAgIC8vIHJlbW92ZSBhbnkgZXhpc3RpbmcgZW1iZWRcbiAgICAgIGlmKGlkIGluIHN0YXRlLnVuaXF1ZUVtYmVkcykge1xuICAgICAgICBfcmVtb3ZlRW1iZWQoc3RhdGUsIGlkKTtcbiAgICAgIH1cbiAgICAgIHN0YXRlLnVuaXF1ZUVtYmVkc1tpZF0gPSB7cGFyZW50OiBwYXJlbnQsIHByb3BlcnR5OiBwcm9wZXJ0eX07XG4gICAgfVxuXG4gICAgLy8gcHVzaCBtYXRjaGluZyBzdWJqZWN0IG9udG8gc3RhY2sgdG8gZW5hYmxlIGNpcmN1bGFyIGVtYmVkIGNoZWNrc1xuICAgIHN0YXRlLnN1YmplY3RTdGFjay5wdXNoKHN1YmplY3QpO1xuXG4gICAgLy8gaXRlcmF0ZSBvdmVyIHN1YmplY3QgcHJvcGVydGllc1xuICAgIHZhciBwcm9wcyA9IE9iamVjdC5rZXlzKHN1YmplY3QpLnNvcnQoKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBwcm9wID0gcHJvcHNbaV07XG5cbiAgICAgIC8vIGNvcHkga2V5d29yZHMgdG8gb3V0cHV0XG4gICAgICBpZihfaXNLZXl3b3JkKHByb3ApKSB7XG4gICAgICAgIG91dHB1dFtwcm9wXSA9IF9jbG9uZShzdWJqZWN0W3Byb3BdKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIGV4cGxpY2l0IGlzIG9uIGFuZCBwcm9wZXJ0eSBpc24ndCBpbiB0aGUgZnJhbWUsIHNraXAgcHJvY2Vzc2luZ1xuICAgICAgaWYoZmxhZ3MuZXhwbGljaXQgJiYgIShwcm9wIGluIGZyYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIG9iamVjdHNcbiAgICAgIHZhciBvYmplY3RzID0gc3ViamVjdFtwcm9wXTtcbiAgICAgIGZvcih2YXIgb2kgPSAwOyBvaSA8IG9iamVjdHMubGVuZ3RoOyArK29pKSB7XG4gICAgICAgIHZhciBvID0gb2JqZWN0c1tvaV07XG5cbiAgICAgICAgLy8gcmVjdXJzZSBpbnRvIGxpc3RcbiAgICAgICAgaWYoX2lzTGlzdChvKSkge1xuICAgICAgICAgIC8vIGFkZCBlbXB0eSBsaXN0XG4gICAgICAgICAgdmFyIGxpc3QgPSB7J0BsaXN0JzogW119O1xuICAgICAgICAgIF9hZGRGcmFtZU91dHB1dChvdXRwdXQsIHByb3AsIGxpc3QpO1xuXG4gICAgICAgICAgLy8gYWRkIGxpc3Qgb2JqZWN0c1xuICAgICAgICAgIHZhciBzcmMgPSBvWydAbGlzdCddO1xuICAgICAgICAgIGZvcih2YXIgbiBpbiBzcmMpIHtcbiAgICAgICAgICAgIG8gPSBzcmNbbl07XG4gICAgICAgICAgICBpZihfaXNTdWJqZWN0UmVmZXJlbmNlKG8pKSB7XG4gICAgICAgICAgICAgIHZhciBzdWJmcmFtZSA9IChwcm9wIGluIGZyYW1lID9cbiAgICAgICAgICAgICAgICBmcmFtZVtwcm9wXVswXVsnQGxpc3QnXSA6IF9jcmVhdGVJbXBsaWNpdEZyYW1lKGZsYWdzKSk7XG4gICAgICAgICAgICAgIC8vIHJlY3Vyc2UgaW50byBzdWJqZWN0IHJlZmVyZW5jZVxuICAgICAgICAgICAgICBfZnJhbWUoc3RhdGUsIFtvWydAaWQnXV0sIHN1YmZyYW1lLCBsaXN0LCAnQGxpc3QnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIGluY2x1ZGUgb3RoZXIgdmFsdWVzIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICAgICAgX2FkZEZyYW1lT3V0cHV0KGxpc3QsICdAbGlzdCcsIF9jbG9uZShvKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoX2lzU3ViamVjdFJlZmVyZW5jZShvKSkge1xuICAgICAgICAgIC8vIHJlY3Vyc2UgaW50byBzdWJqZWN0IHJlZmVyZW5jZVxuICAgICAgICAgIHZhciBzdWJmcmFtZSA9IChwcm9wIGluIGZyYW1lID9cbiAgICAgICAgICAgIGZyYW1lW3Byb3BdIDogX2NyZWF0ZUltcGxpY2l0RnJhbWUoZmxhZ3MpKTtcbiAgICAgICAgICBfZnJhbWUoc3RhdGUsIFtvWydAaWQnXV0sIHN1YmZyYW1lLCBvdXRwdXQsIHByb3ApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGluY2x1ZGUgb3RoZXIgdmFsdWVzIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgICBfYWRkRnJhbWVPdXRwdXQob3V0cHV0LCBwcm9wLCBfY2xvbmUobykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGRlZmF1bHRzXG4gICAgdmFyIHByb3BzID0gT2JqZWN0LmtleXMoZnJhbWUpLnNvcnQoKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBwcm9wID0gcHJvcHNbaV07XG5cbiAgICAgIC8vIHNraXAga2V5d29yZHNcbiAgICAgIGlmKF9pc0tleXdvcmQocHJvcCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIG9taXQgZGVmYXVsdCBpcyBvZmYsIHRoZW4gaW5jbHVkZSBkZWZhdWx0IHZhbHVlcyBmb3IgcHJvcGVydGllc1xuICAgICAgLy8gdGhhdCBhcHBlYXIgaW4gdGhlIG5leHQgZnJhbWUgYnV0IGFyZSBub3QgaW4gdGhlIG1hdGNoaW5nIHN1YmplY3RcbiAgICAgIHZhciBuZXh0ID0gZnJhbWVbcHJvcF1bMF07XG4gICAgICB2YXIgb21pdERlZmF1bHRPbiA9IF9nZXRGcmFtZUZsYWcobmV4dCwgb3B0aW9ucywgJ29taXREZWZhdWx0Jyk7XG4gICAgICBpZighb21pdERlZmF1bHRPbiAmJiAhKHByb3AgaW4gb3V0cHV0KSkge1xuICAgICAgICB2YXIgcHJlc2VydmUgPSAnQG51bGwnO1xuICAgICAgICBpZignQGRlZmF1bHQnIGluIG5leHQpIHtcbiAgICAgICAgICBwcmVzZXJ2ZSA9IF9jbG9uZShuZXh0WydAZGVmYXVsdCddKTtcbiAgICAgICAgfVxuICAgICAgICBpZighX2lzQXJyYXkocHJlc2VydmUpKSB7XG4gICAgICAgICAgcHJlc2VydmUgPSBbcHJlc2VydmVdO1xuICAgICAgICB9XG4gICAgICAgIG91dHB1dFtwcm9wXSA9IFt7J0BwcmVzZXJ2ZSc6IHByZXNlcnZlfV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYWRkIG91dHB1dCB0byBwYXJlbnRcbiAgICBfYWRkRnJhbWVPdXRwdXQocGFyZW50LCBwcm9wZXJ0eSwgb3V0cHV0KTtcblxuICAgIC8vIHBvcCBtYXRjaGluZyBzdWJqZWN0IGZyb20gY2lyY3VsYXIgcmVmLWNoZWNraW5nIHN0YWNrXG4gICAgc3RhdGUuc3ViamVjdFN0YWNrLnBvcCgpO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBpbXBsaWNpdCBmcmFtZSB3aGVuIHJlY3Vyc2luZyB0aHJvdWdoIHN1YmplY3QgbWF0Y2hlcy4gSWZcbiAqIGEgZnJhbWUgZG9lc24ndCBoYXZlIGFuIGV4cGxpY2l0IGZyYW1lIGZvciBhIHBhcnRpY3VsYXIgcHJvcGVydHksIHRoZW5cbiAqIGEgd2lsZGNhcmQgY2hpbGQgZnJhbWUgd2lsbCBiZSBjcmVhdGVkIHRoYXQgdXNlcyB0aGUgc2FtZSBmbGFncyB0aGF0IHRoZVxuICogcGFyZW50IGZyYW1lIHVzZWQuXG4gKlxuICogQHBhcmFtIGZsYWdzIHRoZSBjdXJyZW50IGZyYW1pbmcgZmxhZ3MuXG4gKlxuICogQHJldHVybiB0aGUgaW1wbGljaXQgZnJhbWUuXG4gKi9cbmZ1bmN0aW9uIF9jcmVhdGVJbXBsaWNpdEZyYW1lKGZsYWdzKSB7XG4gIHZhciBmcmFtZSA9IHt9O1xuICBmb3IodmFyIGtleSBpbiBmbGFncykge1xuICAgIGlmKGZsYWdzW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgZnJhbWVbJ0AnICsga2V5XSA9IFtmbGFnc1trZXldXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtmcmFtZV07XG59XG5cbi8qKlxuICogQ2hlY2tzIHRoZSBjdXJyZW50IHN1YmplY3Qgc3RhY2sgdG8gc2VlIGlmIGVtYmVkZGluZyB0aGUgZ2l2ZW4gc3ViamVjdFxuICogd291bGQgY2F1c2UgYSBjaXJjdWxhciByZWZlcmVuY2UuXG4gKlxuICogQHBhcmFtIHN1YmplY3RUb0VtYmVkIHRoZSBzdWJqZWN0IHRvIGVtYmVkLlxuICogQHBhcmFtIHN1YmplY3RTdGFjayB0aGUgY3VycmVudCBzdGFjayBvZiBzdWJqZWN0cy5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgYSBjaXJjdWxhciByZWZlcmVuY2Ugd291bGQgYmUgY3JlYXRlZCwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfY3JlYXRlc0NpcmN1bGFyUmVmZXJlbmNlKHN1YmplY3RUb0VtYmVkLCBzdWJqZWN0U3RhY2spIHtcbiAgZm9yKHZhciBpID0gc3ViamVjdFN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgaWYoc3ViamVjdFN0YWNrW2ldWydAaWQnXSA9PT0gc3ViamVjdFRvRW1iZWRbJ0BpZCddKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIGZyYW1lIGZsYWcgdmFsdWUgZm9yIHRoZSBnaXZlbiBmbGFnIG5hbWUuXG4gKlxuICogQHBhcmFtIGZyYW1lIHRoZSBmcmFtZS5cbiAqIEBwYXJhbSBvcHRpb25zIHRoZSBmcmFtaW5nIG9wdGlvbnMuXG4gKiBAcGFyYW0gbmFtZSB0aGUgZmxhZyBuYW1lLlxuICpcbiAqIEByZXR1cm4gdGhlIGZsYWcgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIF9nZXRGcmFtZUZsYWcoZnJhbWUsIG9wdGlvbnMsIG5hbWUpIHtcbiAgdmFyIGZsYWcgPSAnQCcgKyBuYW1lO1xuICB2YXIgcnZhbCA9IChmbGFnIGluIGZyYW1lID8gZnJhbWVbZmxhZ11bMF0gOiBvcHRpb25zW25hbWVdKTtcbiAgaWYobmFtZSA9PT0gJ2VtYmVkJykge1xuICAgIC8vIGRlZmF1bHQgaXMgXCJAbGFzdFwiXG4gICAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgc3VwcG9ydCBmb3IgXCJlbWJlZFwiIG1hcHM6XG4gICAgLy8gdHJ1ZSA9PiBcIkBsYXN0XCJcbiAgICAvLyBmYWxzZSA9PiBcIkBuZXZlclwiXG4gICAgaWYocnZhbCA9PT0gdHJ1ZSkge1xuICAgICAgcnZhbCA9ICdAbGFzdCc7XG4gICAgfSBlbHNlIGlmKHJ2YWwgPT09IGZhbHNlKSB7XG4gICAgICBydmFsID0gJ0BuZXZlcic7XG4gICAgfSBlbHNlIGlmKHJ2YWwgIT09ICdAYWx3YXlzJyAmJiBydmFsICE9PSAnQG5ldmVyJyAmJiBydmFsICE9PSAnQGxpbmsnKSB7XG4gICAgICBydmFsID0gJ0BsYXN0JztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJ2YWw7XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGEgSlNPTi1MRCBmcmFtZSwgdGhyb3dpbmcgYW4gZXhjZXB0aW9uIGlmIHRoZSBmcmFtZSBpcyBpbnZhbGlkLlxuICpcbiAqIEBwYXJhbSBmcmFtZSB0aGUgZnJhbWUgdG8gdmFsaWRhdGUuXG4gKi9cbmZ1bmN0aW9uIF92YWxpZGF0ZUZyYW1lKGZyYW1lKSB7XG4gIGlmKCFfaXNBcnJheShmcmFtZSkgfHwgZnJhbWUubGVuZ3RoICE9PSAxIHx8ICFfaXNPYmplY3QoZnJhbWVbMF0pKSB7XG4gICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGEgSlNPTi1MRCBmcmFtZSBtdXN0IGJlIGEgc2luZ2xlIG9iamVjdC4nLFxuICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtmcmFtZTogZnJhbWV9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgYSBtYXAgb2YgYWxsIG9mIHRoZSBzdWJqZWN0cyB0aGF0IG1hdGNoIGEgcGFyc2VkIGZyYW1lLlxuICpcbiAqIEBwYXJhbSBzdGF0ZSB0aGUgY3VycmVudCBmcmFtaW5nIHN0YXRlLlxuICogQHBhcmFtIHN1YmplY3RzIHRoZSBzZXQgb2Ygc3ViamVjdHMgdG8gZmlsdGVyLlxuICogQHBhcmFtIGZyYW1lIHRoZSBwYXJzZWQgZnJhbWUuXG4gKiBAcGFyYW0gZmxhZ3MgdGhlIGZyYW1lIGZsYWdzLlxuICpcbiAqIEByZXR1cm4gYWxsIG9mIHRoZSBtYXRjaGVkIHN1YmplY3RzLlxuICovXG5mdW5jdGlvbiBfZmlsdGVyU3ViamVjdHMoc3RhdGUsIHN1YmplY3RzLCBmcmFtZSwgZmxhZ3MpIHtcbiAgLy8gZmlsdGVyIHN1YmplY3RzIGluIEBpZCBvcmRlclxuICB2YXIgcnZhbCA9IHt9O1xuICBmb3IodmFyIGkgPSAwOyBpIDwgc3ViamVjdHMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgaWQgPSBzdWJqZWN0c1tpXTtcbiAgICB2YXIgc3ViamVjdCA9IHN0YXRlLnN1YmplY3RzW2lkXTtcbiAgICBpZihfZmlsdGVyU3ViamVjdChzdWJqZWN0LCBmcmFtZSwgZmxhZ3MpKSB7XG4gICAgICBydmFsW2lkXSA9IHN1YmplY3Q7XG4gICAgfVxuICB9XG4gIHJldHVybiBydmFsO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gc3ViamVjdCBtYXRjaGVzIHRoZSBnaXZlbiBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gc3ViamVjdCB0aGUgc3ViamVjdCB0byBjaGVjay5cbiAqIEBwYXJhbSBmcmFtZSB0aGUgZnJhbWUgdG8gY2hlY2suXG4gKiBAcGFyYW0gZmxhZ3MgdGhlIGZyYW1lIGZsYWdzLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgc3ViamVjdCBtYXRjaGVzLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9maWx0ZXJTdWJqZWN0KHN1YmplY3QsIGZyYW1lLCBmbGFncykge1xuICAvLyBjaGVjayBAdHlwZSAob2JqZWN0IHZhbHVlIG1lYW5zICdhbnknIHR5cGUsIGZhbGwgdGhyb3VnaCB0byBkdWNrdHlwaW5nKVxuICBpZignQHR5cGUnIGluIGZyYW1lICYmXG4gICAgIShmcmFtZVsnQHR5cGUnXS5sZW5ndGggPT09IDEgJiYgX2lzT2JqZWN0KGZyYW1lWydAdHlwZSddWzBdKSkpIHtcbiAgICB2YXIgdHlwZXMgPSBmcmFtZVsnQHR5cGUnXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdHlwZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIC8vIGFueSBtYXRjaGluZyBAdHlwZSBpcyBhIG1hdGNoXG4gICAgICBpZihqc29ubGQuaGFzVmFsdWUoc3ViamVjdCwgJ0B0eXBlJywgdHlwZXNbaV0pKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBjaGVjayBkdWNrdHlwZVxuICB2YXIgd2lsZGNhcmQgPSB0cnVlO1xuICB2YXIgbWF0Y2hlc1NvbWUgPSBmYWxzZTtcbiAgZm9yKHZhciBrZXkgaW4gZnJhbWUpIHtcbiAgICBpZihfaXNLZXl3b3JkKGtleSkpIHtcbiAgICAgIC8vIHNraXAgbm9uLUBpZCBhbmQgbm9uLUB0eXBlXG4gICAgICBpZihrZXkgIT09ICdAaWQnICYmIGtleSAhPT0gJ0B0eXBlJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHdpbGRjYXJkID0gZmFsc2U7XG5cbiAgICAgIC8vIGNoZWNrIEBpZCBmb3IgYSBzcGVjaWZpYyBAaWQgdmFsdWVcbiAgICAgIGlmKGtleSA9PT0gJ0BpZCcgJiYgX2lzU3RyaW5nKGZyYW1lW2tleV0pKSB7XG4gICAgICAgIGlmKHN1YmplY3Rba2V5XSAhPT0gZnJhbWVba2V5XSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBtYXRjaGVzU29tZSA9IHRydWU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHdpbGRjYXJkID0gZmFsc2U7XG5cbiAgICBpZihrZXkgaW4gc3ViamVjdCkge1xuICAgICAgLy8gZnJhbWVba2V5XSA9PT0gW10gbWVhbnMgZG8gbm90IG1hdGNoIGlmIHByb3BlcnR5IGlzIHByZXNlbnRcbiAgICAgIGlmKF9pc0FycmF5KGZyYW1lW2tleV0pICYmIGZyYW1lW2tleV0ubGVuZ3RoID09PSAwICYmXG4gICAgICAgIHN1YmplY3Rba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIG1hdGNoZXNTb21lID0gdHJ1ZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIGFsbCBwcm9wZXJ0aWVzIG11c3QgbWF0Y2ggdG8gYmUgYSBkdWNrIHVubGVzcyBhIEBkZWZhdWx0IGlzIHNwZWNpZmllZFxuICAgIHZhciBoYXNEZWZhdWx0ID0gKF9pc0FycmF5KGZyYW1lW2tleV0pICYmIF9pc09iamVjdChmcmFtZVtrZXldWzBdKSAmJlxuICAgICAgJ0BkZWZhdWx0JyBpbiBmcmFtZVtrZXldWzBdKTtcbiAgICBpZihmbGFncy5yZXF1aXJlQWxsICYmICFoYXNEZWZhdWx0KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLy8gcmV0dXJuIHRydWUgaWYgd2lsZGNhcmQgb3Igc3ViamVjdCBtYXRjaGVzIHNvbWUgcHJvcGVydGllc1xuICByZXR1cm4gd2lsZGNhcmQgfHwgbWF0Y2hlc1NvbWU7XG59XG5cbi8qKlxuICogUmVtb3ZlcyBhbiBleGlzdGluZyBlbWJlZC5cbiAqXG4gKiBAcGFyYW0gc3RhdGUgdGhlIGN1cnJlbnQgZnJhbWluZyBzdGF0ZS5cbiAqIEBwYXJhbSBpZCB0aGUgQGlkIG9mIHRoZSBlbWJlZCB0byByZW1vdmUuXG4gKi9cbmZ1bmN0aW9uIF9yZW1vdmVFbWJlZChzdGF0ZSwgaWQpIHtcbiAgLy8gZ2V0IGV4aXN0aW5nIGVtYmVkXG4gIHZhciBlbWJlZHMgPSBzdGF0ZS51bmlxdWVFbWJlZHM7XG4gIHZhciBlbWJlZCA9IGVtYmVkc1tpZF07XG4gIHZhciBwYXJlbnQgPSBlbWJlZC5wYXJlbnQ7XG4gIHZhciBwcm9wZXJ0eSA9IGVtYmVkLnByb3BlcnR5O1xuXG4gIC8vIGNyZWF0ZSByZWZlcmVuY2UgdG8gcmVwbGFjZSBlbWJlZFxuICB2YXIgc3ViamVjdCA9IHsnQGlkJzogaWR9O1xuXG4gIC8vIHJlbW92ZSBleGlzdGluZyBlbWJlZFxuICBpZihfaXNBcnJheShwYXJlbnQpKSB7XG4gICAgLy8gcmVwbGFjZSBzdWJqZWN0IHdpdGggcmVmZXJlbmNlXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHBhcmVudC5sZW5ndGg7ICsraSkge1xuICAgICAgaWYoanNvbmxkLmNvbXBhcmVWYWx1ZXMocGFyZW50W2ldLCBzdWJqZWN0KSkge1xuICAgICAgICBwYXJlbnRbaV0gPSBzdWJqZWN0O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gcmVwbGFjZSBzdWJqZWN0IHdpdGggcmVmZXJlbmNlXG4gICAgdmFyIHVzZUFycmF5ID0gX2lzQXJyYXkocGFyZW50W3Byb3BlcnR5XSk7XG4gICAganNvbmxkLnJlbW92ZVZhbHVlKHBhcmVudCwgcHJvcGVydHksIHN1YmplY3QsIHtwcm9wZXJ0eUlzQXJyYXk6IHVzZUFycmF5fSk7XG4gICAganNvbmxkLmFkZFZhbHVlKHBhcmVudCwgcHJvcGVydHksIHN1YmplY3QsIHtwcm9wZXJ0eUlzQXJyYXk6IHVzZUFycmF5fSk7XG4gIH1cblxuICAvLyByZWN1cnNpdmVseSByZW1vdmUgZGVwZW5kZW50IGRhbmdsaW5nIGVtYmVkc1xuICB2YXIgcmVtb3ZlRGVwZW5kZW50cyA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgLy8gZ2V0IGVtYmVkIGtleXMgYXMgYSBzZXBhcmF0ZSBhcnJheSB0byBlbmFibGUgZGVsZXRpbmcga2V5cyBpbiBtYXBcbiAgICB2YXIgaWRzID0gT2JqZWN0LmtleXMoZW1iZWRzKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgaWRzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgbmV4dCA9IGlkc1tpXTtcbiAgICAgIGlmKG5leHQgaW4gZW1iZWRzICYmIF9pc09iamVjdChlbWJlZHNbbmV4dF0ucGFyZW50KSAmJlxuICAgICAgICBlbWJlZHNbbmV4dF0ucGFyZW50WydAaWQnXSA9PT0gaWQpIHtcbiAgICAgICAgZGVsZXRlIGVtYmVkc1tuZXh0XTtcbiAgICAgICAgcmVtb3ZlRGVwZW5kZW50cyhuZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIHJlbW92ZURlcGVuZGVudHMoaWQpO1xufVxuXG4vKipcbiAqIEFkZHMgZnJhbWluZyBvdXRwdXQgdG8gdGhlIGdpdmVuIHBhcmVudC5cbiAqXG4gKiBAcGFyYW0gcGFyZW50IHRoZSBwYXJlbnQgdG8gYWRkIHRvLlxuICogQHBhcmFtIHByb3BlcnR5IHRoZSBwYXJlbnQgcHJvcGVydHkuXG4gKiBAcGFyYW0gb3V0cHV0IHRoZSBvdXRwdXQgdG8gYWRkLlxuICovXG5mdW5jdGlvbiBfYWRkRnJhbWVPdXRwdXQocGFyZW50LCBwcm9wZXJ0eSwgb3V0cHV0KSB7XG4gIGlmKF9pc09iamVjdChwYXJlbnQpKSB7XG4gICAganNvbmxkLmFkZFZhbHVlKHBhcmVudCwgcHJvcGVydHksIG91dHB1dCwge3Byb3BlcnR5SXNBcnJheTogdHJ1ZX0pO1xuICB9IGVsc2Uge1xuICAgIHBhcmVudC5wdXNoKG91dHB1dCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBAcHJlc2VydmUga2V5d29yZHMgYXMgdGhlIGxhc3Qgc3RlcCBvZiB0aGUgZnJhbWluZyBhbGdvcml0aG0uXG4gKlxuICogQHBhcmFtIGN0eCB0aGUgYWN0aXZlIGNvbnRleHQgdXNlZCB0byBjb21wYWN0IHRoZSBpbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCB0aGUgZnJhbWVkLCBjb21wYWN0ZWQgb3V0cHV0LlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIGNvbXBhY3Rpb24gb3B0aW9ucyB1c2VkLlxuICpcbiAqIEByZXR1cm4gdGhlIHJlc3VsdGluZyBvdXRwdXQuXG4gKi9cbmZ1bmN0aW9uIF9yZW1vdmVQcmVzZXJ2ZShjdHgsIGlucHV0LCBvcHRpb25zKSB7XG4gIC8vIHJlY3Vyc2UgdGhyb3VnaCBhcnJheXNcbiAgaWYoX2lzQXJyYXkoaW5wdXQpKSB7XG4gICAgdmFyIG91dHB1dCA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIHJlc3VsdCA9IF9yZW1vdmVQcmVzZXJ2ZShjdHgsIGlucHV0W2ldLCBvcHRpb25zKTtcbiAgICAgIC8vIGRyb3AgbnVsbHMgZnJvbSBhcnJheXNcbiAgICAgIGlmKHJlc3VsdCAhPT0gbnVsbCkge1xuICAgICAgICBvdXRwdXQucHVzaChyZXN1bHQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpbnB1dCA9IG91dHB1dDtcbiAgfSBlbHNlIGlmKF9pc09iamVjdChpbnB1dCkpIHtcbiAgICAvLyByZW1vdmUgQHByZXNlcnZlXG4gICAgaWYoJ0BwcmVzZXJ2ZScgaW4gaW5wdXQpIHtcbiAgICAgIGlmKGlucHV0WydAcHJlc2VydmUnXSA9PT0gJ0BudWxsJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpbnB1dFsnQHByZXNlcnZlJ107XG4gICAgfVxuXG4gICAgLy8gc2tpcCBAdmFsdWVzXG4gICAgaWYoX2lzVmFsdWUoaW5wdXQpKSB7XG4gICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfVxuXG4gICAgLy8gcmVjdXJzZSB0aHJvdWdoIEBsaXN0c1xuICAgIGlmKF9pc0xpc3QoaW5wdXQpKSB7XG4gICAgICBpbnB1dFsnQGxpc3QnXSA9IF9yZW1vdmVQcmVzZXJ2ZShjdHgsIGlucHV0WydAbGlzdCddLCBvcHRpb25zKTtcbiAgICAgIHJldHVybiBpbnB1dDtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgaW4tbWVtb3J5IGxpbmtlZCBub2Rlc1xuICAgIHZhciBpZEFsaWFzID0gX2NvbXBhY3RJcmkoY3R4LCAnQGlkJyk7XG4gICAgaWYoaWRBbGlhcyBpbiBpbnB1dCkge1xuICAgICAgdmFyIGlkID0gaW5wdXRbaWRBbGlhc107XG4gICAgICBpZihpZCBpbiBvcHRpb25zLmxpbmspIHtcbiAgICAgICAgdmFyIGlkeCA9IG9wdGlvbnMubGlua1tpZF0uaW5kZXhPZihpbnB1dCk7XG4gICAgICAgIGlmKGlkeCA9PT0gLTEpIHtcbiAgICAgICAgICAvLyBwcmV2ZW50IGNpcmN1bGFyIHZpc2l0YXRpb25cbiAgICAgICAgICBvcHRpb25zLmxpbmtbaWRdLnB1c2goaW5wdXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGFscmVhZHkgdmlzaXRlZFxuICAgICAgICAgIHJldHVybiBvcHRpb25zLmxpbmtbaWRdW2lkeF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHByZXZlbnQgY2lyY3VsYXIgdmlzaXRhdGlvblxuICAgICAgICBvcHRpb25zLmxpbmtbaWRdID0gW2lucHV0XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZWN1cnNlIHRocm91Z2ggcHJvcGVydGllc1xuICAgIGZvcih2YXIgcHJvcCBpbiBpbnB1dCkge1xuICAgICAgdmFyIHJlc3VsdCA9IF9yZW1vdmVQcmVzZXJ2ZShjdHgsIGlucHV0W3Byb3BdLCBvcHRpb25zKTtcbiAgICAgIHZhciBjb250YWluZXIgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKGN0eCwgcHJvcCwgJ0Bjb250YWluZXInKTtcbiAgICAgIGlmKG9wdGlvbnMuY29tcGFjdEFycmF5cyAmJiBfaXNBcnJheShyZXN1bHQpICYmIHJlc3VsdC5sZW5ndGggPT09IDEgJiZcbiAgICAgICAgY29udGFpbmVyID09PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IHJlc3VsdFswXTtcbiAgICAgIH1cbiAgICAgIGlucHV0W3Byb3BdID0gcmVzdWx0O1xuICAgIH1cbiAgfVxuICByZXR1cm4gaW5wdXQ7XG59XG5cbi8qKlxuICogQ29tcGFyZXMgdHdvIHN0cmluZ3MgZmlyc3QgYmFzZWQgb24gbGVuZ3RoIGFuZCB0aGVuIGxleGljb2dyYXBoaWNhbGx5LlxuICpcbiAqIEBwYXJhbSBhIHRoZSBmaXJzdCBzdHJpbmcuXG4gKiBAcGFyYW0gYiB0aGUgc2Vjb25kIHN0cmluZy5cbiAqXG4gKiBAcmV0dXJuIC0xIGlmIGEgPCBiLCAxIGlmIGEgPiBiLCAwIGlmIGEgPT0gYi5cbiAqL1xuZnVuY3Rpb24gX2NvbXBhcmVTaG9ydGVzdExlYXN0KGEsIGIpIHtcbiAgaWYoYS5sZW5ndGggPCBiLmxlbmd0aCkge1xuICAgIHJldHVybiAtMTtcbiAgfVxuICBpZihiLmxlbmd0aCA8IGEubGVuZ3RoKSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cbiAgaWYoYSA9PT0gYikge1xuICAgIHJldHVybiAwO1xuICB9XG4gIHJldHVybiAoYSA8IGIpID8gLTEgOiAxO1xufVxuXG4vKipcbiAqIFBpY2tzIHRoZSBwcmVmZXJyZWQgY29tcGFjdGlvbiB0ZXJtIGZyb20gdGhlIGdpdmVuIGludmVyc2UgY29udGV4dCBlbnRyeS5cbiAqXG4gKiBAcGFyYW0gYWN0aXZlQ3R4IHRoZSBhY3RpdmUgY29udGV4dC5cbiAqIEBwYXJhbSBpcmkgdGhlIElSSSB0byBwaWNrIHRoZSB0ZXJtIGZvci5cbiAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gcGljayB0aGUgdGVybSBmb3IuXG4gKiBAcGFyYW0gY29udGFpbmVycyB0aGUgcHJlZmVycmVkIGNvbnRhaW5lcnMuXG4gKiBAcGFyYW0gdHlwZU9yTGFuZ3VhZ2UgZWl0aGVyICdAdHlwZScgb3IgJ0BsYW5ndWFnZScuXG4gKiBAcGFyYW0gdHlwZU9yTGFuZ3VhZ2VWYWx1ZSB0aGUgcHJlZmVycmVkIHZhbHVlIGZvciAnQHR5cGUnIG9yICdAbGFuZ3VhZ2UnLlxuICpcbiAqIEByZXR1cm4gdGhlIHByZWZlcnJlZCB0ZXJtLlxuICovXG5mdW5jdGlvbiBfc2VsZWN0VGVybShcbiAgYWN0aXZlQ3R4LCBpcmksIHZhbHVlLCBjb250YWluZXJzLCB0eXBlT3JMYW5ndWFnZSwgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSkge1xuICBpZih0eXBlT3JMYW5ndWFnZVZhbHVlID09PSBudWxsKSB7XG4gICAgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSA9ICdAbnVsbCc7XG4gIH1cblxuICAvLyBwcmVmZXJlbmNlcyBmb3IgdGhlIHZhbHVlIG9mIEB0eXBlIG9yIEBsYW5ndWFnZVxuICB2YXIgcHJlZnMgPSBbXTtcblxuICAvLyBkZXRlcm1pbmUgcHJlZnMgZm9yIEBpZCBiYXNlZCBvbiB3aGV0aGVyIG9yIG5vdCB2YWx1ZSBjb21wYWN0cyB0byBhIHRlcm1cbiAgaWYoKHR5cGVPckxhbmd1YWdlVmFsdWUgPT09ICdAaWQnIHx8IHR5cGVPckxhbmd1YWdlVmFsdWUgPT09ICdAcmV2ZXJzZScpICYmXG4gICAgX2lzU3ViamVjdFJlZmVyZW5jZSh2YWx1ZSkpIHtcbiAgICAvLyBwcmVmZXIgQHJldmVyc2UgZmlyc3RcbiAgICBpZih0eXBlT3JMYW5ndWFnZVZhbHVlID09PSAnQHJldmVyc2UnKSB7XG4gICAgICBwcmVmcy5wdXNoKCdAcmV2ZXJzZScpO1xuICAgIH1cbiAgICAvLyB0cnkgdG8gY29tcGFjdCB2YWx1ZSB0byBhIHRlcm1cbiAgICB2YXIgdGVybSA9IF9jb21wYWN0SXJpKGFjdGl2ZUN0eCwgdmFsdWVbJ0BpZCddLCBudWxsLCB7dm9jYWI6IHRydWV9KTtcbiAgICBpZih0ZXJtIGluIGFjdGl2ZUN0eC5tYXBwaW5ncyAmJlxuICAgICAgYWN0aXZlQ3R4Lm1hcHBpbmdzW3Rlcm1dICYmXG4gICAgICBhY3RpdmVDdHgubWFwcGluZ3NbdGVybV1bJ0BpZCddID09PSB2YWx1ZVsnQGlkJ10pIHtcbiAgICAgIC8vIHByZWZlciBAdm9jYWJcbiAgICAgIHByZWZzLnB1c2guYXBwbHkocHJlZnMsIFsnQHZvY2FiJywgJ0BpZCddKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gcHJlZmVyIEBpZFxuICAgICAgcHJlZnMucHVzaC5hcHBseShwcmVmcywgWydAaWQnLCAnQHZvY2FiJ10pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBwcmVmcy5wdXNoKHR5cGVPckxhbmd1YWdlVmFsdWUpO1xuICB9XG4gIHByZWZzLnB1c2goJ0Bub25lJyk7XG5cbiAgdmFyIGNvbnRhaW5lck1hcCA9IGFjdGl2ZUN0eC5pbnZlcnNlW2lyaV07XG4gIGZvcih2YXIgY2kgPSAwOyBjaSA8IGNvbnRhaW5lcnMubGVuZ3RoOyArK2NpKSB7XG4gICAgLy8gaWYgY29udGFpbmVyIG5vdCBhdmFpbGFibGUgaW4gdGhlIG1hcCwgY29udGludWVcbiAgICB2YXIgY29udGFpbmVyID0gY29udGFpbmVyc1tjaV07XG4gICAgaWYoIShjb250YWluZXIgaW4gY29udGFpbmVyTWFwKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdmFyIHR5cGVPckxhbmd1YWdlVmFsdWVNYXAgPSBjb250YWluZXJNYXBbY29udGFpbmVyXVt0eXBlT3JMYW5ndWFnZV07XG4gICAgZm9yKHZhciBwaSA9IDA7IHBpIDwgcHJlZnMubGVuZ3RoOyArK3BpKSB7XG4gICAgICAvLyBpZiB0eXBlL2xhbmd1YWdlIG9wdGlvbiBub3QgYXZhaWxhYmxlIGluIHRoZSBtYXAsIGNvbnRpbnVlXG4gICAgICB2YXIgcHJlZiA9IHByZWZzW3BpXTtcbiAgICAgIGlmKCEocHJlZiBpbiB0eXBlT3JMYW5ndWFnZVZhbHVlTWFwKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gc2VsZWN0IHRlcm1cbiAgICAgIHJldHVybiB0eXBlT3JMYW5ndWFnZVZhbHVlTWFwW3ByZWZdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIENvbXBhY3RzIGFuIElSSSBvciBrZXl3b3JkIGludG8gYSB0ZXJtIG9yIHByZWZpeCBpZiBpdCBjYW4gYmUuIElmIHRoZVxuICogSVJJIGhhcyBhbiBhc3NvY2lhdGVkIHZhbHVlIGl0IG1heSBiZSBwYXNzZWQuXG4gKlxuICogQHBhcmFtIGFjdGl2ZUN0eCB0aGUgYWN0aXZlIGNvbnRleHQgdG8gdXNlLlxuICogQHBhcmFtIGlyaSB0aGUgSVJJIHRvIGNvbXBhY3QuXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGNoZWNrIG9yIG51bGwuXG4gKiBAcGFyYW0gcmVsYXRpdmVUbyBvcHRpb25zIGZvciBob3cgdG8gY29tcGFjdCBJUklzOlxuICogICAgICAgICAgdm9jYWI6IHRydWUgdG8gc3BsaXQgYWZ0ZXIgQHZvY2FiLCBmYWxzZSBub3QgdG8uXG4gKiBAcGFyYW0gcmV2ZXJzZSB0cnVlIGlmIGEgcmV2ZXJzZSBwcm9wZXJ0eSBpcyBiZWluZyBjb21wYWN0ZWQsIGZhbHNlIGlmIG5vdC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBjb21wYWN0ZWQgdGVybSwgcHJlZml4LCBrZXl3b3JkIGFsaWFzLCBvciB0aGUgb3JpZ2luYWwgSVJJLlxuICovXG5mdW5jdGlvbiBfY29tcGFjdElyaShhY3RpdmVDdHgsIGlyaSwgdmFsdWUsIHJlbGF0aXZlVG8sIHJldmVyc2UpIHtcbiAgLy8gY2FuJ3QgY29tcGFjdCBudWxsXG4gIGlmKGlyaSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBpcmk7XG4gIH1cblxuICAvLyBkZWZhdWx0IHZhbHVlIGFuZCBwYXJlbnQgdG8gbnVsbFxuICBpZihfaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgdmFsdWUgPSBudWxsO1xuICB9XG4gIC8vIGRlZmF1bHQgcmV2ZXJzZSB0byBmYWxzZVxuICBpZihfaXNVbmRlZmluZWQocmV2ZXJzZSkpIHtcbiAgICByZXZlcnNlID0gZmFsc2U7XG4gIH1cbiAgcmVsYXRpdmVUbyA9IHJlbGF0aXZlVG8gfHwge307XG5cbiAgLy8gaWYgdGVybSBpcyBhIGtleXdvcmQsIGRlZmF1bHQgdm9jYWIgdG8gdHJ1ZVxuICBpZihfaXNLZXl3b3JkKGlyaSkpIHtcbiAgICByZWxhdGl2ZVRvLnZvY2FiID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIHVzZSBpbnZlcnNlIGNvbnRleHQgdG8gcGljayBhIHRlcm0gaWYgaXJpIGlzIHJlbGF0aXZlIHRvIHZvY2FiXG4gIGlmKHJlbGF0aXZlVG8udm9jYWIgJiYgaXJpIGluIGFjdGl2ZUN0eC5nZXRJbnZlcnNlKCkpIHtcbiAgICB2YXIgZGVmYXVsdExhbmd1YWdlID0gYWN0aXZlQ3R4WydAbGFuZ3VhZ2UnXSB8fCAnQG5vbmUnO1xuXG4gICAgLy8gcHJlZmVyIEBpbmRleCBpZiBhdmFpbGFibGUgaW4gdmFsdWVcbiAgICB2YXIgY29udGFpbmVycyA9IFtdO1xuICAgIGlmKF9pc09iamVjdCh2YWx1ZSkgJiYgJ0BpbmRleCcgaW4gdmFsdWUpIHtcbiAgICAgIGNvbnRhaW5lcnMucHVzaCgnQGluZGV4Jyk7XG4gICAgfVxuXG4gICAgLy8gZGVmYXVsdHMgZm9yIHRlcm0gc2VsZWN0aW9uIGJhc2VkIG9uIHR5cGUvbGFuZ3VhZ2VcbiAgICB2YXIgdHlwZU9yTGFuZ3VhZ2UgPSAnQGxhbmd1YWdlJztcbiAgICB2YXIgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSA9ICdAbnVsbCc7XG5cbiAgICBpZihyZXZlcnNlKSB7XG4gICAgICB0eXBlT3JMYW5ndWFnZSA9ICdAdHlwZSc7XG4gICAgICB0eXBlT3JMYW5ndWFnZVZhbHVlID0gJ0ByZXZlcnNlJztcbiAgICAgIGNvbnRhaW5lcnMucHVzaCgnQHNldCcpO1xuICAgIH0gZWxzZSBpZihfaXNMaXN0KHZhbHVlKSkge1xuICAgICAgLy8gY2hvb3NlIHRoZSBtb3N0IHNwZWNpZmljIHRlcm0gdGhhdCB3b3JrcyBmb3IgYWxsIGVsZW1lbnRzIGluIEBsaXN0XG4gICAgICAvLyBvbmx5IHNlbGVjdCBAbGlzdCBjb250YWluZXJzIGlmIEBpbmRleCBpcyBOT1QgaW4gdmFsdWVcbiAgICAgIGlmKCEoJ0BpbmRleCcgaW4gdmFsdWUpKSB7XG4gICAgICAgIGNvbnRhaW5lcnMucHVzaCgnQGxpc3QnKTtcbiAgICAgIH1cbiAgICAgIHZhciBsaXN0ID0gdmFsdWVbJ0BsaXN0J107XG4gICAgICB2YXIgY29tbW9uTGFuZ3VhZ2UgPSAobGlzdC5sZW5ndGggPT09IDApID8gZGVmYXVsdExhbmd1YWdlIDogbnVsbDtcbiAgICAgIHZhciBjb21tb25UeXBlID0gbnVsbDtcbiAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBpdGVtID0gbGlzdFtpXTtcbiAgICAgICAgdmFyIGl0ZW1MYW5ndWFnZSA9ICdAbm9uZSc7XG4gICAgICAgIHZhciBpdGVtVHlwZSA9ICdAbm9uZSc7XG4gICAgICAgIGlmKF9pc1ZhbHVlKGl0ZW0pKSB7XG4gICAgICAgICAgaWYoJ0BsYW5ndWFnZScgaW4gaXRlbSkge1xuICAgICAgICAgICAgaXRlbUxhbmd1YWdlID0gaXRlbVsnQGxhbmd1YWdlJ107XG4gICAgICAgICAgfSBlbHNlIGlmKCdAdHlwZScgaW4gaXRlbSkge1xuICAgICAgICAgICAgaXRlbVR5cGUgPSBpdGVtWydAdHlwZSddO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBwbGFpbiBsaXRlcmFsXG4gICAgICAgICAgICBpdGVtTGFuZ3VhZ2UgPSAnQG51bGwnO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtVHlwZSA9ICdAaWQnO1xuICAgICAgICB9XG4gICAgICAgIGlmKGNvbW1vbkxhbmd1YWdlID09PSBudWxsKSB7XG4gICAgICAgICAgY29tbW9uTGFuZ3VhZ2UgPSBpdGVtTGFuZ3VhZ2U7XG4gICAgICAgIH0gZWxzZSBpZihpdGVtTGFuZ3VhZ2UgIT09IGNvbW1vbkxhbmd1YWdlICYmIF9pc1ZhbHVlKGl0ZW0pKSB7XG4gICAgICAgICAgY29tbW9uTGFuZ3VhZ2UgPSAnQG5vbmUnO1xuICAgICAgICB9XG4gICAgICAgIGlmKGNvbW1vblR5cGUgPT09IG51bGwpIHtcbiAgICAgICAgICBjb21tb25UeXBlID0gaXRlbVR5cGU7XG4gICAgICAgIH0gZWxzZSBpZihpdGVtVHlwZSAhPT0gY29tbW9uVHlwZSkge1xuICAgICAgICAgIGNvbW1vblR5cGUgPSAnQG5vbmUnO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRoZXJlIGFyZSBkaWZmZXJlbnQgbGFuZ3VhZ2VzIGFuZCB0eXBlcyBpbiB0aGUgbGlzdCwgc28gY2hvb3NlXG4gICAgICAgIC8vIHRoZSBtb3N0IGdlbmVyaWMgdGVybSwgbm8gbmVlZCB0byBrZWVwIGl0ZXJhdGluZyB0aGUgbGlzdFxuICAgICAgICBpZihjb21tb25MYW5ndWFnZSA9PT0gJ0Bub25lJyAmJiBjb21tb25UeXBlID09PSAnQG5vbmUnKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbW1vbkxhbmd1YWdlID0gY29tbW9uTGFuZ3VhZ2UgfHwgJ0Bub25lJztcbiAgICAgIGNvbW1vblR5cGUgPSBjb21tb25UeXBlIHx8ICdAbm9uZSc7XG4gICAgICBpZihjb21tb25UeXBlICE9PSAnQG5vbmUnKSB7XG4gICAgICAgIHR5cGVPckxhbmd1YWdlID0gJ0B0eXBlJztcbiAgICAgICAgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSA9IGNvbW1vblR5cGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlT3JMYW5ndWFnZVZhbHVlID0gY29tbW9uTGFuZ3VhZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmKF9pc1ZhbHVlKHZhbHVlKSkge1xuICAgICAgICBpZignQGxhbmd1YWdlJyBpbiB2YWx1ZSAmJiAhKCdAaW5kZXgnIGluIHZhbHVlKSkge1xuICAgICAgICAgIGNvbnRhaW5lcnMucHVzaCgnQGxhbmd1YWdlJyk7XG4gICAgICAgICAgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSA9IHZhbHVlWydAbGFuZ3VhZ2UnXTtcbiAgICAgICAgfSBlbHNlIGlmKCdAdHlwZScgaW4gdmFsdWUpIHtcbiAgICAgICAgICB0eXBlT3JMYW5ndWFnZSA9ICdAdHlwZSc7XG4gICAgICAgICAgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSA9IHZhbHVlWydAdHlwZSddO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlT3JMYW5ndWFnZSA9ICdAdHlwZSc7XG4gICAgICAgIHR5cGVPckxhbmd1YWdlVmFsdWUgPSAnQGlkJztcbiAgICAgIH1cbiAgICAgIGNvbnRhaW5lcnMucHVzaCgnQHNldCcpO1xuICAgIH1cblxuICAgIC8vIGRvIHRlcm0gc2VsZWN0aW9uXG4gICAgY29udGFpbmVycy5wdXNoKCdAbm9uZScpO1xuICAgIHZhciB0ZXJtID0gX3NlbGVjdFRlcm0oXG4gICAgICBhY3RpdmVDdHgsIGlyaSwgdmFsdWUsIGNvbnRhaW5lcnMsIHR5cGVPckxhbmd1YWdlLCB0eXBlT3JMYW5ndWFnZVZhbHVlKTtcbiAgICBpZih0ZXJtICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGVybTtcbiAgICB9XG4gIH1cblxuICAvLyBubyB0ZXJtIG1hdGNoLCB1c2UgQHZvY2FiIGlmIGF2YWlsYWJsZVxuICBpZihyZWxhdGl2ZVRvLnZvY2FiKSB7XG4gICAgaWYoJ0B2b2NhYicgaW4gYWN0aXZlQ3R4KSB7XG4gICAgICAvLyBkZXRlcm1pbmUgaWYgdm9jYWIgaXMgYSBwcmVmaXggb2YgdGhlIGlyaVxuICAgICAgdmFyIHZvY2FiID0gYWN0aXZlQ3R4WydAdm9jYWInXTtcbiAgICAgIGlmKGlyaS5pbmRleE9mKHZvY2FiKSA9PT0gMCAmJiBpcmkgIT09IHZvY2FiKSB7XG4gICAgICAgIC8vIHVzZSBzdWZmaXggYXMgcmVsYXRpdmUgaXJpIGlmIGl0IGlzIG5vdCBhIHRlcm0gaW4gdGhlIGFjdGl2ZSBjb250ZXh0XG4gICAgICAgIHZhciBzdWZmaXggPSBpcmkuc3Vic3RyKHZvY2FiLmxlbmd0aCk7XG4gICAgICAgIGlmKCEoc3VmZml4IGluIGFjdGl2ZUN0eC5tYXBwaW5ncykpIHtcbiAgICAgICAgICByZXR1cm4gc3VmZml4O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gbm8gdGVybSBvciBAdm9jYWIgbWF0Y2gsIGNoZWNrIGZvciBwb3NzaWJsZSBDVVJJRXNcbiAgdmFyIGNob2ljZSA9IG51bGw7XG4gIGZvcih2YXIgdGVybSBpbiBhY3RpdmVDdHgubWFwcGluZ3MpIHtcbiAgICAvLyBza2lwIHRlcm1zIHdpdGggY29sb25zLCB0aGV5IGNhbid0IGJlIHByZWZpeGVzXG4gICAgaWYodGVybS5pbmRleE9mKCc6JykgIT09IC0xKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgLy8gc2tpcCBlbnRyaWVzIHdpdGggQGlkcyB0aGF0IGFyZSBub3QgcGFydGlhbCBtYXRjaGVzXG4gICAgdmFyIGRlZmluaXRpb24gPSBhY3RpdmVDdHgubWFwcGluZ3NbdGVybV07XG4gICAgaWYoIWRlZmluaXRpb24gfHxcbiAgICAgIGRlZmluaXRpb25bJ0BpZCddID09PSBpcmkgfHwgaXJpLmluZGV4T2YoZGVmaW5pdGlvblsnQGlkJ10pICE9PSAwKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBhIENVUklFIGlzIHVzYWJsZSBpZjpcbiAgICAvLyAxLiBpdCBoYXMgbm8gbWFwcGluZywgT1JcbiAgICAvLyAyLiB2YWx1ZSBpcyBudWxsLCB3aGljaCBtZWFucyB3ZSdyZSBub3QgY29tcGFjdGluZyBhbiBAdmFsdWUsIEFORFxuICAgIC8vICAgdGhlIG1hcHBpbmcgbWF0Y2hlcyB0aGUgSVJJKVxuICAgIHZhciBjdXJpZSA9IHRlcm0gKyAnOicgKyBpcmkuc3Vic3RyKGRlZmluaXRpb25bJ0BpZCddLmxlbmd0aCk7XG4gICAgdmFyIGlzVXNhYmxlQ3VyaWUgPSAoIShjdXJpZSBpbiBhY3RpdmVDdHgubWFwcGluZ3MpIHx8XG4gICAgICAodmFsdWUgPT09IG51bGwgJiYgYWN0aXZlQ3R4Lm1hcHBpbmdzW2N1cmllXSAmJlxuICAgICAgYWN0aXZlQ3R4Lm1hcHBpbmdzW2N1cmllXVsnQGlkJ10gPT09IGlyaSkpO1xuXG4gICAgLy8gc2VsZWN0IGN1cmllIGlmIGl0IGlzIHNob3J0ZXIgb3IgdGhlIHNhbWUgbGVuZ3RoIGJ1dCBsZXhpY29ncmFwaGljYWxseVxuICAgIC8vIGxlc3MgdGhhbiB0aGUgY3VycmVudCBjaG9pY2VcbiAgICBpZihpc1VzYWJsZUN1cmllICYmIChjaG9pY2UgPT09IG51bGwgfHxcbiAgICAgIF9jb21wYXJlU2hvcnRlc3RMZWFzdChjdXJpZSwgY2hvaWNlKSA8IDApKSB7XG4gICAgICBjaG9pY2UgPSBjdXJpZTtcbiAgICB9XG4gIH1cblxuICAvLyByZXR1cm4gY2hvc2VuIGN1cmllXG4gIGlmKGNob2ljZSAhPT0gbnVsbCkge1xuICAgIHJldHVybiBjaG9pY2U7XG4gIH1cblxuICAvLyBjb21wYWN0IElSSSByZWxhdGl2ZSB0byBiYXNlXG4gIGlmKCFyZWxhdGl2ZVRvLnZvY2FiKSB7XG4gICAgcmV0dXJuIF9yZW1vdmVCYXNlKGFjdGl2ZUN0eFsnQGJhc2UnXSwgaXJpKTtcbiAgfVxuXG4gIC8vIHJldHVybiBJUkkgYXMgaXNcbiAgcmV0dXJuIGlyaTtcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyB2YWx1ZSBjb21wYWN0aW9uIG9uIGFuIG9iamVjdCB3aXRoICdAdmFsdWUnIG9yICdAaWQnIGFzIHRoZSBvbmx5XG4gKiBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0gYWN0aXZlQ3R4IHRoZSBhY3RpdmUgY29udGV4dC5cbiAqIEBwYXJhbSBhY3RpdmVQcm9wZXJ0eSB0aGUgYWN0aXZlIHByb3BlcnR5IHRoYXQgcG9pbnRzIHRvIHRoZSB2YWx1ZS5cbiAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gY29tcGFjdC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBjb21wYWN0aW9uIHJlc3VsdC5cbiAqL1xuZnVuY3Rpb24gX2NvbXBhY3RWYWx1ZShhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCB2YWx1ZSkge1xuICAvLyB2YWx1ZSBpcyBhIEB2YWx1ZVxuICBpZihfaXNWYWx1ZSh2YWx1ZSkpIHtcbiAgICAvLyBnZXQgY29udGV4dCBydWxlc1xuICAgIHZhciB0eXBlID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCAnQHR5cGUnKTtcbiAgICB2YXIgbGFuZ3VhZ2UgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKFxuICAgICAgYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgJ0BsYW5ndWFnZScpO1xuICAgIHZhciBjb250YWluZXIgPSBqc29ubGQuZ2V0Q29udGV4dFZhbHVlKFxuICAgICAgYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwgJ0Bjb250YWluZXInKTtcblxuICAgIC8vIHdoZXRoZXIgb3Igbm90IHRoZSB2YWx1ZSBoYXMgYW4gQGluZGV4IHRoYXQgbXVzdCBiZSBwcmVzZXJ2ZWRcbiAgICB2YXIgcHJlc2VydmVJbmRleCA9ICgoJ0BpbmRleCcgaW4gdmFsdWUpICYmXG4gICAgICBjb250YWluZXIgIT09ICdAaW5kZXgnKTtcblxuICAgIC8vIGlmIHRoZXJlJ3Mgbm8gQGluZGV4IHRvIHByZXNlcnZlIC4uLlxuICAgIGlmKCFwcmVzZXJ2ZUluZGV4KSB7XG4gICAgICAvLyBtYXRjaGluZyBAdHlwZSBvciBAbGFuZ3VhZ2Ugc3BlY2lmaWVkIGluIGNvbnRleHQsIGNvbXBhY3QgdmFsdWVcbiAgICAgIGlmKHZhbHVlWydAdHlwZSddID09PSB0eXBlIHx8IHZhbHVlWydAbGFuZ3VhZ2UnXSA9PT0gbGFuZ3VhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlWydAdmFsdWUnXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZXR1cm4ganVzdCB0aGUgdmFsdWUgb2YgQHZhbHVlIGlmIGFsbCBhcmUgdHJ1ZTpcbiAgICAvLyAxLiBAdmFsdWUgaXMgdGhlIG9ubHkga2V5IG9yIEBpbmRleCBpc24ndCBiZWluZyBwcmVzZXJ2ZWRcbiAgICAvLyAyLiB0aGVyZSBpcyBubyBkZWZhdWx0IGxhbmd1YWdlIG9yIEB2YWx1ZSBpcyBub3QgYSBzdHJpbmcgb3JcbiAgICAvLyAgIHRoZSBrZXkgaGFzIGEgbWFwcGluZyB3aXRoIGEgbnVsbCBAbGFuZ3VhZ2VcbiAgICB2YXIga2V5Q291bnQgPSBPYmplY3Qua2V5cyh2YWx1ZSkubGVuZ3RoO1xuICAgIHZhciBpc1ZhbHVlT25seUtleSA9IChrZXlDb3VudCA9PT0gMSB8fFxuICAgICAgKGtleUNvdW50ID09PSAyICYmICgnQGluZGV4JyBpbiB2YWx1ZSkgJiYgIXByZXNlcnZlSW5kZXgpKTtcbiAgICB2YXIgaGFzRGVmYXVsdExhbmd1YWdlID0gKCdAbGFuZ3VhZ2UnIGluIGFjdGl2ZUN0eCk7XG4gICAgdmFyIGlzVmFsdWVTdHJpbmcgPSBfaXNTdHJpbmcodmFsdWVbJ0B2YWx1ZSddKTtcbiAgICB2YXIgaGFzTnVsbE1hcHBpbmcgPSAoYWN0aXZlQ3R4Lm1hcHBpbmdzW2FjdGl2ZVByb3BlcnR5XSAmJlxuICAgICAgYWN0aXZlQ3R4Lm1hcHBpbmdzW2FjdGl2ZVByb3BlcnR5XVsnQGxhbmd1YWdlJ10gPT09IG51bGwpO1xuICAgIGlmKGlzVmFsdWVPbmx5S2V5ICYmXG4gICAgICAoIWhhc0RlZmF1bHRMYW5ndWFnZSB8fCAhaXNWYWx1ZVN0cmluZyB8fCBoYXNOdWxsTWFwcGluZykpIHtcbiAgICAgIHJldHVybiB2YWx1ZVsnQHZhbHVlJ107XG4gICAgfVxuXG4gICAgdmFyIHJ2YWwgPSB7fTtcblxuICAgIC8vIHByZXNlcnZlIEBpbmRleFxuICAgIGlmKHByZXNlcnZlSW5kZXgpIHtcbiAgICAgIHJ2YWxbX2NvbXBhY3RJcmkoYWN0aXZlQ3R4LCAnQGluZGV4JyldID0gdmFsdWVbJ0BpbmRleCddO1xuICAgIH1cblxuICAgIGlmKCdAdHlwZScgaW4gdmFsdWUpIHtcbiAgICAgIC8vIGNvbXBhY3QgQHR5cGUgSVJJXG4gICAgICBydmFsW19jb21wYWN0SXJpKGFjdGl2ZUN0eCwgJ0B0eXBlJyldID0gX2NvbXBhY3RJcmkoXG4gICAgICAgIGFjdGl2ZUN0eCwgdmFsdWVbJ0B0eXBlJ10sIG51bGwsIHt2b2NhYjogdHJ1ZX0pO1xuICAgIH0gZWxzZSBpZignQGxhbmd1YWdlJyBpbiB2YWx1ZSkge1xuICAgICAgLy8gYWxpYXMgQGxhbmd1YWdlXG4gICAgICBydmFsW19jb21wYWN0SXJpKGFjdGl2ZUN0eCwgJ0BsYW5ndWFnZScpXSA9IHZhbHVlWydAbGFuZ3VhZ2UnXTtcbiAgICB9XG5cbiAgICAvLyBhbGlhcyBAdmFsdWVcbiAgICBydmFsW19jb21wYWN0SXJpKGFjdGl2ZUN0eCwgJ0B2YWx1ZScpXSA9IHZhbHVlWydAdmFsdWUnXTtcblxuICAgIHJldHVybiBydmFsO1xuICB9XG5cbiAgLy8gdmFsdWUgaXMgYSBzdWJqZWN0IHJlZmVyZW5jZVxuICB2YXIgZXhwYW5kZWRQcm9wZXJ0eSA9IF9leHBhbmRJcmkoYWN0aXZlQ3R4LCBhY3RpdmVQcm9wZXJ0eSwge3ZvY2FiOiB0cnVlfSk7XG4gIHZhciB0eXBlID0ganNvbmxkLmdldENvbnRleHRWYWx1ZShhY3RpdmVDdHgsIGFjdGl2ZVByb3BlcnR5LCAnQHR5cGUnKTtcbiAgdmFyIGNvbXBhY3RlZCA9IF9jb21wYWN0SXJpKFxuICAgIGFjdGl2ZUN0eCwgdmFsdWVbJ0BpZCddLCBudWxsLCB7dm9jYWI6IHR5cGUgPT09ICdAdm9jYWInfSk7XG5cbiAgLy8gY29tcGFjdCB0byBzY2FsYXJcbiAgaWYodHlwZSA9PT0gJ0BpZCcgfHwgdHlwZSA9PT0gJ0B2b2NhYicgfHwgZXhwYW5kZWRQcm9wZXJ0eSA9PT0gJ0BncmFwaCcpIHtcbiAgICByZXR1cm4gY29tcGFjdGVkO1xuICB9XG5cbiAgdmFyIHJ2YWwgPSB7fTtcbiAgcnZhbFtfY29tcGFjdElyaShhY3RpdmVDdHgsICdAaWQnKV0gPSBjb21wYWN0ZWQ7XG4gIHJldHVybiBydmFsO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSB0ZXJtIGRlZmluaXRpb24gZHVyaW5nIGNvbnRleHQgcHJvY2Vzc2luZy5cbiAqXG4gKiBAcGFyYW0gYWN0aXZlQ3R4IHRoZSBjdXJyZW50IGFjdGl2ZSBjb250ZXh0LlxuICogQHBhcmFtIGxvY2FsQ3R4IHRoZSBsb2NhbCBjb250ZXh0IGJlaW5nIHByb2Nlc3NlZC5cbiAqIEBwYXJhbSB0ZXJtIHRoZSB0ZXJtIGluIHRoZSBsb2NhbCBjb250ZXh0IHRvIGRlZmluZSB0aGUgbWFwcGluZyBmb3IuXG4gKiBAcGFyYW0gZGVmaW5lZCBhIG1hcCBvZiBkZWZpbmluZy9kZWZpbmVkIGtleXMgdG8gZGV0ZWN0IGN5Y2xlcyBhbmQgcHJldmVudFxuICogICAgICAgICAgZG91YmxlIGRlZmluaXRpb25zLlxuICovXG5mdW5jdGlvbiBfY3JlYXRlVGVybURlZmluaXRpb24oYWN0aXZlQ3R4LCBsb2NhbEN0eCwgdGVybSwgZGVmaW5lZCkge1xuICBpZih0ZXJtIGluIGRlZmluZWQpIHtcbiAgICAvLyB0ZXJtIGFscmVhZHkgZGVmaW5lZFxuICAgIGlmKGRlZmluZWRbdGVybV0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gY3ljbGUgZGV0ZWN0ZWRcbiAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAnQ3ljbGljYWwgY29udGV4dCBkZWZpbml0aW9uIGRldGVjdGVkLicsXG4gICAgICAnanNvbmxkLkN5Y2xpY2FsQ29udGV4dCcsXG4gICAgICB7Y29kZTogJ2N5Y2xpYyBJUkkgbWFwcGluZycsIGNvbnRleHQ6IGxvY2FsQ3R4LCB0ZXJtOiB0ZXJtfSk7XG4gIH1cblxuICAvLyBub3cgZGVmaW5pbmcgdGVybVxuICBkZWZpbmVkW3Rlcm1dID0gZmFsc2U7XG5cbiAgaWYoX2lzS2V5d29yZCh0ZXJtKSkge1xuICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBrZXl3b3JkcyBjYW5ub3QgYmUgb3ZlcnJpZGRlbi4nLFxuICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICB7Y29kZTogJ2tleXdvcmQgcmVkZWZpbml0aW9uJywgY29udGV4dDogbG9jYWxDdHgsIHRlcm06IHRlcm19KTtcbiAgfVxuXG4gIGlmKHRlcm0gPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGEgdGVybSBjYW5ub3QgYmUgYW4gZW1wdHkgc3RyaW5nLicsXG4gICAgICAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgIHtjb2RlOiAnaW52YWxpZCB0ZXJtIGRlZmluaXRpb24nLCBjb250ZXh0OiBsb2NhbEN0eH0pO1xuICB9XG5cbiAgLy8gcmVtb3ZlIG9sZCBtYXBwaW5nXG4gIGlmKGFjdGl2ZUN0eC5tYXBwaW5nc1t0ZXJtXSkge1xuICAgIGRlbGV0ZSBhY3RpdmVDdHgubWFwcGluZ3NbdGVybV07XG4gIH1cblxuICAvLyBnZXQgY29udGV4dCB0ZXJtIHZhbHVlXG4gIHZhciB2YWx1ZSA9IGxvY2FsQ3R4W3Rlcm1dO1xuXG4gIC8vIGNsZWFyIGNvbnRleHQgZW50cnlcbiAgaWYodmFsdWUgPT09IG51bGwgfHwgKF9pc09iamVjdCh2YWx1ZSkgJiYgdmFsdWVbJ0BpZCddID09PSBudWxsKSkge1xuICAgIGFjdGl2ZUN0eC5tYXBwaW5nc1t0ZXJtXSA9IG51bGw7XG4gICAgZGVmaW5lZFt0ZXJtXSA9IHRydWU7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gY29udmVydCBzaG9ydC1oYW5kIHZhbHVlIHRvIG9iamVjdCB3L0BpZFxuICBpZihfaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB7J0BpZCc6IHZhbHVlfTtcbiAgfVxuXG4gIGlmKCFfaXNPYmplY3QodmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IEBjb250ZXh0IHByb3BlcnR5IHZhbHVlcyBtdXN0IGJlICcgK1xuICAgICAgJ3N0cmluZ3Mgb3Igb2JqZWN0cy4nLFxuICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICB7Y29kZTogJ2ludmFsaWQgdGVybSBkZWZpbml0aW9uJywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgfVxuXG4gIC8vIGNyZWF0ZSBuZXcgbWFwcGluZ1xuICB2YXIgbWFwcGluZyA9IGFjdGl2ZUN0eC5tYXBwaW5nc1t0ZXJtXSA9IHt9O1xuICBtYXBwaW5nLnJldmVyc2UgPSBmYWxzZTtcblxuICBpZignQHJldmVyc2UnIGluIHZhbHVlKSB7XG4gICAgaWYoJ0BpZCcgaW4gdmFsdWUpIHtcbiAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGEgQHJldmVyc2UgdGVybSBkZWZpbml0aW9uIG11c3Qgbm90ICcgK1xuICAgICAgICAnY29udGFpbiBAaWQuJywgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgIHtjb2RlOiAnaW52YWxpZCByZXZlcnNlIHByb3BlcnR5JywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgICB9XG4gICAgdmFyIHJldmVyc2UgPSB2YWx1ZVsnQHJldmVyc2UnXTtcbiAgICBpZighX2lzU3RyaW5nKHJldmVyc2UpKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhIEBjb250ZXh0IEByZXZlcnNlIHZhbHVlIG11c3QgYmUgYSBzdHJpbmcuJyxcbiAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsIHtjb2RlOiAnaW52YWxpZCBJUkkgbWFwcGluZycsIGNvbnRleHQ6IGxvY2FsQ3R4fSk7XG4gICAgfVxuXG4gICAgLy8gZXhwYW5kIGFuZCBhZGQgQGlkIG1hcHBpbmdcbiAgICB2YXIgaWQgPSBfZXhwYW5kSXJpKFxuICAgICAgYWN0aXZlQ3R4LCByZXZlcnNlLCB7dm9jYWI6IHRydWUsIGJhc2U6IGZhbHNlfSwgbG9jYWxDdHgsIGRlZmluZWQpO1xuICAgIGlmKCFfaXNBYnNvbHV0ZUlyaShpZCkpIHtcbiAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGEgQGNvbnRleHQgQHJldmVyc2UgdmFsdWUgbXVzdCBiZSBhbiAnICtcbiAgICAgICAgJ2Fic29sdXRlIElSSSBvciBhIGJsYW5rIG5vZGUgaWRlbnRpZmllci4nLFxuICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdpbnZhbGlkIElSSSBtYXBwaW5nJywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgICB9XG4gICAgbWFwcGluZ1snQGlkJ10gPSBpZDtcbiAgICBtYXBwaW5nLnJldmVyc2UgPSB0cnVlO1xuICB9IGVsc2UgaWYoJ0BpZCcgaW4gdmFsdWUpIHtcbiAgICB2YXIgaWQgPSB2YWx1ZVsnQGlkJ107XG4gICAgaWYoIV9pc1N0cmluZyhpZCkpIHtcbiAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGEgQGNvbnRleHQgQGlkIHZhbHVlIG11c3QgYmUgYW4gYXJyYXkgJyArXG4gICAgICAgICdvZiBzdHJpbmdzIG9yIGEgc3RyaW5nLicsXG4gICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLCB7Y29kZTogJ2ludmFsaWQgSVJJIG1hcHBpbmcnLCBjb250ZXh0OiBsb2NhbEN0eH0pO1xuICAgIH1cbiAgICBpZihpZCAhPT0gdGVybSkge1xuICAgICAgLy8gZXhwYW5kIGFuZCBhZGQgQGlkIG1hcHBpbmdcbiAgICAgIGlkID0gX2V4cGFuZElyaShcbiAgICAgICAgYWN0aXZlQ3R4LCBpZCwge3ZvY2FiOiB0cnVlLCBiYXNlOiBmYWxzZX0sIGxvY2FsQ3R4LCBkZWZpbmVkKTtcbiAgICAgIGlmKCFfaXNBYnNvbHV0ZUlyaShpZCkgJiYgIV9pc0tleXdvcmQoaWQpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgYSBAY29udGV4dCBAaWQgdmFsdWUgbXVzdCBiZSBhbiAnICtcbiAgICAgICAgICAnYWJzb2x1dGUgSVJJLCBhIGJsYW5rIG5vZGUgaWRlbnRpZmllciwgb3IgYSBrZXl3b3JkLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdpbnZhbGlkIElSSSBtYXBwaW5nJywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgICAgIH1cbiAgICAgIG1hcHBpbmdbJ0BpZCddID0gaWQ7XG4gICAgfVxuICB9XG5cbiAgaWYoISgnQGlkJyBpbiBtYXBwaW5nKSkge1xuICAgIC8vIHNlZSBpZiB0aGUgdGVybSBoYXMgYSBwcmVmaXhcbiAgICB2YXIgY29sb24gPSB0ZXJtLmluZGV4T2YoJzonKTtcbiAgICBpZihjb2xvbiAhPT0gLTEpIHtcbiAgICAgIHZhciBwcmVmaXggPSB0ZXJtLnN1YnN0cigwLCBjb2xvbik7XG4gICAgICBpZihwcmVmaXggaW4gbG9jYWxDdHgpIHtcbiAgICAgICAgLy8gZGVmaW5lIHBhcmVudCBwcmVmaXhcbiAgICAgICAgX2NyZWF0ZVRlcm1EZWZpbml0aW9uKGFjdGl2ZUN0eCwgbG9jYWxDdHgsIHByZWZpeCwgZGVmaW5lZCk7XG4gICAgICB9XG5cbiAgICAgIGlmKGFjdGl2ZUN0eC5tYXBwaW5nc1twcmVmaXhdKSB7XG4gICAgICAgIC8vIHNldCBAaWQgYmFzZWQgb24gcHJlZml4IHBhcmVudFxuICAgICAgICB2YXIgc3VmZml4ID0gdGVybS5zdWJzdHIoY29sb24gKyAxKTtcbiAgICAgICAgbWFwcGluZ1snQGlkJ10gPSBhY3RpdmVDdHgubWFwcGluZ3NbcHJlZml4XVsnQGlkJ10gKyBzdWZmaXg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB0ZXJtIGlzIGFuIGFic29sdXRlIElSSVxuICAgICAgICBtYXBwaW5nWydAaWQnXSA9IHRlcm07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vbi1JUklzICptdXN0KiBkZWZpbmUgQGlkcyBpZiBAdm9jYWIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAgaWYoISgnQHZvY2FiJyBpbiBhY3RpdmVDdHgpKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgQGNvbnRleHQgdGVybXMgbXVzdCBkZWZpbmUgYW4gQGlkLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdpbnZhbGlkIElSSSBtYXBwaW5nJywgY29udGV4dDogbG9jYWxDdHgsIHRlcm06IHRlcm19KTtcbiAgICAgIH1cbiAgICAgIC8vIHByZXBlbmQgdm9jYWIgdG8gdGVybVxuICAgICAgbWFwcGluZ1snQGlkJ10gPSBhY3RpdmVDdHhbJ0B2b2NhYiddICsgdGVybTtcbiAgICB9XG4gIH1cblxuICAvLyBJUkkgbWFwcGluZyBub3cgZGVmaW5lZFxuICBkZWZpbmVkW3Rlcm1dID0gdHJ1ZTtcblxuICBpZignQHR5cGUnIGluIHZhbHVlKSB7XG4gICAgdmFyIHR5cGUgPSB2YWx1ZVsnQHR5cGUnXTtcbiAgICBpZighX2lzU3RyaW5nKHR5cGUpKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBhbiBAY29udGV4dCBAdHlwZSB2YWx1ZXMgbXVzdCBiZSBhIHN0cmluZy4nLFxuICAgICAgICAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgICAge2NvZGU6ICdpbnZhbGlkIHR5cGUgbWFwcGluZycsIGNvbnRleHQ6IGxvY2FsQ3R4fSk7XG4gICAgfVxuXG4gICAgaWYodHlwZSAhPT0gJ0BpZCcgJiYgdHlwZSAhPT0gJ0B2b2NhYicpIHtcbiAgICAgIC8vIGV4cGFuZCBAdHlwZSB0byBmdWxsIElSSVxuICAgICAgdHlwZSA9IF9leHBhbmRJcmkoXG4gICAgICAgIGFjdGl2ZUN0eCwgdHlwZSwge3ZvY2FiOiB0cnVlLCBiYXNlOiBmYWxzZX0sIGxvY2FsQ3R4LCBkZWZpbmVkKTtcbiAgICAgIGlmKCFfaXNBYnNvbHV0ZUlyaSh0eXBlKSkge1xuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgSlNPTi1MRCBzeW50YXg7IGFuIEBjb250ZXh0IEB0eXBlIHZhbHVlIG11c3QgYmUgYW4gJyArXG4gICAgICAgICAgJ2Fic29sdXRlIElSSS4nLFxuICAgICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCB0eXBlIG1hcHBpbmcnLCBjb250ZXh0OiBsb2NhbEN0eH0pO1xuICAgICAgfVxuICAgICAgaWYodHlwZS5pbmRleE9mKCdfOicpID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgYW4gQGNvbnRleHQgQHR5cGUgdmFsdWVzIG11c3QgYmUgYW4gSVJJLCAnICtcbiAgICAgICAgICAnbm90IGEgYmxhbmsgbm9kZSBpZGVudGlmaWVyLicsXG4gICAgICAgICAgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgICAge2NvZGU6ICdpbnZhbGlkIHR5cGUgbWFwcGluZycsIGNvbnRleHQ6IGxvY2FsQ3R4fSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYWRkIEB0eXBlIHRvIG1hcHBpbmdcbiAgICBtYXBwaW5nWydAdHlwZSddID0gdHlwZTtcbiAgfVxuXG4gIGlmKCdAY29udGFpbmVyJyBpbiB2YWx1ZSkge1xuICAgIHZhciBjb250YWluZXIgPSB2YWx1ZVsnQGNvbnRhaW5lciddO1xuICAgIGlmKGNvbnRhaW5lciAhPT0gJ0BsaXN0JyAmJiBjb250YWluZXIgIT09ICdAc2V0JyAmJlxuICAgICAgY29udGFpbmVyICE9PSAnQGluZGV4JyAmJiBjb250YWluZXIgIT09ICdAbGFuZ3VhZ2UnKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBAY29udGV4dCBAY29udGFpbmVyIHZhbHVlIG11c3QgYmUgJyArXG4gICAgICAgICdvbmUgb2YgdGhlIGZvbGxvd2luZzogQGxpc3QsIEBzZXQsIEBpbmRleCwgb3IgQGxhbmd1YWdlLicsXG4gICAgICAgICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICB7Y29kZTogJ2ludmFsaWQgY29udGFpbmVyIG1hcHBpbmcnLCBjb250ZXh0OiBsb2NhbEN0eH0pO1xuICAgIH1cbiAgICBpZihtYXBwaW5nLnJldmVyc2UgJiYgY29udGFpbmVyICE9PSAnQGluZGV4JyAmJiBjb250YWluZXIgIT09ICdAc2V0JyAmJlxuICAgICAgY29udGFpbmVyICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBAY29udGV4dCBAY29udGFpbmVyIHZhbHVlIGZvciBhIEByZXZlcnNlICcgK1xuICAgICAgICAndHlwZSBkZWZpbml0aW9uIG11c3QgYmUgQGluZGV4IG9yIEBzZXQuJywgJ2pzb25sZC5TeW50YXhFcnJvcicsXG4gICAgICAgIHtjb2RlOiAnaW52YWxpZCByZXZlcnNlIHByb3BlcnR5JywgY29udGV4dDogbG9jYWxDdHh9KTtcbiAgICB9XG5cbiAgICAvLyBhZGQgQGNvbnRhaW5lciB0byBtYXBwaW5nXG4gICAgbWFwcGluZ1snQGNvbnRhaW5lciddID0gY29udGFpbmVyO1xuICB9XG5cbiAgaWYoJ0BsYW5ndWFnZScgaW4gdmFsdWUgJiYgISgnQHR5cGUnIGluIHZhbHVlKSkge1xuICAgIHZhciBsYW5ndWFnZSA9IHZhbHVlWydAbGFuZ3VhZ2UnXTtcbiAgICBpZihsYW5ndWFnZSAhPT0gbnVsbCAmJiAhX2lzU3RyaW5nKGxhbmd1YWdlKSkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgQGNvbnRleHQgQGxhbmd1YWdlIHZhbHVlIG11c3QgYmUgJyArXG4gICAgICAgICdhIHN0cmluZyBvciBudWxsLicsICdqc29ubGQuU3ludGF4RXJyb3InLFxuICAgICAgICB7Y29kZTogJ2ludmFsaWQgbGFuZ3VhZ2UgbWFwcGluZycsIGNvbnRleHQ6IGxvY2FsQ3R4fSk7XG4gICAgfVxuXG4gICAgLy8gYWRkIEBsYW5ndWFnZSB0byBtYXBwaW5nXG4gICAgaWYobGFuZ3VhZ2UgIT09IG51bGwpIHtcbiAgICAgIGxhbmd1YWdlID0gbGFuZ3VhZ2UudG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgbWFwcGluZ1snQGxhbmd1YWdlJ10gPSBsYW5ndWFnZTtcbiAgfVxuXG4gIC8vIGRpc2FsbG93IGFsaWFzaW5nIEBjb250ZXh0IGFuZCBAcHJlc2VydmVcbiAgdmFyIGlkID0gbWFwcGluZ1snQGlkJ107XG4gIGlmKGlkID09PSAnQGNvbnRleHQnIHx8IGlkID09PSAnQHByZXNlcnZlJykge1xuICAgIHRocm93IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICdJbnZhbGlkIEpTT04tTEQgc3ludGF4OyBAY29udGV4dCBhbmQgQHByZXNlcnZlIGNhbm5vdCBiZSBhbGlhc2VkLicsXG4gICAgICAnanNvbmxkLlN5bnRheEVycm9yJywge2NvZGU6ICdpbnZhbGlkIGtleXdvcmQgYWxpYXMnLCBjb250ZXh0OiBsb2NhbEN0eH0pO1xuICB9XG59XG5cbi8qKlxuICogRXhwYW5kcyBhIHN0cmluZyB0byBhIGZ1bGwgSVJJLiBUaGUgc3RyaW5nIG1heSBiZSBhIHRlcm0sIGEgcHJlZml4LCBhXG4gKiByZWxhdGl2ZSBJUkksIG9yIGFuIGFic29sdXRlIElSSS4gVGhlIGFzc29jaWF0ZWQgYWJzb2x1dGUgSVJJIHdpbGwgYmVcbiAqIHJldHVybmVkLlxuICpcbiAqIEBwYXJhbSBhY3RpdmVDdHggdGhlIGN1cnJlbnQgYWN0aXZlIGNvbnRleHQuXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHN0cmluZyB0byBleHBhbmQuXG4gKiBAcGFyYW0gcmVsYXRpdmVUbyBvcHRpb25zIGZvciBob3cgdG8gcmVzb2x2ZSByZWxhdGl2ZSBJUklzOlxuICogICAgICAgICAgYmFzZTogdHJ1ZSB0byByZXNvbHZlIGFnYWluc3QgdGhlIGJhc2UgSVJJLCBmYWxzZSBub3QgdG8uXG4gKiAgICAgICAgICB2b2NhYjogdHJ1ZSB0byBjb25jYXRlbmF0ZSBhZnRlciBAdm9jYWIsIGZhbHNlIG5vdCB0by5cbiAqIEBwYXJhbSBsb2NhbEN0eCB0aGUgbG9jYWwgY29udGV4dCBiZWluZyBwcm9jZXNzZWQgKG9ubHkgZ2l2ZW4gaWYgY2FsbGVkXG4gKiAgICAgICAgICBkdXJpbmcgY29udGV4dCBwcm9jZXNzaW5nKS5cbiAqIEBwYXJhbSBkZWZpbmVkIGEgbWFwIGZvciB0cmFja2luZyBjeWNsZXMgaW4gY29udGV4dCBkZWZpbml0aW9ucyAob25seSBnaXZlblxuICogICAgICAgICAgaWYgY2FsbGVkIGR1cmluZyBjb250ZXh0IHByb2Nlc3NpbmcpLlxuICpcbiAqIEByZXR1cm4gdGhlIGV4cGFuZGVkIHZhbHVlLlxuICovXG5mdW5jdGlvbiBfZXhwYW5kSXJpKGFjdGl2ZUN0eCwgdmFsdWUsIHJlbGF0aXZlVG8sIGxvY2FsQ3R4LCBkZWZpbmVkKSB7XG4gIC8vIGFscmVhZHkgZXhwYW5kZWRcbiAgaWYodmFsdWUgPT09IG51bGwgfHwgX2lzS2V5d29yZCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvLyBkZWZpbmUgdGVybSBkZXBlbmRlbmN5IGlmIG5vdCBkZWZpbmVkXG4gIGlmKGxvY2FsQ3R4ICYmIHZhbHVlIGluIGxvY2FsQ3R4ICYmIGRlZmluZWRbdmFsdWVdICE9PSB0cnVlKSB7XG4gICAgX2NyZWF0ZVRlcm1EZWZpbml0aW9uKGFjdGl2ZUN0eCwgbG9jYWxDdHgsIHZhbHVlLCBkZWZpbmVkKTtcbiAgfVxuXG4gIHJlbGF0aXZlVG8gPSByZWxhdGl2ZVRvIHx8IHt9O1xuICBpZihyZWxhdGl2ZVRvLnZvY2FiKSB7XG4gICAgdmFyIG1hcHBpbmcgPSBhY3RpdmVDdHgubWFwcGluZ3NbdmFsdWVdO1xuXG4gICAgLy8gdmFsdWUgaXMgZXhwbGljaXRseSBpZ25vcmVkIHdpdGggYSBudWxsIG1hcHBpbmdcbiAgICBpZihtYXBwaW5nID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZihtYXBwaW5nKSB7XG4gICAgICAvLyB2YWx1ZSBpcyBhIHRlcm1cbiAgICAgIHJldHVybiBtYXBwaW5nWydAaWQnXTtcbiAgICB9XG4gIH1cblxuICAvLyBzcGxpdCB2YWx1ZSBpbnRvIHByZWZpeDpzdWZmaXhcbiAgdmFyIGNvbG9uID0gdmFsdWUuaW5kZXhPZignOicpO1xuICBpZihjb2xvbiAhPT0gLTEpIHtcbiAgICB2YXIgcHJlZml4ID0gdmFsdWUuc3Vic3RyKDAsIGNvbG9uKTtcbiAgICB2YXIgc3VmZml4ID0gdmFsdWUuc3Vic3RyKGNvbG9uICsgMSk7XG5cbiAgICAvLyBkbyBub3QgZXhwYW5kIGJsYW5rIG5vZGVzIChwcmVmaXggb2YgJ18nKSBvciBhbHJlYWR5LWFic29sdXRlXG4gICAgLy8gSVJJcyAoc3VmZml4IG9mICcvLycpXG4gICAgaWYocHJlZml4ID09PSAnXycgfHwgc3VmZml4LmluZGV4T2YoJy8vJykgPT09IDApIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBwcmVmaXggZGVwZW5kZW5jeSBub3QgZGVmaW5lZCwgZGVmaW5lIGl0XG4gICAgaWYobG9jYWxDdHggJiYgcHJlZml4IGluIGxvY2FsQ3R4KSB7XG4gICAgICBfY3JlYXRlVGVybURlZmluaXRpb24oYWN0aXZlQ3R4LCBsb2NhbEN0eCwgcHJlZml4LCBkZWZpbmVkKTtcbiAgICB9XG5cbiAgICAvLyB1c2UgbWFwcGluZyBpZiBwcmVmaXggaXMgZGVmaW5lZFxuICAgIHZhciBtYXBwaW5nID0gYWN0aXZlQ3R4Lm1hcHBpbmdzW3ByZWZpeF07XG4gICAgaWYobWFwcGluZykge1xuICAgICAgcmV0dXJuIG1hcHBpbmdbJ0BpZCddICsgc3VmZml4O1xuICAgIH1cblxuICAgIC8vIGFscmVhZHkgYWJzb2x1dGUgSVJJXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLy8gcHJlcGVuZCB2b2NhYlxuICBpZihyZWxhdGl2ZVRvLnZvY2FiICYmICdAdm9jYWInIGluIGFjdGl2ZUN0eCkge1xuICAgIHJldHVybiBhY3RpdmVDdHhbJ0B2b2NhYiddICsgdmFsdWU7XG4gIH1cblxuICAvLyBwcmVwZW5kIGJhc2VcbiAgdmFyIHJ2YWwgPSB2YWx1ZTtcbiAgaWYocmVsYXRpdmVUby5iYXNlKSB7XG4gICAgcnZhbCA9IF9wcmVwZW5kQmFzZShhY3RpdmVDdHhbJ0BiYXNlJ10sIHJ2YWwpO1xuICB9XG5cbiAgcmV0dXJuIHJ2YWw7XG59XG5cbi8qKlxuICogUHJlcGVuZHMgYSBiYXNlIElSSSB0byB0aGUgZ2l2ZW4gcmVsYXRpdmUgSVJJLlxuICpcbiAqIEBwYXJhbSBiYXNlIHRoZSBiYXNlIElSSS5cbiAqIEBwYXJhbSBpcmkgdGhlIHJlbGF0aXZlIElSSS5cbiAqXG4gKiBAcmV0dXJuIHRoZSBhYnNvbHV0ZSBJUkkuXG4gKi9cbmZ1bmN0aW9uIF9wcmVwZW5kQmFzZShiYXNlLCBpcmkpIHtcbiAgLy8gc2tpcCBJUkkgcHJvY2Vzc2luZ1xuICBpZihiYXNlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGlyaTtcbiAgfVxuICAvLyBhbHJlYWR5IGFuIGFic29sdXRlIElSSVxuICBpZihpcmkuaW5kZXhPZignOicpICE9PSAtMSkge1xuICAgIHJldHVybiBpcmk7XG4gIH1cblxuICAvLyBwYXJzZSBiYXNlIGlmIGl0IGlzIGEgc3RyaW5nXG4gIGlmKF9pc1N0cmluZyhiYXNlKSkge1xuICAgIGJhc2UgPSBqc29ubGQudXJsLnBhcnNlKGJhc2UgfHwgJycpO1xuICB9XG5cbiAgLy8gcGFyc2UgZ2l2ZW4gSVJJXG4gIHZhciByZWwgPSBqc29ubGQudXJsLnBhcnNlKGlyaSk7XG5cbiAgLy8gcGVyIFJGQzM5ODYgNS4yLjJcbiAgdmFyIHRyYW5zZm9ybSA9IHtcbiAgICBwcm90b2NvbDogYmFzZS5wcm90b2NvbCB8fCAnJ1xuICB9O1xuXG4gIGlmKHJlbC5hdXRob3JpdHkgIT09IG51bGwpIHtcbiAgICB0cmFuc2Zvcm0uYXV0aG9yaXR5ID0gcmVsLmF1dGhvcml0eTtcbiAgICB0cmFuc2Zvcm0ucGF0aCA9IHJlbC5wYXRoO1xuICAgIHRyYW5zZm9ybS5xdWVyeSA9IHJlbC5xdWVyeTtcbiAgfSBlbHNlIHtcbiAgICB0cmFuc2Zvcm0uYXV0aG9yaXR5ID0gYmFzZS5hdXRob3JpdHk7XG5cbiAgICBpZihyZWwucGF0aCA9PT0gJycpIHtcbiAgICAgIHRyYW5zZm9ybS5wYXRoID0gYmFzZS5wYXRoO1xuICAgICAgaWYocmVsLnF1ZXJ5ICE9PSBudWxsKSB7XG4gICAgICAgIHRyYW5zZm9ybS5xdWVyeSA9IHJlbC5xdWVyeTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyYW5zZm9ybS5xdWVyeSA9IGJhc2UucXVlcnk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmKHJlbC5wYXRoLmluZGV4T2YoJy8nKSA9PT0gMCkge1xuICAgICAgICAvLyBJUkkgcmVwcmVzZW50cyBhbiBhYnNvbHV0ZSBwYXRoXG4gICAgICAgIHRyYW5zZm9ybS5wYXRoID0gcmVsLnBhdGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBtZXJnZSBwYXRoc1xuICAgICAgICB2YXIgcGF0aCA9IGJhc2UucGF0aDtcblxuICAgICAgICAvLyBhcHBlbmQgcmVsYXRpdmUgcGF0aCB0byB0aGUgZW5kIG9mIHRoZSBsYXN0IGRpcmVjdG9yeSBmcm9tIGJhc2VcbiAgICAgICAgaWYocmVsLnBhdGggIT09ICcnKSB7XG4gICAgICAgICAgcGF0aCA9IHBhdGguc3Vic3RyKDAsIHBhdGgubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuICAgICAgICAgIGlmKHBhdGgubGVuZ3RoID4gMCAmJiBwYXRoLnN1YnN0cigtMSkgIT09ICcvJykge1xuICAgICAgICAgICAgcGF0aCArPSAnLyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBhdGggKz0gcmVsLnBhdGg7XG4gICAgICAgIH1cblxuICAgICAgICB0cmFuc2Zvcm0ucGF0aCA9IHBhdGg7XG4gICAgICB9XG4gICAgICB0cmFuc2Zvcm0ucXVlcnkgPSByZWwucXVlcnk7XG4gICAgfVxuICB9XG5cbiAgLy8gcmVtb3ZlIHNsYXNoZXMgYW5kIGRvdHMgaW4gcGF0aFxuICB0cmFuc2Zvcm0ucGF0aCA9IF9yZW1vdmVEb3RTZWdtZW50cyh0cmFuc2Zvcm0ucGF0aCwgISF0cmFuc2Zvcm0uYXV0aG9yaXR5KTtcblxuICAvLyBjb25zdHJ1Y3QgVVJMXG4gIHZhciBydmFsID0gdHJhbnNmb3JtLnByb3RvY29sO1xuICBpZih0cmFuc2Zvcm0uYXV0aG9yaXR5ICE9PSBudWxsKSB7XG4gICAgcnZhbCArPSAnLy8nICsgdHJhbnNmb3JtLmF1dGhvcml0eTtcbiAgfVxuICBydmFsICs9IHRyYW5zZm9ybS5wYXRoO1xuICBpZih0cmFuc2Zvcm0ucXVlcnkgIT09IG51bGwpIHtcbiAgICBydmFsICs9ICc/JyArIHRyYW5zZm9ybS5xdWVyeTtcbiAgfVxuICBpZihyZWwuZnJhZ21lbnQgIT09IG51bGwpIHtcbiAgICBydmFsICs9ICcjJyArIHJlbC5mcmFnbWVudDtcbiAgfVxuXG4gIC8vIGhhbmRsZSBlbXB0eSBiYXNlXG4gIGlmKHJ2YWwgPT09ICcnKSB7XG4gICAgcnZhbCA9ICcuLyc7XG4gIH1cblxuICByZXR1cm4gcnZhbDtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIGEgYmFzZSBJUkkgZnJvbSB0aGUgZ2l2ZW4gYWJzb2x1dGUgSVJJLlxuICpcbiAqIEBwYXJhbSBiYXNlIHRoZSBiYXNlIElSSS5cbiAqIEBwYXJhbSBpcmkgdGhlIGFic29sdXRlIElSSS5cbiAqXG4gKiBAcmV0dXJuIHRoZSByZWxhdGl2ZSBJUkkgaWYgcmVsYXRpdmUgdG8gYmFzZSwgb3RoZXJ3aXNlIHRoZSBhYnNvbHV0ZSBJUkkuXG4gKi9cbmZ1bmN0aW9uIF9yZW1vdmVCYXNlKGJhc2UsIGlyaSkge1xuICAvLyBza2lwIElSSSBwcm9jZXNzaW5nXG4gIGlmKGJhc2UgPT09IG51bGwpIHtcbiAgICByZXR1cm4gaXJpO1xuICB9XG5cbiAgaWYoX2lzU3RyaW5nKGJhc2UpKSB7XG4gICAgYmFzZSA9IGpzb25sZC51cmwucGFyc2UoYmFzZSB8fCAnJyk7XG4gIH1cblxuICAvLyBlc3RhYmxpc2ggYmFzZSByb290XG4gIHZhciByb290ID0gJyc7XG4gIGlmKGJhc2UuaHJlZiAhPT0gJycpIHtcbiAgICByb290ICs9IChiYXNlLnByb3RvY29sIHx8ICcnKSArICcvLycgKyAoYmFzZS5hdXRob3JpdHkgfHwgJycpO1xuICB9IGVsc2UgaWYoaXJpLmluZGV4T2YoJy8vJykpIHtcbiAgICAvLyBzdXBwb3J0IG5ldHdvcmstcGF0aCByZWZlcmVuY2Ugd2l0aCBlbXB0eSBiYXNlXG4gICAgcm9vdCArPSAnLy8nO1xuICB9XG5cbiAgLy8gSVJJIG5vdCByZWxhdGl2ZSB0byBiYXNlXG4gIGlmKGlyaS5pbmRleE9mKHJvb3QpICE9PSAwKSB7XG4gICAgcmV0dXJuIGlyaTtcbiAgfVxuXG4gIC8vIHJlbW92ZSByb290IGZyb20gSVJJIGFuZCBwYXJzZSByZW1haW5kZXJcbiAgdmFyIHJlbCA9IGpzb25sZC51cmwucGFyc2UoaXJpLnN1YnN0cihyb290Lmxlbmd0aCkpO1xuXG4gIC8vIHJlbW92ZSBwYXRoIHNlZ21lbnRzIHRoYXQgbWF0Y2ggKGRvIG5vdCByZW1vdmUgbGFzdCBzZWdtZW50IHVubGVzcyB0aGVyZVxuICAvLyBpcyBhIGhhc2ggb3IgcXVlcnkpXG4gIHZhciBiYXNlU2VnbWVudHMgPSBiYXNlLm5vcm1hbGl6ZWRQYXRoLnNwbGl0KCcvJyk7XG4gIHZhciBpcmlTZWdtZW50cyA9IHJlbC5ub3JtYWxpemVkUGF0aC5zcGxpdCgnLycpO1xuICB2YXIgbGFzdCA9IChyZWwuZnJhZ21lbnQgfHwgcmVsLnF1ZXJ5KSA/IDAgOiAxO1xuICB3aGlsZShiYXNlU2VnbWVudHMubGVuZ3RoID4gMCAmJiBpcmlTZWdtZW50cy5sZW5ndGggPiBsYXN0KSB7XG4gICAgaWYoYmFzZVNlZ21lbnRzWzBdICE9PSBpcmlTZWdtZW50c1swXSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGJhc2VTZWdtZW50cy5zaGlmdCgpO1xuICAgIGlyaVNlZ21lbnRzLnNoaWZ0KCk7XG4gIH1cblxuICAvLyB1c2UgJy4uLycgZm9yIGVhY2ggbm9uLW1hdGNoaW5nIGJhc2Ugc2VnbWVudFxuICB2YXIgcnZhbCA9ICcnO1xuICBpZihiYXNlU2VnbWVudHMubGVuZ3RoID4gMCkge1xuICAgIC8vIGRvbid0IGNvdW50IHRoZSBsYXN0IHNlZ21lbnQgKGlmIGl0IGVuZHMgd2l0aCAnLycgbGFzdCBwYXRoIGRvZXNuJ3RcbiAgICAvLyBjb3VudCBhbmQgaWYgaXQgZG9lc24ndCBlbmQgd2l0aCAnLycgaXQgaXNuJ3QgYSBwYXRoKVxuICAgIGJhc2VTZWdtZW50cy5wb3AoKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgYmFzZVNlZ21lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBydmFsICs9ICcuLi8nO1xuICAgIH1cbiAgfVxuXG4gIC8vIHByZXBlbmQgcmVtYWluaW5nIHNlZ21lbnRzXG4gIHJ2YWwgKz0gaXJpU2VnbWVudHMuam9pbignLycpO1xuXG4gIC8vIGFkZCBxdWVyeSBhbmQgaGFzaFxuICBpZihyZWwucXVlcnkgIT09IG51bGwpIHtcbiAgICBydmFsICs9ICc/JyArIHJlbC5xdWVyeTtcbiAgfVxuICBpZihyZWwuZnJhZ21lbnQgIT09IG51bGwpIHtcbiAgICBydmFsICs9ICcjJyArIHJlbC5mcmFnbWVudDtcbiAgfVxuXG4gIC8vIGhhbmRsZSBlbXB0eSBiYXNlXG4gIGlmKHJ2YWwgPT09ICcnKSB7XG4gICAgcnZhbCA9ICcuLyc7XG4gIH1cblxuICByZXR1cm4gcnZhbDtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBpbml0aWFsIGNvbnRleHQuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgW2Jhc2VdIHRoZSBkb2N1bWVudCBiYXNlIElSSS5cbiAqXG4gKiBAcmV0dXJuIHRoZSBpbml0aWFsIGNvbnRleHQuXG4gKi9cbmZ1bmN0aW9uIF9nZXRJbml0aWFsQ29udGV4dChvcHRpb25zKSB7XG4gIHZhciBiYXNlID0ganNvbmxkLnVybC5wYXJzZShvcHRpb25zLmJhc2UgfHwgJycpO1xuICByZXR1cm4ge1xuICAgICdAYmFzZSc6IGJhc2UsXG4gICAgbWFwcGluZ3M6IHt9LFxuICAgIGludmVyc2U6IG51bGwsXG4gICAgZ2V0SW52ZXJzZTogX2NyZWF0ZUludmVyc2VDb250ZXh0LFxuICAgIGNsb25lOiBfY2xvbmVBY3RpdmVDb250ZXh0XG4gIH07XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhbiBpbnZlcnNlIGNvbnRleHQgZm9yIHVzZSBpbiB0aGUgY29tcGFjdGlvbiBhbGdvcml0aG0sIGlmXG4gICAqIG5vdCBhbHJlYWR5IGdlbmVyYXRlZCBmb3IgdGhlIGdpdmVuIGFjdGl2ZSBjb250ZXh0LlxuICAgKlxuICAgKiBAcmV0dXJuIHRoZSBpbnZlcnNlIGNvbnRleHQuXG4gICAqL1xuICBmdW5jdGlvbiBfY3JlYXRlSW52ZXJzZUNvbnRleHQoKSB7XG4gICAgdmFyIGFjdGl2ZUN0eCA9IHRoaXM7XG5cbiAgICAvLyBsYXppbHkgY3JlYXRlIGludmVyc2VcbiAgICBpZihhY3RpdmVDdHguaW52ZXJzZSkge1xuICAgICAgcmV0dXJuIGFjdGl2ZUN0eC5pbnZlcnNlO1xuICAgIH1cbiAgICB2YXIgaW52ZXJzZSA9IGFjdGl2ZUN0eC5pbnZlcnNlID0ge307XG5cbiAgICAvLyBoYW5kbGUgZGVmYXVsdCBsYW5ndWFnZVxuICAgIHZhciBkZWZhdWx0TGFuZ3VhZ2UgPSBhY3RpdmVDdHhbJ0BsYW5ndWFnZSddIHx8ICdAbm9uZSc7XG5cbiAgICAvLyBjcmVhdGUgdGVybSBzZWxlY3Rpb25zIGZvciBlYWNoIG1hcHBpbmcgaW4gdGhlIGNvbnRleHQsIG9yZGVyZWQgYnlcbiAgICAvLyBzaG9ydGVzdCBhbmQgdGhlbiBsZXhpY29ncmFwaGljYWxseSBsZWFzdFxuICAgIHZhciBtYXBwaW5ncyA9IGFjdGl2ZUN0eC5tYXBwaW5ncztcbiAgICB2YXIgdGVybXMgPSBPYmplY3Qua2V5cyhtYXBwaW5ncykuc29ydChfY29tcGFyZVNob3J0ZXN0TGVhc3QpO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0ZXJtcy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIHRlcm0gPSB0ZXJtc1tpXTtcbiAgICAgIHZhciBtYXBwaW5nID0gbWFwcGluZ3NbdGVybV07XG4gICAgICBpZihtYXBwaW5nID09PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICB2YXIgY29udGFpbmVyID0gbWFwcGluZ1snQGNvbnRhaW5lciddIHx8ICdAbm9uZSc7XG5cbiAgICAgIC8vIGl0ZXJhdGUgb3ZlciBldmVyeSBJUkkgaW4gdGhlIG1hcHBpbmdcbiAgICAgIHZhciBpZHMgPSBtYXBwaW5nWydAaWQnXTtcbiAgICAgIGlmKCFfaXNBcnJheShpZHMpKSB7XG4gICAgICAgIGlkcyA9IFtpZHNdO1xuICAgICAgfVxuICAgICAgZm9yKHZhciBpaSA9IDA7IGlpIDwgaWRzLmxlbmd0aDsgKytpaSkge1xuICAgICAgICB2YXIgaXJpID0gaWRzW2lpXTtcbiAgICAgICAgdmFyIGVudHJ5ID0gaW52ZXJzZVtpcmldO1xuXG4gICAgICAgIC8vIGluaXRpYWxpemUgZW50cnlcbiAgICAgICAgaWYoIWVudHJ5KSB7XG4gICAgICAgICAgaW52ZXJzZVtpcmldID0gZW50cnkgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFkZCBuZXcgZW50cnlcbiAgICAgICAgaWYoIWVudHJ5W2NvbnRhaW5lcl0pIHtcbiAgICAgICAgICBlbnRyeVtjb250YWluZXJdID0ge1xuICAgICAgICAgICAgJ0BsYW5ndWFnZSc6IHt9LFxuICAgICAgICAgICAgJ0B0eXBlJzoge31cbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVudHJ5ID0gZW50cnlbY29udGFpbmVyXTtcblxuICAgICAgICBpZihtYXBwaW5nLnJldmVyc2UpIHtcbiAgICAgICAgICAvLyB0ZXJtIGlzIHByZWZlcnJlZCBmb3IgdmFsdWVzIHVzaW5nIEByZXZlcnNlXG4gICAgICAgICAgX2FkZFByZWZlcnJlZFRlcm0obWFwcGluZywgdGVybSwgZW50cnlbJ0B0eXBlJ10sICdAcmV2ZXJzZScpO1xuICAgICAgICB9IGVsc2UgaWYoJ0B0eXBlJyBpbiBtYXBwaW5nKSB7XG4gICAgICAgICAgLy8gdGVybSBpcyBwcmVmZXJyZWQgZm9yIHZhbHVlcyB1c2luZyBzcGVjaWZpYyB0eXBlXG4gICAgICAgICAgX2FkZFByZWZlcnJlZFRlcm0obWFwcGluZywgdGVybSwgZW50cnlbJ0B0eXBlJ10sIG1hcHBpbmdbJ0B0eXBlJ10pO1xuICAgICAgICB9IGVsc2UgaWYoJ0BsYW5ndWFnZScgaW4gbWFwcGluZykge1xuICAgICAgICAgIC8vIHRlcm0gaXMgcHJlZmVycmVkIGZvciB2YWx1ZXMgdXNpbmcgc3BlY2lmaWMgbGFuZ3VhZ2VcbiAgICAgICAgICB2YXIgbGFuZ3VhZ2UgPSBtYXBwaW5nWydAbGFuZ3VhZ2UnXSB8fCAnQG51bGwnO1xuICAgICAgICAgIF9hZGRQcmVmZXJyZWRUZXJtKG1hcHBpbmcsIHRlcm0sIGVudHJ5WydAbGFuZ3VhZ2UnXSwgbGFuZ3VhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHRlcm0gaXMgcHJlZmVycmVkIGZvciB2YWx1ZXMgdy9kZWZhdWx0IGxhbmd1YWdlIG9yIG5vIHR5cGUgYW5kXG4gICAgICAgICAgLy8gbm8gbGFuZ3VhZ2VcbiAgICAgICAgICAvLyBhZGQgYW4gZW50cnkgZm9yIHRoZSBkZWZhdWx0IGxhbmd1YWdlXG4gICAgICAgICAgX2FkZFByZWZlcnJlZFRlcm0obWFwcGluZywgdGVybSwgZW50cnlbJ0BsYW5ndWFnZSddLCBkZWZhdWx0TGFuZ3VhZ2UpO1xuXG4gICAgICAgICAgLy8gYWRkIGVudHJpZXMgZm9yIG5vIHR5cGUgYW5kIG5vIGxhbmd1YWdlXG4gICAgICAgICAgX2FkZFByZWZlcnJlZFRlcm0obWFwcGluZywgdGVybSwgZW50cnlbJ0B0eXBlJ10sICdAbm9uZScpO1xuICAgICAgICAgIF9hZGRQcmVmZXJyZWRUZXJtKG1hcHBpbmcsIHRlcm0sIGVudHJ5WydAbGFuZ3VhZ2UnXSwgJ0Bub25lJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaW52ZXJzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSB0ZXJtIGZvciB0aGUgZ2l2ZW4gZW50cnkgaWYgbm90IGFscmVhZHkgYWRkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBtYXBwaW5nIHRoZSB0ZXJtIG1hcHBpbmcuXG4gICAqIEBwYXJhbSB0ZXJtIHRoZSB0ZXJtIHRvIGFkZC5cbiAgICogQHBhcmFtIGVudHJ5IHRoZSBpbnZlcnNlIGNvbnRleHQgdHlwZU9yTGFuZ3VhZ2UgZW50cnkgdG8gYWRkIHRvLlxuICAgKiBAcGFyYW0gdHlwZU9yTGFuZ3VhZ2VWYWx1ZSB0aGUga2V5IGluIHRoZSBlbnRyeSB0byBhZGQgdG8uXG4gICAqL1xuICBmdW5jdGlvbiBfYWRkUHJlZmVycmVkVGVybShtYXBwaW5nLCB0ZXJtLCBlbnRyeSwgdHlwZU9yTGFuZ3VhZ2VWYWx1ZSkge1xuICAgIGlmKCEodHlwZU9yTGFuZ3VhZ2VWYWx1ZSBpbiBlbnRyeSkpIHtcbiAgICAgIGVudHJ5W3R5cGVPckxhbmd1YWdlVmFsdWVdID0gdGVybTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2xvbmVzIGFuIGFjdGl2ZSBjb250ZXh0LCBjcmVhdGluZyBhIGNoaWxkIGFjdGl2ZSBjb250ZXh0LlxuICAgKlxuICAgKiBAcmV0dXJuIGEgY2xvbmUgKGNoaWxkKSBvZiB0aGUgYWN0aXZlIGNvbnRleHQuXG4gICAqL1xuICBmdW5jdGlvbiBfY2xvbmVBY3RpdmVDb250ZXh0KCkge1xuICAgIHZhciBjaGlsZCA9IHt9O1xuICAgIGNoaWxkWydAYmFzZSddID0gdGhpc1snQGJhc2UnXTtcbiAgICBjaGlsZC5tYXBwaW5ncyA9IF9jbG9uZSh0aGlzLm1hcHBpbmdzKTtcbiAgICBjaGlsZC5jbG9uZSA9IHRoaXMuY2xvbmU7XG4gICAgY2hpbGQuaW52ZXJzZSA9IG51bGw7XG4gICAgY2hpbGQuZ2V0SW52ZXJzZSA9IHRoaXMuZ2V0SW52ZXJzZTtcbiAgICBpZignQGxhbmd1YWdlJyBpbiB0aGlzKSB7XG4gICAgICBjaGlsZFsnQGxhbmd1YWdlJ10gPSB0aGlzWydAbGFuZ3VhZ2UnXTtcbiAgICB9XG4gICAgaWYoJ0B2b2NhYicgaW4gdGhpcykge1xuICAgICAgY2hpbGRbJ0B2b2NhYiddID0gdGhpc1snQHZvY2FiJ107XG4gICAgfVxuICAgIHJldHVybiBjaGlsZDtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIGdpdmVuIHZhbHVlIGlzIGEga2V5d29yZC5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIGtleXdvcmQsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzS2V5d29yZCh2KSB7XG4gIGlmKCFfaXNTdHJpbmcodikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgc3dpdGNoKHYpIHtcbiAgY2FzZSAnQGJhc2UnOlxuICBjYXNlICdAY29udGV4dCc6XG4gIGNhc2UgJ0Bjb250YWluZXInOlxuICBjYXNlICdAZGVmYXVsdCc6XG4gIGNhc2UgJ0BlbWJlZCc6XG4gIGNhc2UgJ0BleHBsaWNpdCc6XG4gIGNhc2UgJ0BncmFwaCc6XG4gIGNhc2UgJ0BpZCc6XG4gIGNhc2UgJ0BpbmRleCc6XG4gIGNhc2UgJ0BsYW5ndWFnZSc6XG4gIGNhc2UgJ0BsaXN0JzpcbiAgY2FzZSAnQG9taXREZWZhdWx0JzpcbiAgY2FzZSAnQHByZXNlcnZlJzpcbiAgY2FzZSAnQHJlcXVpcmVBbGwnOlxuICBjYXNlICdAcmV2ZXJzZSc6XG4gIGNhc2UgJ0BzZXQnOlxuICBjYXNlICdAdHlwZSc6XG4gIGNhc2UgJ0B2YWx1ZSc6XG4gIGNhc2UgJ0B2b2NhYic6XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYW4gT2JqZWN0LlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGFuIE9iamVjdCwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNPYmplY3Qodikge1xuICByZXR1cm4gKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2KSA9PT0gJ1tvYmplY3QgT2JqZWN0XScpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYW4gZW1wdHkgT2JqZWN0LlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGFuIGVtcHR5IE9iamVjdCwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNFbXB0eU9iamVjdCh2KSB7XG4gIHJldHVybiBfaXNPYmplY3QodikgJiYgT2JqZWN0LmtleXModikubGVuZ3RoID09PSAwO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYW4gQXJyYXkuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYW4gQXJyYXksIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzQXJyYXkodikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh2KTtcbn1cblxuLyoqXG4gKiBUaHJvd3MgYW4gZXhjZXB0aW9uIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBub3QgYSB2YWxpZCBAdHlwZSB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKi9cbmZ1bmN0aW9uIF92YWxpZGF0ZVR5cGVWYWx1ZSh2KSB7XG4gIC8vIGNhbiBiZSBhIHN0cmluZyBvciBhbiBlbXB0eSBvYmplY3RcbiAgaWYoX2lzU3RyaW5nKHYpIHx8IF9pc0VtcHR5T2JqZWN0KHYpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBhcnJheVxuICB2YXIgaXNWYWxpZCA9IGZhbHNlO1xuICBpZihfaXNBcnJheSh2KSkge1xuICAgIC8vIG11c3QgY29udGFpbiBvbmx5IHN0cmluZ3NcbiAgICBpc1ZhbGlkID0gdHJ1ZTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdi5sZW5ndGg7ICsraSkge1xuICAgICAgaWYoIShfaXNTdHJpbmcodltpXSkpKSB7XG4gICAgICAgIGlzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYoIWlzVmFsaWQpIHtcbiAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAnSW52YWxpZCBKU09OLUxEIHN5bnRheDsgXCJAdHlwZVwiIHZhbHVlIG11c3QgYSBzdHJpbmcsIGFuIGFycmF5IG9mICcgK1xuICAgICAgJ3N0cmluZ3MsIG9yIGFuIGVtcHR5IG9iamVjdC4nLCAnanNvbmxkLlN5bnRheEVycm9yJyxcbiAgICAgIHtjb2RlOiAnaW52YWxpZCB0eXBlIHZhbHVlJywgdmFsdWU6IHZ9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSBTdHJpbmcuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSBTdHJpbmcsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzU3RyaW5nKHYpIHtcbiAgcmV0dXJuICh0eXBlb2YgdiA9PT0gJ3N0cmluZycgfHxcbiAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodikgPT09ICdbb2JqZWN0IFN0cmluZ10nKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIGEgTnVtYmVyLlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgTnVtYmVyLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc051bWJlcih2KSB7XG4gIHJldHVybiAodHlwZW9mIHYgPT09ICdudW1iZXInIHx8XG4gICAgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHYpID09PSAnW29iamVjdCBOdW1iZXJdJyk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBhIGRvdWJsZS5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIGRvdWJsZSwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNEb3VibGUodikge1xuICByZXR1cm4gX2lzTnVtYmVyKHYpICYmIFN0cmluZyh2KS5pbmRleE9mKCcuJykgIT09IC0xO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgbnVtZXJpYy5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBudW1lcmljLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc051bWVyaWModikge1xuICByZXR1cm4gIWlzTmFOKHBhcnNlRmxvYXQodikpICYmIGlzRmluaXRlKHYpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSBCb29sZWFuLlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgQm9vbGVhbiwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNCb29sZWFuKHYpIHtcbiAgcmV0dXJuICh0eXBlb2YgdiA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHYpID09PSAnW29iamVjdCBCb29sZWFuXScpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgdW5kZWZpbmVkLlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIHVuZGVmaW5lZCwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNVbmRlZmluZWQodikge1xuICByZXR1cm4gKHR5cGVvZiB2ID09PSAndW5kZWZpbmVkJyk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBhIHN1YmplY3Qgd2l0aCBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgc3ViamVjdCB3aXRoIHByb3BlcnRpZXMsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzU3ViamVjdCh2KSB7XG4gIC8vIE5vdGU6IEEgdmFsdWUgaXMgYSBzdWJqZWN0IGlmIGFsbCBvZiB0aGVzZSBob2xkIHRydWU6XG4gIC8vIDEuIEl0IGlzIGFuIE9iamVjdC5cbiAgLy8gMi4gSXQgaXMgbm90IGEgQHZhbHVlLCBAc2V0LCBvciBAbGlzdC5cbiAgLy8gMy4gSXQgaGFzIG1vcmUgdGhhbiAxIGtleSBPUiBhbnkgZXhpc3Rpbmcga2V5IGlzIG5vdCBAaWQuXG4gIHZhciBydmFsID0gZmFsc2U7XG4gIGlmKF9pc09iamVjdCh2KSAmJlxuICAgICEoKCdAdmFsdWUnIGluIHYpIHx8ICgnQHNldCcgaW4gdikgfHwgKCdAbGlzdCcgaW4gdikpKSB7XG4gICAgdmFyIGtleUNvdW50ID0gT2JqZWN0LmtleXModikubGVuZ3RoO1xuICAgIHJ2YWwgPSAoa2V5Q291bnQgPiAxIHx8ICEoJ0BpZCcgaW4gdikpO1xuICB9XG4gIHJldHVybiBydmFsO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSBzdWJqZWN0IHJlZmVyZW5jZS5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHN1YmplY3QgcmVmZXJlbmNlLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc1N1YmplY3RSZWZlcmVuY2Uodikge1xuICAvLyBOb3RlOiBBIHZhbHVlIGlzIGEgc3ViamVjdCByZWZlcmVuY2UgaWYgYWxsIG9mIHRoZXNlIGhvbGQgdHJ1ZTpcbiAgLy8gMS4gSXQgaXMgYW4gT2JqZWN0LlxuICAvLyAyLiBJdCBoYXMgYSBzaW5nbGUga2V5OiBAaWQuXG4gIHJldHVybiAoX2lzT2JqZWN0KHYpICYmIE9iamVjdC5rZXlzKHYpLmxlbmd0aCA9PT0gMSAmJiAoJ0BpZCcgaW4gdikpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSBAdmFsdWUuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSBAdmFsdWUsIGZhbHNlIGlmIG5vdC5cbiAqL1xuZnVuY3Rpb24gX2lzVmFsdWUodikge1xuICAvLyBOb3RlOiBBIHZhbHVlIGlzIGEgQHZhbHVlIGlmIGFsbCBvZiB0aGVzZSBob2xkIHRydWU6XG4gIC8vIDEuIEl0IGlzIGFuIE9iamVjdC5cbiAgLy8gMi4gSXQgaGFzIHRoZSBAdmFsdWUgcHJvcGVydHkuXG4gIHJldHVybiBfaXNPYmplY3QodikgJiYgKCdAdmFsdWUnIGluIHYpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSBAbGlzdC5cbiAqXG4gKiBAcGFyYW0gdiB0aGUgdmFsdWUgdG8gY2hlY2suXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBhIEBsaXN0LCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc0xpc3Qodikge1xuICAvLyBOb3RlOiBBIHZhbHVlIGlzIGEgQGxpc3QgaWYgYWxsIG9mIHRoZXNlIGhvbGQgdHJ1ZTpcbiAgLy8gMS4gSXQgaXMgYW4gT2JqZWN0LlxuICAvLyAyLiBJdCBoYXMgdGhlIEBsaXN0IHByb3BlcnR5LlxuICByZXR1cm4gX2lzT2JqZWN0KHYpICYmICgnQGxpc3QnIGluIHYpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSBibGFuayBub2RlLlxuICpcbiAqIEBwYXJhbSB2IHRoZSB2YWx1ZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgYmxhbmsgbm9kZSwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfaXNCbGFua05vZGUodikge1xuICAvLyBOb3RlOiBBIHZhbHVlIGlzIGEgYmxhbmsgbm9kZSBpZiBhbGwgb2YgdGhlc2UgaG9sZCB0cnVlOlxuICAvLyAxLiBJdCBpcyBhbiBPYmplY3QuXG4gIC8vIDIuIElmIGl0IGhhcyBhbiBAaWQga2V5IGl0cyB2YWx1ZSBiZWdpbnMgd2l0aCAnXzonLlxuICAvLyAzLiBJdCBoYXMgbm8ga2V5cyBPUiBpcyBub3QgYSBAdmFsdWUsIEBzZXQsIG9yIEBsaXN0LlxuICB2YXIgcnZhbCA9IGZhbHNlO1xuICBpZihfaXNPYmplY3QodikpIHtcbiAgICBpZignQGlkJyBpbiB2KSB7XG4gICAgICBydmFsID0gKHZbJ0BpZCddLmluZGV4T2YoJ186JykgPT09IDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBydmFsID0gKE9iamVjdC5rZXlzKHYpLmxlbmd0aCA9PT0gMCB8fFxuICAgICAgICAhKCgnQHZhbHVlJyBpbiB2KSB8fCAoJ0BzZXQnIGluIHYpIHx8ICgnQGxpc3QnIGluIHYpKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBydmFsO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgYW4gYWJzb2x1dGUgSVJJLCBmYWxzZSBpZiBub3QuXG4gKlxuICogQHBhcmFtIHYgdGhlIHZhbHVlIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYW4gYWJzb2x1dGUgSVJJLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9pc0Fic29sdXRlSXJpKHYpIHtcbiAgcmV0dXJuIF9pc1N0cmluZyh2KSAmJiB2LmluZGV4T2YoJzonKSAhPT0gLTE7XG59XG5cbi8qKlxuICogQ2xvbmVzIGFuIG9iamVjdCwgYXJyYXksIG9yIHN0cmluZy9udW1iZXIuIElmIGEgdHlwZWQgSmF2YVNjcmlwdCBvYmplY3RcbiAqIGlzIGdpdmVuLCBzdWNoIGFzIGEgRGF0ZSwgaXQgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gYSBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBjbG9uZS5cbiAqXG4gKiBAcmV0dXJuIHRoZSBjbG9uZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIF9jbG9uZSh2YWx1ZSkge1xuICBpZih2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgdmFyIHJ2YWw7XG4gICAgaWYoX2lzQXJyYXkodmFsdWUpKSB7XG4gICAgICBydmFsID0gW107XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgcnZhbFtpXSA9IF9jbG9uZSh2YWx1ZVtpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmKF9pc09iamVjdCh2YWx1ZSkpIHtcbiAgICAgIHJ2YWwgPSB7fTtcbiAgICAgIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgIHJ2YWxba2V5XSA9IF9jbG9uZSh2YWx1ZVtrZXldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcnZhbCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiBydmFsO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBGaW5kcyBhbGwgQGNvbnRleHQgVVJMcyBpbiB0aGUgZ2l2ZW4gSlNPTi1MRCBpbnB1dC5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgdGhlIEpTT04tTEQgaW5wdXQuXG4gKiBAcGFyYW0gdXJscyBhIG1hcCBvZiBVUkxzICh1cmwgPT4gZmFsc2UvQGNvbnRleHRzKS5cbiAqIEBwYXJhbSByZXBsYWNlIHRydWUgdG8gcmVwbGFjZSB0aGUgVVJMcyBpbiB0aGUgZ2l2ZW4gaW5wdXQgd2l0aCB0aGVcbiAqICAgICAgICAgICBAY29udGV4dHMgZnJvbSB0aGUgdXJscyBtYXAsIGZhbHNlIG5vdCB0by5cbiAqIEBwYXJhbSBiYXNlIHRoZSBiYXNlIElSSSB0byB1c2UgdG8gcmVzb2x2ZSByZWxhdGl2ZSBJUklzLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiBuZXcgVVJMcyB0byByZXRyaWV2ZSB3ZXJlIGZvdW5kLCBmYWxzZSBpZiBub3QuXG4gKi9cbmZ1bmN0aW9uIF9maW5kQ29udGV4dFVybHMoaW5wdXQsIHVybHMsIHJlcGxhY2UsIGJhc2UpIHtcbiAgdmFyIGNvdW50ID0gT2JqZWN0LmtleXModXJscykubGVuZ3RoO1xuICBpZihfaXNBcnJheShpbnB1dCkpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyArK2kpIHtcbiAgICAgIF9maW5kQ29udGV4dFVybHMoaW5wdXRbaV0sIHVybHMsIHJlcGxhY2UsIGJhc2UpO1xuICAgIH1cbiAgICByZXR1cm4gKGNvdW50IDwgT2JqZWN0LmtleXModXJscykubGVuZ3RoKTtcbiAgfSBlbHNlIGlmKF9pc09iamVjdChpbnB1dCkpIHtcbiAgICBmb3IodmFyIGtleSBpbiBpbnB1dCkge1xuICAgICAgaWYoa2V5ICE9PSAnQGNvbnRleHQnKSB7XG4gICAgICAgIF9maW5kQ29udGV4dFVybHMoaW5wdXRba2V5XSwgdXJscywgcmVwbGFjZSwgYmFzZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBnZXQgQGNvbnRleHRcbiAgICAgIHZhciBjdHggPSBpbnB1dFtrZXldO1xuXG4gICAgICAvLyBhcnJheSBAY29udGV4dFxuICAgICAgaWYoX2lzQXJyYXkoY3R4KSkge1xuICAgICAgICB2YXIgbGVuZ3RoID0gY3R4Lmxlbmd0aDtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgdmFyIF9jdHggPSBjdHhbaV07XG4gICAgICAgICAgaWYoX2lzU3RyaW5nKF9jdHgpKSB7XG4gICAgICAgICAgICBfY3R4ID0gX3ByZXBlbmRCYXNlKGJhc2UsIF9jdHgpO1xuICAgICAgICAgICAgLy8gcmVwbGFjZSB3L0Bjb250ZXh0IGlmIHJlcXVlc3RlZFxuICAgICAgICAgICAgaWYocmVwbGFjZSkge1xuICAgICAgICAgICAgICBfY3R4ID0gdXJsc1tfY3R4XTtcbiAgICAgICAgICAgICAgaWYoX2lzQXJyYXkoX2N0eCkpIHtcbiAgICAgICAgICAgICAgICAvLyBhZGQgZmxhdHRlbmVkIGNvbnRleHRcbiAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KGN0eCwgW2ksIDFdLmNvbmNhdChfY3R4KSk7XG4gICAgICAgICAgICAgICAgaSArPSBfY3R4Lmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgbGVuZ3RoID0gY3R4Lmxlbmd0aDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdHhbaV0gPSBfY3R4O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYoIShfY3R4IGluIHVybHMpKSB7XG4gICAgICAgICAgICAgIC8vIEBjb250ZXh0IFVSTCBmb3VuZFxuICAgICAgICAgICAgICB1cmxzW19jdHhdID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYoX2lzU3RyaW5nKGN0eCkpIHtcbiAgICAgICAgLy8gc3RyaW5nIEBjb250ZXh0XG4gICAgICAgIGN0eCA9IF9wcmVwZW5kQmFzZShiYXNlLCBjdHgpO1xuICAgICAgICAvLyByZXBsYWNlIHcvQGNvbnRleHQgaWYgcmVxdWVzdGVkXG4gICAgICAgIGlmKHJlcGxhY2UpIHtcbiAgICAgICAgICBpbnB1dFtrZXldID0gdXJsc1tjdHhdO1xuICAgICAgICB9IGVsc2UgaWYoIShjdHggaW4gdXJscykpIHtcbiAgICAgICAgICAvLyBAY29udGV4dCBVUkwgZm91bmRcbiAgICAgICAgICB1cmxzW2N0eF0gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gKGNvdW50IDwgT2JqZWN0LmtleXModXJscykubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogUmV0cmlldmVzIGV4dGVybmFsIEBjb250ZXh0IFVSTHMgdXNpbmcgdGhlIGdpdmVuIGRvY3VtZW50IGxvYWRlci4gRXZlcnlcbiAqIGluc3RhbmNlIG9mIEBjb250ZXh0IGluIHRoZSBpbnB1dCB0aGF0IHJlZmVycyB0byBhIFVSTCB3aWxsIGJlIHJlcGxhY2VkXG4gKiB3aXRoIHRoZSBKU09OIEBjb250ZXh0IGZvdW5kIGF0IHRoYXQgVVJMLlxuICpcbiAqIEBwYXJhbSBpbnB1dCB0aGUgSlNPTi1MRCBpbnB1dCB3aXRoIHBvc3NpYmxlIGNvbnRleHRzLlxuICogQHBhcmFtIG9wdGlvbnMgdGhlIG9wdGlvbnMgdG8gdXNlOlxuICogICAgICAgICAgZG9jdW1lbnRMb2FkZXIodXJsLCBjYWxsYmFjayhlcnIsIHJlbW90ZURvYykpIHRoZSBkb2N1bWVudCBsb2FkZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2soZXJyLCBpbnB1dCkgY2FsbGVkIG9uY2UgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gKi9cbmZ1bmN0aW9uIF9yZXRyaWV2ZUNvbnRleHRVcmxzKGlucHV0LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAvLyBpZiBhbnkgZXJyb3Igb2NjdXJzIGR1cmluZyBVUkwgcmVzb2x1dGlvbiwgcXVpdFxuICB2YXIgZXJyb3IgPSBudWxsO1xuXG4gIC8vIHJlY3Vyc2l2ZSBkb2N1bWVudCBsb2FkZXJcbiAgdmFyIGRvY3VtZW50TG9hZGVyID0gb3B0aW9ucy5kb2N1bWVudExvYWRlcjtcbiAgdmFyIHJldHJpZXZlID0gZnVuY3Rpb24oaW5wdXQsIGN5Y2xlcywgZG9jdW1lbnRMb2FkZXIsIGJhc2UsIGNhbGxiYWNrKSB7XG4gICAgaWYoT2JqZWN0LmtleXMoY3ljbGVzKS5sZW5ndGggPiBNQVhfQ09OVEVYVF9VUkxTKSB7XG4gICAgICBlcnJvciA9IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgJ01heGltdW0gbnVtYmVyIG9mIEBjb250ZXh0IFVSTHMgZXhjZWVkZWQuJyxcbiAgICAgICAgJ2pzb25sZC5Db250ZXh0VXJsRXJyb3InLFxuICAgICAgICB7Y29kZTogJ2xvYWRpbmcgcmVtb3RlIGNvbnRleHQgZmFpbGVkJywgbWF4OiBNQVhfQ09OVEVYVF9VUkxTfSk7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIGZvciB0cmFja2luZyB0aGUgVVJMcyB0byByZXRyaWV2ZVxuICAgIHZhciB1cmxzID0ge307XG5cbiAgICAvLyBmaW5pc2hlZCB3aWxsIGJlIGNhbGxlZCBvbmNlIHRoZSBVUkwgcXVldWUgaXMgZW1wdHlcbiAgICB2YXIgZmluaXNoZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIHJlcGxhY2UgYWxsIFVSTHMgaW4gdGhlIGlucHV0XG4gICAgICBfZmluZENvbnRleHRVcmxzKGlucHV0LCB1cmxzLCB0cnVlLCBiYXNlKTtcbiAgICAgIGNhbGxiYWNrKG51bGwsIGlucHV0KTtcbiAgICB9O1xuXG4gICAgLy8gZmluZCBhbGwgVVJMcyBpbiB0aGUgZ2l2ZW4gaW5wdXRcbiAgICBpZighX2ZpbmRDb250ZXh0VXJscyhpbnB1dCwgdXJscywgZmFsc2UsIGJhc2UpKSB7XG4gICAgICAvLyBubyBuZXcgVVJMcyBpbiBpbnB1dFxuICAgICAgZmluaXNoZWQoKTtcbiAgICB9XG5cbiAgICAvLyBxdWV1ZSBhbGwgdW5yZXRyaWV2ZWQgVVJMc1xuICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgIGZvcih2YXIgdXJsIGluIHVybHMpIHtcbiAgICAgIGlmKHVybHNbdXJsXSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcXVldWUucHVzaCh1cmwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJldHJpZXZlIFVSTHMgaW4gcXVldWVcbiAgICB2YXIgY291bnQgPSBxdWV1ZS5sZW5ndGg7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgKytpKSB7XG4gICAgICAoZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIC8vIGNoZWNrIGZvciBjb250ZXh0IFVSTCBjeWNsZVxuICAgICAgICBpZih1cmwgaW4gY3ljbGVzKSB7XG4gICAgICAgICAgZXJyb3IgPSBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAnQ3ljbGljYWwgQGNvbnRleHQgVVJMcyBkZXRlY3RlZC4nLFxuICAgICAgICAgICAgJ2pzb25sZC5Db250ZXh0VXJsRXJyb3InLFxuICAgICAgICAgICAge2NvZGU6ICdyZWN1cnNpdmUgY29udGV4dCBpbmNsdXNpb24nLCB1cmw6IHVybH0pO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9jeWNsZXMgPSBfY2xvbmUoY3ljbGVzKTtcbiAgICAgICAgX2N5Y2xlc1t1cmxdID0gdHJ1ZTtcbiAgICAgICAgdmFyIGRvbmUgPSBmdW5jdGlvbihlcnIsIHJlbW90ZURvYykge1xuICAgICAgICAgIC8vIHNob3J0LWNpcmN1aXQgaWYgdGhlcmUgd2FzIGFuIGVycm9yIHdpdGggYW5vdGhlciBVUkxcbiAgICAgICAgICBpZihlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBjdHggPSByZW1vdGVEb2MgPyByZW1vdGVEb2MuZG9jdW1lbnQgOiBudWxsO1xuXG4gICAgICAgICAgLy8gcGFyc2Ugc3RyaW5nIGNvbnRleHQgYXMgSlNPTlxuICAgICAgICAgIGlmKCFlcnIgJiYgX2lzU3RyaW5nKGN0eCkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGN0eCA9IEpTT04ucGFyc2UoY3R4KTtcbiAgICAgICAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgICAgICAgZXJyID0gZXg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gZW5zdXJlIGN0eCBpcyBhbiBvYmplY3RcbiAgICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgIGVyciA9IG5ldyBKc29uTGRFcnJvcihcbiAgICAgICAgICAgICAgJ0RlcmVmZXJlbmNpbmcgYSBVUkwgZGlkIG5vdCByZXN1bHQgaW4gYSB2YWxpZCBKU09OLUxEIG9iamVjdC4gJyArXG4gICAgICAgICAgICAgICdQb3NzaWJsZSBjYXVzZXMgYXJlIGFuIGluYWNjZXNzaWJsZSBVUkwgcGVyaGFwcyBkdWUgdG8gJyArXG4gICAgICAgICAgICAgICdhIHNhbWUtb3JpZ2luIHBvbGljeSAoZW5zdXJlIHRoZSBzZXJ2ZXIgdXNlcyBDT1JTIGlmIHlvdSBhcmUgJyArXG4gICAgICAgICAgICAgICd1c2luZyBjbGllbnQtc2lkZSBKYXZhU2NyaXB0KSwgdG9vIG1hbnkgcmVkaXJlY3RzLCBhICcgK1xuICAgICAgICAgICAgICAnbm9uLUpTT04gcmVzcG9uc2UsIG9yIG1vcmUgdGhhbiBvbmUgSFRUUCBMaW5rIEhlYWRlciB3YXMgJyArXG4gICAgICAgICAgICAgICdwcm92aWRlZCBmb3IgYSByZW1vdGUgY29udGV4dC4nLFxuICAgICAgICAgICAgICAnanNvbmxkLkludmFsaWRVcmwnLFxuICAgICAgICAgICAgICB7Y29kZTogJ2xvYWRpbmcgcmVtb3RlIGNvbnRleHQgZmFpbGVkJywgdXJsOiB1cmwsIGNhdXNlOiBlcnJ9KTtcbiAgICAgICAgICB9IGVsc2UgaWYoIV9pc09iamVjdChjdHgpKSB7XG4gICAgICAgICAgICBlcnIgPSBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgICAgICdEZXJlZmVyZW5jaW5nIGEgVVJMIGRpZCBub3QgcmVzdWx0IGluIGEgSlNPTiBvYmplY3QuIFRoZSAnICtcbiAgICAgICAgICAgICAgJ3Jlc3BvbnNlIHdhcyB2YWxpZCBKU09OLCBidXQgaXQgd2FzIG5vdCBhIEpTT04gb2JqZWN0LicsXG4gICAgICAgICAgICAgICdqc29ubGQuSW52YWxpZFVybCcsXG4gICAgICAgICAgICAgIHtjb2RlOiAnaW52YWxpZCByZW1vdGUgY29udGV4dCcsIHVybDogdXJsLCBjYXVzZTogZXJyfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHVzZSBlbXB0eSBjb250ZXh0IGlmIG5vIEBjb250ZXh0IGtleSBpcyBwcmVzZW50XG4gICAgICAgICAgaWYoISgnQGNvbnRleHQnIGluIGN0eCkpIHtcbiAgICAgICAgICAgIGN0eCA9IHsnQGNvbnRleHQnOiB7fX07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGN0eCA9IHsnQGNvbnRleHQnOiBjdHhbJ0Bjb250ZXh0J119O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGFwcGVuZCBjb250ZXh0IFVSTCB0byBjb250ZXh0IGlmIGdpdmVuXG4gICAgICAgICAgaWYocmVtb3RlRG9jLmNvbnRleHRVcmwpIHtcbiAgICAgICAgICAgIGlmKCFfaXNBcnJheShjdHhbJ0Bjb250ZXh0J10pKSB7XG4gICAgICAgICAgICAgIGN0eFsnQGNvbnRleHQnXSA9IFtjdHhbJ0Bjb250ZXh0J11dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3R4WydAY29udGV4dCddLnB1c2gocmVtb3RlRG9jLmNvbnRleHRVcmwpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHJlY3Vyc2VcbiAgICAgICAgICByZXRyaWV2ZShjdHgsIF9jeWNsZXMsIGRvY3VtZW50TG9hZGVyLCB1cmwsIGZ1bmN0aW9uKGVyciwgY3R4KSB7XG4gICAgICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB1cmxzW3VybF0gPSBjdHhbJ0Bjb250ZXh0J107XG4gICAgICAgICAgICBjb3VudCAtPSAxO1xuICAgICAgICAgICAgaWYoY291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgZmluaXNoZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHByb21pc2UgPSBkb2N1bWVudExvYWRlcih1cmwsIGRvbmUpO1xuICAgICAgICBpZihwcm9taXNlICYmICd0aGVuJyBpbiBwcm9taXNlKSB7XG4gICAgICAgICAgcHJvbWlzZS50aGVuKGRvbmUuYmluZChudWxsLCBudWxsKSwgZG9uZSk7XG4gICAgICAgIH1cbiAgICAgIH0ocXVldWVbaV0pKTtcbiAgICB9XG4gIH07XG4gIHJldHJpZXZlKGlucHV0LCB7fSwgZG9jdW1lbnRMb2FkZXIsIG9wdGlvbnMuYmFzZSwgY2FsbGJhY2spO1xufVxuXG4vLyBkZWZpbmUganMgMS44LjUgT2JqZWN0LmtleXMgbWV0aG9kIGlmIG5vdCBwcmVzZW50XG5pZighT2JqZWN0LmtleXMpIHtcbiAgT2JqZWN0LmtleXMgPSBmdW5jdGlvbihvKSB7XG4gICAgaWYobyAhPT0gT2JqZWN0KG8pKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3Qua2V5cyBjYWxsZWQgb24gbm9uLW9iamVjdCcpO1xuICAgIH1cbiAgICB2YXIgcnZhbCA9IFtdO1xuICAgIGZvcih2YXIgcCBpbiBvKSB7XG4gICAgICBpZihPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIHtcbiAgICAgICAgcnZhbC5wdXNoKHApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcnZhbDtcbiAgfTtcbn1cblxuLyoqXG4gKiBQYXJzZXMgUkRGIGluIHRoZSBmb3JtIG9mIE4tUXVhZHMuXG4gKlxuICogQHBhcmFtIGlucHV0IHRoZSBOLVF1YWRzIGlucHV0IHRvIHBhcnNlLlxuICpcbiAqIEByZXR1cm4gYW4gUkRGIGRhdGFzZXQuXG4gKi9cbmZ1bmN0aW9uIF9wYXJzZU5RdWFkcyhpbnB1dCkge1xuICAvLyBkZWZpbmUgcGFydGlhbCByZWdleGVzXG4gIHZhciBpcmkgPSAnKD86PChbXjpdKzpbXj5dKik+KSc7XG4gIHZhciBibm9kZSA9ICcoXzooPzpbQS1aYS16MC05XSspKSc7XG4gIHZhciBwbGFpbiA9ICdcIihbXlwiXFxcXFxcXFxdKig/OlxcXFxcXFxcLlteXCJcXFxcXFxcXF0qKSopXCInO1xuICB2YXIgZGF0YXR5cGUgPSAnKD86XFxcXF5cXFxcXicgKyBpcmkgKyAnKSc7XG4gIHZhciBsYW5ndWFnZSA9ICcoPzpAKFthLXpdKyg/Oi1bYS16MC05XSspKikpJztcbiAgdmFyIGxpdGVyYWwgPSAnKD86JyArIHBsYWluICsgJyg/OicgKyBkYXRhdHlwZSArICd8JyArIGxhbmd1YWdlICsgJyk/KSc7XG4gIHZhciB3cyA9ICdbIFxcXFx0XSsnO1xuICB2YXIgd3NvID0gJ1sgXFxcXHRdKic7XG4gIHZhciBlb2xuID0gLyg/Olxcclxcbil8KD86XFxuKXwoPzpcXHIpL2c7XG4gIHZhciBlbXB0eSA9IG5ldyBSZWdFeHAoJ14nICsgd3NvICsgJyQnKTtcblxuICAvLyBkZWZpbmUgcXVhZCBwYXJ0IHJlZ2V4ZXNcbiAgdmFyIHN1YmplY3QgPSAnKD86JyArIGlyaSArICd8JyArIGJub2RlICsgJyknICsgd3M7XG4gIHZhciBwcm9wZXJ0eSA9IGlyaSArIHdzO1xuICB2YXIgb2JqZWN0ID0gJyg/OicgKyBpcmkgKyAnfCcgKyBibm9kZSArICd8JyArIGxpdGVyYWwgKyAnKScgKyB3c287XG4gIHZhciBncmFwaE5hbWUgPSAnKD86XFxcXC58KD86KD86JyArIGlyaSArICd8JyArIGJub2RlICsgJyknICsgd3NvICsgJ1xcXFwuKSknO1xuXG4gIC8vIGZ1bGwgcXVhZCByZWdleFxuICB2YXIgcXVhZCA9IG5ldyBSZWdFeHAoXG4gICAgJ14nICsgd3NvICsgc3ViamVjdCArIHByb3BlcnR5ICsgb2JqZWN0ICsgZ3JhcGhOYW1lICsgd3NvICsgJyQnKTtcblxuICAvLyBidWlsZCBSREYgZGF0YXNldFxuICB2YXIgZGF0YXNldCA9IHt9O1xuXG4gIC8vIHNwbGl0IE4tUXVhZCBpbnB1dCBpbnRvIGxpbmVzXG4gIHZhciBsaW5lcyA9IGlucHV0LnNwbGl0KGVvbG4pO1xuICB2YXIgbGluZU51bWJlciA9IDA7XG4gIGZvcih2YXIgbGkgPSAwOyBsaSA8IGxpbmVzLmxlbmd0aDsgKytsaSkge1xuICAgIHZhciBsaW5lID0gbGluZXNbbGldO1xuICAgIGxpbmVOdW1iZXIrKztcblxuICAgIC8vIHNraXAgZW1wdHkgbGluZXNcbiAgICBpZihlbXB0eS50ZXN0KGxpbmUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBwYXJzZSBxdWFkXG4gICAgdmFyIG1hdGNoID0gbGluZS5tYXRjaChxdWFkKTtcbiAgICBpZihtYXRjaCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEpzb25MZEVycm9yKFxuICAgICAgICAnRXJyb3Igd2hpbGUgcGFyc2luZyBOLVF1YWRzOyBpbnZhbGlkIHF1YWQuJyxcbiAgICAgICAgJ2pzb25sZC5QYXJzZUVycm9yJywge2xpbmU6IGxpbmVOdW1iZXJ9KTtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgUkRGIHRyaXBsZVxuICAgIHZhciB0cmlwbGUgPSB7fTtcblxuICAgIC8vIGdldCBzdWJqZWN0XG4gICAgaWYoIV9pc1VuZGVmaW5lZChtYXRjaFsxXSkpIHtcbiAgICAgIHRyaXBsZS5zdWJqZWN0ID0ge3R5cGU6ICdJUkknLCB2YWx1ZTogbWF0Y2hbMV19O1xuICAgIH0gZWxzZSB7XG4gICAgICB0cmlwbGUuc3ViamVjdCA9IHt0eXBlOiAnYmxhbmsgbm9kZScsIHZhbHVlOiBtYXRjaFsyXX07XG4gICAgfVxuXG4gICAgLy8gZ2V0IHByZWRpY2F0ZVxuICAgIHRyaXBsZS5wcmVkaWNhdGUgPSB7dHlwZTogJ0lSSScsIHZhbHVlOiBtYXRjaFszXX07XG5cbiAgICAvLyBnZXQgb2JqZWN0XG4gICAgaWYoIV9pc1VuZGVmaW5lZChtYXRjaFs0XSkpIHtcbiAgICAgIHRyaXBsZS5vYmplY3QgPSB7dHlwZTogJ0lSSScsIHZhbHVlOiBtYXRjaFs0XX07XG4gICAgfSBlbHNlIGlmKCFfaXNVbmRlZmluZWQobWF0Y2hbNV0pKSB7XG4gICAgICB0cmlwbGUub2JqZWN0ID0ge3R5cGU6ICdibGFuayBub2RlJywgdmFsdWU6IG1hdGNoWzVdfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHJpcGxlLm9iamVjdCA9IHt0eXBlOiAnbGl0ZXJhbCd9O1xuICAgICAgaWYoIV9pc1VuZGVmaW5lZChtYXRjaFs3XSkpIHtcbiAgICAgICAgdHJpcGxlLm9iamVjdC5kYXRhdHlwZSA9IG1hdGNoWzddO1xuICAgICAgfSBlbHNlIGlmKCFfaXNVbmRlZmluZWQobWF0Y2hbOF0pKSB7XG4gICAgICAgIHRyaXBsZS5vYmplY3QuZGF0YXR5cGUgPSBSREZfTEFOR1NUUklORztcbiAgICAgICAgdHJpcGxlLm9iamVjdC5sYW5ndWFnZSA9IG1hdGNoWzhdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJpcGxlLm9iamVjdC5kYXRhdHlwZSA9IFhTRF9TVFJJTkc7XG4gICAgICB9XG4gICAgICB2YXIgdW5lc2NhcGVkID0gbWF0Y2hbNl1cbiAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAucmVwbGFjZSgvXFxcXHQvZywgJ1xcdCcpXG4gICAgICAgIC5yZXBsYWNlKC9cXFxcbi9nLCAnXFxuJylcbiAgICAgICAgLnJlcGxhY2UoL1xcXFxyL2csICdcXHInKVxuICAgICAgICAucmVwbGFjZSgvXFxcXFxcXFwvZywgJ1xcXFwnKTtcbiAgICAgIHRyaXBsZS5vYmplY3QudmFsdWUgPSB1bmVzY2FwZWQ7XG4gICAgfVxuXG4gICAgLy8gZ2V0IGdyYXBoIG5hbWUgKCdAZGVmYXVsdCcgaXMgdXNlZCBmb3IgdGhlIGRlZmF1bHQgZ3JhcGgpXG4gICAgdmFyIG5hbWUgPSAnQGRlZmF1bHQnO1xuICAgIGlmKCFfaXNVbmRlZmluZWQobWF0Y2hbOV0pKSB7XG4gICAgICBuYW1lID0gbWF0Y2hbOV07XG4gICAgfSBlbHNlIGlmKCFfaXNVbmRlZmluZWQobWF0Y2hbMTBdKSkge1xuICAgICAgbmFtZSA9IG1hdGNoWzEwXTtcbiAgICB9XG5cbiAgICAvLyBpbml0aWFsaXplIGdyYXBoIGluIGRhdGFzZXRcbiAgICBpZighKG5hbWUgaW4gZGF0YXNldCkpIHtcbiAgICAgIGRhdGFzZXRbbmFtZV0gPSBbdHJpcGxlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYWRkIHRyaXBsZSBpZiB1bmlxdWUgdG8gaXRzIGdyYXBoXG4gICAgICB2YXIgdW5pcXVlID0gdHJ1ZTtcbiAgICAgIHZhciB0cmlwbGVzID0gZGF0YXNldFtuYW1lXTtcbiAgICAgIGZvcih2YXIgdGkgPSAwOyB1bmlxdWUgJiYgdGkgPCB0cmlwbGVzLmxlbmd0aDsgKyt0aSkge1xuICAgICAgICBpZihfY29tcGFyZVJERlRyaXBsZXModHJpcGxlc1t0aV0sIHRyaXBsZSkpIHtcbiAgICAgICAgICB1bmlxdWUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYodW5pcXVlKSB7XG4gICAgICAgIHRyaXBsZXMucHVzaCh0cmlwbGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkYXRhc2V0O1xufVxuXG4vLyByZWdpc3RlciB0aGUgTi1RdWFkcyBSREYgcGFyc2VyXG5qc29ubGQucmVnaXN0ZXJSREZQYXJzZXIoJ2FwcGxpY2F0aW9uL25xdWFkcycsIF9wYXJzZU5RdWFkcyk7XG5cbi8qKlxuICogQ29udmVydHMgYW4gUkRGIGRhdGFzZXQgdG8gTi1RdWFkcy5cbiAqXG4gKiBAcGFyYW0gZGF0YXNldCB0aGUgUkRGIGRhdGFzZXQgdG8gY29udmVydC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBOLVF1YWRzIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gX3RvTlF1YWRzKGRhdGFzZXQpIHtcbiAgdmFyIHF1YWRzID0gW107XG4gIGZvcih2YXIgZ3JhcGhOYW1lIGluIGRhdGFzZXQpIHtcbiAgICB2YXIgdHJpcGxlcyA9IGRhdGFzZXRbZ3JhcGhOYW1lXTtcbiAgICBmb3IodmFyIHRpID0gMDsgdGkgPCB0cmlwbGVzLmxlbmd0aDsgKyt0aSkge1xuICAgICAgdmFyIHRyaXBsZSA9IHRyaXBsZXNbdGldO1xuICAgICAgaWYoZ3JhcGhOYW1lID09PSAnQGRlZmF1bHQnKSB7XG4gICAgICAgIGdyYXBoTmFtZSA9IG51bGw7XG4gICAgICB9XG4gICAgICBxdWFkcy5wdXNoKF90b05RdWFkKHRyaXBsZSwgZ3JhcGhOYW1lKSk7XG4gICAgfVxuICB9XG4gIHF1YWRzLnNvcnQoKTtcbiAgcmV0dXJuIHF1YWRzLmpvaW4oJycpO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGFuIFJERiB0cmlwbGUgYW5kIGdyYXBoIG5hbWUgdG8gYW4gTi1RdWFkIHN0cmluZyAoYSBzaW5nbGUgcXVhZCkuXG4gKlxuICogQHBhcmFtIHRyaXBsZSB0aGUgUkRGIHRyaXBsZSB0byBjb252ZXJ0LlxuICogQHBhcmFtIGdyYXBoTmFtZSB0aGUgbmFtZSBvZiB0aGUgZ3JhcGggY29udGFpbmluZyB0aGUgdHJpcGxlLCBudWxsIGZvclxuICogICAgICAgICAgdGhlIGRlZmF1bHQgZ3JhcGguXG4gKiBAcGFyYW0gYm5vZGUgdGhlIGJub2RlIHRoZSBxdWFkIGlzIG1hcHBlZCB0byAob3B0aW9uYWwsIGZvciB1c2VcbiAqICAgICAgICAgIGR1cmluZyBub3JtYWxpemF0aW9uIG9ubHkpLlxuICpcbiAqIEByZXR1cm4gdGhlIE4tUXVhZCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIF90b05RdWFkKHRyaXBsZSwgZ3JhcGhOYW1lLCBibm9kZSkge1xuICB2YXIgcyA9IHRyaXBsZS5zdWJqZWN0O1xuICB2YXIgcCA9IHRyaXBsZS5wcmVkaWNhdGU7XG4gIHZhciBvID0gdHJpcGxlLm9iamVjdDtcbiAgdmFyIGcgPSBncmFwaE5hbWU7XG5cbiAgdmFyIHF1YWQgPSAnJztcblxuICAvLyBzdWJqZWN0IGlzIGFuIElSSVxuICBpZihzLnR5cGUgPT09ICdJUkknKSB7XG4gICAgcXVhZCArPSAnPCcgKyBzLnZhbHVlICsgJz4nO1xuICB9IGVsc2UgaWYoYm5vZGUpIHtcbiAgICAvLyBibm9kZSBub3JtYWxpemF0aW9uIG1vZGVcbiAgICBxdWFkICs9IChzLnZhbHVlID09PSBibm9kZSkgPyAnXzphJyA6ICdfOnonO1xuICB9IGVsc2Uge1xuICAgIC8vIGJub2RlIG5vcm1hbCBtb2RlXG4gICAgcXVhZCArPSBzLnZhbHVlO1xuICB9XG4gIHF1YWQgKz0gJyAnO1xuXG4gIC8vIHByZWRpY2F0ZSBpcyBhbiBJUklcbiAgaWYocC50eXBlID09PSAnSVJJJykge1xuICAgIHF1YWQgKz0gJzwnICsgcC52YWx1ZSArICc+JztcbiAgfSBlbHNlIGlmKGJub2RlKSB7XG4gICAgLy8gRklYTUU6IFRCRCB3aGF0IHRvIGRvIHdpdGggYm5vZGUgcHJlZGljYXRlcyBkdXJpbmcgbm9ybWFsaXphdGlvblxuICAgIC8vIGJub2RlIG5vcm1hbGl6YXRpb24gbW9kZVxuICAgIHF1YWQgKz0gJ186cCc7XG4gIH0gZWxzZSB7XG4gICAgLy8gYm5vZGUgbm9ybWFsIG1vZGVcbiAgICBxdWFkICs9IHAudmFsdWU7XG4gIH1cbiAgcXVhZCArPSAnICc7XG5cbiAgLy8gb2JqZWN0IGlzIElSSSwgYm5vZGUsIG9yIGxpdGVyYWxcbiAgaWYoby50eXBlID09PSAnSVJJJykge1xuICAgIHF1YWQgKz0gJzwnICsgby52YWx1ZSArICc+JztcbiAgfSBlbHNlIGlmKG8udHlwZSA9PT0gJ2JsYW5rIG5vZGUnKSB7XG4gICAgLy8gbm9ybWFsaXphdGlvbiBtb2RlXG4gICAgaWYoYm5vZGUpIHtcbiAgICAgIHF1YWQgKz0gKG8udmFsdWUgPT09IGJub2RlKSA/ICdfOmEnIDogJ186eic7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vcm1hbCBtb2RlXG4gICAgICBxdWFkICs9IG8udmFsdWU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBlc2NhcGVkID0gby52YWx1ZVxuICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJylcbiAgICAgIC5yZXBsYWNlKC9cXHQvZywgJ1xcXFx0JylcbiAgICAgIC5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcbiAgICAgIC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJylcbiAgICAgIC5yZXBsYWNlKC9cXFwiL2csICdcXFxcXCInKTtcbiAgICBxdWFkICs9ICdcIicgKyBlc2NhcGVkICsgJ1wiJztcbiAgICBpZihvLmRhdGF0eXBlID09PSBSREZfTEFOR1NUUklORykge1xuICAgICAgaWYoby5sYW5ndWFnZSkge1xuICAgICAgICBxdWFkICs9ICdAJyArIG8ubGFuZ3VhZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmKG8uZGF0YXR5cGUgIT09IFhTRF9TVFJJTkcpIHtcbiAgICAgIHF1YWQgKz0gJ15ePCcgKyBvLmRhdGF0eXBlICsgJz4nO1xuICAgIH1cbiAgfVxuXG4gIC8vIGdyYXBoXG4gIGlmKGcgIT09IG51bGwpIHtcbiAgICBpZihnLmluZGV4T2YoJ186JykgIT09IDApIHtcbiAgICAgIHF1YWQgKz0gJyA8JyArIGcgKyAnPic7XG4gICAgfSBlbHNlIGlmKGJub2RlKSB7XG4gICAgICBxdWFkICs9ICcgXzpnJztcbiAgICB9IGVsc2Uge1xuICAgICAgcXVhZCArPSAnICcgKyBnO1xuICAgIH1cbiAgfVxuXG4gIHF1YWQgKz0gJyAuXFxuJztcbiAgcmV0dXJuIHF1YWQ7XG59XG5cbi8qKlxuICogUGFyc2VzIHRoZSBSREYgZGF0YXNldCBmb3VuZCB2aWEgdGhlIGRhdGEgb2JqZWN0IGZyb20gdGhlIFJERmEgQVBJLlxuICpcbiAqIEBwYXJhbSBkYXRhIHRoZSBSREZhIEFQSSBkYXRhIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBSREYgZGF0YXNldC5cbiAqL1xuZnVuY3Rpb24gX3BhcnNlUmRmYUFwaURhdGEoZGF0YSkge1xuICB2YXIgZGF0YXNldCA9IHt9O1xuICBkYXRhc2V0WydAZGVmYXVsdCddID0gW107XG5cbiAgdmFyIHN1YmplY3RzID0gZGF0YS5nZXRTdWJqZWN0cygpO1xuICBmb3IodmFyIHNpID0gMDsgc2kgPCBzdWJqZWN0cy5sZW5ndGg7ICsrc2kpIHtcbiAgICB2YXIgc3ViamVjdCA9IHN1YmplY3RzW3NpXTtcbiAgICBpZihzdWJqZWN0ID09PSBudWxsKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBnZXQgYWxsIHJlbGF0ZWQgdHJpcGxlc1xuICAgIHZhciB0cmlwbGVzID0gZGF0YS5nZXRTdWJqZWN0VHJpcGxlcyhzdWJqZWN0KTtcbiAgICBpZih0cmlwbGVzID09PSBudWxsKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgdmFyIHByZWRpY2F0ZXMgPSB0cmlwbGVzLnByZWRpY2F0ZXM7XG4gICAgZm9yKHZhciBwcmVkaWNhdGUgaW4gcHJlZGljYXRlcykge1xuICAgICAgLy8gaXRlcmF0ZSBvdmVyIG9iamVjdHNcbiAgICAgIHZhciBvYmplY3RzID0gcHJlZGljYXRlc1twcmVkaWNhdGVdLm9iamVjdHM7XG4gICAgICBmb3IodmFyIG9pID0gMDsgb2kgPCBvYmplY3RzLmxlbmd0aDsgKytvaSkge1xuICAgICAgICB2YXIgb2JqZWN0ID0gb2JqZWN0c1tvaV07XG5cbiAgICAgICAgLy8gY3JlYXRlIFJERiB0cmlwbGVcbiAgICAgICAgdmFyIHRyaXBsZSA9IHt9O1xuXG4gICAgICAgIC8vIGFkZCBzdWJqZWN0XG4gICAgICAgIGlmKHN1YmplY3QuaW5kZXhPZignXzonKSA9PT0gMCkge1xuICAgICAgICAgIHRyaXBsZS5zdWJqZWN0ID0ge3R5cGU6ICdibGFuayBub2RlJywgdmFsdWU6IHN1YmplY3R9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRyaXBsZS5zdWJqZWN0ID0ge3R5cGU6ICdJUkknLCB2YWx1ZTogc3ViamVjdH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgcHJlZGljYXRlXG4gICAgICAgIGlmKHByZWRpY2F0ZS5pbmRleE9mKCdfOicpID09PSAwKSB7XG4gICAgICAgICAgdHJpcGxlLnByZWRpY2F0ZSA9IHt0eXBlOiAnYmxhbmsgbm9kZScsIHZhbHVlOiBwcmVkaWNhdGV9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRyaXBsZS5wcmVkaWNhdGUgPSB7dHlwZTogJ0lSSScsIHZhbHVlOiBwcmVkaWNhdGV9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2VyaWFsaXplIFhNTCBsaXRlcmFsXG4gICAgICAgIHZhciB2YWx1ZSA9IG9iamVjdC52YWx1ZTtcbiAgICAgICAgaWYob2JqZWN0LnR5cGUgPT09IFJERl9YTUxfTElURVJBTCkge1xuICAgICAgICAgIC8vIGluaXRpYWxpemUgWE1MU2VyaWFsaXplclxuICAgICAgICAgIGlmKCFYTUxTZXJpYWxpemVyKSB7XG4gICAgICAgICAgICBfZGVmaW5lWE1MU2VyaWFsaXplcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgc2VyaWFsaXplciA9IG5ldyBYTUxTZXJpYWxpemVyKCk7XG4gICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgICBmb3IodmFyIHggPSAwOyB4IDwgb2JqZWN0LnZhbHVlLmxlbmd0aDsgeCsrKSB7XG4gICAgICAgICAgICBpZihvYmplY3QudmFsdWVbeF0ubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgIHZhbHVlICs9IHNlcmlhbGl6ZXIuc2VyaWFsaXplVG9TdHJpbmcob2JqZWN0LnZhbHVlW3hdKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihvYmplY3QudmFsdWVbeF0ubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICAgICAgICAgIHZhbHVlICs9IG9iamVjdC52YWx1ZVt4XS5ub2RlVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWRkIG9iamVjdFxuICAgICAgICB0cmlwbGUub2JqZWN0ID0ge307XG5cbiAgICAgICAgLy8gb2JqZWN0IGlzIGFuIElSSVxuICAgICAgICBpZihvYmplY3QudHlwZSA9PT0gUkRGX09CSkVDVCkge1xuICAgICAgICAgIGlmKG9iamVjdC52YWx1ZS5pbmRleE9mKCdfOicpID09PSAwKSB7XG4gICAgICAgICAgICB0cmlwbGUub2JqZWN0LnR5cGUgPSAnYmxhbmsgbm9kZSc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyaXBsZS5vYmplY3QudHlwZSA9ICdJUkknO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBvYmplY3QgaXMgYSBsaXRlcmFsXG4gICAgICAgICAgdHJpcGxlLm9iamVjdC50eXBlID0gJ2xpdGVyYWwnO1xuICAgICAgICAgIGlmKG9iamVjdC50eXBlID09PSBSREZfUExBSU5fTElURVJBTCkge1xuICAgICAgICAgICAgaWYob2JqZWN0Lmxhbmd1YWdlKSB7XG4gICAgICAgICAgICAgIHRyaXBsZS5vYmplY3QuZGF0YXR5cGUgPSBSREZfTEFOR1NUUklORztcbiAgICAgICAgICAgICAgdHJpcGxlLm9iamVjdC5sYW5ndWFnZSA9IG9iamVjdC5sYW5ndWFnZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRyaXBsZS5vYmplY3QuZGF0YXR5cGUgPSBYU0RfU1RSSU5HO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cmlwbGUub2JqZWN0LmRhdGF0eXBlID0gb2JqZWN0LnR5cGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRyaXBsZS5vYmplY3QudmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICAvLyBhZGQgdHJpcGxlIHRvIGRhdGFzZXQgaW4gZGVmYXVsdCBncmFwaFxuICAgICAgICBkYXRhc2V0WydAZGVmYXVsdCddLnB1c2godHJpcGxlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZGF0YXNldDtcbn1cblxuLy8gcmVnaXN0ZXIgdGhlIFJERmEgQVBJIFJERiBwYXJzZXJcbmpzb25sZC5yZWdpc3RlclJERlBhcnNlcigncmRmYS1hcGknLCBfcGFyc2VSZGZhQXBpRGF0YSk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBVbmlxdWVOYW1lci4gQSBVbmlxdWVOYW1lciBpc3N1ZXMgdW5pcXVlIG5hbWVzLCBrZWVwaW5nXG4gKiB0cmFjayBvZiBhbnkgcHJldmlvdXNseSBpc3N1ZWQgbmFtZXMuXG4gKlxuICogQHBhcmFtIHByZWZpeCB0aGUgcHJlZml4IHRvIHVzZSAoJzxwcmVmaXg+PGNvdW50ZXI+JykuXG4gKi9cbmZ1bmN0aW9uIFVuaXF1ZU5hbWVyKHByZWZpeCkge1xuICB0aGlzLnByZWZpeCA9IHByZWZpeDtcbiAgdGhpcy5jb3VudGVyID0gMDtcbiAgdGhpcy5leGlzdGluZyA9IHt9O1xufVxuanNvbmxkLlVuaXF1ZU5hbWVyID0gVW5pcXVlTmFtZXI7XG5cbi8qKlxuICogQ29waWVzIHRoaXMgVW5pcXVlTmFtZXIuXG4gKlxuICogQHJldHVybiBhIGNvcHkgb2YgdGhpcyBVbmlxdWVOYW1lci5cbiAqL1xuVW5pcXVlTmFtZXIucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gIHZhciBjb3B5ID0gbmV3IFVuaXF1ZU5hbWVyKHRoaXMucHJlZml4KTtcbiAgY29weS5jb3VudGVyID0gdGhpcy5jb3VudGVyO1xuICBjb3B5LmV4aXN0aW5nID0gX2Nsb25lKHRoaXMuZXhpc3RpbmcpO1xuICByZXR1cm4gY29weTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgbmV3IG5hbWUgZm9yIHRoZSBnaXZlbiBvbGQgbmFtZSwgd2hlcmUgaWYgbm8gb2xkIG5hbWUgaXMgZ2l2ZW5cbiAqIGEgbmV3IG5hbWUgd2lsbCBiZSBnZW5lcmF0ZWQuXG4gKlxuICogQHBhcmFtIFtvbGROYW1lXSB0aGUgb2xkIG5hbWUgdG8gZ2V0IHRoZSBuZXcgbmFtZSBmb3IuXG4gKlxuICogQHJldHVybiB0aGUgbmV3IG5hbWUuXG4gKi9cblVuaXF1ZU5hbWVyLnByb3RvdHlwZS5nZXROYW1lID0gZnVuY3Rpb24ob2xkTmFtZSkge1xuICAvLyByZXR1cm4gZXhpc3Rpbmcgb2xkIG5hbWVcbiAgaWYob2xkTmFtZSAmJiBvbGROYW1lIGluIHRoaXMuZXhpc3RpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5leGlzdGluZ1tvbGROYW1lXTtcbiAgfVxuXG4gIC8vIGdldCBuZXh0IG5hbWVcbiAgdmFyIG5hbWUgPSB0aGlzLnByZWZpeCArIHRoaXMuY291bnRlcjtcbiAgdGhpcy5jb3VudGVyICs9IDE7XG5cbiAgLy8gc2F2ZSBtYXBwaW5nXG4gIGlmKG9sZE5hbWUpIHtcbiAgICB0aGlzLmV4aXN0aW5nW29sZE5hbWVdID0gbmFtZTtcbiAgfVxuXG4gIHJldHVybiBuYW1lO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG9sZE5hbWUgaGFzIGFscmVhZHkgYmVlbiBhc3NpZ25lZCBhIG5ldyBuYW1lLlxuICpcbiAqIEBwYXJhbSBvbGROYW1lIHRoZSBvbGROYW1lIHRvIGNoZWNrLlxuICpcbiAqIEByZXR1cm4gdHJ1ZSBpZiB0aGUgb2xkTmFtZSBoYXMgYmVlbiBhc3NpZ25lZCBhIG5ldyBuYW1lLCBmYWxzZSBpZiBub3QuXG4gKi9cblVuaXF1ZU5hbWVyLnByb3RvdHlwZS5pc05hbWVkID0gZnVuY3Rpb24ob2xkTmFtZSkge1xuICByZXR1cm4gKG9sZE5hbWUgaW4gdGhpcy5leGlzdGluZyk7XG59O1xuXG4vKipcbiAqIEEgUGVybXV0YXRvciBpdGVyYXRlcyBvdmVyIGFsbCBwb3NzaWJsZSBwZXJtdXRhdGlvbnMgb2YgdGhlIGdpdmVuIGFycmF5XG4gKiBvZiBlbGVtZW50cy5cbiAqXG4gKiBAcGFyYW0gbGlzdCB0aGUgYXJyYXkgb2YgZWxlbWVudHMgdG8gaXRlcmF0ZSBvdmVyLlxuICovXG52YXIgUGVybXV0YXRvciA9IGZ1bmN0aW9uKGxpc3QpIHtcbiAgLy8gb3JpZ2luYWwgYXJyYXlcbiAgdGhpcy5saXN0ID0gbGlzdC5zb3J0KCk7XG4gIC8vIGluZGljYXRlcyB3aGV0aGVyIHRoZXJlIGFyZSBtb3JlIHBlcm11dGF0aW9uc1xuICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgLy8gZGlyZWN0aW9uYWwgaW5mbyBmb3IgcGVybXV0YXRpb24gYWxnb3JpdGhtXG4gIHRoaXMubGVmdCA9IHt9O1xuICBmb3IodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHRoaXMubGVmdFtsaXN0W2ldXSA9IHRydWU7XG4gIH1cbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZXJlIGlzIGFub3RoZXIgcGVybXV0YXRpb24uXG4gKlxuICogQHJldHVybiB0cnVlIGlmIHRoZXJlIGlzIGFub3RoZXIgcGVybXV0YXRpb24sIGZhbHNlIGlmIG5vdC5cbiAqL1xuUGVybXV0YXRvci5wcm90b3R5cGUuaGFzTmV4dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMuZG9uZTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgbmV4dCBwZXJtdXRhdGlvbi4gQ2FsbCBoYXNOZXh0KCkgdG8gZW5zdXJlIHRoZXJlIGlzIGFub3RoZXIgb25lXG4gKiBmaXJzdC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBuZXh0IHBlcm11dGF0aW9uLlxuICovXG5QZXJtdXRhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIGNvcHkgY3VycmVudCBwZXJtdXRhdGlvblxuICB2YXIgcnZhbCA9IHRoaXMubGlzdC5zbGljZSgpO1xuXG4gIC8qIENhbGN1bGF0ZSB0aGUgbmV4dCBwZXJtdXRhdGlvbiB1c2luZyB0aGUgU3RlaW5oYXVzLUpvaG5zb24tVHJvdHRlclxuICAgcGVybXV0YXRpb24gYWxnb3JpdGhtLiAqL1xuXG4gIC8vIGdldCBsYXJnZXN0IG1vYmlsZSBlbGVtZW50IGtcbiAgLy8gKG1vYmlsZTogZWxlbWVudCBpcyBncmVhdGVyIHRoYW4gdGhlIG9uZSBpdCBpcyBsb29raW5nIGF0KVxuICB2YXIgayA9IG51bGw7XG4gIHZhciBwb3MgPSAwO1xuICB2YXIgbGVuZ3RoID0gdGhpcy5saXN0Lmxlbmd0aDtcbiAgZm9yKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLmxpc3RbaV07XG4gICAgdmFyIGxlZnQgPSB0aGlzLmxlZnRbZWxlbWVudF07XG4gICAgaWYoKGsgPT09IG51bGwgfHwgZWxlbWVudCA+IGspICYmXG4gICAgICAoKGxlZnQgJiYgaSA+IDAgJiYgZWxlbWVudCA+IHRoaXMubGlzdFtpIC0gMV0pIHx8XG4gICAgICAoIWxlZnQgJiYgaSA8IChsZW5ndGggLSAxKSAmJiBlbGVtZW50ID4gdGhpcy5saXN0W2kgKyAxXSkpKSB7XG4gICAgICBrID0gZWxlbWVudDtcbiAgICAgIHBvcyA9IGk7XG4gICAgfVxuICB9XG5cbiAgLy8gbm8gbW9yZSBwZXJtdXRhdGlvbnNcbiAgaWYoayA9PT0gbnVsbCkge1xuICAgIHRoaXMuZG9uZSA9IHRydWU7XG4gIH0gZWxzZSB7XG4gICAgLy8gc3dhcCBrIGFuZCB0aGUgZWxlbWVudCBpdCBpcyBsb29raW5nIGF0XG4gICAgdmFyIHN3YXAgPSB0aGlzLmxlZnRba10gPyBwb3MgLSAxIDogcG9zICsgMTtcbiAgICB0aGlzLmxpc3RbcG9zXSA9IHRoaXMubGlzdFtzd2FwXTtcbiAgICB0aGlzLmxpc3Rbc3dhcF0gPSBrO1xuXG4gICAgLy8gcmV2ZXJzZSB0aGUgZGlyZWN0aW9uIG9mIGFsbCBlbGVtZW50cyBsYXJnZXIgdGhhbiBrXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgICBpZih0aGlzLmxpc3RbaV0gPiBrKSB7XG4gICAgICAgIHRoaXMubGVmdFt0aGlzLmxpc3RbaV1dID0gIXRoaXMubGVmdFt0aGlzLmxpc3RbaV1dO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBydmFsO1xufTtcblxuLy8gU0hBLTEgQVBJXG52YXIgc2hhMSA9IGpzb25sZC5zaGExID0ge307XG5cbmlmKF9ub2RlanMpIHtcbiAgdmFyIGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuICBzaGExLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBtZCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGExJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHVwZGF0ZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBtZC51cGRhdGUoZGF0YSwgJ3V0ZjgnKTtcbiAgICAgIH0sXG4gICAgICBkaWdlc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbWQuZGlnZXN0KCdoZXgnKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xufSBlbHNlIHtcbiAgc2hhMS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IHNoYTEuTWVzc2FnZURpZ2VzdCgpO1xuICB9O1xufVxuXG4vKipcbiAqIEhhc2hlcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgcXVhZHMgYW5kIHJldHVybnMgaXRzIGhleGFkZWNpbWFsIFNIQS0xIG1lc3NhZ2VcbiAqIGRpZ2VzdC5cbiAqXG4gKiBAcGFyYW0gbnF1YWRzIHRoZSBsaXN0IG9mIHNlcmlhbGl6ZWQgcXVhZHMgdG8gaGFzaC5cbiAqXG4gKiBAcmV0dXJuIHRoZSBoZXhhZGVjaW1hbCBTSEEtMSBtZXNzYWdlIGRpZ2VzdC5cbiAqL1xuc2hhMS5oYXNoID0gZnVuY3Rpb24obnF1YWRzKSB7XG4gIHZhciBtZCA9IHNoYTEuY3JlYXRlKCk7XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBucXVhZHMubGVuZ3RoOyArK2kpIHtcbiAgICBtZC51cGRhdGUobnF1YWRzW2ldKTtcbiAgfVxuICByZXR1cm4gbWQuZGlnZXN0KCk7XG59O1xuXG4vLyBvbmx5IGRlZmluZSBzaGExIE1lc3NhZ2VEaWdlc3QgZm9yIG5vbi1ub2RlanNcbmlmKCFfbm9kZWpzKSB7XG5cbi8qKlxuICogQ3JlYXRlcyBhIHNpbXBsZSBieXRlIGJ1ZmZlciBmb3IgbWVzc2FnZSBkaWdlc3Qgb3BlcmF0aW9ucy5cbiAqL1xuc2hhMS5CdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5kYXRhID0gJyc7XG4gIHRoaXMucmVhZCA9IDA7XG59O1xuXG4vKipcbiAqIFB1dHMgYSAzMi1iaXQgaW50ZWdlciBpbnRvIHRoaXMgYnVmZmVyIGluIGJpZy1lbmRpYW4gb3JkZXIuXG4gKlxuICogQHBhcmFtIGkgdGhlIDMyLWJpdCBpbnRlZ2VyLlxuICovXG5zaGExLkJ1ZmZlci5wcm90b3R5cGUucHV0SW50MzIgPSBmdW5jdGlvbihpKSB7XG4gIHRoaXMuZGF0YSArPSAoXG4gICAgU3RyaW5nLmZyb21DaGFyQ29kZShpID4+IDI0ICYgMHhGRikgK1xuICAgIFN0cmluZy5mcm9tQ2hhckNvZGUoaSA+PiAxNiAmIDB4RkYpICtcbiAgICBTdHJpbmcuZnJvbUNoYXJDb2RlKGkgPj4gOCAmIDB4RkYpICtcbiAgICBTdHJpbmcuZnJvbUNoYXJDb2RlKGkgJiAweEZGKSk7XG59O1xuXG4vKipcbiAqIEdldHMgYSAzMi1iaXQgaW50ZWdlciBmcm9tIHRoaXMgYnVmZmVyIGluIGJpZy1lbmRpYW4gb3JkZXIgYW5kXG4gKiBhZHZhbmNlcyB0aGUgcmVhZCBwb2ludGVyIGJ5IDQuXG4gKlxuICogQHJldHVybiB0aGUgd29yZC5cbiAqL1xuc2hhMS5CdWZmZXIucHJvdG90eXBlLmdldEludDMyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBydmFsID0gKFxuICAgIHRoaXMuZGF0YS5jaGFyQ29kZUF0KHRoaXMucmVhZCkgPDwgMjQgXlxuICAgIHRoaXMuZGF0YS5jaGFyQ29kZUF0KHRoaXMucmVhZCArIDEpIDw8IDE2IF5cbiAgICB0aGlzLmRhdGEuY2hhckNvZGVBdCh0aGlzLnJlYWQgKyAyKSA8PCA4IF5cbiAgICB0aGlzLmRhdGEuY2hhckNvZGVBdCh0aGlzLnJlYWQgKyAzKSk7XG4gIHRoaXMucmVhZCArPSA0O1xuICByZXR1cm4gcnZhbDtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgYnl0ZXMgaW4gdGhpcyBidWZmZXIuXG4gKlxuICogQHJldHVybiBhIHN0cmluZyBmdWxsIG9mIFVURi04IGVuY29kZWQgY2hhcmFjdGVycy5cbiAqL1xuc2hhMS5CdWZmZXIucHJvdG90eXBlLmJ5dGVzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmRhdGEuc2xpY2UodGhpcy5yZWFkKTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgbnVtYmVyIG9mIGJ5dGVzIGluIHRoaXMgYnVmZmVyLlxuICpcbiAqIEByZXR1cm4gdGhlIG51bWJlciBvZiBieXRlcyBpbiB0aGlzIGJ1ZmZlci5cbiAqL1xuc2hhMS5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5kYXRhLmxlbmd0aCAtIHRoaXMucmVhZDtcbn07XG5cbi8qKlxuICogQ29tcGFjdHMgdGhpcyBidWZmZXIuXG4gKi9cbnNoYTEuQnVmZmVyLnByb3RvdHlwZS5jb21wYWN0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZGF0YSA9IHRoaXMuZGF0YS5zbGljZSh0aGlzLnJlYWQpO1xuICB0aGlzLnJlYWQgPSAwO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyB0aGlzIGJ1ZmZlciB0byBhIGhleGFkZWNpbWFsIHN0cmluZy5cbiAqXG4gKiBAcmV0dXJuIGEgaGV4YWRlY2ltYWwgc3RyaW5nLlxuICovXG5zaGExLkJ1ZmZlci5wcm90b3R5cGUudG9IZXggPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJ2YWwgPSAnJztcbiAgZm9yKHZhciBpID0gdGhpcy5yZWFkOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGIgPSB0aGlzLmRhdGEuY2hhckNvZGVBdChpKTtcbiAgICBpZihiIDwgMTYpIHtcbiAgICAgIHJ2YWwgKz0gJzAnO1xuICAgIH1cbiAgICBydmFsICs9IGIudG9TdHJpbmcoMTYpO1xuICB9XG4gIHJldHVybiBydmFsO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgU0hBLTEgbWVzc2FnZSBkaWdlc3Qgb2JqZWN0LlxuICpcbiAqIEByZXR1cm4gYSBtZXNzYWdlIGRpZ2VzdCBvYmplY3QuXG4gKi9cbnNoYTEuTWVzc2FnZURpZ2VzdCA9IGZ1bmN0aW9uKCkge1xuICAvLyBkbyBpbml0aWFsaXphdGlvbiBhcyBuZWNlc3NhcnlcbiAgaWYoIV9zaGExLmluaXRpYWxpemVkKSB7XG4gICAgX3NoYTEuaW5pdCgpO1xuICB9XG5cbiAgdGhpcy5ibG9ja0xlbmd0aCA9IDY0O1xuICB0aGlzLmRpZ2VzdExlbmd0aCA9IDIwO1xuICAvLyBsZW5ndGggb2YgbWVzc2FnZSBzbyBmYXIgKGRvZXMgbm90IGluY2x1ZGluZyBwYWRkaW5nKVxuICB0aGlzLm1lc3NhZ2VMZW5ndGggPSAwO1xuXG4gIC8vIGlucHV0IGJ1ZmZlclxuICB0aGlzLmlucHV0ID0gbmV3IHNoYTEuQnVmZmVyKCk7XG5cbiAgLy8gZm9yIHN0b3Jpbmcgd29yZHMgaW4gdGhlIFNIQS0xIGFsZ29yaXRobVxuICB0aGlzLndvcmRzID0gbmV3IEFycmF5KDgwKTtcblxuICAvLyBTSEEtMSBzdGF0ZSBjb250YWlucyBmaXZlIDMyLWJpdCBpbnRlZ2Vyc1xuICB0aGlzLnN0YXRlID0ge1xuICAgIGgwOiAweDY3NDUyMzAxLFxuICAgIGgxOiAweEVGQ0RBQjg5LFxuICAgIGgyOiAweDk4QkFEQ0ZFLFxuICAgIGgzOiAweDEwMzI1NDc2LFxuICAgIGg0OiAweEMzRDJFMUYwXG4gIH07XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGRpZ2VzdCB3aXRoIHRoZSBnaXZlbiBzdHJpbmcgaW5wdXQuXG4gKlxuICogQHBhcmFtIG1zZyB0aGUgbWVzc2FnZSBpbnB1dCB0byB1cGRhdGUgd2l0aC5cbiAqL1xuc2hhMS5NZXNzYWdlRGlnZXN0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbihtc2cpIHtcbiAgLy8gVVRGLTggZW5jb2RlIG1lc3NhZ2VcbiAgbXNnID0gdW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KG1zZykpO1xuXG4gIC8vIHVwZGF0ZSBtZXNzYWdlIGxlbmd0aCBhbmQgaW5wdXQgYnVmZmVyXG4gIHRoaXMubWVzc2FnZUxlbmd0aCArPSBtc2cubGVuZ3RoO1xuICB0aGlzLmlucHV0LmRhdGEgKz0gbXNnO1xuXG4gIC8vIHByb2Nlc3MgaW5wdXRcbiAgX3NoYTEudXBkYXRlKHRoaXMuc3RhdGUsIHRoaXMud29yZHMsIHRoaXMuaW5wdXQpO1xuXG4gIC8vIGNvbXBhY3QgaW5wdXQgYnVmZmVyIGV2ZXJ5IDJLIG9yIGlmIGVtcHR5XG4gIGlmKHRoaXMuaW5wdXQucmVhZCA+IDIwNDggfHwgdGhpcy5pbnB1dC5sZW5ndGgoKSA9PT0gMCkge1xuICAgIHRoaXMuaW5wdXQuY29tcGFjdCgpO1xuICB9XG59O1xuXG4vKipcbiAqIFByb2R1Y2VzIHRoZSBkaWdlc3QuXG4gKlxuICogQHJldHVybiB0aGUgZGlnZXN0IGFzIGEgaGV4YWRlY2ltYWwgc3RyaW5nLlxuICovXG5zaGExLk1lc3NhZ2VEaWdlc3QucHJvdG90eXBlLmRpZ2VzdCA9IGZ1bmN0aW9uKCkge1xuICAvKiBEZXRlcm1pbmUgdGhlIG51bWJlciBvZiBieXRlcyB0aGF0IG11c3QgYmUgYWRkZWQgdG8gdGhlIG1lc3NhZ2VcbiAgdG8gZW5zdXJlIGl0cyBsZW5ndGggaXMgY29uZ3J1ZW50IHRvIDQ0OCBtb2QgNTEyLiBJbiBvdGhlciB3b3JkcyxcbiAgYSA2NC1iaXQgaW50ZWdlciB0aGF0IGdpdmVzIHRoZSBsZW5ndGggb2YgdGhlIG1lc3NhZ2Ugd2lsbCBiZVxuICBhcHBlbmRlZCB0byB0aGUgbWVzc2FnZSBhbmQgd2hhdGV2ZXIgdGhlIGxlbmd0aCBvZiB0aGUgbWVzc2FnZSBpc1xuICBwbHVzIDY0IGJpdHMgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDUxMi4gU28gdGhlIGxlbmd0aCBvZiB0aGVcbiAgbWVzc2FnZSBtdXN0IGJlIGNvbmdydWVudCB0byA0NDggbW9kIDUxMiBiZWNhdXNlIDUxMiAtIDY0ID0gNDQ4LlxuXG4gIEluIG9yZGVyIHRvIGZpbGwgdXAgdGhlIG1lc3NhZ2UgbGVuZ3RoIGl0IG11c3QgYmUgZmlsbGVkIHdpdGhcbiAgcGFkZGluZyB0aGF0IGJlZ2lucyB3aXRoIDEgYml0IGZvbGxvd2VkIGJ5IGFsbCAwIGJpdHMuIFBhZGRpbmdcbiAgbXVzdCAqYWx3YXlzKiBiZSBwcmVzZW50LCBzbyBpZiB0aGUgbWVzc2FnZSBsZW5ndGggaXMgYWxyZWFkeVxuICBjb25ncnVlbnQgdG8gNDQ4IG1vZCA1MTIsIHRoZW4gNTEyIHBhZGRpbmcgYml0cyBtdXN0IGJlIGFkZGVkLiAqL1xuXG4gIC8vIDUxMiBiaXRzID09IDY0IGJ5dGVzLCA0NDggYml0cyA9PSA1NiBieXRlcywgNjQgYml0cyA9IDggYnl0ZXNcbiAgLy8gX3BhZGRpbmcgc3RhcnRzIHdpdGggMSBieXRlIHdpdGggZmlyc3QgYml0IGlzIHNldCBpbiBpdCB3aGljaFxuICAvLyBpcyBieXRlIHZhbHVlIDEyOCwgdGhlbiB0aGVyZSBtYXkgYmUgdXAgdG8gNjMgb3RoZXIgcGFkIGJ5dGVzXG4gIHZhciBsZW4gPSB0aGlzLm1lc3NhZ2VMZW5ndGg7XG4gIHZhciBwYWRCeXRlcyA9IG5ldyBzaGExLkJ1ZmZlcigpO1xuICBwYWRCeXRlcy5kYXRhICs9IHRoaXMuaW5wdXQuYnl0ZXMoKTtcbiAgcGFkQnl0ZXMuZGF0YSArPSBfc2hhMS5wYWRkaW5nLnN1YnN0cigwLCA2NCAtICgobGVuICsgOCkgJSA2NCkpO1xuXG4gIC8qIE5vdyBhcHBlbmQgbGVuZ3RoIG9mIHRoZSBtZXNzYWdlLiBUaGUgbGVuZ3RoIGlzIGFwcGVuZGVkIGluIGJpdHNcbiAgYXMgYSA2NC1iaXQgbnVtYmVyIGluIGJpZy1lbmRpYW4gb3JkZXIuIFNpbmNlIHdlIHN0b3JlIHRoZSBsZW5ndGhcbiAgaW4gYnl0ZXMsIHdlIG11c3QgbXVsdGlwbHkgaXQgYnkgOCAob3IgbGVmdCBzaGlmdCBieSAzKS4gU28gaGVyZVxuICBzdG9yZSB0aGUgaGlnaCAzIGJpdHMgaW4gdGhlIGxvdyBlbmQgb2YgdGhlIGZpcnN0IDMyLWJpdHMgb2YgdGhlXG4gIDY0LWJpdCBudW1iZXIgYW5kIHRoZSBsb3dlciA1IGJpdHMgaW4gdGhlIGhpZ2ggZW5kIG9mIHRoZSBzZWNvbmRcbiAgMzItYml0cy4gKi9cbiAgcGFkQnl0ZXMucHV0SW50MzIoKGxlbiA+Pj4gMjkpICYgMHhGRik7XG4gIHBhZEJ5dGVzLnB1dEludDMyKChsZW4gPDwgMykgJiAweEZGRkZGRkZGKTtcbiAgX3NoYTEudXBkYXRlKHRoaXMuc3RhdGUsIHRoaXMud29yZHMsIHBhZEJ5dGVzKTtcbiAgdmFyIHJ2YWwgPSBuZXcgc2hhMS5CdWZmZXIoKTtcbiAgcnZhbC5wdXRJbnQzMih0aGlzLnN0YXRlLmgwKTtcbiAgcnZhbC5wdXRJbnQzMih0aGlzLnN0YXRlLmgxKTtcbiAgcnZhbC5wdXRJbnQzMih0aGlzLnN0YXRlLmgyKTtcbiAgcnZhbC5wdXRJbnQzMih0aGlzLnN0YXRlLmgzKTtcbiAgcnZhbC5wdXRJbnQzMih0aGlzLnN0YXRlLmg0KTtcbiAgcmV0dXJuIHJ2YWwudG9IZXgoKTtcbn07XG5cbi8vIHByaXZhdGUgU0hBLTEgZGF0YVxudmFyIF9zaGExID0ge1xuICBwYWRkaW5nOiBudWxsLFxuICBpbml0aWFsaXplZDogZmFsc2Vcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIGNvbnN0YW50IHRhYmxlcy5cbiAqL1xuX3NoYTEuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAvLyBjcmVhdGUgcGFkZGluZ1xuICBfc2hhMS5wYWRkaW5nID0gU3RyaW5nLmZyb21DaGFyQ29kZSgxMjgpO1xuICB2YXIgYyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoMHgwMCk7XG4gIHZhciBuID0gNjQ7XG4gIHdoaWxlKG4gPiAwKSB7XG4gICAgaWYobiAmIDEpIHtcbiAgICAgIF9zaGExLnBhZGRpbmcgKz0gYztcbiAgICB9XG4gICAgbiA+Pj49IDE7XG4gICAgaWYobiA+IDApIHtcbiAgICAgIGMgKz0gYztcbiAgICB9XG4gIH1cblxuICAvLyBub3cgaW5pdGlhbGl6ZWRcbiAgX3NoYTEuaW5pdGlhbGl6ZWQgPSB0cnVlO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIGEgU0hBLTEgc3RhdGUgd2l0aCB0aGUgZ2l2ZW4gYnl0ZSBidWZmZXIuXG4gKlxuICogQHBhcmFtIHMgdGhlIFNIQS0xIHN0YXRlIHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB3IHRoZSBhcnJheSB0byB1c2UgdG8gc3RvcmUgd29yZHMuXG4gKiBAcGFyYW0gaW5wdXQgdGhlIGlucHV0IGJ5dGUgYnVmZmVyLlxuICovXG5fc2hhMS51cGRhdGUgPSBmdW5jdGlvbihzLCB3LCBpbnB1dCkge1xuICAvLyBjb25zdW1lIDUxMiBiaXQgKDY0IGJ5dGUpIGNodW5rc1xuICB2YXIgdCwgYSwgYiwgYywgZCwgZSwgZiwgaTtcbiAgdmFyIGxlbiA9IGlucHV0Lmxlbmd0aCgpO1xuICB3aGlsZShsZW4gPj0gNjQpIHtcbiAgICAvLyB0aGUgdyBhcnJheSB3aWxsIGJlIHBvcHVsYXRlZCB3aXRoIHNpeHRlZW4gMzItYml0IGJpZy1lbmRpYW4gd29yZHNcbiAgICAvLyBhbmQgdGhlbiBleHRlbmRlZCBpbnRvIDgwIDMyLWJpdCB3b3JkcyBhY2NvcmRpbmcgdG8gU0hBLTEgYWxnb3JpdGhtXG4gICAgLy8gYW5kIGZvciAzMi03OSB1c2luZyBNYXggTG9ja3R5dWtoaW4ncyBvcHRpbWl6YXRpb25cblxuICAgIC8vIGluaXRpYWxpemUgaGFzaCB2YWx1ZSBmb3IgdGhpcyBjaHVua1xuICAgIGEgPSBzLmgwO1xuICAgIGIgPSBzLmgxO1xuICAgIGMgPSBzLmgyO1xuICAgIGQgPSBzLmgzO1xuICAgIGUgPSBzLmg0O1xuXG4gICAgLy8gcm91bmQgMVxuICAgIGZvcihpID0gMDsgaSA8IDE2OyArK2kpIHtcbiAgICAgIHQgPSBpbnB1dC5nZXRJbnQzMigpO1xuICAgICAgd1tpXSA9IHQ7XG4gICAgICBmID0gZCBeIChiICYgKGMgXiBkKSk7XG4gICAgICB0ID0gKChhIDw8IDUpIHwgKGEgPj4+IDI3KSkgKyBmICsgZSArIDB4NUE4Mjc5OTkgKyB0O1xuICAgICAgZSA9IGQ7XG4gICAgICBkID0gYztcbiAgICAgIGMgPSAoYiA8PCAzMCkgfCAoYiA+Pj4gMik7XG4gICAgICBiID0gYTtcbiAgICAgIGEgPSB0O1xuICAgIH1cbiAgICBmb3IoOyBpIDwgMjA7ICsraSkge1xuICAgICAgdCA9ICh3W2kgLSAzXSBeIHdbaSAtIDhdIF4gd1tpIC0gMTRdIF4gd1tpIC0gMTZdKTtcbiAgICAgIHQgPSAodCA8PCAxKSB8ICh0ID4+PiAzMSk7XG4gICAgICB3W2ldID0gdDtcbiAgICAgIGYgPSBkIF4gKGIgJiAoYyBeIGQpKTtcbiAgICAgIHQgPSAoKGEgPDwgNSkgfCAoYSA+Pj4gMjcpKSArIGYgKyBlICsgMHg1QTgyNzk5OSArIHQ7XG4gICAgICBlID0gZDtcbiAgICAgIGQgPSBjO1xuICAgICAgYyA9IChiIDw8IDMwKSB8IChiID4+PiAyKTtcbiAgICAgIGIgPSBhO1xuICAgICAgYSA9IHQ7XG4gICAgfVxuICAgIC8vIHJvdW5kIDJcbiAgICBmb3IoOyBpIDwgMzI7ICsraSkge1xuICAgICAgdCA9ICh3W2kgLSAzXSBeIHdbaSAtIDhdIF4gd1tpIC0gMTRdIF4gd1tpIC0gMTZdKTtcbiAgICAgIHQgPSAodCA8PCAxKSB8ICh0ID4+PiAzMSk7XG4gICAgICB3W2ldID0gdDtcbiAgICAgIGYgPSBiIF4gYyBeIGQ7XG4gICAgICB0ID0gKChhIDw8IDUpIHwgKGEgPj4+IDI3KSkgKyBmICsgZSArIDB4NkVEOUVCQTEgKyB0O1xuICAgICAgZSA9IGQ7XG4gICAgICBkID0gYztcbiAgICAgIGMgPSAoYiA8PCAzMCkgfCAoYiA+Pj4gMik7XG4gICAgICBiID0gYTtcbiAgICAgIGEgPSB0O1xuICAgIH1cbiAgICBmb3IoOyBpIDwgNDA7ICsraSkge1xuICAgICAgdCA9ICh3W2kgLSA2XSBeIHdbaSAtIDE2XSBeIHdbaSAtIDI4XSBeIHdbaSAtIDMyXSk7XG4gICAgICB0ID0gKHQgPDwgMikgfCAodCA+Pj4gMzApO1xuICAgICAgd1tpXSA9IHQ7XG4gICAgICBmID0gYiBeIGMgXiBkO1xuICAgICAgdCA9ICgoYSA8PCA1KSB8IChhID4+PiAyNykpICsgZiArIGUgKyAweDZFRDlFQkExICsgdDtcbiAgICAgIGUgPSBkO1xuICAgICAgZCA9IGM7XG4gICAgICBjID0gKGIgPDwgMzApIHwgKGIgPj4+IDIpO1xuICAgICAgYiA9IGE7XG4gICAgICBhID0gdDtcbiAgICB9XG4gICAgLy8gcm91bmQgM1xuICAgIGZvcig7IGkgPCA2MDsgKytpKSB7XG4gICAgICB0ID0gKHdbaSAtIDZdIF4gd1tpIC0gMTZdIF4gd1tpIC0gMjhdIF4gd1tpIC0gMzJdKTtcbiAgICAgIHQgPSAodCA8PCAyKSB8ICh0ID4+PiAzMCk7XG4gICAgICB3W2ldID0gdDtcbiAgICAgIGYgPSAoYiAmIGMpIHwgKGQgJiAoYiBeIGMpKTtcbiAgICAgIHQgPSAoKGEgPDwgNSkgfCAoYSA+Pj4gMjcpKSArIGYgKyBlICsgMHg4RjFCQkNEQyArIHQ7XG4gICAgICBlID0gZDtcbiAgICAgIGQgPSBjO1xuICAgICAgYyA9IChiIDw8IDMwKSB8IChiID4+PiAyKTtcbiAgICAgIGIgPSBhO1xuICAgICAgYSA9IHQ7XG4gICAgfVxuICAgIC8vIHJvdW5kIDRcbiAgICBmb3IoOyBpIDwgODA7ICsraSkge1xuICAgICAgdCA9ICh3W2kgLSA2XSBeIHdbaSAtIDE2XSBeIHdbaSAtIDI4XSBeIHdbaSAtIDMyXSk7XG4gICAgICB0ID0gKHQgPDwgMikgfCAodCA+Pj4gMzApO1xuICAgICAgd1tpXSA9IHQ7XG4gICAgICBmID0gYiBeIGMgXiBkO1xuICAgICAgdCA9ICgoYSA8PCA1KSB8IChhID4+PiAyNykpICsgZiArIGUgKyAweENBNjJDMUQ2ICsgdDtcbiAgICAgIGUgPSBkO1xuICAgICAgZCA9IGM7XG4gICAgICBjID0gKGIgPDwgMzApIHwgKGIgPj4+IDIpO1xuICAgICAgYiA9IGE7XG4gICAgICBhID0gdDtcbiAgICB9XG5cbiAgICAvLyB1cGRhdGUgaGFzaCBzdGF0ZVxuICAgIHMuaDAgKz0gYTtcbiAgICBzLmgxICs9IGI7XG4gICAgcy5oMiArPSBjO1xuICAgIHMuaDMgKz0gZDtcbiAgICBzLmg0ICs9IGU7XG5cbiAgICBsZW4gLT0gNjQ7XG4gIH1cbn07XG5cbn0gLy8gZW5kIG5vbi1ub2RlanNcblxuaWYoIVhNTFNlcmlhbGl6ZXIpIHtcblxudmFyIF9kZWZpbmVYTUxTZXJpYWxpemVyID0gZnVuY3Rpb24oKSB7XG4gIFhNTFNlcmlhbGl6ZXIgPSByZXF1aXJlKCd4bWxkb20nKS5YTUxTZXJpYWxpemVyO1xufTtcblxufSAvLyBlbmQgX2RlZmluZVhNTFNlcmlhbGl6ZXJcblxuLy8gZGVmaW5lIFVSTCBwYXJzZXJcbi8vIHBhcnNlVXJpIDEuMi4yXG4vLyAoYykgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+XG4vLyBNSVQgTGljZW5zZVxuLy8gd2l0aCBsb2NhbCBqc29ubGQuanMgbW9kaWZpY2F0aW9uc1xuanNvbmxkLnVybCA9IHt9O1xuanNvbmxkLnVybC5wYXJzZXJzID0ge1xuICBzaW1wbGU6IHtcbiAgICAvLyBSRkMgMzk4NiBiYXNpYyBwYXJ0c1xuICAgIGtleXM6IFsnaHJlZicsJ3NjaGVtZScsJ2F1dGhvcml0eScsJ3BhdGgnLCdxdWVyeScsJ2ZyYWdtZW50J10sXG4gICAgcmVnZXg6IC9eKD86KFteOlxcLz8jXSspOik/KD86XFwvXFwvKFteXFwvPyNdKikpPyhbXj8jXSopKD86XFw/KFteI10qKSk/KD86IyguKikpPy9cbiAgfSxcbiAgZnVsbDoge1xuICAgIGtleXM6IFsnaHJlZicsJ3Byb3RvY29sJywnc2NoZW1lJywnYXV0aG9yaXR5JywnYXV0aCcsJ3VzZXInLCdwYXNzd29yZCcsJ2hvc3RuYW1lJywncG9ydCcsJ3BhdGgnLCdkaXJlY3RvcnknLCdmaWxlJywncXVlcnknLCdmcmFnbWVudCddLFxuICAgIHJlZ2V4OiAvXigoW146XFwvPyNdKyk6KT8oPzpcXC9cXC8oKD86KChbXjpAXSopKD86OihbXjpAXSopKT8pP0ApPyhbXjpcXC8/I10qKSg/OjooXFxkKikpPykpPyg/OigoKD86W14/I1xcL10qXFwvKSopKFtePyNdKikpKD86XFw/KFteI10qKSk/KD86IyguKikpPykvXG4gIH1cbn07XG5qc29ubGQudXJsLnBhcnNlID0gZnVuY3Rpb24oc3RyLCBwYXJzZXIpIHtcbiAgdmFyIHBhcnNlZCA9IHt9O1xuICB2YXIgbyA9IGpzb25sZC51cmwucGFyc2Vyc1twYXJzZXIgfHwgJ2Z1bGwnXTtcbiAgdmFyIG0gPSBvLnJlZ2V4LmV4ZWMoc3RyKTtcbiAgdmFyIGkgPSBvLmtleXMubGVuZ3RoO1xuICB3aGlsZShpLS0pIHtcbiAgICBwYXJzZWRbby5rZXlzW2ldXSA9IChtW2ldID09PSB1bmRlZmluZWQpID8gbnVsbCA6IG1baV07XG4gIH1cbiAgcGFyc2VkLm5vcm1hbGl6ZWRQYXRoID0gX3JlbW92ZURvdFNlZ21lbnRzKHBhcnNlZC5wYXRoLCAhIXBhcnNlZC5hdXRob3JpdHkpO1xuICByZXR1cm4gcGFyc2VkO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGRvdCBzZWdtZW50cyBmcm9tIGEgVVJMIHBhdGguXG4gKlxuICogQHBhcmFtIHBhdGggdGhlIHBhdGggdG8gcmVtb3ZlIGRvdCBzZWdtZW50cyBmcm9tLlxuICogQHBhcmFtIGhhc0F1dGhvcml0eSB0cnVlIGlmIHRoZSBVUkwgaGFzIGFuIGF1dGhvcml0eSwgZmFsc2UgaWYgbm90LlxuICovXG5mdW5jdGlvbiBfcmVtb3ZlRG90U2VnbWVudHMocGF0aCwgaGFzQXV0aG9yaXR5KSB7XG4gIHZhciBydmFsID0gJyc7XG5cbiAgaWYocGF0aC5pbmRleE9mKCcvJykgPT09IDApIHtcbiAgICBydmFsID0gJy8nO1xuICB9XG5cbiAgLy8gUkZDIDM5ODYgNS4yLjQgKHJld29ya2VkKVxuICB2YXIgaW5wdXQgPSBwYXRoLnNwbGl0KCcvJyk7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgd2hpbGUoaW5wdXQubGVuZ3RoID4gMCkge1xuICAgIGlmKGlucHV0WzBdID09PSAnLicgfHwgKGlucHV0WzBdID09PSAnJyAmJiBpbnB1dC5sZW5ndGggPiAxKSkge1xuICAgICAgaW5wdXQuc2hpZnQoKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZihpbnB1dFswXSA9PT0gJy4uJykge1xuICAgICAgaW5wdXQuc2hpZnQoKTtcbiAgICAgIGlmKGhhc0F1dGhvcml0eSB8fFxuICAgICAgICAob3V0cHV0Lmxlbmd0aCA+IDAgJiYgb3V0cHV0W291dHB1dC5sZW5ndGggLSAxXSAhPT0gJy4uJykpIHtcbiAgICAgICAgb3V0cHV0LnBvcCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbGVhZGluZyByZWxhdGl2ZSBVUkwgJy4uJ1xuICAgICAgICBvdXRwdXQucHVzaCgnLi4nKTtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBvdXRwdXQucHVzaChpbnB1dC5zaGlmdCgpKTtcbiAgfVxuXG4gIHJldHVybiBydmFsICsgb3V0cHV0LmpvaW4oJy8nKTtcbn1cblxuaWYoX25vZGVqcykge1xuICAvLyB1c2Ugbm9kZSBkb2N1bWVudCBsb2FkZXIgYnkgZGVmYXVsdFxuICBqc29ubGQudXNlRG9jdW1lbnRMb2FkZXIoJ25vZGUnKTtcbn0gZWxzZSBpZih0eXBlb2YgWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnKSB7XG4gIC8vIHVzZSB4aHIgZG9jdW1lbnQgbG9hZGVyIGJ5IGRlZmF1bHRcbiAganNvbmxkLnVzZURvY3VtZW50TG9hZGVyKCd4aHInKTtcbn1cblxuaWYoX25vZGVqcykge1xuICBqc29ubGQudXNlID0gZnVuY3Rpb24oZXh0ZW5zaW9uKSB7XG4gICAgc3dpdGNoKGV4dGVuc2lvbikge1xuICAgICAgY2FzZSAncmVxdWVzdCc6XG4gICAgICAgIC8vIHVzZSBub2RlIEpTT04tTEQgcmVxdWVzdCBleHRlbnNpb25cbiAgICAgICAganNvbmxkLnJlcXVlc3QgPSByZXF1aXJlKCcuL3JlcXVlc3QnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgSnNvbkxkRXJyb3IoXG4gICAgICAgICAgJ1Vua25vd24gZXh0ZW5zaW9uLicsXG4gICAgICAgICAgJ2pzb25sZC5Vbmtub3duRXh0ZW5zaW9uJywge2V4dGVuc2lvbjogZXh0ZW5zaW9ufSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIGV4cG9zZSB2ZXJzaW9uXG4gIHZhciBfbW9kdWxlID0ge2V4cG9ydHM6IHt9LCBmaWxlbmFtZTogX19kaXJuYW1lfTtcbiAgcmVxdWlyZSgncGtnaW5mbycpKF9tb2R1bGUsICd2ZXJzaW9uJyk7XG4gIGpzb25sZC52ZXJzaW9uID0gX21vZHVsZS5leHBvcnRzLnZlcnNpb247XG59XG5cbi8vIGVuZCBvZiBqc29ubGQgQVBJIGZhY3RvcnlcbnJldHVybiBqc29ubGQ7XG59O1xuXG4vLyBleHRlcm5hbCBBUElzOlxuXG4vLyB1c2VkIHRvIGdlbmVyYXRlIGEgbmV3IGpzb25sZCBBUEkgaW5zdGFuY2VcbnZhciBmYWN0b3J5ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB3cmFwcGVyKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmYWN0b3J5KCk7XG4gIH0pO1xufTtcblxuaWYoIV9ub2RlanMgJiYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkpIHtcbiAgLy8gZXhwb3J0IEFNRCBBUElcbiAgZGVmaW5lKFtdLCBmdW5jdGlvbigpIHtcbiAgICAvLyBub3cgdGhhdCBtb2R1bGUgaXMgZGVmaW5lZCwgd3JhcCBtYWluIGpzb25sZCBBUEkgaW5zdGFuY2VcbiAgICB3cmFwcGVyKGZhY3RvcnkpO1xuICAgIHJldHVybiBmYWN0b3J5O1xuICB9KTtcbn0gZWxzZSB7XG4gIC8vIHdyYXAgdGhlIG1haW4ganNvbmxkIEFQSSBpbnN0YW5jZVxuICB3cmFwcGVyKGZhY3RvcnkpO1xuXG4gIGlmKHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nICYmXG4gICAgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBleHBvcnQgQ29tbW9uSlMvbm9kZWpzIEFQSVxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeTtcbiAgfVxuXG4gIGlmKF9icm93c2VyKSB7XG4gICAgLy8gZXhwb3J0IHNpbXBsZSBicm93c2VyIEFQSVxuICAgIGlmKHR5cGVvZiBqc29ubGQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBqc29ubGQgPSBqc29ubGRqcyA9IGZhY3Rvcnk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGpzb25sZGpzID0gZmFjdG9yeTtcbiAgICB9XG4gIH1cbn1cblxucmV0dXJuIGZhY3Rvcnk7XG5cbn0pKCk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwic2ZhdXVQXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxcIi8uLi9ub2RlX21vZHVsZXMvanNvbmxkL2pzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vamFrZWFyY2hpYmFsZC9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICAyLjAuMVxuICovXG5cbihmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGZ1bmN0aW9uICQkdXRpbHMkJG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nIHx8ICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeCAhPT0gbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkaXNGdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCR1dGlscyQkaXNNYXliZVRoZW5hYmxlKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeCAhPT0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgJCR1dGlscyQkX2lzQXJyYXk7XG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkpIHtcbiAgICAgICQkdXRpbHMkJF9pc0FycmF5ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICQkdXRpbHMkJF9pc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbiAgICB9XG5cbiAgICB2YXIgJCR1dGlscyQkaXNBcnJheSA9ICQkdXRpbHMkJF9pc0FycmF5O1xuICAgIHZhciAkJHV0aWxzJCRub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuICAgIGZ1bmN0aW9uICQkdXRpbHMkJEYoKSB7IH1cblxuICAgIHZhciAkJHV0aWxzJCRvX2NyZWF0ZSA9IChPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChvKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWNvbmQgYXJndW1lbnQgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBvICE9PSAnb2JqZWN0Jykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICAgICAgfVxuICAgICAgJCR1dGlscyQkRi5wcm90b3R5cGUgPSBvO1xuICAgICAgcmV0dXJuIG5ldyAkJHV0aWxzJCRGKCk7XG4gICAgfSk7XG5cbiAgICB2YXIgJCRhc2FwJCRsZW4gPSAwO1xuXG4gICAgdmFyICQkYXNhcCQkZGVmYXVsdCA9IGZ1bmN0aW9uIGFzYXAoY2FsbGJhY2ssIGFyZykge1xuICAgICAgJCRhc2FwJCRxdWV1ZVskJGFzYXAkJGxlbl0gPSBjYWxsYmFjaztcbiAgICAgICQkYXNhcCQkcXVldWVbJCRhc2FwJCRsZW4gKyAxXSA9IGFyZztcbiAgICAgICQkYXNhcCQkbGVuICs9IDI7XG4gICAgICBpZiAoJCRhc2FwJCRsZW4gPT09IDIpIHtcbiAgICAgICAgLy8gSWYgbGVuIGlzIDEsIHRoYXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHNjaGVkdWxlIGFuIGFzeW5jIGZsdXNoLlxuICAgICAgICAvLyBJZiBhZGRpdGlvbmFsIGNhbGxiYWNrcyBhcmUgcXVldWVkIGJlZm9yZSB0aGUgcXVldWUgaXMgZmx1c2hlZCwgdGhleVxuICAgICAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgJCRhc2FwJCRicm93c2VyR2xvYmFsID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHt9O1xuICAgIHZhciAkJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gJCRhc2FwJCRicm93c2VyR2xvYmFsLk11dGF0aW9uT2JzZXJ2ZXIgfHwgJCRhc2FwJCRicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG5cbiAgICAvLyB0ZXN0IGZvciB3ZWIgd29ya2VyIGJ1dCBub3QgaW4gSUUxMFxuICAgIHZhciAkJGFzYXAkJGlzV29ya2VyID0gdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIGltcG9ydFNjcmlwdHMgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4gICAgLy8gbm9kZVxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlTmV4dFRpY2soKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soJCRhc2FwJCRmbHVzaCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpIHtcbiAgICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICAgIHZhciBvYnNlcnZlciA9IG5ldyAkJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKCQkYXNhcCQkZmx1c2gpO1xuICAgICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyB3ZWIgd29ya2VyXG4gICAgZnVuY3Rpb24gJCRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9ICQkYXNhcCQkZmx1c2g7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJGFzYXAkJHVzZVNldFRpbWVvdXQoKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoJCRhc2FwJCRmbHVzaCwgMSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHZhciAkJGFzYXAkJHF1ZXVlID0gbmV3IEFycmF5KDEwMDApO1xuXG4gICAgZnVuY3Rpb24gJCRhc2FwJCRmbHVzaCgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgJCRhc2FwJCRsZW47IGkrPTIpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gJCRhc2FwJCRxdWV1ZVtpXTtcbiAgICAgICAgdmFyIGFyZyA9ICQkYXNhcCQkcXVldWVbaSsxXTtcblxuICAgICAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgICAgICQkYXNhcCQkcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICQkYXNhcCQkcXVldWVbaSsxXSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgJCRhc2FwJCRsZW4gPSAwO1xuICAgIH1cblxuICAgIHZhciAkJGFzYXAkJHNjaGVkdWxlRmx1c2g7XG5cbiAgICAvLyBEZWNpZGUgd2hhdCBhc3luYyBtZXRob2QgdG8gdXNlIHRvIHRyaWdnZXJpbmcgcHJvY2Vzc2luZyBvZiBxdWV1ZWQgY2FsbGJhY2tzOlxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYge30udG9TdHJpbmcuY2FsbChwcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZU5leHRUaWNrKCk7XG4gICAgfSBlbHNlIGlmICgkJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAkJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSAkJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgICB9IGVsc2UgaWYgKCQkYXNhcCQkaXNXb3JrZXIpIHtcbiAgICAgICQkYXNhcCQkc2NoZWR1bGVGbHVzaCA9ICQkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgJCRhc2FwJCRzY2hlZHVsZUZsdXNoID0gJCRhc2FwJCR1c2VTZXRUaW1lb3V0KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJG5vb3AoKSB7fVxuICAgIHZhciAkJCRpbnRlcm5hbCQkUEVORElORyAgID0gdm9pZCAwO1xuICAgIHZhciAkJCRpbnRlcm5hbCQkRlVMRklMTEVEID0gMTtcbiAgICB2YXIgJCQkaW50ZXJuYWwkJFJFSkVDVEVEICA9IDI7XG4gICAgdmFyICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUiA9IG5ldyAkJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKTtcblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRzZWxmRnVsbGZpbGxtZW50KCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoXCJZb3UgY2Fubm90IHJlc29sdmUgYSBwcm9taXNlIHdpdGggaXRzZWxmXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGdldFRoZW4ocHJvbWlzZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbjtcbiAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yID0gZXJyb3I7XG4gICAgICAgIHJldHVybiAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhlbi5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUsIHRoZW4pIHtcbiAgICAgICAkJGFzYXAkJGRlZmF1bHQoZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgICAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBlcnJvciA9ICQkJGludGVybmFsJCR0cnlUaGVuKHRoZW4sIHRoZW5hYmxlLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmIChzZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgIGlmIChzZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcblxuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSwgJ1NldHRsZTogJyArIChwcm9taXNlLl9sYWJlbCB8fCAnIHVua25vd24gcHJvbWlzZScpKTtcblxuICAgICAgICBpZiAoIXNlYWxlZCAmJiBlcnJvcikge1xuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0sIHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSkge1xuICAgICAgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAocHJvbWlzZS5fc3RhdGUgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZSh0aGVuYWJsZSwgdW5kZWZpbmVkLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKSB7XG4gICAgICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAkJCRpbnRlcm5hbCQkaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGhlbiA9ICQkJGludGVybmFsJCRnZXRUaGVuKG1heWJlVGhlbmFibGUpO1xuXG4gICAgICAgIGlmICh0aGVuID09PSAkJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IpIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsICQkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUi5lcnJvcik7XG4gICAgICAgIH0gZWxzZSBpZiAodGhlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJCR1dGlscyQkaXNGdW5jdGlvbih0aGVuKSkge1xuICAgICAgICAgICQkJGludGVybmFsJCRoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSk7XG4gICAgICB9IGVsc2UgaWYgKCQkdXRpbHMkJG9iamVjdE9yRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICQkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gICAgICBpZiAocHJvbWlzZS5fb25lcnJvcikge1xuICAgICAgICBwcm9taXNlLl9vbmVycm9yKHByb21pc2UuX3Jlc3VsdCk7XG4gICAgICB9XG5cbiAgICAgICQkJGludGVybmFsJCRwdWJsaXNoKHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09ICQkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuXG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSB2YWx1ZTtcbiAgICAgIHByb21pc2UuX3N0YXRlID0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRDtcblxuICAgICAgaWYgKHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCRhc2FwJCRkZWZhdWx0KCQkJGludGVybmFsJCRwdWJsaXNoLCBwcm9taXNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykgeyByZXR1cm47IH1cbiAgICAgIHByb21pc2UuX3N0YXRlID0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEO1xuICAgICAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuXG4gICAgICAkJGFzYXAkJGRlZmF1bHQoJCQkaW50ZXJuYWwkJHB1Ymxpc2hSZWplY3Rpb24sIHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgIHZhciBzdWJzY3JpYmVycyA9IHBhcmVudC5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgbGVuZ3RoID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gICAgICBwYXJlbnQuX29uZXJyb3IgPSBudWxsO1xuXG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGggKyAkJCRpbnRlcm5hbCQkRlVMRklMTEVEXSA9IG9uRnVsZmlsbG1lbnQ7XG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGggKyAkJCRpbnRlcm5hbCQkUkVKRUNURURdICA9IG9uUmVqZWN0aW9uO1xuXG4gICAgICBpZiAobGVuZ3RoID09PSAwICYmIHBhcmVudC5fc3RhdGUpIHtcbiAgICAgICAgJCRhc2FwJCRkZWZhdWx0KCQkJGludGVybmFsJCRwdWJsaXNoLCBwYXJlbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRwdWJsaXNoKHByb21pc2UpIHtcbiAgICAgIHZhciBzdWJzY3JpYmVycyA9IHByb21pc2UuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIHNldHRsZWQgPSBwcm9taXNlLl9zdGF0ZTtcblxuICAgICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm47IH1cblxuICAgICAgdmFyIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGNoaWxkID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggPSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpIHtcbiAgICAgIHRoaXMuZXJyb3IgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciAkJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SID0gbmV3ICQkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBlO1xuICAgICAgICByZXR1cm4gJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgcHJvbWlzZSwgY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdmFyIGhhc0NhbGxiYWNrID0gJCR1dGlscyQkaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICAgICAgdmFsdWUsIGVycm9yLCBzdWNjZWVkZWQsIGZhaWxlZDtcblxuICAgICAgaWYgKGhhc0NhbGxiYWNrKSB7XG4gICAgICAgIHZhbHVlID0gJCQkaW50ZXJuYWwkJHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpO1xuXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJCQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgICAgIGZhaWxlZCA9IHRydWU7XG4gICAgICAgICAgZXJyb3IgPSB2YWx1ZS5lcnJvcjtcbiAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgJCQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBkZXRhaWw7XG4gICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgLy8gbm9vcFxuICAgICAgfSBlbHNlIGlmIChoYXNDYWxsYmFjayAmJiBzdWNjZWVkZWQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChmYWlsZWQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSAkJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlcihmdW5jdGlvbiByZXNvbHZlUHJvbWlzZSh2YWx1ZSl7XG4gICAgICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbiByZWplY3RQcm9taXNlKHJlYXNvbikge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRlbnVtZXJhdG9yJCRtYWtlU2V0dGxlZFJlc3VsdChzdGF0ZSwgcG9zaXRpb24sIHZhbHVlKSB7XG4gICAgICBpZiAoc3RhdGUgPT09ICQkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdGF0ZTogJ2Z1bGZpbGxlZCcsXG4gICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN0YXRlOiAncmVqZWN0ZWQnLFxuICAgICAgICAgIHJlYXNvbjogdmFsdWVcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yKENvbnN0cnVjdG9yLCBpbnB1dCwgYWJvcnRPblJlamVjdCwgbGFiZWwpIHtcbiAgICAgIHRoaXMuX2luc3RhbmNlQ29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcbiAgICAgIHRoaXMucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuICAgICAgdGhpcy5fYWJvcnRPblJlamVjdCA9IGFib3J0T25SZWplY3Q7XG5cbiAgICAgIGlmICh0aGlzLl92YWxpZGF0ZUlucHV0KGlucHV0KSkge1xuICAgICAgICB0aGlzLl9pbnB1dCAgICAgPSBpbnB1dDtcbiAgICAgICAgdGhpcy5sZW5ndGggICAgID0gaW5wdXQubGVuZ3RoO1xuICAgICAgICB0aGlzLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgICAgdGhpcy5faW5pdCgpO1xuXG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmxlbmd0aCA9IHRoaXMubGVuZ3RoIHx8IDA7XG4gICAgICAgICAgdGhpcy5fZW51bWVyYXRlKCk7XG4gICAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgICAgJCQkaW50ZXJuYWwkJGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdCh0aGlzLnByb21pc2UsIHRoaXMuX3ZhbGlkYXRpb25FcnJvcigpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fdmFsaWRhdGVJbnB1dCA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICByZXR1cm4gJCR1dGlscyQkaXNBcnJheShpbnB1dCk7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl92YWxpZGF0aW9uRXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoJ0FycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheScpO1xuICAgIH07XG5cbiAgICAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fcmVzdWx0ID0gbmV3IEFycmF5KHRoaXMubGVuZ3RoKTtcbiAgICB9O1xuXG4gICAgdmFyICQkJGVudW1lcmF0b3IkJGRlZmF1bHQgPSAkJCRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yO1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2VudW1lcmF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxlbmd0aCAgPSB0aGlzLmxlbmd0aDtcbiAgICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuICAgICAgdmFyIGlucHV0ICAgPSB0aGlzLl9pbnB1dDtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORyAmJiBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5fZWFjaEVudHJ5KGlucHV0W2ldLCBpKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX2VhY2hFbnRyeSA9IGZ1bmN0aW9uKGVudHJ5LCBpKSB7XG4gICAgICB2YXIgYyA9IHRoaXMuX2luc3RhbmNlQ29uc3RydWN0b3I7XG4gICAgICBpZiAoJCR1dGlscyQkaXNNYXliZVRoZW5hYmxlKGVudHJ5KSkge1xuICAgICAgICBpZiAoZW50cnkuY29uc3RydWN0b3IgPT09IGMgJiYgZW50cnkuX3N0YXRlICE9PSAkJCRpbnRlcm5hbCQkUEVORElORykge1xuICAgICAgICAgIGVudHJ5Ll9vbmVycm9yID0gbnVsbDtcbiAgICAgICAgICB0aGlzLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl93aWxsU2V0dGxlQXQoYy5yZXNvbHZlKGVudHJ5KSwgaSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB0aGlzLl9tYWtlUmVzdWx0KCQkJGludGVybmFsJCRGVUxGSUxMRUQsIGksIGVudHJ5KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJCQkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3NldHRsZWRBdCA9IGZ1bmN0aW9uKHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG5cbiAgICAgICAgaWYgKHRoaXMuX2Fib3J0T25SZWplY3QgJiYgc3RhdGUgPT09ICQkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHRoaXMuX21ha2VSZXN1bHQoc3RhdGUsIGksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICQkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9tYWtlUmVzdWx0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcblxuICAgICQkJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbihwcm9taXNlLCBpKSB7XG4gICAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICAgICQkJGludGVybmFsJCRzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoJCQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgdmFsdWUpO1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdCgkJCRpbnRlcm5hbCQkUkVKRUNURUQsIGksIHJlYXNvbik7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyICQkcHJvbWlzZSRhbGwkJGRlZmF1bHQgPSBmdW5jdGlvbiBhbGwoZW50cmllcywgbGFiZWwpIHtcbiAgICAgIHJldHVybiBuZXcgJCQkZW51bWVyYXRvciQkZGVmYXVsdCh0aGlzLCBlbnRyaWVzLCB0cnVlIC8qIGFib3J0IG9uIHJlamVjdCAqLywgbGFiZWwpLnByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmFjZSQkZGVmYXVsdCA9IGZ1bmN0aW9uIHJhY2UoZW50cmllcywgbGFiZWwpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuXG4gICAgICBpZiAoISQkdXRpbHMkJGlzQXJyYXkoZW50cmllcykpIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuJykpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGxlbmd0aCA9IGVudHJpZXMubGVuZ3RoO1xuXG4gICAgICBmdW5jdGlvbiBvbkZ1bGZpbGxtZW50KHZhbHVlKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gb25SZWplY3Rpb24ocmVhc29uKSB7XG4gICAgICAgICQkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IHByb21pc2UuX3N0YXRlID09PSAkJCRpbnRlcm5hbCQkUEVORElORyAmJiBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgJCQkaW50ZXJuYWwkJHN1YnNjcmliZShDb25zdHJ1Y3Rvci5yZXNvbHZlKGVudHJpZXNbaV0pLCB1bmRlZmluZWQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcblxuICAgIHZhciAkJHByb21pc2UkcmVzb2x2ZSQkZGVmYXVsdCA9IGZ1bmN0aW9uIHJlc29sdmUob2JqZWN0LCBsYWJlbCkge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIGlmIChvYmplY3QgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcgJiYgb2JqZWN0LmNvbnN0cnVjdG9yID09PSBDb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgfVxuXG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcigkJCRpbnRlcm5hbCQkbm9vcCwgbGFiZWwpO1xuICAgICAgJCQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgb2JqZWN0KTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICB2YXIgJCRwcm9taXNlJHJlamVjdCQkZGVmYXVsdCA9IGZ1bmN0aW9uIHJlamVjdChyZWFzb24sIGxhYmVsKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKCQkJGludGVybmFsJCRub29wLCBsYWJlbCk7XG4gICAgICAkJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcHJvbWlzZSQkY291bnRlciA9IDA7XG5cbiAgICBmdW5jdGlvbiAkJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc05ldygpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7XG4gICAgfVxuXG4gICAgdmFyICQkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdCA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZTtcblxuICAgIC8qKlxuICAgICAgUHJvbWlzZSBvYmplY3RzIHJlcHJlc2VudCB0aGUgZXZlbnR1YWwgcmVzdWx0IG9mIGFuIGFzeW5jaHJvbm91cyBvcGVyYXRpb24uIFRoZVxuICAgICAgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCwgd2hpY2hcbiAgICAgIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNl4oCZcyBldmVudHVhbCB2YWx1ZSBvciB0aGUgcmVhc29uXG4gICAgICB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cblxuICAgICAgVGVybWlub2xvZ3lcbiAgICAgIC0tLS0tLS0tLS0tXG5cbiAgICAgIC0gYHByb21pc2VgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB3aXRoIGEgYHRoZW5gIG1ldGhvZCB3aG9zZSBiZWhhdmlvciBjb25mb3JtcyB0byB0aGlzIHNwZWNpZmljYXRpb24uXG4gICAgICAtIGB0aGVuYWJsZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyBhIGB0aGVuYCBtZXRob2QuXG4gICAgICAtIGB2YWx1ZWAgaXMgYW55IGxlZ2FsIEphdmFTY3JpcHQgdmFsdWUgKGluY2x1ZGluZyB1bmRlZmluZWQsIGEgdGhlbmFibGUsIG9yIGEgcHJvbWlzZSkuXG4gICAgICAtIGBleGNlcHRpb25gIGlzIGEgdmFsdWUgdGhhdCBpcyB0aHJvd24gdXNpbmcgdGhlIHRocm93IHN0YXRlbWVudC5cbiAgICAgIC0gYHJlYXNvbmAgaXMgYSB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aHkgYSBwcm9taXNlIHdhcyByZWplY3RlZC5cbiAgICAgIC0gYHNldHRsZWRgIHRoZSBmaW5hbCByZXN0aW5nIHN0YXRlIG9mIGEgcHJvbWlzZSwgZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuXG4gICAgICBBIHByb21pc2UgY2FuIGJlIGluIG9uZSBvZiB0aHJlZSBzdGF0ZXM6IHBlbmRpbmcsIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIFByb21pc2VzIHRoYXQgYXJlIGZ1bGZpbGxlZCBoYXZlIGEgZnVsZmlsbG1lbnQgdmFsdWUgYW5kIGFyZSBpbiB0aGUgZnVsZmlsbGVkXG4gICAgICBzdGF0ZS4gIFByb21pc2VzIHRoYXQgYXJlIHJlamVjdGVkIGhhdmUgYSByZWplY3Rpb24gcmVhc29uIGFuZCBhcmUgaW4gdGhlXG4gICAgICByZWplY3RlZCBzdGF0ZS4gIEEgZnVsZmlsbG1lbnQgdmFsdWUgaXMgbmV2ZXIgYSB0aGVuYWJsZS5cblxuICAgICAgUHJvbWlzZXMgY2FuIGFsc28gYmUgc2FpZCB0byAqcmVzb2x2ZSogYSB2YWx1ZS4gIElmIHRoaXMgdmFsdWUgaXMgYWxzbyBhXG4gICAgICBwcm9taXNlLCB0aGVuIHRoZSBvcmlnaW5hbCBwcm9taXNlJ3Mgc2V0dGxlZCBzdGF0ZSB3aWxsIG1hdGNoIHRoZSB2YWx1ZSdzXG4gICAgICBzZXR0bGVkIHN0YXRlLiAgU28gYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCByZWplY3RzIHdpbGxcbiAgICAgIGl0c2VsZiByZWplY3QsIGFuZCBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IGZ1bGZpbGxzIHdpbGxcbiAgICAgIGl0c2VsZiBmdWxmaWxsLlxuXG5cbiAgICAgIEJhc2ljIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tXG5cbiAgICAgIGBgYGpzXG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAvLyBvbiBzdWNjZXNzXG4gICAgICAgIHJlc29sdmUodmFsdWUpO1xuXG4gICAgICAgIC8vIG9uIGZhaWx1cmVcbiAgICAgICAgcmVqZWN0KHJlYXNvbik7XG4gICAgICB9KTtcblxuICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgLy8gb24gcmVqZWN0aW9uXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBZHZhbmNlZCBVc2FnZTpcbiAgICAgIC0tLS0tLS0tLS0tLS0tLVxuXG4gICAgICBQcm9taXNlcyBzaGluZSB3aGVuIGFic3RyYWN0aW5nIGF3YXkgYXN5bmNocm9ub3VzIGludGVyYWN0aW9ucyBzdWNoIGFzXG4gICAgICBgWE1MSHR0cFJlcXVlc3Rgcy5cblxuICAgICAgYGBganNcbiAgICAgIGZ1bmN0aW9uIGdldEpTT04odXJsKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBoYW5kbGVyO1xuICAgICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnanNvbic7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgeGhyLnNlbmQoKTtcblxuICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSB0aGlzLkRPTkUpIHtcbiAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRoaXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ2dldEpTT046IGAnICsgdXJsICsgJ2AgZmFpbGVkIHdpdGggc3RhdHVzOiBbJyArIHRoaXMuc3RhdHVzICsgJ10nKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZ2V0SlNPTignL3Bvc3RzLmpzb24nKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFVubGlrZSBjYWxsYmFja3MsIHByb21pc2VzIGFyZSBncmVhdCBjb21wb3NhYmxlIHByaW1pdGl2ZXMuXG5cbiAgICAgIGBgYGpzXG4gICAgICBQcm9taXNlLmFsbChbXG4gICAgICAgIGdldEpTT04oJy9wb3N0cycpLFxuICAgICAgICBnZXRKU09OKCcvY29tbWVudHMnKVxuICAgICAgXSkudGhlbihmdW5jdGlvbih2YWx1ZXMpe1xuICAgICAgICB2YWx1ZXNbMF0gLy8gPT4gcG9zdHNKU09OXG4gICAgICAgIHZhbHVlc1sxXSAvLyA9PiBjb21tZW50c0pTT05cblxuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQGNsYXNzIFByb21pc2VcbiAgICAgIEBwYXJhbSB7ZnVuY3Rpb259IHJlc29sdmVyXG4gICAgICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gICAgICBAY29uc3RydWN0b3JcbiAgICAqL1xuICAgIGZ1bmN0aW9uICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZShyZXNvbHZlcikge1xuICAgICAgdGhpcy5faWQgPSAkJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIrKztcbiAgICAgIHRoaXMuX3N0YXRlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fcmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgICAgaWYgKCQkJGludGVybmFsJCRub29wICE9PSByZXNvbHZlcikge1xuICAgICAgICBpZiAoISQkdXRpbHMkJGlzRnVuY3Rpb24ocmVzb2x2ZXIpKSB7XG4gICAgICAgICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc1Jlc29sdmVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlKSkge1xuICAgICAgICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNOZXcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZSh0aGlzLCByZXNvbHZlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLmFsbCA9ICQkcHJvbWlzZSRhbGwkJGRlZmF1bHQ7XG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJhY2UgPSAkJHByb21pc2UkcmFjZSQkZGVmYXVsdDtcbiAgICAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVzb2x2ZSA9ICQkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0O1xuICAgICQkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5yZWplY3QgPSAkJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0O1xuXG4gICAgJCRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnByb3RvdHlwZSA9IHtcbiAgICAgIGNvbnN0cnVjdG9yOiAkJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UsXG5cbiAgICAvKipcbiAgICAgIFRoZSBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLFxuICAgICAgd2hpY2ggcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGVcbiAgICAgIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgLy8gdXNlciBpcyBhdmFpbGFibGVcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBDaGFpbmluZ1xuICAgICAgLS0tLS0tLS1cblxuICAgICAgVGhlIHJldHVybiB2YWx1ZSBvZiBgdGhlbmAgaXMgaXRzZWxmIGEgcHJvbWlzZS4gIFRoaXMgc2Vjb25kLCAnZG93bnN0cmVhbSdcbiAgICAgIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmaXJzdCBwcm9taXNlJ3MgZnVsZmlsbG1lbnRcbiAgICAgIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiB1c2VyLm5hbWU7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHVzZXJOYW1lKSB7XG4gICAgICAgIC8vIElmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgdXNlck5hbWVgIHdpbGwgYmUgdGhlIHVzZXIncyBuYW1lLCBvdGhlcndpc2UgaXRcbiAgICAgICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gICAgICB9KTtcblxuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknKTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIGlmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgcmVhc29uYCB3aWxsIGJlICdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScuXG4gICAgICAgIC8vIElmIGBmaW5kVXNlcmAgcmVqZWN0ZWQsIGByZWFzb25gIHdpbGwgYmUgJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknLlxuICAgICAgfSk7XG4gICAgICBgYGBcbiAgICAgIElmIHRoZSBkb3duc3RyZWFtIHByb21pc2UgZG9lcyBub3Qgc3BlY2lmeSBhIHJlamVjdGlvbiBoYW5kbGVyLCByZWplY3Rpb24gcmVhc29ucyB3aWxsIGJlIHByb3BhZ2F0ZWQgZnVydGhlciBkb3duc3RyZWFtLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFzc2ltaWxhdGlvblxuICAgICAgLS0tLS0tLS0tLS0tXG5cbiAgICAgIFNvbWV0aW1lcyB0aGUgdmFsdWUgeW91IHdhbnQgdG8gcHJvcGFnYXRlIHRvIGEgZG93bnN0cmVhbSBwcm9taXNlIGNhbiBvbmx5IGJlXG4gICAgICByZXRyaWV2ZWQgYXN5bmNocm9ub3VzbHkuIFRoaXMgY2FuIGJlIGFjaGlldmVkIGJ5IHJldHVybmluZyBhIHByb21pc2UgaW4gdGhlXG4gICAgICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICAgICAgdW50aWwgdGhlIHJldHVybmVkIHByb21pc2UgaXMgc2V0dGxlZC4gVGhpcyBpcyBjYWxsZWQgKmFzc2ltaWxhdGlvbiouXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgICAgLy8gVGhlIHVzZXIncyBjb21tZW50cyBhcmUgbm93IGF2YWlsYWJsZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgSWYgdGhlIGFzc2ltbGlhdGVkIHByb21pc2UgcmVqZWN0cywgdGhlbiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgYWxzbyByZWplY3QuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCBmdWxmaWxscywgd2UnbGwgaGF2ZSB0aGUgdmFsdWUgaGVyZVxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIHJlamVjdHMsIHdlJ2xsIGhhdmUgdGhlIHJlYXNvbiBoZXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBTaW1wbGUgRXhhbXBsZVxuICAgICAgLS0tLS0tLS0tLS0tLS1cblxuICAgICAgU3luY2hyb25vdXMgRXhhbXBsZVxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcmVzdWx0O1xuXG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBmaW5kUmVzdWx0KCk7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH1cbiAgICAgIGBgYFxuXG4gICAgICBFcnJiYWNrIEV4YW1wbGVcblxuICAgICAgYGBganNcbiAgICAgIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgUHJvbWlzZSBFeGFtcGxlO1xuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBZHZhbmNlZCBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBhdXRob3IsIGJvb2tzO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhdXRob3IgPSBmaW5kQXV0aG9yKCk7XG4gICAgICAgIGJvb2tzICA9IGZpbmRCb29rc0J5QXV0aG9yKGF1dGhvcik7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH1cbiAgICAgIGBgYFxuXG4gICAgICBFcnJiYWNrIEV4YW1wbGVcblxuICAgICAgYGBganNcblxuICAgICAgZnVuY3Rpb24gZm91bmRCb29rcyhib29rcykge1xuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZhaWx1cmUocmVhc29uKSB7XG5cbiAgICAgIH1cblxuICAgICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGZvdW5kQm9va3MoYm9va3MpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICBmYWlsdXJlKHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgUHJvbWlzZSBFeGFtcGxlO1xuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICBmaW5kQXV0aG9yKCkuXG4gICAgICAgIHRoZW4oZmluZEJvb2tzQnlBdXRob3IpLlxuICAgICAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgICAgICAvLyBmb3VuZCBib29rc1xuICAgICAgfSkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgdGhlblxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25GdWxmaWxsZWRcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICAgKi9cbiAgICAgIHRoZW46IGZ1bmN0aW9uKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJEZVTEZJTExFRCAmJiAhb25GdWxmaWxsbWVudCB8fCBzdGF0ZSA9PT0gJCQkaW50ZXJuYWwkJFJFSkVDVEVEICYmICFvblJlamVjdGlvbikge1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoaWxkID0gbmV3IHRoaXMuY29uc3RydWN0b3IoJCQkaW50ZXJuYWwkJG5vb3ApO1xuICAgICAgICB2YXIgcmVzdWx0ID0gcGFyZW50Ll9yZXN1bHQ7XG5cbiAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzW3N0YXRlIC0gMV07XG4gICAgICAgICAgJCRhc2FwJCRkZWZhdWx0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcmVzdWx0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgIH0sXG5cbiAgICAvKipcbiAgICAgIGBjYXRjaGAgaXMgc2ltcGx5IHN1Z2FyIGZvciBgdGhlbih1bmRlZmluZWQsIG9uUmVqZWN0aW9uKWAgd2hpY2ggbWFrZXMgaXQgdGhlIHNhbWVcbiAgICAgIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBmaW5kQXV0aG9yKCl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGRuJ3QgZmluZCB0aGF0IGF1dGhvcicpO1xuICAgICAgfVxuXG4gICAgICAvLyBzeW5jaHJvbm91c1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmluZEF1dGhvcigpO1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH1cblxuICAgICAgLy8gYXN5bmMgd2l0aCBwcm9taXNlc1xuICAgICAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIGNhdGNoXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgJ2NhdGNoJzogZnVuY3Rpb24ob25SZWplY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciAkJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0ID0gZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgICB2YXIgbG9jYWw7XG5cbiAgICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsb2NhbCA9IGdsb2JhbDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmRvY3VtZW50KSB7XG4gICAgICAgIGxvY2FsID0gd2luZG93O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWwgPSBzZWxmO1xuICAgICAgfVxuXG4gICAgICB2YXIgZXM2UHJvbWlzZVN1cHBvcnQgPVxuICAgICAgICBcIlByb21pc2VcIiBpbiBsb2NhbCAmJlxuICAgICAgICAvLyBTb21lIG9mIHRoZXNlIG1ldGhvZHMgYXJlIG1pc3NpbmcgZnJvbVxuICAgICAgICAvLyBGaXJlZm94L0Nocm9tZSBleHBlcmltZW50YWwgaW1wbGVtZW50YXRpb25zXG4gICAgICAgIFwicmVzb2x2ZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJyZWplY3RcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwiYWxsXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcInJhY2VcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIC8vIE9sZGVyIHZlcnNpb24gb2YgdGhlIHNwZWMgaGFkIGEgcmVzb2x2ZXIgb2JqZWN0XG4gICAgICAgIC8vIGFzIHRoZSBhcmcgcmF0aGVyIHRoYW4gYSBmdW5jdGlvblxuICAgICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHJlc29sdmU7XG4gICAgICAgICAgbmV3IGxvY2FsLlByb21pc2UoZnVuY3Rpb24ocikgeyByZXNvbHZlID0gcjsgfSk7XG4gICAgICAgICAgcmV0dXJuICQkdXRpbHMkJGlzRnVuY3Rpb24ocmVzb2x2ZSk7XG4gICAgICAgIH0oKSk7XG5cbiAgICAgIGlmICghZXM2UHJvbWlzZVN1cHBvcnQpIHtcbiAgICAgICAgbG9jYWwuUHJvbWlzZSA9ICQkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZSA9IHtcbiAgICAgICdQcm9taXNlJzogJCRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0LFxuICAgICAgJ3BvbHlmaWxsJzogJCRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdFxuICAgIH07XG5cbiAgICAvKiBnbG9iYWwgZGVmaW5lOnRydWUgbW9kdWxlOnRydWUgd2luZG93OiB0cnVlICovXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lWydhbWQnXSkge1xuICAgICAgZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlOyB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZVsnZXhwb3J0cyddKSB7XG4gICAgICBtb2R1bGVbJ2V4cG9ydHMnXSA9IGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpc1snRVM2UHJvbWlzZSddID0gZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlO1xuICAgIH1cbn0pLmNhbGwodGhpcyk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInNmYXV1UFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChfX2Rpcm5hbWUpe1xuLypcbiAqIHBrZ2luZm8uanM6IFRvcC1sZXZlbCBpbmNsdWRlIGZvciB0aGUgcGtnaW5mbyBtb2R1bGVcbiAqXG4gKiAoQykgMjAxMSwgQ2hhcmxpZSBSb2JiaW5zXG4gKlxuICovXG4gXG52YXIgZnMgPSByZXF1aXJlKCdmcycpLFxuICAgIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbi8vXG4vLyAjIyMgZnVuY3Rpb24gcGtnaW5mbyAoW29wdGlvbnMsICdwcm9wZXJ0eScsICdwcm9wZXJ0eScgLi5dKVxuLy8gIyMjIyBAcG1vZHVsZSB7TW9kdWxlfSBQYXJlbnQgbW9kdWxlIHRvIHJlYWQgZnJvbS5cbi8vICMjIyMgQG9wdGlvbnMge09iamVjdHxBcnJheXxzdHJpbmd9ICoqT3B0aW9uYWwqKiBPcHRpb25zIHVzZWQgd2hlbiBleHBvc2luZyBwcm9wZXJ0aWVzLlxuLy8gIyMjIyBAYXJndW1lbnRzIHtzdHJpbmcuLi59ICoqT3B0aW9uYWwqKiBTcGVjaWZpZWQgcHJvcGVydGllcyB0byBleHBvc2UuXG4vLyBFeHBvc2VzIHByb3BlcnRpZXMgZnJvbSB0aGUgcGFja2FnZS5qc29uIGZpbGUgZm9yIHRoZSBwYXJlbnQgbW9kdWxlIG9uIFxuLy8gaXQncyBleHBvcnRzLiBWYWxpZCB1c2FnZTpcbi8vXG4vLyBgcmVxdWlyZSgncGtnaW5mbycpKClgXG4vL1xuLy8gYHJlcXVpcmUoJ3BrZ2luZm8nKSgndmVyc2lvbicsICdhdXRob3InKTtgXG4vL1xuLy8gYHJlcXVpcmUoJ3BrZ2luZm8nKShbJ3ZlcnNpb24nLCAnYXV0aG9yJ10pO2Bcbi8vXG4vLyBgcmVxdWlyZSgncGtnaW5mbycpKHsgaW5jbHVkZTogWyd2ZXJzaW9uJywgJ2F1dGhvciddIH0pO2Bcbi8vXG52YXIgcGtnaW5mbyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBtb2R1bGUsIG9wdGlvbnMpIHtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMikuZmlsdGVyKGZ1bmN0aW9uIChhcmcpIHtcbiAgICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG4gIH0pO1xuICBcbiAgLy9cbiAgLy8gKipQYXJzZSB2YXJpYWJsZSBhcmd1bWVudHMqKlxuICAvL1xuICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zKSkge1xuICAgIC8vXG4gICAgLy8gSWYgdGhlIG9wdGlvbnMgcGFzc2VkIGluIGlzIGFuIEFycmF5IGFzc3VtZSB0aGF0XG4gICAgLy8gaXQgaXMgdGhlIEFycmF5IG9mIHByb3BlcnRpZXMgdG8gZXhwb3NlIGZyb20gdGhlXG4gICAgLy8gb24gdGhlIHBhY2thZ2UuanNvbiBmaWxlIG9uIHRoZSBwYXJlbnQgbW9kdWxlLlxuICAgIC8vXG4gICAgb3B0aW9ucyA9IHsgaW5jbHVkZTogb3B0aW9ucyB9O1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJykge1xuICAgIC8vXG4gICAgLy8gT3RoZXJ3aXNlIGlmIHRoZSBmaXJzdCBhcmd1bWVudCBpcyBhIHN0cmluZywgdGhlblxuICAgIC8vIGFzc3VtZSB0aGF0IGl0IGlzIHRoZSBmaXJzdCBwcm9wZXJ0eSB0byBleHBvc2UgZnJvbVxuICAgIC8vIHRoZSBwYWNrYWdlLmpzb24gZmlsZSBvbiB0aGUgcGFyZW50IG1vZHVsZS5cbiAgICAvL1xuICAgIG9wdGlvbnMgPSB7IGluY2x1ZGU6IFtvcHRpb25zXSB9O1xuICB9XG4gIFxuICAvL1xuICAvLyAqKlNldHVwIGRlZmF1bHQgb3B0aW9ucyoqXG4gIC8vXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBcbiAgLy8gZW5zdXJlIHRoYXQgaW5jbHVkZXMgaGF2ZSBiZWVuIGRlZmluZWRcbiAgb3B0aW9ucy5pbmNsdWRlID0gb3B0aW9ucy5pbmNsdWRlIHx8IFtdO1xuICBcbiAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xuICAgIC8vXG4gICAgLy8gSWYgYWRkaXRpb25hbCBzdHJpbmcgYXJndW1lbnRzIGhhdmUgYmVlbiBwYXNzZWQgaW5cbiAgICAvLyB0aGVuIGFkZCB0aGVtIHRvIHRoZSBwcm9wZXJ0aWVzIHRvIGV4cG9zZSBvbiB0aGUgXG4gICAgLy8gcGFyZW50IG1vZHVsZS4gXG4gICAgLy9cbiAgICBvcHRpb25zLmluY2x1ZGUgPSBvcHRpb25zLmluY2x1ZGUuY29uY2F0KGFyZ3MpO1xuICB9XG4gIFxuICB2YXIgcGtnID0gcGtnaW5mby5yZWFkKHBtb2R1bGUsIG9wdGlvbnMuZGlyKS5wYWNrYWdlO1xuICBPYmplY3Qua2V5cyhwa2cpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIGlmIChvcHRpb25zLmluY2x1ZGUubGVuZ3RoID4gMCAmJiAhfm9wdGlvbnMuaW5jbHVkZS5pbmRleE9mKGtleSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFwbW9kdWxlLmV4cG9ydHNba2V5XSkge1xuICAgICAgcG1vZHVsZS5leHBvcnRzW2tleV0gPSBwa2dba2V5XTtcbiAgICB9XG4gIH0pO1xuICBcbiAgcmV0dXJuIHBrZ2luZm87XG59O1xuXG4vL1xuLy8gIyMjIGZ1bmN0aW9uIGZpbmQgKGRpcilcbi8vICMjIyMgQHBtb2R1bGUge01vZHVsZX0gUGFyZW50IG1vZHVsZSB0byByZWFkIGZyb20uXG4vLyAjIyMjIEBkaXIge3N0cmluZ30gKipPcHRpb25hbCoqIERpcmVjdG9yeSB0byBzdGFydCBzZWFyY2ggZnJvbS5cbi8vIFNlYXJjaGVzIHVwIHRoZSBkaXJlY3RvcnkgdHJlZSBmcm9tIGBkaXJgIHVudGlsIGl0IGZpbmRzIGEgZGlyZWN0b3J5XG4vLyB3aGljaCBjb250YWlucyBhIGBwYWNrYWdlLmpzb25gIGZpbGUuIFxuLy9cbnBrZ2luZm8uZmluZCA9IGZ1bmN0aW9uIChwbW9kdWxlLCBkaXIpIHtcbiAgaWYgKCEgZGlyKSB7XG4gICAgZGlyID0gcGF0aC5kaXJuYW1lKHBtb2R1bGUuZmlsZW5hbWUpO1xuICB9XG4gIFxuICB2YXIgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIpO1xuICBcbiAgaWYgKH5maWxlcy5pbmRleE9mKCdwYWNrYWdlLmpzb24nKSkge1xuICAgIHJldHVybiBwYXRoLmpvaW4oZGlyLCAncGFja2FnZS5qc29uJyk7XG4gIH1cbiAgXG4gIGlmIChkaXIgPT09ICcvJykge1xuICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgcGFja2FnZS5qc29uIHVwIGZyb206ICcgKyBkaXIpO1xuICB9XG4gIGVsc2UgaWYgKCFkaXIgfHwgZGlyID09PSAnLicpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kIHBhY2thZ2UuanNvbiBmcm9tIHVuc3BlY2lmaWVkIGRpcmVjdG9yeScpO1xuICB9XG4gIFxuICByZXR1cm4gcGtnaW5mby5maW5kKHBtb2R1bGUsIHBhdGguZGlybmFtZShkaXIpKTtcbn07XG5cbi8vXG4vLyAjIyMgZnVuY3Rpb24gcmVhZCAocG1vZHVsZSwgZGlyKVxuLy8gIyMjIyBAcG1vZHVsZSB7TW9kdWxlfSBQYXJlbnQgbW9kdWxlIHRvIHJlYWQgZnJvbS5cbi8vICMjIyMgQGRpciB7c3RyaW5nfSAqKk9wdGlvbmFsKiogRGlyZWN0b3J5IHRvIHN0YXJ0IHNlYXJjaCBmcm9tLlxuLy8gU2VhcmNoZXMgdXAgdGhlIGRpcmVjdG9yeSB0cmVlIGZyb20gYGRpcmAgdW50aWwgaXQgZmluZHMgYSBkaXJlY3Rvcnlcbi8vIHdoaWNoIGNvbnRhaW5zIGEgYHBhY2thZ2UuanNvbmAgZmlsZSBhbmQgcmV0dXJucyB0aGUgcGFja2FnZSBpbmZvcm1hdGlvbi5cbi8vXG5wa2dpbmZvLnJlYWQgPSBmdW5jdGlvbiAocG1vZHVsZSwgZGlyKSB7IFxuICBkaXIgPSBwa2dpbmZvLmZpbmQocG1vZHVsZSwgZGlyKTtcbiAgXG4gIHZhciBkYXRhID0gZnMucmVhZEZpbGVTeW5jKGRpcikudG9TdHJpbmcoKTtcbiAgICAgIFxuICByZXR1cm4ge1xuICAgIGRpcjogZGlyLCBcbiAgICBwYWNrYWdlOiBKU09OLnBhcnNlKGRhdGEpXG4gIH07XG59O1xuXG4vL1xuLy8gQ2FsbCBgcGtnaW5mb2Agb24gdGhpcyBtb2R1bGUgYW5kIGV4cG9zZSB2ZXJzaW9uLlxuLy9cbnBrZ2luZm8obW9kdWxlLCB7XG4gIGRpcjogX19kaXJuYW1lLFxuICBpbmNsdWRlOiBbJ3ZlcnNpb24nXSxcbiAgdGFyZ2V0OiBwa2dpbmZvXG59KTtcbn0pLmNhbGwodGhpcyxcIi8uLi9ub2RlX21vZHVsZXMvanNvbmxkL25vZGVfbW9kdWxlcy9wa2dpbmZvL2xpYlwiKSIsIi8vICAgICBVbmRlcnNjb3JlLmpzIDEuOC4zXG4vLyAgICAgaHR0cDovL3VuZGVyc2NvcmVqcy5vcmdcbi8vICAgICAoYykgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4vLyAgICAgVW5kZXJzY29yZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuKGZ1bmN0aW9uKCkge1xuXG4gIC8vIEJhc2VsaW5lIHNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgaW4gdGhlIGJyb3dzZXIsIG9yIGBleHBvcnRzYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgdG9TdHJpbmcgICAgICAgICA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgIGhhc093blByb3BlcnR5ICAgPSBPYmpQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvLyBBbGwgKipFQ01BU2NyaXB0IDUqKiBuYXRpdmUgZnVuY3Rpb24gaW1wbGVtZW50YXRpb25zIHRoYXQgd2UgaG9wZSB0byB1c2VcbiAgLy8gYXJlIGRlY2xhcmVkIGhlcmUuXG4gIHZhclxuICAgIG5hdGl2ZUlzQXJyYXkgICAgICA9IEFycmF5LmlzQXJyYXksXG4gICAgbmF0aXZlS2V5cyAgICAgICAgID0gT2JqZWN0LmtleXMsXG4gICAgbmF0aXZlQmluZCAgICAgICAgID0gRnVuY1Byb3RvLmJpbmQsXG4gICAgbmF0aXZlQ3JlYXRlICAgICAgID0gT2JqZWN0LmNyZWF0ZTtcblxuICAvLyBOYWtlZCBmdW5jdGlvbiByZWZlcmVuY2UgZm9yIHN1cnJvZ2F0ZS1wcm90b3R5cGUtc3dhcHBpbmcuXG4gIHZhciBDdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdC5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXztcbiAgICB9XG4gICAgZXhwb3J0cy5fID0gXztcbiAgfSBlbHNlIHtcbiAgICByb290Ll8gPSBfO1xuICB9XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uLlxuICBfLlZFUlNJT04gPSAnMS44LjMnO1xuXG4gIC8vIEludGVybmFsIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhbiBlZmZpY2llbnQgKGZvciBjdXJyZW50IGVuZ2luZXMpIHZlcnNpb25cbiAgLy8gb2YgdGhlIHBhc3NlZC1pbiBjYWxsYmFjaywgdG8gYmUgcmVwZWF0ZWRseSBhcHBsaWVkIGluIG90aGVyIFVuZGVyc2NvcmVcbiAgLy8gZnVuY3Rpb25zLlxuICB2YXIgb3B0aW1pemVDYiA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQsIGFyZ0NvdW50KSB7XG4gICAgaWYgKGNvbnRleHQgPT09IHZvaWQgMCkgcmV0dXJuIGZ1bmM7XG4gICAgc3dpdGNoIChhcmdDb3VudCA9PSBudWxsID8gMyA6IGFyZ0NvdW50KSB7XG4gICAgICBjYXNlIDE6IHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIHZhbHVlKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDI6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgb3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSwgb3RoZXIpO1xuICAgICAgfTtcbiAgICAgIGNhc2UgMzogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICB9O1xuICAgICAgY2FzZSA0OiByZXR1cm4gZnVuY3Rpb24oYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEEgbW9zdGx5LWludGVybmFsIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGNhbGxiYWNrcyB0aGF0IGNhbiBiZSBhcHBsaWVkXG4gIC8vIHRvIGVhY2ggZWxlbWVudCBpbiBhIGNvbGxlY3Rpb24sIHJldHVybmluZyB0aGUgZGVzaXJlZCByZXN1bHQg4oCUIGVpdGhlclxuICAvLyBpZGVudGl0eSwgYW4gYXJiaXRyYXJ5IGNhbGxiYWNrLCBhIHByb3BlcnR5IG1hdGNoZXIsIG9yIGEgcHJvcGVydHkgYWNjZXNzb3IuXG4gIHZhciBjYiA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gXy5pZGVudGl0eTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkgcmV0dXJuIG9wdGltaXplQ2IodmFsdWUsIGNvbnRleHQsIGFyZ0NvdW50KTtcbiAgICBpZiAoXy5pc09iamVjdCh2YWx1ZSkpIHJldHVybiBfLm1hdGNoZXIodmFsdWUpO1xuICAgIHJldHVybiBfLnByb3BlcnR5KHZhbHVlKTtcbiAgfTtcbiAgXy5pdGVyYXRlZSA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGNiKHZhbHVlLCBjb250ZXh0LCBJbmZpbml0eSk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFzc2lnbmVyIGZ1bmN0aW9ucy5cbiAgdmFyIGNyZWF0ZUFzc2lnbmVyID0gZnVuY3Rpb24oa2V5c0Z1bmMsIHVuZGVmaW5lZE9ubHkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIGlmIChsZW5ndGggPCAyIHx8IG9iaiA9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgICAgZm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2luZGV4XSxcbiAgICAgICAgICAgIGtleXMgPSBrZXlzRnVuYyhzb3VyY2UpLFxuICAgICAgICAgICAgbCA9IGtleXMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgIGlmICghdW5kZWZpbmVkT25seSB8fCBvYmpba2V5XSA9PT0gdm9pZCAwKSBvYmpba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGEgbmV3IG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20gYW5vdGhlci5cbiAgdmFyIGJhc2VDcmVhdGUgPSBmdW5jdGlvbihwcm90b3R5cGUpIHtcbiAgICBpZiAoIV8uaXNPYmplY3QocHJvdG90eXBlKSkgcmV0dXJuIHt9O1xuICAgIGlmIChuYXRpdmVDcmVhdGUpIHJldHVybiBuYXRpdmVDcmVhdGUocHJvdG90eXBlKTtcbiAgICBDdG9yLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IEN0b3I7XG4gICAgQ3Rvci5wcm90b3R5cGUgPSBudWxsO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgdmFyIHByb3BlcnR5ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiA9PSBudWxsID8gdm9pZCAwIDogb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBIZWxwZXIgZm9yIGNvbGxlY3Rpb24gbWV0aG9kcyB0byBkZXRlcm1pbmUgd2hldGhlciBhIGNvbGxlY3Rpb25cbiAgLy8gc2hvdWxkIGJlIGl0ZXJhdGVkIGFzIGFuIGFycmF5IG9yIGFzIGFuIG9iamVjdFxuICAvLyBSZWxhdGVkOiBodHRwOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy10b2xlbmd0aFxuICAvLyBBdm9pZHMgYSB2ZXJ5IG5hc3R5IGlPUyA4IEpJVCBidWcgb24gQVJNLTY0LiAjMjA5NFxuICB2YXIgTUFYX0FSUkFZX0lOREVYID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgdmFyIGdldExlbmd0aCA9IHByb3BlcnR5KCdsZW5ndGgnKTtcbiAgdmFyIGlzQXJyYXlMaWtlID0gZnVuY3Rpb24oY29sbGVjdGlvbikge1xuICAgIHZhciBsZW5ndGggPSBnZXRMZW5ndGgoY29sbGVjdGlvbik7XG4gICAgcmV0dXJuIHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicgJiYgbGVuZ3RoID49IDAgJiYgbGVuZ3RoIDw9IE1BWF9BUlJBWV9JTkRFWDtcbiAgfTtcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIHJhdyBvYmplY3RzIGluIGFkZGl0aW9uIHRvIGFycmF5LWxpa2VzLiBUcmVhdHMgYWxsXG4gIC8vIHNwYXJzZSBhcnJheS1saWtlcyBhcyBpZiB0aGV5IHdlcmUgZGVuc2UuXG4gIF8uZWFjaCA9IF8uZm9yRWFjaCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IG9wdGltaXplQ2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBpLCBsZW5ndGg7XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHtcbiAgICAgIGZvciAoaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVyYXRlZShvYmpbaV0sIGksIG9iaik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGl0ZXJhdGVlKG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdGVlIHRvIGVhY2ggZWxlbWVudC5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSAhaXNBcnJheUxpa2Uob2JqKSAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgIHJlc3VsdHMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICByZXN1bHRzW2luZGV4XSA9IGl0ZXJhdGVlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgcmVkdWNpbmcgZnVuY3Rpb24gaXRlcmF0aW5nIGxlZnQgb3IgcmlnaHQuXG4gIGZ1bmN0aW9uIGNyZWF0ZVJlZHVjZShkaXIpIHtcbiAgICAvLyBPcHRpbWl6ZWQgaXRlcmF0b3IgZnVuY3Rpb24gYXMgdXNpbmcgYXJndW1lbnRzLmxlbmd0aFxuICAgIC8vIGluIHRoZSBtYWluIGZ1bmN0aW9uIHdpbGwgZGVvcHRpbWl6ZSB0aGUsIHNlZSAjMTk5MS5cbiAgICBmdW5jdGlvbiBpdGVyYXRvcihvYmosIGl0ZXJhdGVlLCBtZW1vLCBrZXlzLCBpbmRleCwgbGVuZ3RoKSB7XG4gICAgICBmb3IgKDsgaW5kZXggPj0gMCAmJiBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gZGlyKSB7XG4gICAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRlZShtZW1vLCBvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKGl0ZXJhdGVlLCBjb250ZXh0LCA0KTtcbiAgICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgICAgaW5kZXggPSBkaXIgPiAwID8gMCA6IGxlbmd0aCAtIDE7XG4gICAgICAvLyBEZXRlcm1pbmUgdGhlIGluaXRpYWwgdmFsdWUgaWYgbm9uZSBpcyBwcm92aWRlZC5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICBtZW1vID0gb2JqW2tleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4XTtcbiAgICAgICAgaW5kZXggKz0gZGlyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdG9yKG9iaiwgaXRlcmF0ZWUsIG1lbW8sIGtleXMsIGluZGV4LCBsZW5ndGgpO1xuICAgIH07XG4gIH1cblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuXG4gIF8ucmVkdWNlID0gXy5mb2xkbCA9IF8uaW5qZWN0ID0gY3JlYXRlUmVkdWNlKDEpO1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICBfLnJlZHVjZVJpZ2h0ID0gXy5mb2xkciA9IGNyZWF0ZVJlZHVjZSgtMSk7XG5cbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LiBBbGlhc2VkIGFzIGBkZXRlY3RgLlxuICBfLmZpbmQgPSBfLmRldGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIGtleTtcbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSkge1xuICAgICAga2V5ID0gXy5maW5kSW5kZXgob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBrZXkgPSBfLmZpbmRLZXkob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIH1cbiAgICBpZiAoa2V5ICE9PSB2b2lkIDAgJiYga2V5ICE9PSAtMSkgcmV0dXJuIG9ialtrZXldO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgcHJlZGljYXRlID0gY2IocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUodmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5uZWdhdGUoY2IocHJlZGljYXRlKSksIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIGFsbCBvZiB0aGUgZWxlbWVudHMgbWF0Y2ggYSB0cnV0aCB0ZXN0LlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSAhaXNBcnJheUxpa2Uob2JqKSAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgdmFyIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgIGlmICghcHJlZGljYXRlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIG9iamVjdCBtYXRjaGVzIGEgdHJ1dGggdGVzdC5cbiAgLy8gQWxpYXNlZCBhcyBgYW55YC5cbiAgXy5zb21lID0gXy5hbnkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSAhaXNBcnJheUxpa2Uob2JqKSAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgdmFyIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgIGlmIChwcmVkaWNhdGUob2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gaXRlbSAodXNpbmcgYD09PWApLlxuICAvLyBBbGlhc2VkIGFzIGBpbmNsdWRlc2AgYW5kIGBpbmNsdWRlYC5cbiAgXy5jb250YWlucyA9IF8uaW5jbHVkZXMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIGl0ZW0sIGZyb21JbmRleCwgZ3VhcmQpIHtcbiAgICBpZiAoIWlzQXJyYXlMaWtlKG9iaikpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgaWYgKHR5cGVvZiBmcm9tSW5kZXggIT0gJ251bWJlcicgfHwgZ3VhcmQpIGZyb21JbmRleCA9IDA7XG4gICAgcmV0dXJuIF8uaW5kZXhPZihvYmosIGl0ZW0sIGZyb21JbmRleCkgPj0gMDtcbiAgfTtcblxuICAvLyBJbnZva2UgYSBtZXRob2QgKHdpdGggYXJndW1lbnRzKSBvbiBldmVyeSBpdGVtIGluIGEgY29sbGVjdGlvbi5cbiAgXy5pbnZva2UgPSBmdW5jdGlvbihvYmosIG1ldGhvZCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBpc0Z1bmMgPSBfLmlzRnVuY3Rpb24obWV0aG9kKTtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdmFyIGZ1bmMgPSBpc0Z1bmMgPyBtZXRob2QgOiB2YWx1ZVttZXRob2RdO1xuICAgICAgcmV0dXJuIGZ1bmMgPT0gbnVsbCA/IGZ1bmMgOiBmdW5jLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBfLnByb3BlcnR5KGtleSkpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm1hdGNoZXIoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbmQob2JqLCBfLm1hdGNoZXIoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWF4ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSAtSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IC1JbmZpbml0eSxcbiAgICAgICAgdmFsdWUsIGNvbXB1dGVkO1xuICAgIGlmIChpdGVyYXRlZSA9PSBudWxsICYmIG9iaiAhPSBudWxsKSB7XG4gICAgICBvYmogPSBpc0FycmF5TGlrZShvYmopID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBvYmpbaV07XG4gICAgICAgIGlmICh2YWx1ZSA+IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgICAgaWYgKGNvbXB1dGVkID4gbGFzdENvbXB1dGVkIHx8IGNvbXB1dGVkID09PSAtSW5maW5pdHkgJiYgcmVzdWx0ID09PSAtSW5maW5pdHkpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtaW5pbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1pbiA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0gSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IEluZmluaXR5LFxuICAgICAgICB2YWx1ZSwgY29tcHV0ZWQ7XG4gICAgaWYgKGl0ZXJhdGVlID09IG51bGwgJiYgb2JqICE9IG51bGwpIHtcbiAgICAgIG9iaiA9IGlzQXJyYXlMaWtlKG9iaikgPyBvYmogOiBfLnZhbHVlcyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZSA9IG9ialtpXTtcbiAgICAgICAgaWYgKHZhbHVlIDwgcmVzdWx0KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgICBpZiAoY29tcHV0ZWQgPCBsYXN0Q29tcHV0ZWQgfHwgY29tcHV0ZWQgPT09IEluZmluaXR5ICYmIHJlc3VsdCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhIGNvbGxlY3Rpb24sIHVzaW5nIHRoZSBtb2Rlcm4gdmVyc2lvbiBvZiB0aGVcbiAgLy8gW0Zpc2hlci1ZYXRlcyBzaHVmZmxlXShodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Zpc2hlcuKAk1lhdGVzX3NodWZmbGUpLlxuICBfLnNodWZmbGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc2V0ID0gaXNBcnJheUxpa2Uob2JqKSA/IG9iaiA6IF8udmFsdWVzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IHNldC5sZW5ndGg7XG4gICAgdmFyIHNodWZmbGVkID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDAsIHJhbmQ7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oMCwgaW5kZXgpO1xuICAgICAgaWYgKHJhbmQgIT09IGluZGV4KSBzaHVmZmxlZFtpbmRleF0gPSBzaHVmZmxlZFtyYW5kXTtcbiAgICAgIHNodWZmbGVkW3JhbmRdID0gc2V0W2luZGV4XTtcbiAgICB9XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9O1xuXG4gIC8vIFNhbXBsZSAqKm4qKiByYW5kb20gdmFsdWVzIGZyb20gYSBjb2xsZWN0aW9uLlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSB7XG4gICAgICBpZiAoIWlzQXJyYXlMaWtlKG9iaikpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgICByZXR1cm4gb2JqW18ucmFuZG9tKG9iai5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIHJldHVybiBfLnNodWZmbGUob2JqKS5zbGljZSgwLCBNYXRoLm1heCgwLCBuKSk7XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdGVlLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvcikge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgICBiZWhhdmlvcihyZXN1bHQsIHZhbHVlLCBrZXkpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgaWYgKF8uaGFzKHJlc3VsdCwga2V5KSkgcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSk7IGVsc2UgcmVzdWx0W2tleV0gPSBbdmFsdWVdO1xuICB9KTtcblxuICAvLyBJbmRleGVzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24sIHNpbWlsYXIgdG8gYGdyb3VwQnlgLCBidXQgZm9yXG4gIC8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZS5cbiAgXy5pbmRleEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgfSk7XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIGlmIChfLmhhcyhyZXN1bHQsIGtleSkpIHJlc3VsdFtrZXldKys7IGVsc2UgcmVzdWx0W2tleV0gPSAxO1xuICB9KTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSkgcmV0dXJuIF8ubWFwKG9iaiwgXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIF8udmFsdWVzKG9iaik7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gYW4gb2JqZWN0LlxuICBfLnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiAwO1xuICAgIHJldHVybiBpc0FycmF5TGlrZShvYmopID8gb2JqLmxlbmd0aCA6IF8ua2V5cyhvYmopLmxlbmd0aDtcbiAgfTtcblxuICAvLyBTcGxpdCBhIGNvbGxlY3Rpb24gaW50byB0d28gYXJyYXlzOiBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIHNhdGlzZnkgdGhlIGdpdmVuXG4gIC8vIHByZWRpY2F0ZSwgYW5kIG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgZG8gbm90IHNhdGlzZnkgdGhlIHByZWRpY2F0ZS5cbiAgXy5wYXJ0aXRpb24gPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIHBhc3MgPSBbXSwgZmFpbCA9IFtdO1xuICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iaikge1xuICAgICAgKHByZWRpY2F0ZSh2YWx1ZSwga2V5LCBvYmopID8gcGFzcyA6IGZhaWwpLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiBbcGFzcywgZmFpbF07XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHJldHVybiBhcnJheVswXTtcbiAgICByZXR1cm4gXy5pbml0aWFsKGFycmF5LCBhcnJheS5sZW5ndGggLSBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIE1hdGgubWF4KDAsIGFycmF5Lmxlbmd0aCAtIChuID09IG51bGwgfHwgZ3VhcmQgPyAxIDogbikpKTtcbiAgfTtcblxuICAvLyBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgbGFzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHJldHVybiBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gXy5yZXN0KGFycmF5LCBNYXRoLm1heCgwLCBhcnJheS5sZW5ndGggLSBuKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBuID09IG51bGwgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBzdHJpY3QsIHN0YXJ0SW5kZXgpIHtcbiAgICB2YXIgb3V0cHV0ID0gW10sIGlkeCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0SW5kZXggfHwgMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGlucHV0KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdmFsdWUgPSBpbnB1dFtpXTtcbiAgICAgIGlmIChpc0FycmF5TGlrZSh2YWx1ZSkgJiYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpKSB7XG4gICAgICAgIC8vZmxhdHRlbiBjdXJyZW50IGxldmVsIG9mIGFycmF5IG9yIGFyZ3VtZW50cyBvYmplY3RcbiAgICAgICAgaWYgKCFzaGFsbG93KSB2YWx1ZSA9IGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIHN0cmljdCk7XG4gICAgICAgIHZhciBqID0gMCwgbGVuID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICBvdXRwdXQubGVuZ3RoICs9IGxlbjtcbiAgICAgICAgd2hpbGUgKGogPCBsZW4pIHtcbiAgICAgICAgICBvdXRwdXRbaWR4KytdID0gdmFsdWVbaisrXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghc3RyaWN0KSB7XG4gICAgICAgIG91dHB1dFtpZHgrK10gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBGbGF0dGVuIG91dCBhbiBhcnJheSwgZWl0aGVyIHJlY3Vyc2l2ZWx5IChieSBkZWZhdWx0KSwgb3IganVzdCBvbmUgbGV2ZWwuXG4gIF8uZmxhdHRlbiA9IGZ1bmN0aW9uKGFycmF5LCBzaGFsbG93KSB7XG4gICAgcmV0dXJuIGZsYXR0ZW4oYXJyYXksIHNoYWxsb3csIGZhbHNlKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSB2ZXJzaW9uIG9mIHRoZSBhcnJheSB0aGF0IGRvZXMgbm90IGNvbnRhaW4gdGhlIHNwZWNpZmllZCB2YWx1ZShzKS5cbiAgXy53aXRob3V0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5kaWZmZXJlbmNlKGFycmF5LCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYSBkdXBsaWNhdGUtZnJlZSB2ZXJzaW9uIG9mIHRoZSBhcnJheS4gSWYgdGhlIGFycmF5IGhhcyBhbHJlYWR5XG4gIC8vIGJlZW4gc29ydGVkLCB5b3UgaGF2ZSB0aGUgb3B0aW9uIG9mIHVzaW5nIGEgZmFzdGVyIGFsZ29yaXRobS5cbiAgLy8gQWxpYXNlZCBhcyBgdW5pcXVlYC5cbiAgXy51bmlxID0gXy51bmlxdWUgPSBmdW5jdGlvbihhcnJheSwgaXNTb3J0ZWQsIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKCFfLmlzQm9vbGVhbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRlZTtcbiAgICAgIGl0ZXJhdGVlID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoaXRlcmF0ZWUgIT0gbnVsbCkgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChhcnJheSk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gYXJyYXlbaV0sXG4gICAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSA/IGl0ZXJhdGVlKHZhbHVlLCBpLCBhcnJheSkgOiB2YWx1ZTtcbiAgICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgICBpZiAoIWkgfHwgc2VlbiAhPT0gY29tcHV0ZWQpIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgc2VlbiA9IGNvbXB1dGVkO1xuICAgICAgfSBlbHNlIGlmIChpdGVyYXRlZSkge1xuICAgICAgICBpZiAoIV8uY29udGFpbnMoc2VlbiwgY29tcHV0ZWQpKSB7XG4gICAgICAgICAgc2Vlbi5wdXNoKGNvbXB1dGVkKTtcbiAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIV8uY29udGFpbnMocmVzdWx0LCB2YWx1ZSkpIHtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoZmxhdHRlbihhcmd1bWVudHMsIHRydWUsIHRydWUpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgZXZlcnkgaXRlbSBzaGFyZWQgYmV0d2VlbiBhbGwgdGhlXG4gIC8vIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8uaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGFyZ3NMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpdGVtID0gYXJyYXlbaV07XG4gICAgICBpZiAoXy5jb250YWlucyhyZXN1bHQsIGl0ZW0pKSBjb250aW51ZTtcbiAgICAgIGZvciAodmFyIGogPSAxOyBqIDwgYXJnc0xlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghXy5jb250YWlucyhhcmd1bWVudHNbal0sIGl0ZW0pKSBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChqID09PSBhcmdzTGVuZ3RoKSByZXN1bHQucHVzaChpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBmbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgdHJ1ZSwgMSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICByZXR1cm4gIV8uY29udGFpbnMocmVzdCwgdmFsdWUpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8udW56aXAoYXJndW1lbnRzKTtcbiAgfTtcblxuICAvLyBDb21wbGVtZW50IG9mIF8uemlwLiBVbnppcCBhY2NlcHRzIGFuIGFycmF5IG9mIGFycmF5cyBhbmQgZ3JvdXBzXG4gIC8vIGVhY2ggYXJyYXkncyBlbGVtZW50cyBvbiBzaGFyZWQgaW5kaWNlc1xuICBfLnVuemlwID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgbGVuZ3RoID0gYXJyYXkgJiYgXy5tYXgoYXJyYXksIGdldExlbmd0aCkubGVuZ3RoIHx8IDA7XG4gICAgdmFyIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICByZXN1bHRbaW5kZXhdID0gXy5wbHVjayhhcnJheSwgaW5kZXgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIENvbnZlcnRzIGxpc3RzIGludG8gb2JqZWN0cy4gUGFzcyBlaXRoZXIgYSBzaW5nbGUgYXJyYXkgb2YgYFtrZXksIHZhbHVlXWBcbiAgLy8gcGFpcnMsIG9yIHR3byBwYXJhbGxlbCBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoIC0tIG9uZSBvZiBrZXlzLCBhbmQgb25lIG9mXG4gIC8vIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgXy5vYmplY3QgPSBmdW5jdGlvbihsaXN0LCB2YWx1ZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChsaXN0KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldXSA9IHZhbHVlc1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldWzBdXSA9IGxpc3RbaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gR2VuZXJhdG9yIGZ1bmN0aW9uIHRvIGNyZWF0ZSB0aGUgZmluZEluZGV4IGFuZCBmaW5kTGFzdEluZGV4IGZ1bmN0aW9uc1xuICBmdW5jdGlvbiBjcmVhdGVQcmVkaWNhdGVJbmRleEZpbmRlcihkaXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oYXJyYXksIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgcHJlZGljYXRlID0gY2IocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICAgIHZhciBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpO1xuICAgICAgdmFyIGluZGV4ID0gZGlyID4gMCA/IDAgOiBsZW5ndGggLSAxO1xuICAgICAgZm9yICg7IGluZGV4ID49IDAgJiYgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IGRpcikge1xuICAgICAgICBpZiAocHJlZGljYXRlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkgcmV0dXJuIGluZGV4O1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG4gIH1cblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBpbmRleCBvbiBhbiBhcnJheS1saWtlIHRoYXQgcGFzc2VzIGEgcHJlZGljYXRlIHRlc3RcbiAgXy5maW5kSW5kZXggPSBjcmVhdGVQcmVkaWNhdGVJbmRleEZpbmRlcigxKTtcbiAgXy5maW5kTGFzdEluZGV4ID0gY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIoLTEpO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0LCAxKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRlZShvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgICAgdmFyIG1pZCA9IE1hdGguZmxvb3IoKGxvdyArIGhpZ2gpIC8gMik7XG4gICAgICBpZiAoaXRlcmF0ZWUoYXJyYXlbbWlkXSkgPCB2YWx1ZSkgbG93ID0gbWlkICsgMTsgZWxzZSBoaWdoID0gbWlkO1xuICAgIH1cbiAgICByZXR1cm4gbG93O1xuICB9O1xuXG4gIC8vIEdlbmVyYXRvciBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIGluZGV4T2YgYW5kIGxhc3RJbmRleE9mIGZ1bmN0aW9uc1xuICBmdW5jdGlvbiBjcmVhdGVJbmRleEZpbmRlcihkaXIsIHByZWRpY2F0ZUZpbmQsIHNvcnRlZEluZGV4KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpZHgpIHtcbiAgICAgIHZhciBpID0gMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICAgIGlmICh0eXBlb2YgaWR4ID09ICdudW1iZXInKSB7XG4gICAgICAgIGlmIChkaXIgPiAwKSB7XG4gICAgICAgICAgICBpID0gaWR4ID49IDAgPyBpZHggOiBNYXRoLm1heChpZHggKyBsZW5ndGgsIGkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGVuZ3RoID0gaWR4ID49IDAgPyBNYXRoLm1pbihpZHggKyAxLCBsZW5ndGgpIDogaWR4ICsgbGVuZ3RoICsgMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzb3J0ZWRJbmRleCAmJiBpZHggJiYgbGVuZ3RoKSB7XG4gICAgICAgIGlkeCA9IHNvcnRlZEluZGV4KGFycmF5LCBpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFycmF5W2lkeF0gPT09IGl0ZW0gPyBpZHggOiAtMTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtICE9PSBpdGVtKSB7XG4gICAgICAgIGlkeCA9IHByZWRpY2F0ZUZpbmQoc2xpY2UuY2FsbChhcnJheSwgaSwgbGVuZ3RoKSwgXy5pc05hTik7XG4gICAgICAgIHJldHVybiBpZHggPj0gMCA/IGlkeCArIGkgOiAtMTtcbiAgICAgIH1cbiAgICAgIGZvciAoaWR4ID0gZGlyID4gMCA/IGkgOiBsZW5ndGggLSAxOyBpZHggPj0gMCAmJiBpZHggPCBsZW5ndGg7IGlkeCArPSBkaXIpIHtcbiAgICAgICAgaWYgKGFycmF5W2lkeF0gPT09IGl0ZW0pIHJldHVybiBpZHg7XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfTtcbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW4gaXRlbSBpbiBhbiBhcnJheSxcbiAgLy8gb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGNyZWF0ZUluZGV4RmluZGVyKDEsIF8uZmluZEluZGV4LCBfLnNvcnRlZEluZGV4KTtcbiAgXy5sYXN0SW5kZXhPZiA9IGNyZWF0ZUluZGV4RmluZGVyKC0xLCBfLmZpbmRMYXN0SW5kZXgpO1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKHN0b3AgPT0gbnVsbCkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBzdGVwIHx8IDE7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciByYW5nZSA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBsZW5ndGg7IGlkeCsrLCBzdGFydCArPSBzdGVwKSB7XG4gICAgICByYW5nZVtpZHhdID0gc3RhcnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIHRvIGV4ZWN1dGUgYSBmdW5jdGlvbiBhcyBhIGNvbnN0cnVjdG9yXG4gIC8vIG9yIGEgbm9ybWFsIGZ1bmN0aW9uIHdpdGggdGhlIHByb3ZpZGVkIGFyZ3VtZW50c1xuICB2YXIgZXhlY3V0ZUJvdW5kID0gZnVuY3Rpb24oc291cmNlRnVuYywgYm91bmRGdW5jLCBjb250ZXh0LCBjYWxsaW5nQ29udGV4dCwgYXJncykge1xuICAgIGlmICghKGNhbGxpbmdDb250ZXh0IGluc3RhbmNlb2YgYm91bmRGdW5jKSkgcmV0dXJuIHNvdXJjZUZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgdmFyIHNlbGYgPSBiYXNlQ3JlYXRlKHNvdXJjZUZ1bmMucHJvdG90eXBlKTtcbiAgICB2YXIgcmVzdWx0ID0gc291cmNlRnVuYy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICBpZiAoXy5pc09iamVjdChyZXN1bHQpKSByZXR1cm4gcmVzdWx0O1xuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIGlmIChuYXRpdmVCaW5kICYmIGZ1bmMuYmluZCA9PT0gbmF0aXZlQmluZCkgcmV0dXJuIG5hdGl2ZUJpbmQuYXBwbHkoZnVuYywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihmdW5jKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQmluZCBtdXN0IGJlIGNhbGxlZCBvbiBhIGZ1bmN0aW9uJyk7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhlY3V0ZUJvdW5kKGZ1bmMsIGJvdW5kLCBjb250ZXh0LCB0aGlzLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICAgIHJldHVybiBib3VuZDtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LiBfIGFjdHNcbiAgLy8gYXMgYSBwbGFjZWhvbGRlciwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZSBwcmUtZmlsbGVkLlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGJvdW5kQXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICB2YXIgYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IDAsIGxlbmd0aCA9IGJvdW5kQXJncy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IEFycmF5KGxlbmd0aCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFyZ3NbaV0gPSBib3VuZEFyZ3NbaV0gPT09IF8gPyBhcmd1bWVudHNbcG9zaXRpb24rK10gOiBib3VuZEFyZ3NbaV07XG4gICAgICB9XG4gICAgICB3aGlsZSAocG9zaXRpb24gPCBhcmd1bWVudHMubGVuZ3RoKSBhcmdzLnB1c2goYXJndW1lbnRzW3Bvc2l0aW9uKytdKTtcbiAgICAgIHJldHVybiBleGVjdXRlQm91bmQoZnVuYywgYm91bmQsIHRoaXMsIHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gICAgcmV0dXJuIGJvdW5kO1xuICB9O1xuXG4gIC8vIEJpbmQgYSBudW1iZXIgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gUmVtYWluaW5nIGFyZ3VtZW50c1xuICAvLyBhcmUgdGhlIG1ldGhvZCBuYW1lcyB0byBiZSBib3VuZC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGFsbCBjYWxsYmFja3NcbiAgLy8gZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgaSwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCwga2V5O1xuICAgIGlmIChsZW5ndGggPD0gMSkgdGhyb3cgbmV3IEVycm9yKCdiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzJyk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXkgPSBhcmd1bWVudHNbaV07XG4gICAgICBvYmpba2V5XSA9IF8uYmluZChvYmpba2V5XSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtb2l6ZSA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIGNhY2hlID0gbWVtb2l6ZS5jYWNoZTtcbiAgICAgIHZhciBhZGRyZXNzID0gJycgKyAoaGFzaGVyID8gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBrZXkpO1xuICAgICAgaWYgKCFfLmhhcyhjYWNoZSwgYWRkcmVzcykpIGNhY2hlW2FkZHJlc3NdID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIGNhY2hlW2FkZHJlc3NdO1xuICAgIH07XG4gICAgbWVtb2l6ZS5jYWNoZSA9IHt9O1xuICAgIHJldHVybiBtZW1vaXplO1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gZnVuY3Rpb24oZnVuYywgd2FpdCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9LCB3YWl0KTtcbiAgfTtcblxuICAvLyBEZWZlcnMgYSBmdW5jdGlvbiwgc2NoZWR1bGluZyBpdCB0byBydW4gYWZ0ZXIgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBoYXNcbiAgLy8gY2xlYXJlZC5cbiAgXy5kZWZlciA9IF8ucGFydGlhbChfLmRlbGF5LCBfLCAxKTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuIE5vcm1hbGx5LCB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGwgcnVuXG4gIC8vIGFzIG11Y2ggYXMgaXQgY2FuLCB3aXRob3V0IGV2ZXIgZ29pbmcgbW9yZSB0aGFuIG9uY2UgcGVyIGB3YWl0YCBkdXJhdGlvbjtcbiAgLy8gYnV0IGlmIHlvdSdkIGxpa2UgdG8gZGlzYWJsZSB0aGUgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIHBhc3NcbiAgLy8gYHtsZWFkaW5nOiBmYWxzZX1gLiBUbyBkaXNhYmxlIGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSwgZGl0dG8uXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBfLm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm93ID0gXy5ub3coKTtcbiAgICAgIGlmICghcHJldmlvdXMgJiYgb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSkgcHJldmlvdXMgPSBub3c7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xuICAgICAgICBpZiAodGltZW91dCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciB0aW1lb3V0LCBhcmdzLCBjb250ZXh0LCB0aW1lc3RhbXAsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhc3QgPSBfLm5vdygpIC0gdGltZXN0YW1wO1xuXG4gICAgICBpZiAobGFzdCA8IHdhaXQgJiYgbGFzdCA+PSAwKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHRpbWVzdGFtcCA9IF8ubm93KCk7XG4gICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgIGlmICghdGltZW91dCkgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBfLnBhcnRpYWwod3JhcHBlciwgZnVuYyk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIG5lZ2F0ZWQgdmVyc2lvbiBvZiB0aGUgcGFzc2VkLWluIHByZWRpY2F0ZS5cbiAgXy5uZWdhdGUgPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gIXByZWRpY2F0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgdmFyIHN0YXJ0ID0gYXJncy5sZW5ndGggLSAxO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpID0gc3RhcnQ7XG4gICAgICB2YXIgcmVzdWx0ID0gYXJnc1tzdGFydF0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHdoaWxlIChpLS0pIHJlc3VsdCA9IGFyZ3NbaV0uY2FsbCh0aGlzLCByZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBvbiBhbmQgYWZ0ZXIgdGhlIE50aCBjYWxsLlxuICBfLmFmdGVyID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA8IDEpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCB1cCB0byAoYnV0IG5vdCBpbmNsdWRpbmcpIHRoZSBOdGggY2FsbC5cbiAgXy5iZWZvcmUgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHZhciBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzID4gMCkge1xuICAgICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgICAgaWYgKHRpbWVzIDw9IDEpIGZ1bmMgPSBudWxsO1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3dcbiAgLy8gb2Z0ZW4geW91IGNhbGwgaXQuIFVzZWZ1bCBmb3IgbGF6eSBpbml0aWFsaXphdGlvbi5cbiAgXy5vbmNlID0gXy5wYXJ0aWFsKF8uYmVmb3JlLCAyKTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBLZXlzIGluIElFIDwgOSB0aGF0IHdvbid0IGJlIGl0ZXJhdGVkIGJ5IGBmb3Iga2V5IGluIC4uLmAgYW5kIHRodXMgbWlzc2VkLlxuICB2YXIgaGFzRW51bUJ1ZyA9ICF7dG9TdHJpbmc6IG51bGx9LnByb3BlcnR5SXNFbnVtZXJhYmxlKCd0b1N0cmluZycpO1xuICB2YXIgbm9uRW51bWVyYWJsZVByb3BzID0gWyd2YWx1ZU9mJywgJ2lzUHJvdG90eXBlT2YnLCAndG9TdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICdwcm9wZXJ0eUlzRW51bWVyYWJsZScsICdoYXNPd25Qcm9wZXJ0eScsICd0b0xvY2FsZVN0cmluZyddO1xuXG4gIGZ1bmN0aW9uIGNvbGxlY3ROb25FbnVtUHJvcHMob2JqLCBrZXlzKSB7XG4gICAgdmFyIG5vbkVudW1JZHggPSBub25FbnVtZXJhYmxlUHJvcHMubGVuZ3RoO1xuICAgIHZhciBjb25zdHJ1Y3RvciA9IG9iai5jb25zdHJ1Y3RvcjtcbiAgICB2YXIgcHJvdG8gPSAoXy5pc0Z1bmN0aW9uKGNvbnN0cnVjdG9yKSAmJiBjb25zdHJ1Y3Rvci5wcm90b3R5cGUpIHx8IE9ialByb3RvO1xuXG4gICAgLy8gQ29uc3RydWN0b3IgaXMgYSBzcGVjaWFsIGNhc2UuXG4gICAgdmFyIHByb3AgPSAnY29uc3RydWN0b3InO1xuICAgIGlmIChfLmhhcyhvYmosIHByb3ApICYmICFfLmNvbnRhaW5zKGtleXMsIHByb3ApKSBrZXlzLnB1c2gocHJvcCk7XG5cbiAgICB3aGlsZSAobm9uRW51bUlkeC0tKSB7XG4gICAgICBwcm9wID0gbm9uRW51bWVyYWJsZVByb3BzW25vbkVudW1JZHhdO1xuICAgICAgaWYgKHByb3AgaW4gb2JqICYmIG9ialtwcm9wXSAhPT0gcHJvdG9bcHJvcF0gJiYgIV8uY29udGFpbnMoa2V5cywgcHJvcCkpIHtcbiAgICAgICAga2V5cy5wdXNoKHByb3ApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJldHJpZXZlIHRoZSBuYW1lcyBvZiBhbiBvYmplY3QncyBvd24gcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIGlmIChuYXRpdmVLZXlzKSByZXR1cm4gbmF0aXZlS2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgLy8gQWhlbSwgSUUgPCA5LlxuICAgIGlmIChoYXNFbnVtQnVnKSBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cyk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgYWxsIHRoZSBwcm9wZXJ0eSBuYW1lcyBvZiBhbiBvYmplY3QuXG4gIF8uYWxsS2V5cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBrZXlzLnB1c2goa2V5KTtcbiAgICAvLyBBaGVtLCBJRSA8IDkuXG4gICAgaWYgKGhhc0VudW1CdWcpIGNvbGxlY3ROb25FbnVtUHJvcHMob2JqLCBrZXlzKTtcbiAgICByZXR1cm4ga2V5cztcbiAgfTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgdmFsdWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIF8udmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdGVlIHRvIGVhY2ggZWxlbWVudCBvZiB0aGUgb2JqZWN0XG4gIC8vIEluIGNvbnRyYXN0IHRvIF8ubWFwIGl0IHJldHVybnMgYW4gb2JqZWN0XG4gIF8ubWFwT2JqZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIF8ua2V5cyhvYmopLFxuICAgICAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoLFxuICAgICAgICAgIHJlc3VsdHMgPSB7fSxcbiAgICAgICAgICBjdXJyZW50S2V5O1xuICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjdXJyZW50S2V5ID0ga2V5c1tpbmRleF07XG4gICAgICAgIHJlc3VsdHNbY3VycmVudEtleV0gPSBpdGVyYXRlZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0IGFuIG9iamVjdCBpbnRvIGEgbGlzdCBvZiBgW2tleSwgdmFsdWVdYCBwYWlycy5cbiAgXy5wYWlycyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBwYWlycyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGNyZWF0ZUFzc2lnbmVyKF8uYWxsS2V5cyk7XG5cbiAgLy8gQXNzaWducyBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgb3duIHByb3BlcnRpZXMgaW4gdGhlIHBhc3NlZC1pbiBvYmplY3QocylcbiAgLy8gKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL09iamVjdC9hc3NpZ24pXG4gIF8uZXh0ZW5kT3duID0gXy5hc3NpZ24gPSBjcmVhdGVBc3NpZ25lcihfLmtleXMpO1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGtleSBvbiBhbiBvYmplY3QgdGhhdCBwYXNzZXMgYSBwcmVkaWNhdGUgdGVzdFxuICBfLmZpbmRLZXkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKSwga2V5O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZShvYmpba2V5XSwga2V5LCBvYmopKSByZXR1cm4ga2V5O1xuICAgIH1cbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb25seSBjb250YWluaW5nIHRoZSB3aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLnBpY2sgPSBmdW5jdGlvbihvYmplY3QsIG9pdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSB7fSwgb2JqID0gb2JqZWN0LCBpdGVyYXRlZSwga2V5cztcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihvaXRlcmF0ZWUpKSB7XG4gICAgICBrZXlzID0gXy5hbGxLZXlzKG9iaik7XG4gICAgICBpdGVyYXRlZSA9IG9wdGltaXplQ2Iob2l0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAga2V5cyA9IGZsYXR0ZW4oYXJndW1lbnRzLCBmYWxzZSwgZmFsc2UsIDEpO1xuICAgICAgaXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmopIHsgcmV0dXJuIGtleSBpbiBvYmo7IH07XG4gICAgICBvYmogPSBPYmplY3Qob2JqKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgdmFyIHZhbHVlID0gb2JqW2tleV07XG4gICAgICBpZiAoaXRlcmF0ZWUodmFsdWUsIGtleSwgb2JqKSkgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IHdpdGhvdXQgdGhlIGJsYWNrbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ub21pdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGl0ZXJhdGVlKSkge1xuICAgICAgaXRlcmF0ZWUgPSBfLm5lZ2F0ZShpdGVyYXRlZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5tYXAoZmxhdHRlbihhcmd1bWVudHMsIGZhbHNlLCBmYWxzZSwgMSksIFN0cmluZyk7XG4gICAgICBpdGVyYXRlZSA9IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKGtleXMsIGtleSk7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gXy5waWNrKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIEZpbGwgaW4gYSBnaXZlbiBvYmplY3Qgd2l0aCBkZWZhdWx0IHByb3BlcnRpZXMuXG4gIF8uZGVmYXVsdHMgPSBjcmVhdGVBc3NpZ25lcihfLmFsbEtleXMsIHRydWUpO1xuXG4gIC8vIENyZWF0ZXMgYW4gb2JqZWN0IHRoYXQgaW5oZXJpdHMgZnJvbSB0aGUgZ2l2ZW4gcHJvdG90eXBlIG9iamVjdC5cbiAgLy8gSWYgYWRkaXRpb25hbCBwcm9wZXJ0aWVzIGFyZSBwcm92aWRlZCB0aGVuIHRoZXkgd2lsbCBiZSBhZGRlZCB0byB0aGVcbiAgLy8gY3JlYXRlZCBvYmplY3QuXG4gIF8uY3JlYXRlID0gZnVuY3Rpb24ocHJvdG90eXBlLCBwcm9wcykge1xuICAgIHZhciByZXN1bHQgPSBiYXNlQ3JlYXRlKHByb3RvdHlwZSk7XG4gICAgaWYgKHByb3BzKSBfLmV4dGVuZE93bihyZXN1bHQsIHByb3BzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIChzaGFsbG93LWNsb25lZCkgZHVwbGljYXRlIG9mIGFuIG9iamVjdC5cbiAgXy5jbG9uZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHJldHVybiBfLmlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogXy5leHRlbmQoe30sIG9iaik7XG4gIH07XG5cbiAgLy8gSW52b2tlcyBpbnRlcmNlcHRvciB3aXRoIHRoZSBvYmosIGFuZCB0aGVuIHJldHVybnMgb2JqLlxuICAvLyBUaGUgcHJpbWFyeSBwdXJwb3NlIG9mIHRoaXMgbWV0aG9kIGlzIHRvIFwidGFwIGludG9cIiBhIG1ldGhvZCBjaGFpbiwgaW5cbiAgLy8gb3JkZXIgdG8gcGVyZm9ybSBvcGVyYXRpb25zIG9uIGludGVybWVkaWF0ZSByZXN1bHRzIHdpdGhpbiB0aGUgY2hhaW4uXG4gIF8udGFwID0gZnVuY3Rpb24ob2JqLCBpbnRlcmNlcHRvcikge1xuICAgIGludGVyY2VwdG9yKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHdoZXRoZXIgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHNldCBvZiBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5pc01hdGNoID0gZnVuY3Rpb24ob2JqZWN0LCBhdHRycykge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKGF0dHJzKSwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gIWxlbmd0aDtcbiAgICB2YXIgb2JqID0gT2JqZWN0KG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICBpZiAoYXR0cnNba2V5XSAhPT0gb2JqW2tleV0gfHwgIShrZXkgaW4gb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PT0gMSAvIGI7XG4gICAgLy8gQSBzdHJpY3QgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkgYmVjYXVzZSBgbnVsbCA9PSB1bmRlZmluZWRgLlxuICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gYSA9PT0gYjtcbiAgICAvLyBVbndyYXAgYW55IHdyYXBwZWQgb2JqZWN0cy5cbiAgICBpZiAoYSBpbnN0YW5jZW9mIF8pIGEgPSBhLl93cmFwcGVkO1xuICAgIGlmIChiIGluc3RhbmNlb2YgXykgYiA9IGIuX3dyYXBwZWQ7XG4gICAgLy8gQ29tcGFyZSBgW1tDbGFzc11dYCBuYW1lcy5cbiAgICB2YXIgY2xhc3NOYW1lID0gdG9TdHJpbmcuY2FsbChhKTtcbiAgICBpZiAoY2xhc3NOYW1lICE9PSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIHJlZ3VsYXIgZXhwcmVzc2lvbnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvZXJjZWQgdG8gc3RyaW5ncyBmb3IgY29tcGFyaXNvbiAoTm90ZTogJycgKyAvYS9pID09PSAnL2EvaScpXG4gICAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOlxuICAgICAgICAvLyBQcmltaXRpdmVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIG9iamVjdCB3cmFwcGVycyBhcmUgZXF1aXZhbGVudDsgdGh1cywgYFwiNVwiYCBpc1xuICAgICAgICAvLyBlcXVpdmFsZW50IHRvIGBuZXcgU3RyaW5nKFwiNVwiKWAuXG4gICAgICAgIHJldHVybiAnJyArIGEgPT09ICcnICsgYjtcbiAgICAgIGNhc2UgJ1tvYmplY3QgTnVtYmVyXSc6XG4gICAgICAgIC8vIGBOYU5gcyBhcmUgZXF1aXZhbGVudCwgYnV0IG5vbi1yZWZsZXhpdmUuXG4gICAgICAgIC8vIE9iamVjdChOYU4pIGlzIGVxdWl2YWxlbnQgdG8gTmFOXG4gICAgICAgIGlmICgrYSAhPT0gK2EpIHJldHVybiArYiAhPT0gK2I7XG4gICAgICAgIC8vIEFuIGBlZ2FsYCBjb21wYXJpc29uIGlzIHBlcmZvcm1lZCBmb3Igb3RoZXIgbnVtZXJpYyB2YWx1ZXMuXG4gICAgICAgIHJldHVybiArYSA9PT0gMCA/IDEgLyArYSA9PT0gMSAvIGIgOiArYSA9PT0gK2I7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT09ICtiO1xuICAgIH1cblxuICAgIHZhciBhcmVBcnJheXMgPSBjbGFzc05hbWUgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgaWYgKCFhcmVBcnJheXMpIHtcbiAgICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHMgb3IgYEFycmF5YHNcbiAgICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgICB2YXIgYUN0b3IgPSBhLmNvbnN0cnVjdG9yLCBiQ3RvciA9IGIuY29uc3RydWN0b3I7XG4gICAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiBhQ3RvciBpbnN0YW5jZW9mIGFDdG9yICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKGJDdG9yKSAmJiBiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAmJiAoJ2NvbnN0cnVjdG9yJyBpbiBhICYmICdjb25zdHJ1Y3RvcicgaW4gYikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBc3N1bWUgZXF1YWxpdHkgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGUgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgY3ljbGljXG4gICAgLy8gc3RydWN0dXJlcyBpcyBhZGFwdGVkIGZyb20gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMywgYWJzdHJhY3Qgb3BlcmF0aW9uIGBKT2AuXG5cbiAgICAvLyBJbml0aWFsaXppbmcgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgLy8gSXQncyBkb25lIGhlcmUgc2luY2Ugd2Ugb25seSBuZWVkIHRoZW0gZm9yIG9iamVjdHMgYW5kIGFycmF5cyBjb21wYXJpc29uLlxuICAgIGFTdGFjayA9IGFTdGFjayB8fCBbXTtcbiAgICBiU3RhY2sgPSBiU3RhY2sgfHwgW107XG4gICAgdmFyIGxlbmd0aCA9IGFTdGFjay5sZW5ndGg7XG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAvLyBMaW5lYXIgc2VhcmNoLiBQZXJmb3JtYW5jZSBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2ZcbiAgICAgIC8vIHVuaXF1ZSBuZXN0ZWQgc3RydWN0dXJlcy5cbiAgICAgIGlmIChhU3RhY2tbbGVuZ3RoXSA9PT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09PSBiO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcblxuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgIGlmIChhcmVBcnJheXMpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgbGVuZ3RoID0gYS5sZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICBpZiAoIWVxKGFbbGVuZ3RoXSwgYltsZW5ndGhdLCBhU3RhY2ssIGJTdGFjaykpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGVlcCBjb21wYXJlIG9iamVjdHMuXG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhhKSwga2V5O1xuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcyBiZWZvcmUgY29tcGFyaW5nIGRlZXAgZXF1YWxpdHkuXG4gICAgICBpZiAoXy5rZXlzKGIpLmxlbmd0aCAhPT0gbGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyXG4gICAgICAgIGtleSA9IGtleXNbbGVuZ3RoXTtcbiAgICAgICAgaWYgKCEoXy5oYXMoYiwga2V5KSAmJiBlcShhW2tleV0sIGJba2V5XSwgYVN0YWNrLCBiU3RhY2spKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxuICBfLmlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGVxKGEsIGIpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChpc0FycmF5TGlrZShvYmopICYmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikgfHwgXy5pc0FyZ3VtZW50cyhvYmopKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgcmV0dXJuIF8ua2V5cyhvYmopLmxlbmd0aCA9PT0gMDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciB0eXBlID0gdHlwZW9mIG9iajtcbiAgICByZXR1cm4gdHlwZSA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlID09PSAnb2JqZWN0JyAmJiAhIW9iajtcbiAgfTtcblxuICAvLyBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cCwgaXNFcnJvci5cbiAgXy5lYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnLCAnRXJyb3InXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgICB9O1xuICB9KTtcblxuICAvLyBEZWZpbmUgYSBmYWxsYmFjayB2ZXJzaW9uIG9mIHRoZSBtZXRob2QgaW4gYnJvd3NlcnMgKGFoZW0sIElFIDwgOSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIF8uaGFzKG9iaiwgJ2NhbGxlZScpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuIFdvcmsgYXJvdW5kIHNvbWUgdHlwZW9mIGJ1Z3MgaW4gb2xkIHY4LFxuICAvLyBJRSAxMSAoIzE2MjEpLCBhbmQgaW4gU2FmYXJpIDggKCMxOTI5KS5cbiAgaWYgKHR5cGVvZiAvLi8gIT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgSW50OEFycmF5ICE9ICdvYmplY3QnKSB7XG4gICAgXy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPT0gK29iajtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgYm9vbGVhbj9cbiAgXy5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIG9iaiAhPSBudWxsICYmIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0ZWVzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLy8gUHJlZGljYXRlLWdlbmVyYXRpbmcgZnVuY3Rpb25zLiBPZnRlbiB1c2VmdWwgb3V0c2lkZSBvZiBVbmRlcnNjb3JlLlxuICBfLmNvbnN0YW50ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfTtcblxuICBfLm5vb3AgPSBmdW5jdGlvbigpe307XG5cbiAgXy5wcm9wZXJ0eSA9IHByb3BlcnR5O1xuXG4gIC8vIEdlbmVyYXRlcyBhIGZ1bmN0aW9uIGZvciBhIGdpdmVuIG9iamVjdCB0aGF0IHJldHVybnMgYSBnaXZlbiBwcm9wZXJ0eS5cbiAgXy5wcm9wZXJ0eU9mID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PSBudWxsID8gZnVuY3Rpb24oKXt9IDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2ZcbiAgLy8gYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlciA9IF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgYXR0cnMgPSBfLmV4dGVuZE93bih7fSwgYXR0cnMpO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBfLmlzTWF0Y2gob2JqLCBhdHRycyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGl0ZXJhdGVlID0gb3B0aW1pemVDYihpdGVyYXRlZSwgY29udGV4dCwgMSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0ZWUoaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIEEgKHBvc3NpYmx5IGZhc3Rlcikgd2F5IHRvIGdldCB0aGUgY3VycmVudCB0aW1lc3RhbXAgYXMgYW4gaW50ZWdlci5cbiAgXy5ub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbiAgIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlc2NhcGVNYXAgPSB7XG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICc8JzogJyZsdDsnLFxuICAgICc+JzogJyZndDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiN4Mjc7JyxcbiAgICAnYCc6ICcmI3g2MDsnXG4gIH07XG4gIHZhciB1bmVzY2FwZU1hcCA9IF8uaW52ZXJ0KGVzY2FwZU1hcCk7XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICB2YXIgY3JlYXRlRXNjYXBlciA9IGZ1bmN0aW9uKG1hcCkge1xuICAgIHZhciBlc2NhcGVyID0gZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgIHJldHVybiBtYXBbbWF0Y2hdO1xuICAgIH07XG4gICAgLy8gUmVnZXhlcyBmb3IgaWRlbnRpZnlpbmcgYSBrZXkgdGhhdCBuZWVkcyB0byBiZSBlc2NhcGVkXG4gICAgdmFyIHNvdXJjZSA9ICcoPzonICsgXy5rZXlzKG1hcCkuam9pbignfCcpICsgJyknO1xuICAgIHZhciB0ZXN0UmVnZXhwID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgdmFyIHJlcGxhY2VSZWdleHAgPSBSZWdFeHAoc291cmNlLCAnZycpO1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIHN0cmluZyA9IHN0cmluZyA9PSBudWxsID8gJycgOiAnJyArIHN0cmluZztcbiAgICAgIHJldHVybiB0ZXN0UmVnZXhwLnRlc3Qoc3RyaW5nKSA/IHN0cmluZy5yZXBsYWNlKHJlcGxhY2VSZWdleHAsIGVzY2FwZXIpIDogc3RyaW5nO1xuICAgIH07XG4gIH07XG4gIF8uZXNjYXBlID0gY3JlYXRlRXNjYXBlcihlc2NhcGVNYXApO1xuICBfLnVuZXNjYXBlID0gY3JlYXRlRXNjYXBlcih1bmVzY2FwZU1hcCk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSwgZmFsbGJhY2spIHtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3QgPT0gbnVsbCA/IHZvaWQgMCA6IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgaWYgKHZhbHVlID09PSB2b2lkIDApIHtcbiAgICAgIHZhbHVlID0gZmFsbGJhY2s7XG4gICAgfVxuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUuY2FsbChvYmplY3QpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgaW50ZWdlciBpZCAodW5pcXVlIHdpdGhpbiB0aGUgZW50aXJlIGNsaWVudCBzZXNzaW9uKS5cbiAgLy8gVXNlZnVsIGZvciB0ZW1wb3JhcnkgRE9NIGlkcy5cbiAgdmFyIGlkQ291bnRlciA9IDA7XG4gIF8udW5pcXVlSWQgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICB9O1xuXG4gIC8vIEJ5IGRlZmF1bHQsIFVuZGVyc2NvcmUgdXNlcyBFUkItc3R5bGUgdGVtcGxhdGUgZGVsaW1pdGVycywgY2hhbmdlIHRoZVxuICAvLyBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlIGRlbGltaXRlcnMuXG4gIF8udGVtcGxhdGVTZXR0aW5ncyA9IHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nXG4gIH07XG5cbiAgLy8gV2hlbiBjdXN0b21pemluZyBgdGVtcGxhdGVTZXR0aW5nc2AsIGlmIHlvdSBkb24ndCB3YW50IHRvIGRlZmluZSBhblxuICAvLyBpbnRlcnBvbGF0aW9uLCBldmFsdWF0aW9uIG9yIGVzY2FwaW5nIHJlZ2V4LCB3ZSBuZWVkIG9uZSB0aGF0IGlzXG4gIC8vIGd1YXJhbnRlZWQgbm90IHRvIG1hdGNoLlxuICB2YXIgbm9NYXRjaCA9IC8oLileLztcblxuICAvLyBDZXJ0YWluIGNoYXJhY3RlcnMgbmVlZCB0byBiZSBlc2NhcGVkIHNvIHRoYXQgdGhleSBjYW4gYmUgcHV0IGludG8gYVxuICAvLyBzdHJpbmcgbGl0ZXJhbC5cbiAgdmFyIGVzY2FwZXMgPSB7XG4gICAgXCInXCI6ICAgICAgXCInXCIsXG4gICAgJ1xcXFwnOiAgICAgJ1xcXFwnLFxuICAgICdcXHInOiAgICAgJ3InLFxuICAgICdcXG4nOiAgICAgJ24nLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlciA9IC9cXFxcfCd8XFxyfFxcbnxcXHUyMDI4fFxcdTIwMjkvZztcblxuICB2YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdO1xuICB9O1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIC8vIE5COiBgb2xkU2V0dGluZ3NgIG9ubHkgZXhpc3RzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgXy50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRleHQsIHNldHRpbmdzLCBvbGRTZXR0aW5ncykge1xuICAgIGlmICghc2V0dGluZ3MgJiYgb2xkU2V0dGluZ3MpIHNldHRpbmdzID0gb2xkU2V0dGluZ3M7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gUmVnRXhwKFtcbiAgICAgIChzZXR0aW5ncy5lc2NhcGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmludGVycG9sYXRlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5ldmFsdWF0ZSB8fCBub01hdGNoKS5zb3VyY2VcbiAgICBdLmpvaW4oJ3wnKSArICd8JCcsICdnJyk7XG5cbiAgICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNvdXJjZSA9IFwiX19wKz0nXCI7XG4gICAgdGV4dC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGUsIGludGVycG9sYXRlLCBldmFsdWF0ZSwgb2Zmc2V0KSB7XG4gICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KS5yZXBsYWNlKGVzY2FwZXIsIGVzY2FwZUNoYXIpO1xuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH0gZWxzZSBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBpbnRlcnBvbGF0ZSArIFwiKSk9PW51bGw/Jyc6X190KStcXG4nXCI7XG4gICAgICB9IGVsc2UgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkb2JlIFZNcyBuZWVkIHRoZSBtYXRjaCByZXR1cm5lZCB0byBwcm9kdWNlIHRoZSBjb3JyZWN0IG9mZmVzdC5cbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArICdyZXR1cm4gX19wO1xcbic7XG5cbiAgICB0cnkge1xuICAgICAgdmFyIHJlbmRlciA9IG5ldyBGdW5jdGlvbihzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJywgJ18nLCBzb3VyY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcywgZGF0YSwgXyk7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGUgdGhlIGNvbXBpbGVkIHNvdXJjZSBhcyBhIGNvbnZlbmllbmNlIGZvciBwcmVjb21waWxhdGlvbi5cbiAgICB2YXIgYXJndW1lbnQgPSBzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJztcbiAgICB0ZW1wbGF0ZS5zb3VyY2UgPSAnZnVuY3Rpb24oJyArIGFyZ3VtZW50ICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24uIFN0YXJ0IGNoYWluaW5nIGEgd3JhcHBlZCBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5jaGFpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBpbnN0YW5jZSA9IF8ob2JqKTtcbiAgICBpbnN0YW5jZS5fY2hhaW4gPSB0cnVlO1xuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfTtcblxuICAvLyBPT1BcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gIC8vIElmIFVuZGVyc2NvcmUgaXMgY2FsbGVkIGFzIGEgZnVuY3Rpb24sIGl0IHJldHVybnMgYSB3cmFwcGVkIG9iamVjdCB0aGF0XG4gIC8vIGNhbiBiZSB1c2VkIE9PLXN0eWxlLiBUaGlzIHdyYXBwZXIgaG9sZHMgYWx0ZXJlZCB2ZXJzaW9ucyBvZiBhbGwgdGhlXG4gIC8vIHVuZGVyc2NvcmUgZnVuY3Rpb25zLiBXcmFwcGVkIG9iamVjdHMgbWF5IGJlIGNoYWluZWQuXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnRpbnVlIGNoYWluaW5nIGludGVybWVkaWF0ZSByZXN1bHRzLlxuICB2YXIgcmVzdWx0ID0gZnVuY3Rpb24oaW5zdGFuY2UsIG9iaikge1xuICAgIHJldHVybiBpbnN0YW5jZS5fY2hhaW4gPyBfKG9iaikuY2hhaW4oKSA6IG9iajtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBfLmVhY2goXy5mdW5jdGlvbnMob2JqKSwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZ1bmMgPSBfW25hbWVdID0gb2JqW25hbWVdO1xuICAgICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5fd3JhcHBlZF07XG4gICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIF8uZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PT0gJ3NoaWZ0JyB8fCBuYW1lID09PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgXy5lYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0KHRoaXMsIG1ldGhvZC5hcHBseSh0aGlzLl93cmFwcGVkLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBFeHRyYWN0cyB0aGUgcmVzdWx0IGZyb20gYSB3cmFwcGVkIGFuZCBjaGFpbmVkIG9iamVjdC5cbiAgXy5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fd3JhcHBlZDtcbiAgfTtcblxuICAvLyBQcm92aWRlIHVud3JhcHBpbmcgcHJveHkgZm9yIHNvbWUgbWV0aG9kcyB1c2VkIGluIGVuZ2luZSBvcGVyYXRpb25zXG4gIC8vIHN1Y2ggYXMgYXJpdGhtZXRpYyBhbmQgSlNPTiBzdHJpbmdpZmljYXRpb24uXG4gIF8ucHJvdG90eXBlLnZhbHVlT2YgPSBfLnByb3RvdHlwZS50b0pTT04gPSBfLnByb3RvdHlwZS52YWx1ZTtcblxuICBfLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnJyArIHRoaXMuX3dyYXBwZWQ7XG4gIH07XG5cbiAgLy8gQU1EIHJlZ2lzdHJhdGlvbiBoYXBwZW5zIGF0IHRoZSBlbmQgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBBTUQgbG9hZGVyc1xuICAvLyB0aGF0IG1heSBub3QgZW5mb3JjZSBuZXh0LXR1cm4gc2VtYW50aWNzIG9uIG1vZHVsZXMuIEV2ZW4gdGhvdWdoIGdlbmVyYWxcbiAgLy8gcHJhY3RpY2UgZm9yIEFNRCByZWdpc3RyYXRpb24gaXMgdG8gYmUgYW5vbnltb3VzLCB1bmRlcnNjb3JlIHJlZ2lzdGVyc1xuICAvLyBhcyBhIG5hbWVkIG1vZHVsZSBiZWNhdXNlLCBsaWtlIGpRdWVyeSwgaXQgaXMgYSBiYXNlIGxpYnJhcnkgdGhhdCBpc1xuICAvLyBwb3B1bGFyIGVub3VnaCB0byBiZSBidW5kbGVkIGluIGEgdGhpcmQgcGFydHkgbGliLCBidXQgbm90IGJlIHBhcnQgb2ZcbiAgLy8gYW4gQU1EIGxvYWQgcmVxdWVzdC4gVGhvc2UgY2FzZXMgY291bGQgZ2VuZXJhdGUgYW4gZXJyb3Igd2hlbiBhblxuICAvLyBhbm9ueW1vdXMgZGVmaW5lKCkgaXMgY2FsbGVkIG91dHNpZGUgb2YgYSBsb2FkZXIgcmVxdWVzdC5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgndW5kZXJzY29yZScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfO1xuICAgIH0pO1xuICB9XG59LmNhbGwodGhpcykpO1xuIl19
