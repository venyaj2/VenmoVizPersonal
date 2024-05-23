window.addEventListener("load", () => {
    const globalVenmoData = JSON.parse(window.sessionStorage.getItem('globalVenmoData'));
    console.log("Parsed Data in viz.js:", globalVenmoData);
 
    const { friends, barGraphData, segmentedBarGraphData, categorizedBarGraphData } = processData(globalVenmoData);

    drawSegmentedDoubleBarGraphAggregate(categorizedBarGraphData);
    populateFriendDropdown(friends, barGraphData, segmentedBarGraphData, categorizedBarGraphData);
    populateCategoryDropdown(friends, barGraphData, segmentedBarGraphData, categorizedBarGraphData);
 });
 
 function processData(data) {
    const categorizedVenmoData = categorizeData(data);
    const cleanedVenmoData = preprocessData(categorizedVenmoData);
    const friends = getUniqueFriends(cleanedVenmoData);
    const barGraphData = calculateAmountSpentAndReceivedByUser(cleanedVenmoData, friends);
    const segmentedBarGraphData = getTransactionsByUser(cleanedVenmoData, friends);
    const categorizedBarGraphData = getTransactionsByCategory(cleanedVenmoData);
    return { friends, barGraphData, segmentedBarGraphData, categorizedBarGraphData };
 }
 
 let maxYGlobal = 0;

 function drawSegmentedDoubleBarGraphAggregate(data) {
    d3.select("svg").selectAll("*").remove();
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const width = 1250 - margin.left - margin.right;
    const height = 850 - margin.top - margin.bottom;
    const svg = d3.select("svg");
    svg.attr("width", width).attr("height", height);
    const categories_keys = Object.keys(categories)
 
    const totalReceived = {};
    const totalSpent = {};

    categories_keys.forEach(category => {
        totalReceived[category] = 0;
        totalSpent[category] = 0;

        if (data[category] && data[category].received) {
            data[category].received.forEach(receivedTransaction => {
                totalReceived[category] += receivedTransaction.Amount;
            });
        }

        if (data[category] && data[category].spent) {
            data[category].spent.forEach(spentTransaction => {
                totalSpent[category] += spentTransaction.Amount;
            });
        }
    });

    const xScale = d3.scaleBand()
        .domain(categories_keys)
        .range([margin.left, width-margin.right])
        .padding(0.1);

    maxYGlobal = d3.max([d3.max(Object.values(totalReceived)), d3.max(Object.values(totalSpent))])+20

    const yScale = d3.scaleLinear()
        .domain([0, maxYGlobal])
        .range([height-margin.bottom, margin.top]);

    const colorScale = d3.scaleOrdinal()
        .domain(["spent", "received"])
        .range(["#a6c4e5", "#c4e2b9"]);
    
    categories_keys.forEach((category, index) => {
        const categoryData = data[category];
            // Received bar
            if (categoryData && categoryData.received) {
                let currYReceived = yScale(0);
                categoryData.received.forEach((transaction, i) => {
                    const transactionHeight = yScale(0) - yScale(transaction.Amount);
                    currYReceived -= transactionHeight;
                    svg.append("rect")
                        .attr("class", `bar-received-${index}`)
                        .attr("x", d => xScale(category))
                        .attr("width", xScale.bandwidth() / 2)
                        .attr("y", currYReceived)
                        .attr("height", transactionHeight)
                        .style("fill", colorScale("received"))
                        .on("mouseover", (mouseEvent, d) => showTooltip(mouseEvent, transaction))
                        .on("mousemove", (mouseEvent, d) => moveTooltip(mouseEvent))
                        .on("mouseout", hideTooltip);
                    
                    // Top horizontal edge of each segment (for all except topmost)
                    if (i < categoryData.received.length - 1) {
                        svg.append("rect")
                            .attr("class", `bar-received-${index}`)
                            .attr("x", xScale(category))
                            .attr("width", xScale.bandwidth() / 2)
                            .attr("y", currYReceived)
                            .attr("height", 1) 
                            .style("fill", "black"); 
                    }
                });
            }
        
            // Spent bar
            if (categoryData && categoryData.spent) {
                let currYSpent = yScale(0);
                categoryData.spent.forEach((transaction, i) => {
                    const transactionHeight = yScale(0) - yScale(transaction.Amount);
                    currYSpent -= transactionHeight;
                    svg.append("rect")
                        .attr("class", `bar-spent-${index}`)
                        .attr("x", xScale(category) + xScale.bandwidth() / 2)
                        .attr("width", xScale.bandwidth() / 2)
                        .attr("y", currYSpent)
                        .attr("height", transactionHeight)
                        .style("fill", colorScale("spent"))
                        .on("mouseover", (mouseEvent, d) => showTooltip(mouseEvent, transaction))
                        .on("mousemove", (mouseEvent, d) => moveTooltip(mouseEvent))
                        .on("mouseout", hideTooltip);
                    
                    // Top horizontal edge of each segment (for all except topmost)
                    if (i < categoryData.spent.length - 1) {
                        svg.append("rect")
                            .attr("class", `bar-spent-${index}`)
                            .attr("x", xScale(category) + xScale.bandwidth() / 2)
                            .attr("width", xScale.bandwidth() / 2)
                            .attr("y", currYSpent)
                            .attr("height", 1) 
                            .style("fill", "black"); 
                    }
                });
            }
        });


    const xAxis = svg.append("g")
        .call(d3.axisBottom(xScale))
        .attr("transform", `translate(0,${height-margin.bottom})`);
 
    const yAxis = svg.append("g")
        .call(d3.axisLeft(yScale))
        .attr("transform", `translate(${margin.left},0)`);

    const legendContainer = svg.append("g")
        .attr("transform", `translate(${width - 4.5*margin.right}, ${margin.top+10})`);

    const legend = legendContainer.selectAll(".legend")
        .data(colorScale.domain())
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", colorScale);

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(d => (d === "spent") ? "Spent" : "Received");

    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height - margin.bottom + 45})`)
        .style("text-anchor", "middle")
        .text("Category");
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 40)
        .attr("x", 0 - (height / 2))
        .style("text-anchor", "middle")
        .text("Amount ($)");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .text("Aggregate Spending and Receipts by Category");
 }


 // Function to draw segmented double bar graph for a friend
function drawSegmentedDoubleBarGraphForFriend(friend, data, ogData) {
    d3.select("svg").selectAll("*").remove();

    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const width = 1250 - margin.left - margin.right;
    const height = 850 - margin.top - margin.bottom;
    const svg = d3.select("svg");
    svg.attr("width", width).attr("height", height);

    const xScale = d3.scaleBand()
        .domain(categories_keys)
        .range([margin.left, width - margin.right])
        .padding(0.1);

    // Old maxY code 
    // const maxY = d3.max(categories_keys.map(category => {
    //     const categoryData = ogData[category];
    //     return categoryData ? Math.max(categoryData.spent || 0, categoryData.received || 0) : 0;
    // } ));

    const yScale = d3.scaleLinear()
        .domain([0, maxYGlobal])
        .range([height - margin.bottom, margin.top]);

    const colorScale = d3.scaleOrdinal()
        .domain(["spent", "received"])
        .range(["#a6c4e5", "#c4e2b9"]);

    // Draw bars and segments for each category
    categories_keys.forEach((category, index) => {
        const categoryData = data[category];
         // Received bar
         let currYReceived = yScale(0);
         categoryData.received.forEach((transaction, i) => {
            const transactionHeight = yScale(0) - yScale(transaction.Amount);
            currYReceived -= transactionHeight;
            svg.append("rect")
                .attr("class", `bar-received-${index}`)
                .attr("x", d => xScale(category))
                .attr("width", xScale.bandwidth() / 2)
                .attr("y", currYReceived)
                .attr("height", transactionHeight)
                .style("fill", colorScale("received"))
                .on("mouseover", (mouseEvent, d) => showTooltip(mouseEvent, transaction))
                .on("mousemove", (mouseEvent, d) => moveTooltip(mouseEvent))
                .on("mouseout", hideTooltip);
            
            // Top horizontal edge of each segment (for all except topmost)
            if (i < categoryData.received.length - 1) {
                svg.append("rect")
                    .attr("class", `bar-received-${index}`)
                    .attr("x", xScale(category))
                    .attr("width", xScale.bandwidth() / 2)
                    .attr("y", currYReceived)
                    .attr("height", 1) 
                    .style("fill", "black"); 
            }

        });
        let currYSpent = yScale(0);
        // Spent bar
        categoryData.spent.forEach((transaction, i) => {
            const transactionHeight = yScale(0) - yScale(transaction.Amount);
            currYSpent -= transactionHeight;
            svg.append("rect")
                .attr("class", `bar-spent-${index}`)
                .attr("x", xScale(category) + xScale.bandwidth() / 2)
                .attr("width", xScale.bandwidth() / 2)
                .attr("y", currYSpent)
                .attr("height", transactionHeight)
                .style("fill", colorScale("spent"))
                .on("mouseover", (mouseEvent, d) => showTooltip(mouseEvent, transaction))
                .on("mousemove", (mouseEvent, d) => moveTooltip(mouseEvent))
                .on("mouseout", hideTooltip);

            // Top horizontal edge of each segment (for all except topmost)
            if (i < categoryData.spent.length - 1) {
                svg.append("rect")
                    .attr("class", `bar-spent-${index}`)
                    .attr("x", xScale(category) + xScale.bandwidth() / 2)
                    .attr("width", xScale.bandwidth() / 2)
                    .attr("y", currYSpent)
                    .attr("height", 1) // Set height to 1 for the top horizontal edge
                    .style("fill", "black"); 
            }
        });
    });

    const xAxis = svg.append("g")
        .call(d3.axisBottom(xScale))
        .attr("transform", `translate(0,${height - margin.bottom})`);

    const yAxis = svg.append("g")
        .call(d3.axisLeft(yScale))
        .attr("transform", `translate(${margin.left},0)`);

    const legendContainer = svg.append("g")
        .attr("transform", `translate(${width - 4.5 * margin.right}, ${margin.top + 10})`);

    const legend = legendContainer.selectAll(".legend")
        .data(colorScale.domain())
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", colorScale);

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(d => (d === "spent") ? "Spent" : "Received");

    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height - margin.bottom + 45})`)
        .style("text-anchor", "middle")
        .text("Category");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 40)
        .attr("x", 0 - (height / 2))
        .style("text-anchor", "middle")
        .text("Amount ($)");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .text(`Spending and Receipts for ${friend}`);
}


function drawSegmentedDoubleBarGraphForCategory(category, friends, transactions) {
    d3.select("svg").selectAll("*").remove();
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const width = 1250 - margin.left - margin.right;
    const height = 850 - margin.top - margin.bottom;
    const svg = d3.select("svg");
    svg.attr("width", width).attr("height", height);

    const xScale = d3.scaleBand()
        .domain(friends)
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, maxYGlobal])
        .range([height - margin.bottom, margin.top]);


    const colorScale = d3.scaleOrdinal()
        .domain(["spent", "received"])
        .range(["#a6c4e5", "#c4e2b9"]);

    // Draw bars and segments for each friend
    friends.forEach((friend, index) => {
        const friendData = getFriendTransactions(transactions, friend);
         // Received bar
         let currYReceived = yScale(0);
         friendData.received.forEach((transaction, i) => {
            const transactionHeight = yScale(0) - yScale(transaction.Amount);
            currYReceived -= transactionHeight;
            svg.append("rect")
                .attr("class", `bar-received-${index}`)
                .attr("x", d => xScale(friend))
                .attr("width", xScale.bandwidth() / 2)
                .attr("y", currYReceived)
                .attr("height", transactionHeight)
                .style("fill", colorScale("received"))
                .on("mouseover", (mouseEvent, d) => showTooltip(mouseEvent, transaction))
                .on("mousemove", (mouseEvent, d) => moveTooltip(mouseEvent))
                .on("mouseout", hideTooltip);
            
            // Top horizontal edge of each segment (for all except topmost)
            if (i < friendData.received.length - 1) {
                svg.append("rect")
                    .attr("class", `bar-received-${index}`)
                    .attr("x", xScale(friend))
                    .attr("width", xScale.bandwidth() / 2)
                    .attr("y", currYReceived)
                    .attr("height", 1) 
                    .style("fill", "black"); 
            }

        });
        let currYSpent = yScale(0);
        // Spent bar
        friendData.spent.forEach((transaction, i) => {
            const transactionHeight = yScale(0) - yScale(transaction.Amount);
            currYSpent -= transactionHeight;
            svg.append("rect")
                .attr("class", `bar-spent-${index}`)
                .attr("x", xScale(friend) + xScale.bandwidth() / 2)
                .attr("width", xScale.bandwidth() / 2)
                .attr("y", currYSpent)
                .attr("height", transactionHeight)
                .style("fill", colorScale("spent"))
                .on("mouseover", (mouseEvent, d) => showTooltip(mouseEvent, transaction))
                .on("mousemove", (mouseEvent, d) => moveTooltip(mouseEvent))
                .on("mouseout", hideTooltip);
            
            // Top horizontal edge of each segment (for all except topmost)
            if (i < friendData.spent.length - 1) {
                svg.append("rect")
                    .attr("class", `bar-spent-${index}`)
                    .attr("x", xScale(friend) + xScale.bandwidth() / 2)
                    .attr("width", xScale.bandwidth() / 2)
                    .attr("y", currYSpent)
                    .attr("height", 1)
                    .style("fill", "black"); 
            }
        });
    });

    const xAxis = svg.append("g")
        .call(d3.axisBottom(xScale))
        .attr("transform", `translate(0,${height-margin.bottom})`);
 
    const yAxis = svg.append("g")
        .call(d3.axisLeft(yScale))
        .attr("transform", `translate(${margin.left},0)`);

    const legendContainer = svg.append("g")
        .attr("transform", `translate(${width - 4.5*margin.right}, ${margin.top+10})`);

    const legend = legendContainer.selectAll(".legend")
        .data(colorScale.domain())
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legend.append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", colorScale);

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(d => (d === "spent") ? "Spent" : "Received");

    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height - margin.bottom + 45})`)
        .style("text-anchor", "middle")
        .text("Friend");
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 40)
        .attr("x", 0 - (height / 2))
        .style("text-anchor", "middle")
        .text("Amount ($)");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .text(`Spending and Receipts by ${category}`);
}
 
// Dropdown code:

 function populateFriendDropdown(friends, barGraphData, segmentedBarGraphData, categorizedBarGraphData) {
    const select = d3.select("#dropdown");
    const categoryDropdown = d3.select("#categoryDropdown");
    select.append("option")
        .attr("value", "Aggregate")
        .text("Aggregate");
    friends.forEach(friend => {
        select.append("option")
            .attr("value", friend)
            .text(friend);
    });
    select.on("change", function () {
        const selectedValue = this.value;
        if (selectedValue == "Aggregate") {
            d3.select("svg").selectAll("*").remove();
            drawSegmentedDoubleBarGraphAggregate(categorizedBarGraphData);
        } else {
            categoryDropdown.property("value", "Aggregate");
            d3.select("svg").selectAll("*").remove();
            drawSegmentedDoubleBarGraphForFriend(selectedValue, segmentedBarGraphData[selectedValue], barGraphData[selectedValue]);
        }
    });
 }

 function populateCategoryDropdown(friends, barGraphData, segmentedBarGraphData, categorizedBarGraphData) {
    const dropdown = d3.select("#dropdown");
    const select = d3.select("#categoryDropdown");
    select.append("option")
        .attr("value", "Aggregate")
        .text("Aggregate");
    categories_keys.forEach(category => { 
        select.append("option")
            .attr("value", category)
            .text(category);
    });

    select.on("change", function () {
        const selectedValue = this.value;
        if (selectedValue == "Aggregate") {
            d3.select("svg").selectAll("*").remove();
            drawSegmentedDoubleBarGraphAggregate(categorizedBarGraphData);
        } else {
            dropdown.property("value", "Aggregate"); 
            d3.select("svg").selectAll("*").remove();
            drawSegmentedDoubleBarGraphForCategory(selectedValue, friends, categorizedBarGraphData[selectedValue]);
        }
    });
}

// Tooltip code:

// Function to show tooltip for a transaction
function showTooltip(mouseEvent, transaction) {
    const tooltip = d3.select(".tooltip");
    const tooltipOffset = 150;
    const formatTime = d3.timeFormat("%Y-%m-%d %H:%M:%S");

    tooltip.transition()
        .duration(200)
        .style("opacity", .9);

    tooltip.html(`
        <strong>Transaction Type:</strong> ${transaction.Type}<br>
        <strong>Amount:</strong> ${transaction.Amount}<br>
        <strong>Date:</strong> ${formatTime(new Date(transaction.Datetime))}<br>
        <strong>Note:</strong> ${transaction.Note}<br>
        <strong>From:</strong> ${transaction.From}<br>
        <strong>To:</strong> ${transaction.To}<br>
    `)

    const [mouseX, mouseY] = d3.pointer(mouseEvent); 
    tooltip.style("left", `${mouseX + tooltipOffset}px`)
            .style("top", `${mouseY}px`);
}

// Function to move tooltip so it follows the mouse
function moveTooltip(mouseEvent) {
    const tooltip = d3.select(".tooltip");
    const tooltipOffset = 150;

    // Update tooltip position to follow mouse
    const [mouseX, mouseY] = d3.pointer(mouseEvent);
    tooltip.style("left", `${mouseX + tooltipOffset}px`)
            .style("top", `${mouseY}px`);
}

// Function to hide tooltip
function hideTooltip() {
    const tooltip = d3.select(".tooltip");

    tooltip.transition()
        .duration(500)
        .style("opacity", 0);
}

// Data processing code:

 const categories = {
    Food: ["food", "meal", "dinner", "lunch", "breakfast", "snack", "restaurant", "groceries", "taco", "popcorn", "kbbq", "food", "meal", "sushi", "pho", "sandwiches", "pasta", "dessert", "🍔", "🍕", "🥗", "🍣", "🍰", "🍩"], // Example food keywords
    Transportation: ["transportation", "transport", "commute", "travel", "car", "taxi", "bus", "train", "subway", "bike", "ride", "uber", "lyft", "parking", "gas", "wifi", "dodge", "🚗", "🚕", "🚲", "🚌", "🚇", "🚆", "🚚", "🚲", "🚶‍♂️","travel", "trip", "vacation", "holiday", "✈️", "🚢", "🌍", "🏖️", "🏝️"], // Example transportation keywords
    Shopping: ["shopping", "shop", "buy", "purchase", "mall", "🛍️", "💳", "💸", "🛒"],
    Entertainment: ["entertainment", "fun", "party", "concert", "movie", "bingo", "🎉", "🎊", "🎥", "🎤", "🎮"],
    Utilities: ["rent", "lease", "mortgage", "housing", "accommodation", "apartment", "house", "condo", "utilities", "bill", "electricity", "water", "🔌", "💡", "💧"],
    // Travel: ["travel", "trip", "vacation", "holiday", "✈️", "🚢", "🌍", "🏖️", "🏝️"],
    Other: []
 };
 const categories_keys = Object.keys(categories);

 function categorizeData(data) {
    function categorizeNote(note) {
        for (const category in categories) {
            for (const keyword of categories[category]) {
                if (note.toLowerCase().includes(keyword)) {
                    return category;
                }
            }
        }
        return "Other"; 
    }
 
    const categorizedData = data.map(entry => {
        const category = categorizeNote(entry.Note);
        return {...entry, category};
    });
 
    return categorizedData;
 }
 
 function getUniqueFriends(data) {
    function extractUserVenmoName(entry) {
        let user = ""
        if ((entry.Type === 'Payment' && entry.Amount > 0) ||
            (entry.Type === 'Charge' && entry.Amount < 0)) {
            user = entry.To;
        } else {
            user = entry.From;
        }
        console.log("Current User: ", user);
        return user;
    }

    const user = extractUserVenmoName(data[0]);
 
    const friends = new Set();
    data.forEach(entry => {
        if (entry.To !== "" && entry.From !== "") { 
            if (entry.From !== user) {
                friends.add(entry.From);
            }
            if (entry.To !== user) {
                friends.add(entry.To);
            }
        }
    });
    
    return [...friends];
 }

 function preprocessData(data) {
    function preprocessAmount(amountString) {
        const sign = amountString.startsWith('-') ? -1 : 1;
        const cleanedAmount = amountString.replace(/[+\-$\s]/g, ''); // Remove symbols and whitespace
        return sign * parseFloat(cleanedAmount); // Convert to float
    }
 
    return data.map(entry => {
        const processedEntry = { ...entry };
        processedEntry.Amount = preprocessAmount(entry.Amount);
        return processedEntry;
    });
 }
 
 function calculateAmountSpentAndReceivedByUser(data, friends) {
    const processedData = {};
    friends.forEach(user => {
        processedData[user] = {};
        data.forEach(d => {
            if (d.To === user || d.From === user) {
                if (!processedData[user][d.category]) {
                    processedData[user][d.category] = { spent: 0, received: 0 };
                }
                if (d.Amount > 0) {
                    processedData[user][d.category].received += d.Amount;
                } else {
                    processedData[user][d.category].spent += (-1 * d.Amount);
                }
            }
        });
    });
    friends.forEach(user => {
        categories_keys.forEach(category => {
            if (!processedData[user][category]) {
                processedData[user][category] = { spent: 0, received: 0 };
            }
        });
    });
    return processedData;
 }

 function getTransactionsByUser(data, friends) {
    const processedData = {};
    const copiedData = JSON.parse(JSON.stringify(data));
    friends.forEach(user => {
        processedData[user] = {};
        copiedData.forEach(d => {
            if (d.To === user || d.From === user) {
                if (!processedData[user][d.category]) {
                    processedData[user][d.category] = { spent: [], received: [] };
                }
                if (d.Amount > 0) {
                    processedData[user][d.category].received.push(d);
                } else {
                    d.Amount = Math.abs(d.Amount)
                    processedData[user][d.category].spent.push(d);
                }
            }
        });
    });
    friends.forEach(user => {
        categories_keys.forEach(category => {
            if (!processedData[user][category]) {
                processedData[user][category] = { spent: [], received: [] };
            }
        });
    });
    return processedData;
 }

 function getTransactionsByCategory(data) {
    const processedData = {};
    const copiedData = JSON.parse(JSON.stringify(data));
    copiedData.forEach(transaction => {
        const { category, Amount, ...transactionData } = transaction;

        if (!processedData.hasOwnProperty(category)) {
            processedData[category] = { spent: [], received: [] };
        }

        if (transaction.Amount < 0) {

            processedData[category].spent.push({
                category,
                Amount: Math.abs(Amount), 
                ...transactionData
            });
        } else {
            processedData[category].received.push({
                category,
                Amount,
                ...transactionData
            });
        }
    });
    return processedData;
}

function getFriendTransactions(data, friend) {
    const processedData = {'spent': [], 'received': []};
    const copiedData = JSON.parse(JSON.stringify(data));

    // Spent transactions
    copiedData.spent.forEach((transaction,i) => {
        if (transaction.To === friend || transaction.From === friend) {
            processedData['spent'].push(transaction);
        }
    });

    // Received transactions
    copiedData.received.forEach((transaction,i) => {
        if (transaction.To === friend || transaction.From === friend) {
            processedData['received'].push(transaction);
        }
    });

    return processedData;
}
