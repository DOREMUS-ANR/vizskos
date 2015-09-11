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
      
      if(this.collection.viewType === 1){
        this.navView = new NavCircle({collection : this.collection}).preRender();
      }else if(this.collection.viewType === 2){
        this.navView = new NavTree({collection : this.collection}).preRender();
      }

    }

});
