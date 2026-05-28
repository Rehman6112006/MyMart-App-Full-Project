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
    // Login
    const login = await request('POST', '/auth/login', { email: 'abdulrehman6112006@gmail.com', password: 'vendor123' });
    if (!login.data.success) { console.log('Login failed:', login.data); return; }
    const token = login.data.token;
    console.log('Logged in');

    // Create product
    const create = await request('POST', '/products', {
      name: 'NodeTest', description: 'test', base_price: 20, stock_quantity: 5,
      category_id: '89617b6a-3b5e-4595-831a-6bc654f8eb59',
      image_url: 'https://via.placeholder.com/150', is_active: true
    }, token);
    if (!create.data.success) { console.log('Create failed:', create.data); return; }
    const id = create.data.product.id;
    console.log('Created:', id, 'price:', create.data.product.base_price);

    // Update - name only
    const u1 = await request('PUT', `/products/${id}`, { name: 'UpdatedName' }, token);
    console.log('Name-only update:', u1.status, u1.data.success || u1.data);

    // Update - price only
    const u2 = await request('PUT', `/products/${id}`, { base_price: 35 }, token);
    console.log('Price-only update:', u2.status, u2.data.success ? `price=${u2.data.product.base_price}` : u2.data);

    // Update - full
    const u3 = await request('PUT', `/products/${id}`, { name: 'FullUpdate', base_price: 40, stock_quantity: 10 }, token);
    console.log('Full update:', u3.status, u3.data.success ? `name=${u3.data.product.name} price=${u3.data.product.base_price}` : u3.data);

    // Delete
    await request('DELETE', `/products/${id}`, null, token);
    console.log('Deleted');
  } catch (e) {
    console.error('Error:', e.message);
  }
}
main();
