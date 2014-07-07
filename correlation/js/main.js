window.onload = initialize();
//global variables
var keyArray = ["Obese","Inactive","Accessibility","Fastfood","Diabetic"];
var expressed = keyArray[0];

function initialize () {
	setMap();
	
};

function setMap() {
	
	var width = 600;
	var height = 650;
	
	var map = d3.select("#mapContainer")
		.append("svg")
		.attr("width", width)
		.attr("height", height);
		
	var projection = d3.geo.albers()
		.center([0,34.5])
		.rotate([111.7,0])
		.parallels([28,36])
		.scale(5500)
		.translate([width / 2,height / 2]);
	
	var path = d3.geo.path()
		.projection(projection);
		
	d3.csv("data/ArizonaData.csv", function(csvData) {
	
		drawPcp(csvData);
		
		var  recolorMap  =  colorScale(csvData); 
		d3.json("data/arizona-topo.json", function(error, arizona) {
			
		var keyArray = ["Obese","Inactive","Accessibility","Fastfood","Diabetic"];
		var jsonCounties = arizona.objects.arizona.geometries;
		
			for (var i=0; i<csvData.length; i++) {
				var csvCounties = csvData[i];
				var csvCNTYID = csvCounties.cntyId;
				
				for (var a=0; a<jsonCounties.length; a++) {

					if (jsonCounties[a].properties.cntyId == csvCounties.cntyId) {
						
						for (var b=0; b<keyArray.length; b++) {
								var key = keyArray[b];
								var val = parseFloat (csvCounties[key]);
								jsonCounties[a].properties[key] = val;
						};
						jsonCounties[a].properties.name = csvCounties.NAMELSAD00;
						break;
					}
				}
			}
					
		var counties = map.selectAll(".counties") 
			.data(topojson.object(arizona, arizona.objects.arizona).geometries)
			.enter()
			.append("path")
			.attr("class", "counties")
			.attr("id", function(d) { return d.properties.cntyId; })
			.attr("d", path)
			.style("fill", function(d) { //color enumeration units
					return choropleth(d, recolorMap);
			})
			.on("mouseover", highlight)
			.on("mouseout", dehighlight)
			.on("mousemove", moveLabel)
			.append("desc") //append the current color as a desc element
				.text(function(d) { 
					return choropleth(d, recolorMap); 
			   		});
		});
	});
};

function colorScale(csvData){

	//create quantile classes w/ color scale
	var color = d3.scale.quantile() 
		.range([
			"#C8B498",
			"#C2947F",
			"#986A53",
			"#824B3B",
			"#5E3227"
		]);
		
		//set min and max data values as domain
	color.domain([
		d3.min(csvData, function(d) { return Number(d[expressed]); }),
		d3.max(csvData, function(d) { return Number(d[expressed]); })
	]);

	//return the color scale generator
	return color;	

}
	
function choropleth(d, recolorMap){
	//<-setMap d3.json provinces.style
	
	//Get data value
	var value = d.properties[expressed];
	//If value exists, assign it a color; otherwise assign gray
	if (value) {
		return recolorMap(value);
	} else {
		return "#ccc";
	}
}

function drawPcp(csvData){
	//pcp dimensions
	var width = 600;
	var height = 400;
		
	//create attribute names array for pcp axes
	var keys = [], attributes = [];
	//fill keys array with all property names
	for (var key in csvData[0]){
		keys.push(key);
	};
	//fill attributes array with only the attribute names
	for (var i=3; i<keys.length; i++){
		attributes.push(keys[i]);
	};
	
	//create horizontal pcp coordinate generator
	var coordinates = d3.scale.ordinal() //create an ordinal scale for plotting axes
		.domain(attributes) //horizontally space each attribute's axis evenly
		.rangePoints([0, width]); //set the horizontal scale width as the SVG width
		
    var axis = d3.svg.axis() //create axis generator
		.orient("left"); //orient generated axes vertically
	
	//create vertical pcp scale
	scales = {}; //object to hold scale generators
	attributes.forEach(function(att){ //for each attribute
    	scales[att] = d3.scale.linear() //create a linear scale generator for the attribute
        	.domain(d3.extent(csvData, function(data){ //compute the min and max values of the scale
				return +data[att]; //create array of data values to compute extent from
			})) 
        	.range([height, 0]); //set the height of each axis as the SVG height
	});
	
	var line = d3.svg.line(); //create line generator
	
	//create a new svg element with the above dimensions
	var pcplot = d3.select("#pcpContainer")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "pcplot") //for styling
		.append("g") //append container element
		.attr("transform", d3.transform( //change the container size/shape
			"scale(0.85, 0.6),"+ //shrink
			"translate(96, 50)")); //move
	
	//add lines
	var pcpLines = pcplot.append("g") //append a container element
		.attr("class", "pcpLines") //class for styling lines
		.selectAll("path") //prepare for new path elements
		.data(csvData) //bind data
		.enter() //create new path for each line
		.append("path") //append each line path to the container element
		.attr("id", function(d){
			return d.cntyId //id each line by admin code
		})
		.attr("d", function(d){
			return line(attributes.map(function(att){ //map coordinates for each line to arrays object for line generator
				return [coordinates(att), scales[att](d[att])]; //x and y coordinates for line at each axis
			}));
		})
		.on("mouseover", highlight)
		.on("mouseout", dehighlight)
		.on("mousemove", moveLabel);
	
	//add axes	
	var axes = pcplot.selectAll(".attribute") //prepare for new elements
		.data(attributes) //bind data (attribute array)
		.enter() //create new elements
		.append("g") //append elements as containers
		.attr("class", "axes") //class for styling
		.attr("transform", function(d){
			return "translate("+coordinates(d)+")"; //position each axis container
		})
		.each(function(d){ //invoke the function for each axis container element
			d3.select(this) //select the current axis container element
				.call(axis //call the axis generator to create each axis path
					.scale(scales[d]) //generate the vertical scale for the axis
					.ticks(0) //no ticks
					.tickSize(0) //no ticks, I mean it!
				)
				.attr("id", d) //assign the attribute name as the axis id for restyling
				.style("stroke-width", "10px") //style each axis		
				.on("click", function(){ //click listener
					sequence(this, csvData);
				});	
		});
		
	pcplot.select("#"+expressed) //select the expressed attribute's axis for special styling
		.style("stroke-width", "10px");

};
function highlight(data){
 	//<-setMap d3.json provinces.on("mouseover"...
	
	var props = datatest(data);	//standardize json or csv data
	console.log('in highlight',props);
	d3.selectAll('#mapContainer')
		.select("#"+props.cntyId) //select the current province in the DOM
		.style("opacity", ".7"); //set the enumeration unit fill to black
	
	
	//highlight corresponding pcp line
	d3.selectAll(".pcpLines") //select the pcp lines
		.select("#"+props.cntyId) //select the right pcp line
		.style("stroke","dodgerblue"); //restyle the line
	
	if(props.NAMELSAD00) {
		var tempName = props.NAMELSAD00;
		var targetMug = '#pcpContainer';
	} else if(props.name) {
		var tempName = props.name;	
		var targetMug = '#mapContainer';
		
	}
	console.log('tempname',tempName);
	var labelAttribute = "<h2>"+tempName+"</h2><h3>"+expressed+": "+props[expressed]+"</h3>"; //html string for attribute in dynamic label
		
	//create info label div
	var infolabel = d3.select(targetMug).append("div")
		.attr("class", "infolabel") //for styling label
		.html(labelAttribute) //add text
	
	
	
}
		
 	//<-drawPcp pcpLines.on("mouseover"...
 		
function datatest(data){
	if (data.properties){ //if json data
		return data.properties;
	} else { //if csv data
		return data;
	};
};
function dehighlight(data){
	var props = datatest(data);	//standardize json or csv data
	
	var prov = d3.select("#"+props.cntyId); //designate selector variable for brevity
	//var fillcolor = prov.select("desc").text(); //access original color from desc
	prov.style("opacity", 1); //reset enumeration unit to orginal color
	
 	//dehighlight corresponding pcp line
 	d3.selectAll(".pcpLines") //select the pcp lines
 		.select("#"+props.cntyId) //select the right pcp line
 		.style("stroke","sienna"); //restyle the line
 	
 	d3.select(".infolabel").remove(); //remove info label
};
function moveLabel() {
		var x = d3.mouse(this)[0]+25; //horizontal label coordinate based mouse position stored in d3.event
		var y = d3.mouse(this)[1]-40; //vertical label coordinate
		
		d3.select(".infolabel") //select the label div for moving
			.style("left", x+"px") //reposition label horizontal
			.style("top", y+"px"); //reposition label vertical
};
function sequence(axis, csvData){
		//<-drawPcp axes.each.on("click"...
		
		//restyle the axis
		d3.selectAll(".axes") //select every axis
			.style("stroke-width", "10px"); //make them all thin
		axis.style.strokeWidth = "15px"; //thicken the axis that was clicked as user feedback
		
		expressed = axis.id; //change the class-level attribute variable
		
		//recolor the map
		d3.selectAll(".counties") //select every province
			.style("fill", function(d) { //color enumeration units
				return choropleth(d, colorScale(csvData)); //->
			})
			.select("desc") //replace the color text in each province's desc element
 			.text(function(d) {
 				return choropleth(d, colorScale(csvData)); //->
 			});
	};