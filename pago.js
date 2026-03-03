// ============================================
// CONFIGURACIÓN DE STRIPE
// ============================================
// IMPORTANTE: Reemplaza con tu publishable key de Stripe
// Obtén tu key en: https://dashboard.stripe.com/apikeys
const STRIPE_PUBLIC_KEY = 'pk_test_51T6eVyHsZBKrxc3GvQOLqAAU5I1j19gZ6s4aBSyrZ8Uv3ToXhnt7tpZG6vun8nkp3Rnyvk2hM7cYbXVwTCu7XtRY00zVx19m1Q'; // Usa pk_test_... para pruebas

// Inicializar Stripe
const stripe = Stripe(STRIPE_PUBLIC_KEY);
let stripeElements = null;
let stripeCardElement = null;

// CONFIGURACIÓN DE PRODUCTOS
const productos = [
    { id: 1, nombre: 'Almohada Viscoelástica', precio: 49.99 },
    { id: 2, nombre: 'Cobertor King', precio: 89.99 },
    { id: 3, nombre: 'Colchón King Size', precio: 599.99 },
    { id: 4, nombre: 'Juego de Sábanas', precio: 39.99 },
    { id: 5, nombre: 'Protector de Colchón', precio: 79.99 }
];

let productoSeleccionado = null;
// CARGAR PRODUCTOS EN EL GRID
function cargarProductos() {
    const grid = document.getElementById('productosGrid');
    
    productos.forEach(producto => {
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.innerHTML = `
            <div class="producto-nombre">${producto.nombre}</div>
            <div class="producto-precio">$${producto.precio}</div>
        `;
        card.onclick = () => seleccionarProducto(producto, card);
        grid.appendChild(card);
    });
}

// SELECCIONAR PRODUCTO
async function seleccionarProducto(producto, elemento) {
    // Quitar selección anterior
    document.querySelectorAll('.producto-card').forEach(c => {
        c.classList.remove('seleccionado');
    });
    
    // Marcar nuevo producto
    elemento.classList.add('seleccionado');
    productoSeleccionado = producto;
    
    // Mostrar formulario de pago
    document.getElementById('paymentForm').style.display = 'block';
    
    // Actualizar resumen
    document.getElementById('resumenProducto').textContent = producto.nombre;
    document.getElementById('resumenTotal').textContent = `$${producto.precio}`;
    
    // Inicializar Stripe Elements si no existe
    if (!stripeElements) {
        await inicializarStripeElements();
    }
    
    // Scroll al formulario
    document.getElementById('paymentForm').scrollIntoView({ behavior: 'smooth' });
}

// INICIALIZAR STRIPE ELEMENTS
function inicializarStripeElements() {
    return new Promise((resolve) => {
        // Crear instancia de Elements
        stripeElements = stripe.elements();
        
        // Crear elemento de tarjeta y montarlo
        stripeCardElement = stripeElements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
            },
            hidePostalCode: false, // Mostrar campo de código postal
        });
        
        // Montar el elemento en el DOM
        stripeCardElement.mount('#card-element');
        
        // Manejar errores de validación en tiempo real
        stripeCardElement.on('change', (event) => {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });
        
        resolve();
    });
}

// PROCESAR PAGO CON STRIPE
async function procesarPagoConStripe() {
    if (!productoSeleccionado) {
        alert('Selecciona un producto primero');
        return;
    }
    
    // Deshabilitar botón mientras se procesa
    const btnPagar = document.getElementById('btnPagar');
    btnPagar.disabled = true;
    btnPagar.textContent = 'Procesando...';
    
    try {
        // Paso 1: Crear PaymentIntent en tu backend
        // En un entorno real, esto sería una llamada a tu servidor
        // Aquí simulamos la respuesta para pruebas
        const paymentIntentData = await crearPaymentIntentEnBackend(productoSeleccionado);
        
        if (!paymentIntentData || !paymentIntentData.clientSecret) {
            throw new Error('No se pudo crear el PaymentIntent');
        }
        
        // Paso 2: Confirmar el pago con Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(
            paymentIntentData.clientSecret,
            {
                payment_method: {
                    card: stripeCardElement,
                    billing_details: {
                        name: 'Cliente Sleepking', // En producción, obtener del formulario
                    },
                }
            }
        );
        
        if (error) {
            // Mostrar error al usuario
            mostrarResultado({
                exito: false,
                titulo: '❌ Error en el pago',
                mensaje: error.message || 'Ocurrió un error al procesar el pago'
            });
        } else if (paymentIntent.status === 'succeeded') {
            // Pago exitoso
            mostrarResultado({
                exito: true,
                titulo: '✅ ¡Pago Exitoso!',
                mensaje: `Compra de ${productoSeleccionado.nombre} por $${productoSeleccionado.precio} procesada. ID: ${paymentIntent.id}`
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarResultado({
            exito: false,
            titulo: '❌ Error',
            mensaje: 'Ocurrió un error al procesar el pago'
        });
    } finally {
        btnPagar.disabled = false;
        btnPagar.textContent = 'Pagar Ahora';
    }
}
// SIMULADOR DE BACKEND (para pruebas)
async function crearPaymentIntentEnBackend(producto) {
    // EN PRODUCCIÓN: Esto debe ser una llamada a tu servidor
    // Ejemplo: const response = await fetch('/api/create-payment-intent', { ... })
    
    // Para pruebas, simulamos una respuesta exitosa
    console.log('📡 Creando PaymentIntent para:', producto);
    
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Devolver un client_secret simulado
    // En producción, esto vendría de Stripe API vía tu backend
    return {
        clientSecret: 'pi_mock_' + Date.now() + '_secret_mock',
        amount: producto.precio * 100, // Stripe usa centavos
    };
}
// MOSTRAR MODAL DE RESULTADO
function mostrarResultado(resultado) {
    const modal = document.getElementById('modalResultado');
    const icono = document.getElementById('modalIcon');
    const titulo = document.getElementById('modalTitulo');
    const mensaje = document.getElementById('modalMensaje');
    
    icono.innerHTML = resultado.exito ? '✅' : '❌';
    icono.className = `modal-icon ${resultado.exito ? 'exito' : 'error'}`;
    titulo.textContent = resultado.titulo;
    mensaje.textContent = resultado.mensaje;
    
    modal.style.display = 'block';
}

// CERRAR MODAL
function cerrarModal() {
    document.getElementById('modalResultado').style.display = 'none';
    
    // Si el pago fue exitoso, redirigir
    if (document.getElementById('modalTitulo').textContent.includes('Exitoso')) {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}
// INICIALIZAR
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
});

// Hacer funciones globales para los onclick
window.seleccionarProducto = seleccionarProducto;
window.procesarPagoConStripe = procesarPagoConStripe;

window.cerrarModal = cerrarModal;
