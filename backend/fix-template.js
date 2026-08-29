const fs = require('fs');
let data = fs.readFileSync('template.yaml', 'utf8');
data = data.replace(/!Ref UnderdocksInventoryV2/g, '"UnderdocksInventoryV2"');
data = data.replace(/!Ref UnderdocksSalesV2/g, '"UnderdocksSalesV2"');
fs.writeFileSync('template.yaml', data);
