const db = require('../database/db')
const ApiError = require('../error/api-error')
const bcrypt = require('bcrypt')
const format = require('pg-format')

/**
 * CUSTOMERS CAN DO FOLLOWING:
 * 
 * Products: see all, see one, add to cart, delete from cart
 * TODO: Products: order, buy
 * Auth: sign up, login with sessions, log out
 * TODO: change password
 * TODO: Customers: download invoices
 * TODO: Find out how to add many products to cart in db in one go
 * Customers: see orders, see own details
 * guest cart is deleted on auth.
 */

class Customer {

    async getOrders(req, res, next) {

        let query
        try {

            // List all orders for current customer
            if (("customerId" in req.session) !== undefined) {
                query = format('SELECT * FROM orders WHERE customer_id = %L', req.session.customerId)
                const orders = await db.query(query)

                return res.status(200).json(orders.rows)
            }

            return next(ApiError.forbidden("Not authorized"))

        } catch (err) {
            console.log(err)
            return next(ApiError.internal("Something went wrong on server side"))
        }
    }

    async getCustomerDetails(req, res, next) {
        let query
        try {

            // List all orders for current customer
            if (("customerId" in req.session) !== undefined) {
                query = format('SELECT * FROM customers WHERE id = %L', req.session.customerId)
                const customer = await db.query(query)

                if (customer.rowCount > 0) {
                    return res.status(200).json(customer.rows[0])
                }

                return res.status(400).json({ message: "No such user" })

            }

            return next(ApiError.forbidden("Not authorized"))

        } catch (err) {
            console.log(err)
            return next(ApiError.internal("Something went wrong on server side"))
        }
    }

    async signUp(req, res, next) {

        let query

        try {
            const { firstName, lastName, phoneNo, email, password, city, address, postCode, postState } = req.body

            // Check if such email exists
            const existingCustomer = await db.query('SELECT email FROM customers WHERE email LIKE $1', [email])
            if (existingCustomer.rowCount != 0) {
                return res.status(200).json({ message: "Already exists" })
            }

            // Add to db
            const encryptedPassword = await bcrypt.hash(password, 12)

            const newCustomer = await db.query('INSERT INTO customers (first_name, last_name, phone_no, email, password, city, address, post_code, post_state) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
                [firstName, lastName, phoneNo, email, encryptedPassword, city, address, postCode, postState]
            )

            // Get customer id
            const customerId = newCustomer.rows[0]["id"]

            // Delete cart on auth
            if (req.session.authenticated = false) {
                let query = format('DELETE FROM cart WHERE session_id = %L RETURNING *', req.sessionID)
                const cart = await db.query(query)
                console.log(cart.rows[0])
            }

            // Create a new cart and attach to the user in db
            req.session.customerId = customerId
            req.session.authenticated = true
            query = format('INSERT INTO cart(customer_id) VALUES (%L)', [customerId]); await db.query(query)

            // redirect to shop page
            return res.json(newCustomer.rows[0])

        } catch (err) {
            console.log(err)
            return next(ApiError.internal("Could not add user due to server error"))
        }
    }

    async login(req, res, next) {

        try {

            // console.log(req.session)

            const { email, password } = req.body
            // console.log(req.body)

            // Check if such email exists
            const passwordOfExisting = await db.query('SELECT id, password FROM customers WHERE email LIKE $1', [email])

            // console.log(passwordOfExisting.rowCount)
            if (passwordOfExisting.rowCount <= 0) {
                return res.status(200).json({ message: "No such user" })
            }
            // Check password correctness
            const correct = await bcrypt.compare(password, passwordOfExisting.rows[0]["password"])

            if (!correct) {
                return res.status(200).json({ message: "Wrong password" })
            }

            // Delete cart on auth
            if (req.session.authenticated = false) {
                let query = format('DELETE FROM cart WHERE session_id = %L RETURNING *', req.sessionID)
                const cart = await db.query(query)
                console.log(cart.rows[0])
            }

            // Create session
            req.session.customerId = passwordOfExisting.rows[0]["id"]
            req.session.authenticated = true

            console.log("Customer id: " + req.session.customerId)

            // Redirect on client side
            return res.status(200).json(req.session)

        } catch (err) {
            // console.log(err.message)
            return next(ApiError.internal("Something went wrong on server side"))
        }


    }

    async logout(req, res, next) {
        // console.log(req.session)
        if (("authenticated" in req.session) === true) {
            req.session.destroy(err => {
                if (err) {
                    res.status(400).json({ message: "Could not log out" })
                }
            })
            return res.status(200).json({ message: "Successful logout!" })

        } else {
            return next(ApiError.forbidden("Not authorized"))
        }


    }

    // TODO: repetitive code
    async addToCart(req, res, next) {
        // If not logged in, create a session user, set time constraint, then delete user if not registered

        // req.session.destroy()
        // req.session.authenticated = true
        // req.session.customerId = 'ed8c0ced-b386-439f-a9db-d369bb5d7a2d'

        const { prodId, quantity } = req.body

        let query



        // First click on add to cart for a guest
        if (req.session.authenticated === undefined) {
            req.session.authenticated = false;

            /**
             * Get session id
             * Create a cart and put the session in there
             * Get product id
             * Create a cart item
             */

            // 1. Get session id
            const sessionId = req.sessionID
            // console.log(sessionId)

            // 2. Create a guest cart
            query = format('INSERT INTO cart (session_id) VALUES (%L) RETURNING id', sessionId)
            const cart = await db.query(query)
            const cartId = cart.rows[0]["id"]

            // 3. Add the product into cart as a cart item
            query = format('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (%L, %L, %L) RETURNING *', cartId, prodId, quantity)
            const cartItems = await db.query(query)

            return res.status(201).json(req.session)
        }

        // Guest with existing cart

        if (req.session.authenticated === false) {

            const sessionId = req.sessionID
            // 1. Find your cart
            // 2. Check existing cart_items for the same items, add increase quantity by amount
            // 3. If not found add the product to the cart as a cart item

            // 1.
            query = format('SELECT id FROM cart WHERE session_id = %L', sessionId)
            const cart = await db.query(query)
            const cartId = cart.rows[0]["id"]

            // 2. 
            query = format('SELECT * FROM cart_items WHERE product_id = %L AND cart_id = %L', prodId, cartId)
            const cartItem = await db.query(query)

            if (cartItem.rowCount !== 0) {
                query = format('UPDATE cart_items SET quantity = quantity + %L WHERE product_id = %L AND cart_id = %L', quantity, prodId, cartId)
            } else {
                // 3.
                query = format('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (%L, %L, %L) RETURNING *', cartId, prodId, quantity)
            }

            await db.query(query)



            return res.status(201).json(req.session)
        }

        if (req.session.authenticated === true && req.session.customerId) {
            // 1. Find cart
            // 2. ...
            console.log("Customer id : " + req.session.customerId)
            query = format('SELECT * FROM cart WHERE customer_id = %L', req.session.customerId)
            const cart = await db.query(query)
            const cartId = cart.rows[0]["id"]

            query = format('SELECT * FROM cart_items WHERE product_id = %L AND cart_id = %L', prodId, cartId)
            const cartItem = await db.query(query)

            if (cartItem.rowCount !== 0) {
                query = format('UPDATE cart_items SET quantity = quantity + %L WHERE product_id = %L AND cart_id = %L', quantity, prodId, cartId)
            } else {
                // 3.
                query = format('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (%L, %L, %L) RETURNING *', cartId, prodId, quantity)
            }

            await db.query(query)

            return res.status(201).json(req.session)
        }

    }

    // TODO: test if works for guest and logged in user
    async removeOneItemFromCart(req, res, next) {
        // 1. Get cart_item id, quantity = quantity - 1
        try {
            const { id } = req.params
            let query = format('UPDATE cart_items SET quantity = quantity - 1 WHERE id = %L AND quantity > 0 RETURNING *', id)

            const cartItem = await db.query(query)

            return res.status(200).json(cartItem.rows[0])

        } catch (err) {
            return next(ApiError.internal)
        }
    }

    async removeCertainItemsFromCart(req, res, next) {
        try {
            const { id } = req.params
            let query = format('DELETE FROM cart_items WHERE id = %L RETURNING *', id)

            const cartItem = await db.query(query)

            return res.status(200).json(cartItem.rows[0])

        } catch (err) {
            return next(ApiError.internal)
        }
    }



    // TODO: dummy payment processing
    async checkout(req, res, next) {
        // if user is not logged, search db for emails, if exists, use that user


        // create order

        // process payment

        // update order
    }



}

module.exports = new Customer