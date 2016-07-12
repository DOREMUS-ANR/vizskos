var View = require('./view');

module.exports = View.extend({
    template : require('./templates/header.hbs'),
    // The DOM events specific to a concept.
    events: {
      'change #selectNav': 'selectNav',
    },
    //
    getRenderData: function getRenderDataHeader(){
      return{
      };
    },
    //
});
