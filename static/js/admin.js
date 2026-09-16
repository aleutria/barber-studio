// ==========================================
// CONFIGURACIÓN Y AUTENTICACIÓN
// ==========================================

const ADMIN_USER = 'nesker';
let adminCredentials = null;

const NOMBRES_MES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const formLogin = document.getElementById('form-login');
    const inputPassword = document.getElementById('password-admin');
    const errorMsg = document.getElementById('login-error');

    if (!formLogin) return;

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = inputPassword.value.trim();

        if (!password) {
            mostrarError(errorMsg, 'Introduce la contraseña.');
            return;
        }

        const credenciales = btoa(`${ADMIN_USER}:${password}`);
        const accesoValido = await verificarAcceso(credenciales);

        if (!accesoValido) {
            adminCredentials = null;
            mostrarError(errorMsg, 'Credenciales incorrectas.');
            inputPassword.value = '';
            inputPassword.focus();
            return;
        }

        adminCredentials = credenciales;
        inputPassword.value = '';
        errorMsg.style.display = 'none';

        loginContainer.style.display = 'none';
        adminPanel.style.display = 'block';

        iniciarFuncionesAdmin();
    });
});

async function verificarAcceso(credenciales) {
    try {
        const response = await fetch('/reservas/', {
            headers: {
                Authorization: `Basic ${credenciales}`
            }
        });

        return response.ok;
    } catch (error) {
        console.error('Error verificando acceso:', error);
        return false;
    }
}

function mostrarError(elemento, mensaje) {
    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.style.display = 'block';
}

// ==========================================
// CITAS
// ==========================================

function iniciarFuncionesAdmin() {
    cargarCitas();
    cargarBloqueos();
    cargarEstadisticas();

    setInterval(cargarCitas, 15000);
    setInterval(cargarBloqueos, 15000);
}

async function cargarCitas() {
    if (!adminCredentials) return;

    try {
        const response = await fetch('/reservas/', {
            headers: {
                Authorization: `Basic ${adminCredentials}`
            }
        });

        if (!response.ok) {
            console.error('No se pudieron cargar las citas:', response.status);
            return;
        }

        const reservas = await response.json();
        const tbody = document.getElementById('tabla-citas');

        if (!tbody) return;

        tbody.replaceChildren();

        if (reservas.length === 0) {
            const fila = document.createElement('tr');
            const celda = document.createElement('td');

            celda.colSpan = 4;
            celda.className = 'no-citas';
            celda.textContent = 'No hay citas registradas todavía.';

            fila.appendChild(celda);
            tbody.appendChild(fila);
            return;
        }

        reservas.sort(
            (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
        );

        reservas.forEach(cita => {
            tbody.appendChild(crearFilaCita(cita));
        });
    } catch (error) {
        console.error('Error al cargar las citas:', error);
    }
}

// Construye la fila con createElement/textContent en vez de innerHTML,
// para que el nombre y el teléfono (escritos por el propio cliente en
// el formulario público) nunca puedan ejecutarse como HTML/JS aquí.
function crearFilaCita(cita) {
    const fecha = new Date(cita.fecha_hora).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short'
    });

    const fila = document.createElement('tr');

    const celdaNombre = document.createElement('td');
    const fuerteNombre = document.createElement('strong');
    fuerteNombre.textContent = cita.nombre;
    celdaNombre.appendChild(fuerteNombre);

    const celdaTelefono = document.createElement('td');
    celdaTelefono.textContent = cita.telefono;

    const celdaFecha = document.createElement('td');
    celdaFecha.textContent = fecha;

    const celdaBorrar = document.createElement('td');
    const botonBorrar = document.createElement('button');
    botonBorrar.type = 'button';
    botonBorrar.className = 'btn-borrar';
    botonBorrar.textContent = 'Eliminar';
    botonBorrar.addEventListener('click', () => borrarCita(cita.id));
    celdaBorrar.appendChild(botonBorrar);

    fila.append(celdaNombre, celdaTelefono, celdaFecha, celdaBorrar);

    return fila;
}

async function borrarCita(id) {
    if (!confirm('¿Seguro que quieres eliminar esta cita?')) return;

    try {
        const response = await fetch(`/reservas/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Basic ${adminCredentials}`
            }
        });

        if (response.ok) {
            cargarCitas();
        } else {
            alert('Hubo un error al eliminar la cita.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ==========================================
// BLOQUEOS
// ==========================================

async function cargarBloqueos() {
    if (!adminCredentials) return;

    try {
        const response = await fetch('/bloqueos/', {
            headers: {
                Authorization: `Basic ${adminCredentials}`
            }
        });

        if (!response.ok) {
            console.error(
                'No se pudieron cargar los bloqueos:',
                response.status
            );
            return;
        }

        const bloqueos = await response.json();
        const lista = document.getElementById('lista-bloqueos');

        if (!lista) return;

        lista.replaceChildren();

        if (bloqueos.length === 0) {
            const vacio = document.createElement('li');
            vacio.className = 'no-citas';
            vacio.textContent = 'No hay periodos bloqueados actualmente.';
            lista.appendChild(vacio);
            return;
        }

        bloqueos.forEach(bloqueo => {
            lista.appendChild(crearItemBloqueo(bloqueo));
        });
    } catch (error) {
        console.error('Error al cargar los bloqueos:', error);
    }
}

// Igual que crearFilaCita: sin innerHTML con datos externos. El
// motivo del bloqueo lo escribe el propio admin, pero se trata
// igual de seguro por costumbre y consistencia.
function crearItemBloqueo(bloqueo) {
    const [anio, mes, dia] = bloqueo.fecha.split('-');
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    const li = document.createElement('li');

    const span = document.createElement('span');

    const fuerteFecha = document.createElement('strong');
    fuerteFecha.textContent = fechaFormateada;

    const em = document.createElement('em');
    em.textContent = bloqueo.motivo;

    span.append(fuerteFecha, ' - ', em);

    const botonDesbloquear = document.createElement('button');
    botonDesbloquear.type = 'button';
    botonDesbloquear.className = 'btn-borrar';
    botonDesbloquear.textContent = 'Desbloquear';
    botonDesbloquear.addEventListener('click', () => eliminarBloqueo(bloqueo.id));

    li.append(span, botonDesbloquear);

    return li;
}

async function eliminarBloqueo(id) {
    if (!confirm('¿Seguro que quieres desbloquear este día?')) return;

    try {
        const response = await fetch(`/bloqueos/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Basic ${adminCredentials}`
            }
        });

        if (response.ok) {
            cargarBloqueos();
        } else {
            alert('Hubo un error al desbloquear el día.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ==========================================
// ESTADÍSTICAS MENSUALES
// ==========================================
// Los meses ya cerrados se archivan solos en el backend (al crear
// una reserva o al listar citas). Aquí solo se muestra lo que ya
// hay guardado.

async function cargarEstadisticas() {
    if (!adminCredentials) return;

    try {
        const response = await fetch('/estadisticas/', {
            headers: {
                Authorization: `Basic ${adminCredentials}`
            }
        });

        if (!response.ok) {
            console.error(
                'No se pudieron cargar las estadísticas:',
                response.status
            );
            return;
        }

        const resumen = await response.json();
        const lista = document.getElementById('lista-estadisticas');

        if (!lista) return;

        lista.replaceChildren();

        // Mes en curso, siempre primero y destacado
        lista.appendChild(crearItemEstadistica(resumen.mes_actual, true));

        if (resumen.historico.length === 0) {
            const vacio = document.createElement('li');
            vacio.className = 'no-citas';
            vacio.textContent = 'Todavía no hay ningún mes cerrado con datos.';
            lista.appendChild(vacio);
            return;
        }

        resumen.historico.forEach(estadistica => {
            lista.appendChild(crearItemEstadistica(estadistica, false));
        });
    } catch (error) {
        console.error('Error al cargar las estadísticas:', error);
    }
}

function crearItemEstadistica(estadistica, esMesActual) {
    const nombreMes = NOMBRES_MES[estadistica.mes - 1] || estadistica.mes;

    const li = document.createElement('li');

    if (esMesActual) {
        li.className = 'en-curso';
    }

    const span = document.createElement('span');
    const fuerte = document.createElement('strong');
    fuerte.textContent = esMesActual
        ? `${nombreMes} ${estadistica.anio} (en curso)`
        : `${nombreMes} ${estadistica.anio}`;

    const totalTexto = document.createElement('em');
    totalTexto.textContent = `${estadistica.total_citas} cita(s) atendida(s)`;

    span.append(fuerte, ' - ', totalTexto);
    li.appendChild(span);

    return li;
}

// ==========================================
// CREAR BLOQUEOS / VACACIONES
// ==========================================

const formBloqueo = document.getElementById('form-bloqueo');

if (formBloqueo) {
    formBloqueo.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!adminCredentials) {
            alert('No hay una sesión administrativa activa.');
            return;
        }

        const fechaInput = document.getElementById('fecha-bloqueo');
        const fecha = fechaInput.value;
        const motivoInput = document
            .getElementById('motivo-bloqueo')
            .value
            .trim();

        if (!fecha) {
            alert('Por favor, selecciona un día.');
            return;
        }

        try {
            const response = await fetch('/bloqueos/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${adminCredentials}`
                },
                body: JSON.stringify({
                    fecha: fecha,
                    motivo: motivoInput || 'Cerrado'
                })
            });

            if (response.ok) {
                fechaInput.value = '';
                cargarBloqueos();
                alert('¡Día bloqueado correctamente!');
            } else {
                alert('Hubo un error al bloquear el día.');
            }
        } catch (error) {
            console.error('Error al bloquear el día:', error);
            alert('Hubo un error al bloquear el día.');
        }
    });
}