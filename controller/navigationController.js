const Navigation = require("../model/navigationModel");
const slugify = require("slugify");

// Create or update navigation
exports.createOrUpdateNavigation = async (req, res) => {
  try {
    const { title, categories } = req.body;

    const slug = slugify(title, {
      lower: true,
      strict: true
    });

    const navigation = await Navigation.findOneAndUpdate(
      { slug },
      { title, slug, categories },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: navigation
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// Get navigation
exports.getNavigation = async (req, res) => {
  try {
    const navigation = await Navigation.findOne({ slug: req.params.slug });

    if (!navigation) {
      return res.status(404).json({
        success: false,
        error: 'Navigation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: navigation
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// Delete navigation
exports.deleteNavigation = async (req, res) => {
  try {
    await Navigation.findOneAndDelete({ slug: req.params.slug });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// get all Navigation
exports.getAllNavigation = async (req, res) => {
  console.log("API hit");
  try {
    const data = await Navigation.find();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.log(error)
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
