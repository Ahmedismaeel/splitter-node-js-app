const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    // Validations (e.g. from express-validator if we add it later)
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: err.details
      });
    }
  
    // Database errors
    if (err.code === '23505') {
       // Unique constraint violation
       return res.status(409).json({
        error: 'Resource already exists'
      });
    }
  
    if (err.code === '23503') {
       // Foreign key violation
       return res.status(400).json({
          error: 'Referenced resource does not exist'
       });
    }
  
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  };
  
  module.exports = errorHandler;
