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