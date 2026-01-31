function _1(md){return(
md`<div style="color: grey; font: 13px/25.5px var(--sans-serif); text-transform: uppercase;"><h1 style="display: none;">Zoom to bounding box</h1><a href="https://d3js.org/">D3</a> › <a href="/@d3/gallery">Gallery</a></div>

# Canada Federal Electoral Districts 2025

Interactive map of Canada's 352 federal election ridings. Click on any riding to zoom in, or click the background to reset. Pan and zoom with mouse/trackpad.`
)}

function _chart(d3,ridings,coastline)
{
  const width = 975;
  const height = 610;

  const zoom = d3.zoom()
      .scaleExtent([1, 40])  // Increased max zoom for smaller ridings
      .on("zoom", zoomed);

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
       .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto; background-color: #e6f3ff;")  // Light blue ocean background
      .on("click", reset);

  // Use Albers projection optimized for Canada
  // This projection minimizes distortion for Canada's latitudes
  const projection = d3.geoAlbers()
      .center([0, 62])  // Center on Canada
      .rotate([96, 0])  // Rotate to center Canada
      .parallels([49, 77])  // Standard parallels for Canada
      .scale(700)
      .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  const g = svg.append("g");

  // Create a clipping path from the coastline to trim ridings to land only
  const defs = svg.append("defs");
  const clipPath = defs.append("clipPath")
      .attr("id", "canada-land-clip");

  // Add coastline as the clipping boundary
  clipPath.selectAll("path")
      .data(coastline.features)
      .join("path")
      .attr("d", path);

  // Create a subtle color palette for ridings
  // Using a province-based or region-based coloring for better visual organization
  const getRegionColor = (d) => {
    const name = d.properties.ED_NAMEE;
    // Color by region/province for visual grouping
    if (name.includes("Newfoundland") || name.includes("Labrador")) return "#e8f4f8";
    if (name.includes("Prince Edward Island") || name.includes("Charlottetown")) return "#fef3e2";
    if (name.includes("Nova Scotia") || name.includes("Halifax") || name.includes("Cape Breton")) return "#e6f3e6";
    if (name.includes("New Brunswick") || name.includes("Moncton") || name.includes("Fredericton")) return "#f0e6f6";
    if (name.includes("Quebec") || name.includes("Montréal") || name.includes("Québec") || name.includes("Laval")) return "#e6f2ff";
    if (name.includes("Ontario") || name.includes("Toronto") || name.includes("Ottawa") || name.includes("Hamilton")) return "#fff4e6";
    if (name.includes("Manitoba") || name.includes("Winnipeg")) return "#ffe6e6";
    if (name.includes("Saskatchewan") || name.includes("Regina") || name.includes("Saskatoon")) return "#f0ffe6";
    if (name.includes("Alberta") || name.includes("Calgary") || name.includes("Edmonton")) return "#ffe6f7";
    if (name.includes("British Columbia") || name.includes("Vancouver") || name.includes("Victoria")) return "#e6fff7";
    if (name.includes("Yukon")) return "#f5f5f5";
    if (name.includes("Northwest Territories")) return "#f8f8f8";
    if (name.includes("Nunavut")) return "#fbfbfb";
    // Default color for any unmatched ridings
    return "#f9f9f9";
  };

  // Create a clipped group for ridings (so they only show within Canada's land boundaries)
  const clippedGroup = g.append("g")
      .attr("clip-path", "url(#canada-land-clip)");

  // Draw ridings inside the clipped area (bottom layer)
  const ridingPaths = clippedGroup.append("g")
      .attr("class", "ridings")
      .attr("cursor", "pointer")
    .selectAll("path")
    .data(ridings.features)
    .join("path")
      .attr("fill", d => getRegionColor(d))
      .attr("stroke", "#666")  // Darker gray for boundaries
      .attr("stroke-width", 0.3)
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke")  // Keep stroke width constant when zooming
      .on("click", clicked)
      .on("mouseover", function(event, d) {
        // Highlight on hover
        d3.select(this)
          .raise()  // Bring to front
          .transition()
          .duration(100)
          .attr("fill", "#ffeb3b")  // Bright yellow highlight
          .attr("stroke", "#333")
          .attr("stroke-width", 1);
      })
      .on("mouseout", function(event, d) {
        if (d3.select(this).classed("selected")) {
          d3.select(this)
            .attr("fill", "#ffc107")  // Keep selected color
            .attr("stroke", "#333")
            .attr("stroke-width", 1);
        } else {
          d3.select(this)
            .transition()
            .duration(100)
            .attr("fill", getRegionColor(d))
            .attr("stroke", "#666")
            .attr("stroke-width", 0.3);
        }
      })
      .attr("d", path);

  ridingPaths.append("title")
      .text(d => `${d.properties.ED_NAMEE} (${d.properties.FED_NUM})`);

  // Add Canada's natural coastline outline on top
  // This creates a clear visual boundary between land and ocean
  const coastlineLayer = g.append("g")
      .attr("class", "coastline")
      .attr("pointer-events", "none");  // Don't interfere with riding clicks

  // Draw the coastline as an outline only
  coastlineLayer.selectAll("path")
      .data(coastline.features)
      .join("path")
      .attr("fill", "none")  // No fill, just outline
      .attr("stroke", "#1e4d8b")  // Dark blue for coastline
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("vector-effect", "non-scaling-stroke")
      .attr("d", path);

  // Add riding info display
  const info = svg.append("g")
      .attr("transform", "translate(10, 20)")
      .style("font-family", "sans-serif")
      .style("font-size", "14px");

  info.append("text")
      .attr("id", "riding-info")
      .attr("fill", "#333")
      .text("Click on a riding to zoom in");

  svg.call(zoom);

  function reset() {
    ridingPaths.classed("selected", false);
    ridingPaths.transition()
      .duration(300)
      .attr("fill", d => getRegionColor(d))
      .attr("stroke", "#666")
      .attr("stroke-width", 0.3);

    info.select("#riding-info")
      .text("Click on a riding to zoom in");

    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
    );
  }

  function clicked(event, d) {
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    event.stopPropagation();

    // Update selection
    ridingPaths.classed("selected", false);
    d3.select(this).classed("selected", true);

    // Reset all ridings to default colors
    ridingPaths
      .attr("fill", function(d) {
        return d3.select(this).classed("selected") ?
          "#ffc107" : getRegionColor(d);
      })
      .attr("stroke", function() {
        return d3.select(this).classed("selected") ? "#333" : "#666";
      })
      .attr("stroke-width", function() {
        return d3.select(this).classed("selected") ? 1 : 0.3;
      });

    // Bring selected to front
    d3.select(this).raise();

    // Update info text
    info.select("#riding-info")
      .text(`${d.properties.ED_NAMEE} (District #${d.properties.FED_NUM})`);

    // Calculate zoom to fit the selected riding
    const dx = x1 - x0;
    const dy = y1 - y0;
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;
    const scale = Math.min(40, 0.9 / Math.max(dx / width, dy / height));

    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-x, -y)
    );
  }

  function zoomed(event) {
    const {transform} = event;
    g.attr("transform", transform);
    // Stroke width is maintained constant via vector-effect="non-scaling-stroke"
  }

  return svg.node();
}


function _ridings(FileAttachment){return(
FileAttachment("canada-ridings-latlon.json").json()
)}

function _coastline(FileAttachment){return(
FileAttachment("canada-coastline-ne10m.json").json()
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["canada-ridings-latlon.json", {url: new URL("./files/canada-ridings-latlon.json", import.meta.url), mimeType: "application/json", toString}],
    ["canada-coastline-ne10m.json", {url: new URL("./files/canada-coastline-ne10m.json", import.meta.url), mimeType: "application/json", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("chart")).define("chart", ["d3","ridings","coastline"], _chart);
  main.variable(observer("ridings")).define("ridings", ["FileAttachment"], _ridings);
  main.variable(observer("coastline")).define("coastline", ["FileAttachment"], _coastline);
  return main;
}
