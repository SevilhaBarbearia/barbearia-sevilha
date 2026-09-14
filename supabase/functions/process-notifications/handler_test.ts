Deno.env.set('SUPABASE_URL','https://supabase.example.test');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test-service');
Deno.env.set('RESEND_API_KEY','test-resend');
Deno.env.set('EMAIL_FROM','Agenda <agenda@example.test>');
Deno.env.set('APP_BASE_URL','https://agenda.example.test');
const {processNotifications,renderTemplate}=await import('./handler.ts');

function assert(condition: unknown, message: string): asserts condition {
  if(!condition) throw new Error(message);
}
Deno.test('recusa métodos e credenciais sem iniciar envios',async()=>{
  assert((await processNotifications(new Request('https://worker.test'))).status===405,'GET aceito');
  assert((await processNotifications(new Request('https://worker.test',{method:'POST'}))).status===401,'POST sem credencial aceito');
});
Deno.test('monta link no tenant correto',()=>{
  assert(renderTemplate('{{nome}}: {{link_avaliacao}}',{nome:'Ana',barbershop_slug:'imperial',survey_token:'abc'})==='Ana: https://agenda.example.test/imperial/avaliar/abc','Link incorreto');
});
Deno.test('envia lote e registra falha sem perder a identidade da tentativa',async()=>{
  const original=globalThis.fetch;
  const sent: string[]=[];
  const updates: Record<string,unknown>[]=[];
  globalThis.fetch=async(input,init)=>{
    const url=String(input);
    if(url.endsWith('/rpc/enqueue_birthday_notifications')) return Response.json(0);
    if(url.endsWith('/rpc/claim_notifications')) return Response.json([
      {id:'one',recipient:'one@example.test',subject:'Olá',content:'Olá, {{nome}}',payload:{nome:'Ana'}},
      {id:'two',recipient:'two@example.test',subject:'Olá',content:'Olá',payload:{}}
    ]);
    if(url==='https://api.resend.com/emails') {
      const key=new Headers(init?.headers).get('Idempotency-Key');sent.push(key ?? '');
      return key==='notification/one' ? Response.json({id:'provider-one'}) : Response.json({message:'Indisponível'},{status:503});
    }
    if(url.includes('/outbound_notifications?')) {
      updates.push(JSON.parse(String(init?.body)));return new Response(null,{status:204});
    }
    throw new Error('Chamada inesperada: '+url);
  };
  try{
    const response=await processNotifications(new Request('https://worker.test',{method:'POST',headers:{authorization:'Bearer test-service'}}));
    const body=await response.json();
    assert(body.sent===1 && body.failed===1 && body.processed===2,'Contagem incorreta');
    assert(sent.join(',')==='notification/one,notification/two','Idempotência ausente');
    assert(updates[0].status==='sent' && JSON.stringify(updates[0].payload)==='{}','Token não removido após confirmação');
    assert(updates[1].status==='failed' && typeof updates[1].scheduled_at==='string','Falha não reagendada');
  }finally{globalThis.fetch=original;}
});
