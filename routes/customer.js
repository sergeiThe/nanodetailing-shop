const express = require('express')
const customerC = require('../controllers/customer')

const router = express.Router()


router.post("/add-to-cart", customerC.addToCart)
router.delete("/remove-one-from-cart/:id", customerC.removeOneItemFromCart)
router.delete("/remove-certain-products-from-cart/:id", customerC.removeCertainItemsFromCart)

router.get("/orders", customerC.getOrders)
router.get("/details", customerC.getCustomerDetails)

router.post("/checkout", customerC.checkout)

module.exports = router