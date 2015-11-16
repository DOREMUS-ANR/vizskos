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