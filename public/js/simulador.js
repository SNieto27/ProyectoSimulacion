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

  // Variables para gráficos
  let chartFila, chartUtilizacion, chartAtendidos, chartEspera;
  let datosGraficos = {
    tiempos: [],
    fila: [],
    utilizacion: [],
    atendidos: [],
    espera: []
  };

  // Inicializar gráficos
  function inicializarGraficos() {
    // Configuración común para todos los gráficos
    const configComun = {
      type: 'line',
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Tiempo (minutos)'
            }
          },
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        animation: {
          duration: 0 // Sin animación para mejor rendimiento
        }
      }
    };

    // Gráfico de clientes en fila
    const ctxFila = document.getElementById('chartFila').getContext('2d');
    chartFila = new Chart(ctxFila, {
      ...configComun,
      data: {
        labels: [],
        datasets: [{
          label: 'Clientes en Fila',
          data: [],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        ...configComun.options,
        scales: {
          ...configComun.options.scales,
          y: {
            ...configComun.options.scales.y,
            title: {
              display: true,
              text: 'Número de Clientes'
            }
          }
        },
        plugins: {
          ...configComun.options.plugins,
          title: {
            display: true,
            text: 'Clientes en Fila vs Tiempo'
          }
        }
      }
    });

    // Gráfico de utilización
    const ctxUtilizacion = document.getElementById('chartUtilizacion').getContext('2d');
    chartUtilizacion = new Chart(ctxUtilizacion, {
      ...configComun,
      data: {
        labels: [],
        datasets: [{
          label: 'Utilización del Sistema (%)',
          data: [],
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        ...configComun.options,
        scales: {
          ...configComun.options.scales,
          y: {
            ...configComun.options.scales.y,
            max: 100,
            title: {
              display: true,
              text: 'Utilización (%)'
            }
          }
        },
        plugins: {
          ...configComun.options.plugins,
          title: {
            display: true,
            text: 'Utilización del Sistema vs Tiempo'
          }
        }
      }
    });

    // Gráfico de clientes atendidos (acumulativo)
    const ctxAtendidos = document.getElementById('chartAtendidos').getContext('2d');
    chartAtendidos = new Chart(ctxAtendidos, {
      ...configComun,
      data: {
        labels: [],
        datasets: [{
          label: 'Clientes Atendidos (Acumulativo)',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        ...configComun.options,
        scales: {
          ...configComun.options.scales,
          y: {
            ...configComun.options.scales.y,
            title: {
              display: true,
              text: 'Número de Clientes'
            }
          }
        },
        plugins: {
          ...configComun.options.plugins,
          title: {
            display: true,
            text: 'Clientes Atendidos (Acumulativo) vs Tiempo'
          }
        }
      }
    });

    // Gráfico de tiempo promedio de espera
    const ctxEspera = document.getElementById('chartEspera').getContext('2d');
    chartEspera = new Chart(ctxEspera, {
      ...configComun,
      data: {
        labels: [],
        datasets: [{
          label: 'Tiempo Promedio de Espera (min)',
          data: [],
          borderColor: 'rgb(255, 205, 86)',
          backgroundColor: 'rgba(255, 205, 86, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        ...configComun.options,
        scales: {
          ...configComun.options.scales,
          y: {
            ...configComun.options.scales.y,
            title: {
              display: true,
              text: 'Tiempo (minutos)'
            }
          }
        },
        plugins: {
          ...configComun.options.plugins,
          title: {
            display: true,
            text: 'Tiempo Promedio de Espera vs Tiempo'
          }
        }
      }
    });
  }

  // Actualizar gráficos
  function actualizarGraficos() {
    const utilizacionActual = (utilizacionTotal / (numCajeros * (tiempoSim + 1))) * 100;
    const esperaPromedio = clientesAtendidos ? (totalEspera / clientesAtendidos) : 0;

    // Agregar nuevos datos
    datosGraficos.tiempos.push(tiempoSim);
    datosGraficos.fila.push(cola.length);
    datosGraficos.utilizacion.push(utilizacionActual);
    datosGraficos.atendidos.push(clientesAtendidos);
    datosGraficos.espera.push(esperaPromedio);

    // Limitar el número de puntos mostrados (últimos 50 para mejor rendimiento)
    const maxPuntos = 50;
    if (datosGraficos.tiempos.length > maxPuntos) {
      datosGraficos.tiempos = datosGraficos.tiempos.slice(-maxPuntos);
      datosGraficos.fila = datosGraficos.fila.slice(-maxPuntos);
      datosGraficos.utilizacion = datosGraficos.utilizacion.slice(-maxPuntos);
      datosGraficos.atendidos = datosGraficos.atendidos.slice(-maxPuntos);
      datosGraficos.espera = datosGraficos.espera.slice(-maxPuntos);
    }

    // Actualizar gráficos
    chartFila.data.labels = [...datosGraficos.tiempos];
    chartFila.data.datasets[0].data = [...datosGraficos.fila];
    chartFila.update('none');

    chartUtilizacion.data.labels = [...datosGraficos.tiempos];
    chartUtilizacion.data.datasets[0].data = [...datosGraficos.utilizacion];
    chartUtilizacion.update('none');

    chartAtendidos.data.labels = [...datosGraficos.tiempos];
    chartAtendidos.data.datasets[0].data = [...datosGraficos.atendidos];
    chartAtendidos.update('none');

    chartEspera.data.labels = [...datosGraficos.tiempos];
    chartEspera.data.datasets[0].data = [...datosGraficos.espera];
    chartEspera.update('none');
  }

  // Limpiar gráficos
  function limpiarGraficos() {
    datosGraficos = {
      tiempos: [],
      fila: [],
      utilizacion: [],
      atendidos: [],
      espera: []
    };

    if (chartFila) {
      chartFila.data.labels = [];
      chartFila.data.datasets[0].data = [];
      chartFila.update();
    }

    if (chartUtilizacion) {
      chartUtilizacion.data.labels = [];
      chartUtilizacion.data.datasets[0].data = [];
      chartUtilizacion.update();
    }

    if (chartAtendidos) {
      chartAtendidos.data.labels = [];
      chartAtendidos.data.datasets[0].data = [];
      chartAtendidos.update();
    }

    if (chartEspera) {
      chartEspera.data.labels = [];
      chartEspera.data.datasets[0].data = [];
      chartEspera.update();
    }
  }

  // Inicializar cajeros
  function inicializarServidores() {
    servidores = [];
    for (let i = 0; i < numCajeros; i++) {
      servidores.push({ 
        ocupado: false, 
        finServicio: 0, 
        clienteActual: null 
      });
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

  // Crear la interfaz visual de la animación
  function crearInterfazAnimacion() {
    animacion.innerHTML = `
      <div class="simulacion-container">
        <div class="cajeros-section" id="cajerosContainer">
          <!-- Los cajeros se generarán dinámicamente -->
        </div>
        
        <div class="fila-section">
          <div class="fila-titulo">🚶‍♂️ Fila de Espera</div>
          <div class="fila-clientes" id="filaContainer">
            <!-- Los clientes en fila aparecerán aquí -->
          </div>
        </div>
        
        <div class="entrada-clientes">
          <span class="flecha-entrada">⬆️</span>
          <span class="ms-2">Entrada de clientes</span>
        </div>
        
        <div class="stats-mini">
          <div class="stat-item">
            <div class="stat-value" id="animFilaActual">0</div>
            <div>En fila</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="animAtendidos">0</div>
            <div>Atendidos</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="animTiempo">0</div>
            <div>Tiempo (min)</div>
          </div>
        </div>
      </div>
    `;
    
    // Crear cajeros visuales
    const cajerosContainer = document.getElementById("cajerosContainer");
    for (let i = 0; i < numCajeros; i++) {
      const cajeroDiv = document.createElement("div");
      cajeroDiv.className = "cajero libre";
      cajeroDiv.id = `cajero-${i}`;
      cajeroDiv.innerHTML = `
        <div class="cajero-icon">👨‍💼</div>
        <div class="cajero-status">Libre</div>
        <div class="cliente-atendido" id="cliente-cajero-${i}"></div>
      `;
      cajerosContainer.appendChild(cajeroDiv);
    }
  }

  // Actualizar la animación visual
  function actualizarAnimacion() {
    // Actualizar fila visual
    const filaContainer = document.getElementById("filaContainer");
    filaContainer.innerHTML = "";
    
    cola.forEach((cliente, index) => {
      const clienteDiv = document.createElement("div");
      clienteDiv.className = "cliente";
      clienteDiv.innerHTML = "🧍‍♂️";
      clienteDiv.title = `Cliente ${cliente.id} - Esperando ${tiempoSim - cliente.tiempoLlegada} min`;
      filaContainer.appendChild(clienteDiv);
    });

    // Actualizar cajeros visuales
    servidores.forEach((servidor, index) => {
      const cajeroDiv = document.getElementById(`cajero-${index}`);
      const clienteCajeroDiv = document.getElementById(`cliente-cajero-${index}`);
      
      if (servidor.ocupado) {
        cajeroDiv.className = "cajero ocupado";
        cajeroDiv.querySelector(".cajero-status").textContent = `Ocupado (${servidor.finServicio - tiempoSim} min)`;
        clienteCajeroDiv.innerHTML = "☕";
      } else {
        cajeroDiv.className = "cajero libre";
        cajeroDiv.querySelector(".cajero-status").textContent = "Libre";
        clienteCajeroDiv.innerHTML = "";
      }
    });

    // Actualizar stats mini
    document.getElementById("animFilaActual").textContent = cola.length;
    document.getElementById("animAtendidos").textContent = clientesAtendidos;
    document.getElementById("animTiempo").textContent = tiempoSim;
  }

  // Animar llegada de cliente
  function animarLlegadaCliente() {
    const filaContainer = document.getElementById("filaContainer");
    const nuevoCliente = document.createElement("div");
    nuevoCliente.className = "cliente";
    nuevoCliente.innerHTML = "🧍‍♂️";
    nuevoCliente.style.opacity = "0";
    nuevoCliente.style.transform = "translateY(-20px)";
    
    filaContainer.appendChild(nuevoCliente);
    
    // Animar entrada
    setTimeout(() => {
      nuevoCliente.style.opacity = "1";
      nuevoCliente.style.transform = "translateY(0)";
    }, 100);
  }

  // Animar cliente siendo atendido
  function animarClienteAtendido(cajeroIndex) {
    const clienteCajeroDiv = document.getElementById(`cliente-cajero-${cajeroIndex}`);
    clienteCajeroDiv.style.animation = "bounce 0.5s ease-in-out";
    
    setTimeout(() => {
      clienteCajeroDiv.style.animation = "";
    }, 500);
  }

  // Inicializar gráficos al cargar la página
  inicializarGraficos();

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
    crearInterfazAnimacion();
    limpiarGraficos();
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
    
    // Limpiar estadísticas
    spanFilaActual.textContent = "0";
    spanAtendidos.textContent = "0";
    spanEsperaProm.textContent = "0 min";
    spanUtilizacion.textContent = "0%";
    spanTotalClientes.textContent = "--";
    spanPromClientes.textContent = "--";
    spanPromEspera.textContent = "--";
    spanUsoCajero.textContent = "--";
    
    // Limpiar animación
    animacion.innerHTML = '<div class="text-muted">[La animación aparecerá cuando inicies la simulación]</div>';
    cuelloBotellaMsg.classList.add("d-none");
    
    // Limpiar gráficos
    limpiarGraficos();
  });

  // Simular paso por paso
  function simularPaso() {
    let nuevasLlegadas = 0;
    
    // Llegadas
    eventosLlegada = eventosLlegada.filter(ev => {
      if (ev.tiempo === tiempoSim) {
        cola.push({ id: ev.id, tiempoLlegada: tiempoSim });
        nuevasLlegadas++;
        return false;
      }
      return true;
    });

    // Servidores
    servidores.forEach((srv, i) => {
      if (srv.ocupado && srv.finServicio === tiempoSim) {
        srv.ocupado = false;
        srv.clienteActual = null;
        clientesAtendidos++;
      }

      if (!srv.ocupado && cola.length > 0) {
        const cliente = cola.shift();
        const duracion = Math.ceil(generarTiempoServicio(servicioTime));
        const espera = tiempoSim - cliente.tiempoLlegada;
        totalEspera += espera;
        srv.ocupado = true;
        srv.finServicio = tiempoSim + duracion;
        srv.clienteActual = cliente.id;
        utilizacionTotal += duracion;
        
        // Animar cliente siendo atendido
        setTimeout(() => animarClienteAtendido(i), 200);
      }
    });

    // Actualizar animación
    actualizarAnimacion();

    // Actualizar gráficos
    actualizarGraficos();

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

    // Mostrar mensaje de finalización en la animación
    const statsContainer = document.querySelector(".stats-mini");
    if (statsContainer) {
      const mensajeFinal = document.createElement("div");
      mensajeFinal.className = "alert alert-success mt-3";
      mensajeFinal.innerHTML = "🎉 ¡Simulación completada! Revisa los resultados finales abajo.";
      statsContainer.parentNode.appendChild(mensajeFinal);
    }
  }
});
