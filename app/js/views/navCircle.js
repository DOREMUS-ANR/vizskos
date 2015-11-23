var View = require('./view');
var application = require('../application');
module.exports = View.extend({
    events: {
      'scroll': 'changeScale',
    },
    changeScale: function zoomNav() {
      this.main.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    },
    initSize: function initSizeNav() {
      this.height = $(window).height() ;
      this.width = $(window).width() ;
      this.whiteRadius = 120;
      this.yRadius = (this.height - 40) / 2;
      this.xRadius = this.yRadius;
      this.rotate = 0;
      this.x = d3.scale.linear().range([0, this.width]),
      this.y = d3.scale.linear().range([0, this.height]);
      this.duration = 750;
    },
    setSize: function setSizeNav(){
      this.initSize();
      
      this.cluster
        .size([360, this.yRadius - this.whiteRadius]);

      this.svg
        .style("width", this.width + "px")
        .style("height", this.height + "px");

      this.vis
        .attr("width", this.width)
        .attr("height", this.height);
    },
    resize: function resizeNav() {
      
      this.setSize();
      this.render(this.root);
    },

    // The NavView listens for changes to its model, re-rendering.
    afterInit: function afterInitNav(){
  
      this.listenTo(this.collection, 'conceptChanged', this.showSelectedNode);
      this.listenTo(this.collection, 'dataChanged', this.dataChanged);  

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
    // Re-renders the titles of the todo item.
    preRender: function preRenderNav() {
      
      //if(this.collection.loaded){
        $("nav.nav").empty();
        this.cluster = d3.layout.tree()
          .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
   
        //
        this.diagonal = d3.svg.diagonal.radial()
          .projection( function(d) { return [d.y, d.x / 180 * Math.PI]; } );
        //
        
        this.svg = d3.select("#vizskos .nav");
        //this.svg.empty();
        this.vis =  d3.select("#vizskos .nav svg");
        if(this.vis) this.vis.remove();

        this.vis = this.svg.append("svg:svg");
        //
        this.main = this.vis
          .append("svg:g")
            .attr("class", "main " + this.collection.getActiveThesaurus().named_id);

        //partition view
        this.partition = d3.layout.partition()
          .value(function(d) { return d.size; });

        this.zoom = d3.behavior.zoom()
          .on("zoom", this.changeScale.bind(this));
        
        this.arc = this.main.append("svg:path")
          .attr("class", "arc");

        this.setSize();
        
        if(this.root) this.render(this.root);
        
        
      //}
     
    },
    render : function renderNav(source) {
      //console.log("la source", source.x, source.x0, this.xRadius, this.yRadius);
      if(source !== undefined){
      
        var nodes = this.cluster.nodes(this.collection.conceptTree);
        var links = this.cluster.links(nodes);
        var whiteRadius = this.whiteRadius;

        this.main
            .attr("transform", "translate(" + (100 + this.xRadius ) + "," + (25 + this.yRadius) + ")");

        this.main.call(this.zoom);

        var node = this.main.selectAll("g.node").data(nodes);
        var link = this.main.selectAll("path.link").data(links);
        
        this.arc.attr("d", d3.svg.arc().innerRadius(this.yRadius - this.whiteRadius).outerRadius(this.yRadius).startAngle(0).endAngle(2 * Math.PI));

        var linkEnter = link.enter()
          .append("svg:path")
            .attr("class", "link")
            .attr("d", this.diagonal);

        var linkUpdate = link.transition()
          .duration(this.duration)
          .attr("d", this.diagonal);
         

        var linkExit = link.exit().transition()
          .duration(this.duration)
          .attr("transform", function(d,i) {return "rotate(" + (source.x - 90) + ")translate(" + (source.y ) + ")"; })
          .remove();

        var nodeEnter = node.enter()
          .append("svg:g")
            .attr("class", function(d) { return d.children ? "node parent node_" + d.id : "node child node_" + d.id; })
            .attr("transform", function(d,i) { return  "rotate(" + (source.x - 90) + ")translate(" + (source.y ) + ")"; });
        

        var nodeEnterCircle = nodeEnter.append("svg:circle")
          .attr("r", 4,5)
          .attr("class", function(d) { return d._children ? "children" : ""; })
          .on("mousedown", this.toggleNode.bind(this) );

        var nodeEnterLabel = nodeEnter.append("svg:text")
          .attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
          .attr("dy", ".31em")
          .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
          .attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
          .text(function(d) { return d.name; })
          .on("mousedown", this.selectNode.bind(this) );

        var nodeUpdate = node.transition()
          .duration(this.duration)
          .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y ) + ")"; });

        nodeUpdate.select("circle")
          .attr("class", function(d) { return d._children ? "children" : ""; });
        

        var nodeExit = node.exit()
          .transition()
            .duration(this.duration)
            .attr("transform", function(d) { return "rotate(" + (source.x - 90) + ")translate(" + (source.y ) + ")"; })
            .remove();

        nodeExit.select("circle")
          .attr("r", 1e-6);

        nodeExit.select("text")
          .style("fill-opacity", 1e-6);

        // Stash the old positions for transition.
        node.forEach(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });

        this.showSelectedNode();
      }
    },
    //open / close a branch of the tree
    toggleNode: function toggleNodeNav(d, i) {
            //open all nodes
      function toggleChildren (node, open){
        console.log(node,open)
        if(!open && node.children){
          node._children = node.children;
          node.children = null;
        }else if(open && node._children){
          node.children = node._children;
          node._children = null;
        }
      }
      //open all children
      function openAllChildren (node){
        var children = node.children || node._children;
        if(children){
          for (var i = 0; i < children.length; i++){
            //console.log("element",node.children[i]);
            toggleChildren(children[i], true);
            openAllChildren(children[i]);
          }
        }
      }
      openAllChildren(this.root);
      //
      function closeSiblings(node){
        if (!node.parent) return;
         var siblings = node.parent.children;
         for (var i = 0; i < siblings.length; i++){
          if(siblings[i].uri !== node.uri){
            toggleChildren(siblings[i], false);
            closeSiblings(siblings[i].parent);
          }
          //console.log(d);
        }
      }

     closeSiblings(d);
      this.render(this.root)
    },
    //highlight selected node (listener conceptChanged)
    showSelectedNode: function showSelectedNodeNav(uri) {
      d3.select(".node.selected").classed("selected", false);
      var themodel = this.collection.getActiveConcept();
      if(themodel) d3.select(".node_"+ themodel.attributes.id).classed("selected", true);
    },
    //when a node is clicked
    selectNode: function selectNodeNav(d, i) {
      //send request to the router
      application.router.navigate(application.processUri(d.uri), {trigger : true});
      //backbone being smart enough not to trigger the route if concept already selected
      //we need to make sure the pop-up is open
      //if(this.collection.getActiveConcept() && this.collection.getActiveConcept().id == d.uri) {
        this.collection.toggleConcept(true);
      //}
      d3.event.stopPropagation();
    }

});
