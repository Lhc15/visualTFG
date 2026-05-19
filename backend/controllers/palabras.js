const mongoose = require('mongoose');
require('../models/gltfFiles'); // Registrar el modelo
const Palabra = require('../models/palabras');
const GltfFile = require('../models/gltfFiles'); // Importar el esquema vacío

// La función 'obtenerPalabras' recupera todas las palabras de la base de datos.
// 1. Utiliza el modelo 'Palabra' para realizar la búsqueda completa.
// 2. Incluye los datos de la categoría asociada (solo el campo 'nombre') mediante 'populate'.
// 3. Incluye la información de las animaciones (solo 'filename') mediante un segundo 'populate'.
// 4. Devuelve la lista resultante en la respuesta.
const obtenerPalabras = async (req, res) => {
    try {
        const palabras = await Palabra
            .find()
            .populate('categoria', 'nombre'); 
            console.log('Palabras desde el backend:', JSON.stringify(palabras, null, 2));
        res.json(palabras);
    } catch (error) {
        console.error('Error al obtener las palabras:', error);
        res.status(500).json({ msg: 'Error al obtener las palabras' });
    }
};

// La función 'obtenerPalabra' busca y devuelve una palabra específica por su ID.
// 1. Extrae el 'id' desde los parámetros de la ruta.
// 2. Usa 'findById' para obtener la palabra correspondiente en la base de datos.
// 3. Devuelve un error 404 si no se encuentra la palabra, o la palabra en formato JSON en caso contrario.
const obtenerPalabra = async (req, res) => {
    const { id } = req.params;
    const palabra = await Palabra.findById(id);
    if (!palabra) {
        return res.status(404).json({ msg: 'Palabra no encontrada' });
    }
    res.json(palabra);
};

// La función 'crearPalabra' crea una nueva palabra en la base de datos.
// 1. Crea una instancia del modelo 'Palabra' con los datos del cuerpo (req.body).
// 2. Guarda la nueva palabra.
// 3. Utiliza 'populate' para obtener el nombre de la categoría asociada.
// 4. Devuelve un estado 201 junto con la nueva palabra creada.
const crearPalabra = async (req, res) => {
  try {
    const { palabra, explicacion, categoria, gltf, clipName, nivel, orden, tiposLexicos, enMotor } = req.body;

    const nueva = new Palabra({ palabra, explicacion, categoria, gltf, clipName, nivel, orden, tiposLexicos, enMotor });
    await nueva.save();
    await nueva.populate('categoria', 'nombre');

    return res.status(201).json({ ok: true, palabra: nueva });
  } catch (error) {
    console.error('Error al crear palabra:', error);
    return res.status(500).json({ ok: false, msg: 'Error al crear la palabra', error: error.message });
  }
};



// La función 'editarPalabra' actualiza los datos de una palabra específica.
// 1. Extrae el 'id' y los campos que se quieren actualizar del cuerpo de la petición.
// 2. Utiliza 'findByIdAndUpdate' para modificar los campos que existan en el cuerpo (palabra, categoría, animaciones, etc.).
// 3. Emplea la opción '{ new: true }' para devolver el documento actualizado.
// 4. Hace un 'populate' en el campo 'categoria' para extraer solo el 'nombre' de la categoría asociada.
// 5. Si no encuentra la palabra, devuelve un error 404; en caso contrario, devuelve la palabra actualizada.
const editarPalabra = async (req, res) => {
  const { id } = req.params;
  console.log('[editarPalabra] id:', id);
  console.log('[editarPalabra] req.body:', req.body);
  console.log('Recibiendo petición para actualizar palabra:', id);
  console.log('Datos recibidos:', req.body);
  const { palabra, explicacion, descripcion, usarDescripcion, categoria, gltf, clipName, nivel, orden, tiposLexicos, enMotor } = req.body;

  const update = {};
  if (palabra          !== undefined) update.palabra          = palabra;
  if (explicacion      !== undefined) update.explicacion      = explicacion;
  if (descripcion      !== undefined) update.descripcion      = descripcion;
  if (usarDescripcion  !== undefined) update.usarDescripcion  = usarDescripcion;
  if (categoria        !== undefined) update.categoria        = categoria || null;
  if (gltf             !== undefined) update.gltf             = gltf;
  if (clipName         !== undefined) update.clipName         = clipName;
  if (nivel            !== undefined) update.nivel            = nivel;
  if (orden            !== undefined) update.orden            = orden;
  if (tiposLexicos     !== undefined) update.tiposLexicos     = tiposLexicos;
  if (enMotor          !== undefined) update.enMotor          = enMotor;

  // (Opcional) si no hay nada que actualizar, cortas:
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ ok: false, msg: 'Nada que actualizar' });
  }

  try {
    const palabraEditada = await Palabra.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    if (!palabraEditada) {
      return res.status(404).json({ msg: 'Palabra no encontrada' });
    }

    res.json({ ok: true, palabra: palabraEditada });
  } catch (err) {
    console.error('Error al actualizar la palabra:', err);
    console.error('err.errors:', err.errors);
    console.error('err.message:', err.message);
    // Si es validación, puedes devolver 400; si no, 500
    //return res.status(400).json({ ok: false, errores: err.errors || err });
    return res
      .status(500)
      .json({ ok: false, msg: err.message, stack: err.stack, errores: err.errors });
  }
};

// La función 'borrarPalabra' elimina una palabra de la base de datos por su ID.
// 1. Usa 'findByIdAndDelete' para eliminar el documento correspondiente.
// 2. Si no lo encuentra, devuelve un error 404; de lo contrario, confirma la eliminación.
const borrarPalabra = async (req, res) => {
    const { id } = req.params;
    const palabraEliminada = await Palabra.findByIdAndDelete(id);
    if (!palabraEliminada) {
        return res.status(404).json({ msg: 'Palabra no encontrada' });
    }
    res.json({ msg: 'Palabra eliminada' });
};

// La función 'asociarCategoria' vincula una palabra específica con una categoría.
// 1. Extrae el 'id' de la palabra y el 'categoria' desde el cuerpo de la petición.
// 2. Usa 'findByIdAndUpdate' para asignar la categoría a la palabra.
// 3. Si no encuentra la palabra, devuelve un error 404; de lo contrario, retorna la palabra actualizada.
const asociarCategoria = async (req, res) => {
    const { id } = req.params;
    const { categoria } = req.body;
    const palabraActualizada = await Palabra.findByIdAndUpdate(
        id,
        { categoria },
        { new: true }
    );
    if (!palabraActualizada) {
        return res.status(404).json({ msg: 'Palabra no encontrada' });
    }
    res.json(palabraActualizada);
};

// La función 'obtenerPalabrasPorCategoria' devuelve una lista de palabras
// que pertenecen a una categoría específica.
// 1. Recibe el identificador de la categoría en la query string (req.query.categoria).
// 2. Utiliza 'Palabra.find' para buscar las palabras que coincidan con la categoría.
// 3. Hace 'populate' para mostrar el nombre de la categoría y el 'filename' de las animaciones.
// 4. Devuelve el resultado en JSON o un error 500 en caso de fallar.
const obtenerPalabrasPorCategoria = async (req, res) => {
    const { categoria } = req.query;

    try {
        if (!categoria) {
            return res.status(400).json({
                ok: false,
                msg: 'El parámetro "categoria" es obligatorio',
            });
        }

        const palabras = await Palabra.find({ categoria })
            .populate('categoria', 'nombre')
           

        console.log('Palabras encontradas con animaciones completas:', JSON.stringify(palabras, null, 2));
        res.json(palabras);
    } catch (error) {
        console.error('Error al obtener palabras por categoría:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener las palabras por categoría',
        });
    }
};

// La función 'obtenerPalabrasPorNivel' filtra las palabras según un nivel específico.
// 1. Toma el parámetro 'nivel' de la query string y lo convierte a número.
// 2. Si no se encuentra el nivel, responde con un error 400.
// 3. Busca en la base de datos todas las palabras con ese nivel y las ordena por 'orden' ascendente.
// 4. Aplica 'populate' para recuperar la categoría y los filenames de las animaciones.
// 5. Retorna la lista de palabras o un error en caso de fallo.
const obtenerPalabrasPorNivel = async (req, res) => {
    try {
      const { nivel } = req.query;
      const nivelNum = parseInt(nivel, 10);
  
      if (!nivelNum) {
        return res.status(400).json({ msg: 'Falta el parámetro nivel' });
      }
  
      const palabras = await Palabra.find({ nivel: nivelNum })
        .sort({ orden: 1 })
        .populate('categoria', 'nombre')
        

      res.json(palabras);
    } catch (error) {
      console.error('Error al obtener palabras por nivel:', error);
      res.status(500).json({ msg: 'Error al obtener palabras' });
    }
};

const editarAnimacion = async (req, res) => {
  const { id } = req.params;
  const { gltf, clipName } = req.body;

  // Montas sólo los campos que vengan
  const update = {};
  if (gltf      !== undefined) update.gltf      = gltf;
  if (clipName !== undefined) update.clipName = clipName;

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ ok: false, msg: 'Nada que actualizar' });
  }

  try {
    const palabra = await Palabra.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );
    if (!palabra) {
      return res.status(404).json({ ok: false, msg: 'Palabra no encontrada' });
    }
    res.json({ ok: true, palabra });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'Error al actualizar animación', error: err.message });
  }
};

// GET /api/palabras/por-modulo?modulo=abecedario
// Devuelve todas las palabras cuya categoría tenga el módulo indicado
const obtenerPalabrasPorModulo = async (req, res) => {
  const { modulo } = req.query;
  try {
    if (!modulo) {
      return res.status(400).json({ ok: false, msg: 'El parámetro "modulo" es obligatorio' });
    }
    const Categoria = require('../models/categorias');
    const cats = await Categoria.find({ modulo });
    const catIds = cats.map(c => c._id);
    const palabras = await Palabra.find({ categoria: { $in: catIds } })
      .populate('categoria', 'nombre modulo')
      .sort({ orden: 1 });
    res.json({ ok: true, palabras });
  } catch (err) {
    console.error('obtenerPalabrasPorModulo:', err);
    res.status(500).json({ ok: false, msg: 'Error al obtener palabras por módulo' });
  }
};

module.exports = {
    obtenerPalabras,
    obtenerPalabra,
    crearPalabra,
    editarPalabra,
    borrarPalabra,
    asociarCategoria,
    obtenerPalabrasPorCategoria,
    obtenerPalabrasPorNivel,
    obtenerPalabrasPorModulo,
    editarAnimacion
};