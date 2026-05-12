const { executar_busca } = require('./busca');

(async () => {

    const texto =
        'Portaria GM-MD nº 3.779, de 8 de julho de 2022';

    await executar_busca(texto);

})();