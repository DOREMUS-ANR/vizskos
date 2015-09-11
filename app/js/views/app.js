var View = require('./view');
var ConceptView = require('./concept');
var NavView = require('./nav');
var SelectNavView = require('./selectNav');

var _ = require('underscore');

module.exports = View.extend({
    
    el: '#vizskos',
    template : require('./templates/main.hbs'),

    afterRender: function afterRenderApp() {
     
      this.conceptView = new ConceptView({collection : this.collection, el: this.$('article')});
      this.navView = new NavView({collection : this.collection, el: this.$('nav.nav')});
      this.selectNavView = new SelectNavView({collection : this.collection, el: this.$('.tools') });


    }
});