// simulador.js

document.addEventListener("DOMContentLoaded", () => {
  // Elementos DOM
  const form = document.getElementById("simForm");
  const animacion = document.getElementById("animacion");
  const btnIniciar = document.getElementById("btnIniciar");
  const btnPausar = document.getElementById("btnPausar");
  const btnReiniciar = document.getElementById("btnReiniciar");

  const spanFilaActual = document.getElementById("filaActual");
  const spanAtendidos = document.getElementById("atendidos");
  const spanEsperaProm = document.getElementById("esperaProm");
  const spanUtilizacion = document.getElementById("utilizacion");

  const spanTotalClientes = document.getElementById("totalClientes");
  const spanPromClientes = document.getElementById("promClientes");
  const spanPromEspera = document.getElementById("promEspera");
  const spanUsoCajero = document.getElementById("usoCajero");

  // Referencia al mensaje de cuello de botella existente en HTML
  const cuelloBotellaMsg = document.getElementById("cuelloBotellaMsg");

  let llegadaRate, servicioTime, numCajeros, tiempoTotal;
  let tiempoSim = 0;
  let timerId = null;
  let simulacionActiva = false;

  // Variables de simulación
  let cola = [];
  let servidores = [];
  let eventosLlegada = [];
  let clientes = [];
  let clienteId = 1;

  let clientesAtendidos = 0;
  let totalEspera = 0;
  let utilizacionTotal = 0;

  // Inicializar cajeros
  function inicializarServidores() {
    servidores = [];
    for (let i = 0; i < numCajeros; i++) {
      servidores.push({ ocupado: false, finServicio: 0 });
    }
  }

  // Función para generar tiempo entre llegadas (Poisson)
  function generarTiempoLlegada(lambda) {
    return -Math.log(1 - Math.random()) / lambda;
  }

  // Función para generar tiempo de servicio (Exponencial)
  function generarTiempoServicio(media) {
    return -Math.log(1 - Math.random()) * media;
  }

  // Generar todos los eventos de llegada al inicio
  function prepararLlegadas() {
    eventosLlegada = [];
    let reloj = 0;
    while (reloj < tiempoTotal) {
      const tLlegada = generarTiempoLlegada(llegadaRate);
      reloj += tLlegada;
      if (reloj <= tiempoTotal) {
        eventosLlegada.push({ tiempo: Math.floor(reloj), id: clienteId++ });
      }
    }
  }

  // Iniciar simulación
  btnIniciar.addEventListener("click", () => {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    llegadaRate = parseFloat(document.getElementById("llegada").value);
    servicioTime = parseFloat(document.getElementById("servicio").value);
    numCajeros = parseInt(document.getElementById("cajeros").value);
    tiempoTotal = parseInt(document.getElementById("tiempo").value);

    tiempoSim = 0;
    clientesAtendidos = 0;
    totalEspera = 0;
    utilizacionTotal = 0;
    cola = [];
    clientes = [];
    clienteId = 1;

    inicializarServidores();
    prepararLlegadas();
    animacion.innerHTML = "";
    simulacionActiva = true;

    btnIniciar.disabled = true;
    btnPausar.disabled = false;
    btnReiniciar.disabled = false;

    cuelloBotellaMsg.classList.add("d-none");

    timerId = setInterval(simularPaso, 1000);
  });

  // Pausar o continuar
  btnPausar.addEventListener("click", () => {
    if (simulacionActiva) {
      clearInterval(timerId);
      simulacionActiva = false;
      btnPausar.textContent = "Continuar";
    } else {
      timerId = setInterval(simularPaso, 1000);
      simulacionActiva = true;
      btnPausar.textContent = "Pausar";
    }
  });

  // Reiniciar simulación
  btnReiniciar.addEventListener("click", () => {
    clearInterval(timerId);
    simulacionActiva = false;
    tiempoSim = 0;
    btnIniciar.disabled = false;
    btnPausar.disabled = true;
    btnReiniciar.disabled = true;
    btnPausar.textContent = "Pausar";
    spanFilaActual.textContent = "0";
    spanAtendidos.textContent = "0";
    spanEsperaProm.textContent = "0 min";
    spanUtilizacion.textContent = "0%";
    spanTotalClientes.textContent = "--";
    spanPromClientes.textContent = "--";
    spanPromEspera.textContent = "--";
    spanUsoCajero.textContent = "--";
    cuelloBotellaMsg.classList.add("d-none");
  });

  // Simular paso por paso
  function simularPaso() {
    // Llegadas
    eventosLlegada = eventosLlegada.filter(ev => {
      if (ev.tiempo === tiempoSim) {
        cola.push({ id: ev.id, tiempoLlegada: tiempoSim });
        return false;
      }
      return true;
    });

    // Servidores
    servidores.forEach((srv, i) => {
      if (srv.ocupado && srv.finServicio === tiempoSim) {
        srv.ocupado = false;
        clientesAtendidos++;
      }

      if (!srv.ocupado && cola.length > 0) {
        const cliente = cola.shift();
        const duracion = Math.ceil(generarTiempoServicio(servicioTime));
        const espera = tiempoSim - cliente.tiempoLlegada;
        totalEspera += espera;
        srv.ocupado = true;
        srv.finServicio = tiempoSim + duracion;
        utilizacionTotal += duracion;
      }
    });

    // Estadísticas tiempo real
    const utilizacionActual = (utilizacionTotal / (numCajeros * (tiempoSim + 1))) * 100;
    spanFilaActual.textContent = cola.length;
    spanAtendidos.textContent = clientesAtendidos;
    spanEsperaProm.textContent = clientesAtendidos ? (totalEspera / clientesAtendidos).toFixed(2) + " min" : "0 min";
    spanUtilizacion.textContent = utilizacionActual.toFixed(1) + "%";

    // Mostrar alerta si la utilización es muy alta
    if (utilizacionActual >= 85) {
      cuelloBotellaMsg.classList.remove("d-none");
    } else {
      cuelloBotellaMsg.classList.add("d-none");
    }

    tiempoSim++;
    if (tiempoSim >= tiempoTotal) {
      finalizarSimulacion();
    }
  }

  function finalizarSimulacion() {
    clearInterval(timerId);
    simulacionActiva = false;

    spanTotalClientes.textContent = clientesAtendidos + cola.length;
    spanPromClientes.textContent = (clientesAtendidos / tiempoTotal).toFixed(2);
    spanPromEspera.textContent = clientesAtendidos ? (totalEspera / clientesAtendidos).toFixed(2) + " min" : "0 min";
    spanUsoCajero.textContent = ((utilizacionTotal / (numCajeros * tiempoTotal)) * 100).toFixed(1) + "%";

    btnIniciar.disabled = false;
    btnPausar.disabled = true;
    btnReiniciar.disabled = false;
    btnPausar.textContent = "Pausar";
  }
});
