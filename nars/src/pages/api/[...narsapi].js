import { parse } from 'url';
import bcrypt from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { query } from '../../utils/db';
import crypto from 'crypto';
import { withIronSession } from 'next-iron-session';

const handler = async (req, res) => {
    const { method } = req;
    const { pathname } = parse(req.url, true);

    try {
      switch (method) {
        case 'GET':
          if (pathname === '/api/check-auth') {
            handleCheckAuth(req, res);
          } else if (pathname.startsWith('/api/order/')) {
            await handleGetOrder(req, res);
          } else if (pathname.startsWith('/api/order-tracking/')) {
            await handleOrderTracking(req, res);
          } else if (pathname === '/api/order-history') {
            await handleOrderHistory(req, res);
          } else if (pathname === '/api/all-orders') {
            await handleAllOrders(req, res);
          } else if (pathname === '/api/logout') {
            await handleLogout(req, res);
          } else if (pathname === '/api/user') {
            handleGetUser(req, res);
          } else if (pathname === '/api/products') {
            await handleGetProducts(req, res);
          } else if (pathname.startsWith('/api/products/category/')) {
            const category = pathname.split('/').pop();
            await handleGetProductsByCategory(req, res, category);
          } else if (pathname === '/api/cart') {
            handleGetCart(req, res);
          } else if (pathname === '/api/limited-items') {
            await handleGetLimitedItems(req, res);
          } else if (pathname === '/api/categories') {
            await handleGetCategories(req, res);
          } else if (pathname === '/api/search') {
            await handleSearch(req, res);
          } else {
            res.status(404).json({ error: 'Not Found' });
          }
          break;
    
          case 'POST':
            if (pathname === '/api/signup') {
              await handleSignup(req, res);
            } else if (pathname === '/api/signin') {
              await handleSignin(req, res);
            } else if (pathname === '/api/place-order') {
              await handlePlaceOrder(req, res);
            }  else if (pathname.startsWith('/api/cancel-order/')) {
                await handleCancelOrder(req, res);
            } else if (pathname.startsWith('/api/submit-ratings/')) {
              await handleSubmitRatings(req, res);
            } else if (pathname === '/api/cart/add') {
              handleAddToCart(req, res);
            }
            break;
    
          case 'PUT':
            if (pathname === '/api/cart/update') {
              handleUpdateCart(req, res);
            }
            break;
    
          case 'DELETE':
            if (pathname.startsWith('/api/cart/remove/')) {
              handleRemoveFromCart(req, res);
            } else if (pathname.startsWith('/api/cancel-order/')) {
              await handleCancelOrder(req, res);
            }
            break;
    
          default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            res.status(405).end(`Method ${method} Not Allowed`);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
      }
    }

async function handleSignup(req, res) {
  const { firstname, lastname, address, mobile, email, password } = req.body;

  try {
    // Check if email already exists
    const existingUser = await query('SELECT * FROM registered_users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email is already in use' });
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insert new user
    const result = await query(
      'INSERT INTO registered_users (firstName, lastName, address, contact, email, password) VALUES (?, ?, ?, ?, ?, ?)',
      [firstname, lastname, address, mobile, email, hashedPassword]
    );
    // Insert into user_login table
    await query(
      'INSERT INTO user_login (user_firstname, user_lastname, contact, email) VALUES (?, ?, ?, ?)',
      [firstname, lastname, mobile, email]
    );
    // Generate JWT token
    const token = sign({ userId: result.insertId }, process.env.JWT_SECRET, { expiresIn: '6h' });
    res.status(200).json({ message: 'Signup successful', token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'An error occurred during signup' });
  }
}

async function handleSignin(req, res) {
  const { email, password } = req.body;

  try {
    const users = await query('SELECT * FROM registered_users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '6h' });

    // Set the user in the session
    req.session.user = {
      id: user.id,
      firstName: user.firstName,
      email: user.email
    };
    await req.session.save();

    // Reset logout_time to NULL for the user
    await query('UPDATE user_login SET logout_time = NULL WHERE email = ?', [email]);

    // Update login time
    const loginTime = new Date();
    await query('UPDATE user_login SET login_time = ? WHERE email = ?', [loginTime, email]);

    // Set token in a secure, HTTP-only cookie
    res.setHeader('Set-Cookie', `authToken=${token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

    res.status(200).json({ 
      success: true, 
      message: 'Signin successful', 
      token, // Send token to client
      firstName: user.firstName 
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ success: false, error: 'An error occurred during signin' });
  }
}
  
  function handleCheckAuth(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.json({ isAuthenticated: false });
    }
  
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
  
      // Check if the user exists in the session
      if (req.session.user && req.session.user.id === userId) {
        res.json({ 
          isAuthenticated: true, 
          user: { 
            id: req.session.user.id,
            firstName: req.session.user.firstName,
            email: req.session.user.email
          }
        });
      } else {
        // If the token is valid but the session doesn't exist, create it
        // You might want to fetch user data from the database here
        req.session.user = { id: userId };
        res.json({ isAuthenticated: true, user: { id: userId } });
      }
    } catch (error) {
      console.error('Token verification error:', error);
      res.json({ isAuthenticated: false });
    }
  }

  function handleGetUser(req, res) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
  
    if (!token) {
      console.log('No token provided for /api/user');
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
  
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      query('SELECT id, firstName, email FROM registered_users WHERE id = ?', [decoded.userId])
        .then(users => {
          if (users.length === 0) {
            console.log(`User not found for id: ${decoded.userId}`);
            return res.status(404).json({ success: false, error: 'User not found' });
          }
  
          const user = users[0];
          res.status(200).json({ success: true, firstName: user.firstName, email: user.email });
        })
        .catch(error => {
          console.error('Database query error:', error);
          res.status(500).json({ success: false, error: 'Database error' });
        });
    } catch (error) {
      console.error('Get user error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  }

  async function handleLogout(req, res) {
    try {
      const userEmail = req.headers['user-email'];
      console.log('Received logout request for user:', userEmail);
  
      if (userEmail) {
        const logoutTime = new Date();
        console.log('Updating logout time:', logoutTime);
  
        try {
          const result = await query(
            'UPDATE user_login SET logout_time = ? WHERE email = ? AND logout_time IS NULL',
            [logoutTime, userEmail]
          );
          console.log('Database update result:', result);
  
          if (result.affectedRows === 0) {
            console.log('No rows updated. User might not exist in user_login table or already logged out.');
          } else {
            console.log('Logout time updated successfully for user:', userEmail);
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          return res.status(500).json({ success: false, error: 'Database error during logout' });
        }
      } else {
        console.log('No user email provided in request headers');
        return res.status(400).json({ success: false, error: 'User email not provided' });
      }
  
      res.setHeader('Set-Cookie', 'authToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
      res.status(200).json({ success: true, message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, error: 'An error occurred during logout' });
    }
  }





  async function handleSearch(req, res) {
    const { query: searchQuery } = parse(req.url, true).query;
    
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }
  
    try {
      const searchTerms = searchQuery.split(/\s+/).map(term => `%${term}%`);
      const placeholders = searchTerms.map(() => '(p.name LIKE ? OR p.category LIKE ?)').join(' AND ');
      
      const sql = `
        SELECT p.*, 
               COALESCE(AVG(pr.rating), 5) as avg_rating,
               COUNT(pr.id) as rating_count
        FROM products p
        LEFT JOIN product_ratings pr ON p.id = pr.product_id
        WHERE p.deleted = 0 AND (${placeholders})
        GROUP BY p.id
      `;
  
      // Double the searchTerms array to account for both name and category
      const params = searchTerms.flatMap(term => [term, term]);
  
      const results = await query(sql, params);
      res.status(200).json(results);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ error: 'An error occurred while searching products', details: error.message });
    }
  }

async function handleGetProducts(req, res) {
  try {
    const productsQuery = `
      SELECT p.*, 
             COALESCE(AVG(pr.rating), 5) as avg_rating,
             COUNT(pr.id) as rating_count
      FROM products p
      LEFT JOIN product_ratings pr ON p.id = pr.product_id
      WHERE p.deleted = 0
      GROUP BY p.id
    `;
    const products = await query(productsQuery);
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: 'An error occurred while fetching products', details: error.message });
  }
}

async function handleGetProductsByCategory(req, res, category) {
  try {
    const decodedCategory = decodeURIComponent(category);
    console.log(`Attempting to fetch products for category: ${decodedCategory}`);
    const productsQuery = `
      SELECT p.*, 
             COALESCE(AVG(pr.rating), 5) as avg_rating,
             COUNT(pr.id) as rating_count
      FROM products p
      LEFT JOIN product_ratings pr ON p.id = pr.product_id
      WHERE p.category = ? AND p.deleted = 0
      GROUP BY p.id
    `;
    const products = await query(productsQuery, [decodedCategory]);
    console.log(`Fetched ${products.length} products for category: ${decodedCategory}`);
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ error: 'An error occurred while fetching products by category', details: error.message, stack: error.stack });
  }
}

async function handleGetLimitedItems(req, res) {
  try {
    console.log("Attempting to fetch limited items");
    const limitedItemsQuery = `
      SELECT p.*, 
             COALESCE(AVG(pr.rating), 5) as avg_rating,
             COUNT(pr.id) as rating_count
      FROM products p
      LEFT JOIN product_ratings pr ON p.id = pr.product_id
      WHERE p.category = 'Limited Items' AND p.deleted = 0
      GROUP BY p.id
    `;
    const limitedItems = await query(limitedItemsQuery);
    console.log("Query result:", limitedItems);
    res.status(200).json(limitedItems);
  } catch (error) {
    console.error("Error fetching limited items:", error);
    res.status(500).json({ error: 'An error occurred while fetching limited items', details: error.message, stack: error.stack });
  }
}
  
  async function handleGetCategories(req, res) {
    try {
      const categories = await query(`
        SELECT DISTINCT category 
        FROM products 
        WHERE deleted = 0 AND category != 'Limited'
      `);
      const formattedCategories = categories.map(item => ({ id: item.category, name: item.category }));
      res.status(200).json(formattedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: 'An error occurred while fetching categories', details: error.message });
    }
  }






  async function handlePlaceOrder(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('No Authorization header found');
      return res.status(401).json({ error: 'No token provided' });
    }
  
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('Token not found in Authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
  
      const { billingInfo, paymentMethod, cartItems, subtotal, delivery, total } = req.body;
      const trackingNumber = crypto.randomBytes(8).toString('hex').toUpperCase();
  
      await query('START TRANSACTION');
  
      // Insert the order
      const orderResult = await query(
        'INSERT INTO orders (user_id, full_name, phone_number, address, city, state_province, postal_code, delivery_address, payment_method, subtotal, delivery_fee, total, tracking_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, billingInfo.fullName, billingInfo.phoneNumber, billingInfo.address, billingInfo.city, billingInfo.stateProvince, billingInfo.postalCode, billingInfo.deliveryAddress, paymentMethod, subtotal, delivery, total, trackingNumber, 'Order Placed']
      );
  
      const orderId = orderResult.insertId;
  
      // Insert ordered products and update stock quantity
      for (const item of cartItems) {
        // Check if there's enough stock before placing the order
        const [product] = await query('SELECT stock_quantity FROM products WHERE id = ?', [item.id]);
        if (!product || product.stock_quantity < item.quantity) {
          await query('ROLLBACK');
          return res.status(400).json({ error: `Not enough stock for product: ${item.name}` });
        }
  
        await query(
          'INSERT INTO ordered_products (name, product_id, order_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
          [item.name, item.id, orderId, item.quantity, item.price]
        );
  
        // Update stock quantity
        const updateResult = await query(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.id]
        );
  
        if (updateResult.affectedRows === 0) {
          // If no rows were updated, it means there's not enough stock
          await query('ROLLBACK');
          return res.status(400).json({ error: `Not enough stock for product: ${item.name}` });
        }
      }
  
      await query('COMMIT');
      res.json({ success: true, orderId, trackingNumber });
    } catch (error) {
      await query('ROLLBACK');
      console.error('Error placing order:', error);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      res.status(500).json({ error: 'An error occurred while placing the order' });
    }
  }
  
  async function handleGetOrder(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
  
      const orderId = req.query.orderId || req.url.split('/').pop();
  
      const results = await query(`
        SELECT o.*, op.name, op.product_id, op.quantity, op.price, p.image_url
        FROM orders o
        JOIN ordered_products op ON o.id = op.order_id
        JOIN products p ON op.product_id = p.id
        WHERE o.id = ? AND o.user_id = ?
      `, [orderId, userId]);
  
      if (results.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      const orderDetails = {
        orderId: results[0].id,
        trackingNumber: results[0].tracking_number,
        status: results[0].status,
        billingInfo: {
          fullName: results[0].full_name,
          phoneNumber: results[0].phone_number,
          address: results[0].address,
          city: results[0].city,
          stateProvince: results[0].state_province,
          postalCode: results[0].postal_code,
          deliveryAddress: results[0].delivery_address,
        },
        paymentMethod: results[0].payment_method,
        items: results.map(item => ({
          id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.image_url,
        })),
        subtotal: results[0].subtotal,
        delivery: results[0].delivery_fee,
        total: results[0].total,
      };
  
      res.json(orderDetails);
    } catch (error) {
      console.error('Error fetching order details:', error);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      res.status(500).json({ error: 'An error occurred while fetching order details' });
    }
  }





  async function handleAllOrders(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
  
      const orders = await query(`
        SELECT id, tracking_number, status, order_date, total
        FROM orders
        WHERE user_id = ?
        ORDER BY order_date DESC
      `, [userId]);
  
      res.status(200).json(orders);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      console.error('Error fetching all orders:', error);
      res.status(500).json({ error: 'An error occurred while fetching orders', details: error.message });
    }
  }

  async function handleCancelOrder(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
  
      const orderId = req.url.split('/').pop();
  
      const result = await query(`
        UPDATE orders
        SET status = 'Cancelled'
        WHERE id = ? AND user_id = ? AND status = 'Order Placed'
      `, [orderId, userId]);
  
      if (result.affectedRows === 0) {
        return res.status(400).json({ error: 'Order not found or cannot be cancelled' });
      }
  
      res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      console.error('Error cancelling order:', error);
      res.status(500).json({ error: 'An error occurred while cancelling the order' });
    }
  }






  async function handleOrderHistory(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
  
      const orders = await query(`
        SELECT o.id, o.tracking_number, o.status, o.order_date, o.total, o.is_rated,
               GROUP_CONCAT(op.name SEPARATOR ', ') AS products
        FROM orders o
        JOIN ordered_products op ON o.id = op.order_id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.order_date DESC
      `, [userId]);
  
      res.status(200).json(orders);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      console.error('Error fetching order history:', error);
      res.status(500).json({ error: 'An error occurred while fetching order history', details: error.message });
    }
  }

  async function handleSubmitRatings(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
  
      const orderId = req.url.split('/').pop();
      const { ratings, feedback } = req.body;
  
      // Verify that the order belongs to the user
      const orderCheck = await query('SELECT id FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
      if (orderCheck.length === 0) {
        return res.status(403).json({ error: 'Unauthorized to rate this order' });
      }
      // Start a transaction
      await query('START TRANSACTION');
      try {
        // Insert ratings for each product
        for (const [productId, rating] of Object.entries(ratings)) {
          await query('INSERT INTO product_ratings (order_id, product_id, rating) VALUES (?, ?, ?)', [orderId, productId, rating]);
        }
        // Insert feedback
        if (feedback) {
          await query('INSERT INTO order_feedback (order_id, feedback) VALUES (?, ?)', [orderId, feedback]);
        }
  
        // Update the order to mark it as rated
        await query('UPDATE orders SET is_rated = 1 WHERE id = ?', [orderId]);
  
        // Commit the transaction
        await query('COMMIT');
  
        res.status(200).json({ success: true, message: 'Ratings submitted successfully' });
      } catch (error) {
        // If there's an error, rollback the transaction
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      console.error('Error submitting ratings:', error);
      res.status(500).json({ error: 'An error occurred while submitting ratings', details: error.message });
    }
  }
  
  
  
  
  
 
  

  export default withIronSession(handler, {
    password: process.env.SESSION_PASSWORD,
    cookieName: 'nars_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      httpOnly: true,
    },
  });