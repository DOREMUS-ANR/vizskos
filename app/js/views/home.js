var View = require('./view');

module.exports = View.extend({
    
    template : require('./templates/home.hbs'),

    //
    getRenderData: function getRenderDataHome(){
      console.log("eeeee", this.template);
      return{};
    }
  

});