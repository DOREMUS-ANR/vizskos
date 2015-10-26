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