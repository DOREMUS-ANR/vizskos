var View = require('./view');
var ConceptView = require('./concept');
var FooterView = require('./footer');
var HeaderView = require('./header');
var HomeView = require('./home');
var NavView = require('./nav');
var SelectNavView = require('./selectNav');

var _ = require('underscore');

module.exports = View.extend({
  template: require('./templates/main.hbs'),
  page: null,
  //if page has changed, render again
  setPage: function setPageApp(newPage) {
    if (newPage !== this.page) {
      this.page = newPage;
      this.$('article').length ? this.afterRender(): this.render();
    }
  },

  //after rendering
  afterRender: function afterRenderApp() {

    if (this.page === 'home') {
      this.headerView = new HeaderView({
        collection: this.collection,
        el: this.$('header .logo')
      }).render();
      this.homeView = new HomeView({
        collection: this.collection,
        el: this.$('article')
      }).render();
      this.footerView = new FooterView({
        collection: this.collection,
        el: this.$('footer')
      }).render();
    } else if (this.page === 'thesaurus') {
      this.headerView = new HeaderView({
        collection: this.collection,
        el: this.$('header .logo')
      }).render();
      this.conceptView = new ConceptView({
        collection: this.collection,
        el: this.$('article')
      });
      this.navView = new NavView({
        collection: this.collection,
        el: this.$('nav.nav')
      }).render();
      this.selectNavView = new SelectNavView({
        collection: this.collection,
        el: this.$('header .tools')
      }).render();

    }
  }
});
