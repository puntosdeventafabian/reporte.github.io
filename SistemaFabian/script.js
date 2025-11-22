// Clave de almacenamiento local para guardar todos los reportes
const STORAGE_KEY = 'sales_reports_data_manual_cop_v6_decimal';

// --- Lista Maestra de Productos ---
const MASTER_PRODUCTS = [
    // isDecimal: true para Masa, donde el input de cantidad es en GRAMOS ENTEROS y el precio es por KILO.
    { id: 'PROD01', name: 'Masa', isDecimal: true }, 
    { id: 'PROD02', name: 'Palos de Queso', isDecimal: false },
    { id: 'PROD03', name: 'Panzeroti', isDecimal: false },
    { id: 'PROD04', name: 'Queso Mozarella', isDecimal: false },
    { id: 'PROD05', name: 'Gaseosas', isDecimal: false },
    { id: 'PROD06', name: 'Coca-Cola', isDecimal: false },
    { id: 'PROD07', name: 'Agua Grande', isDecimal: false },
    { id: 'PROD08', name: 'Torta Chocolo', isDecimal: false },
    { id: 'PROD09', name: 'Salchichón', isDecimal: false },
    { id: 'PROD10', name: 'Torta de Carne', isDecimal: false },
    { id: 'PROD11', name: 'Tinto', isDecimal: false },
    { id: 'PROD12', name: 'Café', isDecimal: false },
    { id: 'PROD13', name: 'Pastel de Pollo', isDecimal: false },
    { id: 'PROD14', name: 'Arepa Huevo', isDecimal: false },
    { id: 'PROD15', name: 'Empanada', isDecimal: false },
    { id: 'PROD16', name: 'Empanada Paisa', isDecimal: false },
    { id: 'PROD17', name: 'Papas', isDecimal: false },
    { id: 'PROD18', name: 'Galletas', isDecimal: false },
];

/**
 * Obtiene la fecha actual en formato ISO local (YYYY-MM-DD)
 */
function getLocalISODate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
}

/**
 * Formatea un número como Peso Colombiano (COP).
 */
const formatCurrency = (number) => {
    return new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        minimumFractionDigits: 0 
    }).format(number);
};

/**
 * Formatea fecha (YYYY-MM-DD) a formato largo local.
 */
const formatDate = (dateString) => {
    const date = new Date(dateString.replace(/-/g, '/')); 
    return date.toLocaleDateString('es-CO', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
};

/**
 * Formatea timestamp a hora local 12h.
 */
const formatTime = (timestampString) => {
    const date = new Date(timestampString);
    return date.toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true,
        timeZone: 'America/Bogota'
    });
};

/**
 * Limpia el input si su valor es 0 al recibir foco.
 */
function handleInputFocus(input) {
    const currentValue = input.value.trim();
    if (currentValue === '0' || currentValue === '0.0' || currentValue === '0.00') {
        input.value = '';
    }
}

/**
 * Restablece el input a 0 si se deja vacío.
 */
function handleInputBlur(input) {
    if (input.value.trim() === '') {
        input.value = 0;
    }
    if (input.name === 'precio' || input.name === 'entregada' || input.name === 'sobrante' || input.dataset.calcField === 'true') {
        recalculateReport();
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    const localIsoDate = getLocalISODate();
    
    document.getElementById('report-date-display').value = formatDate(localIsoDate);
    document.getElementById('report-date-value').value = localIsoDate;

    document.getElementById('add-product-btn').addEventListener('click', () => addProductCard({}));
    document.getElementById('save-report-btn').addEventListener('click', saveReport);
    
    // Listeners delegados
    const reportArea = document.getElementById('main-report-area');
    
    reportArea.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' && (e.target.name === 'precio' || e.target.name === 'entregada' || e.target.name === 'sobrante' || e.target.dataset.calcField === 'true')) {
            recalculateReport();
        }
    });
    
    reportArea.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' && (e.target.name === 'precio' || e.target.name === 'entregada' || e.target.name === 'sobrante' || e.target.dataset.calcField === 'true')) {
            handleInputFocus(e.target);
        }
    });

    reportArea.addEventListener('focusout', (e) => {
        if (e.target.tagName === 'INPUT' && (e.target.name === 'precio' || e.target.name === 'entregada' || e.target.name === 'sobrante' || e.target.dataset.calcField === 'true')) {
            handleInputBlur(e.target);
        }
    });

    // Listener para cambio de producto
    const reportList = document.getElementById('report-list');
    reportList.addEventListener('change', (e) => {
        if (e.target.name === 'productoId') {
            const card = e.target.closest('.product-card');
            if (card) {
                updateQuantityInputType(card);
            }
        }
    });
    
    loadReportHistory(); 
    if (reportList.children.length === 0) {
            addProductCard({});
    }
    recalculateReport();
    
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('print-boucher-btn').addEventListener('click', printBoucher);
});

// --- Core Functions ---

function updateQuantityInputType(card) {
    const select = card.querySelector('[name="productoId"]');
    const entregadaInput = card.querySelector('[name="entregada"]');
    const sobranteInput = card.querySelector('[name="sobrante"]');
    const precioLabel = card.querySelector('[name="precio-label"]');

    if (!select || !entregadaInput || !sobranteInput) return;

    const productId = select.value;
    const isMasaProduct = productId === 'PROD01'; 
    
    let unitText = 'Unidades';
    let priceUnitText = 'Precio';
    if (isMasaProduct) {
        unitText = 'Gramos (gr)';
        priceUnitText = 'Precio por KILO';
    }

    const stepValue = '1';
    
    entregadaInput.setAttribute('step', stepValue);
    sobranteInput.setAttribute('step', stepValue);
    
    const labelEntregada = card.querySelector('[name="entregada-label"]');
    const labelSobrante = card.querySelector('[name="sobrante-label"]');

    if (labelEntregada) labelEntregada.textContent = `Cant. Entregada`;
    if (labelSobrante) labelSobrante.textContent = `Cant. Sobrante`;
    if (precioLabel) precioLabel.textContent = priceUnitText;
    
    const vendidaUnitLabel = card.querySelector('[name="vendida-unit-label"]');
    if (vendidaUnitLabel) vendidaUnitLabel.textContent = unitText; 

    recalculateReport();
}


function getProductSelectHTML(selectedId = '') {
    let options = MASTER_PRODUCTS.map(p => 
        `<option value="${p.id}" ${selectedId === p.id ? 'selected' : ''}>${p.name}</option>`
    ).join('');
    
    return `
        <select name="productoId" class="select-product w-full p-3 bg-white border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-base font-semibold text-gray-800">
            <option value="" disabled selected>-- Seleccione Producto --</option>
            ${options}
        </select>
    `;
}

function addProductCard(productData = {}) {
    const listContainer = document.getElementById('report-list');
    const newCard = document.createElement('div');
    newCard.classList.add('product-card', 'bg-white', 'p-4', 'rounded-2xl', 'shadow-md', 'mb-4', 'border', 'border-gray-200');
    
    const defaults = { 
        productoId: productData.productoId || '', 
        precio: productData.precio || 0, 
        entregada: productData.entregada || 0, 
        sobrante: productData.sobrante || 0,
    };

    const uniqueId = `prod-${Date.now()}-${listContainer.children.length}`;

    newCard.innerHTML = `
        <div class="flex justify-between items-start mb-3 border-b pb-3">
            <div class="flex-grow">
                    <label class="block text-xs font-medium text-indigo-600 mb-1">Producto</label>
                    ${getProductSelectHTML(defaults.productoId)}
            </div>
            <button type="button" class="remove-card-btn text-red-500 hover:text-red-700 p-2 ml-2 transition" title="Eliminar Producto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>

        <div class="grid grid-cols-3 gap-3 mb-4">
            <div>
                <label for="${uniqueId}-precio" name="precio-label" class="block text-xs font-medium text-gray-500 mb-1">Precio</label>
                <input id="${uniqueId}-precio" type="number" name="precio" value="${defaults.precio}" min="0" step="100" inputmode="numeric" class="input-field-mobile w-full text-center bg-gray-100 font-semibold border-gray-400">
            </div>
            <div>
                <label for="${uniqueId}-entregada" name="entregada-label" class="block text-xs font-medium text-gray-500 mb-1">Cant. Entregada (Unidades)</label>
                <input id="${uniqueId}-entregada" type="number" name="entregada" value="${defaults.entregada}" min="0" step="1" inputmode="numeric" class="input-field-mobile w-full text-center bg-blue-50">
            </div>
            <div>
                <label for="${uniqueId}-sobrante" name="sobrante-label" class="block text-xs font-medium text-gray-500 mb-1">Cant. Sobrante (Unidades)</label>
                <input id="${uniqueId}-sobrante" type="number" name="sobrante" value="${defaults.sobrante}" min="0" step="1" inputmode="numeric" class="input-field-mobile w-full text-center bg-yellow-50">
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div class="bg-indigo-50 p-3 rounded-xl text-center">
                <p class="text-xs font-medium text-indigo-600">Cant. Vendida (<span name="vendida-unit-label">Unidades</span>)</p>
                <p name="vendida" class="text-xl font-bold text-indigo-800 mt-0.5">0</p>
            </div>
            <div class="bg-green-50 p-3 rounded-xl text-center">
                <p class="text-xs font-medium text-green-600">Valor Total Mercancia</p>
                <p name="totalVenta" class="text-xl font-bold text-green-800 mt-0.5">0</p>
            </div>
        </div>
    `;
    
    listContainer.appendChild(newCard);
    
    const removeBtn = newCard.querySelector('.remove-card-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => removeProductCard(e.target));
    }
    
    updateQuantityInputType(newCard);
}

function removeProductCard(element) {
    const card = element.closest('.product-card');
    if (card) {
        card.remove();
        recalculateReport();
    }
}

function getNumberValue(id) {
    const input = document.getElementById(id);
    return Math.round(parseFloat(input?.value) || 0);
}

function recalculateReport() {
    let grandTotalSales = 0;
    const productCards = document.querySelectorAll('.product-card');

    // 1. Calcular el Valor Total de Mercancía Vendida
    for (let i = 0; i < productCards.length; i++) {
        const card = productCards[i];
        
        const productId = card.querySelector('[name="productoId"]')?.value;
        const isMasaProduct = productId === 'PROD01';
        
        const precio = parseFloat(card.querySelector('[name="precio"]')?.value) || 0; 
        const entregada = parseFloat(card.querySelector('[name="entregada"]')?.value) || 0;
        
        const sobranteInput = card.querySelector('[name="sobrante"]'); 
        const sobrante = parseFloat(sobranteInput?.value) || 0;
        
        if (sobrante > entregada) {
            sobranteInput?.classList.add('border-red-500', 'ring-2', 'ring-red-200');
        } else {
            sobranteInput?.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
        }

        const vendida = Math.max(0, entregada - sobrante); 

        let totalVenta = 0;
        
        if (isMasaProduct) {
            const kilosPorGramo = 1000;
            const vendidaKilos = vendida / kilosPorGramo; 
            totalVenta = precio * vendidaKilos;
        } else {
            totalVenta = precio * vendida;
        }
        
        const vendidaDisplay = card.querySelector('[name="vendida"]');
        const totalVentaDisplay = card.querySelector('[name="totalVenta"]');
        
        const vendidaFormatted = Math.round(vendida).toString(); 

        if (vendidaDisplay) vendidaDisplay.textContent = vendidaFormatted;
        if (totalVentaDisplay) totalVentaDisplay.textContent = formatCurrency(Math.round(totalVenta));

        grandTotalSales += totalVenta;
    }
    
    const finalTotalSales = Math.round(grandTotalSales);

    // 2. Obtener valores de Conciliación
    const gastosDelDia = getNumberValue('gastos-del-dia');
    const transferenciasRecibidas = getNumberValue('transferencias-recibidas');
    const otrosIngresos = getNumberValue('otros-ingresos');
    const dineroCaja = getNumberValue('cash-amount');
    
    // 3. Calcular la Base de Ventas Esperadas
    const ventasEsperadasNetas = (finalTotalSales + transferenciasRecibidas + otrosIngresos) - gastosDelDia;
    
    // 4. Calcular Diferencia
    const diferencia = dineroCaja - ventasEsperadasNetas;
    
    // 5. Actualizar la Sección de Resumen Fija
    const grandTotalSalesDisplay = document.getElementById('grand-total-sales-display');
    const cashDifferenceDisplay = document.getElementById('cash-difference-display');
    const cashDifferenceLabel = document.getElementById('cash-difference-label');
    
    if (grandTotalSalesDisplay) grandTotalSalesDisplay.textContent = formatCurrency(ventasEsperadasNetas); 
    
    if (cashDifferenceDisplay) {
        cashDifferenceDisplay.textContent = formatCurrency(Math.abs(diferencia));
        cashDifferenceDisplay.classList.remove('text-green-600', 'text-red-600', 'text-gray-600');
        
        if (diferencia > 0) {
            cashDifferenceLabel.textContent = 'Saldo a Favor';
            cashDifferenceDisplay.classList.add('text-green-600');
        } else if (diferencia < 0) {
            cashDifferenceLabel.textContent = 'Saldo Faltante';
            cashDifferenceDisplay.classList.add('text-red-600');
        } else {
            cashDifferenceLabel.textContent = 'Saldo (Cero)';
            cashDifferenceDisplay.classList.add('text-gray-600');
        }
    }
}

// --- Local Storage Functions ---

function getReportsFromLocalStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        const reports = data ? JSON.parse(data) : [];
        reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return reports;
    } catch (error) {
        console.error("Error al leer de localStorage:", error);
        return [];
    }
}

function saveReportsToLocalStorage(reports) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (error) {
        console.error("Error al escribir en localStorage:", error);
        displayMessage("Error al guardar el reporte localmente.", 'error');
    }
}

function loadReportHistory() {
    const historyContainer = document.getElementById('report-history-cards');
    const reports = getReportsFromLocalStorage();

    if (reports.length === 0) {
        historyContainer.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">No hay reportes guardados localmente.</p>`;
        return;
    }
    
    let historyHTML = '';
    reports.slice(0, 5).forEach((data, index) => {
        
        const formattedTime = formatTime(data.timestamp);
        const formattedDateShort = formatDate(data.date).split(',')[1].trim(); 
        
        let saldoClase = 'text-gray-600';
        let saldoTipo = 'Cero';
        if (data.diferencia > 0) {
            saldoClase = 'text-green-600';
            saldoTipo = 'Favor';
        } else if (data.diferencia < 0) {
            saldoClase = 'text-red-600';
            saldoTipo = 'Faltante';
        }
        
        const productDetails = data.products.map(p => {
            if (p.totalVenta > 0) { 
                return `
                    <li class="flex justify-between text-xs text-gray-700 py-1 border-b border-dashed">
                        <span class="truncate pr-2">${p.productName}</span>
                        <span class="font-medium text-right">${formatCurrency(p.totalVenta)}</span>
                    </li>
                `;
            }
            return ''; 
        }).join('');

        
        historyHTML += `
            <div class="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm history-card mr-4 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center border-b pb-2 mb-2">
                        <h4 class="font-bold text-indigo-700 truncate">${data.posName}</h4>
                        <span class="text-xs text-gray-500">${formattedDateShort}</span>
                    </div>
                    <div class="mb-3">
                        <div>
                            <p class="text-sm text-gray-600">Ventas total:</p>
                            <p class="text-xl font-extrabold text-green-700">${formatCurrency(data.ventasEsperadasNetas)}</p>
                        </div>
                        <div class="mt-2">
                            <p class="text-sm text-gray-600">Saldo (${saldoTipo}):</p>
                            <p class="text-xl font-extrabold ${saldoClase}">${formatCurrency(Math.abs(data.diferencia))}</p>
                        </div>
                    </div>
                    
                    <div class="mt-3 pt-2 border-t border-gray-100">
                            <h5 class="text-xs font-bold text-gray-700 mb-1">Vendido por Producto:</h5>
                            <ul class="space-y-0.5 max-h-24 overflow-y-auto">
                                ${productDetails || '<li class="text-xs text-gray-500">Sin ventas registradas.</li>'}
                            </ul>
                    </div>
                </div>

                <div class="mt-3 pt-2 border-t border-gray-100">
                    <p class="text-xs text-gray-400 mt-1 text-right">Guardado: ${formattedTime}</p>
                    <button data-report-index="${index}" class="view-boucher-btn w-full mt-2 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">
                        Ver Detalle
                    </button>
                </div>
            </div>
        `;
    }); 
    historyContainer.innerHTML = `<div class="flex overflow-x-auto pb-4">${historyHTML}</div>`;
    
    document.querySelectorAll('.view-boucher-btn').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.dataset.reportIndex, 10);
            const selectedReport = getReportsFromLocalStorage()[index];
            if (selectedReport) {
                generateBoucher(selectedReport);
            }
        });
    });
}

function saveReport() {
    const reportDate = document.getElementById('report-date-value').value;
    const posName = document.getElementById('pos-name').value.trim();
    const productCards = document.querySelectorAll('.product-card');

    if (!reportDate) {
        displayMessage("Error: No se pudo obtener la fecha de registro.", 'error');
        return;
    }
    if (posName === "") {
        displayMessage("Ingresa el Nombre del Punto de Venta.", 'warning');
        document.getElementById('pos-name').focus();
        return;
    }
    if (productCards.length === 0) {
            displayMessage("Agrega al menos un producto al reporte.", 'warning');
            return;
    }

    const gastosDelDia = getNumberValue('gastos-del-dia');
    const transferenciasRecibidas = getNumberValue('transferencias-recibidas');
    const otrosIngresos = getNumberValue('otros-ingresos');
    const dineroCaja = getNumberValue('cash-amount');

    const reportData = [];
    let isValid = true;
    let totalVentasMercancia = 0; 

    for (let i = 0; i < productCards.length; i++) {
        const card = productCards[i];
        const select = card.querySelector('[name="productoId"]');
        const productoId = select?.value.trim() || "";
        const productName = select?.options[select.selectedIndex]?.text || "Producto Desconocido"; 
        
        if (productoId === "") {
            isValid = false;
            break;
        }
        
        const productMeta = MASTER_PRODUCTS.find(mp => mp.id === productoId);
        const isMasaProduct = productMeta && productMeta.id === 'PROD01';
        
        const precio = parseFloat(card.querySelector('[name="precio"]')?.value) || 0;
        
        const entregada = Math.round(parseFloat(card.querySelector('[name="entregada"]')?.value) || 0);
        const sobrante = Math.round(parseFloat(card.querySelector('[name="sobrante"]')?.value) || 0);
        
            if (sobrante > entregada) {
            isValid = false;
            continue; 
        }
        
        const vendida = Math.max(0, entregada - sobrante);
        
        let totalVenta = 0;

        if (isMasaProduct) {
            const kilosPorGramo = 1000;
            const vendidaKilos = vendida / kilosPorGramo;

            totalVenta = precio * vendidaKilos; 
        } else {
            totalVenta = precio * vendida; 
        }
        
        totalVenta = Math.round(totalVenta); 
        totalVentasMercancia += totalVenta;
        
        reportData.push({
            productoId: productoId,
            productName: productName, 
            precio: precio, 
            entregada: entregada, 
            sobrante: sobrante, 
            vendida: vendida, 
            totalVenta: totalVenta, 
            isDecimal: isMasaProduct, 
        });
    }
    
    if (!isValid) {
            displayMessage("Corrige los errores de validación (productos sin seleccionar o sobrantes incorrectos).", 'error');
            return;
    }

    const ventasEsperadasNetas = (totalVentasMercancia + transferenciasRecibidas + otrosIngresos) - gastosDelDia;
    
    const diferencia = dineroCaja - ventasEsperadasNetas;
    
    const finalReport = {
        date: reportDate,
        posName: posName, 
        dineroCaja: dineroCaja,
        gastosDelDia: gastosDelDia, 
        transferenciasRecibidas: transferenciasRecibidas, 
        otrosIngresos: otrosIngresos, 
        totalVentasMercancia: totalVentasMercancia, 
        ventasEsperadasNetas: ventasEsperadasNetas, 
        diferencia: diferencia, 
        products: reportData, 
        timestamp: new Date().toISOString()
    };
    
    generateBoucher(finalReport);
    
    const reports = getReportsFromLocalStorage();
    reports.push(finalReport);
    saveReportsToLocalStorage(reports);
    
    let summaryMessage = `Reporte de ${posName} guardado exitosamente.`;
    if (diferencia < 0) {
            summaryMessage += ` ¡Alerta! Saldo Faltante: ${formatCurrency(Math.abs(diferencia))}.`;
    } else if (diferencia > 0) {
            summaryMessage += ` Saldo a Favor: ${formatCurrency(diferencia)}.`;
    } else {
            summaryMessage += ` Saldo Cero.`;
    }

    displayMessage(summaryMessage, diferencia < 0 ? 'warning' : 'success');
    
    document.getElementById('report-list').innerHTML = '';
    addProductCard({}); 
    loadReportHistory(); 
    recalculateReport();
}

// --- BOUCHER GENERATION AND DISPLAY ---

function generateBoucher(report) {
    const boucherBody = document.getElementById('boucher-body');
    const formattedDate = formatDate(report.date);
    const formattedTime = formatTime(report.timestamp);
    
    const relevantProducts = report.products.filter(p => p.vendida > 0 || p.sobrante > 0); 
    
    let saldoTipo = '--';
    let saldoColor = 'text-gray-700'; 
    if (report.diferencia > 0) {
        saldoTipo = 'A FAVOR';
        saldoColor = 'text-green-700'; 
    } else if (report.diferencia < 0) {
        saldoTipo = 'FALTANTE';
        saldoColor = 'text-red-700'; 
    } else {
        saldoTipo = 'CERO';
    }

    const saldoHTML = `
        <div class="flex justify-between items-center text-base font-extrabold pt-2 border-t border-gray-200">
            <span>SALDO (${saldoTipo}):</span>
            <span class="font-bold ${saldoColor}">${formatCurrency(Math.abs(report.diferencia))}</span>
        </div>
    `;

    const detailRows = relevantProducts.map(p => {
        const unitText = p.isDecimal ? 'gr' : 'unid.'; 
        
        return `
            <tr class="border-b border-dashed border-gray-200">
                <td class="pr-2 pt-2">${p.productName}</td>
                <td class="text-center whitespace-nowrap pt-2">${Math.round(p.vendida)} ${unitText}</td>
                <td class="text-center whitespace-nowrap pt-2">${Math.round(p.sobrante)} ${unitText}</td>
                <td class="text-right whitespace-nowrap pt-2">${formatCurrency(p.precio)}</td>
                <td class="text-right font-semibold whitespace-nowrap pt-2">${formatCurrency(p.totalVenta)}</td>
            </tr>
        `;
    }).join('');
    
    boucherBody.innerHTML = `
        <div class="space-y-1 mb-4 text-center">
            <p class="text-lg font-bold text-gray-900">${report.posName}</p>
            <p class="text-xs text-gray-500">Fecha: ${formattedDate}</p>
            <p class="text-xs text-gray-500">Hora : ${formattedTime}</p>
        </div>
        
        <h4 class="text-center text-sm font-semibold mb-2 mt-4 text-indigo-700">DETALLE</h4>

        <table class="w-full text-xs mb-4">
            <thead class="border-b border-t border-gray-300">
                <tr>
                    <th class="py-1 text-left">Producto</th>
                    <th class="text-center">Vend.</th>
                    <th class="text-center">Sobr.</th>
                    <th class="text-right">Precio</th>
                    <th class="text-right font-bold">Total</th>
                </tr>
            </thead>
            <tbody>
                ${detailRows || `<tr><td colspan="5" class="text-center text-gray-500 py-3">Sin movimientos de inventario.</td></tr>`}
            </tbody>
        </table>
        
        <div class="border-t-2 border-dashed border-gray-400 pt-3 mt-4 space-y-2">
            <h4 class="text-center text-sm font-semibold mb-2 text-green-700">RESUMEN</h4>
            
            <div class="flex justify-between items-center text-sm font-medium text-gray-700">
                <span>1. Valor Total Mercancia:</span>
                <span class="font-bold text-green-700">${formatCurrency(report.totalVentasMercancia)}</span>
            </div>
            <div class="flex justify-between items-center text-sm font-medium text-gray-700">
                <span>2. + Transferencias Recibidas:</span>
                <span class="font-bold text-blue-700">${formatCurrency(report.transferenciasRecibidas)}</span>
            </div>
            <div class="flex justify-between items-center text-sm font-medium text-gray-700">
                <span>3. + Otros Ingresos:</span>
                <span class="font-bold text-blue-700">${formatCurrency(report.otrosIngresos)}</span>
            </div>
            <div class="flex justify-between items-center text-sm font-medium text-gray-700">
                <span>4. - Gastos del Día:</span>
                <span class="font-bold text-red-700">${formatCurrency(report.gastosDelDia)}</span>
            </div>
            
            <div class="flex justify-between items-center text-sm font-extrabold border-t border-gray-300 pt-2 text-gray-900">
                <span>TOTAL VENTAS:</span>
                <span class="font-extrabold text-green-700">${formatCurrency(report.ventasEsperadasNetas)}</span>
            </div>

            <div class="flex justify-between items-center text-base font-extrabold pt-2 border-t border-gray-200 text-gray-900">
                <span>DINERO EN CAJA:</span>
                <span class="font-extrabold text-indigo-700">${formatCurrency(report.dineroCaja)}</span>
            </div>
            
            ${saldoHTML}
            
        </div>
        
        <div class="text-center mt-6 text-xs text-gray-500 border-t pt-3">
            <p class="mt-1">¡Gracias por usar el sistema de reportes!</p>
        </div>
    `;
    
    openModal();
}

function openModal() {
    document.getElementById('boucher-modal').classList.remove('hidden');
    document.body.classList.add('overflow-hidden'); 
}

function closeModal() {
    document.getElementById('boucher-modal').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

function printBoucher() {
    const boucherContent = document.getElementById('boucher-content').innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Boucher de Cierre</title>');
    
    printWindow.document.write(`
        <style>
            body { font-family: sans-serif; margin: 0; padding: 10px; font-size: 10px; width: 300px; }
            h1, h2, h3, h4, h5, p { margin: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 0; border-color: #eee; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            .font-extrabold { font-weight: 800; }
            .border-b { border-bottom: 1px solid #ccc; }
            .border-t { border-top: 1px solid #ccc; }
            .border-t-2 { border-top: 2px dashed #333; }
            .pt-2 { padding-top: 8px; }
            .pt-3 { padding-top: 12px; }
            .pb-3 { padding-bottom: 12px; }
            .mt-4 { margin-top: 16px; }
            .mt-5 { margin-top: 20px; }
            .mt-6 { margin-top: 24px; }
            .space-y-1 > p { margin-bottom: 4px; }
            .space-y-2 > div { margin-top: 8px; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .text-green-700 { color: #059669; }
            .text-red-700 { color: #dc2626; }
            .text-indigo-700 { color: #4338ca; }
            .text-blue-700 { color: #1d4ed8; }
            .text-gray-700 { color: #374151; }
            .text-gray-900 { color: #111827; }
        </style>
    `);
    
    printWindow.document.write('</head><body>');
    printWindow.document.write(boucherContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
}

function displayMessage(message, type) {
    const msgBox = document.getElementById('message-box');
    let colorClass = '';
    
    switch(type) {
        case 'success':
            colorClass = 'bg-green-50 text-green-700 border-green-500';
            break;
        case 'error':
            colorClass = 'bg-red-50 text-red-700 border-red-500';
            break;
        case 'warning':
            colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-500';
            break;
        default:
            colorClass = 'bg-blue-50 text-blue-700 border-blue-500';
    }

    msgBox.textContent = message;
    msgBox.className = `fixed top-0 left-0 right-0 p-4 border-l-4 font-medium z-50 transition duration-300 ${colorClass} shadow-xl`;
    msgBox.style.display = 'block';

    setTimeout(() => {
        msgBox.style.display = 'none';
    }, 5000);
}