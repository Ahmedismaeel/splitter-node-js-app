require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/database');

const PORT = process.env.PORT || 5001;

// Test DB Connection before starting server
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Database connected successfully at:', res.rows[0].now);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

