// simulador.js
document.addEventListener("DOMContentLoaded", () => {
  // Elementos DOM principales
  const form = document.getElementById("simForm");
  const btnIniciar = document.getElementById("btnIniciar");
  const btnPausar = document.getElementById("btnPausar");
  const btnReiniciar = document.getElementById("btnReiniciar");

  // Estadísticas en tiempo real
  const spanFilaActual = document.getElementById("filaActual");
  const spanAtendidos = document.getElementById("atendidos");
  const spanEsperaProm = document.getElementById("esperaProm");
  const spanUtilizacion = document.getElementById("utilizacion");

  // Estadísticas finales
  const spanTotalClientes = document.getElementById("totalClientes");
  const spanPromClientes = document.getElementById("promClientes");
  const spanPromEspera = document.getElementById("promEspera");
  const spanUsoCajero = document.getElementById("usoCajero");

  // Mensaje cuello de botella
  const cuelloBotellaMsg = document.getElementById("cuelloBotellaMsg");

  // Elementos para animación
  const zonaCajeros = document.getElementById("zonaCajeros");
  const zonaFila = document.getElementById("zonaFila");

  // Variables de configuración
  let llegadaRate, servicioTime, numCajeros, tiempoTotal;
  let tiempoSim = 0;
  let timerId = null;
  let simulacionActiva = false;

  // Variables internas de simulación
  let cola = [];
  let servidores = [];
  let eventosLlegada = [];
  let clienteId = 1;

  let clientesAtendidos = 0;
  let totalEspera = 0;
  let utilizacionTotal = 0;

  // Inicializa la lista de servidores (cajeros)
  function inicializarServidores() {
    servidores = [];
    for (let i = 0; i < numCajeros; i++) {
      servidores.push({ ocupado: false, finServicio: 0 });
    }
  }

  // Tiempo de llegada aleatorio (distribución exponencial)
  function generarTiempoLlegada(lambda) {
    return -Math.log(1 - Math.random()) / lambda;
  }

  // Tiempo de servicio aleatorio (distribución exponencial)
  function generarTiempoServicio(media) {
    return -Math.log(1 - Math.random()) * media;
  }

  // Prepara la lista de llegadas de clientes
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

  // Dibuja la animación de cajeros y fila
  function renderAnimacion() {
    if (!zonaCajeros || !zonaFila) return; // Evita error si no existen en el DOM

    // Render cajeros
    zonaCajeros.innerHTML = "";
    servidores.forEach((srv, index) => {
      const cajeroDiv = document.createElement("div");
      cajeroDiv.className = "cajero" + (srv.ocupado ? " ocupado" : "");
      cajeroDiv.textContent = `C${index + 1}`;

      if (srv.ocupado && srv.clienteId !== undefined) {
        const clienteDiv = document.createElement("div");
        clienteDiv.className = "cliente";
        clienteDiv.textContent = srv.clienteId;
        cajeroDiv.appendChild(clienteDiv);
      }
      zonaCajeros.appendChild(cajeroDiv);
    });

    // Render fila de espera
    zonaFila.innerHTML = "";
    cola.forEach(c => {
      const clienteDiv = document.createElement("div");
      clienteDiv.className = "cliente";
      clienteDiv.textContent = c.id;
      zonaFila.appendChild(clienteDiv);
    });
  }

  // Evento iniciar simulación
  btnIniciar.addEventListener("click", () => {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Valores desde formulario
    llegadaRate = parseFloat(document.getElementById("llegada").value);
    servicioTime = parseFloat(document.getElementById("servicio").value);
    numCajeros = parseInt(document.getElementById("cajeros").value);
    tiempoTotal = parseInt(document.getElementById("tiempo").value);

    // Reset variables
    tiempoSim = 0;
    clientesAtendidos = 0;
    totalEspera = 0;
    utilizacionTotal = 0;
    cola = [];
    clienteId = 1;

    inicializarServidores();
    prepararLlegadas();
    simulacionActiva = true;

    btnIniciar.disabled = true;
    btnPausar.disabled = false;
    btnReiniciar.disabled = false;
    cuelloBotellaMsg.classList.add("d-none");

    renderAnimacion();
    timerId = setInterval(simularPaso, 1000);
  });

  // Evento pausar/continuar
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

  // Evento reiniciar
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
    renderAnimacion();
  });

  // Lógica de cada paso de simulación
  function simularPaso() {
    // Procesar llegadas
    eventosLlegada = eventosLlegada.filter(ev => {
      if (ev.tiempo === tiempoSim) {
        cola.push({ id: ev.id, tiempoLlegada: tiempoSim });
        return false;
      }
      return true;
    });

    // Procesar servidores
    servidores.forEach((srv) => {
      if (srv.ocupado && srv.finServicio === tiempoSim) {
        srv.ocupado = false;
        delete srv.clienteId;
        clientesAtendidos++;
      }

      if (!srv.ocupado && cola.length > 0) {
        const cliente = cola.shift();
        const duracion = Math.ceil(generarTiempoServicio(servicioTime));
        const espera = tiempoSim - cliente.tiempoLlegada;
        totalEspera += espera;
        srv.ocupado = true;
        srv.clienteId = cliente.id;
        srv.finServicio = tiempoSim + duracion;
        utilizacionTotal += duracion;
      }
    });

    // Estadísticas en tiempo real
    const utilizacionActual = (utilizacionTotal / (numCajeros * (tiempoSim + 1))) * 100;
    spanFilaActual.textContent = cola.length;
    spanAtendidos.textContent = clientesAtendidos;
    spanEsperaProm.textContent = clientesAtendidos ? (totalEspera / clientesAtendidos).toFixed(2) + " min" : "0 min";
    spanUtilizacion.textContent = utilizacionActual.toFixed(1) + "%";

    // Mostrar mensaje de cuello de botella si aplica
    if (utilizacionActual >= 85) {
      cuelloBotellaMsg.classList.remove("d-none");
    } else {
      cuelloBotellaMsg.classList.add("d-none");
    }

    // Render animación visual
    renderAnimacion();

    // Avanzar tiempo
    tiempoSim++;
    if (tiempoSim >= tiempoTotal) {
      finalizarSimulacion();
    }
  }

  // Fin de simulación
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
