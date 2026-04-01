const Categoria = require('../models/categorias');

// La función 'obtenerCategorias' obtiene todas las categorías de la base de datos.
// 1. Realiza una búsqueda de todas las categorías usando 'Categoria.find()'.
// 2. Devuelve el resultado en formato JSON.
const obtenerCategorias = async (req, res) => {
    const categorias = await Categoria.find();
    res.json(categorias);
};

// La función 'obtenerCategoria' obtiene una categoría específica por su ID.
// 1. Extrae el 'id' de los parámetros de la ruta.
// 2. Busca la categoría con 'findById'.
// 3. Si no existe, devuelve un error 404.
// 4. Si existe, la retorna en formato JSON.
const obtenerCategoria = async (req, res) => {
    const { id } = req.params;
    const categoria = await Categoria.findById(id);
    if (!categoria) {
        return res.status(404).json({ msg: 'Categoría no encontrada' });
    }
    res.json(categoria);
};

// La función 'crearCategoria' crea una nueva categoría en la base de datos.
// 1. Crea una instancia del modelo 'Categoria' con los datos recibidos en el cuerpo (req.body).
// 2. Guarda la nueva categoría en la base de datos.
// 3. Devuelve un código de estado 201 (creado) junto con los datos de la nueva categoría.
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
            msg: 'Error al crear la categoría',
        });
    }
};

// La función 'editarCategoria' actualiza los datos de una categoría específica.
// 1. Toma el 'id' de los parámetros de la ruta y extrae el 'nombre' del cuerpo de la petición.
// 2. Utiliza 'findByIdAndUpdate' para modificar la categoría con el nuevo 'nombre'.
// 3. Retorna la categoría actualizada o un error 404 si no existe.
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
            { new: true } // 'new: true' para obtener el documento actualizado
        );
        if (!categoriaEditada) {
            return res.status(404).json({ msg: 'Categoría no encontrada' });
        }
        res.json(categoriaEditada);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar la categoría',
        });
    }
};

// La función 'eliminarCategoria' borra una categoría por su ID.
// 1. Obtiene el 'id' de los parámetros de la ruta.
// 2. Usa 'findByIdAndDelete' para eliminar la categoría.
// 3. Devuelve un mensaje de confirmación o un error 404 si no se encontró la categoría.
const eliminarCategoria = async (req, res) => {
    const { id } = req.params;

    try {
        const categoriaEliminada = await Categoria.findByIdAndDelete(id);
        if (!categoriaEliminada) {
            return res.status(404).json({ msg: 'Categoría no encontrada' });
        }
        res.json({ msg: 'Categoría eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al eliminar la categoría',
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