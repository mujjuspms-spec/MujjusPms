import 'dotenv/config';

async function run() {
  const query = "What are the latest project management trends in 2026?";
  const apiKey = process.env.SERPER_API_KEY;
  console.log('API Key configured:', !!apiKey);

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: query })
  });
  
  console.log('Status:', res.status);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
