function _1(md){return(
md`<div style="color: grey; font: 13px/25.5px var(--sans-serif); text-transform: uppercase;"><h1 style="display: none;">Zoom to bounding box</h1><a href="https://d3js.org/">D3</a> › <a href="/@d3/gallery">Gallery</a></div>

# Canada Federal Election 2025`
)}

function _chart(d3,ridings,coastline,results,provinces)
{
  const baseWidth = 975;
  const baseHeight = 610;
  const width = Math.max(baseWidth, Math.floor(window.innerWidth * 0.95));
  const height = Math.max(baseHeight, Math.floor(window.innerHeight * 0.75));
  const projectionScale = 700 * Math.min(width / baseWidth, height / baseHeight);

  const zoom = d3.zoom()
      .scaleExtent([1, 40])  // Increased max zoom for smaller ridings
      .on("zoom", zoomed);

  const container = d3.create("div")
      .style("position", "relative")
      .style("width", "100%")
      .style("max-width", "100%")
      .style("height", "auto");

    const svg = container.append("svg")
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
      .scale(projectionScale)
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

  const resultsByDistrict = d3.group(results, d => d["Electoral District Number"]);

  const provinceOverrides = new Map([
    ["10006", "Newfoundland and Labrador"],
    ["59042", "British Columbia"],
    ["59027", "British Columbia"]
  ]);

  const provinceByDistrict = new Map();
  if (provinces && provinces.features) {
    const provinceFeatures = provinces.features;
    ridings.features.forEach((riding) => {
      const districtNum = String(riding.properties.FED_NUM);
      const centroid = d3.geoCentroid(riding);
      const province = provinceFeatures.find((p) => d3.geoContains(p, centroid));
      const provinceName = province?.properties?.name ? String(province.properties.name) : null;
      if (provinceName) {
        provinceByDistrict.set(districtNum, provinceName);
      }
    });
  }

  const getPartyColor = (party) => {
    const name = String(party || "").toLowerCase();
    if (name.includes("liberal")) return "#d7191c";
    if (name.includes("conservative")) return "#2166ac";
    if (name.includes("ndp") || name.includes("new democratic")) return "#f28e2b";
    if (name.includes("green")) return "#1a9850";
    if (name.includes("people's party") || name.includes("ppc")) return "#6a1b9a";
    if (name.includes("bloc")) return "#4fc3f7";
    return "#555";
  };

  const winnerPartyByDistrict = new Map();
  resultsByDistrict.forEach((rows, districtNum) => {
    const winner = rows
      .slice()
      .sort((a, b) => d3.descending(+a["Total Votes"], +b["Total Votes"]))[0];
    if (winner) {
      winnerPartyByDistrict.set(String(districtNum), winner["Political Party"]);
    }
  });

  const getRidingFill = (d) => {
    const districtNum = String(d.properties.FED_NUM);
    const party = winnerPartyByDistrict.get(districtNum);
    return party ? getPartyColor(party) : getRegionColor(d);
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
      .attr("fill", d => getRidingFill(d))
      .attr("stroke", "#fff")  // White boundaries for visibility
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
          .attr("stroke", "#fff")
          .attr("stroke-width", 1);
      })
      .on("mouseout", function(event, d) {
        if (d3.select(this).classed("selected")) {
          d3.select(this)
            .attr("fill", "#ffc107")  // Keep selected color
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);
        } else {
          d3.select(this)
            .transition()
            .duration(100)
            .attr("fill", getRidingFill(d))
            .attr("stroke", "#fff")
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

    const infoBox = container.append("div")
      .style("position", "absolute")
      .style("display", "none")
      .style("max-width", "320px")
      .style("background", "rgba(255, 255, 255, 0.98)")
      .style("border", "1px solid #d0d7de")
      .style("border-radius", "8px")
      .style("box-shadow", "0 8px 24px rgba(0,0,0,0.12)")
      .style("padding", "10px 12px")
      .style("font-family", "sans-serif")
      .style("font-size", "13px")
      .style("color", "#222")
      .style("pointer-events", "none")
      .style("left", "12px")
      .style("top", "12px");

  function renderInfo(districtNum, districtName) {
    if (!districtNum) {
      infoBox.style("display", "none");
      return;
    }

    const rows = resultsByDistrict.get(String(districtNum)) || [];
    const districtKey = String(districtNum);
    const province = provinceOverrides.get(districtKey) || provinceByDistrict.get(districtKey);
    const provinceLabel = province ? String(province) : "";
    const provinceRow = provinceLabel
      ? `<div style="font-weight:700; font-size:14px; text-transform:uppercase;">${provinceLabel}</div>`
      : "";
    const districtRow = `<div style="font-weight:700; font-size:14px; text-transform:uppercase;">${districtNum} — ${districtName}</div>`;
    const header = `
      <div style="margin-bottom:6px;">
        ${provinceRow}
        ${districtRow}
      </div>
    `;

    let body = "";
    if (rows.length === 0) {
      body = "<div>No results available.</div>";
    } else {
      const headerRow = `
        <div style="display:grid; grid-template-columns: 0.9fr 2.1fr 0.8fr 0.6fr; column-gap:12px; font-weight:600; color:#444;">
          <div>Party</div>
          <div style="padding-left:6px;">Candidate</div>
          <div style="text-align:right;">Vote</div>
          <div style="text-align:right;">%</div>
        </div>
        <div style="border-top:1px solid #e1e4e8; margin:6px 0;"></div>
      `;
      const lines = rows
        .slice()
        .sort((a, b) => d3.descending(+a["Total Votes"], +b["Total Votes"]))
        .map((row) => {
          const share = row["Vote Share (%)"] ? `${row["Vote Share (%)"]}%` : "";
          const color = getPartyColor(row["Political Party"]);
          return `
            <div style="display:grid; grid-template-columns: 0.9fr 2.1fr 0.8fr 0.6fr; column-gap:12px; margin:2px 0;">
              <div style="color:${color};">${row["Political Party"]}</div>
              <div style="padding-left:6px;">${row["Candidate Full Name"]}</div>
              <div style="text-align:right;">${row["Total Votes"]}</div>
              <div style="text-align:right;">${share}</div>
            </div>
          `;
        })
        .join("");
      body = headerRow + lines;
    }

    infoBox.html(header + body)
      .style("display", "block");
  }

  svg.call(zoom);

  function reset() {
    ridingPaths.classed("selected", false);
    ridingPaths.transition()
      .duration(300)
      .attr("fill", d => getRidingFill(d))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.3);

    renderInfo();

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
          "#ffc107" : getRidingFill(d);
      })
      .attr("stroke", function() {
        return d3.select(this).classed("selected") ? "#fff" : "#fff";
      })
      .attr("stroke-width", function() {
        return d3.select(this).classed("selected") ? 1 : 0.3;
      });

    // Bring selected to front
    d3.select(this).raise();

    // Update info text
    renderInfo(d.properties.FED_NUM, d.properties.ED_NAMEE);

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

  return container.node();
}


function _ridings(FileAttachment){return(
FileAttachment("canada-ridings-latlon.json").json()
)}

function _coastline(FileAttachment){return(
FileAttachment("canada-coastline-ne10m.json").json()
)}

function _results(FileAttachment){return(
FileAttachment("result.csv").csv()
)}

function _provinces(FileAttachment){return(
FileAttachment("canada-provinces.geojson").json()
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["canada-ridings-latlon.json", {url: new URL("./files/canada-ridings-latlon.json", import.meta.url), mimeType: "application/json", toString}],
    ["canada-coastline-ne10m.json", {url: new URL("./files/canada-coastline-ne10m.json", import.meta.url), mimeType: "application/json", toString}],
    ["canada-provinces.geojson", {url: new URL("./files/canada-provinces.geojson", import.meta.url), mimeType: "application/json", toString}],
    ["result.csv", {url: new URL("./result.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("chart")).define("chart", ["d3","ridings","coastline","results","provinces"], _chart);
  main.variable(observer("ridings")).define("ridings", ["FileAttachment"], _ridings);
  main.variable(observer("coastline")).define("coastline", ["FileAttachment"], _coastline);
  main.variable(observer("results")).define("results", ["FileAttachment"], _results);
  main.variable(observer("provinces")).define("provinces", ["FileAttachment"], _provinces);
  return main;
}
