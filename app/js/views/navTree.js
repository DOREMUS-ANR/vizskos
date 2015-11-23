var View = require('./view');
var application = require('../application');
module.exports = View.extend({

    //gets window size
    initSize: function initSizeNav() {
      this.height = $(window).height();
      this.width = $(window).width() ;
      this.i = 0;
      this.duration = 750;
    },

    //
    setSize: function setSizeNav() {
      this.initSize();
 
      this.svg
        .style("width", this.width + "px")
        .style("height", this.height + "px");

      this.vis
        .attr("width", this.width)
        .attr("height", this.height);

    },

    // The NavView listens for changes to its model, re-rendering.
    afterInit: function afterInitNav(){

      
      this.listenTo(this.collection, 'conceptChanged', this.showSelectedNode);
      this.listenTo(this.collection, 'dataChanged', this.dataChanged);
      this.listenTo(this.collection, 'filterChanged', this.filterChanged);

      $(window).on("resize", this.resize.bind(this));
      this.root = this.collection.conceptTree;

    },
    dataChanged: function dataChanged() {
      this.root = this.collection.conceptTree;
      if(this.root){
        this.root.x0 = this.height / 2;
        this.root.y0 = 0;
        this.preRender();
        
      }
    },
    filterChanged: function filterChanged() {
      console.log("filterChanged");
      this.showFilteredNodes();
    },
    resize: function resizeNav() {
      
      this.setSize();
      this.render(this.root);
    },
    // Re-renders the titles of the todo item.
    preRender: function preRenderNav() {
      //console.log("isloaded", this.collection.loaded);
      //if(this.collection.loaded){

        this.initSize();
        $("nav.nav").empty();
        this.tree = d3.layout.tree()
          .size([this.height, this.width]);
        //
        this.diagonal = d3.svg.diagonal()
          .projection( function(d) { return [d.y, d.x]; } );
        //
        this.svg = d3.select("nav.nav");
        //
        this.vis = this.svg.append("svg:svg");
        //
        this.main = this.vis
          .append("svg:g")
            .attr("class", "main " + this.collection.getActiveThesaurus().named_id);  

        this.setSize();
     
        if(this.root) this.render(this.root);

      //}
 
    },
    //render the nav
    render : function renderNav(source) {

      if(source !== undefined){
      
      //if(this.collection.loaded){
      // Compute the new tree layout.
      var nodes = this.tree.nodes(this.root).reverse(),
          links = this.tree.links(nodes);

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { d.y = d.depth * 180; });

      // Update the nodes…
      var node = this.main.selectAll("g.node")
          .data(nodes, function(d) { return d.id || (d.id = ++this.i); });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("g")
          .attr("class", function(d){ return d.filtered ? "node node_"+d.id+" filtered": "node node_"+d.id; })
          .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; });

      nodeEnter.append("circle")
          .attr("r", 1e-6)
          .attr("class", function(d) { return d._children ? "children" : ""; })
          .on("click", this.toggleNode.bind(this));

      nodeEnter.append("text")
          .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
          .attr("dy", ".35em")
          .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
          .text(function(d) { return d.name; })
          .style("fill-opacity", 1e-6)
          .on("click", this.selectNode.bind(this));

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
          .duration(this.duration)
          .attr("class", function(d){ return d.filtered ? "node node_"+d.id+" filtered": "node node_"+d.id; })
          .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

      nodeUpdate.select("circle")
          .attr("r", 4.5)
          .attr("class", function(d) { return d._children ? "children" : ""; });

      nodeUpdate.select("text")
          .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
          .duration(this.duration)
          .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
          .remove();

      nodeExit.select("circle")
          .attr("r", 1e-6);

      nodeExit.select("text")
          .style("fill-opacity", 1e-6);

      // Update the links…
      var link = this.main.selectAll("path.link")
          .data(links, function(d) { return d.target.id; });

      var diagonal = this.diagonal;
      // Enter any new links at the parent's previous position.
      link.enter().insert("path", "g")
          .attr("class", "link")
          .attr("d", function(d) {
            var o = {x: source.x0, y: source.y0};
            return diagonal({source: o, target: o});
          });

      // Transition links to their new position.
      link.transition()
          .duration(this.duration)
          .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
          .duration(this.duration)
          .attr("d", function(d) {
            var o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o});
          })
          .remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });

       this.showSelectedNode();

      }
    },
    //open / close a branch of the tree
    toggleNode: function toggleNodeNav(d, i) {
      if (d.children) {
        d._children = d.children;
        d.children = null;              
      } else {
        d.children = d._children;
        d._children = null;
      }
      this.render(d);
    },
    showSelectedNode: function showSelectedNodeNav() {
      //if(this.collection.loaded){
        d3.select(".node.selected").classed("selected", false);
        var themodel = this.collection.getActiveConcept();
        if(themodel) d3.select(".node_"+ themodel.attributes.id).classed("selected", true);
      //}
    },
    showFilteredNodes: function showFilteredNodesNav() {
      d3.select(".node.filtered").classed("filtered", false);
     
      var thelist = this.collection.getFilteredNodes();
      for(var i=0; i< thelist.length; i++){
        console.log(thelist[i], thelist[i].attributes.id);
        d3.select(".node_"+ thelist[i].attributes.id).classed("filtered", true);
      }
    },
    selectNode: function selectNodeNav(d, i) {
      //send request to the router
      application.router.navigate(application.processUri(d.uri), {trigger : true});
      //backbone being smart enough not to trigger the route if concept already selected
      //we need to make sure the pop-up is open
      //if(this.collection.getActiveConcept().id == d.uri) {
        this.collection.toggleConcept(true);
      //}
      d3.event.stopPropagation();
    }

});
