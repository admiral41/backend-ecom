const express = require('express');
const router = express.Router();
const navigationController = require('../controllers/navigationController');

// @route   POST /api/navigation
// @desc    Create or update full navigation structure
// @access  Public or Admin (adjust as needed)
router.post('/', navigationController.createOrUpdateNavigation);

router.get("/all", navigationController.getAllNavigation)
// @route   GET /api/navigation/:slug
// @desc    Get a navigation structure by slug
// @access  Public
router.get('/:slug', navigationController.getNavigation);

// @route   DELETE /api/navigation/:slug
// @desc    Delete a navigation structure by slug
// @access  Admin (protect as needed)
router.delete('/:slug', navigationController.deleteNavigation);

//get all Navigation 

module.exports = router;
