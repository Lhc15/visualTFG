const mongoose = require('mongoose');
require('../models/gltfFiles'); // Registrar el modelo
const Palabra = require('../models/palabras');
const GltfFile = require('../models/gltfFiles'); // Importar el esquema vacío

// Obtener todas las palabras
const obtenerPalabras = async (req, res) => {
    try {
        const palabras = await Palabra.find()
            .populate('categoria', 'nombre')
            .populate({
                path: 'animaciones',
                select: 'filename',
            });

        console.log('Palabras desde el backend:', JSON.stringify(palabras, null, 2));
        res.json(palabras);
    } catch (error) {
        console.error('Error al obtener las palabras:', error);
        res.status(500).json({ msg: 'Error al obtener las palabras' });
    }
};



// Obtener una palabra específica
const obtenerPalabra = async (req, res) => {
    const { id } = req.params;
    const palabra = await Palabra.findById(id);
    if (!palabra) {
        return res.status(404).json({ msg: 'Palabra no encontrada' });
    }
    res.json(palabra);
};

// Crear una palabra
const crearPalabra = async (req, res) => {
    try {
        const nuevaPalabra = new Palabra(req.body);
        await nuevaPalabra.save();
        //usamos populate después de guardar la nueva palabra para asegurarnos que la respuesta enviada al cliente incluya la información completa de la categoría
        const palabraConCategoria = await nuevaPalabra.populate('categoria', 'nombre');

        res.status(201).json({
            ok: true,
            palabra: palabraConCategoria,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear la palabra',
        });
    }
};

// Editar una palabra
const editarPalabra = async (req, res) => {
    const { id } = req.params;
    const { palabra, categoria, animaciones,explicacion } = req.body; // Asegurarse de incluir animaciones

    try {
        const palabraEditada = await Palabra.findByIdAndUpdate(
            id,
            { 
                ...(palabra && { palabra }), // Actualiza si existe
                ...(categoria && { categoria }), // Actualiza si existe
                ...(animaciones && { animaciones }), // Actualiza si existe
                ...(explicacion && { explicacion }), // Actualiza la explicación si existe

            },
            { new: true } // Devuelve el documento actualizado
        ).populate('categoria', 'nombre');

        if (!palabraEditada) {
            return res.status(404).json({ ok: false, msg: 'Palabra no encontrada' });
        }

        res.json({
            ok: true,
            palabra: palabraEditada,
        });
    } catch (error) {
        console.error('Error al actualizar la palabra:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar la palabra',
        });
    }
};


// Borrar una palabra
const borrarPalabra = async (req, res) => {
    const { id } = req.params;
    const palabraEliminada = await Palabra.findByIdAndDelete(id);
    if (!palabraEliminada) {
        return res.status(404).json({ msg: 'Palabra no encontrada' });
    }
    res.json({ msg: 'Palabra eliminada' });
};

// Asociar una palabra a una categoría
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
            .populate({
                path: 'animaciones', // Resolver completamente las animaciones
                model: 'gltfFiles.files', 
                select: 'filename', // Seleccionar solo el campo 'filename'
            });

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




module.exports = {
    obtenerPalabras,
    obtenerPalabra,
    crearPalabra,
    editarPalabra,
    borrarPalabra,
    asociarCategoria,
    obtenerPalabrasPorCategoria
};
