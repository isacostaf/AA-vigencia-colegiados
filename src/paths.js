const path = require('path');

function getTmpPath(...segments) {
    return path.join(path.sep, 'tmp', 'agenteMDlegis', ...segments);
}

module.exports = {
    getTmpPath
};
