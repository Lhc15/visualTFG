const Categoria = require('../models/categorias');
const Palabra = require('../models/palabras');

// Devuelve todas las categorias, cada una enriquecida con totalPalabras
// calculado en tiempo real desde la coleccion palabras.
// Asi cualquier cambio en el admin (crear/borrar categoria, asignar palabras)
// se refleja automaticamente sin tocar nada mas.
const obtenerCategorias = async (req, res) => {
    try {
        const categorias = await Categoria.find();

        // Contamos palabras por categoria en una sola query de agregacion
        const conteos = await Palabra.aggregate([
            { $group: { _id: '$categoria', total: { $sum: 1 } } }
        ]);

        // Mapa categoriaId -> total para lookup O(1)
        const mapaConteos = {};
        conteos.forEach(c => {
            if (c._id) mapaConteos[c._id.toString()] = c.total;
        });

        const resultado = categorias.map(cat => ({
            ...cat.toObject(),
            totalPalabras: mapaConteos[cat._id.toString()] ?? 0
        }));

        res.json(resultado);
    } catch (error) {
        console.error('Error al obtener categorias:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener las categorias' });
    }
};

// Devuelve una categoria especifica por su ID.
const obtenerCategoria = async (req, res) => {
    const { id } = req.params;
    const categoria = await Categoria.findById(id);
    if (!categoria) {
        return res.status(404).json({ msg: 'Categoria no encontrada' });
    }
    res.json(categoria);
};

// Crea una nueva categoria.
const crearCategoria = async (req, res) => {
    try {
        const nuevaCategoria = new Categoria(req.body);
        await nuevaCategoria.save();
        res.status(201).json({
            ok: true,
            categoria: nuevaCategoria,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear la categoria',
        });
    }
};

// Actualiza los datos de una categoria especifica.
const editarCategoria = async (req, res) => {
    const { id } = req.params;
    const { nombre, modulo } = req.body;

    const update = {};
    if (nombre !== undefined) update.nombre = nombre;
    if (modulo !== undefined) update.modulo = modulo;

    try {
        const categoriaEditada = await Categoria.findByIdAndUpdate(
            id,
            update,
            { new: true }
        );
        if (!categoriaEditada) {
            return res.status(404).json({ msg: 'Categoria no encontrada' });
        }
        res.json(categoriaEditada);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar la categoria',
        });
    }
};

// Elimina una categoria por su ID.
const eliminarCategoria = async (req, res) => {
    const { id } = req.params;

    try {
        const categoriaEliminada = await Categoria.findByIdAndDelete(id);
        if (!categoriaEliminada) {
            return res.status(404).json({ msg: 'Categoria no encontrada' });
        }
        res.json({ msg: 'Categoria eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al eliminar la categoria',
        });
    }
};

module.exports = {
    obtenerCategorias,
    obtenerCategoria,
    crearCategoria,
    editarCategoria,
    eliminarCategoria,
};