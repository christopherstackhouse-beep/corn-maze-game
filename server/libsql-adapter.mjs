// D1-compatible interface keeps the game's existing score rules and SQL intact.
export function libsqlDatabase(client){
 return {
  prepare(sql){let args=[];return {
   bind(...values){args=values;return this},
   async first(){const r=await client.execute({sql,args});return r.rows[0]||null},
   async all(){const r=await client.execute({sql,args});return {results:r.rows}},
   async run(){return client.execute({sql,args})},
   statement(){return {sql,args}}
  }},
  async batch(statements){return client.batch(statements.map(s=>s.statement()),'write')}
 };
}
