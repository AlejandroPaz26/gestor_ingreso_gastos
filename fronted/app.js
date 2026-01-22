// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
let fechaVisualizada = new Date(); 
let chartCircular = null;
let chartLineal = null;
let chartFrecuencia = null;

let datosGastosMes = [];
let datosIngresosMes = [];
let todasLasCategorias = [];

// API URL (Define aquí tu servidor de Render)
const API_URL = "https://api-gastos-alejandro.onrender.com"; 

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Sistema Iniciado");

    actualizarTituloMes();
    
    const btnPrev = document.getElementById('btnPrevMonth');
    const btnNext = document.getElementById('btnNextMonth');

    if(btnPrev) btnPrev.addEventListener('click', () => cambiarMes(-1));
    if(btnNext) btnNext.addEventListener('click', () => cambiarMes(1));

    configurarNavegacion();
    setupModales();
    setupModalCategoria();
    setupModalEdicion();

    cargarDatosCompletos();
});

// ==========================================
// 2. LÓGICA DE DATOS
// ==========================================

async function cargarDatosCompletos() {
    try {
        const [resGastos, resIngresos, resCats] = await Promise.all([
            fetch(`${API_URL}/gastos`),
            fetch(`${API_URL}/ingresos`),
            fetch(`${API_URL}/categorias`)
        ]);

        const todosGastos = await resGastos.json();
        const todosIngresos = await resIngresos.json();
        todasLasCategorias = await resCats.json();

        actualizarDropdownCategorias(todasLasCategorias);
        actualizarDropdownEdicion(todasLasCategorias);

        const añoVer = fechaVisualizada.getFullYear();
        const mesVer = fechaVisualizada.getMonth();

        const filtrarPorMes = (lista) => lista.filter(item => {
            const partes = item.fecha.split('-');
            return parseInt(partes[0]) === añoVer && (parseInt(partes[1]) - 1) === mesVer;
        });

        datosGastosMes = filtrarPorMes(todosGastos);
        datosIngresosMes = filtrarPorMes(todosIngresos);

        const totalGastos = datosGastosMes.reduce((sum, g) => sum + g.monto, 0);
        const totalIngresos = datosIngresosMes.reduce((sum, i) => sum + i.monto, 0);
        const saldo = totalIngresos - totalGastos;

        const lblIngreso = document.querySelector('.summary-box.income h2');
        if(lblIngreso) lblIngreso.innerText = `S/ ${totalIngresos.toFixed(2)}`;
        document.getElementById('lblGastado').innerText = `S/ ${totalGastos.toFixed(2)}`;
        const lblSaldo = document.getElementById('lblSaldo');
        lblSaldo.innerText = `S/ ${saldo.toFixed(2)}`;
        lblSaldo.style.color = saldo >= 0 ? '#374151' : '#ef4444';

        distribuirEnTablasDinamicas(datosGastosMes);
        
        if (document.getElementById('navReportes').classList.contains('active')) {
            renderizarGraficos();
        }

    } catch (error) {
        console.error("❌ Error cargando datos:", error);
    }
}

function distribuirEnTablasDinamicas(gastos) {
    const contenedor = document.getElementById('contenedorGastosDinamico');
    contenedor.innerHTML = ''; 

    if (gastos.length === 0) {
        contenedor.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 2rem;">No hay gastos en este mes.</p>';
        return;
    }

    const grupos = {};
    
    gastos.forEach(g => {
        const catId = g.categoria_id; 
        if (!grupos[catId]) grupos[catId] = { nombre: 'Sin Categoría', icono: 'fa-question', total: 0, items: [] };
        
        grupos[catId].items.push(g);
        grupos[catId].total += g.monto;
    });

    todasLasCategorias.forEach(cat => {
        if (grupos[cat.id]) {
            grupos[cat.id].nombre = cat.nombre;
            grupos[cat.id].icono = cat.icono;
        }
    });

    for (const [id, grupo] of Object.entries(grupos)) {
        const iconoClase = grupo.icono && grupo.icono.startsWith('fa-') ? grupo.icono : 'fa-tag';

        const columnaHTML = document.createElement('div');
        columnaHTML.className = 'detail-column';
        columnaHTML.innerHTML = `
            <div class="column-header">
                <span><i class="fa-solid ${iconoClase}"></i> ${grupo.nombre}</span>
            </div>
            <div class="column-content">
                ${grupo.items.map(g => `
                    <div class="item-row">
                        <span class="item-desc">
                            <i class="fa-solid fa-pencil" style="cursor:pointer; color:#3b82f6; margin-right:5px;" onclick="abrirModalEdicion(${g.id}, '${g.descripcion}')"></i>
                            ${g.descripcion} <small style="color:#9ca3af">(${g.fecha.slice(-2)})</small>
                        </span>
                        <span class="item-monto">S/ ${g.monto.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="column-footer">
                <span>Total</span>
                <span>S/ ${grupo.total.toFixed(2)}</span>
            </div>
        `;
        contenedor.appendChild(columnaHTML);
    }
}

// --- EDICIÓN ---
function setupModalEdicion() {
    const modal = document.getElementById('modalEditar');
    const close = document.querySelector('.close-btn-edit');
    const form = document.getElementById('formEditar');

    if(close) close.onclick = () => modal.style.display = 'none';
    window.addEventListener('click', (e) => { if(e.target == modal) modal.style.display = 'none'; });

    if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const idGasto = document.getElementById('editGastoId').value;
        const nuevaCat = document.getElementById('selNuevaCategoria').value;

        try {
            await fetch(`${API_URL}/gastos/${idGasto}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ categoria_id: parseInt(nuevaCat) })
            });
            alert("Categoría actualizada!");
            modal.style.display = 'none';
            cargarDatosCompletos();
        } catch (error) {
            alert("Error al actualizar");
        }
    };
}

window.abrirModalEdicion = function(id, descripcion) {
    const modal = document.getElementById('modalEditar');
    document.getElementById('editGastoId').value = id;
    document.getElementById('txtGastoEditar').innerText = `Moviendo gasto: "${descripcion}"`;
    modal.style.display = 'flex';
}

function actualizarDropdownEdicion(categorias) {
    const select = document.getElementById('selNuevaCategoria');
    if (!select) return;
    select.innerHTML = '';
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.innerText = cat.nombre;
        select.appendChild(option);
    });
}

// ==========================================
// 3. GRÁFICOS
// ==========================================

function renderizarGraficos() {
    if (!datosGastosMes) return;

    const agrupadoCategoria = {};
    datosGastosMes.forEach(g => {
        const catObj = todasLasCategorias.find(c => c.id === g.categoria_id);
        const nombreCat = catObj ? catObj.nombre : 'Sin Categoría';
        agrupadoCategoria[nombreCat] = (agrupadoCategoria[nombreCat] || 0) + g.monto;
    });

    const conteoItems = {};
    datosGastosMes.forEach(g => {
        const desc = g.descripcion.trim().toLowerCase();
        const nombre = desc.charAt(0).toUpperCase() + desc.slice(1);
        conteoItems[nombre] = (conteoItems[nombre] || 0) + 1;
    });
    const itemsOrdenados = Object.entries(conteoItems).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    const agrupadoDias = {};
    datosGastosMes.forEach(g => {
        const dia = parseInt(g.fecha.split('-')[2]);
        agrupadoDias[dia] = (agrupadoDias[dia] || 0) + g.monto;
    });
    const diasOrdenados = Object.keys(agrupadoDias).sort((a, b) => a - b);
    const montosPorDia = diasOrdenados.map(d => agrupadoDias[d]);

    const ctxPie = document.getElementById('graficoCircular');
    if (ctxPie) {
        if (chartCircular) chartCircular.destroy();
        chartCircular = new Chart(ctxPie.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(agrupadoCategoria),
                datasets: [{
                    data: Object.values(agrupadoCategoria),
                    backgroundColor: ['#4ade80', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    const ctxBar = document.getElementById('graficoFrecuencia');
    if (ctxBar) {
        if (chartFrecuencia) chartFrecuencia.destroy();
        chartFrecuencia = new Chart(ctxBar.getContext('2d'), {
            type: 'bar',
            data: {
                labels: itemsOrdenados.map(i => i[0]),
                datasets: [{
                    label: 'Repeticiones',
                    data: itemsOrdenados.map(i => i[1]),
                    backgroundColor: '#f59e0b',
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    const ctxLine = document.getElementById('graficoLineal');
    if (ctxLine) {
        if (chartLineal) chartLineal.destroy();
        chartLineal = new Chart(ctxLine.getContext('2d'), {
            type: 'line',
            data: {
                labels: diasOrdenados.map(d => `Día ${d}`),
                datasets: [{
                    label: 'Gasto Diario',
                    data: montosPorDia,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}

// ==========================================
// 4. INTERFAZ: NAVEGACIÓN Y MODALES
// ==========================================

function configurarNavegacion() {
    const navMensual = document.getElementById('navMensual');
    const navReportes = document.getElementById('navReportes');
    const navCategorias = document.getElementById('navCategorias');

    const vistaMensual = document.getElementById('vista-mensual');
    const vistaReportes = document.getElementById('vista-reportes');
    const vistaCategorias = document.getElementById('vista-categorias');

    if(navMensual) {
        navMensual.addEventListener('click', () => {
            navMensual.classList.add('active');
            navReportes.classList.remove('active');
            navCategorias.classList.remove('active');
            vistaMensual.style.display = 'block';
            vistaReportes.style.display = 'none';
            vistaCategorias.style.display = 'none';
        });
    }

    if(navReportes) {
        navReportes.addEventListener('click', () => {
            navReportes.classList.add('active');
            navMensual.classList.remove('active');
            navCategorias.classList.remove('active');
            vistaReportes.style.display = 'block';
            vistaMensual.style.display = 'none';
            vistaCategorias.style.display = 'none';
            renderizarGraficos();
        });
    }

    if(navCategorias) {
        navCategorias.addEventListener('click', () => {
            navCategorias.classList.add('active');
            navMensual.classList.remove('active');
            navReportes.classList.remove('active');
            vistaCategorias.style.display = 'block';
            vistaMensual.style.display = 'none';
            vistaReportes.style.display = 'none';
            cargarCategoriasVisuales();
        });
    }
}

function setupModales() {
    const modalGasto = document.getElementById('modalGasto');
    const modalIngreso = document.getElementById('modalIngreso');
    
    // GASTO
    const btnGasto = document.getElementById('btnNuevoGasto');
    const closeGasto = modalGasto ? modalGasto.querySelector('.close-btn') : null;
    const formGasto = document.getElementById('formGasto');

    if(btnGasto) btnGasto.onclick = () => {
        modalGasto.style.display = 'flex';
        formGasto.querySelector('input[type="date"]').valueAsDate = new Date();
    };
    if(closeGasto) closeGasto.onclick = () => modalGasto.style.display = 'none';
    if(formGasto) formGasto.onsubmit = async (e) => {
        e.preventDefault();
        await enviarDatos(`${API_URL}/gastos`, formGasto, true);
        modalGasto.style.display = 'none';
    };

    // INGRESO
    const btnIngreso = document.getElementById('btnNuevoIngreso');
    const closeIngreso = modalIngreso ? modalIngreso.querySelector('.close-btn-ingreso') : null;
    const formIngreso = document.getElementById('formIngreso');

    if(btnIngreso) btnIngreso.onclick = () => {
        modalIngreso.style.display = 'flex';
        formIngreso.querySelector('input[type="date"]').valueAsDate = new Date();
    };
    if(closeIngreso) closeIngreso.onclick = () => modalIngreso.style.display = 'none';
    if(formIngreso) formIngreso.onsubmit = async (e) => {
        e.preventDefault();
        await enviarDatos(`${API_URL}/ingresos`, formIngreso, false);
        modalIngreso.style.display = 'none';
    };

    window.addEventListener('click', (e) => {
        if(e.target == modalGasto) modalGasto.style.display = 'none';
        if(e.target == modalIngreso) modalIngreso.style.display = 'none';
    });
}

function setupModalCategoria() {
    const modal = document.getElementById('modalCategoria');
    const btn = document.getElementById('btnNuevaCategoria');
    const close = document.querySelector('.close-btn-cat');
    const form = document.getElementById('formCategoria');

    if(btn) btn.onclick = () => modal.style.display = 'flex';
    if(close) close.onclick = () => modal.style.display = 'none';
    window.addEventListener('click', (e) => { if(e.target == modal) modal.style.display = 'none'; });

    if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const nombre = form.querySelector('input[type="text"]').value;
        const icono = form.querySelector('input[name="icon"]:checked').value;
        try {
            await fetch(`${API_URL}/categorias`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ nombre, icono })
            });
            alert("Categoría creada!");
            modal.style.display = 'none';
            form.reset();
            cargarCategoriasVisuales();
        } catch (error) { alert("Error al crear"); }
    };
}


// ==========================================
// 5. FUNCIONES AUXILIARES
// ==========================================

async function enviarDatos(url, form, tieneCategoria) {
    const data = {
        monto: parseFloat(form.querySelector('input[type="number"]').value),
        descripcion: form.querySelector('input[type="text"]').value,
        fecha: form.querySelector('input[type="date"]').value
    };
    if (tieneCategoria) {
        data.categoria_id = parseInt(form.querySelector('select').value);
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if(res.ok) {
            alert("✅ Guardado correctamente");
            form.reset();
            cargarDatosCompletos();
        } else {
            alert("❌ Error del servidor");
        }
    } catch (error) {
        console.error(error);
        alert("❌ Error de conexión");
    }
}

function cambiarMes(delta) {
    fechaVisualizada.setMonth(fechaVisualizada.getMonth() + delta);
    actualizarTituloMes();
    cargarDatosCompletos();
}

function actualizarTituloMes() {
    const opciones = { month: 'long', year: 'numeric' };
    const textoFecha = fechaVisualizada.toLocaleDateString('es-ES', opciones);
    const titulo = document.getElementById('tituloMes');
    if(titulo) titulo.innerText = textoFecha.charAt(0).toUpperCase() + textoFecha.slice(1);
}

// GESTIÓN DE CATEGORÍAS
async function cargarCategoriasVisuales() {
    const contenedor = document.getElementById('listaCategoriasVisual');
    contenedor.innerHTML = '<p>Cargando...</p>';
    try {
        const res = await fetch(`${API_URL}/categorias`);
        const categorias = await res.json();
        contenedor.innerHTML = ''; 
        categorias.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'cat-card';
            const iconoClase = cat.icono.startsWith('fa-') ? cat.icono : 'fa-tag';
            card.innerHTML = `
                <button class="btn-delete-cat" onclick="eliminarCategoria(${cat.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
                <i class="cat-icon fa-solid ${iconoClase}"></i>
                <div class="cat-name">${cat.nombre}</div>
            `;
            contenedor.appendChild(card);
        });
        actualizarDropdownCategorias(categorias);
    } catch (error) {
        console.error("Error cargando categorías:", error);
    }
}

async function eliminarCategoria(id) {
    if(!confirm("¿Seguro que quieres borrar esta categoría? Los gastos asociados quedarán huérfanos.")) return;
    try {
        const res = await fetch(`${API_URL}/categorias/${id}`, { method: 'DELETE' });
        if(res.ok) cargarCategoriasVisuales();
        else alert("No se pudo eliminar");
    } catch (error) { alert("Error de conexión"); }
}

function actualizarDropdownCategorias(categorias) {
    const select = document.querySelector('#formGasto select');
    if (!select) return;
    const valorActual = select.value;
    select.innerHTML = '';
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.innerText = cat.nombre;
        select.appendChild(option);
    });
    if(valorActual) select.value = valorActual;
}