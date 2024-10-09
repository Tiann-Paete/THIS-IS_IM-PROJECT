import mysql from 'mysql2/promise';
import { parse } from 'url';
import { sign, verify } from 'jsonwebtoken';
import { query } from '../../utils/db';

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default async function handler(req, res) {
  const { method } = req;
  const { pathname, query } = parse(req.url, true);

  console.log('Received request:', method, pathname, query);

  if (pathname === '/api/test') {
    res.status(200).json({ message: 'Test route working' });
    return;
  }

  if (pathname === '/api/admin-name') {
    try {
      const [results] = await db.query('SELECT full_name FROM admin LIMIT 1');
      if (results.length > 0) {
        res.status(200).json({ fullName: results[0].full_name });
      } else {
        res.status(404).json({ error: 'Admin not found' });
      }
    } catch (error) {
      console.error('Error fetching admin name:', error);
      res.status(500).json({ error: 'An error occurred while fetching admin name' });
    }
    return;
  }

  try {
    switch (method) {
      case 'GET':
    
        if (pathname === '/api/check-auth') {
          const authHeader = req.headers.authorization;
          if (!authHeader) {
            return res.status(200).json({ isAuthenticated: false, usernamePasswordVerified: false });
          }
        
          const token = authHeader.split(' ')[1];
          try {
            const decoded = verify(token, process.env.JWT_SECRET);
            const now = Math.floor(Date.now() / 1000);
            
            if (decoded.exp && decoded.exp > now) {
              // Token is still valid
              return res.status(200).json({ 
                isAuthenticated: true, 
                usernamePasswordVerified: true,
                expiresIn: decoded.exp - now
              });
            } else {
              // Token has expired
              return res.status(200).json({ isAuthenticated: false, usernamePasswordVerified: false });
            }
          } catch (error) {
            return res.status(200).json({ isAuthenticated: false, usernamePasswordVerified: false });
          }
        } else if (pathname === '/api/products') {
          await handleGetProducts(req, res);
        } else if (pathname === '/api/total-stock') {
          await handleGetTotalStock(req, res);
        } else if (pathname === '/api/sales-report') {
          await handleGetSalesReport(req, res);
        } else if (pathname === '/api/sales-data') {
          await handleGetSalesData(req, res);
        } else if (pathname === '/api/total-products') {
          await handleGetTotalProducts(req, res);
        } else if (pathname === '/api/top-products') {
          await handleGetTopProducts(req, res);
        } else if (pathname === '/api/rated-products-count') {
          await handleGetRatedProductsCount(req, res);
        } else if (pathname === '/api/logout') {
          await handleLogout(req, res);
          return;
        } else if (pathname === '/api/orders') {
          await handleGetOrders(req, res);
        } else  if (pathname === '/api/admin-data') {
          await handleGetAdminData(req, res);
        } else if (pathname === '/api/session-history') {
          await handleGetSessionHistory(req, res);
        }
        break;

      case 'POST':
        if (pathname === '/api/signin') {
          await handleSignIn(req, res);
        } else if (pathname === '/api/validate-pin') {
          await handleValidatePin(req, res);
        } else if (pathname === '/api/products') {
          await handleAddProduct(req, res);
        }
        break;

        case 'PUT':
  if (pathname.startsWith('/api/products/')) {
    const id = pathname.split('/').pop();
    await handleUpdateProduct(req, res, id);
  } else if (pathname.startsWith('/api/orders/')) {
    const parts = pathname.split('/');
    const id = parts[3]; // This is the order ID
    if (parts[4] === 'status') {
      await handleUpdateOrderStatus(req, res, id);
    } else if (parts[4] === 'cancel') {
      await handleCancelOrder(req, res, id);
    } else {
      await handleUpdateOrder(req, res, id);
    }
  }
  if (pathname === '/api/update-admin') {
    await handleUpdateAdminData(req, res);
  }
  break;
  case 'DELETE':
        if (pathname.startsWith('/api/products/')) {
          const id = pathname.split('/').pop();
          await handleDeleteProduct(req, res, id);
        } else if (pathname.startsWith('/api/orders/') && pathname.endsWith('/salesreport')) {
          await handleRemoveOrderFromSalesReport(req, res);
        } else {
          res.status(404).json({ error: 'Route not found' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }

  res.status(404).json({ error: 'Route not found' });
  } catch (error) {
    console.error('Error in API route:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}



async function handleSignIn(req, res) {
  const { username, password } = req.body;
  console.log('Signin attempt:', { username }); // Don't log passwords

  try {
    const [results] = await db.query('SELECT * FROM admin WHERE username = ?', [username]);
    console.log('Database query results:', results);

    if (results.length === 0) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = results[0];
    
    // For now, directly compare passwords
    const passwordMatch = password === user.password;

    if (!passwordMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update login_time
    await db.query('UPDATE admin SET login_time = NOW() WHERE id = ?', [user.id]);

    const token = sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '6h' });
    console.log('Login successful, token generated');
    
    res.status(200).json({ success: true, message: 'Signin successful', username: user.username, token: token });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'An error occurred during signin' });
  }
}

async function handleValidatePin(req, res) {
  const { pin } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET);
    const [results] = await db.query('SELECT pin FROM admin WHERE id = ?', [decoded.userId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const storedPin = results[0].pin;
    
    if (String(pin) === String(storedPin)) {
      res.status(200).json({ message: 'PIN validated successfully' });
    } else {
      res.status(401).json({ error: 'Invalid PIN' });
    }
  } catch (error) {
    console.error('Error validating PIN:', error);
    res.status(500).json({ error: 'An error occurred while validating PIN' });
  }
}

async function handleLogout(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      // Update logout_time
      await db.query('UPDATE admin SET logout_time = NOW() WHERE id = ?', [decoded.userId]);
      // We're removing the sessions table update as it doesn't exist
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
  res.setHeader('Set-Cookie', 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
  res.status(200).json({ success: true, message: 'Logout successful' });
}

async function handleGetAdminData(req, res) {
  try {
    const [results] = await db.query('SELECT full_name, username, password, pin, role FROM admin LIMIT 1');
    if (results.length > 0) {
      const adminData = results[0];
      // Mask the password and PIN
      adminData.password = '*'.repeat(adminData.password.length);
      adminData.pin = '*'.repeat(adminData.pin.length);
      res.status(200).json(adminData);
    } else {
      res.status(404).json({ error: 'Admin not found' });
    }
  } catch (error) {
    console.error('Error fetching admin data:', error);
    res.status(500).json({ error: 'An error occurred while fetching admin data' });
  }
}

// Update this function to hash the PIN before storing
async function handleUpdateAdminData(req, res) {
  const { full_name, username, password, pin, role } = req.body;
  
  try {
    let sql = 'UPDATE admin SET full_name = ?, username = ?, role = ?';
    let params = [full_name, username, role];

    if (password) {
      sql += ', password = ?';
      params.push(password);
    }

    if (pin) {
      sql += ', pin = ?';
      params.push(pin);
    }

    sql += ' WHERE id = 1'; // Assuming there's only one admin record

    const result = await query(sql, params);

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Admin not found' });
    } else {
      res.status(200).json({ message: 'Admin data updated successfully' });
    }
  } catch (error) {
    console.error('Error updating admin data:', error);
    res.status(500).json({ error: 'An error occurred while updating admin data' });
  }
}

async function handleGetSessionHistory(req, res) {
  try {
    const [results] = await db.query('SELECT full_name, username, role, login_time, logout_time FROM admin ORDER BY login_time DESC');
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({ error: 'An error occurred while fetching session history' });
  }
}





async function handleGetSalesData(req, res) {
  const { timeFrame } = req.query;
  let dateCondition, statusCondition;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (timeFrame) {
    case 'today':
      dateCondition = 'DATE(order_date) = CURDATE()';
      break;
    case 'yesterday':
      dateCondition = 'DATE(order_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
      break;
    case 'lastWeek':
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      dateCondition = `DATE(order_date) BETWEEN '${lastWeekStart.toISOString().split('T')[0]}' AND '${lastWeekEnd.toISOString().split('T')[0]}'`;
      break;
    case 'lastMonth':
      const lastMonthStart = new Date(today);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      const lastMonthEnd = new Date(today);
      lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);
      dateCondition = `DATE(order_date) BETWEEN '${lastMonthStart.toISOString().split('T')[0]}' AND '${lastMonthEnd.toISOString().split('T')[0]}'`;
      break;
    default:
      dateCondition = 'DATE(order_date) = CURDATE()';
  }

  try {
    // Total Sales (always only "Delivered" status)
    const [salesResult] = await db.query(`
      SELECT COALESCE(SUM(total), 0) as periodSales
      FROM orders
      WHERE ${dateCondition} AND status = 'Delivered'
    `);

    // Total Orders
    let ordersStatusCondition = "status = 'Delivered'";
    if (timeFrame === 'lastWeek' || timeFrame === 'lastMonth') {
      ordersStatusCondition = "status IN ('Order Placed', 'Processed', 'Shipped', 'Delivered', 'Cancelled')";
    }
    const [ordersResult] = await db.query(`
      SELECT COUNT(*) as totalOrders
      FROM orders
      WHERE ${dateCondition} AND ${ordersStatusCondition}
    `);

    // Total Customers (always all statuses)
    const [customersResult] = await db.query(`
      SELECT COUNT(DISTINCT user_id) as totalCustomers
      FROM orders
      WHERE ${dateCondition}
    `);

    const result = {
      periodSales: Number(salesResult[0].periodSales),
      totalOrders: ordersResult[0].totalOrders,
      totalCustomers: customersResult[0].totalCustomers
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ error: 'Error fetching sales data' });
  }
}

async function handleGetTotalProducts(req, res) {
  const [result] = await db.query('SELECT COUNT(*) as totalProducts FROM products');
  res.status(200).json(result[0]);
}

async function handleGetTopProducts(req, res) {
  const [result] = await db.query(`
    SELECT 
      p.id,
      p.name,
      p.image_url,
      COALESCE(AVG(pr.rating), 0) as avg_rating,
      COALESCE(SUM(op.quantity), 0) as sold
    FROM products p
    LEFT JOIN ordered_products op ON p.id = op.product_id
    LEFT JOIN product_ratings pr ON p.id = pr.product_id
    GROUP BY p.id
    ORDER BY sold DESC, avg_rating DESC
    LIMIT 5
  `);
  
  const formattedResult = result.map(product => ({
    ...product,
    avg_rating: Number(product.avg_rating).toFixed(1)
  }));
  
  res.status(200).json(formattedResult);
}

async function handleGetRatedProductsCount(req, res) {
  const { timeFrame } = req.query;
  let dateCondition;

  switch (timeFrame) {
    case 'today':
      dateCondition = 'DATE(created_at) = CURDATE()';
      break;
    case 'yesterday':
      dateCondition = 'DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
      break;
    case 'lastWeek':
      dateCondition = 'DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 1 WEEK) AND CURDATE()';
      break;
    case 'lastMonth':
      dateCondition = 'DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND CURDATE()';
      break;
    default:
      dateCondition = 'DATE(created_at) = CURDATE()';
  }

  const [result] = await db.query(`
    SELECT COUNT(DISTINCT product_id) as ratedProductsCount
    FROM product_ratings
    WHERE ${dateCondition}
  `);

  res.status(200).json(result[0]);
}


async function handleGetProducts(req, res) {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM products WHERE deleted = FALSE');
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const [products] = await db.query('SELECT * FROM products WHERE deleted = FALSE LIMIT ? OFFSET ?', [parseInt(limit), offset]);

    res.status(200).json({
      products,
      currentPage: parseInt(page),
      totalPages,
      totalItems
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
}





async function handleGetTotalStock(req, res) {
  try {
    const [result] = await db.query('SELECT SUM(stock_quantity) as totalStock FROM products');
    res.status(200).json({ totalStock: result[0].totalStock });
  } catch (error) {
    console.error('Error fetching total stock:', error);
    res.status(500).json({ error: 'Error fetching total stock' });
  }
}

async function handleAddProduct(req, res) {
  const { name, description, price, image_url, stock_quantity, category, supplier_id } = req.body;
  const order_id = generateOrderId();
  const sql = "INSERT INTO products (name, description, price, image_url, stock_quantity, category, supplier_id, order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  
  try {
    const [result] = await db.query(sql, [name, description, price, image_url, stock_quantity, category, supplier_id, order_id]);
    res.status(201).json({ message: 'Product added successfully', id: result.insertId, order_id: order_id });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Error adding product' });
  }
}

function generateOrderId() {
  return 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

async function handleUpdateProduct(req, res, id) {
  const { name, description, price, image_url, stock_quantity, category, supplier_id } = req.body;
  const sql = "UPDATE products SET name=?, description=?, price=?, image_url=?, stock_quantity=?, category=?, supplier_id=? WHERE id=?";
  
  try {
    const [result] = await db.query(sql, [name, description, price, image_url, stock_quantity, category, supplier_id, id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product updated successfully' });
    }
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Error updating product' });
  }
}

async function handleDeleteProduct(req, res, id) {
  const sql = "UPDATE products SET deleted = TRUE WHERE id = ?";
  
  try {
    const [result] = await db.query(sql, [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product marked as deleted successfully' });
    }
  } catch (error) {
    console.error('Error marking product as deleted:', error);
    res.status(500).json({ error: 'Error marking product as deleted' });
  }
}



async function handleGetSalesReport(req, res) {
  try {
    const [result] = await db.query('SELECT * FROM user_login');
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ error: 'An error occurred while fetching sales report data' });
  }
}

async function handleUpdateOrderStatus(req, res, id) {
  const { status } = req.body;
  console.log('Updating order status:', id, status);

  const sql = "UPDATE orders SET status = ? WHERE id = ?";
  try {
    const [result] = await db.query(sql, [status, id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(200).json({ message: 'Order status updated successfully', status: status });
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Error updating order status' });
  }
}

async function handleCancelOrder(req, res, id) {
  const sql = "UPDATE orders SET status = 'Cancelled' WHERE id = ?";
  try {
    const [result] = await db.query(sql, [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(200).json({ message: 'Order cancelled successfully' });
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Error cancelling order' });
  }
}
async function handleUpdateOrder(req, res, id) {
  const { order_date } = req.body;
  const sql = "UPDATE orders SET order_date = ? WHERE id = ?";
  try {
    const [result] = await db.query(sql, [order_date, id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(200).json({ message: 'Order date updated successfully' });
    }
  } catch (error) {
    console.error('Error updating order date:', error);
    res.status(500).json({ error: 'Error updating order date' });
  }
}
async function handleRemoveOrderFromSalesReport(req, res) {
  const { id } = req.query;
  const sql = "UPDATE orders SET in_sales_report = 0 WHERE id = ?";
  try {
    const [result] = await db.query(sql, [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(200).json({ message: 'Order removed from sales report successfully' });
    }
  } catch (error) {
    console.error('Error removing order from sales report:', error);
    res.status(500).json({ error: 'Error removing order from sales report' });
  }
}

async function handleGetOrders(req, res) {
  try {
    const [result] = await db.query(`
      SELECT o.*, 
             GROUP_CONCAT(CONCAT(op.name, ' (', op.quantity, ')') SEPARATOR ', ') AS ordered_products
      FROM orders o
      LEFT JOIN ordered_products op ON o.id = op.order_id
      WHERE o.in_sales_report = 1
      GROUP BY o.id
    `);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'An error occurred while fetching orders' });
  }
}


export { handleUpdateAdminData };