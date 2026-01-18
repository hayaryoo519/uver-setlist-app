fetch('http://localhost:4000/api/songs/シャルマンノウラ/stats')
    .then(r => r.json())
    .then(d => console.log(JSON.stringify(d, null, 2)))
    .catch(e => console.error(e));
