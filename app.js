const mi_servidor = "http://localhost:3000";
async function llamarAPI(ruta, metodo = 'GET', datos = null) {
    const opciones = {
        method: metodo,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const token = localStorage.getItem('token');
    if (token) {
        opciones.headers['Authorization'] = 'Bearer ' + token;
    }
    
    if (datos) {
        opciones.body = JSON.stringify(datos);
    }
    
    try {
        const respuesta = await fetch(mi_servidor + ruta, opciones);
        return respuesta;
    } catch (error) {
        console.error('Error en llamarAPI:', error);
        return null;
    }
}
// FUNCIÓN MOSTRAR MENSAJE
function mostrarMensaje(texto, tipo) {
    const contenedor = document.getElementById('login-mensaje');
    if (contenedor) {
        contenedor.textContent = texto;
        contenedor.className = 'mensaje mensaje-' + tipo;
        setTimeout(() => {
            contenedor.textContent = '';
            contenedor.className = 'mensaje';
        }, 3000);
    }
}
// FUNCIÓN MOSTRAR PRODUCTOS 
async function mostrarProductos() {
    console.log('🔍 Buscando elemento #lista...');
    
    // Buscar el elemento de diferentes formas
    const lista = document.querySelector('#lista');
    
    if (!lista) {
        console.log(' Elemento #lista NO encontrado en el DOM');
        console.log(' Elementos disponibles:', document.querySelectorAll('ul').length, 'elementos UL');
        
        // Reintentar cada segundo hasta 10 veces
        let intentos = 0;
        const intervalo = setInterval(() => {
            intentos++;
            console.log(` Intento ${intentos}: buscando #lista...`);
            
            const listaReintento = document.querySelector('#lista');
            if (listaReintento) {
                console.log(` Elemento encontrado en intento ${intentos}`);
                clearInterval(intervalo);
                cargarProductosEnLista(listaReintento);
            } else if (intentos >= 10) {
                console.log(' No se encontró #lista después de 10 intentos');
                clearInterval(intervalo);
                document.body.innerHTML += '<p style="color:red">Error: No se encontró la lista de productos</p>';
            }
        }, 1000);
        
        return;
    }
    
    console.log(' Elemento #lista encontrado inmediatamente');
    await cargarProductosEnLista(lista);
}

// Función separada para cargar productos
async function cargarProductosEnLista(lista) {
    if (!lista) return;
    
    lista.innerHTML = '<li class="text-center"> Cargando productos...</li>';
    
    try {
        const respuesta = await llamarAPI('/productos');
        
        if (!respuesta) {
            lista.innerHTML = '<li class="text-center text-danger"> Error al conectar con el servidor</li>';
            return;
        }
        
        if (!respuesta.ok) {
            lista.innerHTML = '<li class="text-center text-danger"> Error del servidor: ' + respuesta.status + '</li>';
            return;
        }
        
        const productos = await respuesta.json();
        console.log(' Productos recibidos:', productos);
        
        if (productos.length === 0) {
            lista.innerHTML = '<li class="text-center"> No hay productos disponibles</li>';
            return;
        }
        
        let html = '';
        for (let p of productos) {
            html += '<li style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #ddd;">';
            html += '<span><strong>' + p.nombre + '</strong> - $' + p.precio + '</span>';
            
            if (localStorage.getItem('token')) {
                html += '<button style="background:#ff4444; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;" onclick="eliminarProducto(\'' + p.id + '\')">Eliminar</button>';
            }
            
            html += '</li>';
        }
        
        lista.innerHTML = html;
        
    } catch (error) {
        console.error(' Error:', error);
        lista.innerHTML = '<li class="text-center text-danger"> Error al cargar productos</li>';
    }
}

// FUNCIÓN ELIMINAR PRODUCTO
async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    
    const respuesta = await llamarAPI('/productos/' + id, 'DELETE');
    
    if (respuesta && respuesta.ok) {
        mostrarMensaje('Producto eliminado', 'exito');
        mostrarProductos();
    } else {
        mostrarMensaje('Error al eliminar', 'error');
    }
}
// FUNCIÓN ACTUALIZAR NAVBAR
function actualizarNavbar() {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    
    const loginNav = document.getElementById('loginNavItem');
    const registerNav = document.getElementById('registerNavItem');
    const userNav = document.getElementById('userNavItem');
    const userEmailSpan = document.getElementById('userEmail');
    const userDisplay = document.getElementById('user-display');
    const loginSection = document.getElementById('login-section');
    const registroCallout = document.getElementById('registro-callout');
    const userEmailDisplay = document.getElementById('user-email');
    
    if (token && email) {
        if (loginNav) loginNav.style.display = 'none';
        if (registerNav) registerNav.style.display = 'none';
        if (userNav) {
            userNav.style.display = 'block';
            if (userEmailSpan) userEmailSpan.textContent = email;
        }
        if (userDisplay) {
            userDisplay.style.display = 'block';
            if (userEmailDisplay) userEmailDisplay.textContent = email;
        }
        if (loginSection) loginSection.style.display = 'none';
        if (registroCallout) registroCallout.style.display = 'none';
    } else {
        if (loginNav) loginNav.style.display = 'block';
        if (registerNav) registerNav.style.display = 'block';
        if (userNav) userNav.style.display = 'none';
        if (userDisplay) userDisplay.style.display = 'none';
        if (loginSection) loginSection.style.display = 'block';
        if (registroCallout) registroCallout.style.display = 'block';
    }
}
// FUNCIÓN MOSTRAR LOGIN
function mostrarLogin() {
    const loginSection = document.getElementById('login-section');
    if (loginSection) {
        loginSection.scrollIntoView({ behavior: 'smooth' });
    }
}
// FUNCIÓN CERRAR SESIÓN
function cerrarSesion() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        window.location.reload();
    }
}
// INICIALIZACIÓN - NUEVA VERSIÓN
window.addEventListener('load', function() {
    console.log(' Página completamente cargada (load event)');
    actualizarNavbar();
    
    // Esperar un momento extra para asegurar
    setTimeout(() => {
        console.log(' Iniciando carga de productos...');
        mostrarProductos();
    }, 500);
});

// También probar con DOMContentLoaded por si acaso
document.addEventListener('DOMContentLoaded', function() {
    console.log(' DOM cargado (DOMContentLoaded event)');
});

// Configurar login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            mostrarMensaje('Completa todos los campos', 'error');
            return;
        }
        
        const respuesta = await llamarAPI('/login', 'POST', { email, password });
        
        if (respuesta && respuesta.ok) {
            const datos = await respuesta.json();
            localStorage.setItem('token', datos.token);
            localStorage.setItem('userEmail', email);
            mostrarMensaje('¡Login exitoso!', 'exito');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            mostrarMensaje('Email o contraseña incorrectos', 'error');
        }
    });
}
window.mostrarProductos = mostrarProductos;
window.eliminarProducto = eliminarProducto;
window.cerrarSesion = cerrarSesion;
window.mostrarLogin = mostrarLogin;