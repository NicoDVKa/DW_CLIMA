const { Client } = require('pg');
const cors = require('cors');
const express = require('express');
const { exportClient, Port } = require('./config.js');

const app = express();

var corsOptions = {
  origin: process.env.URL_ALLOWED || 'http://localhost:3000',
  optionsSuccessStatus: 200 
}

//app.use(cors(corsOptions));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});



// Middleware
app.use(express.json());

const client = new Client(exportClient);

client.connect();


// !Consulta a todos los datos de la tabla base.
app.get('/medicion', (req, res) => {
  client.query('SELECT * FROM bt_medicion', (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error en la consulta');
    } else {
      res.json(result.rows);
    }
  });
});


// !Consulta por todos los años que existan en la table base.
app.get('/anio', (req, res) => {
  client.query(`
              select m.anio
              FROM public.bt_medicion m
              group by m.anio
              order by m.anio;
              `, (err,result) => {
    if (err) {
      console.log(err);
      res.status(500).send('Error en la consulta');
    }else{
      res.json(result.rows);
    }
  });
});


// !Consulta por las provincias de la lookup
app.get('/provincia', async (req, res) => {
  
  let {year} = req.query;

  await client.query(
               `
               SELECT p.id, p."desc", p.codigo
               FROM public.lk_provincia as p 
               inner join bt_medicion as bm on bm.provincia_id =  p.id 
               where  not bm.cultivo_id = 0  ${year? 'and bm.anio='+year: ''}
               group  by p.id 
               order by p.id ;
               `
                ,(err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error en la consulta');
    } else {
      res.json(result.rows);
    }
  });
});



// !Se trae los datos de la temperatura anual de la provincia. Además, tiene un filtro por año.
app.get('/provincia/temperatura', async (req, res) => {
  let {year}   = req.query;
  await client.query(
               `SELECT lp.id , lp."desc" , bt.anio,  max(bt.temperatura) as temperatura
                FROM public.bt_medicion as bt
                inner join  lk_provincia as lp on lp.id = bt.provincia_id
                ${year ? 'where bt.anio =' + year : ''}
                group by lp.id, bt.anio
                order by lp.id, bt.anio;`
                ,(err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error en la consulta');
    } else {
      res.json(result.rows);
    }
  });
});


// !Se trae el nombre de los cultivos que hay en la tabla base. Además, tiene filtro por año. (Sirve para filtrado)
app.get('/cultivo', async (req, res) => {
  let {year, province} = req.query;
  await client.query(
               `
               SELECT c.id, c."desc", c.codigo
               FROM public.lk_cultivo as c
               inner join bt_medicion as m on  m.cultivo_id = c.id 
               where "desc" is not null ${year? 'and m.anio ='+ year : ''} ${province? 'and m.provincia_id ='+ province : ''} 
               group by c.id 
               order by c.id;
               `
                ,(err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error en la consulta');
    } else {
      res.json(result.rows);
    }
  });
});


// !Se trae las mediciones de los cultivos que hay en la tabla base. Además, tiene filtro por año e id del cultivo.
app.get('/cultivo/medicion/:year', async (req, res) => {
  let {province, crop} = req.query;
  let {year} = req.params;
  await client.query(
               `
               SELECT lc.id, lc."desc" as cultivo_desc,lp.desc as provincia_desc, avg(bt.rendimiento) as rendimiento , avg(bt.produccion) as produccion, avg(bt. sup_sembrada) as sup_sembrada , avg(bt.sup_cosechada) as sup_cosechada
               FROM public.bt_medicion as bt
               inner join  lk_cultivo as lc on lc.id = bt.cultivo_id
               inner join lk_provincia as lp on lp.id  = bt.provincia_id  
                where  not lc.id = 0  and  bt.anio=${year} ${province? 'AND lp.id= ' + province :''} ${crop? 'AND lc.id=' + crop : ''}
                group by lc.id, bt.anio, lp.desc
                order by lc.id, bt.anio
               `
                ,(err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error en la consulta');
    } else {
      res.json(result.rows);
    }
  });
});




app.get('/cultivo/medicion', async (req, res) => {
  let {province,crop} = req.query;
  await client.query(
               `
               SELECT lc.id, lc."desc" as cultivo_desc, ${province? 'lp.desc as provincia_desc ,': ''} bt.anio,  avg(bt.rendimiento) as rendimiento , avg(bt.produccion) as produccion, avg(bt. sup_sembrada) as sup_sembrada , avg(bt.sup_cosechada) as sup_cosechada
               FROM public.bt_medicion as bt
               inner join  lk_cultivo as lc on lc.id = bt.cultivo_id
               inner join lk_provincia as lp on lp.id  = bt.provincia_id  
              where  not lc.id = 0  ${province? ' And lp.id ='+ province : ''} ${crop? ' And lc.id ='+ crop : ''}
                group by lc.id, bt.anio   ${province? ' , lp.id': ''}
                order by lc.id, bt.anio ${province? ' , lp.id': ''}
               `
                ,(err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error en la consulta');
    } else {
      res.json(result.rows);
    }
  });
});




app.listen(Port, () => {
  console.log(`Servidor en ejecución en http://localhost:${Port}`);
});

