module.exports = {
    apps: [
      {
        name: 'backend',
        script: 'index.js',
        env: {
          NODE_ENV: 'production',
          PORT: 3000,
          DBCONNECTION: 'mongodb://userExample:userPassword@localhost:27018/usuariosDB?authSource=usuariosDB',
          JWTSECRET: '5345fasjifjj5ji34i5j543+`++32fs234',
          DOCSPERPAGE: 20,
        }
      }
    ]
  };