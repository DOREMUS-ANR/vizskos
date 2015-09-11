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