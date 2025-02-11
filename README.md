# graphicare_abp24
[ABPGC24] Proyecto de Contenidos del grupo GraphiCare de ABP 2024/25

## Descripción
Este proyecto forma parte del grupo **GraphiCare** del curso ABP 2024/25. Graphicare_ABP24 es una aplicación web destinada a facilitar la comunicación visual y el aprendizaje mediante herramientas interactivas y avanzadas, enfocada en la accesibilidad y el uso de tecnologías modernas como **Three.js**, **Angular**, y un backend en **Node.js**.

---

## Funcionalidades
- **Modo Libre**: Permite seleccionar palabras para que el avatar 3D realice su signo correspondiente.
- **Modo Guiado**: Ofrece niveles progresivos de aprendizaje con signos y palabras de dificultad variable.
- **Pictogramas Visuales**: Herramienta interactiva que utiliza tarjetas organizadas por categorías.
- **Acceso Multiusuario**: Sistema de login con roles diferenciados (usuarios y administradores).

---

## Tecnologías Utilizadas
### Frontend:
- **Angular**: Framework utilizado para la interfaz de usuario.
- **Three.js**: Biblioteca para gráficos en 3D.

### Backend:
- **Node.js**: Entorno de ejecución para el backend.
- **Express.js**: Framework para la creación de la API REST.

### Base de Datos:
- **MongoDB**: Base de datos relacional para el almacenamiento de datos de usuarios y configuraciones.

## Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/usuario/Graphicare_ABP24.git
cd Graphicare_ABP24
```

### 2. Configuración del backend
1. Instala las dependencias:
   ```bash
   cd backend
   npm install
   ```
2. Crea el archivo `.env` con las siguientes variables de ejemplo:
   ```env
   PORT=3000
   DBCONNECTION=mongodb://localhost:27017/miBaseDeDatos
   JWTSECRET=miClaveSecreta
   DOCSPERPAGE=20
   ```
3. Inicia el servidor:
   ```bash
   npm start
   ```

### 3. Configuración del frontend
1. Instala las dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Inicia el servidor:
   ```bash
   ng serve
   ```

---

## Estructura del Proyecto
```plaintext
Graphicare_ABP24/
├── backend/        # API REST y conexión con la base de datos
├── frontend/       # Aplicación Angular
├── database/       # Scripts para la creación de la base de datos
├── documents/      # Documentación del proyecto
└── README.md       # Archivo de documentación principal
```

---

## Contribuidores
- **Ángel Manuel Ruiz Freeman**.
- **Lorena Heras Caballero**.
- **Yousra El Jaafari El Idrissi**.
- **Sebastián Ayala García**.
- **Adrián Guerras Algarra**.

- Equipo GraphiCare ABP 2024/25.

