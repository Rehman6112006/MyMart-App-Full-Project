import http from 'http';

const API = 'http://localhost:5000/api';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  try {
    const login = await request('POST', '/auth/login', { email: 'abdulrehman6112006@gmail.com', password: 'vendor123' });
    const token = login.data.token;
    console.log('Logged in');

    const create = await request('POST', '/products', {
      name: 'SimpleTest', description: 'desc', base_price: 15.50, stock_quantity: 3,
      category_id: '89617b6a-3b5e-4595-831a-6bc654f8eb59',
      image_url: 'https://via.placeholder.com/150', is_active: true
    }, token);
    if (!create.data.success) { console.log('Create FAIL:', create.data); return; }
    const id = create.data.product.id;
    console.log('Created:', id, 'price=', create.data.product.base_price);

    // Simple update: name + price
    const upd = await request('PUT', `/products/${id}`, {
      name: 'SimpleTest Updated',
      base_price: 25.99
    }, token);
    console.log('Update:', upd.status, JSON.stringify(upd.data));

    // Delete
    await request('DELETE', `/products/${id}`, null, token);
    console.log('Done');
  } catch (e) {
    console.error('Error:', e.message);
  }
}
main();
