const db = require('../database/db')
const ApiError = require('../error/api-error')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const uuid = require('uuid')
const path = require('path')

/**
 * ADMIN CAN DO FOLLOWING:
 * 
 * Products: add, remove, see all, see one, edit
 * Categories: add, remove, see all, see one, edit
 * TODO Orders: see all, see one, filter based on, download invoices
 * TODO Customers: see all with amount paid, see one, filter, download csv or something, 
 * TODO Products + orders: see profit for each product, and overall
 */

// TODO: Add admin authentication
// TODO: Incorporate email sending for password change and self generate password
// TODO: encrypt admin password

class Admin {

    async login(req, res, next) {

        try {
            const { email, password } = req.body

            // Check if such email exists
            const passwordOfExisting = await db.query('SELECT id, password FROM admins WHERE email LIKE $1', [email])

            // Check password correctness

            // const correct = await bcrypt.compare(password, passwordOfExisting.rows[0]["password"])

            // if (!correct) {
            //     return res.status(200).json({ message: "Wrong" })
            // }

            const token = jwt.sign({
                userEmail: email
            }, process.env.JWT_SECRET, { expiresIn: '24h' })

            return res.status(200).json({ token })

        } catch (err) {
            console.log(err.message)
            return next(ApiError.internal("Something went wrong on server side"))
        }
    }



    async addCategory(req, res, next) {
        try {

            const { name, description } = req.body

            const category = await db.query('INSERT INTO categories (cat_name, description) VALUES ($1, $2) RETURNING *', [name, description])

            return res.status(201).json(category.rows[0])

        } catch (err) {
            return next(ApiError.internal("Could not add category"))
        }
    }

    async showCategories(req, res, next) {
        try {
            const categories = await db.query('SELECT * FROM categories')

            return res.status(200).json(categories.rows)

        } catch (err) {
            return next(ApiError.internal("Could not fetch categories from database"))
        }
    }

    async showOneCategory(req, res, next) {
        try {
            const { id } = req.params

            const category = await db.query('SELECT * FROM categories WHERE id::text = $1', [id])
            return res.status(200).json(category.rows[0])
        } catch (err) {
            console.log(err)
            return next(ApiError.internal("Could not fetch category from database"))
        }
    }

    async deleteCategory(req, res, next) {
        try {
            const { id } = req.params
            const deletedCat = await db.query('DELETE FROM categories WHERE id::text = $1 RETURNING *', [id])

            if (deletedCat.rowCount != 0)
                return res.status(200).json(deletedCat.rows[0])

            return next(ApiError.badRequest("No category was deleted"))

        } catch (err) {
            return next(ApiError.internal("Could not delete category"))
        }
    }

    async editCategory(req, res, next) {
        try {
            const { id, name, description } = req.body
            const updatedCat =
                await db.query('UPDATE products SET name = $2, description = $3 WHERE id = $1 RETURNING *',
                    [id, name, description])
            return res.status(200).json(updatedProduct.rows[0])

        } catch (err) {
            return next(ApiError.internal("Could not update product"))
        }
    }

    async showProducts(req, res, next) {
        try {

            const page = req.query.page || 1
            const limit = req.query.amount || 12
            const offset = (+page - 1) * limit

            // console.log(limit, offset)

            const products = await db.query('SELECT * FROM products OFFSET $1 LIMIT $2', [offset, limit])

            // console.log(products)

            return res.status(200).json(products.rows)

        } catch (err) {
            return next(ApiError.internal("Could not fetch products from database"))
        }
    }

    async showOneProduct(req, res, next) {
        try {
            const { id } = req.params
            // console.log(typeof id)

            const product = await db.query('SELECT * FROM products WHERE id::text = $1', [id])
            return res.status(200).json(product.rows[0])
        } catch (err) {
            console.log(err)
            return next(ApiError.internal("Could not fetch product from database"))
        }
    }

    async addProduct(req, res, next) {

        try {
            let { name, price, description, video, isPurchasable, category } = req.body
            const img1 = req.files.img1
            const img2 = req.files.img2
            const img3 = req.files.img3
            const img4 = req.files.img4

            const additionalImages = [img2, img3, img4]
            let additionalImageNames = []

            const img1name = uuid.v4() + img1.name

            // Upload featured image
            let uploadPath = path.join(__dirname, "..", "images", img1name)
            img1.mv(uploadPath, (err) => {
                if (err) {
                    return res.json({ message: "Could not upload image" })
                }
            })

            // Upload additional images.
            additionalImages.forEach(img => {

                if (img !== undefined) {
                    const imgName = uuid.v4() + img.name

                    uploadPath = path.join(__dirname, "..", "images", imgName)
                    img.mv(uploadPath, err => {
                        if (err) {
                            additionalImageNames.push(null)
                            return console.log(img + " was not uploaded")
                        }
                        additionalImageNames.push(imgName)
                    })
                }
            });

            // Ensure that empty category is null for database compatibility
            if (category.length == 0) {
                category = null
            }

            const addedProduct =
                await db.query('INSERT into products (prod_name, price, description, image_1, image_2, image_3, image_4, video, is_purchasable, category_id) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
                    [name, price, description, img1name, additionalImageNames[0], additionalImageNames[1], additionalImageNames[2], video, isPurchasable, category])

            return res.status(201).json(addedProduct.rows[0])
            // return res.json({ message: "devmode" })
        } catch (err) {
            console.log(err)
            return next(ApiError.internal("Could not add product"))
        }
    }

    async deleteProduct(req, res, next) {
        try {
            const { id } = req.params
            const deletedProduct = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id])

            console.log(deletedProduct.rowCount)

            if (deletedProduct.rowCount != 0)
                return res.status(200).json(deletedProduct.rows[0])

            return next(ApiError.badRequest("No product was deleted"))

        } catch (err) {
            return next(ApiError.internal("Could not delete product"))
        }
    }


    async updateProduct(req, res, next) {
        try {
            const { id, prodName, price, description, img1, img2, img3, img4, video, isPurchasable, categoryId } = req.body
            const updatedProduct =
                await db.query('UPDATE products SET prod_name = $2, price = $3, description = $4, image_1 = $5, image_2 = $6, image_3 = $7, image_4 = $8, video = $9, is_purchasable = $10, category_id = $10 WHERE id = $1 RETURNING *',
                    [id, prodName, price, description, img1, img2, img3, img4, video, isPurchasable, categoryId])
            return res.status(200).json(updatedProduct.rows[0])

        } catch (err) {
            return next(ApiError.internal("Could not update product"))
        }
    }
}

module.exports = new Admin