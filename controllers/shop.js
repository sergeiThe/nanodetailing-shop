const db = require('../database/db')
const ApiError = require('../error/api-error')

// TODO: store images in a storage

class Shop {
    async getProducts(req, res, next) {

        // Get page
        try {
            const page = req.query.page || 1
            let limit = 9
            let offset = (+page - 1) * limit

            const products = await db.query('SELECT * FROM products OFFSET $1 LIMIT $2', [offset, limit])

            return res.status(200).json(products.rows)
        } catch (err) {
            return next(ApiError.badRequest("Could not retrieve products"))
        }
    }



}

module.exports = new Shop