    async function loadXLSXFile() {
        url = 'https://raw.githubusercontent.com/leonoqr/ORSP_Calculator/main/contour_plot.xlsx';
        try {
            // Fetch the file
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');

            // Read file as array buffer
            const arrayBuffer = await response.arrayBuffer();

            // Parse the file with SheetJS
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            contour_data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            T = contour_data[0].slice(1);   
            N_actual = contour_data.slice(1).map(row => row[0]).reverse();      
            r = contour_data.slice(1).map(row => row.slice(1));
            createContourPlot(N_actual, T, r);

            
        } catch (error) {
            console.error('Error loading or parsing the .xlsx file:', error);
        }
    }

    // Call the function with your file URL
    loadXLSXFile();


async function loadExcelData(file) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
}



function createContourPlot(N_actual, T, r) {
    // Generate example integer data
    const N = Array.from({ length: N_actual.length }, (_, i) => 499 - i); 
    // Initial Plot
    Plotly.newPlot('plot', [{
        z: r,
        x: T, 
        y: N, 
        type: 'contour',
        cliponaxis: false,
        zsmooth: 'best',
        contours: {
            showlines: false,
            start: 0.2, // Set range based on data
            end: 1,   // Set range based on data
            size: 0.015   // Small step for smoother gradient
        },
        colorscale: [
            [0, 'rgb(153, 204, 255)'], // light blue
            [0.2, 'rgb(153, 255, 255)'], // light cyan
            [0.4, 'rgb(204, 255, 204)'], // light green
            [0.6, 'rgb(255, 255, 153)'], // light yellow
            [0.8, 'rgb(255, 204, 153)'], // light orange
            [1, 'rgb(255, 153, 153)']    // light red
        ], 
        autocontour: false,
        
        colorbar:{
            title: {
                text: 'r',
                side: 'top'
            },
            titlefont: {
                size: 16, // Adjust title font size
            },
        }
    }, 
    {
      x: [8],
      y: [8],
      mode: 'markers',
      marker: { size: 8, color: 'black' },
      name: 'Crosshair'
    }], {
      margin: { t: 10, b: 45, l: 55, r: 10 },  // Tighten plot margins
      hovermode: false // Disable hover
    },
    {
        displayModeBar: false // Hide the toolbar
    });

    Plotly.relayout(plot, {
        xaxis: {
            title: 'Scan Duration T (min)' ,
            range: [1, 200],  // Lock x-axis range
            fixedrange: true  // Disable zoom/pan on x-axis
        },
        yaxis: {
            title: 'Sample Size N',
            range: [0, 499],  // Lock y-axis range
            fixedrange: true,  // Disable zoom/pan on y-axis
            tickvals: [499, 449, 383, 333, 283, 217, 166, 116, 80, 50, 0],  // Example custom tick positions
            ticktext: ['100k', '50k', '20k', '10k', '5k', '2k', '1k', '500', '300', '200', '100'],
        },
        coloraxis: { title: 'r'  },
        autosize: false
    });
  
    // Helper function to get z value based on x and y
    function getZValue(xVal, yVal) {
      let TIndex = T.indexOf(xVal);
      let NIndex = N.indexOf(yVal);
      
      return (TIndex !== -1 && NIndex !== -1) ? r[NIndex][TIndex] : null;
    }
  
    // Function to update crosshair, slider values, and display z-value
    function updateCrosshairAndValues() {
      let xVal = parseInt(document.getElementById('xSlider').value, 10);
      let yVal = parseInt(document.getElementById('ySlider').value, 10);
      let zVal = getZValue(xVal, yVal);
  
      // Update crosshair
      Plotly.restyle('plot', {
        x: [[xVal]],
        y: [[yVal]]
      }, [1]);
  
      // Update slider values and Z value display
      document.getElementById('xValueDisplay').innerText = xVal;
      document.getElementById('yValueDisplay').innerText = N_actual[yVal];
      document.getElementById('zValueDisplay').innerText = `Normalized prediction accuracy (r): ${zVal !== null ? zVal.toFixed(2) : 'N/A'}`;
    }
  
    // Event listeners for sliders
    document.getElementById('xSlider').addEventListener('input', updateCrosshairAndValues);
    document.getElementById('ySlider').addEventListener('input', updateCrosshairAndValues);
  
    // Initialize the display with default values
    updateCrosshairAndValues();
  };

  function calcNormAcc(K1,K2,N,T) {
    // Calculate normalized accuracy based on N and T
    let acc = 0; 
    acc = Math.sqrt(1/(1 + (K1/N) + ((K2)/(N*T))))
    return acc
  }


  function calculate_acc() {
    var promises = [];
    var ACC = [];
    function fetchAccuracyData(filePath, N, T) {
        return fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch file (HTTP ${response.status})`);
                }
                return response.arrayBuffer();
            })
            .then(buffer => {
                var data = new Uint8Array(buffer);
                var workbook = XLSX.read(data, { type: 'array' });
                let vec = [];
                let worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    for (let i = 0; i < 123; i++) {
                        // calculate formula
                        const row = i + 2;
                        const K1 = worksheet[`F${row}`]
                        const K2 = worksheet[`G${row}`]
                        vec.push(calcNormAcc(K1.v, K2.v, N, T));
                    }
                    ACC.push(vec.length > 0 ? vec.reduce((a, b) => a + b) / vec.length : 0);
            })
            .catch(error => {
                console.error('Error reading Excel file:', error.message);
            });
        }
    const N_element = document.getElementById("sample_size");
    N = N_element.value || N_element.placeholder;
    N = 0.9 * N;
    const T_element = document.getElementById("scan_time");
    T = T_element.value || T_element.placeholder;
    filePath = 'https://raw.githubusercontent.com/leonoqr/ORSP_Calculator/main/CBIG_ME_TheoreticalModel_Params.xlsx';
    promises.push(fetchAccuracyData(filePath, N, T));
    return Promise.all(promises).then(() => {
        // After all promises are resolved, return the result
        acc = ACC[0];
        document.getElementById('acc').innerText = `Normalized prediction accuracy (r): ${acc !== null ? acc.toFixed(2) : 'N/A'}`;
    });
  };
  