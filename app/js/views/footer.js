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
