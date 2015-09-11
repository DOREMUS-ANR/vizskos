var View = require('./view');
var application = require('../application');
module.exports = View.extend({

    initSize: function initSizeNav() {
      this.height = $(window).height();
      this.width = $(window).width() ;
    },
    resize: function resizeNav() {
      this.initSize();
 
      this.svg
        .style("width", this.width + "px")
        .style("height", this.height + "px");

      this.vis
        .attr("width", this.width)
        .attr("height", this.height);

      this.render();
    },

    // The NavView listens for changes to its model, re-rendering.
    afterInit: function afterInitNav(){
     
      this.initSize();
     
      this.cluster = d3.layout.tree()
        .size([this.height, this.width]);
      //
      this.diagonal = d3.svg.diagonal.radial()
        .projection( function(d) { return [d.y, d.x]; } );
      //
      this.svg = d3.select("nav.nav");
      //
      this.vis = this.svg.append("svg:svg");
      //
      this.main = this.vis
        .append("svg:g")
          .attr("class", "main")

      this.resize();

      $(window).on("resize", this.resize.bind(this));

    },
    
    // Re-renders the titles of the todo item.
    render: function renderNav() {
      
      if(this.collection.conceptTree){

        if(this.node) this.node.remove();
        if(this.link) this.link.remove();
        if(this.arc) this.arc.remove();

          
      this.arc = this.main.append("svg:path")
        .attr("class", "arc")
        .attr("d", d3.svg.arc().innerRadius(this.yRadius - this.whiteRadius).outerRadius(this.yRadius).startAngle(0).endAngle(2 * Math.PI));
        //console.log(this.conceptTree);
        this.renderUpdate(this.collection.conceptTree);

      }
 
    },
    renderUpdate : function renderUpdateNav(source) {

      this.nodes = this.cluster.nodes(this.collection.conceptTree);
      this.links = this.cluster.links(this.nodes);
      var whiteRadius = this.whiteRadius;

      

      this.node = this.main.selectAll("g.node").data(this.nodes);
      this.link = this.main.selectAll("path.link").data(this.links);
      

      this.linkEnter = this.link.enter()
        .append("svg:path")
          .attr("class", "link")
          .attr("d", this.diagonal);

      this.link.transition()
        .duration(500)
        .attr("d", this.diagonal);

      this.linkExit = this.link.exit().transition()
        .duration(500)
        .attr("d", this.diagonal)
        .remove();

      this.nodeEnter = this.node.enter()
        .append("svg:g")
          .attr("class", function(d) { return d.children ? "node parent node_" + d.id : "node child node_" + d.id; })
          .attr("transform", function(d,i) {return "rotate(" + (source.x - 90) + ")translate(" + (source.y ) + ")"; });
        
      this.circle = this.nodeEnter.append("svg:circle")
        .attr("r", 2);

      this.label = this.nodeEnter.append("svg:text")
        .attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
        .attr("dy", ".31em")
        .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
        .attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
        .text(function(d) { return d.name; });

      this.circle
        .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; })
        .on("mousedown", this.toggleNode.bind(this) );

      this.label
        .on("mousedown", this.selectNode.bind(this) );

      this.nodeExit = this.node.exit()
        .transition()
          .duration(500)
          .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y ) + ")"; })
          .remove();

      this.nodeExit.select("circle")
        .attr("r", 1e-6);

      this.nodeExit.select("text")
        .style("fill-opacity", 1e-6);

      this.nodeUpdate = this.node.transition()
        .duration(500)
        .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y ) + ")"; });

      //}

      // Stash the old positions for transition.
      this.nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    },
    toggleNode: function toggleNodeNav(d, i) {
      console.log("update",d);
      if (d.children) {
        d._children = d.children;
        d.children = null;              
      } else {
        d.children = d._children;
        d._children = null;
      }
      this.renderUpdate(d);
      //console.log(d);
    },
    showSelectedNode: function showSelectedNodeNav(uri) {
      
    },
    selectNode: function selectNodeNav(d, i) {

      application.router.navigate(d.id, {trigger : true});

      d3.event.stopPropagation();
    }

});
