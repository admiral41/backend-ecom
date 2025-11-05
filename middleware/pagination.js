const advancedResults = (model, populate) => {
  return async (req, res, next) => {
    try {
      let query;

      // Copy req.query
      const reqQuery = { ...req.query };

      // Fields to exclude
      const removeFields = ['select', 'sort', 'page', 'limit', 'search', 'populate'];
      removeFields.forEach(param => delete reqQuery[param]);

      // Create query string
      let queryStr = JSON.stringify(reqQuery);

      // Create operators ($gt, $gte, etc)
      queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in|ne|nin)\b/g, match => `$${match}`);

      // Finding resource
      query = model.find(JSON.parse(queryStr));

      // Search functionality
      if (req.query.search) {
        const searchFields = model.schema.obj ? 
          Object.keys(model.schema.obj).filter(key => 
            model.schema.obj[key]?.type === String
          ) : ['name', 'description'];
        
        const searchQuery = {
          $or: searchFields.map(field => ({
            [field]: { $regex: req.query.search, $options: 'i' }
          }))
        };
        query = query.and([searchQuery]);
      }

      // Select Fields
      if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
      }

      // Sort
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt');
      }

      // Pagination
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 25;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const total = await model.countDocuments(JSON.parse(queryStr));

      query = query.skip(startIndex).limit(limit);

      // Populate
      if (populate) {
        query = query.populate(populate);
      }

      // Additional populate from query
      if (req.query.populate) {
        const populateFields = req.query.populate.split(',').join(' ');
        query = query.populate(populateFields);
      }

      // Executing query
      const results = await query;

      // Pagination result
      const pagination = {};

      if (endIndex < total) {
        pagination.next = {
          page: page + 1,
          limit
        };
      }

      if (startIndex > 0) {
        pagination.prev = {
          page: page - 1,
          limit
        };
      }

      res.advancedResults = {
        success: true,
        count: results.length,
        pagination: {
          ...pagination,
          page,
          pages: Math.ceil(total / limit),
          total
        },
        data: results
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = advancedResults;