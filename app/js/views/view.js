var _ = require('underscore');
var helpers = require('./templates/helpers');

module.exports = Backbone.View.extend({
  initialize: function initializeView() {
    _.bindAll(this, 'template', 'getRenderData', 'render', 'afterRender');
    this.afterInit();
  },
  afterInit: function afterInitView() {},
  template: function templateView() {},
  getRenderData: function getRenderDataView() {},

  render: function renderView() {
    this.$el.empty();
    this.$el.html(this.template(this.getRenderData()));
    _.defer(this.afterRender); //setTimeOut(0)
  },

  afterRender: function afterRenderView() {}
});