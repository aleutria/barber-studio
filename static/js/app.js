document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initBookingForm();
    initDisponibilidad();
    initGallery();
    initPrivacyModal();
});

function initMobileMenu() {
    const menuCheckbox = document.getElementById('open-menu');
    const navLinks = document.querySelectorAll('.nav__link');

    if (!menuCheckbox) {
        return;
    }

    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            menuCheckbox.checked = false;
        });
    });
}

function initBookingForm() {
    const form = document.getElementById('bookingForm');
    const bookingButton = document.querySelector('.btn_reserva');

    if (bookingButton) {
        bookingButton.addEventListener('click', () => {
            setTimeout(() => {
                const nameInput = document.getElementById('nombre');

                if (nameInput) {
                    nameInput.focus();
                }
            }, 500);
        });
    }

    if (!form) {
        return;
    }

    form.addEventListener('submit', handleBookingSubmit);
}

async function handleBookingSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const privacyCheckbox = document.getElementById('privacidad');

    if (privacyCheckbox && !privacyCheckbox.checked) {
        alert('Debes aceptar la política de privacidad para poder confirmar la cita.');
        return;
    }

    const nameInput = document.getElementById('nombre');
    const phoneInput = document.getElementById('telefono');
    const dateInput = document.getElementById('fecha');
    const timeInput = document.getElementById('hora');

    const nombre = nameInput.value.trim();
    const telefono = phoneInput.value.trim();
    const fecha = dateInput.value;
    const hora = timeInput.value;

    if (!nombre || !telefono || !fecha || !hora) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    const datosReserva = {
        nombre,
        telefono,
        fecha_hora: `${fecha}T${hora}:00`
    };

    try {
        const response = await fetch('/reservas/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosReserva)
        });

        const resultado = await parseResponse(response);

        hideMessage('mensaje-exito');
        hideMessage('mensaje-error');

        if (response.ok) {
            showSuccessMessage(nombre, fecha, hora);
            form.reset();
            resetHoraSelect();
            return;
        }

        showErrorMessage(
            resultado.detail ||
            resultado.message ||
            'Disculpa, ocurrió un error al procesar la reserva.'
        );

        // El horario elegido pudo dejar de estar libre entre que se
        // cargó la lista y se envió el formulario (por ejemplo, otra
        // persona reservó justo antes). Refrescamos las horas
        // disponibles de ese mismo día para que no vuelva a intentarlo
        // con una hora que ya no existe.
        if (fecha) {
            cargarHorasDisponibles(fecha);
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Error de conexión con el servidor.', 4000);
    }
}

async function parseResponse(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            detail: text
        };
    }
}

function showSuccessMessage(nombre, fecha, hora) {
    const successMessage = document.getElementById('mensaje-exito');

    if (!successMessage) {
        return;
    }

    successMessage.textContent =
        `✅ ¡Cita confirmada con éxito para ${nombre} ` +
        `el día ${fecha} a las ${hora}! Te esperamos.`;

    successMessage.classList.add('mostrar-mensaje');

    setTimeout(() => {
        successMessage.classList.remove('mostrar-mensaje');
    }, 7000);
}

function showErrorMessage(message, duration = 5000) {
    const errorMessage = document.getElementById('mensaje-error');

    if (!errorMessage) {
        return;
    }

    errorMessage.textContent = `❌ ${message}`;
    errorMessage.classList.add('mostrar-mensaje');

    setTimeout(() => {
        errorMessage.classList.remove('mostrar-mensaje');
    }, duration);
}

function hideMessage(elementId) {
    const element = document.getElementById(elementId);

    if (element) {
        element.classList.remove('mostrar-mensaje');
    }
}

// ==========================================
// DISPONIBILIDAD DE HORAS
// ==========================================
// En vez de dejar que el cliente elija cualquier hora "a ciegas" y
// enterarse de que estaba ocupada solo al enviar el formulario, el
// <select> de hora se rellena consultando /disponibilidad/{fecha}
// en cuanto elige un día. El backend sigue validando igualmente al
// crear la reserva (por si el hueco se ocupa justo entre medias).

function initDisponibilidad() {
    const dateInput = document.getElementById('fecha');
    const timeSelect = document.getElementById('hora');

    if (!dateInput || !timeSelect) {
        return;
    }

    resetHoraSelect();

    dateInput.addEventListener('change', () => {
        if (dateInput.value) {
            cargarHorasDisponibles(dateInput.value);
        } else {
            resetHoraSelect();
        }
    });
}

function resetHoraSelect() {
    const timeSelect = document.getElementById('hora');

    if (!timeSelect) {
        return;
    }

    timeSelect.innerHTML = '';
    timeSelect.disabled = true;

    const opcion = document.createElement('option');
    opcion.value = '';
    opcion.textContent = 'Selecciona antes una fecha';
    timeSelect.appendChild(opcion);
}

async function cargarHorasDisponibles(fecha) {
    const timeSelect = document.getElementById('hora');

    if (!timeSelect) {
        return;
    }

    timeSelect.innerHTML = '';
    timeSelect.disabled = true;

    const opcionCargando = document.createElement('option');
    opcionCargando.value = '';
    opcionCargando.textContent = 'Consultando disponibilidad...';
    timeSelect.appendChild(opcionCargando);

    try {
        const response = await fetch(`/disponibilidad/${fecha}`);

        if (!response.ok) {
            throw new Error(`Respuesta ${response.status}`);
        }

        const datos = await response.json();
        rellenarHoraSelect(timeSelect, datos.huecos_libres, datos.motivo_cierre);
    } catch (error) {
        console.error('Error al consultar disponibilidad:', error);

        // Si no se puede consultar el servidor, no bloqueamos al
        // cliente del todo: mostramos el rango de horas habitual y
        // dejamos que sea el backend quien valide al enviar.
        rellenarHoraSelect(timeSelect, generarHorasFijas(), null);
    }
}

function rellenarHoraSelect(timeSelect, horas, motivoCierre) {
    timeSelect.innerHTML = '';

    if (motivoCierre) {
        const opcion = document.createElement('option');
        opcion.value = '';
        opcion.textContent = `Cerrado: ${motivoCierre}`;
        timeSelect.appendChild(opcion);
        timeSelect.disabled = true;
        return;
    }

    if (!horas || horas.length === 0) {
        const opcion = document.createElement('option');
        opcion.value = '';
        opcion.textContent = 'No quedan horas libres ese día';
        timeSelect.appendChild(opcion);
        timeSelect.disabled = true;
        return;
    }

    const opcionPlaceholder = document.createElement('option');
    opcionPlaceholder.value = '';
    opcionPlaceholder.textContent = 'Elige una hora';
    timeSelect.appendChild(opcionPlaceholder);

    horas.forEach((hora) => {
        const opcion = document.createElement('option');
        opcion.value = hora;
        opcion.textContent = hora;
        timeSelect.appendChild(opcion);
    });

    timeSelect.disabled = false;
}

// Solo se usa como último recurso si /disponibilidad/{fecha} no
// responde (p. ej. sin conexión): reproduce el rango fijo que tenía
// el formulario antes de este cambio.
function generarHorasFijas() {
    const horas = [];
    let horaActual = 10 * 60; // 10:00 en minutos
    const horaFin = 16 * 60 + 15; // 16:15 en minutos

    while (horaActual <= horaFin) {
        const h = Math.floor(horaActual / 60).toString().padStart(2, '0');
        const m = (horaActual % 60).toString().padStart(2, '0');
        horas.push(`${h}:${m}`);
        horaActual += 45;
    }

    return horas;
}

function initGallery() {
    const gallery = document.querySelector('.gallery-container');

    if (!gallery) {
        return;
    }

    const items = gallery.querySelectorAll('.gallery-item');
    const previousButton = document.querySelector('.gallery-btn-prev');
    const nextButton = document.querySelector('.gallery-btn-next');

    initGalleryNavigation(gallery, previousButton, nextButton);
    initMobileGallery(gallery, items);
}

function initGalleryNavigation(gallery, previousButton, nextButton) {
    if (!previousButton || !nextButton) {
        return;
    }

    const getScrollAmount = () => {
        const item = gallery.querySelector('.gallery-item');

        if (!item) {
            return 350;
        }

        return item.offsetWidth + 20;
    };

    nextButton.addEventListener('click', () => {
        gallery.scrollBy({
            left: getScrollAmount(),
            behavior: 'smooth'
        });
    });

    previousButton.addEventListener('click', () => {
        gallery.scrollBy({
            left: -getScrollAmount(),
            behavior: 'smooth'
        });
    });
}

function initMobileGallery(gallery, items) {
    if (window.innerWidth > 768 || items.length === 0) {
        return;
    }

    const updateCenteredCard = () => {
        const galleryRect = gallery.getBoundingClientRect();
        const galleryCenter = galleryRect.left + galleryRect.width / 2;

        let closestItem = null;
        let smallestDistance = Infinity;

        items.forEach((item) => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;
            const distance = Math.abs(galleryCenter - itemCenter);

            if (distance < smallestDistance) {
                smallestDistance = distance;
                closestItem = item;
            }
        });

        items.forEach((item) => {
            item.classList.remove('is-centered');
        });

        if (closestItem) {
            closestItem.classList.add('is-centered');
        }
    };

    let ticking = false;

    gallery.addEventListener(
        'scroll',
        () => {
            if (ticking) {
                return;
            }

            window.requestAnimationFrame(() => {
                updateCenteredCard();
                ticking = false;
            });

            ticking = true;
        },
        { passive: true }
    );

    setTimeout(() => {
        if (items.length < 3) {
            return;
        }

        const targetItem = items[2];

        const targetScroll =
            targetItem.offsetLeft -
            gallery.offsetLeft -
            gallery.clientWidth / 2 +
            targetItem.clientWidth / 2;

        gallery.scrollLeft = targetScroll;
        updateCenteredCard();
    }, 60);
}

function initPrivacyModal() {
    const modal = document.getElementById('modal-privacidad');
    const openButton = document.getElementById('openPrivacy');
    const closeButton = document.getElementById('closePrivacy');

    if (!modal || !openButton) {
        return;
    }

    openButton.addEventListener('click', (event) => {
        event.preventDefault();
        modal.style.display = 'flex';
    });

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}