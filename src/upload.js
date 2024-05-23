 let globalVenmoData = null;

document.addEventListener("DOMContentLoaded", function () {
    const uploadForm = document.getElementById("uploadForm");
    const filesInput = document.getElementById("csvFiles");

    uploadForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const filesInput = document.getElementById("csvFiles");
        const files = filesInput.files;

        if (files.length > 0) {
            (async () => {
                await Promise.all(Array.from(files).map(processFile));

                alert("Files uploaded successfully!");
                console.log("window parsed data out func", globalVenmoData);
                window.sessionStorage.setItem('globalVenmoData', JSON.stringify(globalVenmoData));
                window.location.href = "viz.html";
            })();
        } else {
            alert("Please select at least one CSV file to upload.");
        }
    });

    async function processFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
        
            reader.onload = function (e) {
                const csvData = e.target.result;
                globalVenmoData = parseCSVData(csvData);
                console.log(globalVenmoData); 
                resolve();
            };
            reader.readAsText(file);
        });
    }
});

function parseCSVData(csv) {
    const lines = csv.split('\n').map(line => line.trim());
    const header = lines[2].split(',').map(cell => cell.trim());
    const data = [];

    for (let i = 3; i < lines.length - 1; i++) {
        const values = lines[i].split(',');
        const ID = values[1];
        if (ID !== "" && ID !== undefined && values[4] !== undefined) {
            const entry = {};
            entry["Datetime"] = values[2];
            entry["Type"] = values[3];
            entry["Status"] = values[4];
            entry["Note"] = values[5];
            entry["From"] = values[6];
            entry["To"] = values[7];
            entry["Amount"] = values[8];
            data.push(entry);
        }
    }
    return data;
}