const { jsPDF } = require("jspdf");
require("jspdf-autotable");
const doc = new jsPDF();
if (typeof doc.autoTable === 'function') {
    console.log("autoTable works on doc");
} else {
    console.log("autoTable NOT found on doc");
}
