const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'client/src');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else { 
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir(directoryPath);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Replace fetch('http://localhost:5000/api/...')
    content = content.replace(/['"`]http:\/\/localhost:5000\/api\/(.*?)['"`]/g, '`${import.meta.env.VITE_API_URL}/$1`');
    
    // Replace socket connection
    content = content.replace(/io\(['"`]http:\/\/localhost:5000['"`]\)/g, "io(import.meta.env.VITE_API_URL.replace('/api', ''))");

    // Replace image URLs: `http://localhost:5000${var}` -> (var?.startsWith('http') ? var : `${import.meta.env.VITE_API_URL.replace('/api', '')}${var}`)
    content = content.replace(/`http:\/\/localhost:5000\$\{([^}]+)\}`/g, "($1?.startsWith('http') ? $1 : `${import.meta.env.VITE_API_URL.replace('/api', '')}${$1}`)");

    fs.writeFileSync(file, content, 'utf8');
});

console.log('URLs replaced successfully!');
