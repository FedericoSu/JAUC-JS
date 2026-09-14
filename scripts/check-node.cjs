const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error('Se necesita Node.js 22.12 o superior. Version actual: ' + process.version);
  console.error('Descarga una version LTS desde https://nodejs.org/');
  process.exit(1);
}
console.log('Node.js ' + process.version + ': OK');
