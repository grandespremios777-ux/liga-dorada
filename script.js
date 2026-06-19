let adminActivo = false;

const CLAVE_ADMIN = "LigaDorada2026";

let partidoId = "pichanga_actual";
let pichangasCargadas = [];
let conteoInscritosPorPichanga = {};

let jugadores = JSON.parse(localStorage.getItem("jugadores")) || [];

let inscritos = jugadores.length;

localStorage.setItem("inscritos", inscritos);

let datosPartido = JSON.parse(localStorage.getItem("datosPartido")) || {
    modalidad: "Fulbito 9 vs 9",
    cancha: "Cancha La 12",
    hora: "Jueves 10:30 PM",
    precio: "S/18 por jugador"
};

document.addEventListener("DOMContentLoaded", function() {

    cargarDatosPartidoFirebase();
    cargarPichangasFirebase();
    cargarJugadoresFirebase();

    const checkPerfil = document.getElementById("usarPerfilLigaDorada");
    const campoWhatsapp = document.getElementById("whatsapp");

    if (checkPerfil) {
        checkPerfil.addEventListener("change", function() {
            actualizarModoPerfil();
            mostrarPerfilEncontrado();
        });
    }

    if (campoWhatsapp) {
        campoWhatsapp.addEventListener("input", mostrarPerfilEncontrado);
    }

    actualizarModoPerfil();
});

function reservarCupo() {
    const formulario = document.getElementById("formulario");

    formulario.style.display = "block";

    setTimeout(() => {
        formulario.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }, 100);
}

async function enviarReserva() {

    if (inscritos >= 18) {
        alert("La pichanga ya está llena");
        return;
    }

    let nombre = document.getElementById("nombre").value.trim();
    let edad = document.getElementById("edad").value.trim();
    let distrito = document.getElementById("distrito").value.trim();
    let correo = document.getElementById("correo").value.trim();
    let whatsapp = document.getElementById("whatsapp").value.trim();
    let posicion = document.getElementById("posicion").value;
    let pieDominante = document.getElementById("pieDominante").value;
    let equipo = document.getElementById("equipo").value;
    let usarPerfil = document.getElementById("usarPerfilLigaDorada").checked;

    if (!usarPerfil && nombre === "") {
    alert("Por favor ingresa tu nombre");
    return;
}

    if (!usarPerfil && correo === "") {
    alert("Por favor ingresa tu correo");
    return;
}

    let correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

   if (!usarPerfil && !validarCorreo(correo)) {
    alert("Ingresa un correo válido");
    return;
}

    if (whatsapp === "") {
        alert("Por favor ingresa tu WhatsApp");
        return;
    }

    let whatsappValido = /^[0-9]{9}$/.test(whatsapp);

    if (!whatsappValido) {
        alert("El WhatsApp debe tener 9 números");
        return;
    }

    if (!whatsapp.startsWith("9")) {
        alert("El WhatsApp debe empezar con 9");
        return;
    }

    let whatsappRepetido = jugadores.some(function(jugador) {
        return jugador.whatsapp === whatsapp;
    });

    if (whatsappRepetido) {
        alert("Este WhatsApp ya está inscrito en esta pichanga");
        return;
    }

    let cantidadEquipoA = jugadores.filter(function(jugador, index) {
        return obtenerEquipo(jugador, index) === "A";
    }).length;

    let cantidadEquipoB = jugadores.filter(function(jugador, index) {
        return obtenerEquipo(jugador, index) === "B";
    }).length;

    if (equipo === "A" && cantidadEquipoA >= 9) {
        alert("El Equipo A ya está lleno");
        return;
    }

    if (equipo === "B" && cantidadEquipoB >= 9) {
        alert("El Equipo B ya está lleno");
        return;
    }

    if (!usarPerfil && pieDominante === "") {
    alert("Selecciona tu pie dominante");
    return;
}

let perfilPrevio = await cargarPerfilJugadorFirebase(whatsapp);

if (usarPerfil && !perfilPrevio) {
    alert("No encontramos un perfil con ese WhatsApp. Regístrate de forma normal.");
    return;
}

if (usarPerfil && perfilPrevio.nombre === "") {
    alert("Tu perfil existe, pero está incompleto. Contacta al administrador para actualizar tus datos.");
    return;
}

if (!usarPerfil && perfilPrevio) {
    alert("Este WhatsApp ya tiene un perfil Liga Dorada. Marca la opción 'Usar mi perfil Liga Dorada' para inscribirte.");
    return;
}

    let nuevoJugador = {
    nombre: usarPerfil && perfilPrevio ? perfilPrevio.nombre : nombre,
    edad: edad,
    distrito: distrito,
    correo: usarPerfil && perfilPrevio ? perfilPrevio.correo : correo,
    whatsapp: whatsapp,
    jugadorId: usarPerfil && perfilPrevio ? perfilPrevio.jugadorId : whatsapp,
    posicion: posicion,
    equipo: equipo,
    partidoId: localStorage.getItem("pichangaSeleccionadaId") || partidoId,
    nivel: perfilPrevio ? perfilPrevio.nivel : 1,
    pieDominante: usarPerfil && perfilPrevio ? perfilPrevio.pieDominante : pieDominante,
    partidosJugados: perfilPrevio ? perfilPrevio.partidosJugados : 0,
    goles: perfilPrevio ? perfilPrevio.goles : 0,
    puntos: perfilPrevio ? perfilPrevio.puntos : 0,
    estado: "Pendiente de pago"
};
    jugadores.push(nuevoJugador);

    localStorage.setItem("jugadores", JSON.stringify(jugadores));

    console.log("NUEVO JUGADOR ANTES DE GUARDAR:", nuevoJugador);
console.log("ID DE PICHANGA EN LOCALSTORAGE:", localStorage.getItem("pichangaSeleccionadaId"));
console.log("PARTIDO ID GLOBAL:", partidoId);
    
    await guardarJugadorFirebase(nuevoJugador);

    await cargarJugadoresFirebase();
await cargarPichangasFirebase();

const pichangaActualId = localStorage.getItem("pichangaSeleccionadaId");

if (pichangaActualId) {
    verDetallePichanga(pichangaActualId);
}

if (!usarPerfil) {
    await guardarPerfilJugadorFirebase(nuevoJugador);
}

    inscritos = jugadores.length;

    document.getElementById("contador-inscritos").textContent = inscritos;

    localStorage.setItem("inscritos", inscritos);

    mostrarJugadores();

    actualizarContadoresEquipos();

    actualizarResumenPichanga();

    document.getElementById("nombre").value = "";
    document.getElementById("correo").value = "";
    document.getElementById("whatsapp").value = "";
    document.getElementById("posicion").value = "Arquero";
    document.getElementById("equipo").value = "A";

    const checkPerfil = document.getElementById("usarPerfilLigaDorada");
const mensajePerfil = document.getElementById("mensajePerfilEncontrado");

if (checkPerfil) {
    checkPerfil.checked = false;
}

if (mensajePerfil) {
    mensajePerfil.innerHTML = "";
}

actualizarModoPerfil();

    alert("Reserva registrada correctamente");

    actualizarBotonEnviar();
}

function obtenerEquipo(jugador, index) {

    if (jugador.equipo) {
        return jugador.equipo;
    }

    if (index < 9) {
        return "A";
    } else {
        return "B";
    }
}

function mostrarJugadores() {

    let listaEquipoA = document.getElementById("lista-equipo-a");
    let listaEquipoB = document.getElementById("lista-equipo-b");

    listaEquipoA.innerHTML = "";
    listaEquipoB.innerHTML = "";

    jugadores.forEach(function(jugador, index) {

    let nuevoJugador = document.createElement("li");

    let estado = jugador.estado || "Pendiente de pago";
    let equipo = obtenerEquipo(jugador, index);
    let nivel = jugador.nivel || 1;
    let estrellas = nivel + "⭐";

    let resumenJugador = document.createElement("div");

resumenJugador.textContent = jugador.nombre + " - " + jugador.posicion + " - " + estrellas + " - Pie: " + jugador.pieDominante + " - " + estado;

nuevoJugador.appendChild(resumenJugador);

let botonVerEstadisticas = document.createElement("button");

botonVerEstadisticas.textContent = "Ver estadísticas";

botonVerEstadisticas.classList.add("btn-mover");

let panelEstadisticas = document.createElement("div");

panelEstadisticas.style.display = "none";

panelEstadisticas.innerHTML =
    "<strong>Estadísticas del jugador</strong><br>" +
    "PT: " + (jugador.partidosJugados || 0) + "<br>" +
    "Goles: " + (jugador.goles || 0) + "<br>" +
    "Puntos: " + (jugador.puntos || 0) + "<br>" +
    "Nivel: " + estrellas + "<br>" +
    "Pie dominante: " + jugador.pieDominante + "<br>" +
    "ID jugador: " + (jugador.jugadorId || jugador.whatsapp) + "<br>" +
    "WhatsApp: " + jugador.whatsapp + "<br>" +
    "Correo: " + jugador.correo;

botonVerEstadisticas.onclick = function() {

    if (panelEstadisticas.style.display === "none") {
        panelEstadisticas.style.display = "block";
        botonVerEstadisticas.textContent = "Ocultar estadísticas";
    } else {
        panelEstadisticas.style.display = "none";
        botonVerEstadisticas.textContent = "Ver estadísticas";
    }
};

nuevoJugador.appendChild(botonVerEstadisticas);

nuevoJugador.appendChild(panelEstadisticas);


    if (adminActivo) {

        if (estado === "Pendiente de pago") {

            let botonConfirmar = document.createElement("button");

            botonConfirmar.textContent = "Confirmar pago ✅";

            botonConfirmar.classList.add("btn-confirmar");

            botonConfirmar.onclick = function() {
                confirmarPago(index);
            };

            nuevoJugador.appendChild(botonConfirmar);
        }

        let botonMover = document.createElement("button");

        botonMover.textContent = "Mover ↔️";

        botonMover.classList.add("btn-mover");

        botonMover.onclick = function() {
            moverEquipo(index);
        };

        nuevoJugador.appendChild(botonMover);

        let botonBajarNivel = document.createElement("button");

        botonBajarNivel.textContent = "- Nivel ⭐";

        botonBajarNivel.classList.add("btn-mover");

        botonBajarNivel.onclick = function() {
            cambiarNivel(index, -1);
        };

        nuevoJugador.appendChild(botonBajarNivel);

        let botonSubirNivel = document.createElement("button");

        botonSubirNivel.textContent = "+ Nivel ⭐";

        botonSubirNivel.classList.add("btn-mover");

        botonSubirNivel.onclick = function() {
            cambiarNivel(index, 1);
        };

        nuevoJugador.appendChild(botonSubirNivel);

        let botonBajarGol = document.createElement("button");

botonBajarGol.textContent = "- Gol ⚽";

botonBajarGol.classList.add("btn-mover");

botonBajarGol.onclick = function() {
    cambiarGoles(index, -1);
};

nuevoJugador.appendChild(botonBajarGol);

let botonSubirGol = document.createElement("button");

botonSubirGol.textContent = "+ Gol ⚽";

botonSubirGol.classList.add("btn-mover");

botonSubirGol.onclick = function() {
    cambiarGoles(index, 1);
};

nuevoJugador.appendChild(botonSubirGol);

let botonBajarPT = document.createElement("button");

botonBajarPT.textContent = "- PT";

botonBajarPT.classList.add("btn-mover");

botonBajarPT.onclick = function() {
    cambiarPT(index, -1);
};

nuevoJugador.appendChild(botonBajarPT);

let botonSubirPT = document.createElement("button");

botonSubirPT.textContent = "+ PT";

botonSubirPT.classList.add("btn-mover");

botonSubirPT.onclick = function() {
    cambiarPT(index, 1);
};

nuevoJugador.appendChild(botonSubirPT);

let botonBajarPunto = document.createElement("button");

botonBajarPunto.textContent = "- Punto";

botonBajarPunto.classList.add("btn-mover");

botonBajarPunto.onclick = function() {
    cambiarPuntos(index, -1);
};

nuevoJugador.appendChild(botonBajarPunto);

let botonSubirPunto = document.createElement("button");

botonSubirPunto.textContent = "+ Punto";

botonSubirPunto.classList.add("btn-mover");

botonSubirPunto.onclick = function() {
    cambiarPuntos(index, 1);
};

nuevoJugador.appendChild(botonSubirPunto);

        let botonEliminar = document.createElement("button");

        botonEliminar.textContent = "🗑️";

        botonEliminar.classList.add("btn-eliminar");

        botonEliminar.onclick = function() {
            eliminarJugador(index);
        };

        nuevoJugador.appendChild(botonEliminar);
    }

    if (equipo === "A") {
        listaEquipoA.appendChild(nuevoJugador);
    } else {
        listaEquipoB.appendChild(nuevoJugador);
    }
});
}

async function confirmarPago(index) {

    jugadores[index].estado = "Confirmado ✅";

    await actualizarEstadoFirebase(jugadores[index]);

    localStorage.setItem("jugadores", JSON.stringify(jugadores));

    mostrarJugadores();

    actualizarResumenPichanga();

    alert("Pago confirmado correctamente");
}

async function eliminarJugador(index) {

    let confirmar = confirm("¿Seguro que quieres eliminar este inscrito?");

    if (confirmar === false) {
        return;
    }

    await eliminarJugadorFirebase(jugadores[index]);

    jugadores.splice(index, 1);

    localStorage.setItem("jugadores", JSON.stringify(jugadores));

    inscritos = jugadores.length;

    document.getElementById("contador-inscritos").textContent = inscritos;

    localStorage.setItem("inscritos", inscritos);

    mostrarJugadores();

    actualizarContadoresEquipos();

    actualizarResumenPichanga();

    actualizarBotonEnviar();
}

function actualizarBotonEnviar() {

    let boton = document.getElementById("btn-enviar");

    if (inscritos >= 18) {
        boton.disabled = true;
        boton.textContent = "Pichanga llena";
    } else {
        boton.disabled = false;
        boton.textContent = "Enviar";
    }
}

async function moverEquipo(index) {

    let equipoActual = obtenerEquipo(jugadores[index], index);

    let nuevoEquipo;

    if (equipoActual === "A") {
        nuevoEquipo = "B";
    } else {
        nuevoEquipo = "A";
    }

    let cantidadNuevoEquipo = jugadores.filter(function(jugador, i) {
        return obtenerEquipo(jugador, i) === nuevoEquipo;
    }).length;

    if (cantidadNuevoEquipo >= 9) {
        alert("No puedes moverlo. El otro equipo ya está lleno.");
        return;
    }

    jugadores[index].equipo = nuevoEquipo;

    await actualizarEquipoFirebase(jugadores[index]);

    localStorage.setItem("jugadores", JSON.stringify(jugadores));

    mostrarJugadores();

    actualizarContadoresEquipos();
}

function actualizarContadoresEquipos() {

    let cantidadEquipoA = jugadores.filter(function(jugador, index) {
        return obtenerEquipo(jugador, index) === "A";
    }).length;

    let cantidadEquipoB = jugadores.filter(function(jugador, index) {
        return obtenerEquipo(jugador, index) === "B";
    }).length;

    document.getElementById("contador-equipo-a").textContent = cantidadEquipoA;
    document.getElementById("contador-equipo-b").textContent = cantidadEquipoB;
}

function compartirEquipos() {

    let equipoA = jugadores.filter(function(jugador, index) {
        return obtenerEquipo(jugador, index) === "A";
    });

    let equipoB = jugadores.filter(function(jugador, index) {
        return obtenerEquipo(jugador, index) === "B";
    });

    let mensaje = "🏆 Liga Dorada%0A%0A";
    mensaje += "⚽ " + datosPartido.modalidad + "%0A";
    mensaje += "📍 " + datosPartido.cancha + "%0A";
    mensaje += "🕐 " + datosPartido.hora + "%0A";
    mensaje += "💰 " + datosPartido.precio + "%0A%0A";

    mensaje += "🟡 Equipo A%0A";

    equipoA.forEach(function(jugador, index) {
        mensaje += (index + 1) + ". " + jugador.nombre + " - " + jugador.posicion + "%0A";
    });

    mensaje += "%0A⚫ Equipo B%0A";

    equipoB.forEach(function(jugador, index) {
        mensaje += (index + 1) + ". " + jugador.nombre + " - " + jugador.posicion + "%0A";
    });

    mensaje += "%0ANos vemos en la cancha ⚽🔥";

    window.open("https://wa.me/?text=" + mensaje, "_blank");
}

async function reiniciarPichanga() {

    let confirmar = confirm("¿Seguro que quieres borrar todos los inscritos de esta pichanga?");

    if (confirmar === false) {
        return;
    }

    await guardarHistorialPichangaFirebase();
    await eliminarTodosJugadoresFirebase();

    jugadores = [];
    inscritos = 0;

    localStorage.setItem("jugadores", JSON.stringify(jugadores));
    localStorage.setItem("inscritos", inscritos);

    document.getElementById("contador-inscritos").textContent = inscritos;

    mostrarJugadores();

    actualizarContadoresEquipos();

    actualizarBotonEnviar();

    actualizarResumenPichanga();

    alert("Pichanga reiniciada correctamente");
}

function actualizarResumenPichanga() {

    let confirmados = jugadores.filter(function(jugador) {
        return jugador.estado === "Confirmado ✅";
    }).length;

    let pendientes = jugadores.filter(function(jugador) {
        return jugador.estado !== "Confirmado ✅";
    }).length;

    let libres = 18 - jugadores.length;

    document.getElementById("contador-confirmados").textContent = confirmados;
    document.getElementById("contador-pendientes").textContent = pendientes;
    document.getElementById("contador-libres").textContent = libres;
}

function activarAdmin() {

    if (adminActivo === true) {

        adminActivo = false;

        document.getElementById("admin-acciones").style.display = "none";

        document.getElementById("btn-admin-login").textContent = "Modo Administrador";

        mostrarJugadores();

        alert("Modo administrador desactivado");

        return;
    }

    let clave = prompt("Ingresa la clave de administrador");

    if (clave === CLAVE_ADMIN) {

        adminActivo = true;

        document.getElementById("admin-acciones").style.display = "flex";

        document.getElementById("btn-admin-login").textContent = "Salir de Modo Admin";

        mostrarJugadores();

        alert("Modo administrador activado");

    } else {

        alert("Clave incorrecta");
    }
}

async function actualizarPartido() {

    let modalidad = document.getElementById("input-modalidad").value.trim();
    let cancha = document.getElementById("input-cancha").value.trim();
    let hora = document.getElementById("input-hora").value.trim();
    let precio = document.getElementById("input-precio").value.trim();

    if (modalidad === "") {
        alert("Ingresa la modalidad del partido");
        return;
    }

    if (cancha === "") {
        alert("Ingresa la cancha");
        return;
    }

    if (hora === "") {
        alert("Ingresa la hora");
        return;
    }

    if (precio === "") {
        alert("Ingresa el precio");
        return;
    }

    datosPartido = {
        modalidad: modalidad,
        cancha: cancha,
        hora: hora,
        precio: precio
    };

    localStorage.setItem("datosPartido", JSON.stringify(datosPartido));

    await guardarDatosPartidoFirebase();

    cargarDatosPartido();

    alert("Datos del partido actualizados y guardados");
}

function cargarDatosPartido() {

    document.getElementById("partido-modalidad").textContent = "⚽ " + datosPartido.modalidad;
    document.getElementById("partido-cancha").textContent = datosPartido.cancha;
    document.getElementById("partido-hora").textContent = datosPartido.hora;
    document.getElementById("partido-precio").textContent = datosPartido.precio;

    document.getElementById("input-modalidad").value = datosPartido.modalidad;
    document.getElementById("input-cancha").value = datosPartido.cancha;
    document.getElementById("input-hora").value = datosPartido.hora;
    document.getElementById("input-precio").value = datosPartido.precio;
}

async function guardarDatosPartidoFirebase() {

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/configuracion/partido?key="
        + config.apiKey;

        const datos = {
    fields: {
        partidoId: {
            stringValue: partidoId
        },
        modalidad: {
            stringValue: datosPartido.modalidad
        },
        cancha: {
            stringValue: datosPartido.cancha
        },
        hora: {
            stringValue: datosPartido.hora
        },
        precio: {
            stringValue: datosPartido.precio
        },
        actualizadoEn: {
            timestampValue: new Date().toISOString()
        }
    }
};

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Datos de partido guardados en Firebase:", resultado);

        if (!respuesta.ok) {
            alert("No se pudieron guardar los datos del partido en Firebase");
        }

    } catch (error) {
        console.error("Error guardando datos del partido en Firebase:", error);
        alert("Error de conexión guardando datos del partido");
    }
}


async function cargarDatosPartidoFirebase() {

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/configuracion/partido?key="
        + config.apiKey;

    try {
        const respuesta = await fetch(url);

        const resultado = await respuesta.json();

        console.log("Datos del partido desde Firebase:", resultado);

        if (!respuesta.ok) {
            console.error("No se pudieron cargar los datos del partido desde Firebase:", resultado);
            return;
        }

        const campos = resultado.fields;

        datosPartido = {
            modalidad: campos.modalidad ? campos.modalidad.stringValue : "Fulbito 9 vs 9",
            cancha: campos.cancha ? campos.cancha.stringValue : "Cancha La 12",
            hora: campos.hora ? campos.hora.stringValue : "Jueves 10:30 PM",
            precio: campos.precio ? campos.precio.stringValue : "S/18 por jugador"
        };

        localStorage.setItem("datosPartido", JSON.stringify(datosPartido));

        cargarDatosPartido();

    } catch (error) {
        console.error("Error cargando datos del partido desde Firebase:", error);
    }
}

async function probarFirebase() {

    alert("1. Botón funcionando");

    try {

        const config = window.firebaseConfig;

        if (!config) {
            alert("2. No encuentro firebaseConfig. Revisa firebase-config.js");
            return;
        }

        alert("2. Config encontrada: " + config.projectId);

        const url = "https://firestore.googleapis.com/v1/projects/" 
            + config.projectId 
            + "/databases/(default)/documents/pruebas?key=" 
            + config.apiKey;

        const datos = {
            fields: {
                mensaje: {
                    stringValue: "Liga Dorada conectado"
                },
                fecha: {
                    timestampValue: new Date().toISOString()
                }
            }
        };

        const respuesta = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const texto = await respuesta.text();

        console.log("Respuesta Firebase:", texto);

        if (respuesta.ok) {
            alert("3. Firebase conectado correctamente");
        } else {
            alert("3. Firebase respondió con error. Mira la consola.");
        }

    } catch (error) {

        console.error("Error JavaScript:", error);

        alert("Error JavaScript: " + error.message);
    }
}


async function guardarJugadorFirebase(jugador) {

    const config = window.firebaseConfig;

    if (!config) {
        alert("No encuentro firebaseConfig");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/" 
        + config.projectId 
        + "/databases/(default)/documents/inscritos?key=" 
        + config.apiKey;

    const datos = {
        fields: {
    nombre: {
        stringValue: jugador.nombre
    },

    edad: {
    integerValue: Number(jugador.edad || 0)
},
distrito: {
    stringValue: jugador.distrito || "No definido"
},

    correo: {
        stringValue: jugador.correo
    },
    whatsapp: {
        stringValue: jugador.whatsapp
    },

    jugadorId: {
    stringValue: jugador.jugadorId || jugador.whatsapp
},
    posicion: {
        stringValue: jugador.posicion
    },
    equipo: {
        stringValue: jugador.equipo
    },
    partidoId: {
    stringValue: jugador.partidoId || localStorage.getItem("pichangaSeleccionadaId") || partidoId
    },

    nivel: {
    integerValue: jugador.nivel
    },

    pieDominante: {
    stringValue: jugador.pieDominante || "No definido"
},

goles: {
    integerValue: jugador.goles || 0
},

puntos: {
    integerValue: jugador.puntos || 0
},

    estado: {
    stringValue: jugador.estado
    },

    fechaRegistro: {
        timestampValue: new Date().toISOString()
    }
}
    };

    try {
        const respuesta = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Jugador guardado en Firebase:", resultado);

        if (respuesta.ok) {

            jugador.firebaseId = resultado.name.split("/").pop();

            localStorage.setItem("jugadores", JSON.stringify(jugadores));

        } else {

            alert("El jugador se guardó localmente, pero hubo un error guardando en Firebase.");
        }

    } catch (error) {

        console.error("Error guardando jugador en Firebase:", error);

        alert("El jugador se guardó localmente, pero no se pudo guardar en Firebase.");
    }
}

async function cargarJugadoresFirebase() {

    const config = window.firebaseConfig;

    if (!config) {
        console.error("No encuentro firebaseConfig");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/" 
        + config.projectId 
        + "/databases/(default)/documents/inscritos?key=" 
        + config.apiKey;

    try {
        const respuesta = await fetch(url);

        const resultado = await respuesta.json();

        console.log("Inscritos desde Firebase:", resultado);

        if (!respuesta.ok) {
            console.error("Error cargando inscritos desde Firebase:", resultado);
            return;
        }

        let documentos = resultado.documents || [];

        jugadores = documentos.map(function(documento) {

            let campos = documento.fields || {};

         return {
    firebaseId: documento.name.split("/").pop(),
    nombre: campos.nombre ? campos.nombre.stringValue : "",
    correo: campos.correo ? campos.correo.stringValue : "",
    whatsapp: campos.whatsapp ? campos.whatsapp.stringValue : "",
    jugadorId: campos.jugadorId ? campos.jugadorId.stringValue : campos.whatsapp ? campos.whatsapp.stringValue : "",
    posicion: campos.posicion ? campos.posicion.stringValue : "",
    equipo: campos.equipo ? campos.equipo.stringValue : "A",
    partidoId: campos.partidoId ? campos.partidoId.stringValue : "pichanga_actual",
    edad: campos.edad ? Number(campos.edad.integerValue || campos.edad.stringValue) : "",
    nivel: campos.nivel ? Number(campos.nivel.integerValue) : 1,
    puntos: campos.puntos ? Number(campos.puntos.integerValue || campos.puntos.stringValue) : 0,
    partidosJugados: campos.partidosJugados ? Number(campos.partidosJugados.integerValue || campos.partidosJugados.stringValue) : 0,
    pieDominante: campos.pieDominante ? campos.pieDominante.stringValue : "No definido",
    goles: campos.goles ? Number(campos.goles.integerValue || campos.goles.stringValue) : 0,
    partidosJugados: campos.partidosJugados ? Number(campos.partidosJugados.integerValue) : 0,
    puntos: campos.puntos ? Number(campos.puntos.integerValue) : 0,
    estado: campos.estado ? campos.estado.stringValue : "Pendiente de pago"
};
        });


        const partidoActivo = localStorage.getItem("pichangaSeleccionadaId") || partidoId;

console.log("Partido activo para filtro:", partidoActivo);

console.log("Todos los jugadores antes del filtro:", jugadores.map(function(jugador) {
    return {
        nombre: jugador.nombre,
        whatsapp: jugador.whatsapp,
        equipo: jugador.equipo,
        estado: jugador.estado,
        partidoId: jugador.partidoId
    };
}));

jugadores = jugadores.filter(function(jugador) {
    return jugador.partidoId === partidoActivo;
});

console.log("Jugadores filtrados:", jugadores);

        inscritos = jugadores.length;

        localStorage.setItem("jugadores", JSON.stringify(jugadores));
        localStorage.setItem("inscritos", inscritos);

        document.getElementById("contador-inscritos").textContent = inscritos;

        mostrarJugadores();

        mostrarEquiposDetallePichanga();

        actualizarContadoresEquipos();

        actualizarResumenPichanga();

        actualizarBotonEnviar();

    } catch (error) {
        console.error("Error leyendo Firebase:", error);
    }
}

async function actualizarEstadoFirebase(jugador) {

    const config = window.firebaseConfig;

    if (!jugador.firebaseId) {
        console.error("Este jugador no tiene firebaseId");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + jugador.firebaseId
        + "?updateMask.fieldPaths=estado&key="
        + config.apiKey;

    const datos = {
        fields: {
            estado: {
                stringValue: jugador.estado
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Estado actualizado en Firebase:", resultado);

        if (!respuesta.ok) {
            alert("No se pudo actualizar el estado en Firebase");
        }

    } catch (error) {
        console.error("Error actualizando estado en Firebase:", error);
        alert("Error de conexión actualizando estado");
    }
}


async function actualizarEquipoFirebase(jugador) {

    const config = window.firebaseConfig;

    if (!jugador.firebaseId) {
        console.error("Este jugador no tiene firebaseId");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + jugador.firebaseId
        + "?updateMask.fieldPaths=equipo&key="
        + config.apiKey;

    const datos = {
        fields: {
            equipo: {
                stringValue: jugador.equipo
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Equipo actualizado en Firebase:", resultado);

        if (!respuesta.ok) {
            alert("No se pudo actualizar el equipo en Firebase");
        }

    } catch (error) {
        console.error("Error actualizando equipo en Firebase:", error);
        alert("Error de conexión actualizando equipo");
    }
}

async function actualizarNivelFirebase(jugador) {

    const config = window.firebaseConfig;

    if (!jugador.firebaseId) {
        console.error("Este jugador no tiene firebaseId");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + jugador.firebaseId
        + "?updateMask.fieldPaths=nivel&key="
        + config.apiKey;

    const datos = {
        fields: {
            nivel: {
                integerValue: jugador.nivel
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Nivel actualizado en Firebase:", resultado);

        if (!respuesta.ok) {
            alert("No se pudo actualizar el nivel en Firebase");
        }

    } catch (error) {
        console.error("Error actualizando nivel en Firebase:", error);
        alert("Error de conexión actualizando nivel");
    }
}

async function actualizarGolesFirebase(jugador) {

    const config = window.firebaseConfig;

    if (!jugador.firebaseId) {
        console.error("Este jugador no tiene firebaseId");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + jugador.firebaseId
        + "?updateMask.fieldPaths=goles&key="
        + config.apiKey;

    const datos = {
        fields: {
            goles: {
                integerValue: jugador.goles || 0
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Goles actualizados en inscritos:", resultado);

        if (!respuesta.ok) {
            alert("No se pudieron actualizar los goles en Firebase");
        }

    } catch (error) {
        console.error("Error actualizando goles:", error);
        alert("Error de conexión actualizando goles");
    }
}

async function actualizarPuntosFirebase(jugador) {

    const config = window.firebaseConfig;

    if (!jugador.firebaseId) {
        console.error("Este jugador no tiene firebaseId");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + jugador.firebaseId
        + "?updateMask.fieldPaths=puntos&key="
        + config.apiKey;

    const datos = {
        fields: {
            puntos: {
                integerValue: jugador.puntos || 0
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Puntos actualizados en inscritos:", resultado);

        if (!respuesta.ok) {
            alert("No se pudieron actualizar los puntos en Firebase");
        }

    } catch (error) {
        console.error("Error actualizando puntos:", error);
        alert("Error de conexión actualizando puntos");
    }
}

async function actualizarPuntosPerfilFirebase(jugador) {

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/jugadoresPerfil/"
        + jugador.whatsapp
        + "?updateMask.fieldPaths=puntos&updateMask.fieldPaths=actualizadoEn&key="
        + config.apiKey;

    const datos = {
        fields: {
            puntos: {
                integerValue: jugador.puntos || 0
            },
            actualizadoEn: {
                timestampValue: new Date().toISOString()
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Puntos actualizados en perfil:", resultado);

        if (!respuesta.ok) {
            alert("No se pudieron actualizar los puntos en el perfil del jugador");
        }

    } catch (error) {
        console.error("Error actualizando puntos en perfil:", error);
        alert("Error de conexión actualizando puntos en perfil");
    }
}

async function cambiarPuntos(index, cambio) {

    let jugador = jugadores[index];

    let puntosActuales = jugador.puntos || 0;

    let nuevosPuntos = puntosActuales + cambio;

    if (nuevosPuntos < 0) {
        alert("Los puntos no pueden ser negativos");
        return;
    }

    jugador.puntos = nuevosPuntos;

    await actualizarPuntosFirebase(jugador);

    await actualizarPuntosPerfilFirebase(jugador);

    localStorage.setItem("jugadores", JSON.stringify(jugadores));

    mostrarJugadores();
}

async function actualizarPTFirebase(jugador) {

    const config = window.firebaseConfig;

    if (!jugador.firebaseId) {
        console.error("Este jugador no tiene firebaseId");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + jugador.firebaseId
        + "?updateMask.fieldPaths=partidosJugados&key="
        + config.apiKey;

    const datos = {
        fields: {
            partidosJugados: {
                integerValue: jugador.partidosJugados || 0
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("PT actualizado en inscritos:", resultado);

        if (!respuesta.ok) {
            alert("No se pudo actualizar PT en Firebase");
        }

    } catch (error) {
        console.error("Error actualizando PT:", error);
        alert("Error de conexión actualizando PT");
    }
}

async function actualizarPTPerfilFirebase(jugador) {

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/jugadoresPerfil/"
        + jugador.whatsapp
        + "?updateMask.fieldPaths=partidosJugados&updateMask.fieldPaths=actualizadoEn&key="
        + config.apiKey;

    const datos = {
        fields: {
            partidosJugados: {
                integerValue: jugador.partidosJugados || 0
            },
            actualizadoEn: {
                timestampValue: new Date().toISOString()
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("PT actualizado en perfil:", resultado);

        if (!respuesta.ok) {
            alert("No se pudo actualizar PT en el perfil del jugador");
        }

    } catch (error) {
        console.error("Error actualizando PT en perfil:", error);
        alert("Error de conexión actualizando PT en perfil");
    }
}

async function cambiarPT(index, cambio) {

    let jugador = jugadores[index];

    let ptActual = jugador.partidosJugados || 0;

    let nuevoPT = ptActual + cambio;

    if (nuevoPT < 0) {
        alert("PT no puede ser negativo");
        return;
    }

    jugador.partidosJugados = nuevoPT;

    await actualizarPTFirebase(jugador);

    await actualizarPTPerfilFirebase(jugador);

    localStorage.setItem("jugadores", JSON.stringify(jugadores));

    mostrarJugadores();
}

async function cambiarGoles(index, cambio) {

    let jugador = jugadores[index];

    let golesActuales = jugador.goles || 0;

    let nuevosGoles = golesActuales + cambio;

    if (nuevosGoles < 0) {
        alert("Los goles no pueden ser negativos");
        return;
    }

    jugador.goles = nuevosGoles;

    await actualizarGolesFirebase(jugador);

    await actualizarGolesPerfilFirebase(jugador);

    localStorage.setItem("jugadores", JSON.stringify(jugadores));

    mostrarJugadores();
}

async function actualizarGolesPerfilFirebase(jugador) {

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/jugadoresPerfil/"
        + jugador.whatsapp
        + "?updateMask.fieldPaths=goles&updateMask.fieldPaths=actualizadoEn&key="
        + config.apiKey;

    const datos = {
        fields: {
            goles: {
                integerValue: jugador.goles || 0
            },
            actualizadoEn: {
                timestampValue: new Date().toISOString()
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Goles actualizados en perfil:", resultado);

        if (!respuesta.ok) {
            alert("No se pudieron actualizar los goles en el perfil del jugador");
        }

    } catch (error) {
        console.error("Error actualizando goles en perfil:", error);
        alert("Error de conexión actualizando goles en perfil");
    }
}

async function actualizarPieDominanteFirebase(jugador) {

    const config = window.firebaseConfig;

    if (!jugador.firebaseId) {
        console.error("Este jugador no tiene firebaseId");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + jugador.firebaseId
        + "?updateMask.fieldPaths=pieDominante&key="
        + config.apiKey;

    const datos = {
        fields: {
            pieDominante: {
                stringValue: jugador.pieDominante || "No definido"
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Pie dominante actualizado en Firebase:", resultado);

        if (!respuesta.ok) {
            alert("No se pudo actualizar el pie dominante en Firebase");
        }

    } catch (error) {
        console.error("Error actualizando pie dominante en Firebase:", error);
        alert("Error de conexión actualizando pie dominante");
    }
}


async function cambiarPieDominante(index, pie) {

    let jugador = jugadores[index];

    jugador.pieDominante = pie;

    await actualizarPieDominanteFirebase(jugador);

    await guardarPerfilJugadorFirebase(jugador);

    localStorage.setItem("jugadores", JSON.stringify(jugadores));

    mostrarJugadores();
}


async function cambiarNivel(index, cambio) {

    let jugador = jugadores[index];

    let nivelActual = jugador.nivel || 1;

    let nuevoNivel = nivelActual + cambio;

    if (nuevoNivel < 1) {
        alert("El nivel mínimo es 1");
        return;
    }

    if (nuevoNivel > 10) {
        alert("El nivel máximo es 10");
        return;
    }

    jugador.nivel = nuevoNivel;

    await actualizarNivelFirebase(jugador);

    await guardarPerfilJugadorFirebase(jugador);

    localStorage.setItem("jugadores", JSON.stringify(jugadores));

    mostrarJugadores();
}

async function eliminarJugadorFirebase(jugador) {

    const config = window.firebaseConfig;

    if (!jugador.firebaseId) {
        console.error("Este jugador no tiene firebaseId");
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + jugador.firebaseId
        + "?key="
        + config.apiKey;

    try {
        const respuesta = await fetch(url, {
            method: "DELETE"
        });

        console.log("Jugador eliminado de Firebase:", respuesta);

        if (!respuesta.ok) {
            alert("No se pudo eliminar el jugador en Firebase");
        }

    } catch (error) {
        console.error("Error eliminando jugador en Firebase:", error);
        alert("Error de conexión eliminando jugador");
    }
}

async function eliminarTodosJugadoresFirebase() {

    for (let i = 0; i < jugadores.length; i++) {
        await eliminarJugadorFirebase(jugadores[i]);
    }

    console.log("Todos los jugadores fueron eliminados de Firebase");
}

async function guardarHistorialPichangaFirebase() {

    const config = window.firebaseConfig;

    const jugadoresConfirmados = jugadores.filter(function(jugador) {
        return jugador.estado === "Confirmado ✅";
    }).length;

    const jugadoresPendientes = jugadores.filter(function(jugador) {
        return jugador.estado !== "Confirmado ✅";
    }).length;

    const equipoA = jugadores.filter(function(jugador) {
        return jugador.equipo === "A";
    });

    const equipoB = jugadores.filter(function(jugador) {
        return jugador.equipo === "B";
    });

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/historialPichangas?key="
        + config.apiKey;

    const datos = {
        fields: {
            partidoId: {
                stringValue: partidoId
            },
            modalidad: {
                stringValue: datosPartido.modalidad
            },
            cancha: {
                stringValue: datosPartido.cancha
            },
            hora: {
                stringValue: datosPartido.hora
            },
            precio: {
                stringValue: datosPartido.precio
            },
            totalJugadores: {
                integerValue: jugadores.length
            },
            confirmados: {
                integerValue: jugadoresConfirmados
            },
            pendientes: {
                integerValue: jugadoresPendientes
            },
            equipoAJson: {
                stringValue: JSON.stringify(equipoA)
            },
            equipoBJson: {
                stringValue: JSON.stringify(equipoB)
            },
            cerradoEn: {
                timestampValue: new Date().toISOString()
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        console.log("Historial de pichanga guardado:", resultado);

        if (!respuesta.ok) {
            alert("No se pudo guardar el historial de la pichanga");
        }

    } catch (error) {
        console.error("Error guardando historial de pichanga:", error);
        alert("Error de conexión guardando historial");
    }
}

async function guardarPerfilJugadorFirebase(jugador) {

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/jugadoresPerfil/"
        + jugador.whatsapp
        + "?key="
        + config.apiKey;

    try {

        const consulta = await fetch(url);

        let datos;

        if (consulta.ok) {

            datos = {
                fields: {
                    nombre: {
    stringValue: jugador.nombre
},
edad: {
    integerValue: Number(jugador.edad || 0)
},
distrito: {
    stringValue: jugador.distrito || "No definido"
},
correo: {
    stringValue: jugador.correo
},
                    whatsapp: {
    stringValue: jugador.whatsapp
},
jugadorId: {
    stringValue: jugador.jugadorId || jugador.whatsapp
},
posicion: {
    stringValue: jugador.posicion
},
                    nivel: {
                        integerValue: jugador.nivel || 1
                    },
                    pieDominante: {
                        stringValue: jugador.pieDominante || "No definido"
                    },
                    actualizadoEn: {
                        timestampValue: new Date().toISOString()
                    }
                }
            };

            const respuesta = await fetch(
    url + "&updateMask.fieldPaths=nombre&updateMask.fieldPaths=edad&updateMask.fieldPaths=distrito&updateMask.fieldPaths=correo",
    {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
    }
);

            const resultado = await respuesta.json();

            console.log("Perfil existente actualizado:", resultado);

            if (!respuesta.ok) {
                alert("No se pudo actualizar el perfil permanente del jugador");
            }

        } else {

            datos = {
    fields: {
        nombre: {
            stringValue: jugador.nombre
        },
        edad: {
            integerValue: Number(jugador.edad || 0)
        },
        distrito: {
            stringValue: jugador.distrito || "No definido"
        },
        correo: {
            stringValue: jugador.correo
        },
                    whatsapp: {
                        stringValue: jugador.whatsapp
                    },

                    jugadorId: {
    stringValue: jugador.jugadorId || jugador.whatsapp
},

                    posicion: {
                        stringValue: jugador.posicion
                    },
                    nivel: {
                        integerValue: jugador.nivel || 1
                    },
                    pieDominante: {
                        stringValue: jugador.pieDominante || "No definido"
                    },
                    partidosJugados: {
                        integerValue: 0
                    },
                    puntos: {
                        integerValue: 0
                    }, 
                    goles: {
    integerValue: 0
},
                    creadoEn: {
                        timestampValue: new Date().toISOString()
                    }
                }
            };

            const respuesta = await fetch(url, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datos)
            });

            const resultado = await respuesta.json();

            console.log("Perfil nuevo creado:", resultado);

            if (!respuesta.ok) {
                alert("No se pudo crear el perfil permanente del jugador");
            }
        }

    } catch (error) {
        console.error("Error guardando perfil de jugador:", error);
        alert("Error de conexión guardando perfil del jugador");
    }
}


async function cargarPerfilJugadorFirebase(whatsapp) {

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/jugadoresPerfil/"
        + whatsapp
        + "?key="
        + config.apiKey;

    try {
        const respuesta = await fetch(url);

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            console.log("No existe perfil previo para este jugador");
            return null;
        }

        const campos = resultado.fields || {};

        return {
    nombre: campos.nombre ? campos.nombre.stringValue : "",
    correo: campos.correo ? campos.correo.stringValue : "",
    whatsapp: campos.whatsapp ? campos.whatsapp.stringValue : whatsapp,
    jugadorId: campos.jugadorId ? campos.jugadorId.stringValue : whatsapp,
    posicion: campos.posicion ? campos.posicion.stringValue : "",
    nivel: campos.nivel ? Number(campos.nivel.integerValue || campos.nivel.stringValue) : 1,
    partidosJugados: campos.partidosJugados ? Number(campos.partidosJugados.integerValue) : 0,
    goles: campos.goles ? Number(campos.goles.integerValue) : 0,
    puntos: campos.puntos ? Number(campos.puntos.integerValue) : 0,
    pieDominante: campos.pieDominante ? campos.pieDominante.stringValue : "No definido"
};

    } catch (error) {
        console.error("Error cargando perfil del jugador:", error);
        return null;
    }
}
function actualizarModoPerfil() {
    const checkPerfil = document.getElementById("usarPerfilLigaDorada");

    if (!checkPerfil) {
        return;
    }

    const usarPerfil = checkPerfil.checked;

    const gruposOcultar = [
        "grupo-nombre",
        "grupo-edad",
        "grupo-distrito",
        "grupo-correo",
        "grupo-pie-dominante"
    ];

    gruposOcultar.forEach(function(idGrupo) {
        const grupo = document.getElementById(idGrupo);

        if (grupo) {
            grupo.style.display = usarPerfil ? "none" : "flex";
        }
    });
}


async function mostrarPerfilEncontrado() {

    const checkPerfil = document.getElementById("usarPerfilLigaDorada");
    const campoWhatsapp = document.getElementById("whatsapp");
    const mensajePerfil = document.getElementById("mensajePerfilEncontrado");

    if (!checkPerfil || !campoWhatsapp || !mensajePerfil) {
        return;
    }

    mensajePerfil.innerHTML = "";

    if (!checkPerfil.checked) {
        return;
    }

    const whatsapp = campoWhatsapp.value.trim();

    if (whatsapp.length !== 9) {
        mensajePerfil.innerHTML = "Ingresa tu WhatsApp de 9 dígitos para buscar tu perfil.";
        return;
    }

    const perfil = await cargarPerfilJugadorFirebase(whatsapp);

    if (!perfil) {
        mensajePerfil.innerHTML = "No encontramos un perfil con ese WhatsApp.";
        return;
    }

    if (perfil.nombre === "") {
        mensajePerfil.innerHTML = "Perfil encontrado, pero está incompleto. Contacta al administrador.";
        return;
    }

    mensajePerfil.innerHTML =
        "<strong>Perfil encontrado:</strong> " + perfil.nombre + "<br>" +
        perfil.nivel + "⭐ | PT: " + perfil.partidosJugados +
        " | Goles: " + perfil.goles +
        " | Puntos: " + perfil.puntos;
}

function validarCorreo(correo) {
    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return patronCorreo.test(correo);
}


let palabraSecretaAdmin = "";

document.addEventListener("keydown", function(event) {
    palabraSecretaAdmin += event.key.toLowerCase();

    if (palabraSecretaAdmin.length > 10) {
        palabraSecretaAdmin = palabraSecretaAdmin.slice(-10);
    }

    if (palabraSecretaAdmin.includes("dorada")) {
        const botonAdmin = document.getElementById("btn-admin-login");

        if (botonAdmin) {
            botonAdmin.style.display = "inline-block";
        }

        palabraSecretaAdmin = "";
    }
});

async function obtenerPerfilPorWhatsapp(whatsapp) {
    const projectId = window.firebaseConfig.projectId;

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/jugadoresPerfil/${whatsapp}`;

    const respuesta = await fetch(url);

    if (!respuesta.ok) {
        return null;
    }

    const data = await respuesta.json();

    if (!data.fields) {
        return null;
    }

    return {
        nombre: data.fields.nombre?.stringValue || "",
        edad: Number(data.fields.edad?.integerValue || 0),
        distrito: data.fields.distrito?.stringValue || "No definido",
        correo: data.fields.correo?.stringValue || "",
        whatsapp: data.fields.whatsapp?.stringValue || whatsapp,
        jugadorId: data.fields.jugadorId?.stringValue || whatsapp,
        posicion: data.fields.posicion?.stringValue || "",
        nivel: Number(data.fields.nivel?.integerValue || 1),
        pieDominante: data.fields.pieDominante?.stringValue || "",
        partidosJugados: Number(data.fields.partidosJugados?.integerValue || 0),
        goles: Number(data.fields.goles?.integerValue || 0),
        puntos: Number(data.fields.puntos?.integerValue || 0)
    };
}


async function buscarMiPerfil() {
    const whatsapp = document.getElementById("whatsappPerfil").value.trim();
    const resultado = document.getElementById("resultadoMiPerfil");

    if (!whatsapp) {
        resultado.innerHTML = "<p class='error'>Ingresa tu WhatsApp para buscar tu perfil.</p>";
        return;
    }

    if (!/^9\d{8}$/.test(whatsapp)) {
        resultado.innerHTML = "<p class='error'>El WhatsApp debe tener 9 dígitos y empezar con 9.</p>";
        return;
    }

    try {
        const perfil = await obtenerPerfilPorWhatsapp(whatsapp);

        if (!perfil) {
            resultado.innerHTML = "<p class='error'>No encontramos un perfil Liga Dorada con ese WhatsApp.</p>";
            return;
        }

        const inscripcionActual = jugadores.find(jugador => jugador.whatsapp === whatsapp);

        resultado.innerHTML = `
    <div class="perfil-resultado-card">
        <div class="perfil-top">
            <div class="perfil-avatar-grande">👤</div>

            <div class="perfil-main">
                <h3>${perfil.nombre || "Jugador Liga Dorada"}</h3>
                <p class="perfil-meta">
                    ${perfil.edad ? perfil.edad + " años" : "Edad no definida"} · 
                    ${perfil.distrito || "Distrito no definido"}
                </p>
                <p class="perfil-id">
                    ID: ${perfil.jugadorId || perfil.whatsapp || whatsapp}
                </p>
            </div>
        </div>

        <div class="perfil-stats-grid">
            <div class="stat-mini-card">
                <span class="stat-label">Nivel</span>
                <strong>${perfil.nivel || 1} ⭐</strong>
            </div>

            <div class="stat-mini-card">
                <span class="stat-label">PT</span>
                <strong>${perfil.partidosJugados || 0}</strong>
            </div>

            <div class="stat-mini-card">
                <span class="stat-label">Goles</span>
                <strong>${perfil.goles || 0}</strong>
            </div>

            <div class="stat-mini-card">
                <span class="stat-label">Puntos</span>
                <strong>${perfil.puntos || 0}</strong>
            </div>
        </div>

        <div class="perfil-bloque">
            <p><strong>Posición registrada:</strong> ${perfil.posicion || "No registrada"}</p>
            <p><strong>Pie dominante:</strong> ${perfil.pieDominante || "No registrado"}</p>
            <p><strong>WhatsApp:</strong> ${perfil.whatsapp || whatsapp}</p>
            <p><strong>Correo:</strong> ${perfil.correo || "No registrado"}</p>
        </div>

        <div class="perfil-bloque">
            <h4>🔥 Pichanga actual</h4>
            <p><strong>Estado:</strong> ${
                inscripcionActual
                    ? (inscripcionActual.estado === "Confirmado"
                        ? "Confirmado ✅"
                        : inscripcionActual.estado)
                    : "No inscrito actualmente"
            }</p>
            <p><strong>Equipo:</strong> ${inscripcionActual ? inscripcionActual.equipo : "Sin equipo actual"}</p>
            <p><strong>Posición en esta pichanga:</strong> ${inscripcionActual ? inscripcionActual.posicion : "No inscrito"}</p>
        </div>
    </div>
`;
    } catch (error) {
        console.error("Error buscando perfil:", error);
        resultado.innerHTML = "<p class='error'>Ocurrió un error al buscar tu perfil. Intenta nuevamente.</p>";
    }
}


async function cargarPichangasFirebase() {
    const config = window.firebaseConfig;

    if (!config) {
        console.error("No encuentro firebaseConfig");
        return;
    }

    const contenedor = document.getElementById("lista-pichangas");

    if (!contenedor) {
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/pichangas?key="
        + config.apiKey;

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.documents) {
            contenedor.innerHTML = "<p>No hay pichangas disponibles todavía.</p>";
            return;
        }

        pichangasCargadas = datos.documents.map(function(doc) {
            const fields = doc.fields || {};

            return {
                id: fields.id ? fields.id.stringValue : doc.name.split("/").pop(),
                nombre: fields.nombre ? fields.nombre.stringValue : "Pichanga sin nombre",
                cancha: fields.cancha ? fields.cancha.stringValue : "Por definir",
                hora: fields.hora ? fields.hora.stringValue : "Por definir",
                modalidad: fields.modalidad ? fields.modalidad.stringValue : "Por definir",
                precio: fields.precio ? fields.precio.stringValue : "Por confirmar",
                cupos: fields.cupos ? Number(fields.cupos.integerValue) : 18,
                estado: fields.estado ? fields.estado.stringValue : "Disponible"
            };
        });

        await cargarConteoInscritosPorPichanga();

mostrarPichangasEnCartelera(pichangasCargadas);
llenarSelectorAdminPichangas();

    } catch (error) {
        console.error("Error cargando pichangas:", error);
        contenedor.innerHTML = "<p>Error al cargar pichangas.</p>";
    }
}


function mostrarPichangasEnCartelera(pichangas) {
    const contenedor = document.getElementById("lista-pichangas");

    if (!contenedor) {
        return;
    }

    if (!pichangas || pichangas.length === 0) {
        contenedor.innerHTML = "<p>No hay pichangas disponibles todavía.</p>";
        return;
    }

    contenedor.innerHTML = "";

    pichangas.forEach(function(pichanga) {
        const estaDisponible = pichanga.estado === "Disponible";

        const card = document.createElement("div");
        card.className = estaDisponible ? "pichanga-card activa" : "pichanga-card proximamente";

        const etiqueta = document.createElement("div");
        etiqueta.className = "pichanga-etiqueta";
        etiqueta.textContent = pichanga.estado;

        const titulo = document.createElement("h3");
        titulo.textContent = pichanga.nombre;

        const cancha = document.createElement("p");
        cancha.innerHTML = "<strong>Cancha:</strong> " + pichanga.cancha;

        const hora = document.createElement("p");
        hora.innerHTML = "<strong>Hora:</strong> " + pichanga.hora;

        const modalidad = document.createElement("p");
        modalidad.innerHTML = "<strong>Modalidad:</strong> " + pichanga.modalidad;

        const precio = document.createElement("p");
        precio.innerHTML = "<strong>Precio:</strong> " + pichanga.precio;

        const inscritosPichanga = conteoInscritosPorPichanga[pichanga.id] || 0;

const cupos = document.createElement("div");
cupos.className = "pichanga-cupos";
cupos.innerHTML = "<span>" + inscritosPichanga + "/" + pichanga.cupos + " inscritos</span>";

        const boton = document.createElement("button");
        boton.className = estaDisponible ? "btn-gold" : "btn-gold btn-disabled";
        boton.textContent = estaDisponible ? "Ver detalles / Reservar" : "Próximamente";

        if (!estaDisponible) {
            boton.disabled = true;
        }

        if (estaDisponible) {
            boton.addEventListener("click", function() {
                console.log("Click en pichanga:", pichanga.id, pichanga.nombre);
                verDetallePichanga(pichanga.id);
            });
        }

        card.appendChild(etiqueta);
        card.appendChild(titulo);
        card.appendChild(cancha);
        card.appendChild(hora);
        card.appendChild(modalidad);
        card.appendChild(precio);
        card.appendChild(cupos);
        card.appendChild(boton);

        contenedor.appendChild(card);
    });
}


function verDetallePichanga(idPichanga) {
    const pichanga = pichangasCargadas.find(function(item) {
        return item.id === idPichanga;
    });

    if (!pichanga) {
        alert("No se encontró esta pichanga.");
        return;
    }

    partidoId = idPichanga;

    localStorage.setItem("pichangaSeleccionadaId", idPichanga);
    localStorage.setItem("pichangaSeleccionadaNombre", pichanga.nombre);

    document.getElementById("detalle-pichanga-titulo").textContent = "🏆 " + pichanga.nombre;
    document.getElementById("detalle-pichanga-modalidad").textContent = "⚽ " + pichanga.modalidad;
    document.getElementById("detalle-pichanga-cancha").textContent = pichanga.cancha;
    document.getElementById("detalle-pichanga-hora").textContent = pichanga.hora;
    document.getElementById("detalle-pichanga-precio").textContent = pichanga.precio;
    document.getElementById("detalle-pichanga-cupos").textContent = "0/" + pichanga.cupos + " inscritos";

    const detalle = document.getElementById("detalle-pichanga");

    if (detalle) {
        detalle.style.display = "block";

        detalle.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    cargarJugadoresFirebase();
}


function mostrarEquiposDetallePichanga() {
    const listaA = document.getElementById("detalle-lista-equipo-a");
    const listaB = document.getElementById("detalle-lista-equipo-b");
    const contadorA = document.getElementById("detalle-contador-equipo-a");
    const contadorB = document.getElementById("detalle-contador-equipo-b");

    if (!listaA || !listaB || !contadorA || !contadorB) {
        return;
    }

    listaA.innerHTML = "";
    listaB.innerHTML = "";

    const jugadoresEquipoA = jugadores.filter(function(jugador) {
        const equipo = (jugador.equipo || "").toLowerCase();
        return equipo === "a" || equipo === "equipo a" || equipo === "equipoa";
    });

    const jugadoresEquipoB = jugadores.filter(function(jugador) {
        const equipo = (jugador.equipo || "").toLowerCase();
        return equipo === "b" || equipo === "equipo b" || equipo === "equipob";
    });

    contadorA.textContent = jugadoresEquipoA.length;
    contadorB.textContent = jugadoresEquipoB.length;

    const contadorDetalle = document.getElementById("detalle-pichanga-cupos");

if (contadorDetalle) {
    const totalJugadoresDetalle = jugadoresEquipoA.length + jugadoresEquipoB.length;

    const pichangaActiva = pichangasCargadas.find(function(pichanga) {
        return pichanga.id === partidoId;
    });

    const cuposMaximos = pichangaActiva ? pichangaActiva.cupos : 0;

    contadorDetalle.textContent = totalJugadoresDetalle + "/" + cuposMaximos + " inscritos";
}

    if (jugadoresEquipoA.length === 0) {
        const item = document.createElement("li");
        item.textContent = "Aún no hay jugadores confirmados.";
        item.className = "empty-player";
        listaA.appendChild(item);
    }

    if (jugadoresEquipoB.length === 0) {
        const item = document.createElement("li");
        item.textContent = "Aún no hay jugadores confirmados.";
        item.className = "empty-player";
        listaB.appendChild(item);
    }

    jugadoresEquipoA.forEach(function(jugador, index) {
        const item = document.createElement("li");

        item.innerHTML = `
            <div class="jugador-top">
                <div class="jugador-nombre">${jugador.nombre || "Jugador Liga Dorada"}</div>
                <div class="jugador-numero">${index + 1}</div>
            </div>

            <div class="jugador-meta">
                <span class="meta-pill posicion">⚽ ${jugador.posicion || "Sin posición"}</span>
                <span class="meta-pill nivel">⭐ ${jugador.nivel || 1}</span>
                <span class="meta-pill pie">🦶 ${jugador.pieDominante || "No definido"}</span>
                <span class="meta-pill edad">🎂 ${jugador.edad || "-"} años</span>
            </div>
            <button class="btn-ver-caracteristicas" onclick="verCaracteristicasJugador('${jugador.whatsapp}')">
    Ver características
</button>

        `;

        listaA.appendChild(item);
    });

    jugadoresEquipoB.forEach(function(jugador, index) {
        const item = document.createElement("li");

        item.innerHTML = `
            <div class="jugador-top">
                <div class="jugador-nombre">${jugador.nombre || "Jugador Liga Dorada"}</div>
                <div class="jugador-numero">${index + 1}</div>
            </div>

            <div class="jugador-meta">
                <span class="meta-pill posicion">⚽ ${jugador.posicion || "Sin posición"}</span>
                <span class="meta-pill nivel">⭐ ${jugador.nivel || 1}</span>
                <span class="meta-pill pie">🦶 ${jugador.pieDominante || "No definido"}</span>
                <span class="meta-pill edad">🎂 ${jugador.edad || "-"} años</span>
            </div>
            <button class="btn-ver-caracteristicas" onclick="verCaracteristicasJugador('${jugador.whatsapp}')">
    Ver características
</button>
        `;

        listaB.appendChild(item);
    });

    console.log("Pichanga activa:", partidoId);
    console.log("Pichanga activa localStorage:", localStorage.getItem("pichangaSeleccionadaId"));
    console.log("Jugadores cargados para detalle:", jugadores);
}


function contarJugadoresPorPichanga(idPichanga) {
    const jugadoresGuardados = JSON.parse(localStorage.getItem("jugadores")) || [];

    const jugadoresDeEstaPichanga = jugadoresGuardados.filter(function(jugador) {
        return jugador.partidoId === idPichanga;
    });

    return jugadoresDeEstaPichanga.length;
}


function verCaracteristicasJugador(whatsapp) {
    const inputPerfil = document.getElementById("whatsappPerfil");
    const seccionPerfil = document.getElementById("mi-perfil");

    if (!inputPerfil) {
        alert("No se encontró el buscador de perfil.");
        return;
    }

    inputPerfil.value = whatsapp;

    if (seccionPerfil) {
        seccionPerfil.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (typeof buscarMiPerfil === "function") {
        buscarMiPerfil();
    } else if (typeof verMiPerfil === "function") {
        verMiPerfil();
    } else {
        alert("No se encontró la función para ver el perfil.");
    }
}

function irACarteleraPichangas() {
    const cartelera = document.getElementById("cartelera-pichangas");

    if (cartelera) {
        cartelera.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


function llenarSelectorAdminPichangas() {
    const selector = document.getElementById("admin-selector-pichanga");

    if (!selector) {
        return;
    }

    selector.innerHTML = '<option value="">Selecciona una pichanga</option>';

    pichangasCargadas.forEach(function(pichanga) {
        const option = document.createElement("option");
        option.value = pichanga.id;
        option.textContent = pichanga.nombre;
        selector.appendChild(option);
    });
}


function seleccionarPichangaAdmin() {
    const selector = document.getElementById("admin-selector-pichanga");

    if (!selector) {
        return;
    }

    const idPichanga = selector.value;

    if (!idPichanga) {
        return;
    }

    const pichanga = pichangasCargadas.find(function(item) {
        return item.id === idPichanga;
    });

    if (!pichanga) {
        alert("No se encontró la pichanga seleccionada.");
        return;
    }

    partidoId = idPichanga;
    localStorage.setItem("pichangaSeleccionadaId", idPichanga);
    localStorage.setItem("pichangaSeleccionadaNombre", pichanga.nombre);

    const inputNombre = document.getElementById("input-nombre-pichanga");
const inputModalidad = document.getElementById("input-modalidad");
const inputCancha = document.getElementById("input-cancha");
const inputHora = document.getElementById("input-hora");
const inputPrecio = document.getElementById("input-precio");
const inputCupos = document.getElementById("input-cupos-pichanga");
const inputEstado = document.getElementById("input-estado-pichanga");

if (inputNombre) {
    inputNombre.value = pichanga.nombre;
}    

if (inputModalidad) {
        inputModalidad.value = pichanga.modalidad;
    }

    if (inputCancha) {
        inputCancha.value = pichanga.cancha;
    }

    if (inputHora) {
        inputHora.value = pichanga.hora;
    }

    if (inputPrecio) {
        inputPrecio.value = pichanga.precio;
    }

    if (inputCupos) {
    inputCupos.value = pichanga.cupos;
}

if (inputEstado) {
    inputEstado.value = pichanga.estado;
}

    cargarJugadoresFirebase();

setTimeout(function() {
    mostrarJugadoresAdminPichanga();
    actualizarResumenAdminPichanga(idPichanga);
}, 500);

console.log("Pichanga seleccionada en admin:", pichanga);
}


async function actualizarPichangaAdmin() {
    const selector = document.getElementById("admin-selector-pichanga");

    if (!selector || !selector.value) {
        alert("Selecciona una pichanga para actualizar.");
        return;
    }

    const idPichanga = selector.value;

    const nombre = document.getElementById("input-nombre-pichanga").value.trim();
    const modalidad = document.getElementById("input-modalidad").value.trim();
    const cancha = document.getElementById("input-cancha").value.trim();
    const hora = document.getElementById("input-hora").value.trim();
    const precio = document.getElementById("input-precio").value.trim();
    const cupos = document.getElementById("input-cupos-pichanga").value;
    const estado = document.getElementById("input-estado-pichanga").value;

    if (!nombre || !modalidad || !cancha || !hora || !precio || !cupos) {
        alert("Completa todos los campos de la pichanga.");
        return;
    }

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/pichangas/"
        + idPichanga
        + "?key="
        + config.apiKey;

    const datos = {
        fields: {
            id: {
                stringValue: idPichanga
            },
            nombre: {
                stringValue: nombre
            },
            modalidad: {
                stringValue: modalidad
            },
            cancha: {
                stringValue: cancha
            },
            hora: {
                stringValue: hora
            },
            precio: {
                stringValue: precio
            },
            cupos: {
                integerValue: Number(cupos)
            },
            estado: {
                stringValue: estado
            },
            actualizadaEn: {
                timestampValue: new Date().toISOString()
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo actualizar la pichanga.");
        }

        alert("Pichanga actualizada correctamente.");

        await cargarPichangasFirebase();

        const selectorActualizado = document.getElementById("admin-selector-pichanga");

        if (selectorActualizado) {
            selectorActualizado.value = idPichanga;
        }

        seleccionarPichangaAdmin();
        actualizarResumenAdminPichanga(idPichanga);

    } catch (error) {
        console.error("Error actualizando pichanga:", error);
        alert("Error al actualizar la pichanga. Revisa la consola.");
    }
}


async function cargarConteoInscritosPorPichanga() {
    const config = window.firebaseConfig;

    if (!config) {
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos?key="
        + config.apiKey;

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        conteoInscritosPorPichanga = {};

        if (!respuesta.ok || !datos.documents) {
            return;
        }

        datos.documents.forEach(function(documento) {
            const campos = documento.fields || {};
            const idPichanga = campos.partidoId ? campos.partidoId.stringValue : "pichanga_actual";

            if (!conteoInscritosPorPichanga[idPichanga]) {
                conteoInscritosPorPichanga[idPichanga] = 0;
            }

            conteoInscritosPorPichanga[idPichanga]++;
        });

        console.log("Conteo por pichanga:", conteoInscritosPorPichanga);

    } catch (error) {
        console.error("Error contando inscritos por pichanga:", error);
    }
}


async function actualizarResumenAdminPichanga(idPichanga) {
    const config = window.firebaseConfig;

    if (!config || !idPichanga) {
        return;
    }

    const pichanga = pichangasCargadas.find(function(item) {
        return item.id === idPichanga;
    });

    if (!pichanga) {
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos?key="
        + config.apiKey;

    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        let confirmados = 0;
        let pendientes = 0;

        if (respuesta.ok && datos.documents) {
            datos.documents.forEach(function(documento) {
                const campos = documento.fields || {};
                const partidoJugador = campos.partidoId ? campos.partidoId.stringValue : "pichanga_actual";
                const estadoJugador = campos.estado ? campos.estado.stringValue : "Pendiente de pago";

                if (partidoJugador === idPichanga) {
                    if (estadoJugador.toLowerCase().includes("confirmado")) {
                        confirmados++;
                    } else {
                        pendientes++;
                    }
                }
            });
        }

        const totalInscritos = confirmados + pendientes;
        const cuposLibres = Math.max(Number(pichanga.cupos) - totalInscritos, 0);

        const contadorConfirmados = document.getElementById("contador-confirmados");
        const contadorPendientes = document.getElementById("contador-pendientes");
        const contadorLibres = document.getElementById("contador-libres");

        if (contadorConfirmados) {
            contadorConfirmados.textContent = confirmados;
        }

        if (contadorPendientes) {
            contadorPendientes.textContent = pendientes;
        }

        if (contadorLibres) {
            contadorLibres.textContent = cuposLibres;
        }

    } catch (error) {
        console.error("Error actualizando resumen admin:", error);
    }
}

async function crearPichangaAdmin() {
    const nombre = document.getElementById("input-nombre-pichanga").value.trim();
    const modalidad = document.getElementById("input-modalidad").value.trim();
    const cancha = document.getElementById("input-cancha").value.trim();
    const hora = document.getElementById("input-hora").value.trim();
    const precio = document.getElementById("input-precio").value.trim();
    const cupos = document.getElementById("input-cupos-pichanga").value;
    const estado = document.getElementById("input-estado-pichanga").value;

    if (!nombre || !modalidad || !cancha || !hora || !precio || !cupos) {
        alert("Completa todos los campos para crear la pichanga.");
        return;
    }

    const confirmar = confirm("¿Crear esta nueva pichanga?");

    if (!confirmar) {
        return;
    }

    const idBase = nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const idPichanga = idBase + "_" + Date.now();

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/pichangas/"
        + idPichanga
        + "?key="
        + config.apiKey;

    const datos = {
        fields: {
            id: {
                stringValue: idPichanga
            },
            nombre: {
                stringValue: nombre
            },
            modalidad: {
                stringValue: modalidad
            },
            cancha: {
                stringValue: cancha
            },
            hora: {
                stringValue: hora
            },
            precio: {
                stringValue: precio
            },
            cupos: {
                integerValue: Number(cupos)
            },
            estado: {
                stringValue: estado
            },
            creadaEn: {
                timestampValue: new Date().toISOString()
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo crear la pichanga.");
        }

        alert("Nueva pichanga creada correctamente.");

        await cargarPichangasFirebase();

        const selector = document.getElementById("admin-selector-pichanga");

        if (selector) {
            selector.value = idPichanga;
        }

        seleccionarPichangaAdmin();

    } catch (error) {
        console.error("Error creando pichanga:", error);
        alert("Error al crear la pichanga. Revisa la consola.");
    }
}


async function eliminarPichangaAdmin() {
    const selector = document.getElementById("admin-selector-pichanga");

    if (!selector || !selector.value) {
        alert("Selecciona una pichanga para eliminar.");
        return;
    }

    const idPichanga = selector.value;

    const pichanga = pichangasCargadas.find(function(item) {
        return item.id === idPichanga;
    });

    if (!pichanga) {
        alert("No se encontró la pichanga seleccionada.");
        return;
    }

    const confirmar = confirm("¿Seguro que quieres eliminar la pichanga: " + pichanga.nombre + "?");

    if (!confirmar) {
        return;
    }

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/pichangas/"
        + idPichanga
        + "?key="
        + config.apiKey;

    try {
        const respuesta = await fetch(url, {
            method: "DELETE"
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo eliminar la pichanga.");
        }

        alert("Pichanga eliminada correctamente.");

        await cargarPichangasFirebase();

        selector.value = "";

        document.getElementById("input-nombre-pichanga").value = "";
        document.getElementById("input-modalidad").value = "";
        document.getElementById("input-cancha").value = "";
        document.getElementById("input-hora").value = "";
        document.getElementById("input-precio").value = "";
        document.getElementById("input-cupos-pichanga").value = "";
        document.getElementById("input-estado-pichanga").value = "Disponible";

    } catch (error) {
        console.error("Error eliminando pichanga:", error);
        alert("Error al eliminar la pichanga. Revisa la consola.");
    }
}

function mostrarJugadoresAdminPichanga() {
    const contenedor = document.getElementById("admin-lista-jugadores-pichanga");

    if (!contenedor) {
        return;
    }

    const idPichanga = localStorage.getItem("pichangaSeleccionadaId") || partidoId;

    if (!idPichanga) {
        contenedor.innerHTML = "<p>Selecciona una pichanga para ver sus jugadores.</p>";
        return;
    }

    const jugadoresDeEstaPichanga = jugadores.filter(function(jugador) {
        return jugador.partidoId === idPichanga;
    });

    if (jugadoresDeEstaPichanga.length === 0) {
        contenedor.innerHTML = "<p>No hay jugadores registrados en esta pichanga.</p>";
        return;
    }

    contenedor.innerHTML = "";

    jugadoresDeEstaPichanga.forEach(function(jugador) {
        const card = document.createElement("div");
        card.className = "admin-jugador-card";

        card.innerHTML = `
            <h4>${jugador.nombre || "Jugador Liga Dorada"}</h4>

            <p><strong>WhatsApp:</strong> ${jugador.whatsapp || "-"}</p>
            <p><strong>Equipo:</strong> ${jugador.equipo || "-"}</p>
            <p><strong>Posición:</strong> ${jugador.posicion || "-"}</p>
            <p><strong>Nivel:</strong> ${jugador.nivel || 1}</p>
            <p><strong>Puntos:</strong> ${jugador.puntos || 0}</p>
            <p><strong>Partidos:</strong> ${jugador.partidosJugados || 0}</p>
            <p><strong>Goles:</strong> ${jugador.goles || 0}</p>
            <p><strong>Estado:</strong> ${jugador.estado || "Pendiente de pago"}</p>

            <div class="admin-jugador-acciones">
                <button class="btn-admin-confirmar" onclick="confirmarPagoJugadorAdmin('${jugador.firebaseId}')">
                    Confirmar pago
                </button>

                <button class="btn-admin-equipo" onclick="cambiarEquipoJugadorAdmin('${jugador.firebaseId}', '${jugador.equipo || "A"}')">
                    Cambiar equipo
                </button>

                <button class="btn-admin-nivel" onclick="cambiarNivelJugadorAdmin('${jugador.firebaseId}', '${jugador.nivel || 1}')">
                Cambiar nivel
                </button>

                <button class="btn-admin-nivel" onclick="cambiarPuntosJugadorAdmin('${jugador.firebaseId}', '${jugador.puntos || 0}')">
                Cambiar puntos
                </button>

                <button class="btn-admin-nivel" onclick="cambiarPartidosJugadorAdmin('${jugador.firebaseId}', '${jugador.partidosJugados || 0}')">
                Cambiar partidos
                </button>

                <button class="btn-admin-nivel" onclick="cambiarGolesJugadorAdmin('${jugador.firebaseId}', '${jugador.goles || 0}')">
    Cambiar goles
</button>

<button class="btn-admin-eliminar" onclick="eliminarJugadorAdmin('${jugador.firebaseId}')">
    Eliminar
</button>
            </div>
        `;

        contenedor.appendChild(card);
    });
}


async function confirmarPagoJugadorAdmin(firebaseId) {
    if (!firebaseId) {
        alert("No se encontró el jugador.");
        return;
    }

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + firebaseId
        + "?key="
        + config.apiKey
        + "&updateMask.fieldPaths=estado";

    const datos = {
        fields: {
            estado: {
                stringValue: "Confirmado ✅"
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo confirmar el pago.");
        }

        await refrescarAdminJugadores();

        alert("Pago confirmado correctamente.");

    } catch (error) {
        console.error("Error confirmando pago:", error);
        alert("Error al confirmar pago. Revisa la consola.");
    }
}


async function cambiarEquipoJugadorAdmin(firebaseId, equipoActual) {
    if (!firebaseId) {
        alert("No se encontró el jugador.");
        return;
    }

    const nuevoEquipo = equipoActual === "A" ? "B" : "A";

    const confirmar = confirm("¿Cambiar jugador al Equipo " + nuevoEquipo + "?");

    if (!confirmar) {
        return;
    }

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + firebaseId
        + "?key="
        + config.apiKey
        + "&updateMask.fieldPaths=equipo";

    const datos = {
        fields: {
            equipo: {
                stringValue: nuevoEquipo
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo cambiar el equipo.");
        }

        await refrescarAdminJugadores();

        alert("Jugador cambiado al Equipo " + nuevoEquipo + ".");

    } catch (error) {
        console.error("Error cambiando equipo:", error);
        alert("Error al cambiar equipo. Revisa la consola.");
    }
}


async function cambiarNivelJugadorAdmin(firebaseId, nivelActual) {
    if (!firebaseId) {
        alert("No se encontró el jugador.");
        return;
    }

    const nuevoNivel = prompt("Nuevo nivel del jugador:", nivelActual || 1);

    if (nuevoNivel === null) {
        return;
    }

    const nivelNumero = Number(nuevoNivel);

    if (!nivelNumero || nivelNumero < 1) {
        alert("Ingresa un nivel válido.");
        return;
    }

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + firebaseId
        + "?key="
        + config.apiKey
        + "&updateMask.fieldPaths=nivel";

    const datos = {
        fields: {
            nivel: {
                integerValue: nivelNumero
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo cambiar el nivel.");
        }

        const jugadorActual = jugadores.find(function(jugador) {
    return jugador.firebaseId === firebaseId;
});

console.log("Jugador encontrado para actualizar nivel:", jugadorActual);
console.log("Nuevo nivel que se quiere guardar:", nivelNumero);

if (jugadorActual && jugadorActual.whatsapp) {
    await actualizarCampoPerfilJugador(jugadorActual.whatsapp, "nivel", nivelNumero);
    console.log("Se mandó actualizar nivel en jugadoresPerfil:", jugadorActual.whatsapp);
} else {
    console.warn("No se encontró WhatsApp para actualizar nivel en jugadoresPerfil.");
}
        
        await refrescarAdminJugadores();

        alert("Nivel actualizado correctamente.");

    } catch (error) {
        console.error("Error cambiando nivel:", error);
        alert("Error al cambiar nivel. Revisa la consola.");
    }
}


async function eliminarJugadorAdmin(firebaseId) {
    if (!firebaseId) {
        alert("No se encontró el jugador.");
        return;
    }

    const confirmar = confirm("¿Seguro que quieres eliminar este jugador de la pichanga?");

    if (!confirmar) {
        return;
    }

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + firebaseId
        + "?key="
        + config.apiKey;

    try {
        const respuesta = await fetch(url, {
            method: "DELETE"
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo eliminar el jugador.");
        }

        await refrescarAdminJugadores();

        alert("Jugador eliminado correctamente.");

    } catch (error) {
        console.error("Error eliminando jugador:", error);
        alert("Error al eliminar jugador. Revisa la consola.");
    }
}


async function refrescarAdminJugadores() {
    const idPichanga = localStorage.getItem("pichangaSeleccionadaId") || partidoId;

    await cargarJugadoresFirebase();
    await cargarPichangasFirebase();

    mostrarJugadoresAdminPichanga();
    mostrarEquiposDetallePichanga();

    if (idPichanga) {
        actualizarResumenAdminPichanga(idPichanga);
    }
}


async function cambiarPuntosJugadorAdmin(firebaseId, puntosActuales) {
    if (!firebaseId) {
        alert("No se encontró el jugador.");
        return;
    }

    const nuevosPuntos = prompt("Nuevos puntos del jugador:", puntosActuales || 0);

    if (nuevosPuntos === null) {
        return;
    }

    const puntosNumero = Number(nuevosPuntos);

    if (isNaN(puntosNumero) || puntosNumero < 0) {
        alert("Ingresa una cantidad válida de puntos.");
        return;
    }

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + firebaseId
        + "?key="
        + config.apiKey
        + "&updateMask.fieldPaths=puntos";

    const datos = {
        fields: {
            puntos: {
                integerValue: puntosNumero
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo cambiar los puntos.");
        }

        const jugadorActual = jugadores.find(function(jugador) {
    return jugador.firebaseId === firebaseId;
});

if (jugadorActual && jugadorActual.whatsapp) {
    await actualizarCampoPerfilJugador(jugadorActual.whatsapp, "puntos", puntosNumero);
}
        
        await refrescarAdminJugadores();
    

        alert("Puntos actualizados correctamente.");

    } catch (error) {
        console.error("Error cambiando puntos:", error);
        alert("Error al cambiar puntos. Revisa la consola.");
    }
}


async function cambiarPartidosJugadorAdmin(firebaseId, partidosActuales) {
    if (!firebaseId) {
        alert("No se encontró el jugador.");
        return;
    }

    const nuevosPartidos = prompt("Nuevo total de partidos jugados:", partidosActuales || 0);

    if (nuevosPartidos === null) {
        return;
    }

    const partidosNumero = Number(nuevosPartidos);

    if (isNaN(partidosNumero) || partidosNumero < 0) {
        alert("Ingresa una cantidad válida de partidos.");
        return;
    }

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + firebaseId
        + "?key="
        + config.apiKey
        + "&updateMask.fieldPaths=partidosJugados";

    const datos = {
        fields: {
            partidosJugados: {
                integerValue: partidosNumero
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo cambiar los partidos.");
        }

        const jugadorActual = jugadores.find(function(jugador) {
    return jugador.firebaseId === firebaseId;
});

if (jugadorActual && jugadorActual.whatsapp) {
    await actualizarCampoPerfilJugador(jugadorActual.whatsapp, "partidosJugados", partidosNumero);
}
        
        await refrescarAdminJugadores();

        alert("Partidos actualizados correctamente.");

    } catch (error) {
        console.error("Error cambiando partidos:", error);
        alert("Error al cambiar partidos. Revisa la consola.");
    }
}


async function actualizarCampoPerfilJugador(whatsapp, campo, valor) {
    const config = window.firebaseConfig;

    if (!config || !whatsapp || !campo) {
        return;
    }

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/jugadoresPerfil/"
        + whatsapp
        + "?key="
        + config.apiKey
        + "&updateMask.fieldPaths="
        + campo;

    const datos = {
        fields: {}
    };

    if (campo === "nivel" || campo === "puntos" || campo === "partidosJugados" || campo === "goles") {
    datos.fields[campo] = {
        integerValue: Number(valor)
    };
} else {
    datos.fields[campo] = {
        stringValue: String(valor)
    };
}

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            console.warn("No se pudo actualizar el perfil permanente del jugador:", campo);
        }

    } catch (error) {
        console.error("Error actualizando perfil permanente:", error);
    }
}


async function cambiarGolesJugadorAdmin(firebaseId, golesActuales) {
    if (!firebaseId) {
        alert("No se encontró el jugador.");
        return;
    }

    const nuevosGoles = prompt("Nuevo total de goles del jugador:", golesActuales || 0);

    if (nuevosGoles === null) {
        return;
    }

    const golesNumero = Number(nuevosGoles);

    if (isNaN(golesNumero) || golesNumero < 0) {
        alert("Ingresa una cantidad válida de goles.");
        return;
    }

    const config = window.firebaseConfig;

    const url = "https://firestore.googleapis.com/v1/projects/"
        + config.projectId
        + "/databases/(default)/documents/inscritos/"
        + firebaseId
        + "?key="
        + config.apiKey
        + "&updateMask.fieldPaths=goles";

    const datos = {
        fields: {
            goles: {
                integerValue: golesNumero
            }
        }
    };

    try {
        const respuesta = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo cambiar los goles.");
        }

        const jugadorActual = jugadores.find(function(jugador) {
            return jugador.firebaseId === firebaseId;
        });

        if (jugadorActual && jugadorActual.whatsapp) {
            await actualizarCampoPerfilJugador(jugadorActual.whatsapp, "goles", golesNumero);
        }

        await refrescarAdminJugadores();

        alert("Goles actualizados correctamente.");

    } catch (error) {
        console.error("Error cambiando goles:", error);
        alert("Error al cambiar goles. Revisa la consola.");
    }
}