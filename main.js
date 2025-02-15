// 1: SET GLOBAL VARIABLES
const margin = { top: 50, right: 30, bottom: 60, left: 70 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create the SVG container and group element for the chart
const svgLine = d3.select("#lineChart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// 2: LOAD DATA
d3.csv("nobel_laureates.csv").then(data => {
    // Relevant columns:
    // - fullname -> name (y variable)
    // - year (x variable)
    // - category (color variable)

    // 2.a: REFORMAT DATA
    data.forEach(d => {
        d["year"] = +d["year"];       // Convert year to a number
        d["name"] = d["fullname"];    // Rename column for clarity
    });

    // Check your work:
    // console.log("Raw data:", data);
    // console.log("Years:", data.map(d => d.year));

    // --- STUDENTS START HERE ---
    // 3: PREPARE DATA
    // 3.a: Categorize data into STEM and Non-STEM
    // Example: Group "physics" into STEM, "literature" into Non-STEM
    const stemCategories = ["medicine", "physics", "chemistry"];
    const categorizedData = data.map(d => ({
        ...d, // copy object
        categoryGroup: stemCategories.includes(d.category) ? "STEM" : "Non-STEM" // if it is in the list of stem categories, label STEM, otherwise non-STEM
    }));

    // console.log(categorizedData);
    // console.log("STEM vs. Non-STEM:", categorizedData.slice(0, 5).map(d => ({
    //     category: d,
    //     categoryGroup: d.categoryGroup
    // })));

    // 3.b: Group data by categoryGroup and year, and count entries
    // Use d3.rollup to create a nested data structure
    const categories = d3.rollup(categorizedData,
        v => d3.rollup(v,
            values => values.length,
            d => d.year
        ),
        d => d.categoryGroup // Group by the new "STEM/Non-STEM" category
    );

    // Check your work:
    // console.log("Categories:", categories);

    // 4: SET SCALES
    // set up variables
    const allYears = Array.from(categories.values())
        .flatMap(yearMap => Array.from(yearMap.keys()));

    // console.log(allYears);

    const yearCounts = Array.from(categories.values())
        .map(categoryMap =>
            Array.from(categoryMap.values())
        );
    const maxCount = d3.max(yearCounts, yearValues => d3.max(yearValues));
    // console.log("max counts:", maxCount);

    // 4.a: Define xScale for years using d3.scaleLinear
    const xScale = d3.scaleLinear()
        .domain(d3.extent(allYears)) // use flat list of years to find min and max
        .range([0, width]);
    // 4.b: Define yScale based on the max count of laureates
    const yScale = d3.scaleLinear()
        .domain([0, maxCount + 1]) // add padding so scale isn't so tight
        .range([height, 0]);
    // 4.c: Define colorScale using d3.scaleOrdinal with categories as the domain
    const customColors = ["#3FCF47", "#CF3F9D"]
    const colorScale = d3.scaleOrdinal()
        .domain(Array.from(categories.keys())) // use keys of main Map (category names)
        // .range(d3.schemeCategory10); // set color scheme
        .range(customColors);
    // 4.d: Create line generator
    const line = d3.line()
        .x(d => xScale(d.year))  // year for x position
        .y(d => yScale(d.count)); // count for y position

    // 5: PLOT LINES
    // 5.a: CREATE PATH
    // - Use d3.line() to generate paths from grouped data.
    // - Convert the nested data structure into an array of objects containing x (year) and y (count).
    const dataArray = Array.from(categories.entries());
    // console.log("data array:", dataArray);

    svgLine.selectAll("path")
        .data(dataArray)
        .enter()
        .append("path")
        // 5.b: PLOT LINE
        // - Bind data to <path> elements and use the "d" attribute to draw lines.
        // - Add a "class" to each line for styling.
        .attr("d", d => {
            // const category = d[0];
            const yearMap = d[1]; // look at each map in the array
            const values = Array.from(yearMap.entries()) // map -> array -> object
                .map(([year, count]) => ({ year, count })); 
            return line(values);
        })
        // 5.c: ADD STYLE
        // - Use the colorScale to set the "stroke" attribute for each line.
        // - Add stroke-width and optional hover effects.
        .style("stroke", d => colorScale(d[0])) // stroke based off color scale
        .style("fill", "none")
        .style("stroke-width", 2);

    // console.log(colorScale("STEM")); // color for STEM

    // 6: ADD AXES
    // 6.a: X-AXIS
    // - Use d3.axisBottom(xScale) to create the x-axis.
    // - Append it to the bottom of the SVG.
    svgLine.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d3.format("d"))); // format the x-axis as years
    // 6.b: Y-AXIS
    // - Use d3.axisLeft(yScale) to create the y-axis.
    // - Append it to the left of the SVG.
    svgLine.append("g")
        .call(d3.axisLeft(yScale));

    // 7: ADD LABELS
    // 7.a: Title
    // - Add a text element above the chart for the chart title.
    svgLine.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .text("Nobel Laureates Trends: STEM vs Non-STEM")
        // .style("font-weight", "bold");
    // 7.b: X-axis label
    // - Add a text element below the x-axis to describe it (e.g., "Year").
    svgLine.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 12)
        .attr("text-anchor", "middle")
        .text("Year");
    // 7.c: Y-axis label
    // - Add a rotated text element beside the y-axis to describe it (e.g., "Number of Laureates").
    svgLine.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 30)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .text("Number of Laureates");

    // 8: LEGEND
    // 8.a: CREATE AND POSITION SHAPE
    // - Use <g> elements to create groups for each legend item.
    // - Position each legend group horizontally or vertically.
    // creates empty box to put legend in top right corner
    const legend = svgLine.selectAll(".legend")
        .data(Array.from(categories.entries()))  // convert the Map to an array for the legend
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${width - 150}, ${i * 20 - 30})`);
    // 8.b: ADD COLOR SQUARES
    // - Append <rect> elements to the legend groups.
    // - Use colorScale to set the "fill" attribute for each square.
    legend.append("rect")
        .attr("x", 50)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", d => colorScale(d[0])); // use category name for color
    // 8.c: ADD TEXT
    // - Append <text> elements to the legend groups.
    // - Position and align the text beside each color square.
    legend.append("text")
        .attr("x", 65)
        .attr("y", 6)
        .attr("text-anchor", "start")
        .style("alignment-baseline", "middle")
        .style("font-size", "14px")
        .style("font-family", "Arial, sans-serif")
        .style("fill", "#444")
        .text(d => d[0]); // use category name as text
});
