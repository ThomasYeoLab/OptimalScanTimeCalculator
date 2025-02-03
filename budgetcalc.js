// ------ Define all elements -------
// Get elements from the HTML for further calculations
const CalcBudg_El = document.getElementById("CalcBudg");
const N_El = document.getElementById("N");
const T_El = document.getElementById("T");
const budget_El = document.getElementById("fmribudget");
const acc_El = document.getElementById("fmriacc");
const maxT_El = document.getElementById("maxT");
const minT_El = document.getElementById("minT");
const ScanItvl_El = document.getElementById("ScanItvl");
const CostTime_El = document.getElementById("CostTime");
const psScanTime_El = document.getElementById("psScanTime");
const otScanTime_El = document.getElementById("otScanTime");
const PptCost_El = document.getElementById("PptCost");
const SsnCost_El = document.getElementById("SsnCost");
const maxS_El = document.getElementById("maxS");
const oAccEl = document.getElementById("oAcc_Results");
const rAccEl = document.getElementById("rAcc_Results");
const AccGraphEl = document.getElementById("AccGraph");
const BudegtGraphEl = document.getElementById("BudgetGraph");
const resultEl = document.getElementById("Budget_Table");
const result_FA_El = document.getElementById("Acc_Table");
const OrderEl = document.getElementById('r_order')
const CurrTEl = document.getElementById('currT')
const CurrT_FA_El = document.getElementById('currT_FA')
const fMRIrangeEl = document.getElementById('fMRIT');
const fMRIrange_FA_El = document.getElementById('fMRIT_FA');
const fMRIcurrTEl = document.getElementById('fMRISpan');
const fMRIcurrT_FA_El = document.getElementById('fMRISpan_FA');
const NcurrTEl = document.getElementById('NSpan');
const NcurrT_FA_El = document.getElementById('NSpan_FA');
const TrainrangeEl = document.getElementById('TrainingRatio');
const Trainrange_FA_El = document.getElementById('TrainingRatio_FA');
const TrainPercEl = document.getElementById('TrainingPerc');
const TrainPerc_FA_El = document.getElementById('TrainingPerc_FA');
const TrainNEl = document.getElementById('TrainN');
const TrainN_FA_El = document.getElementById('TrainN_FA');
const G2OptimaEl = document.getElementById('G2Optima');
const G2Optima_FA_El = document.getElementById('G2Optima_FA');
const filePath = 'https://raw.githubusercontent.com/ThomasYeoLab/OptimalScanTimeCalculator/main/CBIG_ME_TheoreticalModel_Params.xlsx';
var ownAccRes = document.getElementById('ownAccresult');

// ------ 1. Functions to calculate accuracy and reliability -------
function calcAcc(K0, K1, K2, N, T) {
    // Calculate accuracy based on N and T
    let acc = 0;
    acc = K0 * Math.sqrt(1 / (1 + (K1 / N) + ((K2) / (N * T))))
    return acc
}

function calcNormAcc(K1, K2, N, T) {
    // Calculate normalized accuracy based on N and T
    let acc = 0;
    acc = 100 * Math.sqrt(1 / (1 + (K1 / N) + ((K2) / (N * T))))
    return acc
}

function calcRel(K0, K1, K2, N, T) {
    // Calculate reliability based on N and T
    let rel = 0;
    rel = K0 / (K0 + (1 / (N / 2)) * (1 - ((2 * K1) / (1 + (K2 / T)))))
    return rel
}

// ------ 2. Functions to collate results --------------------------
function get_averages(vec) {
    // From a vector of values, get the mean, median and confidence inteval
    // Calculate mean
    let mean = vec.length > 0 ? vec.reduce((a, b) => a + b) / vec.length : 0;
    let rounded_mean = parseFloat(mean.toPrecision(3)); // Round off to 3 significant figures to make the curve smooth

    // Calculate confidence interval (assuming a 95% confidence level)
    let standardDeviation = Math.sqrt(vec.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (vec.length - 1));
    let marginOfError = 1.96 * (standardDeviation / Math.sqrt(vec.length));
    let rounded_margin = parseFloat(marginOfError.toPrecision(2));

    // Calculate median
    let sorted = vec.slice().sort((a, b) => a - b);
    let median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    let rounded_median = parseFloat(median.toPrecision(2));

    return [rounded_mean, rounded_margin, rounded_median]
}

function linspace(start, end, numPoints) {
    const step = (end - start) / Math.max(numPoints - 1, 1);
    return Array.from({ length: numPoints }, (_, i) => start + i * step);
}

function convertToTwoSigFigs(arr) {
    return arr.map(function (element) {
        return parseFloat(element).toPrecision(2);
    });
}

function formatArrayToString(arr) {
    return arr.map(num => num.toFixed(2));
}

// ------ 3. Functions to read values from the excel sheets --------
function CalcExcelAcc(workbook, indices, NValue, TValue, type) {
    // Read excel notebook and save params, as well as calculate the accuracy based
    // on the current N and T values.
    let vec = [];
    let worksheet = workbook.Sheets[workbook.SheetNames[0]];
    {
        for (let i = 0; i < indices.length; i++) {
            // calculate formula
            const row = indices[i] + 2;
            const K0 = worksheet[`E${row}`]
            const K1 = worksheet[`F${row}`]
            const K2 = worksheet[`G${row}`]
            if (type === 'Acc') {
                vec.push(calcAcc(K0.v, K1.v, K2.v, NValue, TValue));
            } else if (type === 'NormAcc') {
                vec.push(calcNormAcc(K1.v, K2.v, NValue, TValue));
            } else if (type === 'Rel') {
                vec.push(calcRel(K0.v, K1.v, K2.v, NValue, TValue));
            }
        }
    }
    return [vec]
}

// Functions to calculate budget given accuracy
function compute_budget(accValue, maxTValue, minTValue, ScanItvlValue,
    CostTimeValue, psScanTimeValue, otScanTimeValue,
    PptCostValue, SsnCostValue, maxSValue) {

    // find the number of intervals a participant can handle
    let interval = parseFloat(ScanItvlValue);
    let interval_cost = parseFloat(CostTimeValue);
    let participant_overhead_cost = parseFloat(PptCostValue);
    let session_overhead_cost = parseFloat(SsnCostValue);
    max_tolerance = parseFloat(maxSValue);
    let NumSessions = 1;
    let one_time_overhead_time = parseFloat(otScanTimeValue);
    let per_session_overhead_time = parseFloat(psScanTimeValue);
    let filePath;
    let B_vec = [];
    let actual_acc_vec = [];
    let N_vec = [];
    let T_vec = [];
    let S_vec = [];
    let SD_vec = [];
    let U_vec = [];
    var promises = [];
    let actual_cost = 0;
    let ScanDuration = 0;
    let unusedTime = 0;
    var acc_option = OrderEl.value;

    // promise that fetches accuracy data
    function fetchAccuracyData(filePath, tMin, tMax, accValue) {
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
                // Tabulate prediction accuracy
                const checkedRowIndices = getCheckedRowIndices('phenotype-table');

                for (let t = parseFloat(tMin); t <= parseFloat(tMax); t++) {
                    var acc = 0;
                    var n = 0;
                    var n_hi = 230000;
                    var n_lo = 1;

                    var f = 0;
                    while (f != 1) {
                        n_mid = Math.floor((n_hi + n_lo) / 2);
                        if (n_mid == 1) {
                            f = 1;
                        }
                        [normacc] = CalcExcelAcc(workbook, checkedRowIndices, n_mid, t, 'NormAcc');
                        [acc] = get_averages(normacc);
                        if (acc < 100 * parseFloat(accValue)) {
                            [normacc] = CalcExcelAcc(workbook, checkedRowIndices, n_mid+1, t, 'NormAcc');
                            acc =  normacc.length > 0 ? normacc.reduce((a, b) => a + b) / normacc.length : 0;
                            if (acc >= 100 * parseFloat(accValue)) {
                                f = 1;
                                n_mid = n_mid + 1;
                            } else {
                                n_lo = n_mid + 1;
                            }
                        } else if (acc > 100 * parseFloat(accValue)) {
                            [normacc] = CalcExcelAcc(workbook, checkedRowIndices, n_mid-1, t, 'NormAcc');
                            acc =  normacc.length > 0 ? normacc.reduce((a, b) => a + b) / normacc.length : 0;
                            if (acc <= 100 * parseFloat(accValue)) {
                                f = 1;
                                n_mid = n_mid;
                            } else {
                                n_hi = n_mid - 1;
                            }
                        } else if (acc == 100 * parseFloat(accValue)) {
                            f = 1;
                        }
                    };
                    n = Math.ceil(n_mid / (Trainrange_FA_El.value / 100));
                    actual_acc_vec.push(acc);
                    N_vec.push(n);
                    T_vec.push(t);
                }

                for (let i = 0; i < T_vec.length; i++) {
                    t = T_vec[i];
                    n = N_vec[i];
                    [actual_cost, NumSessions, ScanDuration, unusedTime] = get_cost(n, t, one_time_overhead_time, per_session_overhead_time, max_tolerance, interval, interval_cost, session_overhead_cost, participant_overhead_cost);
                    B_vec.push(actual_cost);
                    S_vec.push(NumSessions);
                    SD_vec.push(ScanDuration);
                    U_vec.push(unusedTime);
                }
            })
            .catch(error => {
                console.error('Error reading Excel file:', error.message);
            });
    }

    function get_cost(n, t, one_time_overhead_time, per_session_overhead_time, max_tolerance, interval, interval_cost, session_overhead_cost, participant_overhead_cost) {
        let actual_cost = 0;
        let ScanDuration = 0;
        let unusedTime = 0;
        let NumSessions = Math.ceil(t / max_tolerance);
        // Key assumption, the fMRI scanning time is assumed to be the same for each session
        fMRITIme_per_session = t / NumSessions;

        effective_time_first_session = one_time_overhead_time + per_session_overhead_time + fMRITIme_per_session;
        effective_time_other_session = per_session_overhead_time + fMRITIme_per_session;

        num_interval_first_session = Math.ceil(effective_time_first_session / interval);
        num_interval_other_session = Math.ceil(effective_time_other_session / interval);

        cost_per_participant_first_session = num_interval_first_session * interval_cost;
        cost_per_participant_other_session = num_interval_other_session * interval_cost;

        total_cost_per_participant_first_session = cost_per_participant_first_session + participant_overhead_cost + session_overhead_cost;
        total_cost_per_participant_other_session = cost_per_participant_other_session + session_overhead_cost;

        total_cost_per_participant = total_cost_per_participant_first_session + total_cost_per_participant_other_session * (NumSessions - 1);

        ScanDuration = (num_interval_first_session + num_interval_other_session * (NumSessions - 1)) * interval;
        unusedTime = Math.round(ScanDuration - effective_time_first_session - effective_time_other_session * (NumSessions - 1));
        actual_cost = n * total_cost_per_participant;

        return [actual_cost, NumSessions, ScanDuration, unusedTime]
    }

    // t refers to the actual time spent on fMRI, excluding overhead time and unused session time
    // run accuracy calculation based on accuracy option
    if (acc_option === 'own') {
        for (let t = parseFloat(minTValue); t <= parseFloat(maxTValue); t++) {
            var acc = 0;
            var n = 0;
            var val2 = BudgK1.value;
            var val3 = BudgK2.value;

            var n_hi = 230000;
            var n_lo = 1;

            var f = 0;
            while (f != 1) {
                n_mid = Math.floor((n_hi + n_lo) / 2);
                if (n_mid == 1) {
                    f = 1;
                }
                acc = calcNormAcc(val2, val3, n_mid, t);
                if (acc < 100 * parseFloat(accValue)) {
                    acc = calcNormAcc(val2, val3, n_mid + 1, t);
                    if (acc >= 100 * parseFloat(accValue)) {
                        f = 1;
                        n_mid = n_mid + 1;
                    } else {
                        n_lo = n_mid + 1;
                    }
                } else if (acc > 100 * parseFloat(accValue)) {
                    acc = calcNormAcc(val2, val3, n_mid - 1, t);
                    if (acc <= 100 * parseFloat(accValue)) {
                        f = 1;
                        n_mid = n_mid - 1;
                    } else {
                        n_hi = n_mid - 1;
                    }
                } else if (acc == 100 * parseFloat(accValue)) {
                    f = 1;
                }
            };
            n = Math.ceil(n_mid / (Trainrange_FA_El.value / 100));
            actual_acc_vec.push(acc);
            N_vec.push(n);
            T_vec.push(t);
        }

        for (let i = 0; i < T_vec.length; i++) {
            t = T_vec[i];
            n = N_vec[i];
            [actual_cost, NumSessions, ScanDuration, unusedTime] = get_cost(n, t, one_time_overhead_time, per_session_overhead_time, max_tolerance, interval, interval_cost, session_overhead_cost, participant_overhead_cost);
            B_vec.push(actual_cost);
            S_vec.push(NumSessions);
            SD_vec.push(ScanDuration);
            U_vec.push(unusedTime);
        }
    } else {
        filePath = 'https://raw.githubusercontent.com/leonoqr/ORSP_Calculator/main/CBIG_ME_TheoreticalModel_Params.xlsx';
        promises.push(fetchAccuracyData(filePath, minTValue, maxTValue, accValue));
    };


    // return vectors
    return Promise.all(promises).then(() => {
        // After all promises are resolved, return the result
        return [B_vec, actual_acc_vec, N_vec, T_vec, S_vec, SD_vec, U_vec];
    });
}

// ------ 4. Functions to calculate optimal accuracy given budget ---------------
function getOptimalParams(budgetValue, maxTValue, minTValue, ScanItvlValue,
    CostTimeValue, psScanTimeValue, otScanTimeValue,
    PptCostValue, SsnCostValue, maxSValue) {

    // Calculate remaining budget after accounting for site costs
    let rem_budget = budgetValue
    let total_budget = parseFloat(budgetValue);
    // find the number of intervals a participant can handle
    let maxItvl = Math.floor((parseFloat(maxSValue) / parseFloat(ScanItvlValue)));
    let interval = parseFloat(ScanItvlValue);
    fMRITime = parseFloat(minTValue);
    let interval_cost = parseFloat(CostTimeValue);
    let participant_overhead_cost = parseFloat(PptCostValue);
    let session_overhead_cost = parseFloat(SsnCostValue);
    max_tolerance = parseFloat(maxSValue);
    NumSessions = 1;
    let one_time_overhead_time = parseFloat(otScanTimeValue);
    let per_session_overhead_time = parseFloat(psScanTimeValue);
    let actual_cost = 0;
    let TotalDuration = 0;
    let SessionDuration_Needed = 0;
    let Itvls_Needed = 0;
    let Itvls_Scanned = 0;
    let num_Ppt = 0;
    let filePath;
    var acc_vec = [];
    var normacc_vec = [];
    var N_vec = [];
    var T_vec = [];
    var S_vec = [];
    var SD_vec = [];
    var U_vec = [];
    var RC_vec = [];
    var promises = [];
    var acc_option = OrderEl.value;

    // promise that fetches accuracy data
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

                // Adjust N based on training set size
                var trainN = Math.floor(N * (TrainrangeEl.value / 100))
                // Tabulate prediction accuracy
                const checkedRowIndices = getCheckedRowIndices('phenotype-table');
                var [acc] = CalcExcelAcc(workbook, checkedRowIndices, trainN, T, 'Acc')
                var [normacc] = CalcExcelAcc(workbook, checkedRowIndices, trainN, T, 'NormAcc');

                // Calculate mean accuracy and push to acc_vec
                var [mean_pa, margin_pa,] = get_averages(acc);
                acc_vec.push(mean_pa);

                // Calculate mean norm accuracy and push to normacc_vec
                var [mean_normpa, margin_normpa,] = get_averages(normacc);
                normacc_vec.push(mean_normpa);
            })
            .catch(error => {
                console.error('Error reading Excel file:', error.message);
            });
    }


    // calculate accuracy from ranging from minimum fMRI value to maximum fMRI time value
    // fMRITime refers to the actual time spent on fMRI, excluding overhead time and unused session time
    while (fMRITime <= parseFloat(maxTValue)) {
        if (max_tolerance >= fMRITime) {
            // if participants' max tolerance is not shorter than the fMRI scanning time, having only 1 session is good enough
            NumSessions = 1;
            effective_time = one_time_overhead_time + per_session_overhead_time + fMRITime;
            num_interval = Math.ceil(effective_time / interval);
            cost_per_participant = num_interval * interval_cost;
            total_cost_per_participant = cost_per_participant + participant_overhead_cost + session_overhead_cost;
            num_Ppt = Math.floor(total_budget / total_cost_per_participant);
            ScanDuration = num_interval * interval;
            unusedTime = ScanDuration - effective_time;
            actual_cost = num_Ppt * total_cost_per_participant;
        } else {
            // Otherwise, multiple sessions are needed
            NumSessions = Math.ceil(fMRITime / max_tolerance);
            // Key assumption, the fMRI scanning time is assumed to be the same for each session
            fMRITIme_per_session = fMRITime / NumSessions;

            effective_time_first_session = one_time_overhead_time + per_session_overhead_time + fMRITIme_per_session;
            effective_time_other_session = per_session_overhead_time + fMRITIme_per_session;

            num_interval_first_session = Math.ceil(effective_time_first_session / interval);
            num_interval_other_session = Math.ceil(effective_time_other_session / interval);

            cost_per_participant_first_session = num_interval_first_session * interval_cost;
            cost_per_participant_other_session = num_interval_other_session * interval_cost;

            total_cost_per_participant_first_session = cost_per_participant_first_session + participant_overhead_cost + session_overhead_cost;
            total_cost_per_participant_other_session = cost_per_participant_other_session + session_overhead_cost;

            total_cost_per_participant = total_cost_per_participant_first_session + total_cost_per_participant_other_session * (NumSessions - 1);
            num_Ppt = Math.floor(total_budget / total_cost_per_participant);

            ScanDuration = (num_interval_first_session + num_interval_other_session * (NumSessions - 1)) * interval;
            unusedTime = Math.round(ScanDuration - effective_time_first_session - effective_time_other_session * (NumSessions - 1));
            actual_cost = num_Ppt * total_cost_per_participant;
        }

        // run accuracy calculation based on accuracy option
        if (acc_option === 'own') {
            // calculate accuracy based on K values, throw error if not filled in
            var val1 = BudgK0.value;
            var val2 = BudgK1.value;
            var val3 = BudgK2.value;

            num_Ppt = Math.floor(num_Ppt * (TrainrangeEl.value / 100))
            acc_vec.push(calcAcc(val1, val2, val3, num_Ppt, fMRITime));
            normacc_vec.push(calcNormAcc(val2, val3, num_Ppt, fMRITime));
        } else {
            filePath = 'https://raw.githubusercontent.com/leonoqr/ORSP_Calculator/main/CBIG_ME_TheoreticalModel_Params.xlsx';
            promises.push(fetchAccuracyData(filePath, num_Ppt, fMRITime));
        };
        // save values into vectors
        N_vec.push(num_Ppt);
        T_vec.push(fMRITime);
        S_vec.push(NumSessions)
        SD_vec.push(ScanDuration)
        U_vec.push(unusedTime)
        RC_vec.push(actual_cost)
        fMRITime = fMRITime + 1;
    }

    // return vectors
    return Promise.all(promises).then(() => {
        // After all promises are resolved, return the result
        return [acc_vec, normacc_vec, N_vec, T_vec, S_vec, SD_vec, U_vec, RC_vec];
    });
}

// ------ 5. Functions to draw plots -------------------------------
function optimalParamsTable(div_el, A, NA, N, T, S, SL, US, RC, curr, optim) {

    // Define variables
    var tableDiv = document.getElementById(div_el);
    var containerWidth = tableDiv.getBoundingClientRect().width;
    var containerHeight = (150 / 500) * containerWidth;
    if (containerWidth > 500) {
        var containerHeight = (150 / 500) * containerWidth;
        var fontsz = 12
    } else {
        var containerHeight = (250 / 500) * containerWidth;
        var fontsz = 10
    }

    var tableData = [{
        type: 'table',
        columnwidth: [300, 150, 150],
        header: {
            values: ['Parameters', 'Current value', 'Optimal value'],
            align: 'center',
            line: { width: 1, color: 'black' },
            fill: { color: '#333333' },
            font: { family: "Arial", size: fontsz, color: "white" },
            height: 20,
        },
        cells: {
            values: [
                ["Accuracy (Pearson's r)", '% max prediction accuracy',
                    'Sample size (N)', 'fMRI scan duration (T)', 'Number of sessions',
                    'Total scan time purchased', 'Unused scan time', 'Actual fMRI cost'],
                [A[curr], NA[curr], N[curr], T[curr], S[curr], SL[curr], US[curr], RC[curr]],
                [A[optim], NA[optim], N[optim], T[optim], S[optim], SL[optim], US[optim], RC[optim]],
            ],
            align: 'center',
            line: { color: "black", width: 0 },
            fill: { color: ['lightgrey', 'white'] },
            font: { family: "Arial", size: fontsz, color: ["black"] },
            height: 20,
            wrap: 'wrap',
            columnorder: [0, 1],
        }
    }];

    // Define the layout
    var layout = {
        height: containerHeight, width: containerWidth,
        margin: { l: 0, r: 0, b: 0, t: 0 }
    };
    var config = { displayModeBar: false };
    // Plot the table
    Plotly.newPlot(tableDiv, tableData, layout, config);
}

function optimalParamsTable_fixed_acc(div_el, B, NA, N, T, S, SL, US, curr, optim) {

    // Define variables
    var tableDiv = document.getElementById(div_el);
    var containerWidth = tableDiv.getBoundingClientRect().width;
    var containerHeight = (150 / 500) * containerWidth;
    if (containerWidth > 500) {
        var containerHeight = (150 / 500) * containerWidth;
        var fontsz = 12
    } else {
        var containerHeight = (250 / 500) * containerWidth;
        var fontsz = 10
    }

    var tableData = [{
        type: 'table',
        columnwidth: [300, 150, 150],
        header: {
            values: ['Parameters', 'Current value', 'Optimal value'],
            align: 'center',
            line: { width: 1, color: 'black' },
            fill: { color: '#333333' },
            font: { family: "Arial", size: fontsz, color: "white" },
            height: 20,
        },
        cells: {
            values: [
                ['Total budget ($)', '% max prediction accuracy',
                    'Sample size (N)', 'fMRI scan duration (T)', 'Number of sessions',
                    'Total scan time purchased', 'Unused scan time'],
                [B[curr], NA[curr], N[curr], T[curr], S[curr], SL[curr], US[curr]],
                [B[optim], NA[optim], N[optim], T[optim], S[optim], SL[optim], US[optim]],
            ],
            align: 'center',
            line: { color: "black", width: 0 },
            fill: { color: ['lightgrey', 'white'] },
            font: { family: "Arial", size: fontsz, color: ["black"] },
            height: 20,
            wrap: 'wrap',
            columnorder: [0, 1],
        }
    }];

    // Define the layout
    var layout = {
        height: containerHeight, width: containerWidth,
        margin: { l: 0, r: 0, b: 0, t: 0 }
    };
    var config = { displayModeBar: false };
    // Plot the table
    Plotly.newPlot(tableDiv, tableData, layout, config);
}

function plotBarPlot(BarEl, f_v, moh_v, nmoh_v, site_v, unuse_v, rem_v, mode) {

    // get dimensions
    var barDiv = document.getElementById(BarEl);
    var containerWidth = barDiv.getBoundingClientRect().width;
    var containerHeight = (1 / 2) * containerWidth + 50;  // Add 50 pixels for the legend

    if (containerWidth < 500) {
        var fontsz = 10;
        var containerWidth = 350;
        var containerHeight = 125;  // Increased from 75 to 125 to fit the legend
    }

    if (mode == 'Money') {
        containerHeight += 60;  // Increase height by 60 pixels (adjust as needed)
    }

    // custom hover template
    var hoverTemplate = '<b>%{fullData.name}</b><extra>%{x}</extra>';
    if (mode == 'Money') {
        var categories = ['Spending ($)'];
    } else if (mode == 'Time') {
        var categories = ['Time (mins)'];
    }

    // Create traces for each category
    var fMRI = {
        y: categories,
        x: [f_v],
        name: 'fMRI',
        type: 'bar',
        orientation: 'h',
        hovertemplate: hoverTemplate,
        hoverinfo: 'name',
        marker: {
            color: '#D2691E',
        },
    };

    var MRIoverHead = {
        y: categories,
        x: [moh_v],
        name: 'MRI overhead',
        type: 'bar',
        orientation: 'h',
        hovertemplate: hoverTemplate,
        marker: {
            color: '#00274e',
        },
    };

    var nonMRIoverHead = {
        y: categories,
        x: [nmoh_v],
        name: 'non-MRI overhead',
        type: 'bar',
        orientation: 'h',
        hovertemplate: hoverTemplate,
        marker: {
            color: '#800000',
        },
    };

    var Unused = {
        y: categories,
        x: [unuse_v],
        name: 'Unused scan time',
        type: 'bar',
        orientation: 'h',
        hovertemplate: hoverTemplate,
        marker: {
            color: '#800080',
        },
    };

    var RemBudg = {
        y: categories,
        x: [rem_v],
        name: 'Remaining budget',
        type: 'bar',
        orientation: 'h',
        hovertemplate: hoverTemplate,
        marker: {
            color: '#333333',
        },
    };

    if (mode == 'Money') {
        var reqData = [fMRI, MRIoverHead, nonMRIoverHead, Unused, RemBudg];
        var Title = "Budget breakdown"
    } else if (mode == 'Time') {
        var reqData = [fMRI, MRIoverHead, Unused];
        var Title = "Scan breakdown"
    }

    // Define the layout
    var layout = {
        height: containerHeight,
        width: containerWidth,
        barmode: 'stack',  // Set the bar mode to 'stack'
        title: {
            text: Title,
            font: { size: fontsz },
        },
        legend: {
            y: 1,                  // Align legend to the top
            yanchor: 'top',
            orientation: 'v',
            traceorder: 'normal',
            font: { size: fontsz - 2, color: 'black' },  // Reduce font size
            itemsizing: 'constant',
            itemwidth: 30,         // Reduce item width
            itemheight: 20,        // Reduce item height
        },
        hovermode: 'closest',
        hoverlabel: {
            bgcolor: 'white', // Set the background color of the hover label
            bordercolor: 'black', // Set the border color of the hover label
            font: { size: fontsz, color: 'black' }, // Set the font size and color of the hover label
            namelength: -1, // Show full trace name in the hover label
        },
        margin: { l: 80, r: 50, b: 15, t: 25 }
    };

    var config = { displayModeBar: false };

    // Plot the chart
    Plotly.newPlot(BarEl, reqData, layout, config);
}

function plotLinePlot(LineEl, x_vec, y_vec, pt, mode) {

    // get sizes of plot
    var containerWidth = LineEl.getBoundingClientRect().width;
    var containerHeight = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) * 0.37; // 40% of the screen height
    if (containerWidth > 500) {
        var fontsz = 14;
        var markersz = 10;
        var linewidth = 2;
        var xloc = 1;
    } else {
        var fontsz = 10
        var markersz = 5
        var linewidth = 1
        var xloc = 2;
    }

    // Create a trace for the line
    if (mode == 'FixedBudget') {
        var lineTrace = {
            x: x_vec,
            y: y_vec,
            mode: 'lines',
            type: 'scatter',
            name: 'Accuracy',
            line: {
                color: 'orange',
                width: linewidth,
            },
            hovertemplate: '%{y:.2f}',
        }
    } else if (mode == 'FixedAcc') {
        var lineTrace = {
            x: x_vec,
            y: y_vec,
            mode: 'lines',
            type: 'scatter',
            name: 'Budget',
            line: {
                color: 'orange',
                width: linewidth,
            },
            hovertemplate: '%{y:.2f}',
        }
    };

    // Create scatter plot
    if (mode == 'FixedBudget') {
        var maxY = Math.max(...y_vec);
        var scatterTrace = {
            x: [x_vec[y_vec.indexOf(maxY)]],
            y: [maxY],
            mode: 'markers',
            type: 'scatter',
            name: 'Optimal N & T',
            marker: {
                size: markersz,
                color: 'green',
            },
            hoverlabel: { namelength: -1 },
            hovertemplate: '%{y:.2f}'
        }
    } else if (mode == 'FixedAcc') {
        var minY = Math.min(...y_vec);
        var scatterTrace = {
            x: [x_vec[y_vec.indexOf(minY)]],
            y: [minY],
            mode: 'markers',
            type: 'scatter',
            name: 'Optimal N & T',
            marker: {
                size: markersz,
                color: 'green',
            },
            hoverlabel: { namelength: -1 },
            hovertemplate: '%{y:.2f}'
        }
    };

    // Create highlight between maxY and (maxY - 0.01)
    if (mode == 'FixedBudget') {
        var highlightTrace = {
            x: [...x_vec, ...x_vec.slice().reverse()],
            y: Array(x_vec.length).fill(maxY).concat(Array(x_vec.length).fill(maxY - 0.01)),  // Upper bound maxY and lower bound maxY - 1
            fill: 'toself',  // Fill the area between these y-values, not to zero
            mode: 'none',
            name: 'Within 1% of optima',
            fillcolor: 'rgba(0, 0, 255, 0.2)',  // Light blue highlight color
        }
    } else if (mode == 'FixedAcc') {
        var highlightTrace = {};
    };

    // Create arrow plot
    var arrowTrace = {
        x: [pt, pt],
        y: [Math.min(...lineTrace.y), Math.max(...lineTrace.y)],
        mode: 'lines',
        name: 'Current N & T',
        line: {
            color: 'darkblue',
            width: linewidth,
            dash: 'darkblue'
        },
        hoverinfo: 'none'
    };

    // Define the layout
    if (mode == 'FixedBudget') {
        var layout = {
            height: containerHeight,
            width: containerWidth,
            title: {
                text: 'Percentage of Maxmium Prediction Accuracy vs fMRI Scan Duration',
                font: { size: fontsz },
            },
            showlegend: true,
            legend: {
                x: xloc, // Set legend x-coordinate to 1 (right)
                y: 0, // Set legend y-coordinate to 0 (bottom)
                xanchor: 'right', // Anchor legend to right
                yanchor: 'bottom', // Anchor legend to bottom
                bgcolor: 'rgba(0,0,0,0)',
                font: { size: (fontsz - 2) },
            },
            xaxis: {
                title: 'fMRI Scan Duration (mins)',
                titlefont: {
                    size: fontsz,
                },
            },
            yaxis: {
                title: '% max prediction accuracy',
                titlefont: {
                    size: fontsz,
                },
            },
            margin: { l: 60, r: 10, b: 30, t: 25 },
            dragmode: false,
        }
    } else if (mode == 'FixedAcc') {
        var layout = {
            height: containerHeight,
            width: containerWidth,
            title: {
                text: 'Total Budget vs fMRI Scan Duration',
                font: { size: fontsz },
            },
            showlegend: true,
            legend: {
                x: xloc, // Set legend x-coordinate to 1 (right)
                y: 0, // Set legend y-coordinate to 0 (bottom)
                xanchor: 'right', // Anchor legend to right
                yanchor: 'bottom', // Anchor legend to bottom
                bgcolor: 'rgba(0,0,0,0)',
                font: { size: (fontsz - 2) },
            },
            xaxis: {
                title: 'fMRI Scan Duration (mins)',
                titlefont: {
                    size: fontsz,
                },
            },
            yaxis: {
                title: 'Total Budget ($)',
                titlefont: {
                    size: fontsz,
                },
            },
            margin: { l: 60, r: 10, b: 30, t: 25 },
            dragmode: false,
        }
    };

    var config = { displayModeBar: false };

    // Plot the chart
    Plotly.newPlot(LineEl, [scatterTrace, lineTrace, highlightTrace, arrowTrace], layout, config)
}

// ------ 6. Functions to update page ------------------------------
function getBudgetParams(auto_optimal) {
    // load function values from fixed_budget calculator form
    let budgetValue = budget_El.value || budget_El.placeholder;
    let maxTValue = maxT_El.value || maxT_El.placeholder;
    let minTValue = minT_El.value || minT_El.placeholder;
    var ScanItvlValue = ScanItvl_El.value || ScanItvl_El.placeholder;
    const CostTimeValue = CostTime_El.value || CostTime_El.placeholder;
    const psScanTimeValue = psScanTime_El.value || psScanTime_El.placeholder;
    const otScanTimeValue = otScanTime_El.value || otScanTime_El.placeholder;
    const PptCostValue = PptCost_El.value || PptCost_El.placeholder;
    const SsnCostValue = SsnCost_El.value || SsnCost_El.placeholder;
    const maxSValue = maxS_El.value || maxS_El.placeholder;
    var acc_option = OrderEl.value;

    // Display error message if any values are implausible
    if (parseFloat(budgetValue) < parseFloat(CostTimeValue)) {
        alert(`ERROR: Budget ($${budgetValue}) is less than cost of 1 scan session ($${CostTimeValue})`);
    } else if (parseFloat(maxTValue) < parseFloat(minTValue)) {
        alert(`ERROR: Maximum fMRI scan time (${maxTValue} min) is less than minimum fMRI scan time (${minTValue} min)`);
    } else if (parseFloat(maxSValue) < parseFloat(psScanTimeValue)) {
        alert(`ERROR: Maximum scan time per session (${maxSValue} min) is less than per-session overhead scan time (${psScanTimeValue} min)`);
    } else {
        // check if any of the options are blank
        if (acc_option === 'own') {
            // error if K values are empty
            if (BudgK0.value === "") {
                alert("ERROR: K0 is empty");
                return;
            } else if (BudgK1.value === "") {
                alert("ERROR: K1 is empty");
                return;
            } else if (BudgK2.value === "") {
                alert("ERROR: K2 is empty");
                return;
            }
        } else if (acc_option === 'original') {
            const checkedRowIndices = getCheckedRowIndices('phenotype-table');
            // check whether at least one phenotype is checked
            if (checkedRowIndices.length === 0) {
                alert("ERROR: No phenotypes were chosen!");
                return;
            }
        }

        // change scan interval value if participant cannot tolerate the full interval
        // if (parseFloat(maxSValue) < parseFloat(ScanItvlValue)) {
        //    alert(`WARNING: Time participant can tolerate (${maxSValue} min) is less than scan time interval (${ScanItvlValue} min). Scan time interval will be set to ${maxSValue} min (i.e. full interval is not used)`)
        //    ScanItvlValue = maxSValue
        // }

        // update slider range
        fMRIrangeEl.min = parseFloat(minTValue);
        fMRIrangeEl.max = parseFloat(maxTValue);
        // calculate effective scan time
        getOptimalParams(budgetValue, maxTValue, minTValue,
            ScanItvlValue, CostTimeValue, psScanTimeValue,
            otScanTimeValue, PptCostValue, SsnCostValue,
            maxSValue)
            .then(([acc_vec, normacc_vec, N_vec, T_vec, S_vec, SD_vec, U_vec, RC_vec]) => {
                oldValue = Math.max(parseFloat(fMRIcurrTEl.textContent), parseFloat(minTValue));
                updateLinePlotPosition(acc_vec, normacc_vec, N_vec, T_vec, S_vec, SD_vec,
                    U_vec, RC_vec, oldValue, budgetValue, CostTimeValue,
                    ScanItvlValue, psScanTimeValue, otScanTimeValue, PptCostValue, SsnCostValue)

                fMRIrangeEl.addEventListener('input', function () {
                    // Update the span text with the current value of the range input
                    fMRIcurrTEl.textContent = this.value;
                    updateLinePlotPosition(acc_vec, normacc_vec, N_vec, T_vec, S_vec, SD_vec,
                        U_vec, RC_vec, parseFloat(this.value), budgetValue, CostTimeValue,
                        ScanItvlValue, psScanTimeValue, otScanTimeValue, PptCostValue, SsnCostValue)
                });

                G2OptimaEl.addEventListener('click', function () {
                    // Update the span text with maximum location
                    var maxAcc = Math.max(...normacc_vec);
                    var maxAcc_loc = T_vec[normacc_vec.indexOf(maxAcc)];
                    fMRIcurrTEl.textContent = maxAcc_loc;
                    fMRIrangeEl.value = maxAcc_loc;
                    updateLinePlotPosition(acc_vec, normacc_vec, N_vec, T_vec, S_vec, SD_vec,
                        U_vec, RC_vec, parseFloat(maxAcc_loc), budgetValue, CostTimeValue,
                        ScanItvlValue, psScanTimeValue, otScanTimeValue, PptCostValue, SsnCostValue)
                });

                if (auto_optimal == 1) {
                    G2OptimaEl.click();
                }
            });
    }
}

function updateLinePlotPosition(acc_vec, normacc_vec, N_vec, T_vec, S_vec, SD_vec,
    U_vec, RC_vec, curr_pos, budgetValue, CostTimeValue, ScanItvlValue, psScanTimeValue, otScanTimeValue,
    PptCostValue, SsnCostValue) {
    // Use the returned values here
    plotLinePlot(AccGraphEl, T_vec, normacc_vec, curr_pos, 'FixedBudget')
    // update table
    var maxAcc = Math.max(...normacc_vec);
    var plot_pos = T_vec.indexOf(curr_pos)
    NcurrTEl.textContent = N_vec[plot_pos];
    TrainNEl.textContent = Math.floor(N_vec[plot_pos] * (TrainrangeEl.value / 100));
    optimalParamsTable('Budget_Table', convertToTwoSigFigs(acc_vec), convertToTwoSigFigs(normacc_vec),
        N_vec, T_vec, S_vec, SD_vec, U_vec, RC_vec, plot_pos, normacc_vec.indexOf(maxAcc))
}

function updateLinePlotPosition_fixed_acc(budget_vec, actual_acc_vec, N_vec, T_vec, S_vec, SD_vec,
    U_vec, currT, CostTimeValue, ScanItvlValue, psScanTimeValue, otScanTimeValue, PptCostValue, SsnCostValue) {
    // Use the returned values here
    plotLinePlot(BudegtGraphEl, T_vec, budget_vec, currT, 'FixedAcc')
    // update table
    var minBudget = Math.min(...budget_vec);
    var plot_pos = T_vec.indexOf(currT)
    NcurrT_FA_El.textContent = N_vec[plot_pos];
    TrainN_FA_El.textContent = Math.floor(N_vec[plot_pos] * (Trainrange_FA_El.value / 100));
    optimalParamsTable_fixed_acc('Acc_Table', formatArrayToString(budget_vec), convertToTwoSigFigs(actual_acc_vec),
        N_vec, T_vec, S_vec, SD_vec, U_vec, plot_pos, budget_vec.indexOf(minBudget))
}

function getAccParams(auto_optimal) {
    // load function values from fixed_acc calculator form
    let accValue = acc_El.value || acc_El.placeholder;
    let maxTValue = maxT_El.value || maxT_El.placeholder;
    let minTValue = minT_El.value || minT_El.placeholder;
    var ScanItvlValue = ScanItvl_El.value || ScanItvl_El.placeholder;
    const CostTimeValue = CostTime_El.value || CostTime_El.placeholder;
    const psScanTimeValue = psScanTime_El.value || psScanTime_El.placeholder;
    const otScanTimeValue = otScanTime_El.value || otScanTime_El.placeholder;
    const PptCostValue = PptCost_El.value || PptCost_El.placeholder;
    const SsnCostValue = SsnCost_El.value || SsnCost_El.placeholder;
    const maxSValue = maxS_El.value || maxS_El.placeholder;
    var acc_option = OrderEl.value;

    // Display error message if any values are implausible
    if (parseFloat(accValue) < parseFloat(0) || parseFloat(accValue) > parseFloat(0.98)) {
        alert(`ERROR: Target accuracy should be a value between 0.01 and 0.98`);
    } else if (parseFloat(maxTValue) < parseFloat(minTValue)) {
        alert(`ERROR: Maximum fMRI scan time (${maxTValue} min) is less than minimum fMRI scan time (${minTValue} min)`);
    } else if (parseFloat(maxSValue) < parseFloat(psScanTimeValue)) {
        alert(`ERROR: Maximum scan time per session (${maxSValue} min) is less than per-session overhead scan time (${psScanTimeValue} min)`);
    } else {
        // check if any of the options are blank
        if (acc_option === 'own') {
            // error if K values are empty
            if (BudgK0.value === "") {
                alert("ERROR: K0 is empty");
                return;
            } else if (BudgK1.value === "") {
                alert("ERROR: K1 is empty");
                return;
            } else if (BudgK2.value === "") {
                alert("ERROR: K2 is empty");
                return;
            }
        } else if (acc_option === 'original') {
            const checkedRowIndices = getCheckedRowIndices('phenotype-table');
            // check whether at least one phenotype is checked
            if (checkedRowIndices.length === 0) {
                alert("ERROR: No phenotypes were chosen!");
                return;
            }
        }

        // update slider range
        fMRIrange_FA_El.min = parseFloat(minTValue);
        fMRIrange_FA_El.max = parseFloat(maxTValue);
        // plot budget vs scan time
        compute_budget(accValue, maxTValue, minTValue,
            ScanItvlValue, CostTimeValue, psScanTimeValue,
            otScanTimeValue, PptCostValue, SsnCostValue,
            maxSValue)
            .then(([budget_vec, actual_acc_vec, N_vec, T_vec, S_vec, SD_vec, U_vec]) => {
                currT = Math.max(parseFloat(fMRIcurrT_FA_El.textContent), parseFloat(minTValue));

                updateLinePlotPosition_fixed_acc(budget_vec, actual_acc_vec, N_vec, T_vec, S_vec, SD_vec,
                    U_vec, currT, CostTimeValue,
                    ScanItvlValue, psScanTimeValue, otScanTimeValue, PptCostValue, SsnCostValue)

                fMRIrange_FA_El.addEventListener('input', function () {
                    // Update the span text with the current value of the range input
                    fMRIcurrT_FA_El.textContent = this.value;
                    updateLinePlotPosition_fixed_acc(budget_vec, actual_acc_vec, N_vec, T_vec, S_vec, SD_vec,
                        U_vec, parseFloat(this.value), CostTimeValue,
                        ScanItvlValue, psScanTimeValue, otScanTimeValue, PptCostValue, SsnCostValue)
                });

                G2Optima_FA_El.addEventListener('click', function () {
                    // Update the span text with maximum location
                    var minBudget = Math.min(...budget_vec);
                    var minBudget_loc = T_vec[budget_vec.indexOf(minBudget)];
                    fMRIcurrT_FA_El.textContent = minBudget_loc;
                    fMRIrange_FA_El.value = minBudget_loc;
                    updateLinePlotPosition_fixed_acc(budget_vec, actual_acc_vec, N_vec, T_vec, S_vec, SD_vec,
                        U_vec, parseFloat(minBudget_loc), CostTimeValue,
                        ScanItvlValue, psScanTimeValue, otScanTimeValue, PptCostValue, SsnCostValue)
                });

                if (auto_optimal == 1) {
                    G2Optima_FA_El.click();
                }
            }
            );
    }
}

// -------------------- Event listeners ----------------------------
// Function to load and parse the Excel file from URL
async function loadExcelFile(url) {
    try {
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        populateTable(json);
    } catch (error) {
        console.error('Error loading or parsing the Excel file:', error);
    }
}

function populateTable(data) {
    const tbody = document.querySelector('#phenotype-table tbody');
    tbody.innerHTML = ''; // Clear existing rows
    const columnOrder = ['Phenotype', 'Dataset', 'Version', 'Category',
        'K0', 'K1', 'K2']; // Customize this as needed

    data.forEach((row, index) => {
        const tr = document.createElement('tr');

        // Create checkbox with row index as ID
        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'row-checkbox';
        checkbox.dataset.index = index; // Store the row index in data attribute
        checkboxCell.appendChild(checkbox);
        tr.appendChild(checkboxCell);

        // Populate the other cells with the row data
        columnOrder.forEach(column => {
            const td = document.createElement('td');
            let value = row[column];
            // Round K0, K1, K2 values to 5 significant figures
            if (column === 'K1' || column === 'K2') {
                value = value.toPrecision(5);
            } else if (column === 'K0') {
                value = value.toPrecision(3);
            }
            td.textContent = value;
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}


// Tab and glider function
// Open tab based on selection
document.addEventListener("DOMContentLoaded", function () {
    // Get all radio inputs (tabs) and their corresponding containers
    const tabs = document.querySelectorAll('input[type="radio"][name="ProcessTab"]');
    const containers = document.querySelectorAll('.tab-content');

    // Function to show the relevant container
    function showContainer(containerId) {
        containers.forEach(container => {
            if (container.id === `${containerId}-container`) {
                container.style.visibility = 'visible';  // Make it visible
                container.style.opacity = '1';           // Fully visible
                container.style.height = 'auto';         // Adjust the height
            } else {
                container.style.visibility = 'hidden';   // Hide but keep in DOM
                container.style.opacity = '0';           // Fully transparent
                container.style.height = '0';            // Optionally, you can collapse the container
            }
        });
    }

    // Add event listeners to each tab to switch containers
    tabs.forEach(tab => {
        tab.addEventListener('change', function () {
            const containerId = this.getAttribute('data-container');
            const selectedOption = document.getElementById('mode_select').value;
            showContainer(containerId);
            if (containerId === 'results') {
                if (selectedOption == 'fixed_budget') {
                    var auto_optimal = 1;
                    getBudgetParams(auto_optimal);
                } else if (selectedOption == 'fixed_acc') {
                    var auto_optimal = 1;
                    getAccParams(auto_optimal);
                }
            }
        });
    });

    // Initially show the correct container (based on the checked tab)
    const initialTab = document.querySelector('input[type="radio"][name="ProcessTab"]:checked');
    if (initialTab) {
        showContainer(initialTab.getAttribute('data-container'));
    }
});

// Add event listeners to tabs and move the glider
function updateGlider(tab) {
    const glider = document.querySelector('.glider'),
        tabLabel = document.querySelector(`label[for="${tab.id}"]`),
        tabWidth = tabLabel.offsetWidth,
        tabLeft = tabLabel.offsetLeft,
        container = tab.parentElement,
        containerWidth = container.offsetWidth;

    glider.style.width = `${tabWidth}px`;
    glider.style.left = tab.id === 'phenotypes' ? '0px' : (tab.id === 'results' ? `${containerWidth - tabWidth}px` : `${tabLeft + (tabWidth - glider.offsetWidth) / 2}px`);
}

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    updateGlider(tab.previousElementSibling);
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tab.getAttribute('for') + '-container').classList.add('active');
}));

window.addEventListener('load', () => updateGlider(document.querySelector('input[name="ProcessTab"]:checked')));

function goToNextTab() {
    const currentTab = document.querySelector('input[name="ProcessTab"]:checked'),
        nextTabId = currentTab.id === 'results' ? 'phenotypes' : currentTab.id === 'phenotypes' ? 'budget' : currentTab.id === 'budget' ? 'overheads' : 'results';

    document.getElementById(nextTabId).checked = true;
    updateGlider(document.getElementById(nextTabId));
    document.getElementById(nextTabId).dispatchEvent(new Event('change'));
}

// mode selection option
// Phenotype selection option
document.getElementById('mode_select').addEventListener('change', function () {
    var selectedOption = this.value;
    var targetAcc = document.getElementById('targetAcc');
    var fmriBudget = document.getElementById('fmriBudget');
    var fixed_budget_calculator = document.getElementById('fixed_budget_calculator');
    var fixed_acc_calculator = document.getElementById('fixed_acc_calculator');

    if (selectedOption === 'fixed_acc') {
        targetAcc.style.display = 'block';
        fmriBudget.style.display = 'none';
        fixed_budget_calculator.style.display = 'none';
        fixed_acc_calculator.style.display = 'block';
    } else {
        targetAcc.style.display = 'none';
        fmriBudget.style.display = 'block';
        fixed_acc_calculator.style.display = 'none';
        fixed_budget_calculator.style.display = 'block';
    }
});

// Phenotype selection option
document.getElementById('r_order').addEventListener('change', function () {
    var selectedOption = this.value;
    var KFields = document.getElementById('KFields');
    var PhenTable = document.getElementById('PhenTable');
    var PhenTable_buttons = document.getElementById('PhenTable_buttons');
    if (selectedOption === 'own') {
        KFields.style.display = 'block';
        PhenTable.style.display = 'none';
        PhenTable_buttons.style.display = 'none';
    } else {
        KFields.style.display = 'none';
        PhenTable.style.display = 'block';
        PhenTable_buttons.style.display = 'block';
    }
});

// Dropdown for phenotype selection

function toggleDropdown(dropdownId, columnIndex) {
    const dropdown = document.getElementById(dropdownId);

    // Toggle the display of the dropdown
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';

    // Populate the dropdown if it is being shown
    if (dropdown.style.display === 'block') {
        populateDropdown(dropdownId, columnIndex);
    }
}

function populateDropdown(dropdownId, columnIndex) {
    // Ensure columnIndex is a valid number
    if (typeof columnIndex !== 'number' || columnIndex < 0) {
        console.error("Invalid column index:", columnIndex);
        return; // Exit if the index is invalid
    }

    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = ''; // Clear existing options

    // Get unique entries from the specified column
    const entries = Array.from(document.querySelectorAll('#phenotype-table tbody tr td:nth-child(' + (columnIndex + 1) + ')'))
        .map(td => td.textContent.trim());
    const uniqueEntries = [...new Set(entries)]; // Remove duplicates

    // Create checkbox options for each unique entry
    uniqueEntries.forEach(entry => {
        const label = document.createElement('label');
        label.style.display = 'flex';        // Use flexbox for horizontal alignment
        label.style.alignItems = 'center';   // Vertically center checkbox and text
        label.style.width = '100%';          // Make sure the label takes up full width
        label.style.paddingLeft = '0';  // Ensure no extra left padding

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = entry;
        checkbox.onchange = () => filterTable();

        // Ensure checkbox does not shrink and has no margin
        checkbox.style.flexShrink = '0';
        checkbox.style.margin = '0';  // Remove any default margins

        // Optional: Set a fixed width for the checkbox if needed
        checkbox.style.width = '24px';

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(entry));
        dropdown.appendChild(label);
    });
}

function filterTable() {
    // Get selected dataset and category values
    const datasetCheckboxes = Array.from(document.querySelectorAll('#dataset-dropdown input[type="checkbox"]:checked'));
    const categoryCheckboxes = Array.from(document.querySelectorAll('#category-dropdown input[type="checkbox"]:checked'));
    const analysisCheckboxes = Array.from(document.querySelectorAll('#analysis-dropdown input[type="checkbox"]:checked'));

    const selectedDatasets = datasetCheckboxes.map(cb => cb.value);
    const selectedCategories = categoryCheckboxes.map(cb => cb.value);
    const selectedAnalyses = analysisCheckboxes.map(cb => cb.value);

    // Get all table rows
    const rows = document.querySelectorAll('#phenotype-table tbody tr');

    rows.forEach(row => {
        const dataset = row.cells[2].textContent.trim();
        const category = row.cells[4].textContent.trim();
        const analysis = row.cells[3].textContent.trim();

        // Check if the row matches the selected datasets, categories, and analyses
        const isDatasetChecked = selectedDatasets.length === 0 || selectedDatasets.includes(dataset);
        const isCategoryChecked = selectedCategories.length === 0 || selectedCategories.includes(category);
        const isAnalysisChecked = selectedAnalyses.length === 0 || selectedAnalyses.includes(analysis);

        // Check the checkbox in the row if the row matches the selected options
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (isDatasetChecked && isCategoryChecked && isAnalysisChecked) {
            checkbox.checked = true; // Check the checkbox if it matches all criteria
        } else {
            checkbox.checked = false; // Uncheck if it doesn't match
        }
    });
}

function selectOoi2024_phenotypes(startIndex, endIndex) {
    // Get all table rows (excluding the header)
    const rows = document.querySelectorAll('#phenotype-table tbody tr');

    // Iterate through the rows and select checkboxes for the specified range
    rows.forEach((row, index) => {
        if (index >= startIndex && index <= endIndex) {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = true; // Check the checkbox
            }
        } else {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = false; // Uncheck the checkbox if out of range
            }
        }
    });
}

function clearAllSelections() {
    // Get all checkboxes in the table
    const checkboxes = document.querySelectorAll('#phenotype-table tbody input[type="checkbox"]');

    // Iterate through each checkbox and uncheck it
    checkboxes.forEach(checkbox => {
        checkbox.checked = false; // Uncheck the checkbox
    });
}

function getCheckedRowIndices(tableId) {
    const checkedIndices = []; // Array to hold the indices of checked rows
    const table = document.getElementById(tableId); // Get the table element

    // Iterate through each row in the table body
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
        const checkbox = row.querySelector('input[type="checkbox"]'); // Find the checkbox in the row
        if (checkbox && checkbox.checked) { // Check if the checkbox is checked
            checkedIndices.push(index); // Add the index to the array
        }
    });

    return checkedIndices; // Return the array of checked indices
}

// -------------------- Page loading ----------------------------
// Update budget calculator page
CalcBudg_El.addEventListener("click", getBudgetParams);
TrainrangeEl.addEventListener('input', function () {
    // Update the span text with the current value of the range input
    TrainPercEl.textContent = this.value;
    var auto_optimal = 0;
    getBudgetParams(auto_optimal);
});

Trainrange_FA_El.addEventListener('input', function () {
    // Update the span text with the current value of the range input
    TrainPerc_FA_El.textContent = this.value;
    var auto_optimal = 0;
    getAccParams(auto_optimal);
});
// pre-select phenotypes
document.addEventListener("DOMContentLoaded", function () {
    loadExcelFile(filePath)
        .then(() => {
            selectOoi2024_phenotypes(0, 122);
        })
        .catch(error => {
            console.error("Error loading Excel file:", error);
        });
});
