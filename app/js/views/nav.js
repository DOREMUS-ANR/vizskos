var View = require('./view');
var NavCircle = require('./navCircle');
var NavTree = require('./navTree');
module.exports = View.extend({

    // set up listeners
    afterInit: function afterInitNav(){
     
      this.listenTo(this.collection, 'viewTypeChanged', this.render);
      this.listenTo(this.collection, 'dataChanged', this.render);

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
