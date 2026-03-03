require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 
// CONEXIÓN A MYSQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'base_usuarios'
});

db.connect(err => {
    if (err) {
        console.error(' Error conectando a MySQL:', err);
        return;
    }
    console.log(' Conectado a MySQL - Base de datos: base_usuarios');
    
    // Crear tablas automáticamente
    crearTablas();
});

// FUNCIÓN PARA CREAR TABLAS
function crearTablas() {
    // Tabla de usuarios (SIN fecha_registro)
    db.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error(' Error creando tabla usuarios:', err);
        } else {
            console.log(' Tabla usuarios verificada');
        }
    });
    
    // Tabla de productos
    db.query(`
        CREATE TABLE IF NOT EXISTS productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(255) NOT NULL,
            precio DECIMAL(10,2) NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error(' Error creando tabla productos:', err);
        } else {
            console.log(' Tabla productos verificada');
            
            // Insertar productos de ejemplo si la tabla está vacía
            db.query('SELECT COUNT(*) AS count FROM productos', (err, result) => {
                if (err) return;
                
                if (result[0].count === 0) {
                    const productos = [
                        ['Colchón King Size', 599.99],
                        ['Almohada Viscoelástica', 49.99],
                        ['Cobertor King', 89.99],
                        ['Colchón Individual', 299.99],
                        ['Juego de Sábanas', 39.99]
                    ];
                    
                    productos.forEach(p => {
                        db.query('INSERT INTO productos (nombre, precio) VALUES (?, ?)', p);
                    });
                    
                    console.log(' Productos de ejemplo insertados');
                }
            });
        }
    });
}
// RUTAS DE PRUEBA

// Ruta principal - redirige a index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Ruta de prueba del servidor
app.get('/test', (req, res) => {
    res.json({ 
        mensaje: ' Servidor funcionando correctamente',
        base_datos: 'base_usuarios',
        timestamp: new Date()
    });
});

// Ruta de prueba de base de datos
app.get('/db-test', (req, res) => {
    db.query('SELECT 1 + 1 AS resultado', (err, results) => {
        if (err) {
            res.status(500).json({ 
                error: 'Error en base de datos',
                detalle: err.message 
            });
        } else {
            res.json({ 
                mensaje: ' Base de datos conectada',
                resultado: results[0].resultado 
            });
        }
    });
});
// RUTAS DE PRODUCTOS

// Obtener todos los productos
app.get('/productos', (req, res) => {
    console.log('📡 Consultando productos...');
    
    db.query('SELECT * FROM productos', (err, results) => {
        if (err) {
            console.error(' Error en productos:', err.message);
            res.status(500).json({ 
                error: 'Error al obtener productos',
                detalle: err.message
            });
        } else {
            console.log(` ${results.length} productos enviados`);
            res.json(results);
        }
    });
});

// Agregar producto (requiere token)
app.post('/productos', verificarToken, (req, res) => {
    const { nombre, precio } = req.body;
    
    if (!nombre || !precio) {
        return res.status(400).json({ error: 'Nombre y precio requeridos' });
    }
    
    db.query(
        'INSERT INTO productos (nombre, precio) VALUES (?, ?)',
        [nombre, precio],
        (err, result) => {
            if (err) {
                console.error(' Error al guardar:', err);
                res.status(500).json({ error: 'Error al guardar producto' });
            } else {
                res.status(201).json({ 
                    id: result.insertId,
                    nombre: nombre,
                    precio: precio,
                    mensaje: 'Producto guardado' 
                });
            }
        }
    );
});

// Eliminar producto (requiere token)
app.delete('/productos/:id', verificarToken, (req, res) => {
    db.query('DELETE FROM productos WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            console.error('❌ Error al eliminar:', err);
            res.status(500).json({ error: 'Error al eliminar' });
        } else {
            res.json({ mensaje: 'Producto eliminado' });
        }
    });
});
// RUTAS DE AUTENTICACIÓN 

// REGISTRO DE USUARIO
app.post('/register', async (req, res) => {
    console.log(' Registro intentado:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y password requeridos' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener 6+ caracteres' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.query(
            'INSERT INTO usuarios (email, password) VALUES (?, ?)',
            [email, hashedPassword],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        res.status(409).json({ error: 'El email ya está registrado' });
                    } else {
                        console.error(' Error SQL:', err);
                        res.status(500).json({ error: 'Error en el servidor' });
                    }
                } else {
                    console.log(' Usuario registrado:', email);
                    res.status(201).json({ mensaje: 'Usuario creado' });
                }
            }
        );
    } catch (error) {
        console.error(' Error:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// LOGIN DE USUARIO
app.post('/login', (req, res) => {
    console.log(' Intento de login:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y password requeridos' });
    }
    
    db.query(
        'SELECT * FROM usuarios WHERE email = ?',
        [email],
        async (err, results) => {
            if (err) {
                console.error(' Error SQL:', err);
                return res.status(500).json({ error: 'Error en el servidor' });
            }
            
            if (results.length === 0) {
                console.log(' Usuario no encontrado:', email);
                return res.status(401).json({ error: 'Email o contraseña incorrectos' });
            }
            
            const usuario = results[0];
            console.log(' Usuario encontrado:', usuario.email);
            
            try {
                // Verificar contraseña
                const passwordValida = await bcrypt.compare(password, usuario.password);
                console.log(' Contraseña válida:', passwordValida);
                
                if (!passwordValida) {
                    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
                }
                
                // Crear token JWT
                const token = jwt.sign(
                    { id: usuario.id, email: usuario.email },
                    process.env.JWT_SECRET || 'secreto_super_seguro',
                    { expiresIn: '24h' }
                );
                
                console.log(' Login exitoso para:', usuario.email);
                res.json({ 
                    token: token,
                    usuario: {
                        id: usuario.id,
                        email: usuario.email
                    }
                });
                
            } catch (error) {
                console.error(' Error al verificar contraseña:', error);
                res.status(500).json({ error: 'Error en el servidor' });
            }
        }
    );
});
// MIDDLEWARE PARA VERIFICAR TOKEN
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'secreto_super_seguro', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}
// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(` SERVIDOR CORRIENDO EN http://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log(` Sirviendo archivos desde: ${__dirname}`);
    console.log('\n RUTAS DISPONIBLES:');
    console.log(`   → http://localhost:${PORT}/`);
    console.log(`   → http://localhost:${PORT}/test`);
    console.log(`   → http://localhost:${PORT}/db-test`);
    console.log(`   → http://localhost:${PORT}/productos`);
    console.log(`   → http://localhost:${PORT}/index.html`);
    console.log(`   → http://localhost:${PORT}/registro.html`);
    console.log(`   → http://localhost:${PORT}/admin.html`);
    console.log('='.repeat(50) + '\n');
});