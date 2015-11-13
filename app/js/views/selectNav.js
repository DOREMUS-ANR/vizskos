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
    }

});