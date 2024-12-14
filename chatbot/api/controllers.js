app.get('/asociaciones', async (req, res) => {
    const { ciudad } = req.query;
    const asociaciones = [
        { nombre: "Asociación A", direccion: "Calle 1", ciudad: "Madrid" },
        { nombre: "Asociación B", direccion: "Calle 2", ciudad: "Barcelona" },
    ];
    const resultado = asociaciones.filter(a => a.ciudad.toLowerCase() === ciudad.toLowerCase());
    res.json(resultado.length ? resultado : { mensaje: "No se encontraron asociaciones en esa ciudad." });
});
