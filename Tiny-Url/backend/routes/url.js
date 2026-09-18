import express from 'express';
import Url from '../models/Urls.js';
import { nanoid } from 'nanoid';

const router = express.Router();

router.post('/shorten', async (req, res) => {
    try {
        const { originalUrl } = req.body;

        if (!originalUrl) {
            return res.status(400).json({
                error: 'URL is required'
            });
        }

        // Validate URL
        try {
            new URL(originalUrl);
        } catch {
            return res.status(400).json({
                error: 'Invalid URL'
            });
        }

        // Generate unique short ID
        let shortId;

        while (true) {
            shortId = nanoid(7);

            const exists = await Url.findOne({ shortId });

            if (!exists) {
                break;
            }
        }

        // Save URL
        const url = await Url.create({
            shortId,
            originalUrl
        });

        return res.status(201).json({
            shortId: url.shortId,
            shortUrl: `${process.env.BASE_URL}/${url.shortId}`
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: 'Server Error'
        });
    }
});

router.get('/:shortId', async (req, res) => {
    try {
        const { shortId } = req.params;

        const url = await Url.findOne({ shortId });

        if (!url) {
            return res.status(404).json({
                error: 'URL not found'
            });
        }

        // Increment clicks
        url.clicks += 1;
        await url.save();

        // Redirect
        return res.redirect(url.originalUrl);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: 'Server Error'
        });
    }
});

export default router;
