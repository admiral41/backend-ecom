const express = require('express');
const router = express.Router();
const Slider = require('../model/sliderModel');
const fs = require('fs');
const path = require('path');
const { sliderUpload } = require('../middleware/uploadMiddleware');

// Get all active sliders
router.get('/', async (req, res) => {
    try {
        const sliders = await Slider.find({ isActive: true }).sort({ order: 1 });
        // Convert image paths to URLs
        const slidersWithUrls = sliders.map(slider => ({
            ...slider.toObject(),
            imageUrl: slider.image ? `${req.protocol}://${req.get('host')}/${slider.image.replace(/\\/g, '/')}` : null
        }));
        res.json(slidersWithUrls);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create new slider
router.post('/', sliderUpload.single('image'), async (req, res) => {
    try {
        const { title, subtitle, offerText, buttons } = req.body;

        if (!title || !req.file) {
            // Delete uploaded file if validation fails
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ message: 'Title and image are required' });
        }

        let buttonArray = [];
        if (buttons) {
            try {
                buttonArray = JSON.parse(buttons);
            } catch (e) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'Invalid buttons format' });
            }
        }

        const slider = new Slider({
            title,
            subtitle,
            offerText,
            image: path.relative(path.join(__dirname, '../public'), req.file.path),
            buttons: buttonArray
        });

        const newSlider = await slider.save();
        res.status(201).json({
            ...newSlider.toObject(),
            imageUrl: `${req.protocol}://${req.get('host')}/${req.file.path.replace(/\\/g, '/')}`
        });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(400).json({ message: 'Validation failed', error: err.message });
    }
});

// Update slider
router.patch('/:id', sliderUpload.single('image'), async (req, res) => {
    try {
        const slider = await Slider.findById(req.params.id);
        if (!slider) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Slider not found' });
        }

        // Store old image path for cleanup
        const oldImagePath = slider.image;

        if (req.body.title) slider.title = req.body.title;
        if (req.body.subtitle) slider.subtitle = req.body.subtitle;
        if (req.body.offerText) slider.offerText = req.body.offerText;
        if (req.file) slider.image = req.file.path;
        if (req.body.buttons) {
            try {
                slider.buttons = JSON.parse(req.body.buttons);
            } catch (e) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'Invalid buttons format' });
            }
        }
        if (req.body.order !== undefined) slider.order = req.body.order;
        if (req.body.isActive !== undefined) slider.isActive = req.body.isActive;

        const updatedSlider = await slider.save();

        // Delete old image after successful update
        if (req.file && oldImagePath) {
            try {
                fs.unlinkSync(path.join(__dirname, '../', oldImagePath));
            } catch (err) {
                console.error('Error deleting old image:', err);
            }
        }

        res.json({
            ...updatedSlider.toObject(),
            imageUrl: updatedSlider.image ? `${req.protocol}://${req.get('host')}/${updatedSlider.image.replace(/\\/g, '/')}` : null
        });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(400).json({ message: 'Update failed', error: err.message });
    }
});

// Delete slider
router.delete('/:id', async (req, res) => {
    try {
        const slider = await Slider.findByIdAndDelete(req.params.id);
        if (!slider) return res.status(404).json({ message: 'Slider not found' });

        // Delete associated image file
        if (slider.image) {
            try {
                fs.unlinkSync(path.join(__dirname, '../', slider.image));
            } catch (err) {
                console.error('Error deleting image file:', err);
            }
        }

        res.json({ message: 'Slider deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;